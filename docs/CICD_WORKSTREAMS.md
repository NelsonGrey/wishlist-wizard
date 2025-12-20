# CI/CD Workstreams (wishlist-wizard)

## Requirements
- iOS distribution is zero-touch:
  - ASC API key auth via secrets.
  - Match HTTPS token access to `mnelson3/nelson-grey`.
  - Ephemeral keychain wrapper for signing.
- Runner hosts are resilient (auto-restart + watchdog).

## Current state
- iOS distribution workflow: [wishlist-wizard/.github/workflows/ios-app-distribution.yml](../.github/workflows/ios-app-distribution.yml)
- iOS release pipeline: [wishlist-wizard/.github/workflows/ios-release-pipeline.yml](../.github/workflows/ios-release-pipeline.yml)
- Token refresh health check LaunchAgent: [wishlist-wizard/com.wishlist-wizard.runner-token-refresh.plist](../com.wishlist-wizard.runner-token-refresh.plist)

## Workstreams

### WS1 — iOS distribution (DONE)
Acceptance:
- `workflow_dispatch` with `testflight` and `app_store` completes unattended on the `wishlist-wizard-macos-runner`.

### WS2 — Runner reliability (DONE / MAINTAIN)
- The macOS runner repo includes health-check + auto-recover scripts.
- Next: verify the watchdog is installed on the host machine.

### WS3 — Docker runner reliability (IN PROGRESS)
Deliverables:
- Ensure the periodic token/health check is installed on the docker runner host.
- Health check restarts container if missing.

## Dependencies / Secrets
Required secrets (per repo environment):
- Apple: `ASC_KEY_ID`, `ASC_ISSUER_ID`, `ASC_PRIVATE_KEY`, `FASTLANE_APPLE_ID`, `FASTLANE_TEAM_ID`, `FASTLANE_ITC_TEAM_ID`
- Match: `MATCH_GIT_URL_TOKEN`, `MATCH_PASSWORD`
- Firebase: `FIREBASE_SERVICE_ACCOUNT_KEY_DEVELOPMENT`, `FIREBASE_SERVICE_ACCOUNT_KEY_STAGING`, `FIREBASE_SERVICE_ACCOUNT_KEY_PRODUCTION`
