# Deliverable Component Completion Matrix

**Version**: 1.2  
**Last Updated**: August 8, 2026  
**Purpose**: Single execution tracker for the 3 production deliverables.

### Recent Updates (July-August 2026)
- **Affiliate/creator payout backend + creator dashboard shipped** (2026-07-21): commission ledger state machine, Stripe Connect Express payouts, tier-gated creator dashboard, `/admin/affiliate` tooling.
- **Achievements v1 shipped** (2026-07-23): real computed-on-read backend, never-regress semantics, `/app/achievements`.
- **`packages/functions` extracted to a private companion repo** (2026-07-17): `NelsonGrey/wishlist-wizard-functions`. Local `packages/functions/` is now gitignored.
- **All public-invoker-requiring callables migrated to the `api` HTTP router** (~2026-07-23), due to an org policy blocking new `allUsers` Cloud Run invoker bindings.
- **Mobile native IAP, real AdMob App IDs, App Store Connect/Play Console subscription scripts, Firebase Auth password policy, account/data deletion** all shipped 2026-07 through 2026-08-06.
- **1280px content confinement + CRUD toolset wording standard** applied app-wide (2026-07-23).

### Recent Updates (May 6-8, 2026)
- **CI/CD Consolidation Complete**: Production smoke unified into reusable workflow; master-pipeline simplified (84 lines removed); test command standardized for monorepo (`npm run test --workspaces --if-present`).
- **Web Test Stabilization Complete**: React Query mocking fixed via hoisted pattern; Radix UI dropdown queries stabilized; 26 target web tests now passing (NotificationsPage 12, NotificationDropdown 7, WishlistCard 7).
- **Non-Prod Password-Gate Locked In**: AppRouter.test.tsx includes regression tests verifying homepage and non-home routes are both protected in development/demonstration/staging environments.
- **Workflow Archive Cleanup**: 20 archived workflows renamed to `.disabled` to prevent accidental execution.
- **Branch Consolidation**: Commits `9d83d36` (develop), `678f1a0` (demo), `4df04dc` (demonstration) now carry all consolidation changes.
- **Monorepo Test Determinism**: Workspace `test` scripts for web/shared now use `vitest run` so CI and root workspace test runs terminate cleanly.
- **Current Quality Gates (May 8, 2026)**: `npm run lint`, `npm run check`, `npm run requirements:verify`, `npm run test --workspace=@wishlist-wizard/shared`, and `npm run test --workspace=@wishlist-wizard/web` all pass.

---

## How to Use This Document

- This is the **source of truth** for completion status of:
  1. Website
  2. Mobile apps
  3. Browser extension
- Update this document whenever a component ships, regresses, or is blocked.
- Keep status evidence concrete (file paths, tests, analyzer/build output).

### Status Legend
- ✅ Complete: implemented end-to-end with basic validation
- 🟡 In Progress: partially implemented or not fully validated
- 🔴 Not Started / Missing: no meaningful implementation yet
- ⚫ Blocked: cannot proceed without external dependency/decision

### Definition of Done (DoD)
A component is ✅ only when all are true:
- Implemented in code (no placeholder path)
- Connected to real data/services
- Error states handled
- Verified by targeted test(s) and/or analyzer/build
- Documented in this matrix

### Persona Execution Matrix (Phase 1)

| Persona | Design Flow Reference | Execution Surfaces | Validation Signal | Source References |
|---|---|---|---|---|
| Social Gift-Giver | Flow 1, Flow 3, Flow 4 | Web auth + wishlist + sharing + purchase, mobile wishlist, extension quick add | Auth/router tests, wishlist tests, smoke users/functions | docs/PRODUCT_DESIGN.md#flow-1-create-first-wishlist-individual-user; docs/PRODUCT_DESIGN.md#flow-3-share-wishlist; docs/PRODUCT_DESIGN.md#flow-4-buy-from-wishlist |
| Budget-Conscious Shopper | Flow 2 | Web item add + price tracking, mobile item CRUD + validation, extension coupon/comparison | Price tracking tests, mobile validation tests, smoke functions | docs/PRODUCT_DESIGN.md#flow-2-add-item-to-wishlist-product-discovery |
| Occasion Coordinator | Flow 6 | Collaboration controls, notifications, commitments/export readiness | Notification tests, collaborator smoke flows, requirements verification | docs/PRODUCT_DESIGN.md#flow-6-group-gifting-coordination |
| TikTok Creator | Flow 5 | Analytics funnel, ad/creator monetization visibility, extension analytics events | Analytics page tests, backend analytics summaries, smoke functions | docs/PRODUCT_DESIGN.md#flow-5-creator-dashboard |

