import argparse
import base64
import gzip
import hashlib
import http.server
import json
import os
import sys
import threading
import webbrowser
from pathlib import Path, PureWindowsPath
from urllib.parse import unquote

from urllib.request import urlopen

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from md_viewer import __version__

from .scanner import scan_md_files

_STATIC_DIR = Path(__file__).parent / "static"


class _ViewerServer(http.server.ThreadingHTTPServer):
    # SO_REUSEADDR on Windows lets bind() succeed on an already-occupied port,
    # which breaks the port-fallback loop in main(). POSIX keeps reuse enabled
    # to avoid TIME_WAIT rebind failures.
    allow_reuse_address = os.name != "nt"


def _build_html_template():
    html = (_STATIC_DIR / "index.html").read_text(encoding="utf-8")
    css_dir = _STATIC_DIR / "css"
    js_dir = _STATIC_DIR / "js"
    css = "".join(
        p.read_text(encoding="utf-8")
        for p in sorted(css_dir.iterdir())
        if p.suffix == ".css"
    )
    js = "".join(
        p.read_text(encoding="utf-8")
        for p in sorted(js_dir.iterdir())
        if p.suffix == ".js"
    )
    logo = base64.b64encode((_STATIC_DIR / "logo.png").read_bytes()).decode("ascii")
    return (
        html.replace("__STYLE__", css)
        .replace("__SCRIPT__", js)
        .replace("__LOGO__", logo)
    )


_HTML_TEMPLATE = _build_html_template()
_html_cache: dict[str, tuple[bytes, bytes, str]] = {}


def _html_for_theme(theme: str):
    cached = _html_cache.get(theme)
    if cached is not None:
        return cached
    body = _HTML_TEMPLATE.replace("__INITIAL_THEME__", theme).encode("utf-8")
    gz = gzip.compress(body)
    etag = '"' + hashlib.md5(body).hexdigest() + '"'
    _html_cache[theme] = (body, gz, etag)
    return body, gz, etag


_STATE_DIR = Path.home() / ".config" / "md-viewer-py"
_STATE_FILE = _STATE_DIR / "state.json"

_MAX_UPLOAD_BYTES = 10 * 1024 * 1024  # 10 MiB — generous for markdown; keeps a single PUT from OOM-ing the process
_MAX_THEME_BYTES = 1024
_MAX_READ_BYTES = 50 * 1024 * 1024  # 50 MiB — comfortably above any real markdown/image/audio; keeps a single GET from OOM-ing the process


def _load_state():
    try:
        return json.loads(_STATE_FILE.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _save_state(state):
    try:
        _STATE_DIR.mkdir(parents=True, exist_ok=True)
        tmp = _STATE_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps(state, indent=2), encoding="utf-8")
        tmp.replace(_STATE_FILE)
    except Exception:
        pass


class _ChangeTracker(FileSystemEventHandler):
    """Tracks .md file changes and broadcasts to all SSE subscribers."""

    def __init__(self):
        self._events = set()
        self._lock = threading.Lock()

    def _handle(self, event):
        if event.is_directory:
            return
        src = getattr(event, "src_path", "") or ""
        dest = getattr(event, "dest_path", "") or ""
        if not (src.endswith(".md") or dest.endswith(".md")):
            return
        with self._lock:
            subscribers = list(self._events)
        for ev in subscribers:
            ev.set()

    on_created = _handle
    on_modified = _handle
    on_deleted = _handle
    on_moved = _handle

    def subscribe(self):
        ev = threading.Event()
        with self._lock:
            self._events.add(ev)
        return ev

    def unsubscribe(self, ev):
        with self._lock:
            self._events.discard(ev)


_change_tracker = _ChangeTracker()


