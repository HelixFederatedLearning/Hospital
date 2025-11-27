#!/usr/bin/env python3
"""
tree_readme.py — print a Markdown-friendly folder structure.

Examples:
  python tree_readme.py                  # current dir, default excludes
  python tree_readme.py path/to/project  # custom root
  python tree_readme.py . --exclude .git,node_modules,dist --max-depth 3
  python tree_readme.py . --no-files     # show only directories
"""

import argparse
import os
import sys
from pathlib import Path
from fnmatch import fnmatch

DEFAULT_EXCLUDES = [
    ".git",
    "node_modules",
    "__pycache__",
    ".venv",
    ".mypy_cache",
    ".pytest_cache",
    ".DS_Store",
    "uploads"
]

def parse_args():
    p = argparse.ArgumentParser(description="Print a Markdown-formatted folder tree.")
    p.add_argument("root", nargs="?", default=".", help="Root directory (default: .)")
    p.add_argument("--exclude", default=",".join(DEFAULT_EXCLUDES),
                   help="Comma-separated names or glob patterns to exclude "
                        f"(default: {','.join(DEFAULT_EXCLUDES)})")
    p.add_argument("--max-depth", type=int, default=None,
                   help="Max depth to traverse (default: unlimited)")
    p.add_argument("--no-files", action="store_true",
                   help="Only list directories (omit files)")
    p.add_argument("--follow-symlinks", action="store_true",
                   help="Follow directory symlinks (default: do not)")
    return p.parse_args()

def should_exclude(name: str, patterns) -> bool:
    # Match either exact or glob (e.g., '*.log', 'build*')
    return any(fnmatch(name, pat) for pat in patterns)

def list_children(dirpath: Path, include_files: bool, exclude_patterns):
    try:
        entries = list(dirpath.iterdir())
    except PermissionError:
        return []
    # Filter by exclude list and hidden handling (hidden allowed unless excluded)
    filtered = []
    for e in entries:
        if should_exclude(e.name, exclude_patterns):
            continue
        if not include_files and not e.is_dir():
            continue
        filtered.append(e)
    # Sort: dirs first, then files; both alphabetically
    filtered.sort(key=lambda p: (not p.is_dir(), p.name.lower()))
    return filtered

def draw_tree(root: Path, include_files: bool, max_depth, exclude_patterns, follow_symlinks=False):
    lines = []

    def _walk(dirpath: Path, prefix: str, depth: int):
        if max_depth is not None and depth > max_depth:
            return
        children = list_children(dirpath, include_files, exclude_patterns)
        for i, child in enumerate(children):
            connector = "└── " if i == len(children) - 1 else "├── "
            line = f"{prefix}{connector}{child.name}"
            lines.append(line)

            # Recurse into directories
            try:
                is_dir = child.is_dir() or (follow_symlinks and child.is_symlink() and child.resolve().is_dir())
            except Exception:
                is_dir = False

            if is_dir:
                # Extend prefix for children of this node
                extension = "    " if i == len(children) - 1 else "│   "
                if max_depth is None or depth < max_depth:
                    _walk(child, prefix + extension, depth + 1)

    # Root header (don’t indent root; just display the folder name)
    root_display = root.resolve().name if root.exists() else str(root)
    lines.append(root_display)
    _walk(root, prefix="", depth=1)
    return lines

def main():
    args = parse_args()
    root = Path(args.root).resolve()
    if not root.exists() or not root.is_dir():
        print(f"Error: '{root}' is not a directory or does not exist.", file=sys.stderr)
        sys.exit(1)

    exclude_patterns = [pat.strip() for pat in args.exclude.split(",") if pat.strip()]

    tree_lines = draw_tree(
        root=root,
        include_files=not args.no_files,
        max_depth=args.max_depth,
        exclude_patterns=exclude_patterns,
        follow_symlinks=args.follow_symlinks,
    )

    # Wrap in Markdown code fence so you can paste directly into README.md
    print("```text")
    for line in tree_lines:
        print(line)
    print("```")

if __name__ == "__main__":
    main()
