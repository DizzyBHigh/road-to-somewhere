from __future__ import annotations
import json
from product_paths import DATA_DIR, ROOT, copy_tree, fail, load_json, product_dir, rewrite_asset_paths, safe_relative
from product_release import publish_extension_files, release_assets
from github_release import latest_release, release_version


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
    publish = public.get("publish", {})
    needs_release = bool(publish.get("overlay") or publish.get("importFile") or policy)
    release = latest_release(repository) if needs_release else None
    if release:
        version = release_version(release)
        public["version"] = version
        public["release"] = {
            **policy,
            "version": version,
            "tag": release.get("tag_name", ""),
            "releaseUrl": release.get("html_url", ""),
            "assets": release_assets(release, policy) if policy else [],
        }
        public["releaseUrl"] = release.get("html_url", "")
    public_dir = product_dir(public)
    public_dir.mkdir(parents=True, exist_ok=True)
    if publish.get("overlay") or publish.get("importFile"):
        try:
            publish_extension_files(public, release, public_dir)
        except (OSError, RuntimeError, zipfile.BadZipFile) as exc:
            fail(f"Could not publish extension release files: {exc}")
    publish = public.pop("publish", {})
    assets_source = publish.get("assets")
    if assets_source:
        source = safe_relative(repo_dir, assets_source)
        if not source.is_dir():
            fail(f"Published assets directory does not exist: {assets_source}")
        destination = public_dir / "assets"
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
    (public_dir / "index.html").write_text(f"---\nlayout: product\nproduct_data: {slug}\n---\n", encoding="utf-8")
    print(f"Imported {name} v{public.get('version', '')} -> {public_dir.relative_to(ROOT)}")
