import http.server
import json
import os
import sys
import webbrowser
from pathlib import Path
from urllib.parse import unquote

from .scanner import scan_md_files

_STATIC_DIR = Path(__file__).parent / "static"


def _build_html():
    html = (_STATIC_DIR / "index.html").read_text(encoding="utf-8")
    css = (_STATIC_DIR / "style.css").read_text(encoding="utf-8")
    js = (_STATIC_DIR / "app.js").read_text(encoding="utf-8")
    return html.replace("__STYLE__", css).replace("__SCRIPT__", js).encode("utf-8")


_HTML_BYTES = _build_html()


class ViewerHandler(http.server.SimpleHTTPRequestHandler):
    root_dir = Path.cwd()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(self.root_dir), **kwargs)

    def do_GET(self):
        path = unquote(self.path)

        if path == "/" or path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(_HTML_BYTES)
            return

        if path == "/api/files":
            files = scan_md_files(self.root_dir)
            payload = {"root": str(self.root_dir), "files": files}
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))
            return

        if path.startswith("/files/"):
            rel_path = path[7:]
            file_path = self.root_dir / rel_path
            if file_path.is_file() and file_path.suffix == ".md":
                self.send_response(200)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.end_headers()
                self.wfile.write(file_path.read_bytes())
                return
            self.send_error(404, f"File not found: {rel_path}")
            return

        super().do_GET()

    def log_message(self, format, *args):
        if "api" in str(args) or "files" in str(args):
            return
        super().log_message(format, *args)


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

    server = http.server.HTTPServer(("", port), ViewerHandler)
    url = f"http://localhost:{port}"
    print(f"\n  Markdown Viewer")
    print(f"  {'─' * 40}")
    print(f"  Directory:  {root_dir}")
    print(f"  Files:      {len(scan_md_files(root_dir))} .md files found")
    print(f"  URL:        {url}")
    print(f"  {'─' * 40}")
    print(f"  Press Ctrl+C to stop\n")

    try:
        webbrowser.open(url)
    except Exception:
        pass

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n  Stopped.")
        server.server_close()
