/* Firebase Cloud Messaging Service Worker
 * This file enables background notifications. It is currently a placeholder.
 * If messaging is enabled, import the scripts below and initialize with your config.
 */

// Uncomment and fill in if enabling background push notifications.
// importScripts('https://www.gstatic.com/firebasejs/10.16.0/firebase-app-compat.js');
// importScripts('https://www.gstatic.com/firebasejs/10.16.0/firebase-messaging-compat.js');
//
// firebase.initializeApp({
//   apiKey: '...',
//   authDomain: '...',
//   projectId: '...',
//   messagingSenderId: '...',
//   appId: '...'
// });
//
// const messaging = firebase.messaging();
// messaging.onBackgroundMessage((payload) => {
//   self.registration.showNotification(payload.notification?.title || 'Notification', {
//     body: payload.notification?.body,
//     icon: '/icons/icon-192.png'
//   });
// });

self.addEventListener('install', () => {
  // eslint-disable-next-line no-console
  console.log('[firebase-messaging-sw] installed');
});