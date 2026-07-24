// Firebase initialization using shared utilities
// This module safely initializes Firebase using the shared FirebaseClient.
// All imports are tree-shakeable.

import {
  FirebaseClient,
  getAnalyticsTracker,
  getRemoteConfig,
  initializeAnalytics,
  initializeRemoteConfig,
} from '@shared/firebase-utils';
import type { User, Auth, AuthCredential } from 'firebase/auth';
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
  browserLocalPersistence,
  GoogleAuthProvider,
  OAuthProvider,
  signInWithPopup,
  linkWithCredential
} from 'firebase/auth';
import { getToken, isSupported as messagingIsSupported } from 'firebase/messaging';

function shouldUseFirebaseEmulators(): boolean {
  return String(import.meta.env.VITE_USE_FIREBASE_EMULATORS || '').toLowerCase() === 'true';
}

function resolveEnvironmentSuffixFromHostname(): 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION' | null {
  if (typeof window === 'undefined' || !window.location?.hostname) {
    return null;
  }

  const hostname = window.location.hostname.toLowerCase();

  // Local development always uses development environment variables.
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'DEVELOPMENT';
  }

  // Firebase Hosting environment-specific domains.
  if (hostname.includes('wishlist-wizard-dev.web.app')) {
    return 'DEVELOPMENT';
  }
  if (hostname.includes('wishlist-wizard-staging.web.app')) {
    return 'STAGING';
  }
  if (hostname.includes('wishlist-wizard-prod.web.app') || hostname.includes('wishlist-wizard.web.app') || hostname === 'wishlist-wizard.com' || hostname === 'www.wishlist-wizard.com') {
    return 'PRODUCTION';
  }

  // Generic suffix fallbacks for non-default hostnames.
  if (hostname.includes('-dev') || hostname.includes('.dev.')) {
    return 'DEVELOPMENT';
  }
  if (hostname.includes('-staging') || hostname.includes('.staging.')) {
    return 'STAGING';
  }

  return null;
}

function isHostedWebAppDomain(): boolean {
  if (typeof window === 'undefined' || !window.location?.hostname) {
    return false;
  }

  const hostname = window.location.hostname.toLowerCase();
  return (
    hostname.includes('wishlist-wizard-dev.web.app') ||
    hostname.includes('wishlist-wizard-staging.web.app') ||
    hostname === 'wishlist-wizard-prod.web.app' ||
    hostname === 'wishlist-wizard.web.app' ||
    hostname === 'wishlist-wizard.com' ||
    hostname === 'www.wishlist-wizard.com'
  );
}

function resolveEnvironmentSuffix(): 'DEVELOPMENT' | 'STAGING' | 'PRODUCTION' {
  const hostnameEnv = resolveEnvironmentSuffixFromHostname();
  if (hostnameEnv) return hostnameEnv;

  const explicitEnv = String(import.meta.env.VITE_ENVIRONMENT || '').toLowerCase();
  if (explicitEnv === 'production') return 'PRODUCTION';
  if (explicitEnv === 'staging') return 'STAGING';
  if (explicitEnv === 'development') return 'DEVELOPMENT';

  const mode = String(import.meta.env.MODE || '').toLowerCase();
  if (mode === 'production') return 'PRODUCTION';
  return 'DEVELOPMENT';
}

const envSuffix = resolveEnvironmentSuffix();

function pickEnvValue(
  developmentValue: string | undefined,
  stagingValue: string | undefined,
  productionValue: string | undefined,
  fallbackValue: string | undefined
): string {
  const selectedByEnvironment = (
    envSuffix === 'DEVELOPMENT'
      ? developmentValue
      : envSuffix === 'STAGING'
        ? stagingValue
        : productionValue
  );

  const allowFallback =
    !isHostedWebAppDomain() &&
    String(import.meta.env.VITE_ALLOW_FIREBASE_PLAIN_FALLBACK || '').toLowerCase() === 'true';
  return selectedByEnvironment || (allowFallback ? (fallbackValue || '') : '');
}

