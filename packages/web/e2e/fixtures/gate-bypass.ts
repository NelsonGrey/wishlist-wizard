import { test, Page } from '@playwright/test';

/**
 * Dev and staging are gated behind EnvironmentGate (see
 * client-src/components/security/EnvironmentGate.tsx) — nothing renders until
 * a Google account on the allowlist signs in, which CI cannot do. Seed the
 * same sessionStorage flags the gate sets on a successful sign-in, before the
 * app's own scripts run on every navigation — a no-op on production, which
 * is never gated.
 */
export async function seedGateBypass(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      sessionStorage.setItem('ww:env-gate:authorized', '1');
      sessionStorage.setItem('ww:env-gate:email', 'e2e@nelsongrey.com');
    } catch {
      // Ignore storage errors — worst case the gate shows and the test
      // fails with a clear timeout, same as before this fixture existed.
    }
  });
}

/**
 * For spec files that use Playwright's injected `page` fixture directly.
 * Importing this module for its side effect (`import
 * './fixtures/gate-bypass'`) registers the hook for that spec file.
 *
 * Files that create their own page manually (e.g. via `browser.newPage()`
 * in a `beforeAll`) must call `seedGateBypass(page)` on that page instead —
 * this hook only reaches the fixture-provided `page`.
 */
test.beforeEach(async ({ page }) => {
  await seedGateBypass(page);
});
