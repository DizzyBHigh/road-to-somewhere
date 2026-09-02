#!/usr/bin/env python3
"""Small GitHub release helpers shared by RTS importers."""
from __future__ import annotations
import json
import os
import urllib.request
from pathlib import Path


def github_request(repository: str, endpoint: str) -> dict:
    url = f"https://api.github.com/repos/{repository}"
    if endpoint:
        url += f"/{endpoint}"
    request = urllib.request.Request(
        url,
        headers={"Accept": "application/vnd.github+json", "User-Agent": "RTS-site-importer"},
    )
    token = os.environ.get("RTS_EXTENSION_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            return json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise RuntimeError(f"Could not retrieve GitHub data for {repository}: {exc}") from exc


def repository_visibility(repository: str) -> str:
    """Return the repository visibility reported by GitHub."""
    visibility = github_request(repository, "").get("visibility", "")
    if visibility not in {"public", "private", "internal"}:
        raise RuntimeError(f"Repository {repository} has no supported visibility")
    return visibility


def latest_release(repository: str) -> dict:
    """Return the latest published, non-draft, non-prerelease release."""
    request = urllib.request.Request(
        f"https://api.github.com/repos/{repository}/releases?per_page=20",
        headers={"Accept": "application/vnd.github+json", "User-Agent": "RTS-site-importer"},
    )
    token = os.environ.get("RTS_EXTENSION_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            releases = json.loads(response.read().decode("utf-8"))
    except Exception as exc:
        raise RuntimeError(f"Could not retrieve releases for {repository}: {exc}") from exc
    for release in releases:
        if not release.get("draft") and not release.get("prerelease") and release.get("published_at"):
            return release
    raise RuntimeError(f"No published release found for {repository}")


def release_version(release: dict) -> str:
    tag = release.get("tag_name", "")
    if not isinstance(tag, str) or not tag.strip():
        raise RuntimeError("Latest release has no tag_name")
    return tag[1:] if tag.startswith("v") else tag


def find_asset(release: dict, kind: str) -> dict:
    """Find a release asset for an RTS extension download."""
    assets = [a for a in release.get("assets", []) if isinstance(a, dict)]
    if kind == "overlay":
        matches = [a for a in assets if "overlay" in a.get("name", "").lower() and a.get("name", "").lower().endswith(".zip")]
    elif kind == "import":
        matches = [a for a in assets if "import" in a.get("name", "").lower() and a.get("name", "").lower().endswith(".txt")]
    else:
        matches = []
    if not matches:
        raise RuntimeError(f"Latest release has no {kind} asset")
    version = release_version(release).lower()
    versioned = [a for a in matches if version in a.get("name", "").lower()]
    return versioned[0] if versioned else matches[0]


def download_asset(asset: dict, destination: Path) -> None:
    url = asset.get("browser_download_url", "")
    if not url:
        raise RuntimeError(f"Release asset has no download URL: {asset.get('name', '')}")
    request = urllib.request.Request(url, headers={"User-Agent": "RTS-site-importer"})
    token = os.environ.get("RTS_EXTENSION_TOKEN") or os.environ.get("GITHUB_TOKEN")
    if token:
        request.add_header("Authorization", f"Bearer {token}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    try:
        with urllib.request.urlopen(request, timeout=60) as response, destination.open("wb") as output:
            output.write(response.read())
    except Exception as exc:
        raise RuntimeError(f"Could not download release asset {asset.get('name', '')}: {exc}") from exc
