// Firebase-Native Price Tracking Service
// Leverages Firebase Functions, Firestore, Cloud Scheduler, and Firebase Admin

import { onSchedule } from 'firebase-functions/v2/scheduler';
import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { initializeApp, getApps } from 'firebase-admin/app';
import { logger } from 'firebase-functions/v2';
import { sendNotificationToUser } from './fcm';
import { sendEmail, gmailAppPassword } from './email';

// Initialize Firebase Admin (safe for multiple imports)
const app = getApps().length === 0 ? initializeApp() : getApps()[0];
const db = getFirestore(app);
const auth = getAuth(app);

// Simple price scraping interface (implement as needed)
interface PriceScrapeResult {
  success: boolean;
  price?: string;
  error?: string;
}

// Mock price scraper — replace with real implementation
const priceScraper = {
  async scrapePrice(_url: string): Promise<PriceScrapeResult> {
    return { success: true, price: '29.99' };
  }
};

/**
 * Firebase Cloud Function - Scheduled Price Tracking
 * Runs every hour to check for price changes on tracked items
 */
export const scheduledPriceCheck = onSchedule({
  schedule: 'every 60 minutes',
  timeZone: 'America/New_York',
  memory: '1GiB',
  timeoutSeconds: 540,
  secrets: [gmailAppPassword],
}, async (event) => {
  logger.info('Starting scheduled price check', { timestamp: event.scheduleTime });
  
  try {
    // Get all active price alerts from Firestore
    const alertsSnapshot = await db.collection('priceAlerts')
      .where('active', '==', true)
      .where('nextCheck', '<=', Timestamp.now())
      .limit(100) // Process in batches
      .get();
    
    logger.info(`Found ${alertsSnapshot.size} alerts to check`);
    
    const batch = db.batch();
    const notifications: Array<{
      userId: string;
      title: string;
      body: string;
      data: any;
    }> = [];
    
    // Process each alert
    for (const alertDoc of alertsSnapshot.docs) {
      const alert = alertDoc.data();
      const alertId = alertDoc.id;
      
      try {
        logger.info(`Checking price for alert ${alertId}`, { 
          productUrl: alert.productUrl,
          currentPrice: alert.currentPrice 
        });
        
        // Scrape current price
        const scrapeResult = await priceScraper.scrapePrice(alert.productUrl);
        
        if (scrapeResult.success && scrapeResult.price) {
          const newPrice = parseFloat(scrapeResult.price.replace(/[^0-9.]/g, ''));
          const currentPrice = alert.currentPrice || 0;
          
          // Check if price dropped below target
          const priceDropped = alert.targetPrice && newPrice <= alert.targetPrice;
          const significantChange = Math.abs(newPrice - currentPrice) / currentPrice > 0.05; // 5% change
          
          if (priceDropped || significantChange) {
            // Log price history
            await db.collection('priceHistory').add({
              alertId: alertId,
              userId: alert.userId,
              productUrl: alert.productUrl,
              oldPrice: currentPrice,
              newPrice: newPrice,
              change: newPrice - currentPrice,
              changePercent: ((newPrice - currentPrice) / currentPrice) * 100,
              timestamp: FieldValue.serverTimestamp(),
              reason: priceDropped ? 'target_reached' : 'significant_change'
            });
            
            // Create notification
            notifications.push({
              userId: alert.userId,
              title: priceDropped ? '🎉 Price Target Reached!' : '📉 Price Change Alert',
              body: `${alert.productTitle || 'Item'} is now $${newPrice.toFixed(2)} (was $${currentPrice.toFixed(2)})`,
              data: {
                type: 'price_alert',
                alertId: alertId,
                productUrl: alert.productUrl,
                oldPrice: currentPrice,
                newPrice: newPrice,
                productTitle: alert.productTitle
              }
            });
          }
          
          // Update alert with new price and next check time
          batch.update(alertDoc.ref, {
            currentPrice: newPrice,
            lastChecked: FieldValue.serverTimestamp(),
            nextCheck: Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000)), // Next hour
            checksCount: FieldValue.increment(1),
            lastScrapeSuccess: true,
            lastError: FieldValue.delete()
          });
          
        } else {
          // Update with error info
          batch.update(alertDoc.ref, {
            lastChecked: FieldValue.serverTimestamp(),
            lastScrapeSuccess: false,
            lastError: scrapeResult.error || 'Failed to scrape price',
            failedChecks: FieldValue.increment(1)
          });
        }
        
      } catch (error) {
        logger.error(`Error processing alert ${alertId}:`, error);
        
        // Update alert with error
        batch.update(alertDoc.ref, {
          lastChecked: FieldValue.serverTimestamp(),
          lastScrapeSuccess: false,
          lastError: error instanceof Error ? error.message : 'Unknown error',
          failedChecks: FieldValue.increment(1)
        });
      }
    }
    
    // Commit all updates
    await batch.commit();
    
    // Send notifications
    await sendPriceAlertNotifications(notifications);
    
    logger.info(`Price check completed. Processed ${alertsSnapshot.size} alerts, sent ${notifications.length} notifications`);
    
  } catch (error) {
    logger.error('Scheduled price check failed:', error);
    throw new HttpsError('internal', 'Price check failed', error instanceof Error ? error.message : 'Unknown error');
  }
});

