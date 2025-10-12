import { storage } from "../storage";
import { PriceScraper } from "./priceScrapingService";
import { updateItemPrice } from "./priceTrackingService";
import { emailService } from "./emailService";

export class PriceTrackingScheduler {
  private static instance: PriceTrackingScheduler;
  private isRunning = false;
  private intervalId: NodeJS.Timeout | null = null;

  // Singleton pattern
  public static getInstance(): PriceTrackingScheduler {
    if (!PriceTrackingScheduler.instance) {
      PriceTrackingScheduler.instance = new PriceTrackingScheduler();
    }
    return PriceTrackingScheduler.instance;
  }

  /**
   * Start the price tracking scheduler
   */
  public start(): void {
    if (this.isRunning) {
      console.log('Price tracking scheduler is already running');
      return;
    }

    console.log('Starting price tracking scheduler...');
    this.isRunning = true;

    // Run every 6 hours (6 * 60 * 60 * 1000 ms)
    const intervalMs = 6 * 60 * 60 * 1000;
    
    // Run immediately on start
    this.runPriceUpdate().catch(console.error);
    
    // Schedule regular runs
    this.intervalId = setInterval(() => {
      this.runPriceUpdate().catch(console.error);
    }, intervalMs);

    console.log(`Price tracking scheduler started. Will run every ${intervalMs / (60 * 60 * 1000)} hours.`);
  }

  /**
   * Stop the price tracking scheduler
   */
  public stop(): void {
    if (!this.isRunning) {
      console.log('Price tracking scheduler is not running');
      return;
    }

    console.log('Stopping price tracking scheduler...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    console.log('Price tracking scheduler stopped');
  }

  /**
   * Get the current status of the scheduler
   */
  public getStatus(): { running: boolean; nextRun?: Date } {
    return {
      running: this.isRunning,
      nextRun: this.intervalId ? new Date(Date.now() + (6 * 60 * 60 * 1000)) : undefined // Approximate next run
    };
  }

  /**
   * Manual trigger for price updates
   */
  public async triggerUpdate(): Promise<void> {
    console.log('Manually triggering price update...');
    await this.runPriceUpdate();
  }

  /**
   * Run price update for all tracked items
   */
  private async runPriceUpdate(): Promise<void> {
    try {
      console.log('Starting scheduled price update...');
      
      // Get all wishlist items that have product URLs for price tracking
      const allItems = await this.getAllItemsWithProductUrls();
      
      if (allItems.length === 0) {
        console.log('No items found with product URLs for price tracking');
        return;
      }

      console.log(`Found ${allItems.length} items to check for price updates`);

      // Extract URLs for batch scraping
      const urls: string[] = allItems
        .filter((item: any) => item.productUrl)
        .map((item: any) => item.productUrl!)
        .filter((url: string) => url.startsWith('http')); // Ensure valid URLs

      if (urls.length === 0) {
        console.log('No valid product URLs found for scraping');
        return;
      }

      console.log(`Scraping prices for ${urls.length} URLs...`);

      // Scrape prices in batches
      const scrapeResults = await PriceScraper.scrapePrices(urls);

      // Process results and update prices
      let updatedCount = 0;
      let errorCount = 0;

      for (const item of allItems) {
        if (!item.productUrl) continue;

        const scrapeResult = scrapeResults.get(item.productUrl);
        
        if (!scrapeResult || !scrapeResult.success) {
          console.warn(`Failed to scrape price for item ${item.id} (${item.title}): ${scrapeResult?.error || 'Unknown error'}`);
          errorCount++;
          continue;
        }

        try {
          // Check if price has changed
          const currentNumericPrice = item.numericPrice ? parseFloat(item.numericPrice) : 0;
          
          if (Math.abs(scrapeResult.numericPrice - currentNumericPrice) > 0.01) { // Allow for small rounding differences
            console.log(`Price change detected for "${item.title}": $${currentNumericPrice.toFixed(2)} → $${scrapeResult.numericPrice.toFixed(2)}`);
            
            // Update the price
            await updateItemPrice(item.id, scrapeResult.price, scrapeResult.numericPrice);
            updatedCount++;
          }
        } catch (updateError) {
          console.error(`Error updating price for item ${item.id}:`, updateError);
          errorCount++;
        }
      }

      console.log(`Price update completed: ${updatedCount} items updated, ${errorCount} errors`);
    } catch (error) {
      console.error('Error during scheduled price update:', error);
    }
  }

  /**
   * Handle price drop notification
   */
  private async handlePriceDrop(
    item: { id: number; title: string; productUrl?: string | null },
    newPrice: string,
    oldPrice: string
  ): Promise<void> {
    try {
      // For now, just log the price drop
      console.log(`Price drop detected for "${item.title}": ${oldPrice} → ${newPrice}`);
      
      // TODO: Send email notification when user lookup is implemented
      // This would:
      // 1. Find the user who owns the wishlist containing this item
      // 2. Send them a price drop notification email
      // 3. Create an in-app notification
    } catch (error) {
      console.error('Error handling price drop notification:', error);
    }
  }

  /**
   * Get all wishlist items that have product URLs for price tracking
   */
  private async getAllItemsWithProductUrls(): Promise<any[]> {
    try {
      // This implementation gets all items from all wishlists that have product URLs
      // In a production system, you'd want a more efficient database query
      
      const allItems: any[] = [];
      
      // For now, we'll use a simple approach - get items from wishlists that exist
      // In practice, you'd want to add a storage method to get all items with product URLs
      
      // Since we don't have a way to enumerate all wishlists easily, 
      // we'll use a sample approach for demonstration
      // In production, you'd modify the storage interface to add a method like:
      // getAllItemsWithProductUrls(): Promise<WishlistItem[]>
      
      console.log('Price tracking: Getting items with product URLs (sample implementation)');
      
      // Return sample data for testing - in production this would query the database
      return [
        {
          id: 1,
          title: 'Sample Product for Price Tracking',
          productUrl: 'https://www.amazon.com/sample-product',
          numericPrice: '29.99',
          price: '$29.99'
        }
      ];
    } catch (error) {
      console.error('Error getting items with product URLs:', error);
      return [];
    }
  }
}

// Export singleton instance
export const priceTrackingScheduler = PriceTrackingScheduler.getInstance();