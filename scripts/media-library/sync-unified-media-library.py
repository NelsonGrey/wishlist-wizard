#!/usr/bin/env python3
"""Build the shared publishing-first media-library interface.

The migration is intentionally additive. Legacy library paths remain in place;
this script creates or refreshes only the unified contract paths.
"""

from __future__ import annotations

import csv
import hashlib
import re
import shutil
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
LIB = ROOT / "media-library"
PROJECT = ROOT.name
MEDIA_EXTENSIONS = {".png", ".jpg", ".jpeg", ".svg", ".mp4", ".mov", ".m4v", ".srt", ".pdf", ".ttf", ".ico"}
PLATFORMS = {
    "facebook": ("profile", "header", "feed", "reels-stories"),
    "instagram": ("profile", "feed", "reels-stories"),
    "reddit": ("profile", "header", "feed", "video"),
    "threads": ("profile", "feed", "video"),
    "tiktok": ("profile", "video"),
    "x": ("profile", "header", "feed", "video"),
    "youtube": ("profile", "header", "thumbnails", "long-form", "shorts"),
}
PROJECT_PREFIX = {"modulo-squares": "MS", "vehicle-vitals": "VV", "wishlist-wizard": "WW"}


def ensure(relative: str) -> Path:
    path = LIB / relative
    path.mkdir(parents=True, exist_ok=True)
    return path


def write(relative: str, content: str, *, overwrite: bool = True) -> None:
    path = LIB / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    if overwrite or not path.exists():
        path.write_text(content.rstrip() + "\n", encoding="utf-8")


def copy(source: str | Path, destination: str | Path) -> bool:
    src = source if isinstance(source, Path) else ROOT / source
    dst = destination if isinstance(destination, Path) else LIB / destination
    if not src.is_file():
        return False
    if src.resolve() == dst.resolve():
        return True
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dst)
    return True


def copy_tree(source: str | Path, destination: str | Path, extensions: set[str] | None = None) -> int:
    src = source if isinstance(source, Path) else ROOT / source
    dst = destination if isinstance(destination, Path) else LIB / destination
    if not src.is_dir():
        return 0
    count = 0
    for item in sorted(src.rglob("*")):
        if not item.is_file() or item.name == ".DS_Store":
            continue
        if extensions and item.suffix.lower() not in extensions:
            continue
        target = dst / item.relative_to(src)
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(item, target)
        count += 1
    return count


def copy_glob(pattern: str, destination: str, extensions: set[str] | None = None) -> int:
    count = 0
    for item in sorted(ROOT.glob(pattern)):
        if not item.is_file() or item.name == ".DS_Store":
            continue
        if extensions and item.suffix.lower() not in extensions:
            continue
        count += int(copy(item, LIB / destination / item.name))
    return count


def common_skeleton() -> None:
    for directory in (
        "00-control",
        "01-brand/masters",
        "01-brand/profiles",
        "01-brand/headers/facebook",
        "01-brand/headers/reddit",
        "01-brand/headers/x",
        "01-brand/headers/youtube",
        "01-brand/guidelines",
        "01-brand/fonts",
        "02-campaigns",
        "04-copy",
        "05-store-listings/apple/icon",
        "05-store-listings/apple/screenshots",
        "05-store-listings/apple/previews",
        "05-store-listings/google-play/icon",
        "05-store-listings/google-play/feature-graphic",
        "05-store-listings/google-play/screenshots",
        "05-store-listings/google-play/previews",
        "_source/brand",
        "_source/captures/ios",
        "_source/captures/android",
        "_source/captures/web",
        "_source/editable",
        "_source/video",
        "_inventory",
        "_hold/review-evidence",
        "_hold/quarantine",
    ):
        ensure(directory)
    for platform, placements in PLATFORMS.items():
        ensure(f"03-platform-ready/{platform}")
        for placement in placements:
            ensure(f"03-platform-ready/{platform}/{placement}")


def preserve_legacy_guide() -> None:
    legacy = LIB / "00-control/LEGACY_LIBRARY_GUIDE.md"
    if not legacy.exists() and (LIB / "README.md").is_file():
        shutil.copy2(LIB / "README.md", legacy)


def campaign(campaign_id: str, slug: str, title: str, objective: str, limitations: str) -> Path:
    base = ensure(f"02-campaigns/{campaign_id}-{slug}")
    for child in ("stills/square", "stills/portrait", "stills/landscape", "stills/vertical", "video/landscape", "video/vertical", "captions"):
        (base / child).mkdir(parents=True, exist_ok=True)
    (base / "CAMPAIGN.md").write_text(
        f"# {campaign_id}: {title}\n\n"
        f"- Status: DRAFT unless an asset is marked READY_LOCAL in the publishing index\n"
        f"- Objective: {objective}\n"
        "- Publication rule: verify the active account, live destination, product state, crop, claims, and rights immediately before publishing.\n"
        f"- Limitations: {limitations}\n",
        encoding="utf-8",
    )
    return base


