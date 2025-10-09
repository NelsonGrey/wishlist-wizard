import { Router } from "express";
import { storage } from "../storage";
import { PriceScraper } from "../services/priceScrapingService";
import { priceTrackingService } from "../services/priceTrackingService.firestore";
import { priceTrackingScheduler } from "../services/priceTrackingScheduler";
import { firebaseAuthMiddleware as isAuthenticated } from "../firebase-auth-simple";

const router = Router();

/**
 * Manual price update for a specific item
 */
router.post("/update-price/:itemId", isAuthenticated, async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId);
    if (isNaN(itemId)) {
      return res.status(400).json({ error: "Invalid item ID" });
    }

    // Get the item
    const item = await storage.getWishlistItem(itemId);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }

    if (!item.productUrl) {
      return res.status(400).json({ error: "Item has no product URL to scrape" });
    }

    // Scrape the current price
    const scrapedPrice = await PriceScraper.scrapePrice(item.productUrl);
    
    if (!scrapedPrice.success) {
      return res.status(400).json({ 
        error: "Failed to scrape price", 
        details: scrapedPrice.error 
      });
    }

    // Update the price using the new service
    const updateResult = await priceTrackingService.updateItemPrice(item.id, 'manual');
    
    if (!updateResult.success) {
      return res.status(400).json({ 
        error: "Failed to update price", 
        details: updateResult.error 
      });
    }

    res.json({
      success: true,
      oldPrice: updateResult.oldPrice,
      newPrice: updateResult.newPrice,
      item: updateResult.item
    });
  } catch (error) {
    console.error("Error updating item price:", error);
    res.status(500).json({ error: "Failed to update price" });
  }
});

/**
 * Batch price update for multiple items
 */
router.post("/update-prices", isAuthenticated, async (req, res) => {
  try {
    const { itemIds } = req.body;
    
    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({ error: "Please provide an array of item IDs" });
    }

    if (itemIds.length > 20) {
      return res.status(400).json({ error: "Maximum 20 items allowed per batch" });
    }

    const results = [];
    
    for (const itemId of itemIds) {
      const id = parseInt(itemId);
      if (isNaN(id)) continue;

      try {
        const item = await storage.getWishlistItem(id);
        if (!item || !item.productUrl) {
          results.push({ itemId: id, success: false, error: "Item not found or no URL" });
          continue;
        }

        const scrapedPrice = await PriceScraper.scrapePrice(item.productUrl);
        
        if (!scrapedPrice.success) {
          results.push({ 
            itemId: id, 
            success: false, 
            error: scrapedPrice.error 
          });
          continue;
        }

        const updateResult = await priceTrackingService.updateItemPrice(item.id, 'batch');
        
        results.push({
          itemId: id,
          success: updateResult.success,
          oldPrice: updateResult.oldPrice,
          newPrice: updateResult.newPrice,
          error: updateResult.error
        });

        // Add delay between requests to be respectful
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        results.push({ 
          itemId: id, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    res.json({ results });
  } catch (error) {
    console.error("Error updating item prices:", error);
    res.status(500).json({ error: "Failed to update prices" });
  }
});

/**
 * Get price tracking scheduler status
 */
router.get("/scheduler/status", isAuthenticated, async (req, res) => {
  try {
    const status = priceTrackingScheduler.getStatus();
    res.json(status);
  } catch (error) {
    console.error("Error getting scheduler status:", error);
    res.status(500).json({ error: "Failed to get scheduler status" });
  }
});

/**
 * Start price tracking scheduler
 */
router.post("/scheduler/start", isAuthenticated, async (req, res) => {
  try {
    priceTrackingScheduler.start();
    res.json({ message: "Price tracking scheduler started" });
  } catch (error) {
    console.error("Error starting scheduler:", error);
    res.status(500).json({ error: "Failed to start scheduler" });
  }
});

/**
 * Stop price tracking scheduler
 */
router.post("/scheduler/stop", isAuthenticated, async (req, res) => {
  try {
    priceTrackingScheduler.stop();
    res.json({ message: "Price tracking scheduler stopped" });
  } catch (error) {
    console.error("Error stopping scheduler:", error);
    res.status(500).json({ error: "Failed to stop scheduler" });
  }
});

/**
 * Trigger manual price update run
 */
router.post("/scheduler/trigger", isAuthenticated, async (req, res) => {
  try {
    // Run in background
    priceTrackingScheduler.triggerUpdate().catch(console.error);
    res.json({ message: "Price update triggered" });
  } catch (error) {
    console.error("Error triggering price update:", error);
    res.status(500).json({ error: "Failed to trigger price update" });
  }
});

export { router as priceTrackingRoutes };