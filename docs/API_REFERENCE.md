# Wishlist Wizard - API Reference (Firebase Functions)

**Version**: 2.0
**Last Updated**: August 8, 2026

---

## Overview

Wishlist Wizard's backend runs on Firebase Cloud Functions, but **the primary API surface is no longer direct `httpsCallable` invocation for most endpoints.** As of July 2026, this GCP org enforces a Domain Restricted Sharing policy that blocks granting a *new* `allUsers` Cloud Run invoker binding — including for project owners. Every `onCall` function needs that binding to be reachable by signed-in users, so any endpoint created (or re-deployed clean) after the policy took effect can never become publicly callable as a standalone function.

The workaround: almost the entire client-facing API is now dispatched through a single HTTP function, **`api`** (`packages/functions/src/api/router.ts`), whose Cloud Run service had the `allUsers` binding grandfathered in from before the policy existed. New endpoints are added as routes on this router instead of new standalone functions, so they inherit that existing binding instead of needing a new one.

Two invocation mechanisms coexist:

1. **HTTP API router** (`api` function, path-based dispatch under `/api/**`) — the primary surface. Covers wishlists/items, notifications, billing, admin, achievements, affiliate/creator-payout tooling, and most feature areas added since mid-2026. Called with plain `fetch()`, not the Functions SDK.
2. **Legacy standalone callables** — a small set of functions whose Cloud Run services still have a working `allUsers` binding (created before the org policy, or never needed one — e.g. Firestore/Scheduler triggers). Called with `httpsCallable()` as before. See [Legacy Callables](#legacy-callables) below.

If you're adding a new endpoint, add it as a router route, not a new `onCall`/`onRequest` function — a new standalone function's invoker binding will silently fail to grant under the org policy, leaving the function deployed but unreachable.

### Authentication

**Router endpoints**: the client sends the Firebase Auth ID token as `Authorization: Bearer <idToken>`. The router verifies it on every request (`verifyFirebaseToken` in `router.ts`) and returns `401 Unauthorized` if it's missing or invalid — there is no anonymous route on the router.

**Legacy callables**: still use the Firebase SDK's built-in ID-token auth (`context.auth` / `request.auth`), attached automatically by `httpsCallable()`.

### App Check

The client fetches an App Check token and attaches it as `X-Firebase-AppCheck` on every router request when App Check is configured for the environment (silently omitted otherwise — see `getAppCheckHeaderToken()` in `queryClient.ts`). However, **the router does not enforce App Check globally** — `requireAppCheckHTTP()` is only called explicitly inside a handful of sensitive handlers. As of this writing, App Check is actively enforced (request rejected without a valid token) on:

- `POST /api/products/preview` (fetches arbitrary third-party URLs server-side)
- Wishlist/item mutation handlers (`wishlists.ts`) — create/update/delete wishlist, add/update/delete item, reserve/purchase item
- Notification handlers (`notifications.ts`)
- Account deletion (`accountDeletion.ts`)
- Group payment handlers (`groupPayments.ts`, called via legacy callable, not the router)

All other router routes accept the header but don't currently check it. Don't assume App Check protects a route unless its handler calls `requireAppCheck`/`requireAppCheckHTTP` directly.

### Base URL

Resolved by `buildFirebaseApiRouterUrl()` in `packages/web/client-src/lib/queryClient.ts`:

1. If `VITE_API_BASE_URL` is set, it's used as-is (any environment).
2. In production builds with no override, a **relative** `/api/**` path is used — Firebase Hosting rewrites `/api/**` to the `api` Cloud Function.
3. In local development, requests go straight to the Functions emulator: `http://localhost:5001/<projectId>/<region>/api<path>` (region defaults to `us-central1`, overridable via `VITE_FIREBASE_FUNCTIONS_REGION`).

### Calling the API (Web) — `fetch`-based, primary pattern

```ts
async function callApi(path: string, options: { method?: string; body?: unknown } = {}) {
  const idToken = await auth.currentUser?.getIdToken(true);
  const appCheckToken = await getAppCheckHeaderToken(); // null if App Check isn't configured

  const res = await fetch(`/api${path}`, {
    method: options.method || 'GET',
    headers: {
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      ...(appCheckToken ? { 'X-Firebase-AppCheck': appCheckToken } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    credentials: 'omit',
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
  return res.json();
}

const wishlists = await callApi('/wishlists');
```

In practice, web code goes through the `apiRequest()` helper in `queryClient.ts` rather than calling `fetch` directly — it handles the auth/App Check headers, base-URL resolution, and the small set of paths that still need `httpsCallable` (see below).

### Calling a legacy callable (Web)

```ts
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();
const getUserProfile = httpsCallable(functions, "getUserProfile");

const profile = await getUserProfile({});
```

### Error Model

**Router endpoints** return a JSON body and an HTTP status code — not a `HttpsError`:

```json
{ "error": "Access denied", "details": { "...": "..." } }
```

Common statuses: `401` (missing/invalid token), `403` (authenticated but not authorized), `404` (not found / no matching route), `400` (validation), `500` (internal — logged server-side, not detailed to the client). Most router routes delegate to the same handler functions that used to run as `onCall` functions (via an internal `invokeAsCallable` shim), so a handler that throws `HttpsError('permission-denied', ...)` is translated to `403` with that message — the *codes* map, but the wire format is REST-style JSON, not the Functions SDK's callable error envelope.

**Legacy callables** still throw `HttpsError` with standard codes handled natively by the Functions SDK on the client:

- `unauthenticated`
- `invalid-argument`
- `permission-denied`
- `not-found`
- `internal`

---

## Router Endpoints (`api` function, `/api/**`)

Unless noted otherwise, every route below requires `Authorization: Bearer <idToken>`.

### Wishlists & Items

| Method | Path | Notes |
|---|---|---|
| GET | `/api/wishlists` | List the signed-in user's wishlists (owned + collaborated). App Check not enforced. |
| POST | `/api/wishlists` | Create a wishlist. **App Check required.** |
| GET | `/api/wishlists/:wishlistId` | Fetch a wishlist by ID (owner, collaborator, or public). |
| PATCH/PUT | `/api/wishlists/:wishlistId` | Update a wishlist. **App Check required.** |
| DELETE | `/api/wishlists/:wishlistId` | Delete a wishlist and its items. **App Check required.** |
| GET | `/api/wishlists/:wishlistId/items` | List items in a wishlist. |
| GET | `/api/shared/:shareId` | Fetch a wishlist + items by public `shareId`. |
| GET | `/api/wishlist-items` | Aggregate: all items across every wishlist the user owns or collaborates on. |
| POST | `/api/items` | Add an item to a wishlist. **App Check required.** |
| PATCH/PUT | `/api/items/:itemId` | Update an item (body becomes `updates`). **App Check required.** |
| DELETE | `/api/items/:itemId` | Delete an item. **App Check required.** |
| POST | `/api/items/:itemId/reserve` | Reserve an item (gift-giving flow). **App Check required.** |
| POST | `/api/items/:itemId/purchase` | Mark an item purchased. **App Check required.** |

**Create wishlist — request** (`POST /api/wishlists`):
```json
{
  "name": "Birthday",
  "description": "My birthday wishlist",
  "isPublic": false,
  "isCollaborative": false,
  "beneficiaryId": null,
  "occasion": "Birthday",
  "occasionDate": "2026-03-15T00:00:00.000Z"
}
```

**List wishlists — response** (`GET /api/wishlists`):
```json
[
  {
    "id": "wishlist_123",
    "userId": "uid_abc",
    "name": "Birthday",
    "isPublic": false,
    "isCollaborative": false,
    "shareId": "abcd1234",
    "createdAt": "2026-02-16T12:00:00.000Z",
    "updatedAt": "2026-02-16T12:00:00.000Z",
    "itemCount": 5
  }
]
```

**Add item — request** (`POST /api/items`):
```json
{
  "wishlistId": "wishlist_123",
  "title": "Sony WH-1000XM5",
  "price": "399.99",
  "productUrl": "https://...",
  "imageUrl": "https://...",
  "store": "Amazon",
  "priority": 1,
  "note": "Prefer black"
}
```

**Update item — request** (`PATCH /api/items/:itemId`, body is passed through as `updates`):
```json
{ "price": "349.99", "note": "Sale price" }
```

### Notifications

| Method | Path | Notes |
|---|---|---|
| GET | `/api/notifications` | Returns notifications + unread count. |
| POST | `/api/notifications/:notificationId/read` | Mark one notification read. |
| POST | `/api/notifications/mark-all-read` | Mark all read. |
| DELETE | `/api/notifications/:notificationId` | Delete a notification. |
| GET | `/api/notifications/settings` | Get notification preferences (`users/{uid}.preferences.notifications`). |
| POST | `/api/notifications/settings` | Update notification preferences. **App Check required.** |

**Response** (`GET /api/notifications`):
```json
{
  "notifications": [
    {
      "id": "notif_123",
      "type": "item_added",
      "title": "Wishlist Update",
      "content": "New item added",
      "isRead": false,
      "createdAt": "2026-02-16T12:00:00.000Z"
    }
  ],
  "unreadCount": 3
}
```

**Update settings — request** (`POST /api/notifications/settings`):
```json
{
  "settings": {
    "email": true,
    "push": true,
    "priceAlerts": true,
    "wishlistUpdates": true,
    "collaborationUpdates": true,
    "marketingEmails": false
  }
}
```

### Achievements

| Method | Path | Notes |
|---|---|---|
| GET | `/api/achievements` | Computed-on-read achievement state for the signed-in user. |

Achievements are evaluated server-side against real signals (wishlist count, extension usage, price alerts set, gifts purchased, public wishlists, push-notification opt-in, subscription tier, email verification, etc. — see `packages/functions/src/api/achievements.ts`) and cached to `userAchievements/{uid}`. The cache is served as-is if it's under an hour old; otherwise it's recomputed, merged with the previous state (achievements never regress — earned tiers only go up, even if the underlying signal later drops), and re-cached.

**Response**:
```json
{
  "achievements": {
    "welcome-aboard": { "earned": true, "tier": 1, "count": 0 },
    "first-wish": { "earned": true, "tier": 1, "count": 0 },
    "tracker": { "earned": true, "tier": 2, "count": 12 },
    "gift-giver": { "earned": false, "tier": 0, "count": 0 }
  },
  "computedAt": "2026-08-08T12:00:00.000Z"
}
```

`tier` for one-time achievements is `0` (not earned) or `1` (earned). For tiered achievements (`tracker`, `extension-power-user`, `gift-giver`, `well-loved`, `sharer`), `tier` ranges `0`–`5` against per-achievement thresholds defined in `@wishlist-wizard/shared`'s `ACHIEVEMENT_DEFINITIONS`, and `count` is the raw signal value backing the progress display.

### Billing & Subscriptions

| Method | Path | Notes |
|---|---|---|
| GET | `/api/billing/status` | Current tier, billing cycle, usage, limits. |
| GET | `/api/billing/plans` | Available upgrade tiers from the current tier. |
| POST | `/api/billing/checkout` | Create a Stripe checkout session. |
| POST | `/api/billing/portal` | Create a Stripe billing-portal session. |
| POST | `/api/billing/verify-purchase` | Verify a native (StoreKit/Play Billing) in-app purchase — mobile only. |
| POST | `/api/billing/restore-purchase` | Restore a native in-app purchase — mobile only. |

Web subscriptions go through Stripe (`checkout`/`portal`); mobile subscriptions go through native store billing (`verify-purchase`/`restore-purchase`) per Apple/Google policy for in-app-purchased digital subscriptions — the two paths are intentionally separate, not redundant.

**`billingStatus` response**:
```json
{
  "tier": "plus",
  "status": "active",
  "billingCycle": "monthly",
  "renewalDate": "2026-03-16T00:00:00.000Z",
  "usage": { "wishlists": 3, "itemsTotal": 45, "priceTrackedItems": 12 },
  "limits": { "maxWishlists": 10, "maxItemsPerWishlist": 100, "maxPriceTrackedItems": 50 },
  "stripeCustomerId": "cus_abc123",
  "stripeSubscriptionId": "sub_xyz789"
}
```

**`billingCheckout` request**:
```json
{ "tier": "creator", "billingCycle": "annual" }
```
**Response**:
```json
{ "sessionId": "cs_abc123", "checkoutUrl": "https://checkout.stripe.com/..." }
```

`billingWebhook` (the Stripe webhook handler itself) is **not** on the router — Stripe calls it directly as a standalone `onRequest` function; see [Legacy Callables](#legacy-callables).

### Admin (Super-Admin Only)

All admin routes require the caller's Firebase ID token to carry admin privileges (`token.admin === true`/`token.role === 'admin'`, or an `isAdmin`/`role: 'admin'` flag on their `users/{uid}` doc) — checked per-handler via `requireAdminRole`, not by the router itself.

| Method | Path | Notes |
|---|---|---|
| POST | `/api/admin/users` | Paginated user list (filters in body: tier, suspended, email search). |
| GET | `/api/admin/users/:targetUid` | Detailed info for one user. |
| POST | `/api/admin/users/:targetUid/suspend` | Suspend a user. |
| POST | `/api/admin/users/:targetUid/unsuspend` | Reinstate a suspended user. |
| POST | `/api/admin/users/:targetUid/subscription` | Override a user's subscription tier. |
| POST | `/api/admin/support-tickets` | Paginated support-ticket list (filters in body). |
| POST | `/api/admin/support-tickets/:ticketId/respond` | Respond to a ticket. |
| POST | `/api/admin/audit-log` | Paginated admin audit log (filters in body). |

Note the list/filter endpoints are `POST` (filters in the JSON body), not `GET` with query params — that's a holdover from their callable-function signatures (`request.data`), preserved as-is by the router.

**`POST /api/admin/users` request**:
```json
{ "pageSize": 50, "startAfter": "uid_last_from_previous", "filter": { "tier": "plus", "isSuspended": false, "searchEmail": "john@example.com" } }
```
**Response**:
```json
{ "users": [ { "uid": "uid_123", "email": "john@example.com", "subscriptionTier": "plus", "isSuspended": false } ], "hasMore": true }
```

**`POST /api/admin/users/:targetUid/suspend` request**:
```json
{ "reason": "Violation of terms of service" }
```

Errors surface as `403` (`sendError(res, 403, ...)`) for non-admin callers, matching what used to be a `permission-denied` `HttpsError`.

### Affiliate & Creator Payouts

Commission ledger, admin affiliate tooling, and the creator-facing payout dashboard. All routes require auth; the `admin/affiliate/*` routes additionally require admin role (checked in-handler).

**Admin — affiliate tracking pool**

| Method | Path | Notes |
|---|---|---|
| POST | `/api/admin/affiliate/tracking-pool/add` | Add tracking IDs to the pool for a network. |
| POST | `/api/admin/affiliate/tracking-pool/list` | List pooled tracking IDs for a network. |

**Admin — commission ledger**

| Method | Path | Notes |
|---|---|---|
| POST | `/api/admin/affiliate/commission/approve` | Approve a ledger entry for payout. |
| POST | `/api/admin/affiliate/commission/flag-fraud` | Flag a ledger entry as fraudulent. |
| POST | `/api/admin/affiliate/commission/adjustment` | Create a manual adjustment (credit/debit) against a ledger entry. |

**Admin — report imports & payout batches**

| Method | Path | Notes |
|---|---|---|
| POST | `/api/admin/affiliate/imports/request-upload-url` | Request a signed upload URL for a network's commission report CSV. |
| POST | `/api/admin/affiliate/imports/status` | Check the status of one import job. |
| GET | `/api/admin/affiliate/imports/list` | List recent import jobs. |
| POST | `/api/admin/affiliate/imports/retry` | Retry a failed import. |
| POST | `/api/admin/affiliate/payout-batches/process` | Process a payout batch (triggers Stripe Connect transfers). |
| GET | `/api/admin/affiliate/payout-batches` | List payout batches. |

**Creator-facing**

| Method | Path | Notes |
|---|---|---|
| POST | `/api/creator/tracking-tags/request` | Request a personal affiliate tracking tag for a network. |
| GET | `/api/creator/tracking-tags` | List the creator's tracking tags. |
| GET | `/api/creator/commission-summary` | Dashboard summary (earned, pending, paid, held). |
| POST | `/api/creator/commission-ledger` | Paginated ledger entries for the creator (`limit` in body, capped at 200). |
| GET | `/api/creator/adjustments` | List manual adjustments applied to the creator's ledger. |
| POST | `/api/creator/connect/create` | Create a Stripe Connect account for payouts. |
| POST | `/api/creator/connect/onboarding-link` | Get a Stripe Connect onboarding link (body: `returnUrl`, `refreshUrl`). |
| GET | `/api/creator/connect/status` | Check Connect account onboarding status. |
| GET | `/api/creator/payout-history` | Paginated payout history (`limit` in body, capped at 100). |

**`POST /api/admin/affiliate/commission/adjustment` request**:
```json
{
  "ledgerEntryId": "ledger_abc123",
  "type": "credit",
  "amountUsd": 12.5,
  "reasonCode": "goodwill",
  "reasonNote": "Customer service adjustment"
}
```

**`GET /api/creator/commission-summary` response** (shape, illustrative):
```json
{
  "totalEarnedUsd": 482.10,
  "pendingUsd": 96.40,
  "heldUsd": 20.00,
  "paidOutUsd": 365.70
}
```

Two background jobs feed this data but are **not** client-callable: `advanceCommissionsPastHold` (Cloud Scheduler — matures held commissions past their hold period) and `affiliateReportImportProcess` (Cloud Storage trigger — processes an uploaded network report CSV once it lands in the bucket).

### Beneficiaries & Recommendations

| Method | Path | Notes |
|---|---|---|
| GET | `/api/beneficiaries` | List the user's gift-recipient beneficiaries. |
| GET | `/api/recommendations` | List gift recommendations (up to 40, newest first). |
| GET | `/api/recommendations/beneficiary/:beneficiaryId` | Recommendations scoped to one beneficiary. |
| PATCH | `/api/recommendations/:recommendationId/status` | Update `isViewed`/`isSaved`/`isRejected` on a recommendation. |

### Privacy Controls

| Method | Path | Notes |
|---|---|---|
| GET / PUT | `/api/privacy/defaults` | Get/set the user's default visibility settings. |
| GET | `/api/privacy/settings/:entityType/:entityId` | Effective privacy settings for a wishlist/item (`entityType` is `wishlist` or `item`); falls back to defaults if none set. |
| POST | `/api/privacy/settings` | Create/update settings for an entity. |
| PUT | `/api/privacy/settings/:entityType/:entityId/access-list` | Replace the custom access list. |
| POST | `/api/privacy/settings/:entityType/:entityId/access-list/add` | Add one user to the access list. |
| DELETE | `/api/privacy/settings/:entityType/:entityId/access-list/:userId` | Remove one user from the access list. |
| DELETE | `/api/privacy/settings/:entityType/:entityId` | Delete privacy settings for an entity. |
| POST | `/api/privacy/check-access` | Check whether the caller has access to an entity given its privacy settings. |

### Price Alerts, Price Drops & Price Intelligence

| Method | Path | Notes |
|---|---|---|
| POST | `/api/price-alerts` | Create/upsert a price alert (one active alert per user+item — re-posting updates the target). |
| GET | `/api/price-alerts` | List the user's active price alerts, each enriched with its tracked item. |
| PATCH | `/api/price-alerts/:alertId` | Update alert policy fields (`targetPrice`, `thresholdPercent`, `thresholdAmount`, `cooldownMinutes`, `alertCadence`, `active`, `quietHours`). |
| DELETE | `/api/price-alerts/:alertId` | Delete a price alert. |
| GET | `/api/price-alerts/replay-status` | Admin-only — status of the deferred price-alert replay job. |
| GET | `/api/price-drops` | Recent negative price-history entries for the user's tracked items. |
| GET | `/api/items/:itemId/price-intelligence` | Market offers / price comparison for one item. |
| POST | `/api/price-intelligence/refresh` | Force a refresh of market offers for an item (SerpAPI-backed where configured). |
| GET | `/api/items/:itemId/price-history` | Historical price series for one item. |

**`POST /api/price-alerts` request**:
```json
{ "itemId": "item_123", "targetPrice": 299.99 }
```

Two related scheduled jobs are **not** client-callable: `scheduledRefreshPriceIntelligenceOffers` and `scheduledEvaluatePriceAlerts` (both Cloud Scheduler triggers).

### Product Preview

| Method | Path | Notes |
|---|---|---|
| POST | `/api/products/preview` | Fetch a link preview (title/image/price) for a product URL. **App Check required** — this endpoint fetches arbitrary third-party URLs server-side on the caller's behalf. |

### Extension (router)

Router-native endpoints used by the browser extension via the standard Bearer + App Check pattern. Distinct from the legacy `extensionXxx` callables and the standalone `extensionGetWishlists`-style HTTP wrappers documented under [Legacy Callables](#legacy-callables) — three separate implementations of overlapping functionality exist in the codebase; this is the current one.

| Method | Path | Notes |
|---|---|---|
| GET | `/api/extension/wishlists` | Simplified wishlist list (id/name/description/isPublic/itemCount), newest-updated first, capped at 20. |
| POST | `/api/extension/wishlists` | Create a wishlist from the extension. |
| POST | `/api/extension/items` | Add an item from the extension. |
| GET | `/api/extension/recent-items` | Recently added items across the user's wishlists. |
| GET | `/api/extension/wishlists/:wishlistId/items` | Items in one wishlist. |
| DELETE | `/api/extension/items/:itemId` | Delete an item. |
| POST | `/api/extension/wishlists/:wishlistId/share` | Create/return a share link. |

### Contacts

| Method | Path | Notes |
|---|---|---|
| GET | `/api/contacts` | List the user's contacts. |
| POST | `/api/contacts/external` | List contacts imported from an external source. |
| POST | `/api/contacts/import` | Import contacts. |
| POST | `/api/contacts/:contactId/hide` | Hide a contact. |
| DELETE | `/api/contacts/:contactId` | Delete a contact. |

### Devices & Sync

| Method | Path | Notes |
|---|---|---|
| POST | `/api/devices/register` | Register a device (push token, platform). |
| GET | `/api/devices` | List the user's registered devices. |
| POST | `/api/devices/update` | Update device metadata. |
| POST | `/api/devices/sync-log` | Log a single sync event. |
| POST | `/api/devices/sync-logs` | Fetch sync logs. |
| POST | `/api/mobile/sync` | Batch-apply queued mobile actions (offline-sync flow). |
| GET | `/api/mobile/barcode/:code` | Barcode lookup for the mobile scan-to-add flow. |

### Analytics

| Method | Path | Notes |
|---|---|---|
| POST | `/api/analytics/track` | Record a single analytics event. |
| POST | `/api/analytics/events` | Query recorded events. |
| POST | `/api/analytics/summary` | Aggregate analytics summary. |
| POST | `/api/analytics/ad-revenue-summary` | Ad revenue summary. |
| POST | `/api/analytics/ad-kpi-snapshot` | Create an ad KPI snapshot. |
| POST | `/api/analytics/ad-kpi-snapshots` | List ad KPI snapshots. |

`scheduledAdKpiSnapshot` (exported as `metricsSnapshotScheduled`) is a Cloud Scheduler trigger, not client-callable.

### Affiliate Link Conversion

Distinct from the creator/admin affiliate tooling above — this group rewrites outbound retailer links into affiliate links.

| Method | Path | Notes |
|---|---|---|
| POST | `/api/affiliate/convert` | Convert a single product URL to an affiliate link. |
| POST | `/api/affiliate/batch-convert` | Convert multiple URLs. |
| POST | `/api/affiliate/track-click` | Record an affiliate click. |
| POST | `/api/affiliate/convert-wishlist` | Convert all links in a wishlist. |
| POST | `/api/affiliate/programs` | List supported affiliate programs. |
| POST | `/api/affiliate/stats` | Affiliate click/conversion stats. |
| POST | `/api/affiliate/disclosure` | Affiliate disclosure text/config. |

### Push Notifications (FCM)

| Method | Path | Notes |
|---|---|---|
| POST | `/api/fcm/token` | Save an FCM token for the device. |
| DELETE | `/api/fcm/token` | Remove an FCM token. |
| POST | `/api/fcm/subscribe-topic` | Subscribe the device to a topic. |
| POST | `/api/fcm/unsubscribe-topic` | Unsubscribe from a topic. |
| POST | `/api/fcm/test-notification` | Send a test push notification to the caller's own devices. |

Firestore-triggered push sends (`notifyItemAdded`, `notifyItemReserved`, `notifyItemPurchased`, `notifyPriceAlert`) and the scheduled `replayDeferredPriceAlerts` job are background triggers, not client-callable, and stay as standalone functions outside the router.

### Calendar

| Method | Path | Notes |
|---|---|---|
| GET | `/api/calendar/events` | List calendar events. |
| POST | `/api/calendar/events` | Create a calendar event. |
| DELETE | `/api/calendar/events/:eventId` | Delete a calendar event. |
| POST | `/api/calendar/auth/:provider` | Get an OAuth URL to connect a calendar provider. |
| GET | `/api/calendar/connections` | List connected calendars. |
| POST | `/api/calendar/connect` | Connect a calendar (completes OAuth). |
| POST | `/api/calendar/connections/:connectionId/sync` | Trigger a sync for one connection. |
| POST | `/api/calendar/connections/:connectionId/settings` | Update sync settings for one connection. |
| DELETE | `/api/calendar/connections/:connectionId` | Disconnect a calendar. |
| POST | `/api/calendar/sync` | Trigger sync across all connections. |
| GET | `/api/calendar/sync-settings` | Get global calendar sync settings. |

### Account

| Method | Path | Notes |
|---|---|---|
| DELETE | `/api/account` | Delete/anonymize the caller's account and revoke connected services (Stripe, calendar, etc.) across roughly 25 collections. **App Check required.** Given the fan-out, the `api` function's timeout is raised to 300s / 512MiB (still a ceiling — every other route returns in milliseconds as before). |

---

## Legacy Callables

Called with `httpsCallable()` via the Firebase Functions SDK. These functions' Cloud Run services either predate the org's Domain Restricted Sharing policy (so their `allUsers` binding is grandfathered in) or are triggers/webhooks that were never invoker-gated in the first place.

### Authentication & Profiles

- **`createUserProfile`** — creates a user profile document after sign-up. Request: `{ "displayName": "...", "avatarUrl": "..." }`
- **`getUserProfile`** — returns the current user's profile.
- **`updateUserProfile`** — updates fields on the current user's profile.

The web client also reaches `/api/auth/me` and `/api/users/search` via `httpsCallable` (not the router) — see `shouldUseFirebaseFunctions()` in `queryClient.ts`.

### Browser Extension

Two separate standalone implementations exist alongside the router's `/api/extension/*` routes (above) — verify which one a given extension build actually targets before assuming parity.

**Callable (`onCall`, `packages/functions/src/api/extension.ts`)**:
`authenticateExtension`, `getExtensionWishlists`, `addItemFromExtension`, `getExtensionRecentItems`, `createExtensionWishlist`, `deleteExtensionItem`, `shareExtensionWishlist`, `getExtensionAnalytics`, `trackExtensionEvent`.

**Standalone HTTP (`onRequest`, `packages/functions/src/api/http-extension.ts`)** — plain HTTP wrappers with their own Bearer-token verification, not routed through the `api` function:
`extensionGetWishlists`, `extensionCreateWishlist`, `extensionAddItem`, `extensionGetRecentItems`, `extensionGetWishlistItems`, `extensionDeleteItem`, `extensionShareWishlist`.

### Generic CRUD (`packages/functions/src/crud/index.ts`)

`createDocument`, `getDocument`, `updateDocument`, `deleteDocument`, `listDocuments`, `batchCreateDocuments`, `batchUpdateDocuments` — generic Firestore document operations, collection/document-agnostic.

### System Notifications

- **`createSystemNotification`** — creates a system notification for a target user. Request:
  ```json
  { "targetUserId": "uid_abc", "type": "wishlist_created", "title": "Wishlist Created", "content": "...", "data": { "wishlistId": "wishlist_123" }, "actionUrl": "/wishlists/wishlist_123" }
  ```
- **`cleanOldNotifications`** — purges old notifications.

### Push Notification Management

- **`sendTestNotification`** / **`sendBatchNotification`** — send push notifications directly (admin/testing paths). Note `saveFCMToken`/`removeFCMToken`/`subscribeToTopic`/`unsubscribeFromTopic`/`sendTestPushNotification` — the device-facing token management functions — have moved to the router (`/api/fcm/*` above); only these two sending functions remain standalone.

### Subscription — Webhook & Legacy Checkout

- **`billingWebhook`** — Stripe webhook handler. Called directly by Stripe, not the browser; its own IAM binding is unrelated to the `allUsers`/browser-auth issue affecting the rest of this doc. Handles `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`, `charge.refunded`.
- **`checkoutSessionCreate`** — a separate standalone `onRequest` Stripe checkout endpoint (`packages/functions/src/api/stripe.ts`), distinct from `POST /api/billing/checkout` on the router. No caller was found anywhere in `packages/web`, `packages/mobile`, or `packages/browser-extension` — verify whether this is still live traffic (e.g. an external/native integration) or dead code before relying on it.

### Group Gifting

- **`groupPaymentCreateIntent`**, **`groupPaymentConfirm`**, **`groupGiftSummary`** (`packages/functions/src/api/groupPayments.ts`) — still standalone `onCall` functions, not routed through `api`. The web client dispatches these through `httpsCallable` under the hood even though callers use REST-shaped paths (`/api/group-payments/payment-intent`, `/api/group-payments/confirm`, `/api/group-payments/item/:itemId`) — `getFirebaseFunctionRoute()` in `queryClient.ts` remaps those paths to the three function names above before calling `httpsCallable`. App Check is enforced inside these handlers.

### AR Model Lookup

- **`arModelLookup`** (exported name; source function `getARModel`, `packages/functions/src/api/ar.ts`) — standalone `onCall`. No caller found in `packages/web` or `packages/mobile`; likely consumed by native mobile AR code outside this monorepo, or unused.

### Super-Admin Bootstrap & Support

- **`bootstrapSuperAdmin`** — one-time protected setup to grant the first super-admin role (requires a secret token). Request: `{ "uid": "...", "email": "...", "displayName": "...", "secret": "..." }`
- **`grantAdminRole`** / **`revokeAdminRole`** — grant/revoke admin role. Request: `{ "targetUid": "...", "role": "admin", "reason": "..." }`
- **`createSupportTicket`** — user-facing support ticket creation. Request: `{ "category": "billing", "subject": "...", "description": "..." }`

The 8 admin *panel* functions (`adminGetUsers`, `adminGetUser`, `adminSuspendUser`, `adminUnsuspendUser`, `adminModifySubscription`, `adminGetSupportTickets`, `adminRespondToTicket`, `adminGetAuditLog`) have moved to the router — see [Admin](#admin-super-admin-only) above; they are **not** in this legacy list despite living in the same source file (`api/admin.ts`) as the four still-standalone functions here.

---

## Background Triggers (not client-callable)

Listed here only to avoid confusion with same-named/similarly-purposed client endpoints above — none of these are reachable from a client.

| Function | Trigger |
|---|---|
| `notifyItemAdded`, `notifyItemReserved`, `notifyItemPurchased`, `notifyPriceAlert` | Firestore document triggers |
| `replayDeferredPriceAlerts`, `scheduledRefreshPriceIntelligenceOffers` (`priceIntelRefreshScheduled`), `scheduledEvaluatePriceAlerts` (`priceAlertsEvaluateScheduled`), `scheduledAdKpiSnapshot` (`metricsSnapshotScheduled`), `advanceCommissionsPastHold`, `scheduledPayoutBatchRun` | Cloud Scheduler |
| `affiliateReportImportProcess` | Cloud Storage `onObjectFinalized` |

---

## Error Responses

### Legacy callables — standard Firebase HttpsError format

```json
{ "code": "permission-denied", "message": "User is not a super-admin" }
```

### Router endpoints — REST-style JSON + HTTP status

```json
{ "error": "Access denied" }
```

### Common Error Codes / Statuses

| Callable Code | Router Status | Meaning |
|---|---|---|
| `unauthenticated` | 401 | User not signed in or token invalid |
| `permission-denied` | 403 | User lacks required role or permissions |
| `invalid-argument` | 400 | Invalid request parameters |
| `not-found` | 404 | Resource not found (or, on the router, no matching route) |
| `already-exists` | 409 | Resource already exists |
| `internal` | 500 | Server error (check logs) |
| `unavailable` | 503 | External service error |

---

## Related Documentation

- [System Architecture](SYSTEM_ARCHITECTURE.md)
- [Database Schema](DATABASE_SCHEMA.md)
- [Security Architecture](SECURITY_ARCHITECTURE.md)
