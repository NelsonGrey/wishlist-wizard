/**
 * Base adapter interface for site-specific product extractors
 */
export interface ProductExtractorAdapter {
  /**
   * The domain name this adapter handles (e.g., 'amazon.com')
   */
  readonly domain: string;

  /**
   * Alternative domains this adapter can handle (e.g., ['amazon.ca', 'amazon.co.uk'])
   */
  readonly alternativeDomains?: string[];

  /**
   * Extract product information from the current page
   * @returns Promise resolving to product information or null if extraction fails
   */
  extract(): Promise<ProductInfo | null>;

  /**
   * Check if this adapter can handle the current page
   * @returns true if this adapter should be used for the current page
   */
  canHandle(): boolean;

  /**
   * Get the priority of this adapter (higher numbers = higher priority)
   * Used when multiple adapters could handle the same domain
   */
  getPriority(): number;
}

/**
 * Abstract base class for product extractor adapters
 * Provides common functionality and utilities
 */
export abstract class BaseProductExtractorAdapter implements ProductExtractorAdapter {
  abstract readonly domain: string;
  abstract readonly alternativeDomains?: string[];

  /**
   * Default priority (can be overridden by subclasses)
   */
  getPriority(): number {
    return 1;
  }

  /**
   * Check if this adapter can handle the current page
   */
  canHandle(): boolean {
    const currentDomain = this.getCurrentDomain();
    return this.matchesDomain(currentDomain);
  }

  /**
   * Main extract method - delegates to subclass implementation
   */
  async extract(): Promise<ProductInfo | null> {
    try {
      return await this.extractProductInfo();
    } catch (error) {
      console.error(`Error in ${this.constructor.name} extraction:`, error);
      return null;
    }
  }

  /**
   * Check if the given domain matches this adapter's domains
   */
  protected matchesDomain(domain: string): boolean {
    if (domain === this.domain) {
      return true;
    }

    if (this.alternativeDomains) {
      return this.alternativeDomains.includes(domain);
    }

    return false;
  }

  /**
   * Get the current page's domain
   */
  protected getCurrentDomain(): string {
    try {
      return window.location.hostname.toLowerCase();
    } catch (error) {
      console.warn('Error getting current domain:', error);
      return '';
    }
  }

  /**
   * Extract text using a selector array with validation
   */
  protected extractText(selectors: string[]): string {
    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i];
      try {
        const elements = document.querySelectorAll(selector);

        for (let j = 0; j < elements.length; j++) {
          const element = elements[j];
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
          const text = element.textContent || (element as HTMLElement).innerText || '';
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
   * Extract price using a selector array with validation
   */
  protected extractPrice(selectors: string[]): string {
    const pricePattern = /(?:[$€£¥₹₽¢][\d,.]+(\.?\d{2})?|\d+[,.]?\d*\s*[$€£¥₹₽¢]|[\d,]+\.?\d{0,2})/;

    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i];
      try {
        const elements = document.querySelectorAll(selector);

        for (let j = 0; j < elements.length; j++) {
          const element = elements[j];
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
          const text = element.textContent || (element as HTMLElement).innerText || '';
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
   * Extract image URL using a selector array
   */
  protected extractImage(selectors: string[]): string {
    const foundImages: Array<{src: string, element: Element}> = [];

    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i];
      try {
        const elements = document.querySelectorAll(selector);

        for (let j = 0; j < elements.length; j++) {
          const element = elements[j];
          if (!element) continue;

          let imageUrl = '';

          // Handle meta tags
          if (element.tagName.toLowerCase() === 'meta') {
            imageUrl = element.getAttribute('content') || '';
          }
          // Handle img tags
          else if (element.tagName.toLowerCase() === 'img') {
            imageUrl = this.getBestImageSrc(element as HTMLImageElement);
          }
          // Handle other elements that might contain images
          else {
            const imgs = element.querySelectorAll('img');
            for (let k = 0; k < imgs.length; k++) {
              const img = imgs[k];
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
  private getBestImageSrc(imgElement: HTMLImageElement): string {
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
  private isValidImageUrl(url: string): boolean {
    if (!url || typeof url !== 'string') return false;

    // Must be a valid HTTP/HTTPS URL or protocol-relative
    if (!(url.startsWith('http') || url.startsWith('//'))) return false;

    // Exclude obvious non-product images
    const excludePatterns = [
      /logo/i,
      /banner/i,
      /advertisement/i,
      /sprite/i,
      /icon(?!.*product)/i,
      /button/i,
      /arrow/i,
      /star/i,
      /rating/i,
      /1x1/,
      /pixel/i,
      /tracking/i,
      /analytics/i,
      /placeholder/i,
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
  private selectBestImage(images: Array<{src: string, element: Element}>): string {
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
      if (element && element instanceof HTMLImageElement && element.naturalWidth && element.naturalHeight) {
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
   * Validate if extracted text is likely to be a product title
   */
  protected isValidText(text: string): boolean {
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
   * Validate if extracted text is likely to be a price
   */
  protected isValidPrice(price: string): boolean {
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
  protected extractNumericPrice(priceStr: string): number | null {
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
   * Create standardized product info object
   */
  protected createProductInfo(overrides: Partial<ProductInfo> = {}): ProductInfo {
    const baseInfo: ProductInfo = {
      title: '',
      price: '',
      imageUrl: '',
      productUrl: window.location.href,
      store: this.getStoreName(),
      availability: 'In Stock'
    };

    return { ...baseInfo, ...overrides };
  }

  /**
   * Get the store name for this adapter
   */
  protected abstract getStoreName(): string;

  /**
   * Get the selectors for this specific site
   */
  protected abstract getSelectors(): SiteSelectors;

  /**
   * Main extraction logic (to be implemented by subclasses)
   */
  protected abstract extractProductInfo(): Promise<ProductInfo | null>;
}

/**
 * Product information interface
 */
export interface ProductInfo {
  title: string;
  price: string;
  imageUrl: string;
  productUrl: string;
  store: string;
  availability?: string;
  description?: string;
  category?: string;
  brand?: string;
  sku?: string;
}

/**
 * Selectors interface for site-specific extraction
 */
export interface SiteSelectors {
  title: string[];
  price: string[];
  image: string[];
  availability?: string[];
  description?: string[];
  category?: string[];
  brand?: string[];
  sku?: string[];
}