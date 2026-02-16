"use strict";
// Firebase Functions - Wishlist API
// Replaces Express.js wishlist routes with Firebase Functions and Firestore
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addWishlistItem = exports.getWishlistItems = exports.deleteWishlist = exports.updateWishlist = exports.createWishlist = exports.getSharedWishlist = exports.getWishlistById = exports.getUserWishlists = void 0;
const https_1 = require("firebase-functions/v2/https");
const firestore_1 = require("firebase-admin/firestore");
const v2_1 = require("firebase-functions/v2");
const helpers_js_1 = require("../utils/helpers.js");
const db = (0, firestore_1.getFirestore)();
// Removed unused interfaces - using Firestore document structure and shared types directly
/**
 * Get User's Wishlists
 * Replaces: GET /api/wishlists
 */
exports.getUserWishlists = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    try {
        const userId = request.auth.uid;
        const wishlistsSnapshot = await db
            .collection('wishlists')
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .get();
        const wishlists = [];
        for (const doc of wishlistsSnapshot.docs) {
            const wishlistData = doc.data();
            // Get item count for each wishlist
            const itemsSnapshot = await db
                .collection('wishlistItems')
                .where('wishlistId', '==', doc.id)
                .count()
                .get();
            wishlists.push(Object.assign(Object.assign({ id: doc.id }, wishlistData), { itemCount: itemsSnapshot.data().count }));
        }
        return wishlists;
    }
    catch (error) {
        v2_1.logger.error('Error getting user wishlists:', error);
        throw new https_1.HttpsError('internal', 'Failed to get wishlists');
    }
});
/**
 * Get Wishlist by ID
 * Replaces: GET /api/wishlists/:id
 */
exports.getWishlistById = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { wishlistId } = request.data;
    if (!wishlistId) {
        throw new https_1.HttpsError('invalid-argument', 'Wishlist ID is required');
    }
    try {
        const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
        if (!wishlistDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Wishlist not found');
        }
        const wishlistData = wishlistDoc.data();
        // Check if user has access to this wishlist
        const userId = request.auth.uid;
        const isOwner = (wishlistData === null || wishlistData === void 0 ? void 0 : wishlistData.userId) === userId;
        const isCollaborator = (wishlistData === null || wishlistData === void 0 ? void 0 : wishlistData.isCollaborative) &&
            await isUserCollaborator(wishlistId, userId);
        if (!isOwner && !isCollaborator && !(wishlistData === null || wishlistData === void 0 ? void 0 : wishlistData.isPublic)) {
            throw new https_1.HttpsError('permission-denied', 'Access denied to this wishlist');
        }
        return Object.assign({ id: wishlistDoc.id }, wishlistData);
    }
    catch (error) {
        v2_1.logger.error('Error getting wishlist by ID:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Failed to get wishlist');
    }
});
/**
 * Get Shared Wishlist by Share ID
 * Replaces: GET /api/shared/:shareId
 */
exports.getSharedWishlist = (0, https_1.onCall)(async (request) => {
    const { shareId } = request.data;
    if (!shareId) {
        throw new https_1.HttpsError('invalid-argument', 'Share ID is required');
    }
    try {
        const wishlistSnapshot = await db
            .collection('wishlists')
            .where('shareId', '==', shareId)
            .limit(1)
            .get();
        if (wishlistSnapshot.empty) {
            throw new https_1.HttpsError('not-found', 'Shared wishlist not found');
        }
        const wishlistDoc = wishlistSnapshot.docs[0];
        const wishlistData = wishlistDoc.data();
        // Get items for this wishlist
        const itemsSnapshot = await db
            .collection('wishlistItems')
            .where('wishlistId', '==', wishlistDoc.id)
            .orderBy('createdAt', 'desc')
            .get();
        const items = itemsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        return {
            wishlist: Object.assign({ id: wishlistDoc.id }, wishlistData),
            items
        };
    }
    catch (error) {
        v2_1.logger.error('Error getting shared wishlist:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Failed to get shared wishlist');
    }
});
/**
 * Create New Wishlist
 * Replaces: POST /api/wishlists
 */
