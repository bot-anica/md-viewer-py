#!/usr/bin/env python3
"""
Markdown Viewer — Drop in any folder, run, browse .md files.

Usage:
    python3 md-viewer.py              # serves current directory on port 8080
    python3 md-viewer.py 3000         # custom port
    python3 md-viewer.py /some/path   # custom directory
    python3 md-viewer.py /some/path 3000

Notes:
    - Respects .gitignore in the served directory: files and folders matching
      gitignore patterns are excluded from the viewer.
    - The .gitignore is read from the root of the served directory only
      (not from subdirectories).
    - Common non-content directories (.git, node_modules, __pycache__, .venv,
      venv, .next, dist, .astro) are always excluded even without a .gitignore.
    - When a custom directory is specified (e.g. python3 md-viewer.py /some/path),
      the .gitignore is read from that custom directory, not from the current
      working directory or any parent git repository.
"""

import fnmatch
import http.server
import json
import os
import re
import sys
import webbrowser
from pathlib import Path
from urllib.parse import unquote

# --- Configuration -----------------------------------------------------------

ROOT_DIR = Path.cwd()
PORT = 8080

if len(sys.argv) >= 2:
    arg1 = sys.argv[1]
    if arg1.isdigit():
        PORT = int(arg1)
    else:
        ROOT_DIR = Path(arg1).resolve()

if len(sys.argv) >= 3:
    PORT = int(sys.argv[2])

# --- Gitignore parsing -------------------------------------------------------

def parse_gitignore(root):
    """Parse .gitignore files from root and return a matcher function."""
    patterns = []
    gitignore = root / ".gitignore"
    if gitignore.is_file():
        for line in gitignore.read_text(encoding="utf-8", errors="replace").splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            patterns.append(line)

    # Always exclude common non-content directories
    defaults = [".git", "node_modules", "__pycache__", ".venv", "venv", ".next", "dist", ".astro"]
    for d in defaults:
        if d not in patterns:
            patterns.append(d)

    return patterns


def is_ignored(rel_path, patterns):
    """Check if a relative path matches any gitignore pattern."""
    rel_str = str(rel_path)
    parts = rel_path.parts

    for pattern in patterns:
        negated = pattern.startswith("!")
        if negated:
            continue  # skip negation for simplicity — don't un-ignore

        pat = pattern.rstrip("/")
        is_dir_only = pattern.endswith("/")

        # Check each path component against the pattern
        for part in parts:
            if fnmatch.fnmatch(part, pat):
                return True

        # Check full relative path
        if fnmatch.fnmatch(rel_str, pat):
            return True
        if fnmatch.fnmatch(rel_str, pat + "/**"):
            return True
        if fnmatch.fnmatch(rel_str, "**/" + pat):
            return True

    return False

# --- File discovery ----------------------------------------------------------

def scan_md_files(root):
    """Recursively find all .md files, respecting .gitignore."""
    patterns = parse_gitignore(root)
    files = []
    for p in sorted(root.rglob("*.md")):
        rel = p.relative_to(root)
        if is_ignored(rel, patterns):
            continue
        lines = p.read_text(encoding="utf-8", errors="replace").split("\n")
        # Extract first H1 as title
        title = rel.stem.replace("-", " ").replace("_", " ").title()
        for line in lines[:20]:
            if line.startswith("# "):
                title = line[2:].strip()
                break
        files.append({
            "path": str(rel),
            "folder": str(rel.parent) if str(rel.parent) != "." else "",
            "name": rel.name,
            "title": title,
            "lines": len(lines),
        })
    return files

# --- HTML template -----------------------------------------------------------

