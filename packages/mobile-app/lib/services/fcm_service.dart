/// Firebase Cloud Messaging Service for Flutter Mobile App
/// Handles push notifications, token management, and message handling
library;

import 'dart:io';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';

/// FCM notification types
enum FCMNotificationType {
  itemAdded,
  itemReserved,
  itemPurchased,
  priceAlert,
  collaborationInvite,
  systemUpdate,
}

/// FCM notification data model
class FCMNotificationData {
  final String id;
  final FCMNotificationType type;
  final String title;
  final String body;
  final Map<String, dynamic> data;
  final DateTime timestamp;

  FCMNotificationData({
    required this.id,
    required this.type,
    required this.title,
    required this.body,
    required this.data,
    required this.timestamp,
  });

  factory FCMNotificationData.fromRemoteMessage(RemoteMessage message) {
    return FCMNotificationData(
      id: message.messageId ?? DateTime.now().millisecondsSinceEpoch.toString(),
      type: _parseNotificationType(message.data['type']),
      title: message.notification?.title ?? 'Wishlist Wizard',
      body: message.notification?.body ?? 'You have a new notification',
      data: message.data,
      timestamp: DateTime.now(),
    );
  }

  static FCMNotificationType _parseNotificationType(String? type) {
    switch (type) {
      case 'item_added':
        return FCMNotificationType.itemAdded;
      case 'item_reserved':
        return FCMNotificationType.itemReserved;
      case 'item_purchased':
        return FCMNotificationType.itemPurchased;
      case 'price_alert':
        return FCMNotificationType.priceAlert;
      case 'collaboration_invite':
        return FCMNotificationType.collaborationInvite;
      case 'system_update':
        return FCMNotificationType.systemUpdate;
      default:
        return FCMNotificationType.systemUpdate;
    }
  }
}

/// FCM notification preferences
class FCMNotificationPreferences {
  final bool enabled;
  final Map<FCMNotificationType, bool> types;
  final bool sound;
  final bool vibration;
  final bool badge;
  final Map<String, String> quietHours; // start and end times
  final DateTime updatedAt;

  FCMNotificationPreferences({
    required this.enabled,
    required this.types,
    required this.sound,
    required this.vibration,
    required this.badge,
    required this.quietHours,
    required this.updatedAt,
  });

  factory FCMNotificationPreferences.defaultPreferences() {
    return FCMNotificationPreferences(
      enabled: true,
      types: {
        FCMNotificationType.itemAdded: true,
        FCMNotificationType.itemReserved: true,
        FCMNotificationType.itemPurchased: true,
        FCMNotificationType.priceAlert: true,
        FCMNotificationType.collaborationInvite: true,
        FCMNotificationType.systemUpdate: false,
      },
      sound: true,
      vibration: true,
      badge: true,
      quietHours: {'start': '22:00', 'end': '08:00'},
      updatedAt: DateTime.now(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'enabled': enabled,
      'types': types.map((key, value) => MapEntry(key.name, value)),
      'sound': sound,
      'vibration': vibration,
      'badge': badge,
      'quietHours': quietHours,
      'updatedAt': updatedAt.toIso8601String(),
    };
  }

  factory FCMNotificationPreferences.fromJson(Map<String, dynamic> json) {
    return FCMNotificationPreferences(
      enabled: json['enabled'] ?? true,
      types: (json['types'] as Map<String, dynamic>? ?? {}).map(
        (key, value) => MapEntry(_parseNotificationType(key), value),
      ),
      sound: json['sound'] ?? true,
      vibration: json['vibration'] ?? true,
      badge: json['badge'] ?? true,
      quietHours: Map<String, String>.from(
        json['quietHours'] ?? {'start': '22:00', 'end': '08:00'},
      ),
      updatedAt: DateTime.parse(
        json['updatedAt'] ?? DateTime.now().toIso8601String(),
      ),
    );
  }

  static FCMNotificationType _parseNotificationType(String type) {
    switch (type) {
      case 'itemAdded':
        return FCMNotificationType.itemAdded;
      case 'itemReserved':
        return FCMNotificationType.itemReserved;
      case 'itemPurchased':
        return FCMNotificationType.itemPurchased;
      case 'priceAlert':
        return FCMNotificationType.priceAlert;
      case 'collaborationInvite':
        return FCMNotificationType.collaborationInvite;
      case 'systemUpdate':
        return FCMNotificationType.systemUpdate;
      default:
        return FCMNotificationType.systemUpdate;
    }
  }
}

/// Firebase Cloud Messaging Manager - Singleton
class FCMManager {
  static final FCMManager _instance = FCMManager._internal();
  factory FCMManager() => _instance;
  FCMManager._internal();