// Prefer environment-suffixed vars (VITE_FIREBASE_*_DEVELOPMENT/STAGING/PRODUCTION),
// while remaining backward compatible with plain VITE_FIREBASE_*.
let firebaseConfig = {
  apiKey: pickEnvValue(
    import.meta.env.VITE_FIREBASE_API_KEY_DEVELOPMENT,
    import.meta.env.VITE_FIREBASE_API_KEY_STAGING,
    import.meta.env.VITE_FIREBASE_API_KEY_PRODUCTION,
    import.meta.env.VITE_FIREBASE_API_KEY
  ),
  authDomain: pickEnvValue(
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN_DEVELOPMENT,
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN_STAGING,
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN_PRODUCTION,
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN
  ),
  projectId: pickEnvValue(
    import.meta.env.VITE_FIREBASE_PROJECT_ID_DEVELOPMENT,
    import.meta.env.VITE_FIREBASE_PROJECT_ID_STAGING,
    import.meta.env.VITE_FIREBASE_PROJECT_ID_PRODUCTION,
    import.meta.env.VITE_FIREBASE_PROJECT_ID
  ),
  storageBucket: pickEnvValue(
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET_DEVELOPMENT,
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET_STAGING,
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET_PRODUCTION,
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET
  ),
  messagingSenderId: pickEnvValue(
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID_DEVELOPMENT,
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID_STAGING,
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID_PRODUCTION,
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID
  ),
  appId: pickEnvValue(
    import.meta.env.VITE_FIREBASE_APP_ID_DEVELOPMENT,
    import.meta.env.VITE_FIREBASE_APP_ID_STAGING,
    import.meta.env.VITE_FIREBASE_APP_ID_PRODUCTION,
    import.meta.env.VITE_FIREBASE_APP_ID
  ),
  // Optional: Analytics is not required for Auth/Firestore to initialize.
  measurementId: pickEnvValue(
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID_DEVELOPMENT,
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID_STAGING,
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID_PRODUCTION,
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  ) || undefined,
  // App Check: enforced server-side on Auth/Firestore/Storage in
  // wishlist-wizard-dev as of 2026-07-18; wiring the client through so real
  // requests aren't rejected. appCheckDebugToken lets local dev / automated
  // E2E tests pass without solving a real reCAPTCHA challenge — it must
  // match a token already registered for this app (see
  // e2e/fixtures/bootstrap.ts / .env.local for the local one).
  appCheckSiteKey: pickEnvValue(
    import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY_DEVELOPMENT,
    import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY_STAGING,
    import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY_PRODUCTION,
    import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY
  ) || undefined,
  appCheckDebugToken: (import.meta.env.DEV && import.meta.env.VITE_FIREBASE_APPCHECK_DEBUG_TOKEN) || undefined,
};

function mergeWithRuntimeFirebaseConfig(runtimeConfig: Record<string, unknown>) {
  const hostname = typeof window !== 'undefined' ? String(window.location?.hostname || '').toLowerCase() : '';
  const preferRuntimeConfig =
    hostname.includes('wishlist-wizard-dev.web.app') ||
    hostname.includes('wishlist-wizard-staging.web.app') ||
    hostname === 'wishlist-wizard-prod.web.app' ||
    hostname === 'wishlist-wizard.web.app' ||
    hostname === 'wishlist-wizard.com' ||
    hostname === 'www.wishlist-wizard.com';

  firebaseConfig = {
    ...firebaseConfig,
    apiKey: preferRuntimeConfig ? String(runtimeConfig.apiKey || firebaseConfig.apiKey || '') : (firebaseConfig.apiKey || String(runtimeConfig.apiKey || '')),
    authDomain: preferRuntimeConfig ? String(runtimeConfig.authDomain || firebaseConfig.authDomain || '') : (firebaseConfig.authDomain || String(runtimeConfig.authDomain || '')),
    projectId: preferRuntimeConfig ? String(runtimeConfig.projectId || firebaseConfig.projectId || '') : (firebaseConfig.projectId || String(runtimeConfig.projectId || '')),
    storageBucket: preferRuntimeConfig ? String(runtimeConfig.storageBucket || firebaseConfig.storageBucket || '') : (firebaseConfig.storageBucket || String(runtimeConfig.storageBucket || '')),
    messagingSenderId: preferRuntimeConfig ? String(runtimeConfig.messagingSenderId || firebaseConfig.messagingSenderId || '') : (firebaseConfig.messagingSenderId || String(runtimeConfig.messagingSenderId || '')),
    appId: preferRuntimeConfig ? String(runtimeConfig.appId || firebaseConfig.appId || '') : (firebaseConfig.appId || String(runtimeConfig.appId || '')),
    measurementId: preferRuntimeConfig
      ? String(runtimeConfig.measurementId || firebaseConfig.measurementId || '') || undefined
      : (firebaseConfig.measurementId || String(runtimeConfig.measurementId || '') || undefined),
  };
}

