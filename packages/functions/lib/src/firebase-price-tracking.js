"use strict";
// Firebase-Native Price Tracking Service
// Leverages Firebase Functions, Firestore, Cloud Scheduler, and Firebase Admin
Object.defineProperty(exports, "__esModule", { value: true });
exports.manualPriceCheck = exports.onPriceAlertCreated = exports.deletePriceAlert = exports.updatePriceAlert = exports.getUserPriceAlerts = exports.createPriceAlert = exports.scheduledPriceCheck = void 0;
const scheduler_1 = require("firebase-functions/v2/scheduler");
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const firestore_2 = require("firebase-admin/firestore");
const auth_1 = require("firebase-admin/auth");
const app_1 = require("firebase-admin/app");
const params_1 = require("firebase-functions/params");
const v2_1 = require("firebase-functions/v2");
// Initialize Firebase Admin (safe for multiple imports)
const app = (0, app_1.getApps)().length === 0 ? (0, app_1.initializeApp)() : (0, app_1.getApps)()[0];
const db = (0, firestore_2.getFirestore)(app);
const auth = (0, auth_1.getAuth)(app);
// Firebase Secrets for sensitive data
const sendGridApiKey = (0, params_1.defineSecret)('SENDGRID_API_KEY');
// Mock services for now - replace with actual implementations
const priceScraper = {
    async scrapePrice(url) {
        // Implement price scraping logic here
        return { success: true, price: '29.99' };
    }
};
const emailService = {
    async sendEmail(data) {
        // Implement email sending logic here
        v2_1.logger.info('Sending email:', { to: data.to, subject: data.subject });
    }
};
/**
 * Firebase Cloud Function - Scheduled Price Tracking
 * Runs every hour to check for price changes on tracked items
 */
exports.scheduledPriceCheck = (0, scheduler_1.onSchedule)({
    schedule: 'every 60 minutes',
    timeZone: 'America/New_York',
    secrets: [sendGridApiKey],
    memory: '1GiB',
    timeoutSeconds: 540
}, async (event) => {
    v2_1.logger.info('Starting scheduled price check', { timestamp: event.scheduleTime });
    try {
        // Get all active price alerts from Firestore
        const alertsSnapshot = await db.collection('priceAlerts')
            .where('active', '==', true)
            .where('nextCheck', '<=', firestore_2.Timestamp.now())
            .limit(100) // Process in batches
            .get();
        v2_1.logger.info(`Found ${alertsSnapshot.size} alerts to check`);
        const batch = db.batch();
        const notifications = [];
        // Process each alert
        for (const alertDoc of alertsSnapshot.docs) {
            const alert = alertDoc.data();
            const alertId = alertDoc.id;
            try {
                v2_1.logger.info(`Checking price for alert ${alertId}`, {
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
                            timestamp: firestore_2.FieldValue.serverTimestamp(),
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
                        lastChecked: firestore_2.FieldValue.serverTimestamp(),
                        nextCheck: firestore_2.Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000)), // Next hour
                        checksCount: firestore_2.FieldValue.increment(1),
                        lastScrapeSuccess: true,
                        lastError: firestore_2.FieldValue.delete()
                    });
                }
                else {
                    // Update with error info
                    batch.update(alertDoc.ref, {
                        lastChecked: firestore_2.FieldValue.serverTimestamp(),
                        lastScrapeSuccess: false,
                        lastError: scrapeResult.error || 'Failed to scrape price',
                        failedChecks: firestore_2.FieldValue.increment(1)
                    });
                }
            }
            catch (error) {
                v2_1.logger.error(`Error processing alert ${alertId}:`, error);
                // Update alert with error
                batch.update(alertDoc.ref, {
                    lastChecked: firestore_2.FieldValue.serverTimestamp(),
                    lastScrapeSuccess: false,
                    lastError: error instanceof Error ? error.message : 'Unknown error',
                    failedChecks: firestore_2.FieldValue.increment(1)
                });
            }
        }
        // Commit all updates
        await batch.commit();
        // Send notifications
        await sendPriceAlertNotifications(notifications);
        v2_1.logger.info(`Price check completed. Processed ${alertsSnapshot.size} alerts, sent ${notifications.length} notifications`);
    }
    catch (error) {
        v2_1.logger.error('Scheduled price check failed:', error);
        throw new https_1.HttpsError('internal', 'Price check failed', error instanceof Error ? error.message : 'Unknown error');
    }
});
/**
 * Firebase Cloud Function - Create Price Alert
 * Callable function to create a new price alert for authenticated users
 */
