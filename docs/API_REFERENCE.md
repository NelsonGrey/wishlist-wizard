# Wishlist Wizard - API Reference (Firebase Functions)

**Version**: 1.1  
**Last Updated**: May 15, 2026

---

## Overview

Wishlist Wizard uses Firebase Cloud Functions (callable functions) as the primary API surface. Clients call these functions via the Firebase SDK; there is no REST base URL in normal usage.

### Authentication

All callable functions that require authentication expect a valid Firebase Auth ID token. The Firebase SDK automatically supplies this token when the user is signed in.

### Error Model

Callable functions throw `HttpsError` with standard codes:

- `unauthenticated`
- `invalid-argument`
- `permission-denied`
- `not-found`
- `internal`

Clients should handle these codes and show user-friendly messages.

### Calling Functions (Web)

```ts
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();
const getUserWishlists = httpsCallable(functions, "getUserWishlists");

const wishlists = await getUserWishlists({});
```

---

## Authentication & Profiles

### `createUserProfile`
Creates a user profile document after sign-up.

**Request**:
```json
{
  "displayName": "John Doe",
  "avatarUrl": "https://..."
}
```

### `getUserProfile`
Returns the current user profile.

### `updateUserProfile`
Updates fields on the current user profile.

---

## Wishlists

### `getUserWishlists`
Returns all wishlists for the signed-in user.

**Response**:
```json
[
  {
    "id": "wishlist_123",
    "userId": "uid_abc",
    "name": "Birthday",
    "description": "My birthday wishlist",
    "isPublic": false,
    "isCollaborative": false,
    "shareId": "abcd1234",
    "createdAt": "2026-02-16T12:00:00.000Z",
    "updatedAt": "2026-02-16T12:00:00.000Z",
    "itemCount": 5
  }
]
```

### `getWishlistById`
Fetches a wishlist by ID (owner, collaborator, or public).

**Request**:
```json
{ "wishlistId": "wishlist_123" }
```

### `getSharedWishlist`
Fetches a shared wishlist by `shareId`.

**Request**:
```json
{ "shareId": "abcd1234" }
```

**Response**:
```json
{
  "wishlist": { "id": "wishlist_123", "name": "Birthday" },
  "items": [ { "id": "item_123", "title": "Headphones" } ]
}
```

### `createWishlist`
Creates a new wishlist for the current user.

**Request**:
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

### `updateWishlist`
Updates allowed fields on a wishlist.

**Request**:
```json
{
  "wishlistId": "wishlist_123",
  "name": "Birthday 2026",
  "isPublic": true
}
```

### `deleteWishlist`
Deletes a wishlist and its items.

**Request**:
```json
{ "wishlistId": "wishlist_123" }
```

---

## Wishlist Items

### `getWishlistItems`
Returns items in a wishlist.

**Request**:
```json
{ "wishlistId": "wishlist_123" }
```

### `addWishlistItem`
Adds an item to a wishlist.

**Request**:
```json
{
  "wishlistId": "wishlist_123",
  "title": "Sony WH-1000XM5",
  "description": "Noise cancelling",
  "price": "399.99",
  "productUrl": "https://...",
  "imageUrl": "https://...",
  "store": "Amazon",
  "priority": 1,
  "note": "Prefer black"
}
```

### `updateWishlistItem`
Updates an existing item.

**Request**:
```json
{
  "itemId": "item_123",
  "updates": {
    "price": "349.99",
    "note": "Sale price"
  }
}
```

### `deleteWishlistItem`
Deletes an item.

**Request**:
```json
{ "itemId": "item_123" }
```

---

## Notifications

### `getUserNotifications`
Returns notifications and unread count.

**Request**:
```json
{ "limit": 20 }
```

**Response**:
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

### `markNotificationAsRead`
Marks a notification as read.

**Request**:
```json
{ "notificationId": "notif_123" }
```

### `markAllNotificationsAsRead`
Marks all notifications as read.

### `deleteNotification`
Deletes a notification.

### `createSystemNotification`
Creates a system notification for a target user.

**Request**:
```json
{
  "targetUserId": "uid_abc",
  "type": "wishlist_created",
  "title": "Wishlist Created",
  "content": "Your wishlist has been created",
  "data": { "wishlistId": "wishlist_123" },
  "actionUrl": "/wishlists/wishlist_123"
}
```

### `getNotificationSettings`
Returns notification settings stored in `users/{userId}.preferences.notifications`.

### `updateNotificationSettings`
Updates notification settings.

**Request**:
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

---

## Browser Extension

