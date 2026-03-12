# md-viewer-py — Improvements & Ideas

## High: Performance

1. [x] **Loads ALL files on startup** (`app.js:95-105`) — fetches every markdown file's content immediately. Should lazy-load on demand
2. [ ] **Linear search, no debounce** (`app.js:533-566`) — debounce added (200ms). Still does linear scan — consider a search index (lunr.js)
3. [ ] **3-second polling** (`app.js:704`) — unconditional polling. Could use WebSocket or `watchdog` file watcher on the server side
4. [ ] **No gzip compression** (`server.py`) — ~50KB of inlined HTML/CSS/JS sent uncompressed on every request
5. [ ] **No cache headers** — static assets and API responses lack `Cache-Control`
6. [ ] **O(n^2) section wrapping** (`app.js:296-336`) — `wrapLevel()` re-scans DOM children after each heading

## Medium: UX/UI

7. [ ] **No OS dark mode detection** — doesn't check `prefers-color-scheme`, always defaults to dark
8. [ ] **TOC collapsed by default** — users must click to expand Table of Contents
9. [ ] **No scroll position memory** — navigating back loses your place
10. [ ] **Search limited to 15 results** (`app.js:549`) — hard-coded, no "show more"
11. [ ] **Non-deterministic heading IDs** (`app.js:631`) — uses `Math.random()`, breaks anchor links on refresh. Should slugify heading text
12. [ ] **Breadcrumb spans not clickable** — breadcrumb is decorative only, should navigate
13. [ ] **No keyboard shortcut help** — no `?` modal showing available shortcuts
14. [ ] **No file name filter** — can only search content, not filter the file tree by name

## Low: Code Quality & Tech Debt

15. [ ] **Naive argument parsing** (`server.py:80-88`) — no `--help`, no port range validation, order-dependent args. Consider `argparse`
16. [ ] **Incomplete .gitignore parsing** (`scanner.py:33`) — negation patterns (`!pattern`) skipped, subdirectory patterns not supported
17. [ ] **No max file size limit** (`server.py:63`) — `read_bytes()` loads entire file into memory, large files could OOM
18. [ ] **Global JS state** (`app.js:1-4`) — `FILES`, `fileContents`, `activeFileIdx` as globals with no encapsulation
19. [ ] **Mermaid errors silently swallowed** (`app.js:29`) — empty `catch` block, user gets no feedback on diagram syntax errors
20. [ ] **Python 3.8 minimum** (`pyproject.toml:11`) — 3.8 is EOL since Nov 2024, bump to 3.10+
21. [x] **No symlink protection** (`scanner.py:57`) — `rglob` follows symlinks, could loop or escape root directory

## Ideas: New Features

22. [ ] **Right-side TOC panel** — move Table of Contents to a dedicated right sidebar. Collapsible to the right edge with the section name displayed vertically (rotated 90°) in collapsed state, so the user always sees which section they're in. Click the vertical label or a toggle to expand back to full TOC
23. [ ] **Static HTML export** — `mdview --export ./output` to generate a static site
24. [x] **In-browser markdown editing** — toggle between view and edit mode with a split-pane or full-screen editor. Save changes back to disk. Live preview as user type.
25. [ ] **File metadata from frontmatter** — parse YAML frontmatter for title, author, date instead of stripping it
26. [ ] **Custom sidebar ordering** — config file (`.mdview.yml`) for sidebar structure
27. [ ] **PDF export** — print-to-PDF with proper page breaks
28. [x] **WebSocket live reload** — replace polling with instant file change notifications 