HTML_TEMPLATE = r"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Viewer</title>
  <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg: #0f1117;
      --bg-surface: #161922;
      --bg-card: #1c1f2e;
      --bg-hover: #242838;
      --border: #2a2e3f;
      --text: #e1e4ed;
      --text-muted: #8b90a5;
      --text-heading: #f0f2f8;
      --accent: #7c8aff;
      --accent-dim: rgba(124, 138, 255, 0.12);
      --green: #4ade80;
      --green-dim: rgba(74, 222, 128, 0.12);
      --amber: #fbbf24;
      --amber-dim: rgba(251, 191, 36, 0.12);
      --red: #f87171;
      --cyan: #22d3ee;
      --sidebar-w: 300px;
      --header-h: 56px;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.65;
      min-height: 100vh;
    }

    /* ---- Header ---- */
    .header {
      position: fixed; top: 0; left: 0; right: 0;
      height: var(--header-h);
      background: var(--bg-surface);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center;
      padding: 0 20px; z-index: 100; gap: 12px;
    }
    .header-logo { display: flex; align-items: center; gap: 10px; font-weight: 700; font-size: 15px; color: var(--text-heading); white-space: nowrap; }
    .header-logo .icon { width: 30px; height: 30px; background: linear-gradient(135deg, var(--accent), #a78bfa); border-radius: 8px; display: grid; place-items: center; font-size: 14px; }
    .header-meta { margin-left: auto; display: flex; align-items: center; gap: 12px; }
    .header-badge { display: inline-flex; align-items: center; gap: 5px; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; }
    .badge-files { background: var(--accent-dim); color: var(--accent); }
    .badge-lines { background: var(--green-dim); color: var(--green); }
    .badge-path { background: var(--bg-card); color: var(--text-muted); border: 1px solid var(--border); max-width: 40vw; overflow: hidden; white-space: nowrap; display: inline-flex; align-items: center; gap: 5px; }
    .badge-path .path-text { overflow: hidden; text-overflow: ellipsis; direction: rtl; text-align: left; }
    .menu-toggle { display: none; background: none; border: 1px solid var(--border); border-radius: 8px; color: var(--text); padding: 5px 9px; cursor: pointer; font-size: 16px; }
    .print-btn { background: none; border: 1px solid var(--border); border-radius: 8px; color: var(--text-muted); padding: 5px 10px; font-size: 11px; cursor: pointer; display: flex; align-items: center; gap: 5px; transition: all 0.15s; }
    .print-btn:hover { color: var(--text); border-color: var(--text-muted); }

    /* ---- Sidebar ---- */
    .sidebar {
      position: fixed; top: var(--header-h); left: 0;
      width: var(--sidebar-w); height: calc(100vh - var(--header-h));
      background: var(--bg-surface); border-right: 1px solid var(--border);
      overflow-y: auto; z-index: 90; padding: 12px 0;
      transition: transform 0.3s ease;
    }
    .sidebar::-webkit-scrollbar { width: 5px; }
    .sidebar::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

    .search-box { position: relative; padding: 6px 14px 12px; }
    .search-box input { width: 100%; padding: 7px 10px 7px 32px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 8px; color: var(--text); font-size: 12.5px; outline: none; transition: border-color 0.15s; }
    .search-box input:focus { border-color: var(--accent); }
    .search-box input::placeholder { color: var(--text-muted); }
    .search-box .search-icon { position: absolute; left: 26px; top: 15px; pointer-events: none; color: var(--text-muted); }

    .search-results { display: none; padding: 0 14px 12px; max-height: 320px; overflow-y: auto; }
    .search-results.active { display: block; }
    .search-result-item { padding: 6px 10px; border-radius: 6px; cursor: pointer; font-size: 12px; margin-bottom: 2px; transition: background 0.15s; }
    .search-result-item:hover { background: var(--bg-hover); }
    .search-result-item .file-label { font-size: 9px; color: var(--accent); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .search-result-item .match-text { color: var(--text-muted); margin-top: 1px; }
    .search-result-item mark { background: var(--amber-dim); color: var(--amber); border-radius: 2px; padding: 0 2px; }

    .sidebar-section-label {
      padding: 10px 18px 5px; font-size: 9px; font-weight: 700;
      text-transform: uppercase; letter-spacing: 1.2px; color: var(--text-muted);
    }

    .sidebar-toolbar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 4px 14px 8px; border-bottom: 1px solid var(--border); margin-bottom: 4px;
    }
    .sidebar-toolbar .sidebar-section-label { padding: 0; margin: 0; }
    .collapse-btn {
      background: none; border: 1px solid var(--border); border-radius: 6px;
      color: var(--text-muted); padding: 3px 8px; font-size: 10px; cursor: pointer;
      display: flex; align-items: center; gap: 4px; transition: all 0.15s;
      white-space: nowrap;
    }
    .collapse-btn:hover { color: var(--text); border-color: var(--text-muted); }

    /* ---- Tree ---- */
    .tree-node { }
    .tree-folder {
      display: flex; align-items: center; gap: 7px;
      padding: 5px 12px; cursor: pointer; user-select: none;
      transition: background 0.12s, color 0.12s;
      color: var(--text-muted); border-radius: 4px; margin: 1px 8px;
    }
    .tree-folder:hover { background: var(--bg-hover); color: var(--text); }
    .tree-folder .chevron { font-size: 8px; width: 12px; text-align: center; transition: transform 0.2s; flex-shrink: 0; }
    .tree-folder.collapsed .chevron { transform: rotate(-90deg); }
    .tree-folder .folder-icon { flex-shrink: 0; display: flex; align-items: center; }
    .tree-folder .folder-name { font-size: 12px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .tree-folder .folder-count { font-size: 10px; color: var(--text-muted); margin-left: auto; opacity: 0.6; flex-shrink: 0; }
    .tree-children { overflow: hidden; }
    .tree-children.collapsed { display: none; }

    .nav-item {
      display: flex; align-items: center; gap: 8px;
      padding: 5px 12px; cursor: pointer;
      border-left: 3px solid transparent;
      transition: all 0.12s ease; color: var(--text);
      border-radius: 0 4px 4px 0; margin: 1px 8px 1px 0;
    }
    .nav-item:hover { background: var(--bg-hover); }
    .nav-item.active { background: var(--accent-dim); border-left-color: var(--accent); }
    .nav-item.active .nav-title { color: var(--accent); }

    .nav-icon-sm { font-size: 13px; flex-shrink: 0; width: 18px; text-align: center; }
    .nav-details { min-width: 0; flex: 1; }
    .nav-title { font-size: 12px; font-weight: 600; color: var(--text-heading); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .nav-meta { font-size: 10px; color: var(--text-muted); }

    .toc-container { margin-top: 8px; border-top: 1px solid var(--border); padding-top: 4px; }
    .toc-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 4px 14px 6px; }
    .toc-toolbar .sidebar-section-label { padding: 0; }
    .toc-toolbar .toc-btns { display: flex; gap: 4px; }
    .toc-toolbar .collapse-btn { padding: 2px 6px; font-size: 9px; }

    .toc-group { }
    .toc-h2 {
      display: flex; align-items: center; gap: 6px;
      padding: 4px 18px; font-size: 12px; font-weight: 600;
      color: var(--text-muted); cursor: pointer; transition: all 0.12s;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      border-left: 3px solid transparent; text-decoration: none;
    }
    .toc-h2:hover { color: var(--text); background: var(--bg-hover); }
    .toc-h2.active { color: var(--accent); border-left-color: var(--accent); }
    .toc-h2 .toc-chevron { font-size: 7px; width: 10px; text-align: center; transition: transform 0.2s; flex-shrink: 0; opacity: 0.5; }
    .toc-h2.collapsed .toc-chevron { transform: rotate(-90deg); }
    .toc-h2-text { overflow: hidden; text-overflow: ellipsis; }
    .toc-children { overflow: hidden; }
    .toc-children.collapsed { display: none; }

    .toc-h3 {
      display: block; padding: 3px 18px 3px 38px; font-size: 11px;
      color: var(--text-muted); cursor: pointer; text-decoration: none;
      transition: all 0.12s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      border-left: 3px solid transparent;
    }
    .toc-h3:hover { color: var(--text); background: var(--bg-hover); }
    .toc-h3.active { color: var(--accent); border-left-color: var(--accent); }

    /* ---- Main ---- */
    .main { margin-left: var(--sidebar-w); margin-top: var(--header-h); min-height: calc(100vh - var(--header-h)); }
    .content-wrapper { max-width: 860px; margin: 0 auto; padding: 36px 44px 80px; }

    /* ---- Markdown ---- */
    .md h1 { font-size: 30px; font-weight: 800; color: var(--text-heading); margin: 0 0 8px; padding-bottom: 14px; border-bottom: 2px solid var(--border); line-height: 1.2; }
    .md h2 { font-size: 21px; font-weight: 700; color: var(--text-heading); margin: 44px 0 14px; padding-bottom: 7px; border-bottom: 1px solid var(--border); scroll-margin-top: calc(var(--header-h) + 20px); }
    .md h3 { font-size: 16px; font-weight: 600; color: var(--text-heading); margin: 28px 0 10px; scroll-margin-top: calc(var(--header-h) + 20px); }
    .md h4 { font-size: 13.5px; font-weight: 600; color: var(--accent); margin: 20px 0 8px; text-transform: uppercase; letter-spacing: 0.5px; }

    /* ---- Collapsible sections ---- */
    .md h2, .md h3, .md h4 { cursor: pointer; position: relative; }
    .md h2::before, .md h3::before, .md h4::before {
      content: ''; display: inline-block; width: 0; height: 0;
      border-left: 5px solid transparent; border-right: 5px solid transparent;
      border-top: 6px solid var(--text-muted);
      margin-right: 8px; vertical-align: middle;
      transition: transform 0.2s ease, opacity 0.2s;
      opacity: 0.4; position: relative; top: -1px;
    }
    .md h2:hover::before, .md h3:hover::before, .md h4:hover::before { opacity: 0.8; }
    .md h2.collapsed::before, .md h3.collapsed::before, .md h4.collapsed::before { transform: rotate(-90deg); }
    .md .section-body { transition: none; }
    .md .section-body.collapsed { display: none; }
    .md p { margin: 0 0 14px; font-size: 14px; }
    .md strong { color: var(--text-heading); font-weight: 600; }
    .md em { color: var(--text-muted); }
    .md a { color: var(--accent); text-decoration: none; border-bottom: 1px solid transparent; transition: border-color 0.15s; }
    .md a:hover { border-bottom-color: var(--accent); }
    .md ul, .md ol { margin: 0 0 14px; padding-left: 22px; }
    .md li { margin-bottom: 5px; font-size: 14px; }
    .md li::marker { color: var(--text-muted); }
    .md blockquote { border-left: 3px solid var(--accent); padding: 10px 18px; margin: 14px 0; background: var(--accent-dim); border-radius: 0 8px 8px 0; font-style: italic; color: var(--text-muted); }
    .md hr { border: none; border-top: 1px solid var(--border); margin: 36px 0; }
    .md code { background: var(--bg-card); padding: 2px 6px; border-radius: 4px; font-size: 12.5px; font-family: 'SF Mono', 'Fira Code', 'JetBrains Mono', monospace; color: var(--cyan); border: 1px solid var(--border); }
    .md pre { background: var(--bg-card); border: 1px solid var(--border); border-radius: 10px; padding: 18px; margin: 14px 0; overflow-x: auto; }
    .md pre code { background: none; border: none; padding: 0; font-size: 12.5px; color: var(--text); line-height: 1.7; }
    .md table { width: 100%; border-collapse: separate; border-spacing: 0; margin: 14px 0 20px; font-size: 13px; border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .md thead th { background: var(--bg-card); padding: 9px 12px; text-align: left; font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); border-bottom: 1px solid var(--border); }
    .md tbody td { padding: 9px 12px; border-bottom: 1px solid var(--border); vertical-align: top; }
    .md tbody tr:last-child td { border-bottom: none; }
    .md tbody tr:hover { background: var(--bg-hover); }
    .md li input[type="checkbox"] { margin-right: 6px; accent-color: var(--accent); }
    .md img { max-width: 100%; border-radius: 8px; margin: 12px 0; }

    /* ---- Progress ---- */
    .reading-progress { position: fixed; top: var(--header-h); left: var(--sidebar-w); right: 0; height: 2px; background: var(--border); z-index: 50; }
    .reading-progress-bar { height: 100%; background: linear-gradient(90deg, var(--accent), #a78bfa); width: 0%; transition: width 0.1s linear; }

    .back-to-top { position: fixed; bottom: 28px; right: 28px; width: 40px; height: 40px; border-radius: 10px; background: var(--bg-card); border: 1px solid var(--border); color: var(--text); display: grid; place-items: center; cursor: pointer; opacity: 0; transform: translateY(10px); transition: all 0.2s ease; font-size: 16px; z-index: 50; }
    .back-to-top.visible { opacity: 1; transform: translateY(0); }
    .back-to-top:hover { background: var(--accent); color: #fff; border-color: var(--accent); }

    .loading { display: flex; align-items: center; justify-content: center; height: 50vh; flex-direction: column; gap: 14px; }
    .spinner { width: 32px; height: 32px; border: 3px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .loading-text { color: var(--text-muted); font-size: 13px; }

    .highlight-flash { animation: flash 1.5s ease; }
    @keyframes flash { 0%, 100% { background: transparent; } 15% { background: var(--accent-dim); } }

    .empty-state { text-align: center; padding: 80px 20px; }
    .empty-state .icon { font-size: 48px; margin-bottom: 16px; }
    .empty-state h2 { font-size: 20px; color: var(--text-heading); margin-bottom: 8px; }
    .empty-state p { color: var(--text-muted); font-size: 14px; }

    /* ---- Breadcrumb + content toolbar ---- */
    .breadcrumb-bar {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid var(--border);
    }
    .breadcrumb { font-size: 12px; color: var(--text-muted); flex: 1; min-width: 0; }
    .breadcrumb span { cursor: default; }
    .breadcrumb .sep { margin: 0 6px; opacity: 0.4; }
    .content-toolbar { display: flex; gap: 6px; flex-shrink: 0; }

    @media (max-width: 900px) {
      .sidebar { transform: translateX(-100%); }
      .sidebar.open { transform: translateX(0); box-shadow: 4px 0 24px rgba(0,0,0,0.4); }
      .main { margin-left: 0; }
      .content-wrapper { padding: 20px 16px 60px; }
      .menu-toggle { display: block; }
      .reading-progress { left: 0; }
      .header-badge { display: none; }
      .md h1 { font-size: 22px; }
      .md h2 { font-size: 18px; }
      .md table { font-size: 11.5px; }
      .md thead th, .md tbody td { padding: 7px 8px; }
    }

    @media print {
      .header, .sidebar, .reading-progress, .back-to-top { display: none !important; }
      .main { margin-left: 0; }
      .content-wrapper { max-width: 100%; padding: 20px; }
      .md, .md h1, .md h2, .md h3, .md strong { color: #000; }
      .md table { border-color: #ccc; }
      .md thead th { background: #f0f0f0; color: #333; }
      .md code { background: #f5f5f5; color: #333; border-color: #ddd; }
      .md pre { background: #f5f5f5; border-color: #ddd; }
    }
  </style>
</head>
<body>

  <header class="header">
    <button class="menu-toggle" onclick="toggleSidebar()" aria-label="Toggle menu">&#9776;</button>
    <div class="header-logo">
      <div class="icon">&#9670;</div>
      <span>Markdown Viewer</span>
    </div>
    <div class="header-meta">
      <span class="header-badge badge-files" id="badgeFiles"></span>
      <span class="header-badge badge-lines" id="badgeLines"></span>
      <span class="header-badge badge-path" id="badgePath"></span>
      <button class="print-btn" onclick="window.print()"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-1px"><path d="M19 8H5c-1.66 0-3 1.34-3 3v4c0 1.1.9 2 2 2h2v2c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2v-2h2c1.1 0 2-.9 2-2v-4c0-1.66-1.34-3-3-3zm-4 11H9v-5h6v5zm4-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-2-8H7v4h10V4z"/></svg> Print</button>
    </div>
  </header>

  <nav class="sidebar" id="sidebar">
    <div class="search-box">
      <svg class="search-icon" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.5" cy="10.5" r="6.5"/><line x1="15.5" y1="15.5" x2="21" y2="21"/></svg>
      <input type="text" id="search" placeholder="Search across all files..." oninput="handleSearch(this.value)">
    </div>
    <div class="search-results" id="searchResults"></div>
    <div class="sidebar-toolbar" id="sidebarToolbar" style="display:none">
      <div class="sidebar-section-label">Explorer</div>
      <button class="collapse-btn" onclick="collapseAll()" title="Collapse all folders">&#9654; Collapse all</button>
    </div>
    <div id="navItems"></div>
    <div class="toc-container" id="tocContainer"></div>
  </nav>

  <div class="reading-progress"><div class="reading-progress-bar" id="progressBar"></div></div>

  <main class="main" id="main">
    <div class="content-wrapper">
      <div class="loading" id="loading"><div class="spinner"></div><div class="loading-text">Loading...</div></div>
      <div class="breadcrumb-bar" id="breadcrumbBar" style="display:none">
        <div class="breadcrumb" id="breadcrumb"></div>
        <div class="content-toolbar" id="contentToolbar">
          <button class="collapse-btn" onclick="collapseSections(true)" title="Collapse all sections">&#9654; Collapse</button>
          <button class="collapse-btn" onclick="collapseSections(false)" title="Expand all sections">&#9660; Expand</button>
        </div>
      </div>
      <article class="md" id="content" style="display:none"></article>
    </div>
  </main>

  <button class="back-to-top" id="backToTop" onclick="window.scrollTo({top:0,behavior:'smooth'})">&#8593;</button>

<script>
let FILES = [];
let fileContents = {};
let activeFileIdx = null;

const FILE_COLORS = [
  'linear-gradient(135deg, #7c8aff, #a78bfa)',
  'linear-gradient(135deg, #4ade80, #22d3ee)',
  'linear-gradient(135deg, #fbbf24, #f97316)',
  'linear-gradient(135deg, #f87171, #ec4899)',
  'linear-gradient(135deg, #22d3ee, #3b82f6)',
  'linear-gradient(135deg, #a78bfa, #ec4899)',
  'linear-gradient(135deg, #34d399, #4ade80)',
  'linear-gradient(135deg, #fb923c, #fbbf24)',
];

async function init() {
  try {
    const resp = await fetch('/api/files');
    const data = await resp.json();
    FILES = data.files;
    const pathEl = document.getElementById('badgePath');
    pathEl.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg><span class="path-text">' + data.root + '</span>';
    pathEl.title = data.root;
  } catch {
    document.getElementById('loading').innerHTML = `
      <div class="empty-state">
        <div class="icon">&#128466;</div>
        <h2>No API available</h2>
        <p>Run with: python3 md-viewer.py</p>
      </div>`;
    return;
  }

  if (FILES.length === 0) {
    document.getElementById('loading').innerHTML = `
      <div class="empty-state">
        <div class="icon">&#128466;</div>
        <h2>No .md files found</h2>
        <p>Place .md files in the directory and refresh.</p>
      </div>`;
    return;
  }

  const totalLines = FILES.reduce((s, f) => s + f.lines, 0);
  document.getElementById('badgeFiles').innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-1px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4z"/></svg> ' + FILES.length + ' file' + (FILES.length !== 1 ? 's' : '');
  document.getElementById('badgeLines').innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style="vertical-align:-1px"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h8v2H8v-2zm0 4h8v2H8v-2z"/></svg> ' + totalLines.toLocaleString() + ' lines';

  renderNav();
  await loadAllFiles();

  // Check URL hash
  const hash = window.location.hash.slice(1);
  const hashIdx = FILES.findIndex(f => slugify(f.path) === hash);
  showFile(hashIdx >= 0 ? hashIdx : 0);
}

function slugify(s) { return s.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').toLowerCase(); }

async function loadAllFiles() {
  const loads = FILES.map(async (f, i) => {
    try {
      const resp = await fetch('/files/' + encodeURIComponent(f.path));
      if (!resp.ok) throw new Error(resp.status);
      fileContents[i] = await resp.text();
    } catch {
      fileContents[i] = `# Error loading ${f.path}`;
    }
  });
  await Promise.all(loads);
}

function buildTree(files) {
  // Build a nested tree: { _files: [...], subfolder: { _files: [...], ... } }
  const root = { _files: [] };
  files.forEach((f, i) => {
    f._idx = i;
    const parts = f.folder ? f.folder.split('/') : [];
    let node = root;
    for (const part of parts) {
      if (!node[part]) node[part] = { _files: [] };
      node = node[part];
    }
    node._files.push(f);
  });
  return root;
}

function countFiles(node) {
  let n = node._files ? node._files.length : 0;
  for (const key of Object.keys(node)) {
    if (key === '_files') continue;
    n += countFiles(node[key]);
  }
  return n;
}

let hasFolders = false;

function renderNav() {
  const container = document.getElementById('navItems');
  container.innerHTML = '';
  const tree = buildTree(FILES);

  // Check if there are any folders
  hasFolders = Object.keys(tree).filter(k => k !== '_files').length > 0;
  document.getElementById('sidebarToolbar').style.display = hasFolders ? 'flex' : 'none';

  if (!hasFolders) {
    const label = document.createElement('div');
    label.className = 'sidebar-section-label';
    label.textContent = 'Files';
    container.appendChild(label);
  }

  renderTreeNode(container, tree, 0, true);
}

function collapseAll() {
  document.querySelectorAll('#navItems .tree-folder').forEach(h => h.classList.add('collapsed'));
  document.querySelectorAll('#navItems .tree-children').forEach(c => c.classList.add('collapsed'));
  // Re-expand path to active file
  if (activeFileIdx !== null) {
    const navEl = document.getElementById('nav-' + activeFileIdx);
    if (navEl) {
      let el = navEl.parentElement;
      while (el && el.id !== 'navItems') {
        if (el.classList.contains('tree-children') && el.classList.contains('collapsed')) {
          el.classList.remove('collapsed');
          const header = el.previousElementSibling;
          if (header && header.classList.contains('tree-folder')) header.classList.remove('collapsed');
        }
        el = el.parentElement;
      }
    }
  }
}

function renderTreeNode(parent, node, depth, isRoot) {
  const folderKeys = Object.keys(node).filter(k => k !== '_files').sort();
  const indent = 12 + depth * 16;

  // Render subfolders first
  folderKeys.forEach(name => {
    const child = node[name];
    const count = countFiles(child);
    const wrapper = document.createElement('div');
    wrapper.className = 'tree-node';

    const header = document.createElement('div');
    header.className = 'tree-folder' + (depth > 0 ? ' collapsed' : '');
    header.style.paddingLeft = indent + 'px';
    header.innerHTML = `<span class="chevron">&#9660;</span><span class="folder-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z"/></svg></span><span class="folder-name">${name}</span><span class="folder-count">${count}</span>`;

    const children = document.createElement('div');
    children.className = 'tree-children' + (depth > 0 ? ' collapsed' : '');

    header.onclick = () => {
      header.classList.toggle('collapsed');
      children.classList.toggle('collapsed');
    };

    wrapper.appendChild(header);
    renderTreeNode(children, child, depth + 1, false);
    wrapper.appendChild(children);
    parent.appendChild(wrapper);
  });

  // Render files
  if (node._files) {
    node._files.forEach(f => {
      parent.appendChild(createNavItem(f, indent));
    });
  }
}

function createNavItem(f, indent) {
  const item = document.createElement('div');
  item.className = 'nav-item';
  item.id = 'nav-' + f._idx;
  item.style.paddingLeft = (indent + 8) + 'px';
  item.onclick = (e) => { e.stopPropagation(); showFile(f._idx); };

  const colorIdx = f._idx % FILE_COLORS.length;
  item.innerHTML = `
    <div class="nav-icon-sm" style="background:${FILE_COLORS[colorIdx]};width:22px;height:22px;border-radius:5px;display:grid;place-items:center;flex-shrink:0;"><svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2l5 5h-5V4zM8 13h8v2H8v-2zm0 4h8v2H8v-2z"/></svg></div>
    <div class="nav-details">
      <div class="nav-title">${f.title}</div>
      <div class="nav-meta">${f.name} &middot; ${f.lines} lines</div>
    </div>
  `;
  return item;
}

async function showFile(idx) {
  activeFileIdx = idx;
  const f = FILES[idx];
  window.location.hash = slugify(f.path);

  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const navEl = document.getElementById('nav-' + idx);
  if (navEl) {
    navEl.classList.add('active');
    // Expand parent folders if collapsed
    let el = navEl.parentElement;
    while (el && el.id !== 'navItems') {
      if (el.classList.contains('tree-children') && el.classList.contains('collapsed')) {
        el.classList.remove('collapsed');
        const header = el.previousElementSibling;
        if (header && header.classList.contains('tree-folder')) header.classList.remove('collapsed');
      }
      el = el.parentElement;
    }
    // Scroll nav item into view in sidebar
    navEl.scrollIntoView({ block: 'nearest' });
  }

  // Always fetch fresh content from server
  try {
    const resp = await fetch('/files/' + encodeURIComponent(f.path));
    if (resp.ok) fileContents[idx] = await resp.text();
  } catch {}

  const md = fileContents[idx] || '';
  const html = marked.parse(md, { gfm: true, breaks: false });

  const content = document.getElementById('content');
  content.innerHTML = html;
  content.style.display = 'block';
  document.getElementById('loading').style.display = 'none';

  makeSectionsCollapsible(content);

  // Breadcrumb bar (file name + collapse/expand)
  const bc = document.getElementById('breadcrumb');
  if (f.folder) {
    const parts = f.folder.split('/');
    bc.innerHTML = parts.map(p => `<span>${p}</span>`).join('<span class="sep">/</span>') + `<span class="sep">/</span><span>${f.name}</span>`;
  } else {
    bc.innerHTML = `<span>${f.name}</span>`;
  }
  document.getElementById('breadcrumbBar').style.display = 'flex';

  buildToc();
  window.scrollTo({ top: 0 });

  if (window.innerWidth <= 900) {
    document.getElementById('sidebar').classList.remove('open');
  }
}

function makeSectionsCollapsible(container) {
  wrapLevel(container, 2);
}

function wrapLevel(container, level) {
  const tag = 'H' + level;
  const children = Array.from(container.children);
  let i = 0;

  while (i < children.length) {
    const el = children[i];
    if (el.tagName !== tag) { i++; continue; }

    const body = document.createElement('div');
    body.className = 'section-body';

    // Collect siblings until next heading of same or higher level
    let next = el.nextElementSibling;
    while (next && !(next.tagName && next.tagName.match(/^H[1-9]$/) && parseInt(next.tagName[1]) <= level)) {
      const move = next;
      next = next.nextElementSibling;
      body.appendChild(move);
    }

    if (body.children.length > 0) {
      el.after(body);
      el.onclick = (e) => {
        if (e.target.tagName === 'A') return;
        el.classList.toggle('collapsed');
        body.classList.toggle('collapsed');
      };
      // Recurse into this section-body for deeper headings
      if (level < 4) wrapLevel(body, level + 1);
    }

    // Re-scan since DOM changed
    children.length = 0;
    children.push(...Array.from(container.children));
    i = children.indexOf(body) + 1;
  }
}

function collapseSections(collapse) {
  const content = document.getElementById('content');
  content.querySelectorAll('h2, h3, h4').forEach(h => {
    const body = h.nextElementSibling;
    if (!body || !body.classList.contains('section-body')) return;
    if (collapse) {
      h.classList.add('collapsed');
      body.classList.add('collapsed');
    } else {
      h.classList.remove('collapsed');
      body.classList.remove('collapsed');
    }
  });
}

let tocAutoMode = true; // auto-open/close TOC groups on scroll
let tocHeadings = [];   // [{el, slug, level, tocEl, groupEl, childrenEl}]

function buildToc() {
  const container = document.getElementById('tocContainer');
  container.innerHTML = '';
  tocHeadings = [];

  // Toolbar
  const toolbar = document.createElement('div');
  toolbar.className = 'toc-toolbar';
  toolbar.innerHTML = `
    <div class="sidebar-section-label">On this page</div>
    <div class="toc-btns">
      <button class="collapse-btn" onclick="tocCollapseAll()" title="Collapse TOC">&#9654;</button>
      <button class="collapse-btn" onclick="tocExpandAll()" title="Expand TOC">&#9660;</button>
    </div>
  `;
  container.appendChild(toolbar);

  const headings = document.querySelectorAll('.md h2, .md h3');
  let currentGroup = null;
  let currentChildren = null;
  let currentH2Entry = null;

  headings.forEach((h, i) => {
    const slug = 'heading-' + i;
    h.id = slug;

    if (h.tagName === 'H2') {
      // Create collapsible group
      const group = document.createElement('div');
      group.className = 'toc-group';

      const h2Link = document.createElement('a');
      h2Link.className = 'toc-h2 collapsed';
      h2Link.href = '#' + slug;
      h2Link.innerHTML = `<span class="toc-chevron">&#9660;</span><span class="toc-h2-text">${h.textContent}</span>`;

      const children = document.createElement('div');
      children.className = 'toc-children collapsed';

      h2Link.onclick = (e) => {
        e.preventDefault();
        tocScrollTo(h);
      };

      group.appendChild(h2Link);
      group.appendChild(children);
      container.appendChild(group);

      currentGroup = group;
      currentChildren = children;
      currentH2Entry = { el: h, slug, level: 2, tocEl: h2Link, groupEl: group, childrenEl: children };
      tocHeadings.push(currentH2Entry);

    } else if (h.tagName === 'H3') {
      const h3Link = document.createElement('a');
      h3Link.className = 'toc-h3';
      h3Link.textContent = h.textContent;
      h3Link.href = '#' + slug;
      h3Link.onclick = (e) => {
        e.preventDefault();
        tocScrollTo(h);
      };

      if (currentChildren) {
        currentChildren.appendChild(h3Link);
      } else {
        container.appendChild(h3Link);
      }

      tocHeadings.push({ el: h, slug, level: 3, tocEl: h3Link, parentH2: currentH2Entry });
    }
  });

  tocAutoMode = true;
}

function tocScrollTo(h) {
  // Expand content section if collapsed
  if (h.classList.contains('collapsed')) {
    h.classList.remove('collapsed');
    const body = h.nextElementSibling;
    if (body && body.classList.contains('section-body')) body.classList.remove('collapsed');
  }
  h.scrollIntoView({ behavior: 'smooth', block: 'start' });
  h.classList.add('highlight-flash');
  setTimeout(() => h.classList.remove('highlight-flash'), 1500);
}

function tocCollapseAll() {
  tocAutoMode = true;
  document.querySelectorAll('.toc-h2').forEach(el => el.classList.add('collapsed'));
  document.querySelectorAll('.toc-children').forEach(el => el.classList.add('collapsed'));
  // Re-run scroll spy to open current section
  updateScrollSpy();
}

function tocExpandAll() {
  tocAutoMode = false;
  document.querySelectorAll('.toc-h2').forEach(el => el.classList.remove('collapsed'));
  document.querySelectorAll('.toc-children').forEach(el => el.classList.remove('collapsed'));
}

function updateScrollSpy() {
  if (tocHeadings.length === 0) return;

  const scrollY = window.scrollY;
  const offset = 100;

  // Find the current heading: last heading whose top <= scrollY + offset
  let activeIdx = -1;
  for (let i = tocHeadings.length - 1; i >= 0; i--) {
    const rect = tocHeadings[i].el.getBoundingClientRect();
    if (rect.top <= offset) { activeIdx = i; break; }
  }

  // Clear all active
  tocHeadings.forEach(t => t.tocEl.classList.remove('active'));

  if (activeIdx < 0) return;

  const active = tocHeadings[activeIdx];
  active.tocEl.classList.add('active');

  // Also highlight parent H2 if active is H3
  if (active.level === 3 && active.parentH2) {
    active.parentH2.tocEl.classList.add('active');
  }

  // Auto-open/close TOC groups when in auto mode
  if (tocAutoMode) {
    // Find which H2 group is active
    let activeH2 = active.level === 2 ? active : (active.parentH2 || null);

    tocHeadings.forEach(t => {
      if (t.level !== 2) return;
      if (t === activeH2) {
        t.tocEl.classList.remove('collapsed');
        if (t.childrenEl) t.childrenEl.classList.remove('collapsed');
      } else {
        t.tocEl.classList.add('collapsed');
        if (t.childrenEl) t.childrenEl.classList.add('collapsed');
      }
    });
  }

  // Scroll active TOC item into view in sidebar
  active.tocEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

function handleSearch(query) {
  const results = document.getElementById('searchResults');
  if (query.length < 2) { results.classList.remove('active'); results.innerHTML = ''; return; }

  const q = query.toLowerCase();
  let items = [];
  FILES.forEach((f, idx) => {
    const text = fileContents[idx] || '';
    text.split('\n').forEach((line, lineNum) => {
      if (line.toLowerCase().includes(q)) {
        const clean = line.replace(/^#+\s*/, '').replace(/\*\*/g, '').trim();
        if (!clean) return;
        items.push({ idx, file: f, line: clean, lineNum });
      }
    });
  });
  items = items.slice(0, 15);

  if (items.length === 0) {
    results.innerHTML = '<div style="padding:6px 10px;font-size:12px;color:var(--text-muted)">No results</div>';
    results.classList.add('active');
    return;
  }

  const re = new RegExp('(' + query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  results.innerHTML = items.map(it => {
    const h = it.line.substring(0, 100).replace(re, '<mark>$1</mark>');
    return `<div class="search-result-item" onclick="showFile(${it.idx});searchScroll(${it.lineNum})">
      <div class="file-label">${it.file.title}</div>
      <div class="match-text">${h}${it.line.length > 100 ? '...' : ''}</div>
    </div>`;
  }).join('');
  results.classList.add('active');
}

function searchScroll(lineNum) {
  document.getElementById('search').value = '';
  document.getElementById('searchResults').classList.remove('active');
  const content = document.getElementById('content');
  const total = (fileContents[activeFileIdx] || '').split('\n').length;
  const pct = lineNum / total;
  window.scrollTo({ top: content.offsetTop + content.scrollHeight * pct - 100, behavior: 'smooth' });
}

function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

window.addEventListener('scroll', () => {
  const winH = document.documentElement.scrollHeight - window.innerHeight;
  document.getElementById('progressBar').style.width = (winH > 0 ? (window.scrollY / winH) * 100 : 0) + '%';
  const btn = document.getElementById('backToTop');
  window.scrollY > 300 ? btn.classList.add('visible') : btn.classList.remove('visible');
  updateScrollSpy();
});

document.addEventListener('click', (e) => {
  if (window.innerWidth <= 900) {
    const sb = document.getElementById('sidebar'), tg = document.querySelector('.menu-toggle');
    if (!sb.contains(e.target) && !tg.contains(e.target)) sb.classList.remove('open');
  }
});

// Keyboard nav
document.addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === '/' || e.key === 'k' && (e.metaKey || e.ctrlKey)) {
    e.preventDefault();
    document.getElementById('search').focus();
  }
  if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    if (activeFileIdx > 0) { e.preventDefault(); showFile(activeFileIdx - 1); }
  }
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    if (activeFileIdx < FILES.length - 1) { e.preventDefault(); showFile(activeFileIdx + 1); }
  }
});

// Refresh file list every 3 seconds to pick up new/deleted/renamed files
setInterval(async () => {
  try {
    const resp = await fetch('/api/files');
    const data = await resp.json();
    const newPaths = data.files.map(f => f.path).join(',');
    const oldPaths = FILES.map(f => f.path).join(',');
    if (newPaths !== oldPaths) {
      FILES = data.files;
      renderNav();
      if (activeFileIdx !== null && activeFileIdx < FILES.length) {
        document.getElementById('nav-' + activeFileIdx)?.classList.add('active');
      }
    }
  } catch {}
}, 3000);

init();
</script>
</body>
</html>"""

# --- HTTP Handler ------------------------------------------------------------

class ViewerHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT_DIR), **kwargs)

    def do_GET(self):
        path = unquote(self.path)

        # Serve the viewer HTML at root
        if path == "/" or path == "/index.html":
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.end_headers()
            self.wfile.write(HTML_TEMPLATE.encode("utf-8"))
            return

        # API: list all .md files
        if path == "/api/files":
            files = scan_md_files(ROOT_DIR)
            payload = {
                "root": str(ROOT_DIR),
                "files": files,
            }
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(payload, ensure_ascii=False).encode("utf-8"))
            return

        # Serve .md files by path
        if path.startswith("/files/"):
            rel_path = path[7:]  # strip "/files/"
            file_path = ROOT_DIR / rel_path
            if file_path.is_file() and file_path.suffix == ".md":
                self.send_response(200)
                self.send_header("Content-Type", "text/plain; charset=utf-8")
                self.end_headers()
                self.wfile.write(file_path.read_bytes())
                return
            self.send_error(404, f"File not found: {rel_path}")
            return

        # Fallback: serve static files (images, etc.)
        super().do_GET()

    def log_message(self, format, *args):
        # Quiet logging — only show requests, not 200s for static files
        if "api" in str(args) or "files" in str(args):
            return
        super().log_message(format, *args)


# --- Main --------------------------------------------------------------------

def main():
    os.chdir(ROOT_DIR)
    server = http.server.HTTPServer(("", PORT), ViewerHandler)
    url = f"http://localhost:{PORT}"
    print(f"\n  Markdown Viewer")
    print(f"  {'─' * 40}")
    print(f"  Directory:  {ROOT_DIR}")
    print(f"  Files:      {len(scan_md_files(ROOT_DIR))} .md files found")
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


if __name__ == "__main__":
    main()