exports.createWishlist = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { name, description, isPublic, isCollaborative, beneficiaryId, occasion, occasionDate } = request.data;
    if (!name || name.trim().length === 0) {
        throw new https_1.HttpsError('invalid-argument', 'Wishlist name is required');
    }
    try {
        const wishlistData = {
            userId: request.auth.uid,
            name: name.trim(),
            description: description || '',
            isPublic: !!isPublic,
            isCollaborative: !!isCollaborative,
            beneficiaryId: beneficiaryId || null,
            occasion: occasion || null,
            occasionDate: occasionDate ? new Date(occasionDate) : null,
            shareId: (0, helpers_js_1.generateId)(),
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const docRef = await db.collection('wishlists').add(wishlistData);
        // Create notification for wishlist creation
        await createNotification(request.auth.uid, {
            type: 'wishlist_created',
            title: 'Wishlist Created',
            content: `Your wishlist "${name}" has been created successfully`,
            data: { wishlistId: docRef.id, wishlistName: name }
        });
        return Object.assign({ id: docRef.id }, wishlistData);
    }
    catch (error) {
        v2_1.logger.error('Error creating wishlist:', error);
        throw new https_1.HttpsError('internal', 'Failed to create wishlist');
    }
});
/**
 * Update Wishlist
 * Replaces: PATCH /api/wishlists/:id
 */
exports.updateWishlist = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const _a = request.data, { wishlistId } = _a, updateData = __rest(_a, ["wishlistId"]);
    if (!wishlistId) {
        throw new https_1.HttpsError('invalid-argument', 'Wishlist ID is required');
    }
    try {
        const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
        if (!wishlistDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Wishlist not found');
        }
        const wishlistData = wishlistDoc.data();
        if ((wishlistData === null || wishlistData === void 0 ? void 0 : wishlistData.userId) !== request.auth.uid) {
            throw new https_1.HttpsError('permission-denied', 'You can only update your own wishlists');
        }
        const validFields = ['name', 'description', 'isPublic', 'isCollaborative', 'beneficiaryId', 'occasion', 'occasionDate'];
        const filteredUpdateData = {};
        for (const [key, value] of Object.entries(updateData)) {
            if (validFields.includes(key)) {
                filteredUpdateData[key] = value;
            }
        }
        if (Object.keys(filteredUpdateData).length === 0) {
            throw new https_1.HttpsError('invalid-argument', 'No valid fields to update');
        }
        filteredUpdateData.updatedAt = new Date();
        await db.collection('wishlists').doc(wishlistId).update(filteredUpdateData);
        return Object.assign(Object.assign({ id: wishlistId }, wishlistData), filteredUpdateData);
    }
    catch (error) {
        v2_1.logger.error('Error updating wishlist:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Failed to update wishlist');
    }
});
/**
 * Delete Wishlist
 * Replaces: DELETE /api/wishlists/:id
 */
exports.deleteWishlist = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { wishlistId } = request.data;
    if (!wishlistId) {
        throw new https_1.HttpsError('invalid-argument', 'Wishlist ID is required');
    }
    try {
        const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
        if (!wishlistDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Wishlist not found');
        }
        const wishlistData = wishlistDoc.data();
        if ((wishlistData === null || wishlistData === void 0 ? void 0 : wishlistData.userId) !== request.auth.uid) {
            throw new https_1.HttpsError('permission-denied', 'You can only delete your own wishlists');
        }
        // Delete all items in the wishlist
        const itemsSnapshot = await db
            .collection('wishlistItems')
            .where('wishlistId', '==', wishlistId)
            .get();
        const batch = db.batch();
        itemsSnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        // Delete the wishlist
        batch.delete(db.collection('wishlists').doc(wishlistId));
        await batch.commit();
        return { success: true };
    }
    catch (error) {
        v2_1.logger.error('Error deleting wishlist:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Failed to delete wishlist');
    }
});
/**
 * Get Wishlist Items
 * Replaces: GET /api/wishlists/:id/items
 */
