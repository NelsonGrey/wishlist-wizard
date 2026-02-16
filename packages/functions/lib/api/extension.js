"use strict";
// Firebase Functions - Browser Extension API
// Provides Firebase Auth-compatible API for browser extension
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExtensionAnalytics = exports.deleteExtensionItem = exports.createExtensionWishlist = exports.getExtensionRecentItems = exports.addItemFromExtension = exports.getExtensionWishlists = exports.authenticateExtension = void 0;
const https_1 = require("firebase-functions/v2/https");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const v2_1 = require("firebase-functions/v2");
const auth = (0, auth_1.getAuth)();
const db = (0, firestore_1.getFirestore)();
/**
 * Extension Authentication
 * Validates Firebase ID tokens from browser extension
 */
exports.authenticateExtension = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'Invalid authentication token');
    }
    try {
        const user = await auth.getUser(request.auth.uid);
        const userDoc = await db.collection('users').doc(request.auth.uid).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        return {
            authenticated: true,
            user: {
                id: user.uid,
                email: user.email,
                displayName: user.displayName || (userData === null || userData === void 0 ? void 0 : userData.displayName),
                photoURL: user.photoURL || (userData === null || userData === void 0 ? void 0 : userData.avatarUrl)
            }
        };
    }
    catch (error) {
        v2_1.logger.error('Extension authentication error:', error);
        throw new https_1.HttpsError('unauthenticated', 'Authentication failed');
    }
});
/**
 * Get Extension Wishlists
 * Simplified wishlist endpoint for browser extension
 */
exports.getExtensionWishlists = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    try {
        const userId = request.auth.uid;
        const wishlistsSnapshot = await db
            .collection('wishlists')
            .where('userId', '==', userId)
            .orderBy('updatedAt', 'desc')
            .limit(20)
            .get();
        const wishlists = wishlistsSnapshot.docs.map(doc => ({
            id: doc.id,
            name: doc.data().name,
            description: doc.data().description,
            isPublic: doc.data().isPublic,
            createdAt: doc.data().createdAt,
            updatedAt: doc.data().updatedAt
        }));
        return { wishlists };
    }
    catch (error) {
        v2_1.logger.error('Error getting extension wishlists:', error);
        throw new https_1.HttpsError('internal', 'Failed to get wishlists');
    }
});
/**
 * Add Item from Extension
 * Simplified item addition for browser extension
 */
exports.addItemFromExtension = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { wishlistId, title, productUrl, imageUrl, price, store } = request.data;
    if (!wishlistId || !title) {
        throw new https_1.HttpsError('invalid-argument', 'Wishlist ID and title are required');
    }
    try {
        // Verify user owns the wishlist
        const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
        if (!wishlistDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Wishlist not found');
        }
        const wishlistData = wishlistDoc.data();
        if ((wishlistData === null || wishlistData === void 0 ? void 0 : wishlistData.userId) !== request.auth.uid) {
            throw new https_1.HttpsError('permission-denied', 'You can only add items to your own wishlists');
        }
        const itemData = {
            wishlistId,
            title: title.trim(),
            productUrl: productUrl || null,
            imageUrl: imageUrl || null,
            price: price || null,
            store: store || null,
            addedBy: request.auth.uid,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const docRef = await db.collection('wishlistItems').add(itemData);
        // Track extension usage analytics
        await trackExtensionUsage(request.auth.uid, 'item_added', {
            wishlistId,
            itemTitle: title,
            store,
            hasUrl: !!productUrl,
            hasImage: !!imageUrl,
            hasPrice: !!price
        });
        return Object.assign(Object.assign({ id: docRef.id }, itemData), { success: true, message: `Added "${title}" to your wishlist` });
    }
    catch (error) {
        v2_1.logger.error('Error adding item from extension:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Failed to add item');
    }
});
/**
 * Get Recent Items for Extension
 * Get recently added items across all user's wishlists
 */
exports.getExtensionRecentItems = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { limit = 20 } = request.data;
    try {
        const userId = request.auth.uid;
        // Get user's wishlists
        const wishlistsSnapshot = await db
            .collection('wishlists')
            .where('userId', '==', userId)
            .get();
        const wishlistIds = wishlistsSnapshot.docs.map(doc => doc.id);
        if (wishlistIds.length === 0) {
            return { items: [] };
        }
        // Get recent items from all wishlists
        const itemsSnapshot = await db
            .collection('wishlistItems')
            .where('wishlistId', 'in', wishlistIds.slice(0, 10)) // Firestore 'in' query limit
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();
        const items = itemsSnapshot.docs.map(doc => {
            const itemData = doc.data();
            const wishlist = wishlistsSnapshot.docs.find(w => w.id === itemData.wishlistId);
            return {
                id: doc.id,
                title: itemData.title,
                productUrl: itemData.productUrl,
                imageUrl: itemData.imageUrl,
                price: itemData.price,
                store: itemData.store,
                createdAt: itemData.createdAt,
                wishlistName: (wishlist === null || wishlist === void 0 ? void 0 : wishlist.data().name) || 'Unknown'
            };
        });
        return { items };
    }
    catch (error) {
        v2_1.logger.error('Error getting extension recent items:', error);
        throw new https_1.HttpsError('internal', 'Failed to get recent items');
    }
});
/**
 * Create Wishlist from Extension
 * Quick wishlist creation for browser extension
 */
