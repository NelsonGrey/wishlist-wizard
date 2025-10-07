// Firebase initialization helper
// This module safely initializes Firebase only when the required environment
// variables are present. All imports are tree-shakeable.

import type { FirebaseApp } from 'firebase/app';
import { initializeApp, getApps } from 'firebase/app';
import type { Analytics } from 'firebase/analytics';
import { getAnalytics, isSupported as analyticsIsSupported } from 'firebase/analytics';
import type { Messaging } from 'firebase/messaging';
import { getMessaging, getToken, onMessage, isSupported as messagingIsSupported } from 'firebase/messaging';

// Vite exposes env vars prefixed with VITE_
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

function hasAllConfigValues() {
  return Object.values(firebaseConfig).every(v => typeof v === 'string' && v.length > 0);
}

let app: FirebaseApp | null = null;
let analytics: Analytics | null = null;
let messaging: Messaging | null = null;

export async function initFirebase(options?: { enableAnalytics?: boolean; enableMessaging?: boolean }) {
  if (!hasAllConfigValues()) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[firebase] Skipping initialization – missing config env vars');
    }
    return { app: null, analytics: null, messaging: null };
  }

  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  }

  if (options?.enableAnalytics && !analytics) {
    try {
      if (await analyticsIsSupported()) {
        analytics = getAnalytics(app!);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[firebase] Analytics init failed', err);
    }
  }

  if (options?.enableMessaging && !messaging) {
    try {
      if (await messagingIsSupported()) {
        messaging = getMessaging(app!);
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[firebase] Messaging init failed', err);
    }
  }

  return { app, analytics, messaging };
}

// Web Push (FCM) helper to request permission & acquire token
export async function getFcmToken(vapidKey?: string): Promise<string | null> {
  if (!messaging) return null;
  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;
    const token = await getToken(messaging, vapidKey ? { vapidKey } : undefined);
    return token || null;
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[firebase] Unable to get FCM token', err);
    return null;
  }
}

// Foreground message listener
export function onForegroundMessage(cb: (payload: unknown) => void) {
  if (!messaging) return () => void 0;
  const unsubscribe = onMessage(messaging, (payload) => cb(payload));
  return unsubscribe;
}

// Convenience auto-init (opt-in via env flag)
if (import.meta.env.VITE_FIREBASE_AUTO_INIT === 'true') {
  initFirebase({ enableAnalytics: true, enableMessaging: false });
}

export const firebaseApp = app;