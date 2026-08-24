# Wishlist Wizard — Go Live Document

> **Version:** 1.3  
> **Last Updated:** 2026-08-10  
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

## Current Deliverable Status (as of 2026-08-10)

A 2026-07-16 audit found this document's — and `docs/PRODUCT_DESIGN.md`'s — prior status claims materially overstated in places, including a launch-blocking bug neither document knew about (§1.7). A same-day recovery pass fixed most of what was found, and per-feature rigor passes through 2026-07-23 (web, extension, mobile) closed most of what that audit couldn't reach. Since the last refresh of this document (2026-08-04), three more significant threads landed: the App Check blocker that had been open since §1.15 is **fully resolved** end-to-end including a Functions deploy migration to Workload Identity Federation (§1.19); `main` was promoted to parity with `develop`/`staging` for the first time since 2026-06-05 (§1.19); and a mobile launch-readiness pass fixed three real user-facing crash bugs plus CI/deploy issues, with one (Android `versionCode`) fixed in code but **not yet confirmed by a live pipeline run** (§1.20). Table below reflects verified code state; see `docs/PRODUCT_DESIGN.md` for full per-feature detail and evidence.

| Deliverable | State | Notes |
|---|---|---|
| **Web app** | 🟢 Core loop live and App Check-verified in dev **and now staging/prod deploy path** | Production gate bug (§1.7) fixed — `/app/*` and `/shared/:shareId` render in prod, matching dev/staging (still behind the deliberate `production` Coming Soon code-gate per §1.17 until real launch). App Check (§1.15/§1.16) was found broken, then fixed client-side, and **as of §1.19 the Functions deploy pipeline itself was migrated to Workload Identity Federation** — the first-ever fully green `build_and_deploy`-class run landed 2026-08-09 (Web UAT, Quality Gate, Android build, Web build, and Deploy Firebase to dev all green in the same run). Three copy-pasted null-`item.price` crashes found and fixed 2026-08-08/09 (§1.20) — real user-facing bugs, not test artifacts. `main` was promoted to content parity with `staging`/`develop` on 2026-08-05 for the first time since 2026-06-05, restoring its deploy workflow. |
| **Browser extension** | 🟡 Core "killer app" flow real and tested; still no confirmed Chrome Web Store listing | The floating-button add-to-wishlist flow was fixed and verified 2026-07-18 (§1.12/§1.13), with a real committed Playwright E2E suite wired into CI. Coupon finder and price comparison still call backend endpoints that don't exist — deferred to Phase 2, not launch-blocking. **Confirmed 2026-08-09: Chrome Web Store submission is genuinely manual-only** (no API path for first-time listing) and is deliberately deferred by the user — not an oversight. |
| **Mobile (iOS/Android, Flutter)** | 🟢 Thin but real, Android deploy path confirmed live | Push notifications, offline caching, and sharing are wired. Barcode lookup — backend-ready since the functions/api-router migration but never called from the UI — was wired into the Add Item screen 2026-08-08. A real crash bug (`FirebaseWishlistProvider.createWishlist()` discarding the real doc id) was found and fixed 2026-07-18 with a regression-proven test. **2026-08-09: found and fixed a genuine Play Console `versionCode` collision** (bumped `pubspec.yaml` to `1.0.0+3`); **confirmed live 2026-08-10** via a real Play Console internal-track upload (§1.20). Also fixed: `google-services.json` committed as a symlink, which broke Android CI's environment-switching. Still missing: Shared-with-Me, Creator Mode, native platform features (Siri Shortcuts, App Clips, iCloud, widgets) — never built, not regressions. |
| **Backend (Firebase Functions + Firestore)** | 🟢 Live, confirmed; deploy pipeline hardened | Root `server/`/`client/` (old Express+Postgres) are dead. Affiliate tracking, calendar OAuth sync, and the router-pattern migration (§ router-migration memory, 2026-07-23 — all 63 callables) are solid. **Creator/business-tier Stripe checkout was found broken in all three environments** (`router.ts` never bound the Creator/Business price-ID secrets, and the dev/staging secret values themselves held the wrong field from a pasted list) — both fixed and pushed 2026-08-09. **Deploy-verification on 2026-08-10 fixed one blocker (root-lockfile drift) and uncovered a second, deeper one: `staging`/`main` Functions currently fail to `tsc`-compile at all** (missing `lib: ES2022` in their `tsconfig.json` vs. an `.at()` call in `admin.ts` — see §1.20 addendum). The Stripe fix itself is still unconfirmed live. The affiliate/creator payout backend (ledger, reconciliation, Stripe Connect) is fully built and deployed to dev with a tier-gated creator dashboard live-verified — see the corrected Part 5 entry below; prior versions of this document incorrectly said this was unstarted. |

**Important:** Part 2.3's automated code-quality gates (npm audit, lint, secret scan, functions smoke tests, e2e tests, `go-live-gate.sh`) have **not** been re-run end-to-end as a single pass since 2026-07-16, and `go-live-gate.sh`'s Firebase/user-flow checks were already known-stale even then (§2.3). Individual pieces (unit suites, E2E, requirements traceability, CI) have been exercised piecemeal through 2026-08-09 and are green where noted in §1.17/§1.19, but nobody has run the full §2.3 sequence end-to-end recently. Re-run Part 2.3 in full before relying on this document to green-light a launch.

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

