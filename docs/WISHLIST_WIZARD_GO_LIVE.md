# Wishlist Wizard — Go Live Document

> **Version:** 1.2  
> **Last Updated:** 2026-07-16  
> **Repo:** https://github.com/mnelson3/wishlist-wizard (default branch: `develop`)  
> **Production URL:** https://wishlist-wizard.web.app  
> **Staging URL:** https://wishlist-wizard-staging.web.app  

---

## How to Use This Document

Work through each section top-to-bottom. Check off items as they are completed. Items marked **[BLOCKER]** must be resolved before proceeding to the Deployment section. Items marked **[WARN]** are important but non-blocking if a documented exception exists.

Owner columns should be filled in with initials or role before launch begins.

---

## Platform Components Summary

| Component | Technology | Deploy Target |
|---|---|---|
| Web App | React 19 + Vite + TypeScript | Firebase Hosting |
| API / Backend | Firebase Functions v2 (Node 22) | Firebase Functions |
| Database | Firestore + Firestore indexes | Firebase Firestore |
| Mobile (iOS) | Flutter 3.8+ | TestFlight → App Store |
| Mobile (Android) | Flutter 3.8+ | Play Store internal → production |
| Browser Extension | TypeScript / Chrome Extension MV3 | Chrome Web Store (manual) |
| Automation | Shell scripts + GitHub Actions | Self-hosted runners |

---

## Current Deliverable Status (as of 2026-07-16)

A 2026-07-16 audit found this document's — and `docs/PRODUCT_DESIGN.md`'s — prior status claims materially overstated in places, including a launch-blocking bug neither document knew about (§1.7). A same-day recovery pass fixed most of what was found. Table below reflects verified code state; see `docs/PRODUCT_DESIGN.md` for full per-feature detail and evidence.

