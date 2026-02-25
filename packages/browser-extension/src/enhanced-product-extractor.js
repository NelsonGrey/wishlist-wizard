// Enhanced Product Extraction Service for Browser Extension
// Supports major e-commerce platforms with robust extraction methods

// Extractor load marker (non-fatal)
if (window.EnhancedProductExtractor) {
  console.log('🎯 WISHLIST WIZARD: enhanced-product-extractor.js loaded again');
} else {
  console.log('🎯 WISHLIST WIZARD: enhanced-product-extractor.js is LOADING');
}

// Import the adapter registry
import { adapterRegistry } from './lib/adapters/index.js';

class EnhancedProductExtractor {
  constructor() {
    // Remove the old Map-based extractor system - now using adapter registry
    this.extractors = null; // No longer needed

    // Retry configuration for robust extraction
    this.retryConfig = {
      maxRetries: 3,
      retryDelay: 1000, // 1 second
      backoffMultiplier: 2
    };
  }

  /**
   * Extract product information from the current page
   */
  extract() {
    return this.extractWithRetry();
  }

  /**
   * Extract product information with retry logic
   */
  async extractWithRetry(attempt = 1) {
    try {
      const hostname = window.location.hostname.toLowerCase();

      // Try site-specific adapter first
      const adapter = adapterRegistry.findAdapterForUrl(window.location.href);
      if (adapter && adapter.canHandle()) {
        try {
          const result = await this.executeExtractorSafely(() => adapter.extract(), adapter.domain);

          if (result && result.title && result.title.trim()) {
            return {
              success: true,
              productInfo: this.normalizeProductInfo(result, adapter.domain),
              extractionMethod: adapter.domain,
              attempts: attempt
            };
          }
        } catch (extractorError) {
          console.warn(`Adapter failed for ${adapter.domain}:`, extractorError);
        }
      }
      
      // Fall back to generic extraction
      try {
        const genericResult = await this.executeExtractorSafely(
          () => this.extractGenericProduct(), 
          'generic'
        );
        
        if (genericResult && genericResult.title && genericResult.title.trim()) {
          return {
            success: true,
            productInfo: this.normalizeProductInfo(genericResult, 'generic'),
            extractionMethod: 'generic',
            attempts: attempt
          };
        }
      } catch (genericError) {
        console.warn('Generic extractor failed:', genericError);
      }
      
      // If all extraction methods failed and we haven't exceeded max retries, try again
      if (attempt < this.retryConfig.maxRetries) {
        console.log(`Extraction attempt ${attempt} failed, retrying in ${this.retryConfig.retryDelay * attempt}ms...`);
        
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(this.extractWithRetry(attempt + 1));
          }, this.retryConfig.retryDelay * Math.pow(this.retryConfig.backoffMultiplier, attempt - 1));
        });
      }
      
      return {
        success: false,
        error: 'Could not extract product information after multiple attempts',
        attempts: attempt
      };
      
    } catch (error) {
      console.error('Product extraction error:', error);
      return {
        success: false,
        error: error.message,
        attempts: attempt
      };
    }
  }

  /**
   * Execute extractor function with safety wrapper
   */
  async executeExtractorSafely(extractorFunction, extractorName) {
    try {
      // Add timeout to prevent hanging
      return await Promise.race([
        Promise.resolve(extractorFunction()),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Extraction timeout')), 10000)
        )
      ]);
    } catch (error) {
      console.error(`Extractor ${extractorName} failed:`, error);
      throw error;
    }
  }

  /**
   * Get normalized site name from hostname
   */
  getSiteName(hostname) {
    // Remove www. and get the main domain name
    const parts = hostname.replace('www.', '').split('.');
    return parts.length >= 2 ? `${parts[parts.length - 2]}.${parts[parts.length - 1]}` : hostname;
  }

  /**
   * Generic product extraction using common patterns with multiple fallback strategies
   */
  extractGenericProduct() {
    // First attempt with comprehensive selectors
    const primarySelectors = {
      title: [
        // Structured data first (most reliable)
        '[itemprop="name"]',
        // Common product title patterns
        'h1.product-title', 'h1.product-name', '.product-title', '.product-name',
        'h1[data-testid*="title"]', 'h1[data-test*="title"]',
        'h1[data-automation*="title"]', 'h1[id*="title"]',
        '.pdp-title', '.product-detail-title', '.item-title',
        '.product-info h1', '.product-details h1',
        // Generic headings (last resort)
        'h1', 'h2.product-name'
      ],
      price: [
        // Structured data first
        '[itemprop="price"]', '[itemprop="offers"] [itemprop="price"]',
        // Common price patterns
        '.price', '.product-price', '.current-price', '.sale-price',
        '[data-testid*="price"]', '[data-test*="price"]',
        '[data-automation*="price"]', '[class*="price"]',
        '.price-current', '.price-now', '.offer-price', '.final-price',
        '.your-price', '.selling-price', '.list-price'
      ],
      image: [
        // Structured data first
        '[itemprop="image"]',
        // Common image patterns
        '.product-image img', '.hero-image img', '.main-image img',
        '.product-photo img', '.item-image img', '.primary-image img',
        '.gallery-image img', '.product-gallery img:first-child',
        // Media containers
        '.media img:first-child', '.carousel img:first-child'
      ]
    };

    let result = this.extractWithSelectors(primarySelectors, 'Generic');

    // If primary extraction didn't get good results, try secondary strategies
    if (!result || !result.title || result.title.trim().length < 3) {
      result = this.extractWithFallbackStrategies();
    }

    // If still no good results, try extracting from meta tags
    if (!result || !result.title || result.title.trim().length < 3) {
      result = this.extractFromMetaTags();
    }

    return result;
  }

  /**
   * Fallback extraction strategies for difficult pages
   */
  extractWithFallbackStrategies() {
    const result = {
      title: '',
      price: '',
      imageUrl: '',
      productUrl: window.location.href,
      store: 'Generic'
    };

    // Strategy 1: Look for any heading near price or add-to-cart buttons
    const priceElements = document.querySelectorAll('[class*="price"], [data-testid*="price"], [id*="price"]');
    const cartButtons = document.querySelectorAll('[class*="cart"], [data-testid*="cart"], button[name*="cart"]');
    
    const contextElements = [...priceElements, ...cartButtons];
    
    for (const element of contextElements) {
      // Look for headings near these elements
      const headings = this.findNearbyHeadings(element, 200); // Within 200px
      if (headings.length > 0) {
        const title = headings[0].textContent.trim();
        if (title && title.length > 3) {
          result.title = title;
          break;
        }
      }
    }

    // Strategy 2: Use largest text element on the page
    if (!result.title) {
      result.title = this.findLargestTextElement();
    }

    // Strategy 3: Extract price from any element with currency symbols
    result.price = this.findPriceWithCurrency();

    // Strategy 4: Get the largest image on the page
    result.imageUrl = this.findLargestImage();

    return result;
  }

  /**
   * Extract product info from meta tags
   */
  extractFromMetaTags() {
    const result = {
      title: '',
      price: '',
      imageUrl: '',
      productUrl: window.location.href,
      store: 'Generic'
    };

    // Extract from Open Graph tags
    const ogTitle = document.querySelector('meta[property="og:title"]');
    const ogImage = document.querySelector('meta[property="og:image"]');
    const ogPrice = document.querySelector('meta[property="og:price:amount"]');

    if (ogTitle) {
      result.title = ogTitle.getAttribute('content') || '';
    }

    if (ogImage) {
      result.imageUrl = ogImage.getAttribute('content') || '';
    }

    if (ogPrice) {
      result.price = ogPrice.getAttribute('content') || '';
    }

    // Try Twitter Card meta tags if OG tags not available
    if (!result.title) {
      const twitterTitle = document.querySelector('meta[name="twitter:title"]');
      if (twitterTitle) {
        result.title = twitterTitle.getAttribute('content') || '';
      }
    }

    if (!result.imageUrl) {
      const twitterImage = document.querySelector('meta[name="twitter:image"]');
      if (twitterImage) {
        result.imageUrl = twitterImage.getAttribute('content') || '';
      }
    }

    // Use document title as last resort
    if (!result.title && document.title) {
      let title = document.title;
      
      // Remove common site separators
      const separators = [' | ', ' - ', ' – ', ' — ', ' :: ', ' // ', ' > '];
      for (const separator of separators) {
        if (title.includes(separator)) {
          title = title.split(separator)[0].trim();
          break;
        }
      }
      
      result.title = title;
    }

    return result;
  }

  /**
   * Find headings near a given element
   */
  findNearbyHeadings(element, maxDistance) {
    const headings = [];
    const elementRect = element.getBoundingClientRect();
    
    document.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
      const headingRect = heading.getBoundingClientRect();
      const distance = Math.sqrt(
        Math.pow(elementRect.x - headingRect.x, 2) + 
        Math.pow(elementRect.y - headingRect.y, 2)
      );
      
      if (distance <= maxDistance && heading.textContent.trim()) {
        headings.push(heading);
      }
    });
    
    // Sort by proximity
    headings.sort((a, b) => {
      const aRect = a.getBoundingClientRect();
      const bRect = b.getBoundingClientRect();
      const aDist = Math.sqrt(Math.pow(elementRect.x - aRect.x, 2) + Math.pow(elementRect.y - aRect.y, 2));
      const bDist = Math.sqrt(Math.pow(elementRect.x - bRect.x, 2) + Math.pow(elementRect.y - bRect.y, 2));
      return aDist - bDist;
    });
    
    return headings;
  }

  /**
   * Find the largest text element on the page
   */
  findLargestTextElement() {
    let largestElement = null;
    let largestSize = 0;
    
    document.querySelectorAll('h1, h2, h3, h4, h5, h6, .title, .heading').forEach(element => {
      const text = element.textContent.trim();
      if (text && text.length > 5) {
        const computedStyle = window.getComputedStyle(element);
        const fontSize = parseFloat(computedStyle.fontSize);
        const weight = computedStyle.fontWeight === 'bold' || parseInt(computedStyle.fontWeight) > 400 ? 1.5 : 1;
        const size = fontSize * weight * text.length;
        
        if (size > largestSize) {
          largestSize = size;
          largestElement = element;
        }
      }
    });
    
    return largestElement ? largestElement.textContent.trim() : '';
  }

  /**
   * Find price with currency symbols
   */
  findPriceWithCurrency() {
    const currencyRegex = /[$€£¥₹₽¢][\d,.]+(\.?\d{2})?|\d+[,.]?\d*\s*[$€£¥₹₽¢]/;
    
    // Look through all text content for currency patterns
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      null,
      false
    );
    
    let node;
    while (node = walker.nextNode()) {
      const text = node.textContent.trim();
      const match = text.match(currencyRegex);
      if (match) {
        return match[0];
      }
    }
    
    return '';
  }

  /**
   * Find the largest image on the page
   */
  findLargestImage() {
    let largestImage = null;
    let largestArea = 0;
    
    document.querySelectorAll('img').forEach(img => {
      // Skip small images (likely icons/logos)
      if (img.clientWidth < 50 || img.clientHeight < 50) return;
      
      const area = img.clientWidth * img.clientHeight;
      if (area > largestArea) {
        largestArea = area;
        largestImage = img;
      }
    });
    
    return largestImage ? largestImage.src : '';
  }

  /**
   * Extract product info using provided selectors
   */
  extractWithSelectors(selectors, storeName) {
    const result = {
      title: '',
      price: '',
      imageUrl: '',
      productUrl: window.location.href,
      store: storeName,
      availability: 'In Stock' // Default assumption
    };

    // Extract title
    result.title = this.extractText(selectors.title);

    // Extract price
    result.price = this.extractPrice(selectors.price);

    // Extract image
    result.imageUrl = this.extractImage(selectors.image);

    // Extract availability if selectors provided
    if (selectors.availability) {
      const availability = this.extractText(selectors.availability);
      if (availability) {
        result.availability = availability;
      }
    }

    return result;
  }

  /**
   * Extract text using selector array with enhanced validation
   */
  extractText(selectors) {
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        
        for (const element of elements) {
          if (!element) continue;
          
          // Handle meta tags
          if (element.tagName.toLowerCase() === 'meta') {
            const content = element.getAttribute('content');
            if (content && content.trim()) {
              return content.trim();
            }
            continue;
          }
          
          // Get text content and clean it up
          const text = element.textContent || element.innerText || '';
          const cleanText = text.trim().replace(/\s+/g, ' ');
          
          // Validate text quality
          if (this.isValidText(cleanText)) {
            return cleanText;
          }
        }
      } catch (error) {
        console.warn(`Error with selector ${selector}:`, error);
      }
    }
    return '';
  }

  /**
   * Validate if extracted text is likely to be a product title
   */
  isValidText(text) {
    if (!text || text.length < 3) return false;
    
    // Check for spam patterns
    const spamPatterns = [
      /^[\d\s]+$/, // Only numbers and spaces
      /^[^a-zA-Z]*$/, // No letters at all
      /javascript:/i, // Script content
      /function\s*\(/, // Function definitions
      /^\s*$/, // Only whitespace
      /^(null|undefined|NaN)$/i, // Programming literals
      /^[\W_]+$/ // Only special characters and underscores
    ];
    
    return !spamPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Extract price using selector array with enhanced validation
   */
  extractPrice(selectors) {
    const pricePattern = /(?:[$€£¥₹₽¢][\d,.]+(\.?\d{2})?|\d+[,.]?\d*\s*[$€£¥₹₽¢]|[\d,]+\.?\d{0,2})/;
    
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        
        for (const element of elements) {
          if (!element) continue;
          
          // Handle meta tags
          if (element.tagName.toLowerCase() === 'meta') {
            const content = element.getAttribute('content');
            if (content && this.isValidPrice(content)) {
              return content.trim();
            }
            continue;
          }
          
          // Get text content
          const text = element.textContent || element.innerText || '';
          const cleanText = text.trim();
          
          // Check if this looks like a price and validate it
          if (cleanText && pricePattern.test(cleanText) && this.isValidPrice(cleanText)) {
            return cleanText;
          }
        }
      } catch (error) {
        console.warn(`Error with price selector ${selector}:`, error);
      }
    }
    return '';
  }

  /**
   * Validate if extracted text is likely to be a price
   */
  isValidPrice(price) {
    if (!price || typeof price !== 'string') return false;
    
    const priceStr = price.trim();
    
    // Must contain at least one digit
    if (!/\d/.test(priceStr)) return false;
    
    // Exclude obvious non-prices
    const excludePatterns = [
      /^\d+$/, // Just a number without currency context
      /^\d{4,}$/, // Very long numbers (likely IDs)
      /\d{1,2}\/\d{1,2}\/\d{2,4}/, // Dates
      /\d{1,2}:\d{2}/, // Times
      /^\d+\s+(items?|products?|results?)/i, // Item counts
      /review/i, // Review-related numbers
      /rating/i, // Rating numbers
      /stars?/i, // Star ratings
      /^\d+\s*%/, // Percentages
      /^\d+\s*(lbs?|kg|oz|g|ml|l)\b/i // Weights/volumes
    ];
    
    if (excludePatterns.some(pattern => pattern.test(priceStr))) {
      return false;
    }
    
    // Must be reasonable price range (between $0.01 and $99,999.99)
    const numericValue = this.extractNumericPrice(priceStr);
    if (numericValue !== null) {
      return numericValue >= 0.01 && numericValue <= 99999.99;
    }
    
    return true;
  }

  /**
   * Extract numeric value from price string
   */
  extractNumericPrice(priceStr) {
    try {
      // Remove currency symbols and clean up
      let cleanPrice = priceStr.replace(/[^\d.,]/g, '');
      
      // Handle different decimal separators
      if (cleanPrice.includes(',') && !cleanPrice.includes('.')) {
        // European format (1,50)
        cleanPrice = cleanPrice.replace(',', '.');
      } else if (cleanPrice.includes(',') && cleanPrice.includes('.')) {
        // Thousand separators (1,234.56)
        cleanPrice = cleanPrice.replace(/,/g, '');
      }
      
      const numValue = parseFloat(cleanPrice);
      return isNaN(numValue) ? null : numValue;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extract image using selector array
   */
  extractImage(selectors) {
    const foundImages = [];
    
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        
        for (const element of elements) {
          if (!element) continue;
          
          let imageUrl = '';
          
          // Handle meta tags
          if (element.tagName.toLowerCase() === 'meta') {
            imageUrl = element.getAttribute('content') || '';
          }
          // Handle img tags
          else if (element.tagName.toLowerCase() === 'img') {
            imageUrl = this.getBestImageSrc(element);
          }
          // Handle other elements that might contain images
          else {
            const imgs = element.querySelectorAll('img');
            for (const img of imgs) {
              const imgSrc = this.getBestImageSrc(img);
              if (imgSrc && this.isValidImageUrl(imgSrc)) {
                foundImages.push({ src: imgSrc, element: img });
              }
            }
          }
          
          // Validate and add to candidates
          if (imageUrl && this.isValidImageUrl(imageUrl)) {
            foundImages.push({ src: imageUrl, element });
          }
        }
      } catch (error) {
        console.warn(`Error with image selector ${selector}:`, error);
      }
    }
    
    // Return the best image found
    if (foundImages.length > 0) {
      return this.selectBestImage(foundImages);
    }
    
    return '';
  }

  /**
   * Get the best image source from an img element
   */
  getBestImageSrc(imgElement) {
    const sources = [
      imgElement.src,
      imgElement.getAttribute('data-src'),
      imgElement.getAttribute('data-lazy-src'),
      imgElement.getAttribute('data-original'),
      imgElement.getAttribute('data-zoom-image'),
      imgElement.getAttribute('data-large-image'),
      imgElement.getAttribute('srcset')?.split(',')[0]?.split(' ')[0]
    ].filter(Boolean);
    
    // Prefer higher resolution images
    for (const src of sources) {
      if (src && (src.includes('large') || src.includes('zoom') || src.includes('high'))) {
        return src;
      }
    }
    
    return sources[0] || '';
  }

  /**
   * Validate if URL is a valid product image
   */
  isValidImageUrl(url) {
    if (!url || typeof url !== 'string') return false;
    
    // Must be a valid HTTP/HTTPS URL or protocol-relative
    if (!(url.startsWith('http') || url.startsWith('//'))) return false;
    
    // Exclude obvious non-product images
    const excludePatterns = [
      /logo/i,
      /banner/i,
      /advertisement/i,
      /sprite/i,
      /icon(?!.*product)/i, // Allow "product-icon" but not "icon"
      /button/i,
      /arrow/i,
      /star/i,
      /rating/i,
      /1x1/,
      /pixel/i,
      /tracking/i,
      /analytics/i,
      /via\.placeholder\.com/i,
      /placehold\.it/i,
      /placehold\.co/i,
      /dummyimage\.com/i,
      /placeholder[-_]/i,
      /loading/i
    ];
    
    if (excludePatterns.some(pattern => pattern.test(url))) {
      return false;
    }
    
    return true;
  }

  /**
   * Select the best image from found candidates
   */
  selectBestImage(images) {
    if (images.length === 1) {
      return images[0].src;
    }
    
    // Score images based on various factors
    const scoredImages = images.map(({ src, element }) => {
      let score = 0;
      
      // Prefer larger images (based on URL hints)
      if (src.includes('large') || src.includes('zoom') || src.includes('main')) score += 10;
      if (src.includes('medium')) score += 5;
      if (src.includes('small') || src.includes('thumb')) score -= 5;
      
      // Check image dimensions if available
      if (element && element.naturalWidth && element.naturalHeight) {
        const area = element.naturalWidth * element.naturalHeight;
        if (area > 100000) score += 8; // Large images
        else if (area > 40000) score += 5; // Medium images
        else if (area < 10000) score -= 3; // Small images
      }
      
      // Prefer images with product-related names
      if (src.includes('product') || src.includes('item')) score += 3;
      
      return { src, score };
    });
    
    // Return the highest scoring image
    scoredImages.sort((a, b) => b.score - a.score);
    return scoredImages[0].src;
  }

  /**
   * Normalize and validate product information
   */
  normalizeProductInfo(productInfo, siteName) {
    const normalized = { ...productInfo };

    // Ensure we have a title
    if (!normalized.title && document.title) {
      normalized.title = document.title.split('|')[0].split('-')[0].trim();
    }

    // Clean up price
    if (normalized.price) {
      normalized.price = this.sanitizePrice(normalized.price);
    }

    // Ensure absolute image URL
    if (normalized.imageUrl && !normalized.imageUrl.startsWith('http')) {
      try {
        const baseUrl = window.location.origin;
        if (normalized.imageUrl.startsWith('//')) {
          normalized.imageUrl = 'https:' + normalized.imageUrl;
        } else if (normalized.imageUrl.startsWith('/')) {
          normalized.imageUrl = baseUrl + normalized.imageUrl;
        }
      } catch (error) {
        console.warn('Error normalizing image URL:', error);
      }
    }

    // Set store name if not already set
    if (!normalized.store) {
      normalized.store = siteName || 'Online Store';
    }

    return normalized;
  }

  /**
   * Sanitize price string to consistent format
   */
  sanitizePrice(price) {
    if (!price) return '';
    
    // Convert to string and remove extra whitespace
    const priceStr = String(price).trim();
    
    // Remove non-price characters but keep numbers, decimals, and commas
    let sanitized = priceStr.replace(/[^\d.,]/g, '');
    
    // Handle different decimal separators
    if (sanitized.includes(',') && !sanitized.includes('.')) {
      // European format (1,50)
      sanitized = sanitized.replace(',', '.');
    } else if (sanitized.includes(',') && sanitized.includes('.')) {
      // Thousand separators (1,234.56)
      sanitized = sanitized.replace(/,/g, '');
    }
    
    // Validate we have a number
    const numValue = parseFloat(sanitized);
    if (isNaN(numValue)) {
      return priceStr; // Return original if we can't parse
    }
    
    return `$${numValue.toFixed(2)}`;
  }

  /**
   * Check if current page appears to be a product page
   */
  isProductPage() {
    let score = 0;
    
    try {
      // Check URL patterns with more comprehensive list
      const url = window.location.href.toLowerCase();
      const productUrlPatterns = [
        '/product/', '/p/', '/dp/', '/item/', '/pd/', '/ip/', '/sku/',
        '/shop/', '/buy/', '/detail/', '/goods/', '/catalog/', '/listing/',
        '/prod/', '/offer/', '/deals/', '/sale/', '/purchase/', '/order/',
        '-p-', '_p_', '/products/', '/items/', '/merchandise/'
      ];
      
      if (productUrlPatterns.some(pattern => url.includes(pattern))) {
        score += 3;
      }
      
      // Check for product ID patterns in URL
      const productIdPatterns = [
        /\/[A-Z0-9]{10,}(?:\/|$|\?)/i,  // ASIN-like IDs
        /prod[0-9]{5,}/i,               // product ID patterns
        /sku[-_][0-9]{5,}/i,            // SKU patterns
        /item[0-9]{5,}/i,               // item number patterns
        /pid[0-9]{5,}/i,                // product ID patterns
        /\/[0-9]{8,}(?:\/|$|\?)/        // numeric product IDs
      ];
      
      if (productIdPatterns.some(pattern => pattern.test(url))) {
        score += 2;
      }
      
      // Check for product-specific elements with weighted scoring
      const highValueIndicators = [
        'add to cart', 'add to basket', 'add to bag', 'buy now', 'purchase now',
        'checkout', 'shop now', 'order now'
      ];
      
      const mediumValueIndicators = [
        'product details', 'product description', 'specifications', 'features',
        'reviews', 'ratings', 'customer reviews', 'price match'
      ];
      
      const lowValueIndicators = [
        'in stock', 'out of stock', 'availability', 'shipping', 'delivery',
        'size guide', 'color options', 'quantity', 'add to wishlist',
        'save for later', 'compare', 'share'
      ];
      
      const pageText = document.body.textContent.toLowerCase();
      
      // High value indicators worth more points
      const highMatches = highValueIndicators.filter(indicator => pageText.includes(indicator)).length;
      score += Math.min(highMatches * 2, 8); // Cap at 8 points
      
      // Medium value indicators
      const mediumMatches = mediumValueIndicators.filter(indicator => pageText.includes(indicator)).length;
      score += Math.min(mediumMatches * 1, 5); // Cap at 5 points
      
      // Low value indicators
      const lowMatches = lowValueIndicators.filter(indicator => pageText.includes(indicator)).length;
      score += Math.min(lowMatches * 0.5, 3); // Cap at 3 points
      
      // Check for product form elements (high confidence)
      const productFormSelectors = [
        'form[action*="cart"]', 'form[action*="basket"]', 'form[action*="checkout"]',
        'button[name*="add-to-cart"]', 'input[name*="add-to-cart"]',
        'button[data-testid*="add-to-cart"]', 'button[data-test*="add-to-cart"]'
      ];
      
      if (productFormSelectors.some(selector => document.querySelector(selector))) {
        score += 4;
      }
      
      // Check for product variation selectors
      const variationSelectors = [
        'select[name*="variation"]', 'select[name*="variant"]', 'select[name*="option"]',
        '.product-options', '.product-variants', '.size-selector', '.color-selector'
      ];
      
      if (variationSelectors.some(selector => document.querySelector(selector))) {
        score += 2;
      }
      
      // Check for structured data (JSON-LD)
      const jsonLdElements = document.querySelectorAll('script[type="application/ld+json"]');
      for (const element of jsonLdElements) {
        try {
          const data = JSON.parse(element.textContent);
          if (this.isProductSchema(data)) {
            score += 5;
            break;
          }
        } catch (e) {
          // Ignore JSON parsing errors
        }
      }
      
      // Check for product meta tags (high confidence)
      const productMetaTags = [
        'meta[property="og:type"][content="product"]',
        'meta[name="twitter:card"][content="product"]',
        'meta[property="product:price:amount"]',
        'meta[property="og:price:amount"]'
      ];
      
      if (productMetaTags.some(selector => document.querySelector(selector))) {
        score += 4;
      }
      
      // Check for price-related elements
      const priceSelectors = [
        '.price', '.product-price', '.current-price', '.sale-price',
        '[itemprop="price"]', '[data-testid*="price"]'
      ];
      
      if (priceSelectors.some(selector => document.querySelector(selector))) {
        score += 2;
      }
      
      // Check for product images
      const productImageSelectors = [
        '.product-image', '.hero-image', '.main-image', '.primary-image',
        '[itemprop="image"]', 'meta[property="og:image"]'
      ];
      
      if (productImageSelectors.some(selector => document.querySelector(selector))) {
        score += 1;
      }
      
      // Bonus for known e-commerce platforms
      const ecommercePlatforms = [
        'shopify', 'woocommerce', 'magento', 'bigcommerce', 'prestashop'
      ];
      
      const htmlContent = document.documentElement.outerHTML.toLowerCase();
      if (ecommercePlatforms.some(platform => htmlContent.includes(platform))) {
        score += 1;
      }
      
    } catch (error) {
      console.warn('Error in product page detection:', error);
      // Return false on error to be safe
      return false;
    }
    
    // More generous threshold for better detection
    return score >= 4;
  }

  /**
   * Check if structured data contains product schema
   */
  isProductSchema(data) {
    if (!data) return false;
    
    // Direct product type
    if (data['@type'] === 'Product') {
      return true;
    }
    
    // Array of items
    if (Array.isArray(data)) {
      return data.some(item => item['@type'] === 'Product');
    }
    
    // Graph format
    if (data['@graph'] && Array.isArray(data['@graph'])) {
      return data['@graph'].some(item => item['@type'] === 'Product');
    }
    
    return false;
  }
}

// Make the extractor available globally
window.EnhancedProductExtractor = EnhancedProductExtractor;