import base64
import gzip
import hashlib
import http.server
import json
import os
import sys
import threading
import webbrowser
from pathlib import Path
from urllib.parse import unquote

from urllib.request import urlopen

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from md_viewer import __version__

from .scanner import scan_md_files

_STATIC_DIR = Path(__file__).parent / "static"


def _build_html():
    html = (_STATIC_DIR / "index.html").read_text(encoding="utf-8")
    css = (_STATIC_DIR / "style.css").read_text(encoding="utf-8")
    js = (_STATIC_DIR / "app.js").read_text(encoding="utf-8")
    logo = base64.b64encode((_STATIC_DIR / "logo.png").read_bytes()).decode("ascii")
    return (
        html.replace("__STYLE__", css)
        .replace("__SCRIPT__", js)
        .replace("__LOGO__", logo)
        .encode("utf-8")
    )


_HTML_BYTES = _build_html()
_HTML_GZIP = gzip.compress(_HTML_BYTES)
_HTML_ETAG = '"' + hashlib.md5(_HTML_BYTES).hexdigest() + '"'


class _ChangeTracker(FileSystemEventHandler):
    """Tracks .md file changes and notifies SSE clients."""

    def __init__(self):
        self._event = threading.Event()

    def _handle(self, event):
        if event.is_directory:
            return
        src = getattr(event, "src_path", "") or ""
        dest = getattr(event, "dest_path", "") or ""
        if src.endswith(".md") or dest.endswith(".md"):
            self._event.set()

    on_created = _handle
    on_modified = _handle
    on_deleted = _handle
    on_moved = _handle

    def wait(self, timeout=30):
        """Block until a change occurs or timeout. Returns True if changed."""
        triggered = self._event.wait(timeout=timeout)
        self._event.clear()
        return triggered


_change_tracker = _ChangeTracker()


class ViewerHandler(http.server.SimpleHTTPRequestHandler):
    root_dir = Path.cwd()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(self.root_dir), **kwargs)

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

    def do_GET(self):
        path = unquote(self.path)

        if path == "/" or path == "/index.html":
            # Check If-None-Match for 304
            if self.headers.get("If-None-Match") == _HTML_ETAG:
                self.send_response(304)
                self.end_headers()
                return
            use_gzip = self._accepts_gzip()
            body = _HTML_GZIP if use_gzip else _HTML_BYTES
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.send_header("Cache-Control", "no-cache")
            self.send_header("ETag", _HTML_ETAG)
            if use_gzip:
                self.send_header("Content-Encoding", "gzip")
            self.end_headers()
            self.wfile.write(body)
            return

        if path == "/api/version":
            payload = {"version": __version__, "release_notes": _release_notes or ""}
            data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self._send_gzip(data, "application/json")
            return

        if path == "/api/files":
            files = scan_md_files(self.root_dir)
            payload = {"root": str(self.root_dir), "files": files}
            data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
            self._send_gzip(data, "application/json")
            return

        if path == "/api/events":
            self.send_response(200)
            self.send_header("Content-Type", "text/event-stream")
            self.send_header("Cache-Control", "no-cache")
            self.send_header("Connection", "keep-alive")
            self.end_headers()
            try:
                while True:
                    if _change_tracker.wait(timeout=30):
                        self.wfile.write(b"data: changed\n\n")
                        self.wfile.flush()
                    else:
                        self.wfile.write(b": keepalive\n\n")
                        self.wfile.flush()
            except (BrokenPipeError, ConnectionResetError, OSError):
                pass
            return

        if path.startswith("/files/"):
            rel_path = path[7:]
            file_path = self.root_dir / rel_path
            try:
                file_path.resolve().relative_to(self.root_dir.resolve())
            except ValueError:
                self.send_error(403, "Access denied")
                return
            if file_path.is_file() and file_path.suffix == ".md":
                data = file_path.read_bytes()
                self._send_gzip(data, "text/plain; charset=utf-8")
                return
            self.send_error(404, f"File not found: {rel_path}")
            return

        super().do_GET()

    def do_PUT(self):
        """Handle file save requests."""
        path = unquote(self.path)

        if path.startswith("/files/"):
            rel_path = path[7:]
            file_path = self.root_dir / rel_path

            # Security: ensure path is within root_dir
            try:
                file_path.resolve().relative_to(self.root_dir.resolve())
            except ValueError:
                self.send_error(403, "Access denied")
                return

            if file_path.suffix != ".md":
                self.send_error(400, "Only .md files are allowed")
                return

            # Read request body
            content_length = int(self.headers.get("Content-Length", 0))
            content = self.rfile.read(content_length)

            try:
                # Ensure parent directory exists
                file_path.parent.mkdir(parents=True, exist_ok=True)
                file_path.write_bytes(content)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"success": True}).encode("utf-8"))
            except Exception as e:
                self.send_error(500, f"Failed to save file: {e}")
            return

        self.send_error(404, "Not found")

    def log_message(self, format, *args):
        msg = str(args)
        if "api" in msg or "files" in msg or "events" in msg:
            return
        super().log_message(format, *args)


_release_notes = None


def _check_for_update():
    global _release_notes
    try:
        with urlopen("https://api.github.com/repos/bot-anica/md-viewer-py/releases/latest", timeout=3) as resp:
            data = json.loads(resp.read())
        latest = data.get("tag_name", "").lstrip("v")
        _release_notes = data.get("body", "")
        if latest and latest != __version__:
            return f"v{latest} available (pip install -U md-viewer-py)"
    except Exception:
        pass
    return None


def main():
    root_dir = Path.cwd()
    port = 8080

    if len(sys.argv) >= 2:
        arg1 = sys.argv[1]
        if arg1.isdigit():
            port = int(arg1)
        else:
            root_dir = Path(arg1).resolve()

    if len(sys.argv) >= 3:
        port = int(sys.argv[2])

    os.chdir(root_dir)
    ViewerHandler.root_dir = root_dir

    # Start file watcher
    observer = Observer()
    observer.schedule(_change_tracker, str(root_dir), recursive=True)
    observer.daemon = True
    observer.start()

    max_attempts = 10
    for attempt in range(max_attempts):
        try:
            server = http.server.ThreadingHTTPServer(("", port), ViewerHandler)
            break
        except OSError:
            port += 1
    else:
        print(f"  Error: Could not find an available port after {max_attempts} attempts.")
        sys.exit(1)
    url = f"http://localhost:{port}"
    update_msg = _check_for_update()
    print(f"\n  Markdown Viewer v{__version__}")
    print(f"  {'─' * 40}")
    print(f"  Directory:  {root_dir}")
    print(f"  Files:      {len(scan_md_files(root_dir))} .md files found")
    print(f"  URL:        {url}")
    if update_msg:
        print(f"  Update:     {update_msg}")
    print(f"  {'─' * 40}")
    print(f"  Press Ctrl+C to stop\n")

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
