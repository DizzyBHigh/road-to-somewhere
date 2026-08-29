#!/usr/bin/env python3
"""Import the publishable surface of private RTS extension repositories.

The private repository remains the source of truth. Only the extension manifest
and explicitly published assets are copied into the public Jekyll build tree.
"""

from __future__ import annotations

import json
import shutil
import sys
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


def versioned_import_filename(filename: str, version: str) -> str:
    """Insert the extension version into the published import filename.

    Source repositories keep a stable filename such as
    ``RTS Ban Timeout Widget - Import Code.txt``. Published files are versioned
    so each release can be downloaded exactly as it was published.
    """
    path = Path(filename)
    stem = path.stem
    suffix = path.suffix
    marker = " - Import Code"

    if marker in stem:
        stem = stem.replace(marker, f" v{version}{marker}", 1)
    else:
        stem = f"{stem} v{version}"

    return f"{stem}{suffix}"


def rewrite_published_image_paths(value, slug: str):
    """Rewrite extension-owned asset paths to their public imported location.

    Shared site assets use absolute /assets/... paths and are left untouched.
    Extension-owned assets use relative assets/... paths and are rewritten.
    """
    if isinstance(value, dict):
        return {
            key: (
                f"/extensions/{slug}/{item}"
                if key == "src"
                and isinstance(item, str)
                and item.startswith("assets/")
                else rewrite_published_image_paths(item, slug)
            )
            for key, item in value.items()
        }

    if isinstance(value, list):
        return [rewrite_published_image_paths(item, slug) for item in value]

    return value


def populate_dependency_information(manifest: dict) -> None:
    """Populate generated dependency text from the dependency definition.

    The manifest stores the dependency version once, under ``dependencies``.
    Human-readable dependency information references that dependency by ID so
    the displayed minimum version cannot drift from the actual requirement.
    """
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

    dependency = next(
        (
            item
            for item in dependencies.values()
            if isinstance(item, dict) and item.get("id") == dependency_id
        ),
        None,
    )
    if dependency is None:
        fail(f"setup.dllInformation references unknown dependency: {dependency_id}")

    name = dependency.get("name")
    minimum_version = dependency.get("minimumVersion")
    if not isinstance(name, str) or not name.strip():
        fail(f"dependency {dependency_id}: name is required")
    if not isinstance(minimum_version, str) or not minimum_version.strip():
        fail(f"dependency {dependency_id}: minimumVersion is required")

    dll_info["text"] = f"This extension requires {name} {minimum_version} or newer."


def import_extension(entry: dict) -> None:
    repo_dir = Path(entry["checkoutPath"]).resolve()
    manifest_path = safe_relative(repo_dir, entry.get("manifest", "site/extension.json"))
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

    public_manifest = json.loads(json.dumps(manifest))
    publish = public_manifest.pop("publish", {})

    populate_dependency_information(public_manifest)

    website = public_manifest.setdefault("website", {})
    public_extension_dir = EXT_DIR / slug

    overlay_source = publish.get("overlay")
    if overlay_source:
        overlay_source_path = safe_relative(repo_dir, overlay_source)
        overlay_destination = public_extension_dir / "overlay"
        if overlay_destination.exists():
            shutil.rmtree(overlay_destination)
        if not copy_tree(overlay_source_path, overlay_destination):
            fail(f"{manifest_path}: publish.overlay does not exist: {overlay_source}")
        website["overlayUrl"] = f"/extensions/{slug}/overlay/"

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

        # Assets are optional. The template may declare publish.assets before
        # an extension has any extension-owned assets. Missing and empty
        # directories are both treated as "nothing to publish".
        if not assets_source_path.is_dir():
            print(f"Skipping optional extension assets: {assets_source} (directory does not exist)")
        elif not any(assets_source_path.iterdir()):
            print(f"Skipping optional extension assets: {assets_source} (directory is empty)")
        else:
            if assets_destination.exists():
                shutil.rmtree(assets_destination)
            copy_tree(assets_source_path, assets_destination)
            public_manifest = rewrite_published_image_paths(public_manifest, slug)

    DATA_DIR.mkdir(parents=True, exist_ok=True)
    data_path = DATA_DIR / f"{slug}.json"
    data_path.write_text(json.dumps(public_manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    print(f"Imported {name} v{version} -> {slug}")


def main() -> None:
    registry = load_json(SOURCES)
    if registry.get("schemaVersion") != 1:
        fail("Unsupported extensions/sources.json schemaVersion")

    entries = registry.get("extensions", [])
    if not entries:
        print("No private extension sources configured.")
        return

    for entry in entries:
        if "checkoutPath" not in entry:
            fail("Importer requires checkoutPath for each source")
        import_extension(entry)


if __name__ == "__main__":
    main()
