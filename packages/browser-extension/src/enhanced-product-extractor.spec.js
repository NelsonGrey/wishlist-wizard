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

  describe('extractFromJsonLd', () => {
    it('extracts title/price/image from a direct Product schema', () => {
      document.head.innerHTML = `
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@type": "Product",
          "name": "Wireless Mouse",
          "image": "https://cdn.example.com/mouse.jpg",
          "offers": { "@type": "Offer", "price": "29.99", "availability": "https://schema.org/InStock" }
        }
        </script>
      `;

      const result = extractor.extractFromJsonLd();

      expect(result).not.toBeNull();
      expect(result.title).toBe('Wireless Mouse');
      expect(result.imageUrl).toBe('https://cdn.example.com/mouse.jpg');
      expect(result.price).toBe('29.99');
      expect(result.availability).toBe('In Stock');
    });

    it('extracts from a Product nested inside an @graph array', () => {
      document.head.innerHTML = `
        <script type="application/ld+json">
        {
          "@context": "https://schema.org",
          "@graph": [
            { "@type": "WebPage", "name": "Store Page" },
            {
              "@type": "Product",
              "name": "Standing Desk",
              "image": ["https://cdn.example.com/desk-1.jpg", "https://cdn.example.com/desk-2.jpg"],
              "offers": { "price": 399, "availability": "https://schema.org/OutOfStock" }
            }
          ]
        }
        </script>
      `;

      const result = extractor.extractFromJsonLd();

      expect(result).not.toBeNull();
      expect(result.title).toBe('Standing Desk');
      expect(result.imageUrl).toBe('https://cdn.example.com/desk-1.jpg');
      expect(result.price).toBe('399');
      expect(result.availability).toBe('Out of Stock');
    });

    it('returns null when no Product JSON-LD is present', () => {
      document.head.innerHTML = `
        <script type="application/ld+json">{"@type": "WebPage", "name": "Nothing here"}</script>
      `;

      expect(extractor.extractFromJsonLd()).toBeNull();
    });

    it('ignores malformed JSON-LD without throwing', () => {
      document.head.innerHTML = `
        <script type="application/ld+json">not valid json</script>
      `;

      expect(() => extractor.extractFromJsonLd()).not.toThrow();
      expect(extractor.extractFromJsonLd()).toBeNull();
    });

    it('extractGenericProduct prefers JSON-LD over CSS-selector guessing when both are present', () => {
      document.head.innerHTML = `
        <script type="application/ld+json">
        {
          "@type": "Product",
          "name": "The Real Product Name",
          "offers": { "price": "49.99" }
        }
        </script>
      `;
      document.body.innerHTML = `
        <h1>A Misleading Heading</h1>
        <div class="price">$999.99</div>
      `;

      const result = extractor.extractGenericProduct();

      expect(result.title).toBe('The Real Product Name');
      expect(result.price).toBe('49.99');
    });
  });
});
