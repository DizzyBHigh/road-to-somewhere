#!/usr/bin/env python3
"""Import the publishable surface of private RTS product repositories."""
from __future__ import annotations
import json
import shutil
import sys
import zipfile
from pathlib import Path
from github_release import download_asset, find_asset, latest_release, release_version

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "extensions" / "sources.json"
DATA_DIR = ROOT / "_data"
EXT_DIR = ROOT / "extensions"


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


def copy_tree(source: Path, destination: Path) -> bool:
    if not source.exists():
        return False
    destination.mkdir(parents=True, exist_ok=True)
    for item in source.iterdir():
        target = destination / item.name
        if item.is_dir():
            shutil.copytree(item, target, dirs_exist_ok=True)
        else:
            shutil.copy2(item, target)
    return True


def versioned_import_filename(filename: str, version: str) -> str:
    path = Path(filename)
    stem, suffix = path.stem, path.suffix
    marker = " - Import Code"
    if marker in stem:
        stem = stem.replace(marker, f" v{version}{marker}", 1)
    else:
        stem = f"{stem} v{version}"
    return f"{stem}{suffix}"


def rewrite_published_asset_paths(value, slug: str):
    if isinstance(value, dict):
        return {
            key: (
                f"extensions/{slug}/{item}"
                if key == "src" and isinstance(item, str) and item.startswith("assets/")
                else rewrite_published_asset_paths(item, slug)
            )
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [rewrite_published_asset_paths(item, slug) for item in value]
    return value


def populate_dependency_information(manifest: dict) -> None:
    setup = manifest.get("setup")
    if not isinstance(setup, dict):
        return
    dll_info = setup.get("dllInformation")
    if not isinstance(dll_info, dict):
        return
    dependency_id = dll_info.get("dependencyId")
    if not isinstance(dependency_id, str) or not dependency_id.strip():
        return
    dependencies = manifest.get("dependencies")
    if not isinstance(dependencies, dict):
        fail("setup.dllInformation references a dependency, but dependencies is missing")
    dependency = next((item for item in dependencies.values() if isinstance(item, dict) and item.get("id") == dependency_id), None)
    if dependency is None:
        fail(f"setup.dllInformation references unknown dependency: {dependency_id}")
    name, minimum_version = dependency.get("name"), dependency.get("minimumVersion")
    if not isinstance(name, str) or not name.strip():
        fail(f"dependency {dependency_id}: name is required")
    if not isinstance(minimum_version, str) or not minimum_version.strip():
        fail(f"dependency {dependency_id}: minimumVersion is required")
    dll_info["text"] = f"This extension requires {name} {minimum_version} or newer."


def write_page_stub(directory: Path, slug: str, name: str, version: str, description: str) -> None:
    page = "---\nlayout: product\n"
    page += f"product_data: {slug}\n"
    page += f"title: {json.dumps(f'{name} v{version}', ensure_ascii=False)}\n"
    page += f"description: {json.dumps(description, ensure_ascii=False)}\n"
    page += "extra_css: /assets/product.css\n---\n"
    (directory / "index.html").write_text(page, encoding="utf-8")


def import_extension(entry: dict) -> None:
    repository = entry.get("repository", "")
    if not isinstance(repository, str) or "/" not in repository:
        fail("Product source requires repository")
    repo_dir = (ROOT / entry.get("checkoutPath", f".import-src/{repository.rsplit('/', 1)[-1]}")).resolve()
    manifest_path = safe_relative(repo_dir, entry.get("manifest", "site/rts.json"))
    manifest = load_json(manifest_path)
    if manifest.get("schemaVersion") != 1:
        fail(f"{manifest_path}: unsupported schemaVersion")
    slug, name = manifest.get("slug"), manifest.get("name")
    if not isinstance(slug, str) or not slug or "/" in slug or "\\" in slug or slug in {".", ".."}:
        fail(f"{manifest_path}: invalid slug")
    if not isinstance(name, str) or not name.strip():
        fail(f"{manifest_path}: name is required")
    content = manifest.get("content")
    if content is not None and not isinstance(content, dict):
        fail(f"{manifest_path}: content must be an object when present")
    public_manifest = json.loads(json.dumps(manifest))
    publish = public_manifest.pop("publish", {})
    populate_dependency_information(public_manifest)
    website = public_manifest.setdefault("website", {})
    public_extension_dir = EXT_DIR / slug
    public_extension_dir.mkdir(parents=True, exist_ok=True)
    release = None
    if publish.get("overlay") or publish.get("importFile"):
        try:
            release = latest_release(repository)
            version = release_version(release)
        except RuntimeError as exc:
            fail(str(exc))
        public_manifest["version"] = version
    else:
        version = public_manifest.get("version", "")
    if publish.get("overlay"):
        try:
            overlay_asset = find_asset(release, "overlay")
            overlay_zip_name = f"overlay {version}.zip"
            for old in public_extension_dir.glob("overlay *.zip"):
                old.unlink()
            overlay_zip_destination = public_extension_dir / overlay_zip_name
            download_asset(overlay_asset, overlay_zip_destination)
            overlay_destination = public_extension_dir / "overlay"
            if overlay_destination.exists():
                shutil.rmtree(overlay_destination)
            overlay_destination.mkdir(parents=True)
            with zipfile.ZipFile(overlay_zip_destination) as archive:
                archive.extractall(overlay_destination)
        except (OSError, zipfile.BadZipFile, RuntimeError) as exc:
            fail(f"Could not publish overlay from latest release: {exc}")
        website["overlayUrl"] = f"/extensions/{slug}/overlay/"
        website["overlayZipFilename"] = f"extensions/{slug}/{overlay_zip_name}"
    if publish.get("importFile"):
        try:
            import_asset = find_asset(release, "import")
            for old in public_extension_dir.glob("*Import Code*.txt"):
                old.unlink()
            published_name = versioned_import_filename(publish["importFile"], version)
            download_asset(import_asset, public_extension_dir / published_name)
        except RuntimeError as exc:
            fail(str(exc))
        website["importFilename"] = f"extensions/{slug}/{published_name}"
    assets_source = publish.get("assets")
    if assets_source:
        assets_source_path = safe_relative(repo_dir, assets_source)
        assets_destination = public_extension_dir / "assets"
        if not assets_source_path.is_dir():
            print(f"Skipping optional extension assets: {assets_source} (directory does not exist)")
        else:
            if assets_destination.exists():
                shutil.rmtree(assets_destination)
            copy_tree(assets_source_path, assets_destination)
            public_manifest = rewrite_published_asset_paths(public_manifest, slug)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    (DATA_DIR / f"{slug}.json").write_text(json.dumps(public_manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_page_stub(public_extension_dir, slug, name, version, manifest.get("description", ""))
    print(f"Imported {name} v{version} -> {slug}")


def main() -> None:
    registry = load_json(SOURCES)
    if registry.get("schemaVersion") != 1:
        fail("Unsupported extensions/sources.json schemaVersion")
    entries = registry.get("extensions", [])
    if not entries:
        print("No private product sources configured.")
        return
    for entry in entries:
        import_extension(entry)


if __name__ == "__main__":
    main()
