# Wishlist Wizard - System Architecture

**Version**: 1.1
**Last Updated**: January 2025
**Owner**: Mark Nelson

---

## 🏗️ Architecture Overview

Wishlist Wizard is a multi-platform, cloud-native application built on a Firebase-first architecture with distributed frontend clients. The system is designed to support web, mobile, and browser extension clients through a unified backend.

### High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                             │
├─────────────────┬──────────────────┬──────────────────┬──────────┤
│   Web App       │   Mobile App     │  Browser Ext.    │  Desktop │
│  (React/TS)     │  (Flutter)       │  (Manifest v3)   │  (TBD)   │
└────────┬────────┴────────┬─────────┴────────┬─────────┴──────────┘
         │                 │                  │
         └─────────────────┼──────────────────┘
                           │
         ┌─────────────────┴──────────────────┐
         │                                    │
    ┌────▼─────┐                     ┌───────▼───────┐
    │ Firebase │                     │   Firebase    │
    │ Functions│◄────────────────►   │   Services    │
    │ (Callable)     Firebase SDK    │               │
    └────┬─────┘                     └───────┬───────┘
       │                                   │
      ┌──▼──────────────────────────────────▼────┐
      │            Backend Services               │
      ├──────────────────────────────────────────┤
      │ • Authentication & Authorization        │
      │ • Business Logic Services                │
      │ • Price Tracking & Analytics             │
      │ • Notification Services                  │
      │ • Recommendation Engine                  │
      │ • Calendar Integration                   │
      │ • Profile Management                     │
      └──┬───────────────────────────────────────┘
       │
    ┌────┴─────────────────────────┬─────────────┐
    │                               │             │
  ┌───▼──────┐              ┌────────▼────┐   ┌───▼────┐
  │Firestore │              │  Firebase   │   │External│
  │Database  │              │ Functions   │   │ APIs   │
  └──────────┘              └─────────────┘   └────────┘
    │                           │
    ├───────────────────────────┤
    │ • Analytics Database      │
    │ • Real-time Sync          │
    │ • Event Triggers          │
    └───────────────────────────┘
