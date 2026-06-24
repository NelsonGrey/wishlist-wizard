#!/usr/bin/env bash
# Migrates Firebase app registrations to the new bundle/package IDs across all
# three projects (dev, staging, prod) for iOS and Android.
#
# New identifiers:
#   iOS bundle ID:    com.wishlistwizard.app.ios
#   Android package:  com.wishlistwizard.app.android
#
# Steps per project:
#   1. Create new app with updated bundle/package ID
#   2. Download updated GoogleService-Info.plist (iOS) or google-services.json (Android)
#   3. Archive (remove) the old app registration via the Firebase Management API
#
# Prerequisites:
#   - firebase CLI authenticated (run `firebase login` or set GOOGLE_APPLICATION_CREDENTIALS)
#   - gcloud CLI authenticated (run `gcloud auth login`)
#   - python3 available
#
# After running this script:
#   - Run `flutterfire configure` to regenerate firebase_options.dart with the new app IDs
#   - Run the `certificates_appstore` Fastlane lane to generate provisioning profiles
#     for the new iOS bundle ID

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

NEW_IOS_BUNDLE="com.wishlistwizard.app.ios"
NEW_ANDROID_PACKAGE="com.wishlistwizard.app.android"

PROJECT_PROD="wishlist-wizard-prod"
PROJECT_STAGING="wishlist-wizard-staging"
PROJECT_DEV="wishlist-wizard-dev"

# Old iOS app IDs (read from the existing plists before overwriting)
OLD_IOS_PROD="1:464233600681:ios:96af1444cfdb7996957bb8"
OLD_IOS_STAGING="1:1039527515823:ios:74badb9bdfe11b2bdee65a"
OLD_IOS_DEV="1:1055615167809:ios:0eb227596e9e64715485c0"

# Old Android app IDs (from firebase_options.dart — these are the com.nelsongrey.wishlistwizard.mobile
# registrations; the google-services.json files contain a mismatched project ID and are being replaced)
OLD_ANDROID_PROD="1:464233600681:android:3674b697f74dcf2f957bb8"
OLD_ANDROID_STAGING="1:1039527515823:android:ddd4f0bca0411bbddee65a"
OLD_ANDROID_DEV="1:1055615167809:android:3d52fc8b06b344e15485c0"

ACCESS_TOKEN="$(gcloud auth print-access-token)"

firebase_delete_app() {
  local project="$1"
  local app_id="$2"
  local platform="$3"

  local resource_type
  case "$platform" in
    ios)     resource_type="iosApps" ;;
    android) resource_type="androidApps" ;;
  esac

  echo "  Archiving old $platform app $app_id from $project..."
  curl -s -X PATCH \
    "https://firebase.googleapis.com/v1beta1/projects/${project}/${resource_type}/${app_id}?updateMask=state" \
    -H "Authorization: Bearer ${ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"state":"DELETED"}' | python3 -c "
import sys, json
r = json.load(sys.stdin)
if r.get('done') or r.get('name'):
    print('  ✓ Archived')
else:
    print('  Response:', json.dumps(r, indent=2))
"
}

# ---------------------------------------------------------------------------
# iOS — prod
# ---------------------------------------------------------------------------
echo "=== iOS: $PROJECT_PROD ==="
echo "  Creating $NEW_IOS_BUNDLE..."
NEW_APP_ID=$(firebase apps:create IOS "Wishlist Wizard" \
  --bundle-id "$NEW_IOS_BUNDLE" \
  --project "$PROJECT_PROD" \
  --json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['appId'])")
echo "  New app ID: $NEW_APP_ID"
echo "  Downloading GoogleService-Info.plist..."
firebase apps:sdkconfig IOS "$NEW_APP_ID" \
  --project "$PROJECT_PROD" \
  --out "$REPO_ROOT/packages/mobile/ios/Runner/GoogleService-Info.prod.plist" \
  --non-interactive 2>/dev/null
echo "  ✓ Saved to packages/mobile/ios/Runner/GoogleService-Info.prod.plist"
firebase_delete_app "$PROJECT_PROD" "$OLD_IOS_PROD" "ios"

echo ""
# ---------------------------------------------------------------------------
# iOS — staging
# ---------------------------------------------------------------------------
echo "=== iOS: $PROJECT_STAGING ==="
echo "  Creating $NEW_IOS_BUNDLE..."
NEW_APP_ID=$(firebase apps:create IOS "Wishlist Wizard" \
  --bundle-id "$NEW_IOS_BUNDLE" \
  --project "$PROJECT_STAGING" \
  --json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['appId'])")
echo "  New app ID: $NEW_APP_ID"
echo "  Downloading GoogleService-Info.plist..."
firebase apps:sdkconfig IOS "$NEW_APP_ID" \
  --project "$PROJECT_STAGING" \
  --out "$REPO_ROOT/packages/mobile/ios/Runner/GoogleService-Info.staging.plist" \
  --non-interactive 2>/dev/null
echo "  ✓ Saved to packages/mobile/ios/Runner/GoogleService-Info.staging.plist"
firebase_delete_app "$PROJECT_STAGING" "$OLD_IOS_STAGING" "ios"

echo ""
# ---------------------------------------------------------------------------
# iOS — dev
# ---------------------------------------------------------------------------
echo "=== iOS: $PROJECT_DEV ==="
echo "  Creating $NEW_IOS_BUNDLE..."
NEW_APP_ID=$(firebase apps:create IOS "Wishlist Wizard" \
  --bundle-id "$NEW_IOS_BUNDLE" \
  --project "$PROJECT_DEV" \
  --json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['appId'])")