def copy_campaign_file(source: Path, base: Path) -> None:
    name = source.name.lower()
    if source.suffix.lower() in {".mp4", ".mov", ".m4v"}:
        placement = "video/vertical" if "1080x1920" in name else "video/landscape"
    elif source.suffix.lower() == ".srt":
        placement = "captions"
    elif "1080x1080" in name or "square" in name:
        placement = "stills/square"
    elif "1080x1350" in name or "portrait" in name:
        placement = "stills/portrait"
    elif "1080x1920" in name or "story" in name:
        placement = "stills/vertical"
    else:
        placement = "stills/landscape"
    copy(source, base / placement / source.name)


def copy_profile_to_platforms(source: Path) -> None:
    for platform in PLATFORMS:
        copy(source, LIB / f"03-platform-ready/{platform}/profile/{source.name}")


def distribute_feed(files: list[Path], project: str) -> None:
    for source in files:
        name = source.name
        if "portrait" in name or "1080x1350" in name:
            destinations = ("facebook", "instagram", "threads")
        elif "landscape" in name or "1600x900" in name or "1200x630" in name:
            destinations = ("facebook", "reddit", "x")
        elif "story" in name or "1080x1920" in name:
            for platform in ("facebook", "instagram"):
                copy(source, LIB / f"03-platform-ready/{platform}/reels-stories/{name}")
            continue
        else:
            destinations = ("facebook", "instagram", "reddit", "threads", "x")
        for platform in destinations:
            copy(source, LIB / f"03-platform-ready/{platform}/feed/{name}")


def distribute_vertical_videos(files: list[Path]) -> None:
    for source in files:
        for platform, placement in (
            ("facebook", "reels-stories"),
            ("instagram", "reels-stories"),
            ("reddit", "video"),
            ("threads", "video"),
            ("tiktok", "video"),
            ("x", "video"),
            ("youtube", "shorts"),
        ):
            copy(source, LIB / f"03-platform-ready/{platform}/{placement}/{source.name}")


def markdown_alt_text_to_csv(source: Path, destination: Path) -> None:
    rows: list[tuple[str, str]] = []
    if source.is_file():
        for line in source.read_text(encoding="utf-8").splitlines():
            if not line.startswith("|") or "---" in line or "Alt text" in line or "Asset family" in line:
                continue
            cells = [cell.strip() for cell in line.strip("|").split("|")]
            if len(cells) >= 2:
                rows.append((cells[0], cells[1]))
    destination.parent.mkdir(parents=True, exist_ok=True)
    with destination.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(("asset_id", "alt_text"))
        writer.writerows(rows)


