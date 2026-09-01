#!/usr/bin/env python3
"""Import the publishable surface of private RTS product repositories."""
from __future__ import annotations
import json
import shutil
import sys
import zipfile
from pathlib import Path

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


def copy_file(source: Path, destination: Path) -> bool:
    if not source.is_file():
        return False
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)
    return True


def create_overlay_zip(overlay_source: Path, destination: Path) -> None:
    """Create a ZIP containing the complete contents of the published overlay."""
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for item in sorted(overlay_source.rglob("*")):
            if item.is_file():
                archive.write(item, item.relative_to(overlay_source).as_posix())


def versioned_import_filename(filename: str, version: str) -> str:
    """Insert the extension version into the published import filename."""
    path = Path(filename)
    stem = path.stem
    suffix = path.suffix
    marker = " - Import Code"
    if marker in stem:
        stem = stem.replace(marker, f" v{version}{marker}", 1)
    else:
        stem = f"{stem} v{version}"
    return f"{stem}{suffix}"


def rewrite_published_asset_paths(value, slug: str):
    """Rewrite extension-owned asset paths to paths relative to the extension page."""
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
    """Populate generated dependency text from the dependency definition."""
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
    name = dependency.get("name")
    minimum_version = dependency.get("minimumVersion")
    if not isinstance(name, str) or not name.strip():
        fail(f"dependency {dependency_id}: name is required")
    if not isinstance(minimum_version, str) or not minimum_version.strip():
        fail(f"dependency {dependency_id}: minimumVersion is required")
    dll_info["text"] = f"This extension requires {name} {minimum_version} or newer."


def write_page_stub(public_extension_dir: Path, slug: str, name: str, version: str, description: str) -> None:
    """Generate the minimal Jekyll product page stub."""
    page = (
        "---\n"
        "layout: product\n"
        f"product_data: {slug}\n"
        f"title: {json.dumps(f'{name} v{version}', ensure_ascii=False)}\n"
        f"description: {json.dumps(description, ensure_ascii=False)}\n"
        "extra_css: /assets/product.css\n"
        "---\n"
    )
    (public_extension_dir / "index.html").write_text(page, encoding="utf-8")


def import_extension(entry: dict) -> None:
    repository = entry.get("repository", "")
    if not isinstance(repository, str) or "/" not in repository:
        fail("Product source requires repository")
    repo_dir = (ROOT / entry.get("checkoutPath", f".import-src/{repository.rsplit('/', 1)[-1]}")).resolve()
    manifest_path = safe_relative(repo_dir, entry.get("manifest", "site/rts.json"))
    manifest = load_json(manifest_path)
    if manifest.get("schemaVersion") != 1:
        fail(f"{manifest_path}: unsupported schemaVersion")
    slug = manifest.get("slug")
    if not isinstance(slug, str) or not slug or "/" in slug or "\\" in slug or slug in {".", ".."}:
        fail(f"{manifest_path}: invalid slug")
    name = manifest.get("name")
    if not isinstance(name, str) or not name.strip():
        fail(f"{manifest_path}: name is required")
    version = manifest.get("version")
    if not isinstance(version, str) or not version.strip():
        fail(f"{manifest_path}: version is required for publishing")
    description = manifest.get("description", "")
    if not isinstance(description, str):
        fail(f"{manifest_path}: description must be a string")
    content = manifest.get("content")
    if content is not None and not isinstance(content, dict):
        fail(f"{manifest_path}: content must be an object when present")
    public_manifest = json.loads(json.dumps(manifest))
    publish = public_manifest.pop("publish", {})
    populate_dependency_information(public_manifest)
    website = public_manifest.setdefault("website", {})
    public_extension_dir = EXT_DIR / slug
    public_extension_dir.mkdir(parents=True, exist_ok=True)
    overlay_source = publish.get("overlay")
    if overlay_source:
        overlay_source_path = safe_relative(repo_dir, overlay_source)
        overlay_destination = public_extension_dir / "overlay"
        if overlay_destination.exists():
            shutil.rmtree(overlay_destination)
        if not copy_tree(overlay_source_path, overlay_destination):
            fail(f"{manifest_path}: publish.overlay does not exist: {overlay_source}")
        overlay_zip_name = f"overlay {version}.zip"
        overlay_zip_destination = public_extension_dir / overlay_zip_name
        if overlay_zip_destination.exists():
            overlay_zip_destination.unlink()
        create_overlay_zip(overlay_source_path, overlay_zip_destination)
        website["overlayUrl"] = f"/extensions/{slug}/overlay/"
        website["overlayZipFilename"] = f"extensions/{slug}/{overlay_zip_name}"
    import_source = publish.get("importFile")
    if import_source:
        import_source_path = safe_relative(repo_dir, import_source)
        published_import_name = versioned_import_filename(import_source_path.name, version)
        import_destination = public_extension_dir / published_import_name
        if not copy_file(import_source_path, import_destination):
            fail(f"{manifest_path}: publish.importFile does not exist: {import_source}")
        website["importFilename"] = f"extensions/{slug}/{published_import_name}"
    assets_source = publish.get("assets")
    if assets_source:
        assets_source_path = safe_relative(repo_dir, assets_source)
        assets_destination = public_extension_dir / "assets"
        if not assets_source_path.is_dir():
            print(f"Skipping optional extension assets: {assets_source} (directory does not exist)")
        else:
            asset_items = list(assets_source_path.iterdir())
            if not asset_items:
                print(f"Skipping optional extension assets: {assets_source} (directory is empty)")
            else:
                if assets_destination.exists():
                    shutil.rmtree(assets_destination)
                copy_tree(assets_source_path, assets_destination)
                public_manifest = rewrite_published_asset_paths(public_manifest, slug)
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    data_path = DATA_DIR / f"{slug}.json"
    data_path.write_text(json.dumps(public_manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    write_page_stub(public_extension_dir, slug, name, version, description)
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
