import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

beforeAll(async () => {
  await import('./enhanced-product-extractor.js');
});

describe('EnhancedProductExtractor', () => {
  let extractor;

  beforeEach(() => {
    document.head.innerHTML = '';
    document.body.innerHTML = '<main></main>';
    window.history.replaceState({}, '', '/products/item-123');
    const Extractor = window.EnhancedProductExtractor;
    extractor = new Extractor();
  });

  it('extracts metadata from Open Graph tags', () => {
    document.head.innerHTML = `
      <meta property="og:title" content="Super Gadget 3000" />
      <meta property="og:image" content="https://cdn.example.com/gadget.jpg" />
      <meta property="og:price:amount" content="149.99" />
    `;

    const result = extractor.extractFromMetaTags();

    expect(result.title).toBe('Super Gadget 3000');
    expect(result.imageUrl).toBe('https://cdn.example.com/gadget.jpg');
    expect(result.price).toBe('149.99');
    expect(result.productUrl).toContain('/products/item-123');
  });

  it('normalizes common price formats', () => {
    expect(extractor.sanitizePrice('$1,299.99')).toBe('$1299.99');
    expect(extractor.sanitizePrice('EUR 89,50')).toBe('$89.50');
    expect(extractor.sanitizePrice('19.9')).toBe('$19.90');
  });

  it('identifies likely product pages from URL/content indicators', () => {
    document.body.innerHTML = `
      <h1>Noise Cancelling Headphones</h1>
      <div class="price">$199.99</div>
      <button>Add to cart</button>
      <div class="product-details">Product details</div>
    `;

    expect(extractor.isProductPage()).toBe(true);
  });
});
