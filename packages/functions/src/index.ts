// Firebase Functions v1 - no global options needed

// =============================================================================
// AUTHENTICATION FUNCTIONS
// =============================================================================

export {
  createUserProfile,
  getUserProfile,
  updateUserProfile
} from './auth';

// =============================================================================
// HTTP EXTENSION API ENDPOINTS
// =============================================================================

export {
  extensionGetWishlists,
  extensionCreateWishlist,
  extensionAddItem,
  extensionGetRecentItems,
  extensionGetWishlistItems,
  extensionDeleteItem,
  extensionShareWishlist
} from './api/http-extension';

export {
  api
} from './api/router';

// =============================================================================
// CRUD FUNCTIONS (Generic Database Operations)
// =============================================================================

export {
  createDocument,
  getDocument,
  updateDocument,
  deleteDocument,
  listDocuments,
  batchCreateDocuments,
  batchUpdateDocuments
} from './crud';

// =============================================================================
// FIREBASE FUNCTIONS API (CALLABLE)
// =============================================================================

export {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  createSystemNotification,
  getNotificationSettings,
  updateNotificationSettings
} from './api/notifications';

export {
  authenticateExtension,
  getExtensionWishlists,
  addItemFromExtension,
  getExtensionRecentItems,
  createExtensionWishlist,
  deleteExtensionItem,
  shareExtensionWishlist,
  getExtensionAnalytics,
  trackExtensionEvent
} from './api/extension';

export {
  getUserWishlists,
  getWishlistById,
  getSharedWishlist,
  createWishlist,
  updateWishlist,
  deleteWishlist,
  getWishlistItems,
  addWishlistItem,
  reserveWishlistItem,
  purchaseWishlistItem,
  updateWishlistItem,
  deleteWishlistItem
} from './api/wishlists';

export {
  saveFCMToken,
  removeFCMToken,
  subscribeToTopic,
  unsubscribeFromTopic,
  sendTestPushNotification,
  sendTestNotification,
  notifyItemAdded,
  notifyItemReserved,
  notifyItemPurchased,
  notifyPriceAlert
} from './fcm';

export {
  convertAffiliateLink,
  batchConvertAffiliateLinks,
  convertWishlistAffiliateLinks,
  trackAffiliateClick,
  getAffiliatePrograms,
  getAffiliateStats,
  getAffiliateDisclosure
} from './api/affiliate';

export {
  createGroupPaymentIntent,
  confirmGroupContribution,
  getGroupGiftSummary
} from './api/groupPayments';

export {
  getCalendarEvents,
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
  getCalendarAuthUrl,
  connectCalendar,
  getCalendarConnections,
  updateCalendarConnectionSettings,
  disconnectCalendar,
  syncCalendarConnection,
  syncCalendar,
  getCalendarSyncSettings
} from './api/calendar';

export {
  getContacts,
  importContacts,
  hideContact,
  deleteContact
} from './api/contacts';

export {
  registerDevice,
  listDevices,
  updateDevice,
  logSyncEvent,
  getSyncLogs,
  syncMobileActions
} from './api/sync';

export {
  lookupBarcode
} from './api/mobile';

export {
  getItemPriceHistory
} from './api/priceHistory';

export {
  getARModel
} from './api/ar';

export {
  trackAnalyticsEvent,
  getAnalyticsEvents,
  getAnalyticsSummary
} from './api/analytics';

export {
  createCheckoutSession
} from './api/stripe';

export {
  stripeWebhook
} from './api/stripeWebhook';
