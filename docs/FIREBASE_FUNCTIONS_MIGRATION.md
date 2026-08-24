# Firebase Functions API Migration Guide

> ⚠️ **Superseded for new-endpoint guidance.** This document describes the
> original Express.js → Firebase Functions (callable) migration as the
> current end state. That migration itself is historically accurate and
> this doc is kept as a record of it, but two later architectural changes
> mean **new endpoints should not follow the patterns below**:
>
> 1. **Router migration (~2026-07-23)**: This GCP org enforces a policy that
>    blocks granting a *new* `allUsers` Cloud Run invoker binding, so a
>    freshly deployed standalone `onCall` function can silently be
>    unreachable by clients. Endpoints that need public/client invocation
>    now go through a single HTTP router, `api` (`onRequest`, defined in
>    `packages/functions/src/api/router.ts`), dispatched by path under
>    `/api/*`. See [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md#-api-architecture)
>    for the current pattern. A defined subset of functions (auth/profile
>    CRUD, generic CRUD, browser extension, FCM triggers, and a few others)
>    remain standalone `onCall` exports — this is not a total migration.
> 2. **`packages/functions` extraction (2026-07-17)**: the backend source
>    shown throughout this doc no longer lives in this repo. It moved to
>    the private companion repo `NelsonGrey/wishlist-wizard-functions`;
>    `packages/functions/` is gitignored here.
>
> Everything below this banner describes the original migration and is left
> unedited as a historical record — do not use its callable-function
> examples as a template for new work.

This document outlines the migration from the Express.js API server to Firebase Functions v2 with Firestore integration.

## 🎯 Migration Overview

The entire Express.js API server has been migrated to Firebase Functions v2, providing:

- **Serverless Architecture**: Automatic scaling and cost optimization
- **Firebase Auth Integration**: Native authentication instead of custom JWT
- **Firestore Database**: Real-time, scalable NoSQL database
- **Cloud Functions**: Event-driven, serverless compute
- **Built-in Security**: Firebase Security Rules and IAM

## 📊 Migration Status

### ✅ Completed
- **Authentication API**: Firebase Auth integration
- **Wishlist Management**: Full CRUD operations with Firestore
- **Notification System**: Real-time notifications with Firestore
- **Price Tracking**: Cloud Functions with Cloud Scheduler
- **Browser Extension API**: Firebase Auth compatible
- **User Management**: Firebase Auth user profiles

### 🔄 Architecture Changes

| **Before (Express.js)** | **After (Firebase Functions)** |
|-------------------------|--------------------------------|
| Custom JWT authentication | Firebase Auth |
| PostgreSQL + Drizzle ORM | Firestore |
| Express.js routes | Cloud Functions (callable) |
| Session-based auth | Firebase ID tokens |
| Manual scaling | Auto-scaling |
| Server maintenance | Serverless |

## 🚀 Function Exports

### Authentication Functions
```typescript
// Replace /api/auth/* routes
export const getCurrentUser
export const updateUserProfile
export const createUserDocument
export const searchUsers
export const deleteUserAccount
```

### Wishlist Functions
```typescript
// Replace /api/wishlists/* routes
export const getUserWishlists
export const getWishlistById
export const getSharedWishlist
export const createWishlist
export const updateWishlist
export const deleteWishlist
export const getWishlistItems
export const addWishlistItem
```

### Notification Functions
```typescript
// Replace /api/notifications/* routes
export const getUserNotifications
export const markNotificationAsRead
export const markAllNotificationsAsRead
export const deleteNotification
export const createSystemNotification
export const getNotificationSettings
export const updateNotificationSettings
export const cleanOldNotifications
```

### Price Tracking Functions
```typescript
// Replace /api/price-tracking/* routes
export const scheduledPriceCheck
export const createPriceAlert
export const getUserPriceAlerts
export const updatePriceAlert
export const deletePriceAlert
export const manualPriceCheck
export const onPriceAlertCreated
```

### Browser Extension Functions
```typescript
// Replace /api/extension/* routes
export const authenticateExtension
export const getExtensionWishlists
export const addItemFromExtension
export const getExtensionRecentItems
export const createExtensionWishlist
export const deleteExtensionItem
export const getExtensionAnalytics
```

## 🔧 Client Integration

### Web App Integration
The web app now uses Firebase callable functions instead of REST API calls:

```typescript
// Before (REST API)
const response = await fetch('/api/wishlists', {
  headers: { 'Authorization': `Bearer ${token}` }
});

// After (Firebase Callable)
import { getFunctions, httpsCallable } from 'firebase/functions';
const functions = getFunctions();
const getUserWishlists = httpsCallable(functions, 'getUserWishlists');
const result = await getUserWishlists();
```

### Authentication Changes
```typescript
// Before (Custom JWT)
const token = localStorage.getItem('authToken');

// After (Firebase Auth)
import { getAuth, onAuthStateChanged } from 'firebase/auth';
const auth = getAuth();
onAuthStateChanged(auth, (user) => {
  // User is automatically authenticated for callable functions
});
```

## 📱 Browser Extension Updates

The browser extension now uses Firebase Auth ID tokens:

```typescript
// Before (Custom JWT)
const token = await chrome.storage.local.get(['authToken']);

// After (Firebase Auth)
import { getAuth } from 'firebase/auth';
const auth = getAuth();
const user = auth.currentUser;
if (user) {
  const idToken = await user.getIdToken();
  // Functions automatically handle authentication
}
```

## 🔥 Firestore Data Structure

### Collections Schema
```
/users/{uid}
  - id: string
  - email: string
  - displayName: string
  - username: string
  - createdAt: timestamp
  - preferences: object

/wishlists/{wishlistId}
  - userId: string
  - name: string
  - description: string
  - isPublic: boolean
  - isCollaborative: boolean
  - shareId: string
  - createdAt: timestamp

/wishlistItems/{itemId}
  - wishlistId: string
  - title: string
  - productUrl: string
  - imageUrl: string
  - price: string
  - addedBy: string
  - createdAt: timestamp

/notifications/{notificationId}
  - userId: string
  - type: string
  - title: string
  - content: string
  - isRead: boolean
  - createdAt: timestamp

/priceAlerts/{alertId}
  - userId: string
  - itemId: string
  - targetPrice: number
  - isActive: boolean
  - createdAt: timestamp
```

## 🛡️ Security Rules

Firestore Security Rules are automatically enforced:

```javascript
// Example rule for wishlists
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /wishlists/{wishlistId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

## 📈 Performance Benefits

1. **Auto-scaling**: Functions scale from 0 to thousands of instances
2. **Cold Start Optimization**: Firebase Functions v2 with optimized memory
3. **Real-time Updates**: Firestore real-time listeners
4. **Global CDN**: Firebase hosting with worldwide edge locations
5. **Caching**: Built-in Firebase caching for static content

## 🔄 Deployment Process

### 1. Deploy Functions
```bash
firebase deploy --only functions
```

### 2. Update Web App
```bash
cd packages/web
npm run build
firebase deploy --only hosting
```

### 3. Test Functions
```bash
# Test locally
firebase emulators:start --only functions,firestore

# Test deployed functions
firebase functions:log
```

## 📊 Monitoring & Analytics

Firebase provides built-in monitoring:

1. **Cloud Functions Metrics**: Execution time, memory usage, errors
2. **Firestore Metrics**: Read/write operations, storage usage
3. **Authentication Metrics**: Sign-ups, sign-ins, active users
4. **Performance Monitoring**: Real user metrics (RUM)

## 🚨 Migration Checklist

- [x] Migrate authentication to Firebase Auth
- [x] Convert Express routes to Cloud Functions
- [x] Migrate database from PostgreSQL to Firestore
- [x] Update web app to use callable functions
- [x] Update browser extension authentication
- [x] Implement Firestore security rules
- [x] Set up Cloud Scheduler for price tracking
- [x] Configure Firebase hosting
- [x] Add monitoring and logging
- [x] Test all API endpoints
- [x] Update documentation

## 🎉 Migration Complete!

The Express.js API server has been successfully migrated to Firebase Functions v2. All functionality is preserved while gaining the benefits of:

- Serverless architecture
- Auto-scaling
- Real-time capabilities
- Enhanced security
- Reduced maintenance
- Cost optimization

The legacy Express.js server can now be decommissioned, and all clients should use the new Firebase Functions API.