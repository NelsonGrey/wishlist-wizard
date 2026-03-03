import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';
import { ensureFirebaseAdmin } from './firebase-admin.js';
import { requireAuthenticatedUser, requireAdminUser } from './utils/auth-guards.js';

ensureFirebaseAdmin();

const toStringId = (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = String(value).trim();
  return normalized.length > 0 ? normalized : null;
};

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
export const saveFCMToken = onCall(async (request) => {
  const userId = requireAuthenticatedUser(request);

  const { token, platform = 'web' } = request.data;
  
  if (!token) {
    throw new HttpsError('invalid-argument', 'FCM token is required');
  }

  try {
    const db = getFirestore();
    const userTokenRef = db.collection('userFCMTokens').doc(userId);
    
    await userTokenRef.set({
      token,
      userId,
      platform,
      lastUpdated: new Date(),
      enabled: true
    }, { merge: true });

    logger.info(`FCM token saved for user ${userId}`, { platform, token: token.substring(0, 20) + '...' });
    
    return { success: true };
  } catch (error) {
    logger.error('Error saving FCM token:', error);
    throw new HttpsError('internal', 'Failed to save FCM token');
  }
});

/**
 * Remove FCM token for a user (logout/disable notifications)
 */
export const removeFCMToken = onCall(async (request) => {
  const userId = requireAuthenticatedUser(request);

  try {
    const db = getFirestore();
    await db.collection('userFCMTokens').doc(userId).delete();
    
    logger.info(`FCM token removed for user ${userId}`);
    return { success: true };
  } catch (error) {
    logger.error('Error removing FCM token:', error);
    throw new HttpsError('internal', 'Failed to remove FCM token');
  }
});

/**
 * Subscribe user to a topic
 */
export const subscribeToTopic = onCall(async (request) => {
  const userId = requireAuthenticatedUser(request);

  const { topic } = request.data;
  
  if (!topic) {
    throw new HttpsError('invalid-argument', 'Topic is required');
  }

  try {
    // Get user's FCM token
    const db = getFirestore();
    const userTokenDoc = await db.collection('userFCMTokens').doc(userId).get();
    
    if (!userTokenDoc.exists) {
      throw new HttpsError('not-found', 'No FCM token found for user');
    }

    const { token } = userTokenDoc.data()!;
    
    // Subscribe to topic
    const messaging = getMessaging();
    await messaging.subscribeToTopic([token], topic);
    
    // Track subscription
    await db.collection('userTopicSubscriptions').doc(`${userId}_${topic}`).set({
      userId,
      topic,
      subscribedAt: new Date(),
      active: true
    });

    logger.info(`User ${userId} subscribed to topic ${topic}`);
    return { success: true };
  } catch (error) {
    logger.error('Error subscribing to topic:', error);
    throw new HttpsError('internal', 'Failed to subscribe to topic');
  }
});

/**
 * Unsubscribe user from a topic
 */
export const unsubscribeFromTopic = onCall(async (request) => {
  const userId = requireAuthenticatedUser(request);

  const { topic } = request.data;
  
  if (!topic) {
    throw new HttpsError('invalid-argument', 'Topic is required');
  }

  try {
    // Get user's FCM token
    const db = getFirestore();
    const userTokenDoc = await db.collection('userFCMTokens').doc(userId).get();
    
    if (!userTokenDoc.exists) {
      throw new HttpsError('not-found', 'No FCM token found for user');
    }

    const { token } = userTokenDoc.data()!;
    
    // Unsubscribe from topic
    const messaging = getMessaging();
    await messaging.unsubscribeFromTopic([token], topic);
    
    // Update subscription record
    await db.collection('userTopicSubscriptions').doc(`${userId}_${topic}`).update({
      active: false,
      unsubscribedAt: new Date()
    });

    logger.info(`User ${userId} unsubscribed from topic ${topic}`);
    return { success: true };
  } catch (error) {
    logger.error('Error unsubscribing from topic:', error);
    throw new HttpsError('internal', 'Failed to unsubscribe from topic');
  }
});

/**
 * Send a test push notification to the current user
 */
