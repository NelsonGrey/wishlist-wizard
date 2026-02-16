# Wishlist Wizard - Database Schema & Data Modeling

**Version**: 1.0  
**Last Updated**: February 16, 2026  
**Owner**: Mark Nelson

---

## 📋 Overview

This document describes the current Firestore data model used by Firebase Functions. A legacy SQL schema exists in the shared package, but production reads and writes are performed against Firestore.

---

## 🔥 Cloud Firestore Collections

### 1. Users Collection

**Path**: `/users/{userId}`

**Purpose**: Stores user profile information and settings

**Document Structure**:
```typescript
interface User {
  uid: string;                          // Firebase UID (primary key)
  email: string;                        // User email
  displayName: string;                  // Display name
  avatarUrl?: string;                   // Avatar image URL
  bio?: string;                         // User bio
  
  // Account Information
  accountType: "personal" | "creator" | "admin";
  accountStatus: "active" | "suspended" | "deleted";
  emailVerified: boolean;
  emailVerifiedAt?: Timestamp;
  
  // Preferences
  preferences: {
    theme: "light" | "dark" | "system";
    language: string;                   // ISO 639-1 code (e.g., "en")
    timezone: string;                   // IANA timezone
    notifications: {
      priceDrops: boolean;
      collaborationInvites: boolean;
      reminderEmails: boolean;
      pushNotifications: boolean;
      emailDigest: "daily" | "weekly" | "monthly" | "never";
    };
    privacy: {
      profilePublic: boolean;
      showActivityStatus: boolean;
      allowMessageRequests: boolean;
    };
  };
  
  // Account Linking
  socialAccounts?: {
    google?: string;                    // Google user ID
    apple?: string;                     // Apple user ID
    facebook?: string;                  // Facebook user ID
  };
  
  // Affiliate Program
  affiliateInfo?: {
    affiliateId: string;
    joinedAt: Timestamp;
    commissionRate: number;             // 0-1 decimal
    totalEarnings: number;
    pendingEarnings: number;
    bankAccountLinked: boolean;
  };
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  lastLoginAt?: Timestamp;
  deletedAt?: Timestamp;
}
```

**Indexes**:
- `email` (unique)
- `accountStatus` + `createdAt`
- `affiliateId` (unique, if present)

---

### 2. Wishlists Collection

**Path**: `/wishlists/{wishlistId}`

**Purpose**: Stores wishlist documents with metadata

**Document Structure**:
```typescript
interface Wishlist {
  id: string;                           // Auto-generated ID (primary key)
  userId: string;                       // Owner's user ID (foreign key)
  beneficiaryId?: string;               // Beneficiary user ID if different from owner
  
  // Basic Information
  name: string;                         // Wishlist name
  description?: string;                 // Wishlist description

  // Occasion Information
  occasion?: string;                    // e.g., "Birthday", "Christmas"
  occasionDate?: Timestamp;             // When the event is happening

  // Access & Sharing
  shareId: string;                      // Unique public share ID
  isPublic: boolean;                    // Can be accessed via share link
  isCollaborative: boolean;             // Allow collaborative editing

  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- `userId` + `createdAt`
- `shareId` (unique)
- `beneficiaryId` + `userId`

**Collections Used**:
- `wishlistItems` - Items are stored in a top-level collection with `wishlistId` references
- `collaborators` - Collaborators are stored in a top-level collection with `wishlistId` references

---

### 3. Items (WishlistItems) Collection

**Path**: `/wishlistItems/{itemId}`

**Purpose**: Stores individual wishlist items with price and purchase info

**Document Structure**:
```typescript
interface WishlistItem {
  id: string;                           // Auto-generated ID
  wishlistId: string;                   // Parent wishlist ID
  userId: string;                       // Item creator
  
  // Product Information
  title: string;                        // Item title
  description?: string;                 // Item description
  productUrl?: string;                  // Link to product
  imageUrl?: string;                    // Product image
  store?: string;                       // Retailer name

