# E2E Testing - Quick Reference

## 🚀 Get Started Fast

### Install & Run (5 minutes)
```bash
# One-time setup
npm install
npx playwright install

# Run smoke test
npm run test:e2e:smoke

# View results
npm run test:e2e:report
```

### Using the Helper Script
```bash
# Make executable (first time)
chmod +x scripts/e2e-test.sh

# Run smoke test on dev
./scripts/e2e-test.sh smoke

# Run tier 1 on staging
./scripts/e2e-test.sh tier1 staging

# Run fast tier 1 on Chromium only
./scripts/e2e-test.sh tier1-chromium

# Open interactive UI
./scripts/e2e-test.sh ui
```

---

## 📋 Test Commands

| Command | What It Does | Time |
|---------|-------------|------|
| `npm run test:e2e:smoke` | Quick sanity check | ~5 min |
| `npm run test:e2e:tier1:chromium` | Fast Tier 1 gate (Chromium only) | ~1 min |
| `npm run test:e2e:tier1` | Basic features (accounts, wishlists, items) | ~15 min |
| `npm run test:e2e:tier2` | Advanced features (extension, affiliate, calendar) | ~20 min |
| `npm run test:e2e:all` | Complete test suite | ~40 min |
| `npm run test:e2e:ui` | Interactive test runner | varies |
| `npm run test:e2e:debug` | Step through tests with debugger | varies |
| `npm run test:e2e:report` | View last test results | instant |

---

## 🎯 Which Environment?

```bash
# Dev (default - https://wishlist-wizard-dev.web.app)
npm run test:e2e:smoke

# Staging
npm run test:e2e:staging

# Production (smoke only to be safe!)
npm run test:e2e:prod

# Local development server (http://localhost:5173)
npm run test:e2e:dev

# Custom URL
TEST_URL=https://your-url.app npm run test:e2e:smoke
```

---

## 🧪 What Gets Tested?

### Tier 1: Basic Features (MUST WORK)
✅ User registration & login  
✅ Create/edit/delete wishlists  
✅ Add/edit/delete wishlist items  
✅ Share wishlists publicly  
✅ Notification settings  
✅ Cross-device sync  

### Tier 2: Advanced Features
✅ Browser extension integration  
✅ Affiliate link conversion  
✅ Analytics tracking  
✅ Calendar events (create/edit/delete)  
✅ Price history lookup  
✅ Device management  
⚠️ Group payments (Stripe config required)  

---

## 🔍 Debugging Failed Tests

```bash
# 1. Open interactive UI to see what's happening
npm run test:e2e:ui

# 2. Click "Inspect" to pause at failing moment
# (Look for red X next to failed test)

# 3. Or use console debugging
npm run test:e2e:debug

# 4. Or run single test only
npx playwright test -g "T1.1: User Registration"
```

---

## 📊 CI/CD Pipeline

Tests run automatically:
- ✅ **Every commit** → Smoke test on dev
- ✅ **Pull requests** → Smoke + Tier 1 on staging  
- ✅ **Daily** → Smoke test on production
- ✅ **Manual** → Any test suite on any environment

View results in GitHub Actions → "E2E Tests - Website Readiness"

---

## 🛠️ Customizing Tests

### Add a new test:
```typescript
// In packages/web/e2e/tier-1-basic.spec.ts

test('T1.X: New Feature Name', async ({ page }) => {
  await page.goto('/path');
  
  // Click something
  await page.click('button:has-text("Label")');
  
  // Verify result
  await expect(page.locator('text="Success"')).toBeVisible();
});
```

### Update a selector:
```typescript
// Instead of class names (fragile):
const button = page.locator('.btn-primary');

// Use text content (robust):
const button = page.locator('button:has-text("Create Wishlist")');
```

### Skip tests not ready:
```typescript
test.skip('T2.5: Feature Not Ready', async ({ page }) => {
  // Won't run until removed
});
```

---

## ⚡ Performance Tips

```bash
# Run only Chrome (faster)
npx playwright test --project=chromium

# Run tests sequentially (better for debugging)
npx playwright test --workers=1

# Run in parallel (default - faster overall)
npx playwright test  # 4 workers by default

# Test only on desktop (skip mobile)
# Edit playwright.config.ts and comment out mobile projects
```

---

## 🐛 Common Issues

### "Page couldn't navigate to..."
→ Check TEST_URL environment variable
→ Verify website is accessible

### "Element not found"
→ Try interactive UI: `npm run test:e2e:ui`
→ Selectors may need updating if UI changed

### "Tests hang or timeout"
```bash
# Increase timeout
npx playwright test --timeout=60000
```

### "Works locally but fails in CI"
→ Check network access to target URL in CI  
→ Verify environment variables set correctly  
→ Increase timeouts for slower CI runners  

---

## 📖 Learn More

- [Full E2E Testing Guide](./E2E_TESTING_GUIDE.md)
- [Playwright Docs](https://playwright.dev)
- [Test Architecture](./packages/web/e2e/)
- [CI Configuration](./.github/workflows/e2e-tests.yml)

---

## ✅ Pre-Launch Checklist

- [ ] Run `npm run test:e2e:tier1` against staging
- [ ] Run `npm run test:e2e:tier1:chromium` as fast PR gate
- [ ] Verify all Tier 1 tests pass (auth happy-path test may skip when auth is unavailable)
- [ ] Run `npm run test:e2e:smoke` against production
- [ ] Check GitHub Actions logs show green
- [ ] Review test report for any warnings
- [ ] Update any broken selectors if UI changed

---

## 🚀 Quick Wins

```bash
# Setup in 30 seconds
npm install && npx playwright install

# Test in 5 minutes
npm run test:e2e:smoke

# View results
npm run test:e2e:report

# Done! ✨
```

Enjoy automated testing! 🎉
