import { expect, Page } from '@playwright/test';

async function waitForDashboardIndicator(page: Page, timeout: number): Promise<boolean> {
  // A one-shot .isVisible() check races the async chain that gets a user
  // from "just navigated"/"just registered" to an actually-rendered
  // wishlists page (Firebase auth-state resolution, then a client-side
  // wouter <Redirect> from /dashboard to /app/wishlists, then the page's
  // own data fetch). .waitFor() polls instead of sampling once, so it
  // doesn't flag a real success as a failure just because it hasn't
  // rendered yet.
  return page
    .locator('[data-testid="wishlists-page"], [data-testid="wishlists-create-wishlist"], [data-testid="wishlists-empty-create-wishlist"]')
    .first()
    .waitFor({ state: 'visible', timeout })
    .then(() => true)
    .catch(() => false);
}

export async function ensureAuthenticated(page: Page): Promise<boolean> {
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');

  if (await waitForDashboardIndicator(page, 5000)) {
    return true;
  }

  const uniqueEmail = `e2e-${Date.now()}@wishlist-wizard.test`;
  const password = 'Test@Secure123Password';

  await page.goto('/register');
  await page.waitForLoadState('domcontentloaded');

  const displayNameInput = page.getByTestId('register-display-name-input');
  if (await displayNameInput.isVisible().catch(() => false)) {
    await displayNameInput.fill('E2E Bootstrap User');
  }
  await page.getByTestId('register-email-input').fill(uniqueEmail);
  await page.getByTestId('register-password-input').fill(password);
  await page.getByTestId('register-confirm-password-input').fill(password);
  await page.getByTestId('register-submit').click();
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);

  await page.goto('/dashboard');
  const stillNeedsAuth =
    page.url().includes('/login') ||
    page.url().includes('/register') ||
    page.url().includes('/forgot-password');
  if (stillNeedsAuth) {
    await page.goto('/login');
    await page.waitForLoadState('domcontentloaded');
    await page.getByTestId('login-email-input').fill(uniqueEmail);
    await page.getByTestId('login-password-input').fill(password);
    await page.getByTestId('login-submit').click();
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
    await page.goto('/dashboard');
  }

  await page.waitForLoadState('domcontentloaded');
  const isOnAuthPage = /\/login|\/register|\/forgot-password/.test(page.url());
  if (isOnAuthPage) {
    return false;
  }

  return waitForDashboardIndicator(page, 10000);
}

export async function ensureWishlistExists(page: Page, wishlistName: string): Promise<void> {
  const isAuthenticated = await ensureAuthenticated(page);
  if (!isAuthenticated) {
    return;
  }
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(600);

  if (page.url().includes('/login')) {
    await ensureAuthenticated(page);
    await page.goto('/dashboard');
    await page.waitForLoadState('domcontentloaded');
  }

  await expect
    .poll(
      async () => {
        const headerVisible = await page.getByTestId('wishlists-title').isVisible().catch(() => false);
        const createButtonVisible = await page
          .locator('[data-testid="wishlists-create-wishlist"], [data-testid="wishlists-empty-create-wishlist"]')
          .first()
          .isVisible()
          .catch(() => false);
        const emptyStateVisible = await page.getByText('No wishlists yet').first().isVisible().catch(() => false);
        return headerVisible || createButtonVisible || emptyStateVisible;
      },
      { timeout: 10000 }
    )
    .toBeTruthy();

  let listLink = page.locator(`text="${wishlistName}"`).first();
  if (await listLink.isVisible().catch(() => false)) {
    return;
  }

  const createButton = page
    .locator('[data-testid="wishlists-create-wishlist"], [data-testid="wishlists-empty-create-wishlist"]')
    .first();
  await expect(createButton).toBeVisible({ timeout: 10000 });
  await createButton.click();

  const nameInput = page.getByTestId('create-wishlist-name-input').first();
  await expect(nameInput).toBeVisible({ timeout: 5000 });
  await nameInput.fill(wishlistName);

  const submitCreate = page.getByTestId('create-wishlist-submit').first();
  await submitCreate.click();

  // Create is submitted from the Wishlists list itself, so success closes the
  // dialog and shows the new card in place - no navigation happens. Forcing a
  // page.goto('/dashboard') reload here (as this used to do) raced the
  // in-flight create request: App Check's reCAPTCHA challenge adds real
  // latency before the request even fires, so the reload could abort it
  // before the wishlist was actually created.
  listLink = page.locator(`text="${wishlistName}"`).first();
  await expect(listLink).toBeVisible({ timeout: 10000 });
}
