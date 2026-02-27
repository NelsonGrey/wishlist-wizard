import { expect, Page } from '@playwright/test';

export async function ensureAuthenticated(page: Page): Promise<boolean> {
  await page.goto('/dashboard');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(800);

  const appIndicator = page
    .locator('[data-testid="dashboard-create-wishlist"], [data-testid="dashboard-empty-create-wishlist"], h2:has-text("My Wishlists")')
    .first();
  if (await appIndicator.isVisible().catch(() => false)) {
    return true;
  }

  const loginEmail = page.locator('input[type="email"]').first();

  const uniqueEmail = `e2e-${Date.now()}@wishlist-wizard.test`;
  const password = 'Test@Secure123Password';

  const inlineRegisterButton = page.locator('button:has-text("Register")').first();
  if (await inlineRegisterButton.isVisible().catch(() => false)) {
    await inlineRegisterButton.click();
    await page.waitForLoadState('domcontentloaded');
  } else {
    await page.goto('/register');
    await page.waitForLoadState('domcontentloaded');
  }

  await page.fill('input[type="email"]', uniqueEmail);
  const passwordInputs = page.locator('input[type="password"]');
  await passwordInputs.first().fill(password);
  if ((await passwordInputs.count()) > 1) {
    await passwordInputs.nth(1).fill(password);
  }

  const nameField = page.locator('input[placeholder*="display" i], input[placeholder*="name" i], input[aria-label*="name" i]').first();
  if (await nameField.isVisible().catch(() => false)) {
    await nameField.fill('E2E Bootstrap User');
  }

  await page.click('button[type="submit"], button:has-text("Create account"), button:has-text("Create"), button:has-text("Sign Up")');
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);

  await page.goto('/dashboard');
  const stillNeedsAuth =
    page.url().includes('/login') ||
    page.url().includes('/register') ||
    page.url().includes('/forgot-password');
  if (stillNeedsAuth) {
    await page.fill('input[type="email"]', uniqueEmail);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"], button:has-text("Sign in"), button:has-text("Sign In"), button:has-text("Login")');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => undefined);
    await page.goto('/dashboard');
  }

  await page.waitForLoadState('domcontentloaded');
  const isOnAuthPage = /\/login|\/register|\/forgot-password/.test(page.url());
  if (isOnAuthPage) {
    return false;
  }

  const dashboardReady = await page
    .locator('h2:has-text("My Wishlists"), button:has-text("Create New List"), button:has-text("Create Wishlist")')
    .first()
    .isVisible()
    .catch(() => false);

  return dashboardReady;
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
        const headerVisible = await page.locator('h2:has-text("My Wishlists")').first().isVisible().catch(() => false);
        const createButtonVisible = await page
          .locator('[data-testid="dashboard-create-wishlist"], [data-testid="dashboard-empty-create-wishlist"]')
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
    .locator('[data-testid="dashboard-create-wishlist"], [data-testid="dashboard-empty-create-wishlist"]')
    .first();
  await expect(createButton).toBeVisible({ timeout: 10000 });
  await createButton.click();

  const nameInput = page.getByTestId('create-wishlist-name-input').first();
  await expect(nameInput).toBeVisible({ timeout: 5000 });
  await nameInput.fill(wishlistName);

  const submitCreate = page.getByTestId('create-wishlist-submit').first();
  await submitCreate.click();

  await page.goto('/dashboard');
  listLink = page.locator(`text="${wishlistName}"`).first();
  await expect(listLink).toBeVisible({ timeout: 10000 });
}