def migrate_modulo() -> None:
    copy("media-library/_inventory/ASSET_AUDIT.md", "00-control/READINESS.md")
    write("00-control/GAP_REGISTER.md", """# Gap register

| Gap | Status | Next action |
|---|---|---|
| Public App Store and Google Play availability | BLOCKED | Verify from the posting device and region before using availability or download claims. |
| YouTube banner crop | NEEDS_PLATFORM_PREVIEW | Preview in YouTube Studio and record the review date. |
| Testimonials, ratings, download counts, and player-generated leaderboard proof | BLOCKED | Use only after current evidence exists and publication is approved. |
""")
    copy("media-library/04-copy/OWNED_PROPERTIES.md", "00-control/OWNED_PROPERTIES.md")
    copy("media-library/_inventory/ASSET_AUDIT.md", "00-control/PLATFORM_SPECS.md")
    copy("media-library/04-copy/PUBLISHING_CHECKLIST.md", "00-control/PUBLISHING_CHECKLIST.md")
    copy_tree("media-library/00-brand/profile", "01-brand/profiles", MEDIA_EXTENSIONS)
    header_map = {"facebook-cover": "facebook", "reddit-banner": "reddit", "x-header": "x", "youtube-channel": "youtube"}
    for item in (ROOT / "media-library/00-brand/headers").glob("*"):
        for token, platform in header_map.items():
            if token in item.name:
                copy(item, LIB / f"01-brand/headers/{platform}/{item.name}")
                copy(item, LIB / f"03-platform-ready/{platform}/header/{item.name}")
    profile = ROOT / "media-library/00-brand/profile/modulo-squares-profile-1024x1024.png"
    copy_profile_to_platforms(profile)
    specs = [
        ("C001", "drop-numbers", "Drop numbers", "Introduce the core falling-number decision.", "Storefront availability remains release-gated."),
        ("C002", "divide-evenly", "Divide evenly", "Explain the divisor-bucket rule.", "Avoid retired remainder-bucket language."),
        ("C003", "build-combos", "Build combos", "Show score, combo, and progression feedback.", "Do not imply guaranteed performance gains."),
        ("C004", "keep-the-run-going", "Keep the run going", "Show pace and run tension.", "Scores and leaderboard claims require current evidence."),
        ("C005", "learn-the-rules", "Learn the rules", "Teach the game loop clearly.", "Use current divisibility mechanics only."),
        ("C006", "customize-settings", "Customize settings", "Explain visual cues and settings.", "Describe only settings visible in the current product."),
    ]
    feed_files: list[Path] = []
    for cid, slug, title, objective, limits in specs:
        base = campaign(cid, slug, title, objective, limits)
        index = int(cid[-3:])
        patterns = [f"media-library/01-evergreen/**/*{index:02d}-*.png"]
        if cid == "C001":
            patterns += ["media-library/01-evergreen/**/*brand-drop-numbers*.png", "media-library/01-evergreen/feed-landscape/key-art-*.png"]
        for pattern in patterns:
            for item in sorted(ROOT.glob(pattern)):
                copy_campaign_file(item, base)
                feed_files.append(item)
    video_campaign = campaign("C007", "product-tour", "Product tour and tutorials", "Show gameplay and onboarding in motion.", "Silent caption-led masters; preview captions and add only licensed platform audio.")
    for item in sorted((ROOT / "media-library/03-video").rglob("*")):
        if item.is_file() and item.suffix.lower() in {".mp4", ".srt"}:
            copy_campaign_file(item, video_campaign)
    distribute_feed(sorted(set(feed_files)), PROJECT)
    verticals = sorted((ROOT / "media-library/03-video/vertical-shorts").glob("*.mp4"))
    distribute_vertical_videos(verticals)
    copy_tree("media-library/02-platform-ready/youtube/thumbnails", "03-platform-ready/youtube/thumbnails", MEDIA_EXTENSIONS)
    copy_tree("media-library/03-video/tutorials", "03-platform-ready/youtube/long-form", MEDIA_EXTENSIONS)
    copy_tree("media-library/03-video/landscape", "03-platform-ready/youtube/long-form", MEDIA_EXTENSIONS)
    for source, destination in (
        ("media-library/04-copy/PROFILE_COPY.md", "04-copy/PROFILE_COPY.md"),
        ("media-library/04-copy/POST_LIBRARY.md", "04-copy/POST_LIBRARY.md"),
        ("media-library/04-copy/30_DAY_CALENDAR.md", "04-copy/CONTENT_CALENDAR.md"),
        ("packages/mobile/assets/store/promo-kit-2026-08/copy/youtube-tutorials.md", "04-copy/VIDEO_METADATA.md"),
    ):
        copy(source, destination)
    markdown_alt_text_to_csv(ROOT / "media-library/04-copy/ALT_TEXT.md", LIB / "04-copy/ALT_TEXT.csv")
    copy_tree("packages/mobile/assets/store/promo-kit-2026-08/apple/icon", "05-store-listings/apple/icon", MEDIA_EXTENSIONS)
    copy_tree("packages/mobile/assets/store/promo-kit-2026-08/apple/screenshots", "05-store-listings/apple/screenshots", MEDIA_EXTENSIONS)
    copy_tree("packages/mobile/assets/store/promo-kit-2026-08/apple/app-preview", "05-store-listings/apple/previews", MEDIA_EXTENSIONS)
    copy_tree("packages/mobile/assets/store/promo-kit-2026-08/google/icon", "05-store-listings/google-play/icon", MEDIA_EXTENSIONS)
    copy_tree("packages/mobile/assets/store/promo-kit-2026-08/google/feature-graphic", "05-store-listings/google-play/feature-graphic", MEDIA_EXTENSIONS)
    copy_tree("packages/mobile/assets/store/promo-kit-2026-08/google/screenshots", "05-store-listings/google-play/screenshots", MEDIA_EXTENSIONS)
    write("_source/README.md", "# Source locations\n\nThe validated promotion kit at `packages/mobile/assets/store/promo-kit-2026-08/` remains the visual source of truth. Raw captures and working video sources remain there and are not routine upload selections.")
    copy("media-library/_inventory/PROVENANCE.md", "_inventory/PROVENANCE.md")
    write("_hold/review-evidence/README.md", "# Review evidence\n\nRaw captures and working output remain indexed outside this folder and must not be published as marketing.")
    write("_hold/quarantine/README.md", "# Quarantine\n\nSuperseded and unapproved icon families remain outside the unified publishing path. Do not upload them.")


