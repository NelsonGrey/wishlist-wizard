// Firebase Functions v1 - no global options needed

import './firebase-admin';

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
  updateNotificationSettings,
  cleanOldNotifications
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
  sendBatchNotification,
  notifyItemAdded,
  notifyItemReserved,
  notifyItemPurchased,
  notifyPriceAlert,
  replayDeferredPriceAlerts
} from './fcm';

export {
  linkConvert,
  linkConvertBatch,
  linkConvertWishlist,
  linkTrackClick,
  linkPrograms,
  linkStats,
  linkDisclosure
} from './api/affiliate';

export {
  fetchProductPreview as productPreviewFetch
} from './api/productPreview';

export {
  createGroupPaymentIntent as groupPaymentCreateIntent,
  confirmGroupContribution as groupPaymentConfirm,
  getGroupGiftSummary as groupGiftSummary
} from './api/groupPayments';

export {
  getCalendarEvents as calendarEventsList,
  createCalendarEvent as calendarEventCreate,
  updateCalendarEvent as calendarEventUpdate,
  deleteCalendarEvent as calendarEventDelete,
  getCalendarAuthUrl as calendarAuthUrl,
  connectCalendar as calendarConnect,
  getCalendarConnections as calendarConnections,
  updateCalendarConnectionSettings as calendarConnectionUpdate,
  disconnectCalendar as calendarDisconnect,
  syncCalendarConnection as calendarConnectionSync,
  syncCalendar as calendarSync,
  getCalendarSyncSettings as calendarSyncSettings
} from './api/calendar';

export {
  getContacts,
  getExternalContacts,
  importContacts,
  hideContact,
  deleteContact
} from './api/contacts';

export {
  registerDevice as deviceRegister,
  listDevices as deviceList,
  updateDevice as deviceUpdate,
  logSyncEvent as deviceSyncLog,
  getSyncLogs as deviceSyncLogs,
  syncMobileActions as mobileSyncActions
} from './api/sync';

export {
  lookupBarcode as barcodeLookup
} from './api/mobile';

export {
  getItemPriceHistory as priceHistoryGetItem
} from './api/priceHistory';

export {
  getARModel as arModelLookup
} from './api/ar';

export {
  trackAnalyticsEvent as metricsTrackEvent,
  getAnalyticsEvents as metricsEvents,
  getAnalyticsSummary as metricsSummary,
  getAdRevenueSummary as metricsRevenueSummary,
  createAdKpiSnapshot as metricsSnapshotCreate,
  scheduledAdKpiSnapshot as metricsSnapshotScheduled,
  getAdKpiSnapshots as metricsSnapshots
} from './api/analytics';

export {
  refreshPriceIntelligenceOffers as priceIntelRefresh,
  scheduledRefreshPriceIntelligenceOffers as priceIntelRefreshScheduled,
} from './api/priceIntelligenceRefresh';

export {
  checkoutSessionCreate
} from './api/stripe';

export {
  stripeWebhook
} from './api/stripeWebhook';

// =============================================================================
// SUBSCRIPTION MANAGEMENT
// =============================================================================

export {
  billingStatus,
  billingPlans,
  billingCheckout,
  billingPortal,
  billingWebhook
} from './api/subscriptions';

// =============================================================================
// SUPER-ADMIN FUNCTIONS
// =============================================================================

export {
  bootstrapSuperAdmin,
  grantAdminRole,
  revokeAdminRole,
  adminGetUsers,
  adminGetUser,
  adminSuspendUser,
  adminUnsuspendUser,
  adminModifySubscription,
  adminGetSupportTickets,
  adminRespondToTicket,
  adminGetAuditLog,
  createSupportTicket
} from './api/admin';