class ViewerHandler(http.server.SimpleHTTPRequestHandler):
    root_dir = Path.cwd()
    readonly = False

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(self.root_dir), **kwargs)

    def handle_one_request(self):
        try:
            super().handle_one_request()
        except (ConnectionResetError, BrokenPipeError, ConnectionAbortedError):
            self.close_connection = True

    def _accepts_gzip(self):
        ae = self.headers.get("Accept-Encoding", "")
        return "gzip" in ae

    def _send_gzip(self, data, content_type, cache="no-cache"):
        """Send a response with gzip compression if the client supports it."""
        use_gzip = self._accepts_gzip() and len(data) > 256
        body = gzip.compress(data) if use_gzip else data
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", cache)
        if use_gzip:
            self.send_header("Content-Encoding", "gzip")
        self.end_headers()
        try:
            self.wfile.write(body)
        except BrokenPipeError:
            pass

    def _safe_local_path(self, rel_path):
        """Resolve a request-relative path inside root_dir, or None if not allowed."""
        if not rel_path:
            return None
        if rel_path.startswith("/") or rel_path.startswith("\\"):
            return None
        if Path(rel_path).is_absolute() or PureWindowsPath(rel_path).is_absolute():
            return None
        if any(p.startswith(".") for p in Path(rel_path).parts):
            return None
        file_path = (self.root_dir / rel_path).resolve()
        try:
            file_path.relative_to(self.root_dir.resolve())
        except ValueError:
            return None
        return file_path

    def do_GET(self):
        path = unquote(self.path)

        if path == "/" or path == "/index.html":
            # Check If-None-Match for 304
            theme = _load_state().get("theme", "")
            html_bytes, html_gzip, html_etag = _html_for_theme(theme if theme in ("dark", "light") else "")
            if self.headers.get("If-None-Match") == html_etag:
                self.send_response(304)
                self.end_headers()
                return
            use_gzip = self._accepts_gzip()
            body = html_gzip if use_gzip else html_bytes
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-cache")
            self.send_header("ETag", html_etag)
            if use_gzip:
                self.send_header("Content-Encoding", "gzip")
            self.end_headers()
            self.wfile.write(body)
            return

        if path == "/api/version":
            state = _load_state()
            already_seen = state.get("last_seen_version") == __version__
            payload = {
                "version": __version__,
                "release_notes": "" if already_seen else (_release_notes or ""),
                "latest_version": _latest_version or "",
            }
            data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self._send_gzip(data, "application/json")
            return

        if path == "/api/files":
            files = scan_md_files(self.root_dir)
            payload = {"root": str(self.root_dir), "files": files, "readonly": self.readonly}
            data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self._send_gzip(data, "application/json")
            return

        if path == "/api/events":
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            ev = _change_tracker.subscribe()
            try:
                while True:
                    triggered = ev.wait(timeout=30)
                    if triggered:
                        ev.clear()
                        self.wfile.write(b"data: changed\n\n")
                    else:
                        self.wfile.write(b": keepalive\n\n")
                    self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError, OSError):
                pass
            finally:
                _change_tracker.unsubscribe(ev)
            return

        if path.startswith("/files-raw/"):
            rel_path = path[11:]
            file_path = self._safe_local_path(rel_path)
            if file_path is None:
                self.send_error(403, "Access denied")
                return
            if file_path.is_file():
                ext = file_path.suffix.lower()
                ct = {
                    ".png": "image/png", ".jpg": "image/jpeg",
                    ".jpeg": "image/jpeg", ".gif": "image/gif",
                    ".svg": "image/svg+xml", ".webp": "image/webp",
                    ".ico": "image/x-icon", ".bmp": "image/bmp",
                    ".mp3": "audio/mpeg", ".wav": "audio/wav",
                    ".ogg": "audio/ogg", ".oga": "audio/ogg",
                    ".m4a": "audio/mp4", ".aac": "audio/aac",
                    ".flac": "audio/flac", ".opus": "audio/opus",
                }.get(ext)
                if ct is None:
                    self.send_error(404, f"File not found: {rel_path}")
                    return
                if file_path.stat().st_size > _MAX_READ_BYTES:
                    self.send_error(413, "File too large")
                    return
                data = file_path.read_bytes()
                self.send_response(200)
                self.send_header("Content-Type", ct)
                self.send_header("Content-Length", str(len(data)))
                self.send_header("Cache-Control", "no-cache")
                self.end_headers()
                self.wfile.write(data)
                return
            self.send_error(404, f"File not found: {rel_path}")
            return

        if path.startswith("/files/"):
            rel_path = path[7:]
            file_path = self._safe_local_path(rel_path)
            if file_path is None:
                self.send_error(403, "Access denied")
                return
            if file_path.is_file() and file_path.suffix.lower() == ".md":
                if file_path.stat().st_size > _MAX_READ_BYTES:
                    self.send_error(413, "File too large")
                    return
                data = file_path.read_bytes()
                self._send_gzip(data, "text/plain; charset=utf-8")
                return
            self.send_error(404, f"File not found: {rel_path}")
            return

        if path.startswith("/vendor/"):
            rel = path[len("/vendor/"):]
            # Reject absolute paths, traversal, and empty segments
            if not rel or ".." in rel.split("/") or rel.startswith("/"):
                self.send_error(403, "Access denied")
                return
            file_path = _STATIC_DIR / "vendor" / rel
            try:
                file_path.resolve().relative_to((_STATIC_DIR / "vendor").resolve())
            except ValueError:
                self.send_error(403, "Access denied")
                return
            if not file_path.is_file():
                self.send_error(404, f"Vendor asset not found: {rel}")
                return
            ext = file_path.suffix.lower()
            ct = {
                ".js": "application/javascript; charset=utf-8",
                ".css": "text/css; charset=utf-8",
                ".woff2": "font/woff2",
                ".woff": "font/woff",
                ".ttf": "font/ttf",
                ".otf": "font/otf",
                ".eot": "application/vnd.ms-fontobject",
                ".svg": "image/svg+xml",
            }.get(ext)
            if ct is None:
                self.send_error(404, f"Vendor asset type not allowed: {rel}")
                return
            if file_path.stat().st_size > _MAX_READ_BYTES:
                self.send_error(413, "File too large")
                return
            data = file_path.read_bytes()
            self.send_response(200)
            self.send_header("Content-Type", ct)
            self.send_header("Content-Length", str(len(data)))
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
            self.end_headers()
            self.wfile.write(data)
            return

        self.send_error(404, "Not found")

    def do_POST(self):
        path = unquote(self.path)

        if path == "/api/ack-version":
            state = _load_state()
            state["last_seen_version"] = __version__
            _save_state(state)
            self.send_response(204)
            self.end_headers()
            return

        if path == "/api/theme":
            try:
                length = int(self.headers.get("Content-Length") or 0)
            except ValueError:
                self.send_error(400, "Invalid Content-Length")
                return
            if length < 0:
                self.send_error(400, "Invalid Content-Length")
                return
            if length > _MAX_THEME_BYTES:
                self.send_error(413, "Payload too large")
                return
            try:
                body = json.loads(self.rfile.read(length) or b"{}")
            except json.JSONDecodeError:
                self.send_error(400, "Invalid JSON")
                return
            theme = body.get("theme")
            if theme not in ("dark", "light"):
                self.send_error(400, "theme must be 'dark' or 'light'")
                return
            state = _load_state()
            state["theme"] = theme
            _save_state(state)
            self.send_response(204)
            self.end_headers()
            return

        self.send_error(404, "Not found")

    def do_PUT(self):
        """Handle file save requests."""
        if self.readonly:
            self.send_error(403, "Server is in read-only mode")
            return

        try:
            content_length = int(self.headers.get("Content-Length", 0))
        except ValueError:
            self.send_error(400, "Invalid Content-Length")
            return
        if content_length < 0:
            self.send_error(400, "Invalid Content-Length")
            return
        if content_length > _MAX_UPLOAD_BYTES:
            self.send_error(413, "Payload too large")
            return

        path = unquote(self.path)

        if path.startswith("/files/"):
            rel_path = path[7:]

            # Security: ensure path is within root_dir
            file_path = self._safe_local_path(rel_path)
            if file_path is None:
                self.send_error(403, "Access denied")
                return

            if file_path.suffix.lower() != ".md":
                self.send_error(400, "Only .md files are allowed")
                return

            # Read request body
            content = self.rfile.read(content_length)

            tmp_path = None
            try:
                # Ensure parent directory exists
                file_path.parent.mkdir(parents=True, exist_ok=True)
                tmp_path = file_path.with_suffix(".tmp")
                tmp_path.write_bytes(content)
                tmp_path.replace(file_path)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
            except Exception as e:
                if tmp_path is not None:
                    try:
                        tmp_path.unlink()
                    except OSError:
                        pass
                self.send_error(500, f"Failed to save file: {e}")
            return

        self.send_error(404, "Not found")

    def log_message(self, format, *args):
        msg = str(args)
        if "api" in msg or "files" in msg or "events" in msg:
            return
        super().log_message(format, *args)


