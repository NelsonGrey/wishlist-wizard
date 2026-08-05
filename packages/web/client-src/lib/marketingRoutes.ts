/**
 * Marketing/public routes gated by the marketing_offline Remote Config flag
 * (see hooks/useMarketingOffline). Deliberately excludes:
 *  - Legal/support pages (legalAndSupportRoutes below) — these stay
 *    reachable during a marketing-site refresh; someone may need them
 *    (a user, a platform reviewer, a regulator) regardless of site status.
 *  - /login, /register, /app/*, and /shared/:shareId — governed by
 *    app_offline instead (see hooks/useAppOffline, ProtectedRoute).
 */
export const marketingHoldingPageRoutes = [
  '/',
  '/subscriptions',
  '/plans',
  '/how-it-works',
  '/affiliate-commissions',
  '/creator-program',
  '/extension',
  '/download',
  '/mobile-app-demo',
  '/browser-extension-demo',
  '/social-integration-demo',
  '/calendar-integration-demo',
  '/wishlist-management-demo',
  '/basic-activity-insights-demo',
  '/advanced-user-profiles-demo',
];

/** Always reachable, even when marketing_offline is true — see above. */
export const legalAndSupportRoutes = [
  '/about',
  '/support',
  '/privacy',
  '/terms',
  '/cookies',
];