exports.createExtensionWishlist = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { name } = request.data;
    if (!name || name.trim().length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'Wishlist name is required');
    }
    try {
        const wishlistData = {
            userId: request.auth.uid,
            name: name.trim(),
            description: '',
            isPublic: false,
            isCollaborative: false,
            shareId: generateExtensionId(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const docRef = await db.collection('wishlists').add(wishlistData);
        // Track extension usage
        await trackExtensionUsage(request.auth.uid, 'wishlist_created', {
            wishlistName: name,
            source: 'extension'
        });
        return Object.assign(Object.assign({ id: docRef.id }, wishlistData), { success: true, message: `Created wishlist "${name}"` });
    }
    catch (error) {
        v2_1.logger.error('Error creating wishlist from extension:', error);
        throw new https_1.HttpsError('internal', 'Failed to create wishlist');
    }
});
/**
 * Delete Item from Extension
 * Remove item from wishlist via extension
 */
exports.deleteExtensionItem = (0, https_1.onCall)(async (request) => {
    var _a;
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { itemId } = request.data;
    if (!itemId) {
        throw new https_1.HttpsError('invalid-argument', 'Item ID is required');
    }
    try {
        const itemDoc = await db.collection('wishlistItems').doc(itemId).get();
        if (!itemDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Item not found');
        }
        const itemData = itemDoc.data();
        // Verify user owns the wishlist containing this item
        const wishlistDoc = await db.collection('wishlists').doc(itemData === null || itemData === void 0 ? void 0 : itemData.wishlistId).get();
        if (!wishlistDoc.exists || ((_a = wishlistDoc.data()) === null || _a === void 0 ? void 0 : _a.userId) !== request.auth.uid) {
            throw new https_1.HttpsError('permission-denied', 'You can only delete items from your own wishlists');
        }
        await db.collection('wishlistItems').doc(itemId).delete();
        // Track extension usage
        await trackExtensionUsage(request.auth.uid, 'item_deleted', {
            itemTitle: itemData === null || itemData === void 0 ? void 0 : itemData.title,
            wishlistId: itemData === null || itemData === void 0 ? void 0 : itemData.wishlistId,
            source: 'extension'
        });
        return {
            success: true,
            message: `Deleted "${itemData === null || itemData === void 0 ? void 0 : itemData.title}" from your wishlist`
        };
    }
    catch (error) {
        v2_1.logger.error('Error deleting item from extension:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Failed to delete item');
    }
});
/**
 * Get Extension Analytics
 * Basic usage analytics for extension users
 */
exports.getExtensionAnalytics = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    try {
        const userId = request.auth.uid;
        // Get total wishlists
        const wishlistsCount = await db
            .collection('wishlists')
            .where('userId', '==', userId)
            .count()
            .get();
        // Get total items
        const itemsCount = await db
            .collection('wishlistItems')
            .where('addedBy', '==', userId)
            .count()
            .get();
        // Get recent extension activity
        const recentActivity = await db
            .collection('extensionAnalytics')
            .where('userId', '==', userId)
            .orderBy('timestamp', 'desc')
            .limit(10)
            .get();
        const activities = recentActivity.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        return {
            totalWishlists: wishlistsCount.data().count,
            totalItems: itemsCount.data().count,
            recentActivities: activities
        };
    }
    catch (error) {
        v2_1.logger.error('Error getting extension analytics:', error);
        throw new https_1.HttpsError('internal', 'Failed to get analytics');
    }
});
// Helper Functions
function generateExtensionId() {
    return Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
}
async function trackExtensionUsage(userId, action, data) {
    try {
        await db.collection('extensionAnalytics').add({
            userId,
            action,
            data,
            timestamp: new Date(),
            userAgent: 'browser-extension'
        });
    }
    catch (error) {
        v2_1.logger.error('Error tracking extension usage:', error);
        // Don't throw - analytics shouldn't break main functionality
    }
}
//# sourceMappingURL=extension.js.map