import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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
  changePassword
} from '../lib/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, displayName?: string) => Promise<void>;
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

  const isFirebaseNotConfiguredError = (error: unknown): boolean => {
    if (!error || typeof error !== 'object') {
      return false;
    }
    return (error as { code?: string }).code === 'app/firebase-not-configured';
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
    signOut,
    resetPassword: resetPasswordHandler,
    sendEmailVerification,
    updatePassword,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;