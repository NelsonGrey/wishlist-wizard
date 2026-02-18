// Firebase initialization using shared utilities
// This module safely initializes Firebase using the shared FirebaseClient.
// All imports are tree-shakeable.

import { FirebaseClient } from '@shared/firebase-utils';
import type { User, Auth } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import {
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
import { getToken, isSupported as messagingIsSupported } from 'firebase/messaging';

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

// Global FirebaseClient instance
let firebaseClient: FirebaseClient | null = null;
export let firebaseApp: FirebaseApp | null = null;
export let firebaseAuth: Auth | null = null;
export let firebaseFirestore: Firestore | null = null;

function ensureFirebaseCoreInitialized(): boolean {
  if (firebaseClient) {
    firebaseApp = firebaseClient.app;
    firebaseAuth = firebaseClient.auth;
    firebaseFirestore = firebaseClient.firestore;
    return true;
  }

  if (!hasAllConfigValues()) {
    return false;
  }

  firebaseClient = FirebaseClient.initialize(firebaseConfig);
  firebaseApp = firebaseClient.app;
  firebaseAuth = firebaseClient.auth;
  firebaseFirestore = firebaseClient.firestore;

  if (import.meta.env.DEV) {
    firebaseClient.connectToEmulators();
  }

  return true;
}

export async function initFirebase(options?: {
  enableAnalytics?: boolean;
  enableMessaging?: boolean;
  enableAuth?: boolean;
  enableFirestore?: boolean;
}) {
  if (!ensureFirebaseCoreInitialized()) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[firebase] Skipping initialization – missing config env vars');
    }
    return { app: null, analytics: null, messaging: null, auth: null, firestore: null };
  }

  // Initialize Firebase Auth (enabled by default for Firebase-first architecture)
  if (options?.enableAuth !== false) {
    try {
      // Set persistence to local storage for better UX
      await setPersistence(firebaseClient.auth, browserLocalPersistence);
      if (import.meta.env.DEV) {
        console.log('[firebase] Auth initialized with local persistence');
      }
    } catch (err) {
      if (import.meta.env.DEV) console.warn('[firebase] Auth init failed', err);
    }
  }

  // Initialize Firestore (enabled by default for Firebase-first architecture)
  if (options?.enableFirestore !== false) {
    if (import.meta.env.DEV) {
      console.log('[firebase] Firestore initialized for real-time subscriptions');
    }
  }

  return {
    app: firebaseClient.app,
    analytics: null, // Analytics not handled by FirebaseClient yet
    messaging: null, // Messaging not handled by FirebaseClient yet
    auth: firebaseClient.auth,
    firestore: firebaseClient.firestore
  };
}

// Web Push (FCM) helper to request permission & acquire token
export async function getFcmToken(vapidKey?: string): Promise<string | null> {
  if (!firebaseClient) return null;
  try {
    // Note: FirebaseClient doesn't handle messaging yet, so we initialize it separately
    if (await messagingIsSupported()) {
      const { getMessaging } = await import('firebase/messaging');
      const messaging = getMessaging(firebaseClient.app);
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return null;
      const token = await getToken(messaging, vapidKey ? { vapidKey } : undefined);
      return token || null;
    }
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[firebase] Unable to get FCM token', err);
    return null;
  }
  return null;
}

// Foreground message listener
export function onForegroundMessage(cb: (payload: unknown) => void) {
  if (!firebaseClient) return () => void 0;
  try {
    messagingIsSupported().then(supported => {
      if (supported) {
        import('firebase/messaging').then(({ getMessaging, onMessage }) => {
          const messaging = getMessaging(firebaseClient!.app);
          const unsubscribe = onMessage(messaging, (payload) => cb(payload));
          return unsubscribe;
        });
      }
    }).catch(err => {
      if (import.meta.env.DEV) console.warn('[firebase] Unable to set up foreground messaging', err);
    });
  } catch (err) {
    if (import.meta.env.DEV) console.warn('[firebase] Unable to set up foreground messaging', err);
  }
  return () => void 0;
}

// Firebase Auth utility functions
export async function signIn(email: string, password: string) {
  if (!firebaseClient) {
    throw new Error('Firebase not initialized');
  }
  return await signInWithEmailAndPassword(firebaseClient.auth, email, password);
}

export async function signUp(email: string, password: string, displayName?: string) {
  if (!firebaseClient) {
    throw new Error('Firebase not initialized');
  }
  const userCredential = await createUserWithEmailAndPassword(firebaseClient.auth, email, password);

  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }

  return userCredential;
}

export async function signOutUser() {
  if (!firebaseClient) {
    throw new Error('Firebase not initialized');
  }
  return await signOut(firebaseClient.auth);
}

export async function resetPassword(email: string) {
  if (!firebaseClient) {
    throw new Error('Firebase not initialized');
  }
  return await sendPasswordResetEmail(firebaseClient.auth, email);
}

export async function verifyEmail(user: User) {
  return await sendEmailVerification(user);
}

export async function changePassword(user: User, newPassword: string) {
  return await updatePassword(user, newPassword);
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  if (!firebaseClient) {
    throw new Error('Firebase not initialized');
  }
  return onAuthStateChanged(firebaseClient.auth, callback);
}

export function getCurrentUser(): User | null {
  return firebaseClient?.auth?.currentUser || null;
}

// Convenience auto-init (opt-in via env flag)
if (import.meta.env.VITE_FIREBASE_AUTO_INIT === 'true') {
  initFirebase({ enableAnalytics: true, enableMessaging: false, enableAuth: true });
} else {
  ensureFirebaseCoreInitialized();
}