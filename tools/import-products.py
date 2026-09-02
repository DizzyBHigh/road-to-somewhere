#!/usr/bin/env python3
"""Import publishable RTS products from their canonical site/rts.json manifests."""
from __future__ import annotations
import json
import shutil
import sys
import zipfile
from pathlib import Path
from github_release import download_asset, find_asset, latest_release, release_version

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "products" / "sources.json"
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
    base = root.resolve()
    if candidate != base and base not in candidate.parents:
        fail(f"Path escapes source repository: {relative}")
    return candidate


def copy_tree(source: Path, destination: Path) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    for item in source.iterdir():
        target = destination / item.name
        if item.is_dir():
            shutil.copytree(item, target, dirs_exist_ok=True)
        else:
            shutil.copy2(item, target)


def rewrite_asset_paths(value, slug: str):
    if isinstance(value, dict):
        return {
            key: (
                f"extensions/{slug}/{item}"
                if key == "src" and isinstance(item, str) and item.startswith("assets/")
                else f"other-tools/{slug}/assets/{item.removeprefix('images/')}"
                if key == "src" and isinstance(item, str) and item.startswith("images/")
                else rewrite_asset_paths(item, slug)
            )
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [rewrite_asset_paths(item, slug) for item in value]
    return value


def product_dir(manifest: dict) -> Path:
    page = manifest.get("page")
    if isinstance(page, dict) and isinstance(page.get("url"), str) and page["url"].strip("/"):
        return ROOT / page["url"].strip("/")
    base = "extensions" if manifest.get("category") == "extension" or manifest.get("type") == "extension" else "other-tools"
    return ROOT / base / manifest["slug"]


def normalise_website(product: dict) -> None:
    website = product.get("website", {})
    if not isinstance(website, dict) or not website:
        return
    if "hero" not in product:
        hero = website.get("hero", {})
        product["hero"] = {
            "kicker": website.get("sectionKicker", product.get("name", "")),
            "title": hero.get("title", product.get("name", "")),
            "titleEmphasis": hero.get("titleEmphasis"),
            "intro": hero.get("description", product.get("description", "")),
        }
    if "content" not in product:
        what = website.get("whatItDoes", {})
        product["content"] = {
            "experience": {
                "kicker": what.get("kicker", "WHAT IT DOES"),
                "title": what.get("title", "What it does."),
                "text": what.get("description", product.get("description", "")),
                "features": what.get("features", []),
            },
            "usedBy": website.get("usedBy"),
        }
    installation = website.get("installation")
    if installation and "setup" not in product:
        product["setup"] = {
            "title": installation.get("title", "Installation"),
            "intro": installation.get("description", ""),
            "steps": [
                {"number": index + 1, "title": step} if isinstance(step, str) else step
                for index, step in enumerate(installation.get("steps", []))
            ],
        }


def release_assets(release: dict, policy: dict) -> list[dict]:
    assets = [item for item in release.get("assets", []) if isinstance(item, dict)]
    exact = policy.get("asset")
    if exact:
        assets = [item for item in assets if item.get("name") == exact]
    elif policy.get("assets") == "zip":
        assets = [item for item in assets if item.get("name", "").lower().endswith(".zip")]
    else:
        assets = []
    if not assets:
        wanted = exact or "ZIP release assets"
        fail(f"Latest release does not contain {wanted}")
    return [{"name": item.get("name", ""), "downloadUrl": item.get("browser_download_url", "")} for item in assets]


def publish_extension_files(manifest: dict, release: dict, public_dir: Path) -> None:
    publish = manifest.get("publish", {})
    version = release_version(release)
    website = manifest.setdefault("website", {})
    if publish.get("overlay"):
        asset = find_asset(release, "overlay")
        zip_name = f"overlay {version}.zip"
        for old in public_dir.glob("overlay *.zip"):
            old.unlink()
        zip_path = public_dir / zip_name
        download_asset(asset, zip_path)
        overlay_dir = public_dir / "overlay"
        if overlay_dir.exists():
            shutil.rmtree(overlay_dir)
        overlay_dir.mkdir(parents=True)
        with zipfile.ZipFile(zip_path) as archive:
            for member in archive.infolist():
                target = (overlay_dir / member.filename).resolve()
                if overlay_dir.resolve() not in target.parents:
                    fail(f"Overlay archive contains unsafe path: {member.filename}")
            archive.extractall(overlay_dir)
        website["overlayUrl"] = f"/extensions/{manifest['slug']}/overlay/"
        website["overlayZipFilename"] = f"extensions/{manifest['slug']}/{zip_name}"
    if publish.get("importFile"):
        asset = find_asset(release, "import")
        source = Path(publish["importFile"])
        stem = source.stem.replace(" - Import Code", f" v{version} - Import Code")
        if stem == source.stem:
            stem = f"{stem} v{version}"
        filename = f"{stem}{source.suffix}"
        for old in public_dir.glob("*Import Code*.txt"):
            old.unlink()
        download_asset(asset, public_dir / filename)
        website["importFilename"] = f"extensions/{manifest['slug']}/{filename}"


def import_product(entry: dict) -> None:
    repository = entry.get("repository", "")
    if not isinstance(repository, str) or "/" not in repository:
        fail("Product source requires repository")
    repo_dir = (ROOT / entry.get("checkoutPath", f".import-src/{repository.rsplit('/', 1)[-1]}")).resolve()
    manifest_path = safe_relative(repo_dir, entry.get("manifest", "site/rts.json"))
    manifest = load_json(manifest_path)
    if manifest.get("schemaVersion") != 1:
        fail(f"{manifest_path}: unsupported schemaVersion")
    slug = manifest.get("slug") or manifest.get("id")
    name = manifest.get("name")
    if not isinstance(slug, str) or not slug or "/" in slug or "\\" in slug:
        fail(f"{manifest_path}: invalid slug/id")
    if not isinstance(name, str) or not name.strip():
        fail(f"{manifest_path}: name is required")
    public = json.loads(json.dumps(manifest))
    policy = public.get("release") if isinstance(public.get("release"), dict) else {}
    needs_release = bool(public.get("publish", {}).get("overlay") or public.get("publish", {}).get("importFile") or policy)
    release = latest_release(repository) if needs_release else None
    if release:
        public["version"] = release_version(release)
        public["release"] = {**policy, "version": public["version"], "tag": release.get("tag_name", ""), "releaseUrl": release.get("html_url", ""), "assets": release_assets(release, policy)} if policy else {"version": public["version"], "tag": release.get("tag_name", ""), "releaseUrl": release.get("html_url", ""), "assets": []}
        public["releaseUrl"] = release.get("html_url", "")
    public_dir = product_dir(public)
    public_dir.mkdir(parents=True, exist_ok=True)
    if public.get("publish", {}).get("overlay") or public.get("publish", {}).get("importFile"):
        try:
            publish_extension_files(public, release, public_dir)
        except (OSError, RuntimeError, zipfile.BadZipFile) as exc:
            fail(f"Could not publish extension release files: {exc}")
    publish = public.pop("publish", {})
    assets_source = publish.get("assets")
    if assets_source:
        source = safe_relative(repo_dir, assets_source)
        destination = public_dir / "assets"
        if not source.is_dir():
            fail(f"Published assets directory does not exist: {assets_source}")
        if destination.exists():
            shutil.rmtree(destination)
        copy_tree(source, destination)
    elif (repo_dir / "site" / "images").is_dir():
        destination = public_dir / "assets"
        if destination.exists():
            shutil.rmtree(destination)
        copy_tree(repo_dir / "site" / "images", destination)
    public = rewrite_asset_paths(public, slug)
    normalise_website(public)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / f"{slug}.json").write_text(json.dumps(public, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    page = "---\nlayout: product\nproduct_data: " + slug + "\n---\n"
    (public_dir / "index.html").write_text(page, encoding="utf-8")
    print(f"Imported {name} v{public.get('version', '')} -> {public_dir.relative_to(ROOT)}")


def main() -> None:
    registry = load_json(SOURCES)
    if registry.get("schemaVersion") != 1:
        fail("Unsupported products/sources.json schemaVersion")
    for entry in registry.get("products", []):
        import_product(entry)


if __name__ == "__main__":
    main()