  final FirebaseMessaging _firebaseMessaging = FirebaseMessaging.instance;
  final FlutterLocalNotificationsPlugin _localNotifications =
      FlutterLocalNotificationsPlugin();

  String? _fcmToken;
  FCMNotificationPreferences _preferences =
      FCMNotificationPreferences.defaultPreferences();

  // Callback functions
  Function(FCMNotificationData)? _onMessageReceived;
  Function(FCMNotificationData)? _onMessageOpenedApp;
  Function(String)? _onTokenRefresh;

  // Getters
  String? get fcmToken => _fcmToken;
  FCMNotificationPreferences get preferences => _preferences;

  /// Initialize FCM
  Future<void> initialize({
    Function(FCMNotificationData)? onMessageReceived,
    Function(FCMNotificationData)? onMessageOpenedApp,
    Function(String)? onTokenRefresh,
  }) async {
    try {
      debugPrint('[FCM] Initializing Firebase Cloud Messaging...');

      // Set callback functions
      _onMessageReceived = onMessageReceived;
      _onMessageOpenedApp = onMessageOpenedApp;
      _onTokenRefresh = onTokenRefresh;

      // Initialize local notifications
      await _initializeLocalNotifications();

      // Request notification permissions
      await _requestPermissions();

      // Get initial FCM token
      await _getFCMToken();

      // Set up message handlers
      _setupMessageHandlers();

      // Handle background messages
      FirebaseMessaging.onBackgroundMessage(
        _firebaseMessagingBackgroundHandler,
      );

      debugPrint('[FCM] Initialization complete');
    } catch (e) {
      debugPrint('[FCM] Initialization error: $e');
    }
  }

  /// Initialize local notifications
  Future<void> _initializeLocalNotifications() async {
    const androidSettings = AndroidInitializationSettings(
      '@mipmap/ic_launcher',
    );
    const iosSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
    );

    const initSettings = InitializationSettings(
      android: androidSettings,
      iOS: iosSettings,
    );

    await _localNotifications.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTapped,
    );

