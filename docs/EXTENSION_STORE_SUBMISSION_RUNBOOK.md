# Browser Extension Store Submission Runbook

Last updated: February 20, 2026

Canonical runbook for shipping `@wishlist-wizard/browser-extension`.

Execution evidence for the latest run: `docs/DELIVERABLE_EXECUTION_LOG_2026-02-20.md`

## 1) Build and package

- [ ] `npm ci`
- [ ] `npm run package:extension:release`
- [ ] `npm run test --workspace=@wishlist-wizard/browser-extension -- --run`
- [ ] `npm run preflight:extension`
- [ ] Confirm output exists at `packages/browser-extension/dist/`
- [ ] Confirm store upload zip exists (for example: `packages/browser-extension/dist/wishlist-wizard-extension-YYYYMMDD.zip`)

## 2) Functional verification (pre-submit)

- [ ] Load unpacked extension from `packages/browser-extension/dist/` in Chrome
- [ ] Verify authentication flow
- [ ] Verify product extraction on representative retailers
- [ ] Verify quick-add flow saves item correctly
- [ ] Verify popup opens and core actions work

## 3) Store metadata and policy checks

- [ ] Manifest version incremented
- [ ] Privacy policy URL valid
- [ ] Required icon sizes present and correct
- [ ] Screenshots and listing copy updated
- [ ] Permission declarations reviewed and justified

## 4) Submission and post-submit

- [ ] Upload zip in Chrome Web Store developer dashboard
- [ ] Submit release notes/changelog
- [ ] Record submission ID/date in release notes
- [ ] After approval, install from store and smoke-test production install

## 5) Go/No-Go

- [ ] All checks pass, or
- [ ] Waiver documented with owner + remediation deadline
