import { BaseProductExtractorAdapter, ProductInfo, SiteSelectors } from './base-adapter.js';

/**
 * Amazon product extractor adapter
 * Handles all Amazon domains (amazon.com, amazon.ca, amazon.co.uk, etc.)
 */
export class AmazonAdapter extends BaseProductExtractorAdapter {
  readonly domain = 'amazon.com';
  readonly alternativeDomains = [
    'amazon.ca', 'amazon.co.uk', 'amazon.de', 'amazon.fr',
    'amazon.it', 'amazon.es', 'amazon.co.jp', 'amazon.in',
    'amazon.com.br', 'amazon.com.mx', 'amazon.com.au'
  ];

  getPriority(): number {
    return 10; // High priority for Amazon
  }

  protected getStoreName(): string {
    return 'Amazon';
  }

  protected getSelectors(): SiteSelectors {
    return {
      title: [
        '#productTitle',
        '.product-title-word-break',
        '.a-size-large.product-title-word-break'
      ],
      price: [
        '.a-price .a-offscreen',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '.a-price-current .a-offscreen',
        '.a-price.a-text-price.a-size-medium.apexPriceToPay .a-offscreen'
      ],
      image: [
        '#landingImage',
        '#imgBlkFront',
        '.a-dynamic-image',
        '.a-image-wrapper img'
      ],
      availability: [
        '#availability span',
        '.a-color-success',
        '.a-color-state'
      ],
      description: [
        '#productDescription',
        '#feature-bullets',
        '.a-list-item'
      ],
      category: [
        '#wayfinding-breadcrumbs_feature_div .a-list-item:last-child'
      ],
      brand: [
        '#bylineInfo',
        '.a-link-normal[href*="brand"]'
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