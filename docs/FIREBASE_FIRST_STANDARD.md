# Firebase-First Architecture Standard

This document defines the standardized Firebase-first architecture that all projects must follow to ensure consistency, simplicity, and cost-effectiveness.

## Overview

All projects implement a **Firebase-first** approach where client applications (web and mobile) communicate directly with Firebase services. No custom API servers are allowed - all business logic resides in Firebase Functions.

## Current Implementation Status

### ✅ Completed
- **Mobile Config Standardization**: All projects have environment-specific Firebase configs with symlinks
- **Shared Utilities Package**: `@shared/firebase-utils` created and linked across projects
- **Client-Side Adoption**: Vehicle-vitals and wishlist-wizard use `FirebaseClient` for initialization
- **Auth Standardization**: `FunctionsAuthHelpers` implemented in wishlist-wizard functions
- **CRUD Standardization**: `FirestoreCrudHelpers` implemented in wishlist-wizard functions
- **Wishlist-Wizard Migration**: Complete migration from Express API to Firebase Functions

### 🔄 In Progress
- **Modulo-Squares Migration**: JavaScript functions need shared utilities integration
- **Package Publishing**: `@shared/firebase-utils` needs npm publication

## Architecture Components

### 1. Client Applications
- **Web Apps**: React/Vite applications using `FirebaseClient` from shared utilities
- **Mobile Apps**: Flutter applications (Dart SDK)
- **Communication**: Direct Firebase SDK calls only

### 2. Firebase Services (Required)
- **Firebase Auth**: User authentication and authorization
- **Firestore**: Primary database for all data storage
- **Firebase Functions**: All business logic and API endpoints
- **Firebase Storage**: File uploads and static assets
- **Firebase Hosting**: Web app hosting
- **Firebase Cloud Messaging**: Push notifications

### 3. Shared Utilities Package (`@shared/firebase-utils`)

#### Installation
```bash
# Development linking
npm link @shared/firebase-utils

# Production (when published)
npm install @shared/firebase-utils
```

#### FirebaseClient (Client-side)
Singleton Firebase app initialization with emulator support:
```typescript
import { FirebaseClient } from '@shared/firebase-utils';

const firebaseClient = FirebaseClient.initialize(config);
if (import.meta.env.DEV) {
  firebaseClient.connectToEmulators();
}
```

#### FunctionsAuthHelpers (Server-side)
Standardized authentication checking:
```typescript
import { FunctionsAuthHelpers } from '@shared/firebase-utils';

export const myFunction = onCall(async (request) => {
  const user = FunctionsAuthHelpers.verifyAuthenticated(request);
  // User is authenticated, proceed...
});
```

#### FirestoreCrudHelpers (Server-side)
Consistent CRUD operations with automatic metadata:
```typescript
import { FirestoreCrudHelpers } from '@shared/firebase-utils';

// Create with automatic createdBy/createdAt/updatedAt
const result = await FirestoreCrudHelpers.createDocument('collection', data, userId);

// Query with filters and pagination
const documents = await FirestoreCrudHelpers.queryDocuments('collection', {
  filters: [{ field: 'userId', operator: '==', value: userId }],
  orderBy: { field: 'createdAt', direction: 'desc' },
  limit: 50
});
```

### 4. Firebase Functions (Standardized)

All projects must implement these core function patterns:

#### Authentication Functions
```typescript
// User profile management using shared helpers
export const createUserProfile = onCall(async (request) => {
  const user = FunctionsAuthHelpers.verifyAuthenticated(request);
  // Ensure user can only create their own profile
  if (user.uid !== request.data.userId) {
    throw new Error("Cannot create profile for another user");
  }
  // ... implementation
});
```

#### Data CRUD Functions
```typescript
// Generic CRUD operations using shared helpers
export const createDocument = onCall(async (request) => {
  const user = FunctionsAuthHelpers.verifyAuthenticated(request);
  const { collection, data } = request.data;

  const result = await FirestoreCrudHelpers.createDocument(collection, data, user.uid);
  return { success: true, ...result };
});
```

#### Business Logic Functions
```typescript
// Project-specific business logic
export const [projectSpecificFunction] = onCall(async (request) => {
  const user = FunctionsAuthHelpers.verifyAuthenticated(request);
  // ... project-specific logic
});
```

## Project-Specific Status

