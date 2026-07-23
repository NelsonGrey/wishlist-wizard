import React, { createContext, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import type { User } from 'firebase/auth';
import {
  FeatureFlags,
  getAnalyticsTracker,
} from '@shared/firebase-utils';
import {
  initFirebase,
  onAuthStateChange,
  signIn as firebaseSignIn,
  signUp as firebaseSignUp,
  signOutUser,
  resetPassword,
  verifyEmail,
  changePassword,
  signInWithGoogle as firebaseSignInWithGoogle,
  signInWithApple as firebaseSignInWithApple,
  credentialFromOAuthError,
  getSignInMethodsForEmail as firebaseGetSignInMethodsForEmail,
  linkPendingCredential
} from '../lib/firebase';

type OAuthProviderId = 'google.com' | 'apple.com';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithApple: () => Promise<void>;
  getSignInMethodsForEmail: (email: string) => Promise<string[]>;
  linkPendingOAuthCredential: (
    providerId: OAuthProviderId,
    pendingError: unknown,
    email: string,
    password: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);
  const hasBroadcastSignedInUserRef = useRef(false);

  const isFirebaseNotConfiguredError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') {
      return false;
    }
    return (error as { code?: string }).code === 'app/firebase-not-configured';
  };

  // Lets the Wishlist Wizard browser extension (if installed and listening
  // on this origin) reuse this signed-in session instead of requiring a
  // separate login, and tells it when that session ends — see
  // packages/browser-extension/src/web-auth-bridge.js.
  const broadcastAuthTokenToExtension = async (currentUser: User | null) => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!currentUser) {
      // Only signal a sign-out if this tab had actually broadcast a signed-in
      // session before. Otherwise a logged-out visit to a public page (where
      // the content script always requests the current auth state on load)
      // would clear an unrelated, independently-logged-in extension session
      // that was never bridged from this tab in the first place.
      if (hasBroadcastSignedInUserRef.current) {
        hasBroadcastSignedInUserRef.current = false;
        window.dispatchEvent(new CustomEvent('ww:auth-bridge-signout'));
      }
      return;
    }

    try {
      const token = await currentUser.getIdToken();
      hasBroadcastSignedInUserRef.current = true;
      window.dispatchEvent(new CustomEvent('ww:auth-bridge-token', {
        detail: {
          token,
          // Firebase ID tokens last ~1h; refresh well before then.
          expiresAt: Date.now() + 55 * 60 * 1000,
          userEmail: currentUser.email || null,
        },
      }));
    } catch {
      // Non-fatal — if the extension is listening, it just won't get a bridged token this time.
    }
  };

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    const analyticsTracker = getAnalyticsTracker();

    const initAuth = async () => {
      try {
        // Initialize Firebase with client observability services enabled.
        const { remoteConfig } = await initFirebase({
          enableAnalytics: true,
          enableAuth: true,
          enableFirestore: true,
          enableRemoteConfig: true,
        });

        analyticsTracker.setUserProperties({
          platform: 'web',
        });

        if (remoteConfig?.isFeatureEnabled(FeatureFlags.ENABLE_ANALYTICS)) {
          analyticsTracker.logFeatureFlagEnabled(FeatureFlags.ENABLE_ANALYTICS);
        }

        if (remoteConfig?.isFeatureEnabled(FeatureFlags.ENABLE_PERFORMANCE_MONITORING)) {
          analyticsTracker.logFeatureFlagEnabled(FeatureFlags.ENABLE_PERFORMANCE_MONITORING);
        }
        
        // Set up auth state listener
        unsubscribe = onAuthStateChange((user) => {
          setUser(user);
          userRef.current = user;
          broadcastAuthTokenToExtension(user);

          analyticsTracker.setUserProperties({
            platform: 'web',
            feature_adoption: user && remoteConfig
              ? [
                  remoteConfig.isFeatureEnabledForUser(FeatureFlags.PRICE_ALERTS_ENABLED, user.uid) ? 'price_alerts' : null,
                  remoteConfig.isFeatureEnabledForUser(FeatureFlags.GROUP_GIFTING_ENABLED, user.uid) ? 'group_gifting' : null,
                ].filter(Boolean).join(',') || undefined
              : undefined,
          });

          setLoading(false);
        });
      } catch (error) {
        if (isFirebaseNotConfiguredError(error)) {
          console.warn('[AuthContext] Firebase config is unavailable; continuing in limited mode');
        } else {
          console.error('[AuthContext] Failed to initialize auth:', error);
        }
        setLoading(false);
      }
    };

    initAuth();

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  // Respond to the extension's content script asking for the current session,
  // and keep it topped up with a fresh token periodically while signed in.
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleTokenRequest = () => {
      broadcastAuthTokenToExtension(userRef.current);
    };
    window.addEventListener('ww:request-auth-token', handleTokenRequest);

    const interval = window.setInterval(() => {
      broadcastAuthTokenToExtension(userRef.current);
    }, 30 * 60 * 1000);

    return () => {
      window.removeEventListener('ww:request-auth-token', handleTokenRequest);
      window.clearInterval(interval);
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<void> => {
    try {
      await firebaseSignIn(email, password);
      getAnalyticsTracker().logUserLogin('email');
      // User state will be updated through onAuthStateChanged
    } catch (error) {
      console.error('[AuthContext] Sign in failed:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName?: string): Promise<void> => {
    try {
      await firebaseSignUp(email, password, displayName);
      getAnalyticsTracker().logUserSignup({
        has_display_name: Boolean(displayName),
      });
      // User state will be updated through onAuthStateChanged
    } catch (error) {
      console.error('[AuthContext] Sign up failed:', error);
      throw error;
    }
  };

  const signInWithGoogle = async (): Promise<void> => {
    try {
      await firebaseSignInWithGoogle();
      getAnalyticsTracker().logUserLogin('social');
      // User state will be updated through onAuthStateChanged
    } catch (error) {
      console.error('[AuthContext] Google sign-in failed:', error);
      throw error;
    }
  };

  const signInWithApple = async (): Promise<void> => {
    try {
      await firebaseSignInWithApple();
      getAnalyticsTracker().logUserLogin('social');
      // User state will be updated through onAuthStateChanged
    } catch (error) {
      console.error('[AuthContext] Apple sign-in failed:', error);
      throw error;
    }
  };

  const getSignInMethodsForEmail = async (email: string): Promise<string[]> => {
    return await firebaseGetSignInMethodsForEmail(email);
  };

  // Recovers from `auth/account-exists-with-different-credential`: signs the
  // user in with the password-based account they already have, then attaches
  // the OAuth credential from the failed Google/Apple attempt to that same
  // account so both sign-in methods work going forward.
  const linkPendingOAuthCredential = async (
    providerId: OAuthProviderId,
    pendingError: unknown,
    email: string,
    password: string
  ): Promise<void> => {
    const credential = credentialFromOAuthError(pendingError, providerId);
    if (!credential) {
      throw new Error('No pending OAuth credential to link');
    }
    const userCredential = await firebaseSignIn(email, password);
    await linkPendingCredential(userCredential.user, credential);
  };

  const signOut = async (): Promise<void> => {
    try {
      await signOutUser();
      // User state will be updated through onAuthStateChanged
    } catch (error) {
      console.error('[AuthContext] Sign out failed:', error);
      throw error;
    }
  };

  const resetPasswordHandler = async (email: string): Promise<void> => {
    try {
      await resetPassword(email);
    } catch (error) {
      console.error('[AuthContext] Password reset failed:', error);
      throw error;
    }
  };

  const sendEmailVerification = async (): Promise<void> => {
    if (!user) {
      throw new Error('No user is currently signed in');
    }
    try {
      await verifyEmail(user);
    } catch (error) {
      console.error('[AuthContext] Email verification failed:', error);
      throw error;
    }
  };

  const updatePassword = async (password: string): Promise<void> => {
    if (!user) {
      throw new Error('No user is currently signed in');
    }
    try {
      await changePassword(user, password);
    } catch (error) {
      console.error('[AuthContext] Password update failed:', error);
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    signIn,
    signUp,
    signInWithGoogle,
    signInWithApple,
    getSignInMethodsForEmail,
    linkPendingOAuthCredential,
    signOut,
    resetPassword: resetPasswordHandler,
    sendEmailVerification,
    updatePassword,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;