---

## 1) Website Deliverable (React Web)

| Component | Status | Current State | Next Action | Evidence |
|---|---|---|---|---|
| Auth flows (login/register/verify/reset) | ✅ | Routes and pages in active router; Firebase-first wiring; context smoke tests green | Monitor for auth edge cases; maintain tests | packages/web/client-src/test/AuthContext.test.tsx (6 passing); packages/web/client-src/AppRouter.test.tsx (19 passing, +2 new password-gate regression tests) |
| Non-prod password gate | ✅ | All routes require password in dev/demo/staging; regression tested for homepage and non-home paths | Maintain gate tests with every auth/router PR and confirm secret/fallback password behavior during deploys | packages/web/client-src/test/AppRouter.test.tsx ("gates homepage", "requires password for non-home") |
| Core wishlist CRUD UI | ✅ | Dashboard CRUD UI and key interaction states are covered by targeted component tests | Add E2E coverage in future hardening phase | packages/web/client-src/pages/DashboardFirebase.tsx; packages/web/client-src/test/components/DashboardFirebase.test.tsx (10 passing) |
| Item detail and actions | ✅ | Item create/edit and validation paths are covered with route-level component tests | Add browser-level E2E when introducing new item actions | packages/web/client-src/pages/WishlistDetail.tsx; packages/web/client-src/test/components/WishlistDetail.test.tsx (4 passing) |
| Notification center + deep links | ✅ | Notification render, actions, empty/loading states, and invalid timestamp safety are covered; React Query mocking stabilized | Extend cases for additional payload variants as needed | packages/web/client-src/pages/Notifications.tsx; packages/web/client-src/test/components/NotificationsPage.test.tsx (12 passing) |
| Notification dropdown interactions | ✅ | Dropdown render, event handling, Radix UI portal behavior stabilized via testid-based queries | Continue refining dropdown state coverage | packages/web/client-src/test/components/NotificationDropdown.test.tsx (7 passing) |
| Privacy controls | ✅ | Production-facing controls present (demo action removed) | Add smoke tests for key toggles | packages/web/client-src/components/privacy/PrivacyControls.tsx |
| Price tracking surfaces | ✅ | Price drop/volatility loading, empty, and populated states are validated with dedicated tests; WishlistCard interactions stabilized | Continue monitoring backend signal quality in production | packages/web/client-src/pages/PriceTracking.tsx; packages/web/client-src/test/components/PriceTracking.test.tsx (3 passing); packages/web/client-src/test/components/wishlist/WishlistCard.test.tsx (7 passing) |
| Affiliate/creator payout backend + creator dashboard | ✅ | Commission ledger state machine (Tracked→Pending→Approved→Payable→Paid, Reversed), Stripe Connect Express payouts, tier-gated creator dashboard, admin tooling; deployed to wishlist-wizard-dev, live-verified via free-tier 403 UpgradePrompt against real deployed backend | Get admin/creator-tier live verification with real credentials (currently emulator-verified pre-deploy only) | packages/functions/src/api/commissionLedger.ts, payouts.ts, creatorPayoutAccount.ts, creatorTracking.ts, affiliateReconciliation.ts; packages/web/client-src/pages/admin/AffiliateAdmin.tsx; components/creator-dashboard/* |
| Achievements v1 | ✅ | Real computed-on-read achievements backend (12 achievements: Foundation, Tracker, Extension Power User, Gift Giver, Well-Loved, Sharer); merge-never-regress semantics; served via `GET /api/achievements` through the api router | Extend to remaining deferred achievements (Bargain Hunter, Wishlist Builder, Group Organizer, Chip In, Collaborator, Creator track) | packages/functions/src/api/achievements.ts; packages/web/client-src/pages/AchievementsGuide.tsx; packages/shared/src/achievements.ts |
| Account/data deletion | ✅ | Real account and data deletion wired into web UI | Verify mobile deletion path end-to-end on device | packages/web/client-src (account deletion flow); commit 2299930 |
| Firebase Auth password policy | ✅ | Live enforcement via Firebase Auth `validatePassword()`; password reset via Firebase `verifyPasswordResetCode`/`confirmPasswordReset` | — | packages/web/client-src/lib/firebase.ts; commits fd247eb, 6c6f3d4 |
| Navigation/layout integrity | ✅ | Single-shell ownership spec and cleanup completed; password-gate behavior locked in; 1280px content confinement (white outside, header/footer exempt) and CRUD toolset wording standard applied app-wide (2026-07-23) | Run routing smoke tests on every nav PR | packages/web/client-src/AppRouter.test.tsx (19 passing); packages/web/client-src/components/layout/AppLayout.tsx, AuthLayout.tsx |
| Demo/placeholder route removal | ✅ | Demo routes/pages removed from production router | Prevent reintroduction via PR checklist | packages/web/client-src/AppRouter.tsx |
| React Query + Radix UI test mocking | ✅ | Hoisted mock pattern stabilizes all React Query hooks; Radix dropdown tests use testid queries | Keep hoisted pattern as template for new React Query tests | packages/web/client-src/test/components/NotificationsPage.test.tsx (hoisted pattern documented); packages/web/client-src/test/components/NotificationDropdown.test.tsx (Radix mocking pattern) |

---

## 2) Mobile Deliverable (Flutter iOS/Android)

| Component | Status | Current State | Next Action | Evidence |
|---|---|---|---|---|
| Firebase auth + guarded experience | ✅ | User-gated streams and authenticated flows are in place | Keep analyzer and auth smoke tests green | packages/mobile/lib/main.dart |
| Wishlist list + real-time sync | ✅ | Stream-backed wishlist list with create/edit/delete | Add targeted widget tests for empty/error states | packages/mobile/lib/screens/firebase_wishlists_screen.dart |
| Wishlist item CRUD | ✅ | Add/edit/delete/purchased toggles are data-backed | Add focused tests for dialog validations | packages/mobile/test/dialog_and_notification_validation_test.dart (13 passing) |
| Item URL/image validation | ✅ | URL normalization/validation for add/edit/open implemented | URL validation tests passing | packages/mobile/test/dialog_and_notification_validation_test.dart (URL tests) |
| Legacy wishlist detail URL handling | ✅ | Legacy add/edit/open link handling normalized and validated | Monitor for divergence from Firebase screen behavior | packages/mobile/lib/screens/wishlist_detail_screen.dart |
| Notifications stream + mark as read | ✅ | Real notification stream and read updates are active | Notification payload and deep-link tests passing | packages/mobile/test/notification_deeplink_parser_test.dart (5 passing) |
| Notification deep-link routing | ✅ | Item-first resolution, wishlist fallback, query/path parsing, parser tests | routing logic validated by deeplink tests | packages/mobile/test/dialog_and_notification_validation_test.dart (deep-link routing tests); packages/mobile/test/notification_deeplink_parser_test.dart |
| Push delivery pipeline (end-to-end) | 🟡 | Client-side handling exists; server-side price-alert push dispatch is now wired through centralized FCM utility with transient retry handling | Validate delivery on real devices and confirm retry behavior in telemetry | packages/mobile/lib/services/fcm_service.dart; packages/functions/src/firebase-price-tracking.ts; packages/functions/src/fcm.ts |
| Native release pipelines (iOS/Android) | 🟡 | CI/docs are in place and local release artifacts now build (`app-release.apk`, `Runner.app` no-codesign), but store submission evidence remains process-driven | Execute and record `docs/MOBILE_RELEASE_CHECKLIST.md` per release | docs/IOS_DOCUMENTATION_INDEX.md; docs/MOBILE_RELEASE_CHECKLIST.md; docs/DELIVERABLE_EXECUTION_LOG_2026-02-20.md |
| Native in-app purchases (StoreKit/Play Billing) | ✅ | Replaced Stripe checkout on mobile with native IAP | Verify a live purchase round-trip on real devices | commit ab09174 |
| Real AdMob App IDs (iOS/Android) | ✅ | Real production AdMob App IDs wired for both platforms (previously placeholder/test IDs) | Monitor live ad fill/revenue | commits c60c204, 5a11659, 15c8ee8 |
| App Store Connect / Play Console subscription mgmt scripts | ✅ | Scripted subscription status/draft management via ASC + Play Console APIs | — | commits ace3086, e84b1b1 |

---

## 3) Browser Extension Deliverable

| Component | Status | Current State | Next Action | Evidence |
|---|---|---|---|---|
| Build/package pipeline | ✅ | Extension build and packaging flows stabilized | Keep packaging docs aligned with current monorepo paths | packages/browser-extension/vite.config.ts |
| Extension auth and session refresh | ✅ | JWT auth + refresh support present | Add periodic token-expiry integration test | packages/browser-extension/src/lib/auth/* |
| Product extraction engine | ✅ | Enhanced extractor in production with robust fallback behavior | Maintain retailer selector coverage and failure telemetry | packages/browser-extension/src/enhanced-product-extractor.js |
| Quick add workflow | ✅ | One-click add path present and wired | Add QA checks for unsupported retailer fallback | packages/browser-extension/src/quick-add.js |
| Coupon lookup | ✅ | Backend-driven coupon behavior (mock fallback removed from core path) | Validate provider reliability and UX fallback text | packages/browser-extension/src/coupons.js |
| Price comparison lookup | ✅ | Backend lookup enabled; graceful handling for no-results | Add storefront-specific regression fixtures | packages/browser-extension/src/comparison.js |
| Popup UX and routing | ✅ | Functional implementation remains stable and extension docs/runbooks are aligned to current architecture | Add popup routing integration test in future hardening phase | packages/browser-extension/src/popup.js; docs/packages/browser-extension/src/DEVELOPER-GUIDE.md; docs/EXTENSION_STORE_SUBMISSION_RUNBOOK.md |
| Store submission operations | 🟡 | Store submission runbook and preflight automation are now aligned to current dist artifacts; dashboard submission remains manual | Execute and record `docs/EXTENSION_STORE_SUBMISSION_RUNBOOK.md` per release | docs/EXTENSION_STORE_SUBMISSION_RUNBOOK.md; scripts/extension-release-preflight.sh; docs/DELIVERABLE_EXECUTION_LOG_2026-02-20.md |

---

## Cross-Deliverable Gaps to Close Next

1. **Canonical acceptance tests per deliverable**
   - Website: critical route/auth/navigation smoke suite
   - Mobile: notification/deeplink and dialog validation tests
   - Extension: expand beyond extractor/quick-add smoke tests to auth-expiry and popup integration checks

2. **Single release-readiness checklist per deliverable**
   - Avoid mixing setup docs with execution status

3. **Documentation freshness pass**
   - Remove legacy/packaging path drift in extension docs
   - Keep this matrix aligned with actual code and CI output

---

## Release Gates (Must Pass Before Ship)

#### Website Release Gate
- [x] All website rows required for release are ✅ in this matrix
- [x] `AppRouter` route audit complete (no dead links/placeholders)
- [x] Auth happy-path + failure-path smoke checks pass
- [x] Non-prod password gate verified + regression tested (homepage + non-home protected in non-production)
- [ ] Notifications and wishlist CRUD core flows manually verified
- [x] Build/check commands pass for web workspace (`npm run lint`, `npm run check`, `npm run test`)
- [ ] Persona outcome coverage reviewed against `docs/DESIGN_EXECUTION_MATRIX.md` (P0/P1 rows)
- [x] Design linkage validation passes (`npm run requirements:verify`) with 0 enforced design-link failures
- [ ] Production post-deploy validation workflow completed for current release candidate (`production-validation.yml`)
- [ ] Ad monetization KPI gate reviewed from `/api/analytics/ad-revenue-summary` (trailing 7 days)
- [ ] Viewable impressions >= 1,000 and viewability rate >= 60%
- [ ] Estimated ad revenue >= $5.00 and ad config/render errors are not increasing week-over-week

### Mobile Release Gate
- [ ] All mobile rows required for release are ✅ in this matrix
- [x] `flutter analyze` passes in `packages/mobile`
- [x] `npm run preflight:mobile` passes
- [x] Notification tap routing verified for direct, query-param, and path payloads
- [ ] Wishlist item add/edit/delete/purchase flows verified on device or emulator
- [ ] Platform release prerequisites confirmed (iOS/Android as applicable)
- [ ] Persona mapping includes Budget-Conscious Shopper and Occasion Coordinator flow evidence

### Browser Extension Release Gate
- [ ] All extension rows required for release are ✅ in this matrix
- [x] Extension production build/package generation succeeds
- [x] `npm run package:extension:release` succeeds
- [x] `npm run preflight:extension` passes
- [ ] Product extraction + quick-add validated on representative retailers
- [ ] Auth/refresh and add-item actions verified end-to-end
- [x] Store submission package/runbook matches current build output paths
- [ ] Persona mapping includes Social Gift-Giver (Flow 2) and TikTok Creator (Flow 5) evidence

### Waiver Rule
- Any non-✅ component shipped to production requires a written waiver in PR/release notes with:
   - risk statement,
   - owner,
   - remediation deadline.

---

## Weekly Operating Cadence

- Monday: update statuses + blockers
- During implementation: update component row when scope changes
- Before each release: Run all acceptance tests and verify analyzer/build passes

---

## Test Coverage Summary (Latest)

### Website Test Suite
- **AppRouter Tests**: 19 tests covering public routes, auth pages, protected access, layout context, routing errors, and non-production password-gate behavior (all passing)
- **AuthContext Tests**: 6 tests covering context initialization, state management, hook functionality (all passing)
- **Dashboard Tests**: 10 tests covering dashboard rendering, loading/error/empty states, and key interactions (all passing)
- **Additional Web Tests**: Notifications, wishlist card/item, and wishlist detail behavior (all passing)
- **Price Tracking Tests**: 3 tests covering loading, empty, and populated price signal states (all passing)
- **Total Website Tests**: 159 passing, 1 skipped

### Mobile Test Suite
- **Notification Parser Tests**: 5 tests covering direct metadata extraction, query-parameter parsing, path-based fallback, null handling (all passing)
- **Dialog & Validation Tests**: 13 tests covering URL validation/normalization, title validation, price validation, notification payload deserialization, deep-link routing logic (all passing)
- **Widget Tests**: 1 smoke test for custom app bar
- **Total Mobile Tests**: 18+ passing

### Browser Extension Test Coverage
- Automated unit/smoke tests: 10 passing (`src/enhanced-product-extractor.spec.js`, `src/quick-add.spec.js`, `src/popup-auth.spec.js`, `src/popup-integration.spec.js`)
- Manual extraction validation on 17+ retailers (current best practice)

### How to Run Tests

**Website:**
```bash
cd packages/web
npm test  # All tests
npx vitest run client-src/test/AppRouter.test.tsx  # Route tests
npx vitest run client-src/test/AuthContext.test.tsx  # Auth tests
```

**Mobile:**
```bash
cd packages/mobile
flutter test  # All tests
flutter test test/notification_deeplink_parser_test.dart  # Parser tests
flutter test test/dialog_and_notification_validation_test.dart  # Validation tests
```

**Browser Extension:**
```bash
cd packages/browser-extension
npm run test -- --run
```
- Before release: verify all rows on that deliverable are ✅ or explicitly waived
- After release: capture regressions and reopen impacted components

---

## Ownership (fill in)

| Deliverable | Owner | Backup | Last Reviewed |
|---|---|---|---|
| Website | Mark Nelson | Web Engineering Lead | 2026-05-06 |
| Mobile apps | Mark Nelson | Mobile Engineering Lead | 2026-05-06 |
| Browser extension | Mark Nelson | Extension Engineering Lead | 2026-05-06 |
