/// Flutter App FCM Integration
/// Shows how to initialize and integrate FCM into the main app
library;

import 'package:flutter/material.dart';
import 'package:firebase_core/firebase_core.dart';
import 'services/fcm_service.dart';
import 'widgets/fcm_widgets.dart';

/// FCM Integration Example for main.dart
class FCMIntegrationExample {
  /// Initialize FCM in main() function
  static Future<void> initializeApp() async {
    WidgetsFlutterBinding.ensureInitialized();

    // Initialize Firebase
    await Firebase.initializeApp();

    // Initialize FCM
    await _initializeFCM();
  }

  /// Initialize FCM with callbacks
  static Future<void> _initializeFCM() async {
    final fcmManager = FCMManager();

    await fcmManager.initialize(
      onMessageReceived: (FCMNotificationData notification) {
        debugPrint('[App] Foreground notification: ${notification.title}');
        // Handle foreground notification
        // You can show in-app notification, update UI, etc.
      },

      onMessageOpenedApp: (FCMNotificationData notification) {
        debugPrint('[App] App opened from notification: ${notification.title}');
        // Handle navigation when app is opened from notification
        _handleNotificationNavigation(notification);
      },

      onTokenRefresh: (String token) {
        debugPrint('[App] FCM token refreshed: ${token.substring(0, 20)}...');
        // Send updated token to your backend
        _sendTokenToServer(token);
      },
    );

    // Subscribe to relevant topics
    await _subscribeToTopics();
  }

  /// Handle navigation based on notification type
  static void _handleNotificationNavigation(FCMNotificationData notification) {
    // Get the navigation key from your app
    final navigatorKey = GlobalKey<NavigatorState>();

    switch (notification.type) {
      case FCMNotificationType.itemAdded:
        // Navigate to wishlist page
        final wishlistId = notification.data['wishlistId'];
        if (wishlistId != null) {
          navigatorKey.currentState?.pushNamed('/wishlist/$wishlistId');
        }
        break;

      case FCMNotificationType.priceAlert:
        // Navigate to item page
        final itemId = notification.data['itemId'];
        if (itemId != null) {
          navigatorKey.currentState?.pushNamed('/item/$itemId');
        }
        break;

      case FCMNotificationType.collaborationInvite:
        // Navigate to collaboration screen
        final inviteId = notification.data['inviteId'];
        if (inviteId != null) {
          navigatorKey.currentState?.pushNamed(
            '/collaboration/invite/$inviteId',
          );
        }
        break;

      default:
        // Navigate to home or notifications screen
        navigatorKey.currentState?.pushNamed('/notifications');
        break;
    }
  }

  /// Send FCM token to backend server
  static Future<void> _sendTokenToServer(String token) async {
    try {
      // Replace with your API endpoint
      // await ApiService.updateFCMToken(token);
      debugPrint(
        '[App] FCM token sent to server: ${token.substring(0, 20)}...',
      );
    } catch (e) {
      debugPrint('[App] Error sending FCM token to server: $e');
    }
  }

  /// Subscribe to relevant FCM topics
  static Future<void> _subscribeToTopics() async {
    final fcmManager = FCMManager();

    try {
      // Subscribe to general app updates
      await fcmManager.subscribeToTopic('app_updates');

      // Subscribe to price alerts topic
      await fcmManager.subscribeToTopic('price_alerts');

      // Subscribe to system announcements
      await fcmManager.subscribeToTopic('announcements');

      debugPrint('[App] Subscribed to FCM topics');
    } catch (e) {
      debugPrint('[App] Error subscribing to FCM topics: $e');
    }
  }
}

/// Example main.dart structure with FCM integration
void main() async {
  // Initialize FCM and Firebase
  await FCMIntegrationExample.initializeApp();

  runApp(const WishlistWizardApp());
}

/// Example app widget with FCM integration
class WishlistWizardApp extends StatelessWidget {
  const WishlistWizardApp({super.key});

  // Global navigator key for handling notification navigation
  static final GlobalKey<NavigatorState> navigatorKey =
      GlobalKey<NavigatorState>();

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Wishlist Wizard',
      navigatorKey: navigatorKey,
      theme: ThemeData(primarySwatch: Colors.blue, useMaterial3: true),
      home: const HomePage(),
      routes: {
        '/notifications': (context) => const FCMNotificationHistory(),
        '/notification-settings': (context) =>
            const FCMNotificationPreferencesScreen(),
        // Add other routes as needed
      },
    );
  }
}

/// Example home page with FCM status
class HomePage extends StatefulWidget {
  const HomePage({super.key});

  @override
  State<HomePage> createState() => _HomePageState();
}

