# Web Navigation & Layout Ownership Spec

## Purpose
Define a single, predictable layout architecture for the web app so headers, footers, and page chrome are rendered once and navigation behavior is consistent across all routes.

## Scope
Applies to `packages/web/client-src` route rendering and page components.

## Layout Ownership Rules

### Global shell owner
- `PublicLayout`, `AuthLayout`, and `AppLayout` (`packages/web/client-src/components/layout/`) are the sole
  owners of global header and footer UI, one per route category. There is no single `MainLayout` component —
  `AppRouter` selects the layout per route category via `LayoutRouter`.
- `AppRouter` is responsible for wrapping routable pages with the correct layout where standard app chrome is required.

### Page component responsibilities
- Route pages must render only page content (`main` and page-specific sections).
- Route pages must **not** import or render global `Header` or `Footer` directly.
- Route pages can render local, page-scoped controls (toolbars, breadcrumbs, section nav), but not duplicate app-level shell.

### Exception policy
A page may bypass `MainLayout` only when explicitly required (for example: fully immersive/embed/fullscreen route). In that case:
- The exception must be intentional in `AppRouter`.
- The reason should be documented in this file under “Approved Exceptions”.

## Routing Consistency Rules
- Every button/link path must map to an existing route in `AppRouter`.
- Placeholder routes (`#`) are not allowed for production navigation.
- Route naming should be canonical and stable (for example `/privacy-settings` should be used consistently instead of alternate aliases unless both are intentionally supported).

## Current Conformance (after cleanup)
- `Dashboard.tsx`: no local header/footer.
- `DashboardFirebase.tsx`: no local header/footer.
- `WishlistDetail.tsx`: no local header/footer.
- `SharedWishlist.tsx`: no local header/footer.

## Approved Exceptions
None currently.

## Content Confinement (standing rule, 2026-07-23)
Body content and backgrounds are capped at `var(--site-content-width)` (1280px); everything outside that
column is white. Only the global header and footer span full width. See
`docs/DESIGN_SYSTEM.md#app-wide-content-confinement-standing-rule-2026-07-23` for the full rule and enforcement
points (`AppLayout.tsx`, `AuthLayout.tsx`).

## Regression Signals
Treat any of the following as a layout/navigation regression:
- Duplicate header at top of page.
- Duplicate footer at bottom of page.
- Page-specific header/footer conflicting with global shell.
- Navigation button linking to missing route.
- Footer or header link using placeholder destination.

## Change Protocol
When adding or updating routes/pages:
1. Add or confirm route in `AppRouter`.
2. Add/update links in UI components.
3. Confirm page does not import global `Header`/`Footer`.
4. Execute checklist in `docs/WEB_NAVIGATION_QA_CHECKLIST.md`.