```

---

## 📦 Component Architecture

### 1. Frontend Applications

#### 1.1 Web Application (`packages/web`)
**Technology Stack**: React 19.x with TypeScript  
**Build Tool**: Vite  
**State Management**: TanStack Query (React Query)  
**Styling**: Tailwind CSS with custom components (Radix UI-based)  

**Key Features**:
- Responsive design (mobile-first approach)
- Real-time dashboard with wishlist management
- Advanced search and filtering
- Price tracking visualization
- Collaborative features UI
- Admin panel access
- Analytics dashboard
- Social sharing interface
- **NEW**: Enhanced error boundaries with recovery options
- **NEW**: Loading skeleton components for async operations
- **NEW**: Optimized bundle size with code splitting
- **NEW**: Improved type safety (eliminated any types)

**Directory Structure**:
```
packages/web/
├── client-src/
│   ├── pages/              # Page components
│   ├── components/         # Reusable components
│   │   ├── ui/            # UI components (loading-skeleton.tsx, error-boundary.tsx)
│   │   └── ...
│   ├── hooks/              # Custom React hooks
│   ├── services/           # API client services
│   ├── stores/             # State management
│   ├── types/              # TypeScript types
│   ├── utils/              # Utility functions
│   └── styles/             # Global styles
├── public/                 # Static assets
├── vite.config.ts          # Vite configuration (with manual chunk splitting)
└── tailwind.config.ts      # Tailwind CSS config
```

**Key Pages**:
- Authentication (Login/Register)
- Dashboard (Wishlists overview)
- Wishlist Details & Management
- Item Management
- Collaboration interface
- Shared Wishlist View
- Profile Settings
- Privacy Controls
- Analytics Dashboard
- Price Tracking Dashboard

#### 1.2 Mobile Application (`packages/mobile`)
**Technology Stack**: Flutter 3.8+  
**State Management**: Provider  
**Local Storage**: SharedPreferences & Secure Storage  
**API Communication**: Dio  

**Key Features**:
- Native iOS and Android apps
- Offline-first functionality
- Push notifications
- Camera & image picker integration
- Biometric authentication
- Deep linking
- **NEW**: Password reset flow with Firebase Auth
- **NEW**: Price tracking UI with custom charts
- **NEW**: Social sharing (WhatsApp, Instagram, TikTok, Facebook, Twitter, Email)
- **NEW**: Error boundaries and loading states

**Platform Support**:
- iOS 11.0+
- Android 7.0+ (API 24)

**Key Screens**:
- Authentication flows (Login, Register, Forgot Password)
- Wishlist browsing and creation
- Item management
- Collaboration features
- Push notification handling
- Local wishlist cache
- **NEW**: Price tracking screen with charts
- **NEW**: Social sharing bottom sheet

**Directory Structure**:
```
packages/mobile/
├── lib/
│   ├── screens/            # Screen widgets
│   │   ├── forgot_password_screen.dart
│   │   ├── price_tracking_screen.dart
│   │   └── ...
│   ├── services/           # Business logic services
│   │   ├── firebase_auth_service.dart (with resetPassword)
│   │   ├── social_share_service.dart
│   │   └── ...
│   ├── providers/          # State management
│   ├── models/             # Data models
│   ├── widgets/            # Reusable widgets
│   │   ├── error_boundary.dart
│   │   ├── loading_skeleton.dart
│   │   └── ...
│   └── main.dart           # App entry point (with ErrorBoundary)
```

#### 1.3 Browser Extension (`packages/browser-extension`)
**Technology Stack**: TypeScript with Web APIs  
**Manifest Version**: v3  
**Build Tool**: Vite  

**Key Features**:
- Product page detection and extraction
- One-click item addition
- Price comparison across retailers
- Automatic product information extraction
- User authentication
- Real-time price tracking

**Supported Retailers** (40+):
- Amazon
- eBay
- Walmart
- Target
- Best Buy
- Etsy
- AliExpress
- And many more...

**Architecture**:
- Service Worker (background script)
- Content Scripts (page interaction)
- Popup UI (quick access)
- Options page (configuration)

### 2. Backend Services

#### 2.1 Firebase Functions API (`packages/functions`)
**Platform**: Node.js 20+  
**Runtime**: Firebase Cloud Functions (v2)  
**Database**: Cloud Firestore  
**Authentication**: Firebase Auth (ID tokens with callable functions)  

> **Note (2026-07-17):** `packages/functions/` is gitignored in this repo. The
> backend source of record now lives in the private companion repo
> `NelsonGrey/wishlist-wizard-functions`. A local clone into this path is
> used for emulator/reference work, but it is not part of this repo's own
> git history — don't expect a fresh `git clone` of this repo to include it.

**Core Services**:
- User authentication and profile management
- Wishlist CRUD operations
- Item management
- Collaboration management
- Price tracking coordination
- Notification dispatching
- Calendar integration
- Analytics aggregation

**Callable API Surface**:
```
packages/functions/src/
├── api/
│   ├── router.ts              # `api` HTTP router — primary pattern for
│   │                           # public-facing endpoints (see below)
│   ├── wishlists.ts           # getUserWishlists, createWishlist, addWishlistItem — router-dispatched
│   ├── notifications.ts       # getUserNotifications, markAllNotificationsAsRead — router-dispatched
│   ├── extension.ts           # browser extension endpoints (standalone onCall)
│   ├── affiliate.ts           # affiliate link conversion — router-dispatched
│   ├── calendar.ts            # calendar integration — router-dispatched
│   ├── analytics.ts           # event tracking — router-dispatched
│   └── ...
├── auth/                      # auth helpers (standalone onCall)
├── crud/                      # generic Firestore CRUD (standalone onCall)
└── utils/                     # shared utilities
```

**Authentication Flow**:
1. Client signs in with Firebase Auth
2. Firebase SDK attaches ID token for callable functions
3. Functions validate `request.auth`
4. Firestore access is scoped to authenticated user

#### 2.2 Firebase Services
**Cloud Firestore**: Primary NoSQL database  
**Cloud Functions**: Serverless business logic  
**Firebase Authentication**: User auth (integrated)  
**Realtime Database**: Real-time sync for specific features  
**Firebase Messaging**: Push notifications  
**Firebase Hosting**: Web app deployment  

**Key Firebase Functions**:
- Price tracking automation
- Recommendation generation
- Event-driven workflows
- Email notifications
- Analytics processing
- Calendar synchronization

#### 2.3 Shared Libraries (`packages/shared`)
**Purpose**: Reusable TypeScript code across all packages  

**Contains**:
- Type definitions and interfaces
- Validation schemas (Zod)
- API client utilities
- Common business logic
- Firebase integration utilities
- Data transformation utilities

**Key Exports**:
```typescript
// Types
export interface Wishlist { ... }
export interface WishlistItem { ... }
export interface User { ... }

// Schemas
export const WishlistSchema = z.object({ ... })
export const ItemSchema = z.object({ ... })