_release_notes = None
_latest_version = None


_GH_RELEASES = "https://api.github.com/repos/bot-anica/md-viewer-py/releases"


def _fetch_release(url):
    with urlopen(url, timeout=3) as resp:
        return json.loads(resp.read())


def _check_for_update():
    global _release_notes, _latest_version
    try:
        latest_data = _fetch_release(f"{_GH_RELEASES}/latest")
        latest = latest_data.get("tag_name", "").lstrip("v")
        if latest:
            _latest_version = latest
        # What's New describes the version actually running, so its notes must
        # come from that version's own release — not whatever is latest. They
        # coincide once you upgrade; until then the heading and body would
        # otherwise disagree (running version label, newer version's notes).
        if latest == __version__:
            _release_notes = latest_data.get("body", "")
        else:
            try:
                own = _fetch_release(f"{_GH_RELEASES}/tags/v{__version__}")
                _release_notes = own.get("body", "")
            except Exception:
                _release_notes = ""
        if latest and latest != __version__:
            return f"v{latest} available (pip install -U md-viewer-py)"
    except Exception:
        pass
    return None


def _build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="md-viewer",
        description="Serve a directory of Markdown files in your browser.",
    )
    parser.add_argument(
        "directory",
        nargs="?",
        default=None,
        help="Directory to serve (default: current directory)",
    )
    # Hidden legacy positional: md-viewer <dir> <port>
    parser.add_argument(
        "_legacy_port",
        nargs="?",
        default=None,
        help=argparse.SUPPRESS,
    )
    parser.add_argument(
        "-p", "--port",
        type=int,
        default=8080,
        metavar="PORT",
        help="Port to listen on, 1-65535 (default: 8080)",
    )
    parser.add_argument(
        "--host",
        default="",
        metavar="HOST",
        help="Host/address to bind (default: all interfaces)",
    )
    parser.add_argument(
        "--no-browser",
        action="store_true",
        help="Don't open browser automatically",
    )
    parser.add_argument(
        "--readonly",
        action="store_true",
        help="Disable editing (hides the Edit button and rejects file writes)",
    )
    parser.add_argument(
        "--version", "-V",
        action="version",
        version=f"%(prog)s {__version__}",
    )
    return parser


