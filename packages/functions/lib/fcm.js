"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBatchNotification = exports.sendTestNotification = exports.notifyPriceAlert = exports.notifyItemPurchased = exports.notifyItemReserved = exports.notifyItemAdded = exports.unsubscribeFromTopic = exports.subscribeToTopic = exports.removeFCMToken = exports.saveFCMToken = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-functions/v2/firestore");
const messaging_1 = require("firebase-admin/messaging");
const firestore_2 = require("firebase-admin/firestore");
const firebase_functions_1 = require("firebase-functions");
/**
 * Firebase Cloud Messaging Functions for Wishlist Wizard
 * Handles push notifications, token management, and automated notifications
 */
// ===========================
// FCM TOKEN MANAGEMENT
// ===========================
/**
 * Save or update FCM token for a user
 */
exports.saveFCMToken = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated to save FCM token');
    }
    const { token, platform = 'web' } = request.data;
    if (!token) {
        throw new https_1.HttpsError('invalid-argument', 'FCM token is required');
    }
    try {
        const db = (0, firestore_2.getFirestore)();
        const userTokenRef = db.collection('userFCMTokens').doc(request.auth.uid);
        await userTokenRef.set({
            token,
            userId: request.auth.uid,
            platform,
            lastUpdated: new Date(),
            enabled: true
        }, { merge: true });
        firebase_functions_1.logger.info(`FCM token saved for user ${request.auth.uid}`, { platform, token: token.substring(0, 20) + '...' });
        return { success: true };
    }
    catch (error) {
        firebase_functions_1.logger.error('Error saving FCM token:', error);
        throw new https_1.HttpsError('internal', 'Failed to save FCM token');
    }
});
/**
 * Remove FCM token for a user (logout/disable notifications)
 */
exports.removeFCMToken = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    try {
        const db = (0, firestore_2.getFirestore)();
        await db.collection('userFCMTokens').doc(request.auth.uid).delete();
        firebase_functions_1.logger.info(`FCM token removed for user ${request.auth.uid}`);
        return { success: true };
    }
    catch (error) {
        firebase_functions_1.logger.error('Error removing FCM token:', error);
        throw new https_1.HttpsError('internal', 'Failed to remove FCM token');
    }
});
/**
 * Subscribe user to a topic
 */
exports.subscribeToTopic = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { topic } = request.data;
    if (!topic) {
        throw new https_1.HttpsError('invalid-argument', 'Topic is required');
    }
    try {
        // Get user's FCM token
        const db = (0, firestore_2.getFirestore)();
        const userTokenDoc = await db.collection('userFCMTokens').doc(request.auth.uid).get();
        if (!userTokenDoc.exists) {
            throw new https_1.HttpsError('not-found', 'No FCM token found for user');
        }
        const { token } = userTokenDoc.data();
        // Subscribe to topic
        const messaging = (0, messaging_1.getMessaging)();
        await messaging.subscribeToTopic([token], topic);
        // Track subscription
        await db.collection('userTopicSubscriptions').doc(`${request.auth.uid}_${topic}`).set({
            userId: request.auth.uid,
            topic,
            subscribedAt: new Date(),
            active: true
        });
        firebase_functions_1.logger.info(`User ${request.auth.uid} subscribed to topic ${topic}`);
        return { success: true };
    }
    catch (error) {
        firebase_functions_1.logger.error('Error subscribing to topic:', error);
        throw new https_1.HttpsError('internal', 'Failed to subscribe to topic');
    }
});
/**
 * Unsubscribe user from a topic
 */
