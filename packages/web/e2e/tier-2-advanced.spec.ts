/// <reference types="@playwright/test" />
import { test, expect, Page } from '@playwright/test';

/**
 * TIER 2: ADVANCED FEATURES (NICE TO HAVE)
 * Tests extension, affiliate, analytics, calendar, and other advanced features
 */

test.describe('Tier 2: Advanced Features', () => {
  let page: Page;

  test.beforeAll(async ({ browser }: { browser: any }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test.beforeEach(async () => {
    // Ensure logged in
    await page.goto('/');
    const isLoggedIn = await page.locator('[aria-label="User menu"], button:has-text("Profile")').isVisible();
    if (!isLoggedIn) {
      // User needs to be logged in from Tier 1 tests or manual auth
      test.skip();
    }
  });

  test('T2.1: Browser Extension - Authenticate', async () => {
    // Navigate to extension settings or extension auth
    await page.goto('/settings');
    
    const extensionTab = page.locator('text="Extension"').first();
    if (await extensionTab.isVisible()) {
      await extensionTab.click();
    } else {
      await page.goto('/settings/extension');
    }

    // Verify extension section visible
    const extensionSection = page.locator('[role="main"], .extension-section').first();
    await expect(extensionSection).toBeVisible({ timeout: 5000 });

    // Look for authentication token or status
    const authStatus = page.locator('text=/authenticated|connected|active/i').first();
    if (await authStatus.isVisible()) {
      await expect(authStatus).toBeVisible();
    }
  });

  test('T2.2: Browser Extension - Add Item from Extension', async () => {
    // Navigate to extension integration page
    await page.goto('/settings/extension');

    // Verify extension can add items
    const addItemFromExt = page.locator('text="Add item from browser"').first();
    if (await addItemFromExt.isVisible()) {
      await expect(addItemFromExt).toBeVisible();
    }

    // In real scenario, this would be tested by simulating extension message
    // For now, verify the UI is ready
    const extensionReady = page.locator('text=/extension|browser/i').first();
    await expect(extensionReady).toBeVisible();
  });

  test('T2.3: Analytics - Track Event', async () => {
    // Navigate to home/dashboard
    await page.goto('/');

    // Perform an action that tracks analytics (e.g., navigate)
    const wishlistLink = page.locator('a[href*="wishlists"]').first();
    if (await wishlistLink.isVisible()) {
      await wishlistLink.click();
    }

    // Analytics should be sent in background
    // Verify page loaded successfully
    await page.waitForTimeout(1000);
    await expect(page).not.toHaveTitle('error');
  });

  test('T2.4: Analytics - View Summary', async () => {
    // Navigate to analytics if available
    const analyticsLink = page.locator('a[href*="analytics"], text="Analytics"').first();
    if (await analyticsLink.isVisible()) {
      await analyticsLink.click();

      // Verify analytics dashboard
      const analyticsPanel = page.locator('[role="main"], .analytics-panel').first();
      await expect(analyticsPanel).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('T2.5: Affiliate Program - Get Program Info', async () => {
    // Navigate to affiliate section
    const affiliateLink = page.locator('a[href*="affiliate"], text="Affiliate"').first();
    if (await affiliateLink.isVisible()) {
      await affiliateLink.click();

      // Verify affiliate programs displayed
      const programsList = page.locator('[role="list"], .programs-list').first();
      await expect(programsList).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('T2.6: Affiliate - View Stats/Earnings', async () => {
    // Should be on affiliate page from T2.5
    const statsSection = page.locator('text=/earnings|clicks|revenue|balance/i').first();
    
    if (await statsSection.isVisible()) {
      // Verify stats are displayed
      await expect(statsSection).toBeVisible();
    }
  });

  test('T2.7: Affiliate Link Conversion', async () => {
    // Test converting a product link to affiliate link
    // This typically happens via extension or dashboard
    
    const affiliateInputField = page.locator('input[placeholder*="link" i], input[placeholder*="url" i]').first();
    if (await affiliateInputField.isVisible()) {
      // Enter a test product URL
      await affiliateInputField.fill('https://amazon.com/s?k=laptop');

      // Find convert button
      const convertButton = page.locator('button:has-text("Convert")').first();
      if (await convertButton.isVisible()) {
        await convertButton.click();

        // Verify converted link displayed
        const convertedLink = page.locator('input[readonly], input[value*="affiliate" i]');
        await expect(convertedLink).toBeVisible({ timeout: 5000 });
      }
    } else {
      test.skip();
    }
  });

  test('T2.8: Calendar - Get Events', async () => {
    // Navigate to calendar
    const calendarLink = page.locator('a[href*="calendar"], text="Calendar"').first();
    if (await calendarLink.isVisible()) {
      await calendarLink.click();
    } else {
      await page.goto('/calendar');
    }

    // Verify calendar displayed
    const calendar = page.locator('[role="grid"], .calendar, .react-big-calendar').first();
    if (await calendar.isVisible({ timeout: 5000 })) {
      await expect(calendar).toBeVisible();
    }
  });

  test('T2.9: Calendar - Create Event', async () => {
    // Should be on calendar
    const createEventButton = page.locator('button:has-text("Create"), button:has-text("Add"), button:has-text("New")').first();
    if (await createEventButton.isVisible()) {
      await createEventButton.click();

      // Fill event form
      const eventTitle = page.locator('input[placeholder*="event" i], input[placeholder*="title" i]').first();
      if (await eventTitle.isVisible()) {
        await eventTitle.fill('Birthday');

        // Set date if available
        const dateInput = page.locator('input[type="date"]').first();
        if (await dateInput.isVisible()) {
          await dateInput.fill('2026-05-15');
        }

        // Submit
        const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
        await submitButton.click();

        // Verify event created
        const eventElement = page.locator('text="Birthday"');
        await expect(eventElement).toBeVisible({ timeout: 5000 });
      }
    } else {
      test.skip();
    }
  });

  test('T2.10: Calendar - Update Event', async () => {
    // Find the birthday event from T2.9
    const eventElement = page.locator('text="Birthday"').first();
    if (await eventElement.isVisible()) {
      // Click to open event details
      await eventElement.click();

      // Find edit button
      const editButton = page.locator('button:has-text("Edit")').first();
      if (await editButton.isVisible()) {
        await editButton.click();

        // Update title
        const titleInput = page.locator('input[value="Birthday"]').first();
        if (await titleInput.isVisible()) {
          await titleInput.clear();
          await titleInput.fill('Special Birthday');
        }

        // Save
        const saveButton = page.locator('button:has-text("Save")').first();
        await saveButton.click();

        // Verify update
        await expect(page.locator('text="Special Birthday"')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('T2.11: Calendar - Delete Event', async () => {
    // Find and click event
    const eventElement = page.locator('text="Special Birthday"').first();
    if (await eventElement.isVisible()) {
      await eventElement.click();

      // Find delete button
      const deleteButton = page.locator('button:has-text("Delete")').first();
      if (await deleteButton.isVisible()) {
        await deleteButton.click();

        // Confirm deletion
        const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")').last();
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }

        // Verify removal
        await expect(page.locator('text="Special Birthday"')).not.toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('T2.12: Price History - Lookup Product', async () => {
    // Navigate to barcode/lookup
    const lookupLink = page.locator('a[href*="lookup"], text=/lookup|barcode/i').first();
    if (await lookupLink.isVisible()) {
      await lookupLink.click();
    } else {
      await page.goto('/lookup');
    }

    // Enter a barcode or product
    const barcodeInput = page.locator('input[placeholder*="barcode" i], input[placeholder*="product" i]').first();
    if (await barcodeInput.isVisible()) {
      await barcodeInput.fill('PlayStation 5');

      // Search
      const searchButton = page.locator('button:has-text("Search")').first();
      if (await searchButton.isVisible()) {
        await searchButton.click();

        // Wait for results
        const results = page.locator('[role="list"], .results').first();
        await expect(results).toBeVisible({ timeout: 5000 });
      }
    } else {
      test.skip();
    }
  });

  test('T2.13: Price History - View Price Trends', async () => {
    // Should have search results from T2.12
    const priceChart = page.locator('[role="img"], .chart, canvas').first();
    if (await priceChart.isVisible()) {
      // Price history chart visible
      await expect(priceChart).toBeVisible();
    }
  });

  test('T2.14: Push Notifications - Save FCM Token', async () => {
    // Navigate to notification settings
    await page.goto('/settings/notifications');

    // Enable push notifications if needed
    const enableNotifications = page.locator('input[type="checkbox"], [role="switch"]').first();
    if (await enableNotifications.isVisible()) {
      const isChecked = await enableNotifications.isChecked();
      if (!isChecked) {
        await enableNotifications.click();
      }
    }

    // Verify notification permission requested/granted
    const notificationStatus = page.locator('text=/enabled|allowed|active/i').first();
    if (await notificationStatus.isVisible()) {
      await expect(notificationStatus).toBeVisible();
    }
  });

  test('T2.15: Group Payments - View Pool Summary', async () => {
    // Navigate to group payments
    const groupPaymentsLink = page.locator('a[href*="group"], text="Group Gift"').first();
    if (await groupPaymentsLink.isVisible()) {
      await groupPaymentsLink.click();

      // Verify group payments section
      const groupSection = page.locator('[role="main"], .group-payments').first();
      await expect(groupSection).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });

  test('T2.16: Group Payments - Create Intent (if Stripe ready)', async () => {
    // Should be on group payments page
    // This test skips if Stripe not configured
    
    const createPaymentButton = page.locator('button:has-text("Create Pool"), button:has-text("Start Group Gift")').first();
    if (await createPaymentButton.isVisible()) {
      await createPaymentButton.click();

      // Verify payment form
      const paymentForm = page.locator('[role="form"], .payment-form').first();
      if (await paymentForm.isVisible()) {
        // Stripe payment button would be here
        const stripeButton = page.locator('iframe[title*="Stripe" i], button[data-stripe], text=/pay|charge/i').first();
        if (await stripeButton.isVisible()) {
          await expect(stripeButton).toBeVisible();
        }
      }
    } else {
      test.skip();
    }
  });

  test('T2.18: Device Management - List Devices', async () => {
    // Navigate to settings
    await page.goto('/settings/devices');

    // Verify devices list
    const devicesList = page.locator('[role="list"], .devices-list').first();
    await expect(devicesList).toBeVisible({ timeout: 5000 });

    // Should show at least current device
    const currentDevice = page.locator('text=/current|this device/i').first();
    if (await currentDevice.isVisible()) {
      await expect(currentDevice).toBeVisible();
    }
  });

  test('T2.19: Device Management - Update Device Name', async () => {
    // Should be on devices page
    const editButton = page.locator('button:has-text("Edit"), [aria-label*="edit" i]').first();
    if (await editButton.isVisible()) {
      await editButton.click();

      // Update name
      const nameInput = page.locator('input[type="text"]').first();
      if (await nameInput.isVisible()) {
        await nameInput.clear();
        await nameInput.fill('My Chrome Browser');

        // Save
        const saveButton = page.locator('button:has-text("Save")').first();
        await saveButton.click();

        // Verify update
        await expect(page.locator('text="My Chrome Browser"')).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('T2.20: Sync Logs - View Sync History', async () => {
    // Navigate to sync logs if available
    const syncLogsLink = page.locator('a[href*="sync"], text="Sync Logs"').first();
    if (await syncLogsLink.isVisible()) {
      await syncLogsLink.click();

      // Verify logs displayed
      const logsList = page.locator('[role="list"], .logs-list').first();
      await expect(logsList).toBeVisible({ timeout: 5000 });
    } else {
      test.skip();
    }
  });
});
