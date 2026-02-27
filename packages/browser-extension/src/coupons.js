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
      const baseUrl = await this.resolveBaseUrl();
      const response = await fetch(`${baseUrl}/api/extension/coupons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          store: this.store,
          title: this.productTitle
        })
      });

      if (response.ok) {
        const results = await response.json();
        this.coupons = Array.isArray(results) ? results : [];
      } else {
        this.coupons = [];
      }
      
      return this.coupons;
    } catch (error) {
      console.error('CouponFinder: Error finding coupons', error);
      return [];
    } finally {
      this.isSearching = false;
    }
  }

  async resolveBaseUrl() {
    const envConfig = {
      development: 'https://wishlist-wizard-dev.web.app',
      staging: 'https://wishlist-wizard-staging.web.app',
      production: 'https://wishlist-wizard.web.app',
      local: 'http://localhost:3001'
    };

    const normalize = (value) => {
      const env = String(value || 'development').toLowerCase();
      if (env === 'dev') return 'development';
      if (env === 'stage') return 'staging';
      if (env === 'prod') return 'production';
      if (env === 'localhost') return 'local';
      return Object.prototype.hasOwnProperty.call(envConfig, env) ? env : 'development';
    };

    return new Promise((resolve) => {
      if (!chrome?.storage?.local?.get) {
        resolve(envConfig.development);
        return;
      }

      chrome.storage.local.get(['wwEnvironment', 'wwBaseUrlOverride'], (result) => {
        const env = normalize(result?.wwEnvironment);
        resolve(result?.wwBaseUrlOverride || envConfig[env]);
      });
    });
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