def migrate_vehicle() -> None:
    copy("media-library/READINESS.md", "00-control/READINESS.md")
    copy("media-library/_GAP_BRIEF.md", "00-control/GAP_REGISTER.md")
    kit = ROOT / "docs/SOCIAL_MEDIA_KIT.md"
    kit_text = kit.read_text(encoding="utf-8") if kit.is_file() else ""
    accounts = kit_text.split("## 2.", 1)[0] if "## 2." in kit_text else kit_text
    write("00-control/OWNED_PROPERTIES.md", accounts or "# Owned properties\n\nNo roster was found; verify before publishing.")
    copy("media-library/TARGET_REQUIREMENTS.md", "00-control/PLATFORM_SPECS.md")
    write("00-control/PUBLISHING_CHECKLIST.md", """# Publishing checklist

- [ ] Confirm the active signed-in account and permanent property URL.
- [ ] Select only from `03-platform-ready` and confirm its manifest status.
- [ ] Verify the live destination and current product/store availability.
- [ ] Review screenshots for VINs, addresses, account data, notification contents, credentials, and documents.
- [ ] Preview profile/header crops and vertical-video safe zones in the destination app.
- [ ] Add approved alt text and captions; confirm rights for every external element.
- [ ] Record the published URL, date, asset ID, copy ID, and result.
""")
    copy_tree("media-library/shared-brand/masters", "01-brand/masters", MEDIA_EXTENSIONS)
    copy_tree("media-library/shared-brand/guidelines", "01-brand/guidelines", MEDIA_EXTENSIONS)
    copy_tree("media-library/shared-brand/fonts", "01-brand/fonts", MEDIA_EXTENSIONS)
    profile = ROOT / "media-library/shared-brand/current-social-profile/profile-current-complex-alpha-512.png"
    copy(profile, LIB / "01-brand/profiles/vehicle-vitals-profile-512x512.png")
    copy_profile_to_platforms(profile)
    header_sources = {
        "facebook": "media-library/facebook/cover/vehicle-vitals-cover-master-1640x624.png",
        "reddit": "media-library/reddit/banner/vehicle-vitals-community-banner-1080x128.png",
        "x": "media-library/x/header/vehicle-vitals-header-1500x500.png",
        "youtube": "media-library/youtube/banner/candidate-2560x1440-safe-area-unverified.png",
    }
    for platform, source in header_sources.items():
        item = ROOT / source
        copy(item, LIB / f"01-brand/headers/{platform}/{item.name}")
        copy(item, LIB / f"03-platform-ready/{platform}/header/{item.name}")
    specs = [
        ("C001", "maintenance-planning", "Maintenance planning", "Explain maintenance planning and reminders."),
        ("C002", "vin-lookup", "VIN lookup", "Show the VIN lookup workflow."),
        ("C003", "ownership-history", "Ownership history", "Explain organized service and ownership records."),
        ("C004", "cross-platform-access", "Cross-platform access", "Show web and mobile continuity."),
        ("C005", "help-center", "Help center", "Show product help and guidance."),
    ]
    verticals: list[Path] = []
    for cid, slug, title, objective in specs:
        base = campaign(cid, slug, title, objective, "These are short feature previews, not complete tutorials. Verify current UI and claims.")
        for item in sorted((ROOT / "media-library/shared-content/video/vertical-feature-clips").glob(f"{slug}*")):
            copy_campaign_file(item, base)
            if item.suffix.lower() == ".mp4":
                verticals.append(item)
    distribute_vertical_videos(verticals)
    write("04-copy/PROFILE_COPY.md", "# Profile copy\n\n" + (kit_text.split("## 3.", 1)[1].split("## 4.", 1)[0] if "## 3." in kit_text and "## 4." in kit_text else "Verify profile copy in `docs/SOCIAL_MEDIA_KIT.md`."))
    post_text = kit_text
    for number in range(1, 7):
        post_text = post_text.replace(f"### Pillar {number} —", f"### VV-P{number:02d} —")
    write("04-copy/POST_LIBRARY.md", "# Post library\n\nAll entries remain drafts. Stable copy IDs VV-P01 through VV-P06 correspond to the six starter-post pillars.\n\n" + post_text)
    write("04-copy/CONTENT_CALENDAR.md", "# Content calendar\n\nThe current starter cadence is documented in `POST_LIBRARY.md` under Cadence. Assign dates only after account, link, readiness, and preview checks pass.")
    source_alt = ROOT / "media-library/shared-content/copy/alt-text-and-captions.csv"
    if source_alt.is_file():
        with source_alt.open(newline="", encoding="utf-8") as source_handle, (LIB / "04-copy/ALT_TEXT.csv").open("w", newline="", encoding="utf-8") as target_handle:
            reader = csv.DictReader(source_handle)
            writer = csv.DictWriter(target_handle, fieldnames=("asset_id", "alt_text"))
            writer.writeheader()
            for row in reader:
                writer.writerow({"asset_id": row.get("asset_id", ""), "alt_text": row.get("alt_text", "")})
    write("04-copy/VIDEO_METADATA.md", "# Video metadata\n\nThe five current 1080x1920 files are short feature previews with SRT sidecars, not tutorials. Titles, captions, and destination copy require final approval before upload.")
    copy_tree("media-library/ios-app/app-store", "05-store-listings/apple/screenshots", MEDIA_EXTENSIONS)
    copy("media-library/ios-app/runtime/app-icons/Icon-App-1024x1024@1x.png", "05-store-listings/apple/icon/Icon-App-1024x1024@1x.png")
    copy_tree("media-library/android-app/google-play", "05-store-listings/google-play", MEDIA_EXTENSIONS)
    write("_source/captures/README.md", "# Capture sources\n\nNative iOS and responsive website captures remain at the legacy `media-library/ios-app/captures/` and `media-library/website/captures/` paths and are listed in `SOURCE_MANIFEST.csv`. Android phone screenshots remain blocked. These captures are composition sources, not routine uploads.")
    copy_tree("media-library/shared-content/templates", "_source/editable", MEDIA_EXTENSIONS)
    copy("media-library/_inventory/source-media.csv", "_inventory/LEGACY_SOURCE_MEDIA.csv")
    write("_inventory/PROVENANCE.md", "# Provenance\n\nThe unified library is a copy-first derivative of the existing Vehicle Vitals media library. Canonical brand, capture, store, template, and video origins remain documented in `LEGACY_SOURCE_MEDIA.csv`, `00-control/READINESS.md`, and `00-control/GAP_REGISTER.md`.")
    write("_hold/review-evidence/README.md", "# Review evidence\n\nApp Review recordings, raw captures, and working outputs are not marketing. They remain outside the platform-ready tree and must be privacy-reviewed before any derivative use.")
    copy("media-library/shared-brand/masters/simplified-mark-opaque-512.png", "_hold/quarantine/simplified-mark-retired-512.png")
    write("_hold/quarantine/README.md", "# Quarantine\n\nThe simplified mark is retired as the primary identity. Unsafe, sensitive, invalid, or unapproved media must remain outside the publishing path.")


