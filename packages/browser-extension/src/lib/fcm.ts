/**
 * Firebase Cloud Messaging utilities for browser extension
 * Handles push notifications, token management, and messaging in extension context
 */

import { getMessaging, getToken, onMessage, MessagePayload } from 'firebase/messaging';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase configuration - using environment variables or fallbacks
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY || 'your-api-key',
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || 'your-project.firebaseapp.com',
  projectId: process.env.VITE_FIREBASE_PROJECT_ID || 'your-project-id',
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET || 'your-project.appspot.com',
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'your-sender-id',
  appId: process.env.VITE_FIREBASE_APP_ID || 'your-app-id'
};

// Initialize Firebase for extension
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const messaging = getMessaging(app);

// VAPID key for web push
const VAPID_KEY = process.env.VITE_FIREBASE_VAPID_KEY || 'your-vapid-key';

// Extension notification preferences interface
export interface ExtensionNotificationPreferences {
  enabled: boolean;
  types: {
    item_added: boolean;
    item_reserved: boolean;
    item_purchased: boolean;
    price_alerts: boolean;
    collaboration_invites: boolean;
    system_updates: boolean;
  };
  delivery: {
    popup: boolean;
    browser: boolean;
    badge: boolean;
  };
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
  updatedAt: any;
}

// Default notification preferences
const DEFAULT_PREFERENCES: ExtensionNotificationPreferences = {
  enabled: true,
  types: {
    item_added: true,
    item_reserved: true,
    item_purchased: true,
    price_alerts: true,
    collaboration_invites: true,
    system_updates: false
  },
  delivery: {
    popup: true,
    browser: true,
    badge: true
  },
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '08:00'
  },
  updatedAt: null
};

/**
 * Request notification permission for browser extension
 */
export async function requestExtensionNotificationPermission(): Promise<NotificationPermission> {
  console.log('[FCM Extension] Requesting notification permission...');
  
  try {
    // Check if we're in extension context
    if (!chrome?.runtime?.id) {
      throw new Error('Not running in extension context');
    }

    // Request permission using chrome API for extensions
    const permission = await new Promise<NotificationPermission>((resolve) => {
      chrome.permissions.request(
        { permissions: ['notifications'] },
        (granted) => {
          if (chrome.runtime.lastError) {
            console.error('[FCM Extension] Permission error:', chrome.runtime.lastError);
            resolve('denied');
          } else {
            resolve(granted ? 'granted' : 'denied');
          }
        }
      );
    });

    console.log('[FCM Extension] Notification permission:', permission);
    return permission;
  } catch (error) {
    console.error('[FCM Extension] Error requesting permission:', error);
    return 'denied';
  }
}

/**
 * Get FCM token for browser extension
 */
export async function getExtensionFCMToken(): Promise<string | null> {
  try {
    const permission = await requestExtensionNotificationPermission();
    
    if (permission !== 'granted') {
      console.log('[FCM Extension] Notification permission not granted');
      return null;
    }

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: await navigator.serviceWorker.getRegistration()
    });

    if (token) {
      console.log('[FCM Extension] FCM token obtained:', token.substring(0, 20) + '...');
      await saveExtensionFCMToken(token);
      return token;
    } else {
      console.log('[FCM Extension] No FCM token available');
      return null;
    }
  } catch (error) {
    console.error('[FCM Extension] Error getting FCM token:', error);
    return null;
  }
}

/**
 * Save FCM token to Firestore for extension
 */
async function saveExtensionFCMToken(token: string): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) {
      console.log('[FCM Extension] No authenticated user, cannot save token');
      return;
    }

    const tokenDoc = doc(db, 'fcm_tokens', `${user.uid}_extension`);
    await setDoc(tokenDoc, {
      token,
      userId: user.uid,
      platform: 'browser_extension',
      userAgent: navigator.userAgent,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      active: true
    }, { merge: true });

    console.log('[FCM Extension] FCM token saved to Firestore');
  } catch (error) {
    console.error('[FCM Extension] Error saving FCM token:', error);
  }
}

/**
 * Setup foreground message listener for extension
 */
export function setupExtensionForegroundMessageListener(): () => void {
  console.log('[FCM Extension] Setting up foreground message listener...');
  
  const unsubscribe = onMessage(messaging, (payload: MessagePayload) => {
    console.log('[FCM Extension] Foreground message received:', payload);
    
    // Handle foreground notifications in extension context
    handleExtensionForegroundNotification(payload);
  });

  return unsubscribe;
}

/**
 * Handle foreground notifications in extension
 */
