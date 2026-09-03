/// <reference types="@playwright/test" />
import { test, expect, Page, BrowserContext } from '@playwright/test';
import { seedGateBypass } from './fixtures/gate-bypass';

/**
 * TIER 3: RECENTLY-ADDED FEATURES
 *
 * Covers achievements, connections/friends, and paid-tier checkout —
 * all built after tier-1-basic.spec.ts / tier-2-advanced.spec.ts were
 * written, so none of those three had any E2E coverage before this file.
 */

const PASSWORD = 'Test@Secure123Password';

// The cookie consent banner (CookieConsentBanner.tsx) is fixed to the
// bottom of the viewport and intercepts pointer events for anything
// underneath it until dismissed once per browser context (see
// tier-2-advanced.spec.ts, which hit the same thing first).
async function dismissCookieConsent(page: Page): Promise<void> {
  const declineCookies = page.getByText('Decline All').first();
  if (await declineCookies.isVisible().catch(() => false)) {
    await declineCookies.click().catch(() => undefined);
  }
}

async function registerFreshUser(page: Page): Promise<{ email: string }> {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@wishlist-wizard.test`;
  await seedGateBypass(page);
  await page.goto('/register');
  await page.waitForLoadState('domcontentloaded');
  const displayNameInput = page.getByTestId('register-display-name-input');
  if (await displayNameInput.isVisible().catch(() => false)) {
    await displayNameInput.fill('E2E User');
  }
  await page.getByTestId('register-email-input').fill(email);
  await page.getByTestId('register-password-input').fill(PASSWORD);
  await page.getByTestId('register-confirm-password-input').fill(PASSWORD);
  await page.getByTestId('register-submit').click();
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
  // /register doesn't auto-redirect on success — same as bootstrap.ts's
  // ensureAuthenticated, an explicit /dashboard visit is what actually
  // lands on the authenticated app (wouter <Redirect> to /app/wishlists).
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await dismissCookieConsent(page);
  return { email };
}

function isOnAuthPage(page: Page): boolean {
  return /\/login|\/register|\/forgot-password/.test(page.url());
}

test.describe('Tier 3: Achievements', () => {
  test.describe.configure({ mode: 'serial' });
  let page: Page;
  let ready = false;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await registerFreshUser(page);
    ready = !isOnAuthPage(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(() => {
    test.skip(!ready, 'Registration unavailable in this environment — see e2e/fixtures/bootstrap.ts');
  });

  test('T3.1: Welcome Aboard and First Wish appear in the Trophy Case after signup and a first wishlist', async () => {
    // welcome-aboard is granted on account creation; first-wish on creating
    // the first wishlist — both are real computed-on-read achievements
    // (see project_achievements_v1_implemented_2026-07-23), not fixtures.
    await page.goto('/app/wishlists');
    await page.waitForLoadState('domcontentloaded');

    const createButton = page
      .locator('[data-testid="wishlists-create-wishlist"], [data-testid="wishlists-empty-create-wishlist"]')
      .first();
    await expect(createButton).toBeVisible({ timeout: 10000 });
    await createButton.click();
    const nameInput = page.getByTestId('create-wishlist-name-input').first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill('Achievements Test Wishlist');
    await page.getByTestId('create-wishlist-submit').first().click();
    await expect(page.locator('text="Achievements Test Wishlist"').first()).toBeVisible({ timeout: 20000 });

    await page.goto('/app/user-profile');
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: 'Open Stats and Achievements section' }).click();

    await expect(page.getByText('No achievements earned yet', { exact: false })).toBeHidden({ timeout: 15000 });
    await expect(page.getByRole('heading', { name: 'Welcome Aboard' })).toBeVisible();
    // exact heading, not getByText: "First Wish" is also a substring of the
    // card's own description text ("Created your first wishlist").
    await expect(page.getByRole('heading', { name: 'First Wish' })).toBeVisible();
  });

  test('T3.2: Achievements guide page renders the full achievement list', async () => {
    await page.goto('/app/achievements');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByTestId('achievements-guide-page')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Achievements Guide')).toBeVisible();
    await expect(page.getByTestId('achievements-guide-item-welcome-aboard')).toBeVisible();
    await expect(page.getByTestId('achievements-guide-item-first-wish')).toBeVisible();
  });
});

test.describe('Tier 3: Connections', () => {
  test.describe.configure({ mode: 'serial' });
  let contextA: BrowserContext, contextB: BrowserContext;
  let pageA: Page, pageB: Page;
  let emailA: string, emailB: string;
  let ready = false;

  const openConnectionsTab = async (page: Page) => {
    await page.goto('/app/user-profile');
    await page.waitForLoadState('domcontentloaded');
    await page.getByRole('button', { name: 'Open Connections section' }).click();
    // 'domcontentloaded' fires before React hydrates, let alone before the
    // /api/connections/pending fetch it triggers resolves — the "Your
    // Connections" loading placeholder disappearing is the actual signal
    // that data has landed, not just that the tab switched.
    await expect(page.getByText('Loading connections...')).toBeHidden({ timeout: 15000 });
  };

  test.beforeAll(async ({ browser }) => {
    contextA = await browser.newContext();
    contextB = await browser.newContext();
    pageA = await contextA.newPage();
    pageB = await contextB.newPage();

    ({ email: emailA } = await registerFreshUser(pageA));
    ({ email: emailB } = await registerFreshUser(pageB));
    ready = !isOnAuthPage(pageA) && !isOnAuthPage(pageB);
  });

  test.afterAll(async () => {
    await contextA?.close();
    await contextB?.close();
  });

  test.beforeEach(() => {
    test.skip(!ready, 'Registration unavailable in this environment — see e2e/fixtures/bootstrap.ts');
  });

  test('T3.3: sending a connection request by email creates an outgoing request for the sender and an incoming one for the recipient', async () => {
    await openConnectionsTab(pageA);

    await pageA.getByTestId('find-friends-mode-email').click();
    await pageA.getByTestId('find-friends-email-input').fill(emailB);
    await pageA.getByTestId('find-friends-email-submit').click();

    await expect(pageA.locator('[data-testid^="outgoing-request-"]').first()).toBeVisible({ timeout: 15000 });

    // B is a separate authenticated session — a fresh page load (not a push
    // update) is what picks up A's request, but openConnectionsTab already
    // waits for that page's own connections fetch to resolve before
    // returning, so a single check here is enough.
    await openConnectionsTab(pageB);
    await expect(pageB.locator('[data-testid^="incoming-request-"]').first()).toBeVisible({ timeout: 15000 });
  });

  test('T3.4: accepting an incoming request makes both users see each other as connections', async () => {
    await openConnectionsTab(pageB);
    const incoming = pageB.locator('[data-testid^="incoming-request-"]').first();
    await expect(incoming).toBeVisible({ timeout: 15000 });
    await incoming.getByRole('button', { name: 'Accept' }).click();
    await expect(incoming).toBeHidden({ timeout: 10000 });

    // Neither test account sets a display name (the field isn't offered by
    // this build's register form), so connectionDisplayName() falls back to
    // the generic "Wishlist Wizard user" label for both — just assert a
    // connection card exists, not a specific name.
    await expect(pageB.locator('[data-testid^="connection-"]').first()).toBeVisible({ timeout: 10000 });

    await openConnectionsTab(pageA);
    await expect(pageA.locator('[data-testid^="connection-"]').first()).toBeVisible({ timeout: 15000 });
    await expect(pageA.locator('[data-testid^="outgoing-request-"]')).toHaveCount(0);
  });

  test('T3.5: removing a connection removes it from the remover\'s list', async () => {
    await openConnectionsTab(pageA);
    const connectionCard = pageA.locator('[data-testid^="connection-"]').first();
    await expect(connectionCard).toBeVisible({ timeout: 15000 });

    await connectionCard.getByRole('button', { name: /Open actions for/ }).click();
    await pageA.getByText('Remove Connection').click();

    await expect(pageA.locator('[data-testid^="connection-"]')).toHaveCount(0, { timeout: 10000 });
  });
});

test.describe('Tier 3: Billing — paid-tier checkout', () => {
  let page: Page;
  let ready = false;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
    await registerFreshUser(page);
    ready = !isOnAuthPage(page);
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(() => {
    test.skip(!ready, 'Registration unavailable in this environment — see e2e/fixtures/bootstrap.ts');
  });

  // Proves /api/billing/checkout still resolves a real Stripe Checkout
  // Session URL for a self-serve tier. Originally a regression test for the
  // 2026-08-09 bug where router.ts's secrets array never bound the
  // Creator/Business price IDs; now that Creator-and-above are waitlist-gated
  // (COMING_SOON_TIERS), it targets whichever purchasable tier card renders
  // an "Upgrade Monthly" button (Starter/Plus). Doesn't complete a purchase.
  test('T3.6: upgrading to a self-serve tier redirects to a real Stripe Checkout session', async () => {
    await page.goto('/app/subscription');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Upgrade Your Plan')).toBeVisible({ timeout: 15000 });

    const upgradeCards = page.locator('.grid > div').filter({ has: page.getByRole('button', { name: 'Upgrade Monthly' }) });
    const targetCard = upgradeCards.first();
    await expect(targetCard).toBeVisible({ timeout: 10000 });

    await targetCard.getByRole('button', { name: 'Upgrade Monthly' }).click();

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 15000 });
    expect(page.url()).toContain('checkout.stripe.com');
  });

  // Creator-and-above are built but intentionally not open for self-serve
  // purchase yet (COMING_SOON_TIERS in @wishlist-wizard/shared). Their
  // upgrade cards must show a "Coming soon" state with an email-capture
  // control and NO checkout button — server-side billingCheckout also
  // hard-rejects these tiers.
  test('T3.7: a Coming-Soon tier shows a waitlist capture instead of a checkout button', async () => {
    await page.goto('/app/subscription');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.getByText('Upgrade Your Plan')).toBeVisible({ timeout: 15000 });

    const comingSoonCard = page.locator('.grid > div').filter({ hasText: 'Coming soon' }).first();
    await expect(comingSoonCard).toBeVisible({ timeout: 10000 });

    await expect(comingSoonCard.getByRole('button', { name: /notify me when it launches/i })).toBeVisible();
    await expect(comingSoonCard.getByRole('button', { name: 'Upgrade Monthly' })).toHaveCount(0);
    await expect(comingSoonCard.getByRole('button', { name: 'Upgrade Annually' })).toHaveCount(0);
  });
});
