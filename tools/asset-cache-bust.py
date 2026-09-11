#!/usr/bin/env python3
"""Add content hashes to local CSS and JavaScript asset URLs."""
from __future__ import annotations

import hashlib
import re
import sys
from pathlib import Path
from urllib.parse import urlsplit, urlunsplit

ASSET_RE = re.compile(r"(?P<prefix>(?:src|href)=[\"']|@import\s+[^;]*?url\(\s*[\"']?)(?P<url>[^\"' )]+)(?P<suffix>[\"']?\s*\))", re.I)
HTML_RE = re.compile(r"(?P<prefix>(?:src|href)=[\"'])(?P<url>[^\"']+)(?P<suffix>[\"'])", re.I)


def asset_path(root: Path, source: Path, url: str) -> Path | None:
    parsed = urlsplit(url)
    if parsed.scheme or parsed.netloc:
        return None
    raw = parsed.path
    if not raw or raw.startswith("data:"):
        return None
    if raw.startswith("/"):
        candidate = root / raw.lstrip("/")
        if candidate.is_file():
            return candidate
        parts = Path(raw.lstrip("/")).parts
        for index in range(1, len(parts)):
            candidate = root.joinpath(*parts[index:])
            if candidate.is_file():
                return candidate
        return None
    candidate = (source.parent / raw).resolve()
    return candidate if candidate.is_file() and root in candidate.parents else None


def cache_url(root: Path, source: Path, url: str) -> str:
    parsed = urlsplit(url)
    target = asset_path(root, source, url)
    if target is None or target.suffix.lower() not in {".css", ".js"}:
        return url
    digest = hashlib.sha256(target.read_bytes()).hexdigest()[:12]
    return urlunsplit((parsed.scheme, parsed.netloc, parsed.path, f"v={digest}", parsed.fragment))


def rewrite(path: Path, root: Path) -> bool:
    text = path.read_text(encoding="utf-8")
    if path.suffix.lower() == ".html":
        pattern = HTML_RE
    else:
        pattern = ASSET_RE

    changed = False

    def replace(match: re.Match[str]) -> str:
        nonlocal changed
        old = match.group("url")
        new = cache_url(root, path, old)
        if new != old:
            changed = True
        return f"{match.group('prefix')}{new}{match.group('suffix')}"

    updated = pattern.sub(replace, text)
    if changed:
        path.write_text(updated, encoding="utf-8")
    return changed


def main() -> None:
    root = Path(sys.argv[1] if len(sys.argv) > 1 else "_site").resolve()
    if not root.is_dir():
        raise SystemExit(f"Build directory not found: {root}")
    changed = 0
    for path in root.rglob("*"):
        if path.is_file() and path.suffix.lower() in {".html", ".css"}:
            changed += rewrite(path, root)
    print(f"Cache-busted {changed} HTML/CSS files in {root}")


if __name__ == "__main__":
    main()
