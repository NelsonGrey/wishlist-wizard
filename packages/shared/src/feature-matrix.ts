/**
 * Unified Feature Matrix for All Platforms
 *
 * This is the single source of truth for feature availability across:
 * - Web (React)
 * - Mobile (Flutter)
 * - Browser Extension
 *
 * Usage:
 * ```typescript
 * import { FEATURE_MATRIX, isPlatformFeatureAvailable } from '@wishlist-wizard/shared';
 *
 * if (isPlatformFeatureAvailable('calendar', 'mobile')) {
 *   // Show calendar UI
 * }
 *
 * if (FEATURE_MATRIX.authentication.web.includes('twoFactor')) {
 *   // Show 2FA setup
 * }
 * ```
 *
 * Last Updated: May 15, 2026
 */

export type Platform = 'web' | 'mobile' | 'extension';

export interface FeatureAvailability {
  web: string[];
  mobile: string[];
  extension: string[];
}

export interface FeatureMatrix {
  // Authentication & User Management
  authentication: FeatureAvailability;
  userProfiles: FeatureAvailability;
  passwordManagement: FeatureAvailability;
  
  // Wishlist Core
  wishlistCrud: FeatureAvailability;
  wishlistDashboard: FeatureAvailability;
  wishlistSearch: FeatureAvailability;
  wishlistArchive: FeatureAvailability;
  
  // Wishlist Items
  itemCrud: FeatureAvailability;
  itemQuickAdd: FeatureAvailability;
  itemPriority: FeatureAvailability;
  itemImages: FeatureAvailability;
  itemNotes: FeatureAvailability;
  
  // Sharing & Collaboration
  shareWishlist: FeatureAvailability;
  collaborators: FeatureAvailability;
  permissions: FeatureAvailability;
  invitations: FeatureAvailability;
  
  // Notifications
  pushNotifications: FeatureAvailability;
  inAppNotifications: FeatureAvailability;
  emailNotifications: FeatureAvailability;
  notificationCenter: FeatureAvailability;
  notificationPreferences: FeatureAvailability;
  
  // Product & Price Tracking
  productExtraction: FeatureAvailability;
  priceTracking: FeatureAvailability;
  priceAlerts: FeatureAvailability;
  priceComparison: FeatureAvailability;
  priceHistory: FeatureAvailability;
  
  // Monetization & Analytics
  affiliateLinks: FeatureAvailability;
  creatorDashboard: FeatureAvailability;
  clickTracking: FeatureAvailability;
  analyticsReports: FeatureAvailability;
  couponIntegration: FeatureAvailability;
  
  // Calendar Integration
  localCalendar: FeatureAvailability;
  googleCalendar: FeatureAvailability;
  outlookCalendar: FeatureAvailability;
  appleCalendar: FeatureAvailability;
  birthdayTracking: FeatureAvailability;
  
  // Cross-Platform Features
  deviceSync: FeatureAvailability;
  offlineSupport: FeatureAvailability;
  realtimeSync: FeatureAvailability;
  
  // Privacy & Security
  privacyControls: FeatureAvailability;
  dataExport: FeatureAvailability;
  accountDeletion: FeatureAvailability;
  twoFactor: FeatureAvailability;
  
  // Platform-Specific
  mobileNativeShare: FeatureAvailability;
  mobileOfflineMode: FeatureAvailability;
  mobileQRScanning: FeatureAvailability;
  extensionContextMenu: FeatureAvailability;
  extensionProductDetection: FeatureAvailability;
}

/**
 * Master feature matrix
 * 
 * CRITICAL FEATURES (must work on all platforms):
 * - authentication (basic login/logout)
 * - wishlistCrud (create, read, update, delete)
 * - itemCrud (basic operations)
 * - shareWishlist (generate link)
 * - notifications (push delivery)
 * 
 * HIGH PRIORITY (should work on web + mobile, extension optional):
 * - passwordManagement
 * - collaborators
 * - priceTracking
 * - notificationCenter
 * 
 * MEDIUM PRIORITY (should work on at least 2 platforms):
 * - calendar integration
 * - analytics
 * - affiliate links
 * 
 * PLATFORM-SPECIFIC (only on one platform):
 * - mobileNativeShare
 * - extensionContextMenu
 * - extensionProductDetection
 */