/**
 * Firebase Cloud Function - Create Price Alert
 * Callable function to create a new price alert for authenticated users
 */
export const createPriceAlert = onCall({
  enforceAppCheck: false // Set to true in production
}, async (request: CallableRequest<{
  productUrl: string;
  productTitle?: string;
  targetPrice?: number;
  currentPrice?: number;
  imageUrl?: string;
  store?: string;
}>) => {
  
  // Verify authentication
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { productUrl, productTitle, targetPrice, currentPrice, imageUrl, store } = request.data;
  
  if (!productUrl) {
    throw new HttpsError('invalid-argument', 'Product URL is required');
  }
  
  try {
    logger.info(`Creating price alert for user ${request.auth.uid}`, { productUrl });
    
    // Scrape initial price if not provided
    let initialPrice = currentPrice;
    if (!initialPrice) {
      const scrapeResult = await priceScraper.scrapePrice(productUrl);
      if (scrapeResult.success && scrapeResult.price) {
        initialPrice = parseFloat(scrapeResult.price.replace(/[^0-9.]/g, ''));
      }
    }
    
    // Create price alert document
    const alertData = {
      userId: request.auth.uid,
      productUrl,
      productTitle: productTitle || 'Tracked Item',
      targetPrice: targetPrice || null,
      currentPrice: initialPrice || null,
      imageUrl: imageUrl || null,
      store: store || null,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      lastChecked: null,
      nextCheck: Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000)), // Check in 1 hour
      checksCount: 0,
      failedChecks: 0,
      lastScrapeSuccess: null,
      lastError: null
    };
    
    const alertRef = await db.collection('priceAlerts').add(alertData);
    
    // Create initial price history entry
    if (initialPrice) {
      await db.collection('priceHistory').add({
        alertId: alertRef.id,
        userId: request.auth.uid,
        productUrl,
        oldPrice: null,
        newPrice: initialPrice,
        change: 0,
        changePercent: 0,
        timestamp: FieldValue.serverTimestamp(),
        reason: 'initial_tracking'
      });
    }
    
    // Create in-app notification
    await createInAppNotification(request.auth.uid, {
      title: '✅ Price Alert Created',
      body: `Now tracking ${productTitle || 'item'} for price changes`,
      data: {
        type: 'price_alert_created',
        alertId: alertRef.id,
        productUrl
      }
    });
    
    logger.info(`Price alert created with ID ${alertRef.id}`);
    
    return { 
      success: true, 
      alertId: alertRef.id,
      message: 'Price alert created successfully' 
    };
    
  } catch (error) {
    logger.error('Error creating price alert:', error);
    throw new HttpsError('internal', 'Failed to create price alert', error instanceof Error ? error.message : 'Unknown error');
  }
});

/**
 * Firebase Cloud Function - Get User Price Alerts
 * Callable function to retrieve user's price alerts with real-time updates
 */
export const getUserPriceAlerts = onCall({
  enforceAppCheck: false
}, async (request: CallableRequest<{ limit?: number; includeInactive?: boolean }>) => {
  
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  try {
    const { limit = 50, includeInactive = false } = request.data || {};
    
    let query = db.collection('priceAlerts')
      .where('userId', '==', request.auth.uid)
      .orderBy('createdAt', 'desc')
      .limit(limit);
    
    if (!includeInactive) {
      query = query.where('active', '==', true);
    }
    
    const snapshot = await query.get();
    
    const alerts = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate(),
      lastChecked: doc.data().lastChecked?.toDate(),
      nextCheck: doc.data().nextCheck?.toDate()
    }));
    
    return { success: true, alerts };
    
  } catch (error) {
    logger.error('Error getting price alerts:', error);
    throw new HttpsError('internal', 'Failed to get price alerts', error instanceof Error ? error.message : 'Unknown error');
  }
});

