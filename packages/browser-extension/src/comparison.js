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
      // In a real implementation, this would make API calls to price comparison services
      // For this demo, we'll use mock data based on the current product
      this.comparisonResults = this.getMockComparisonResults();
      
      return this.comparisonResults;
    } catch (error) {
      console.error('PriceComparison: Error finding comparison results', error);
      return [];
    } finally {
      this.isSearching = false;
    }
  }

  /**
   * Generate mock comparison results for demonstration
   * @returns {Array} - Array of mock comparison result objects
   */
  getMockComparisonResults() {
    if (!this.productInfo) return [];

    const currentPrice = parseFloat(this.productInfo.price) || 100;
    const currentStore = this.productInfo.store || 'Online Store';
    const results = [];

    // Add current store as reference
    results.push({
      storeName: currentStore,
      price: currentPrice,
      priceFormatted: `$${currentPrice.toFixed(2)}`,
      url: this.productInfo.productUrl || '',
      isCurrent: true,
      inStock: true,
      freeShipping: Math.random() > 0.5
    });

    // Get a subset of comparison sites, excluding the current store
    const availableSites = COMPARISON_SITES.filter(site => 
      site.name.toLowerCase() !== currentStore.toLowerCase()
    );

    // Generate 3-5 comparison results with realistic price variations
    const numComparisons = Math.floor(Math.random() * 3) + 3;
    
    for (let i = 0; i < numComparisons && i < availableSites.length; i++) {
      const site = availableSites[i];
      
      // Generate a realistic price variation (±20%)
      const priceVariation = (Math.random() * 0.4) - 0.2; // -20% to +20%
      const price = currentPrice * (1 + priceVariation);
      
      results.push({
        storeName: site.name,
        price: price,
        priceFormatted: `$${price.toFixed(2)}`,
        url: site.searchUrl + site.searchFunction(this.productInfo.title),
        isCurrent: false,
        inStock: Math.random() > 0.1, // 90% chance of being in stock
        freeShipping: Math.random() > 0.5,
        difference: {
          amount: price - currentPrice,
          percentage: ((price - currentPrice) / currentPrice) * 100
        }
      });
    }

    // Sort results by price (lowest first)
    return results.sort((a, b) => a.price - b.price);
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