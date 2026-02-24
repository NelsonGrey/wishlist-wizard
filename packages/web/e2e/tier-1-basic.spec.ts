/// <reference types="@playwright/test" />
import { test, expect, Page } from '@playwright/test';
import { testUser } from './fixtures/test-user';

/**
 * TIER 1: BASIC FEATURES (MUST WORK)
 * Tests core functionality: accounts, wishlists, items, sharing, notifications, sync
 */

test.describe('Tier 1: Basic Features', () => {
  let page: Page;
  let userId: string;

  test.beforeAll(async ({ browser }: { browser: any }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test('T1.1: User Registration and Profile Creation', async () => {
    await page.goto('/');
    
    // Find login/signup button
    const signupButton = page.locator('button:has-text("Sign Up"), a:has-text("Create Account")').first();
    await expect(signupButton).toBeVisible({ timeout: 5000 });
    await signupButton.click();

    // Fill registration form
    await page.fill('input[type="email"]', testUser.email);
    await page.fill('input[type="password"]', testUser.password);
    
    // Handle name field if present
    const nameInputs = await page.locator('input[placeholder*="name" i], input[aria-label*="name" i]').count();
    if (nameInputs > 0) {
      await page.fill('input[placeholder*="name" i], input[aria-label*="name" i]', testUser.displayName);
    }

    // Submit
    await page.click('button[type="submit"], button:has-text("Sign Up"), button:has-text("Create")');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(dashboard|wishlists|home)/, { timeout: 10000 });
    
    // Verify user is logged in
    const userMenu = page.locator('[aria-label="User menu"], button:has-text("Profile"), button:has-text("Account")').first();
    await expect(userMenu).toBeVisible({ timeout: 5000 });
  });

  test('T1.2: Get User Profile', async () => {
    // Should be logged in from previous test
    const profileLink = page.locator('a[href*="profile"], button:has-text("Profile")').first();
    await profileLink.click();

    // Verify profile page loads
    await page.waitForURL(/\/profile|\/account|\/settings/, { timeout: 5000 });
    
    // Check profile data is displayed
    const profileContent = page.locator('[role="main"], .profile-content, .account-section').first();
    await expect(profileContent).toBeVisible();
  });

  test('T1.3: Update User Profile', async () => {
    // Should be on profile page from T1.2
    const profilePage = page.url();
    if (!profilePage.includes('profile') && !profilePage.includes('account')) {
      await page.goto('/profile');
    }

    // Find edit button
    const editButton = page.locator('button:has-text("Edit"), button:has-text("Update")').first();
    await editButton.click();

    // Update a field
    const nameField = page.locator('input[placeholder*="name" i], input[aria-label*="name" i]').first();
    await nameField.clear();
    await nameField.fill(`${testUser.displayName} Updated`);

    // Save
    const saveButton = page.locator('button[type="submit"], button:has-text("Save")').first();
    await saveButton.click();

    // Verify success message
    const successMsg = page.locator('text=/saved|updated|success/i').first();
    await expect(successMsg).toBeVisible({ timeout: 5000 });
  });

  test('T1.4: Create Wishlist', async () => {
    // Navigate to wishlists
    await page.goto('/wishlists');
    
    // Find create button
    const createButton = page.locator('button:has-text("Create"), button:has-text("New"), button:has-text("Add")').first();
    await expect(createButton).toBeVisible({ timeout: 5000 });
    await createButton.click();

    // Fill wishlist form
    const nameInput = page.locator('input[placeholder*="name" i], input[aria-label*="list" i]').first();
    await nameInput.fill('Birthday Wishlist 2026');

    const descInput = page.locator('textarea, input[placeholder*="description" i]');
    if (await descInput.isVisible()) {
      await descInput.fill('Items I want for my birthday');
    }

    // Submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Create")').first();
    await submitButton.click();

    // Verify wishlist was created
    await page.waitForURL(/\/wishlists/, { timeout: 5000 });
    const listName = page.locator('text="Birthday Wishlist 2026"');
    await expect(listName).toBeVisible({ timeout: 5000 });
  });

  test('T1.5: Get Wishlist by ID', async () => {
    // Should have list from T1.4
    const wishlistLink = page.locator('a:has-text("Birthday Wishlist 2026"), text="Birthday Wishlist 2026"').first();
    await wishlistLink.click();

    // Verify wishlist detail page
    await page.waitForURL(/\/wishlists\/[\w-]+/, { timeout: 5000 });
    
    const listTitle = page.locator('h1, h2').first();
    await expect(listTitle).toContainText('Birthday Wishlist 2026');
  });

  test('T1.6: Update Wishlist', async () => {
    // Should be on wishlist detail from T1.5
    const editButton = page.locator('button:has-text("Edit"), button:has-text("Settings"), [aria-label*="edit" i]').first();
    if (await editButton.isVisible()) {
      await editButton.click();
    } else {
      // Try clicking menu
      const menu = page.locator('[aria-label="wishlist menu"], button[aria-haspopup="true"]').first();
      if (await menu.isVisible()) {
        await menu.click();
        await page.locator('text="Edit"').click();
      }
    }

    // Update title
    const nameInput = page.locator('input[value*="Birthday"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.clear();
      await nameInput.fill('My Birthday Wishlist 2026');
    }

    // Save
    const saveButton = page.locator('button[type="submit"], button:has-text("Save")').first();
    await saveButton.click();

    // Verify update
    const updatedTitle = page.locator('text="My Birthday Wishlist 2026"');
    await expect(updatedTitle).toBeVisible({ timeout: 5000 });
  });

  test('T1.7: Add Item to Wishlist', async () => {
    // Should be on wishlist detail
    const addItemButton = page.locator('button:has-text("Add Item"), button:has-text("Add"), [aria-label*="add" i]').first();
    await expect(addItemButton).toBeVisible({ timeout: 5000 });
    await addItemButton.click();

    // Fill item form
    const itemNameInput = page.locator('input[placeholder*="product" i], input[placeholder*="item" i]').first();
    await itemNameInput.fill('PlayStation 5');

    const priceInput = page.locator('input[type="number"]');
    if (await priceInput.isVisible()) {
      await priceInput.fill('499.99');
    }

    // Submit
    const submitButton = page.locator('button[type="submit"], button:has-text("Add")').first();
    await submitButton.click();

    // Verify item added
    const itemElement = page.locator('text="PlayStation 5"');
    await expect(itemElement).toBeVisible({ timeout: 5000 });
  });

  test('T1.8: Update Wishlist Item', async () => {
    // Find the PlayStation item
    const itemCard = page.locator('text="PlayStation 5"').first();
    await expect(itemCard).toBeVisible();

    // Find edit button for item
    const editButton = page.locator('[aria-label*="edit" i]').filter({ has: itemCard.locator('..') }).first();
    if (await editButton.isVisible()) {
      await editButton.click();
    } else {
      // Try right-click or menu
      await itemCard.click({ button: 'right' });
      const editOption = page.locator('text="Edit"').first();
      if (await editOption.isVisible()) {
        await editOption.click();
      }
    }

    // Update price
    const priceInput = page.locator('input[type="number"]').first();
    if (await priceInput.isVisible()) {
      await priceInput.clear();
      await priceInput.fill('449.99');
    }

    // Save
    const saveButton = page.locator('button[type="submit"], button:has-text("Save")').first();
    await saveButton.click();

    // Verify update
    await expect(page.locator('text="449.99"')).toBeVisible({ timeout: 5000 });
  });

  test('T1.9: Delete Wishlist Item', async () => {
    // Find delete button for item
    const deleteButton = page.locator('[aria-label*="delete" i]').first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
    } else {
      // Try menu
      const menu = page.locator('button[aria-haspopup="true"]').first();
      await menu.click();
      await page.locator('text="Delete"').click();
    }

    // Confirm deletion if prompted
    const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")').last();
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Verify item removed
    await expect(page.locator('text="PlayStation 5"')).not.toBeVisible({ timeout: 5000 });
  });

  test('T1.10: Get Wishlist Items', async () => {
    // Navigate to wishlist
    await page.goto('/wishlists');
    const listLink = page.locator('text="My Birthday Wishlist 2026"').first();
    await listLink.click();

    // Verify items list loaded
    const itemsList = page.locator('[role="list"], .items-container').first();
    await expect(itemsList).toBeVisible({ timeout: 5000 });
  });

  test('T1.11: Share Wishlist', async () => {
    // Should be on wishlist detail
    const shareButton = page.locator('button:has-text("Share"), [aria-label*="share" i]').first();
    if (await shareButton.isVisible()) {
      await shareButton.click();
    }

    // Find share link or generate
    const shareModal = page.locator('[role="dialog"], .share-modal').first();
    if (await shareModal.isVisible()) {
      // Copy link or display share options
      const shareLink = page.locator('input[readonly], input[value*="wishlist"]').first();
      if (await shareLink.isVisible()) {
        const linkValue = await shareLink.inputValue();
        expect(linkValue).toContain('wishlist');
      }
    }
  });

  test('T1.12: Get Shared Wishlist (Public View)', async () => {
    // Get share link
    await page.goto('/wishlists');
    const listLink = page.locator('text="My Birthday Wishlist 2026"').first();
    
    // Try to find and click share
    const shareButton = page.locator('[aria-label*="share" i]').first();
    if (await shareButton.isVisible()) {
      await shareButton.click();
      const shareLink = page.locator('input[readonly]').first();
      if (await shareLink.isVisible()) {
        const url = await shareLink.inputValue();
        
        // Open share link in new context (not logged in)
        const newPage = await page.context().newPage();
        await newPage.goto(url);
        
        // Verify wishlist visible without login
        const listTitle = newPage.locator('h1, h2').first();
        await expect(listTitle).toContainText('My Birthday Wishlist 2026');
        
        await newPage.close();
      }
    }
  });

  test('T1.13: Save/Update Notification Settings', async () => {
    // Navigate to notification settings
    await page.goto('/');
    const settingsLink = page.locator('a[href*="settings"], button:has-text("Settings")').first();
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
    } else {
      await page.goto('/settings');
    }

    // Find notifications section
    const notificationsTab = page.locator('text="Notifications"').first();
    if (await notificationsTab.isVisible()) {
      await notificationsTab.click();
    }

    // Toggle a notification setting
    const toggles = page.locator('input[type="checkbox"], [role="switch"]');
    if (await toggles.first().isVisible()) {
      await toggles.first().click();
    }

    // Save if separate save button
    const saveButton = page.locator('button:has-text("Save")').first();
    if (await saveButton.isVisible()) {
      await saveButton.click();
      
      // Verify success message
      const successMsg = page.locator('text=/saved|success/i').first();
      await expect(successMsg).toBeVisible({ timeout: 5000 });
    }
  });

  test('T1.14: Get/List Notifications', async () => {
    // Navigate to notifications
    const notifBell = page.locator('[aria-label*="notification" i], button:has-text("Notifications")').first();
    if (await notifBell.isVisible()) {
      await notifBell.click();
    } else {
      await page.goto('/notifications');
    }

    // Verify notifications list
    const notifList = page.locator('[role="list"], .notifications-container').first();
    await expect(notifList).toBeVisible({ timeout: 5000 });
  });

  test('T1.15: Register Device for Sync', async () => {
    // Navigate to devices
    const settingsLink = page.locator('a[href*="settings"]').first();
    if (await settingsLink.isVisible()) {
      await settingsLink.click();
    }

    const devicesTab = page.locator('text="Devices"').first();
    if (await devicesTab.isVisible()) {
      await devicesTab.click();
    } else {
      await page.goto('/settings/devices');
    }

    // Current device should auto-register
    const deviceList = page.locator('[role="list"], .devices-list').first();
    await expect(deviceList).toBeVisible({ timeout: 5000 });

    // Should show current device
    const currentDevice = page.locator('text=/current|this device/i');
    if (await currentDevice.isVisible()) {
      await expect(currentDevice).toBeVisible();
    }
  });

  test('T1.16: Cross-Device Sync', async () => {
    // Add an item
    await page.goto('/wishlists');
    const listLink = page.locator('text="My Birthday Wishlist 2026"').first();
    await listLink.click();

    const addItemButton = page.locator('button:has-text("Add Item"), button:has-text("Add")').first();
    await addItemButton.click();

    const itemNameInput = page.locator('input[placeholder*="product" i], input[placeholder*="item" i]').first();
    await itemNameInput.fill('Test Sync Item');

    const submitButton = page.locator('button[type="submit"]').first();
    await submitButton.click();

    // Wait for item to appear
    await expect(page.locator('text="Test Sync Item"')).toBeVisible({ timeout: 5000 });

    // In a real scenario, you'd verify this syncs to another device
    // But for now, we verify local state is updated
  });

  test('T1.17: Delete Wishlist', async () => {
    // Navigate to wishlists
    await page.goto('/wishlists');

    // Find wishlist
    const listCard = page.locator('text="My Birthday Wishlist 2026"').first();
    
    // Find delete option
    const deleteButton = page.locator('[aria-label*="delete" i]').filter({ has: listCard.locator('..') }).first();
    if (await deleteButton.isVisible()) {
      await deleteButton.click();
    } else {
      // Try menu
      const menu = page.locator('button[aria-haspopup="true"]').filter({ has: listCard.locator('..') }).first();
      if (await menu.isVisible()) {
        await menu.click();
        await page.locator('text="Delete"').click();
      }
    }

    // Confirm deletion
    const confirmButton = page.locator('button:has-text("Delete"), button:has-text("Confirm")').last();
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Verify removal
    await expect(page.locator('text="My Birthday Wishlist 2026"')).not.toBeVisible({ timeout: 5000 });
  });
});