### 1.3 Open Issues Triage [STATUS CHANGED — 2026-08-10, needs owner confirmation]

**Original problem (2026-06-16):** The repository had 44 open GitHub issues requiring triage.

**Found 2026-08-10:** The GitHub Issues feature is now **disabled** on `NelsonGrey/wishlist-wizard` (`gh repo view` → `hasIssuesEnabled: false`). This means either (a) the 44 issues were triaged/closed and Issues deliberately turned off, or (b) Issues was disabled with open items still in it and now inaccessible via the GitHub UI/API for this repo. Not something this session can determine from the repo alone — needs the account owner to confirm via GitHub's org/repo settings (Issues can be re-enabled without losing prior issue data). If tracking moved elsewhere (a project board, an external tracker), this section should be updated to point at it instead.

- [ ] **Confirm whether the 44 issues were triaged before Issues was disabled, or are dormant and inaccessible** — Owner: _______
- [ ] **If pre-launch-blocking issues exist in the dormant tracker, re-enable Issues and resolve them; otherwise close this item** — Owner: _______

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
- [ ] **Android App Check is on hold indefinitely** — no physical Android device available, which is also required for Play Store submission independent of App Check; the Flutter client SDK is wired defensively (`AndroidPlayIntegrityProvider`/`AndroidDebugProvider`) but untested and enforcement status is unconfirmed
- [ ] **Harden the intermittent flake in `ensureWishlistExists`'s post-create wishlist-card check** — Owner: _______ (low priority; network-timing related, not a correctness bug)