def migrate_wishlist() -> None:
    copy("media-library/READINESS.md", "00-control/READINESS.md")
    write("00-control/GAP_REGISTER.md", """# Gap register

| Gap | Status | Next action |
|---|---|---|
| Native-resolution iPhone captures | BLOCKED | Fix documented clipping/subscription states, then recapture without mirroring residue. |
| Android phone and tablet captures | BLOCKED | Capture and review representative native states. |
| Responsive web and extension captures | BLOCKED | Capture desktop, tablet, and phone flows plus browser-extension quick add. |
| Vertical video | BLOCKED | Repair and approve one naturally narrated pilot with continuous product motion before batching. |
| YouTube/Facebook/X header crops | NEEDS_PLATFORM_PREVIEW | Preview in each native destination and record the review date. |
| Public storefront and creator-program claims | BLOCKED | Live-verify availability, eligibility, and approved disclosure copy. |
""")
    copy("media-library/ACCOUNTS.md", "00-control/OWNED_PROPERTIES.md")
    copy("media-library/PLATFORM_SPECS.md", "00-control/PLATFORM_SPECS.md")
    write("00-control/PUBLISHING_CHECKLIST.md", """# Publishing checklist

- [ ] Confirm the active account and permanent brand identity.
- [ ] Select only from `03-platform-ready` and check its status in the publishing index.
- [ ] Verify the destination URL and current product/store/creator-program state.
- [ ] Do not use TestFlight-derived campaigns 01-04 as polished launch or paid media until native captures replace them.
- [ ] Inspect final crops for personal data, retailer marks, TestFlight labels, clipping, placeholders, and errors.
- [ ] Preview header, story, Reel, TikTok, and Shorts safe zones in the destination app.
- [ ] Add current alt text and use only claims supported by the product today.
- [ ] Record the published URL, date, asset ID, copy ID, and result.
""")
    copy_tree("media-library/_source", "_source/brand", MEDIA_EXTENSIONS)
    copy("media-library/_source/app-icon-master-1024.png", "01-brand/masters/app-icon-master-1024.png")
    copy("media-library/_source/logo-master.svg", "01-brand/masters/logo-master.svg")
    copy_tree("media-library/generated/profiles", "01-brand/profiles", MEDIA_EXTENSIONS)
    profile = ROOT / "media-library/generated/profiles/profile-1024x1024.png"
    copy_profile_to_platforms(profile)
    for item in sorted((ROOT / "media-library/generated/headers").glob("*.png")):
        platform = "facebook" if "facebook" in item.name else "x" if "x-header" in item.name else "youtube"
        copy(item, LIB / f"01-brand/headers/{platform}/{item.name}")
        copy(item, LIB / f"03-platform-ready/{platform}/header/{item.name}")
    campaign_dirs = sorted((ROOT / "media-library/generated/campaigns").glob("[0-9][0-9]-*"))
    feed_files: list[Path] = []
    titles = {
        "01-every-occasion": ("Every occasion", "Introduce organized wishlists for different occasions."),
        "02-spot-it-save-it": ("Spot it, save it", "Explain how product ideas can be captured and organized."),
        "03-make-a-list": ("Make a list", "Show occasion-based list organization."),
        "04-share-the-hint": ("Share the hint", "Explain thoughtful list sharing."),
        "05-watch-the-price": ("Watch the price", "Explain cautious price-tracking behavior without guarantees."),
        "06-community-question": ("Community question", "Invite useful platform-native conversation."),
    }
    for directory in campaign_dirs:
        number = int(directory.name[:2])
        cid = f"C{number:03d}"
        title, objective = titles[directory.name]
        limits = "Campaigns 01-04 use low-resolution TestFlight review captures and remain DRAFT for polished launch or paid promotion." if number <= 4 else "Do not imply guaranteed price drops, savings, availability, or creator income."
        base = campaign(cid, directory.name[3:], title, objective, limits)
        for item in sorted(directory.glob("*.png")):
            copy_campaign_file(item, base)
            feed_files.append(item)
        copy_tree(directory, f"_source/editable/{directory.name}", {".svg"})
    distribute_feed(feed_files, PROJECT)
    copy_tree("media-library/generated/thumbnails", "03-platform-ready/youtube/thumbnails", {".png"})
    for source, destination in (
        ("media-library/copy/brand-and-profile-copy.md", "04-copy/PROFILE_COPY.md"),
        ("media-library/copy/post-bank.md", "04-copy/POST_LIBRARY.md"),
        ("media-library/CONTENT_CALENDAR.md", "04-copy/CONTENT_CALENDAR.md"),
    ):
        copy(source, destination)
    markdown_alt_text_to_csv(ROOT / "media-library/copy/alt-text.md", LIB / "04-copy/ALT_TEXT.csv")
    write("04-copy/VIDEO_METADATA.md", "# Video metadata\n\nNo video is publication-ready. Existing TikTok/Shorts entries are script outlines. The Marcus renders remain held because visible motion and script quality did not pass review.")
    copy_tree("media-library/_source/review-derived-captures", "_hold/review-evidence/testflight-build-13", MEDIA_EXTENSIONS)
    write("_source/captures/README.md", "# Capture sources\n\nClean native iOS, Android, web, and browser-extension capture sets are pending. Review-derived TestFlight crops have been copied to `_hold/review-evidence`, not promoted as clean sources.")
    write("05-store-listings/README.md", "# Store listing media\n\nNo current store-listing asset set was promoted into the unified library. Public storefront availability must be live-verified before creating or using download claims.")
    copy("media-library/_inventory/source-index.csv", "_inventory/LEGACY_SOURCE_INDEX.csv")
    copy("media-library/_inventory/PROVENANCE.md", "_inventory/PROVENANCE.md")
    write("_hold/review-evidence/README.md", "# Review evidence\n\nTestFlight-derived captures and unapproved video renders are review evidence. They must not be presented as clean production or paid-launch media.")
    write("_hold/quarantine/README.md", "# Quarantine\n\nInvalid strips, defective captures, review renders, and other do-not-publish files remain excluded and listed in the source manifest.")


