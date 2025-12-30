# Firebase Firestore Data Migration Guide

This document outlines the complete migration from PostgreSQL/Drizzle to Firebase Firestore for the Wishlist Wizard application.

## Overview

The migration transforms the application from a traditional PostgreSQL database to Firebase Firestore, enabling:

- **Real-time synchronization** across all clients
- **Offline support** with automatic sync when connection is restored
- **Serverless scaling** with Firebase Functions
- **Enhanced security** with Firestore security rules
- **Collaborative features** with live updates
- **Push notifications** with Firebase Cloud Messaging integration

## Migration Components

### 1. **Database Schema Transformation**

| PostgreSQL Table | Firestore Collection | Changes |
|------------------|---------------------|---------|
| `users` | `users` | Document ID = user.id |
| `beneficiaries` | `beneficiaries` | Document ID = beneficiary.id |
| `wishlists` | `wishlists` | Document ID = wishlist.id |
| `wishlist_items` | `wishlistItems` | Document ID = item.id |
| `wishlist_collaborators` | `collaborators` | Document ID = collaborator.id |
| `notifications` | `notifications` | Document ID = notification.id |
| `price_alerts` | `priceAlerts` | Document ID = alert.id |

### 2. **Data Type Conversions**

- **Timestamps**: PostgreSQL `timestamp` → Firestore `Timestamp`
- **JSON fields**: PostgreSQL `jsonb` → Firestore `map`
- **Arrays**: PostgreSQL `array` → Firestore `array`
- **Booleans**: PostgreSQL `boolean` → Firestore `boolean`
- **NULL values**: Removed (Firestore doesn't store undefined)

### 3. **Storage Implementation**

The application uses a storage abstraction layer (`IStorage`) with implementations:

- **Development**: Memory storage (`MemStorage`)
- **Production**: Firestore storage (`FirestoreStorage`)

Environment variable `USE_FIRESTORE=true` switches to Firestore mode.

## Migration Process

### Prerequisites

1. **Firebase Project Setup**
   ```bash
   # Install Firebase CLI
   npm install -g firebase-tools
   
   # Login to Firebase
   firebase login
   
   # Initialize Firebase in project
   firebase init
   ```

2. **Environment Variables**
   ```env
   # Firebase Configuration
   VITE_FIREBASE_API_KEY=your_api_key
   VITE_FIREBASE_AUTH_DOMAIN=project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=sender_id
   VITE_FIREBASE_APP_ID=app_id
   VITE_FIREBASE_MEASUREMENT_ID=measurement_id
   
   # Service Account for Migration
   FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
   
   # Enable Firestore
   USE_FIRESTORE=true
   ```

### Step 1: Deploy Firestore Configuration

```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy composite indexes
firebase deploy --only firestore:indexes
```

### Step 2: Run Data Migration

```bash
# Dry run to preview migration
npm run migrate:firestore -- --dry-run

# Execute migration
npm run migrate:firestore

# Or with custom batch size
npm run migrate:firestore -- --batch-size=50
```

### Step 3: Validation

The migration script automatically validates:

- **Record counts** match between PostgreSQL and Firestore
- **Data integrity** with spot checks
- **Index creation** for optimal query performance

### Step 4: Switch to Firestore

```bash
# Set environment variable
export USE_FIRESTORE=true

# Restart application
npm run dev
```

## Real-time Features

### Available Hooks

```typescript
// Real-time wishlists
const { wishlists, loading, error } = useUserWishlists(userId);

// Real-time wishlist items
const { items, loading, error } = useWishlistItems(wishlistId);

// Real-time notifications
const { notifications, unreadCount, loading, error } = useUserNotifications(userId);

// Real-time collaborators
const { collaborators, loading, error } = useWishlistCollaborators(wishlistId);

// Active collaborators (who's online)
const { activeCollaborators } = useActiveCollaborators(wishlistId);

// Real-time beneficiaries
const { beneficiaries, loading, error } = useUserBeneficiaries(userId);

// Real-time price alerts
const { priceAlerts, loading, error } = useUserPriceAlerts(userId);
```

### Usage Example

```typescript
import React from 'react';
import { useUserWishlists, useWishlistItems } from '../lib/firestore';
import { useAuth } from '../contexts/AuthContext';

function WishlistDashboard() {
  const { user } = useAuth();
  const { wishlists, loading: wishlistsLoading } = useUserWishlists(user?.uid);
  const { items, loading: itemsLoading } = useWishlistItems(wishlists[0]?.id);

  if (wishlistsLoading) return <div>Loading wishlists...</div>;

  return (
    <div>
      <h2>Your Wishlists ({wishlists.length})</h2>
      {wishlists.map(wishlist => (
        <div key={wishlist.id}>
          <h3>{wishlist.name}</h3>
          {wishlist.id === wishlists[0]?.id && (
            <div>
              {itemsLoading ? 'Loading items...' : `${items.length} items`}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
```

## Security Rules

### Production Security Rules

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuthenticated() {
      return request.auth != null;
    }
    
    function isOwner(resource) {
      return request.auth.uid == resource.data.userId;
    }
    
    function canAccessWishlist(wishlistId) {
      let wishlist = get(/databases/$(database)/documents/wishlists/$(wishlistId));
      return wishlist.data.userId == request.auth.uid ||
             wishlist.data.isPublic == true ||
             exists(/databases/$(database)/documents/collaborators/$(wishlistId + '_' + request.auth.uid));
    }
    
    // Users can only access their own data
    match /users/{userId} {
      allow read, write: if isAuthenticated() && request.auth.uid == userId;
    }
    
    // Wishlists with owner/collaborator access
    match /wishlists/{wishlistId} {
      allow read: if isAuthenticated() && 
        (isOwner(resource) || 
         resource.data.isPublic == true ||
         exists(/databases/$(database)/documents/collaborators/$(wishlistId + '_' + request.auth.uid)));
      
      allow create: if isAuthenticated() && 
        request.auth.uid == request.resource.data.userId;
      
      allow update: if isAuthenticated() && 
        (isOwner(resource) || 
         exists(/databases/$(database)/documents/collaborators/$(wishlistId + '_' + request.auth.uid)));
      
      allow delete: if isAuthenticated() && isOwner(resource);
    }
    
    // ... (additional rules for other collections)
  }
}
```

## Performance Optimization

### Composite Indexes

```json
{
  "indexes": [
    {
      "collectionGroup": "wishlists",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "wishlistItems",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "wishlistId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

### Query Optimization

- **Use composite indexes** for complex queries
- **Limit results** with `.limit()` for pagination
- **Order by indexed fields** for better performance
- **Use array-contains** instead of multiple `==` queries
- **Batch operations** for multiple writes

## Collaborative Features

### Real-time Collaboration

```typescript
// Track active collaborators
const { activeCollaborators } = useActiveCollaborators(wishlistId);

// Show who's currently viewing the wishlist
function CollaboratorIndicator() {
  return (
    <div className="flex -space-x-2">
      {activeCollaborators.map(collaborator => (
        <img
          key={collaborator.id}
          src={collaborator.user?.avatarUrl}
          alt={collaborator.user?.displayName}
          className="w-8 h-8 rounded-full border-2 border-white"
        />
      ))}
    </div>
  );
}
```

### Live Updates

- **Wishlist changes** sync in real-time across all users
- **Item additions/updates** appear instantly for collaborators
- **Reservations and purchases** update immediately
- **Notifications** delivered in real-time

## Troubleshooting

### Common Issues

1. **Permission Denied**
   - Check Firestore security rules
   - Verify user authentication
   - Confirm document ownership

2. **Index Errors**
   - Deploy composite indexes: `firebase deploy --only firestore:indexes`
   - Wait for index creation (can take minutes)

3. **Real-time Updates Not Working**
   - Check Firebase configuration
   - Verify network connectivity
   - Ensure proper cleanup of listeners

4. **Migration Failures**
   - Check service account permissions
   - Verify environment variables
   - Review migration logs for specific errors

### Debug Mode

```typescript
// Enable Firestore debug logging
import { connectFirestoreEmulator, enableNetwork } from 'firebase/firestore';

if (import.meta.env.DEV) {
  // Connect to emulator for local development
  connectFirestoreEmulator(db, 'localhost', 8080);
}
```

## Rollback Plan

If issues occur, rollback steps:

1. **Switch back to PostgreSQL**
   ```bash
   export USE_FIRESTORE=false
   npm restart
   ```

2. **Restore from PostgreSQL backup**
   ```bash
   pg_restore -d wishlist_wizard backup.sql
   ```

3. **Re-sync any new data** created during Firestore period

## Performance Monitoring

### Firebase Performance Monitoring

```typescript
import { getPerformance, trace } from 'firebase/performance';

const perf = getPerformance();
const t = trace(perf, 'wishlist_load');
t.start();

// ... load wishlists
t.stop();
```

### Analytics

```typescript
import { logEvent } from 'firebase/analytics';

logEvent(analytics, 'wishlist_created', {
  wishlist_id: wishlist.id,
  item_count: items.length
});
```

## Next Steps

After successful migration:

1. **Monitor performance** and user experience
2. **Implement push notifications** with FCM
3. **Add offline support** features
4. **Optimize real-time subscriptions** based on usage patterns
5. **Consider PostgreSQL decommissioning** after validation period

## Support

For migration issues:
- Check Firebase Console for errors
- Review Firestore security rules
- Validate environment configuration
- Monitor real-time database usage in Firebase Console