export const sendTestPushNotification = onCall(async (request) => {
  const userId = requireAuthenticatedUser(request);

  const { title = 'Wishlist Wizard', body = 'This is a test notification.' } = request.data || {};

  try {
    const db = getFirestore();
    const tokenDoc = await db.collection('userFCMTokens').doc(userId).get();

    if (!tokenDoc.exists) {
      throw new HttpsError('not-found', 'No FCM token found for user');
    }

    const { token } = tokenDoc.data()!;
    const messaging = getMessaging();

    await messaging.send({
      token,
      notification: {
        title,
        body,
      },
      data: {
        type: 'test',
      },
    });

    logger.info(`Test notification sent to user ${userId}`);
    return { success: true };
  } catch (error) {
    logger.error('Error sending test notification:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to send test notification');
  }
});

// ===========================
// NOTIFICATION TRIGGERS
// ===========================

/**
 * Send notification when a new item is added to a wishlist
 */
export const notifyItemAdded = onDocumentCreated('wishlistItems/{itemId}', async (event) => {
  const itemData = event.data?.data();
  if (!itemData) return;

  try {
    const db = getFirestore();
    const wishlistId = toStringId(itemData.wishlistId);
    if (!wishlistId) {
      logger.warn(`Skipping item added notification for ${event.params.itemId}: missing wishlistId`);
      return;
    }
    
    // Get wishlist details
    const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
    if (!wishlistDoc.exists) return;
    
    const wishlistData = wishlistDoc.data()!;
    const wishlistOwnerId = toStringId(wishlistData.userId);
    if (!wishlistOwnerId) {
      logger.warn(`Skipping item added notification for ${event.params.itemId}: wishlist owner missing`);
      return;
    }
    const wishlistIdForPayload = toStringId(wishlistData.id) || wishlistDoc.id;
    
    // Get collaborators if it's a collaborative wishlist
    const notificationTargets = new Set<string>([wishlistOwnerId]);
    
    if (wishlistData.isCollaborative) {
      const collaboratorsSnapshot = await db.collection('collaborators')
        .where('wishlistId', '==', wishlistId)
        .get();
      
      collaboratorsSnapshot.docs.forEach(doc => {
        const collaboratorData = doc.data();
        const collaboratorUserId = toStringId(collaboratorData.userId);
        if (collaboratorUserId && collaboratorUserId !== wishlistOwnerId) {
          notificationTargets.add(collaboratorUserId);
        }
      });
    }

    // Send notifications to all targets
    const notifications = [...notificationTargets].map(userId => 
      sendNotificationToUser(userId, {
        title: 'New Item Added',
        body: `"${itemData.title}" was added to "${wishlistData.name}"`,
        data: {
          type: 'item_added',
          wishlistId: wishlistIdForPayload,
          itemId: event.params.itemId,
          wishlistName: wishlistData.name,
          itemTitle: itemData.title
        }
      })
    );

    await Promise.all(notifications);
    logger.info(`Item added notifications sent for item ${event.params.itemId}`);
  } catch (error) {
    logger.error('Error sending item added notifications:', error);
  }
});

/**
 * Send notification when an item is reserved
 */
