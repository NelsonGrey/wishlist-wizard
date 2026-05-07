/**
 * Test fixtures and constants
 */

export const testUser = {
  email: `test-${Date.now()}@wishlist-wizard.test`,
  password: 'Test@Secure123Password',
  displayName: 'Test User',
  profileImage: 'https://via.placeholder.com/150',
};

export const testWishlist = {
  name: 'Test Birthday Wishlist',
  description: 'Items I want for my birthday',
};

export const testItems = [
  {
    name: 'PlayStation 5',
    price: 499.99,
    url: 'https://amazon.com/PlayStation-5-Console/dp/B0BCNKKC91',
  },
  {
    name: 'Apple AirPods Pro',
    price: 249.99,
    url: 'https://amazon.com/Apple-AirPods-Pro/dp/B0B7SNBKQD',
  },
  {
    name: 'Sony WH-1000XM5 Headphones',
    price: 349.99,
    url: 'https://amazon.com/Sony-WH-1000XM5-Wireless-Headphones/dp/B09SYXVZZ1',
  },
];

/**
 * Helper to get test URL based on environment
 */
export function getTestUrl(): string {
  const envUrl = process.env.TEST_URL;
  if (envUrl) return envUrl;

  if (process.env.STAGING === 'true') {
    return 'https://wishlist-wizard-staging.web.app';
  }

  if (process.env.PRODUCTION === 'true') {
    return 'https://wishlist-wizard-prod.web.app';
  }

  // Default to dev
  return 'https://wishlist-wizard-dev.web.app';
}

/**
 * Wait for element with retry
 */
export async function waitForElement(locator: any, timeout = 5000) {
  try {
    await locator.waitFor({ timeout });
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate unique test data
 */
export function generateTestData() {
  const timestamp = Date.now();
  return {
    userId: `test-user-${timestamp}`,
    email: `test-${timestamp}@test.local`,
    wishlistName: `Test List ${timestamp}`,
    itemName: `Test Item ${timestamp}`,
  };
}
