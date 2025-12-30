# FCM Configuration for Android
# This file contains Firebase Cloud Messaging configuration for Android platform

# Add these permissions to android/app/src/main/AndroidManifest.xml:

# FCM Permissions
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-permission android:name="com.google.android.c2dm.permission.RECEIVE" />

# Optional: For notification sounds
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

# Add to <application> tag in AndroidManifest.xml:

# FCM Service
<service
    android:name="io.flutter.plugins.firebase.messaging.FlutterFirebaseMessagingService"
    android:exported="false">
    <intent-filter>
        <action android:name="com.google.firebase.MESSAGING_EVENT" />
    </intent-filter>
</service>

# Default notification icon and color
<meta-data
    android:name="com.google.firebase.messaging.default_notification_icon"
    android:resource="@drawable/ic_notification" />
<meta-data
    android:name="com.google.firebase.messaging.default_notification_color"
    android:resource="@color/notification_color" />

# Default notification channel
<meta-data
    android:name="com.google.firebase.messaging.default_notification_channel_id"
    android:value="default_channel" />

# Auto initialization
<meta-data
    android:name="firebase_messaging_auto_init_enabled"
    android:value="true" />

# Add these configurations to android/app/build.gradle:

# In dependencies block:
implementation 'com.google.firebase:firebase-messaging:23.4.1'
implementation 'androidx.work:work-runtime:2.9.0'

# Proguard rules (add to android/app/proguard-rules.pro):
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Network security config (create android/app/src/main/res/xml/network_security_config.xml):
<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">localhost</domain>
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">10.0.3.2</domain>
    </domain-config>
</network-security-config>

# Reference network config in AndroidManifest.xml application tag:
android:networkSecurityConfig="@xml/network_security_config"

# Create notification icon drawable files:
# android/app/src/main/res/drawable-mdpi/ic_notification.png (24x24)
# android/app/src/main/res/drawable-hdpi/ic_notification.png (36x36)
# android/app/src/main/res/drawable-xhdpi/ic_notification.png (48x48)
# android/app/src/main/res/drawable-xxhdpi/ic_notification.png (72x72)
# android/app/src/main/res/drawable-xxxhdpi/ic_notification.png (96x96)

# Create colors.xml (android/app/src/main/res/values/colors.xml):
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="notification_color">#FF6B35</color>
</resources>

# For debugging FCM issues, add to android/app/src/main/AndroidManifest.xml:
<meta-data
    android:name="firebase_analytics_collection_enabled"
    android:value="false" />
<meta-data
    android:name="google_analytics_adid_collection_enabled"
    android:value="false" />

# Environment-specific configurations:
# Development: Add firebase debug logging
# Production: Ensure proper certificate and signing configuration