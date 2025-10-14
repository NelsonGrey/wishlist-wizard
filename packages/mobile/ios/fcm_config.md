# FCM Configuration for iOS
# This file contains Firebase Cloud Messaging configuration for iOS platform

# 1. Enable Push Notifications capability in Xcode:
# - Open ios/Runner.xcworkspace in Xcode
# - Select Runner project in navigator
# - Go to Signing & Capabilities tab
# - Click + Capability and add "Push Notifications"
# - Click + Capability and add "Background Modes"
# - Enable "Background processing" and "Remote notifications" in Background Modes

# 2. Update ios/Runner/Info.plist:
<key>FirebaseMessagingAutoInitEnabled</key>
<true/>
<key>FirebaseAutomaticScreenReportingEnabled</key>
<false/>
<key>UIBackgroundModes</key>
<array>
    <string>remote-notification</string>
    <string>background-processing</string>
</array>

# 3. Update ios/Runner/AppDelegate.swift:

import UIKit
import Flutter
import firebase_core
import firebase_messaging

@UIApplicationMain
@objc class AppDelegate: FlutterAppDelegate {
  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    // Configure Firebase
    FirebaseApp.configure()
    
    // Set FCM messaging delegate
    if #available(iOS 10.0, *) {
      UNUserNotificationCenter.current().delegate = self
      let authOptions: UNAuthorizationOptions = [.alert, .badge, .sound]
      UNUserNotificationCenter.current().requestAuthorization(
        options: authOptions,
        completionHandler: {_, _ in })
    } else {
      let settings: UIUserNotificationSettings =
      UIUserNotificationSettings(types: [.alert, .badge, .sound], categories: nil)
      application.registerUserNotificationSettings(settings)
    }

    application.registerForRemoteNotifications()
    
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }
  
  override func application(_ application: UIApplication, 
                            didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
    Messaging.messaging().apnsToken = deviceToken
  }
  
  override func application(_ application: UIApplication,
                            didFailToRegisterForRemoteNotificationsWithError error: Error) {
    print("Failed to register for remote notifications: \(error)")
  }
}

# 4. Handle background notifications - add to AppDelegate.swift:

// Handle background notifications
override func application(_ application: UIApplication,
                          didReceiveRemoteNotification userInfo: [AnyHashable: Any],
                          fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void) {
  print("Received background notification: \(userInfo)")
  completionHandler(.newData)
}

# 5. Create notification extension (Optional - for rich notifications):
# In Xcode: File > New > Target > Notification Service Extension

# 6. APNs Certificate Configuration:
# - Go to Apple Developer Portal
# - Create APNs certificate for your app bundle ID
# - Download and add to Firebase Project Settings > Cloud Messaging
# - Or use APNs Auth Key (recommended):
#   - Create APNs Auth Key in Apple Developer Portal
#   - Upload to Firebase Project Settings > Cloud Messaging

# 7. Podfile configuration (ios/Podfile):
# Ensure these pods are available:
pod 'Firebase/Core'
pod 'Firebase/Messaging'

# Add to the end of Podfile:
post_install do |installer|
  installer.pods_project.targets.each do |target|
    flutter_additional_ios_build_settings(target)
    
    # Firebase FCM compatibility
    target.build_configurations.each do |config|
      config.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '11.0'
    end
  end
end

# 8. Debug configuration:
# Add to ios/Runner/Info.plist for debug builds:
<key>FirebaseMessagingAutoInitEnabled</key>
<true/>
<key>FirebaseAnalyticsCollectionEnabled</key>
<false/>

# 9. Production considerations:
# - Ensure proper code signing
# - Use production APNs certificates
# - Test on physical device (simulator doesn't support push notifications)
# - Configure proper bundle ID in Firebase console

# 10. Notification categories (for interactive notifications):
# Add to AppDelegate.swift in didFinishLaunchingWithOptions:

if #available(iOS 10.0, *) {
  let viewAction = UNNotificationAction(
    identifier: "VIEW_ACTION",
    title: "View",
    options: [.foreground]
  )
  
  let buyAction = UNNotificationAction(
    identifier: "BUY_ACTION", 
    title: "Buy Now",
    options: [.foreground]
  )
  
  let priceAlertCategory = UNNotificationCategory(
    identifier: "PRICE_ALERT",
    actions: [viewAction, buyAction],
    intentIdentifiers: [],
    options: []
  )
  
  UNUserNotificationCenter.current().setNotificationCategories([priceAlertCategory])
}

# 11. Troubleshooting:
# - Check console logs for Firebase initialization
# - Verify FCM token generation
# - Test with Firebase Console test message
# - Ensure proper provisioning profiles
# - Check Background App Refresh is enabled
# - Verify network connectivity

# 12. Testing:
# Use Firebase Console > Cloud Messaging > Send test message
# Target specific device using FCM token
# Test both foreground and background scenarios