echo "  New app ID: $NEW_APP_ID"
echo "  Downloading GoogleService-Info.plist..."
firebase apps:sdkconfig IOS "$NEW_APP_ID" \
  --project "$PROJECT_DEV" \
  --out "$REPO_ROOT/packages/mobile/ios/Runner/GoogleService-Info.dev.plist" \
  --non-interactive 2>/dev/null
echo "  ✓ Saved to packages/mobile/ios/Runner/GoogleService-Info.dev.plist"
firebase_delete_app "$PROJECT_DEV" "$OLD_IOS_DEV" "ios"

echo ""
# ---------------------------------------------------------------------------
# Android — prod
# ---------------------------------------------------------------------------
echo "=== Android: $PROJECT_PROD ==="
echo "  Creating $NEW_ANDROID_PACKAGE..."
NEW_APP_ID=$(firebase apps:create ANDROID "Wishlist Wizard" \
  --package-name "$NEW_ANDROID_PACKAGE" \
  --project "$PROJECT_PROD" \
  --json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['appId'])")
echo "  New app ID: $NEW_APP_ID"
echo "  Downloading google-services.json..."
firebase apps:sdkconfig ANDROID "$NEW_APP_ID" \
  --project "$PROJECT_PROD" \
  --out "$REPO_ROOT/packages/mobile/android/app/google-services.prod.json" \
  --non-interactive 2>/dev/null
echo "  ✓ Saved to packages/mobile/android/app/google-services.prod.json"
firebase_delete_app "$PROJECT_PROD" "$OLD_ANDROID_PROD" "android"

echo ""
# ---------------------------------------------------------------------------
# Android — staging
# ---------------------------------------------------------------------------
echo "=== Android: $PROJECT_STAGING ==="
echo "  Creating $NEW_ANDROID_PACKAGE..."
NEW_APP_ID=$(firebase apps:create ANDROID "Wishlist Wizard" \
  --package-name "$NEW_ANDROID_PACKAGE" \
  --project "$PROJECT_STAGING" \
  --json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['appId'])")
echo "  New app ID: $NEW_APP_ID"
echo "  Downloading google-services.json..."
firebase apps:sdkconfig ANDROID "$NEW_APP_ID" \
  --project "$PROJECT_STAGING" \
  --out "$REPO_ROOT/packages/mobile/android/app/google-services.staging.json" \
  --non-interactive 2>/dev/null
echo "  ✓ Saved to packages/mobile/android/app/google-services.staging.json"
firebase_delete_app "$PROJECT_STAGING" "$OLD_ANDROID_STAGING" "android"

echo ""
# ---------------------------------------------------------------------------
# Android — dev
# ---------------------------------------------------------------------------
echo "=== Android: $PROJECT_DEV ==="
echo "  Creating $NEW_ANDROID_PACKAGE..."
NEW_APP_ID=$(firebase apps:create ANDROID "Wishlist Wizard" \
  --package-name "$NEW_ANDROID_PACKAGE" \
  --project "$PROJECT_DEV" \
  --json 2>/dev/null | python3 -c "import sys,json; print(json.load(sys.stdin)['result']['appId'])")
echo "  New app ID: $NEW_APP_ID"
echo "  Downloading google-services.json..."
firebase apps:sdkconfig ANDROID "$NEW_APP_ID" \
  --project "$PROJECT_DEV" \
  --out "$REPO_ROOT/packages/mobile/android/app/google-services.dev.json" \
  --non-interactive 2>/dev/null
echo "  ✓ Saved to packages/mobile/android/app/google-services.dev.json"
firebase_delete_app "$PROJECT_DEV" "$OLD_ANDROID_DEV" "android"

echo ""
echo "=== All Firebase registrations migrated ==="
echo ""
echo "Next steps:"
echo "  1. Run flutterfire configure in packages/mobile/ to regenerate firebase_options.dart"
echo "     with the new app IDs from all six newly-registered apps:"
echo ""
echo "       cd packages/mobile"
echo "       flutterfire configure \\"
echo "         --project wishlist-wizard-prod \\"
echo "         --ios-bundle-id com.wishlistwizard.app.ios \\"
echo "         --android-package-name com.wishlistwizard.app.android"
echo ""
echo "  2. Register com.wishlistwizard.app.ios as a new App ID in the Apple Developer Portal"
echo "     (Certificates, Identifiers & Profiles → Identifiers → + )"
echo "     Required capabilities: Push Notifications, Sign in with Apple (if used)"
echo ""
echo "  3. Run Fastlane Match to generate the App Store provisioning profile:"
echo ""
echo "       cd packages/mobile/ios"
echo "       APP_STORE_CONNECT_KEY_ID=<key_id> \\"
echo "       APP_STORE_CONNECT_ISSUER_ID=<issuer_id> \\"
echo "       APP_STORE_CONNECT_KEY=\$(cat /path/to/AuthKey_*.p8 | base64) \\"
echo "       MATCH_GIT_URL=<certs_repo_url> \\"
echo "       MATCH_KEYCHAIN_PASSWORD=<password> \\"
echo "       bundle exec fastlane sync_signing"
echo ""
echo "  4. Create a new app entry in App Store Connect for com.wishlistwizard.app.ios"
echo "     (Apps → + → New App, using the new bundle ID)"
echo ""
echo "  5. Commit the updated plist/json files and firebase_options.dart"
