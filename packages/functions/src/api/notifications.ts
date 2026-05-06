// Firebase Functions - Notifications API
// Replaces Express.js notification routes with Firebase Functions and Firestore

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { ensureFirebaseAdmin } from '../firebase-admin.js';
import { requireAuthenticatedUser, requireAdminUser } from '../utils/auth-guards.js';
import { requireAppCheck } from '../utils/app-check.js';
import { CustomTrace } from '../utils/performance-monitoring.js';
import { logErrorWithContext } from '../utils/error-reporting.js';

ensureFirebaseAdmin();
const db = getFirestore();

// Removed unused NotificationData interface - using Firestore document structure directly

/**
 * Get User Notifications
 * Replaces: GET /api/notifications
 */
export const getUserNotifications = onCall(async (request: CallableRequest) => {
  const userId = requireAuthenticatedUser(request);

  const { limit = 20 } = request.data;

  const trace = new CustomTrace('get_user_notifications');
  trace.putAttribute('user_id', userId);
  trace.putAttribute('limit', String(limit));

  return trace.executeAsync(async () => {
    try {
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

    trace.incrementMetric('notifications_retrieved', notifications.length);
    return {
      notifications,
      unreadCount: unreadSnapshot.data().count
    };
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'get_user_notifications',
        userId,
        limit
      });
      throw new HttpsError('internal', 'Failed to get notifications');
    }
  });
});

/**
 * Mark Notification as Read
 * Replaces: PATCH /api/notifications/:id/read
 */
export const markNotificationAsRead = onCall(async (request: CallableRequest) => {
  // WP-03: Verify device integrity before mutation
  await requireAppCheck(request);

  const userId = requireAuthenticatedUser(request);

  const { notificationId } = request.data;
  if (!notificationId) {
    throw new HttpsError('invalid-argument', 'Notification ID is required');
  }

  const trace = new CustomTrace('mark_notification_as_read');
  trace.putAttribute('notification_id', notificationId);
  trace.putAttribute('user_id', userId);

  return trace.executeAsync(async () => {
    try {
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

    trace.incrementMetric('notifications_marked_read', 1);
    return {
      id: notificationId,
      ...notificationData,
      isRead: true,
      readAt: new Date()
    };
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'mark_notification_as_read',
        userId,
        notificationId
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Failed to mark notification as read');
    }
  });
});

/**
 * Mark All Notifications as Read
 * Replaces: POST /api/notifications/mark-all-read
 */
export const markAllNotificationsAsRead = onCall(async (request: CallableRequest) => {
  // WP-03: Verify device integrity before mutation
  await requireAppCheck(request);

  const userId = requireAuthenticatedUser(request);

  const trace = new CustomTrace('mark_all_notifications_as_read');
  trace.putAttribute('user_id', userId);

  return trace.executeAsync(async () => {
    try {
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

    trace.incrementMetric('all_notifications_marked_read', unreadNotificationsSnapshot.docs.length);
    return { success: true, updatedCount: unreadNotificationsSnapshot.docs.length };
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'mark_all_notifications_as_read',
        userId
      });
      throw new HttpsError('internal', 'Failed to mark all notifications as read');
    }
  });
});

/**
 * Delete Notification
 * Replaces: DELETE /api/notifications/:id
 */
export const deleteNotification = onCall(async (request: CallableRequest) => {
  // WP-03: Verify device integrity before mutation
  await requireAppCheck(request);

  const userId = requireAuthenticatedUser(request);

  const { notificationId } = request.data;
  if (!notificationId) {
    throw new HttpsError('invalid-argument', 'Notification ID is required');
  }

  const trace = new CustomTrace('delete_notification');
  trace.putAttribute('notification_id', notificationId);
  trace.putAttribute('user_id', userId);

  return trace.executeAsync(async () => {
    try {
      const notificationDoc = await db.collection('notifications').doc(notificationId).get();

      if (!notificationDoc.exists) {
        throw new HttpsError('not-found', 'Notification not found');
      }

      const notificationData = notificationDoc.data();
      if (notificationData?.userId !== userId) {
        throw new HttpsError('permission-denied', 'You can only delete your own notifications');
      }

      await db.collection('notifications').doc(notificationId).delete();

    trace.incrementMetric('notifications_deleted', 1);
    return { success: true };
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'delete_notification',
        userId,
        notificationId
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Failed to delete notification');
    }
  });
});

/**
 * Create System Notification
 * Internal function for creating system notifications
 */
export const createSystemNotification = onCall(async (request: CallableRequest) => {
  await requireAdminUser(request, 'Admin role required to create system notifications');

  const { targetUserId, type, title, content, data, actionUrl } = request.data;

  if (!targetUserId || !type || !title || !content) {
    throw new HttpsError('invalid-argument', 'targetUserId, type, title, and content are required');
  }

  const trace = new CustomTrace('create_system_notification');
  trace.putAttribute('target_user_id', targetUserId);
  trace.putAttribute('notification_type', type);

  return trace.executeAsync(async () => {
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

    trace.incrementMetric('system_notifications_created', 1);
    return { id: docRef.id, ...notificationData };
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'create_system_notification',
        targetUserId,
        notificationType: type
      });
      throw new HttpsError('internal', 'Failed to create notification');
    }
  });
});

/**
 * Get Notification Settings
 * Get user's notification preferences
 */
export const getNotificationSettings = onCall(async (request: CallableRequest) => {
  const userId = requireAuthenticatedUser(request);

  const trace = new CustomTrace('get_notification_settings');
  trace.putAttribute('user_id', userId);

  return trace.executeAsync(async () => {
    try {
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

    trace.incrementMetric('settings_retrieved', 1);
    return userData?.preferences?.notifications || defaultSettings;
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'get_notification_settings',
        userId
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Failed to get notification settings');
    }
  });
});

/**
 * Update Notification Settings
 * Update user's notification preferences
 */
export const updateNotificationSettings = onCall(async (request: CallableRequest) => {
  // WP-03: Verify device integrity before mutation
  await requireAppCheck(request);

  const userId = requireAuthenticatedUser(request);

  const { settings } = request.data;
  if (!settings || typeof settings !== 'object') {
    throw new HttpsError('invalid-argument', 'Valid settings object is required');
  }

  const trace = new CustomTrace('update_notification_settings');
  trace.putAttribute('user_id', userId);

  return trace.executeAsync(async () => {
    try {
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

    trace.incrementMetric('settings_updated', 1);
    return { success: true, settings: filteredSettings };
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'update_notification_settings',
        userId
      });
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Failed to update notification settings');
    }
  });
});

/**
 * Clean Old Notifications
 * Internal function to clean up old notifications (called by scheduled function)
 */
export const cleanOldNotifications = onCall(async (request: CallableRequest) => {
  await requireAdminUser(request, 'Admin role required to clean notifications');

  const trace = new CustomTrace('clean_old_notifications');
  trace.putAttribute('operation', 'admin_cleanup');

  return trace.executeAsync(async () => {
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
    trace.incrementMetric('old_notifications_deleted', oldNotificationsSnapshot.docs.length);
    return { deletedCount: oldNotificationsSnapshot.docs.length };
    } catch (error) {
      logErrorWithContext(error, {
        operation: 'clean_old_notifications',
        operation_type: 'admin_cleanup'
      });
      throw new HttpsError('internal', 'Failed to clean old notifications');
    }
  });
});