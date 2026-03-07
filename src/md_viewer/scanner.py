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
