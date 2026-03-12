<p align="center">
  <img src="https://raw.githubusercontent.com/bot-anica/md-viewer-py/main/assets/logo.png" alt="md-viewer-py" width="120">
</p>

<h1 align="center">md-viewer-py</h1>

<p align="center">
  <a href="https://pypi.org/project/md-viewer-py/"><img src="https://img.shields.io/pypi/v/md-viewer-py?label=version" alt="PyPI version"></a>
  <img src="https://img.shields.io/pypi/pyversions/md-viewer-py" alt="Python versions">
  <img src="https://img.shields.io/pypi/l/md-viewer-py" alt="License">
</p>

<p align="center"><strong>Drop-in Markdown viewer for any folder — installable via pip.</strong></p>

<p align="center">Install once, use everywhere as <code>mdview</code>.</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/bot-anica/md-viewer-py/main/assets/dashboard-light.jpg" alt="Dashboard — Light theme" width="100%">
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/bot-anica/md-viewer-py/main/assets/file-light.jpg" alt="File view — Light theme" width="100%">
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/bot-anica/md-viewer-py/main/assets/dashboard-dark.jpg" alt="Dashboard — Dark theme" width="100%">
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/bot-anica/md-viewer-py/main/assets/file-dark.jpg" alt="File view — Dark theme" width="100%">
</p>

---

## Install

```bash
pip install md-viewer-py
```

Or with pipx (recommended for CLI tools):

```bash
pipx install md-viewer-py
```

Or install directly from source:

```bash
pip install .
```

Then run from any directory:

```bash
mdview                        # serve current directory on port 8080
mdview 3000                   # custom port
mdview /path/to/docs          # custom directory
mdview /path/to/docs 3000     # both
```

Or run as a Python module without installing:

```bash
python -m md_viewer
```

## Features

- **Minimal dependencies** — only `watchdog` for live reload, auto-installed with pip
- **pip/pipx installable** — install once, use anywhere as `mdview`
- **Dashboard landing page** — grid view of folders and files, macOS Finder-style
- **Dark & light themes** — polished UI with OS-aware theme toggle
- **File tree sidebar** — folder navigation with collapsible directories
- **Full-text search** — debounced search across all Markdown files with lazy loading
- **Table of contents** — auto-generated with scroll spy and collapsible groups
- **Collapsible sections** — click any heading to collapse/expand its content
- **In-browser editing** — toggle edit mode with toolbar, live preview, and save to disk
- **Live reload** — instant updates via SSE and native file system watching (watchdog)
- **Syntax highlighting** — code blocks highlighted with highlight.js
- **Mermaid diagrams** — flowcharts, sequence diagrams, and more rendered inline
- **`.gitignore` support** — respects ignore patterns from root and subdirectories
- **Gzip compression** — all responses compressed, ETag caching for the HTML page
- **Keyboard shortcuts** — arrow keys to navigate, `/` to search
- **Reading progress bar** — visual indicator of scroll position
- **Mobile responsive** — works on small screens with hamburger menu
- **Print-friendly** — clean print stylesheet for hard copies
- **Custom port and directory** — point it at any folder, pick any port

## Quick Start

```bash
pip install md-viewer-py
mdview
```

A browser tab opens automatically at `http://localhost:8080`.

## Examples

- [Mermaid Diagrams](https://github.com/bot-anica/md-viewer-py/blob/main/examples/mermaid-examples.md) — flowcharts, sequence diagrams, gantt charts, and more

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `/` or `Ctrl+K` | Focus search |
| `←` `↑` | Previous file |
| `→` `↓` | Next file |

## How It Works

`md-viewer-py` is a pip-installable HTTP server built on Python's `http.server`. It scans the directory for `.md` files, serves a single-page dark-themed UI, and renders Markdown client-side using [marked.js](https://github.com/markedjs/marked) from a CDN. No build step, no config files, no virtual environments beyond the install itself.

## Alternative: Copy and Run

No install needed — just drop the wrapper into any folder:

```bash
python3 md-viewer.py
```

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](https://github.com/bot-anica/md-viewer-py/blob/main/CONTRIBUTING.md) for guidelines and the [improvements & ideas list](https://github.com/bot-anica/md-viewer-py/blob/main/IMPROVEMENTS.md) for open tasks.

Feel free to [open an issue](https://github.com/bot-anica/md-viewer-py/issues) to discuss ideas before starting work.

## License

[MIT](https://github.com/bot-anica/md-viewer-py/blob/main/LICENSE)