exports.getWishlistItems = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { wishlistId } = request.data;
    if (!wishlistId) {
        throw new https_1.HttpsError('invalid-argument', 'Wishlist ID is required');
    }
    try {
        // Verify user has access to this wishlist
        const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
        if (!wishlistDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Wishlist not found');
        }
        const wishlistData = wishlistDoc.data();
        const userId = request.auth.uid;
        const isOwner = (wishlistData === null || wishlistData === void 0 ? void 0 : wishlistData.userId) === userId;
        const isCollaborator = (wishlistData === null || wishlistData === void 0 ? void 0 : wishlistData.isCollaborative) &&
            await isUserCollaborator(wishlistId, userId);
        if (!isOwner && !isCollaborator && !(wishlistData === null || wishlistData === void 0 ? void 0 : wishlistData.isPublic)) {
            throw new https_1.HttpsError('permission-denied', 'Access denied to this wishlist');
        }
        const itemsSnapshot = await db
            .collection('wishlistItems')
            .where('wishlistId', '==', wishlistId)
            .orderBy('createdAt', 'desc')
            .get();
        const items = itemsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        return items;
    }
    catch (error) {
        v2_1.logger.error('Error getting wishlist items:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Failed to get wishlist items');
    }
});
/**
 * Add Item to Wishlist
 * Replaces: POST /api/items
 */
exports.addWishlistItem = (0, https_1.onCall)(async (request) => {
    if (!request.auth) {
        throw new https_1.HttpsError('unauthenticated', 'User must be authenticated');
    }
    const { wishlistId, title, description, price, productUrl, imageUrl, store, priority, note } = request.data;
    if (!wishlistId || !title) {
        throw new https_1.HttpsError('invalid-argument', 'Wishlist ID and title are required');
    }
    try {
        // Verify user has permission to add items to this wishlist
        const wishlistDoc = await db.collection('wishlists').doc(wishlistId).get();
        if (!wishlistDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Wishlist not found');
        }
        const wishlistData = wishlistDoc.data();
        const userId = request.auth.uid;
        const isOwner = (wishlistData === null || wishlistData === void 0 ? void 0 : wishlistData.userId) === userId;
        const isCollaborator = (wishlistData === null || wishlistData === void 0 ? void 0 : wishlistData.isCollaborative) &&
            await isUserCollaborator(wishlistId, userId);
        if (!isOwner && !isCollaborator) {
            throw new https_1.HttpsError('permission-denied', 'You do not have permission to add items to this wishlist');
        }
        const itemData = {
            wishlistId,
            title: title.trim(),
            description: description || '',
            price: price || null,
            productUrl: productUrl || null,
            imageUrl: imageUrl || null,
            store: store || null,
            priority: priority || 1,
            note: note || null,
            addedBy: userId,
            reservedBy: null,
            purchasedBy: null,
            createdAt: new Date(),
            updatedAt: new Date()
        };
        const docRef = await db.collection('wishlistItems').add(itemData);
        // Create notifications for collaborative wishlists
        if ((wishlistData === null || wishlistData === void 0 ? void 0 : wishlistData.isCollaborative) && !isOwner) {
            await notifyWishlistCollaborators(wishlistId, userId, `New item "${title}" was added to the wishlist "${wishlistData.name}"`, 'item_added');
        }
        return Object.assign({ id: docRef.id }, itemData);
    }
    catch (error) {
        v2_1.logger.error('Error adding wishlist item:', error);
        if (error instanceof https_1.HttpsError)
            throw error;
        throw new https_1.HttpsError('internal', 'Failed to add wishlist item');
    }
});
// Helper Functions
async function isUserCollaborator(wishlistId, userId) {
    const collaboratorSnapshot = await db
        .collection('collaborators')
        .where('wishlistId', '==', wishlistId)
        .where('userId', '==', userId)
        .limit(1)
        .get();
    return !collaboratorSnapshot.empty;
}
async function createNotification(userId, notificationData) {
    await db.collection('notifications').add(Object.assign(Object.assign({ userId }, notificationData), { isRead: false, createdAt: new Date() }));
}
async function notifyWishlistCollaborators(wishlistId, actorUserId, message, type) {
    const collaboratorsSnapshot = await db
        .collection('collaborators')
        .where('wishlistId', '==', wishlistId)
        .get();
    const notifications = [];
    for (const doc of collaboratorsSnapshot.docs) {
        const collaboratorData = doc.data();
        if (collaboratorData.userId !== actorUserId) {
            notifications.push({
                userId: collaboratorData.userId,
                type,
                title: 'Wishlist Update',
                content: message,
                data: { wishlistId },
                isRead: false,
                createdAt: new Date()
            });
        }
    }
    if (notifications.length > 0) {
        const batch = db.batch();
        notifications.forEach(notification => {
            const docRef = db.collection('notifications').doc();
            batch.set(docRef, notification);
        });
        await batch.commit();
    }
}
//# sourceMappingURL=wishlists.js.map