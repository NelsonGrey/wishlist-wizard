/* Firebase Cloud Messaging Service Worker for Browser Extension
 * Handles background notifications for the Wishlist Wizard browser extension
 */

// Import Firebase scripts for service worker compatibility
importScripts('https://www.gstatic.com/firebasejs/10.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.16.0/firebase-messaging-compat.js');

// Firebase configuration - will be injected at build time
const firebaseConfig = {
  apiKey: self.FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: self.FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  projectId: self.FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket: self.FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
  messagingSenderId: self.FIREBASE_MESSAGING_SENDER_ID || 'your-sender-id',
  appId: self.FIREBASE_APP_ID || 'your-app-id'
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Firebase Cloud Messaging
const messaging = firebase.messaging();

// Handle background messages when extension is not active
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw] Background message received:', payload);

  // Extract notification data
  const notificationTitle = payload.notification?.title || 'Wishlist Wizard';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/icons/icon-128.png',
    badge: '/icons/icon-128.png',
    tag: payload.data?.type || 'extension',
    data: payload.data || {},
    actions: getExtensionNotificationActions(payload.data?.type),
    silent: payload.data?.priority === 'low'
  };

  // Show the notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Define notification actions for extension
function getExtensionNotificationActions(type) {
  const baseActions = [
    { action: 'view', title: 'View', icon: '/icons/view-16.png' },
    { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss-16.png' }
  ];

  switch (type) {
    case 'item_added':
    case 'item_reserved':
    case 'item_purchased':
      return [
        { action: 'open_wishlist', title: 'Open Wishlist', icon: '/icons/wishlist-16.png' },
        ...baseActions
      ];
    
    case 'price_alert':
      return [
        { action: 'view_item', title: 'View Item', icon: '/icons/item-16.png' },
        { action: 'buy_now', title: 'Buy Now', icon: '/icons/buy-16.png' },
        ...baseActions
      ];
    
    default:
      return baseActions;
  }
}

// Handle notification clicks in extension context
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw] Extension notification click received:', event);

  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  // Close the notification
  notification.close();

  // Handle different actions
  switch (action) {
    case 'open_wishlist':
      event.waitUntil(
        openExtensionPopup(`/popup.html?view=wishlist&id=${data.wishlistId || ''}`)
      );
      break;
    
    case 'view_item':
      event.waitUntil(
        openExtensionPopup(`/popup.html?view=item&wishlistId=${data.wishlistId || ''}&itemId=${data.itemId || ''}`)
      );
      break;
    
    case 'buy_now':
      if (data.productUrl) {
        event.waitUntil(
          chrome.tabs.create({ url: data.productUrl })
        );
      }
      break;
    
    case 'view':
      event.waitUntil(
        openExtensionPopup('/popup.html')
      );
      break;
    
    case 'dismiss':
      // Just close - no action needed
      break;
    
    default:
      // Default action - open extension popup
      event.waitUntil(
        openExtensionPopup('/popup.html')
      );
      break;
  }
});

// Helper function to open extension popup or create tab
async function openExtensionPopup(url) {
  try {
    // Try to open popup window
    if (chrome.action && chrome.action.openPopup) {
      await chrome.action.openPopup();
    } else {
      // Fallback: open in new tab
      await chrome.tabs.create({
        url: chrome.runtime.getURL(url)
      });
    }
  } catch (error) {
    console.error('[firebase-messaging-sw] Error opening extension:', error);
    // Final fallback: open options page
    chrome.tabs.create({
      url: chrome.runtime.getURL('/options.html')
    });
  }
}

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  console.log('[firebase-messaging-sw] Extension notification closed:', event.notification.tag);
  
  // Track analytics for closed notifications
  const data = event.notification.data || {};
  if (data.trackingId) {
    // Could send analytics event here
    console.log('Extension notification closed:', data.trackingId);
  }
});

// Service worker lifecycle events
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw] Extension FCM service worker installed');
  self.skipWaiting(); // Activate immediately
});

self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw] Extension FCM service worker activated');
  
  // Clean up old notifications
  event.waitUntil(
    self.registration.getNotifications().then((notifications) => {
      // Close notifications older than 24 hours
      const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
      notifications.forEach((notification) => {
        if (notification.timestamp < oneDayAgo) {
          notification.close();
        }
      });
    })
  );
});

// Handle extension-specific messaging
chrome.runtime.onMessage?.addListener((request, sender, sendResponse) => {
  if (request.type === 'FCM_TOKEN_UPDATE') {
    console.log('[firebase-messaging-sw] FCM token updated in extension');
    // Handle token update if needed
    sendResponse({ success: true });
  }
});