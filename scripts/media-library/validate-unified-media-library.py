#!/usr/bin/env python3
"""Validate the common cross-project media-library contract."""

from __future__ import annotations

import csv
import hashlib
import re
import shutil
import subprocess
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
LIB = ROOT / "media-library"
PLATFORMS = ("facebook", "instagram", "reddit", "threads", "tiktok", "x", "youtube")
REQUIRED_FILES = (
    "README.md",
    "00-control/READINESS.md",
    "00-control/GAP_REGISTER.md",
    "00-control/OWNED_PROPERTIES.md",
    "00-control/PLATFORM_SPECS.md",
    "00-control/PUBLISHING_CHECKLIST.md",
    "04-copy/PROFILE_COPY.md",
    "04-copy/POST_LIBRARY.md",
    "04-copy/CONTENT_CALENDAR.md",
    "04-copy/ALT_TEXT.csv",
    "04-copy/VIDEO_METADATA.md",
    "_inventory/ASSET_MANIFEST.csv",
    "_inventory/SOURCE_MANIFEST.csv",
    "_inventory/PUBLISHING_INDEX.csv",
    "_inventory/PROVENANCE.md",
    "_inventory/CHECKSUMS.sha256",
    "_hold/review-evidence/README.md",
    "_hold/quarantine/README.md",
)
ASSET_FIELDS = ("asset_id", "path", "media_type", "purpose", "campaign_id", "platform", "width", "height", "duration_seconds", "format", "alpha", "codec", "pixel_format", "audio", "status", "source_asset_id", "version", "reviewed_on", "sha256")
SOURCE_FIELDS = ("source_asset_id", "source_path", "source_type", "classification", "capture_context", "rights", "contains_personal_data", "reviewed_on", "notes", "sha256")
PUBLISHING_FIELDS = ("platform", "placement", "asset_id", "copy_id", "status", "cta_url", "preview_required", "last_previewed_on", "notes")
ALLOWED_STATUS = {"READY_LOCAL", "NEEDS_PLATFORM_PREVIEW", "DRAFT", "BLOCKED", "HOLD", "RETIRED"}


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def main() -> int:
    failures: list[str] = []
    for relative in REQUIRED_FILES:
        if not (LIB / relative).is_file():
            failures.append(f"missing required file: {relative}")
    for platform in PLATFORMS:
        if not (LIB / f"03-platform-ready/{platform}/INDEX.md").is_file():
            failures.append(f"missing platform index: {platform}")
    # Finder can recreate .DS_Store concurrently on a live macOS checkout.
    # The synchronizer removes it and managed manifests/checksums exclude it.

    asset_rows: list[dict[str, str]] = []
    manifest = LIB / "_inventory/ASSET_MANIFEST.csv"
    if manifest.is_file():
        with manifest.open(newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            if tuple(reader.fieldnames or ()) != ASSET_FIELDS:
                failures.append("ASSET_MANIFEST.csv header does not match the standard")
            asset_rows = list(reader)
    asset_ids: set[str] = set()
    paths: set[str] = set()
    for row in asset_rows:
        asset_id, relative, status = row.get("asset_id", ""), row.get("path", ""), row.get("status", "")
        if not asset_id or asset_id in asset_ids:
            failures.append(f"missing or duplicate asset_id: {asset_id or '[blank]'}")
        asset_ids.add(asset_id)
        if not relative or relative in paths:
            failures.append(f"missing or duplicate asset path: {relative or '[blank]'}")
        paths.add(relative)
        path = LIB / relative
        if not path.is_file():
            failures.append(f"manifest path does not exist: {relative}")
            continue
        if digest(path) != row.get("sha256"):
            failures.append(f"manifest checksum mismatch: {relative}")
        if status not in ALLOWED_STATUS:
            failures.append(f"invalid status {status}: {relative}")
        if relative.startswith("03-platform-ready/") and status in {"BLOCKED", "HOLD", "RETIRED"}:
            failures.append(f"restricted status in platform-ready: {relative}")
        if relative.startswith("03-platform-ready/") and any(token in relative.lower() for token in ("review-evidence", "quarantine", "do-not-upload", "invalid")):
            failures.append(f"restricted filename in platform-ready: {relative}")
        suffix = path.suffix.lower()
        if suffix in {".mp4", ".mov", ".m4v"} and shutil.which("ffprobe"):
            result = subprocess.run(
                ["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=codec_name,pix_fmt", "-of", "csv=p=0", str(path)],
                capture_output=True, text=True, check=False,
            )
            if result.returncode != 0:
                failures.append(f"video inspection failed: {relative}")
            elif relative.startswith("03-platform-ready/"):
                cells = result.stdout.strip().split(",")
                if len(cells) >= 2 and (cells[0] != "h264" or cells[1] != "yuv420p"):
                    failures.append(f"platform video is not H.264/yuv420p: {relative}")

    source_manifest = LIB / "_inventory/SOURCE_MANIFEST.csv"
    if source_manifest.is_file():
        with source_manifest.open(newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            if tuple(reader.fieldnames or ()) != SOURCE_FIELDS:
                failures.append("SOURCE_MANIFEST.csv header does not match the standard")
            source_ids: set[str] = set()
            for row in reader:
                source_id = row.get("source_asset_id", "")
                if not source_id or source_id in source_ids:
                    failures.append(f"missing or duplicate source_asset_id: {source_id or '[blank]'}")
                source_ids.add(source_id)
                source_path = LIB / row.get("source_path", "")
                if not source_path.is_file():
                    failures.append(f"source manifest path does not exist: {row.get('source_path', '')}")

    publishing = LIB / "_inventory/PUBLISHING_INDEX.csv"
    if publishing.is_file():
        post_copy = (LIB / "04-copy/POST_LIBRARY.md").read_text(encoding="utf-8") if (LIB / "04-copy/POST_LIBRARY.md").is_file() else ""
        known_copy_ids = set(re.findall(r"^###\s+([A-Z]{1,3}(?:-P)?-?\d{2})\b", post_copy, flags=re.MULTILINE))
        with publishing.open(newline="", encoding="utf-8") as handle:
            reader = csv.DictReader(handle)
            if tuple(reader.fieldnames or ()) != PUBLISHING_FIELDS:
                failures.append("PUBLISHING_INDEX.csv header does not match the standard")
            seen: set[tuple[str, str, str]] = set()
            for row in reader:
                key = (row.get("platform", ""), row.get("placement", ""), row.get("asset_id", ""))
                if key in seen:
                    failures.append(f"duplicate publishing row: {key}")
                seen.add(key)
                if row.get("asset_id") not in asset_ids:
                    failures.append(f"publishing row points to missing asset: {row.get('asset_id', '')}")
                if row.get("platform") not in PLATFORMS:
                    failures.append(f"unknown publishing platform: {row.get('platform', '')}")
                if row.get("status") in {"BLOCKED", "HOLD", "RETIRED"}:
                    failures.append(f"restricted publishing row: {key}")
                if not row.get("copy_id"):
                    failures.append(f"publishing row has no copy decision: {key}")
                elif row.get("copy_id") != "NONE" and row.get("copy_id") not in known_copy_ids:
                    failures.append(f"publishing row points to missing copy ID {row.get('copy_id')}: {key}")

    checksum_path = LIB / "_inventory/CHECKSUMS.sha256"
    if checksum_path.is_file():
        for line in checksum_path.read_text(encoding="utf-8").splitlines():
            if not line.strip():
                continue
            expected, relative = line.split("  ", 1)
            path = LIB / relative
            if not path.is_file():
                failures.append(f"checksum path does not exist: {relative}")
            elif digest(path) != expected:
                failures.append(f"library checksum mismatch: {relative}")

    if failures:
        for failure in failures:
            print(f"FAIL: {failure}", file=sys.stderr)
        print(f"Unified media-library validation failed: {len(failures)} issue(s)", file=sys.stderr)
        return 1
    print(f"Unified media-library validation passed: {len(asset_rows)} managed assets across {len(PLATFORMS)} platforms.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
