# Android Distribution Setup

This describes the real, live Android build/release pipeline — the `build-android` and
`deploy-android` jobs in `.github/workflows/master-pipeline.yml` — plus how to build a
signed release locally. It mirrors `IOS_DISTRIBUTION_SETUP.md`'s purpose for the
Android side, which previously had no documentation despite a working pipeline.

## CI pipeline (source of truth)

`build-android` runs on a GitHub-hosted `ubuntu-latest` runner (Android builds don't
need macOS, unlike iOS) with Java 21 (Temurin) and the Flutter stable channel:

1. **Per-environment Firebase config**: `android/app/google-services.json` (the file
   the `google-services` Gradle plugin actually bakes into the build) is swapped in
   from `google-services.dev.json` / `.staging.json` / `.prod.json` based on the
   target environment — this is separate from and must agree with
   `firebase_options.dart`'s `FIREBASE_ENV` dart-define.
2. **Debug builds** (`trigger_context` not `build_and_deploy`/`android_deploy_only`):
   `flutter build apk --debug --dart-define=FIREBASE_ENV=<env>`, no signing needed.
3. **Release builds** (`build_and_deploy`/`android_deploy_only`): decodes the
   `ANDROID_KEYSTORE_BASE64` secret to `android/app/wishlist-wizard-key.jks`, then
   `flutter build appbundle --release --dart-define=FIREBASE_ENV=<env>` — this reads
   `ANDROID_STORE_PASSWORD`/`ANDROID_KEY_PASSWORD` from the environment via
   `android/app/build.gradle.kts`'s `signingConfigs.release` block (key alias is
   hardcoded `wishlist-wizard`). Both secrets are required; the job fails fast with a
   clear error if either is missing.
4. Both APK/AAB outputs are uploaded as workflow artifacts.

`deploy-android` only runs for `staging`/`production` target environments (never
`development`), downloads the release AAB artifact, and uploads it directly via the
**`r0adkll/upload-google-play@v1`** GitHub Action using the
`GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` secret — not Fastlane (see below). Both staging and
production target environments currently publish to the same static **`internal`**
Play Console track, since the app isn't publicly launched yet; there's no auto-promotion
to a public track.

Versioning: `versionCode`/`versionName` come from `flutter.versionCode`/
`flutter.versionName` in `build.gradle.kts`, which Flutter derives from the `version:`
field in `packages/mobile/pubspec.yaml` (e.g. `1.2.3+45` → versionName `1.2.3`,
versionCode `45`). Play Console rejects a re-upload with a versionCode it's already
seen — bump the `+N` suffix before a release if you hit that.

## The Fastlane setup — real, but not wired into CI

`packages/mobile/android/fastlane/Fastfile` and `Appfile` exist and define real lanes
(`internal`/`beta`/`production`/`promote_to_beta`/`promote_to_production`/etc.), but
**the CI pipeline does not call them** — `deploy-android` uses the `r0adkll/upload-google-play`
Action directly instead, and that's the path that's actually been live-verified (real
signed AAB, real upload to the internal track). The Fastfile's own header comment
documents this and flags two bugs if you ever do resurrect it for CI:
- `upload_to_play_store` needs `json_key_data`/`package_name` passed explicitly — the
  `Appfile`'s `json_key_file`/env-var declaration alone silently falls through to
  Application Default Credentials and fails confusingly.
- The Fastfile reads `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY`, but the secret actually
  configured in this repo's GitHub Actions secrets is `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`
  (the name `deploy-android` uses) — fix that mismatch before relying on the Fastfile.

The Fastfile is kept for local/manual use only (e.g. `bundle exec fastlane android internal`
from `packages/mobile/android/` with your own service-account JSON and env vars set).

## Building a signed release locally

```bash
cd packages/mobile
cp android/app/google-services.dev.json android/app/google-services.json  # or .staging/.prod

# Decode your local copy of the release keystore (never commit the .jks itself)
base64 --decode < path/to/your/keystore.b64 > android/app/wishlist-wizard-key.jks

ANDROID_STORE_PASSWORD=... ANDROID_KEY_PASSWORD=... \
  flutter build appbundle --release --dart-define=FIREBASE_ENV=development
```

Without `ANDROID_STORE_PASSWORD`/`ANDROID_KEY_PASSWORD` set, `build.gradle.kts` falls
back to the password `"android"` — fine for a local debug-signed build, not for
anything you intend to actually upload.

## Troubleshooting

**Gradle build fails with a bare version number as the error** (e.g. `25.0.2`) and no
other detail: this is very likely a JDK mismatch, not a code problem. CI pins Java 21
(Temurin) explicitly via `actions/setup-java`. Locally, `flutter build apk`/`appbundle`
picks up whichever JDK Android Studio's bundled JDK config points to (`flutter doctor -v`
shows "Java binary at:" and the version) — if that's been updated to a newer major
version (e.g. 25) than this project's Gradle/AGP version supports, the build fails this
way. Fix with `flutter config --jdk-dir="path/to/jdk21"` pointed at a JDK 21 install, or
downgrade Android Studio's bundled JDK selection.
