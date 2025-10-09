import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { User } from 'firebase/auth';
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

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    const initAuth = async () => {
      try {
        // Initialize Firebase with Auth and Firestore enabled for Firebase-first architecture
        await initFirebase({ enableAuth: true, enableFirestore: true });
        
        // Set up auth state listener
        unsubscribe = onAuthStateChange((user) => {
          setUser(user);
          setLoading(false);
          
          if (import.meta.env.DEV) {
            console.log('[AuthContext] Auth state changed:', user ? 'signed in' : 'signed out');
          }
        });
      } catch (error) {
        console.error('[AuthContext] Failed to initialize auth:', error);
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
      // User state will be updated through onAuthStateChanged
    } catch (error) {
      console.error('[AuthContext] Sign in failed:', error);
      throw error;
    }
  };

  const signUp = async (email: string, password: string, displayName?: string): Promise<void> => {
    try {
      await firebaseSignUp(email, password, displayName);
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