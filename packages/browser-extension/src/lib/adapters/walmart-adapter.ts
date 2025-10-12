import { BaseProductExtractorAdapter, ProductInfo, SiteSelectors } from './base-adapter.js';

/**
 * Walmart product extractor adapter
 */
export class WalmartAdapter extends BaseProductExtractorAdapter {
  readonly domain = 'walmart.com';
  readonly alternativeDomains = [];

  getPriority(): number {
    return 8; // High priority for Walmart
  }

  protected getStoreName(): string {
    return 'Walmart';
  }

  protected getSelectors(): SiteSelectors {
    return {
      title: [
        'h1.prod-ProductTitle',
        '[data-automation="product-title"]',
        'h1[data-automation="product-title"]'
      ],
      price: [
        '.prod-PriceSection .price-characteristic',
        '[data-automation="product-price"]',
        '.price-current'
      ],
      image: [
        '.prod-hero-image img',
        '[data-automation="image-main"]',
        '.hover-zoom-hero-image img'
      ],
      availability: [
        '[data-automation="product-availability"]',
        '.prod-ProductAvailability'
      ],
      description: [
        '[data-automation="product-description"]',
        '.prod-ProductDescription'
      ],
      category: [
        '[data-automation="breadcrumb"] a:last-child'
      ],
      brand: [
        '[data-automation="product-brand"]',
        '.prod-BrandName'
      ]
    };
  }

  protected async extractProductInfo(): Promise<ProductInfo | null> {
    const selectors = this.getSelectors();

    const title = this.extractText(selectors.title);
    const price = this.extractPrice(selectors.price);
    const imageUrl = this.extractImage(selectors.image);

    if (!title && !price && !imageUrl) {
      return null;
    }

    const productInfo = this.createProductInfo({
      title,
      price,
      imageUrl,
      description: selectors.description ? this.extractText(selectors.description) : '',
      category: selectors.category ? this.extractText(selectors.category) : '',
      brand: selectors.brand ? this.extractText(selectors.brand) : '',
      availability: selectors.availability ? this.extractText(selectors.availability) : 'In Stock'
    });

    return productInfo;
  }
}