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
- **Email**: Google Workspace SMTP via Nodemailer (no SendGrid)
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
│   ├── functions/            # Firebase Functions — ⚠️ NOT in this repo's git history
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

> ⚠️ **`packages/functions/` is gitignored in this repo** (since 2026-07-17).
> The backend source of record lives in the private companion repo
> `NelsonGrey/wishlist-wizard-functions` — a plain `git clone` of this repo
> will **not** include it, and there's no other in-repo pointer explaining
> why the directory is missing. To get backend source for local
> emulator/reference use, clone the companion repo separately into
> `packages/functions/`. See the note in
> [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md#21-firebase-functions-api-packagesfunctions).

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

> As of ~2026-07-23, the `api` HTTP router (`packages/functions/src/api/router.ts`,
> dispatched under `/api/*`) is the **primary pattern for public-facing
> endpoints** — this GCP org blocks granting new `allUsers` Cloud Run
> invoker bindings, so a newly deployed standalone `onCall` function isn't
> reliably reachable by clients. New public-facing endpoints should be added
> to the router, not deployed as standalone `onCall` exports. Wishlists,
> items, and notifications below are now router-dispatched rather than
> plain `httpsCallable` targets; a defined set of functions (auth/profile
> CRUD, generic CRUD, browser extension, FCM triggers, and a few others)
> remain standalone `onCall`. See
> [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md#-api-architecture) for the
> full breakdown.

- **Wishlists** (via `api` router): `getUserWishlists`, `getWishlistById`, `getSharedWishlist`, `createWishlist`, `updateWishlist`, `deleteWishlist`
- **Items** (via `api` router): `getWishlistItems`, `addWishlistItem`, `updateWishlistItem`, `deleteWishlistItem`
- **Notifications** (via `api` router, except `createSystemNotification` which stays standalone `onCall`): `getUserNotifications`, `markNotificationAsRead`, `markAllNotificationsAsRead`, `deleteNotification`, `createSystemNotification`, `getNotificationSettings`, `updateNotificationSettings`
- **Extension** (standalone `onCall`): `authenticateExtension`, `getExtensionWishlists`, `addItemFromExtension`, `getExtensionRecentItems`, `createExtensionWishlist`

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
- Workspace SMTP credentials for Nodemailer (see `packages/functions/src/email.ts`)

> `SENDGRID_API_KEY` and `OPENAI_API_KEY` are **not required** — neither SendGrid nor
> OpenAI is used anywhere in this codebase.

---

## Development Workflow

1. **Setup**
   - `npm install`
   - Create `.env.local` with `VITE_` values

2. **Run Web App**
   - `npm run dev`

3. **Run Functions Emulator**
   - `packages/functions/` must first be cloned separately from the private
     companion repo `NelsonGrey/wishlist-wizard-functions` — it's gitignored
     here and does not come with a normal `git clone` of this repo.
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
