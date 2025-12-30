import { adapterRegistry } from './adapter-registry.js';

/**
 * Simple test to validate adapter functionality
 */
export function testAdapters(): void {
  console.log('Testing adapter registry...');

  // Test finding adapters for URLs
  const testUrls = [
    'https://www.amazon.com/product/dp/B0123456789',
    'https://amazon.ca/product/dp/B0123456789',
    'https://www.target.com/p/product-name',
    'https://walmart.com/ip/product-name',
    'https://unsupported-site.com/product'
  ];

  testUrls.forEach(url => {
    const adapter = adapterRegistry.findAdapterForUrl(url);
    if (adapter) {
      console.log(`✓ Found adapter for ${url}: ${adapter.domain}`);
    } else {
      console.log(`✗ No adapter found for ${url}`);
    }
  });

  // Test getting all adapters
  const allAdapters = adapterRegistry.getAllAdapters();
  console.log(`\nRegistered adapters (${allAdapters.length}):`);
  allAdapters.forEach(adapter => {
    console.log(`- ${adapter.domain} - Priority: ${adapter.getPriority()}`);
  });
}

// Run test if this file is executed directly
if (typeof window === 'undefined') {
  // Node.js environment
  testAdapters();
}