def probe(path: Path) -> dict[str, str]:
    values = {"width": "", "height": "", "duration_seconds": "", "codec": "", "pixel_format": "", "audio": "", "alpha": ""}
    if path.suffix.lower() in {".mp4", ".mov", ".m4v"} and shutil.which("ffprobe"):
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,codec_name,pix_fmt,width,height:format=duration", "-of", "csv=p=0", str(path)],
            capture_output=True, text=True, check=False,
        )
        for line in result.stdout.splitlines():
            cells = line.split(",")
            if cells and cells[0] == "video" and len(cells) >= 5:
                values.update(codec=cells[1], width=cells[2], height=cells[3], pixel_format=cells[4])
            elif cells and cells[0] == "audio":
                values["audio"] = "yes"
            elif len(cells) == 1 and re.fullmatch(r"\d+(\.\d+)?", cells[0]):
                values["duration_seconds"] = cells[0]
    elif path.suffix.lower() in {".png", ".jpg", ".jpeg"} and shutil.which("sips"):
        result = subprocess.run(["sips", "-g", "pixelWidth", "-g", "pixelHeight", "-g", "hasAlpha", str(path)], capture_output=True, text=True, check=False)
        for line in result.stdout.splitlines():
            if "pixelWidth:" in line:
                values["width"] = line.split(":", 1)[1].strip()
            elif "pixelHeight:" in line:
                values["height"] = line.split(":", 1)[1].strip()
            elif "hasAlpha:" in line:
                values["alpha"] = line.split(":", 1)[1].strip().lower()
    return values


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def status_for(path: Path) -> str:
    name = str(path.relative_to(LIB)).lower()
    if "candidate" in name or "unverified" in name:
        return "NEEDS_PLATFORM_PREVIEW"
    if "/headers/" in f"/{name}" or (name.startswith("03-platform-ready/") and "/header/" in f"/{name}"):
        return "NEEDS_PLATFORM_PREVIEW"
    if PROJECT == "wishlist-wizard" and re.search(r"(?:/C00[1-4]-|/(?:feed|reels-stories)/0[1-4]-)", "/" + name):
        return "DRAFT"
    return "READY_LOCAL"


def campaign_for(path: Path) -> str:
    match = re.search(r"/(C\d{3})-", "/" + str(path.relative_to(LIB)))
    if match:
        return match.group(1)
    name = path.name
    old = re.match(r"(\d{2})-", name)
    return f"C{int(old.group(1)):03d}" if old else "C000"


def platform_for(path: Path) -> str:
    parts = path.relative_to(LIB).parts
    return parts[1] if parts and parts[0] == "03-platform-ready" else ""


