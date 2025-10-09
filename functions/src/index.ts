import {onRequest} from "firebase-functions/v2/https";
import {setGlobalOptions} from "firebase-functions/v2";
import * as logger from "firebase-functions/logger";
import express from "express";
import cors from "cors";

// Set global options for all functions
setGlobalOptions({maxInstances: 10});

// Create Express app for backward compatibility and health checks
const app = express();

// Enable CORS for all routes
app.use(cors({
  origin: [
    'https://wishlist-wizard.web.app',
    'https://wishlist-wizard.firebaseapp.com',
    'http://localhost:3000',
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Add request logging
app.use((req: any, res: any, next: any) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    logger.info(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
  });

  next();
});

// Health check endpoint
app.get("/health", (req: any, res: any) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    message: "Firebase Functions API is running"
  });
});

// Migration status endpoint
app.get("/migration-status", (req: any, res: any) => {
  res.json({
    status: "migrated",
    message: "Express.js API has been migrated to Firebase Functions",
    availableFunctions: [
      "Authentication API (Firebase Auth integration)",
      "Wishlist Management (Firestore-native)",
      "Notifications System (Real-time)",
      "Price Tracking (Cloud Functions + Scheduler)",
      "Browser Extension API (JWT auth)",
      "Collaborative Features (Real-time sync)"
    ],
    endpoints: {
      auth: ["getCurrentUser", "updateUserProfile", "createUserDocument", "searchUsers", "deleteUserAccount"],
      wishlists: ["getUserWishlists", "getWishlistById", "createWishlist", "updateWishlist", "deleteWishlist", "getWishlistItems", "addWishlistItem"],
      notifications: ["getUserNotifications", "markNotificationAsRead", "markAllNotificationsAsRead", "deleteNotification"],
      priceTracking: ["scheduledPriceCheck", "createPriceAlert", "getUserPriceAlerts", "updatePriceAlert", "deletePriceAlert"]
    }
  });
});

// Error handling middleware
app.use((err: any, req: any, res: any, next: any) => {
  logger.error("Error:", err);
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({ message });
});

// Export the Express app as a Firebase Function (for health checks and migration status)
export const api = onRequest({
  maxInstances: 5,
  memory: "256MiB",
  timeoutSeconds: 30,
  cors: true
}, app);

// Export Firebase-native price tracking functions
export { 
  scheduledPriceCheck,
  createPriceAlert,
  getUserPriceAlerts,
  updatePriceAlert,
  deletePriceAlert,
  manualPriceCheck,
  onPriceAlertCreated
} from './firebase-price-tracking';

// Export Authentication API functions
export {
  getCurrentUser,
  updateUserProfile,
  createUserDocument,
  searchUsers,
  deleteUserAccount
} from './api/auth';

// Export Wishlist API functions
export {
  getUserWishlists,
  getWishlistById,
  getSharedWishlist,
  createWishlist,
  updateWishlist,
  deleteWishlist,
  getWishlistItems,
  addWishlistItem
} from './api/wishlists';

// Export Notification API functions
export {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  createSystemNotification,
  getNotificationSettings,
  updateNotificationSettings,
  cleanOldNotifications
} from './api/notifications';

// Export Browser Extension API functions
export {
  authenticateExtension,
  getExtensionWishlists,
  addItemFromExtension,
  getExtensionRecentItems,
  createExtensionWishlist,
  deleteExtensionItem,
  getExtensionAnalytics
} from './api/extension';

// Export Firebase Cloud Messaging functions
export {
  saveFCMToken,
  removeFCMToken,
  subscribeToTopic,
  unsubscribeFromTopic,
  sendTestNotification,
  sendBatchNotification,
  notifyItemAdded,
  notifyItemReserved,
  notifyItemPurchased,
  notifyPriceAlert
} from './fcm';
