// Firebase Cloud Messaging utilities for Wishlist Wizard
// Handles push notifications, subscription management, and notification preferences

import { 
  getMessaging, 
  getToken, 
  onMessage, 
  isSupported as messagingIsSupported,
  Messaging
} from 'firebase/messaging';
import { firebaseApp, getCurrentUser } from './firebase';
import { getFirestoreDb } from './firestore';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';

// VAPID key for web push - should be set in environment variables
const VAPID_KEY = import.meta.env.VITE_FIREBASE_VAPID_KEY;

interface FCMMessagePayload {
  notification?: {
    title?: string;
    body?: string;
    icon?: string;
  };
  data?: Record<string, string>;
}

let messaging: Messaging | null = null;

/**
 * Initialize Firebase Cloud Messaging
 */
export async function initializeFCM(): Promise<boolean> {
  try {
    if (!await messagingIsSupported()) {
      console.warn('[FCM] Firebase Messaging is not supported in this browser');
      return false;
    }

    if (!firebaseApp) {
      console.warn('[FCM] Firebase app not initialized');
      return false;
    }

    messaging = getMessaging(firebaseApp);
    console.log('[FCM] Firebase Cloud Messaging initialized');
    return true;
  } catch (error) {
    console.error('[FCM] Failed to initialize Firebase Cloud Messaging:', error);
    return false;
  }
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    if (!messaging) {
      const initialized = await initializeFCM();
      if (!initialized) return null;
    }

    // Check if notifications are supported
    if (!('Notification' in window)) {
      console.warn('[FCM] This browser does not support desktop notifications');
      return null;
    }

    // Request permission
    const permission = await Notification.requestPermission();
    console.log('[FCM] Notification permission:', permission);

    if (permission !== 'granted') {
      console.warn('[FCM] Notification permission denied');
      return null;
    }

    // Get FCM token
    if (!messaging) return null;
    
    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });

    if (token) {
      console.log('[FCM] FCM token acquired:', token.substring(0, 20) + '...');
      await saveTokenToFirestore(token);
      return token;
    } else {
      console.warn('[FCM] No registration token available');
      return null;
    }
  } catch (error) {
    console.error('[FCM] Error getting notification permission/token:', error);
    return null;
  }
}

/**
 * Save FCM token to Firestore for the current user
 */
async function saveTokenToFirestore(token: string): Promise<void> {
  try {
    const user = getCurrentUser();
    if (!user) {
      console.warn('[FCM] No authenticated user - cannot save token');
      return;
    }

    const db = getFirestoreDb();
    const userTokenRef = doc(db, 'userFCMTokens', user.uid);
    
    await setDoc(userTokenRef, {
      token,
      userId: user.uid,
      platform: 'web',
      userAgent: navigator.userAgent,
      lastUpdated: new Date(),
      enabled: true
    }, { merge: true });

    console.log('[FCM] Token saved to Firestore');
  } catch (error) {
    console.error('[FCM] Error saving token to Firestore:', error);
  }
}

/**
 * Set up foreground message listener
 */
export function setupForegroundMessageListener(
  onMessageReceived: (payload: FCMMessagePayload) => void
): (() => void) | null {
  try {
    if (!messaging) {
      console.warn('[FCM] Messaging not initialized');
      return null;
    }

    const unsubscribe = onMessage(messaging, (payload) => {
      console.log('[FCM] Foreground message received:', payload);
      
      // Handle the message in the foreground
      handleForegroundMessage(payload);
      
      // Call user-provided callback
      onMessageReceived(payload);
    });

    console.log('[FCM] Foreground message listener set up');
    return unsubscribe;
  } catch (error) {
    console.error('[FCM] Error setting up foreground message listener:', error);
    return null;
  }
}

/**
 * Handle messages when app is in foreground
 */
function handleForegroundMessage(payload: FCMMessagePayload): void {
  const { notification, data } = payload;
  
  if (!notification) return;

  // Create a custom notification for foreground messages
  const notificationOptions: NotificationOptions = {
    body: notification.body,
    icon: notification.icon || '/favicon.ico',
    badge: '/favicon.ico',
    tag: data?.type || 'foreground',
    data: data || {},
    requireInteraction: data?.priority === 'high'
  };

  // Show notification
  if ('serviceWorker' in navigator && 'Notification' in window) {
    navigator.serviceWorker.ready.then((registration) => {
      registration.showNotification(
        notification.title || 'Wishlist Wizard',
        notificationOptions
      );
    });
  } else {
    // Fallback for browsers without service worker support
    new Notification(notification.title || 'Wishlist Wizard', notificationOptions);
  }
}

/**
 * Notification preferences interface
 */