exports.unsubscribeFromTopic = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { topic } = request.data;
    if (!topic) {
        throw new https_1.HttpsError('invalid-argument', 'Topic is required');
    }
    try {
        // Get user's FCM token
        const db = (0, firestore_2.getFirestore)();
        const userTokenDoc = await db.collection('userFCMTokens').doc(request.auth.uid).get();
        if (!userTokenDoc.exists) {
            throw new https_1.HttpsError('not-found', 'No FCM token found for user');
        }
        const { token } = userTokenDoc.data();
        // Unsubscribe from topic
        const messaging = (0, messaging_1.getMessaging)();
        await messaging.unsubscribeFromTopic([token], topic);
        // Update subscription record
        await db.collection('userTopicSubscriptions').doc(`${request.auth.uid}_${topic}`).update({
            active: false,
            unsubscribedAt: new Date()
        });
        firebase_functions_1.logger.info(`User ${request.auth.uid} unsubscribed from topic ${topic}`);
        return { success: true };
    }
    catch (error) {
        firebase_functions_1.logger.error('Error unsubscribing from topic:', error);
        throw new https_1.HttpsError('internal', 'Failed to unsubscribe from topic');
    }
});
// ===========================
// NOTIFICATION TRIGGERS
// ===========================
/**
 * Send notification when a new item is added to a wishlist
 */
exports.notifyItemAdded = (0, firestore_1.onDocumentCreated)('wishlistItems/{itemId}', async (event) => {
    var _a;
    const itemData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.data();
    if (!itemData)
        return;
    try {
        const db = (0, firestore_2.getFirestore)();
        // Get wishlist details
        const wishlistDoc = await db.collection('wishlists').doc(itemData.wishlistId.toString()).get();
        if (!wishlistDoc.exists)
            return;
        const wishlistData = wishlistDoc.data();
        // Get collaborators if it's a collaborative wishlist
        let notificationTargets = [wishlistData.userId];
        if (wishlistData.isCollaborative) {
            const collaboratorsSnapshot = await db.collection('collaborators')
                .where('wishlistId', '==', itemData.wishlistId)
                .get();
            collaboratorsSnapshot.docs.forEach(doc => {
                const collaboratorData = doc.data();
                if (collaboratorData.userId !== wishlistData.userId) {
                    notificationTargets.push(collaboratorData.userId);
                }
            });
        }
        // Send notifications to all targets
        const notifications = notificationTargets.map(userId => sendNotificationToUser(userId, {
            title: 'New Item Added',
            body: `"${itemData.title}" was added to "${wishlistData.name}"`,
            data: {
                type: 'item_added',
                wishlistId: wishlistData.id.toString(),
                itemId: event.params.itemId,
                wishlistName: wishlistData.name,
                itemTitle: itemData.title
            }
        }));
        await Promise.all(notifications);
        firebase_functions_1.logger.info(`Item added notifications sent for item ${event.params.itemId}`);
    }
    catch (error) {
        firebase_functions_1.logger.error('Error sending item added notifications:', error);
    }
});
/**
 * Send notification when an item is reserved
 */
exports.notifyItemReserved = (0, firestore_1.onDocumentUpdated)('wishlistItems/{itemId}', async (event) => {
    var _a, _b;
    const beforeData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const afterData = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!beforeData || !afterData)
        return;
    // Check if item was just reserved
    if (!beforeData.reservedByUserId && afterData.reservedByUserId) {
        try {
            const db = (0, firestore_2.getFirestore)();
            // Get wishlist details
            const wishlistDoc = await db.collection('wishlists').doc(afterData.wishlistId.toString()).get();
            if (!wishlistDoc.exists)
                return;
            const wishlistData = wishlistDoc.data();
            // Get reserver details
            const reserverDoc = await db.collection('users').doc(afterData.reservedByUserId).get();
            const reserverName = reserverDoc.exists ?
                (reserverDoc.data().displayName || reserverDoc.data().username) : 'Someone';
            // Notify wishlist owner (if not the reserver)
            if (wishlistData.userId !== afterData.reservedByUserId) {
                await sendNotificationToUser(wishlistData.userId, {
                    title: 'Item Reserved',
                    body: `${reserverName} reserved "${afterData.title}" from "${wishlistData.name}"`,
                    data: {
                        type: 'item_reserved',
                        wishlistId: wishlistData.id.toString(),
                        itemId: event.params.itemId,
                        reservedBy: afterData.reservedByUserId,
                        reserverName
                    }
                });
            }
            firebase_functions_1.logger.info(`Item reserved notification sent for item ${event.params.itemId}`);
        }
        catch (error) {
            firebase_functions_1.logger.error('Error sending item reserved notification:', error);
        }
    }
});
/**
 * Send notification when an item is purchased
 */
