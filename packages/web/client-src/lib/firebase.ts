// Firebase initialization helper
// This module safely initializes Firebase only when the required environment
// variables are present. All imports are tree-shakeable.

import type { FirebaseApp } from 'firebase/app';
import { initializeApp, getApps } from 'firebase/app';
import type { Analytics } from 'firebase/analytics';
import { getAnalytics, isSupported as analyticsIsSupported } from 'firebase/analytics';
import type { Messaging } from 'firebase/messaging';
import { getMessaging, getToken, onMessage, isSupported as messagingIsSupported } from 'firebase/messaging';
import type { Auth, User } from 'firebase/auth';
import type { Firestore } from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { 
  getAuth, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  updatePassword,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence
} from 'firebase/auth';

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

// Global instances
let app: FirebaseApp | null = null;
let analytics: Analytics | null = null;
let messaging: Messaging | null = null;
let auth: Auth | null = null;
let firestore: Firestore | null = null;

export async function initFirebase(options?: { 
  enableAnalytics?: boolean; 
  enableMessaging?: boolean; 
  enableAuth?: boolean;
  enableFirestore?: boolean;
}) {
  if (!hasAllConfigValues()) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[firebase] Skipping initialization – missing config env vars');
    }
    return { app: null, analytics: null, messaging: null, auth: null, firestore: null };
  }

  if (!app) {
    app = getApps().length ? getApps()[0]! : initializeApp(firebaseConfig);
  }

  // Initialize Firebase Auth (enabled by default for Firebase-first architecture)
  if (options?.enableAuth !== false && !auth) {
    try {
      auth = getAuth(app!);
      // Set persistence to local storage for better UX
      await setPersistence(auth, browserLocalPersistence);
      if (import.meta.env.DEV) {
        console.log('[firebase] Auth initialized with local persistence');
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[firebase] Auth init failed', err);
    }
  }

  // Initialize Firestore (enabled by default for Firebase-first architecture)
  if (options?.enableFirestore !== false && !firestore) {
    try {
      firestore = getFirestore(app!);
      if (import.meta.env.DEV) {
        console.log('[firebase] Firestore initialized for real-time subscriptions');
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[firebase] Firestore init failed', err);
    }
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

  return { app, analytics, messaging, auth, firestore };
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

// Firebase Auth utility functions
export async function signIn(email: string, password: string) {
  if (!auth) {
    throw new Error('Firebase Auth not initialized');
  }
  return await signInWithEmailAndPassword(auth, email, password);
}

export async function signUp(email: string, password: string, displayName?: string) {
  if (!auth) {
    throw new Error('Firebase Auth not initialized');
  }
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  
  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }
  
  return userCredential;
}

export async function signOutUser() {
  if (!auth) {
    throw new Error('Firebase Auth not initialized');
  }
  return await signOut(auth);
}

export async function resetPassword(email: string) {
  if (!auth) {
    throw new Error('Firebase Auth not initialized');
  }
  return await sendPasswordResetEmail(auth, email);
}

export async function verifyEmail(user: User) {
  return await sendEmailVerification(user);
}

export async function changePassword(user: User, newPassword: string) {
  return await updatePassword(user, newPassword);
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  if (!auth) {
    throw new Error('Firebase Auth not initialized');
  }
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth?.currentUser || null;
}

// Convenience auto-init (opt-in via env flag)
if (import.meta.env.VITE_FIREBASE_AUTO_INIT === 'true') {
  initFirebase({ enableAnalytics: true, enableMessaging: false, enableAuth: true });
}

export const firebaseApp = app;
export { auth as firebaseAuth, firestore as firebaseFirestore };