/**
 * Firebase Cloud Function - Update Price Alert
 * Callable function to update price alert settings
 */
export const updatePriceAlert = onCall({
  enforceAppCheck: false
}, async (request: CallableRequest<{
  alertId: string;
  targetPrice?: number;
  active?: boolean;
}>) => {
  
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { alertId, targetPrice, active } = request.data;
  
  if (!alertId) {
    throw new HttpsError('invalid-argument', 'Alert ID is required');
  }
  
  try {
    const alertRef = db.collection('priceAlerts').doc(alertId);
    const alertDoc = await alertRef.get();
    
    if (!alertDoc.exists) {
      throw new HttpsError('not-found', 'Price alert not found');
    }
    
    const alertData = alertDoc.data();
    if (!alertData || alertData.userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Not authorized to update this alert');
    }
    
    const updateData: any = {
      updatedAt: FieldValue.serverTimestamp()
    };
    
    if (targetPrice !== undefined) {
      updateData.targetPrice = targetPrice;
    }
    
    if (active !== undefined) {
      updateData.active = active;
    }
    
    await alertRef.update(updateData);
    
    return { success: true, message: 'Price alert updated successfully' };
    
  } catch (error) {
    logger.error('Error updating price alert:', error);
    throw new HttpsError('internal', 'Failed to update price alert', error instanceof Error ? error.message : 'Unknown error');
  }
});

/**
 * Firebase Cloud Function - Delete Price Alert
 * Callable function to delete a price alert
 */
export const deletePriceAlert = onCall({
  enforceAppCheck: false
}, async (request: CallableRequest<{ alertId: string }>) => {
  
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { alertId } = request.data;
  
  if (!alertId) {
    throw new HttpsError('invalid-argument', 'Alert ID is required');
  }
  
  try {
    const alertRef = db.collection('priceAlerts').doc(alertId);
    const alertDoc = await alertRef.get();
    
    if (!alertDoc.exists) {
      throw new HttpsError('not-found', 'Price alert not found');
    }
    
    const alertData = alertDoc.data();
    if (!alertData || alertData.userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Not authorized to delete this alert');
    }
    
    // Delete the alert and related price history
    const batch = db.batch();
    
    // Delete the alert
    batch.delete(alertRef);
    
    // Delete related price history
    const historySnapshot = await db.collection('priceHistory')
      .where('alertId', '==', alertId)
      .get();
    
    historySnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    await batch.commit();
    
    return { success: true, message: 'Price alert deleted successfully' };
    
  } catch (error) {
    logger.error('Error deleting price alert:', error);
    throw new HttpsError('internal', 'Failed to delete price alert', error instanceof Error ? error.message : 'Unknown error');
  }
});

/**
 * Firebase Firestore Trigger - New Price Alert Created
 * Automatically triggered when a new price alert is created
 */
export const onPriceAlertCreated = onDocumentCreated({
  document: 'priceAlerts/{alertId}',
  secrets: [gmailAppPassword],
}, async (event) => {
  const alertData = event.data?.data();
  const alertId = event.params.alertId;
  
  if (!alertData) return;
  
  logger.info(`New price alert created: ${alertId}`, { userId: alertData.userId });
  
  try {
    // Send welcome email for first price alert
    const userAlertsCount = await db.collection('priceAlerts')
      .where('userId', '==', alertData.userId)
      .count()
      .get();
    
    if (userAlertsCount.data().count === 1) {
      // Get user details
      const userRecord = await auth.getUser(alertData.userId);
      
      if (userRecord.email) {
        await sendEmail({
          to: userRecord.email,
          subject: 'Welcome to Price Tracking!',
          template: 'price-tracking-welcome',
          data: {
            displayName: userRecord.displayName || userRecord.email.split('@')[0],
            productTitle: alertData.productTitle,
            productUrl: alertData.productUrl
          }
        });
      }
    }
    
    // Log analytics event
    logger.info('Price alert created analytics', {
      userId: alertData.userId,
      store: alertData.store,
      hasTargetPrice: !!alertData.targetPrice
    });
    
  } catch (error) {
    logger.error('Error in price alert created trigger:', error);
  }
});

/**
 * Helper function to send price alert notifications
 */
