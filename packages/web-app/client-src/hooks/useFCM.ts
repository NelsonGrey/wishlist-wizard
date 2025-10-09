import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  initializeFCM, 
  requestNotificationPermission, 
  setupForegroundMessageListener,
  getNotificationPreferences,
  updateNotificationPreferences,
  getCurrentFCMToken,
  isFCMAvailable,
  type NotificationPreferences
} from '../lib/fcm';

/**
 * Hook for managing Firebase Cloud Messaging in React components
 */
export function useFCM() {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize FCM when component mounts and user is authenticated
  useEffect(() => {
    const initialize = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const supported = await isFCMAvailable();
        setIsSupported(supported);

        if (supported) {
          const initialized = await initializeFCM();
          setIsInitialized(initialized);

          if (initialized) {
            // Get current permission status
            setPermission(Notification.permission);

            // Get current token if permission is granted
            if (Notification.permission === 'granted') {
              const currentToken = await getCurrentFCMToken();
              setToken(currentToken);
            }

            // Load user preferences
            const userPrefs = await getNotificationPreferences();
            setPreferences(userPrefs);
          }
        }
      } catch (error) {
        console.error('[useFCM] Initialization failed:', error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [user]);

  // Set up foreground message listener
  useEffect(() => {
    if (!isInitialized) return;

    const unsubscribe = setupForegroundMessageListener((payload) => {
      console.log('[useFCM] Foreground message received:', payload);
      
      // You could emit a custom event here for other components to listen to
      window.dispatchEvent(new CustomEvent('fcm-message', { 
        detail: payload 
      }));
    });

    return unsubscribe || undefined;
  }, [isInitialized]);

  /**
   * Request notification permission and get FCM token
   */
  const enableNotifications = useCallback(async () => {
    try {
      const fcmToken = await requestNotificationPermission();
      
      if (fcmToken) {
        setToken(fcmToken);
        setPermission('granted');
        
        // Update preferences to enable notifications
        if (preferences) {
          const updatedPrefs = { ...preferences, enabled: true };
          await updateNotificationPreferences(updatedPrefs);
          setPreferences(updatedPrefs);
        }
        
        return true;
      } else {
        setPermission(Notification.permission);
        return false;
      }
    } catch (error) {
      console.error('[useFCM] Error enabling notifications:', error);
      return false;
    }
  }, [preferences]);

  /**
   * Disable notifications
   */
  const disableNotifications = useCallback(async () => {
    try {
      if (preferences) {
        const updatedPrefs = { ...preferences, enabled: false };
        await updateNotificationPreferences(updatedPrefs);
        setPreferences(updatedPrefs);
      }
      
      // Note: We don't remove the token here as the user might want to re-enable later
      return true;
    } catch (error) {
      console.error('[useFCM] Error disabling notifications:', error);
      return false;
    }
  }, [preferences]);

  /**
   * Update notification preferences
   */
  const updatePreferences = useCallback(async (newPrefs: Partial<NotificationPreferences>) => {
    try {
      const updated = await updateNotificationPreferences(newPrefs);
      
      if (updated && preferences) {
        const updatedPrefs = { ...preferences, ...newPrefs };
        setPreferences(updatedPrefs);
      }
      
      return updated;
    } catch (error) {
      console.error('[useFCM] Error updating preferences:', error);
      return false;
    }
  }, [preferences]);

  /**
   * Send a test notification
   */
  const sendTestNotification = useCallback(async () => {
    try {
      const response = await fetch('/api/fcm/test-notification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      return response.ok;
    } catch (error) {
      console.error('[useFCM] Error sending test notification:', error);
      return false;
    }
  }, []);

  return {
    // State
    isInitialized,
    isSupported,
    token,
    permission,
    preferences,
    loading,
    
    // Computed state
    isEnabled: permission === 'granted' && preferences?.enabled === true,
    canEnable: isSupported && permission !== 'denied',
    
    // Actions
    enableNotifications,
    disableNotifications,
    updatePreferences,
    sendTestNotification
  };
}

/**
 * Hook for listening to FCM messages
 */
export function useFCMMessages(callback?: (message: any) => void) {
  useEffect(() => {
    const handleMessage = (event: CustomEvent) => {
      if (callback) {
        callback(event.detail);
      }
    };

    // Listen for custom FCM message events
    window.addEventListener('fcm-message', handleMessage as EventListener);

    return () => {
      window.removeEventListener('fcm-message', handleMessage as EventListener);
    };
  }, [callback]);
}

/**
 * Hook for managing notification preferences with persistence
 */
export function useNotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const prefs = await getNotificationPreferences();
        setPreferences(prefs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load preferences');
      } finally {
        setLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Update preferences
  const updatePrefs = useCallback(async (newPrefs: Partial<NotificationPreferences>) => {
    try {
      setError(null);
      const success = await updateNotificationPreferences(newPrefs);
      
      if (success && preferences) {
        setPreferences({ ...preferences, ...newPrefs });
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences';
      setError(errorMessage);
      return false;
    }
  }, [preferences]);

  return {
    preferences,
    loading,
    error,
    updatePreferences: updatePrefs
  };
}