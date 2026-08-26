// Wishlist Wizard Extension - Comparison Shopping Module
// This script handles comparing prices across different retailers

// Major shopping sites to compare prices
const COMPARISON_SITES = [
  {
    name: 'Amazon',
    searchUrl: 'https://www.amazon.com/s?k=',
    searchFunction: (title) => title.replace(/\s+/g, '+')
  },
  {
    name: 'Walmart',
    searchUrl: 'https://www.walmart.com/search/?query=',
    searchFunction: (title) => title.replace(/\s+/g, '+')
  },
  {
    name: 'Target',
    searchUrl: 'https://www.target.com/s?searchTerm=',
    searchFunction: (title) => title.replace(/\s+/g, '+')
  },
  {
    name: 'Best Buy',
    searchUrl: 'https://www.bestbuy.com/site/searchpage.jsp?st=',
    searchFunction: (title) => title.replace(/\s+/g, '+')
  },
  {
    name: 'eBay',
    searchUrl: 'https://www.ebay.com/sch/i.html?_nkw=',
    searchFunction: (title) => title.replace(/\s+/g, '+')
  }
];

// Price comparison engine
class PriceComparison {
  constructor() {
    this.productInfo = null;
    this.comparisonResults = [];
    this.isSearching = false;
  }

  /**
   * Initialize the price comparison with product information
   * @param {Object} productInfo - Product information
   */
  init(productInfo) {
    if (!productInfo || !productInfo.title) {
      console.warn('PriceComparison: Missing product information');
      return false;
    }

    this.productInfo = productInfo;
    return true;
  }

  /**
   * Generate search URLs for comparison shopping
   * @returns {Array} - Array of site objects with name and search URL
   */
  getComparisonLinks() {
    if (!this.productInfo || !this.productInfo.title) {
      return [];
    }

    // Generate search URLs for each comparison site
    const searchLinks = COMPARISON_SITES.map(site => {
      const searchTerm = site.searchFunction(this.productInfo.title);
      return {
        name: site.name,
        url: site.searchUrl + searchTerm
      };
    });

    return searchLinks;
  }

  /**
   * Find price comparisons for the current product
   * @returns {Promise<Array>} - Array of comparison results
   */
  async findPriceComparisons() {
    if (!this.productInfo || !this.productInfo.title) {
      console.warn('PriceComparison: No product specified');
      return [];
    }

    if (this.isSearching) {
      console.warn('PriceComparison: Search already in progress');
      return [];
    }

    this.isSearching = true;
    this.comparisonResults = [];

    try {
      // Popup context has no access to the stored auth token, so this
      // routes through background.js (same pattern as adding an item to a
      // wishlist) rather than fetching directly.
      const response = await new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(
          { action: 'findPriceComparisons', productInfo: this.productInfo },
          (result) => {
            if (chrome.runtime.lastError) {
              reject(new Error(chrome.runtime.lastError.message));
              return;
            }
            if (!result || !result.success) {
              reject(new Error(result?.error || 'Failed to find price comparisons'));
              return;
            }
            resolve(result.results);
          }
        );
      });

      this.comparisonResults = Array.isArray(response) ? response : [];
      return this.comparisonResults;
    } catch (error) {
      console.error('PriceComparison: Error finding comparison results', error);
      return [];
    } finally {
      this.isSearching = false;
    }
  }

  /**
   * Find the best deal from comparison results
   * @returns {Object|null} - The best deal or null if no comparisons available
   */
  findBestDeal() {
    if (!this.comparisonResults || this.comparisonResults.length === 0) {
      return null;
    }

    // Get current store's price as reference
    const currentStore = this.comparisonResults.find(result => result.isCurrent);
    
    if (!currentStore) {
      // If no current store, just return the cheapest
      return this.comparisonResults[0];
    }

    // Find cheaper alternatives with at least 5% savings
    const betterDeals = this.comparisonResults.filter(result => 
      !result.isCurrent && 
      result.price < currentStore.price &&
      ((currentStore.price - result.price) / currentStore.price) >= 0.05 // At least 5% cheaper
    );

    if (betterDeals.length > 0) {
      // Return the cheapest alternative
      return betterDeals[0];
    }

    return null;
  }
}

// Export the price comparison engine
window.priceComparison = new PriceComparison();