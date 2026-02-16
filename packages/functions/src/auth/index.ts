import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";

// Initialize Firebase Admin (safe for multiple imports)
if (!admin.apps.length) {
  admin.initializeApp();
}
const firestore = admin.firestore();

/**
 * Authentication helpers for Firebase Functions
 */
class FunctionsAuthHelpers {
  /**
   * Verify user is authenticated and return user info
   * Throws HttpsError if not authenticated
   */
  static verifyAuthenticated(context: any): { uid: string; email?: string; token: any } {
    if (!context.auth) {
      const { HttpsError } = require('firebase-functions');
      throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    return {
      uid: context.auth.uid,
      email: context.auth.token.email,
      token: context.auth.token
    };
  }
}

export interface AuthUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  emailVerified?: boolean;
}

/**
 * Create user profile in Firestore when user signs up
 */
export const createUserProfile = functions.https.onCall(async (request) => {
  // Verify authentication using shared helpers
  const user = FunctionsAuthHelpers.verifyAuthenticated(request);
  const { userId, email, displayName, photoURL } = request.data;

  if (!userId) {
    throw new Error("User ID is required");
  }

  // Ensure the authenticated user can only create their own profile
  if (user.uid !== userId) {
    throw new Error("Cannot create profile for another user");
  }

  try {
    const userProfile = {
      uid: userId,
      email: email || user.email || null,
      displayName: displayName || null,
      photoURL: photoURL || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      emailVerified: false,
    };

    await firestore.collection('users').doc(userId).set(userProfile);
    logger.info(`User profile created for ${userId}`);
    return { success: true, user: userProfile };
  } catch (error) {
    logger.error("Error creating user profile:", error);
    throw new Error("Failed to create user profile");
  }
});

/**
 * Get user profile from Firestore
 */
export const getUserProfile = functions.https.onCall(async (request) => {
  // Verify authentication using shared helpers
  const user = FunctionsAuthHelpers.verifyAuthenticated(request);
  const { userId } = request.data;

  if (!userId) {
    throw new Error("User ID is required");
  }

  // Ensure the authenticated user can only access their own profile
  if (user.uid !== userId) {
    throw new Error("Cannot access profile for another user");
  }

  try {
    const userDoc = await firestore.collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new Error("User profile not found");
    }

    return { success: true, user: userDoc.data() };
  } catch (error) {
    logger.error("Error getting user profile:", error);
    throw new Error("Failed to get user profile");
  }
});

/**
 * Update user profile in Firestore
 */
export const updateUserProfile = functions.https.onCall(async (request) => {
  // Verify authentication using shared helpers
  const user = FunctionsAuthHelpers.verifyAuthenticated(request);
  const { userId, updates } = request.data;

  if (!userId || !updates) {
    throw new Error("User ID and updates are required");
  }

  // Ensure the authenticated user can only update their own profile
  if (user.uid !== userId) {
    throw new Error("Cannot update profile for another user");
  }

  try {
    const updateData = {
      ...updates,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await firestore.collection('users').doc(userId).update(updateData);
    logger.info(`User profile updated for ${userId}`);
    return { success: true };
  } catch (error) {
    logger.error("Error updating user profile:", error);
    throw new Error("Failed to update user profile");
  }
});
