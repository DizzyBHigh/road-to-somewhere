from __future__ import annotations
import shutil
import zipfile
from pathlib import Path
from github_release import download_asset, find_asset, release_version
from product_paths import ROOT, fail


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
    return [
        {"name": item.get("name", ""), "downloadUrl": item.get("browser_download_url", "")}
        for item in assets
    ]


def publish_release_assets(release: dict, assets: list[dict], public_dir: Path) -> list[dict]:
    """Download selected release assets and return their RTS URLs."""
    raw_assets = {
        item.get("name"): item
        for item in release.get("assets", [])
        if isinstance(item, dict)
    }
    destination = public_dir / "downloads"
    if destination.exists():
        shutil.rmtree(destination)
    destination.mkdir(parents=True)
    published = []
    for asset in assets:
        name = asset.get("name", "")
        if not name or Path(name).name != name:
            fail(f"Invalid release asset filename: {name}")
        source = raw_assets.get(name)
        if not source:
            fail(f"Release asset is no longer present: {name}")
        path = destination / name
        download_asset(source, path)
        published.append({
            "name": name,
            "downloadUrl": f"{public_dir.relative_to(ROOT).as_posix()}/downloads/{name}",
        })
    return published


def extract_overlay(archive: zipfile.ZipFile, destination: Path) -> None:
    """Extract an overlay ZIP with or without a top-level overlay directory."""
    members = [item for item in archive.infolist() if item.filename]
    paths = [Path(item.filename) for item in members]
    top_levels = {path.parts[0] for path in paths if path.parts}
    prefix = "overlay" if top_levels == {"overlay"} else ""
    base = destination.resolve()

    for member in members:
        relative = Path(member.filename)
        if prefix:
            relative = Path(*relative.parts[1:]) if len(relative.parts) > 1 else Path()
        target = (destination / relative).resolve()
        if target != base and base not in target.parents:
            fail(f"Overlay archive contains unsafe path: {member.filename}")
        if member.is_dir() or not relative:
            continue
        target.parent.mkdir(parents=True, exist_ok=True)
        with archive.open(member) as source, target.open("wb") as output:
            shutil.copyfileobj(source, output)


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
            extract_overlay(archive, overlay_dir)
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