exports.createPriceAlert = (0, https_1.onCall)({
    secrets: [sendGridApiKey],
    enforceAppCheck: false // Set to true in production
}, async (request) => {
    // Verify authentication
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { productUrl, productTitle, targetPrice, currentPrice, imageUrl, store } = request.data;
    if (!productUrl) {
        throw new https_1.HttpsError('invalid-argument', 'Product URL is required');
    }
    try {
        v2_1.logger.info(`Creating price alert for user ${request.auth.uid}`, { productUrl });
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
            createdAt: firestore_2.FieldValue.serverTimestamp(),
            lastChecked: null,
            nextCheck: firestore_2.Timestamp.fromDate(new Date(Date.now() + 60 * 60 * 1000)), // Check in 1 hour
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
                timestamp: firestore_2.FieldValue.serverTimestamp(),
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
        v2_1.logger.info(`Price alert created with ID ${alertRef.id}`);
        return {
            success: true,
            alertId: alertRef.id,
            message: 'Price alert created successfully'
        };
    }
    catch (error) {
        v2_1.logger.error('Error creating price alert:', error);
        throw new https_1.HttpsError('internal', 'Failed to create price alert', error instanceof Error ? error.message : 'Unknown error');
    }
});
/**
 * Firebase Cloud Function - Get User Price Alerts
 * Callable function to retrieve user's price alerts with real-time updates
 */
exports.getUserPriceAlerts = (0, https_1.onCall)({
    enforceAppCheck: false
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
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
        const alerts = snapshot.docs.map(doc => {
            var _a, _b, _c;
            return (Object.assign(Object.assign({ id: doc.id }, doc.data()), { createdAt: (_a = doc.data().createdAt) === null || _a === void 0 ? void 0 : _a.toDate(), lastChecked: (_b = doc.data().lastChecked) === null || _b === void 0 ? void 0 : _b.toDate(), nextCheck: (_c = doc.data().nextCheck) === null || _c === void 0 ? void 0 : _c.toDate() }));
        });
        return { success: true, alerts };
    }
    catch (error) {
        v2_1.logger.error('Error getting price alerts:', error);
        throw new https_1.HttpsError('internal', 'Failed to get price alerts', error instanceof Error ? error.message : 'Unknown error');
    }
});
/**
 * Firebase Cloud Function - Update Price Alert
 * Callable function to update price alert settings
 */
exports.updatePriceAlert = (0, https_1.onCall)({
    enforceAppCheck: false
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { alertId, targetPrice, active } = request.data;
    if (!alertId) {
        throw new https_1.HttpsError('invalid-argument', 'Alert ID is required');
    }
    try {
        const alertRef = db.collection('priceAlerts').doc(alertId);
        const alertDoc = await alertRef.get();
        if (!alertDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Price alert not found');
        }
        const alertData = alertDoc.data();
        if (!alertData || alertData.userId !== request.auth.uid) {
            throw new https_1.HttpsError('permission-denied', 'Not authorized to update this alert');
        }
        const updateData = {
            updatedAt: firestore_2.FieldValue.serverTimestamp()
        };
        if (targetPrice !== undefined) {
            updateData.targetPrice = targetPrice;
        }
        if (active !== undefined) {
            updateData.active = active;
        }
        await alertRef.update(updateData);
        return { success: true, message: 'Price alert updated successfully' };
    }
    catch (error) {
        v2_1.logger.error('Error updating price alert:', error);
        throw new https_1.HttpsError('internal', 'Failed to update price alert', error instanceof Error ? error.message : 'Unknown error');
    }
});
/**
 * Firebase Cloud Function - Delete Price Alert
 * Callable function to delete a price alert
 */
