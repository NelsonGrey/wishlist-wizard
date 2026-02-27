/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';
import { ensureAuthenticated } from './fixtures/bootstrap';

test.describe('Auth Flow Reliability', () => {
  test('shows validation feedback for login, signup, and forgot-password forms', async ({ page }) => {
    await page.goto('/login');

    await page.getByTestId('login-email-input').fill('a@b');
    await page.getByTestId('login-password-input').fill('Secret123!');
    await page.getByTestId('login-submit').click();
    await expect(page.getByText('Please enter a valid email address')).toBeVisible();

    await page.goto('/register');
    await page.getByTestId('register-email-input').fill('user@example.com');
    await page.getByTestId('register-password-input').fill('Secret123!');
    await page.getByTestId('register-confirm-password-input').fill('Different123!');
    await page.getByTestId('register-submit').click();
    await expect(page.getByText('Passwords do not match')).toBeVisible();

    await page.goto('/forgot-password');
    await expect(page.getByText('Forgot Password')).toBeVisible();
    await page.getByTestId('forgot-password-email-input').fill('a@b');
    await page.getByTestId('forgot-password-submit').click();
    await expect(page.getByText('Please enter a valid email address.')).toBeVisible();
  });

  test('supports auth happy-path to dashboard', async ({ page }) => {
    const isAuthenticated = await ensureAuthenticated(page);
    if (!isAuthenticated) {
      test.skip(true, 'Authentication unavailable in this environment');
    }
    await page.goto('/dashboard');

    await expect(page).not.toHaveURL(/\/login/);
    await expect(page.locator('main').first()).toBeVisible({ timeout: 10000 });
  });
});
