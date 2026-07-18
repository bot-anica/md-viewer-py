# Contributing to md-viewer-py

Thanks for your interest in contributing! This project values simplicity — minimal Python dependencies, installable via pip, and easy to hack on.

## Philosophy

**Minimal dependencies is a feature, not a limitation.** The Python side is stdlib plus a single dependency (watchdog, for file-change notifications). If it can't be done with that plus a CDN link on the client, it probably doesn't belong here.

## How to Contribute

1. Fork the repository
2. Create a feature branch: `git checkout -b my-feature`
3. Make your changes in `src/md_viewer/`
4. Test manually:
   ```bash
   pip install -e .                   # install in dev mode
   mdview                             # test with current directory
   mdview /some/path                  # test with a different directory
   mdview /some/path 3000             # test with a custom port
   ```
5. Commit your changes and open a pull request

## Project Structure

```
src/md_viewer/
├── __init__.py      # version
├── __main__.py      # python -m md_viewer entry point
├── server.py        # HTTP server and request handling
├── scanner.py       # file discovery and .gitignore parsing
└── static/
    ├── index.html   # page template
    ├── app.js       # client-side application logic
    ├── style.css    # styles (dark/light themes)
    └── logo.png     # app icon
```

## Guidelines

- **No new external Python dependencies.** Only the stdlib and the existing watchdog import are permitted.
- **Test manually** with folders containing varied Markdown (nested directories, large files, tables, code blocks, images).
- **Match the existing code style** — consistent formatting, clear variable names, comments where helpful.
- **Client-side libraries are OK** if loaded from a CDN (like marked.js, highlight.js, mermaid.js), but keep them minimal.

## Ideas for Contributors

Not sure what to work on? See the full [improvements & ideas list](IMPROVEMENTS.md) for detailed suggestions covering performance, UX, security, and new features.

## Reporting Issues

Found a bug or have a suggestion? [Open an issue](../../issues) with:

- What you expected vs. what happened
- Your Python version (`python3 --version`)
- Your OS
- Steps to reproduce

## Code of Conduct

Be kind, be constructive, be welcoming. We're all here to build something useful.
