/* Firebase Cloud Messaging Service Worker for Wishlist Wizard
 * Handles background notifications when the app is not in focus
 */

// Import Firebase scripts for service worker compatibility
importScripts('https://www.gstatic.com/firebasejs/10.16.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.16.0/firebase-messaging-compat.js');

// Initialize Firebase in service worker with config from environment
// Note: These values should be replaced at build time or loaded dynamically
const firebaseConfig = {
  apiKey: self.FIREBASE_API_KEY || 'your-api-key',
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

// Handle background messages when app is not in focus
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw] Received background message:', payload);

  // Extract notification data
  const notificationTitle = payload.notification?.title || 'Wishlist Wizard';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new notification',
    icon: payload.notification?.icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: payload.data?.type || 'default',
    data: payload.data || {},
    actions: getNotificationActions(payload.data?.type),
    requireInteraction: payload.data?.priority === 'high',
    silent: payload.data?.priority === 'low'
  };

  // Add custom icon based on notification type
  if (payload.data?.type) {
    notificationOptions.icon = getNotificationIcon(payload.data.type);
  }

  // Show the notification
  return self.registration.showNotification(notificationTitle, notificationOptions);
});

// Define notification actions based on type
function getNotificationActions(type) {
  const baseActions = [
    { action: 'view', title: 'View', icon: '/icons/view.png' },
    { action: 'dismiss', title: 'Dismiss', icon: '/icons/dismiss.png' }
  ];

  switch (type) {
    case 'item_added':
    case 'item_reserved':
    case 'item_purchased':
      return [
        { action: 'view_wishlist', title: 'View Wishlist', icon: '/icons/wishlist.png' },
        ...baseActions
      ];
    
    case 'collaboration_invite':
      return [
        { action: 'accept_invite', title: 'Accept', icon: '/icons/accept.png' },
        { action: 'decline_invite', title: 'Decline', icon: '/icons/decline.png' }
      ];
    
    case 'price_alert':
      return [
        { action: 'view_item', title: 'View Item', icon: '/icons/item.png' },
        { action: 'buy_now', title: 'Buy Now', icon: '/icons/buy.png' },
        ...baseActions
      ];
    
    default:
      return baseActions;
  }
}

// Get notification icon based on type
function getNotificationIcon(type) {
  const iconMap = {
    'item_added': '/icons/add-item.png',
    'item_reserved': '/icons/reserved.png',
    'item_purchased': '/icons/purchased.png',
    'collaboration_invite': '/icons/collaborate.png',
    'price_alert': '/icons/price-alert.png',
    'wishlist_shared': '/icons/share.png',
    'system': '/icons/system.png'
  };
  
  return iconMap[type] || '/favicon.ico';
}

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[firebase-messaging-sw] Notification click received:', event);

  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  // Close the notification
  notification.close();

  // Handle different actions
  switch (action) {
    case 'view_wishlist':
      event.waitUntil(
        clients.openWindow(`/wishlists/${data.wishlistId || ''}`)
      );
      break;
    
    case 'view_item':
      event.waitUntil(
        clients.openWindow(`/wishlists/${data.wishlistId || ''}?item=${data.itemId || ''}`)
      );
      break;
    
    case 'accept_invite':
      event.waitUntil(
        handleCollaborationInvite(data, true)
      );
      break;
    
    case 'decline_invite':
      event.waitUntil(
        handleCollaborationInvite(data, false)
      );
      break;
    
    case 'buy_now':
      if (data.productUrl) {
        event.waitUntil(
          clients.openWindow(data.productUrl)
        );
      }
      break;
    
    case 'dismiss':
      // Just close - no action needed
      break;
    
    default:
      // Default action - open the app
      event.waitUntil(
        clients.openWindow('/')
      );
      break;
  }
});

// Handle collaboration invite responses
async function handleCollaborationInvite(data, accept) {
  try {
    // Make API call to accept/decline invitation
    const response = await fetch(`/api/invitations/${data.invitationId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        action: accept ? 'accept' : 'decline' 
      })
    });

    if (response.ok) {
      // Show success notification
      self.registration.showNotification(
        accept ? 'Invitation Accepted' : 'Invitation Declined',
        {
          body: accept 
            ? 'You can now collaborate on this wishlist!' 
            : 'Invitation declined.',
          icon: '/favicon.ico',
          tag: 'invite-response'
        }
      );
    }
  } catch (error) {
    console.error('Error handling collaboration invite:', error);
  }
}

// Handle notification close events
self.addEventListener('notificationclose', (event) => {
  console.log('[firebase-messaging-sw] Notification closed:', event.notification.tag);
  
  // Track analytics for closed notifications
  const data = event.notification.data || {};
  if (data.trackingId) {
    // Could send analytics event here
    console.log('Notification closed:', data.trackingId);
  }
});

// Service worker activation
self.addEventListener('activate', (event) => {
  console.log('[firebase-messaging-sw] Service worker activated');
  
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

// Service worker installation
self.addEventListener('install', (event) => {
  console.log('[firebase-messaging-sw] Service worker installed');
  self.skipWaiting(); // Activate immediately
});