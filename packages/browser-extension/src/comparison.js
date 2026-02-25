// WishKeeper Extension - Comparison Shopping Module
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
      const baseUrl = await this.resolveBaseUrl();
      const response = await fetch(`${baseUrl}/api/extension/price-comparisons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          title: this.productInfo.title,
          store: this.productInfo.store,
          price: this.productInfo.price,
          productUrl: this.productInfo.productUrl
        })
      });

      if (response.ok) {
        const results = await response.json();
        this.comparisonResults = Array.isArray(results) ? results : [];
      } else {
        this.comparisonResults = [];
      }
      
      return this.comparisonResults;
    } catch (error) {
      console.error('PriceComparison: Error finding comparison results', error);
      return [];
    } finally {
      this.isSearching = false;
    }
  }

  async resolveBaseUrl() {
    // Using dev environment to match Firebase config (wishlist-wizard-dev)
    // For localhost development, change to: 'http://localhost:3001'
    // For production, change to: 'https://wishlist-wizard.web.app'
    return 'https://wishlist-wizard-dev.web.app';
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