async function loadRuntimeFirebaseConfigFromHosting(): Promise<void> {
  if (hasAllConfigValues()) {
    return;
  }

  if (typeof window === 'undefined') {
    return;
  }

  try {
    const response = await fetch('/__/firebase/init.json', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
    });

    if (!response.ok) {
      return;
    }

    const runtimeConfig = await response.json();
    if (!runtimeConfig || typeof runtimeConfig !== 'object') {
      return;
    }

    mergeWithRuntimeFirebaseConfig(runtimeConfig as Record<string, unknown>);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[firebase] Unable to load hosting runtime config', error);
    }
  }
}

function hasAllConfigValues() {
  const requiredValues = [
    firebaseConfig.apiKey,
    firebaseConfig.authDomain,
    firebaseConfig.projectId,
    firebaseConfig.storageBucket,
    firebaseConfig.messagingSenderId,
    firebaseConfig.appId,
  ];

  return requiredValues.every(v => typeof v === 'string' && v.length > 0);
}

interface FirebaseAppError extends Error {
  code: string;
}

function createFirebaseNotConfiguredError(): FirebaseAppError {
  const error = new Error(
    `Firebase is not configured. Set VITE_FIREBASE_*_${envSuffix} (or plain VITE_FIREBASE_* fallback values).`
  ) as FirebaseAppError;
  error.code = 'app/firebase-not-configured';
  return error;
}

// Global FirebaseClient instance
let firebaseClient: FirebaseClient | null = null;
export let firebaseApp: FirebaseApp | null = null;
export let firebaseAuth: Auth | null = null;
export let firebaseFirestore: Firestore | null = null;
let analyticsInitialized = false;
let remoteConfigInitialized = false;

/**
 * The initialized App Check instance, if App Check is configured — needed by
 * callers that make raw fetch() requests (e.g. the api router) instead of
 * going through the Firebase Functions SDK, since httpsCallable() attaches
 * the App Check token automatically but a plain fetch() does not.
 */
export function getFirebaseAppCheck() {
  return firebaseClient?.appCheck ?? null;
}

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

  if (import.meta.env.DEV && shouldUseFirebaseEmulators()) {
    firebaseClient.connectToEmulators();
  }

  return true;
}

