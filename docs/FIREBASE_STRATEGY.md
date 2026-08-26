# Firebase-First Architecture Strategy for Wishlist Wizard

> ⚠️ **Superseded for new-endpoint guidance.** This is a pre-migration
> planning document; its roadmap and code examples (including standalone
> `onCall` as the target pattern for new functions) predate two later
> architectural changes:
>
> 1. **Router migration (~2026-07-23)**: a Domain Restricted Sharing org
>    policy blocks granting a *new* `allUsers` Cloud Run invoker binding, so
>    a newly deployed standalone `onCall` function can be silently
>    unreachable by clients. Public-facing endpoints now go through a
>    single HTTP router, `api` (`packages/functions/src/api/router.ts`),
>    dispatched under `/api/*`. See
>    [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md#-api-architecture) for
>    the current pattern.
> 2. **`packages/functions` extraction (2026-07-17)**: backend source moved
>    to the private companion repo `NelsonGrey/wishlist-wizard-functions`;
>    `packages/functions/` is gitignored in this repo.
>
> The rest of this document is left as-is as a historical planning record —
> its `onCall`-as-target-pattern guidance is no longer correct for new work.

## Overview
This document outlines the strategy to fully leverage Firebase services throughout the Wishlist Wizard project, emphasizing Firebase as the primary infrastructure platform for authentication, data storage, serverless functions, hosting, and analytics.

## Current Firebase Integration Status

### ✅ Already Implemented
- **Firebase Hosting**: Configured with proper rewrites and caching
- **Firestore Database**: Primary data storage with security rules
- **Firebase Functions**: Basic v2 functions with Express.js integration
- **Firebase Admin SDK**: Server-side operations
- **Firebase Emulators**: Local development environment
- **Firebase Data Connect**: GraphQL-style data operations
- **Firebase Configuration**: Environment variables and project setup

### 🔄 In Progress  
- **Price Tracking Service**: Migrating to Firebase Functions with Cloud Scheduler
- **Browser Extension**: Enhanced product detection with Firebase integration

## Firebase-First Architecture Plan

### 1. Authentication & User Management
**Current**: Custom JWT + Express sessions
**Target**: Firebase Authentication with custom claims

#### Implementation Steps:
1. **Replace custom auth with Firebase Auth**
   - Migrate user registration/login to Firebase Auth
   - Use Firebase Auth tokens instead of JWT
   - Implement custom claims for user roles
   - Add Firebase Auth to web app, mobile app, and browser extension

2. **User Profile Management**
   - Store extended user data in Firestore `/users/{uid}` collection
   - Use Firebase Auth triggers for user lifecycle management
   - Implement Firebase Auth admin operations for user management

3. **Security Rules**
   - Use Firebase Auth UID for Firestore security rules
   - Implement role-based access control with custom claims
   - Secure all API endpoints with Firebase Auth verification

```typescript
// Firebase Auth integration example
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const auth = getAuth();
const user = await signInWithEmailAndPassword(auth, email, password);
```

### 2. Data Storage & Real-time Updates
**Current**: Firestore + Drizzle abstraction
**Target**: Pure Firestore with real-time subscriptions

#### Implementation Steps:
1. **Remove Drizzle abstraction layer**
   - Replace `IStorage` interface with direct Firestore calls
   - Use Firestore native queries and operations
   - Implement proper Firestore data modeling

2. **Real-time Subscriptions**
   - Replace polling with Firestore real-time listeners
   - Implement live updates for wishlists, price changes, notifications
   - Use Firestore offline capabilities for mobile apps

3. **Advanced Firestore Features**
   - Implement Firestore composite indexes for complex queries
   - Use Firestore transactions for atomic operations
   - Leverage Firestore security rules for data validation

```typescript
// Real-time Firestore subscriptions
import { onSnapshot, collection, query, where } from 'firebase/firestore';

const unsubscribe = onSnapshot(
  query(collection(db, 'wishlists'), where('userId', '==', user.uid)),
  (snapshot) => {
    const wishlists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    updateWishlists(wishlists);
  }
);
```

### 3. Serverless Functions Architecture
**Current**: Express.js in Firebase Functions
**Target**: Native Firebase Functions with proper triggers

#### Implementation Steps:
1. **Callable Functions for API Operations**
   - Replace REST endpoints with Firebase callable functions
   - Use proper Firebase Auth context in functions
   - Implement input validation and error handling

2. **Background Functions for Automation**
   - Price tracking with Cloud Scheduler triggers
   - Email notifications with Firestore triggers
   - Data cleanup with scheduled functions
   - User analytics with authentication triggers

3. **Event-Driven Architecture**
   - Use Firestore triggers for reactive operations
   - Implement pub/sub for complex workflows
   - Add Firebase Auth triggers for user lifecycle events

```typescript
// Native Firebase Functions
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onSchedule } from 'firebase-functions/v2/scheduler';

export const createWishlist = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  // Function implementation
});
```

### 4. Push Notifications & Messaging
**Current**: Basic FCM setup
**Target**: Comprehensive FCM integration

#### Implementation Steps:
1. **FCM Token Management**
   - Store FCM tokens in Firestore user documents
   - Handle token refresh and device management
   - Implement topic subscriptions for broadcast messages

2. **Notification Triggers**
   - Price drop alerts via FCM
   - Wishlist sharing notifications
   - Weekly/monthly digest notifications
   - Real-time collaboration updates

3. **Cross-Platform Messaging**
   - Web push notifications for browser
   - Mobile push notifications for Flutter app
   - Browser extension notifications via FCM

```typescript
// FCM implementation
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const messaging = getMessaging();
const token = await getToken(messaging, { vapidKey: 'VAPID_KEY' });
await updateDoc(userRef, { fcmTokens: arrayUnion(token) });
```

### 5. File Storage & Media Management
**Current**: Basic file handling
**Target**: Firebase Storage integration

#### Implementation Steps:
1. **User Avatar Storage**
   - Upload user avatars to Firebase Storage
   - Generate secure download URLs
   - Implement image resizing with Cloud Functions

2. **Product Image Caching**
   - Cache product images from external sites
   - Serve optimized images via Firebase Storage
   - Implement image processing pipelines

3. **Media Management**
   - Organize files by user and type
   - Implement storage security rules
   - Add automatic cleanup for unused files

### 6. Analytics & Performance Monitoring
**Current**: Basic Google Analytics
**Target**: Full Firebase Analytics suite

#### Implementation Steps:
1. **Firebase Analytics**
   - Track user behavior across all platforms
   - Monitor wishlist creation and sharing patterns
   - Analyze price tracking effectiveness

2. **Performance Monitoring**
   - Monitor web app performance with Firebase Performance
   - Track mobile app performance metrics
   - Monitor Firebase Functions execution times

3. **Crashlytics**
   - Implement crash reporting for mobile apps
   - Monitor JavaScript errors in web apps
   - Track extension errors and performance

### 7. Development & Deployment
**Current**: Manual deployment
**Target**: Firebase-integrated CI/CD

#### Implementation Steps:
1. **Firebase Emulator Suite**
   - Use emulators for all development
   - Implement comprehensive testing with emulators
   - Set up automated testing pipelines

2. **Deployment Automation**
   - Use Firebase CLI for automated deployments
   - Implement staging and production environments
   - Set up GitHub Actions with Firebase deployment

3. **Environment Management**
   - Use Firebase Remote Config for feature flags
   - Implement environment-specific configurations
   - Manage secrets with Firebase Secret Manager

## Migration Timeline

### Phase 1: Foundation (Week 1-2)
- [x] Firebase project setup and configuration
- [x] Firestore security rules implementation
- [x] Basic Firebase Functions setup
- [ ] Firebase Auth integration for web app

### Phase 2: Core Services (Week 3-4)
- [x] Price tracking service migration to Firebase Functions
- [ ] User management migration to Firebase Auth
- [ ] Real-time Firestore subscriptions
- [ ] FCM push notifications setup

### Phase 3: Advanced Features (Week 5-6)
- [ ] Firebase Storage integration
- [ ] Firebase Analytics implementation
- [ ] Performance monitoring setup
- [ ] Mobile app Firebase integration

### Phase 4: Optimization (Week 7-8)
- [ ] Security rules optimization
- [ ] Performance optimization
- [ ] Cost optimization
- [ ] Monitoring and alerting setup

## Benefits of Firebase-First Architecture

### Technical Benefits
- **Serverless Scalability**: Automatic scaling without infrastructure management
- **Real-time Updates**: Live data synchronization across all clients
- **Offline Support**: Built-in offline capabilities with automatic sync
- **Security**: Built-in authentication and authorization
- **Performance**: Global CDN and optimized data delivery

### Development Benefits
- **Rapid Development**: Pre-built services reduce development time
- **Unified Platform**: Single platform for all backend needs
- **Type Safety**: Strong TypeScript integration
- **Developer Experience**: Excellent tooling and documentation

### Operational Benefits
- **Cost Efficiency**: Pay-per-use pricing model
- **Reliability**: Google's infrastructure and SLA guarantees
- **Monitoring**: Built-in analytics and performance monitoring
- **Maintenance**: Reduced operational overhead

## Implementation Priorities

### High Priority (Firebase-Native Services)
1. **Firebase Auth Migration**: Replace custom authentication
2. **Firestore Real-time**: Implement live data updates
3. **Cloud Functions**: Migrate API logic to callable functions
4. **FCM Integration**: Add push notifications

### Medium Priority (Enhanced Features)
1. **Firebase Storage**: Media and file management
2. **Firebase Analytics**: Comprehensive user tracking
3. **Performance Monitoring**: App performance insights
4. **Remote Config**: Feature flag management

### Low Priority (Optimization)
1. **App Check**: Enhanced security for production
2. **Crashlytics**: Error reporting and monitoring
3. **Test Lab**: Automated testing for mobile apps
4. **ML Kit**: Future AI/ML integrations

## Conclusion

By fully embracing Firebase as the primary platform, Wishlist Wizard will benefit from:
- Reduced infrastructure complexity
- Improved scalability and performance
- Enhanced real-time capabilities
- Better security and authentication
- Comprehensive analytics and monitoring
- Faster development cycles
- Lower operational costs

This Firebase-first approach aligns with modern serverless architecture principles and provides a solid foundation for future growth and feature development.