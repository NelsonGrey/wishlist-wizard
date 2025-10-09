import * as cron from 'node-cron';
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
 * Amazon scraper - basic implementation
 */
const amazonScraper: RetailerScraper = {
  name: "Amazon",
  domains: ["amazon.com", "amazon.ca", "amazon.co.uk", "amazon.de"],
  rateLimit: 2000, // 2 seconds between requests
  
  async scrapePrice(url: string): Promise<PriceScrapingResult> {
    try {
      // Note: This is a simplified example. In production, you'd need:
      // 1. Proper user-agent rotation
      // 2. Proxy support
      // 3. CAPTCHA handling
      // 4. Respect robots.txt
      // 5. Use official APIs when available
      
      console.log(`[Amazon] Scraping price from: ${url}`);
      
      // For demo purposes, simulate price changes
      // In production, you'd use fetch() or a web scraping library like Puppeteer
      const mockPrices = ["$299.99", "$289.99", "$279.99", "$309.99"];
      const randomPrice = mockPrices[Math.floor(Math.random() * mockPrices.length)];
      const numericPrice = parseFloat(randomPrice.replace('$', ''));
      
      return {
        success: true,
        price: randomPrice,
        numericPrice,
        availability: "In Stock"
      };
      
    } catch (error) {
      console.error(`[Amazon] Error scraping price from ${url}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
};

/**
 * Target scraper - basic implementation
 */
const targetScraper: RetailerScraper = {
  name: "Target",
  domains: ["target.com"],
  rateLimit: 1500, // 1.5 seconds between requests
  
  async scrapePrice(url: string): Promise<PriceScrapingResult> {
    try {
      console.log(`[Target] Scraping price from: ${url}`);
      
      // Mock implementation
      const mockPrices = ["$199.99", "$189.99", "$179.99", "$209.99"];
      const randomPrice = mockPrices[Math.floor(Math.random() * mockPrices.length)];
      const numericPrice = parseFloat(randomPrice.replace('$', ''));
      
      return {
        success: true,
        price: randomPrice,
        numericPrice,
        availability: "Available"
      };
      
    } catch (error) {
      console.error(`[Target] Error scraping price from ${url}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
};

/**
 * Walmart scraper - basic implementation
 */
const walmartScraper: RetailerScraper = {
  name: "Walmart",
  domains: ["walmart.com"],
  rateLimit: 3000, // 3 seconds between requests
  
  async scrapePrice(url: string): Promise<PriceScrapingResult> {
    try {
      console.log(`[Walmart] Scraping price from: ${url}`);
      
      // Mock implementation
      const mockPrices = ["$149.99", "$139.99", "$129.99", "$159.99"];
      const randomPrice = mockPrices[Math.floor(Math.random() * mockPrices.length)];
      const numericPrice = parseFloat(randomPrice.replace('$', ''));
      
      return {
        success: true,
        price: randomPrice,
        numericPrice,
        availability: "In Stock"
      };
      
    } catch (error) {
      console.error(`[Walmart] Error scraping price from ${url}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
  }
};

/**
 * Generic scraper for other retailers
 */
const genericScraper: RetailerScraper = {
  name: "Generic",
  domains: ["*"], // Catch-all
  rateLimit: 5000, // 5 seconds between requests - more conservative
  
  async scrapePrice(url: string): Promise<PriceScrapingResult> {
    try {
      console.log(`[Generic] Scraping price from: ${url}`);
      
      // Mock implementation - would use a more general scraping approach
      const mockPrices = ["$99.99", "$89.99", "$79.99", "$109.99"];
      const randomPrice = mockPrices[Math.floor(Math.random() * mockPrices.length)];
      const numericPrice = parseFloat(randomPrice.replace('$', ''));
      
      return {
        success: true,
        price: randomPrice,
        numericPrice,
        availability: "Available"
      };
      
    } catch (error) {
      console.error(`[Generic] Error scraping price from ${url}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
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
  private isRunning = false;
  private cronJob: cron.ScheduledTask | null = null;

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
   * Scrape price for a single product
   */
  async scrapeSinglePrice(item: WishlistItem): Promise<PriceScrapingResult> {
    try {
      const scraper = this.getScraper(item.productUrl);
      const domain = new URL(item.productUrl).hostname;
      
      // Apply rate limiting
      await this.rateLimiter.waitForRateLimit(domain, scraper.rateLimit);
      
      console.log(`[PricePoller] Scraping ${item.title} from ${scraper.name}`);
      
      const result = await scraper.scrapePrice(item.productUrl);
      
      if (result.success && result.price && result.numericPrice) {
        console.log(`[PricePoller] ✓ Found price for ${item.title}: ${result.price}`);
      } else {
        console.log(`[PricePoller] ✗ Failed to get price for ${item.title}: ${result.error}`);
      }
      
      return result;
      
    } catch (error) {
      console.error(`[PricePoller] Error scraping ${item.title}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error"
      };
    }
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
    }, {
      scheduled: true,
      name: 'price-polling-job'
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
  getStatus(): { running: boolean; nextRun?: Date; isJobRunning: boolean } {
    return {
      running: this.cronJob !== null,
      nextRun: this.cronJob?.nextDate()?.toDate(),
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