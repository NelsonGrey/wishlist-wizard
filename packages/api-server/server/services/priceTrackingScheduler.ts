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
      
      // For now, just log that the scheduler is running
      // The actual implementation would query the database for items to track
      console.log('Price tracking scheduler running...');
      
      // TODO: Implement full price tracking when database access is stabilized
      // This would:
      // 1. Query items with productUrl
      // 2. Batch scrape prices using PriceScraper
      // 3. Update changed prices using updateItemPrice
      // 4. Send notifications for price drops
      
      console.log('Price update completed (placeholder implementation)');
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
   * Get scheduler status
   */
  public getStatus(): { isRunning: boolean; nextRun?: Date } {
    return {
      isRunning: this.isRunning,
      nextRun: this.isRunning ? new Date(Date.now() + 6 * 60 * 60 * 1000) : undefined
    };
  }
}

// Export singleton instance
export const priceTrackingScheduler = PriceTrackingScheduler.getInstance();