### `authenticateExtension`
Validates the Firebase ID token and returns basic user info.

### `getExtensionWishlists`
Returns a simplified wishlist list for the extension.

### `addItemFromExtension`
Adds an item to a wishlist from the extension.

### `getExtensionRecentItems`
Returns recently added items across a user’s wishlists.

### `createExtensionWishlist`
Creates a new wishlist from the extension.

### `deleteExtensionItem`
Deletes an item from the extension.

### `shareExtensionWishlist`
Creates or returns a share link for a wishlist.

### `getExtensionAnalytics`
Returns extension usage analytics.

### `trackExtensionEvent`
Tracks extension events.

---

## Subscription Management (User-Facing)

### `getSubscriptionStatus`
Returns the current user's subscription tier, billing info, and usage metrics.

**Response**:
```json
{
  "tier": "plus",
  "status": "active",
  "billingCycle": "monthly",
  "renewalDate": "2026-03-16T00:00:00.000Z",
  "usage": {
    "wishlists": 3,
    "itemsTotal": 45,
    "priceTrackedItems": 12
  },
  "limits": {
    "maxWishlists": 10,
    "maxItemsPerWishlist": 100,
    "maxPriceTrackedItems": 50
  },
  "stripeCustomerId": "cus_abc123",
  "stripeSubscriptionId": "sub_xyz789"
}
```

**Errors**:
- `unauthenticated`: User not signed in
- `not-found`: No subscription found (user on free tier)

### `getUpgradeOptions`
Returns available tiers for upgrade from current tier.

**Response**:
```json
{
  "current": "plus",
  "available": [
    {
      "tier": "creator",
      "name": "Creator",
      "monthlyPrice": 19.99,
      "annualPrice": 199.99,
      "annualSavings": 39.81
    },
    {
      "tier": "business",
      "name": "Business",
      "monthlyPrice": 49.99,
      "annualPrice": 499.99
    }
  ]
}
```

### `createCheckout`
Creates a Stripe Checkout session for upgrading subscription.

**Request**:
```json
{
  "tier": "creator",
  "billingCycle": "annual"
}
```

**Response**:
```json
{
  "sessionId": "cs_abc123",
  "checkoutUrl": "https://checkout.stripe.com/pay/cs_abc123"
}
```

**Errors**:
- `invalid-argument`: Invalid tier or billing cycle
- `permission-denied`: User cannot upgrade to this tier
- `internal`: Stripe API error

### `createBillingPortal`
Creates a Stripe Billing Portal session for managing subscriptions and payment methods.

**Response**:
```json
{
  "portalUrl": "https://billing.stripe.com/..."
}
```

### `stripeSubscriptionWebhook`
HTTP webhook handler for Stripe events (subscription updates, payment failures, etc.).

**Webhook Signature**: Verified via `Stripe-Signature` header
**Events Handled**:
- `customer.subscription.updated`: Tier changed
- `customer.subscription.deleted`: Subscription cancelled
- `invoice.payment_failed`: Payment failure
- `charge.refunded`: Refund processed

---

## Admin API (Super-Admin Only)

All admin functions require Firebase ID token with `role: 'super_admin'` custom claim.

### `bootstrapSuperAdmin`
One-time protected setup to grant first super-admin role (requires secret token).

**Request**:
```json
{
  "uid": "uid_admin",
  "email": "admin@wishlist-wizard.io",
  "displayName": "Admin",
  "secret": "bootstrap_secret_key"
}
```

**Response**:
```json
{ "success": true, "message": "Super-admin initialized" }
```

**Errors**:
- `permission-denied`: Invalid secret or already initialized
- `invalid-argument`: Invalid UID or email

### `grantAdminRole`
Grant admin role (read-only user admin or ticket admin) to a user.

**Request**:
```json
{
  "targetUid": "uid_user",
  "role": "admin",
  "reason": "Promoted to support team"
}
```

**Response**:
```json
{ "success": true }
```

### `revokeAdminRole`
Revoke admin role from a user.

**Request**:
```json
{
  "targetUid": "uid_user",
  "reason": "Left support team"
}
```

### `adminGetUsers`
Paginated list of all users with subscription and status info.

**Request**:
```json
{
  "pageSize": 50,
  "startAfter": "uid_last_from_previous",
  "filter": {
    "tier": "plus",
    "isSuspended": false,
    "searchEmail": "john@example.com"
  }
}
```

**Response**:
```json
{
  "users": [
    {
      "uid": "uid_123",
      "email": "john@example.com",
      "displayName": "John Doe",
      "subscriptionTier": "plus",
      "subscriptionStatus": "active",
      "isSuspended": false,
      "createdAt": "2026-01-01T00:00:00.000Z"
    }
  ],
  "hasMore": true
}
```

