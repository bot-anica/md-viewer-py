import fnmatch
from pathlib import Path


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
    defaults = [".*", "node_modules", "__pycache__", "venv", "dist"]
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


def _is_dir_ignored(name, patterns):
    """Check if a directory name matches any ignore pattern."""
    for pattern in patterns:
        if pattern.startswith("!"):
            continue
        pat = pattern.rstrip("/")
        if fnmatch.fnmatch(name, pat):
            return True
    return False


def _read_gitignore(directory):
    """Read .gitignore patterns from a directory, if present."""
    gitignore = directory / ".gitignore"
    if not gitignore.is_file():
        return []
    patterns = []
    for line in gitignore.read_text(encoding="utf-8", errors="replace").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        patterns.append(line)
    return patterns


def scan_md_files(root):
    """Recursively find all .md files, skipping ignored directories."""
    root_patterns = parse_gitignore(root)
    files = []
    # Each entry: (directory, accumulated_patterns)
    dirs = [(root, root_patterns)]
    while dirs:
        d, parent_patterns = dirs.pop()
        try:
            entries = sorted(d.iterdir())
        except OSError:
            continue
        # Merge parent patterns with local .gitignore
        local = _read_gitignore(d) if d != root else []
        patterns = parent_patterns + local if local else parent_patterns
        for entry in entries:
            if entry.is_dir():
                if not _is_dir_ignored(entry.name, patterns):
                    dirs.append((entry, patterns))
            elif entry.suffix == ".md" and entry.is_file():
                rel = entry.relative_to(root)
                if is_ignored(rel, patterns):
                    continue
                # Read only first 20 lines for title extraction
                title = rel.stem.replace("-", " ").replace("_", " ").title()
                try:
                    with entry.open(encoding="utf-8", errors="replace") as fh:
                        line_count = 0
                        for i, line in enumerate(fh):
                            if i < 20 and line.startswith("# "):
                                title = line[2:].strip()
                            line_count += 1
                except OSError:
                    line_count = 0
                files.append({
                    "path": str(rel),
                    "folder": str(rel.parent) if str(rel.parent) != "." else "",
                    "name": rel.name,
                    "title": title,
                    "lines": line_count,
                })
    files.sort(key=lambda f: f["path"])
    return files
