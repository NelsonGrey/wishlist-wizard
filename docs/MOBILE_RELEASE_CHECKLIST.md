# Mobile Release Checklist (iOS + Android)

Last updated: February 20, 2026

Use this checklist before any production mobile release. Record execution evidence for
each run in the release's PR description or `docs/RELEASE_SUMMARY.md`.

## 1) Code and quality gates

- [ ] `cd packages/mobile && flutter pub get`
- [ ] `cd packages/mobile && flutter analyze`
- [ ] `cd packages/mobile && flutter test`
- [ ] `npm run preflight:mobile`
- [ ] Confirm no local secrets are tracked by git (`service-account-key*.json` must remain untracked)

## 2) Runtime verification

- [ ] Verify login/logout on device/emulator
- [ ] Verify wishlist add/edit/delete/purchase flows on device/emulator
- [ ] Verify notification deep-link routing:
  - direct item target
  - wishlist fallback target
  - query-param and path-based payloads
- [ ] Verify price-alert notification rendering and tap behavior

## 3) iOS release prerequisites

- [ ] App Store Connect credentials valid in GitHub Secrets
- [ ] Signing/certificates available via Match/cert repo
- [ ] Bundle version/build number incremented
- [ ] TestFlight build generated and install-verified
- [ ] Release notes prepared

## 4) Android release prerequisites

- [ ] Play Console access verified
- [ ] Android signing keystore/credentials available in secrets
- [ ] Version code/name incremented
- [ ] Signed release build generated
- [ ] Internal testing track upload completed
- [ ] Release notes prepared

## 5) Go/No-Go

- [ ] All items above complete, or
- [ ] Open waiver recorded with owner + deadline for any exception
