import React, { useState } from 'react';
import { Button } from "../ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../ui/card";
import { Label } from "../ui/label";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Bell, BellOff, Settings, TestTube, Clock, Mail, Smartphone } from "lucide-react";
import { useFCM, useNotificationPreferences } from "../../hooks/useFCM";
import { FeatureFlags, getRemoteConfig } from '@shared/firebase-utils';
// import { toast } from "sonner"; // Using browser notifications for now

/**
 * Notification Settings Component
 * Allows users to manage their push notification preferences
 */
export function NotificationSettings() {
  const priceAlertsEnabled = getRemoteConfig().isFeatureEnabled(FeatureFlags.PRICE_ALERTS_ENABLED);
  const { 
    isSupported, 
    isEnabled, 
    canEnable, 
    permission,
    token,
    enableNotifications, 
    disableNotifications,
    sendTestNotification
  } = useFCM();
  
  const { preferences, loading, updatePreferences } = useNotificationPreferences();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Handle enabling/disabling notifications
  const handleToggleNotifications = async () => {
    setIsUpdating(true);
    try {
      if (isEnabled) {
        const success = await disableNotifications();
        if (success) {
          alert("Notifications disabled");
        } else {
          alert("Failed to disable notifications");
        }
      } else {
        const success = await enableNotifications();
        if (success) {
          alert("Notifications enabled! You'll now receive push notifications.");
        } else {
          alert("Failed to enable notifications. Please check your browser settings.");
        }
      }
    } catch (error) {
      alert("An error occurred while updating notification settings");
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle updating notification type preferences
  const handleTypeToggle = async (type: string, enabled: boolean) => {
    if (!preferences) return;

    const newTypes = { ...preferences.types, [type]: enabled };
    const success = await updatePreferences({ types: newTypes });
    
    if (success) {
      alert(`${type} notifications ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      alert("Failed to update notification preferences");
    }
  };

  // Handle updating delivery preferences
  const handleDeliveryToggle = async (method: string, enabled: boolean) => {
    if (!preferences) return;

    const newDelivery = { ...preferences.delivery, [method]: enabled };
    const success = await updatePreferences({ delivery: newDelivery });
    
    if (success) {
      alert(`${method} delivery ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      alert("Failed to update delivery preferences");
    }
  };

  // Handle quiet hours toggle
  const handleQuietHoursToggle = async (enabled: boolean) => {
    if (!preferences) return;

    const newQuietHours = { ...preferences.quietHours, enabled };
    const success = await updatePreferences({ quietHours: newQuietHours });
    
    if (success) {
      alert(`Quiet hours ${enabled ? 'enabled' : 'disabled'}`);
    } else {
      alert("Failed to update quiet hours settings");
    }
  };

  // Handle quiet hours time update
  const handleQuietHoursTimeUpdate = async (field: 'start' | 'end', time: string) => {
    if (!preferences) return;

    const newQuietHours = { ...preferences.quietHours, [field]: time };
    const success = await updatePreferences({ quietHours: newQuietHours });
    
    if (success) {
      alert("Quiet hours updated");
    } else {
      alert("Failed to update quiet hours");
    }
  };

  // Send test notification
  const handleTestNotification = async () => {
    setIsTesting(true);
    try {
      const success = await sendTestNotification();
      if (success) {
        alert("Test notification sent! Check your notifications.");
      } else {
        alert("Failed to send test notification");
      }
    } catch (error) {
      alert("An error occurred while sending test notification");
    } finally {
      setIsTesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notification Settings
          </CardTitle>
          <CardDescription>
            Manage how and when you receive notifications from Wishlist Wizard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Browser Support Status */}
          {!isSupported && (
            <Alert>
              <BellOff className="h-4 w-4" />
              <AlertTitle>Push Notifications Not Supported</AlertTitle>
              <AlertDescription>
                Your browser doesn&apos;t support push notifications. You can still receive email notifications.
              </AlertDescription>
            </Alert>
          )}

          {/* Permission Status */}
          {isSupported && (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  {permission === 'granted' 
                    ? 'Browser notifications are enabled'
                    : permission === 'denied'
                    ? 'Browser notifications are blocked. Please enable them in your browser settings.'
                    : 'Browser notifications are not yet enabled'
                  }
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={isEnabled ? "default" : "secondary"}>
                  {isEnabled ? "Enabled" : "Disabled"}
                </Badge>
                <Switch 
                  checked={isEnabled} 
                  onCheckedChange={handleToggleNotifications}
                  disabled={!canEnable || isUpdating}
                />
              </div>
            </div>
          )}

          {/* Test Notification */}
          {isEnabled && (
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label className="text-base font-medium">Test Notification</Label>
                <p className="text-sm text-muted-foreground">
                  Send a test notification to verify everything is working
                </p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleTestNotification}
                disabled={isTesting}
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isTesting ? "Sending..." : "Send Test"}
              </Button>
            </div>
          )}

          <Separator />

          {/* Notification Types */}
          {preferences && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Notification Types</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Item Added</Label>
                    <p className="text-sm text-muted-foreground">
                      When someone adds an item to a shared wishlist
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.types.itemAdded}
                    onCheckedChange={(checked) => handleTypeToggle('itemAdded', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Item Reserved</Label>
                    <p className="text-sm text-muted-foreground">
                      When someone reserves an item from your wishlist
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.types.itemReserved}
                    onCheckedChange={(checked) => handleTypeToggle('itemReserved', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Item Purchased</Label>
                    <p className="text-sm text-muted-foreground">
                      When someone purchases an item from your wishlist
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.types.itemPurchased}
                    onCheckedChange={(checked) => handleTypeToggle('itemPurchased', checked)}
                  />
                </div>

                {priceAlertsEnabled && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Price Alerts</Label>
                      <p className="text-sm text-muted-foreground">
                        When an item&apos;s price drops to your target price
                      </p>
                    </div>
                    <Switch 
                      checked={preferences.types.priceAlerts}
                      onCheckedChange={(checked) => handleTypeToggle('priceAlerts', checked)}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Collaboration Invites</Label>
                    <p className="text-sm text-muted-foreground">
                      When someone invites you to collaborate on a wishlist
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.types.collaborationInvites}
                    onCheckedChange={(checked) => handleTypeToggle('collaborationInvites', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>Wishlist Shared</Label>
                    <p className="text-sm text-muted-foreground">
                      When someone shares a wishlist with you
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.types.wishlistShared}
                    onCheckedChange={(checked) => handleTypeToggle('wishlistShared', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label>System Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Important updates and announcements
                    </p>
                  </div>
                  <Switch 
                    checked={preferences.types.systemNotifications}
                    onCheckedChange={(checked) => handleTypeToggle('systemNotifications', checked)}
                  />
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Delivery Methods */}
          {preferences && (
            <div className="space-y-4">
              <Label className="text-base font-medium">Delivery Methods</Label>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4" />
                    <div className="space-y-1">
                      <Label>Push Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Instant notifications to your device
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={preferences.delivery.push}
                    onCheckedChange={(checked) => handleDeliveryToggle('push', checked)}
                    disabled={!isSupported}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <div className="space-y-1">
                      <Label>Email Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Notifications sent to your email address
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={preferences.delivery.email}
                    onCheckedChange={(checked) => handleDeliveryToggle('email', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4" />
                    <div className="space-y-1">
                      <Label>In-App Notifications</Label>
                      <p className="text-sm text-muted-foreground">
                        Notifications shown within the app
                      </p>
                    </div>
                  </div>
                  <Switch 
                    checked={preferences.delivery.inApp}
                    onCheckedChange={(checked) => handleDeliveryToggle('inApp', checked)}
                  />
                </div>
              </div>
            </div>
          )}

          <Separator />

          {/* Quiet Hours */}
          {preferences && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <div className="space-y-1">
                    <Label className="text-base font-medium">Quiet Hours</Label>
                    <p className="text-sm text-muted-foreground">
                      Pause notifications during specific hours
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={preferences.quietHours.enabled}
                  onCheckedChange={handleQuietHoursToggle}
                />
              </div>

              {preferences.quietHours.enabled && (
                <div className="grid grid-cols-2 gap-4 pl-6">
                  <div className="space-y-2">
                    <Label>Start Time</Label>
                    <input
                      type="time"
                      title="Quiet hours start time"
                      value={preferences.quietHours.start}
                      onChange={(e) => handleQuietHoursTimeUpdate('start', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Time</Label>
                    <input
                      type="time"
                      title="Quiet hours end time"
                      value={preferences.quietHours.end}
                      onChange={(e) => handleQuietHoursTimeUpdate('end', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Debug Info (only in development) */}
          {process.env.NODE_ENV === 'development' && token && (
            <div className="p-4 bg-gray-50 rounded-lg">
              <Label className="text-sm font-medium">Debug Info</Label>
              <p className="text-xs text-muted-foreground mt-1">
                FCM Token: {token.substring(0, 20)}...
              </p>
              <p className="text-xs text-muted-foreground">
                Permission: {permission}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}