  // Pricing Information
  price?: string | number | null;       // Stored as string or number

  // Priority & Notes
  priority?: number;                    // Default: 1
  note?: string | null;                 // Optional note

  // Attribution
  addedBy: string;                      // UID of item creator

  // Reservation & Purchase Tracking
  reservedBy?: string | null;           // UID
  purchasedBy?: string | null;          // UID

  // Metadata
  metadata?: {
    affiliateConversion?: {
      originalUrl: string | null;
      affiliateProgram: string | null;
      convertedAt: string;
      commission: number;
      tagUsed: string | null;
    };
  };

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Indexes**:
- `wishlistId` + `status` + `priority`
- `wishlistId` + `priority`
- `lastPriceUpdate` (for price tracking queries)
- `productUrl` (for deduplication)

**Subcollections**:
- `priceHistory/` - Complete price history (if keeping detailed)
- `comments/` - Comments on item (if enabled)

---

### 4. PriceHistory Collection

**Path**: `/priceHistory/{priceHistoryId}` (Optional - if not using items subcollection)

**Purpose**: Maintains complete price history for analytics and tracking

**Document Structure**:
```typescript
interface PriceHistory {
  id: string;
  itemId: string;                       // Reference to item
  wishlistId: string;                   // Denormalized for faster queries
  
  price: number;
  previousPrice: number;
  priceChange: number;                  // price - previousPrice
  changePercentage: number;             // (priceChange / previousPrice) * 100
  
  retailer: string;
  productUrl: string;
  
  // Tracking metadata
  source: "manual" | "automated" | "api" | "scraper";
  scrapedAt: Timestamp;
  
  // Analysis
  userNotified: boolean;
  notificationSentAt?: Timestamp;
}
```

**Indexes**:
- `itemId` + `scrapedAt` (descending)
- `wishlistId` + `scrapedAt`
- `priceChange` (descending) - for finding best drops
- `retailer` + `scrapedAt`

---

### 5. Notifications Collection

**Path**: `/notifications/{notificationId}`

**Purpose**: Stores user notifications

**Document Structure**:
```typescript
interface Notification {
  id: string;
  userId: string;                       // Recipient
  
  // Notification Details
  type: "price_drop" | "collaboration_invite" | "item_reserved" | 
        "item_purchased" | "reminder" | "review_request" | "comment";
  
  title: string;
  message: string;
  icon?: string;                        // Icon emoji or URL
  
  // Related Entity
  relatedEntityId?: string;             // Item, Wishlist, User, etc.
  relatedEntityType?: string;           // Type of related entity
  
  // Metadata
  actionUrl?: string;                   // Deep link to action
  
  // Data
  data?: {
    [key: string]: any;
  };
  
  // Status
  isRead: boolean;
  readAt?: Timestamp;

  // Timestamps
  createdAt: Timestamp;
}
```

**Indexes**:
- `userId` + `isRead` + `createdAt` (descending)
- `userId` + `createdAt` (descending)

---

### 6. UserDevices Collection

**Path**: `/users/{userId}/devices/{deviceId}` (Subcollection)

**Purpose**: Tracks user devices for push notifications and sync

**Document Structure**:
```typescript
interface UserDevice {
  id: string;
  userId: string;
  
  // Device Information
  deviceType: "web" | "ios" | "android" | "extension";
  deviceName: string;
  osVersion: string;
  appVersion: string;
  
  // Browser Information (web/extension)
  browser?: string;
  browserVersion?: string;
  
  // Push Notification Token
  pushToken?: string;
  pushTokenExpired: boolean;
  
  // Device Identifiers
  deviceId: string;                     // Unique device identifier
  fingerprint?: string;                 // Device fingerprint
  
  // Last Activity
  lastActiveAt: Timestamp;
  
  // Device Status
  active: boolean;
  registeredAt: Timestamp;
}
```

---

### 7. Collaborators Collection

**Path**: `/collaborators/{collaboratorId}`

**Purpose**: Tracks collaborators and their permissions

**Document Structure**:
```typescript
interface Collaborator {
  userId: string;                       // Collaborator UID
  wishlistId: string;                   // Wishlist reference
}
```

---

### 8. Beneficiaries Collection

**Path**: `/users/{userId}/beneficiaries/{beneficiaryId}` (Subcollection)

**Purpose**: Tracks people for whom user creates wishlists

**Document Structure**:
```typescript
interface Beneficiary {
  id: string;
  userId: string;                       // Owner
  
  // Personal Information
  name: string;
  email?: string;
  relationship: "child" | "spouse" | "parent" | "friend" | "colleague" | "other";
  
  // Additional Info
  avatarUrl?: string;
  dateOfBirth?: Timestamp;
  interests: string[];
  notes?: string;
  
  // Tracking
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // Status
  status: "active" | "inactive" | "archived";
}
```

---

### 9. GroupGifts Collection

**Path**: `/groupGifts/{groupGiftId}`

**Purpose**: Tracks group gift coordination

**Document Structure**:
```typescript
interface GroupGift {
  id: string;
  itemId: string;                       // Reference to wishlist item
  wishlistId: string;                   // Reference to wishlist
  createdByUserId: string;
  
  // Group Information
  title: string;
  description?: string;
  occasion?: string;
  
  // Financial Tracking
  targetAmount: number;
  collectedAmount: number;
  currency: string;
  
  // Participants
  organizer: string;                    // Main organizer
  contributors: {
    [userId: string]: {
      amount: number;
      status: "pending" | "confirmed" | "paid";
      contributedAt?: Timestamp;
    };
  };
  
  // Status & Timeline
  status: "organizing" | "collecting" | "ready" | "purchased" | "completed";
  createdAt: Timestamp;
  targetDate?: Timestamp;
  completedAt?: Timestamp;
}
```

---

### 10. ActivityLog Collection

**Path**: `/wishlists/{wishlistId}/activity/{activityId}` (Subcollection)

**Purpose**: Tracks all actions on a wishlist

**Document Structure**:
```typescript
interface ActivityLog {
  id: string;
  wishlistId: string;
  
  userId: string;                       // User who performed action
  action: "created" | "updated" | "deleted" | "item_added" | 
          "item_removed" | "item_reserved" | "item_purchased" | 
          "collaborator_added" | "comment_added";
  
  // Details
  details: {
    [key: string]: any;                 // Action-specific details
  };
  
  // Affected Entity
  relatedEntityId?: string;
  relatedEntityType?: string;
  
  // Metadata
  timestamp: Timestamp;
  ipAddress?: string;
  userAgent?: string;
}
```

---

### 11. PriceTracking Collection

**Path**: `/priceTracking/{trackingId}`

**Purpose**: Active price tracking jobs and configuration

**Document Structure**:
```typescript
interface PriceTrackingJob {
  id: string;
  itemId: string;
  wishlistId: string;
  userId: string;
  
  // Product Information
  url: string;
  retailer: string;
  productTitle: string;
  
  // Tracking Configuration
  enabled: boolean;
  frequency: "hourly" | "daily" | "weekly";
  
  // Alert Configuration
  alerts: {
    priceDropThreshold: number;
    priceDropPercentage: number;
    stockAvailable: boolean;
  };
  
  // Tracking Status
  lastCheckedAt?: Timestamp;
  lastPrice?: number;
  lastStatus?: "success" | "failed" | "timeout";
  consecutiveFailures: number;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  pausedAt?: Timestamp;
}
```

---

## 🐘 PostgreSQL Tables (Supplementary)

### Why PostgreSQL?

PostgreSQL is used for:
- Complex queries and analytics
- Transactional consistency
- Session management
- Audit logging

### Table: users

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  firebase_uid VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255),
  avatar_url TEXT,
  account_type VARCHAR(50),
  account_status VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_firebase_uid ON users(firebase_uid);
