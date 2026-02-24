# End-to-End Testing Guide

This guide explains how to run automated tests on the Wishlist Wizard website to validate Tier 1 (basic) and Tier 2 (advanced) features.

## Overview

The E2E test suite uses [Playwright](https://playwright.dev/) to automate browser testing against your actual deployed website (not emulators). Tests cover:

- **Smoke Tests**: Quick 5-minute sanity checks (always runs)
- **Tier 1 Tests**: All basic features (accounts, wishlists, items, sharing, notifications)
- **Tier 2 Tests**: Advanced features (extension, affiliate, calendar, analytics)

## Prerequisites

- Node.js 20+ installed
- npm 9+ installed
- Access to the website you're testing (dev, staging, or production)

## Installation

```bash
# Install dependencies (if not already done)
npm install

# Install Playwright browsers (required for first run)
npx playwright install
```

## Running Tests

### Quick Smoke Test (Fastest)
Test the dev environment:
```bash
npm run test:e2e:smoke
```

### Tier 1 Tests (Basic Features)
Run against staging to test core functionality:
```bash
npm run test:e2e:tier1
```

### Tier 2 Tests (Advanced Features)
Run against staging to test all advanced features:
```bash
npm run test:e2e:tier2
```

### All Tests
Run the complete suite:
```bash
npm run test:e2e:all
```

### Test Specific Environment

```bash
# Against local dev server
npm run test:e2e:dev

# Against staging environment
npm run test:e2e:staging

# Against production (smoke tests only for safety)
npm run test:e2e:prod
```

### Custom Environment

```bash
# Test any URL
TEST_URL=https://your-custom-url.app npm run test:e2e:smoke
```

## Interactive Testing

### Watch Mode with UI
```bash
npm run test:e2e:ui
```
This opens Playwright's interactive test runner where you can:
- See tests run in real-time
- Pause/step through execution
- Inspect DOM elements
- Run specific tests

### Debug Mode
```bash
npm run test:e2e:debug
```
Opens Playwright Inspector for detailed debugging.

## Viewing Results

### HTML Report
After tests complete, view the HTML report:
```bash
npm run test:e2e:report
```

The report displays:
- Pass/fail status for each test
- Screenshots of failures
- Video recordings (if enabled)
- Browser compatibility
- Timing information

### Console Output
Tests print results to console. Look for:
```
✓ T1.1: User Registration and Profile Creation (2.3s)
✓ T1.2: Get User Profile (1.8s)
✗ T1.3: Update User Profile (Failed after 5s) - Could not find element
```

## Test Structure

### Smoke Tests (`packages/web/e2e/smoke.spec.ts`)
- **Duration**: ~5 minutes
- **Scope**: Page loads, navigation, auth accessibility
- **Frequency**: Every PR, daily on all environments
- **Tests**: 8 core checks

### Tier 1 Tests (`packages/web/e2e/tier-1-basic.spec.ts`)
- **Duration**: ~15 minutes
- **Scope**: User accounts, wishlists, items, sharing, notifications, sync
- **Frequency**: PRs, manual validation
- **Tests**: 17 complete user flows

### Tier 2 Tests (`packages/web/e2e/tier-2-advanced.spec.ts`)
- **Duration**: ~20 minutes
- **Scope**: Extension, affiliate, calendar, analytics, payments, AR, devices
- **Frequency**: Manual validation, before releases
- **Tests**: 20 advanced features

## Customizing Tests

### Adding a New Test

1. Create a test case in appropriate file:
```typescript
test('T1.X: Feature Description', async ({ page }) => {
  await page.goto('/path');
  
  // Interaction
  const button = page.locator('button:has-text("Action")');
  await button.click();
  
  // Assertion
  await expect(page.locator('text="Success"')).toBeVisible();
});
```

2. Add it to the correct tier file
3. Run tests locally before pushing

### Updating Selectors

If the UI changes and tests fail, update selectors:

```typescript
// Old
const button = page.locator('button.action-btn');

// New (more resilient)
const button = page.locator('button:has-text("Create Wishlist")');
```

### Skipping Tests

```typescript
test.skip('T2.5: Feature not ready', async ({ page }) => {
  // This test won't run
});
```

### Conditional Tests

```typescript
test('T2.10: Feature (if available)', async ({ page }) => {
  const feature = page.locator('[data-testid="feature"]');
  
  if (await feature.isVisible()) {
    // Test it
  } else {
    test.skip(); // Skip if not available
  }
});
```

## CI/CD Integration

### Automatic Test Runs

Tests run automatically in GitHub Actions:

| Trigger | Tests | Environments |
|---------|-------|--------------|
| Every commit to `develop` | Smoke | Dev |
| Pull requests | Smoke + Tier 1 | Staging |
| Daily at 2 AM ET | Smoke | Production |
| Manual workflow dispatch | All | Any |

### Viewing CI Results

1. Go to GitHub repository
2. Click "Actions" tab
3. Find "E2E Tests - Website Readiness" workflow
4. Click run to see results
5. Download "playwright-report" artifact for detailed HTML report

### Failed Test Notification

If production smoke test fails:
- Slack notification sent (if configured)
- Email alert (if configured)
- GitHub issue created (optional)

## Troubleshooting

### Tests Hang or Timeout

```bash
# Increase timeout for slow environments
TEST_TIMEOUT=60000 npm run test:e2e:smoke

# Or run single test with more time
npx playwright test packages/web/e2e/smoke.spec.ts --timeout=60000
```

### Tests Can't Find Elements

1. **Check selectors are correct:**
   ```bash
   npm run test:e2e:ui
   ```
   Then manually navigate to see what elements exist

2. **Wait for element visibility:**
   ```typescript
   const button = page.locator('button');
   await button.waitFor({ state: 'visible', timeout: 10000 });
   ```

3. **Use more specific selectors:**
   ```typescript
   // Bad
   const link = page.locator('a');

   // Good
   const link = page.locator('a:has-text("Create Wishlist")');
   ```

### "Page couldn't navigate" Errors

```typescript
// Ensure page waits for navigation
await page.click('button');
await page.waitForURL(/\/dashboard/);  // Add this
```

### Tests Fail Only in CI

1. **Check environment variables** - staging/prod URLs may be different
2. **Check credentials** - test users may not exist on CI environment
3. **Check network** - CI may be blocked from accessing websites
4. **Increase timeouts** - CI runners are slower

### Running Single Test for Debugging

```bash
# Run one test file
npx playwright test packages/web/e2e/tier-1-basic.spec.ts

# Run one test by name
npx playwright test -g "T1.1: User Registration"

# Run with UI
npx playwright test -g "T1.1" --ui
```

## Performance Tips

### Run Tests in Parallel (Faster)
```bash
# Default: parallel execution
npm run test:e2e:tier1

# Sequential (slower but easier to debug)
npx playwright test --workers=1
```

### Target Specific Browsers
```bash
# Default: Chrome + Firefox + Safari
# To test only Chrome:
npx playwright test --project=chromium
```

### Reduce Test Duration

```typescript
// Don't wait for full load
await page.goto('/', { waitUntil: 'domcontentloaded' });
```

## Best Practices

1. **Use semantic selectors** - `button:has-text("Label")` over `button.mybtn`
2. **Wait for conditions** - `await expect(locator).toBeVisible()` not `await page.wait(1000)`
3. **Test user flows** - Create account → List → Share → View, not isolated units
4. **Skip optional features** - Use `test.skip()` for incomplete/deferred features
5. **Handle race conditions** - Use `waitForURL()` after navigation
6. **Keep tests focused** - Each test should validate one user flow

## Example: Complete Flow Test

```typescript
test('Complete user journey', async ({ page }) => {
  // 1. Sign up
  await page.goto('/');
  await page.click('button:has-text("Sign Up")');
  await page.fill('input[type="email"]', 'test@example.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  
  // 2. Wait for redirect to dashboard
  await page.waitForURL(/\/wishlists/);
  
  // 3. Create wishlist
  await page.click('button:has-text("Create")');
  await page.fill('input[placeholder*="name"]', 'My List');
  await page.click('button[type="submit"]');
  
  // 4. Add item
  await page.click('button:has-text("Add Item")');
  await page.fill('input[placeholder*="product"]', 'PlayStation 5');
  await page.click('button:has-text("Add")');
  
  // 5. Share
  await page.click('button:has-text("Share")');
  const link = page.locator('input[readonly]');
  expect(await link.inputValue()).toContain('share');
});
```

## Performance Benchmarks

| Test Suite | Duration | Environment |
|-----------|----------|------------|
| Smoke | ~5 min | Dev (http://localhost) |
| Tier 1 | ~15 min | Staging (HTTPS) |
| Tier 2 | ~20 min | Staging (HTTPS) |
| All | ~40 min | Staging (HTTPS) |

## Security Notes

- **Never hardcode passwords** - Tests use environment variables from CI secrets
- **Don't test real user accounts** - Create test accounts specific to testing
- **Never commit sensitive data** - .env files are gitignored
- **Production tests are read-only** - Smoke tests only verify page loads, don't create data

## Support & Debugging

### Get Help
1. Check this guide's "Troubleshooting" section
2. Read [Playwright docs](https://playwright.dev/)
3. Check GitHub Actions logs
4. Review test report HTML

### Debug a Failing Test
```bash
# 1. Run with UI to see what fails
npm run test:e2e:ui

# 2. Or run with debug enabled
npm run test:e2e:debug

# 3. Take screenshot at specific point
await page.screenshot({ path: 'debug.png' });
```

## Next Steps

- ✅ Run smoke test: `npm run test:e2e:smoke`
- ✅ View UI runner: `npm run test:e2e:ui`
- ✅ Create CI workflow: See `.github/workflows/e2e-tests.yml`
- ✅ Customize tests for your app's UI
- ✅ Add to PR checks and deployment pipeline
