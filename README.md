<p align="center">
  <img src="https://raw.githubusercontent.com/bot-anica/md-viewer-py/main/assets/logo.png" alt="md-viewer-py" width="120">
</p>

<h1 align="center">md-viewer-py</h1>

<p align="center">
  <a href="https://pypi.org/project/md-viewer-py/"><img src="https://img.shields.io/pypi/v/md-viewer-py?label=version" alt="PyPI version"></a>
  <img src="https://img.shields.io/pypi/pyversions/md-viewer-py" alt="Python versions">
  <img src="https://img.shields.io/pypi/l/md-viewer-py" alt="License">
</p>

<p align="center"><strong>Drop-in Markdown viewer for any folder</strong></p>

<p align="center">Install once, use everywhere as <code>mdview</code>.</p>

A lightweight, pip-installable Markdown viewer that turns any folder into a browsable documentation site. Point it at a directory — it finds all `.md` files, renders them in a clean UI with syntax highlighting, diagrams, and live reload. No config, no build step, no Node.js. Just `pip install md-viewer-py` and `mdview`.

<p align="center">
  <img src="https://raw.githubusercontent.com/bot-anica/md-viewer-py/main/assets/preview-light.jpg" alt="File view — Light theme" width="100%">
</p>
<p align="center">
  <img src="https://raw.githubusercontent.com/bot-anica/md-viewer-py/main/assets/preview-dark.jpg" alt="File view — Dark theme" width="100%">
</p>

---

## Install

```bash
pip install md-viewer-py
```

Or with [uv](https://docs.astral.sh/uv/):

```bash
uv tool install md-viewer-py
```

Then run from any directory:

```bash
mdview                        # serve current directory on port 8080
mdview --port 3000            # custom port
mdview /path/to/docs          # custom directory
mdview /path/to/docs -p 3000  # both
mdview --help                 # show all options
```

Or run as a Python module without installing:

```bash
python -m md_viewer
```

## Features

| Feature | Description |
|---------|-------------|
| **Dashboard** | Grid view of folders and files, macOS Finder-style |
| **Dark & light themes** | Auto-detects OS preference, manual toggle |
| **File tree sidebar** | Collapsible directories with file name filter |
| **Global search** | Search across all files from header with dropdown
results |
| **In-file search** | Cmd/Ctrl+F to find and highlight matches |
| **Table of contents** | Right panel with scroll spy and collapsible groups
|
| **In-browser editing** | Edit mode with live preview, save to disk |
| **Live reload** | Instant updates via SSE + watchdog |
| **Syntax highlighting** | highlight.js for code blocks |
| **Mermaid diagrams** | Rendered inline with error feedback |
| **Keyboard shortcuts** | Full shortcut set with `?` modal |
| **Print-friendly** | Clean stylesheet with proper page breaks |
| **Proper CLI** | `--help`, `--port`, `--host`, `--no-browser` |
| **Minimal dependencies** | Only `watchdog`, pip-installable |

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
| `⌘/Ctrl+F` | Find in current file |
| `⌘/Ctrl+Shift+F` | Search across all files |
| `Shift Shift` | Filter files by name |
| `/` | Focus search (legacy) |
| `?` | Show keyboard shortcuts |
| `← ↑` | Previous file |
| `→ ↓` | Next file |
| `Escape` | Close search / modal |

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
