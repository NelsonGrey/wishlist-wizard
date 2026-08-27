import { beforeEach, describe, expect, it, vi } from 'vitest';

async function loadComparisonModule() {
  vi.resetModules();
  await import('./comparison.js');
  return window.priceComparison;
}

describe('comparison.js: PriceComparison', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    delete window.priceComparison;
    delete window.chrome;
    delete global.chrome;
  });

  describe('init', () => {
    it('accepts valid product info and stores it', async () => {
      const comparison = await loadComparisonModule();
      const result = comparison.init({ title: 'Wireless Headphones' });

      expect(result).toBe(true);
      expect(comparison.productInfo).toEqual({ title: 'Wireless Headphones' });
    });

    it('rejects missing product info', async () => {
      const comparison = await loadComparisonModule();
      expect(comparison.init(null)).toBe(false);
      expect(comparison.productInfo).toBeNull();
    });

    it('rejects product info without a title', async () => {
      const comparison = await loadComparisonModule();
      expect(comparison.init({ price: '$10' })).toBe(false);
    });
  });

  describe('getComparisonLinks', () => {
    it('returns an empty array when no product has been initialized', async () => {
      const comparison = await loadComparisonModule();
      expect(comparison.getComparisonLinks()).toEqual([]);
    });

    it('builds a search link for every comparison site, with spaces replaced', async () => {
      const comparison = await loadComparisonModule();
      comparison.init({ title: 'Noise Cancelling Headphones' });

      const links = comparison.getComparisonLinks();

      expect(links).toHaveLength(5);
      expect(links.map((l) => l.name)).toEqual(['Amazon', 'Walmart', 'Target', 'Best Buy', 'eBay']);
      const amazon = links.find((l) => l.name === 'Amazon');
      expect(amazon.url).toBe('https://www.amazon.com/s?k=Noise+Cancelling+Headphones');
    });
  });

  describe('findPriceComparisons', () => {
    it('returns [] and warns when no product has been initialized', async () => {
      const comparison = await loadComparisonModule();
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await comparison.findPriceComparisons();

      expect(result).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('No product specified'));
    });

    it('routes the request through background.js via chrome.runtime.sendMessage, not a direct fetch', async () => {
      const comparison = await loadComparisonModule();
      comparison.init({ title: 'Standing Desk' });

      const sendMessage = vi.fn((payload, cb) => {
        expect(payload).toEqual({
          action: 'findPriceComparisons',
          productInfo: { title: 'Standing Desk' },
        });
        cb({ success: true, results: [{ name: 'Target', price: 199 }] });
      });
      global.chrome = { runtime: { sendMessage, lastError: undefined } };
      window.chrome = global.chrome;

      const result = await comparison.findPriceComparisons();

      expect(sendMessage).toHaveBeenCalledTimes(1);
      expect(result).toEqual([{ name: 'Target', price: 199 }]);
      expect(comparison.comparisonResults).toEqual([{ name: 'Target', price: 199 }]);
    });

    it('returns [] when the background script reports failure', async () => {
      const comparison = await loadComparisonModule();
      comparison.init({ title: 'Standing Desk' });

      global.chrome = {
        runtime: {
          sendMessage: (payload, cb) => cb({ success: false, error: 'Auth required' }),
          lastError: undefined,
        },
      };
      window.chrome = global.chrome;
      const error = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await comparison.findPriceComparisons();

      expect(result).toEqual([]);
      expect(error).toHaveBeenCalled();
    });

    it('returns [] when chrome.runtime.lastError is set', async () => {
      const comparison = await loadComparisonModule();
      comparison.init({ title: 'Standing Desk' });

      global.chrome = {
        runtime: {
          sendMessage: (payload, cb) => cb(undefined),
          get lastError() {
            return { message: 'Extension context invalidated' };
          },
        },
      };
      window.chrome = global.chrome;
      vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await comparison.findPriceComparisons();

      expect(result).toEqual([]);
    });

    it('resets isSearching to false even after a failure, so a retry is possible', async () => {
      const comparison = await loadComparisonModule();
      comparison.init({ title: 'Standing Desk' });
      global.chrome = {
        runtime: {
          sendMessage: (payload, cb) => cb({ success: false, error: 'boom' }),
          lastError: undefined,
        },
      };
      window.chrome = global.chrome;
      vi.spyOn(console, 'error').mockImplementation(() => {});

      await comparison.findPriceComparisons();

      expect(comparison.isSearching).toBe(false);
    });

    it('guards against a concurrent search already in progress', async () => {
      const comparison = await loadComparisonModule();
      comparison.init({ title: 'Standing Desk' });
      comparison.isSearching = true;
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await comparison.findPriceComparisons();

      expect(result).toEqual([]);
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('already in progress'));
    });
  });

  describe('findBestDeal', () => {
    it('returns null when there are no comparison results', async () => {
      const comparison = await loadComparisonModule();
      expect(comparison.findBestDeal()).toBeNull();
    });

    it('returns the first result when none is marked as the current store', async () => {
      const comparison = await loadComparisonModule();
      comparison.comparisonResults = [{ name: 'Target', price: 100 }, { name: 'Walmart', price: 90 }];

      expect(comparison.findBestDeal()).toEqual({ name: 'Target', price: 100 });
    });

    it('finds a cheaper alternative that clears the 5% savings threshold', async () => {
      const comparison = await loadComparisonModule();
      comparison.comparisonResults = [
        { name: 'CurrentStore', price: 100, isCurrent: true },
        { name: 'Cheaper', price: 90 }, // 10% cheaper -- qualifies
      ];

      expect(comparison.findBestDeal()).toEqual({ name: 'Cheaper', price: 90 });
    });

    it('does not surface an alternative that saves less than 5%', async () => {
      const comparison = await loadComparisonModule();
      comparison.comparisonResults = [
        { name: 'CurrentStore', price: 100, isCurrent: true },
        { name: 'BarelyCheaper', price: 98 }, // 2% cheaper -- does not qualify
      ];

      expect(comparison.findBestDeal()).toBeNull();
    });

    it('ignores alternatives that are more expensive than the current store', async () => {
      const comparison = await loadComparisonModule();
      comparison.comparisonResults = [
        { name: 'CurrentStore', price: 100, isCurrent: true },
        { name: 'MoreExpensive', price: 120 },
      ];

      expect(comparison.findBestDeal()).toBeNull();
    });
  });
});
