// Firebase Functions - Authentication API
// Replaces Express.js auth routes with Firebase Auth integration

import { onCall, HttpsError, CallableRequest } from 'firebase-functions/v2/https';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { ensureFirebaseAdmin } from '../firebase-admin.js';

ensureFirebaseAdmin();
const auth = getAuth();
const db = getFirestore();

// Removed unused AuthUser interface - using Firebase Auth types directly

/**
 * Get Current User Profile
 * Replaces: GET /api/auth/me
 */
export const getCurrentUser = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const userRecord = await auth.getUser(request.auth.uid);
    const userDoc = await db.collection('users').doc(request.auth.uid).get();
    
    const userData = userDoc.exists ? userDoc.data() : {};
    
    return {
      id: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || userData?.displayName,
      photoURL: userRecord.photoURL || userData?.avatarUrl,
      emailVerified: userRecord.emailVerified,
      createdAt: userRecord.metadata.creationTime,
      ...userData
    };
  } catch (error) {
    logger.error('Error getting current user:', error);
    throw new HttpsError('internal', 'Failed to get user information');
  }
});

/**
 * Update User Profile
 * Replaces: PATCH /api/auth/profile
 */
export const updateUserProfile = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { displayName, photoURL, username, bio } = request.data;

  try {
    // Update Firebase Auth profile
    const updateData: any = {};
    if (displayName !== undefined) updateData.displayName = displayName;
    if (photoURL !== undefined) updateData.photoURL = photoURL;

    if (Object.keys(updateData).length > 0) {
      await auth.updateUser(request.auth.uid, updateData);
    }

    // Update Firestore user document
    const userDocData: any = {};
    if (displayName !== undefined) userDocData.displayName = displayName;
    if (photoURL !== undefined) userDocData.avatarUrl = photoURL;
    if (username !== undefined) userDocData.username = username;
    if (bio !== undefined) userDocData.bio = bio;
    
    if (Object.keys(userDocData).length > 0) {
      userDocData.updatedAt = new Date();
      await db.collection('users').doc(request.auth.uid).set(userDocData, { merge: true });
    }

    return { success: true };
  } catch (error) {
    logger.error('Error updating user profile:', error);
    throw new HttpsError('internal', 'Failed to update user profile');
  }
});

/**
 * Create User Document
 * Called automatically when a new user signs up via Firebase Auth
 */
export const createUserDocument = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const userRecord = await auth.getUser(request.auth.uid);
    
    const userData = {
      id: userRecord.uid,
      email: userRecord.email,
      displayName: userRecord.displayName || null,
      username: userRecord.email?.split('@')[0] || null,
      avatarUrl: userRecord.photoURL || null,
      emailVerified: userRecord.emailVerified,
      createdAt: new Date(),
      updatedAt: new Date(),
      preferences: {
        notifications: {
          email: true,
          push: true,
          priceAlerts: true,
          wishlistUpdates: true
        },
        privacy: {
          profileVisibility: 'private',
          showEmail: false
        }
      }
    };

    await db.collection('users').doc(request.auth.uid).set(userData);
    
    return userData;
  } catch (error) {
    logger.error('Error creating user document:', error);
    throw new HttpsError('internal', 'Failed to create user document');
  }
});

/**
 * Search Users for Collaboration
 * Replaces: GET /api/users/search
 */
export const searchUsers = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  const { query, limit = 10 } = request.data;

  if (!query || query.length < 2) {
    throw new HttpsError('invalid-argument', 'Query must be at least 2 characters');
  }

  try {
    // Search by username and displayName
    // Note: Firestore doesn't support full-text search, so this is a basic implementation
    // For production, consider using Algolia or Elasticsearch
    const usersRef = db.collection('users');
    const results: any[] = [];

    // Search by username
    const usernameQuery = await usersRef
      .where('username', '>=', query.toLowerCase())
      .where('username', '<=', query.toLowerCase() + '\uf8ff')
      .limit(limit)
      .get();

    usernameQuery.forEach(doc => {
      const userData = doc.data();
      results.push({
        id: doc.id,
        username: userData.username,
        displayName: userData.displayName,
        avatarUrl: userData.avatarUrl,
        email: userData.email // Be careful about exposing emails
      });
    });

    // Search by displayName if not enough results
    if (results.length < limit) {
      const displayNameQuery = await usersRef
        .where('displayName', '>=', query)
        .where('displayName', '<=', query + '\uf8ff')
        .limit(limit - results.length)
        .get();

      displayNameQuery.forEach(doc => {
        const userData = doc.data();
        // Avoid duplicates
        if (!results.some(r => r.id === doc.id)) {
          results.push({
            id: doc.id,
            username: userData.username,
            displayName: userData.displayName,
            avatarUrl: userData.avatarUrl,
            email: userData.email
          });
        }
      });
    }

    return { users: results.slice(0, limit) };
  } catch (error) {
    logger.error('Error searching users:', error);
    throw new HttpsError('internal', 'Failed to search users');
  }
});

/**
 * Delete User Account
 * Complete user account deletion including all data
 */
export const deleteUserAccount = onCall(async (request: CallableRequest) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  try {
    const uid = request.auth.uid;

    // Delete user data from Firestore
    const batch = db.batch();
    
    // Delete user document
    batch.delete(db.collection('users').doc(uid));
    
    // Delete user's wishlists
    const wishlistsSnapshot = await db.collection('wishlists').where('userId', '==', uid).get();
    wishlistsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete user's notifications
    const notificationsSnapshot = await db.collection('notifications').where('userId', '==', uid).get();
    notificationsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });
    
    // Delete user's price alerts
    const priceAlertsSnapshot = await db.collection('priceAlerts').where('userId', '==', uid).get();
    priceAlertsSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    // Commit the batch
    await batch.commit();
    
    // Delete Firebase Auth user
    await auth.deleteUser(uid);
    
    logger.info(`User account deleted: ${uid}`);
    return { success: true };
  } catch (error) {
    logger.error('Error deleting user account:', error);
    throw new HttpsError('internal', 'Failed to delete user account');
  }
});