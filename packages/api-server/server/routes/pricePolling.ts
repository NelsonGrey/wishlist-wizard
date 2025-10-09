import express from 'express';
import { pricePollingService } from '../services/pricePollingService.js';
import { firebaseAuthMiddleware as isAuthenticated } from '../firebase-auth-simple';

const router = express.Router();

/**
 * Get price polling service status
 */
router.get('/status', isAuthenticated, (req, res) => {
  try {
    const status = pricePollingService.getStatus();
    res.json({
      success: true,
      data: status
    });
  } catch (error) {
    console.error('Error getting price polling status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get polling status'
    });
  }
});

/**
 * Trigger manual price check for all items
 */
router.post('/check/all', isAuthenticated, async (req, res) => {
  try {
    // Only allow admins to trigger full checks
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    // Run the check in the background
    pricePollingService.runPriceCheck().catch(error => {
      console.error('Background price check failed:', error);
    });

    res.json({
      success: true,
      message: 'Price check started in background'
    });
  } catch (error) {
    console.error('Error starting manual price check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start price check'
    });
  }
});

/**
 * Trigger manual price check for specific items
 */
router.post('/check/items', isAuthenticated, async (req, res) => {
  try {
    const { itemIds } = req.body;

    if (!Array.isArray(itemIds) || itemIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'itemIds array is required'
      });
    }

    // Validate that itemIds are numbers
    const validItemIds = itemIds.filter(id => typeof id === 'number' && id > 0);
    if (validItemIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid item IDs provided'
      });
    }

    // Limit to 10 items per request to prevent abuse
    if (validItemIds.length > 10) {
      return res.status(400).json({
        success: false,
        error: 'Maximum 10 items per request'
      });
    }

    const result = await pricePollingService.runManualCheck(validItemIds);

    res.json({
      success: true,
      data: result,
      message: `Checked ${validItemIds.length} items: ${result.success} successful, ${result.errors} errors`
    });
  } catch (error) {
    console.error('Error running manual item check:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check item prices'
    });
  }
});

/**
 * Start the price polling scheduler
 */
router.post('/start', isAuthenticated, (req, res) => {
  try {
    // Only allow admins to control the scheduler
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    const { cronExpression } = req.body;
    
    if (cronExpression) {
      pricePollingService.startScheduler(cronExpression);
    } else {
      pricePollingService.startScheduler(); // Use default schedule
    }

    res.json({
      success: true,
      message: 'Price polling scheduler started',
      data: pricePollingService.getStatus()
    });
  } catch (error) {
    console.error('Error starting price polling scheduler:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start scheduler'
    });
  }
});

/**
 * Stop the price polling scheduler
 */
router.post('/stop', isAuthenticated, (req, res) => {
  try {
    // Only allow admins to control the scheduler
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Admin access required'
      });
    }

    pricePollingService.stopScheduler();

    res.json({
      success: true,
      message: 'Price polling scheduler stopped',
      data: pricePollingService.getStatus()
    });
  } catch (error) {
    console.error('Error stopping price polling scheduler:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to stop scheduler'
    });
  }
});

/**
 * Get price polling history/logs
 */
router.get('/history', isAuthenticated, async (req, res) => {
  try {
    // For now, return a placeholder
    // In production, you'd store polling logs in the database
    res.json({
      success: true,
      data: {
        message: 'Price polling history feature coming soon',
        currentStatus: pricePollingService.getStatus()
      }
    });
  } catch (error) {
    console.error('Error getting price polling history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get polling history'
    });
  }
});

export default router;