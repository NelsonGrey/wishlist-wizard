// WishKeeper Extension - Coupon Finder Module
// This script handles finding and applying coupons for the current product

// List of popular coupon websites and their APIs
const COUPON_SOURCES = [
  {
    name: 'RetailMeNot',
    baseUrl: 'https://www.retailmenot.com/view/',
    searchPattern: (store) => `${store.toLowerCase().replace(/\s+/g, '')}`
  },
  {
    name: 'CouponFollow',
    baseUrl: 'https://couponfollow.com/site/',
    searchPattern: (store) => `${store.toLowerCase().replace(/\s+/g, '-')}`
  },
  {
    name: 'Honey',
    baseUrl: 'https://www.joinhoney.com/shop/',
    searchPattern: (store) => `${store.toLowerCase().replace(/\s+/g, '-')}`
  },
  {
    name: 'Slickdeals',
    baseUrl: 'https://slickdeals.net/coupons/',
    searchPattern: (store) => `${store.toLowerCase().replace(/\s+/g, '-')}`
  }
];

// Class for coupon finder functionality
class CouponFinder {
  constructor() {
    this.coupons = [];
    this.store = '';
    this.productTitle = '';
    this.isSearching = false;
  }

  /**
   * Initialize the coupon finder with product information
   * @param {Object} productInfo - Product information
   */
  init(productInfo) {
    if (!productInfo || !productInfo.store) {
      console.warn('CouponFinder: Missing product information');
      return false;
    }

    this.store = productInfo.store;
    this.productTitle = productInfo.title || '';
    return true;
  }

  /**
   * Get coupons for the current store
   * @returns {Promise<Array>} - Array of coupon objects
   */
  async findCoupons() {
    if (!this.store) {
      console.warn('CouponFinder: No store specified');
      return [];
    }

    if (this.isSearching) {
      console.warn('CouponFinder: Search already in progress');
      return [];
    }

    this.isSearching = true;
    this.coupons = [];

    try {
      // Get mock coupons for demonstration
      // In a real implementation, this would make API calls to coupon services
      this.coupons = this.getMockCoupons();
      
      return this.coupons;
    } catch (error) {
      console.error('CouponFinder: Error finding coupons', error);
      return [];
    } finally {
      this.isSearching = false;
    }
  }

  /**
   * Generate mock coupons for demonstration
   * @returns {Array} - Array of mock coupon objects
   */
  getMockCoupons() {
    // Create realistic mock coupons based on the store
    const storeName = this.store.toLowerCase();
    const currentDate = new Date();
    const expDate = new Date();
    expDate.setDate(currentDate.getDate() + 14); // 2 weeks from now
    
    const mockCoupons = [];
    
    // Some common coupon types
    const couponTypes = [
      { code: `${storeName.substring(0, 4).toUpperCase()}10OFF`, discount: "10% off", description: "10% off your purchase" },
      { code: `${storeName.substring(0, 3).toUpperCase()}FREESHIP`, discount: "Free Shipping", description: "Free shipping on orders over $50" },
      { code: `NEW${storeName.substring(0, 4).toUpperCase()}15`, discount: "15% off", description: "15% off for new customers" },
      { code: `SAVE${Math.floor(Math.random() * 30) + 10}`, discount: "$20 off", description: "$20 off orders over $100" },
      { code: `EXTRA${Math.floor(Math.random() * 15) + 5}`, discount: "Extra 10%", description: "Extra 10% off sale items" }
    ];
    
    // Select 2-4 random coupons
    const numCoupons = Math.floor(Math.random() * 3) + 2;
    
    for (let i = 0; i < numCoupons; i++) {
      const couponTemplate = couponTypes[Math.floor(Math.random() * couponTypes.length)];
      
      mockCoupons.push({
        code: couponTemplate.code,
        discount: couponTemplate.discount,
        description: couponTemplate.description,
        expiryDate: expDate.toLocaleDateString(),
        source: COUPON_SOURCES[Math.floor(Math.random() * COUPON_SOURCES.length)].name,
        verified: Math.random() > 0.3 // 70% of coupons are "verified"
      });
    }
    
    return mockCoupons;
  }

  /**
   * Get links to coupon websites for the current store
   * @returns {Array} - Array of link objects with name and url
   */
  getCouponLinks() {
    if (!this.store) {
      return [];
    }

    return COUPON_SOURCES.map(source => {
      return {
        name: source.name,
        url: source.baseUrl + source.searchPattern(this.store)
      };
    });
  }

  /**
   * Apply a coupon code to the current page
   * @param {string} code - Coupon code to apply
   */
  async applyCoupon(code) {
    if (!code) {
      return { success: false, message: 'No coupon code provided' };
    }

    try {
      // Get current tab
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentTab = tabs[0];
      
      if (!currentTab || !currentTab.id) {
        return { success: false, message: 'No active tab found' };
      }
      
      // Send message to content script to apply the coupon
      const result = await chrome.tabs.sendMessage(currentTab.id, { 
        action: 'applyCoupon', 
        code: code 
      });
      
      if (result && result.success) {
        return { success: true, message: 'Coupon applied successfully' };
      } else {
        return { 
          success: false, 
          message: result?.message || 'Failed to apply coupon. Try copying the code instead.' 
        };
      }
    } catch (error) {
      console.error('CouponFinder: Error applying coupon', error);
      return { 
        success: false, 
        message: 'Could not apply coupon automatically. Try copying the code instead.'
      };
    }
  }
}

// Export the coupon finder
window.couponFinder = new CouponFinder();