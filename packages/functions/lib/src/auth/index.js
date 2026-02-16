"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserProfile = exports.getUserProfile = exports.createUserProfile = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
const logger = __importStar(require("firebase-functions/logger"));
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
    static verifyAuthenticated(context) {
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
/**
 * Create user profile in Firestore when user signs up
 */
exports.createUserProfile = functions.https.onCall(async (request) => {
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
    }
    catch (error) {
        logger.error("Error creating user profile:", error);
        throw new Error("Failed to create user profile");
    }
});
/**
 * Get user profile from Firestore
 */
exports.getUserProfile = functions.https.onCall(async (request) => {
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
    }
    catch (error) {
        logger.error("Error getting user profile:", error);
        throw new Error("Failed to get user profile");
    }
});
/**
 * Update user profile in Firestore
 */
exports.updateUserProfile = functions.https.onCall(async (request) => {
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
        const updateData = Object.assign(Object.assign({}, updates), { updatedAt: admin.firestore.FieldValue.serverTimestamp() });
        await firestore.collection('users').doc(userId).update(updateData);
        logger.info(`User profile updated for ${userId}`);
        return { success: true };
    }
    catch (error) {
        logger.error("Error updating user profile:", error);
        throw new Error("Failed to update user profile");
    }
});
//# sourceMappingURL=index.js.map