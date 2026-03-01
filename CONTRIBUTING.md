# Contributing to md-viewer-py

Thanks for your interest in contributing! This project values simplicity — a single Python file with zero dependencies that anyone can drop into a folder and run.

## Philosophy

**Single-file simplicity is a feature, not a limitation.** Every change should keep `md-viewer.py` self-contained and dependency-free. If it can't be done with Python's standard library plus a CDN link, it probably doesn't belong here.

## How to Contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b my-feature`
3. Make your changes to `md-viewer.py`
4. Test manually:
   ```bash
   python3 md-viewer.py              # test with current directory
   python3 md-viewer.py /some/path   # test with a different directory
   python3 md-viewer.py 3000         # test with a custom port
   ```
5. Commit your changes and open a pull request

## Guidelines

- **No external Python dependencies.** The stdlib is the only allowed import.
- **Keep it one file.** All server logic, HTML, CSS, and JS live in `md-viewer.py`.
- **Test manually** with folders containing varied Markdown (nested directories, large files, tables, code blocks, images).
- **Match the existing code style** — consistent formatting, clear variable names, comments where helpful.
- **Client-side libraries are OK** if loaded from a CDN (like marked.js), but keep them minimal.

## Ideas for Contributors

Not sure what to work on? Here are some directions:

- **Theming** — light theme toggle or user-selectable themes
- **Syntax highlighting** — integrate Prism.js or highlight.js via CDN for code blocks
- **Live reload** — watch for file changes and auto-refresh the browser
- **Export** — generate static HTML or PDF from the viewer
- **Diagrams** — Mermaid.js support for rendering diagrams in Markdown
- **Custom CSS** — `--css` CLI flag to inject a user stylesheet
- **Accessibility** — improve keyboard navigation and screen reader support

## Reporting Issues

Found a bug or have a suggestion? [Open an issue](../../issues) with:

- What you expected vs. what happened
- Your Python version (`python3 --version`)
- Your OS
- Steps to reproduce

## Code of Conduct

Be kind, be constructive, be welcoming. We're all here to build something useful.