def main():
    for stream in (sys.stdout, sys.stderr):
        try:
            stream.reconfigure(errors="replace")
        except AttributeError:
            pass

    parser = _build_arg_parser()
    args = parser.parse_args()

    # Validate port range
    if not (1 <= args.port <= 65535):
        parser.error(f"--port must be between 1 and 65535, got {args.port}")

    # Resolve directory and port from positional args (legacy two-arg form)
    root_dir = Path(args.directory).resolve() if args.directory else Path.cwd()
    port = args.port

    # Legacy: md-viewer <dir> <port>  — second positional overrides --port
    if args._legacy_port is not None:
        try:
            port = int(args._legacy_port)
            if not (1 <= port <= 65535):
                parser.error(f"port must be between 1 and 65535, got {port}")
        except ValueError:
            parser.error(f"port must be an integer, got {args._legacy_port!r}")

    # Legacy: md-viewer <port>  — single digit-only positional means port
    if args.directory is not None and args._legacy_port is None and args.directory.isdigit():
        port = int(args.directory)
        root_dir = Path.cwd()

    host = args.host

    os.chdir(root_dir)
    ViewerHandler.root_dir = root_dir
    ViewerHandler.readonly = args.readonly

    # Start file watcher
    observer = Observer()
    observer.schedule(_change_tracker, str(root_dir), recursive=True)
    observer.daemon = True
    observer.start()

    max_attempts = 10
    for attempt in range(max_attempts):
        try:
            server = _ViewerServer((host, port), ViewerHandler)
            break
        except OSError:
            port += 1
    else:
        print(f"  Error: Could not find an available port after {max_attempts} attempts.")
        sys.exit(1)
    url = f"http://localhost:{port}"
    update_msg = _check_for_update()
    non_local_bind = host in ("0.0.0.0", "::") or (host and host not in ("localhost", "127.0.0.1", "::1"))
    print(f"\n  Markdown Viewer v{__version__}")
    print(f"  {'─' * 40}")
    print(f"  Directory:  {root_dir}")
    print(f"  Files:      {len(scan_md_files(root_dir))} .md files found")
    print(f"  URL:        {url}")
    if non_local_bind and not args.readonly:
        print(
            "  WARNING: Binding to a non-local interface without --readonly. Anyone on the network can edit your files. Use --readonly for public hosting, or --host 127.0.0.1 for local-only.",
            file=sys.stderr,
        )
    if update_msg:
        print(f"  Update:     {update_msg}")
    print(f"  {'─' * 40}")
    print(f"  Press Ctrl+C to stop\n")

    if not args.no_browser:
        def _open_browser():
            import time
            time.sleep(0.5)
            try:
                webbrowser.open(url)
            except Exception:
                pass

        threading.Thread(target=_open_browser, daemon=True).start()

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped.")
        observer.stop()
        observer.join(timeout=2)
        server.server_close()
