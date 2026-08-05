# @shared/firebase-utils

Shared Firebase utilities for Firebase-first architecture across all projects.

## Installation

```bash
npm install @shared/firebase-utils
```

## Usage

### Basic Setup

```typescript
import { FirebaseClient } from '@shared/firebase-utils';

const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

const firebase = FirebaseClient.getInstance(firebaseConfig);
```

### Authentication Helpers

```typescript
// Sign up
const user = await firebase.signUp('email@example.com', 'password');

// Sign in
const user = await firebase.signIn('email@example.com', 'password');

// Sign out
await firebase.signOut();

// Get current user
const currentUser = firebase.getCurrentUser();
```

### Firestore Operations

```typescript
// Create document
const docRef = await firebase.createDocument('collection', { data: 'value' });

// Read document
const doc = await firebase.getDocument('collection', 'docId');

// Update document
await firebase.updateDocument('collection', 'docId', { updated: true });

// Delete document
await firebase.deleteDocument('collection', 'docId');
```

### Firebase Functions

```typescript
// Call a function
const result = await firebase.callFunction('functionName', { param: 'value' });
```

### Development Mode

```typescript
// Enable emulators for local development
firebase.enableEmulators();
```

## Firebase-First Architecture

This package enforces the Firebase-first standard:

- Direct communication between clients and Firebase
- No custom API servers
- Firebase Functions for business logic
- Firestore for data storage
- Firebase Auth for authentication
- Firebase Storage for file uploads

## Environment Configuration

Use environment-specific Firebase configs:

- `firebase.dev.json` - Development environment
- `firebase.staging.json` - Staging environment
- `firebase.prod.json` - Production environment

Mobile apps should use corresponding config files:
- `google-services.dev.json` / `GoogleService-Info.dev.plist`
- `google-services.staging.json` / `GoogleService-Info.staging.plist`
- `google-services.prod.json` / `GoogleService-Info.prod.plist`