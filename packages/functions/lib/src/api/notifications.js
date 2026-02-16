"use strict";
// Firebase Functions - Notifications API
// Replaces Express.js notification routes with Firebase Functions and Firestore
Object.defineProperty(exports, "__esModule", { value: true });
exports.cleanOldNotifications = exports.updateNotificationSettings = exports.getNotificationSettings = exports.createSystemNotification = exports.deleteNotification = exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.getUserNotifications = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const v2_1 = require("firebase-functions/v2");
const db = (0, firestore_1.getFirestore)();
// Removed unused NotificationData interface - using Firestore document structure directly
/**
 * Get User Notifications
 * Replaces: GET /api/notifications
 */
exports.getUserNotifications = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
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
        const notifications = notificationsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
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
    }
    catch (error) {
        v2_1.logger.error('Error getting user notifications:', error);
        throw new https_1.HttpsError('internal', 'Failed to get notifications');
    }
});
/**
 * Mark Notification as Read
 * Replaces: PATCH /api/notifications/:id/read
 */
exports.markNotificationAsRead = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { notificationId } = request.data;
    if (!notificationId) {
        throw new https_1.HttpsError('invalid-argument', 'Notification ID is required');
    }
    try {
        const userId = request.auth.uid;
        const notificationDoc = await db.collection('notifications').doc(notificationId).get();
        if (!notificationDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Notification not found');
        }
        const notificationData = notificationDoc.data();
        if ((notificationData === null || notificationData === void 0 ? void 0 : notificationData.userId) !== userId) {
            throw new https_1.HttpsError('permission-denied', 'You can only update your own notifications');
        }
        await db.collection('notifications').doc(notificationId).update({
            isRead: true,
            readAt: new Date()
        });
        return Object.assign(Object.assign({ id: notificationId }, notificationData), { isRead: true, readAt: new Date() });
    }
    catch (error) {
        v2_1.logger.error('Error marking notification as read:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Failed to mark notification as read');
    }
});
/**
 * Mark All Notifications as Read
 * Replaces: POST /api/notifications/mark-all-read
 */
exports.markAllNotificationsAsRead = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
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
    }
    catch (error) {
        v2_1.logger.error('Error marking all notifications as read:', error);
        throw new https_1.HttpsError('internal', 'Failed to mark all notifications as read');
    }
});
/**
 * Delete Notification
 * Replaces: DELETE /api/notifications/:id
 */
exports.deleteNotification = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { notificationId } = request.data;
    if (!notificationId) {
        throw new https_1.HttpsError('invalid-argument', 'Notification ID is required');
    }
    try {
        const userId = request.auth.uid;
        const notificationDoc = await db.collection('notifications').doc(notificationId).get();
        if (!notificationDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Notification not found');
        }
        const notificationData = notificationDoc.data();
        if ((notificationData === null || notificationData === void 0 ? void 0 : notificationData.userId) !== userId) {
            throw new https_1.HttpsError('permission-denied', 'You can only delete your own notifications');
        }
        await db.collection('notifications').doc(notificationId).delete();
        return { success: true };
    }
    catch (error) {
        v2_1.logger.error('Error deleting notification:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Failed to delete notification');
    }
});
/**
 * Create System Notification
 * Internal function for creating system notifications
 */
exports.createSystemNotification = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { targetUserId, type, title, content, data, actionUrl } = request.data;
    if (!targetUserId || !type || !title || !content) {
        throw new https_1.HttpsError('invalid-argument', 'targetUserId, type, title, and content are required');
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
        return Object.assign({ id: docRef.id }, notificationData);
    }
    catch (error) {
        v2_1.logger.error('Error creating system notification:', error);
        throw new https_1.HttpsError('internal', 'Failed to create notification');
    }
});
/**
 * Get Notification Settings
 * Get user's notification preferences
 */
exports.getNotificationSettings = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    try {
        const userId = request.auth.uid;
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new https_1.HttpsError('not-found', 'User not found');
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
        return ((_a = userData === null || userData === void 0 ? void 0 : userData.preferences) === null || _a === void 0 ? void 0 : _a.notifications) || defaultSettings;
    }
    catch (error) {
        v2_1.logger.error('Error getting notification settings:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Failed to get notification settings');
    }
});
/**
 * Update Notification Settings
 * Update user's notification preferences
 */
exports.updateNotificationSettings = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { settings } = request.data;
    if (!settings || typeof settings !== 'object') {
        throw new https_1.HttpsError('invalid-argument', 'Valid settings object is required');
    }
    try {
        const userId = request.auth.uid;
        const allowedSettings = [
            'email', 'push', 'priceAlerts', 'wishlistUpdates',
            'collaborationUpdates', 'marketingEmails'
        ];
        const filteredSettings = {};
        for (const [key, value] of Object.entries(settings)) {
            if (allowedSettings.includes(key) && typeof value === 'boolean') {
                filteredSettings[key] = value;
            }
        }
        if (Object.keys(filteredSettings).length === 0) {
            throw new https_1.HttpsError('invalid-argument', 'No valid settings provided');
        }
        await db.collection('users').doc(userId).set({
            preferences: {
                notifications: filteredSettings
            }
        }, { merge: true });
        return { success: true, settings: filteredSettings };
    }
    catch (error) {
        v2_1.logger.error('Error updating notification settings:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Failed to update notification settings');
    }
});
/**
 * Clean Old Notifications
 * Internal function to clean up old notifications (called by scheduled function)
 */
exports.cleanOldNotifications = (0, https_1.onCall)(async (request) => {
    // This should typically be called by a scheduled function, not directly by users
    // Adding basic auth check for security
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
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
        v2_1.logger.info(`Deleted ${oldNotificationsSnapshot.docs.length} old notifications`);
        return { deletedCount: oldNotificationsSnapshot.docs.length };
    }
    catch (error) {
        v2_1.logger.error('Error cleaning old notifications:', error);
        throw new https_1.HttpsError('internal', 'Failed to clean old notifications');
    }
});
//# sourceMappingURL=notifications.js.map