export const FEATURE_MATRIX: FeatureMatrix = {
  // ===== AUTHENTICATION & USER MANAGEMENT =====
  authentication: {
    web: [
      'emailPassword',
      'googleAuth',
      'appleAuth',
      'sessionManagement',
      'tokenRefresh',
    ],
    mobile: [
      'emailPassword',
      'googleAuth',
      'appleAuth',
      'sessionManagement',
      'tokenRefresh',
      'biometricAuth',
    ],
    extension: [
      'emailPassword',
      'googleAuth',
      'appleAuth',
      'sessionManagement',
      'tokenRefresh',
    ],
  },

  userProfiles: {
    web: ['viewProfile', 'editProfile', 'profilePhoto', 'preferences'],
    mobile: ['viewProfile', 'editProfile'],
    extension: [],
  },

  passwordManagement: {
    web: ['passwordReset', 'passwordChange', 'emailVerification'],
    mobile: ['passwordChange'],
    extension: [],
  },

  // ===== WISHLIST CORE FEATURES =====
  wishlistCrud: {
    web: ['create', 'read', 'update', 'delete', 'list'],
    mobile: ['create', 'read', 'update', 'delete', 'list'],
    extension: ['create', 'read'],
  },

  wishlistDashboard: {
    web: ['dashboard', 'cardView', 'filterSort', 'search'],
    mobile: ['dashboard', 'listView', 'filterSort'],
    extension: [],
  },

  wishlistSearch: {
    web: ['searchByName', 'searchByOccasion', 'advancedFilter'],
    mobile: ['searchByName', 'basicFilter'],
    extension: [],
  },

  wishlistArchive: {
    web: ['archive', 'unarchive', 'showArchived'],
    mobile: [],
    extension: [],
  },

  // ===== WISHLIST ITEM MANAGEMENT =====
  itemCrud: {
    web: ['create', 'read', 'update', 'delete', 'markPurchased'],
    mobile: ['create', 'read', 'update', 'delete', 'markPurchased'],
    extension: ['create', 'read'],
  },

  itemQuickAdd: {
    web: ['urlImport'],
    mobile: ['manualAdd'],
    extension: ['urlImport', 'productDetection'],
  },

  itemPriority: {
    web: ['setPriority', 'sortByPriority'],
    mobile: ['setPriority'],
    extension: [],
  },

  itemImages: {
    web: ['uploadImage', 'productImage'],
    mobile: ['uploadImage', 'cameraCapture'],
    extension: ['productImage'],
  },

  itemNotes: {
    web: ['addNotes', 'editNotes'],
    mobile: ['addNotes'],
    extension: [],
  },

  // ===== SHARING & COLLABORATION =====
  shareWishlist: {
    web: ['generateLink', 'shareEmail', 'shareViaSocial', 'shareQRCode'],
    mobile: ['generateLink', 'shareEmail', 'nativeShare'],
    extension: [],
  },

  collaborators: {
    web: ['invite', 'remove', 'list', 'manage'],
    mobile: ['invite', 'list'],
    extension: [],
  },

  permissions: {
    web: ['viewer', 'editor', 'admin', 'custom'],
    mobile: ['viewer', 'editor'],
    extension: [],
  },

  invitations: {
    web: ['send', 'accept', 'reject', 'resend'],
    mobile: ['accept', 'reject'],
    extension: [],
  },

  // ===== NOTIFICATIONS =====
  pushNotifications: {
    web: ['delivery', 'display'],
    mobile: ['delivery', 'display', 'deepLinking', 'badge'],
    extension: ['display', 'badgeCount'],
  },

  inAppNotifications: {
    web: ['toast', 'popup', 'banner'],
    mobile: ['banner', 'modal'],
    extension: ['popup'],
  },

  emailNotifications: {
    web: ['priceAlert', 'collaboration', 'reminder'],
    mobile: [],
    extension: [],
  },

  notificationCenter: {
    web: ['list', 'markRead', 'delete', 'filter'],
    mobile: ['list', 'markRead', 'filter'],
    extension: [],
  },

  notificationPreferences: {
    web: ['pushPreference', 'emailPreference', 'frequency'],
    mobile: ['pushPreference', 'frequency'],
    extension: ['pushPreference'],
  },

  // ===== PRODUCT & PRICE TRACKING =====
  productExtraction: {
    web: ['urlToProduct', 'autoFill'],
    mobile: ['manualEntry'],
    extension: ['urlToProduct', 'autoFill', 'multiRetailer'],
  },

  priceTracking: {
    web: ['trackPrice', 'historicalData', 'trend'],
    mobile: [],
    extension: ['trackPrice'],
  },

  priceAlerts: {
    web: ['setPriceAlert', 'emailNotification', 'pushNotification'],
    mobile: [],
    extension: [],
  },

  priceComparison: {
    web: ['compareRetailers', 'bestPrice'],
    mobile: [],
    extension: ['compareRetailers'],
  },

  priceHistory: {
    web: ['priceChart', 'historicalList', 'averagePrice'],
    mobile: [],
    extension: [],
  },

  // ===== MONETIZATION & ANALYTICS =====
  affiliateLinks: {
    web: ['generateLink', 'track', 'dashboard'],
    mobile: ['generateLink', 'view'],
    extension: ['generateLink', 'track'],
  },

  creatorDashboard: {
    web: ['overview', 'analytics', 'earnings', 'reports'],
    mobile: [],
    extension: [],
  },

  clickTracking: {
    web: ['trackClicks', 'displayMetrics'],
    mobile: ['viewMetrics'],
    extension: ['trackClicks'],
  },

  analyticsReports: {
    web: ['clicks', 'conversions', 'revenue', 'topProducts'],
    mobile: [],
    extension: [],
  },

  couponIntegration: {
    web: ['searchCoupons', 'applyCoupon'],
    mobile: [],
    extension: ['searchCoupons', 'applyCoupon'],
  },

  // ===== CALENDAR INTEGRATION =====
  localCalendar: {
    web: ['createEvent', 'viewEvents', 'editEvent', 'deleteEvent'],
    mobile: [],
    extension: [],
  },

  googleCalendar: {
    web: ['connect', 'sync', 'eventSync'],
    mobile: [],
    extension: [],
  },

  outlookCalendar: {
    web: ['connect', 'sync', 'eventSync'],
    mobile: [],
    extension: [],
  },

  appleCalendar: {
    web: ['connect', 'sync', 'eventSync'],
    mobile: [],
    extension: [],
  },

  birthdayTracking: {
    web: ['trackBirthday', 'notify', 'suggest'],
    mobile: [],
    extension: [],
  },

  // ===== CROSS-PLATFORM FEATURES =====
  deviceSync: {
    web: ['registerDevice', 'listDevices', 'syncData'],
    mobile: ['registerDevice', 'syncData'],
    extension: ['registerDevice'],
  },

  offlineSupport: {
    web: [],
    mobile: ['queueActions', 'syncOnOnline'],
    extension: [],
  },

  realtimeSync: {
    web: ['firebaseListener', 'updateNotification'],
    mobile: ['firebaseListener', 'updateNotification'],
    extension: ['firebaseListener'],
  },

  // ===== PRIVACY & SECURITY =====
  privacyControls: {
    web: ['visibility', 'sharing', 'dataCollection'],
    mobile: ['visibility', 'dataCollection'],
    extension: [],
  },

  dataExport: {
    web: ['exportJSON', 'exportCSV'],
    mobile: [],
    extension: [],
  },

  accountDeletion: {
    web: ['deleteAccount', 'dataWipe'],
    mobile: [],
    extension: [],
  },

  twoFactor: {
    web: [],
    mobile: [],
    extension: [],
  },

  // ===== PLATFORM-SPECIFIC =====
  mobileNativeShare: {
    web: [],
    mobile: ['nativeShareSheet', 'contactIntegration'],
    extension: [],
  },

  mobileOfflineMode: {
    web: [],
    mobile: ['offlineRead', 'offlineEdit', 'queueSync'],
    extension: [],
  },

  mobileQRScanning: {
    web: [],
    mobile: ['scanQRCode', 'recognizeProduct'],
    extension: [],
  },

  extensionContextMenu: {
    web: [],
    mobile: [],
    extension: ['addToWishlist', 'quickCompare'],
  },

  extensionProductDetection: {
    web: [],
    mobile: [],
    extension: ['autoDetectProduct', 'extractPrice', 'identifyRetailer'],
  },
};

