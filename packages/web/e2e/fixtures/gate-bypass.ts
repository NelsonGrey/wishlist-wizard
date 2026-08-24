import { test } from '@playwright/test';

/**
 * Staging is gated behind EnvironmentPasswordGate (see
 * client-src/components/security/EnvironmentPasswordGate.tsx) — nothing
 * renders until the real password is submitted. The Web UAT CI job doesn't
 * receive NON_PROD_SITE_PASSWORD_STAGING (only the build step does), so
 * tests have no way to submit the real form. Seed the same sessionStorage
 * flag the gate sets on a successful unlock, before the app's own scripts
 * run on every navigation — this only ever matters on staging (the only
 * entry in PROTECTED_ENVIRONMENTS), so it's a no-op everywhere else.
 *
 * Importing this module for its side effect (`import
 * './fixtures/gate-bypass'`) registers the hook for that spec file.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('ww:env-password-unlocked:staging', 'true');
    } catch {
      // Ignore storage errors — worst case the gate shows and the test
      // fails with a clear timeout, same as before this fixture existed.
    }
  });
});
