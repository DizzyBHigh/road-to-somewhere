#!/usr/bin/env python3
"""Import the publishable surface of a Road to Somewhere shared product."""
from __future__ import annotations
import json
import os
import sys
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
    if candidate != root.resolve() and root.resolve() not in candidate.parents:
        fail(f"Path escapes source repository: {relative}")
    return candidate


def latest_release(repository: str) -> dict:
    request = urllib.request.Request(
        f"https://api.github.com/repos/{repository}/releases/latest",
        headers={"Accept": "application/vnd.github+json", "User-Agent": "RTS-site-importer"},
    )
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        fail(f"Could not retrieve latest release for {repository}: {exc}")


def write_page_stub(product: dict) -> None:
    page_url = product.get("page", {}).get("url", "/dll/").strip("/")
    page_dir = ROOT / page_url
    page_dir.mkdir(parents=True, exist_ok=True)
    page = "---\nlayout: product\n"
    page += f"product_data: {product['id']}\n"
    page += f"title: {json.dumps(product['name'], ensure_ascii=False)}\n"
    page += f"description: {json.dumps(product.get('description', ''), ensure_ascii=False)}\n---\n"
    (page_dir / "index.html").write_text(page, encoding="utf-8")


def import_dll(entry: dict) -> None:
    repository = entry.get("repository", "")
    if not isinstance(repository, str) or "/" not in repository:
        fail("Shared product source requires repository")
    repo_dir = (ROOT / entry.get("checkoutPath", f".import-src/{repository.rsplit('/', 1)[-1]}")).resolve()
    manifest_path = safe_relative(repo_dir, entry.get("manifest", "site/dll.json"))
    manifest = load_json(manifest_path)
    if manifest.get("schemaVersion") != 1:
        fail(f"{manifest_path}: unsupported schemaVersion")
    if manifest.get("type") != "shared" or manifest.get("family") != "extensions":
        fail(f"{manifest_path}: shared extension-family product must have type=shared and family=extensions")
    slug = manifest.get("id")
    if not isinstance(slug, str) or not slug or "/" in slug or "\\" in slug:
        fail(f"{manifest_path}: invalid id")
    name = manifest.get("name")
    if not isinstance(name, str) or not name.strip():
        fail(f"{manifest_path}: name is required")
    release = manifest.get("release")
    if not isinstance(release, dict) or not release.get("asset"):
        fail(f"{manifest_path}: release.asset is required")
    release_data = latest_release(repository)
    tag = release_data.get("tag_name")
    if not isinstance(tag, str) or not tag.strip():
        fail(f"Latest release for {repository} has no tag_name")
    asset = next((item for item in release_data.get("assets", []) if item.get("name") == release["asset"]), None)
    if asset is None:
        fail(f"Latest release for {repository} does not contain asset {release['asset']}")
    public_manifest = json.loads(json.dumps(manifest))
    version = tag[1:] if tag.startswith("v") else tag
    public_manifest["version"] = version
    public_manifest["release"] = {**release, "version": version, "tag": tag, "downloadUrl": asset.get("browser_download_url"), "releaseUrl": release_data.get("html_url")}
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / f"{slug}.json").write_text(json.dumps(public_manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_page_stub(public_manifest)
    print(f"Imported {name} {version} -> {slug}")


def main() -> None:
    registry = load_json(SOURCES)
    if registry.get("schemaVersion") != 1:
        fail("Unsupported extensions/sources.json schemaVersion")
    for entry in registry.get("dlls", []):
        import_dll(entry)


if __name__ == "__main__":
    main()