```

### Table: sessions

```sql
CREATE TABLE sessions (
  id VARCHAR(255) PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);
```

### Table: audit_logs

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

---

## 🔄 Relationships & Foreign Keys

### Primary Relationships

```
User (1) ──→ (many) Wishlists
  └─→ hasMany wishlists via userId

User (1) ──→ (many) Beneficiaries
  └─→ hasMany beneficiaries via userId

Wishlist (1) ──→ (many) Items
  └─→ hasMany items (subcollection)

Wishlist (1) ──→ (many) Collaborators
  └─→ hasMany collaborators (subcollection)

User (many) ←──→ (many) Wishlists (Collaborators)
  └─→ through Collaborators collection

WishlistItem (1) ──→ (many) Reservations
  └─→ hasMany reservations via reservations field

WishlistItem (1) ──→ (1) PurchaseInfo
  └─→ has one purchase

WishlistItem (1) ──→ (many) PriceHistory
  └─→ hasMany price history entries

GroupGift (1) ──→ (many) Contributors
  └─→ hasMany via contributors field

WishlistItem (1) ──→ (1) GroupGift
  └─→ has one if item is part of group gift
```

---

## 📊 Data Types & Validation

### Common Field Types

**Timestamps**: Firestore Timestamp (milliseconds since epoch)
**Currency**: ISO 4217 standard (e.g., "USD", "EUR", "GBP")
**Decimal**: Numbers stored as floats (consider BigDecimal for financial data)
**Languages**: ISO 639-1 codes (e.g., "en", "es", "fr")
**Timezones**: IANA timezone database (e.g., "America/New_York")

### Validation Rules

**Email**: RFC 5322 compliant  
**URLs**: Valid HTTP/HTTPS URLs only  
**Prices**: Non-negative numbers, max 9,999,999.99  
**Quantities**: 1-999 inclusive  
**Priorities**: 1-5 inclusive  
**Percentages**: 0-100 inclusive  

---

## 🔐 Data Privacy & Security

### PII (Personally Identifiable Information)

**Never Stored in Logs**:
- Email addresses
- Phone numbers
- Passwords (never stored, only hashed)
- Payment information
- Social security numbers

**Encrypted at Rest**:
- Email addresses (application level)
- Phone numbers
- Financial information

### Access Control

- Only user's own data accessible by default
- Collaborators can access shared wishlists
- Admins have elevated access (logged and audited)
- Service accounts have scoped permissions

---

## 📈 Performance Considerations

### Indexing Strategy

**Hot Queries**:
- User wishlists (indexed: userId + createdAt)
- Notification queries (indexed: userId + isRead + createdAt)
- Public wishlists (indexed: shareId)

**Query Optimization**:
- Use denormalization for frequently accessed fields (itemCount, totalValue)
- Limit read operations through pagination
- Archive old activity logs
- Implement document size limits (max 1MB per Firestore document)

### Storage Optimization

**Reduce Document Size**:
- Move large arrays to subcollections
- Compress image URLs
- Archive old price history
- Delete expired notifications

---

## 🔄 Migration & Evolution

### Schema Evolution Strategy

1. **Backwards Compatibility**: Add new fields with defaults
2. **Gradual Migration**: Use background jobs to migrate data
3. **Versioning**: Use schema versions for complex changes
4. **Testing**: Comprehensive test coverage before migration

### Archival Strategy

- Archive wishlists > 2 years old
- Delete notifications > 90 days old
- move price history to cold storage after 2 years
- Keep audit logs for 7 years

---

## 📚 Related Documentation

- [System Architecture](SYSTEM_ARCHITECTURE.md)
- [API Reference](API_REFERENCE.md)
- [Firebase Implementation](FIREBASE_IMPLEMENTATION_SUMMARY.md)