export async function initFirebase(options?: {
  enableAnalytics?: boolean;
  enableMessaging?: boolean;
  enableAuth?: boolean;
  enableFirestore?: boolean;
  enableRemoteConfig?: boolean;
}) {
  await loadRuntimeFirebaseConfigFromHosting();

  if (!ensureFirebaseCoreInitialized()) {
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.warn('[firebase] Skipping initialization – missing config env vars');
    }
    return { app: null, analytics: null, messaging: null, auth: null, firestore: null };
  }

  const client = firebaseClient;
  if (!client) {
    return { app: null, analytics: null, messaging: null, auth: null, firestore: null };
  }

  // Initialize Firebase Auth (enabled by default for Firebase-first architecture)
  if (options?.enableAuth !== false) {
    try {
      // Set persistence to local storage for better UX
      await setPersistence(client.auth, browserLocalPersistence);
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

  if (options?.enableAnalytics && !analyticsInitialized) {
    initializeAnalytics();
    analyticsInitialized = true;

    if (import.meta.env.DEV) {
      console.log('[firebase] Analytics tracker initialized');
    }
  }

  if (options?.enableRemoteConfig && !remoteConfigInitialized) {
    await initializeRemoteConfig();
    remoteConfigInitialized = true;

    if (import.meta.env.DEV) {
      console.log('[firebase] Remote Config initialized');
    }
  }

  return {
    app: client.app,
    analytics: analyticsInitialized ? getAnalyticsTracker() : null,
    messaging: null, // Messaging not handled by FirebaseClient yet
    auth: client.auth,
    firestore: client.firestore,
    remoteConfig: remoteConfigInitialized ? getRemoteConfig() : null,
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
    await initFirebase({ enableAuth: true, enableFirestore: true });
  }
  if (!firebaseClient) throw createFirebaseNotConfiguredError();
  return await signInWithEmailAndPassword(firebaseClient.auth, email, password);
}

export async function signUp(email: string, password: string, displayName?: string) {
  if (!firebaseClient) {
    await initFirebase({ enableAuth: true, enableFirestore: true });
  }
  if (!firebaseClient) throw createFirebaseNotConfiguredError();
  const userCredential = await createUserWithEmailAndPassword(firebaseClient.auth, email, password);

  if (displayName && userCredential.user) {
    await updateProfile(userCredential.user, { displayName });
  }

  return userCredential;
}

export async function signInWithGoogle() {
  if (!firebaseClient) {
    await initFirebase({ enableAuth: true, enableFirestore: true });
  }
  if (!firebaseClient) throw createFirebaseNotConfiguredError();
  return await signInWithPopup(firebaseClient.auth, new GoogleAuthProvider());
}

export async function signInWithApple() {
  if (!firebaseClient) {
    await initFirebase({ enableAuth: true, enableFirestore: true });
  }
  if (!firebaseClient) throw createFirebaseNotConfiguredError();
  const provider = new OAuthProvider('apple.com');
  provider.addScope('email');
  provider.addScope('name');
  return await signInWithPopup(firebaseClient.auth, provider);
}

/** Parses the pending credential off an `auth/account-exists-with-different-credential` error. */
export function credentialFromOAuthError(error: unknown, providerId: 'google.com' | 'apple.com'): AuthCredential | null {
  return providerId === 'google.com'
    ? GoogleAuthProvider.credentialFromError(error as Parameters<typeof GoogleAuthProvider.credentialFromError>[0])
    : OAuthProvider.credentialFromError(error as Parameters<typeof OAuthProvider.credentialFromError>[0]);
}

export async function linkPendingCredential(user: User, credential: AuthCredential) {
  return await linkWithCredential(user, credential);
}

export async function signOutUser() {
  if (!firebaseClient) {
    await initFirebase({ enableAuth: true, enableFirestore: true });
  }
  if (!firebaseClient) throw createFirebaseNotConfiguredError();
  return await signOut(firebaseClient.auth);
}

export async function resetPassword(email: string) {
  if (!firebaseClient) {
    await initFirebase({ enableAuth: true, enableFirestore: true });
  }
  if (!firebaseClient) throw createFirebaseNotConfiguredError();
  return await sendPasswordResetEmail(firebaseClient.auth, email);
}

export async function verifyEmail(user: User) {
  return await sendEmailVerification(user);
}

export async function changePassword(user: User, newPassword: string) {
  return await updatePassword(user, newPassword);
}

export function onAuthStateChange(callback: (user: User | null) => void) {
  if (!firebaseClient && !ensureFirebaseCoreInitialized()) {
    throw createFirebaseNotConfiguredError();
  }
  if (!firebaseClient) throw createFirebaseNotConfiguredError();
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