### Modulo-Squares (Flutter + JavaScript Functions)
- **Status**: Firebase-first implemented, shared utilities integration pending
- **Functions**: Direct Firestore operations with manual auth checks
- **Client**: Flutter app using Firebase Flutter SDK
- **Next Steps**: Integrate shared auth helpers in JavaScript functions

### Vehicle-Vitals (React + TypeScript Functions)
- **Status**: Firebase-first implemented
- **Functions**: `onRequest` pattern for VIN decoding and email services
- **Client**: React web app using `FirebaseClient` from shared utilities
- **Auth Pattern**: Manual auth checks (different from onCall pattern)

### Wishlist-Wizard (React + TypeScript Functions)
- **Status**: Fully migrated from Express API to Firebase Functions
- **Functions**: `onCall` pattern with modular auth/crud/business functions using shared helpers
- **Client**: React web/mobile apps using `FirebaseClient` from shared utilities
- **Auth Pattern**: `FunctionsAuthHelpers.verifyAuthenticated()` with user ownership validation

## Implementation Rules

### ✅ ALLOWED
- Direct Firebase SDK calls from clients
- Firebase Functions for business logic
- Firestore security rules for data validation
- Firebase extensions for common functionality
- Client-side data caching with Firebase SDK
- Shared utilities package for consistency

### ❌ NOT ALLOWED
- Custom Express/Koa/Fastify API servers
- Direct database connections from clients
- Server-side rendering with custom backends
- Third-party API services (use Firebase Functions as proxy)
- Complex client-side business logic
- Project-specific Firebase utilities (use shared package)

## Data Flow

```
Client App → Firebase SDK → Firebase Functions → Firestore
    ↑                                               ↓
    ←────────────── Direct Response ←───────────────
```

1. Client initializes with `FirebaseClient` from shared utilities
2. Client makes authenticated request via Firebase SDK
3. Firebase Functions validates with `FunctionsAuthHelpers`
4. Data operations use `FirestoreCrudHelpers` with automatic metadata
5. Response returned directly to client

## Security

- **Authentication**: All functions require Firebase Auth via `FunctionsAuthHelpers`
- **Authorization**: Functions validate user permissions and data ownership
- **Data Validation**: Firestore security rules + function validation
- **Rate Limiting**: Firebase Functions concurrency limits
- **CORS**: Handled by Firebase Functions configuration

## Cost Optimization

- **Cold Starts**: Minimize by keeping functions warm
- **Memory/CPU**: Right-size function configurations
- **Firestore**: Use efficient queries via `FirestoreCrudHelpers`
- **Storage**: Implement cleanup policies
- **Functions**: Batch operations where possible

## Migration Guide

### From Custom API Server
1. ✅ Move all Express routes to Firebase Functions
2. ✅ Convert middleware to function decorators using shared helpers
3. ✅ Replace database queries with `FirestoreCrudHelpers`
4. ✅ Update client apps to use `FirebaseClient` for initialization
5. ✅ Remove API server package entirely

### From Direct Database Access
1. ✅ Move business logic to Firebase Functions
2. ✅ Implement proper security rules
3. ✅ Update clients to use Functions instead of direct DB access
4. ✅ Add input validation using shared helpers

## Monitoring & Debugging

- **Firebase Console**: Function logs and performance
- **Firestore**: Query performance and security rules
- **Client SDK**: Debug logging in development
- **Error Tracking**: Firebase Crashlytics for mobile, Sentry for web

## Testing

- **Unit Tests**: Function logic with Firebase emulators
- **Integration Tests**: End-to-end with emulators
- **Client Tests**: Mock Firebase SDK calls
- **Security Tests**: Validate security rules

## Future Enhancements

### Immediate Priorities
- Publish `@shared/firebase-utils` to npm registry
- Complete modulo-squares shared utilities integration
- Add comprehensive error handling patterns
- Implement function performance monitoring

### Long-term Goals
- Add storage helpers to shared utilities
- Implement caching strategies
- Add comprehensive testing utilities
- Create Firebase security rules templates

## Architecture Components

### 1. Client Applications
- **Web Apps**: React/Vite applications
- **Mobile Apps**: Flutter applications
- **Communication**: Direct Firebase SDK calls only

### 2. Firebase Services (Required)
- **Firebase Auth**: User authentication and authorization
- **Firestore**: Primary database for all data storage
- **Firebase Functions**: All business logic and API endpoints
- **Firebase Storage**: File uploads and static assets
- **Firebase Hosting**: Web app hosting
- **Firebase Cloud Messaging**: Push notifications

### 3. Firebase Functions (Standardized)
All projects must implement these core function patterns:

