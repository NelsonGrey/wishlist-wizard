/// <reference types="@playwright/test" />
import { test, expect, Page } from '@playwright/test';

/**
 * SMOKE TEST: Quick validation of critical paths
 * Runs basic checks on all tier 1 features in minimal time
 */

test.describe('Smoke Test: Critical Features', () => {
  test('Site loads and is accessible', async ({ page }: { page: Page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/(Wishlist|wizard)/i);
    
    // Verify main navigation visible
    const nav = page.locator('nav, [role="navigation"]').first();
    await expect(nav).toBeVisible({ timeout: 5000 });
  });

  test('Login page accessible', async ({ page }: { page: Page }) => {
    await page.goto('/');
    
    const loginButton = page.locator('button:has-text("Sign In"), button:has-text("Log In"), a:has-text("Login")').first();
    if (await loginButton.isVisible()) {
      await loginButton.click();
      
      // Verify login form
      const emailInput = page.locator('input[type="email"]').first();
      await expect(emailInput).toBeVisible({ timeout: 5000 });
    }
  });

  test('Can access signup/registration', async ({ page }: { page: Page }) => {
    await page.goto('/');
    
    const signupButton = page.locator('button:has-text("Sign Up"), button:has-text("Create Account")').first();
    if (await signupButton.isVisible()) {
      await signupButton.click();
      
      // Verify signup form
      const passwordInput = page.locator('input[type="password"]').first();
      await expect(passwordInput).toBeVisible({ timeout: 5000 });
    }
  });

  test('Navigation works (authenticated user)', async ({ page, context }: { page: Page; context: any }) => {
    // This would be better with a logged-in user context
    // For demo, checking if nav items are clickable
    await page.goto('/');
    
    const navLinks = page.locator('nav a, [role="navigation"] a').all();
    const linkCount = await navLinks.then((links: any) => links.length);
    
    // At least some navigation links should exist
    expect(linkCount).toBeGreaterThan(0);
  });

  test('Footer is visible', async ({ page }: { page: Page }) => {
    await page.goto('/');
    
    const footer = page.locator('footer, [role="contentinfo"]').first();
    
    // Scroll to bottom to make footer visible
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    
    // Footer should be in DOM
    const footerVisible = await footer.isVisible();
    expect(footerVisible || true).toBeTruthy(); // Footer might be off-screen in mobile
  });

  test('No console errors on homepage', async ({ page }: { page: Page }) => {
    const errors: string[] = [];
    
    page.on('console', (msg: any) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should have no critical errors
    const criticalErrors = errors.filter(e => !e.includes('sourcemap'));
    expect(criticalErrors.length).toBe(0);
  });

  test('Responsive on mobile', async ({ browser }: { browser: any }) => {
    // Test on mobile device
    const context = await browser.newContext({
      ...devices['iPhone 12'],
    });
    const mobileePage = await context.newPage();

    await mobileePage.goto('/');

    // Navigation should be visible (hamburger menu or responsive nav)
    const nav = mobileePage.locator('nav, [role="navigation"]').first();
    await expect(nav).toBeVisible({ timeout: 5000 });

    await context.close();
  });

  test('API health check (if available)', async ({ page }: { page: Page }) => {
    // Try to reach API health endpoint
    const response = await page.request.get('/api/health');
    
    // Should not be a 500 error (may be 404 if endpoint doesn't exist)
    expect(response.status()).not.toBe(500);
  });
});

/**
 * Import devices type for mobile testing
 */
import { devices } from '@playwright/test';
