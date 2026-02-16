# Wishlist Wizard - API Reference (Firebase Functions)

**Version**: 1.0  
**Last Updated**: February 16, 2026

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

## Related Documentation

- [System Architecture](SYSTEM_ARCHITECTURE.md)
- [Database Schema](DATABASE_SCHEMA.md)
- [Security Architecture](SECURITY_ARCHITECTURE.md)
