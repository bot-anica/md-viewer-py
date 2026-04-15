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

A local HTTP server that renders Markdown files in the browser with navigation, search, and editing. Install and run:

```bash
pip install md-viewer-py
mdview
```

<p align="center">
  <a href="https://youtu.be/uZRkSmzfyzY">
    <img src="https://raw.githubusercontent.com/bot-anica/md-viewer-py/main/assets/video-thumbnail.png" alt="Watch the demo" width="100%">
  </a>
  <br>
  <em>▶ Click to watch the demo</em>
</p>


## Why mdview?

Point it at any folder and instantly browse your docs - no config files, no build step, no Node.js. It comes with sidebar navigation, global search, table of contents, dark mode, Mermaid diagrams, syntax highlighting, and an in-browser editor with live preview, all powered by Python's stdlib HTTP server and a single dependency (`watchdog`).

## mdview vs. the alternatives

| | mdview | MkDocs / Docusaurus | VS Code Preview | grip |
|---|---|---|---|---|
| Setup | `pip install` | Config + build + Node.js | Already installed | `pip install` |
| Multi-file navigation | Yes | Yes | No | No |
| Cross-file search | Yes | Yes | No | No |
| Live reload | Yes | Yes (with plugin) | Yes | No |
| In-browser editing | Yes | No | Yes | No |
| Config required | None | Yes | No | API token |
| Works offline | Yes | Yes | Yes | No |

## Install

```bash
pip install md-viewer-py
```

Or with [uv](https://docs.astral.sh/uv/) / [pipx](https://pipx.pypa.io/):

```bash
uv tool install md-viewer-py
pipx install md-viewer-py
```

Then run from any directory:

```bash
mdview                        # serve current directory on port 8080
mdview --port 3000            # custom port
mdview /path/to/docs          # custom directory
mdview /path/to/docs -p 3000  # both
mdview --help                 # show all options
```

## All Features

- **Dashboard**: grid view of folders and files, macOS Finder-style
- **Dark & light themes**: auto-detects OS preference, manual toggle
- **File tree sidebar**: collapsible directories with file name filter
- **Global search**: search across all files from header with dropdown results
- **In-file search**: Cmd/Ctrl+F to find and highlight matches
- **Table of contents**: right panel with scroll spy and collapsible groups
- **In-browser editing**: edit mode with live preview, save to disk
- **Live reload**: instant updates when files change on disk
- **Syntax highlighting**: for code blocks in all major languages
- **Mermaid diagrams**: rendered inline with error feedback
- **Keyboard shortcuts**: full shortcut set with `?` modal
- **Print-friendly**: clean stylesheet with proper page breaks
- **Proper CLI**: `--help`, `--port`, `--host`, `--no-browser`
- **Minimal dependencies**: only `watchdog`, pip-installable

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

## Examples

- [Mermaid Diagrams](https://github.com/bot-anica/md-viewer-py/blob/main/examples/mermaid-examples.md): flowcharts, sequence diagrams, gantt charts, and more

## How It Works

`md-viewer-py` is a pip-installable HTTP server built on Python's `http.server`. It scans the directory for `.md` files, serves a single-page UI with dark and light themes, and renders Markdown client-side using [marked.js](https://github.com/markedjs/marked) from a CDN. No build step, no config files. Just install and run.

## Built in public

Follow the development journey:

- [How I Split 2,800 Lines Into 29 Files With Zero Regressions](https://blog.anica.space/posts/md-viewer-refactoring-monolith-to-modules)
- [From Viewer to Workspace: Rebuilding md-viewer-py in 9 Days](https://blog.anica.space/posts/md-viewer-from-viewer-to-workspace)
- [My Side Project Got Its First Security Vulnerability](https://blog.anica.space/posts/md-viewer-first-security-vulnerability)
- [I Built a Zero-Dependency Markdown Viewer in Python](https://blog.anica.space/posts/md-viewer-zero-dependency-markdown-viewer)

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](https://github.com/bot-anica/md-viewer-py/blob/main/CONTRIBUTING.md) for guidelines and the [improvements & ideas list](https://github.com/bot-anica/md-viewer-py/blob/main/IMPROVEMENTS.md) for open tasks.

Feel free to [open an issue](https://github.com/bot-anica/md-viewer-py/issues) to discuss ideas before starting work.

## License

[MIT](https://github.com/bot-anica/md-viewer-py/blob/main/LICENSE)

Install it, use it, uninstall anytime with `pip uninstall md-viewer-py`.
