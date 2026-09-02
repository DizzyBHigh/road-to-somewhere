from __future__ import annotations
import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / "_data"
SOURCES = ROOT / "products" / "sources.json"


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


def rewrite_asset_paths(value, product_path: str, slug: str):
    if isinstance(value, dict):
        return {
            key: (
                f"{product_path}/{item}"
                if key == "src" and isinstance(item, str) and item.startswith("assets/")
                else f"{product_path}/assets/{item.removeprefix('images/')}"
                if key == "src" and isinstance(item, str) and item.startswith("images/")
                else rewrite_asset_paths(item, product_path, slug)
            )
            for key, item in value.items()
        }
    if isinstance(value, list):
        return [rewrite_asset_paths(item, product_path, slug) for item in value]
    return value


def product_dir(manifest: dict) -> Path:
    page = manifest.get("page")
    if isinstance(page, dict) and isinstance(page.get("url"), str) and page["url"].strip("/"):
        return ROOT / page["url"].strip("/")
    publish = manifest.get("publish", {})
    if publish.get("overlay") or publish.get("importFile"):
        return ROOT / "extensions" / manifest["slug"]
    base = "extensions" if manifest.get("category") == "extension" or manifest.get("type") == "extension" else "other-tools"
    return ROOT / base / manifest["slug"]