exports.deletePriceAlert = (0, https_1.onCall)({
    enforceAppCheck: false
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { alertId } = request.data;
    if (!alertId) {
        throw new https_1.HttpsError('invalid-argument', 'Alert ID is required');
    }
    try {
        const alertRef = db.collection('priceAlerts').doc(alertId);
        const alertDoc = await alertRef.get();
        if (!alertDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Price alert not found');
        }
        const alertData = alertDoc.data();
        if (!alertData || alertData.userId !== request.auth.uid) {
            throw new https_1.HttpsError('permission-denied', 'Not authorized to delete this alert');
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
    }
    catch (error) {
        v2_1.logger.error('Error deleting price alert:', error);
        throw new https_1.HttpsError('internal', 'Failed to delete price alert', error instanceof Error ? error.message : 'Unknown error');
    }
});
/**
 * Firebase Firestore Trigger - New Price Alert Created
 * Automatically triggered when a new price alert is created
 */
exports.onPriceAlertCreated = (0, firestore_1.onDocumentCreated)({
    document: 'priceAlerts/{alertId}',
    secrets: [sendGridApiKey]
}, async (event) => {
    var _a;
    const alertData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    const alertId = event.params.alertId;
    if (!alertData)
        return;
    v2_1.logger.info(`New price alert created: ${alertId}`, { userId: alertData.userId });
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
                await emailService.sendEmail({
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
        v2_1.logger.info('Price alert created analytics', {
            userId: alertData.userId,
            store: alertData.store,
            hasTargetPrice: !!alertData.targetPrice
        });
    }
    catch (error) {
        v2_1.logger.error('Error in price alert created trigger:', error);
    }
});
/**
 * Helper function to send price alert notifications
 */
async function sendPriceAlertNotifications(notifications) {
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
                await emailService.sendEmail({
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
            // TODO: Send FCM push notification when implemented
        }
        catch (error) {
            v2_1.logger.error(`Error sending notification to user ${notification.userId}:`, error);
        }
    }
}
/**
 * Helper function to create in-app notifications
 */
async function createInAppNotification(userId, notification) {
    await db.collection('notifications').add({
        userId,
        title: notification.title,
        body: notification.body,
        data: notification.data,
        read: false,
        createdAt: firestore_2.FieldValue.serverTimestamp(),
        type: notification.data.type || 'general'
    });
}
/**
 * Firebase Cloud Function - Manual Price Check
 * Callable function for users to manually trigger price checks
 */
exports.manualPriceCheck = (0, https_1.onCall)({
    secrets: [sendGridApiKey],
    enforceAppCheck: false
}, async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { alertId } = request.data;
    if (!alertId) {
        throw new https_1.HttpsError('invalid-argument', 'Alert ID is required');
    }
    try {
        const alertRef = db.collection('priceAlerts').doc(alertId);
        const alertDoc = await alertRef.get();
        if (!alertDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Price alert not found');
        }
        const alertData = alertDoc.data();
        if (!alertData || alertData.userId !== request.auth.uid) {
            throw new https_1.HttpsError('permission-denied', 'Not authorized to check this alert');
        }
        // Scrape current price
        const scrapeResult = await priceScraper.scrapePrice(alertData.productUrl);
        if (scrapeResult.success && scrapeResult.price) {
            const newPrice = parseFloat(scrapeResult.price.replace(/[^0-9.]/g, ''));
            const currentPrice = alertData.currentPrice || 0;
            // Update alert
            await alertRef.update({
                currentPrice: newPrice,
                lastChecked: firestore_2.FieldValue.serverTimestamp(),
                lastScrapeSuccess: true,
                lastError: firestore_2.FieldValue.delete()
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
                    timestamp: firestore_2.FieldValue.serverTimestamp(),
                    reason: 'manual_check'
                });
            }
            return {
                success: true,
                currentPrice: newPrice,
                previousPrice: currentPrice,
                changed: Math.abs(newPrice - currentPrice) > 0.01
            };
        }
        else {
            // Update with error
            await alertRef.update({
                lastChecked: firestore_2.FieldValue.serverTimestamp(),
                lastScrapeSuccess: false,
                lastError: scrapeResult.error || 'Failed to scrape price'
            });
            throw new https_1.HttpsError('internal', scrapeResult.error || 'Failed to check price');
        }
    }
    catch (error) {
        v2_1.logger.error('Error in manual price check:', error);
        throw new https_1.HttpsError('internal', 'Failed to check price', error instanceof Error ? error.message : 'Unknown error');
    }
});
exports.default = {
    scheduledPriceCheck: exports.scheduledPriceCheck,
    createPriceAlert: exports.createPriceAlert,
    getUserPriceAlerts: exports.getUserPriceAlerts,
    updatePriceAlert: exports.updatePriceAlert,
    deletePriceAlert: exports.deletePriceAlert,
    manualPriceCheck: exports.manualPriceCheck,
    onPriceAlertCreated: exports.onPriceAlertCreated
};
//# sourceMappingURL=firebase-price-tracking.js.map