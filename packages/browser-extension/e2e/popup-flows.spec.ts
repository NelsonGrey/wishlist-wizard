import type { BrowserContext } from '@playwright/test';
import { test, expect } from './fixtures';

// Covers the popup's other real user flows that add-to-wishlist-flow.spec.ts
// doesn't reach: signing in/out through the popup's own form (not just a
// pre-seeded session), submitting an add-to-wishlist all the way through to
// success or a server error, and creating a wishlist inline from the product
// screen. These exercise the extension's actual backend contracts
// (extensionGetWishlists / extensionAddItem / extensionCreateWishlist /
// Firebase's signInWithPassword REST call) via stubbed responses, the same
// way add-to-wishlist-flow.spec.ts stubs GET /api/billing/status.

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
  <button id="add-to-cart-button">Add to Cart</button>
</body>
</html>`;

// authenticate() in background.js decodes idToken as a real JWT
// (idToken.split('.') then atob() the payload), so the stubbed Firebase
// response needs a token that's actually shaped like one.
function fakeIdToken(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64');
  return `${header}.${body}.fake-signature`;
}

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

test.describe('browser extension — popup auth', () => {
  test.beforeEach(async ({ context }) => {
    await context.route('**/api/billing/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tier: 'free', status: 'active', usage: {}, limits: {} }) })
    );
  });

  test('a wrong password shows an inline error and stays on the login screen', async ({ context, extensionId }) => {
    await context.route('**/accounts:signInWithPassword*', (route) =>
      route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message: 'INVALID_PASSWORD' } }),
      })
    );

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(popup.locator('#login-screen')).toBeVisible();

    await popup.locator('#username-input').fill('e2e-test@example.com');
    await popup.locator('#password-input').fill('wrong-password');
    await popup.locator('#login-button').click();

    await expect(popup.locator('#login-error')).toHaveText('Incorrect password');
    await expect(popup.locator('#login-screen')).toBeVisible();
    // Button must reset, not stay stuck on "Logging in..." after a failure.
    await expect(popup.locator('#login-button')).toHaveText('Login');
    await expect(popup.locator('#login-button')).toBeEnabled();
  });

  test('valid credentials sign the user in and reveal the signed-in-user chrome', async ({ context, extensionId }) => {
    await context.route('**/accounts:signInWithPassword*', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          idToken: fakeIdToken({ user_id: 'e2e-uid' }),
          refreshToken: 'e2e-refresh-token',
          expiresIn: '3600',
          localId: 'e2e-uid',
          email: 'e2e-test@example.com',
        }),
      })
    );

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(popup.locator('#login-screen')).toBeVisible();

    await popup.locator('#username-input').fill('e2e-test@example.com');
    await popup.locator('#password-input').fill('correct-password');
    await popup.locator('#login-button').click();

    // The header's signed-in indicator is shown regardless of which screen
    // checkProductPage() lands on next, so it's the stable thing to assert.
    await expect(popup.locator('#user-info')).toBeVisible({ timeout: 10000 });
    await expect(popup.locator('#username')).toHaveText('e2e-test');
    await expect(popup.locator('#login-screen')).toBeHidden();

    const stored = await popup.evaluate(() => new Promise((resolve) => {
      chrome.storage.local.get(['authToken', 'userData'], resolve);
    }));
    expect((stored as any).authToken).toBeTruthy();
    expect((stored as any).userData.email).toBe('e2e-test@example.com');
  });

  test('signing out clears the session and returns to the login screen', async ({ context, extensionId }) => {
    await seedAuthenticatedSession(context, extensionId);

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(popup.locator('#user-info')).toBeVisible({ timeout: 10000 });

    await popup.locator('#logout-button').click();
    // logoutUser() clears storage and reloads the popup document.
    await popup.waitForLoadState('domcontentloaded');
    await expect(popup.locator('#login-screen')).toBeVisible({ timeout: 10000 });
    await expect(popup.locator('#user-info')).toBeHidden();

    const stored = await popup.evaluate(() => new Promise((resolve) => {
      chrome.storage.local.get(['authToken'], resolve);
    }));
    expect((stored as any).authToken).toBeFalsy();
  });
});

test.describe('browser extension — add-to-wishlist submission', () => {
  test.beforeEach(async ({ context }) => {
    await context.route('**/api/billing/status', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ tier: 'free', status: 'active', usage: {}, limits: {} }) })
    );
    await context.route(FIXTURE_URL, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: FIXTURE_HTML })
    );
  });

  // Reaches product-screen the same deterministic way
  // add-to-wishlist-flow.spec.ts does: click the floating button (which
  // stashes the extracted product via background.js), then open a fresh
  // popup page, which takes checkProductPage()'s fast path.
  async function openPopupOnProductScreen(context: BrowserContext, extensionId: string) {
    const page = await context.newPage();
    await page.goto(FIXTURE_URL, { waitUntil: 'networkidle' });
    const button = page.locator('#wishlist-wizard-add-button');
    await expect(button).toBeVisible({ timeout: 10000 });
    await button.click();

    const popup = await context.newPage();
    await popup.goto(`chrome-extension://${extensionId}/popup.html`);
    await expect(popup.locator('#product-screen')).toBeVisible({ timeout: 10000 });
    return popup;
  }

  test('selecting a wishlist and submitting adds the item and shows the success screen', async ({ context, extensionId }) => {
    await seedAuthenticatedSession(context, extensionId);
    await context.route('**/extensionGetWishlists', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'w1', name: 'Birthday List' },
          { id: 'w2', name: 'Camping Gear' },
        ]),
      })
    );
    await context.route('**/extensionAddItem', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'item1' }) })
    );

    const popup = await openPopupOnProductScreen(context, extensionId);

    const select = popup.locator('#wishlist-select');
    await expect(select.locator('option')).toHaveCount(3, { timeout: 10000 }); // placeholder + 2 wishlists
    await select.selectOption('w2');

    await popup.locator('#add-button').click();

    await expect(popup.locator('#success-screen')).toBeVisible({ timeout: 10000 });
  });

  test('a server error on submission shows the error screen with a retry option', async ({ context, extensionId }) => {
    await seedAuthenticatedSession(context, extensionId);
    await context.route('**/extensionGetWishlists', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 'w1', name: 'Birthday List' }]),
      })
    );
    await context.route('**/extensionAddItem', (route) =>
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal error adding item' }),
      })
    );

    const popup = await openPopupOnProductScreen(context, extensionId);
    await expect(popup.locator('#wishlist-select option')).toHaveCount(2, { timeout: 10000 });

    await popup.locator('#add-button').click();

    await expect(popup.locator('#error-screen')).toBeVisible({ timeout: 10000 });
    await expect(popup.locator('#error-message')).toHaveText('Internal error adding item');
    await expect(popup.locator('#retry-button')).toBeVisible();
  });

  test('a plan-limit error shows the paywall, which deep-links to the web app instead of an in-popup checkout', async ({ context, extensionId }) => {
    await seedAuthenticatedSession(context, extensionId);
    await context.route('**/extensionGetWishlists', (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'w1', name: 'Birthday List' }]) })
    );
    await context.route('**/extensionAddItem', (route) =>
      route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'You have reached the wishlist item limit on your free plan. Upgrade to add more.' }),
      })
    );

    const popup = await openPopupOnProductScreen(context, extensionId);
    await expect(popup.locator('#wishlist-select option')).toHaveCount(2, { timeout: 10000 });
    await popup.locator('#add-button').click();

    // Paywall overlay — no pricing cards, no billing-cycle toggle, no in-popup checkout.
    await expect(popup.locator('#paywall-overlay')).toBeVisible({ timeout: 10000 });
    await expect(popup.locator('#paywall-options')).toHaveCount(0);
    await expect(popup.locator('#paywall-billing-monthly')).toHaveCount(0);
    await expect(popup.locator('#tier-modal-overlay')).toHaveCount(0);

    // "View plans" opens the web app's subscription page in a new tab.
    const newPagePromise = context.waitForEvent('page');
    await popup.locator('#paywall-view-plans-button').click();
    const newPage = await newPagePromise;
    expect(newPage.url()).toContain('/app/subscription');
  });

  test('creating a wishlist inline selects it automatically for the current item', async ({ context, extensionId }) => {
    await seedAuthenticatedSession(context, extensionId);

    let getWishlistsCalls = 0;
    await context.route('**/extensionGetWishlists', (route) => {
      getWishlistsCalls += 1;
      const wishlists = getWishlistsCalls === 1
        ? [{ id: 'w1', name: 'Existing List' }]
        : [{ id: 'w1', name: 'Existing List' }, { id: 'w2', name: 'Holiday List' }];
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(wishlists) });
    });
    await context.route('**/extensionCreateWishlist', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'w2', name: 'Holiday List' }),
      })
    );

    const popup = await openPopupOnProductScreen(context, extensionId);
    await expect(popup.locator('#wishlist-select option')).toHaveCount(2, { timeout: 10000 }); // placeholder + w1

    await popup.locator('#create-wishlist-button').click();
    await expect(popup.locator('#create-wishlist-inline')).toBeVisible();
    await popup.locator('#new-wishlist-name-input').fill('Holiday List');
    await popup.locator('#save-wishlist-button').click();

    await expect(popup.locator('#create-wishlist-inline')).toBeHidden({ timeout: 10000 });
    await expect(popup.locator('#wishlist-select')).toHaveValue('w2');
    expect(getWishlistsCalls).toBe(2); // once on initial load, once refreshed after creation
  });
});
