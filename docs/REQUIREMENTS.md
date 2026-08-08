## REQUIREMENTS & IMPLEMENTATION STATUS

Status Legend:
- ✅ Implemented (feature present & wired end‑to‑end)
- 🟡 Partial (some code / scaffolding exists but incomplete, missing flows, or placeholders)
- 🔴 Not Implemented (no meaningful code yet / only future mention)

Verification Policy:
- ✅ only counts as release-ready when the requirement is mapped in `docs/requirements-verification.json`.
- Execution sequencing is persona-first via `docs/DESIGN_EXECUTION_MATRIX.md` derived from `docs/PRODUCT_DESIGN.md`.
- Enforced requirements in the matrix must be `verificationStatus: "verified"` with evidence and `lastVerifiedAt`.
- Enforced requirements must also include `persona`, `flow`, and `designRef` linkage to product design intent.
- CI validation runs via `npm run requirements:verify` and publishes `artifacts/requirements-verification-report.json`.
- Matrix rollout is phased: enforced items block CI now; strict-all mode can be enabled later with `REQUIREMENTS_STRICT_ALL=true`.

---
### 0. Architecture Baseline (read this first)

The stack described in this document is **Firebase-first**, not the earlier Express/Postgres design. On
2025-10-16, commit `8581cfa` ("Complete Firebase-first migration: remove Express API server") deleted the
Express server, session/JWT auth, and the Drizzle/Postgres schema entirely. Every row below reflects the
codebase as it exists today, 2026-08-08. Any evidence path under `server/`, `shared/schema.ts` (Drizzle
tables), `emailService.ts`, or `recommendationService.ts` describes dead code and should not appear here —
if you find it elsewhere in the docs tree, treat it as historical/stale.

| Layer | Technology | Location |
|---|---|---|
| Backend | Firebase Functions (TypeScript, Node), Firestore-backed | `packages/functions/` — source lives in a **private companion repo** (`NelsonGrey/wishlist-wizard-functions`, extracted 2026-07-17); CI checks it out automatically, local dev clones it into the gitignored `packages/functions/` path |
| Frontend (web) | React 19 + TypeScript + Vite | `packages/web/client-src/` |
| Mobile | **Flutter (Dart)** — not React Native | `packages/mobile/lib/` |
| Database | Firestore (NoSQL) — not PostgreSQL/Drizzle | Firestore collections, no `shared/schema.ts` tables |
| Browser Extension | Manifest V3 JS | `packages/browser-extension/` |
| Shared types | TypeScript package | `packages/shared/` |

`packages/api-server/` exists in the tree but contains only a gitignored `dist/` build artifact — it is not
a tracked package and is not part of the current architecture.