export const notifyItemReserved = onDocumentUpdated('wishlistItems/{itemId}', async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();
  
  if (!beforeData || !afterData) return;
  
  // Check if item was just reserved
  if (!beforeData.reservedByUserId && afterData.reservedByUserId) {
    try {
      const db = getFirestore();
      const wishlistId = toStringId(afterData.wishlistId);
      if (!wishlistId) {
        logger.warn(`Skipping item reserved notification for ${event.params.itemId}: missing wishlistId`);
        return;
      }
      
      // Get wishlist details
      const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
      if (!wishlistDoc.exists) return;
      
      const wishlistData = wishlistDoc.data()!;
      const wishlistOwnerId = toStringId(wishlistData.userId);
      if (!wishlistOwnerId) {
        logger.warn(`Skipping item reserved notification for ${event.params.itemId}: wishlist owner missing`);
        return;
      }
      const reserverUserId = toStringId(afterData.reservedByUserId);
      if (!reserverUserId) {
        logger.warn(`Skipping item reserved notification for ${event.params.itemId}: missing reserver user id`);
        return;
      }
      const wishlistIdForPayload = toStringId(wishlistData.id) || wishlistDoc.id;
      
      // Get reserver details
      const reserverDoc = await db.collection('users').doc(reserverUserId).get();
      const reserverName = reserverDoc.exists ? 
        (reserverDoc.data()!.displayName || reserverDoc.data()!.username) : 'Someone';

      // Notify wishlist owner (if not the reserver)
      if (wishlistOwnerId !== reserverUserId) {
        await sendNotificationToUser(wishlistOwnerId, {
          title: 'Item Reserved',
          body: `${reserverName} reserved "${afterData.title}" from "${wishlistData.name}"`,
          data: {
            type: 'item_reserved',
            wishlistId: wishlistIdForPayload,
            itemId: event.params.itemId,
            reservedBy: reserverUserId,
            reserverName
          }
        });
      }

      logger.info(`Item reserved notification sent for item ${event.params.itemId}`);
    } catch (error) {
      logger.error('Error sending item reserved notification:', error);
    }
  }
});

/**
 * Send notification when an item is purchased
 */
export const notifyItemPurchased = onDocumentUpdated('wishlistItems/{itemId}', async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();
  
  if (!beforeData || !afterData) return;
  
  // Check if item was just purchased
  if (!beforeData.purchasedByUserId && afterData.purchasedByUserId) {
    try {
      const db = getFirestore();
      const wishlistId = toStringId(afterData.wishlistId);
      if (!wishlistId) {
        logger.warn(`Skipping item purchased notification for ${event.params.itemId}: missing wishlistId`);
        return;
      }
      
      // Get wishlist details
      const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
      if (!wishlistDoc.exists) return;
      
      const wishlistData = wishlistDoc.data()!;
      const wishlistOwnerId = toStringId(wishlistData.userId);
      if (!wishlistOwnerId) {
        logger.warn(`Skipping item purchased notification for ${event.params.itemId}: wishlist owner missing`);
        return;
      }
      const purchaserUserId = toStringId(afterData.purchasedByUserId);
      if (!purchaserUserId) {
        logger.warn(`Skipping item purchased notification for ${event.params.itemId}: missing purchaser user id`);
        return;
      }
      const wishlistIdForPayload = toStringId(wishlistData.id) || wishlistDoc.id;
      
      // Get purchaser details
      const purchaserDoc = await db.collection('users').doc(purchaserUserId).get();
      const purchaserName = purchaserDoc.exists ? 
        (purchaserDoc.data()!.displayName || purchaserDoc.data()!.username) : 'Someone';

      // Notify wishlist owner (if not the purchaser)
      if (wishlistOwnerId !== purchaserUserId) {
        await sendNotificationToUser(wishlistOwnerId, {
          title: 'Item Purchased! 🎉',
          body: `${purchaserName} purchased "${afterData.title}" from "${wishlistData.name}"`,
          data: {
            type: 'item_purchased',
            wishlistId: wishlistIdForPayload,
            itemId: event.params.itemId,
            purchasedBy: purchaserUserId,
            purchaserName
          }
        });
      }

      logger.info(`Item purchased notification sent for item ${event.params.itemId}`);
    } catch (error) {
      logger.error('Error sending item purchased notification:', error);
    }
  }
});

/**
 * Send notification for price alerts
 */