    // Create notification channels for Android
    if (Platform.isAndroid) {
      await _createNotificationChannels();
    }
  }

  /// Create notification channels for Android
  Future<void> _createNotificationChannels() async {
    final androidPlugin = _localNotifications
        .resolvePlatformSpecificImplementation<
          AndroidFlutterLocalNotificationsPlugin
        >();

    if (androidPlugin != null) {
      // High priority channel for important notifications
      const highPriorityChannel = AndroidNotificationChannel(
        'high_priority_channel',
        'High Priority Notifications',
        description:
            'Important notifications like price alerts and collaboration invites',
        importance: Importance.high,
        playSound: true,
        enableVibration: true,
      );

      // Default channel for regular notifications
      const defaultChannel = AndroidNotificationChannel(
        'default_channel',
        'Default Notifications',
        description: 'Regular notifications about wishlist activities',
        importance: Importance.defaultImportance,
        playSound: true,
      );

      await androidPlugin.createNotificationChannel(highPriorityChannel);
      await androidPlugin.createNotificationChannel(defaultChannel);
    }
  }

  /// Request notification permissions
  Future<void> _requestPermissions() async {
    final settings = await _firebaseMessaging.requestPermission(
      alert: true,
      badge: true,
      sound: true,
      provisional: false,
      criticalAlert: false,
      carPlay: false,
      announcement: false,
    );

    debugPrint('[FCM] Permission status: ${settings.authorizationStatus}');

    if (settings.authorizationStatus == AuthorizationStatus.denied) {
      debugPrint('[FCM] Notification permissions denied');
    }
  }

  /// Get FCM token
  Future<void> _getFCMToken() async {
    try {
      _fcmToken = await _firebaseMessaging.getToken();
      debugPrint('[FCM] FCM Token: ${_fcmToken?.substring(0, 20)}...');

      if (_fcmToken != null) {
        _onTokenRefresh?.call(_fcmToken!);
      }
    } catch (e) {
      debugPrint('[FCM] Error getting FCM token: $e');
    }
  }

  /// Setup message handlers
  void _setupMessageHandlers() {
    // Handle foreground messages
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      debugPrint(
        '[FCM] Foreground message received: ${message.notification?.title}',
      );
      final notificationData = FCMNotificationData.fromRemoteMessage(message);

      // Show local notification
      _showLocalNotification(notificationData);

      // Call callback
      _onMessageReceived?.call(notificationData);
    });

    // Handle when app is opened from notification
    FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
      debugPrint(
        '[FCM] App opened from notification: ${message.notification?.title}',
      );
      final notificationData = FCMNotificationData.fromRemoteMessage(message);
      _onMessageOpenedApp?.call(notificationData);
    });

    // Handle token refresh
    _firebaseMessaging.onTokenRefresh.listen((String token) {
      debugPrint('[FCM] Token refreshed: ${token.substring(0, 20)}...');
      _fcmToken = token;
      _onTokenRefresh?.call(token);
    });
  }

  /// Show local notification
  Future<void> _showLocalNotification(FCMNotificationData notification) async {
    if (!_preferences.enabled || !_preferences.types[notification.type]!) {
      return;
    }

    // Check quiet hours
    if (_isInQuietHours()) {
      return;
    }

    final channelId = _getChannelId(notification.type);
    final notificationDetails = NotificationDetails(
      android: AndroidNotificationDetails(
        channelId,
        _getChannelName(notification.type),
        channelDescription: _getChannelDescription(notification.type),
        importance: _getImportance(notification.type),
        priority: _getPriority(notification.type),
        playSound: _preferences.sound,
        enableVibration: _preferences.vibration,
        icon: '@mipmap/ic_launcher',
        largeIcon: const DrawableResourceAndroidBitmap('@mipmap/ic_launcher'),
        styleInformation: _getBigTextStyle(notification),
        actions: _getNotificationActions(notification.type),
      ),
      iOS: DarwinNotificationDetails(
        presentAlert: true,
        presentBadge: _preferences.badge,
        presentSound: _preferences.sound,
        sound: _preferences.sound ? 'default' : null,
        badgeNumber: await _getBadgeCount() + 1,
      ),
    );

    await _localNotifications.show(
      notification.id.hashCode,
      notification.title,
      notification.body,
      notificationDetails,
      payload: notification.data.toString(),
    );
  }

  /// Get notification channel ID based on type
  String _getChannelId(FCMNotificationType type) {
    switch (type) {
      case FCMNotificationType.priceAlert:
      case FCMNotificationType.collaborationInvite:
        return 'high_priority_channel';
      default:
        return 'default_channel';
    }
  }

  /// Get channel name
  String _getChannelName(FCMNotificationType type) {
    switch (type) {
      case FCMNotificationType.itemAdded:
        return 'Item Updates';
      case FCMNotificationType.itemReserved:
        return 'Reservation Alerts';
      case FCMNotificationType.itemPurchased:
        return 'Purchase Notifications';
      case FCMNotificationType.priceAlert:
        return 'Price Alerts';
      case FCMNotificationType.collaborationInvite:
        return 'Collaboration Invites';
      case FCMNotificationType.systemUpdate:
        return 'System Updates';
    }
  }

  /// Get channel description
  String _getChannelDescription(FCMNotificationType type) {
    switch (type) {
      case FCMNotificationType.itemAdded:
        return 'Notifications when items are added to shared wishlists';
      case FCMNotificationType.itemReserved:
        return 'Notifications when items are reserved';
      case FCMNotificationType.itemPurchased:
        return 'Notifications when items are purchased';
      case FCMNotificationType.priceAlert:
        return 'Notifications about price changes and deals';
      case FCMNotificationType.collaborationInvite:
        return 'Invitations to collaborate on wishlists';
      case FCMNotificationType.systemUpdate:
        return 'App updates and system notifications';
    }
  }

  /// Get importance level
  Importance _getImportance(FCMNotificationType type) {
    switch (type) {
      case FCMNotificationType.priceAlert:
      case FCMNotificationType.collaborationInvite:
        return Importance.high;
      default:
        return Importance.defaultImportance;
    }
  }

  /// Get priority level
  Priority _getPriority(FCMNotificationType type) {
    switch (type) {
      case FCMNotificationType.priceAlert:
      case FCMNotificationType.collaborationInvite:
        return Priority.high;
      default:
        return Priority.defaultPriority;
    }
  }

  /// Get big text style for notification
  BigTextStyleInformation _getBigTextStyle(FCMNotificationData notification) {
    return BigTextStyleInformation(
      notification.body,
      htmlFormatBigText: true,
      contentTitle: notification.title,
      htmlFormatContentTitle: true,
      summaryText: 'Wishlist Wizard',
      htmlFormatSummaryText: true,
    );
  }

  /// Get notification actions
  List<AndroidNotificationAction> _getNotificationActions(
    FCMNotificationType type,
  ) {
    final baseActions = [
      const AndroidNotificationAction('view', 'View', showsUserInterface: true),
      const AndroidNotificationAction('dismiss', 'Dismiss'),
    ];

    switch (type) {
      case FCMNotificationType.priceAlert:
        return [
          const AndroidNotificationAction(
            'buy_now',
            'Buy Now',
            showsUserInterface: true,
          ),
          ...baseActions,
        ];
      case FCMNotificationType.collaborationInvite:
        return [
          const AndroidNotificationAction(
            'accept',
            'Accept',
            showsUserInterface: true,
          ),
          const AndroidNotificationAction('decline', 'Decline'),
        ];
      default:
        return baseActions;
    }
  }

  /// Check if currently in quiet hours
  bool _isInQuietHours() {
    final now = DateTime.now();
    final currentTime =
        '${now.hour.toString().padLeft(2, '0')}:${now.minute.toString().padLeft(2, '0')}';

    final start = _preferences.quietHours['start']!;
    final end = _preferences.quietHours['end']!;

    // Handle overnight quiet hours
    if (start.compareTo(end) > 0) {
      return currentTime.compareTo(start) >= 0 ||
          currentTime.compareTo(end) <= 0;
    } else {
      return currentTime.compareTo(start) >= 0 &&
          currentTime.compareTo(end) <= 0;
    }
  }

  /// Get current badge count
  Future<int> _getBadgeCount() async {
    // This would typically come from your app's notification storage
    // For now, return 0
    return 0;
  }

  /// Handle notification tap
  void _onNotificationTapped(NotificationResponse response) {
    debugPrint('[FCM] Notification tapped: ${response.actionId}');

    // Handle different actions
    switch (response.actionId) {
      case 'view':
        // Navigate to relevant screen
        break;
      case 'buy_now':
        // Open purchase flow
        break;
      case 'accept':
        // Accept collaboration invite
        break;
      case 'decline':
        // Decline collaboration invite
        break;
      case 'dismiss':
        // Just dismiss
        break;
      default:
        // Default tap action
        break;
    }
  }

  /// Update notification preferences
  void updatePreferences(FCMNotificationPreferences preferences) {
    _preferences = preferences;
    debugPrint('[FCM] Notification preferences updated');
  }

  /// Subscribe to topic
  Future<void> subscribeToTopic(String topic) async {
    try {
      await _firebaseMessaging.subscribeToTopic(topic);
      debugPrint('[FCM] Subscribed to topic: $topic');
    } catch (e) {
      debugPrint('[FCM] Error subscribing to topic $topic: $e');
    }
  }

  /// Unsubscribe from topic
  Future<void> unsubscribeFromTopic(String topic) async {
    try {
      await _firebaseMessaging.unsubscribeFromTopic(topic);
      debugPrint('[FCM] Unsubscribed from topic: $topic');
    } catch (e) {
      debugPrint('[FCM] Error unsubscribing from topic $topic: $e');
    }
  }

  /// Delete FCM token
  Future<void> deleteToken() async {
    try {
      await _firebaseMessaging.deleteToken();
      _fcmToken = null;
      debugPrint('[FCM] FCM token deleted');
    } catch (e) {
      debugPrint('[FCM] Error deleting FCM token: $e');
    }
  }
}

/// Background message handler - must be top-level function
@pragma('vm:entry-point')
Future<void> _firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint(
    '[FCM] Background message received: ${message.notification?.title}',
  );

  // Handle background message processing here
  // This runs even when the app is terminated
}