exports.notifyItemPurchased = (0, firestore_1.onDocumentUpdated)('wishlistItems/{itemId}', async (event) => {
    var _a, _b;
    const beforeData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const afterData = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!beforeData || !afterData)
        return;
    // Check if item was just purchased
    if (!beforeData.purchasedByUserId && afterData.purchasedByUserId) {
        try {
            const db = (0, firestore_2.getFirestore)();
            // Get wishlist details
            const wishlistDoc = await db.collection('wishlists').doc(afterData.wishlistId.toString()).get();
            if (!wishlistDoc.exists)
                return;
            const wishlistData = wishlistDoc.data();
            // Get purchaser details
            const purchaserDoc = await db.collection('users').doc(afterData.purchasedByUserId).get();
            const purchaserName = purchaserDoc.exists ?
                (purchaserDoc.data().displayName || purchaserDoc.data().username) : 'Someone';
            // Notify wishlist owner (if not the purchaser)
            if (wishlistData.userId !== afterData.purchasedByUserId) {
                await sendNotificationToUser(wishlistData.userId, {
                    title: 'Item Purchased! 🎉',
                    body: `${purchaserName} purchased "${afterData.title}" from "${wishlistData.name}"`,
                    data: {
                        type: 'item_purchased',
                        wishlistId: wishlistData.id.toString(),
                        itemId: event.params.itemId,
                        purchasedBy: afterData.purchasedByUserId,
                        purchaserName
                    }
                });
            }
            firebase_functions_1.logger.info(`Item purchased notification sent for item ${event.params.itemId}`);
        }
        catch (error) {
            firebase_functions_1.logger.error('Error sending item purchased notification:', error);
        }
    }
});
/**
 * Send notification for price alerts
 */
exports.notifyPriceAlert = (0, firestore_1.onDocumentUpdated)('priceAlerts/{alertId}', async (event) => {
    var _a, _b;
    const beforeData = (_a = event.data) === null || _a === void 0 ? void 0 : _a.before.data();
    const afterData = (_b = event.data) === null || _b === void 0 ? void 0 : _b.after.data();
    if (!beforeData || !afterData)
        return;
    // Check if alert was just triggered
    if (!beforeData.triggered && afterData.triggered) {
        try {
            const db = (0, firestore_2.getFirestore)();
            // Get item details
            const itemDoc = await db.collection('wishlistItems').doc(afterData.itemId.toString()).get();
            if (!itemDoc.exists)
                return;
            const itemData = itemDoc.data();
            await sendNotificationToUser(afterData.userId, {
                title: 'Price Alert! 🏷️',
                body: `"${itemData.title}" is now ${itemData.price} (was ${afterData.originalPrice || 'higher'})`,
                data: {
                    type: 'price_alert',
                    itemId: afterData.itemId.toString(),
                    wishlistId: itemData.wishlistId.toString(),
                    currentPrice: itemData.price,
                    targetPrice: afterData.targetPrice.toString(),
                    productUrl: itemData.productUrl
                }
            });
            firebase_functions_1.logger.info(`Price alert notification sent for alert ${event.params.alertId}`);
        }
        catch (error) {
            firebase_functions_1.logger.error('Error sending price alert notification:', error);
        }
    }
});
/**
 * Send test notification
 */
exports.sendTestNotification = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    try {
        await sendNotificationToUser(request.auth.uid, {
            title: 'Test Notification',
            body: 'This is a test notification from Wishlist Wizard!',
            data: {
                type: 'test',
                timestamp: new Date().toISOString()
            }
        });
        return { success: true };
    }
    catch (error) {
        firebase_functions_1.logger.error('Error sending test notification:', error);
        throw new https_1.HttpsError('internal', 'Failed to send test notification');
    }
});
// ===========================
// UTILITY FUNCTIONS
// ===========================
/**
 * Send notification to a specific user
 */
