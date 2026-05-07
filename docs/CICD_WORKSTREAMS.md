# CI/CD Workstreams (wishlist-wizard)

**Version**: 1.1  
**Last Updated**: May 7, 2026  
**Status**: Workflow consolidation complete; 6 active workflows optimized; 20 archived workflows disabled; functions lint parser scope fixed.

## Requirements
- iOS distribution is zero-touch:
  - ASC API key auth via secrets.
  - Match HTTPS token access to `mnelson3/nelson-grey`.
  - Ephemeral keychain wrapper for signing.
- Runner hosts are resilient (auto-restart + watchdog).
- Multi-environment gates are unified via reusable workflows.
- CI/CD test commands are monorepo-aware (`npm run test --workspaces --if-present`).

## Current state
- **Active Workflows** (6):
  - [master-pipeline.yml](../.github/workflows/master-pipeline.yml): Multi-environment orchestrator (test, build, deploy).
  - [e2e-tests.yml](../.github/workflows/e2e-tests.yml): Scheduled + on-demand smoke and tier-1/2 tests.
  - [release-readiness-gate.yml](../.github/workflows/release-readiness-gate.yml): PR-to-main blocker (Firebase + user flow + requirements validation).
  - [production-validation.yml](../.github/workflows/production-validation.yml): Reusable production smoke (called by e2e-tests + master-pipeline post-deploy).
  - [extension-build.yml](../.github/workflows/extension-build.yml): Multi-browser extension packaging.
  - [ios-build.yml](../.github/workflows/ios-build.yml): Local iOS release workflow (manual).
- **Archived Workflows** (20, `.disabled` to prevent accidental execution):
  - Security/monitoring: `api-key-health-check`, `security-scan`, `workflow-monitoring`.
  - Build/deploy (superseded by active workflows): `android-distribution`, `ios-app-distribution`, `ios-release-pipeline`, `ci-cd-pipeline`, `automated-staging-deploy`.
  - Testing (superseded): `emulator-tests`, `test-*` family.
  - Chrome extension (handled by current `extension-build.yml`): `chrome-extension-submit`.
- iOS distribution workflow: [wishlist-wizard/.github/workflows/ios-build.yml](../.github/workflows/ios-build.yml) (manual dispatch)
- Token refresh health check LaunchAgent: [wishlist-wizard/com.wishlist-wizard.runner-token-refresh.plist](../com.wishlist-wizard.runner-token-refresh.plist)
- Functions lint reliability: [packages/functions/tsconfig.dev.json](../packages/functions/tsconfig.dev.json) now includes `scripts/**/*.ts` so ESLint `parserOptions.project` covers smoke scripts in CI.

## Workstreams

### WS1 — iOS distribution (DONE)
Acceptance:
- `workflow_dispatch` with `testflight` and `app_store` completes unattended on the `wishlist-wizard-macos-runner`.
- Workflow reference: [ios-build.yml](../.github/workflows/ios-build.yml) (manual)

### WS2 — Runner reliability (DONE / MAINTAIN)
- The macOS runner repo includes health-check + auto-recover scripts.
- Status: watchdog installed and operational on host machine.

### WS3 — Docker runner reliability (IN PROGRESS)
Deliverables:
- Ensure the periodic token/health check is installed on the docker runner host.
- Health check restarts container if missing.

### WS4 — CI/CD Consolidation (DONE)
Objectives: Remove workflow duplication and simplify maintenance.

**Changes (May 6-7, 2026):**
- **Production smoke unification**: Moved production smoke from duplicate e2e-tests + production-validation inline setup into single reusable `production-validation.yml` (called by e2e-tests daily and master-pipeline post-prod-deploy).
- **Master-pipeline simplification**: Removed 84 lines of synthetic-smoke + baseline-metrics gate logic (was duplicating release-readiness-gate responsibility).
- **Test command standardization**: Changed `npm test` → `npm run test --workspaces --if-present` (monorepo-scoped, future-proof).
- **Archive workflow cleanup**: Renamed 20 archived workflows to `.disabled` to prevent GitHub Actions from discovering them.

**Result**:
- Single source of truth per gate (release-readiness-gate owns PR-to-main; e2e-tests/master-pipeline own environment validation).
- Easier maintenance: one production smoke setup, not two.
- Monorepo test command works across all workspaces (web, shared, functions, browser-extension, firebase-utils).
- 187 tests passing (web 157 + shared 16 + browser-extension 10 + firebase-utils 0 + functions 4).

## Dependencies / Secrets
Required secrets (per repo environment):
- Apple: `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`, `APP_STORE_CONNECT_KEY`, `FASTLANE_APPLE_ID`, `FASTLANE_TEAM_ID`, `FASTLANE_ITC_TEAM_ID`
- Match: `MATCH_GIT_URL_TOKEN`, `MATCH_PASSWORD`
- Firebase: `FIREBASE_SERVICE_ACCOUNT_KEY_DEVELOPMENT`, `FIREBASE_SERVICE_ACCOUNT_KEY_STAGING`, `FIREBASE_SERVICE_ACCOUNT_KEY_PRODUCTION`