| Deliverable | State | Notes |
|---|---|---|
| **Web app** | 🟢 Core loop live and App Check-verified in dev | Production gate bug (§1.7) fixed — `/app/*` and `/shared/:shareId` now render in prod, matching dev/staging. **2026-07-18 (§1.15/§1.16): `createWishlist` was found broken in `wishlist-wizard-dev`/`wishlist-wizard-staging`** (Firebase App Check unconditionally enforced server-side, no client-side App Check SDK anywhere) **and then fixed** — the user set up App Check (reCAPTCHA v3 web, DeviceCheck/App Attest iOS) and provided the site key; the client SDK is now wired for both platforms, verified live: real E2E test passes went from 14 to 25 against the real `wishlist-wizard-dev` project. Staging/production still need App Check configured and re-verified there (staging confirmed broken as of this writing; prod not tested, still behind a "Coming Soon" gate). Two other real bugs found and fixed the same day: a shared-wishlist privacy check that always evaluated visitors as anonymous, and a registration form that rejected leaving its "(optional)" display name blank. Add item (incl. paste-a-link auto-fetch) and share were code-reviewed clean. |
| **Browser extension** | 🟡 Core "killer app" flow now genuinely real and covered by automated tests, two features still stubbed | The floating-button add-to-wishlist flow — the intended flagship feature — was found completely non-functional (silent no-op) and fixed 2026-07-18, along with two more severe pre-existing bugs: a minified-identifier collision that broke content.js on every retailer, not just new ones, and a missing `await` that meant the enhanced/JSON-LD extractor was never actually reachable at all (see §1.12, §1.13). One-click add now works end-to-end via real Cloud Functions on any website, verified live **and** via a committed Playwright E2E suite (`packages/browser-extension/e2e/`, wired into CI). Unit test suite grew from 40 → 52 tests covering the new code; the CI test-gate itself was also fixed (it previously couldn't fail the build). Coupon finder and price comparison call backend endpoints that don't exist — deferred to Phase 2 (§ Part 5), not launch-blocking since they fail silently rather than crash. The auth bridge (reuse the web app's login instead of a separate one) was **verified 2026-07-18 in a real Chrome instance against a live Firebase Auth emulator**: sign-in propagates to the extension (confirmed via direct `chrome.storage.local` inspection, not just UI), and sign-out now propagates immediately too (a gap found during verification and fixed the same session — see §1.11), without clobbering an independently-logged-in extension session that was never bridged. |
| **Mobile (iOS/Android, Flutter)** | 🟡 Thin but real | Push notifications, Firestore offline caching, and wishlist sharing are now actually wired up (were previously dead code). Still missing: Shared-with-Me, Creator Mode, and all native platform features (Siri Shortcuts, App Clips, iCloud, widgets) — these were never built, not regressions. |
| **Backend (Firebase Functions + Firestore)** | 🟢 Live, confirmed | Root `server/`/`client/` (old Express+Postgres) are dead — do not resurrect or reference them. Affiliate tracking and calendar OAuth sync are solid. Personal price-drop alerts are coded but not exported from the Functions deploy entrypoint, so they don't run in production (comparison-shopping, a related but different feature, is live). |

**Important:** Part 2.3's automated code-quality gates (npm audit, lint, secret scan, functions smoke tests, e2e tests, `go-live-gate.sh`) have **not** been re-run end-to-end since 2026-06-26. This pass verified unit/component test suites (web 182 passing, shared 106, extension 40, mobile 40) and TypeScript compilation across all packages — that is necessary but not sufficient for a go-live decision. Re-run Part 2.3 in full before relying on this document to green-light a launch.

---

## Part 1 — Critical Issues to Resolve First

These issues were identified during repository analysis. They must be addressed before running the go-live gate or deploying to production.

### 1.1 SPA Routing Bug in `firebase.prod.json` [RESOLVED]

All `"redirects"` entries removed. `firebase.prod.json` now has 0 redirects and 2 rewrites: `/api/**` → Cloud Function, and the SPA catch-all `**` → `/index.html`. React Router receives the correct path on direct navigation.

- [x] **Fix SPA redirect/rewrite configuration in firebase.prod.json** — Completed 2026-06-24

---

### 1.2 Production Branch Strategy [RESOLVED]

Promotion path: `develop` → `main` → production. `.github/workflows/firebase-hosting-merge.yml` triggers on push to `main`, builds the web app with `VITE_FIREBASE_*_PRODUCTION` secrets, and deploys only Firebase Hosting to `wishlist-wizard-prod`. `.github/workflows/firebase-hosting-dev.yml` triggers on push to `develop` and deploys to `wishlist-wizard-dev`.

- [x] **Document and implement branch promotion strategy (develop → main)** — Completed 2026-06-24
- [x] **Re-enable or replace firebase-hosting-merge.yml for production** — Completed 2026-06-24

---

### 1.3 Open Issues Triage [BLOCKER]

**Problem:** The repository has 44 open GitHub issues. Before launch, each issue must be classified as: (a) pre-launch blocker, (b) known acceptable debt, or (c) closed/invalid.

- [ ] **Triage all 44 open issues and assign milestone: pre-launch, post-launch, or close** — Owner: _______ — Due: _______
- [ ] **Resolve all issues marked pre-launch blocker** — Owner: _______ — Due: _______

---

### 1.4 Empty Stub Files [RESOLVED]

`mock-api-server.js` and `test-server.js` deleted from the repo.

- [x] **Remove or implement mock-api-server.js and test-server.js** — Completed 2026-06-24

---

### 1.5 App Bundle ID Branding [RESOLVED]

Bundle IDs updated to brand-aligned identifiers:
- iOS: `com.wishlistwizard.app.ios`
- Android: `com.wishlistwizard.app.android`

These do not contain any personal account name and are ready for App Store / Play Store submission.

- [x] **Bundle IDs updated to com.wishlistwizard.app.{ios,android}** — Completed 2026-06-24

---

### 1.6 Repository Hygiene [RESOLVED]

`health-status.json` and `test-ci-cd-pipeline.txt` removed from git tracking and added to `.gitignore`.

- [x] **Add health-status.json and test-ci-cd-pipeline.txt to .gitignore and remove from tracking** — Completed 2026-06-24

---

### 1.7 Accidental Production Gate [RESOLVED — 2026-07-16]

**Problem found:** The entire authenticated web app (`/app/*`, login, etc.) and shared-wishlist links (`/shared/:shareId`) were silently redirected to the homepage in production by an `isProductionEnvironment` conditional in `packages/web/client-src/AppRouter.tsx`. Traced to commit `91c1ab4` (2026-05-06), authored under a **different repository's** CI bot identity (`Vehicle Vitals CI`) — the signature of cross-project automation contamination, not a deliberate feature flag. This document's own §3.4 post-deploy smoke test ("navigate to `/dashboard`... renders correctly, not redirected to home") implies whoever authored this checklist didn't know the gate existed — it had been live in production for over two months undetected.

**Also found while investigating:** the 404 catch-all route was positioned *before* the five `/admin/*` routes inside the same router `<Switch>`. Wouter's path-less `<Route>` always matches, so the entire super-admin section (`AdminDashboard`, `UserManagement`, `SupportTickets`, `AuditLog`) was unreachable, silently shadowed by the 404 page.

- [x] **Remove `isProductionEnvironment` gating from AppRouter.tsx** — Completed 2026-07-16
- [x] **Fix 404-route-before-admin-routes ordering bug in the same file** — Completed 2026-07-16
- [ ] **Confirm via an actual production deploy that `/app/*`, `/shared/:shareId`, and `/admin/*` all render correctly (not just via the local test suite)** — Owner: _______

---

### 1.8 Dead/Duplicate Code Cleanup [RESOLVED — 2026-07-16]

A 2026-07-16 audit found three confirmed-unreachable code paths, each superseded by a real implementation elsewhere; all three were removed in the same pass:
- `packages/web/client-src/pages/DashboardFirebase.tsx` — dev-only demo dashboard duplicate of `Dashboard.tsx` (plus its route and test)
- `chrome-extension-package/` (repo root) — stale, gitignored build residue from Feb 2026, unrelated to the live `packages/browser-extension/`
- `packages/mobile/lib/screens/wishlist_detail_screen.dart` — orphaned pre-Firebase-migration screen, unreachable from `main.dart`'s navigation

- [x] **Delete confirmed-dead code identified in the 2026-07-16 audit** — Completed 2026-07-16

---

### 1.9 Historical Secret in Git History [CLOSED — 2026-07-16, no live credential involved]

A `gitleaks` scan (run as part of §2.3 for the first time since 2026-06-24) found a `GITHUB_TOKEN`/`GITHUB_PASSWORD` pair in `.act-secrets/secrets`, committed in two commits from 2025-11-14 and 2025-11-16.

**Scope found:** `main` (production) is **not** affected — the commits aren't reachable from it. They are reachable from `origin/demo` and `origin/backup/staging-before-develop-sync-20260717`, both already on GitHub. A prior scrub attempt appears to have happened around 2026-06-12 (see local branch `backup/pre-history-rewrite-20260612-091735`), which didn't end up covering these two commits.

**Resolution (2026-07-16):** `.act-secrets/secrets` only ever fed local `act` (GitHub Actions emulator) runs via `--secret-file .act-secrets/secrets` (see `scripts/test-cicd-local.sh`, `scripts/test-act.sh`, `docs/ACT_TESTING_GUIDE.md`) — it was never read by any GitHub-hosted workflow or production code. The file doesn't exist on disk today (confirmed 2026-07-16; current `.act-secrets/` holds a different, unrelated set of `.env.automation.*` files). Owner confirmed no wishlist-wizard token corresponding to this leak currently exists. **No live credential is exposed; closed without a history rewrite.**

- [x] **Confirm no live credential corresponds to the historical `.act-secrets/secrets` leak** — Completed 2026-07-16
- [x] **Decision made not to rewrite git history for this** — Completed 2026-07-16 — revisit only if the repo is ever made public, since the (now-confirmed-inert) exposure remains on `demo`/backup branches indefinitely otherwise

---

### 1.10 PR Backlog & CI Housekeeping [RESOLVED — 2026-07-16]

**PR backlog:** 25 open PRs, all Dependabot dependency bumps (no pending human-authored PRs). Triaged and resolved:
- 6 targeted `packages/functions/*` and no longer apply now that `packages/functions` has been extracted to the private companion repo (no `package.json` here for Dependabot/npm to act on) — closed with an explanation (#91, #98, #100, #107, #109, #110).
- 17 were major-version bumps on packages still in this repo (Tailwind 3→4, Vite 7→8 ×2, ESLint 8→10 ×3, TypeScript 5.9→7.0 ×3, Stripe SDKs, framer-motion, recharts, react-resizable-panels, lucide-react, @types/node ×2, @types/chrome, actions/setup-node) — closed rather than merged untested; revisit as a deliberate, tested dependency-upgrade pass, not piecemeal (#82, #87, #90, #101, #102, #104, #105, #106, #108, #111, #115, #116, #117, #118, #119, #120, #122).
- 2 were low-risk minor/patch bumps (`three` 0.183→0.185, `firebase_data_connect` 0.2.4→0.3.0+7) — verified CI-clean and merged (#92, #121).
- **Follow-up not yet done:** update `.github/dependabot.yml` to stop watching `packages/functions/` in this repo, so the same 6 stale PRs don't reappear on the next Dependabot run — Owner: _______

**CI workflow audit:** 11 active `.yml` workflows found (not the 14 the directory listing initially suggested — that count included an empty `archive/` folder and a `test-events/` fixture folder, neither of which are real workflows). Of the 11: 4 are `workflow_call`-only reusable building blocks (`extension-build.yml`, `firebase-deploy-local.yml`, `ios-mobile-release.yml`, `production-validation.yml`) invoked by the others, not duplicates; the remaining 7 (CodeQL, e2e-tests, firebase-hosting-dev, firebase-hosting-merge, master-pipeline, release-readiness-gate, secret-scan) each have a distinct trigger and purpose. **Verdict: not actually bloated.** Removed the genuine clutter: the empty `archive/` folder, the `test-events/` fixture folder, and the already-inert `firebase-hosting-pull-request.yml.disabled`.

**Real bug found in the process:** `secret-scan.yml`'s Gitleaks step (`gitleaks/gitleaks-action@v2`) fails on every run with "missing gitleaks license" — that action now requires a paid `GITLEAKS_LICENSE` secret for organization-owned repos, which broke the moment this repo moved under the `NelsonGrey` org. It was not a required/blocking status check on `develop` (no branch protection references it), so it hasn't silently blocked merges, but it would show a red X on every future PR. Fixed by replacing the action with a direct install-and-run of the open-source `gitleaks` CLI binary (same tool, no license needed) — verified equivalent locally in §1.9's investigation.

**Update 2026-07-18: that fix was itself silently incomplete.** Noticed while sanity-checking CI health before starting a web app audit — the "Secret Scan" check had been failing on *every single push since the fix above*, now reporting 63 leaks instead of the expected 1. Reproducing the exact CI binary (gitleaks `v8.21.2`, pinned in the workflow) locally confirmed why: v8.21.2 does not correctly apply this repo's top-level `[[allowlists]]` block in `.gitleaks.toml`, so all ~65 instances of Firebase's public client API keys across git history (safe to expose by design — Google's own stance, security comes from Firestore rules, not key secrecy) were reported as leaks, alongside a few `Podfile.lock` checksum false positives. Confirmed locally that `v8.29.1` applies the identical config correctly (66 findings → 1, the one already-known historical JWT test fixture from §1.9). Fixed by bumping the pinned version to `v8.29.1` and adding a `.gitleaksignore` entry (gitleaks' purpose-built baseline mechanism) for that one remaining, already-assessed-safe finding by fingerprint. Verified locally: `gitleaks detect --source . --config .gitleaks.toml --redact --exit-code 1` → "no leaks found", exit code 0. **Same bug pattern as everywhere else this session: a fix that was correct in isolation but silently non-functional in the actual running environment, here because of an untested version pin rather than a missing `await`.**

- [x] **Triage and resolve 25 open Dependabot PRs** — Completed 2026-07-16
- [x] **Remove CI workflow clutter (archive/, test-events/, .disabled file)** — Completed 2026-07-16
- [x] **Fix broken Gitleaks CI check (org license requirement)** — Completed 2026-07-16
- [x] **Fix Gitleaks CI check silently failing again due to a version-dependent allowlist bug** — Completed 2026-07-18
- [ ] **Update dependabot.yml to exclude packages/functions/** — Owner: _______

---

### 1.11 Extension Auth Bridge — Verified Live, Sign-Out Gap Found and Fixed [RESOLVED — 2026-07-18]

The auth bridge built in the 2026-07-16 recovery pass (§1.7-era work) had never been run in an actual browser — only typechecked and unit-tested. Verified 2026-07-18 by loading the real unpacked extension in Chrome via Playwright (`--load-extension`), running the web app against a live Firebase Auth emulator with a throwaway test user, and reading the extension's actual `chrome.storage.local` state directly rather than trusting the UI alone.

**Sign-in path: confirmed working exactly as designed.** Real sign-in on the web app → `AuthContext.tsx` broadcasts the ID token → `web-auth-bridge.js` relays it → `background.js` stores it. Extension popup correctly skipped its login screen and showed "Signed in as [email]" — verified by reading storage directly (`hasAuthToken: true`, `userData.email` matching the signed-in account exactly).

**Sign-out path: found broken, then fixed.** A real sign-out on the web app did **not** propagate — the extension kept showing "Signed in as..." with the stale token still in storage. Root cause: `broadcastAuthTokenToExtension` in `AuthContext.tsx` only ran when there was a current user; on sign-out it silently no-op'd, so the extension had no way to know the session ended (it would have eventually self-corrected once the bridged token's ~55-minute window elapsed and its refresh attempt failed, since a bridged session never gets a `refreshToken` — but that's a delayed correction, not the immediate fallback expected).

**Fix:** `AuthContext.tsx` now broadcasts an explicit `ww:auth-bridge-signout` event when `onAuthStateChange` transitions from a signed-in user to none — but only if *this tab* had actually broadcast a signed-in session before, so a logged-out visit to a public page doesn't clobber an unrelated, independently-logged-in extension session that was never bridged from that tab. `web-auth-bridge.js` relays it as a `WEB_AUTH_BRIDGE_SIGNOUT` message; `background.js` clears auth state on receipt via the existing `clearAuthState()`. Re-verified after the fix: sign-out now propagates immediately, and a separate test confirmed the "don't clobber an independent session" guard works as intended.

- [x] **Verify auth bridge sign-in path in a real browser** — Completed 2026-07-18
- [x] **Find and fix immediate sign-out propagation gap** — Completed 2026-07-18
- [x] **Confirm no regression to independently-logged-in (non-bridged) extension sessions** — Completed 2026-07-18

---

### 1.12 Browser Extension: The Flagship "Add While Browsing" Flow Was Fully Broken [RESOLVED — 2026-07-18]

The product owner identified the floating in-page button — click it while looking at a product, add to a wishlist — as the intended flagship feature. A focused audit found it was completely non-functional: it showed a fake-looking success checkmark, but the message it sent (`action: 'openPopup'`) had no listener anywhere in `background.js`, so nothing was ever saved.

**A second, more severe bug was found while fixing the first.** Rebuilding and live-testing on a non-whitelisted domain revealed `content.js` failed to execute at all, with a `SyntaxError: Identifier 'g' has already been declared`. Root cause: `content.js` and `enhanced-product-extractor.js` are injected together into one shared, non-module execution context per `manifest.json`, but each is bundled independently by Vite/Rollup — their minifiers renamed unrelated top-level symbols to the same single-letter name with no knowledge of each other. **This means the floating button has likely never reliably worked on the original 17 retailer domains either** (Amazon, Target, Walmart, etc.), not just on newly-covered sites — it depended on minification luck across builds. Fixed by wrapping just those two entries' build output in an IIFE (`packages/browser-extension/vite.config.ts`, via `output.banner`/`footer`) so their top-level declarations can never collide, without switching the whole build to `format: 'iife'` (which Rollup rejects here due to the popup-html entry triggering code-splitting).

**Fixes shipped in this pass** (see `docs/PRODUCT_DESIGN.md` Feature 4 for the user-facing description):
- Wired `background.js`'s missing `openPopup` handler: stashes the already-extracted product in `chrome.storage.session` and calls `chrome.action.openPopup()` (Chrome/Edge; no scriptable equivalent on Firefox, so the button there still falls back to a manual toolbar-icon open with the same stashed data waiting).
- `popup.js` now has a fast path that reads that stashed data and pre-fills the product screen instantly, skipping the multi-second ping/retry detection chain, when opened via the button.
- Broadened content-script/host coverage from 17 hardcoded domains to all http(s) sites (`<all_urls>`), in `scripts/build-manifests.mjs` and `public/manifest.json`.
- Added real JSON-LD `Product` schema field extraction (title/price/image) as the first generic-extraction strategy, ahead of CSS-selector/heuristic guessing — previously JSON-LD was only used to *detect* a product page, never to read its actual data.
- Removed two broken/dead legacy code paths found in the same audit: an "Enable One-Click Add" feature that posted to a non-existent unauthenticated endpoint, and an entirely orphaned `QuickAdd` class that loaded into every popup session (via `popup-bootstrap.js`) but whose only real method was never called by anything.
- Fixed the IIFE/minification collision above.

**Verified live** (Playwright + `--load-extension`, real Chrome, real click, no mocking of the extension's own code): floating button appears on a non-17-domain test page; clicking it correctly extracts the JSON-LD title/price and stashes it in `chrome.storage.session` (confirmed via direct inspection from the service worker, not just UI); the popup's fast path correctly reads it, skips the login screen when authenticated, skips the detection screen, and lands on a ready-to-use Add to Wishlist UI showing the exact extracted title and price. `chrome.action.openPopup()`'s automatic trigger itself did not fire in this specific automated-browser test context (a known Chrome API restriction around gesture-context propagation in some environments) — the manual-open fallback path was verified instead, which exercises the identical data handoff.

- [x] **Fix non-functional floating button (missing openPopup listener)** — Completed 2026-07-18
- [x] **Find and fix content-script minification collision (real pre-existing bug, not new)** — Completed 2026-07-18
- [x] **Broaden site coverage to all websites** — Completed 2026-07-18
- [x] **Add real JSON-LD product data extraction** — Completed 2026-07-18
- [x] **Remove two broken/dead legacy quick-add code paths** — Completed 2026-07-18
- [x] **Verify the full flow live in a real browser** — Completed 2026-07-18
- [ ] **Confirm `chrome.action.openPopup()` auto-opens in a real (non-automated) Chrome/Edge browser session** — Owner: _______ (the data-handoff mechanism it depends on is fully verified; only the automatic popup trigger itself is unconfirmed outside this test harness)

---

### 1.13 Browser Extension: Closed Automated Testing Gaps, Found a Third Real Bug [RESOLVED — 2026-07-18]

Asked directly "do we have automated unit testing and automated UAT for this deliverable," the honest answer was: partial unit coverage that didn't reach most of §1.12's new code, and **no automated E2E/UAT at all** — the live verification in §1.12 was a set of one-off scripts written, run, and deleted, not persisted anywhere. Also found in the process: `.github/workflows/extension-build.yml`'s "Run tests" step was `npm run test || echo "Tests not configured yet"` — the `|| echo` meant this step could never fail the build regardless of whether tests actually passed.

**A third real bug was found while adding unit tests for the click handler.** `content.js`'s `extractProductInfo()` called `extractor.extract()` — an `async` method — without `await`, so `result` was always an unresolved Promise, `result.success` was always `undefined`, and the function **always** silently fell through to the older legacy CSS-selector/heuristic extraction, regardless of the enhanced extractor's outcome. This means the JSON-LD extraction added in §1.12, and the existing Amazon/Target/Walmart adapters, were **unreachable in the real running extension** the whole time — confirmed by console output ("Enhanced extractor failed... `undefined`") appearing in §1.12's own live verification, which had gone unnoticed because the legacy fallback happened to extract correct data from the visible DOM elements in that test's fixture anyway. Fixed by making `extractProductInfo()` properly `async`/`await`, converting its two message-handler call sites to async IIFEs (Chrome's `sendResponse`/`return true` pattern still applies), and switching the floating button's pre-extraction to a non-blocking background fetch (so button appearance isn't delayed) with the click handler awaiting a fresh extraction only if that hasn't resolved yet. Re-verified live: `imageUrl` and `availability` are now correctly populated from JSON-LD (previously `imageUrl` was empty and `availability` was absent) — direct evidence the enhanced extractor is now genuinely exercised.

**Unit tests added** (`background.spec.js`, `content.spec.js`, `popup-integration.spec.js`, `enhanced-product-extractor.spec.js`): the `openPopup` message handler (stash + `chrome.action.openPopup()` call, including when unsupported or rejecting), the auth bridge sign-in/sign-out messages (previously untested), the popup's `chrome.storage.session` fast path vs. the normal detection fallback, and the floating button's actual DOM injection + click → `sendMessage({action:'openPopup', ...})` behavior. Total suite: 40 → 52 tests.

**A real, committed Playwright E2E suite was added** (`packages/browser-extension/e2e/`, run via `npm run test:e2e`): loads the real built extension in an actual Chrome instance (`chromium.launchPersistentContext` + `--load-extension`, per `e2e/fixtures.ts`), serves a fixture product page via request interception (no external site or subprocess server needed), and verifies: the floating button appears on a non-whitelisted domain, clicking it stashes the correct JSON-LD-extracted title/price/image, the popup's fast path skips the login and detection screens and shows the pre-filled product, and a non-product page gets no button. Wired into `extension-build.yml` under `xvfb-run` (GitHub's runners have no display, and extension loading needs a non-headless Chromium). The CI "Run tests" step's `|| echo` fallback was also removed — a real test failure now fails the build.

- [x] **Fix broken CI test gate (`|| echo "Tests not configured yet"`)** — Completed 2026-07-18
- [x] **Add unit tests for the openPopup handler, fast path, and button click** — Completed 2026-07-18
- [x] **Find and fix the real bug: extractProductInfo() never awaited the async extractor** — Completed 2026-07-18
- [x] **Add a committed, CI-wired Playwright E2E suite for the extension** — Completed 2026-07-18

---

### 1.14 Mobile App: Same Rigor Pass — a Fourth Real Bug, Injectable Test Doubles, CI Gap [RESOLVED — 2026-07-18]

With the browser extension's core flow fixed and tested, applied the same audit-then-verify-then-close-gaps pass to the mobile app, per the pattern established in §1.12/§1.13 (this is the same class of bug this whole session kept finding: code that looks correctly wired but is silently non-functional).

**A fourth real bug, same family as the extension's:** `FirebaseWishlistProvider.createWishlist()` in `packages/mobile/lib/providers/firebase_wishlist_provider.dart` called `FirebaseWishlist.fromFirestore('', result)` — passing an empty string as the `docId` argument instead of the real id the Cloud Function returned. `fromFirestore`'s `docId` parameter always wins over any `id` key inside `data` (`lib/models/firebase_models.dart`), so `createdWishlist.id` was **always empty**, and the subsequent `if (createdWishlist.id.isNotEmpty)` check **always failed** — meaning `createWishlist()` reported failure and showed a full error screen to the user on every single call, even though `packages/functions/src/api/wishlists.ts`'s `createWishlist` Cloud Function had genuinely created the wishlist and returned its real `id` (`Object.assign({ id: docRef.id }, wishlistData)`). Confirmed `updateWishlist`'s weaker `result.isNotEmpty` check doesn't have the same problem — the backend's `updateWishlist` function also always returns a real, non-empty `id`. Fixed by passing `(result['id'] as String?) ?? ''` as the `docId` argument.

**No mocking library existed for the mobile app before this** — `mocktail: ^1.0.4` added to `pubspec.yaml`'s dev dependencies. `FirebaseWishlistProvider`'s hardcoded `FirebaseFirestoreService()`/`FirebaseFunctionsService()` field initializers were refactored into constructor-injectable optional parameters (defaulting to real instances) so tests can substitute mocks without a live Firebase connection.

**9 new unit tests added** (`test/firebase_wishlist_provider_test.dart`, suite: 11 → 20 tests) covering `createWishlist` (including an explicit regression-guard test), `updateWishlist`, and `addWishlistItem`. **The regression-guard test was proven meaningful, not just present**: temporarily reverted the fix back to `FirebaseWishlist.fromFirestore('', result)`, re-ran the suite, confirmed the two `createWishlist` "success" tests failed exactly as expected (`Bad state: No element`), then restored the fix and reconfirmed all 20 tests pass.

**Live simulator verification was deliberately not performed** for this fix, unlike the extension's runtime/platform-specific bugs — this is a pure Dart data-mapping defect, and the revert-and-confirm-failure step above is stronger evidence than a single manual click-through would give. A full iOS simulator build cycle was judged not worth the added time for this specific bug; flagged here rather than silently skipped.

**CI gap found and fully closed (2026-07-18):** `integration_test/auth_smoke_test.dart`'s "Home screen (logged in)" test group (the only integration-level coverage of the create-wishlist/add-item flows) reads `TEST_EMAIL`/`TEST_PASSWORD` via `String.fromEnvironment(...)` and silently skips all 4 of its tests if either is empty. Three separate things were wrong, and all three are now fixed:

1. `flutter test integration_test/auth_smoke_test.dart` didn't forward `TEST_EMAIL`/`TEST_PASSWORD` as `--dart-define` flags even if they'd been set as secrets — fixed in `ios-mobile-release.yml`.
2. The `MOBILE_INTEGRATION_TEST_EMAIL`/`MOBILE_INTEGRATION_TEST_PASSWORD` GitHub secrets didn't exist, and no matching Firebase Auth user existed in `wishlist-wizard-dev` — the user created both directly (repo owner action, correctly not something to automate).
3. **The step containing all of this was unreachable anyway**: `master-pipeline.yml`'s `build-ios` job — the only caller of `ios-mobile-release.yml` — hardcoded `skip_tests: true`, which gates the exact step with the integration test. The separate `test` job (which does run unconditionally) only executes plain `flutter test` on `ubuntu-latest` with no simulator, which doesn't pick up `integration_test/` regardless. So the smoke test genuinely never ran in the real pipeline, independent of secrets. Fixed by setting `skip_tests: false` in `build-ios`'s call — the trade-off (a slower iOS build/release job, now including a simulator-based integration test) was confirmed with the user rather than assumed.

- [x] **Create a dedicated test account in `wishlist-wizard-dev` and the matching `MOBILE_INTEGRATION_TEST_EMAIL`/`MOBILE_INTEGRATION_TEST_PASSWORD` GitHub repo secrets** — Completed by repo owner, confirmed 2026-07-18
- [x] **Find and fix the real bug: `createWishlist()` always reported failure due to a discarded real id** — Completed 2026-07-18
- [x] **Add injectable test doubles + regression-proven unit tests for the provider's write paths** — Completed 2026-07-18
- [x] **Wire CI to forward `TEST_EMAIL`/`TEST_PASSWORD` to the integration test** — Completed 2026-07-18
- [x] **Fix `skip_tests: true` silently disabling the step that runs the integration test** — Completed 2026-07-18

Not yet covered by any automated test, assessed as lower risk and out of scope for this pass: FCM push notifications, offline behavior, and wishlist sharing — functionally plausible from code review but genuinely untested.

---

### 1.15 Web App: Same Rigor Pass — Two Real Bugs, a Pre-Launch App Check Blocker, and an E2E Suite That Had Never Really Passed [PARTIALLY RESOLVED — 2026-07-18]

Applied the same audit-then-verify pass to the web app (`packages/web`). This one surfaced the most significant pre-launch blocker found so far, though not an active incident — see below.

**Two real bugs found and fixed**, same "looks wired but isn't" family as everywhere else this session:
- `SharedWishlist.tsx`'s privacy check-access call used a raw `fetch('/api/privacy/check-access', ...)` instead of `apiRequest` — no Firebase ID token attached, no environment-aware URL resolution. A signed-in viewer with legitimate access to a non-public shared wishlist would always be evaluated as anonymous. Fixed by routing through `apiRequest` (matching every other call in the file).
- `useFCM.ts`'s `sendTestNotification` had the same raw-`fetch` bug against `/api/fcm/test-notification`, which routes to the `sendTestPushNotification` callable — a bare fetch can't reach a callable function at all. Fixed the same way.
- `Register.tsx`'s `displayName` field is labeled "(optional)" but its Zod schema was `z.string().min(2, ...).optional()` — a well-known Zod gotcha: `.optional()` only permits `undefined`, not `""`, and the form's default value is `""`. **Registration was rejecting every signup that left the display name blank.** Fixed with `.optional().or(z.literal(''))`. Confirmed live: real registration against `wishlist-wizard-dev` now succeeds with an empty display name.

**The local E2E suite (`packages/web/e2e/`) had never actually produced a real pass, for three independent, compounding reasons — all now fixed except the third:**
1. `packages/web/.env.local` (gitignored, personal) referenced a stale, nonexistent Firebase project (`wishlist-wizard`, plain unsuffixed var names) instead of `wishlist-wizard-dev`. The app correctly refuses to use unsuffixed plain vars without an explicit opt-in flag, so Firebase silently never initialized — every test that needed real auth was working against a completely non-functional client. Fixed by populating it with `wishlist-wizard-dev`'s real (public, safe-to-expose) web client config via `firebase apps:sdkconfig`.
2. Nearly every test in `tier-1-basic.spec.ts` opens with `if (await shouldBypassAuthGatedFlow()) return;` (or an equivalent early return) right after attempting sign-in. With (1) unfixed, every single one of those checks silently short-circuited — meaning the suite's prior "20/22 passed" results (this pass's own initial run included) were **almost entirely fake passes**, not verified behavior. Fixed by gating the whole file on one real up-front `ensureAuthenticated()` result in `beforeAll`, with `test.skip()` (visible, honest) instead of a silent per-test return when it fails. Also fixed a real flakiness bug in `ensureAuthenticated()` itself: its final "did we land on the dashboard" check was a one-shot `.isVisible()` sampled right after only a `domcontentloaded` wait, racing the real async chain (auth-state resolution → client-side `/dashboard` → `/app/dashboard` redirect → data fetch) — replaced with a proper polling `.waitFor({state:'visible', timeout})`. Also fixed a stale `h2:has-text("My Wishlists")` selector in `ensureWishlistExists` (the real element is an `h1` with `data-testid="dashboard-title"`) and bumped two other post-redirect assertions in `tier-1-basic.spec.ts` (T1.4, T1.6) from a too-tight 5s to 10s for the same redirect-race reason.
3. `tier-2-advanced.spec.ts`'s 19 tests were **structurally guaranteed to always skip** — its `beforeEach` checked for login state via a selector that never matches this app, with a comment hoping "the user is logged in from Tier 1 tests," which can't work regardless (each spec file gets its own isolated browser context; login never carries over). Fixed with a real `ensureAuthenticated()` bootstrap of its own. This surfaced two more real test-file bugs once it could actually run: a fixed-bottom cookie-consent banner (re-shown on every fresh `/` navigation) intercepting clicks for a full 30s before timing out, and 5 broken CSS locator strings (`'a[href*="x"], text="Y"'` — combining a CSS selector with a quoted `text=` engine selector in one comma-separated string doesn't parse). Both fixed.

**The still-open finding, now a confirmed pre-launch blocker rather than an active incident: Firebase App Check is unconditionally enforced on `createWishlist` (and likely other callable functions) in both `wishlist-wizard-dev` and `wishlist-wizard-staging`, and the web client never initializes App Check anywhere.** Confirmed independently in each project with a plain `curl` call — a real ID token, obtained directly from the Identity Toolkit REST API, with zero browser/Playwright/automation involved — against the deployed function, which returned the identical `403 Request failed App Check verification. Please ensure you are using the official app.` in both. This is not a bot-detection false positive; it's the same rejection any caller gets without a valid App Check token, including the real web app itself.

Production (`wishlist-wizard-prod`) was **not tested** — the user confirmed it's still gated behind a "Coming Soon" page (`VITE_SHOW_COMING_SOON_PRODUCTION`), so there are no real users there to be affected yet, and a live test was correctly blocked by the session's own safety guardrails as too risky to run unprompted against production. Given prod runs the same codebase and (presumably) the same function deploy as dev/staging, treat it as very likely affected too.

- [x] **Find and fix the real bug: `SharedWishlist.tsx` check-access call bypassing auth/URL resolution** — Completed 2026-07-18
- [x] **Find and fix the real bug: `useFCM.ts` test-notification call bypassing the callable-function route** — Completed 2026-07-18
- [x] **Find and fix the real bug: Register's "optional" display name field rejected being left blank** — Completed 2026-07-18
- [x] **Fix local dev Firebase config pointing at a nonexistent project** — Completed 2026-07-18
- [x] **Fix the silent-bypass-on-auth-failure pattern masking real failures as passes across `tier-1-basic.spec.ts`** — Completed 2026-07-18
- [x] **Fix `ensureAuthenticated()` race condition and a stale selector** — Completed 2026-07-18
- [x] **Fix `tier-2-advanced.spec.ts`'s structural always-skip bug, cookie-banner click interception, and 5 broken locator strings** — Completed 2026-07-18

Not yet investigated in this pass: whether the pattern found in `packages/web/lib/firestore.ts`/`firebase-service.ts` (a full real-time `onSnapshot` layer that nothing in the app actually imports — the live app uses react-query polling/manual invalidation instead) means any product documentation overstates real-time collaboration; worth a quick doc spot-check, not a code fix.

---

### 1.16 App Check Wired Client-Side for Web and iOS — the §1.15 Blocker Is Fixed [RESOLVED — 2026-07-18]

The user set up Firebase App Check in `wishlist-wizard-dev` (reCAPTCHA v3 for web, DeviceCheck/App Attest for iOS) and turned on enforcement, then provided the reCAPTCHA site key. Enforcement is on for Auth (`identitytoolkit`), Firestore, Storage, and ML — broader than just the one callable function found in §1.15.

**Web**: added `appCheckSiteKey`/`appCheckDebugToken` to `FirebaseConfig` and `initializeAppCheck()` (with `ReCaptchaV3Provider`) to the `FirebaseClient` constructor in `packages/firebase-utils/src/client.ts`, before Auth/Firestore/Functions/Storage are obtained (App Check must be set up before anything that needs a token). Wired the site key through `packages/web/client-src/lib/firebase.ts` via the same per-environment-suffixed env var convention as the rest of the Firebase config (`VITE_FIREBASE_APPCHECK_SITE_KEY_DEVELOPMENT`/`_STAGING`/`_PRODUCTION`), plus a dev-only `VITE_FIREBASE_APPCHECK_DEBUG_TOKEN` so local dev and E2E tests don't need to solve a real reCAPTCHA challenge. Registered a debug token via the App Check REST API (`POST .../debugTokens`) rather than the console, and populated `.env.local`.

**Verified live, not just by typecheck**: re-ran the full local E2E suite — `createWishlist` (and everything downstream of it) now succeeds against the real `wishlist-wizard-dev` project. Result went from 14 real passes (before this fix, tier-1's core write path was blocked) to 25 real passes, with the remaining handful of failures being pre-existing tier-2 test-content issues (stale routes/selectors — see §1.15 item 3) unrelated to App Check, plus one intermittent network-timing flake in the shared `ensureWishlistExists` helper not yet fully hardened.

**iOS**: added `firebase_app_check` to `pubspec.yaml` and `FirebaseAppCheck.instance.activate()` to `main.dart` (`AppleDebugProvider` in debug builds — simulators can't do real App Attest/DeviceCheck attestation — `AppleAppAttestWithDeviceCheckFallbackProvider` in release; `AndroidDebugProvider`/`AndroidPlayIntegrityProvider` similarly, though the user only confirmed enforcement is on for web/iOS so far, not Android). This required a `Podfile.lock` refresh (the new plugin needs Firebase iOS SDK 12.15.0; the lockfile was pinned to 12.12.0) and surfaced a second, unrelated real bug found via live simulator testing: **`Firebase.initializeApp()` crashed on launch with `[core/duplicate-app] A Firebase App named "[DEFAULT]" already exists`** — the native SDK's app registry doesn't reliably line up with Dart's `Firebase.apps` list, so checking `Firebase.apps.isEmpty` first didn't help. Fixed by catching the specific `duplicate-app` error code and treating it as already-initialized.

**Verified live on a real iOS 17 simulator**: confirmed the crash is gone and the app renders through to the login screen (screenshot-verified), confirmed the `AppleDebugProvider` generates a real debug token (captured via the device log, since iOS logs this natively rather than to the Dart console), and registered that token via the same App Check REST API approach used for web. Did not additionally drive a full simulator UI sign-in flow (would need XCUITest/Appium-level automation) — the App Check verification mechanism itself was already conclusively proven correct server-side via the web E2E results above, and iOS uses the identical backend enforcement.

- [x] **Wire up the App Check SDK client-side for web** — Completed 2026-07-18
- [x] **Wire up the App Check SDK client-side for iOS** — Completed 2026-07-18
- [x] **Find and fix the real bug: iOS `Firebase.initializeApp()` duplicate-app crash on launch** — Completed 2026-07-18
- [x] **Verify `createWishlist` succeeds end-to-end in `wishlist-wizard-dev`** — Completed 2026-07-18, verified via the full local E2E suite
- [ ] **Verify in staging and production once App Check is set up there too** — Owner: _______ (only `wishlist-wizard-dev` has App Check configured so far)
- [ ] **Confirm Android App Check enforcement status and test once enabled** — Owner: _______ (client SDK is wired defensively but the user only confirmed enforcement for web/iOS)
- [ ] **Harden the intermittent flake in `ensureWishlistExists`'s post-create wishlist-card check** — Owner: _______ (low priority; network-timing related, not a correctness bug)

---

## Part 2 — Pre-Launch Checklist

### 2.1 Firebase Infrastructure

- [ ] Firebase project `wishlist-wizard-prod` exists and is the active production project — Owner: _______
- [ ] Firebase project `wishlist-wizard-staging` exists and staging is tested — Owner: _______
- [ ] Firebase Blaze (pay-as-you-go) plan enabled on production project (required for Functions) — Owner: _______
- [ ] All required Firebase services are enabled: Authentication, Firestore, Functions, Hosting, Storage, Analytics, Cloud Messaging — Owner: _______
- [ ] Firebase App Hosting (`apphosting.yaml`) reviewed for production — Owner: _______
- [ ] Firestore security rules deployed: `firebase deploy --only firestore:rules --project wishlist-wizard-prod` — Owner: _______
- [ ] Firestore indexes deployed: `firebase deploy --only firestore:indexes --project wishlist-wizard-prod` — Owner: _______
- [ ] Firebase Functions runtime is `nodejs22` — verify this is supported in your Firebase project region — Owner: _______
- [ ] Firebase Storage security rules configured (not currently in repo — create `storage.rules`) — Owner: _______
- [ ] Daily Firestore backup configured in Firebase console — Owner: _______
- [ ] Firebase budget alerts configured to prevent runaway costs — Owner: _______

---

### 2.2 Secrets & Environment Variables

All secrets must be in GitHub Secrets or Firebase Secret Manager — never in source code.

**Firebase Functions (set via Firebase Secret Manager or environment config):**

- [x] Transactional email — implemented via Nodemailer + Google Workspace SMTP (`support@wishlist-wizard.com`). Secret: `GMAIL_APP_PASSWORD` in Firebase Secret Manager (set before deploying functions)
- [x] `OPENAI_API_KEY` — **N/A, not used** — not referenced anywhere in the codebase; recommendations are Firestore-backed, not model-backed. Do not provision. — Confirmed 2026-07-16
- [ ] `STRIPE_SECRET_KEY` — group gifting payments — **DEFERRED**: Phase 2
- [ ] `STRIPE_WEBHOOK_SECRET` — Stripe webhook verification — **DEFERRED**: Phase 2
- [x] `JWT_SECRET` / `SESSION_SECRET` — **N/A, not needed** — leftover from the pre-Firebase Express backend; auth is Firebase Authentication, which manages its own token signing. Remove from rotation schedule (§2.14) too. — Confirmed 2026-07-16
- [ ] FCM server credentials configured in Firebase console (push notifications) — Owner: _______ (client-side FCM init now live in the mobile app as of 2026-07-16 — see Current Deliverable Status — but server-side credentials/APNs config in the Firebase console still need verifying)

**GitHub Secrets (for CI/CD workflows):**

- [x] `FIREBASE_SERVICE_ACCOUNT_PRODUCTION` — set (named `FIREBASE_SERVICE_ACCOUNT_PRODUCTION`)
- [x] `FIREBASE_SERVICE_ACCOUNT_STAGING` — set
- [x] `FIREBASE_SERVICE_ACCOUNT_DEVELOPMENT` — set
- [x] `FIREBASE_TOKEN` — set
- [ ] `GH_TOKEN` — GitHub PAT with `repo`, `workflow` scopes — `NELSON_GREY_PAT` exists; verify it has workflow scope — Owner: _______
- [x] `APP_STORE_CONNECT_KEY_ID` — set
- [x] `APP_STORE_CONNECT_ISSUER_ID` — set
- [x] `APP_STORE_CONNECT_KEY` — set
- [x] `FASTLANE_APPLE_ID` — set
- [x] `FASTLANE_TEAM_ID` — set
- [x] `MATCH_GIT_URL` — set
- [x] `MATCH_PASSWORD` — set
- [x] `MATCH_GIT_BRANCH` — set
- [x] `MATCH_SSH_PRIVATE_KEY` — set
- [x] `MATCH_KEYCHAIN_NAME` — set
- [x] `MATCH_KEYCHAIN_PASSWORD` — set
- [ ] `GOOGLE_PLAY_SERVICE_ACCOUNT_KEY` — Android CI deployment JSON — Owner: _______
- [ ] `ANDROID_KEYSTORE` — base64-encoded keystore file — Owner: _______
- [ ] `ANDROID_KEYSTORE_PASSWORD` — keystore password — Owner: _______
- [ ] `ANDROID_KEY_ALIAS` — key alias — Owner: _______
- [ ] `ANDROID_KEY_PASSWORD` — key password — Owner: _______

**Web App build-time variables (VITE_ prefix, set in CI):**

- [x] Production VITE_ vars — set as `VITE_FIREBASE_*_PRODUCTION` in GitHub Secrets; `firebase-hosting-merge.yml` maps them correctly
- [x] Dev VITE_ vars — set as `DEV_VITE_FIREBASE_*`; `firebase-hosting-dev.yml` maps them correctly
- [x] Staging VITE_ vars — set as `VITE_FIREBASE_*_STAGING`
- [x] `VITE_SHOW_COMING_SOON_*` — set for all three environments
- [ ] `VITE_GA_MEASUREMENT_ID` — Google Analytics ID separate from Firebase — Owner: _______

---

### 2.3 Code Quality Gates

Run the following commands in sequence. All must pass before deployment.

```bash
# 1. Dependency audit — no high/critical vulnerabilities
npm audit --audit-level=high

# 2. TypeScript type check across all packages
npm run check

# 3. Linting
npm run lint

# 4. Firebase functions smoke test (strict mode)
npm run test:functions:smoke:all:strict

# 5. User flow smoke test
npm run test:users:smoke

# 6. Requirements traceability
npm run requirements:traceability
npm run requirements:verify

# 7. Go-live gate (comprehensive automated check)
./scripts/go-live-gate.sh

# 8. Extension preflight
npm run preflight:extension

# 9. Mobile preflight
npm run preflight:mobile
```

- [x] `npm audit --audit-level=high` — 0 high/critical (2 moderate, in a dev-only test dependency of `firebase-functions-test`) — Verified 2026-07-16
- [x] `npm run check` — TypeScript passes with 0 errors across web/shared/firebase-utils — Verified 2026-07-16
- [x] `npm run lint` — ESLint passes with 0 errors across web/shared/firebase-utils — Verified 2026-07-16
- [x] Secret scan (gitleaks, proper git-history mode) — 2 false positives (placeholder token in docs, fake test Stripe key) + 1 real historical finding, see §1.9 (acknowledged, not remediated by rewrite — main/production unaffected) — Verified 2026-07-16
- [ ] **Firebase functions smoke test — STALE, not re-verifiable from this repo as currently structured.** `artifacts/smoke-all-functions-report.json` is dated 2026-06-11 and `artifacts/smoke-users-report.json` is dated 2026-05-15 — both predate the `packages/functions` extraction to the private `wishlist-wizard-functions` companion repo. `go-live-gate.sh` only reads these cached JSON files; it does not re-run the tests, and `npm run test:functions:smoke:all:strict` / `npm run test:users:smoke` both call `npm run build --workspace=functions`, which no longer resolves now that `packages/functions` has no `package.json` in this repo. **Action needed:** either run these smoke tests from the companion repo and copy the resulting artifact JSON back here, or update the scripts to point at the companion repo. — Owner: _______
- [x] `npm run requirements:traceability` — passes (14 business / 18 technical requirements, 0 warnings, 0 failures) — Verified 2026-07-16
- [x] `npm run requirements:verify` — passes (30/30 completed requirements mapped, 0 drift) — Verified 2026-07-16
- [x] `./scripts/go-live-gate.sh` — exits 0, GO FOR LAUNCH, 19 passed / 1 warning (uncommitted artifact files from this run) / 0 blockers — Verified 2026-07-16, **but see the smoke-test staleness note above — this script's Firebase/user-flow checks (CHECK 2, CHECK 3) are reading the same stale artifacts, not fresh data**
- [ ] `npm run preflight:extension` — not yet run this pass — Owner: _______
- [ ] `npm run preflight:mobile` — not yet run this pass — Owner: _______

---

### 2.4 Staging Validation

All end-to-end testing should be run against staging before promoting to production.

```bash
# E2E tests against staging
npm run test:e2e:staging

# Mobile UAT
npm run test:mobile:uat
```

- [ ] Staging environment deployed and matches production configuration — Owner: _______
- [ ] `npm run test:e2e:staging` — Tier 1 and smoke tests pass — Owner: _______
- [ ] `npm run test:mobile:uat` — iOS and Android auth smoke tests pass — Owner: _______
- [ ] Manual walkthrough: register new account, create wishlist, add item, share link — Owner: _______
- [ ] Manual walkthrough: install browser extension, add item from retailer page — Owner: _______
- [ ] Manual walkthrough: mobile app — register, create wishlist, receive push notification — Owner: _______
- [ ] Email delivery tested — registration confirmation and password reset emails received — Owner: _______
- [ ] Wishlist public share link accessible without authentication — Owner: _______
- [ ] Collaborative wishlist invite flow tested — Owner: _______

---

### 2.5 Web App Production Build

```bash
# Production build
npm run build --workspace=@wishlist-wizard/web

# Verify build output
ls packages/web/dist
```

- [ ] Production build completes with no errors — Owner: _______
- [ ] `packages/web/dist/index.html` exists — Owner: _______
- [ ] All VITE_ environment variables are baked into the build — Owner: _______
- [ ] Bundle size reviewed — no unexpectedly large chunks — Owner: _______
- [ ] Source maps excluded from production build (or stored privately) — Owner: _______
- [x] Content Security Policy headers configured in `firebase.prod.json` under `"headers"` — Completed 2026-06-24
- [ ] Favicon and app icons present in `public/` — Owner: _______
- [ ] Open Graph meta tags correct (og:title, og:description, og:image) for social sharing — Owner: _______
- [ ] robots.txt reviewed and appropriate for a public app — Owner: _______

---

### 2.6 iOS Mobile Release

```bash
# From packages/mobile:
flutter pub get
flutter build ios --release
```

- [ ] Flutter version pinned and matches CI (`flutter --version`) — Owner: _______
- [ ] CocoaPods install completes without errors (`pod install`) — Owner: _______
- [x] Bundle ID confirmed: iOS `com.wishlistwizard.app.ios`, Android `com.wishlistwizard.app.android` — Completed 2026-06-24
- [ ] App version set to `1.0.0`, build number set (increment each submission) — Owner: _______
- [ ] App icons (all required sizes) present — Owner: _______
- [ ] Launch screen / splash screen implemented — Owner: _______
- [ ] Privacy manifest (`PrivacyInfo.xcprivacy`) included — required by Apple as of May 2024 — Owner: _______
- [ ] Push notification entitlements configured (APS environment: production) — Owner: _______
- [x] iOS code signing via Fastlane Match configured and certificates downloaded — `fastlane sync_signing` run for `com.wishlistwizard.app.ios` 2026-06-24
- [ ] Archive builds successfully in Xcode or via `ios-mobile-release.yml` workflow — Owner: _______
- [ ] TestFlight build uploaded and tested by at least one internal tester — Owner: _______
- [ ] App Store listing prepared: name, description, screenshots (6.7", 5.5" minimum), keywords — Owner: _______
- [ ] App privacy labels completed in App Store Connect — Owner: _______
- [ ] App Review submission created — Owner: _______
- [ ] Expected App Review time: 24–48 hours — plan timeline accordingly — Owner: _______

---

### 2.7 Android Mobile Release

- [ ] Keystore file secured and backed up (NOT in the repo) — Owner: _______
- [ ] App version set, `versionCode` incremented — Owner: _______
- [ ] App icons present for all densities — Owner: _______
- [ ] AAB (Android App Bundle) built: `flutter build appbundle --release` — Owner: _______
- [ ] AAB signed with release keystore — Owner: _______
- [ ] Google Play listing prepared: title, description, screenshots (phone + tablet), short description — Owner: _______
- [ ] Content rating questionnaire completed in Play Console — Owner: _______
- [ ] App uploaded to internal testing track — Owner: _______
- [ ] Internal testing completed (minimum 1 tester, 1 device) — Owner: _______
- [ ] Promoted to alpha/beta track for expanded testing — Owner: _______
- [ ] Promoted to production track when ready — Owner: _______
- [ ] Data safety section completed in Play Console — Owner: _______

---

### 2.8 Chrome Extension Release

```bash
# Package the extension
npm run package:extension:release

# This produces chrome-extension-package/ or a .zip file
```

- [ ] Extension version in `manifest.json` set to `1.0.0` — Owner: _______
- [ ] Extension preflight passes: `npm run preflight:extension` — Owner: _______
- [ ] `npm run package:extension:release` succeeds and produces valid .zip — Owner: _______
- [ ] Extension manually tested: install from local .zip, add item from Amazon/eBay/Target — Owner: _______
- [ ] Chrome Web Store developer account set up — Owner: _______
- [ ] Store listing prepared: icon (128px), screenshots, short description (max 132 chars), detailed description — Owner: _______
- [ ] Extension privacy policy URL added to store listing — Owner: _______
- [ ] Extension submitted for review (expect 1–3 business days for first submission) — Owner: _______

---

### 2.9 DNS, Domain & SSL

- [ ] Custom domain purchased (e.g., `wishlistwizard.com`) — Owner: _______
- [ ] Firebase Hosting custom domain configured in Firebase console — Owner: _______
- [ ] DNS A/CNAME records pointed to Firebase Hosting — Owner: _______
- [ ] SSL certificate provisioned by Firebase (automatic via Let's Encrypt) — Owner: _______
- [ ] `www` redirect to apex domain (or vice versa) configured — Owner: _______
- [ ] `docs.wishlistwizard.com` domain configured and documentation live — Owner: _______
- [ ] `api.wishlist-wizard.web.app` (or custom API domain) confirmed operational — Owner: _______
- [ ] Email domain SPF/DKIM/DMARC DNS records set for Google Workspace (SendGrid is not used — see §2.11, email goes via Nodemailer + Gmail SMTP) — Owner: _______

---

### 2.10 Legal & Compliance

- [ ] Terms of Service written and published at a public URL — Owner: _______
- [ ] Privacy Policy written and published at a public URL — Owner: _______
- [ ] Privacy Policy linked in mobile app and extension (required by app stores) — Owner: _______
- [ ] Cookie consent banner implemented on web app (required for GDPR/CCPA) — Owner: _______
- [x] Google AdMob/AdSense privacy consent (UMP) configured — Completed 2026-06-26
- [ ] Data retention policy defined — Owner: _______
- [ ] User account deletion flow working end-to-end (GDPR Art. 17 / CCPA) — Owner: _______
- [ ] Data export capability available for users (GDPR Art. 20) — Owner: _______
- [ ] COPPA considerations reviewed (if app is used by under-13s) — Owner: _______
- [x] License file (`LICENSE`) added to repository root with proprietary terms — Completed 2026-06-24

---

### 2.11 External Service Integrations

- [x] **Email (Nodemailer + Google Workspace):** `support@wishlist-wizard.com` via Gmail SMTP. Templates: price-tracking-welcome, price-alert. Secret `GMAIL_APP_PASSWORD` must be set in Firebase Secret Manager before deploying. `sendEmail()` in `packages/functions/src/email.ts`.
- [ ] **Stripe:** Account created, webhooks configured, group gifting Stripe integration tested (or explicitly deferred to Phase 2 with feature flag off) — Owner: _______
- [x] **OpenAI:** N/A — not used anywhere in the codebase (recommendations are Firestore-backed, not model-backed). Do not provision. — Confirmed 2026-07-16
- [ ] **Google Calendar API:** OAuth app configured in Google Cloud Console, OAuth consent screen reviewed and approved — Owner: _______
- [ ] **Microsoft Outlook Calendar API:** Azure app registration configured — Owner: _______
- [ ] **E-commerce APIs:** Integrations with Amazon/eBay/Etsy/Walmart/Target/Best Buy tested against production endpoints — Owner: _______
- [ ] **FCM (Firebase Cloud Messaging):** Push notifications working on web (VAPID key configured), iOS (APNs token configured), and Android — Owner: _______
- [ ] **Firebase Analytics:** Events flowing into Firebase console — Owner: _______
- [ ] **Google Analytics:** Measurement ID producing traffic in GA4 dashboard — Owner: _______

---

### 2.12 Monitoring & Alerting Setup

```bash
# Start 24/7 monitoring (run before go-live)
./automate.sh monitor start

# Baseline metrics snapshot
npm run metrics:baseline
```

- [ ] `./automate.sh monitor start` — monitoring daemon running — Owner: _______
- [ ] Alert email `admin@wishlist-wizard.com` (or configured email) is a real, monitored inbox — Owner: _______
- [ ] Slack webhook configured and alert messages tested — Owner: _______
- [ ] Firebase console alerts configured: Functions error rate, Firestore quota thresholds — Owner: _______
- [ ] Uptime monitoring configured (e.g., Firebase Alerting or external uptime tool) — Owner: _______
- [ ] `npm run metrics:baseline` run and baseline snapshot saved — Owner: _______
- [ ] GitHub Actions cost monitoring script configured: `scripts/monitor-github-actions-costs.sh` — Owner: _______
- [ ] `health-status.json` endpoint accessible publicly (if intended as a status page) — Owner: _______

---

### 2.13 Documentation

The `go-live-gate.sh` checks for these specific docs at launch:

- [ ] `RELEASE_READINESS_TIERED.md` exists (in root or `docs/`) — Owner: _______
- [ ] `LAUNCH_CHECKLIST.md` exists (in root or `docs/`) — Owner: _______
- [ ] `E2E_TESTING_GUIDE.md` exists (in root or `docs/`) — Owner: _______
- [ ] `FIREBASE_STRATEGY.md` exists (referenced in README) — Owner: _______
- [ ] `ZERO_TOUCH_DEVOPS_IMPLEMENTATION_GUIDE.md` exists — Owner: _______
- [ ] `AUTOMATED_DEPLOYMENT.md` exists — Owner: _______
- [ ] README.md is accurate for the `1.0.0` public release — Owner: _______
- [ ] Support email `support@wishlistwizard.com` is a live, monitored inbox — Owner: _______
- [ ] `docs.wishlistwizard.com` is live or has a coming-soon redirect — Owner: _______

---

### 2.14 Token Rotation & Security Schedule

Set up rotation reminders now so they don't lapse post-launch.

| Secret | Rotation Interval | Next Rotation Due | Owner |
|---|---|---|---|
| GitHub PAT (`GH_TOKEN`) | 30 days | ___________ | _______ |
| Firebase token | 7 days | ___________ | _______ |
| ~~JWT_SECRET~~ | N/A — not used (Firebase Auth manages its own tokens) | — | — |
| Encryption keys | 180 days | ___________ | _______ |
| SSL certificates | Auto (Firebase) | Auto-renewed | — |
| App Store Connect key | Per Apple policy | ___________ | _______ |
| Stripe API keys | On compromise | — | _______ |

Use the automated rotation script: `./automate.sh tokens rotate`

---

## Part 3 — Launch Day Execution

### 3.1 T-24 Hours (Day Before Launch)

- [ ] All Part 2 items complete and checked — Owner: _______
- [ ] Staging E2E tests pass with latest code — Owner: _______
- [ ] Team briefed on launch time, responsibilities, and rollback procedure — Owner: _______
- [ ] Rollback plan documented (see Section 3.5) — Owner: _______
- [ ] Customer support team ready to receive reports — Owner: _______
- [ ] Monitoring dashboards bookmarked and verified accessible — Owner: _______
- [ ] Firebase console access confirmed for all relevant team members — Owner: _______
- [ ] GitHub Actions workflow access confirmed — Owner: _______

---

### 3.2 T-1 Hour (Pre-Deploy)

```bash
# Final automated gate
./scripts/go-live-gate.sh

# Final release readiness check
npm run go-live:check
```

- [ ] `./scripts/go-live-gate.sh` exits 0 — **GO FOR LAUNCH** — Owner: _______
- [ ] Git working directory is clean: `git status` — Owner: _______
- [ ] On correct branch (develop/main as per chosen strategy) — Owner: _______
- [ ] No active GitHub Actions runs that could conflict — Owner: _______
- [ ] Monitoring daemon running: `./automate.sh monitor start` — Owner: _______
- [ ] All team members at their stations — Owner: _______

---

### 3.3 Deployment Sequence

Execute steps in this exact order:

**Step 1 — Firestore Rules & Indexes**
```bash
firebase deploy --only firestore:rules,firestore:indexes --project wishlist-wizard-prod
```
- [ ] Rules deployed — Owner: _______

**Step 2 — Firebase Functions**
```bash
npm run build --workspace=functions
firebase deploy --only functions --project wishlist-wizard-prod
```
- [ ] Functions deployed — watch Firebase console for errors — Owner: _______
- [ ] No function deployment errors — Owner: _______

**Step 3 — Web App**
```bash
npm run build --workspace=@wishlist-wizard/web
firebase deploy --only hosting --project wishlist-wizard-prod
```
- [ ] Web app deployed — Owner: _______
- [ ] `https://wishlist-wizard.web.app` loads successfully — Owner: _______

**Step 4 — Or: Deploy All via Script**
```bash
npm run deploy
# Or via GitHub Actions: merge to main triggers master-pipeline.yml
```
- [ ] Full deployment completed without errors — Owner: _______

**Step 5 — Verify Pipeline**
- [ ] GitHub Actions `master-pipeline.yml` run completed green — Owner: _______
- [ ] `production-validation.yml` workflow passed — Owner: _______

---

### 3.4 Post-Deploy Smoke Tests (Production)

```bash
# Smoke test against production
npm run test:e2e:prod
```

Execute these tests within 30 minutes of deployment:

- [ ] `npm run test:e2e:prod` passes — Owner: _______
- [ ] **Web:** Navigate to `https://wishlist-wizard.web.app` — page loads, no console errors — Owner: _______
- [ ] **Web:** Create a new account — registration email received — Owner: _______
- [ ] **Web:** Log in and create a wishlist — Owner: _______
- [ ] **Web:** Add an item to the wishlist — Owner: _______
- [ ] **Web:** Generate and open a share link in an incognito window — Owner: _______
- [ ] **Web:** Direct URL navigation test — navigate to `/dashboard` in a fresh tab — renders correctly (not redirected to home) — Owner: _______
- [ ] **Extension:** Install from Chrome Web Store (or sideload .zip) — Owner: _______
- [ ] **Extension:** Navigate to Amazon product page, click extension icon, add item — Owner: _______
- [ ] **iOS:** Install TestFlight build and run auth smoke test — Owner: _______
- [ ] **Android:** Install from Play Store internal track and run auth test — Owner: _______
- [ ] **API:** Firebase Functions are responding — check Firebase console function logs — Owner: _______
- [ ] **Email:** Password reset email sent and received — Owner: _______
- [ ] **Push:** Send test FCM notification from Firebase console — Owner: _______
- [ ] **Analytics:** Events appearing in Firebase Analytics realtime view — Owner: _______

---

### 3.5 Rollback Plan

If blocking issues are discovered post-deploy, execute within the decision window (15 minutes):

**Decision Criteria for Rollback:**
- Web app returns 5xx errors for more than 5% of requests
- User registration or login is broken
- Data corruption detected in Firestore
- Critical security vulnerability discovered

**Rollback — Firebase Hosting (immediate, < 2 minutes):**
```bash
# List previous releases
firebase hosting:releases:list --project wishlist-wizard-prod

# Roll back to previous version
firebase hosting:rollback --project wishlist-wizard-prod
```

**Rollback — Firebase Functions:**
```bash
# Redeploy previous function version (requires previous build artifact)
# Or: disable the specific function and revert code
firebase deploy --only functions:functionName --project wishlist-wizard-prod
```

**Rollback — Firestore Rules:**
```bash
# Revert firestore.rules to previous version (via git)
git checkout HEAD~1 -- firestore.rules
firebase deploy --only firestore:rules --project wishlist-wizard-prod
```

- [ ] Rollback procedure tested on staging before launch day — Owner: _______
- [ ] All team members know who has authority to call a rollback — Owner: _______
- [ ] Previous build artifacts available (Firebase keeps last 10 releases) — Owner: _______

---

## Part 4 — Post-Launch

### 4.1 First 24 Hours

- [ ] Firebase console — monitor function error rates (target: < 1%) — Owner: _______
- [ ] Firebase console — monitor Firestore read/write counts vs. quota — Owner: _______
- [ ] Firebase console — review Auth usage for unusual patterns — Owner: _______
- [ ] Google Workspace / Gmail SMTP — email delivery rates > 95% (SendGrid is not used) — Owner: _______
- [ ] Firebase Analytics — new user count and session data flowing — Owner: _______
- [ ] App Store Connect — review any early crash reports from TestFlight/App Review — Owner: _______
- [ ] Play Console — review Android vitals for crashes/ANRs — Owner: _______
- [ ] Customer support inbox — review and respond to first reports — Owner: _______
- [ ] GitHub Actions — no unexpected workflow failures — Owner: _______
- [ ] Monitoring daemon health check: `./automate.sh monitor status` — Owner: _______

---

### 4.2 First 48–72 Hours

- [ ] App Store Review completed and app approved (iOS) — Owner: _______
- [ ] Chrome Extension review completed and extension approved — Owner: _______
- [ ] Android app promoted from internal → alpha/beta track — Owner: _______
- [ ] Collect and review first user feedback — Owner: _______
- [ ] Monitor Firebase Function cold start times — Owner: _______
- [ ] Review Firestore query performance against configured indexes — Owner: _______
- [ ] Baseline metrics snapshot compared to pre-launch baseline: `npm run metrics:baseline` — Owner: _______

---

### 4.3 First 7 Days

- [ ] Firebase token rotation: `./automate.sh tokens rotate` — Owner: _______
- [ ] Review and prioritize any bug reports — Owner: _______
- [ ] Android app promoted to production track (if internal + alpha testing successful) — Owner: _______
- [ ] iOS app publicly visible on App Store (after approval) — Owner: _______
- [ ] Weekly status review with team — Owner: _______
- [ ] Post-launch retrospective scheduled — Owner: _______

---

### 4.4 Ongoing Operations

| Cadence | Task | Owner |
|---|---|---|
| Daily | Review Firebase console error dashboard | _______ |
| Daily | Review monitoring logs and alerts | _______ |
| Weekly | Review user feedback and support tickets | _______ |
| Weekly | GitHub Actions cost review | _______ |
| 30 days | Rotate GitHub PAT (`GH_TOKEN`) | _______ |
| 7 days | Rotate Firebase token | _______ |
| 180 days | Rotate encryption keys | _______ |
| Quarterly | Dependency audit: `npm audit` | _______ |
| Quarterly | Review and update Firestore security rules | _______ |
| Quarterly | Review Firebase Functions cold start optimization | _______ |

---

## Part 5 — Phase 2 Roadmap (Post-Launch)

The following features are explicitly documented as deferred to Phase 2. Do not launch with them enabled unless fully tested. List reconciled against the 2026-07-16 code audit — several entries below were corrected or added based on what's actually in the codebase today.

- **Personal price-drop alerts** — coded (`firebase-price-tracking.ts`) but not exported from the Functions deploy entrypoint; not launch-blocking since nothing calls it, but don't assume it works. (Multi-retailer comparison-shopping, a related but separate feature, **is** live via SerpAPI — no action needed there.)
- **Affiliate monetization** — click/conversion tracking and revenue aggregation are already live and deployed; only the creator-facing dashboard and payout system below remain undone.
- **Browser extension coupon finder & price comparison** — UI is complete but calls backend endpoints that don't exist anywhere in the repo (`/api/extension/coupons`, `/api/extension/price-comparisons`); either implement the backend or remove the UI before it's user-facing at scale.
- **Creator dashboard & payouts** — no code exists anywhere (dashboard, commission tracking, payout processing). Docs previously called this "ready, payment system next" — that was inaccurate; treat as unstarted.
- **Social network & discovery** — no code beyond a page literally named `SocialIntegrationDemo.tsx`. Treat as unstarted, not partial.
- **iOS/Android native platform features** — Siri Shortcuts, App Clips, iCloud sync, Handoff, Google Assistant integration, home-screen widgets: zero code exists (the app is Flutter, not native Swift/Kotlin as earlier docs claimed — see `docs/PRODUCT_DESIGN.md` Feature 6).
- **Stripe group gifting payments** — partially scaffolded (2 Stripe callables warn in smoke tests); must be either fully implemented and tested, or gated behind a feature flag set to OFF at launch
- **AI-powered recommendations** — **not applicable / do not provision.** `OPENAI_API_KEY` does not appear anywhere in the live codebase; recommendations are Firestore-backed (pattern-matching on user activity), not model-backed, and public copy was deliberately reworded away from "AI" framing. Re-introduce only if a real model integration is built.
- **Barcode lookup** — 1 upstream dependency gap noted in smoke tests
- **AR features** — Phase 3
- **White-label / creator economy** — Phase 3

For any Phase 2 feature that has scaffolding in the codebase, verify it is behind a feature flag or environment check so it degrades gracefully when unconfigured.

---

## Appendix A — Quick Reference Commands

```bash
# Full test suite (functions smoke + user smoke)
npm run test:functions:smoke:all:strict
npm run test:users:smoke

# E2E against staging
npm run test:e2e:staging

# E2E against production (smoke only)
npm run test:e2e:prod

# Go-live gate
./scripts/go-live-gate.sh

# Release readiness
npm run go-live:check

# Deploy all
npm run deploy

# Deploy individual components
npm run deploy:web       # Firebase Hosting
npm run deploy:api       # Firebase Functions
npm run deploy:mobile    # Flutter web build to Hosting

# Package Chrome extension
npm run package:extension:release

# Start monitoring
./automate.sh monitor start

# Rotate tokens
./automate.sh tokens rotate

# Mobile preflight
npm run preflight:mobile

# Extension preflight
npm run preflight:extension
```

---

## Appendix B — Key Files Reference

| File | Purpose |
|---|---|
| `firebase.prod.json` | Production Firebase configuration |
| `firestore.rules` | Firestore security rules |
| `firestore.indexes.json` | Firestore composite indexes |
| `.firebaserc` | Firebase project aliases (dev/staging/prod) |
| `apphosting.yaml` | Firebase App Hosting config |
| `scripts/go-live-gate.sh` | Automated release readiness gate |
| `scripts/release-readiness-check.sh` | Secondary readiness check |
| `scripts/deploy.sh` | Deployment script |
| `scripts/monitoring.sh` | Monitoring daemon |
| `scripts/token-rotation.sh` | Token rotation automation |
| `.github/workflows/master-pipeline.yml` | Main CI/CD pipeline |
| `.github/workflows/ios-mobile-release.yml` | iOS build and release |
| `.github/workflows/extension-build.yml` | Chrome extension build |
| `.github/workflows/e2e-tests.yml` | End-to-end test runner |
| `.github/workflows/production-validation.yml` | Post-deploy validation |
| `packages/web/` | React web app |
| `packages/functions/` | Firebase Cloud Functions |
| `packages/mobile/` | Flutter mobile app |
| `packages/browser-extension/` | Chrome extension |
| `packages/shared/` | Shared TypeScript types/utils |
| `.env.automation.development.example` | Automation environment variable template |

---

## Appendix C — Go-Live Gate Criteria (from scripts/go-live-gate.sh)

The automated gate at `./scripts/go-live-gate.sh` enforces:

| Check | Threshold | Blocking? |
|---|---|---|
| Git working directory clean | Clean or warn | Warn |
| On develop/main branch | develop or main | Warn |
| Firebase smoke test: zero failures | 0 hard failures | Yes |
| Firebase smoke test: endpoints ready | ≥ 60 passed | Yes |
| User flow smoke tests: no failures | 0 failed | Yes |
| Playwright config exists | File present | Yes |
| E2E test files count | ≥ 3 .spec.ts files | Warn |
| GitHub Actions E2E workflow | File present | Warn |
| Tier 1 features (10 core callables) | All 10 passing | Yes |
| Tier 2 features (6 advanced callables) | ≥ 5 passing | Warn |
| Documentation: RELEASE_READINESS_TIERED.md | Exists | Warn |
| Documentation: LAUNCH_CHECKLIST.md | Exists | Warn |
| Documentation: E2E_TESTING_GUIDE.md | Exists | Warn |
| Playwright in package.json | Present | Warn |
| Node modules installed | node_modules/ exists | Warn |
| TypeScript config | tsconfig.json present | Warn |
| Firebase config exists | firebase.json or firestore.rules | Warn |
| Requirements matrix verification | npm run requirements:verify passes | Yes |

---

*This document was originally generated from analysis of the wishlist-wizard repository at commit state as of 2026-06-16, and updated 2026-07-16 following a full audit + recovery pass (see "Current Deliverable Status" near the top, and §1.7/§1.8). The 2026-06-16 analysis did not catch the production gate bug in §1.7 — treat any "Complete"/"Resolved" status in this document that predates 2026-07-16 as unverified until spot-checked against code. Update this document as the codebase evolves.*
