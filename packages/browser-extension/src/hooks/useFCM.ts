/**
 * React hooks for Firebase Cloud Messaging in browser extension
 * Provides FCM functionality and notification management for extension popup
 */

import { useState, useEffect, useCallback } from 'react';
import { 
  initializeExtensionFCM,
  getExtensionNotificationPreferences,
  updateExtensionNotificationPreferences,
  updateExtensionBadge,
  clearExtensionBadge,
  ExtensionNotificationPreferences
} from '../lib/fcm';

// FCM hook state interface
interface UseFCMState {
  isSupported: boolean;
  permission: NotificationPermission;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for managing FCM in browser extension
 */
export function useExtensionFCM() {
  const [state, setState] = useState<UseFCMState>({
    isSupported: 'serviceWorker' in navigator && 'PushManager' in window,
    permission: 'default',
    token: null,
    isLoading: true,
    error: null
  });

  const [unsubscribe, setUnsubscribe] = useState<(() => void) | null>(null);

  // Initialize FCM when component mounts
  useEffect(() => {
    let mounted = true;

    const initFCM = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        // Check initial permission state
        const currentPermission = Notification.permission;
        
        if (!state.isSupported) {
          throw new Error('FCM not supported in this browser');
        }

        // Initialize FCM
        const { token, unsubscribe: unsub } = await initializeExtensionFCM();

        if (mounted) {
          setState(prev => ({
            ...prev,
            permission: currentPermission,
            token,
            isLoading: false
          }));
          setUnsubscribe(() => unsub);
        }
      } catch (error) {
        console.error('[useExtensionFCM] Initialization error:', error);
        if (mounted) {
          setState(prev => ({
            ...prev,
            error: error instanceof Error ? error.message : 'Failed to initialize FCM',
            isLoading: false
          }));
        }
      }
    };

    initFCM();

    return () => {
      mounted = false;
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [state.isSupported]);

  // Enable notifications
  const enableNotifications = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      const { token, unsubscribe: unsub } = await initializeExtensionFCM();
      
      if (token) {
        setState(prev => ({
          ...prev,
          permission: 'granted',
          token,
          isLoading: false
        }));
        setUnsubscribe(() => unsub);
        return true;
      } else {
        setState(prev => ({
          ...prev,
          permission: 'denied',
          isLoading: false
        }));
        return false;
      }
    } catch (error) {
      console.error('[useExtensionFCM] Enable error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to enable notifications',
        isLoading: false
      }));
      return false;
    }
  }, []);

  // Disable notifications
  const disableNotifications = useCallback(() => {
    if (unsubscribe) {
      unsubscribe();
      setUnsubscribe(null);
    }
    
    clearExtensionBadge();
    
    setState(prev => ({
      ...prev,
      token: null,
      permission: 'denied'
    }));
  }, [unsubscribe]);

  // Update badge
  const updateBadge = useCallback(async () => {
    try {
      await updateExtensionBadge();
    } catch (error) {
      console.error('[useExtensionFCM] Badge update error:', error);
    }
  }, []);

  return {
    ...state,
    enableNotifications,
    disableNotifications,
    updateBadge
  };
}

// Notification preferences hook state
interface UseNotificationPreferencesState {
  preferences: ExtensionNotificationPreferences | null;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for managing notification preferences in extension
 */
export function useExtensionNotificationPreferences() {
  const [state, setState] = useState<UseNotificationPreferencesState>({
    preferences: null,
    isLoading: true,
    error: null
  });

  // Load preferences
  const loadPreferences = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const preferences = await getExtensionNotificationPreferences();
      
      setState(prev => ({
        ...prev,
        preferences,
        isLoading: false
      }));
    } catch (error) {
      console.error('[useExtensionNotificationPreferences] Load error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load preferences',
        isLoading: false
      }));
    }
  }, []);

  // Update preferences
  const updatePreferences = useCallback(async (
    updates: Partial<ExtensionNotificationPreferences>
  ): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, error: null }));
      
      await updateExtensionNotificationPreferences(updates);
      
      // Reload preferences to get updated data
      await loadPreferences();
      
      return true;
    } catch (error) {
      console.error('[useExtensionNotificationPreferences] Update error:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to update preferences'
      }));
      return false;
    }
  }, [loadPreferences]);

  // Toggle notification type
  const toggleNotificationType = useCallback(async (
    type: keyof ExtensionNotificationPreferences['types']
  ): Promise<boolean> => {
    if (!state.preferences) return false;
    
    const currentValue = state.preferences.types[type];
    return updatePreferences({
      types: {
        ...state.preferences.types,
        [type]: !currentValue
      }
    });
  }, [state.preferences, updatePreferences]);

  // Toggle delivery method
  const toggleDeliveryMethod = useCallback(async (
    method: keyof ExtensionNotificationPreferences['delivery']
  ): Promise<boolean> => {
    if (!state.preferences) return false;
    
    const currentValue = state.preferences.delivery[method];
    return updatePreferences({
      delivery: {
        ...state.preferences.delivery,
        [method]: !currentValue
      }
    });
  }, [state.preferences, updatePreferences]);

  // Update quiet hours
  const updateQuietHours = useCallback(async (
    quietHours: Partial<ExtensionNotificationPreferences['quietHours']>
  ): Promise<boolean> => {
    if (!state.preferences) return false;
    
    return updatePreferences({
      quietHours: {
        ...state.preferences.quietHours,
        ...quietHours
      }
    });
  }, [state.preferences, updatePreferences]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    ...state,
    loadPreferences,
    updatePreferences,
    toggleNotificationType,
    toggleDeliveryMethod,
    updateQuietHours
  };
}

// Extension-specific notification utilities
export const extensionNotificationUtils = {
  /**
   * Show a simple notification in extension context
   */
  showNotification: (title: string, message: string, options?: Partial<NotificationOptions>) => {
    if (chrome?.notifications) {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: '/icons/icon-128.png',
        title,
        message,
        priority: 1
      });
    } else if (Notification.permission === 'granted') {
      new Notification(title, {
        body: message,
        icon: '/icons/icon-128.png',
        ...options
      });
    }
  },

  /**
   * Clear all extension notifications
   */
  clearAllNotifications: () => {
    if (chrome?.notifications) {
      chrome.notifications.getAll((notifications: any) => {
        Object.keys(notifications).forEach((id) => {
          chrome.notifications.clear(id);
        });
      });
    }
    clearExtensionBadge();
  },

  /**
   * Check if extension has notification permission
   */
  hasPermission: (): boolean => {
    return Notification.permission === 'granted';
  },

  /**
   * Open extension options/settings page
   */
  openSettings: () => {
    if (chrome?.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      chrome.tabs.create({
        url: chrome.runtime.getURL('/options.html')
      });
    }
  }
};