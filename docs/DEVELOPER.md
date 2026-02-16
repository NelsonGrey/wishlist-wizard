# Wishlist Wizard Developer Guide

This document provides technical information for developers working on the Wishlist Wizard platform.

## Tech Stack Overview

### Frontend (Web)
- **Framework**: React 19.x with TypeScript
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query)
- **UI Components**: Radix UI + Tailwind CSS
- **Form Handling**: React Hook Form + Zod
- **Build Tool**: Vite

### Backend
- **Platform**: Firebase Cloud Functions (v2)
- **Database**: Cloud Firestore
- **Authentication**: Firebase Auth (ID tokens)
- **Email**: SendGrid (when configured)
- **Payments**: Stripe (optional)

### Mobile
- **Framework**: Flutter (iOS and Android)
- **State Management**: Provider

### Shared Packages
- **Shared Types**: `@wishlist-wizard/shared`
- **Firebase Utils**: `@shared/firebase-utils`

---

## Project Structure

```
/ (root)
├── packages/
│   ├── web/                 # React web app (Vite)
│   │   ├── client-src/       # App source
│   │   └── public/           # Static assets
│   ├── functions/            # Firebase Functions
│   │   └── src/              # Callable function handlers
│   ├── browser-extension/    # Browser extension
│   │   └── src/              # Extension source
│   ├── mobile/               # Flutter mobile app
│   │   └── lib/              # Flutter source
│   ├── shared/               # Shared TypeScript code
│   │   └── src/              # Shared schemas and utilities
│   └── firebase-utils/       # Firebase helper utilities
└── scripts/                  # Automation scripts
```

---

## Data Model

- **Primary**: Firestore collections (`wishlists`, `wishlistItems`, `notifications`, `collaborators`, `users`).
- **Legacy**: A Drizzle SQL schema exists in `packages/shared/src/schema.ts` and is treated as legacy/reference.

See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for the authoritative Firestore model.

---

## Authentication

- Firebase Auth handles sign-in (email/password and OAuth providers).
- Clients call Firebase Functions using `httpsCallable`.
- Functions enforce auth with `request.auth`.

---

## Callable API Surface (High-Level)

- **Wishlists**: `getUserWishlists`, `getWishlistById`, `getSharedWishlist`, `createWishlist`, `updateWishlist`, `deleteWishlist`
- **Items**: `getWishlistItems`, `addWishlistItem`, `updateWishlistItem`, `deleteWishlistItem`
- **Notifications**: `getUserNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead`, `deleteNotification`, `createSystemNotification`, `getNotificationSettings`, `updateNotificationSettings`
- **Extension**: `authenticateExtension`, `getExtensionWishlists`, `addItemFromExtension`, `getExtensionRecentItems`, `createExtensionWishlist`

See [API_REFERENCE.md](API_REFERENCE.md) for payloads and examples.

---

## Environment Variables

### Web (Vite)
- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`
- `VITE_FIREBASE_VAPID_KEY`
- `VITE_GA_MEASUREMENT_ID`
- `VITE_STRIPE_PUBLISHABLE_KEY`

### Functions (Server)
- `FIREBASE_ADMIN_SDK_PATH`
- `SENDGRID_API_KEY` (optional)
- `OPENAI_API_KEY` (optional)

---

## Development Workflow

1. **Setup**
   - `npm install`
   - Create `.env.local` with `VITE_` values

2. **Run Web App**
   - `npm run dev`

3. **Run Functions Emulator**
   - `npm run serve --workspace=functions`

4. **Tests**
   - `npm test` (all workspaces)
   - `npm run test --workspace=@wishlist-wizard/web`

---

## Extension Development

- Source is in `packages/browser-extension/src`.
- Build via `npm run build --workspace=@wishlist-wizard/browser-extension`.

---

## Mobile Development

- Flutter app lives in `packages/mobile`.
- Run `flutter pub get` then `flutter run`.

---

## Contributing Guidelines

- Follow [CODE_STANDARDS.md](CODE_STANDARDS.md).
- Add tests when changing logic.
- Update documentation for significant changes.