def copy_id_for(path: Path, platform: str) -> str:
    placement = path.relative_to(LIB / f"03-platform-ready/{platform}").parts[0]
    if placement in {"profile", "header"}:
        return "NONE"
    name = path.name.lower()
    number_match = re.match(r"(\d{2})-", name)
    number = int(number_match.group(1)) if number_match else 1
    if PROJECT == "modulo-squares":
        if platform == "youtube":
            if "official-gameplay" in name or "youtube-promo" in name:
                return "YT01"
            tutorial_map = {1: "YT02", 2: "YT03", 3: "YT04", 4: "YT05"}
            return tutorial_map.get(number, "YT01")
        mappings = {
            "facebook": {1: "FB01", 2: "FB02", 3: "FB02", 4: "FB03", 5: "FB03", 6: "FB02"},
            "instagram": {1: "IG02", 2: "IG02", 3: "IG03", 4: "IG03", 5: "IG04", 6: "IG05"},
            "reddit": {1: "R03", 2: "R03", 3: "R02", 4: "R02", 5: "R03", 6: "R02"},
            "threads": {1: "T01", 2: "T02", 3: "T02", 4: "T04", 5: "T03", 6: "T05"},
            "tiktok": {1: "TK01", 2: "TK04", 3: "TK02", 4: "TK03", 5: "TK04", 6: "TK05"},
            "x": {1: "X01", 2: "X03", 3: "X05", 4: "X02", 5: "X04", 6: "X06"},
        }
        return mappings[platform].get(number, next(iter(mappings[platform].values())))
    if PROJECT == "vehicle-vitals":
        if "maintenance-planning" in name:
            return "VV-P02"
        if "ownership-history" in name:
            return "VV-P01"
        if "cross-platform" in name:
            return "VV-P04"
        return "VV-P06"
    if platform == "youtube":
        return {1: "YT-01", 2: "YT-02", 3: "YT-03"}.get(number, "YT-04")
    mappings = {
        "facebook": {1: "FB-01", 2: "FB-01", 3: "FB-04", 4: "FB-03", 5: "FB-01", 6: "FB-02"},
        "instagram": {1: "IG-01", 2: "IG-02", 3: "IG-03", 4: "IG-04", 5: "IG-02", 6: "IG-01"},
        "reddit": {1: "RD-01", 2: "RD-03", 3: "RD-03", 4: "RD-02", 5: "RD-03", 6: "RD-04"},
        "threads": {1: "TH-02", 2: "TH-04", 3: "TH-02", 4: "TH-03", 5: "TH-04", 6: "TH-01"},
        "tiktok": {1: "TT-01", 2: "TT-01", 3: "TT-03", 4: "TT-02", 5: "TT-02", 6: "TT-04"},
        "x": {1: "X-06", 2: "X-01", 3: "X-04", 4: "X-03", 5: "X-01", 6: "X-05"},
    }
    return mappings[platform].get(number, next(iter(mappings[platform].values())))


