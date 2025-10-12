import { BaseProductExtractorAdapter, ProductInfo, SiteSelectors } from './base-adapter.js';

/**
 * Target product extractor adapter
 */
export class TargetAdapter extends BaseProductExtractorAdapter {
  readonly domain = 'target.com';
  readonly alternativeDomains = [];

  getPriority(): number {
    return 8; // High priority for Target
  }

  protected getStoreName(): string {
    return 'Target';
  }

  protected getSelectors(): SiteSelectors {
    return {
      title: [
        'h1[data-test="product-title"]',
        '.Heading__StyledHeading-sc-1mp23s9-0'
      ],
      price: [
        '[data-test="product-price"]',
        '.style__PriceFontSize-sc-17wlxvr-0',
        '.h-text-red'
      ],
      image: [
        'img[data-test="product-image"]',
        '.slideDeckPicture img'
      ],
      availability: [
        '[data-test="product-availability"]',
        '.h-text-blue'
      ],
      description: [
        '[data-test="product-description"]',
        '.h-margin-b-default'
      ],
      category: [
        '[data-test="breadcrumb"] a:last-child'
      ],
      brand: [
        '[data-test="product-brand"]',
        '.h-text-uppercase'
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