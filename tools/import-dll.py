#!/usr/bin/env python3
"""Import the publishable surface of a Road to Somewhere DLL repository."""

from __future__ import annotations

import json
import os
import shutil
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "extensions" / "sources.json"
DATA_DIR = ROOT / "_data"


def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def load_json(path: Path) -> dict:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc:
        fail(f"Could not read JSON {path}: {exc}")


def safe_relative(root: Path, relative: str) -> Path:
    candidate = (root / relative).resolve()
    root_resolved = root.resolve()
    if candidate != root_resolved and root_resolved not in candidate.parents:
        fail(f"Path escapes source repository: {relative}")
    return candidate


def latest_release(repository: str) -> dict:
    url = f"https://api.github.com/repos/{repository}/releases/latest"
    request = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "RTS-site-importer",
        },
    )
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        request.add_header("Authorization", f"Bearer {token}")

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        fail(f"Could not retrieve latest release for {repository}: {exc}")


def write_page_stub(slug: str, name: str, description: str) -> None:
    page_dir = ROOT / "dll"
    page_dir.mkdir(parents=True, exist_ok=True)
    page = (
        "---\n"
        "layout: dll\n"
        f"dll_data: {slug}\n"
        f"title: {json.dumps(name, ensure_ascii=False)}\n"
        f"description: {json.dumps(description, ensure_ascii=False)}\n"
        "---\n"
    )
    (page_dir / "index.html").write_text(page, encoding="utf-8")


def import_dll(entry: dict) -> None:
    repo_dir = Path(entry["checkoutPath"]).resolve()
    manifest_path = safe_relative(repo_dir, entry.get("manifest", "site/dll.json"))
    manifest = load_json(manifest_path)

    if manifest.get("schemaVersion") != 1:
        fail(f"{manifest_path}: unsupported schemaVersion")

    slug = manifest.get("id")
    if not isinstance(slug, str) or not slug or "/" in slug or "\\" in slug:
        fail(f"{manifest_path}: invalid id")

    name = manifest.get("name")
    if not isinstance(name, str) or not name.strip():
        fail(f"{manifest_path}: name is required")

    description = manifest.get("description", "")
    if not isinstance(description, str):
        fail(f"{manifest_path}: description must be a string")

    website = manifest.get("website")
    if not isinstance(website, dict):
        fail(f"{manifest_path}: website is required and must be an object")

    release = manifest.get("release")
    if not isinstance(release, dict):
        fail(f"{manifest_path}: release is required and must be an object")

    asset_name = release.get("asset")
    if not isinstance(asset_name, str) or not asset_name.strip():
        fail(f"{manifest_path}: release.asset is required")

    repository = entry.get("repository")
    if not isinstance(repository, str) or not repository.strip():
        fail("DLL source requires repository")

    release_data = latest_release(repository)
    tag = release_data.get("tag_name")
    if not isinstance(tag, str) or not tag.strip():
        fail(f"Latest release for {repository} has no tag_name")

    version = tag[1:] if tag.startswith("v") else tag
    asset = next(
        (item for item in release_data.get("assets", []) if item.get("name") == asset_name),
        None,
    )
    if asset is None:
        fail(f"Latest release for {repository} does not contain asset {asset_name}")

    public_manifest = json.loads(json.dumps(manifest))
    public_manifest["version"] = version
    public_manifest["release"] = {
        **release,
        "version": version,
        "tag": tag,
        "downloadUrl": asset.get("browser_download_url"),
        "releaseUrl": release_data.get("html_url"),
    }

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    data_path = DATA_DIR / f"{slug}.json"
    data_path.write_text(
        json.dumps(public_manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )

    write_page_stub(slug, name, description)
    print(f"Imported {name} {version} -> {slug}")


def main() -> None:
    registry = load_json(SOURCES)
    if registry.get("schemaVersion") != 1:
        fail("Unsupported extensions/sources.json schemaVersion")

    entries = registry.get("dlls", [])
    if not entries:
        print("No DLL sources configured.")
        return

    for entry in entries:
        checkout = entry.get("checkoutPath")
        if not checkout:
            fail("DLL importer requires checkoutPath for each source")
        import_dll(entry)


if __name__ == "__main__":
    main()