### 1. Core Platform
| Area | Requirement | Status | Evidence / Notes |
|------|-------------|--------|------------------|
| User Accounts | Register, login, logout via Firebase Auth | ✅ | `packages/web/client-src/lib/firebase.ts` wraps Firebase Auth SDK (email/password, session persistence); `createUserProfile`/`getUserProfile`/`updateUserProfile` standalone `onCall` functions in `packages/functions/src/auth/index.ts`. No custom session/JWT layer — Firebase ID tokens are the only auth mechanism. |
| Password Policy | Enforced password strength rules | ✅ | Firebase Auth's `validatePassword()` SDK call is used directly — `packages/web/client-src/lib/firebase.ts:493`; mirrored on mobile via `packages/mobile/lib/services/password_policy_service.dart` and `login_screen.dart`. No app-level bcrypt/regex step; policy is configured and enforced server-side by Firebase Auth itself. |
| Account & Data Deletion | Full account + owned-data deletion (Apple/Google store requirement) | ✅ | `packages/functions/src/api/accountDeletion.ts` (`deleteAccount`, routed through the `api` router) hard-deletes wishlists/items/notifications/price tracking/calendar/FCM/sync/achievements/subscriptions/creator payout accounts, cancels Stripe subscription, deauthorizes Stripe Connect, revokes calendar OAuth; anonymizes (not deletes) `commissionLedger`/`payoutBatches`/`affiliateConversions` for accounting/legal retention. Wired into web (`Settings.tsx`) and mobile (`main.dart`, `firebase_functions_service.dart`). |
| Wishlists | CRUD wishlists, share public link via `shareId` | ✅ | Router endpoints in `packages/functions/src/api/wishlists.ts` (`getUserWishlists`, `getWishlistById`, `getSharedWishlist`, `createWishlist`, `updateWishlist`, `deleteWishlist`), dispatched via `packages/functions/src/api/router.ts`. Frontend `Wishlists.tsx`, `WishlistDetail.tsx`, `SharedWishlist.tsx`. |
| Items | CRUD items, list per wishlist, reserve/purchase | ✅ | `addWishlistItem`/`updateWishlistItem`/`deleteWishlistItem`/`getWishlistItems`/`reserveWishlistItem`/`purchaseWishlistItem` — all on the `api` router (moved off standalone `onCall` after a live gcloud IAM audit showed the "public invoker" option silently no-ops under the project's org policy). |
| Notifications (in‑app) | Create & fetch notifications, unread count, mark read/delete | ✅ | `getUserNotifications`/`markNotificationAsRead`/`markAllNotificationsAsRead`/`deleteNotification`/`getNotificationSettings`/`updateNotificationSettings` on the `api` router; `createSystemNotification`/`cleanOldNotifications` remain standalone `onCall` (`packages/functions/src/api/notifications.ts`). Push delivery via FCM triggers (`notifyItemAdded`, `notifyItemReserved`, `notifyItemPurchased`, `notifyPriceAlert`) in `packages/functions/src/fcm.ts`. Frontend `Notifications.tsx`. |
| Achievements | Computed-on-read achievement/reward program with tiers | ✅ | `getUserAchievements` on the `api` router at `GET /api/achievements` (`packages/functions/src/api/achievements.ts`), shipped 2026-07-23. Merge-never-regress semantics: recompute merges with prior earned state so an achievement can never be lost if the underlying signal later drops (e.g. deleting the wishlist that earned it). Frontend page `packages/web/client-src/pages/AchievementsGuide.tsx` at `/app/achievements`; Trophy Case tier badges added since. |

### 2. Advanced Features
| Feature | Requirement | Status | Evidence / Notes |
|---------|-------------|--------|------------------|
| Price Tracking | Track price history, price alerts, price drop query | ✅ | Live, not a future item. `packages/web/client-src/pages/PriceTracking.tsx`; backend `packages/functions/src/api/priceHistory.ts`, `priceIntelligenceRefresh.ts` (`refreshPriceIntelligenceOffers` on the router; `scheduledRefreshPriceIntelligenceOffers`/`scheduledEvaluatePriceAlerts` as Cloud Scheduler triggers, unaffected by the router migration). |
| Recommendations | Personalized item recommendations, Firestore-backed | 🟡 | **Not model-backed** — no OpenAI or any LLM call anywhere in the codebase (confirmed: no `openai` reference in `packages/functions/src`; README.md states this explicitly). Frontend `Recommendations.tsx` + `components/recommendations/RecommendationsSection.tsx` calls `/api/recommendations*`; status/dismissal flow exists. Depth of the underlying ranking logic wasn't independently audited beyond confirming it is Firestore-data-driven, not AI-driven — flagged partial pending a closer read of the recommendations endpoint implementation. |
| Calendar Integration | Internal events + external calendar connections & sync | 🟡 | `getCalendarEvents`/`createCalendarEvent`/`updateCalendarEvent`/`deleteCalendarEvent`/`getCalendarAuthUrl`/`connectCalendar`/`getCalendarConnections`/`syncCalendarConnection`/`syncCalendar` etc. all moved to the `api` router (`packages/functions/src/api/calendar.ts`). Frontend `Calendar.tsx`. External provider OAuth depth not independently re-verified this pass — carried as partial from the prior audit. |
| Group / Social Gifting | Group contributions, Stripe-based payment intents | ✅ | `createGroupPaymentIntent`/`confirmGroupContribution`/`getGroupGiftSummary` — standalone `onCall` functions in `packages/functions/src/api/groupPayments.ts` (exported as `groupPaymentCreateIntent`/`groupPaymentConfirm`/`groupGiftSummary`), using real Stripe PaymentIntents rather than a placeholder. |
| Privacy / Sharing Controls | Per-entity privacy settings | ✅ | Frontend `PrivacySettings.tsx` at `/app/privacy-settings`; enforcement wired per the 2026-07 drift-audit recovery. |
| Affiliate Link Generation & Tracking | Convert product links to affiliate links, track clicks | ✅ | `linkConvert`/`linkConvertBatch`/`linkConvertWishlist`/`linkTrackClick`/`linkPrograms`/`linkStats`/`linkDisclosure` on the `api` router. Public marketing pages `AffiliateCommissions.tsx`, `CreatorProgram.tsx`. |
| Affiliate/Creator Monetization | Commission ledger, reconciliation, Stripe Connect payouts | ✅ | Shipped 2026-07-21. Commission ledger state machine `Tracked → Pending → Approved → Payable → Paid`, with a `Reversed` branch reachable from any pre-Paid state and a post-payout-Paid clawback path — `packages/functions/src/api/commissionLedger.ts`. Report-based reconciliation ingestion in `affiliateReconciliation.ts`. Stripe Connect Express account creation/onboarding/status in `creatorPayoutAccount.ts`. Payout batch processing (`processPayoutBatch`, scheduled `scheduledPayoutBatchRun`) and creator payout history in `payouts.ts`. Tracking-ID pool management in `creatorTracking.ts`. All admin/creator-facing callables now live on the `api` router (moved off standalone `onCall`, same org-policy reason as elsewhere); `advanceCommissionsPastHold`, `affiliateReportImportProcess`, `scheduledPayoutBatchRun` remain standalone as scheduled/trigger functions. Creator-facing UI folded into the unified `Dashboard.tsx`'s Creator tab (`/app/creator-dashboard` now redirects to `/app/dashboard?tab=creator`) via `packages/web/client-src/components/creator-dashboard/*` (`CommissionStatusPanel`, `PayoutReadinessPanel`, `PerformancePanel`, `AdjustmentsPanel`, `CommissionStateBadge`). Admin tooling at `/admin/affiliate` (`pages/admin/AffiliateAdmin.tsx`). |
| AR Visualization | AR model lookup | 🟡 | `getARModel` (exported as `arModelLookup`) remains a standalone `onCall` in `packages/functions/src/api/ar.ts` — not yet moved to the router, so its live reachability under the org's invoker-binding policy was not independently verified this pass. |
| Barcode Scanning | Scan-to-add items | 🟡 | Mobile `scan_item_screen.dart` offers camera photo capture (`image_picker`) plus manual URL/name entry, **not** live barcode decoding — a code comment notes `mobile_scanner` was dropped due to a `GTMSessionFetcher` version conflict with Firebase 12.x. A barcode *lookup* backend exists (`lookupBarcode` in `packages/functions/src/api/mobile.ts`, queries Open Food Facts) but nothing in the mobile UI currently calls it with a scanned code. |
| Cross-Device Sync | Device registry & sync logs | ✅ | `registerDevice`/`listDevices`/`updateDevice`/`logSyncEvent`/`getSyncLogs`/`syncMobileActions` all live on the `api` router (`packages/functions/src/api/sync.ts`); mobile `sync_service.dart` present. Upgraded from the prior "tables exist, unused" status. |
| In-App Purchases (mobile) | Native StoreKit/Play Billing subscriptions | ✅ | Replaced Stripe checkout on mobile (commit `ab09174`). `packages/mobile/pubspec.yaml` depends on `in_app_purchase: ^3.2.0`; `packages/mobile/lib/services/iap_service.dart`; backend verification via `verifyPurchase`/`restorePurchase` on the `api` router (`packages/functions/src/api/iap.ts`). |
| AdMob (mobile) | Ad monetization | ✅ | `google_mobile_ads: ^6.0.0` in `pubspec.yaml`; real production AdMob App IDs wired for both platforms (commits `c60c204`, `5a11659`, `15c8ee8`) — `ca-app-pub-5198775482699756~1528233576` in `android/app/src/main/AndroidManifest.xml`, `ca-app-pub-5198775482699756~9682055763` in `ios/Runner/Info.plist`. `admob_service.dart` present. |
| Subscriptions & Billing (web) | Stripe Checkout/Portal subscription management | ✅ | `billingStatus`/`billingPlans`/`billingCheckout`/`billingPortal` on the `api` router (`packages/functions/src/api/subscriptions.ts`); `billingWebhook` remains standalone `onRequest` (Stripe calls it directly, not through the browser). Frontend `Subscription.tsx`, `Subscriptions.tsx`. |

### 3. Browser Extension
| Area | Requirement | Status | Evidence / Notes |
|------|-------------|--------|------------------|
| Auth | Extension auth against Firebase backend | ✅ | `authenticateExtension` in `packages/functions/src/api/extension.ts`; also HTTP-callable `extensionGetWishlists`/`extensionCreateWishlist`/`extensionAddItem`/etc. in `http-extension.ts`, both standalone-exported from `index.ts`. |
| Wishlist Integration | Fetch wishlists & add items from pages | ✅ | `getExtensionWishlists`, `addItemFromExtension`, `createExtensionWishlist`, `deleteExtensionItem`, `shareExtensionWishlist`, content/background scripts in `packages/browser-extension/`. |
| Event Tracking | Track extension events | ✅ | `getExtensionAnalytics`, `trackExtensionEvent`; analytics tracking in `background.js`. |
| Product Detection / Quick Add / Manual Entry | Extract product metadata, one-click add, manual fallback | 🟡 | Carried forward unverified this pass — not re-audited beyond confirming the extension package and its Firebase-backed endpoints still exist. Prior audit rated these ✅; re-verify before relying on that rating. |

### 4. Mobile Application (Flutter — corrects prior "React Native" description)
| Area | Requirement | Status | Evidence / Notes |
|------|-------------|--------|------------------|
| Core App | Auth, wishlist list/detail, add item | ✅ | Flutter/Dart, `packages/mobile/lib/`: `screens/home_screen.dart`, `firebase_wishlists_screen.dart`, `login_screen.dart`, `account_screen.dart`, Provider-based state (`providers/`), `services/firestore_service.dart`, `services/wishlist_service.dart`, `services/api_client.dart`. Firebase Auth via `firebase_auth_service.dart`. |
| Push Notifications | Price drops, updates | ✅ | `services/fcm_service.dart`, `fcm_integration_example.dart`; backend triggers in `packages/functions/src/fcm.ts` (`notifyPriceAlert`, etc.). |
| In-App Purchases | Native subscription billing | ✅ | See section 2 — `iap_service.dart` + `in_app_purchase` package, replacing Stripe checkout on mobile. |
| AdMob | Ad monetization | ✅ | See section 2 — `admob_service.dart`, real production App IDs. |
| Price Tracking | Mobile price tracking screen | ✅ | `screens/price_tracking_screen.dart`. |
| Cross-Device Sync | Sync mobile actions to backend | ✅ | `services/sync_service.dart` + `syncMobileActions` on the `api` router. |
| Barcode / Camera Add | Add via camera / barcode scan | 🟡 | See section 2 — camera photo capture only; no live barcode decode wired despite a lookup backend existing. |
| AR & Camera Integration | AR view | 🔴 | No AR UI found under `packages/mobile/lib`; only the backend `arModelLookup` stub exists (see section 2). |

### 5. Data Model
Firestore, not PostgreSQL/Drizzle — there is no `shared/schema.ts` table-based schema. Collections include
(non-exhaustive, inferred from function code): `users`, `wishlists`, `wishlistItems`, `notifications`,
`userAchievements`, `commissionLedger`, `payoutBatches`, `affiliateConversions`, `affiliateClicks`,
`priceHistory`/`priceAlerts`, `calendarEvents`/`userCalendars`, `devices`/`syncLogs`, `subscriptions`.
Type definitions shared between backend and frontend live in `packages/shared/`.

### 6. Authentication & Security
| Aspect | Status | Notes |
|--------|--------|-------|
| Firebase Auth (email/password) | ✅ | No custom session store or JWT signing — Firebase ID tokens verified server-side via `firebase-admin/auth`. |
| Password Policy | ✅ | See section 1 — enforced via `validatePassword()`, not app-level rules. |
| Account/Data Deletion | ✅ | See section 1. |
| App Check | ✅ | `requireAppCheckHTTP` gate used in the `api` router (`packages/functions/src/api/router.ts`, `packages/functions/src/utils/app-check.js`). A documented gotcha exists where `requireAppCheck` + the router needed careful wiring (see project memory `project_product_preview_router_fix.md`). |
| Super-Admin | ✅ | `bootstrapSuperAdmin`, `grantAdminRole`, `revokeAdminRole` standalone `onCall`; `adminGetUsers`/`adminSuspendUser`/`adminModifySubscription`/`adminGetSupportTickets`/`adminRespondToTicket`/`adminGetAuditLog` on the `api` router (confirmed via live gcloud IAM audit that none had a working `allUsers` invoker binding as standalone functions). Frontend admin pages under `pages/admin/`. |
| 2FA | 🔴 | No evidence of a 2FA flow found in web, mobile, or functions source. |

### 7. API Architecture — router vs. standalone `onCall` (new section)
Around 2026-07-23, most `onCall` functions requiring public (unauthenticated-caller) invocation were moved
off standalone Cloud Functions onto a single HTTP router, because a GCP Domain Restricted Sharing org policy
blocks granting new `allUsers` Cloud Run invoker bindings — a standalone `onCall` function deployed under
this policy silently never becomes reachable, even with `{ invoker: 'public' }` set (confirmed via a live
`gcloud` IAM audit, not just code inspection).

- **Router** (`packages/functions/src/api/router.ts`, exported as `api`): dispatches HTTP requests to
  handler functions for wishlists/items, notifications, FCM, achievements, affiliate/creator (tracking,
  commission ledger, reconciliation, Connect payouts), billing/subscriptions, group payments, calendar,
  contacts, device sync, analytics, price intelligence refresh, IAP verification, account deletion, and
  admin operations. This is now the majority of the public-facing API surface — broader than "some
  endpoints," effectively the primary integration point for the web and mobile clients.
- **Standalone `onCall`/`onRequest`** (still exported directly from `packages/functions/src/index.ts`):
  `createUserProfile`/`getUserProfile`/`updateUserProfile` (auth), generic `createDocument`/`getDocument`/
  `updateDocument`/`deleteDocument`/`listDocuments`/`batchCreateDocuments`/`batchUpdateDocuments` (CRUD),
  extension HTTP endpoints, `createSystemNotification`/`cleanOldNotifications`, FCM trigger functions,
  `bootstrapSuperAdmin`/`grantAdminRole`/`revokeAdminRole`/`createSupportTicket`, `checkoutSessionCreate`,
  `stripeWebhook`/`billingWebhook` (called directly by Stripe, not the browser), `arModelLookup`, and
  several Cloud Scheduler trigger functions (`scheduledAdKpiSnapshot`, `scheduledRefreshPriceIntelligenceOffers`,
  `scheduledEvaluatePriceAlerts`, `scheduledPayoutBatchRun`, `advanceCommissionsPastHold`,
  `affiliateReportImportProcess`). `index.ts` retains detailed comments documenting which functions were
  migrated and why, including a note that several "read" functions were previously believed to have working
  public bindings but did not.

### 8. Notifications & Email
| Component | Status | Notes |
|-----------|--------|-------|
| In-App Notifications | ✅ | CRUD & unread count — see section 1. |
| Push Notifications (FCM) | ✅ | See sections 1 and 4. |
| Transactional Email | ✅ | **No SendGrid.** Uses Google Workspace SMTP via Nodemailer (`packages/functions/src/email.ts`), per README.md's explicit note: `SENDGRID_API_KEY` is not required and SendGrid is not used anywhere in this codebase. |

### 9. External Integrations
| Integration | Status | Notes |
|------------|--------|-------|
| OpenAI | 🔴 removed | Not present anywhere in the codebase. Recommendations are Firestore-backed, not model-backed (README.md explicit note). Any doc still describing `recommendationService.ts`/`OPENAI_API_KEY` usage is describing deleted pre-migration code. |
| SendGrid | 🔴 removed | Not present anywhere in the codebase; replaced by Workspace SMTP + Nodemailer (see section 8). |
| Stripe | ✅ | Checkout/Portal billing (`stripe.ts`, `subscriptions.ts`, `stripeWebhook.ts`), Stripe Connect Express for creator payouts (`creatorPayoutAccount.ts`, `payouts.ts`), and PaymentIntents for group gifting (`groupPayments.ts`). |
| Firebase (Auth, Firestore, Functions, App Check, FCM, Cloud Scheduler) | ✅ | Core platform — see section 0. |
| Google Analytics / GTM | ✅ | GTM container loaded in `index.html` with Consent Mode v2; `useAnalytics`/`trackPageView` in `AppRouter.tsx`. |
| AdMob | ✅ | See section 2/4. |
| Calendar Providers (Google/Outlook/Apple) | 🟡 | Router endpoints exist (`calendar.ts`); OAuth token-exchange depth not re-verified this pass — carried forward as partial. |
| Open Food Facts (barcode lookup) | 🟡 | Backend call exists (`lookupBarcode`) but not wired to a live mobile scan UI — see section 2/4. |

### 10. Frontend (Web) Feature Routes
From `packages/web/client-src/AppRouter.tsx` (current as of the router migration to a unified Dashboard
with tabs — several routes below are **redirects** to a `?tab=` query param on `/app/dashboard`, not
separate pages, which differs from earlier flat-route documentation):

- **Marketing/public**: `Home`, `ExtensionPage`, `Download`, `Subscriptions`, `HowItWorks`,
  `AffiliateCommissions`, `CreatorProgram`, `About`, `TermsOfService`, `PrivacyPolicy`, `CookiePolicy`,
  `Support`, plus demo pages under `/pages/demos/*`.
- **Auth**: `Login`, `Register`, `ForgotPassword`, `ResetPassword`, `VerifyEmail`.
- **App (authenticated, `/app/*`)**: `Dashboard` (now a tabbed hub — Overview/Analytics/Admin/Creator tabs
  folded in via `?tab=`), `Wishlists`, `UserProfile`, `Subscription`, `WishlistDetail`, `Recommendations`,
  `PriceTracking`, `Calendar`, `Notifications`, `PrivacySettings`, `Settings`, `AchievementsGuide`.
  `/app/creator-dashboard` and `/app/analytics` now redirect to `/app/dashboard?tab=creator` /
  `?tab=analytics` respectively rather than rendering standalone pages.
- **Public shared view**: `/shared/:shareId` → `SharedWishlist` (unauthenticated but still app-gated by
  the `app_offline` remote-config flag, distinct from the marketing-site `marketing_offline` flag).
- **Super-admin (`/admin/*`)**: `/admin` redirects to `/app/dashboard?tab=admin`; deeper pages
  (`UserManagement`, `UserDetail`, `SupportTickets`, `AuditLog`, `AffiliateAdmin`) remain standalone
  routes, self-guarded by an admin token claim check.
- Numerous legacy flat routes (`/dashboard`, `/wishlists`, `/recommendations`, `/calendar`,
  `/notifications`, `/privacy-policy`, `/cookie-policy`, `/contact`, etc.) are kept only as redirects to
  their canonical `/app/*` or renamed equivalents, for backlink/SEO continuity.

### 11. Testing & Quality
| Area | Status | Notes |
|------|--------|-------|
| Type Safety | ✅ | TypeScript across web/functions/shared packages; Dart's sound null safety on mobile. |
| Frontend Tests | 🟡 | Test infrastructure present (e.g. `AppRouter.test.tsx`); coverage depth not re-audited this pass. |
| Functions Tests | 🟡 | `packages/functions/test/` exists in the (gitignored, private-repo) local clone when present; not independently re-verified this pass. |
| Mobile CI | ✅ | Per project memory (`project_extension_killer_app_2026-07-18.md`), a mobile CI integration test was closed out, including fixing a `skip_tests` gate that had made it dead. |

### 12. Build & Tooling
| Item | Status | Notes |
|------|--------|-------|
| Monorepo | ✅ | npm workspaces (`packages/*`) per root `package.json`. `packages/functions` is gitignored — sourced from the private companion repo in CI/local dev. |
| Web Dev/Build | ✅ | `npm run dev --workspace=@wishlist-wizard/web` (Vite); `npm run build`. |
| Mobile Build | ✅ | `npm run build:mobile` → `flutter build web --release` (also native iOS/Android builds via Flutter/Fastlane, not covered by this npm script). |
| Firebase Deploy | ✅ | `npm run deploy` / `deploy:web` / `deploy:api` via `scripts/deploy.sh`; Firebase Functions deploy per project (`wishlist-wizard-dev`/`-staging`/`-prod`) as documented in the functions repo's README. |
| Lint/Type Check | ✅ | `npm run lint`, `npm run check` across workspaces. |
| Database Migration | N/A | No relational schema/migrations — Firestore is schemaless; any prior `drizzle.config.ts`/`db:push` references are obsolete. |

### 13. Environment Variables (Current)
Per `README.md`: `OPENAI_API_KEY` and `SENDGRID_API_KEY` are **explicitly not required** — neither service
is used anywhere in this codebase. Firebase project config (via `firebase_options.dart` / web SDK config),
Stripe keys (checkout + Connect), AdMob App IDs, Workspace SMTP credentials for Nodemailer, and
`VITE_GA_MEASUREMENT_ID`/GTM container ID are the live external configuration surface. Calendar provider
OAuth credentials remain referenced for the partial calendar integration (section 9).

### 14. Known Inconsistencies / Technical Debt
- This document (`docs/REQUIREMENTS.md`) was substantively stale for ~5 months (last real edit 2026-02-27)
  and described an architecture deleted 2025-10-16; this rewrite (2026-08-08) is a full resync, not a diff.
  Other docs under `docs/` (there are 100+ files) were not audited in this pass and may carry the same
  pre-migration Express/Postgres/React-Native content — treat any doc not recently touched with the same
  suspicion until checked.
- The router-vs-standalone-`onCall` split (section 7) is a workaround for an org policy, not a deliberate
  architecture choice — per project memory, sibling projects (`modulo-squares`, `vehicle-vitals`) already
  have the real fix (an org-policy override) that this project lacks. Not urgent, but worth knowing this
  isn't the "intended" long-term shape of the API.
- Barcode scanning (section 2/4) looks wired (a lookup backend exists) but has no live scan UI calling it —
  a "looks-wired-but-dead" pattern this project has hit repeatedly per project memory; worth an explicit
  audit rather than assuming section 2's 🟡 rating covers it fully.
- AR (`arModelLookup`) has not been moved to the router and its live reachability was not verified this
  pass — likely still broken under the same org-policy invoker issue affecting everything else that hasn't
  been migrated, but unconfirmed.

### 15. Suggested Next Priorities
1. Verify `arModelLookup`'s live reachability and either migrate it to the router or explicitly document it
   as broken.
2. Wire a real barcode-scan UI on mobile to the existing `lookupBarcode` backend, or remove the backend if
   it's genuinely not planned.
3. Full audit pass across the rest of `docs/` (100+ files) for the same 2025-10-16 architecture-migration
   staleness found in this file.
4. Re-verify browser-extension product-detection/quick-add/manual-entry claims (section 3) — carried
   forward unverified from the prior audit rather than independently re-checked this pass.

---
Last rewritten: 2026-08-08 — full resync from stale 2026-02-27 content describing the pre-2025-10-16
Express/Postgres/React-Native architecture. Superseded prior "Restored: 2025-10-03" note (that restoration
brought back accurate-for-2025-10-03 content, which then drifted stale over the following ~4 months as the
Firebase-era feature set shipped without this doc being updated alongside it).
