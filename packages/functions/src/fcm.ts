import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions';

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
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated to save FCM token');
  }

  const { token, platform = 'web' } = request.data;
  
  if (!token) {
    throw new HttpsError('invalid-argument', 'FCM token is required');
  }

  try {
    const db = getFirestore();
    const userTokenRef = db.collection('userFCMTokens').doc(request.auth.uid);
    
    await userTokenRef.set({
      token,
      userId: request.auth.uid,
      platform,
      lastUpdated: new Date(),
      enabled: true
    }, { merge: true });

    logger.info(`FCM token saved for user ${request.auth.uid}`, { platform, token: token.substring(0, 20) + '...' });
    
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
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const db = getFirestore();
    await db.collection('userFCMTokens').doc(request.auth.uid).delete();
    
    logger.info(`FCM token removed for user ${request.auth.uid}`);
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
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { topic } = request.data;
  
  if (!topic) {
    throw new HttpsError('invalid-argument', 'Topic is required');
  }

  try {
    // Get user's FCM token
    const db = getFirestore();
    const userTokenDoc = await db.collection('userFCMTokens').doc(request.auth.uid).get();
    
    if (!userTokenDoc.exists) {
      throw new HttpsError('not-found', 'No FCM token found for user');
    }

    const { token } = userTokenDoc.data()!;
    
    // Subscribe to topic
    const messaging = getMessaging();
    await messaging.subscribeToTopic([token], topic);
    
    // Track subscription
    await db.collection('userTopicSubscriptions').doc(`${request.auth.uid}_${topic}`).set({
      userId: request.auth.uid,
      topic,
      subscribedAt: new Date(),
      active: true
    });

    logger.info(`User ${request.auth.uid} subscribed to topic ${topic}`);
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
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { topic } = request.data;
  
  if (!topic) {
    throw new HttpsError('invalid-argument', 'Topic is required');
  }

  try {
    // Get user's FCM token
    const db = getFirestore();
    const userTokenDoc = await db.collection('userFCMTokens').doc(request.auth.uid).get();
    
    if (!userTokenDoc.exists) {
      throw new HttpsError('not-found', 'No FCM token found for user');
    }

    const { token } = userTokenDoc.data()!;
    
    // Unsubscribe from topic
    const messaging = getMessaging();
    await messaging.unsubscribeFromTopic([token], topic);
    
    // Update subscription record
    await db.collection('userTopicSubscriptions').doc(`${request.auth.uid}_${topic}`).update({
      active: false,
      unsubscribedAt: new Date()
    });

    logger.info(`User ${request.auth.uid} unsubscribed from topic ${topic}`);
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
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { title = 'Wishlist Wizard', body = 'This is a test notification.' } = request.data || {};

  try {
    const db = getFirestore();
    const tokenDoc = await db.collection('userFCMTokens').doc(request.auth.uid).get();

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

    logger.info(`Test notification sent to user ${request.auth.uid}`);
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
    
    // Get wishlist details
    const wishlistDoc = await db.collection('wishlists').doc(itemData.wishlistId.toString()).get();
    if (!wishlistDoc.exists) return;
    
    const wishlistData = wishlistDoc.data()!;
    
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
    const notifications = notificationTargets.map(userId => 
      sendNotificationToUser(userId, {
        title: 'New Item Added',
        body: `"${itemData.title}" was added to "${wishlistData.name}"`,
        data: {
          type: 'item_added',
          wishlistId: wishlistData.id.toString(),
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
      
      // Get wishlist details
      const wishlistDoc = await db.collection('wishlists').doc(afterData.wishlistId.toString()).get();
      if (!wishlistDoc.exists) return;
      
      const wishlistData = wishlistDoc.data()!;
      
      // Get reserver details
      const reserverDoc = await db.collection('users').doc(afterData.reservedByUserId).get();
      const reserverName = reserverDoc.exists ? 
        (reserverDoc.data()!.displayName || reserverDoc.data()!.username) : 'Someone';

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
      
      // Get wishlist details
      const wishlistDoc = await db.collection('wishlists').doc(afterData.wishlistId.toString()).get();
      if (!wishlistDoc.exists) return;
      
      const wishlistData = wishlistDoc.data()!;
      
      // Get purchaser details
      const purchaserDoc = await db.collection('users').doc(afterData.purchasedByUserId).get();
      const purchaserName = purchaserDoc.exists ? 
        (purchaserDoc.data()!.displayName || purchaserDoc.data()!.username) : 'Someone';

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
      
      // Get item details
      const itemDoc = await db.collection('wishlistItems').doc(afterData.itemId.toString()).get();
      if (!itemDoc.exists) return;
      
      const itemData = itemDoc.data()!;

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
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
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
async function sendNotificationToUser(
  userId: string, 
  notification: {
    title: string;
    body: string;
    data?: { [key: string]: string };
  }
): Promise<void> {
  try {
    const db = getFirestore();
    
    // Get user's FCM token
    const userTokenDoc = await db.collection('userFCMTokens').doc(userId).get();
    if (!userTokenDoc.exists) {
      logger.warn(`No FCM token found for user ${userId}`);
      return;
    }

    const { token, enabled } = userTokenDoc.data()!;
    
    if (!enabled) {
      logger.info(`Notifications disabled for user ${userId}`);
      return;
    }

    // Check user's notification preferences
    const prefsDoc = await db.collection('userNotificationPreferences').doc(userId).get();
    if (prefsDoc.exists) {
      const prefs = prefsDoc.data()!;
      
      // Check if notifications are globally disabled
      if (!prefs.enabled || !prefs.delivery?.push) {
        logger.info(`Push notifications disabled for user ${userId}`);
        return;
      }

      // Check if specific notification type is disabled
      const notificationType = notification.data?.type;
      if (notificationType && prefs.types && !prefs.types[notificationType]) {
        logger.info(`Notification type ${notificationType} disabled for user ${userId}`);
        return;
      }

      // Check quiet hours
      if (prefs.quietHours?.enabled && isInQuietHours(prefs.quietHours)) {
        logger.info(`Notification suppressed due to quiet hours for user ${userId}`);
        return;
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

    await messaging.send(message);
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
  }
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
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { userIds, notification } = request.data;
  
  if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
    throw new HttpsError('invalid-argument', 'userIds array is required');
  }

  if (!notification || !notification.title || !notification.body) {
    throw new HttpsError('invalid-argument', 'Notification title and body are required');
  }

  try {
    const notifications = userIds.map(userId => sendNotificationToUser(userId, notification));
    await Promise.all(notifications);
    
    logger.info(`Batch notification sent to ${userIds.length} users`);
    return { success: true, sent: userIds.length };
  } catch (error) {
    logger.error('Error sending batch notification:', error);
    throw new HttpsError('internal', 'Failed to send batch notification');
  }
});