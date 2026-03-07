<p align="center">
  <img src="https://raw.githubusercontent.com/bot-anica/md-viewer-py/main/assets/logo.png" alt="md-viewer-py" width="120">
</p>

<h1 align="center">md-viewer-py</h1>

<p align="center"><strong>Drop-in Markdown viewer for any folder — installable via pip.</strong></p>

<p align="center">Zero dependencies. Install once, use everywhere as <code>mdview</code>.</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/bot-anica/md-viewer-py/main/assets/preview.png" alt="md-viewer-py screenshot" width="800">
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

- **Zero dependencies** — Python standard library only, nothing to install
- **pip/pipx installable** — install once, use anywhere as `mdview`
- **Dark theme UI** — polished dark interface, easy on the eyes
- **File tree sidebar** — folder navigation with collapsible directories
- **Full-text search** — search across all Markdown files instantly
- **Table of contents** — auto-generated with scroll spy and collapsible groups
- **Collapsible sections** — click any heading to collapse/expand its content
- **`.gitignore` support** — respects ignore patterns, skips `.git`, `node_modules`, etc.
- **Keyboard shortcuts** — arrow keys to navigate, `/` to search
- **Reading progress bar** — visual indicator of scroll position
- **Mobile responsive** — works on small screens with hamburger menu
- **Print-friendly** — clean print stylesheet for hard copies
- **Custom port and directory** — point it at any folder, pick any port
- **Live content refresh** — file list and content auto-refresh as files change

## Quick Start

```bash
pip install md-viewer-py
mdview
```

A browser tab opens automatically at `http://localhost:8080`.

## Examples

- [Mermaid Diagrams](examples/mermaid-examples.md) — flowcharts, sequence diagrams, gantt charts, and more

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

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

If you'd like to help but aren't sure where to start, here are some ideas:

- [x] Light theme / theme switcher
- [x] Syntax highlighting for code blocks (highlight.js)
- [x] Mermaid diagram support
- [x] Live reload on file changes
- [ ] Export to PDF or static HTML

Feel free to [open an issue](../../issues) to discuss ideas before starting work.

## License

[MIT](LICENSE)