async function sendNotificationToUser(userId, notification) {
    var _a, _b, _c, _d;
    try {
        const db = (0, firestore_2.getFirestore)();
        // Get user's FCM token
        const userTokenDoc = await db.collection('userFCMTokens').doc(userId).get();
        if (!userTokenDoc.exists) {
            firebase_functions_1.logger.warn(`No FCM token found for user ${userId}`);
            return;
        }
        const { token, enabled } = userTokenDoc.data();
        if (!enabled) {
            firebase_functions_1.logger.info(`Notifications disabled for user ${userId}`);
            return;
        }
        // Check user's notification preferences
        const prefsDoc = await db.collection('userNotificationPreferences').doc(userId).get();
        if (prefsDoc.exists) {
            const prefs = prefsDoc.data();
            // Check if notifications are globally disabled
            if (!prefs.enabled || !((_a = prefs.delivery) === null || _a === void 0 ? void 0 : _a.push)) {
                firebase_functions_1.logger.info(`Push notifications disabled for user ${userId}`);
                return;
            }
            // Check if specific notification type is disabled
            const notificationType = (_b = notification.data) === null || _b === void 0 ? void 0 : _b.type;
            if (notificationType && prefs.types && !prefs.types[notificationType]) {
                firebase_functions_1.logger.info(`Notification type ${notificationType} disabled for user ${userId}`);
                return;
            }
            // Check quiet hours
            if (((_c = prefs.quietHours) === null || _c === void 0 ? void 0 : _c.enabled) && isInQuietHours(prefs.quietHours)) {
                firebase_functions_1.logger.info(`Notification suppressed due to quiet hours for user ${userId}`);
                return;
            }
        }
        // Send the notification
        const messaging = (0, messaging_1.getMessaging)();
        const message = {
            token,
            notification: {
                title: notification.title,
                body: notification.body
            },
            data: notification.data || {},
            webpush: {
                fcmOptions: {
                    link: '/' // Default link to app
                }
            }
        };
        await messaging.send(message);
        firebase_functions_1.logger.info(`Notification sent to user ${userId}: ${notification.title}`);
        // Track notification in Firestore
        await db.collection('notifications').add({
            userId,
            type: ((_d = notification.data) === null || _d === void 0 ? void 0 : _d.type) || 'system',
            title: notification.title,
            content: notification.body,
            data: notification.data || {},
            createdAt: new Date(),
            isRead: false,
            deliveryMethod: 'push',
            deliveryStatus: 'sent'
        });
    }
    catch (error) {
        firebase_functions_1.logger.error(`Error sending notification to user ${userId}:`, error);
        // If token is invalid, remove it
        if (error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
            try {
                const db = (0, firestore_2.getFirestore)();
                await db.collection('userFCMTokens').doc(userId).delete();
                firebase_functions_1.logger.info(`Removed invalid FCM token for user ${userId}`);
            }
            catch (deleteError) {
                firebase_functions_1.logger.error(`Error removing invalid token for user ${userId}:`, deleteError);
            }
        }
    }
}
/**
 * Check if current time is within quiet hours
 */
function isInQuietHours(quietHours) {
    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    const startTime = parseInt(quietHours.start.replace(':', ''));
    const endTime = parseInt(quietHours.end.replace(':', ''));
    // Handle quiet hours spanning midnight
    if (startTime > endTime) {
        return currentTime >= startTime || currentTime <= endTime;
    }
    else {
        return currentTime >= startTime && currentTime <= endTime;
    }
}
/**
 * Send notification to multiple users (batch)
 */
exports.sendBatchNotification = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { userIds, notification } = request.data;
    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'userIds array is required');
    }
    if (!notification || !notification.title || !notification.body) {
        throw new https_1.HttpsError('invalid-argument', 'Notification title and body are required');
    }
    try {
        const notifications = userIds.map(userId => sendNotificationToUser(userId, notification));
        await Promise.all(notifications);
        firebase_functions_1.logger.info(`Batch notification sent to ${userIds.length} users`);
        return { success: true, sent: userIds.length };
    }
    catch (error) {
        firebase_functions_1.logger.error('Error sending batch notification:', error);
        throw new https_1.HttpsError('internal', 'Failed to send batch notification');
    }
});
//# sourceMappingURL=fcm.js.map