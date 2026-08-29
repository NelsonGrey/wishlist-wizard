import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// popup-extra.js is loaded as its own <script type="module"> by
// popup-bootstrap.js, separate from popup.js. It references
// currentProductInfo/comparisonResults/coupons and showScreen/showErrorScreen
// as bare identifiers -- these resolve at runtime because popup.js explicitly
// assigns window.currentProductInfo = ..., window.showScreen = showScreen,
// etc. (confirmed via grep), making them real global-object properties any
// module's bare identifier lookup falls through to. So this fixture mirrors
// that same bridging contract rather than importing popup.js itself.
const FIXTURE_HTML = `
  <div class="tabs">
    <button id="tab-product" class="tab-button active">Product</button>
    <button id="tab-price" class="tab-button">Compare</button>
    <button id="tab-coupon" class="tab-button">Coupons</button>
    <button id="tab-wishlist" class="tab-button">Wishlists</button>
  </div>

  <div id="price-comparison-screen" class="screen hidden">
    <div id="comparison-loading" class="spinner"></div>
    <div id="best-deal-container" class="best-deal hidden">
      <div id="best-deal-details" class="deal-details">
        <span class="deal-store"></span>
        <span class="deal-price"></span>
        <span class="deal-savings"></span>
      </div>
      <a id="best-deal-link" class="primary-button" target="_blank">Go to Deal</a>
    </div>
    <div class="comparison-results">
      <div id="comparison-list"></div>
    </div>
    <template id="comparison-item-template">
      <div class="comparison-item">
        <div class="comparison-details">
          <span class="store-name"></span>
          <span class="price"></span>
          <span class="price-difference"></span>
          <div class="comparison-badges">
            <span class="in-stock-badge"></span>
            <span class="free-shipping-badge"></span>
          </div>
        </div>
        <a class="view-button" target="_blank">View</a>
      </div>
    </template>
    <div class="button-group">
      <button id="refresh-comparison-button" class="secondary-button">Refresh Prices</button>
    </div>
  </div>

  <div id="coupon-screen" class="screen hidden">
    <div id="coupon-loading" class="spinner"></div>
    <div class="coupon-results">
      <div id="coupon-list"></div>
    </div>
    <template id="coupon-item-template">
      <div class="coupon-item">
        <div class="coupon-details">
          <div class="coupon-code"></div>
          <div class="coupon-discount"></div>
          <div class="coupon-description"></div>
          <div class="coupon-expiry"></div>
          <div class="coupon-source"></div>
          <div class="coupon-verification"></div>
        </div>
        <div class="coupon-actions">
          <button class="copy-button">Copy</button>
          <button class="apply-button">Apply</button>
        </div>
      </div>
    </template>
    <div id="no-coupons-message" class="message-box hidden">
      <div id="coupon-links" class="link-list"></div>
    </div>
    <div class="button-group">
      <button id="refresh-coupons-button" class="secondary-button">Find More Coupons</button>
    </div>
  </div>
`;

async function loadPopupExtraModule() {
  document.body.innerHTML = FIXTURE_HTML;
  vi.resetModules();
  await import('./popup-extra.js');
}

