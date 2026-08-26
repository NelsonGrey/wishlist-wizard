# CI/CD Setup Guide

This document describes the actual GitHub Actions CI/CD setup for Wishlist Wizard as it exists today. All jobs run on **GitHub-hosted runners** (`ubuntu-latest` / `macos-latest`) — there are no self-hosted runners, Docker runner containers, or per-repo setup scripts in this repository. If you're looking for `./apply-cicd-setup.sh`, `.env.runner.template`, `docker-compose.runner.yml`, or `scripts/setup-macos-runner.sh`, they don't exist here; this repo previously used self-hosted runners, but that approach was retired in favor of GitHub-hosted runners.

## 🎯 Overview

- **Runners**: GitHub-hosted only (`ubuntu-latest`, `macos-latest` for iOS builds)
- **Orchestration**: A manifest file (`.cicd/projects/wishlist-wizard.yml`) drives environment/branch mapping consumed by `master-pipeline.yml`
- **Functions source**: `packages/functions/` is gitignored in this repo — the real backend source lives in a private companion repo, `NelsonGrey/wishlist-wizard-functions`. Any workflow job that builds, tests, or deploys functions checks out that companion repo into `packages/functions/` first, authenticated with the `FUNCTIONS_REPO_PAT` secret, before running `npm ci`.

## 📋 Actual Workflow Files (`.github/workflows/`)