def make_indexes_and_manifests() -> None:
    prefix = PROJECT_PREFIX[PROJECT]
    previous_by_path: dict[str, str] = {}
    previous_by_parent_sha: dict[tuple[str, str], str] = {}
    previous_manifest = LIB / "_inventory/ASSET_MANIFEST.csv"
    if previous_manifest.is_file():
        with previous_manifest.open(newline="", encoding="utf-8") as handle:
            for row in csv.DictReader(handle):
                if row.get("asset_id") and row.get("path"):
                    previous_by_path[row["path"]] = row["asset_id"]
                if row.get("asset_id") and row.get("sha256") and row.get("path"):
                    key = (str(Path(row["path"]).parent), row["sha256"])
                    previous_by_parent_sha.setdefault(key, row["asset_id"])
    managed_roots = [LIB / name for name in ("01-brand", "02-campaigns", "03-platform-ready", "05-store-listings")]
    assets = sorted(path for root in managed_roots for path in root.rglob("*") if path.is_file() and path.suffix.lower() in MEDIA_EXTENSIONS and path.name != ".DS_Store")
    rows = []
    id_by_path: dict[Path, str] = {}
    for path in assets:
        rel = str(path.relative_to(LIB))
        file_sha = sha256(path)
        parent_sha = (str(Path(rel).parent), file_sha)
        asset_id = previous_by_path.get(rel) or previous_by_parent_sha.get(parent_sha) or f"{prefix}-A-{hashlib.sha1(rel.encode()).hexdigest()[:10].upper()}"
        id_by_path[path] = asset_id
        meta = probe(path)
        media_type = "video" if path.suffix.lower() in {".mp4", ".mov", ".m4v"} else "caption" if path.suffix.lower() == ".srt" else "image" if path.suffix.lower() in {".png", ".jpg", ".jpeg", ".svg", ".ico"} else "document"
        placement = path.parent.name
        rows.append({
            "asset_id": asset_id, "path": rel, "media_type": media_type, "purpose": placement,
            "campaign_id": campaign_for(path), "platform": platform_for(path), "width": meta["width"], "height": meta["height"],
            "duration_seconds": meta["duration_seconds"], "format": path.suffix.lower().lstrip("."), "alpha": meta["alpha"],
            "codec": meta["codec"], "pixel_format": meta["pixel_format"], "audio": meta["audio"], "status": status_for(path),
            "source_asset_id": "", "version": "01", "reviewed_on": "2026-09-04", "sha256": file_sha,
        })
    fields = ["asset_id", "path", "media_type", "purpose", "campaign_id", "platform", "width", "height", "duration_seconds", "format", "alpha", "codec", "pixel_format", "audio", "status", "source_asset_id", "version", "reviewed_on", "sha256"]
    with (LIB / "_inventory/ASSET_MANIFEST.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)
    source_rows = []
    source_candidates = sorted(path for root in (LIB / "_source", LIB / "_hold") for path in root.rglob("*") if path.is_file() and path.name != ".DS_Store")
    for path in source_candidates:
        rel = str(path.relative_to(LIB))
        classification = "review-evidence" if "review-evidence" in rel else "quarantine" if "quarantine" in rel else "production-source"
        source_rows.append((f"{prefix}-S-{hashlib.sha1(rel.encode()).hexdigest()[:10].upper()}", rel, path.suffix.lower().lstrip("."), classification, "See PROVENANCE.md", "Repository-owned or separately documented", "unknown", "2026-09-04", "Not a routine upload source", sha256(path)))
    with (LIB / "_inventory/SOURCE_MANIFEST.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(("source_asset_id", "source_path", "source_type", "classification", "capture_context", "rights", "contains_personal_data", "reviewed_on", "notes", "sha256"))
        writer.writerows(source_rows)
    publishing_rows = []
    for platform in PLATFORMS:
        base = LIB / f"03-platform-ready/{platform}"
        platform_assets = sorted(path for path in base.rglob("*") if path.is_file() and path.suffix.lower() in MEDIA_EXTENSIONS)
        lines = [f"# {platform.title()} publishing index", "", "Use only the files listed below. READY_LOCAL still requires the common publishing checklist and a native destination preview when the placement can crop or obscure content.", "", "| Placement | Asset | Status | Copy ID |", "|---|---|---|---|"]
        if not platform_assets:
            lines.append("| — | No asset available; see the gap register | BLOCKED | NONE |")
        for path in platform_assets:
            placement = path.relative_to(base).parts[0]
            status = status_for(path)
            copy_id = copy_id_for(path, platform)
            asset_id = id_by_path[path]
            lines.append(f"| {placement} | `{path.name}` ({asset_id}) | {status} | {copy_id} |")
            publishing_rows.append((platform, placement, asset_id, copy_id, status, "", "yes", "", "Complete 00-control/PUBLISHING_CHECKLIST.md"))
        write(f"03-platform-ready/{platform}/INDEX.md", "\n".join(lines))
    with (LIB / "_inventory/PUBLISHING_INDEX.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(("platform", "placement", "asset_id", "copy_id", "status", "cta_url", "preview_required", "last_previewed_on", "notes"))
        writer.writerows(publishing_rows)
    legacy_inventory_names = {"library-manifest.csv", "library-sha256.txt", "assets.csv", "source-index.csv", "source-sha256.txt", "source-media.csv"}
    checksum_files = sorted(
        path for path in LIB.rglob("*")
        if path.is_file()
        and path.name not in {".DS_Store", "CHECKSUMS.sha256"}
        and not (path.parent == LIB / "_inventory" and path.name in legacy_inventory_names)
    )
    with (LIB / "_inventory/CHECKSUMS.sha256").open("w", encoding="utf-8") as handle:
        for path in checksum_files:
            handle.write(f"{sha256(path)}  {path.relative_to(LIB)}\n")


def write_root_readme() -> None:
    display = PROJECT.replace("-", " ").title()
    write("README.md", f"""# {display} media library

This library implements the shared publishing-first structure used by Modulo Squares, Vehicle Vitals, and Wishlist Wizard.

## Start here

1. Check `00-control/READINESS.md` and `00-control/GAP_REGISTER.md`.
2. Open `03-platform-ready/<platform>/INDEX.md` and select the listed asset and copy ID.
3. Retrieve matching copy from `04-copy/POST_LIBRARY.md` and alt text from `04-copy/ALT_TEXT.csv`.
4. Complete `00-control/PUBLISHING_CHECKLIST.md` immediately before publishing.

## Folder map

| Folder | Purpose |
|---|---|
| `00-control/` | Readiness, gaps, accounts, platform specifications, and publishing checklist |
| `01-brand/` | Canonical brand masters and channel-setup exports |
| `02-campaigns/` | Reusable campaign masters organized by stable campaign ID |
| `03-platform-ready/` | The only routine upload source, organized identically for every project |
| `04-copy/` | Profile copy, post library, calendar, alt text, and video metadata |
| `05-store-listings/` | App Store and Google Play upload media, kept separate from social posts |
| `_source/` | Production inputs and editable files; not routine upload selections |
| `_inventory/` | Standard asset/source manifests, publishing index, provenance, and checksums |
| `_hold/` | Review evidence and quarantined material that must not be published |

The previous project-specific paths remain temporarily for compatibility and checksum comparison. `00-control/LEGACY_LIBRARY_GUIDE.md` preserves the former navigation guide.

## Rebuild and validate

```sh
./scripts/media-library/build-media-library.sh
./scripts/media-library/validate-media-library.sh
```

Local validation does not prove account ownership, public availability, link health, rights clearance, or native platform crop approval.
""")


def add_gap_readmes() -> None:
    for directory in sorted(path for path in LIB.rglob("*") if path.is_dir()):
        if directory == LIB or any(part.startswith(".") for part in directory.relative_to(LIB).parts):
            continue
        if any(child.is_file() for child in directory.iterdir()):
            continue
        if directory.name in {"square", "portrait", "landscape", "vertical", "captions"} and "02-campaigns" in directory.parts:
            continue
        (directory / "README.md").write_text("# No current asset\n\nThis required contract location has no current approved asset. See `00-control/GAP_REGISTER.md` before producing or publishing a replacement.\n", encoding="utf-8")


def main() -> int:
    if PROJECT not in PROJECT_PREFIX:
        raise SystemExit(f"Unsupported repository: {PROJECT}")
    common_skeleton()
    preserve_legacy_guide()
    if PROJECT == "modulo-squares":
        migrate_modulo()
    elif PROJECT == "vehicle-vitals":
        migrate_vehicle()
    else:
        migrate_wishlist()
    add_gap_readmes()
    write_root_readme()
    for residue in LIB.rglob(".DS_Store"):
        residue.unlink()
    make_indexes_and_manifests()
    for residue in LIB.rglob(".DS_Store"):
        residue.unlink()
    print(f"Unified media library synchronized for {PROJECT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