### `adminGetUser`
Get detailed info about a specific user.

**Request**:
```json
{ "targetUid": "uid_123" }
```

**Response**:
```json
{
  "uid": "uid_123",
  "email": "john@example.com",
  "displayName": "John Doe",
  "subscriptionTier": "plus",
  "subscriptionStatus": "active",
  "renewalDate": "2026-03-16T00:00:00.000Z",
  "isSuspended": false,
  "suspendedReason": null,
  "stripeCustomerId": "cus_abc123",
  "usage": {
    "wishlists": 3,
    "itemsTotal": 45,
    "priceTrackedItems": 12
  },
  "createdAt": "2026-01-01T00:00:00.000Z",
  "lastLoginAt": "2026-02-16T10:30:00.000Z"
}
```

### `adminSuspendUser`
Suspend a user account (disables access, retains data).

**Request**:
```json
{
  "targetUid": "uid_123",
  "reason": "Violation of terms of service"
}
```

**Response**:
```json
{ "success": true }
```

### `adminUnsuspendUser`
Reinstate a suspended user.

**Request**:
```json
{
  "targetUid": "uid_123",
  "reason": "Appeal approved"
}
```

### `adminModifySubscription`
Override a user's subscription tier.

**Request**:
```json
{
  "targetUid": "uid_123",
  "newTier": "business",
  "reason": "Complimentary upgrade for early adopter"
}
```

**Response**:
```json
{
  "success": true,
  "newTier": "business",
  "limits": {
    "maxWishlists": 100,
    "maxItemsPerWishlist": 500
  }
}
```

**Errors**:
- `invalid-argument`: Invalid tier
- `not-found`: User not found

### `createSupportTicket`
Create a support ticket (user-facing).

**Request**:
```json
{
  "category": "billing",
  "subject": "Cannot upgrade subscription",
  "description": "Getting an error when clicking upgrade"
}
```

**Response**:
```json
{
  "ticketId": "ticket_abc123",
  "status": "open"
}
```

### `adminGetSupportTickets`
List support tickets (admin-only).

**Request**:
```json
{
  "pageSize": 20,
  "startAfter": "ticket_last",
  "filter": {
    "status": "open",
    "category": "billing"
  }
}
```

**Response**:
```json
{
  "tickets": [
    {
      "id": "ticket_abc123",
      "userId": "uid_123",
      "userEmail": "john@example.com",
      "category": "billing",
      "subject": "Cannot upgrade",
      "status": "open",
      "createdAt": "2026-02-16T10:00:00.000Z",
      "updatedAt": "2026-02-16T10:00:00.000Z"
    }
  ],
  "hasMore": false
}
```

### `adminRespondToTicket`
Add a response to a support ticket.

**Request**:
```json
{
  "ticketId": "ticket_abc123",
  "message": "Please clear your browser cache and try again",
  "newStatus": "pending"
}
```

### `adminGetAuditLog`
View audit log (all admin actions).

**Request**:
```json
{
  "pageSize": 100,
  "startAfter": "log_entry_id",
  "filter": {
    "action": "suspend_user",
    "targetUid": "uid_123"
  }
}
```

**Response**:
```json
{
  "logs": [
    {
      "id": "log_abc123",
      "action": "suspend_user",
      "actor": "uid_admin",
      "actorEmail": "admin@example.com",
      "targetUid": "uid_123",
      "targetEmail": "user@example.com",
      "reason": "Violation",
      "timestamp": "2026-02-16T10:00:00.000Z",
      "details": {
        "previousTier": "plus",
        "newTier": "plus"
      }
    }
  ],
  "hasMore": true
}
```

---

## Error Responses

All errors follow the standard Firebase HttpsError format:

```json
{
  "code": "permission-denied",
  "message": "User is not a super-admin"
}
```

### Common Error Codes

| Code | Meaning |
|------|---------|
| `unauthenticated` | User not signed in or token invalid |
| `permission-denied` | User lacks required role or permissions |
| `invalid-argument` | Invalid request parameters |
| `not-found` | Resource not found |
| `already-exists` | Resource already exists |
| `internal` | Server error (check logs) |
| `unavailable` | External service error (Stripe, etc.) |

---

## Related Documentation

- [System Architecture](SYSTEM_ARCHITECTURE.md)
- [Database Schema](DATABASE_SCHEMA.md)
- [Security Architecture](SECURITY_ARCHITECTURE.md)