| File | Trigger | Purpose |
|------|---------|---------|
| `master-pipeline.yml` | `push` to `staging`/`main` (path-filtered), `pull_request` to `develop`/`staging`/`main`, `workflow_dispatch` | Main pipeline: test, quality gate, build web/iOS/Android/Chrome extension, deploy Firebase Functions + Hosting, deploy Android (internal track), build iOS (TestFlight) |
| `firebase-deploy-local.yml` | `workflow_call` (reusable) | Checks out the functions companion repo, deploys Firebase Functions/Firestore for a given environment, builds the web app (fetching its Firebase config live from the Management API via the same WIF credentials, rather than storing per-environment `VITE_FIREBASE_*` secrets), and deploys Hosting; called by `master-pipeline.yml` and `release-readiness-gate.yml` |
| `firebase-hosting-dev.yml` | `push` to `develop` | Deploys the web app to Firebase Hosting on the dev project (staging/main's equivalents, `firebase-hosting-staging.yml`/`firebase-hosting-merge.yml`, were retired 2026-08-25 — broken/redundant once `firebase-deploy-local.yml` started deploying Hosting) |
| `secret-scan.yml` | `push`/`pull_request` on `main`/`staging`/`develop`, `workflow_dispatch` | Gitleaks secret scanning |
| `codeql.yml` | `push`/`pull_request` on `main`/`staging`/`develop`, weekly `schedule`, `workflow_dispatch` | CodeQL static analysis (CodeQL Advanced) |
| `release-readiness-gate.yml` | `workflow_dispatch` (manual) | Production launch readiness gate — checks out the functions companion repo and validates the release is safe to ship |
| `ci-gate-approve.yml` | `workflow_run` (after `master-pipeline.yml` completes) | Auto-approves a PR once the master pipeline succeeds on it, via a bot account |
| `production-validation.yml` | `workflow_call` (reusable), `workflow_dispatch` | Post-deploy validation against a live production URL; called from `master-pipeline.yml` when the target environment is `production` |
| `ios-mobile-release.yml` | `workflow_call` (reusable), `workflow_dispatch` | Builds and ships the iOS app to TestFlight (or App Store, via manual `workflow_dispatch` with `release_type`); called from `master-pipeline.yml` for staging/production targets |
| `extension-build.yml` | `workflow_call` (reusable), `workflow_dispatch` | Builds/tests the Chrome extension and optionally publishes it |
| `e2e-tests.yml` | `workflow_dispatch` | Manual end-to-end smoke tests against dev/staging/production |
| `manage-asc-subscriptions.yml` | `workflow_dispatch` | One-off App Store Connect subscription management (status check / draft product creation) |

There is no `deploy-staging.yml`, `deploy-production.yml`, `ci.yml`, `ios-distribution.yml`, `android-distribution.yml`, `test-ci-cd.yml`, `chrome-extension-submit.yml`, or `test-secrets.yml` in this repository — docs that reference those file names are describing a setup this repo no longer (or never) had.

## 🚦 Environment / Branch Mapping

`master-pipeline.yml`'s `load-config` job maps the triggering ref to a deployment environment:

- `refs/heads/main` → `production`
- `refs/heads/staging` → `staging`
- `refs/heads/develop` → present in the mapping logic, but `develop` is **deliberately excluded** from the `push` trigger, so this branch never drives a `master-pipeline.yml` run automatically. `develop` still gets its own web deploy via `firebase-hosting-dev.yml`, which triggers independently on every push to `develop`.

Push-triggered runs on `staging` and `main` are scoped with `paths:` filters (only fire when `packages/mobile/**`, `packages/web/**`, `packages/browser-extension/**`, `packages/functions/**`, `.github/workflows/**`, `.cicd/projects/**`, `pubspec.yaml`, or `firebase*.json` change).

**Deploy scope caveats** (the app is not yet publicly launched):
- **Android**: deploys go to the Play Store **internal track only**. Nothing auto-publishes to a public track.
- **iOS**: automatic runs land in **TestFlight only** (Beta Testers group for `production`, Staging group for `staging`). A full App Store submission is a separate, manual `workflow_dispatch` of `ios-mobile-release.yml` with `release_type: appstore`.
- **Chrome extension**: publish to the Chrome Web Store only fires for the `build_and_deploy` `workflow_dispatch` action; ordinary push/PR runs build and test the extension without publishing.

## 🔑 Gate Set

The checks that run on pushes/PRs (in addition to the master pipeline's own test/build/quality-gate jobs):

1. **Secret Scan** (`secret-scan.yml`) — gitleaks, blocks on any detected secret pattern
2. **CodeQL** (`codeql.yml`) — static analysis for security vulnerabilities, also runs on a weekly schedule
3. **CI Gate Auto-Approve** (`ci-gate-approve.yml`) — auto-approves a PR once `master-pipeline.yml` succeeds for it, via a dedicated bot account (`admin-nelsongrey`), guarded against stale/duplicate approvals
4. **Production Validation** (`production-validation.yml`) — runs automatically after a production deploy inside `master-pipeline.yml`
5. **Release Readiness Gate** (`release-readiness-gate.yml`) — manual (`workflow_dispatch`) pre-launch readiness check, run deliberately before a production release rather than on every push

## 🧩 Functions Companion-Repo Checkout

Because `packages/functions/` is gitignored (see `.gitignore`), any job that needs real function source clones the companion repo before installing dependencies:

```yaml
- uses: actions/checkout@v5
  with:
    repository: NelsonGrey/wishlist-wizard-functions
    token: ${{ secrets.FUNCTIONS_REPO_PAT }}
    path: packages/functions
```

This happens in four places today: `master-pipeline.yml`'s `test` job, its `build-web` job, the reusable `firebase-deploy-local.yml`, and `release-readiness-gate.yml`. If you're reproducing a CI job locally or writing a new workflow that touches `packages/functions`, you need this checkout step (with a PAT that has read access to the companion repo) before `npm ci` will succeed.

## 🛡️ Auth Notes Relevant to CI

- Firebase App Check was removed entirely 2026-08-24 (web, iOS, and backend enforcement) — it caused more operational friction (headless-browser reCAPTCHA failures, CI blockers) than the protection was worth, matching the same decision already made on this org's other two projects. No workflow does anything App-Check-related anymore.
- Password policy is not managed by application code or CI — it's read live from the Firebase Auth console via the `validatePassword()` SDK call in `packages/web/client-src/lib/firebase.ts`. There is nothing to configure in a workflow for this.

## 💰 Cost

Since all runners are GitHub-hosted, cost is standard GitHub Actions per-minute billing (Linux and macOS runner minutes). There is no self-hosted runner cost-savings model in this repository anymore.

## 🆘 Troubleshooting

- **Functions-related job fails on `npm ci` / missing files**: check that the `FUNCTIONS_REPO_PAT` secret is valid and that the companion-repo checkout step ran before the install step.
- **Deploy job silently no-ops**: confirm the branch actually matches a push trigger — `develop` does not trigger `master-pipeline.yml`'s deploy jobs (see Environment/Branch Mapping above), only `firebase-hosting-dev.yml`.
- **PR not auto-approved**: `ci-gate-approve.yml` only fires after `master-pipeline.yml` completes for that PR's head SHA, and skips if the PR has since moved on or already has a bot approval.