**2026-07-18, same day: the user configured App Check for staging and production too**, using the same reCAPTCHA v3 site key as dev (one key covers all three environments). Wired the site key into all three real web deploy paths — each uses a different config pattern, and App Check's site key isn't covered by Firebase Hosting's runtime `/__/firebase/init.json` auto-config the way the rest of the Firebase SDK config is, so each needed its own explicit fix:
- `firebase-hosting-dev.yml` (deploys `wishlist-wizard-dev` on every push to `develop` — the live path this whole session's work has been landing through)
- `firebase-hosting-merge.yml` (deploys `wishlist-wizard-prod` on push to `main`)
- `master-pipeline.yml`'s `build-web` job (covers staging and other build contexts)

Added `VITE_FIREBASE_APPCHECK_SITE_KEY_DEVELOPMENT`/`_STAGING`/`_PRODUCTION` as GitHub repo secrets (all three set to the same site key, matching the user's setup). **Per the user's explicit choice, staging and production were not live-verified this round** — only the config wiring was done; dev remains the only environment confirmed working end-to-end via the full E2E suite (§1.16 above).

- [x] **Wire the App Check site key into all three real web deploy paths (dev/staging/prod) and set the corresponding GitHub secrets** — Completed 2026-07-18
- [ ] **Live-verify staging and production now that App Check is configured there** — Owner: _______ (deliberately not done this round; use the same direct-`curl`-with-real-ID-token approach from §1.15 — skip production unless explicitly authorized each time, since it's real infrastructure and a prior attempt was correctly blocked by this session's own safety guardrails)

---

### 1.17 GitHub Actions Had Never Run, a Stale Lockfile Was Silently Blocking It, and Production Had No Real Launch Gate [RESOLVED — 2026-07-20]

Picking up the §1.16 "live-verify staging" item surfaced something much bigger: **every GitHub Actions workflow in this repo had 0 runs, ever** (`actions/runs` → `total_count: 0`, confirmed per-workflow too), despite push events arriving normally and repo-level Actions permissions reporting enabled. All prior "fixed in CI" claims in recent commits/docs had never actually been validated by a real CI execution — deploys were happening via the user running `firebase deploy` locally (confirmed via the GitHub Deployments API: ~1,296 deployment records, all created by `mnelson3`, none by `github-actions[bot]`). Root cause was an org-level Actions policy on the `NelsonGrey` organization (Settings → Actions → General) — the user fixed it there; confirmed via a manually-triggered `secret-scan.yml` run that actually executed and completed.

With Actions genuinely running for the first time, `master-pipeline.yml`'s `test_all` action immediately failed on `npm ci` — the root `package-lock.json` was stale relative to `packages/functions` (checked out live from the private `wishlist-wizard-functions` companion repo on every CI run), missing ~200 transitive dependencies (`gtoken`, `gcp-metadata`, `jsonwebtoken`, etc.) that `firebase-admin`'s dependency tree now pulls in. This has been failing deterministically since the functions extraction — CI just never ran to surface it. Fixed by cloning the companion repo's `develop` branch into an isolated scratch copy (the user's actual local `packages/functions` was on its own feature branch with uncommitted work and was never touched) and regenerating the root lockfile against it. Verified both `npm ci` and `npm run lint` pass clean afterward.

The next `master-pipeline.yml` run got much further (65 mobile unit tests passed) and failed on a legitimate next gate: `scripts/release-readiness-check.sh`'s "no coming-soon copy in production" check, flagging genuine marketing copy ("Android coming soon", etc.) in 5 files. Chasing why turned up the real finding: **`main` is 848 commits behind `develop`** (last touched 2026-06-05) and its `App.tsx` unconditionally renders nothing but the old `ComingSoon.tsx` — that's the entire reason `wishlist-wizard-prod.web.app` has been showing "Coming Soon" (confirmed live, HTTP 200, title "Wishlist Wizard — Coming Soon"). It's not a bug, just staleness. But it means **`develop`'s current code has no production gate at all** — `ComingSoon.tsx` was dropped at some point during `develop`'s evolution and replaced with `EnvironmentPasswordGate`, whose `PROTECTED_ENVIRONMENTS` set only covers `staging`/`demonstration`, not `production`. The moment `develop` merges to `main` for real launch, the real app would go fully public with no soft-launch step — and since Actions now actually deploys on push to `main`, that would happen automatically.

Per the user's explicit direction ("production should show Coming Soon since we're not in production yet"), fixed by:
- Adding a new, self-contained `packages/web/client-src/pages/ComingSoon.tsx` (no dead API calls to the old `/api/coming-soon/*` endpoints, which don't exist in the current functions backend; "Personalized" framing per [[project_deferred_services]]'s AI-wording decision, not "AI-Powered").
- Wiring it unconditionally into `AppRouter.tsx`: when `resolveRuntimeEnvironment() === 'production'`, the whole app renders `<ComingSoon />` and nothing else — no env var toggle, a deliberate code-level gate matching how `main`'s old `App.tsx` behaved.
- Removing `release-readiness-check.sh`'s "no coming-soon copy" step entirely — its premise is now inverted (production is *supposed* to show coming-soon content until real launch), so the check no longer makes sense in either direction.
- Correcting the stale `VITE_SHOW_COMING_SOON_*` line in §2.2 — that env var doesn't exist in the current codebase; the gate is now hardcoded, not env-driven.

- [x] **Diagnose and fix GitHub Actions never running** (org-level policy) — Completed 2026-07-20, user fixed via org settings, verified via a real completed run
- [x] **Find and fix the root `package-lock.json` drift blocking `npm ci` in CI** — Completed 2026-07-20
- [x] **Add a real production launch gate** (`ComingSoon.tsx` wired unconditionally for the `production` environment in `AppRouter.tsx`) — Completed 2026-07-20
- [x] **Remove the now-obsolete "no coming-soon copy" CI check and correct the stale `VITE_SHOW_COMING_SOON_*` doc reference** — Completed 2026-07-20
- [ ] **Before real launch: deliberately remove/flip the `environment === 'production'` check in `AppRouter.tsx`** — Owner: _______ (this is now the actual "go live" code change — there's no env var to toggle, it's a direct code edit)
- [x] **Live-verify staging App Check** — Completed 2026-08-08/09, see §1.19 (the fix required migrating the Functions/Firestore deploy pipeline itself to Workload Identity Federation, not just re-testing the existing setup)

**Update 2026-08-05:** `main` was promoted to content parity with `staging` (which was itself parity with `develop`), via a direct tree replacement rather than a merge — `main` held 109 commits from before a history rewrite that aren't reachable from `develop`/`staging` at all, so a normal merge conflicted across nearly the entire tree. This also restored `main`'s own `firebase-hosting-merge.yml`, which had gone stale as a `.disabled`-suffixed file GitHub Actions doesn't register as a workflow — pushes to `main` deploy again. `main` has since fallen behind `develop` again as normal day-to-day work continued; treat this as "the promotion pipe was proven to work once," not "main is permanently in sync." The production `Coming Soon` gate item directly above is unaffected either way — Remote Config values on `wishlist-wizard-prod` already matched, so nothing changed for real visitors.

---

### 1.18 Marketing Tools Service Account — GA4/GTM/Search Console API Access [PARTIALLY RESOLVED — 2026-08-04]

Replicated the `marketing-tools-service` pattern set up on the sibling `modulo-squares` project (its `docs/GO_LIVE_RUNBOOK.md` §3.2b) onto `wishlist-wizard-prod`, so the same GA4/GTM/Search Console API access — and the live-config audit it enables — exists here too. Confirmed clean slate before starting: none of the four marketing APIs were enabled, no `marketing-tools-service` SA existed, and `constraints/iam.disableServiceAccountKeyCreation` is `enforced: true` on this project (same as it was on modulo-squares pre-fix).

**Completed:**
- Enabled `analyticsadmin.googleapis.com`, `analyticsdata.googleapis.com`, `tagmanager.googleapis.com`, `searchconsole.googleapis.com`, `adsense.googleapis.com` on `wishlist-wizard-prod`.
- Created `marketing-tools-service@wishlist-wizard-prod.iam.gserviceaccount.com`.

**Blocked, needs the account owner:**
- **Org policy exception + key mint.** Same as modulo-squares: the org-level `iam.disableServiceAccountKeyCreation` constraint blocks minting a key for the new SA, and lifting it (even project-scoped) is a sensitive-enough IAM mutation that it's outside what this session can execute directly. Run as `admin@nelsongrey.com` (Owner on this project):
  ```bash
  cat <<'EOF' > /tmp/sa-key-policy.yaml
  constraint: constraints/iam.disableServiceAccountKeyCreation
  booleanPolicy:
    enforced: false
  EOF
  gcloud resource-manager org-policies set-policy /tmp/sa-key-policy.yaml --project=wishlist-wizard-prod

  gcloud iam service-accounts keys create ~/marketing-tools-service-key.json \
    --iam-account=marketing-tools-service@wishlist-wizard-prod.iam.gserviceaccount.com
  ```
- **Manual product invites** (UI-only, no API path, needs the actual Google-account owner in each console):
  - **GTM:** invite `marketing-tools-service@wishlist-wizard-prod.iam.gserviceaccount.com` as a User under Account **6359833234 ("Nelson Grey")** if wishlist-wizard's container lives there (same shared account modulo-squares uses) — **not yet confirmed live**, since read access to list GTM accounts is itself blocked until the key exists. Confirm the actual account/container ID first via `GET https://tagmanager.googleapis.com/tagmanager/v2/accounts` once the SA key is usable, then invite there.
  - **GA4:** invite the SA under Property Access Management for whichever GA4 property the `GTM-KRDC75LR` container feeds (see below) — property ID also not yet confirmed live.
  - **Search Console:** invite the SA as a user under whichever verified property covers `wishlist-wizard.com` (production domain, per `.firebaserc`/`firebase_options.dart`).
  - **AdSense/Google Ads:** intentionally not connected via this SA — same as modulo-squares, AdSense's permission model doesn't support inviting a service account, it needs the owner's own interactive OAuth consent through a custom verified OAuth client, and Google Ads additionally needs a developer token application. Accepted limitation, not a gap.

**Auth pattern for using the SA once minted** (documented so it isn't rediscovered — two real gotchas cost time on modulo-squares):
1. `gcloud auth application-default login --scopes=...` for these APIs is blocked outright by Google for the shared gcloud CLI OAuth client ("This app is blocked") — don't attempt it.
2. `gcloud auth print-access-token --impersonate-service-account=...` silently ignores `--scopes` and returns a `cloud-platform`-only token, which none of these APIs accept (confirmed again this session: a `cloud-platform`-scoped token against `tagmanager.googleapis.com` returns `403 ACCESS_TOKEN_SCOPE_INSUFFICIENT`). Also confirmed this session: `gcloud auth print-access-token --scopes=...` run as a **human** account (not activated as the SA) fails outright — gcloud restricts custom `--scopes` on user credentials to a small fixed allowlist (`cloud-platform`, `drive`, etc.) that doesn't include analytics/tagmanager/webmasters scopes at all. The SA key is a hard prerequisite for any read access here, not just a nice-to-have. Once the key exists:
   ```bash
   gcloud auth activate-service-account --key-file=~/marketing-tools-service-key.json
   gcloud config set account marketing-tools-service@wishlist-wizard-prod.iam.gserviceaccount.com
   gcloud auth print-access-token \
     --scopes="https://www.googleapis.com/auth/analytics.readonly,https://www.googleapis.com/auth/tagmanager.readonly,https://www.googleapis.com/auth/webmasters.readonly" \
     --project=wishlist-wizard-prod > /tmp/token.txt
   curl -s -H "Authorization: Bearer $(cat /tmp/token.txt)" "https://tagmanager.googleapis.com/tagmanager/v2/accounts"
   gcloud config set account admin@nelsongrey.com   # restore afterward
   ```

**Resource IDs found in-repo (not yet cross-checked against live GTM/GA4 since read access is blocked):**
- Web GTM container: **`GTM-KRDC75LR`** — loaded in `packages/web/index.html` and referenced in `packages/web/client-src/AppRouter.tsx:164` ("Analytics is handled by GTM ... + Consent Mode v2"). Same container ID appears to be used across all web environments (no per-env GTM ID found), worth confirming isn't mixing dev/staging/prod traffic in one GTM container once live access exists.
- Firebase/GA4 measurement IDs (`packages/mobile/lib/firebase_options.dart`), one per Firebase project, mobile only:
  - prod: `G-EVSC05Z24C`
  - staging: `G-49ZJQVE5GH`
  - dev: `G-R9N3G478FF`
  - No `firebase_analytics` package dependency in `packages/mobile/pubspec.yaml` and no `FirebaseAnalytics` usage in `packages/mobile/lib/` — these measurement IDs are inert (present in generated `FirebaseOptions` from `flutterfire configure`, but nothing in the app actually sends events to them). Not a live conflict, just dead config.
- **Checked for the Firebase-Analytics-vs-GTM conflict pattern flagged elsewhere in this project's history** (don't run the Firebase Analytics SDK alongside GTM-managed GA4 on the same web property): the web app's `getAnalyticsTracker()` (`packages/firebase-utils/src/analytics.ts`) looks like a real Firebase Analytics wrapper by name, but its `sendToFirebase()` method is fully commented out (`// await analytics.logEvent(...)`) and only `console.log`s — it's an inert local stub, not live Firebase Analytics traffic. **No actual conflict today**: only `GTM-KRDC75LR` is live on the web property. Worth a note for whoever eventually wires `sendToFirebase()` up for real — don't do it on web without either dropping GTM's GA4 tag or routing both through server-side tagging, or this becomes the exact double-counting bug modulo-squares hit.
- **Separate, unrelated finding surfaced while cross-checking `.firebaserc`:** it defines a `"demonstration": "wishlist-wizard-demo"` project alias, but `wishlist-wizard-demo` is not visible to either `admin@nelsongrey.com` or `nelson.mark.a@gmail.com` (`gcloud projects describe wishlist-wizard-demo` → permission/not-found error under both). Either it's a real project under some other account/org this session can't see, or it's a stale alias pointing at nothing. Worth a 30-second check by whoever has broader access — low stakes, but the same class of "config says X, reality says something else" issue the GTM/GA4 audit is meant to catch, so flagging it here rather than silently dropping it.

**Once the SA key + product invites are done**, re-run the live audit this section describes (list GTM accounts/containers, list GA4 properties, list Search Console sites) and confirm no analogous issue to modulo-squares' contaminated-tags/orphaned-property finding exists here. This section should be updated with the actual GTM account/container ID, GA4 property ID, and Search Console site once confirmed live — the IDs above are inferred from source, not yet verified against the real API.

- [x] **Enable `analyticsadmin`, `analyticsdata`, `tagmanager`, `searchconsole`, `adsense` APIs on `wishlist-wizard-prod`** — Completed 2026-08-04
- [x] **Create `marketing-tools-service@wishlist-wizard-prod.iam.gserviceaccount.com`** — Completed 2026-08-04
- [ ] **Add project-scoped exception to `iam.disableServiceAccountKeyCreation` and mint the SA key** — Owner: _______ (exact commands above)
- [ ] **Invite the SA in GTM, GA4, and Search Console consoles** — Owner: _______ (confirm exact account/property/site IDs first via the live API once the key exists)
- [ ] **Re-run the live GTM/GA4/Search Console audit with real read access and confirm no contaminated tags / duplicate or orphaned properties**, mirroring the modulo-squares finding — Owner: _______
- [ ] **Check whether `wishlist-wizard-demo` (referenced in `.firebaserc`) is a real, live project or a stale alias** — Owner: _______

---

### 1.19 App Check E2E Blocker Fully Resolved — 12+ Cascading Bugs, Functions Deploy Migrated to WIF [RESOLVED — 2026-08-08/09]

What started as an attempt to close the §1.17 "live-verify staging App Check" item turned into the longest bug chain of this project's history. In rough order: the App Check debug-token gate needed reconfiguring; the `requirements:verify` CI gate was found broken by an earlier `REQUIREMENTS.md` rewrite and had to be restored (`cc99e31`); the `FIREBASE_TOKEN` GitHub secret had expired; a `deploy_only` job's `if:` condition never evaluated true — fixed once (`7d6040c`), then recurred from a job-level `permissions:` quirk and had to be fixed again (`24f1018`, moving `id-token` permission to workflow level); two E2E test races plus general flakiness required widening post-mutation wait timeouts from 10s to 20s (`7e78628`) and removing race-prone reloads from `T1.4`/`T1.6`/`ensureWishlistExists` (`321145c`, `97ac78b`, `7c9c01a`); three copy-pasted null-price crashes were found and fixed as a real user-facing bug (see §1.20); an Android `google-services.json` symlink broke CI's environment-switching (see §1.20); and — the largest single piece of work — the Firebase Functions/Firestore deploy was migrated from a long-lived service-account-key secret to Workload Identity Federation (`175bf5a`), discovering the required IAM roles incrementally across dev/staging/prod.

**Result:** run `31333669130` (2026-08-09) was the first time this pipeline has ever gone green across Web UAT (webkit/firefox/chromium), Quality Gate, Build Android App, Build Web App, and Deploy Firebase to development simultaneously. (The overall workflow still shows red on that run — see §1.20 for why: an Android Play Store upload failure that predates the versionCode fix, and the Chrome Web Store publish step, which is deliberately manual-only per §1.20 — neither is an App Check or WIF regression.)

- [x] **Diagnose and fix the App Check debug-token / enforcement gate blocking automated E2E** — Completed 2026-08-08/09
- [x] **Restore the `requirements:verify` CI gate broken by the `REQUIREMENTS.md` rewrite** — Completed 2026-08-09 (`cc99e31`)
- [x] **Rotate the expired `FIREBASE_TOKEN` GitHub secret** — Completed 2026-08-09
- [x] **Fix `deploy_only`'s `if:` condition never evaluating true (twice — second time from a job-level `permissions:` quirk)** — Completed 2026-08-09 (`7d6040c`, `24f1018`)
- [x] **Fix E2E test races and widen post-mutation timeouts (10s → 20s)** — Completed 2026-08-09
- [x] **Migrate Firebase Functions/Firestore deploy to Workload Identity Federation** — Completed 2026-08-09 (`175bf5a`), 11 IAM roles across dev/staging/prod, discovered incrementally
- [x] **Achieve a fully green run of Web UAT + Quality Gate + Android/Web build + Deploy Firebase in the same pipeline execution** — Completed 2026-08-09, run `31333669130`

---

### 1.20 Mobile Launch-Readiness Closeout — Three Crash Bugs, a CI Config Bug, an Unverified Android Fix [PARTIALLY RESOLVED — 2026-08-08/09]

A launch-readiness pass on mobile found and fixed real bugs, separate from the App Check/CI chain in §1.19:

- **Three copy-pasted `item.price.replace()` null crashes** (`905fc82`, `827ecdb`) — `ContributionDialog` and two other call sites crashed the whole page for any item with no price set. Real user-facing bug, not a test artifact. Fixed 2026-08-08/09.
- **`google-services.json` committed as a symlink** (`d6eb0fc`) — broke Android CI's environment-switching (dev/staging/prod use different Firebase configs); a symlink checked out on a CI runner doesn't resolve the way a real per-environment file needs to. Fixed by committing the real files.
- **Barcode lookup wired into the Add Item screen** (`a7054f4`, 2026-08-08) — `lookupBarcode` has been live on the backend since the functions/api-router migration, but nothing in the mobile app ever called it; the scan screen only offered camera-photo-capture and manual text entry. This was flagged as dead UI in the 2026-08-08 doc-alignment audit and fixed the same window.
- **Android Play Console `versionCode` collision** (`f658db0`, 2026-08-09) — a real deploy blocker: "Deploy Android to Play Store" failed with `Version code 1 has already been used` on run `31333669130` and its immediate predecessors. Fixed by bumping `pubspec.yaml` to `1.0.0+3`. **Confirmed live 2026-08-10**: a targeted `android_deploy_only` run against `development` (run `31400683595`) succeeded — "Deploy Android to Play Store" → "Upload to Google Play (internal track)" completed in 49s. The run's overall status still shows red, but only from the unrelated, already-known-deferred Chrome Web Store publish step (see below) — not an Android/versionCode regression.
- **Confirmed 2026-08-09: Chrome Web Store submission is genuinely manual-only** for a first-time listing — no API path exists — and is deliberately deferred by the user, not an oversight or gap.

- [x] **Fix three copy-pasted null-price crash bugs** — Completed 2026-08-08/09
- [x] **Fix `google-services.json` symlink breaking Android CI env-switching** — Completed 2026-08-09
- [x] **Wire barcode lookup into the mobile Add Item screen** — Completed 2026-08-08
- [x] **Fix Android Play Console `versionCode` collision in code** — Completed 2026-08-09
- [x] **Trigger a pipeline run and confirm "Deploy Android to Play Store" actually succeeds** — Completed 2026-08-10, run `31400683595` (`android_deploy_only`/`development`), upload succeeded in 49s

**Addendum, 2026-08-10 — a new instance of the §1.17 root-lockfile-drift bug blocked Stripe fix verification.** Attempting to deploy-verify the §1.18/Part 5 Creator/Business Stripe fix (`deploy_only`/`staging`, run `31400850560`) failed at "Build Web App → Install Dependencies," before Functions ever deployed:

```
npm error Invalid: lock file's @typescript-eslint/eslint-plugin@8.66.0 does not satisfy @typescript-eslint/eslint-plugin@5.62.0
```

Root cause, same shape as §1.17's original finding: the private `wishlist-wizard-functions` companion repo is checked out fresh into `packages/functions/` on every CI run, and its `staging` branch now declares `@typescript-eslint/eslint-plugin: ^5.12.0` (commit `124e56b`, "resolve typescript/@typescript-eslint peer conflict from Dependabot") — but the root `package-lock.json` in *this* repo is locked to `^8.66.0`/`^8.65.0`. The 2026-08-09 lockfile sync (`6d23b27`) fixed this exact tension once; the companion repo has since drifted again. This will block **any** deploy off `staging` (or likely `main`, worth checking) until the root lockfile is regenerated against the companion repo's current `staging` branch, per the fix procedure already documented in §1.17.

- [x] **Regenerate root `package-lock.json` against `wishlist-wizard-functions`'s current `staging` branch** — Completed 2026-08-10 (commit `3d8b927`); nests a nested `@typescript-eslint/*@5.x` copy under `packages/functions` alongside the root's hoisted `8.x`, satisfying both without touching root/shared/web's own `^8.0.0` requirement. Verified `npm ci` + `npm run lint` clean before pushing.
- [x] **Re-attempt the Stripe Creator/Business `deploy_only`/`staging` verification** — Attempted 2026-08-10 (run `31402756524`); the lockfile fix worked (`Install Dependencies` now passes), but surfaced a **second, unrelated real bug that blocks this same deploy**: `packages/functions/src/api/admin.ts` (both `staging` and `main` branches of the companion repo — confirmed identical, `git diff origin/staging origin/main -- src/api/admin.ts` is empty) calls `Array.prototype.at()` three times, which needs an ES2022+ `lib` target. `staging`/`main`'s `tsconfig.json` has no `lib` override (defaults from `target: es2017`); `develop`'s does (`"lib": ["ES2022", "DOM"]`) — that's why this has never surfaced before: no staging/main Functions deploy has reached the `tsc` build step since `.at()` was introduced on `develop` and the code (but not the tsconfig fix) made it into `staging`/`main`. **This means Functions on `staging` and `main` currently cannot build at all — a deploy-blocker independent of the Stripe fix.** Not yet fixed — flagged for a decision below rather than fixed unprompted, since it's a code change in the private companion repo affecting two branches.
- [x] **Add `"lib": ["ES2022", "DOM"]` to `staging`/`main`'s `tsconfig.json` in `wishlist-wizard-functions`, mirroring `develop`'s already-working config, then re-verify the staging deploy** — Completed 2026-08-10 (commits `53aade0`/staging, `c12e39f`/main), verified with a real local `tsc`/`npm run build` pass on both branches before pushing.

**Addendum 2, 2026-08-10 — a third, more severe finding: `staging` is currently locked out for everyone, not just CI.** With the lockfile and tsconfig bugs both fixed, a re-triggered `deploy_only`/`staging` run (`31403440280`) revealed a separate, already-documented bug: **`deploy_only` skips the "Deploy Firebase" job outright** (it shows "skipped," not "success" — this is the still-open `deploy_only` if-condition issue named in the App Check saga memory; use `build_and_deploy` instead). Re-triggering with `build_and_deploy`/`staging` (run `31403715222`) got further and failed at **Web UAT**, all three browsers, on a `beforeAll` timeout trying to fill `register-email-input` — the test never found that element.

Root cause: `EnvironmentPasswordGate.tsx` password-gates the `staging`/`demonstration` environments behind `VITE_NON_PROD_SITE_PASSWORD` (added in the §1.17-era `ComingSoon.tsx`→`EnvironmentPasswordGate` swap). **No `NON_PROD_SITE_PASSWORD_STAGING` GitHub secret exists** (confirmed via `gh secret list`, repo- and org-level, and via `gh secret list --env staging`) — so the built staging site renders `EnvironmentPasswordGate`'s "Environment Is Locked" misconfiguration page (`data-testid="env-password-misconfigured"`) for **every visitor**, not a deliberate 30-second password box. There is no password anyone could type to get in — the gate has no configured secret to check against. This means:

- Any human wanting to manually test staging right now hits the same locked page.
- The Playwright E2E suite has **zero** handling for this gate anywhere (`grep` across `packages/web/e2e/` for `NON_PROD_SITE_PASSWORD`/`SitePassword` returns nothing) — even with a real password configured, Web UAT against staging would still fail today.
- This has likely been broken since the `EnvironmentPasswordGate` mechanism was introduced (§1.17, ~2026-07-20) — no staging Web UAT run had gotten this far past the lockfile/tsconfig blockers to surface it until today.
- **The Stripe Creator/Business fix still has not been confirmed live** — this is now the fourth blocker in the chain, and unlike the first three it isn't something to silently fix (it needs either a real password value from the user, or a decision to disable the gate for staging).

**Deliberately not pursued further as of 2026-08-10.** This project is not close enough to launch for staging-access CI green to be the priority, and `EnvironmentPasswordGate`/environment-gating is exactly the kind of on/off-switch infrastructure that shouldn't be touched without a real product decision behind it — not fixed reflexively while chasing an unrelated CI run green. Left here as a documented, real, currently-live gap rather than an active to-do:

- [x] **Decide and set a real `NON_PROD_SITE_PASSWORD_STAGING` GitHub secret, or deliberately disable the staging gate** — Resolved 2026-08-10: real secret set (also removed the hardcoded fallback passwords the workflow had been silently using), manually deployed to staging, verified live.
- [x] ~~Add E2E handling for the environment password gate so Web UAT can run against `staging`/`demonstration` at all~~ — Moot: the `demonstration` environment was removed entirely on 2026-08-10 (never had real infrastructure behind it). E2E handling for the `staging` gate is still an open item if Web UAT needs to run against staging in the future.
- [ ] **The Stripe Creator/Business fix can still be verified against `wishlist-wizard-dev`** (not password-gated) **without touching the staging gate at all** — a lower-effort path forward whenever this becomes a priority again — Owner: _______

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
- [x] ~~`VITE_SHOW_COMING_SOON_*`~~ — **stale, this env var doesn't exist in the current codebase.** Superseded 2026-07-20 by a hardcoded check in `AppRouter.tsx` (see §1.17) — no env var to set.
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
- [x] App version set (`1.0.0+3`), `versionCode` incremented past the collision found 2026-08-09 — **confirmed live 2026-08-10 via a real internal-track upload, see §1.20**
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
- [x] **AdMob:** Real ad unit IDs and App IDs wired for Android and iOS (2026-08-05, replacing test IDs) — not yet independently live-verified from this document's audit trail, but shipped and promoted through staging/main
- [ ] **Auth password policy:** Firebase Auth password policy enforcement added 2026-08-09, alongside a fix for a broken password-reset flow found in the same pass — re-verify the reset flow end-to-end before launch (ties into §3.4's "Password reset email sent and received" smoke test)

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

- [ ] `WISHLIST_WIZARD_GO_LIVE.md` exists (in root or `docs/`) — Owner: _______
- [ ] `RELEASE_SUMMARY.md` exists (in root or `docs/`) — Owner: _______
- [ ] `E2E_TESTING_GUIDE.md` exists (in root or `docs/`) — Owner: _______
- [ ] `FIREBASE_STRATEGY.md` exists (referenced in README) — Owner: _______
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

- **Personal price-drop alerts** — status as of 2026-07-16 was coded (`firebase-price-tracking.ts`) but not exported from the Functions deploy entrypoint. The 2026-07-23 router-pattern migration touched all 63 callables and the price-intelligence feature saw substantial work afterward (retailer scope, market coverage, replay-status observability — see `packages/functions` companion-repo history), but whether price-drop alerts specifically are now exported/live has **not been re-checked since** — verify before assuming either way. (Multi-retailer comparison-shopping, a related but separate feature, **is** live via SerpAPI.)
- **Affiliate monetization** — click/conversion tracking, revenue aggregation, **and** the creator-facing dashboard and payout system are now all live and deployed to dev (built 2026-07-20/21: full ledger/reconciliation/Stripe Connect backend, tier-gated creator dashboard live-verified). See the corrected "Creator dashboard & payouts" entry below — this bullet and that one describe the same, now-complete body of work.
- **Browser extension coupon finder & price comparison** — UI is complete but calls backend endpoints that don't exist anywhere in the repo (`/api/extension/coupons`, `/api/extension/price-comparisons`); either implement the backend or remove the UI before it's user-facing at scale. No change since 2026-07-16.
- **Creator dashboard & payouts** — **corrected 2026-08-10: this is built, not unstarted.** `packages/web/client-src/pages/CreatorProgram.tsx`, `components/creator-dashboard/PayoutReadinessPanel.tsx`, and `components/dashboard/CreatorOverview.tsx` exist and are wired up; the backend ledger/reconciliation/Stripe Connect payout system was built and deployed to dev 2026-07-20/21, and the dashboard's tier-gating was live-verified. **However, as of 2026-08-09 the Creator/Business Stripe checkout tier itself was found broken in all three environments** — `router.ts` never bound the Creator/Business price-ID secrets (a code bug present since the router migration), compounded by the dev/staging secret values themselves holding the wrong field from a pasted `KEY=LABEL=price_id=amount` list (a data bug across all 16 price secrets). Both were fixed and pushed 2026-08-09. A deploy-verification attempt 2026-08-10 (staging) was blocked before it reached the Functions deploy step by a fresh lockfile-drift bug — see the §1.20 addendum. **Don't treat Creator/Business signup as launch-ready until that's confirmed live.**
- **Social network & discovery** — no code beyond a page literally named `SocialIntegrationDemo.tsx`. Treat as unstarted, not partial. No change since 2026-07-16.
- **iOS/Android native platform features** — Siri Shortcuts, App Clips, iCloud sync, Handoff, Google Assistant integration, home-screen widgets: zero code exists (the app is Flutter, not native Swift/Kotlin as earlier docs claimed — see `docs/PRODUCT_DESIGN.md` Feature 6). No change since 2026-07-16.
- **Stripe group gifting payments** — status unclear post-router-migration; the Creator/Business price-ID binding bug found 2026-08-09 (above) is evidence this area hasn't had a full pass recently. Must be either fully implemented and tested, or gated behind a feature flag set to OFF at launch — verify current state before assuming the 2026-07-16 "2 callables warn in smoke tests" characterization still holds.
- **AI-powered recommendations** — **not applicable / do not provision.** `OPENAI_API_KEY` does not appear anywhere in the live codebase; recommendations are Firestore-backed (pattern-matching on user activity), not model-backed, and public copy was deliberately reworded away from "AI" framing. Re-introduce only if a real model integration is built.
- **Barcode lookup** — **corrected 2026-08-10: wired into the mobile Add Item screen 2026-08-08** (see §1.20). The backend has been ready since the router migration; the gap was purely a dead UI path, now closed.
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
| Documentation: WISHLIST_WIZARD_GO_LIVE.md | Exists | Warn |
| Documentation: RELEASE_SUMMARY.md | Exists | Warn |
| Documentation: E2E_TESTING_GUIDE.md | Exists | Warn |
| Playwright in package.json | Present | Warn |
| Node modules installed | node_modules/ exists | Warn |
| TypeScript config | tsconfig.json present | Warn |
| Firebase config exists | firebase.json or firestore.rules | Warn |
| Requirements matrix verification | npm run requirements:verify passes | Yes |

---

*This document was originally generated from analysis of the wishlist-wizard repository at commit state as of 2026-06-16, and updated 2026-07-16 following a full audit + recovery pass (see "Current Deliverable Status" near the top, and §1.7/§1.8). The 2026-06-16 analysis did not catch the production gate bug in §1.7 — treat any "Complete"/"Resolved" status in this document that predates 2026-07-16 as unverified until spot-checked against code. Update this document as the codebase evolves.*