/**
 * Check if a feature is available on a platform
 */
export function isPlatformFeatureAvailable(
  featureKey: keyof FeatureMatrix,
  platform: Platform,
  subFeature?: string
): boolean {
  const feature = FEATURE_MATRIX[featureKey];
  if (!feature || !feature[platform]) {
    return false;
  }

  if (subFeature) {
    return feature[platform].includes(subFeature);
  }

  // If no subFeature specified, return true if any features exist
  return feature[platform].length > 0;
}

/**
 * Get all platforms that support a feature
 */
export function getPlatformsWithFeature(
  featureKey: keyof FeatureMatrix
): Platform[] {
  const platforms: Platform[] = [];
  const feature = FEATURE_MATRIX[featureKey];

  if (feature?.web.length > 0) platforms.push('web');
  if (feature?.mobile.length > 0) platforms.push('mobile');
  if (feature?.extension.length > 0) platforms.push('extension');

  return platforms;
}

/**
 * Get feature availability stats
 */
export function getFeatureStats() {
  const stats = {
    byPlatform: { web: 0, mobile: 0, extension: 0 },
    byCategory: {} as Record<string, number>,
    totalFeatures: 0,
    totalSubFeatures: 0,
  };

  Object.entries(FEATURE_MATRIX).forEach(([category, features]) => {
    const total =
      features.web.length + features.mobile.length + features.extension.length;
    stats.byCategory[category] = total;
    stats.totalSubFeatures += total;
    stats.byPlatform.web += features.web.length;
    stats.byPlatform.mobile += features.mobile.length;
    stats.byPlatform.extension += features.extension.length;
  });

  stats.totalFeatures = Object.keys(FEATURE_MATRIX).length;

  return stats;
}

/**
 * Get features missing on a platform (for audit purposes)
 */
export function getMissingFeatures(
  platform: Platform
): Array<{ category: string; features: string[] }> {
  const missing: Array<{ category: string; features: string[] }> = [];

  Object.entries(FEATURE_MATRIX).forEach(([category, features]) => {
    // Find which platforms have this feature
    const otherPlatforms = (
      (['web', 'mobile', 'extension'] as const).filter((p) => p !== platform)
    ).filter((p) => features[p].length > 0);

    // If other platforms have it but this one doesn't, it's missing
    if (otherPlatforms.length > 0 && features[platform].length === 0) {
      missing.push({
        category,
        features: Array.from(
          new Set([
            ...features.web,
            ...features.mobile,
            ...features.extension,
          ])
        ),
      });
    }
  });

  return missing;
}

export default FEATURE_MATRIX;
