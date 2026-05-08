# Wishlist Wizard - Architecture Overview

## Three Distinct User Journeys

Wishlist Wizard is structured around three distinct user experiences, each with its own specialized layout and visual identity.

### 1. Marketing Website (PublicLayout)
The public-facing website that promotes the product and capabilities.

Purpose: Educate potential users and convert visitors into authenticated users.

Pages:
- `/`
- `/extension`
- `/about`
- `/blog`
- `/contact`
- `/terms`
- `/privacy-policy`
- `/cookie-policy`
- Feature demo routes (`/mobile-app-demo`, `/browser-extension-demo`, etc.)

Design characteristics:
- Marketing header + footer
- CTA-driven presentation
- Public content and legal pages

### 2. Authentication Portal (AuthLayout)
Focused, minimal authentication flows for account access and recovery.

Purpose: Provide secure, distraction-free account management.

Pages:
- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`
- `/verify-email`

Design characteristics:
- Compact form-focused composition
- Minimal header and helper links
- Reduced navigation noise during auth flows

### 3. Application Portal (AppLayout)
Authenticated workspace for wishlist operations and user intelligence features.

Purpose: Provide day-to-day product functionality (CRUD, collaboration, analytics, privacy, notifications).

Pages:
- `/app/dashboard`
- `/app/wishlists`
- `/app/dashboard-firebase`
- `/app/user-profile`
- `/app/wishlist/:id`
- `/app/wishlists/:id`
- `/app/recommendations`
- `/app/price-tracking`
- `/app/calendar`
- `/app/notifications`
- `/app/privacy-settings`
- `/app/analytics`
- `/shared/:shareId` (public shared view)

Design characteristics:
- Utility-first app shell
- `ProtectedRoute` wrapper for authenticated `/app/*` routes
- Legacy route redirects to canonical `/app/*` namespace
- Non-production environment password gate support

## Smart Layout Routing

The router in `AppRouter.tsx` applies a layout wrapper based on route category.

```typescript
// Auth pages (AuthLayout)
/login, /register, /forgot-password, /reset-password, /verify-email

// App pages (AppLayout)
/app/dashboard, /app/wishlists, /app/dashboard-firebase, /app/user-profile,
/app/wishlist/*, /app/wishlists/*, /app/recommendations, /app/price-tracking,
/app/calendar, /app/notifications, /app/privacy-settings, /app/analytics,
/shared/*

// Public pages (PublicLayout)
/, /extension, /about, /blog, /contact, /terms, /privacy-policy,
/cookie-policy, feature demo routes, and fallback routes
```

## Route Security Model

- Production mode (`VITE_ENVIRONMENT=production`): authentication routes and protected app routes are redirected to home marketing pages unless explicitly public.
- Non-production mode: full auth and app route surface is available for development/testing.
- Environment gate: `EnvironmentPasswordGate` is applied with non-prod password configuration to restrict preview/staging environments.

## Technical Implementation

### Core Router Responsibilities
- Route declaration and lazy loading
- Layout assignment via `LayoutRouter`
- Analytics route tracking (`AnalyticsRouteTracker`)
- Protected route enforcement via `ProtectedRoute`
- Legacy-to-canonical route redirects

### File Structure (layout-relevant)
```
packages/web/client-src/
  AppRouter.tsx
  components/layout/
    PublicLayout.tsx
    AuthLayout.tsx
    AppLayout.tsx
  components/security/
    EnvironmentPasswordGate.tsx
  components/auth/
    ProtectedRoute.tsx
  pages/
    Home.tsx
    Login.tsx
    Register.tsx
    Dashboard.tsx
    DashboardFirebase.tsx
    WishlistDetail.tsx
    Recommendations.tsx
    PriceTracking.tsx
    Calendar.tsx
    Notifications.tsx
    PrivacySettings.tsx
    Analytics.tsx
    SharedWishlist.tsx
```

## User Experience Flow

New visitor flow:
1. Lands on `/` (PublicLayout)
2. Navigates to auth (`/register` or `/login`) in non-production contexts
3. Redirects to app namespace (`/app/*`) after auth

Returning user flow:
1. Opens app route
2. `ProtectedRoute` verifies auth state
3. Renders app page or redirects to auth/home based on environment policy

Shared wishlist flow:
1. Receives `/shared/:shareId` link
2. Accesses shared view without full app auth requirements

## Benefits of the Architecture

For users:
- Clear context separation between marketing, auth, and app tasks
- More predictable navigation behavior
- Reduced accidental exposure of non-production app surfaces

For developers:
- Explicit route policy by environment
- Centralized route/lifecycle logic
- Easier testing of layout and guard behavior

For delivery:
- Clean production surface area
- Safer pre-production access control
- Better maintainability via canonical route namespace

## Maintenance Notes

When adding a new page:
1. Determine route category (public/auth/app/shared)
2. Add page component and route in `AppRouter.tsx`
3. Apply `ProtectedRoute` if app-authenticated
4. Add legacy redirect only if backward compatibility is required
5. Update architecture and readiness docs with new route evidence
