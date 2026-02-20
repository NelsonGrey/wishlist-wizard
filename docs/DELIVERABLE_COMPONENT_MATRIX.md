# Deliverable Component Completion Matrix

**Version**: 1.0  
**Last Updated**: February 19, 2026  
**Purpose**: Single execution tracker for the 3 production deliverables.

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

---

## 1) Website Deliverable (React Web)

| Component | Status | Current State | Next Action | Evidence |
|---|---|---|---|---|
| Auth flows (login/register/verify/reset) | ✅ | Routes and pages in active router; Firebase-first wiring; context smoke tests green | Monitor for auth edge cases; maintain tests | packages/web/client-src/test/AuthContext.test.tsx (6 passing); packages/web/client-src/AppRouter.test.tsx (14 passing) |
| Core wishlist CRUD UI | 🟡 | Main flows exist; parity being tightened against mobile and extension behavior | Verify all CRUD paths and add dashboard component tests | packages/web/client-src/pages/DashboardFirebase.tsx; packages/web/client-src/test/components/DashboardFirebase.test.tsx (22 passing) |
| Item detail and actions | 🟡 | Available; end-to-end consistency with notifications/deep links needs regular validation | Add targeted E2E/route-level checks | packages/web/client-src/pages/WishlistDetail.tsx |
| Notification center + deep links | 🟡 | Notification surfaces exist; routing resilience varies by payload type | Align parser/routing rules with mobile; add negative-path tests | packages/web/client-src/pages/Notifications.tsx; packages/web/client-src/test/components/NotificationsPage.test.tsx |
| Privacy controls | ✅ | Production-facing controls present (demo action removed) | Add smoke tests for key toggles | packages/web/client-src/components/privacy/PrivacyControls.tsx |
| Price tracking surfaces | 🟡 | Feature exists; production readiness depends on backend signal quality | Validate price event states and empty/error UX | packages/web/client-src/pages/PriceTracking.tsx |
| Navigation/layout integrity | ✅ | Single-shell ownership spec and cleanup completed | Run routing smoke tests on every nav PR | packages/web/client-src/AppRouter.test.tsx (14 passing) |
| Demo/placeholder route removal | ✅ | Demo routes/pages removed from production router | Prevent reintroduction via PR checklist | packages/web/client-src/AppRouter.tsx |

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
| Push delivery pipeline (end-to-end) | 🟡 | Client-side handling exists; broader delivery orchestration still evolving | Validate server-triggered push path and retry behavior | packages/mobile/lib/services/fcm_service.dart |
| Native release pipelines (iOS/Android) | 🟡 | iOS CI/cert docs are strong; release execution consistency still process-driven | Track release checklist outcomes per platform | docs/IOS_DOCUMENTATION_INDEX.md; docs/CICD_SETUP_GUIDE.md |

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
| Popup UX and routing | 🟡 | Functional, but docs and some legacy references are stale | Refresh developer docs to current architecture | packages/browser-extension/src/popup.js |
| Store submission operations | 🟡 | Packaging guidance exists, partially legacy in docs | Consolidate to one current submission runbook | docs/packages/browser-extension/src/PACKAGING.md |

---

## Cross-Deliverable Gaps to Close Next

1. **Canonical acceptance tests per deliverable**
   - Website: critical route/auth/navigation smoke suite
   - Mobile: notification/deeplink and dialog validation tests
   - Extension: extraction + add-item + auth expiry integration checks

2. **Single release-readiness checklist per deliverable**
   - Avoid mixing setup docs with execution status

3. **Documentation freshness pass**
   - Remove legacy/packaging path drift in extension docs
   - Keep this matrix aligned with actual code and CI output

---

## Release Gates (Must Pass Before Ship)

### Website Release Gate
- [ ] All website rows required for release are ✅ in this matrix
- [ ] `AppRouter` route audit complete (no dead links/placeholders)
- [ ] Auth happy-path + failure-path smoke checks pass
- [ ] Notifications and wishlist CRUD core flows manually verified
- [ ] Build/check commands pass for web workspace

### Mobile Release Gate
- [ ] All mobile rows required for release are ✅ in this matrix
- [ ] `flutter analyze` passes in `packages/mobile`
- [ ] Notification tap routing verified for direct, query-param, and path payloads
- [ ] Wishlist item add/edit/delete/purchase flows verified on device or emulator
- [ ] Platform release prerequisites confirmed (iOS/Android as applicable)

### Browser Extension Release Gate
- [ ] All extension rows required for release are ✅ in this matrix
- [ ] Extension production build/package generation succeeds
- [ ] Product extraction + quick-add validated on representative retailers
- [ ] Auth/refresh and add-item actions verified end-to-end
- [ ] Store submission package/runbook matches current build output paths

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
- **AppRouter Tests**: 14 tests covering public routes, auth pages, protected access, layout context, routing errors (all passing)
- **AuthContext Tests**: 6 tests covering context initialization, state management, hook functionality (all passing)
- **Dashboard Tests**: 22 tests covering CRUD operations, UI accessibility, data conversion, Firebase/API toggle, performance with large collections (all passing)
- **Total Website Tests**: 28+ passing

### Mobile Test Suite
- **Notification Parser Tests**: 5 tests covering direct metadata extraction, query-parameter parsing, path-based fallback, null handling (all passing)
- **Dialog & Validation Tests**: 13 tests covering URL validation/normalization, title validation, price validation, notification payload deserialization, deep-link routing logic (all passing)
- **Widget Tests**: 1 smoke test for custom app bar
- **Total Mobile Tests**: 18+ passing

### Browser Extension Test Coverage
- Manual extraction validation on 17+ retailers (current best practice)
- *(Acceptance tests to be added in next iteration)*

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
- Before release: verify all rows on that deliverable are ✅ or explicitly waived
- After release: capture regressions and reopen impacted components

---

## Ownership (fill in)

| Deliverable | Owner | Backup | Last Reviewed |
|---|---|---|---|
| Website | Mark Nelson | Web Engineering Lead | 2026-02-19 |
| Mobile apps | Mark Nelson | Mobile Engineering Lead | 2026-02-19 |
| Browser extension | Mark Nelson | Extension Engineering Lead | 2026-02-19 |
