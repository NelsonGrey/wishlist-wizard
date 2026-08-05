# Final External Signoff Checklist

Last updated: February 20, 2026

This checklist contains only release blockers that cannot be fully completed from local code changes.

## Mobile (App Store Connect / Play Console)

- [ ] Run on-device smoke test for login/logout and wishlist add/edit/delete/purchase
- [ ] Validate real push delivery for price-alert notification on iOS and Android devices
- [ ] Confirm push telemetry/logs for send, delivery, and tap-open paths
- [ ] Upload signed Android release to Play Console internal track
- [ ] Upload iOS build to TestFlight and complete install verification
- [ ] Record submission IDs, build numbers, and timestamps in release notes

## Browser Extension (Chrome Web Store)

- [ ] Build upload ZIP from `packages/browser-extension/dist/`
- [ ] Upload package in Chrome Web Store dashboard
- [ ] Submit listing/release notes and capture submission ID
- [ ] After approval, install from store and verify auth + quick-add + popup flow

## Secrets and Operations

- [ ] Confirm production secrets are present in GitHub repository/environment secrets
- [ ] Confirm no plaintext credentials were committed (including historical scan for current release diff)
- [ ] Record any waivers with owner and remediation date

## Final Go/No-Go

- [ ] `npm run go-live:check` passes on release commit
- [ ] All manual items above are complete, or documented with waiver
