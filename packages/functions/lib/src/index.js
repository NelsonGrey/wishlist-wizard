"use strict";
// Firebase Functions v1 - no global options needed
Object.defineProperty(exports, "__esModule", { value: true });
exports.trackAffiliateClick = exports.convertWishlistAffiliateLinks = exports.batchConvertAffiliateLinks = exports.convertAffiliateLink = exports.notifyPriceAlert = exports.notifyItemPurchased = exports.notifyItemReserved = exports.notifyItemAdded = exports.sendTestNotification = exports.sendTestPushNotification = exports.unsubscribeFromTopic = exports.subscribeToTopic = exports.removeFCMToken = exports.saveFCMToken = exports.deleteWishlistItem = exports.updateWishlistItem = exports.addWishlistItem = exports.getWishlistItems = exports.deleteWishlist = exports.updateWishlist = exports.createWishlist = exports.getSharedWishlist = exports.getWishlistById = exports.getUserWishlists = exports.trackExtensionEvent = exports.getExtensionAnalytics = exports.shareExtensionWishlist = exports.deleteExtensionItem = exports.createExtensionWishlist = exports.getExtensionRecentItems = exports.addItemFromExtension = exports.getExtensionWishlists = exports.authenticateExtension = exports.updateNotificationSettings = exports.getNotificationSettings = exports.createSystemNotification = exports.deleteNotification = exports.markAllNotificationsAsRead = exports.markNotificationAsRead = exports.getUserNotifications = exports.batchUpdateDocuments = exports.batchCreateDocuments = exports.listDocuments = exports.deleteDocument = exports.updateDocument = exports.getDocument = exports.createDocument = exports.updateUserProfile = exports.getUserProfile = exports.createUserProfile = void 0;
exports.getAnalyticsSummary = exports.getAnalyticsEvents = exports.trackAnalyticsEvent = exports.getARModel = exports.lookupBarcode = exports.syncMobileActions = exports.getSyncLogs = exports.logSyncEvent = exports.updateDevice = exports.listDevices = exports.registerDevice = exports.getCalendarSyncSettings = exports.syncCalendar = exports.syncCalendarConnection = exports.disconnectCalendar = exports.updateCalendarConnectionSettings = exports.getCalendarConnections = exports.connectCalendar = exports.getCalendarAuthUrl = exports.deleteCalendarEvent = exports.updateCalendarEvent = exports.createCalendarEvent = exports.getCalendarEvents = exports.getGroupGiftSummary = exports.confirmGroupContribution = exports.createGroupPaymentIntent = exports.getAffiliateDisclosure = exports.getAffiliateStats = exports.getAffiliatePrograms = void 0;
// =============================================================================
// AUTHENTICATION FUNCTIONS
// =============================================================================
var auth_1 = require("./auth");
Object.defineProperty(exports, "createUserProfile", { enumerable: true, get: function () { return auth_1.createUserProfile; } });
Object.defineProperty(exports, "getUserProfile", { enumerable: true, get: function () { return auth_1.getUserProfile; } });
Object.defineProperty(exports, "updateUserProfile", { enumerable: true, get: function () { return auth_1.updateUserProfile; } });
// =============================================================================
// CRUD FUNCTIONS (Generic Database Operations)
// =============================================================================
var crud_1 = require("./crud");
Object.defineProperty(exports, "createDocument", { enumerable: true, get: function () { return crud_1.createDocument; } });
Object.defineProperty(exports, "getDocument", { enumerable: true, get: function () { return crud_1.getDocument; } });
Object.defineProperty(exports, "updateDocument", { enumerable: true, get: function () { return crud_1.updateDocument; } });
Object.defineProperty(exports, "deleteDocument", { enumerable: true, get: function () { return crud_1.deleteDocument; } });
Object.defineProperty(exports, "listDocuments", { enumerable: true, get: function () { return crud_1.listDocuments; } });
Object.defineProperty(exports, "batchCreateDocuments", { enumerable: true, get: function () { return crud_1.batchCreateDocuments; } });
Object.defineProperty(exports, "batchUpdateDocuments", { enumerable: true, get: function () { return crud_1.batchUpdateDocuments; } });
// =============================================================================
// FIREBASE FUNCTIONS API (CALLABLE)
// =============================================================================
var notifications_1 = require("./api/notifications");
Object.defineProperty(exports, "getUserNotifications", { enumerable: true, get: function () { return notifications_1.getUserNotifications; } });
Object.defineProperty(exports, "markNotificationAsRead", { enumerable: true, get: function () { return notifications_1.markNotificationAsRead; } });
Object.defineProperty(exports, "markAllNotificationsAsRead", { enumerable: true, get: function () { return notifications_1.markAllNotificationsAsRead; } });
Object.defineProperty(exports, "deleteNotification", { enumerable: true, get: function () { return notifications_1.deleteNotification; } });
Object.defineProperty(exports, "createSystemNotification", { enumerable: true, get: function () { return notifications_1.createSystemNotification; } });
Object.defineProperty(exports, "getNotificationSettings", { enumerable: true, get: function () { return notifications_1.getNotificationSettings; } });
Object.defineProperty(exports, "updateNotificationSettings", { enumerable: true, get: function () { return notifications_1.updateNotificationSettings; } });
var extension_1 = require("./api/extension");
Object.defineProperty(exports, "authenticateExtension", { enumerable: true, get: function () { return extension_1.authenticateExtension; } });
Object.defineProperty(exports, "getExtensionWishlists", { enumerable: true, get: function () { return extension_1.getExtensionWishlists; } });
Object.defineProperty(exports, "addItemFromExtension", { enumerable: true, get: function () { return extension_1.addItemFromExtension; } });
Object.defineProperty(exports, "getExtensionRecentItems", { enumerable: true, get: function () { return extension_1.getExtensionRecentItems; } });
Object.defineProperty(exports, "createExtensionWishlist", { enumerable: true, get: function () { return extension_1.createExtensionWishlist; } });
Object.defineProperty(exports, "deleteExtensionItem", { enumerable: true, get: function () { return extension_1.deleteExtensionItem; } });
Object.defineProperty(exports, "shareExtensionWishlist", { enumerable: true, get: function () { return extension_1.shareExtensionWishlist; } });
Object.defineProperty(exports, "getExtensionAnalytics", { enumerable: true, get: function () { return extension_1.getExtensionAnalytics; } });
Object.defineProperty(exports, "trackExtensionEvent", { enumerable: true, get: function () { return extension_1.trackExtensionEvent; } });
var wishlists_1 = require("./api/wishlists");
Object.defineProperty(exports, "getUserWishlists", { enumerable: true, get: function () { return wishlists_1.getUserWishlists; } });
Object.defineProperty(exports, "getWishlistById", { enumerable: true, get: function () { return wishlists_1.getWishlistById; } });
Object.defineProperty(exports, "getSharedWishlist", { enumerable: true, get: function () { return wishlists_1.getSharedWishlist; } });
Object.defineProperty(exports, "createWishlist", { enumerable: true, get: function () { return wishlists_1.createWishlist; } });
Object.defineProperty(exports, "updateWishlist", { enumerable: true, get: function () { return wishlists_1.updateWishlist; } });
Object.defineProperty(exports, "deleteWishlist", { enumerable: true, get: function () { return wishlists_1.deleteWishlist; } });
Object.defineProperty(exports, "getWishlistItems", { enumerable: true, get: function () { return wishlists_1.getWishlistItems; } });
Object.defineProperty(exports, "addWishlistItem", { enumerable: true, get: function () { return wishlists_1.addWishlistItem; } });
Object.defineProperty(exports, "updateWishlistItem", { enumerable: true, get: function () { return wishlists_1.updateWishlistItem; } });
Object.defineProperty(exports, "deleteWishlistItem", { enumerable: true, get: function () { return wishlists_1.deleteWishlistItem; } });
var fcm_1 = require("./fcm");
Object.defineProperty(exports, "saveFCMToken", { enumerable: true, get: function () { return fcm_1.saveFCMToken; } });
Object.defineProperty(exports, "removeFCMToken", { enumerable: true, get: function () { return fcm_1.removeFCMToken; } });
Object.defineProperty(exports, "subscribeToTopic", { enumerable: true, get: function () { return fcm_1.subscribeToTopic; } });
Object.defineProperty(exports, "unsubscribeFromTopic", { enumerable: true, get: function () { return fcm_1.unsubscribeFromTopic; } });
Object.defineProperty(exports, "sendTestPushNotification", { enumerable: true, get: function () { return fcm_1.sendTestPushNotification; } });
Object.defineProperty(exports, "sendTestNotification", { enumerable: true, get: function () { return fcm_1.sendTestNotification; } });
Object.defineProperty(exports, "notifyItemAdded", { enumerable: true, get: function () { return fcm_1.notifyItemAdded; } });
Object.defineProperty(exports, "notifyItemReserved", { enumerable: true, get: function () { return fcm_1.notifyItemReserved; } });
Object.defineProperty(exports, "notifyItemPurchased", { enumerable: true, get: function () { return fcm_1.notifyItemPurchased; } });
Object.defineProperty(exports, "notifyPriceAlert", { enumerable: true, get: function () { return fcm_1.notifyPriceAlert; } });
var affiliate_1 = require("./api/affiliate");
Object.defineProperty(exports, "convertAffiliateLink", { enumerable: true, get: function () { return affiliate_1.convertAffiliateLink; } });
Object.defineProperty(exports, "batchConvertAffiliateLinks", { enumerable: true, get: function () { return affiliate_1.batchConvertAffiliateLinks; } });
Object.defineProperty(exports, "convertWishlistAffiliateLinks", { enumerable: true, get: function () { return affiliate_1.convertWishlistAffiliateLinks; } });
Object.defineProperty(exports, "trackAffiliateClick", { enumerable: true, get: function () { return affiliate_1.trackAffiliateClick; } });
Object.defineProperty(exports, "getAffiliatePrograms", { enumerable: true, get: function () { return affiliate_1.getAffiliatePrograms; } });
Object.defineProperty(exports, "getAffiliateStats", { enumerable: true, get: function () { return affiliate_1.getAffiliateStats; } });
Object.defineProperty(exports, "getAffiliateDisclosure", { enumerable: true, get: function () { return affiliate_1.getAffiliateDisclosure; } });
var groupPayments_1 = require("./api/groupPayments");
Object.defineProperty(exports, "createGroupPaymentIntent", { enumerable: true, get: function () { return groupPayments_1.createGroupPaymentIntent; } });
Object.defineProperty(exports, "confirmGroupContribution", { enumerable: true, get: function () { return groupPayments_1.confirmGroupContribution; } });
Object.defineProperty(exports, "getGroupGiftSummary", { enumerable: true, get: function () { return groupPayments_1.getGroupGiftSummary; } });
var calendar_1 = require("./api/calendar");
Object.defineProperty(exports, "getCalendarEvents", { enumerable: true, get: function () { return calendar_1.getCalendarEvents; } });
Object.defineProperty(exports, "createCalendarEvent", { enumerable: true, get: function () { return calendar_1.createCalendarEvent; } });
Object.defineProperty(exports, "updateCalendarEvent", { enumerable: true, get: function () { return calendar_1.updateCalendarEvent; } });
Object.defineProperty(exports, "deleteCalendarEvent", { enumerable: true, get: function () { return calendar_1.deleteCalendarEvent; } });
Object.defineProperty(exports, "getCalendarAuthUrl", { enumerable: true, get: function () { return calendar_1.getCalendarAuthUrl; } });
Object.defineProperty(exports, "connectCalendar", { enumerable: true, get: function () { return calendar_1.connectCalendar; } });
Object.defineProperty(exports, "getCalendarConnections", { enumerable: true, get: function () { return calendar_1.getCalendarConnections; } });
Object.defineProperty(exports, "updateCalendarConnectionSettings", { enumerable: true, get: function () { return calendar_1.updateCalendarConnectionSettings; } });
Object.defineProperty(exports, "disconnectCalendar", { enumerable: true, get: function () { return calendar_1.disconnectCalendar; } });
Object.defineProperty(exports, "syncCalendarConnection", { enumerable: true, get: function () { return calendar_1.syncCalendarConnection; } });
Object.defineProperty(exports, "syncCalendar", { enumerable: true, get: function () { return calendar_1.syncCalendar; } });
Object.defineProperty(exports, "getCalendarSyncSettings", { enumerable: true, get: function () { return calendar_1.getCalendarSyncSettings; } });
var sync_1 = require("./api/sync");
Object.defineProperty(exports, "registerDevice", { enumerable: true, get: function () { return sync_1.registerDevice; } });
Object.defineProperty(exports, "listDevices", { enumerable: true, get: function () { return sync_1.listDevices; } });
Object.defineProperty(exports, "updateDevice", { enumerable: true, get: function () { return sync_1.updateDevice; } });
Object.defineProperty(exports, "logSyncEvent", { enumerable: true, get: function () { return sync_1.logSyncEvent; } });
Object.defineProperty(exports, "getSyncLogs", { enumerable: true, get: function () { return sync_1.getSyncLogs; } });
Object.defineProperty(exports, "syncMobileActions", { enumerable: true, get: function () { return sync_1.syncMobileActions; } });
var mobile_1 = require("./api/mobile");
Object.defineProperty(exports, "lookupBarcode", { enumerable: true, get: function () { return mobile_1.lookupBarcode; } });
var ar_1 = require("./api/ar");
Object.defineProperty(exports, "getARModel", { enumerable: true, get: function () { return ar_1.getARModel; } });
var analytics_1 = require("./api/analytics");
Object.defineProperty(exports, "trackAnalyticsEvent", { enumerable: true, get: function () { return analytics_1.trackAnalyticsEvent; } });
Object.defineProperty(exports, "getAnalyticsEvents", { enumerable: true, get: function () { return analytics_1.getAnalyticsEvents; } });
Object.defineProperty(exports, "getAnalyticsSummary", { enumerable: true, get: function () { return analytics_1.getAnalyticsSummary; } });
//# sourceMappingURL=index.js.map