function handleExtensionForegroundNotification(payload: MessagePayload): void {
  const { notification, data } = payload;
  
  if (!notification) return;

  // Create extension notification
  const notificationOptions: NotificationOptions = {
    body: notification.body || '',
    icon: notification.icon || '/icons/icon-128.png',
    tag: data?.type || 'extension',
    data: data || {},
    requireInteraction: data?.priority === 'high',
    silent: data?.priority === 'low'
  };

  // Show notification using extension API
  if (chrome?.notifications) {
    chrome.notifications.create(data?.type || 'default', {
      type: 'basic',
      iconUrl: notificationOptions.icon || '/icons/icon-128.png',
      title: notification.title || 'Wishlist Wizard',
      message: notification.body || 'You have a new notification',
      contextMessage: 'Browser Extension',
      priority: data?.priority === 'high' ? 2 : 1
    });
  } else {
    // Fallback to web notifications
    new Notification(notification.title || 'Wishlist Wizard', notificationOptions);
  }
}

/**
 * Get notification preferences for extension
 */
export async function getExtensionNotificationPreferences(): Promise<ExtensionNotificationPreferences> {
  try {
    const user = auth.currentUser;
    if (!user) {
      return DEFAULT_PREFERENCES;
    }

    const prefsDoc = doc(db, 'notification_preferences', `${user.uid}_extension`);
    const prefsSnap = await getDoc(prefsDoc);

    if (prefsSnap.exists()) {
      return { ...DEFAULT_PREFERENCES, ...prefsSnap.data() } as ExtensionNotificationPreferences;
    } else {
      // Create default preferences
      await setDoc(prefsDoc, {
        ...DEFAULT_PREFERENCES,
        updatedAt: serverTimestamp()
      });
      return DEFAULT_PREFERENCES;
    }
  } catch (error) {
    console.error('[FCM Extension] Error getting notification preferences:', error);
    return DEFAULT_PREFERENCES;
  }
}

/**
 * Update notification preferences for extension
 */
export async function updateExtensionNotificationPreferences(
  preferences: Partial<ExtensionNotificationPreferences>
): Promise<void> {
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }

    const prefsDoc = doc(db, 'notification_preferences', `${user.uid}_extension`);
    await updateDoc(prefsDoc, {
      ...preferences,
      updatedAt: serverTimestamp()
    });

    console.log('[FCM Extension] Notification preferences updated');
  } catch (error) {
    console.error('[FCM Extension] Error updating notification preferences:', error);
    throw error;
  }
}

/**
 * Check if notifications should be sent based on quiet hours
 */
export function isInQuietHours(preferences: ExtensionNotificationPreferences): boolean {
  if (!preferences.quietHours.enabled) {
    return false;
  }

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
  
  const { start, end } = preferences.quietHours;
  
  // Handle overnight quiet hours (e.g., 22:00 to 08:00)
  if (start > end) {
    return currentTime >= start || currentTime <= end;
  } else {
    return currentTime >= start && currentTime <= end;
  }
}

/**
 * Initialize FCM for extension
 */
export async function initializeExtensionFCM(): Promise<{
  token: string | null;
  unsubscribe: () => void;
}> {
  console.log('[FCM Extension] Initializing FCM for browser extension...');
  
  try {
    // Get FCM token
    const token = await getExtensionFCMToken();
    
    // Setup message listener
    const unsubscribe = setupExtensionForegroundMessageListener();
    
    // Update badge when notifications are available
    updateExtensionBadge();
    
    console.log('[FCM Extension] FCM initialized successfully');
    
    return { token, unsubscribe };
  } catch (error) {
    console.error('[FCM Extension] Error initializing FCM:', error);
    return { token: null, unsubscribe: () => {} };
  }
}

/**
 * Update extension badge with notification count
 */
export async function updateExtensionBadge(): Promise<void> {
  if (!chrome?.action?.setBadgeText) return;
  
  try {
    // Get unread notification count from storage or API
    const count = await getUnreadNotificationCount();
    
    if (count > 0) {
      chrome.action.setBadgeText({ text: count.toString() });
      chrome.action.setBadgeBackgroundColor({ color: '#FF4444' });
    } else {
      chrome.action.setBadgeText({ text: '' });
    }
  } catch (error) {
    console.error('[FCM Extension] Error updating badge:', error);
  }
}

/**
 * Get unread notification count (placeholder - implement based on your data structure)
 */
async function getUnreadNotificationCount(): Promise<number> {
  // TODO: Implement based on your notification storage strategy
  // This could query Firestore for unread notifications for the current user
  return 0;
}

/**
 * Clear extension badge
 */
export function clearExtensionBadge(): void {
  if (chrome?.action?.setBadgeText) {
    chrome.action.setBadgeText({ text: '' });
  }
}