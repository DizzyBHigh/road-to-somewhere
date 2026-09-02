from __future__ import annotations
import shutil
import zipfile
from pathlib import Path
from github_release import download_asset, find_asset, release_version
from product_paths import fail


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
            base = overlay_dir.resolve()
            for member in archive.infolist():
                target = (overlay_dir / member.filename).resolve()
                if base not in target.parents:
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
