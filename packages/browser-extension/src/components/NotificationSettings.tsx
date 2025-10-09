/**
 * Extension Notification Settings Component
 * Allows users to configure notification preferences in browser extension
 */

import React from 'react';
import { useExtensionFCM, useExtensionNotificationPreferences } from '../hooks/useFCM';
// import './NotificationSettings.css'; // CSS file to be created separately

export interface ExtensionNotificationSettingsProps {
  className?: string;
}

export const ExtensionNotificationSettings: React.FC<ExtensionNotificationSettingsProps> = ({
  className = ''
}) => {
  const {
    isSupported,
    permission,
    token,
    isLoading: fcmLoading,
    error: fcmError,
    enableNotifications,
    disableNotifications
  } = useExtensionFCM();

  const {
    preferences,
    isLoading: prefsLoading,
    error: prefsError,
    toggleNotificationType,
    toggleDeliveryMethod,
    updateQuietHours
  } = useExtensionNotificationPreferences();

  const isLoading = fcmLoading || prefsLoading;
  const error = fcmError || prefsError;

  // Handle enable/disable notifications
  const handleToggleNotifications = async () => {
    if (permission === 'granted' && token) {
      disableNotifications();
    } else {
      const success = await enableNotifications();
      if (!success) {
        alert('Failed to enable notifications. Please check your browser settings.');
      }
    }
  };

  // Handle quiet hours change
  const handleQuietHoursChange = (field: 'start' | 'end', value: string) => {
    updateQuietHours({ [field]: value });
  };

  if (!isSupported) {
    return (
      <div className={`extension-notification-settings ${className}`}>
        <div className="error-message">
          <h3>Notifications Not Supported</h3>
          <p>Your browser doesn't support push notifications.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={`extension-notification-settings ${className}`}>
        <div className="loading-message">
          <div className="spinner"></div>
          <p>Loading notification settings...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`extension-notification-settings ${className}`}>
        <div className="error-message">
          <h3>Error Loading Settings</h3>
          <p>{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="retry-button"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!preferences) {
    return (
      <div className={`extension-notification-settings ${className}`}>
        <div className="error-message">
          <h3>No Preferences Available</h3>
          <p>Unable to load notification preferences.</p>
        </div>
      </div>
    );
  }

  const notificationEnabled = permission === 'granted' && token && preferences.enabled;

  return (
    <div className={`extension-notification-settings ${className}`}>
      <div className="settings-header">
        <h2>Notification Settings</h2>
        <p>Configure how you receive Wishlist Wizard notifications</p>
      </div>

      {/* Main Toggle */}
      <div className="setting-group">
        <div className="setting-item">
          <div className="setting-info">
            <h3>Enable Notifications</h3>
            <p>
              {permission === 'granted' 
                ? 'Receive push notifications from Wishlist Wizard'
                : 'Permission required to receive notifications'
              }
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={!!notificationEnabled}
              onChange={handleToggleNotifications}
              disabled={isLoading}
              aria-label="Enable notifications"
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      {/* Notification Types */}
      {notificationEnabled && (
        <>
          <div className="setting-group">
            <h3>Notification Types</h3>
            <p>Choose which types of notifications you want to receive</p>
            
            <div className="setting-item">
              <div className="setting-info">
                <span>New Items Added</span>
                <small>When someone adds items to shared wishlists</small>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.types.item_added}
                  onChange={() => toggleNotificationType('item_added')}
                  aria-label="Enable new items added notifications"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span>Items Reserved</span>
                <small>When items on your wishlists are reserved</small>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.types.item_reserved}
                  onChange={() => toggleNotificationType('item_reserved')}
                  aria-label="Enable items reserved notifications"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span>Items Purchased</span>
                <small>When items on your wishlists are purchased</small>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.types.item_purchased}
                  onChange={() => toggleNotificationType('item_purchased')}
                  aria-label="Enable items purchased notifications"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span>Price Alerts</span>
                <small>When item prices drop or change significantly</small>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.types.price_alerts}
                  onChange={() => toggleNotificationType('price_alerts')}
                  aria-label="Enable price alerts notifications"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span>Collaboration Invites</span>
                <small>When you're invited to share or view wishlists</small>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.types.collaboration_invites}
                  onChange={() => toggleNotificationType('collaboration_invites')}
                  aria-label="Enable collaboration invites notifications"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span>System Updates</span>
                <small>App updates and maintenance notifications</small>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.types.system_updates}
                  onChange={() => toggleNotificationType('system_updates')}
                  aria-label="Enable system updates notifications"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* Delivery Methods */}
          <div className="setting-group">
            <h3>Delivery Methods</h3>
            <p>How you want to receive notifications</p>
            
            <div className="setting-item">
              <div className="setting-info">
                <span>Browser Notifications</span>
                <small>Show desktop notifications</small>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.delivery.browser}
                  onChange={() => toggleDeliveryMethod('browser')}
                  aria-label="Enable browser notifications"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span>Extension Badge</span>
                <small>Show notification count on extension icon</small>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.delivery.badge}
                  onChange={() => toggleDeliveryMethod('badge')}
                  aria-label="Enable extension badge"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            <div className="setting-item">
              <div className="setting-info">
                <span>Popup Alerts</span>
                <small>Show alerts within the extension popup</small>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.delivery.popup}
                  onChange={() => toggleDeliveryMethod('popup')}
                  aria-label="Enable popup alerts"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>
          </div>

          {/* Quiet Hours */}
          <div className="setting-group">
            <h3>Quiet Hours</h3>
            <p>Set times when you don't want to receive notifications</p>
            
            <div className="setting-item">
              <div className="setting-info">
                <span>Enable Quiet Hours</span>
                <small>Disable notifications during specified times</small>
              </div>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={preferences.quietHours.enabled}
                  onChange={() => updateQuietHours({ 
                    enabled: !preferences.quietHours.enabled 
                  })}
                  aria-label="Enable quiet hours"
                />
                <span className="toggle-slider"></span>
              </label>
            </div>

            {preferences.quietHours.enabled && (
              <div className="quiet-hours-config">
                <div className="time-input-group">
                  <label>
                    Start Time:
                    <input
                      type="time"
                      value={preferences.quietHours.start}
                      onChange={(e) => handleQuietHoursChange('start', e.target.value)}
                      className="time-input"
                    />
                  </label>
                  <label>
                    End Time:
                    <input
                      type="time"
                      value={preferences.quietHours.end}
                      onChange={(e) => handleQuietHoursChange('end', e.target.value)}
                      className="time-input"
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Status Information */}
      <div className="setting-group status-info">
        <h3>Status</h3>
        <div className="status-item">
          <span>Permission Status:</span>
          <span className={`status-value ${permission}`}>
            {permission === 'granted' ? 'Granted' : 
             permission === 'denied' ? 'Denied' : 'Not Requested'}
          </span>
        </div>
        <div className="status-item">
          <span>FCM Token:</span>
          <span className={`status-value ${token ? 'active' : 'inactive'}`}>
            {token ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Help Text */}
      <div className="help-text">
        <p>
          <strong>Note:</strong> If notifications aren't working, make sure your browser 
          allows notifications for this extension. You can check this in your browser's 
          notification settings.
        </p>
      </div>
    </div>
  );
};