async function sendPriceAlertNotifications(notifications: Array<{
  userId: string;
  title: string;
  body: string;
  data: any;
}>) {
  
  for (const notification of notifications) {
    try {
      // Create in-app notification
      await createInAppNotification(notification.userId, {
        title: notification.title,
        body: notification.body,
        data: notification.data
      });
      
      // Send email notification
      const userRecord = await auth.getUser(notification.userId);
      if (userRecord.email) {
        await sendEmail({
          to: userRecord.email,
          subject: notification.title,
          template: 'price-alert',
          data: {
            displayName: userRecord.displayName || userRecord.email.split('@')[0],
            title: notification.title,
            body: notification.body,
            productUrl: notification.data.productUrl,
            productTitle: notification.data.productTitle,
            oldPrice: notification.data.oldPrice,
            newPrice: notification.data.newPrice
          }
        });
      }
      
      // Send push notification via centralized FCM delivery utility.
      await sendNotificationToUser(notification.userId, {
        title: notification.title,
        body: notification.body,
        data: Object.fromEntries(
          Object.entries(notification.data || {}).map(([key, value]) => [key, String(value)])
        )
      });
      
    } catch (error) {
      logger.error(`Error sending notification to user ${notification.userId}:`, error);
    }
  }
}

/**
 * Helper function to create in-app notifications
 */
async function createInAppNotification(userId: string, notification: {
  title: string;
  body: string;
  data: any;
}) {
  
  await db.collection('notifications').add({
    userId,
    title: notification.title,
    body: notification.body,
    data: notification.data,
    read: false,
    createdAt: FieldValue.serverTimestamp(),
    type: notification.data.type || 'general'
  });
}

/**
 * Firebase Cloud Function - Manual Price Check
 * Callable function for users to manually trigger price checks
 */
export const manualPriceCheck = onCall({
  enforceAppCheck: false
}, async (request: CallableRequest<{ alertId: string }>) => {
  
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }
  
  const { alertId } = request.data;
  
  if (!alertId) {
    throw new HttpsError('invalid-argument', 'Alert ID is required');
  }
  
  try {
    const alertRef = db.collection('priceAlerts').doc(alertId);
    const alertDoc = await alertRef.get();
    
    if (!alertDoc.exists) {
      throw new HttpsError('not-found', 'Price alert not found');
    }
    
    const alertData = alertDoc.data();
    if (!alertData || alertData.userId !== request.auth.uid) {
      throw new HttpsError('permission-denied', 'Not authorized to check this alert');
    }
    
    // Scrape current price
    const scrapeResult = await priceScraper.scrapePrice(alertData.productUrl);
    
    if (scrapeResult.success && scrapeResult.price) {
      const newPrice = parseFloat(scrapeResult.price.replace(/[^0-9.]/g, ''));
      const currentPrice = alertData.currentPrice || 0;
      
      // Update alert
      await alertRef.update({
        currentPrice: newPrice,
        lastChecked: FieldValue.serverTimestamp(),
        lastScrapeSuccess: true,
        lastError: FieldValue.delete()
      });
      
      // Log price history if changed
      if (Math.abs(newPrice - currentPrice) > 0.01) {
        await db.collection('priceHistory').add({
          alertId: alertId,
          userId: request.auth.uid,
          productUrl: alertData.productUrl,
          oldPrice: currentPrice,
          newPrice: newPrice,
          change: newPrice - currentPrice,
          changePercent: currentPrice > 0 ? ((newPrice - currentPrice) / currentPrice) * 100 : 0,
          timestamp: FieldValue.serverTimestamp(),
          reason: 'manual_check'
        });
      }
      
      return {
        success: true,
        currentPrice: newPrice,
        previousPrice: currentPrice,
        changed: Math.abs(newPrice - currentPrice) > 0.01
      };
      
    } else {
      // Update with error
      await alertRef.update({
        lastChecked: FieldValue.serverTimestamp(),
        lastScrapeSuccess: false,
        lastError: scrapeResult.error || 'Failed to scrape price'
      });
      
      throw new HttpsError('internal', scrapeResult.error || 'Failed to check price');
    }
    
  } catch (error) {
    logger.error('Error in manual price check:', error);
    throw new HttpsError('internal', 'Failed to check price', error instanceof Error ? error.message : 'Unknown error');
  }
});

export default {
  scheduledPriceCheck,
  createPriceAlert,
  getUserPriceAlerts,
  updatePriceAlert,
  deletePriceAlert,
  manualPriceCheck,
  onPriceAlertCreated
};