describe('popup-extra.js', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();

    // Mirror popup.js's real cross-module bridging (window.x = ...) rather
    // than reassigning bare `let` bindings, since popup-extra.js is loaded
    // as an independent module and only ever sees these via window.
    window.currentProductInfo = null;
    window.comparisonResults = [];
    window.coupons = [];
    window.showScreen = vi.fn();
    window.showErrorScreen = vi.fn();
    delete window.priceComparison;
    delete window.couponFinder;
    delete window.loadWishlistItemsForSelected;

    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      configurable: true,
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('switchTab', () => {
    it('marks the clicked tab button active and clears the others', async () => {
      await loadPopupExtraModule();

      window.switchTab('price');

      expect(document.getElementById('tab-price').classList.contains('active')).toBe(true);
      expect(document.getElementById('tab-product').classList.contains('active')).toBe(false);
    });

    it('records the active tab on window.currentActiveTab', async () => {
      await loadPopupExtraModule();
      window.switchTab('coupon');
      expect(window.currentActiveTab).toBe('coupon');
    });

    it('shows the product screen for the product tab', async () => {
      await loadPopupExtraModule();
      window.switchTab('product');
      expect(window.showScreen).toHaveBeenCalledWith('product-screen');
    });

    it('shows the wishlist screen and loads wishlist items for the wishlist tab', async () => {
      window.loadWishlistItemsForSelected = vi.fn();
      await loadPopupExtraModule();

      window.switchTab('wishlist');

      expect(window.showScreen).toHaveBeenCalledWith('wishlist-screen');
      expect(window.loadWishlistItemsForSelected).toHaveBeenCalled();
    });

    it('does not throw when loadWishlistItemsForSelected is not defined', async () => {
      await loadPopupExtraModule();
      expect(() => window.switchTab('wishlist')).not.toThrow();
    });

    it('routes the price tab into loadPriceComparisons', async () => {
      // No currentProductInfo -> loadPriceComparisons' first guard clause
      // fires, which is observable via showErrorScreen.
      await loadPopupExtraModule();
      window.switchTab('price');
      expect(window.showErrorScreen).toHaveBeenCalledWith('No product information available', 'detection');
    });

    it('routes the coupon tab into loadCoupons', async () => {
      await loadPopupExtraModule();
      window.switchTab('coupon');
      expect(window.showErrorScreen).toHaveBeenCalledWith('No product information available', 'detection');
    });
  });

  describe('loadPriceComparisons (via the price tab)', () => {
    it('shows an error and bails out when there is no product info', async () => {
      await loadPopupExtraModule();
      window.priceComparison = { init: vi.fn() };

      window.switchTab('price');

      expect(window.showErrorScreen).toHaveBeenCalledWith('No product information available', 'detection');
      expect(window.priceComparison.init).not.toHaveBeenCalled();
    });

    it('shows an error when the price comparison engine is unavailable', async () => {
      await loadPopupExtraModule();
      window.currentProductInfo = { title: 'Desk Lamp', store: 'Target' };

      window.switchTab('price');
      await Promise.resolve();

      expect(window.showErrorScreen).toHaveBeenCalledWith('Price comparison engine is not available', 'unknown');
    });

    it('initializes the engine, renders results, and highlights the best deal', async () => {
      await loadPopupExtraModule();
      window.currentProductInfo = { title: 'Desk Lamp', store: 'Target' };
      const results = [
        { storeName: 'Target', price: 50, priceFormatted: '$50.00', isCurrent: true, inStock: true, freeShipping: true },
        { storeName: 'Walmart', price: 40, priceFormatted: '$40.00', isCurrent: false, inStock: true, freeShipping: false,
          difference: { amount: -10, percentage: 20 } },
      ];
      window.priceComparison = {
        init: vi.fn(),
        findPriceComparisons: vi.fn().mockResolvedValue(results),
        findBestDeal: vi.fn().mockReturnValue({
          storeName: 'Walmart', priceFormatted: '$40.00', price: 40, url: 'https://walmart.com/x', isCurrent: false,
        }),
      };

      window.switchTab('price');
      await Promise.resolve();
      await Promise.resolve();

      expect(window.priceComparison.init).toHaveBeenCalledWith(window.currentProductInfo);
      expect(document.getElementById('comparison-loading').classList.contains('hidden')).toBe(true);

      const dealContainer = document.getElementById('best-deal-container');
      expect(dealContainer.classList.contains('hidden')).toBe(false);
      expect(dealContainer.querySelector('.deal-store').textContent).toBe('Walmart');
      expect(dealContainer.querySelector('.deal-price').textContent).toBe('$40.00');
      expect(dealContainer.querySelector('.deal-savings').textContent).toBe('Save 10.00 (20%)');
      expect(document.getElementById('best-deal-link').href).toBe('https://walmart.com/x');

      const items = document.querySelectorAll('#comparison-list .comparison-item');
      expect(items).toHaveLength(2);
      expect(items[1].querySelector('.store-name').textContent).toBe('Walmart');
      expect(items[1].querySelector('.price-difference').textContent).toBe('20% lower (-$10.00)');
      expect(items[1].querySelector('.price-difference').classList.contains('lower')).toBe(true);
    });

    it('does not show the best-deal banner when the best deal is the current store', async () => {
      await loadPopupExtraModule();
      window.currentProductInfo = { title: 'Desk Lamp', store: 'Target' };
      window.priceComparison = {
        init: vi.fn(),
        findPriceComparisons: vi.fn().mockResolvedValue([]),
        findBestDeal: vi.fn().mockReturnValue({ isCurrent: true }),
      };

      window.switchTab('price');
      await Promise.resolve();
      await Promise.resolve();

      expect(document.getElementById('best-deal-container').classList.contains('hidden')).toBe(true);
    });

    it('shows "no results" messaging when there are no comparisons', async () => {
      await loadPopupExtraModule();
      window.currentProductInfo = { title: 'Desk Lamp', store: 'Target' };
      window.priceComparison = {
        init: vi.fn(),
        findPriceComparisons: vi.fn().mockResolvedValue([]),
        findBestDeal: vi.fn().mockReturnValue(null),
      };

      window.switchTab('price');
      await Promise.resolve();
      await Promise.resolve();

      expect(document.getElementById('comparison-list').innerHTML).toContain('No comparison results available');
    });

    it('shows a network error when the engine throws', async () => {
      await loadPopupExtraModule();
      window.currentProductInfo = { title: 'Desk Lamp', store: 'Target' };
      window.priceComparison = {
        init: vi.fn(),
        findPriceComparisons: vi.fn().mockRejectedValue(new Error('boom')),
      };
      vi.spyOn(console, 'error').mockImplementation(() => {});

      window.switchTab('price');
      await Promise.resolve();
      await Promise.resolve();

      expect(window.showErrorScreen).toHaveBeenCalledWith('Error loading price comparisons', 'network');
      expect(document.getElementById('comparison-loading').classList.contains('hidden')).toBe(true);
    });
  });

  describe('loadCoupons (via the coupon tab)', () => {
    it('shows an error and bails out when there is no product info', async () => {
      await loadPopupExtraModule();
      window.couponFinder = { init: vi.fn() };

      window.switchTab('coupon');

      expect(window.showErrorScreen).toHaveBeenCalledWith('No product information available', 'detection');
      expect(window.couponFinder.init).not.toHaveBeenCalled();
    });

    it('shows an error when the coupon finder is unavailable', async () => {
      await loadPopupExtraModule();
      window.currentProductInfo = { title: 'Desk Lamp', store: 'Target' };

      window.switchTab('coupon');
      await Promise.resolve();

      expect(window.showErrorScreen).toHaveBeenCalledWith('Coupon finder is not available', 'unknown');
    });

    it('shows the no-coupons message with fallback links when none are found', async () => {
      await loadPopupExtraModule();
      window.currentProductInfo = { title: 'Desk Lamp', store: 'Target' };
      window.couponFinder = {
        init: vi.fn(),
        findCoupons: vi.fn().mockResolvedValue([]),
        getCouponLinks: vi.fn().mockReturnValue([{ name: 'RetailMeNot', url: 'https://retailmenot.com/target' }]),
      };

      window.switchTab('coupon');
      await Promise.resolve();
      await Promise.resolve();

      expect(document.getElementById('no-coupons-message').classList.contains('hidden')).toBe(false);
      const link = document.querySelector('#coupon-links a');
      expect(link.textContent).toBe('RetailMeNot');
      expect(link.href).toBe('https://retailmenot.com/target');
    });

    it('renders coupon cards when coupons are found', async () => {
      await loadPopupExtraModule();
      window.currentProductInfo = { title: 'Desk Lamp', store: 'Target' };
      window.couponFinder = {
        init: vi.fn(),
        findCoupons: vi.fn().mockResolvedValue([
          { code: 'SAVE10', discount: '10% off', description: 'Sitewide', expiryDate: '2026-12-31', source: 'RetailMeNot', verified: true },
        ]),
        getCouponLinks: vi.fn().mockReturnValue([]),
      };

      window.switchTab('coupon');
      await Promise.resolve();
      await Promise.resolve();

      expect(window.couponFinder.init).toHaveBeenCalledWith(window.currentProductInfo);
      const item = document.querySelector('#coupon-list .coupon-item');
      expect(item.querySelector('.coupon-code').textContent).toBe('SAVE10');
      expect(item.querySelector('.coupon-verification').textContent).toBe('Verified');
      expect(document.getElementById('no-coupons-message').classList.contains('hidden')).toBe(true);
    });

    it('marks unverified coupons distinctly', async () => {
      await loadPopupExtraModule();
      window.currentProductInfo = { title: 'Desk Lamp', store: 'Target' };
      window.couponFinder = {
        init: vi.fn(),
        findCoupons: vi.fn().mockResolvedValue([
          { code: 'SAVE10', discount: '10% off', description: '', expiryDate: '2026-12-31', source: 'Honey', verified: false },
        ]),
        getCouponLinks: vi.fn().mockReturnValue([]),
      };

      window.switchTab('coupon');
      await Promise.resolve();
      await Promise.resolve();

      const verificationEl = document.querySelector('.coupon-verification');
      expect(verificationEl.textContent).toBe('Unverified');
    });

    it('shows a network error when the finder throws', async () => {
      await loadPopupExtraModule();
      window.currentProductInfo = { title: 'Desk Lamp', store: 'Target' };
      window.couponFinder = {
        init: vi.fn(),
        findCoupons: vi.fn().mockRejectedValue(new Error('boom')),
      };
      vi.spyOn(console, 'error').mockImplementation(() => {});

      window.switchTab('coupon');
      await Promise.resolve();
      await Promise.resolve();

      expect(window.showErrorScreen).toHaveBeenCalledWith('Error loading coupons', 'network');
    });

    describe('coupon card actions', () => {
      async function renderOneCoupon() {
        await loadPopupExtraModule();
        window.currentProductInfo = { title: 'Desk Lamp', store: 'Target' };
        window.couponFinder = {
          init: vi.fn(),
          findCoupons: vi.fn().mockResolvedValue([
            { code: 'SAVE10', discount: '10% off', description: '', expiryDate: '2026-12-31', source: 'Honey', verified: true },
          ]),
          getCouponLinks: vi.fn().mockReturnValue([]),
          applyCoupon: vi.fn(),
        };
        window.switchTab('coupon');
        await Promise.resolve();
        await Promise.resolve();
      }

      it('copies the coupon code to the clipboard and shows brief confirmation', async () => {
        vi.useFakeTimers();
        await renderOneCoupon();

        const copyButton = document.querySelector('.copy-button');
        copyButton.click();
        await vi.waitFor(() => expect(copyButton.textContent).toBe('Copied!'));

        expect(navigator.clipboard.writeText).toHaveBeenCalledWith('SAVE10');

        vi.advanceTimersByTime(2000);
        expect(copyButton.textContent).toBe('Copy');
      });

      it('applies a coupon successfully', async () => {
        await renderOneCoupon();
        window.couponFinder.applyCoupon.mockResolvedValue({ success: true });

        const applyButton = document.querySelector('.apply-button');
        applyButton.click();
        await vi.waitFor(() => expect(applyButton.textContent).toBe('Applied!'));

        expect(window.couponFinder.applyCoupon).toHaveBeenCalledWith('SAVE10');
      });

      it('shows a failure state and resets after a delay when application fails', async () => {
        vi.useFakeTimers();
        await renderOneCoupon();
        window.couponFinder.applyCoupon.mockResolvedValue({ success: false, message: 'No coupon field found' });
        vi.spyOn(console, 'error').mockImplementation(() => {});

        const applyButton = document.querySelector('.apply-button');
        applyButton.click();
        await vi.waitFor(() => expect(applyButton.textContent).toBe('Failed'));
        expect(applyButton.disabled).toBe(true);

        vi.advanceTimersByTime(2000);
        expect(applyButton.textContent).toBe('Apply');
        expect(applyButton.disabled).toBe(false);
      });

      it('shows an error state when applyCoupon throws', async () => {
        vi.useFakeTimers();
        await renderOneCoupon();
        window.couponFinder.applyCoupon.mockRejectedValue(new Error('no receiver'));
        vi.spyOn(console, 'error').mockImplementation(() => {});

        const applyButton = document.querySelector('.apply-button');
        applyButton.click();
        await vi.waitFor(() => expect(applyButton.textContent).toBe('Error'));

        vi.advanceTimersByTime(2000);
        expect(applyButton.textContent).toBe('Apply');
      });
    });
  });

  describe('setupPopupExtraEventListeners', () => {
    it('wires each tab button to switchTab with its suffix id', async () => {
      await loadPopupExtraModule();

      document.getElementById('tab-wishlist').click();

      expect(document.getElementById('tab-wishlist').classList.contains('active')).toBe(true);
      expect(window.currentActiveTab).toBe('wishlist');
    });

    it('wires the refresh-comparison button to reload price comparisons', async () => {
      await loadPopupExtraModule();
      window.priceComparison = {
        init: vi.fn(),
        findPriceComparisons: vi.fn().mockResolvedValue([]),
        findBestDeal: vi.fn().mockReturnValue(null),
      };

      document.getElementById('refresh-comparison-button').click();
      await Promise.resolve();
      await Promise.resolve();

      expect(window.priceComparison.init).not.toHaveBeenCalled(); // no product info -> guarded
      expect(window.showErrorScreen).toHaveBeenCalledWith('No product information available', 'detection');
    });

    it('wires the refresh-coupons button to reload coupons', async () => {
      await loadPopupExtraModule();

      document.getElementById('refresh-coupons-button').click();

      expect(window.showErrorScreen).toHaveBeenCalledWith('No product information available', 'detection');
    });
  });
});