#### Authentication Functions
```typescript
// User profile management
export const createUserProfile = functions.https.onCall(async (data, context) => { ... });
export const updateUserProfile = functions.https.onCall(async (data, context) => { ... });
export const getUserProfile = functions.https.onCall(async (data, context) => { ... });
```

#### Data CRUD Functions
```typescript
// Generic CRUD operations
export const createDocument = functions.https.onCall(async (data, context) => { ... });
export const readDocument = functions.https.onCall(async (data, context) => { ... });
export const updateDocument = functions.https.onCall(async (data, context) => { ... });
export const deleteDocument = functions.https.onCall(async (data, context) => { ... });
export const listDocuments = functions.https.onCall(async (data, context) => { ... });
```

#### Business Logic Functions
```typescript
// Project-specific business logic
export const [projectSpecificFunction] = functions.https.onCall(async (data, context) => { ... });
```

### 4. Shared Utilities Package
All projects must use a shared Firebase utilities package (`@shared/firebase-utils`) that provides:

- Common Firebase initialization
- Authentication helpers
- Firestore query builders
- Error handling utilities
- Type definitions
- Validation schemas

## Implementation Rules

### ✅ ALLOWED
- Direct Firebase SDK calls from clients
- Firebase Functions for business logic
- Firestore security rules for data validation
- Firebase extensions for common functionality
- Client-side data caching with Firebase SDK

### ❌ NOT ALLOWED
- Custom Express/Koa/Fastify API servers
- Direct database connections from clients
- Server-side rendering with custom backends
- Third-party API services (use Firebase Functions as proxy)
- Complex client-side business logic

## Project Structure Standard

```
packages/
├── shared/                    # Shared utilities (@project/shared)
│   ├── firebase-utils.ts     # Firebase helpers and utilities
│   ├── types.ts              # Shared TypeScript types
│   └── validation.ts         # Zod schemas for data validation
├── functions/                 # Firebase Functions (@project/functions)
│   ├── src/
│   │   ├── auth.ts           # Authentication functions
│   │   ├── crud.ts           # Generic CRUD operations
│   │   ├── business.ts       # Project-specific business logic
│   │   └── index.ts          # Function exports
│   └── package.json
├── web/                      # React web app (@project/web)
│   ├── src/
│   │   ├── firebase.ts       # Firebase initialization
│   │   ├── services/         # Firebase service calls
│   │   └── components/       # UI components
│   └── package.json
└── mobile/                   # Flutter mobile app (@project/mobile)
    ├── lib/
    │   ├── firebase/         # Firebase service calls
    │   ├── services/         # Business logic services
    │   └── screens/          # UI screens
    └── pubspec.yaml
```

## Data Flow

```
Client App → Firebase SDK → Firebase Functions → Firestore
    ↑                                               ↓
    ←────────────── Direct Response ←───────────────
```

1. Client makes authenticated request via Firebase SDK
2. Firebase Functions validates request and applies business logic
3. Data is read/written to Firestore with security rules
4. Response returned directly to client

## Security

- **Authentication**: All functions require Firebase Auth
- **Authorization**: Functions validate user permissions
- **Data Validation**: Firestore security rules + function validation
- **Rate Limiting**: Firebase Functions concurrency limits
- **CORS**: Handled by Firebase Functions configuration

## Cost Optimization

- **Cold Starts**: Minimize by keeping functions warm
- **Memory/CPU**: Right-size function configurations
- **Firestore**: Use efficient queries and pagination
- **Storage**: Implement cleanup policies
- **Functions**: Batch operations where possible

## Migration Guide

### From Custom API Server
1. Move all Express routes to Firebase Functions
2. Convert middleware to function decorators
3. Replace database queries with Firestore calls
4. Update client apps to use Firebase SDK directly
5. Remove API server package entirely

### From Direct Database Access
1. Move business logic to Firebase Functions
2. Implement proper security rules
3. Update clients to use Functions instead of direct DB access
4. Add input validation in Functions

## Monitoring & Debugging

- **Firebase Console**: Function logs and performance
- **Firestore**: Query performance and security rules
- **Client SDK**: Debug logging in development
- **Error Tracking**: Firebase Crashlytics for mobile, Sentry for web

## Testing

- **Unit Tests**: Function logic with Firebase emulators
- **Integration Tests**: End-to-end with emulators
- **Client Tests**: Mock Firebase SDK calls
- **Security Tests**: Validate security rules