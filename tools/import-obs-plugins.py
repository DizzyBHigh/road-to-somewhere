#!/usr/bin/env python3
"""Import the public RTS presentation surface of OBS plugin repositories."""
from __future__ import annotations
import json, shutil, sys
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "obs-plugins" / "sources.json"
DATA_DIR = ROOT / "_data"
PRODUCT_DIR = ROOT / "other-tools"

def fail(message: str) -> None:
    print(f"ERROR: {message}", file=sys.stderr); raise SystemExit(1)

def load_json(path: Path) -> dict:
    try: return json.loads(path.read_text(encoding="utf-8"))
    except Exception as exc: fail(f"Could not read JSON {path}: {exc}")

def safe_relative(root: Path, relative: str) -> Path:
    candidate = (root / relative).resolve(); root_resolved = root.resolve()
    if candidate != root_resolved and root_resolved not in candidate.parents:
        fail(f"Path escapes source repository: {relative}")
    return candidate

def checkout_path(entry: dict) -> Path:
    repository = entry.get("repository", "")
    if not isinstance(repository, str) or "/" not in repository: fail("OBS plugin source requires repository")
    return ROOT / entry.get("checkoutPath", f".import-src/{repository.rsplit('/', 1)[-1]}")

def copy_tree(source: Path, destination: Path) -> bool:
    if not source.is_dir(): return False
    destination.mkdir(parents=True, exist_ok=True)
    for item in source.iterdir():
        target = destination / item.name
        if item.is_dir(): shutil.copytree(item, target, dirs_exist_ok=True)
        else: shutil.copy2(item, target)
    return True

def github_json(url: str) -> dict | None:
    request = Request(url, headers={"Accept": "application/vnd.github+json", "User-Agent": "Road-to-Somewhere-Jekyll"})
    try:
        with urlopen(request, timeout=15) as response: return json.loads(response.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        print(f"Warning: could not read GitHub release data from {url}: {exc}"); return None

def latest_release(repository: str) -> dict:
    release = github_json(f"https://api.github.com/repos/{repository}/releases/latest")
    if not release: return {"tag": "", "name": "", "url": f"https://github.com/{repository}/releases", "assets": []}
    assets = [{"name": a.get("name", ""), "downloadUrl": a.get("browser_download_url", ""), "size": a.get("size", 0), "contentType": a.get("content_type", "")} for a in release.get("assets", []) if isinstance(a, dict)]
    return {"tag": release.get("tag_name", ""), "name": release.get("name", ""), "url": release.get("html_url", f"https://github.com/{repository}/releases"), "publishedAt": release.get("published_at", ""), "body": release.get("body", ""), "assets": assets}

def rewrite_image_paths(value, slug: str):
    if isinstance(value, dict):
        return {key: (f"/other-tools/{slug}/assets/{item.removeprefix('images/')}" if key == "src" and isinstance(item, str) and item.startswith("images/") else rewrite_image_paths(item, slug)) for key, item in value.items()}
    if isinstance(value, list): return [rewrite_image_paths(item, slug) for item in value]
    return value

def write_page_stub(directory: Path, slug: str) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    (directory / "index.html").write_text(f"---\nlayout: product\nproduct_data: {slug}\n---\n", encoding="utf-8")

def import_plugin(entry: dict) -> None:
    repo_dir = checkout_path(entry).resolve()
    manifest_path = safe_relative(repo_dir, entry.get("manifest", "site/rts.json")); rts = load_json(manifest_path)
    if rts.get("schemaVersion") != 1: fail(f"{manifest_path}: unsupported schemaVersion")
    slug = rts.get("slug")
    if not isinstance(slug, str) or not slug or "/" in slug or "\\" in slug or slug in {".", ".."}: fail(f"{manifest_path}: invalid slug")
    repository = entry.get("repository")
    if not isinstance(repository, str) or "/" not in repository: fail(f"{manifest_path}: repository is required in sources.json")
    buildspec_path = safe_relative(repo_dir, "buildspec.json"); buildspec = load_json(buildspec_path)
    name = buildspec.get("displayName") or buildspec.get("name") or rts.get("name"); version = buildspec.get("version")
    if not isinstance(name, str) or not name.strip(): fail(f"{buildspec_path}: displayName or name is required")
    if not isinstance(version, str) or not version.strip(): fail(f"{buildspec_path}: version is required")
    release = latest_release(repository); release_tag = release.get("tag") or version
    public_data = json.loads(json.dumps(rts)); public_data.update({"name": name, "version": version, "repository": f"https://github.com/{repository}", "author": buildspec.get("author", ""), "release": release, "releaseUrl": release.get("url") or f"https://github.com/{repository}/releases/tag/{release_tag}"})
    public_data["website"] = public_data.get("website") if isinstance(public_data.get("website"), dict) else {}
    public_data["website"]["footerLabel"] = public_data["website"].get("footerLabel", "The road is open.")
    public_data = rewrite_image_paths(public_data, slug)
    public_product_dir = PRODUCT_DIR / slug; assets_destination = public_product_dir / "assets"
    if assets_destination.exists(): shutil.rmtree(assets_destination)
    images_source = repo_dir / "site" / "images"
    if images_source.is_dir(): copy_tree(images_source, assets_destination)
    write_page_stub(public_product_dir, slug)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / f"{slug}.json").write_text(json.dumps(public_data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Imported {name} v{version} -> other-tools/{slug} (release {release_tag})")

def main() -> None:
    registry = load_json(SOURCES)
    if registry.get("schemaVersion") != 1: fail("Unsupported obs-plugins/sources.json schemaVersion")
    entries = registry.get("plugins", [])
    if not entries: print("No OBS plugin sources configured."); return
    for entry in entries: import_plugin(entry)

if __name__ == "__main__": main()
