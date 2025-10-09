// Firebase Functions - Notifications API
// Replaces Express.js notification routes with Firebase Functions and Firestore

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';

const db = getFirestore();

interface NotificationData {
  type: string;
  title: string;
  content: string;
  data?: any;
  actionUrl?: string;
}

/**
 * Get User Notifications
 * Replaces: GET /api/notifications
 */
export const getUserNotifications = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { limit = 20 } = request.data;

  try {
    const userId = request.auth.uid;
    
    // Get notifications for the user
    const notificationsSnapshot = await db
      .collection('notifications')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const notifications = notificationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Get unread count
    const unreadSnapshot = await db
      .collection('notifications')
      .where('userId', '==', userId)
      .where('isRead', '==', false)
      .count()
      .get();

    return {
      notifications,
      unreadCount: unreadSnapshot.data().count
    };
  } catch (error) {
    logger.error('Error getting user notifications:', error);
    throw new HttpsError('internal', 'Failed to get notifications');
  }
});

/**
 * Mark Notification as Read
 * Replaces: PATCH /api/notifications/:id/read
 */
export const markNotificationAsRead = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { notificationId } = request.data;
  if (!notificationId) {
    throw new HttpsError('invalid-argument', 'Notification ID is required');
  }

  try {
    const userId = request.auth.uid;
    const notificationDoc = await db.collection('notifications').doc(notificationId).get();

    if (!notificationDoc.exists) {
      throw new HttpsError('not-found', 'Notification not found');
    }

    const notificationData = notificationDoc.data();
    if (notificationData?.userId !== userId) {
      throw new HttpsError('permission-denied', 'You can only update your own notifications');
    }

    await db.collection('notifications').doc(notificationId).update({
      isRead: true,
      readAt: new Date()
    });

    return {
      id: notificationId,
      ...notificationData,
      isRead: true,
      readAt: new Date()
    };
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to mark notification as read');
  }
});

/**
 * Mark All Notifications as Read
 * Replaces: POST /api/notifications/mark-all-read
 */
export const markAllNotificationsAsRead = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const userId = request.auth.uid;
    
    // Get all unread notifications
    const unreadNotificationsSnapshot = await db
      .collection('notifications')
      .where('userId', '==', userId)
      .where('isRead', '==', false)
      .get();

    if (unreadNotificationsSnapshot.empty) {
      return { success: true, updatedCount: 0 };
    }

    // Batch update all unread notifications
    const batch = db.batch();
    const readAt = new Date();

    unreadNotificationsSnapshot.docs.forEach(doc => {
      batch.update(doc.ref, {
        isRead: true,
        readAt
      });
    });

    await batch.commit();

    return { success: true, updatedCount: unreadNotificationsSnapshot.docs.length };
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    throw new HttpsError('internal', 'Failed to mark all notifications as read');
  }
});

/**
 * Delete Notification
 * Replaces: DELETE /api/notifications/:id
 */
export const deleteNotification = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { notificationId } = request.data;
  if (!notificationId) {
    throw new HttpsError('invalid-argument', 'Notification ID is required');
  }

  try {
    const userId = request.auth.uid;
    const notificationDoc = await db.collection('notifications').doc(notificationId).get();

    if (!notificationDoc.exists) {
      throw new HttpsError('not-found', 'Notification not found');
    }

    const notificationData = notificationDoc.data();
    if (notificationData?.userId !== userId) {
      throw new HttpsError('permission-denied', 'You can only delete your own notifications');
    }

    await db.collection('notifications').doc(notificationId).delete();

    return { success: true };
  } catch (error) {
    logger.error('Error deleting notification:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to delete notification');
  }
});

/**
 * Create System Notification
 * Internal function for creating system notifications
 */
export const createSystemNotification = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { targetUserId, type, title, content, data, actionUrl } = request.data;

  if (!targetUserId || !type || !title || !content) {
    throw new HttpsError('invalid-argument', 'targetUserId, type, title, and content are required');
  }

  try {
    const notificationData = {
      userId: targetUserId,
      type,
      title,
      content,
      data: data || {},
      actionUrl: actionUrl || null,
      isRead: false,
      createdAt: new Date()
    };

    const docRef = await db.collection('notifications').add(notificationData);

    return { id: docRef.id, ...notificationData };
  } catch (error) {
    logger.error('Error creating system notification:', error);
    throw new HttpsError('internal', 'Failed to create notification');
  }
});

/**
 * Get Notification Settings
 * Get user's notification preferences
 */
export const getNotificationSettings = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const userId = request.auth.uid;
    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();
    const defaultSettings = {
      email: true,
      push: true,
      priceAlerts: true,
      wishlistUpdates: true,
      collaborationUpdates: true,
      marketingEmails: false
    };

    return userData?.preferences?.notifications || defaultSettings;
  } catch (error) {
    logger.error('Error getting notification settings:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to get notification settings');
  }
});

/**
 * Update Notification Settings
 * Update user's notification preferences
 */
export const updateNotificationSettings = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { settings } = request.data;
  if (!settings || typeof settings !== 'object') {
    throw new HttpsError('invalid-argument', 'Valid settings object is required');
  }

  try {
    const userId = request.auth.uid;
    
    const allowedSettings = [
      'email', 'push', 'priceAlerts', 'wishlistUpdates', 
      'collaborationUpdates', 'marketingEmails'
    ];

    const filteredSettings: any = {};
    for (const [key, value] of Object.entries(settings)) {
      if (allowedSettings.includes(key) && typeof value === 'boolean') {
        filteredSettings[key] = value;
      }
    }

    if (Object.keys(filteredSettings).length === 0) {
      throw new HttpsError('invalid-argument', 'No valid settings provided');
    }

    await db.collection('users').doc(userId).set({
      preferences: {
        notifications: filteredSettings
      }
    }, { merge: true });

    return { success: true, settings: filteredSettings };
  } catch (error) {
    logger.error('Error updating notification settings:', error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError('internal', 'Failed to update notification settings');
  }
});

/**
 * Clean Old Notifications
 * Internal function to clean up old notifications (called by scheduled function)
 */
export const cleanOldNotifications = onCall(async (request: CallableRequest) => {
  // This should typically be called by a scheduled function, not directly by users
  // Adding basic auth check for security
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    // Delete notifications older than 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const oldNotificationsSnapshot = await db
      .collection('notifications')
      .where('createdAt', '<', cutoffDate)
      .limit(500) // Process in batches to avoid timeout
      .get();

    if (oldNotificationsSnapshot.empty) {
      return { deletedCount: 0 };
    }

    const batch = db.batch();
    oldNotificationsSnapshot.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();

    logger.info(`Deleted ${oldNotificationsSnapshot.docs.length} old notifications`);
    return { deletedCount: oldNotificationsSnapshot.docs.length };
  } catch (error) {
    logger.error('Error cleaning old notifications:', error);
    throw new HttpsError('internal', 'Failed to clean old notifications');
  }
});