// Utilities
export const formatPrice = (price: number) => ...
export const generateShareId = () => ...
```

---

## 🔄 Data Flow Architecture

### 1. User Authentication Flow

```
Client                           Firebase Auth              Firebase
  │                                   │                         │
  ├─ Sign up / sign in ──────────────>│                         │
  │                                   │                         │
  │                                   ├─ Create user ──────────>│
  │                                   │<─ UID returned ─────────┤
  │                                   │                         │
  │<─ ID token (SDK-managed) ─────────┤                         │
  │                                   │                         │
  │ Callable functions use            │                         │
  │ request.auth on each call         │                         │
```

### 2. Wishlist Management Flow

```
Client                          Firebase Functions          Firestore
  │                                   │                         │
  ├─ createWishlist() ───────────────>│ Validate auth          │
  │   (callable data)                  │ Authorize              │
  │                                   │                         │
  │                                   ├─ Create record ───────>│
  │                                   │<─ Document created ────┤
  │                                   │                         │
  │<─ Created wishlist object ────────┤                         │
  │                                   │                         │
  │ ┌──────────────────────────────────────────────┐            │
  │ │ Client listens to Firestore for updates      │            │
  │ │ Updates UI on document changes               │            │
  └─┤─ Firestore listener ──────────────────────────┤───────────>
   │                                   │<─ Real-time updates ──┤
   │<─ Live wishlist data ─────────────┤                         │
```

### 3. Price Tracking Flow

```
Client/Extension              Firebase Functions     Firestore    External APIs
  │                                   │                │              │
  ├─ Add item with URL ──────────────>│                │              │
  │                                   │                │              │
  │                                   ├─ Store URL ───>│              │
  │                                   │                │              │
  │                                   ├─ Queue price ──>│              │
  │                                   │   tracking job │              │
  │                                   │                │              │
  │                                   │                │   Scheduled  │
  │                                   │                │   polling    │
  │                                   │                │              │
  │                                   ├─ Fetch price ─────────────────>
  │                                   │<─ Current price ───────────────┤
  │                                   │                │              │
  │                                   ├─ Compare +       │              │
  │                                   │   update history ──────────────>
  │                                   │                │              │
  │                                   ├─ Generate alert │              │
  │                                   │   if drop       │              │
  │                                   │                │              │
  │<─ Price update notification ──────┤                │              │
```

### 4. Notification Flow

```
Events                              Services              Channels
  │                                   │                      │
  ├─ Wishlist created                 │                      │
  ├─ Item added/removed               │                      │
  ├─ Price drop detected        ──────>Notification         │
  ├─ Reminder triggered               │Service               ├──>In-app notification
  ├─ Collaboration invitation  ───────┤                      ├──>Push notification
  │                                   │                      ├──>Email
  │                                   │                      └──>SMS (optional)
```

---

## 🗄️ Database Structure Overview

### Firestore Collections

```
Users Collection
├── userId (doc)
│   ├── email
│   ├── displayName
│   ├── avatar
│   ├── preferences
│   └── metadata

Wishlists Collection
  ├── wishlistId (doc)
  │   ├── userId (owner)
  │   ├── name
  │   ├── description
  │   ├── occasion
  │   ├── occasionDate
  │   ├── isPublic
  │   ├── isCollaborative
  │   ├── shareId (public share link)
  │   ├── createdAt
  │   └── updatedAt

Items Collection (`wishlistItems`)
├── itemId (doc)
│   ├── wishlistId (ref)
│   ├── title
│   ├── description
│   ├── price
│   ├── productUrl
│   ├── imageUrl
│   ├── store
│   ├── priority
│   ├── note
│   ├── addedBy
│   ├── reservedBy
│   ├── purchasedBy
│   ├── metadata
│   ├── createdAt
│   └── updatedAt

PriceHistory Collection
├── priceHistoryId (doc)
│   ├── itemId (ref)
│   ├── price
│   ├── timestamp
│   └── retailer

Notifications Collection
├── notificationId (doc)
│   ├── userId (recipient)
│   ├── type
│   ├── title
│   ├── content
│   ├── data
│   ├── actionUrl
│   ├── isRead
│   ├── readAt
│   └── createdAt