export const notifyPriceAlert = onDocumentUpdated('priceAlerts/{alertId}', async (event) => {
  const beforeData = event.data?.before.data();
  const afterData = event.data?.after.data();
  
  if (!beforeData || !afterData) return;
  
  // Check if alert was just triggered
  if (!beforeData.triggered && afterData.triggered) {
    try {
      const db = getFirestore();
      const itemId = toStringId(afterData.itemId);
      const userId = toStringId(afterData.userId);

      if (!itemId || !userId) {
        logger.warn(`Skipping price alert notification for ${event.params.alertId}: missing itemId or userId`);
        return;
      }
      
      // Get item details
      const itemDoc = await db.collection('wishlistItems').doc(itemId).get();
      if (!itemDoc.exists) return;
      
      const itemData = itemDoc.data()!;
      const wishlistId = toStringId(itemData.wishlistId);
      if (!wishlistId) {
        logger.warn(`Skipping price alert notification for ${event.params.alertId}: missing wishlistId on item ${itemId}`);
        return;
      }
      const currentPrice = itemData.price === undefined || itemData.price === null ? '' : String(itemData.price);
      const targetPrice = toStringId(afterData.targetPrice) || '';
      const productUrl = toStringId(itemData.productUrl) || '';

      await sendNotificationToUser(userId, {
        title: 'Price Alert! 🏷️',
        body: `"${itemData.title}" is now ${itemData.price} (was ${afterData.originalPrice || 'higher'})`,
        data: {
          type: 'price_alert',
          itemId,
          wishlistId,
          currentPrice,
          targetPrice,
          productUrl
        }
      });

      logger.info(`Price alert notification sent for alert ${event.params.alertId}`);
    } catch (error) {
      logger.error('Error sending price alert notification:', error);
    }
  }
});

/**
 * Send test notification
 */
export const sendTestNotification = onCall(async (request) => {
  const userId = requireAuthenticatedUser(request);

  try {
    const result = await deliverNotificationToUser(userId, {
      title: 'Test Notification',
      body: 'This is a test notification from Wishlist Wizard!',
      data: {
        type: 'test',
        timestamp: new Date().toISOString()
      }
    });

    const sent = result.status === 'sent' ? 1 : 0;
    const skipped = result.status === 'skipped' ? 1 : 0;
    const failed = result.status === 'failed' ? 1 : 0;
    const status: 'success' | 'skipped' | 'failure' =
      result.status === 'sent' ? 'success' : result.status === 'skipped' ? 'skipped' : 'failure';

    return {
      success: status !== 'failure',
      status,
      attempted: 1,
      sent,
      skipped,
      failed,
      reason: result.reason || null,
      errorCode: result.errorCode || null,
    };
  } catch (error) {
    logger.error('Error sending test notification:', error);
    throw new HttpsError('internal', 'Failed to send test notification');
  }
});

// ===========================
// UTILITY FUNCTIONS
// ===========================

/**
 * Send notification to a specific user
 */
type NotificationDeliveryStatus = 'sent' | 'skipped' | 'failed';

type NotificationDeliveryResult = {
  userId: string;
  status: NotificationDeliveryStatus;
  reason?: string;
  errorCode?: string;
};

type NotificationPayload = {
  title: string;
  body: string;
  data?: { [key: string]: string };
};

