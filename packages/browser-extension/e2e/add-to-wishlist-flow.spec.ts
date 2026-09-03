import type { BrowserContext } from '@playwright/test';
import { test, expect } from './fixtures';

// This is the extension's flagship feature: find a product while browsing,
// click the floating button, land on a pre-filled "add to wishlist" screen.
// It was found completely non-functional in a 2026-07-18 audit (the button
// sent a message with no listener anywhere) and fixed the same day, along
// with a second, more severe bug where the button silently never actually
// used the enhanced/JSON-LD extractor at all (a missing `await`). This test
// exists so neither regresses silently again.

const FIXTURE_URL = 'https://e2e-fixture-shop.test/products/trail-backpack';

const FIXTURE_HTML = `<!doctype html>
<html>
<head>
  <title>Trail Backpack 40L</title>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": "Trail Backpack 40L",
    "image": "https://cdn.example.com/trail-backpack.jpg",
    "offers": {
      "@type": "Offer",
      "price": "89.95",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    }
  }
  </script>
</head>
<body>
  <h1>Trail Backpack 40L</h1>
  <div class="price">$89.95</div>
  <p>A durable 40-liter backpack for weekend trips.</p>
  <button id="add-to-cart-button">Add to Cart</button>
</body>
</html>`;

async function seedAuthenticatedSession(context: BrowserContext, extensionId: string) {
  const seedPage = await context.newPage();
  await seedPage.goto(`chrome-extension://${extensionId}/popup.html`);
  await seedPage.evaluate(() => new Promise<void>((resolve) => {
    chrome.storage.local.set(
      {
        authToken: 'e2e-seeded-token',
        tokenExpiry: new Date(Date.now() + 55 * 60 * 1000).toISOString(),
        userData: { email: 'e2e-test@example.com' },
      },
      resolve
    );
  }));
  await seedPage.close();
}

test.describe('browser extension — add while browsing', () => {
  test.beforeEach(async ({ context }) => {
    // The real billing endpoint (GET /api/billing/status) would 401 any
    // token that isn't a genuinely valid Firebase session — including a
    // seeded one — and background.js correctly clears auth state on any 401.
    // Stub it so this test can exercise the extension's own flow in
    // isolation, without needing the whole web app + Firebase emulator stack.
    await context.route('**/api/billing/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tier: 'free', status: 'active', usage: {}, limits: {} }) })
    );
    await context.route(FIXTURE_URL, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: FIXTURE_HTML })
    );
  });

  test('floating button appears on a non-whitelisted domain and extracts real JSON-LD data', async ({ context }) => {
    const page = await context.newPage();
    await page.goto(FIXTURE_URL, { waitUntil: 'networkidle' });

    const button = page.locator('#wishlist-wizard-add-button');
    await expect(button).toBeVisible({ timeout: 10000 });
  });

  test('clicking the button stashes the correct JSON-LD-extracted product for the popup', async ({ context, serviceWorker }) => {
    const page = await context.newPage();
    await page.goto(FIXTURE_URL, { waitUntil: 'networkidle' });

    const button = page.locator('#wishlist-wizard-add-button');
    await expect(button).toBeVisible({ timeout: 10000 });
    await button.click();

    await expect(async () => {
      const stashed = await serviceWorker.evaluate(() => new Promise((resolve) => {
        chrome.storage.session.get(['pendingProductData'], (r) => resolve(r.pendingProductData));
      }));
      expect(stashed).toBeTruthy();
      expect((stashed as any).data.title).toBe('Trail Backpack 40L');
      // normalizeProductInfo() formats the raw JSON-LD price ("89.95") with
      // a leading currency symbol for display.
      expect((stashed as any).data.price).toBe('$89.95');
      expect((stashed as any).data.imageUrl).toBe('https://cdn.example.com/trail-backpack.jpg');
    }).toPass({ timeout: 5000 });
  });

  test('the popup fast path skips detection and shows the extracted product, pre-filled', async ({ context, extensionId }) => {
    await seedAuthenticatedSession(context, extensionId);

    const page = await context.newPage();
    await page.goto(FIXTURE_URL, { waitUntil: 'networkidle' });

    const button = page.locator('#wishlist-wizard-add-button');
    await expect(button).toBeVisible({ timeout: 10000 });
    await button.click();

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);

    await expect(popup.locator('#product-title')).toHaveText('Trail Backpack 40L', { timeout: 10000 });
    await expect(popup.locator('#product-price')).toContainText('89.95');

    // The fast path must skip the "Detecting product details..." loading
    // screen entirely — it should never even flash it.
    await expect(popup.locator('#loading-screen')).toBeHidden();

    // And it must land on a ready-to-use add-to-wishlist screen.
    await expect(popup.locator('#add-button')).toBeVisible();
  });

  test('a page with no product data does not get a floating button', async ({ context }) => {
    const nonProductUrl = 'https://e2e-fixture-shop.test/about';
    await context.route(nonProductUrl, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'text/html',
        body: '<!doctype html><html><body><h1>About Us</h1><p>We make outdoor gear.</p></body></html>',
      })
    );

    const page = await context.newPage();
    await page.goto(nonProductUrl, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);

    await expect(page.locator('#wishlist-wizard-button-container')).toHaveCount(0);
  });
});