Activity Logs (Subcollection)
├── activityId (doc)
│   ├── userId (actor)
│   ├── action
│   ├── details
│   └── timestamp
```

### PostgreSQL Tables (Legacy/Supplementary)
- The shared Drizzle schema in `packages/shared` documents a legacy SQL model.
- The current production backend uses Firestore with Firebase Functions.

---

## 🔐 Security Architecture

### Authentication & Authorization

**Multi-Layer Security**:
1. **Client-side**: Secure storage of tokens
   - Web: localStorage with httpOnly cookies when possible
   - Mobile: Secure storage via `flutter_secure_storage`
   - Extension: Secure storage in extension storage API

2. **Transport Security**:
   - HTTPS/TLS for all communications
   - Certificate pinning (mobile apps)

3. **Server-side Validation**:
  - Firebase Auth ID token validation
  - Rate limiting on sensitive endpoints
  - CORS policy enforcement

4. **Authorization**:
   - Role-based access control (Admin, Owner, Contributor, Viewer)
   - Resource-level permissions
   - User verification for sensitive operations

### Data Protection

- **At Rest**: Encrypted in Firestore/PostgreSQL
- **In Transit**: TLS 1.3+
- **Sensitive Data**: Never logged, masked in error messages
- **PII**: Segregated and access-controlled

---

## 📡 API Architecture

### Router-First HTTP API (current pattern, since 2026-07-23)

**Why**: This GCP org enforces a Domain Restricted Sharing policy that blocks
granting a *new* `allUsers` Cloud Run invoker binding. A standalone `onCall`
function is only reachable by a client if it has that binding — so any
function needing public/client invocation can no longer be deployed as a
standalone `onCall` export and expect it to actually work (a live gcloud IAM
audit found several that looked wired but were silently unreachable).

**Pattern**: Public-facing endpoints are implemented as plain functions and
dispatched by path/method from a single HTTP router — `api`, an `onRequest`
function defined in `packages/functions/src/api/router.ts` — exposed under
`/api/*`. The router itself is the one Cloud Run service that carries the
`allUsers` invoker binding; everything behind it is reached by internal
dispatch, not a per-function binding. This covers wishlists/items,
notifications, admin, billing/subscriptions, calendar, contacts, sync,
creator/affiliate tracking, commission ledger, payouts, analytics, and more.

**New public-facing endpoints must be added to `api/router.ts`, not deployed
as standalone `onCall` exports.**

**Authentication**: The router validates the bearer ID token itself
(`getBearerTokenFromHeaders` + `getAuth().verifyIdToken`) and reconstructs a
`CallableRequest`-shaped object for the underlying handler, so handler code
looks the same whether it's called via the router or (for the functions that
still are) as a real `onCall` export.

### Callable API (`httpsCallable`) — still used for a defined subset

A number of functions remain standalone `onCall` exports, invoked directly
via the Firebase SDK's `httpsCallable`. This is not something being migrated
away — it's the correct end state for functions that don't need the
public-invoker workaround, or that predate the org-policy discovery and were
simply never affected:

- **Auth/profile CRUD**: `createUserProfile`, `getUserProfile`, `updateUserProfile`
- **Generic Firestore CRUD**: `createDocument`, `getDocument`, `updateDocument`, `deleteDocument`, `listDocuments`, `batchCreateDocuments`, `batchUpdateDocuments`
- **Browser extension**: `authenticateExtension`, `getExtensionWishlists`, `addItemFromExtension`, `getExtensionRecentItems`, `createExtensionWishlist`, `deleteExtensionItem`, `shareExtensionWishlist`, `getExtensionAnalytics`, `trackExtensionEvent`
- **FCM / notification triggers**: `sendTestNotification`, `sendBatchNotification`, `notifyItemAdded`, `notifyItemReserved`, `notifyItemPurchased`, `notifyPriceAlert`, `replayDeferredPriceAlerts`, `createSystemNotification`, `cleanOldNotifications`
- **Group payments, AR lookup, admin bootstrap, checkout session**: `groupPaymentCreateIntent`, `confirmGroupContribution` (as `groupPaymentConfirm`), `getGroupGiftSummary` (as `groupGiftSummary`), `arModelLookup`, `bootstrapSuperAdmin`, `grantAdminRole`, `revokeAdminRole`, `createSupportTicket`, `checkoutSessionCreate`

**Response Format**: Both patterns return data directly or throw
`HttpsError` — client code doesn't need to distinguish which transport a
given callable uses.

### Callable/Router API Summary

```
Authentication & Profiles (standalone onCall)
  createUserProfile
  getUserProfile
  updateUserProfile

Wishlists (via `api` router)
  getUserWishlists
  getWishlistById
  getSharedWishlist
  createWishlist
  updateWishlist
  deleteWishlist

Items (via `api` router)
  getWishlistItems
  addWishlistItem
  updateWishlistItem
  deleteWishlistItem

Notifications (via `api` router, except where noted)
  getUserNotifications
  markNotificationAsRead
  markAllNotificationsAsRead
  deleteNotification
  createSystemNotification        # standalone onCall
  getNotificationSettings
  updateNotificationSettings

Browser Extension (standalone onCall)
  authenticateExtension
  getExtensionWishlists
  addItemFromExtension
  getExtensionRecentItems
  createExtensionWishlist

Creator/Affiliate & Commission Ledger (via `api` router)
  creatorAffiliateTrackingTagRequest, creatorAffiliateTrackingTagList
  creatorCommissionDashboardSummary, creatorCommissionLedgerList
  creatorConnectAccountCreate, creatorConnectOnboardingLink, creatorConnectAccountStatus
  creatorPayoutHistory

Achievements (via `api` router)
  getUserAchievements

See API_REFERENCE.md for complete callable documentation
```

---

## 🔄 Integration Patterns

### Real-Time Synchronization

**Firestore Listeners**:
- Established on app load for user's wishlists
- Automatic updates to client state
- Handles offline scenarios with local caching

**WebSocket (Optional)**:
- For collaborative real-time editing
- Fallback to polling if WebSocket unavailable

### External API Integrations

**E-commerce APIs**:
- Amazon Product Advertising API
- eBay API
- Walmart API
- Target API (Web scraping)
- Etsy API

**Calendar Services**:
- Google Calendar API
- Microsoft Outlook API
- Apple Calendar (via CalDAV)

**Payment Processing**:
- Stripe (for future monetization)
- PayPal (for affiliate payouts)

---

## 🚀 Deployment Architecture

### Multi-Environment Setup

**Development**:
- Local database (SQLite or PostgreSQL)
- Firebase emulator
- Mock external APIs

**Staging**:
- Cloud database
- Firebase staging project
- Real APIs with test credentials

**Production**:
- Cloud database with backups
- Firebase production project
- Load balancing
- CDN for static assets

### Containerization

**Docker Containers**:
- Background job processors (if used)
- Worker instances (if used)

**Orchestration**:
- Docker Compose (development)
- Kubernetes (production, future)

---

## 📊 Monitoring & Observability

### Logging

**Levels**: DEBUG, INFO, WARN, ERROR, FATAL  
**Aggregation**: Cloud Logging or ELK Stack  
**Retention**: 30 days standard, 90 days for errors  

### Metrics

**Key Metrics**:
- API response times
- Error rates
- Database query performance
- Real-time listener connections
- Price tracking job success rates
- Notification delivery rates

**Tools**:
- Firebase Analytics
- Datadog or similar APM
- Custom dashboards

### Alerts

**Critical Alerts**:
- API server down
- Database unavailable
- Authentication failures
- External API failures
- High error rates

---

## 🔄 Scalability Considerations

### Horizontal Scaling

- **Stateless API servers**: Can scale horizontally
- **Database**: Partition by user or region
- **Real-time features**: Use Firebase's automatic scaling
- **Background jobs**: Queue-based with workers

### Caching Strategy

**Levels**:
1. Client-side: React Query caching
2. CDN: CloudFlare or similar
3. Redis: Session and frequently accessed data (future)
4. Database query optimization with indexes

### Performance Optimization

- Code splitting in frontend apps
- Lazy loading of components
- Image optimization
- API response pagination
- Background job processing
- Database query optimization

---

## 🛠️ Technology Decisions

### Why Firebase?

1. **Scalability**: Auto-scales without infrastructure management
2. **Real-time**: Built-in real-time database capabilities
3. **Cost-effective**: Pay-per-use model
4. **Security**: Enterprise-grade security features
5. **Analytics**: Built-in analytics and monitoring
6. **Developer Experience**: SDKs for all platforms

### Why React + TypeScript?

1. **Developer Productivity**: Large ecosystem and tools
2. **Type Safety**: TypeScript prevents many bugs
3. **React Query**: Excellent for server state management
4. **Tailwind CSS**: Rapid UI development

### Why Flutter?

1. **Cross-Platform**: Single codebase for iOS and Android
2. **Performance**: Native performance
3. **Developer Experience**: Hot reload for rapid development
4. **Growing Ecosystem**: Excellent packages available

---

## 📚 Related Documentation

- [Database Schema Reference](DATABASE_SCHEMA.md)
- [API Reference](API_REFERENCE.md)
- [Firebase Implementation](FIREBASE_IMPLEMENTATION_SUMMARY.md)
- [Security Architecture](SECURITY_ARCHITECTURE.md)
- [Developer Guide](DEVELOPER.md)

