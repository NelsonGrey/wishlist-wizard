/**
 * Production intentionally serves a marketing holding page instead of the
 * real app (the `marketing_offline` Remote Config flag) -- any test that
 * exercises real auth/app routes (fills a login form, expects a dashboard,
 * etc.) has nothing to interact with there and will fail on a timeout, not
 * a real regression. Skip those tests against production; a production run
 * still gets smoke.spec.ts's own (unguarded) page-loads-at-all checks.
 */
export function isProductionTarget(): boolean {
  const target = String(process.env.TEST_URL || '');
  try {
    const { hostname } = new URL(target);
    return (
      hostname === 'wishlist-wizard-prod.web.app' ||
      hostname === 'wishlist-wizard.web.app' ||
      hostname === 'wishlist-wizard.com' ||
      hostname === 'www.wishlist-wizard.com'
    );
  } catch {
    return false;
  }
}