class _HomePageState extends State<HomePage> {
  final FCMManager _fcmManager = FCMManager();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Wishlist Wizard'),
        actions: [
          // FCM status indicator
          const Padding(padding: EdgeInsets.all(8.0), child: FCMStatusWidget()),
          // Notifications menu
          IconButton(
            icon: const Icon(Icons.notifications),
            onPressed: () => Navigator.pushNamed(context, '/notifications'),
          ),
          // Settings menu
          PopupMenuButton<String>(
            onSelected: (value) {
              switch (value) {
                case 'notification_settings':
                  Navigator.pushNamed(context, '/notification-settings');
                  break;
                case 'refresh_token':
                  _refreshFCMToken();
                  break;
              }
            },
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'notification_settings',
                child: ListTile(
                  leading: Icon(Icons.settings),
                  title: Text('Notification Settings'),
                ),
              ),
              const PopupMenuItem(
                value: 'refresh_token',
                child: ListTile(
                  leading: Icon(Icons.refresh),
                  title: Text('Refresh FCM Token'),
                ),
              ),
            ],
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // FCM Info Card
            _buildFCMInfoCard(),
            const SizedBox(height: 16),

            // Your app content here
            const Text(
              'Welcome to Wishlist Wizard!',
              style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),

            // Quick action buttons
            _buildQuickActions(),
          ],
        ),
      ),
    );
  }

  /// Build FCM info card
  Widget _buildFCMInfoCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.cloud_queue, color: Colors.blue),
                const SizedBox(width: 8),
                const Text(
                  'Push Notifications',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
                const Spacer(),
                const FCMStatusWidget(),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _fcmManager.fcmToken != null
                  ? 'Connected and ready to receive notifications'
                  : 'Setting up push notifications...',
              style: TextStyle(color: Colors.grey[600]),
            ),
            if (_fcmManager.fcmToken != null) ...[
              const SizedBox(height: 8),
              Text(
                'Token: ${_fcmManager.fcmToken!.substring(0, 30)}...',
                style: TextStyle(
                  color: Colors.grey[500],
                  fontSize: 12,
                  fontFamily: 'monospace',
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  /// Build quick action buttons
  Widget _buildQuickActions() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Quick Actions',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            ElevatedButton.icon(
              onPressed: () =>
                  Navigator.pushNamed(context, '/notification-settings'),
              icon: const Icon(Icons.settings),
              label: const Text('Notification Settings'),
            ),
            ElevatedButton.icon(
              onPressed: () => Navigator.pushNamed(context, '/notifications'),
              icon: const Icon(Icons.history),
              label: const Text('Notification History'),
            ),
            ElevatedButton.icon(
              onPressed: _testNotification,
              icon: const Icon(Icons.send),
              label: const Text('Test Notification'),
            ),
          ],
        ),
      ],
    );
  }

  /// Refresh FCM token
  Future<void> _refreshFCMToken() async {
    try {
      await _fcmManager.deleteToken();
      // Token will be automatically regenerated

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('FCM token refreshed successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error refreshing FCM token: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  /// Test notification (for development)
  void _testNotification() {
    final testNotification = FCMNotificationData(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      type: FCMNotificationType.systemUpdate,
      title: 'Test Notification',
      body: 'This is a test notification from Wishlist Wizard',
      data: {'test': 'true', 'timestamp': DateTime.now().toIso8601String()},
      timestamp: DateTime.now(),
    );

    // Show local notification for testing
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              testNotification.title,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            Text(testNotification.body),
          ],
        ),
        duration: const Duration(seconds: 3),
        action: SnackBarAction(
          label: 'View',
          onPressed: () {
            Navigator.pushNamed(context, '/notifications');
          },
        ),
      ),
    );
  }
}

/// Example API service for FCM token management
class FCMApiService {
  static const String baseUrl = 'https://your-api.com/api/v1';

  /// Send FCM token to server
  static Future<void> updateFCMToken(String token, String userId) async {
    try {
      // Replace with your actual API call
      // final response = await http.post(
      //   Uri.parse('$baseUrl/users/$userId/fcm-token'),
      //   headers: {'Content-Type': 'application/json'},
      //   body: json.encode({
      //     'fcmToken': token,
      //     'platform': Platform.isIOS ? 'ios' : 'android',
      //     'timestamp': DateTime.now().toIso8601String(),
      //   }),
      // );

      debugPrint('[API] FCM token updated for user: $userId');
    } catch (e) {
      debugPrint('[API] Error updating FCM token: $e');
      rethrow;
    }
  }

  /// Subscribe to user-specific topics
  static Future<void> subscribeToUserTopics(
    String userId,
    List<String> topics,
  ) async {
    try {
      final fcmManager = FCMManager();

      for (final topic in topics) {
        await fcmManager.subscribeToTopic('user_${userId}_$topic');
      }

      debugPrint('[API] Subscribed to user topics: $topics');
    } catch (e) {
      debugPrint('[API] Error subscribing to user topics: $e');
      rethrow;
    }
  }

  /// Update notification preferences on server
  static Future<void> updateNotificationPreferences(
    String userId,
    FCMNotificationPreferences preferences,
  ) async {
    try {
      // Replace with your actual API call
      // final response = await http.put(
      //   Uri.parse('$baseUrl/users/$userId/notification-preferences'),
      //   headers: {'Content-Type': 'application/json'},
      //   body: json.encode(preferences.toJson()),
      // );

      debugPrint('[API] Notification preferences updated for user: $userId');
    } catch (e) {
      debugPrint('[API] Error updating notification preferences: $e');
      rethrow;
    }
  }
}