async function deliverNotificationToUser(
  userId: string, 
  notification: NotificationPayload
): Promise<NotificationDeliveryResult> {
  try {
    const db = getFirestore();
    
    // Get user's FCM token
    const userTokenDoc = await db.collection('userFCMTokens').doc(userId).get();
    if (!userTokenDoc.exists) {
      logger.warn(`No FCM token found for user ${userId}`);
      return { userId, status: 'skipped', reason: 'missing-token' };
    }

    const { token, enabled } = userTokenDoc.data()!;
    
    if (!enabled) {
      logger.info(`Notifications disabled for user ${userId}`);
      return { userId, status: 'skipped', reason: 'notifications-disabled' };
    }

    // Check user's notification preferences
    const prefsDoc = await db.collection('userNotificationPreferences').doc(userId).get();
    if (prefsDoc.exists) {
      const prefs = prefsDoc.data()!;
      
      // Check if notifications are globally disabled
      if (!prefs.enabled || !prefs.delivery?.push) {
        logger.info(`Push notifications disabled for user ${userId}`);
        return { userId, status: 'skipped', reason: 'push-disabled' };
      }

      // Check if specific notification type is disabled
      const notificationType = notification.data?.type;
      if (notificationType && prefs.types && !prefs.types[notificationType]) {
        logger.info(`Notification type ${notificationType} disabled for user ${userId}`);
        return { userId, status: 'skipped', reason: 'type-disabled' };
      }

      // Check quiet hours
      if (prefs.quietHours?.enabled && isInQuietHours(prefs.quietHours)) {
        logger.info(`Notification suppressed due to quiet hours for user ${userId}`);
        return { userId, status: 'skipped', reason: 'quiet-hours' };
      }
    }

    // Send the notification
    const messaging = getMessaging();
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

    try {
      await messaging.send(message);
    } catch (sendError: any) {
      // Retry transient delivery failures once before surfacing the error.
      if (sendError?.code === 'messaging/internal-error' || sendError?.code === 'messaging/server-unavailable') {
        logger.warn(`Transient FCM error for user ${userId}; retrying once`, { code: sendError.code });
        await messaging.send(message);
      } else {
        throw sendError;
      }
    }
    logger.info(`Notification sent to user ${userId}: ${notification.title}`);
    
    // Track notification in Firestore
    await db.collection('notifications').add({
      userId,
      type: notification.data?.type || 'system',
      title: notification.title,
      content: notification.body,
      data: notification.data || {},
      createdAt: new Date(),
      isRead: false,
      deliveryMethod: 'push',
      deliveryStatus: 'sent'
    });

    return { userId, status: 'sent' };

  } catch (error: any) {
    logger.error(`Error sending notification to user ${userId}:`, error);
    
    // If token is invalid, remove it
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      try {
        const db = getFirestore();
        await db.collection('userFCMTokens').doc(userId).delete();
        logger.info(`Removed invalid FCM token for user ${userId}`);
      } catch (deleteError) {
        logger.error(`Error removing invalid token for user ${userId}:`, deleteError);
      }
    }

    return {
      userId,
      status: 'failed',
      reason: 'delivery-error',
      errorCode: error?.code,
    };
  }
}

export async function sendNotificationToUser(
  userId: string,
  notification: NotificationPayload
): Promise<void> {
  await deliverNotificationToUser(userId, notification);
}

/**
 * Check if current time is within quiet hours
 */
function isInQuietHours(quietHours: { start: string; end: string }): boolean {
  const now = new Date();
  const currentTime = now.getHours() * 100 + now.getMinutes();
  
  const startTime = parseInt(quietHours.start.replace(':', ''));
  const endTime = parseInt(quietHours.end.replace(':', ''));

  // Handle quiet hours spanning midnight
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  } else {
    return currentTime >= startTime && currentTime <= endTime;
  }
}

/**
 * Send notification to multiple users (batch)
 */
export const sendBatchNotification = onCall(async (request) => {
  await requireAdminUser(request, 'Admin role required to send batch notifications');

  const { userIds, notification } = request.data;
  
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new HttpsError('invalid-argument', 'userIds array is required');
  }

  if (!notification || !notification.title || !notification.body) {
    throw new HttpsError('invalid-argument', 'Notification title and body are required');
  }

  const normalizedUserIds = [...new Set(
    userIds
      .map((value: unknown) => String(value ?? '').trim())
      .filter((value: string) => value.length > 0)
  )];

  if (normalizedUserIds.length === 0) {
    throw new HttpsError('invalid-argument', 'userIds must include at least one valid user identifier');
  }

  try {
    const results = await Promise.all(
      normalizedUserIds.map((userId: string) => deliverNotificationToUser(userId, notification))
    );

    const sent = results.filter((result) => result.status === 'sent').length;
    const skipped = results.filter((result) => result.status === 'skipped').length;
    const failed = results.filter((result) => result.status === 'failed').length;

    const status: 'success' | 'partial' | 'failure' =
      failed === 0 ? 'success' : sent > 0 || skipped > 0 ? 'partial' : 'failure';

    const success = status !== 'failure';
    const failedUserIds = results.filter((result) => result.status === 'failed').map((result) => result.userId);

    logger.info(`Batch notification completed with status ${status}`, {
      attempted: normalizedUserIds.length,
      sent,
      skipped,
      failed,
    });

    return {
      success,
      status,
      attempted: normalizedUserIds.length,
      sent,
      skipped,
      failed,
      failedUserIds,
    };
  } catch (error) {
    logger.error('Error sending batch notification:', error);
    throw new HttpsError('internal', 'Failed to send batch notification');
  }
});
