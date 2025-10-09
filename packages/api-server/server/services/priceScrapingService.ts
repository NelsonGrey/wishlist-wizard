import puppeteer from 'puppeteer';
import axios from 'axios';
import { URL } from 'url';

export interface ScrapedPrice {
  price: string;
  numericPrice: number;
  currency: string;
  success: boolean;
  error?: string;
}

/**
 * Generic price scraper that attempts to extract price from various e-commerce sites
 */
export class PriceScraper {
  private static readonly PRICE_SELECTORS = [
    // Amazon
    '.a-price-whole',
    '.a-price .a-offscreen',
    '#apex_desktop .a-price .a-offscreen',
    '.a-price-current .a-price-amount',
    
    // eBay
    '.notranslate',
    '.u-flL.condText',
    '#mainContent .u-flL.condText',
    '.display-price',
    
    // Walmart
    '[data-automation-id="product-price"]',
    '.price-display',
    '.price-group .price-display',
    
    // Target
    '[data-test="product-price"]',
    '.h-display-xs',
    
    // Best Buy
    '.pricing-price__range .sr-only',
    '.pricing-price__range',
    
    // Generic selectors
    '[data-testid*="price"]',
    '[class*="price"]',
    '[id*="price"]',
    '.price',
    '#price',
    '.cost',
    '.amount',
    '[data-price]'
  ];

  private static readonly PRICE_REGEX = /[\$£€¥₹]?[\d,]+\.?\d*/g;

  /**
   * Scrape price from a URL
   */
  public static async scrapePrice(url: string): Promise<ScrapedPrice> {
    try {
      // Validate URL
      const parsedUrl = new URL(url);
      
      // Try different scraping methods based on the domain
      if (parsedUrl.hostname.includes('amazon')) {
        return await this.scrapeAmazon(url);
      } else if (parsedUrl.hostname.includes('ebay')) {
        return await this.scrapeEbay(url);
      } else if (parsedUrl.hostname.includes('walmart')) {
        return await this.scrapeWalmart(url);
      } else if (parsedUrl.hostname.includes('target')) {
        return await this.scrapeTarget(url);
      } else if (parsedUrl.hostname.includes('bestbuy')) {
        return await this.scrapeBestBuy(url);
      } else {
        // Generic scraping for other sites
        return await this.scrapeGeneric(url);
      }
    } catch (error) {
      console.error(`Error scraping price from ${url}:`, error);
      return {
        price: '',
        numericPrice: 0,
        currency: '$',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Scrape Amazon price
   */
  private static async scrapeAmazon(url: string): Promise<ScrapedPrice> {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      // Wait for price element to load
      await page.waitForSelector('.a-price, .a-price-current', { timeout: 5000 });
      
      // Extract price
      const priceText = await page.evaluate(() => {
        const selectors = [
          '.a-price .a-offscreen',
          '.a-price-current .a-price-amount',
          '.a-price-whole'
        ];
        
        for (const selector of selectors) {
          const element = document.querySelector(selector);
          if (element) {
            return element.textContent?.trim() || '';
          }
        }
        return '';
      });

      return this.parsePrice(priceText);
    } finally {
      await browser.close();
    }
  }

  /**
   * Scrape eBay price
   */
  private static async scrapeEbay(url: string): Promise<ScrapedPrice> {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      // Simple regex-based extraction for eBay
      const priceMatch = response.data.match(/"price":{"value":"([^"]+)"/);
      if (priceMatch) {
        return this.parsePrice(priceMatch[1]);
      }

      // Fallback to generic scraping
      return await this.scrapeGeneric(url);
    } catch (error) {
      return await this.scrapeGeneric(url);
    }
  }

  /**
   * Generic scraping using Puppeteer
   */
  private static async scrapeGeneric(url: string): Promise<ScrapedPrice> {
    const browser = await puppeteer.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      await page.goto(url, { waitUntil: 'networkidle2' });
      
      // Try to extract price using common selectors
      const priceText = await page.evaluate((selectors: string[]) => {
        for (const selector of selectors) {
          const elements = document.querySelectorAll(selector);
          for (const element of elements) {
            const text = element.textContent?.trim() || '';
            if (text && /[\$£€¥₹]?[\d,]+\.?\d*/.test(text)) {
              return text;
            }
          }
        }
        return '';
      }, this.PRICE_SELECTORS);

      if (priceText) {
        return this.parsePrice(priceText);
      }

      // Fallback: search for any price-like text in the page
      const fallbackPrice = await page.evaluate(() => {
        const text = document.body.textContent || '';
        const priceMatches = text.match(/[\$£€¥₹][\d,]+\.?\d*/g);
        return priceMatches ? priceMatches[0] : '';
      });

      return this.parsePrice(fallbackPrice);
    } finally {
      await browser.close();
    }
  }

  /**
   * Scrape Walmart price
   */
  private static async scrapeWalmart(url: string): Promise<ScrapedPrice> {
    return await this.scrapeGeneric(url);
  }

  /**
   * Scrape Target price
   */
  private static async scrapeTarget(url: string): Promise<ScrapedPrice> {
    return await this.scrapeGeneric(url);
  }

  /**
   * Scrape Best Buy price
   */
  private static async scrapeBestBuy(url: string): Promise<ScrapedPrice> {
    return await this.scrapeGeneric(url);
  }

  /**
   * Parse price text into structured format
   */
  private static parsePrice(priceText: string): ScrapedPrice {
    if (!priceText) {
      return {
        price: '',
        numericPrice: 0,
        currency: '$',
        success: false,
        error: 'No price found'
      };
    }

    // Extract currency symbol
    const currencyMatch = priceText.match(/[\$£€¥₹]/);
    const currency = currencyMatch ? currencyMatch[0] : '$';

    // Extract numeric value
    const numericMatch = priceText.match(/[\d,]+\.?\d*/);
    if (!numericMatch) {
      return {
        price: priceText,
        numericPrice: 0,
        currency,
        success: false,
        error: 'Could not parse numeric price'
      };
    }

    const numericPrice = parseFloat(numericMatch[0].replace(/,/g, ''));
    
    return {
      price: priceText.trim(),
      numericPrice,
      currency,
      success: true
    };
  }

  /**
   * Batch scrape multiple URLs
   */
  public static async scrapePrices(urls: string[]): Promise<Map<string, ScrapedPrice>> {
    const results = new Map<string, ScrapedPrice>();
    
    // Process URLs in batches to avoid overwhelming servers
    const batchSize = 3;
    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize);
      const promises = batch.map(async (url) => {
        const result = await this.scrapePrice(url);
        return { url, result };
      });

      const batchResults = await Promise.allSettled(promises);
      
      for (const promiseResult of batchResults) {
        if (promiseResult.status === 'fulfilled') {
          results.set(promiseResult.value.url, promiseResult.value.result);
        }
      }

      // Add delay between batches to be respectful to servers
      if (i + batchSize < urls.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return results;
  }
}