import * as cron from 'node-cron';
import * as puppeteer from 'puppeteer';
import { storage } from "../storage";
import { updateItemPrice } from "./priceTrackingService";
import type { WishlistItem } from "@wishlist-wizard/shared";

/**
 * Price polling service for automated price checks
 * Handles scheduled price updates from retailer websites
 */

interface PriceScrapingResult {
  success: boolean;
  price?: string;
  numericPrice?: number;
  error?: string;
  availability?: string;
}

interface RetailerScraper {
  name: string;
  domains: string[];
  scrapePrice: (url: string) => Promise<PriceScrapingResult>;
  rateLimit: number; // milliseconds between requests
}

/**
 * Rate limiter to prevent overwhelming retailer websites
 */
class RateLimiter {
  private lastRequestTimes: Map<string, number> = new Map();

  async waitForRateLimit(domain: string, minInterval: number): Promise<void> {
    const lastTime = this.lastRequestTimes.get(domain) || 0;
    const timeSinceLastRequest = Date.now() - lastTime;
    
    if (timeSinceLastRequest < minInterval) {
      const waitTime = minInterval - timeSinceLastRequest;
      console.log(`[PricePoller] Rate limiting ${domain} - waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    this.lastRequestTimes.set(domain, Date.now());
  }
}

/**
 * User agent rotator for better scraping stealth
 */
class UserAgentRotator {
  private userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
  ];

  getRandomUserAgent(): string {
    return this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
  }
}

// Global user agent rotator instance
const userAgentRotator = new UserAgentRotator();

/**
 * Amazon scraper - production implementation using Puppeteer
 */
const amazonScraper: RetailerScraper = {
  name: "Amazon",
  domains: ["amazon.com", "amazon.ca", "amazon.co.uk", "amazon.de", "amazon.fr", "amazon.it", "amazon.es", "amazon.nl", "amazon.au", "amazon.jp"],
  rateLimit: 5000, // 5 seconds between requests to be respectful
  
  async scrapePrice(url: string): Promise<PriceScrapingResult> {
    let browser;
    try {
      console.log(`[Amazon] Scraping price from: ${url}`);
      
      // Launch browser with stealth options
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      
      // Set a random user agent for better stealth
      await page.setUserAgent(userAgentRotator.getRandomUserAgent());
      
      await page.setViewport({ width: 1366, height: 768 });
      
      // Navigate to the product page
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait a bit for dynamic content to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Try multiple selectors for price (Amazon changes these frequently)
      const priceSelectors = [
        '#corePrice_feature_div .a-price .a-offscreen',
        '#priceblock_ourprice',
        '#priceblock_dealprice',
        '.a-price .a-offscreen',
        '#corePriceDisplay_desktop_feature_div .a-price-whole',
        '#corePriceDisplay_desktop_feature_div .a-price-fraction',
        '.a-color-price',
        '#buyNewSection .a-color-price',
        '#newBuyBoxPrice',
        '#usedBuyBoxPrice'
      ];
      
      let price = null;
      let availability = null;
      
      for (const selector of priceSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const text = await page.evaluate((el: any) => el.textContent?.trim(), element);
            if (text && text.match(/\$[\d,]+\.?\d*/)) {
              price = text;
              break;
            }
          }
        } catch (error) {
          // Continue to next selector
          continue;
        }
      }
      
      // Check availability
      const availabilitySelectors = [
        '#availability',
        '#outOfStock',
        '.a-color-success',
        '.a-color-state'
      ];
      
      for (const selector of availabilitySelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const text = await page.evaluate((el: any) => el.textContent?.trim(), element);
            if (text) {
              availability = text;
              break;
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      // If we couldn't find a price, try to extract from the page title or other elements
      if (!price) {
        try {
          const title = await page.title();
          // Sometimes price is in the title
          const titleMatch = title.match(/\$[\d,]+\.?\d*/);
          if (titleMatch) {
            price = titleMatch[0];
          }
        } catch (error) {
          // Ignore title extraction errors
        }
      }
      
      if (!price) {
        return {
          success: false,
          error: "Could not find price on Amazon page"
        };
      }
      
      // Clean up the price string
      const cleanPrice = price.replace(/[^\d.]/g, '');
      const numericPrice = parseFloat(cleanPrice);
      
      if (isNaN(numericPrice)) {
        return {
          success: false,
          error: `Invalid price format: ${price}`
        };
      }
      
      return {
        success: true,
        price: `$${numericPrice.toFixed(2)}`,
        numericPrice,
        availability: availability || "Available"
      };
      
    } catch (error) {
      console.error(`[Amazon] Error scraping price from ${url}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
};

/**
 * Target scraper - production implementation using Puppeteer
 */
const targetScraper: RetailerScraper = {
  name: "Target",
  domains: ["target.com"],
  rateLimit: 3000, // 3 seconds between requests
  
  async scrapePrice(url: string): Promise<PriceScrapingResult> {
    let browser;
    try {
      console.log(`[Target] Scraping price from: ${url}`);
      
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      
      await page.setUserAgent(userAgentRotator.getRandomUserAgent());
      await page.setViewport({ width: 1366, height: 768 });
      
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Target price selectors
      const priceSelectors = [
        '[data-test="product-price"]',
        '.h-text-bs .h-text-bs--bold',
        '.styles__CurrentPrice-sc-1k1jzog-0',
        '.h-text-bs--bold',
        '[data-testid="product-price"]',
        '.price-container .price',
        '.product-price .price'
      ];
      
      let price = null;
      let availability = null;
      
      for (const selector of priceSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const text = await page.evaluate((el: any) => el.textContent?.trim(), element);
            if (text && (text.match(/\$[\d,]+\.?\d*/) || text.match(/[\d,]+\.?\d*/))) {
              // Clean up price text
              const cleanText = text.replace(/[^\d.]/g, '');
              if (cleanText && !isNaN(parseFloat(cleanText))) {
                price = text.includes('$') ? text : `$${cleanText}`;
                break;
              }
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      // Check availability
      const availabilitySelectors = [
        '[data-test="shipping-status"]',
        '.h-text-grayDark',
        '.availability-status',
        '.shipping-message'
      ];
      
      for (const selector of availabilitySelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const text = await page.evaluate((el: any) => el.textContent?.trim(), element);
            if (text) {
              availability = text;
              break;
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      if (!price) {
        return {
          success: false,
          error: "Could not find price on Target page"
        };
      }
      
      const cleanPrice = price.replace(/[^\d.]/g, '');
      const numericPrice = parseFloat(cleanPrice);
      
      if (isNaN(numericPrice)) {
        return {
          success: false,
          error: `Invalid price format: ${price}`
        };
      }
      
      return {
        success: true,
        price: `$${numericPrice.toFixed(2)}`,
        numericPrice,
        availability: availability || "Available"
      };
      
    } catch (error) {
      console.error(`[Target] Error scraping price from ${url}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
};

/**
 * Walmart scraper - production implementation using Puppeteer
 */
const walmartScraper: RetailerScraper = {
  name: "Walmart",
  domains: ["walmart.com"],
  rateLimit: 4000, // 4 seconds between requests
  
  async scrapePrice(url: string): Promise<PriceScrapingResult> {
    let browser;
    try {
      console.log(`[Walmart] Scraping price from: ${url}`);
      
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      
      await page.setUserAgent(userAgentRotator.getRandomUserAgent());
      await page.setViewport({ width: 1366, height: 768 });
      
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Walmart price selectors
      const priceSelectors = [
        '[data-testid="price-wrap"] .f2',
        '.price-characteristic',
        '[itemprop="price"]',
        '.price-group .price',
        '.prod-PriceSection .price',
        '.price-display',
        '[data-automation-id="price"]'
      ];
      
      let price = null;
      let availability = null;
      
      for (const selector of priceSelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const text = await page.evaluate((el: any) => el.textContent?.trim(), element);
            if (text && (text.match(/\$[\d,]+\.?\d*/) || text.match(/[\d,]+\.?\d*/))) {
              const cleanText = text.replace(/[^\d.]/g, '');
              if (cleanText && !isNaN(parseFloat(cleanText))) {
                price = text.includes('$') ? text : `$${cleanText}`;
                break;
              }
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      // Check availability
      const availabilitySelectors = [
        '[data-testid="availability-status"]',
        '.availability-message',
        '.prod-ProductCTA .button-text',
        '.fulfillment-message'
      ];
      
      for (const selector of availabilitySelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const text = await page.evaluate((el: any) => el.textContent?.trim(), element);
            if (text) {
              availability = text;
              break;
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      if (!price) {
        return {
          success: false,
          error: "Could not find price on Walmart page"
        };
      }
      
      const cleanPrice = price.replace(/[^\d.]/g, '');
      const numericPrice = parseFloat(cleanPrice);
      
      if (isNaN(numericPrice)) {
        return {
          success: false,
          error: `Invalid price format: ${price}`
        };
      }
      
      return {
        success: true,
        price: `$${numericPrice.toFixed(2)}`,
        numericPrice,
        availability: availability || "Available"
      };
      
    } catch (error) {
      console.error(`[Walmart] Error scraping price from ${url}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
};

/**
 * Generic scraper for other retailers - uses basic HTML parsing
 */
const genericScraper: RetailerScraper = {
  name: "Generic",
  domains: ["*"], // Catch-all
  rateLimit: 5000, // 5 seconds between requests - more conservative
  
  async scrapePrice(url: string): Promise<PriceScrapingResult> {
    let browser;
    try {
      console.log(`[Generic] Scraping price from: ${url}`);
      
      browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--single-process',
          '--disable-gpu'
        ]
      });
      
      const page = await browser.newPage();
      
      await page.setUserAgent(userAgentRotator.getRandomUserAgent());
      await page.setViewport({ width: 1366, height: 768 });
      
      await page.goto(url, { 
        waitUntil: 'networkidle2',
        timeout: 30000 
      });
      
      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Generic price selectors that work on many sites
      const priceSelectors = [
        // Common price selectors
        '.price',
        '.product-price',
        '.item-price',
        '.sale-price',
        '.current-price',
        '.offer-price',
        '[class*="price"]',
        '[id*="price"]',
        
        // Currency symbols with numbers
        '*:contains("$")',
        '*:contains("€")',
        '*:contains("£")',
        
        // JSON-LD structured data
        'script[type="application/ld+json"]'
      ];
      
      let price = null;
      let availability = null;
      
      // First try specific selectors
      for (const selector of priceSelectors.slice(0, -1)) { // Exclude JSON-LD for now
        try {
          const elements = await page.$$(selector);
          for (const element of elements) {
            const text = await page.evaluate((el: any) => el.textContent?.trim(), element);
            if (text) {
              // Look for price patterns
              const priceMatch = text.match(/\$[\d,]+\.?\d*/);
              if (priceMatch) {
                price = priceMatch[0];
                break;
              }
              
              // Also check for just numbers that might be prices
              const numberMatch = text.match(/(\d{1,3}(?:,\d{3})*\.\d{2})/);
              if (numberMatch && parseFloat(numberMatch[1].replace(',', '')) > 0) {
                price = `$${numberMatch[1]}`;
                break;
              }
            }
          }
          if (price) break;
        } catch (error) {
          continue;
        }
      }
      
      // Try to extract from JSON-LD structured data
      if (!price) {
        try {
          const jsonLdElements = await page.$$('script[type="application/ld+json"]');
          for (const element of jsonLdElements) {
            const jsonText = await page.evaluate((el: any) => el.textContent, element);
            try {
              const data = JSON.parse(jsonText);
              if (data.offers && data.offers.price) {
                const numericPrice = parseFloat(data.offers.price);
                if (!isNaN(numericPrice)) {
                  price = `$${numericPrice.toFixed(2)}`;
                  break;
                }
              }
            } catch (parseError) {
              continue;
            }
          }
        } catch (error) {
          // Ignore JSON-LD parsing errors
        }
      }
      
      // Check availability - look for common availability indicators
      const availabilitySelectors = [
        '.availability',
        '.stock-status',
        '.in-stock',
        '.out-of-stock',
        '[class*="avail"]',
        '[class*="stock"]'
      ];
      
      for (const selector of availabilitySelectors) {
        try {
          const element = await page.$(selector);
          if (element) {
            const text = await page.evaluate((el: any) => el.textContent?.trim(), element);
            if (text) {
              availability = text;
              break;
            }
          }
        } catch (error) {
          continue;
        }
      }
      
      if (!price) {
        return {
          success: false,
          error: "Could not find price on page"
        };
      }
      
      const cleanPrice = price.replace(/[^\d.]/g, '');
      const numericPrice = parseFloat(cleanPrice);
      
      if (isNaN(numericPrice)) {
        return {
          success: false,
          error: `Invalid price format: ${price}`
        };
      }
      
      return {
        success: true,
        price: `$${numericPrice.toFixed(2)}`,
        numericPrice,
        availability: availability || "Available"
      };
      
    } catch (error) {
      console.error(`[Generic] Error scraping price from ${url}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }
};

/**
 * Registry of all available scrapers
 */
const scrapers: RetailerScraper[] = [
  amazonScraper,
  targetScraper,
  walmartScraper,
  genericScraper // Keep as last - it's the fallback
];

/**
 * Main price polling service class
 */
export class PricePollingService {
  private rateLimiter = new RateLimiter();
  private userAgentRotator = new UserAgentRotator();
  private isRunning = false;
  private cronJob: cron.ScheduledTask | null = null;
  private retryAttempts = 3;
  private retryDelay = 1000; // 1 second base delay

  /**
   * Get the appropriate scraper for a given URL
   */
  private getScraper(url: string): RetailerScraper {
    const urlObj = new URL(url);
    const domain = urlObj.hostname.toLowerCase();
    
    // Find the first scraper that matches this domain
    for (const scraper of scrapers) {
      if (scraper.domains.includes("*") || 
          scraper.domains.some(d => domain.includes(d.toLowerCase()))) {
        return scraper;
      }
    }
    
    // Fallback to generic scraper
    return genericScraper;
  }

  /**
   * Scrape price for a single product with retry logic
   */
  async scrapeSinglePrice(item: WishlistItem): Promise<PriceScrapingResult> {
    const scraper = this.getScraper(item.productUrl);
    const domain = new URL(item.productUrl).hostname;
    
    // Apply rate limiting
    await this.rateLimiter.waitForRateLimit(domain, scraper.rateLimit);
    
    console.log(`[PricePoller] Scraping ${item.title} from ${scraper.name}`);
    
    // Retry logic
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const result = await scraper.scrapePrice(item.productUrl);
        
        if (result.success) {
          console.log(`[PricePoller] ✓ Found price for ${item.title}: ${result.price}`);
          return result;
        } else {
          console.log(`[PricePoller] ✗ Attempt ${attempt} failed for ${item.title}: ${result.error}`);
          
          if (attempt < this.retryAttempts) {
            const delay = this.retryDelay * Math.pow(2, attempt - 1); // Exponential backoff
            console.log(`[PricePoller] Retrying in ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
          
          return result; // Return the last failure result
        }
        
      } catch (error) {
        console.error(`[PricePoller] Attempt ${attempt} error for ${item.title}:`, error);
        
        if (attempt < this.retryAttempts) {
          const delay = this.retryDelay * Math.pow(2, attempt - 1);
          console.log(`[PricePoller] Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error"
        };
      }
    }
    
    // This should never be reached, but just in case
    return {
      success: false,
      error: "Max retry attempts exceeded"
    };
  }

  /**
   * Run price checks for all trackable items
   */
  async runPriceCheck(): Promise<void> {
    if (this.isRunning) {
      console.log("[PricePoller] Price check already running, skipping...");
      return;
    }

    this.isRunning = true;
    console.log("[PricePoller] Starting scheduled price check...");

    try {
      // Get all items that need price tracking
      // For simplicity, we'll get items from all wishlists
      // In production, you might want to limit this or prioritize certain items
      
      const trackableItems: WishlistItem[] = [];
      
      // This is a simplified approach - in production you'd have a more efficient way
      // to get all items that need price tracking
      const sampleUserId = 1; // Demo user
      const userWishlists = await storage.getWishlists(sampleUserId);
      
      for (const wishlist of userWishlists) {
        const items = await storage.getWishlistItems(wishlist.id);
        trackableItems.push(...items);
      }

      console.log(`[PricePoller] Found ${trackableItems.length} items to check`);

      let successCount = 0;
      let errorCount = 0;

      // Process each item
      for (const item of trackableItems) {
        try {
          const result = await this.scrapeSinglePrice(item);
          
          if (result.success && result.price && result.numericPrice) {
            // Update the item's price and trigger alerts
            await updateItemPrice(item.id, result.price, result.numericPrice);
            successCount++;
          } else {
            errorCount++;
          }
          
          // Small delay between items to be respectful
          await new Promise(resolve => setTimeout(resolve, 500));
          
        } catch (error) {
          console.error(`[PricePoller] Error processing item ${item.id}:`, error);
          errorCount++;
        }
      }

      console.log(`[PricePoller] Completed price check: ${successCount} successful, ${errorCount} errors`);

    } catch (error) {
      console.error("[PricePoller] Error during price check:", error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * Start the automated price polling service
   * Runs every 4 hours by default
   */
  startScheduler(cronExpression: string = '0 */4 * * *'): void {
    if (this.cronJob) {
      console.log("[PricePoller] Scheduler already running");
      return;
    }

    console.log(`[PricePoller] Starting scheduler with expression: ${cronExpression}`);
    
    // Validate cron expression
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: ${cronExpression}`);
    }

    this.cronJob = cron.schedule(cronExpression, async () => {
      console.log("[PricePoller] Cron job triggered");
      await this.runPriceCheck();
    });

    console.log("[PricePoller] Scheduler started successfully");
  }

  /**
   * Stop the automated price polling service
   */
  stopScheduler(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob.destroy();
      this.cronJob = null;
      console.log("[PricePoller] Scheduler stopped");
    }
  }

  /**
   * Get the current status of the polling service
   */
  getStatus(): { running: boolean; isJobRunning: boolean } {
    return {
      running: this.cronJob !== null,
      isJobRunning: this.isRunning
    };
  }

  /**
   * Run a manual price check for specific items
   */
  async runManualCheck(itemIds: number[]): Promise<{ success: number; errors: number }> {
    console.log(`[PricePoller] Running manual check for ${itemIds.length} items`);
    
    let successCount = 0;
    let errorCount = 0;

    for (const itemId of itemIds) {
      try {
        const item = await storage.getWishlistItem(itemId);
        if (!item) {
          console.error(`[PricePoller] Item ${itemId} not found`);
          errorCount++;
          continue;
        }

        const result = await this.scrapeSinglePrice(item);
        
        if (result.success && result.price && result.numericPrice) {
          await updateItemPrice(item.id, result.price, result.numericPrice);
          successCount++;
        } else {
          errorCount++;
        }

        // Small delay between items
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`[PricePoller] Error in manual check for item ${itemId}:`, error);
        errorCount++;
      }
    }

    console.log(`[PricePoller] Manual check completed: ${successCount} successful, ${errorCount} errors`);
    return { success: successCount, errors: errorCount };
  }
}

// Export singleton instance
export const pricePollingService = new PricePollingService();

/**
 * Initialize the price polling service
 * Call this when starting your application
 */
export function initializePricePolling(): void {
  console.log("[PricePoller] Initializing price polling service...");
  
  // Start the scheduler - runs every 4 hours
  // You can customize this based on your needs:
  // '0 */2 * * *' - every 2 hours
  // '0 0 */6 * * *' - every 6 hours  
  // '0 0 0 * * *' - once daily at midnight
  pricePollingService.startScheduler('0 */4 * * *');
  
  console.log("[PricePoller] Price polling service initialized");
}

/**
 * Cleanup function - call this when shutting down your application
 */
export function shutdownPricePolling(): void {
  console.log("[PricePoller] Shutting down price polling service...");
  pricePollingService.stopScheduler();
  console.log("[PricePoller] Price polling service shut down");
}