export interface NotificationPreferences {
  enabled: boolean;
  types: {
    itemAdded: boolean;
    itemReserved: boolean;
    itemPurchased: boolean;
    priceAlerts: boolean;
    collaborationInvites: boolean;
    wishlistShared: boolean;
    systemNotifications: boolean;
  };
  delivery: {
    push: boolean;
    email: boolean;
    inApp: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

/**
 * Default notification preferences
 */
const DEFAULT_PREFERENCES: NotificationPreferences = {
  enabled: true,
  types: {
    itemAdded: true,
    itemReserved: true,
    itemPurchased: true,
    priceAlerts: true,
    collaborationInvites: true,
    wishlistShared: true,
    systemNotifications: true
  },
  delivery: {
    push: true,
    email: true,
    inApp: true
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  }
};

/**
 * Get user's notification preferences
 */
export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  try {
    const user = getCurrentUser();
    if (!user) {
      return DEFAULT_PREFERENCES;
    }

    const db = getFirestoreDb();
    const prefsRef = doc(db, 'userNotificationPreferences', user.uid);
    const prefsDoc = await getDoc(prefsRef);

    if (prefsDoc.exists()) {
      return { ...DEFAULT_PREFERENCES, ...prefsDoc.data() } as NotificationPreferences;
    } else {
      // Create default preferences
      await setDoc(prefsRef, DEFAULT_PREFERENCES);
      return DEFAULT_PREFERENCES;
    }
  } catch (error) {
    console.error('[FCM] Error getting notification preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Update user's notification preferences
 */
export async function updateNotificationPreferences(
  preferences: Partial<NotificationPreferences>
): Promise<boolean> {
  try {
    const user = getCurrentUser();
    if (!user) {
      console.warn('[FCM] No authenticated user - cannot update preferences');
      return false;
    }

    const db = getFirestoreDb();
    const prefsRef = doc(db, 'userNotificationPreferences', user.uid);
    
    await updateDoc(prefsRef, {
      ...preferences,
      lastUpdated: new Date()
    });

    console.log('[FCM] Notification preferences updated');
    return true;
  } catch (error) {
    console.error('[FCM] Error updating notification preferences:', error);
    return false;
  }
}

/**
 * Check if notifications should be sent based on quiet hours
 */
export function isInQuietHours(preferences: NotificationPreferences): boolean {
  if (!preferences.quietHours.enabled) {
    return false;
  }

  const now = new Date();
  const currentTime = now.getHours() * 100 + now.getMinutes();
  
  const startTime = parseInt(preferences.quietHours.start.replace(':', ''));
  const endTime = parseInt(preferences.quietHours.end.replace(':', ''));

  // Handle quiet hours spanning midnight
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  } else {
    return currentTime >= startTime && currentTime <= endTime;
  }
}

/**
 * Subscribe to topic-based notifications
 */
export async function subscribeToTopic(topic: string): Promise<boolean> {
  try {
    const token = await requestNotificationPermission();
    if (!token) {
      return false;
    }

    // Topic subscriptions are typically handled server-side
    // Send token and topic to your backend
    const response = await fetch('/api/fcm/subscribe-topic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token, topic })
    });

    return response.ok;
  } catch (error) {
    console.error('[FCM] Error subscribing to topic:', error);
    return false;
  }
}

/**
 * Unsubscribe from topic-based notifications
 */
export async function unsubscribeFromTopic(topic: string): Promise<boolean> {
  try {
    const user = getCurrentUser();
    if (!user) return false;

    const response = await fetch('/api/fcm/unsubscribe-topic', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ topic })
    });

    return response.ok;
  } catch (error) {
    console.error('[FCM] Error unsubscribing from topic:', error);
    return false;
  }
}

/**
 * Test notification - useful for debugging
 */
export async function sendTestNotification(): Promise<boolean> {
  try {
    const response = await fetch('/api/fcm/test-notification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    return response.ok;
  } catch (error) {
    console.error('[FCM] Error sending test notification:', error);
    return false;
  }
}

/**
 * Get current FCM token
 */
export async function getCurrentFCMToken(): Promise<string | null> {
  try {
    if (!messaging) {
      const initialized = await initializeFCM();
      if (!initialized) return null;
    }

    if (!messaging) return null;

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY
    });

    return token || null;
  } catch (error) {
    console.error('[FCM] Error getting current FCM token:', error);
    return null;
  }
}

/**
 * Check if FCM is supported and permission is granted
 */
export async function isFCMAvailable(): Promise<boolean> {
  try {
    const isSupported = await messagingIsSupported();
    const hasPermission = 'Notification' in window && Notification.permission === 'granted';
    
    return isSupported && hasPermission;
  } catch (error) {
    console.error('[FCM] Error checking FCM availability:', error);
    return false;
  }
}

export default {
  initializeFCM,
  requestNotificationPermission,
  setupForegroundMessageListener,
  getNotificationPreferences,
  updateNotificationPreferences,
  isInQuietHours,
  subscribeToTopic,
  unsubscribeFromTopic,
  sendTestNotification,
  getCurrentFCMToken,
  isFCMAvailable
};