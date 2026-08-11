import 'dart:async';
import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:logging/logging.dart';
import 'package:flutter/foundation.dart';
import 'firebase_options.dart';
import 'models/models.dart';
import 'providers/providers.dart';
import 'services/services.dart';
import 'services/admob_service.dart';
import 'services/fcm_service.dart';
import 'services/iap_service.dart';
import 'screens/account_screen.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/firebase_wishlists_screen.dart';
import 'screens/subscription_screen.dart';
import 'widgets/error_boundary.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize logging
  Logger.root.level = Level.ALL;
  Logger.root.onRecord.listen((record) {
    // In production, you might want to send logs to a service like Firebase Crashlytics
    // or a logging service instead of printing to console
    // ignore: avoid_print
    print(
      '${record.level.name}: ${record.time}: ${record.loggerName}: ${record.message}',
    );
  });

  // Initialize Firebase. On iOS, the native SDK can auto-configure the
  // "[DEFAULT]" app from GoogleService-Info.plist before this ever runs, so
  // Firebase.apps.isEmpty (a Dart-side registry) doesn't reliably reflect
  // that. Catching core/duplicate-app specifically and treating it as
  // already-configured is the standard fix for this ordering issue.
  try {
    await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);
  } on FirebaseException catch (e) {
    if (e.code != 'duplicate-app') rethrow;
  }

  // App Check is enforced server-side (Auth/Firestore/Storage) in
  // wishlist-wizard-dev as of 2026-07-18 — without this, every real
  // request gets rejected with a 403. Debug providers are used in debug
  // builds (including simulators, which can't do real App Attest/Play
  // Integrity attestation) and print a token to the console that must be
  // registered once via the Firebase Console/App Check API before it works.
  await FirebaseAppCheck.instance.activate(
    providerApple: kDebugMode ? const AppleDebugProvider() : const AppleAppAttestWithDeviceCheckFallbackProvider(),
    providerAndroid: kDebugMode ? const AndroidDebugProvider() : const AndroidPlayIntegrityProvider(),
  );

  // Explicitly enable Firestore's offline cache (settings must be applied before
  // any Firestore read/write) so wishlists remain viewable without a connection.
  FirebaseFirestore.instance.settings = const Settings(
    persistenceEnabled: true,
    cacheSizeBytes: Settings.CACHE_SIZE_UNLIMITED,
  );

  // Initialize AdMob (must come after Firebase, before runApp)
  await AdMobManager().initialize();
  if (kDebugMode) {
    debugPrint(
      '[Bootstrap] FIREBASE_ENV=${DefaultFirebaseOptions.firebaseEnv}',
    );
    debugPrint(
      '[Bootstrap] Active Firebase project: ${Firebase.app().options.projectId}',
    );
    WidgetsBinding.instance.addPostFrameCallback((_) {
      debugPrint('[Bootstrap] First frame rendered');
    });
    Timer.periodic(const Duration(seconds: 15), (_) {
      debugPrint('[Bootstrap] Heartbeat: app isolate alive');
    });
  }

  // Initialize API client (for non-auth requests)
  ApiClient().initialize();

  runApp(const WishlistWizardApp());
}

class WishlistWizardApp extends StatelessWidget {
  const WishlistWizardApp({super.key});

  @override
  Widget build(BuildContext context) {
    return ErrorBoundary(
      onError: (error, stackTrace) {
        debugPrint('[Global ErrorBoundary] Caught error: $error');
        debugPrint('[Global ErrorBoundary] Stack trace: $stackTrace');
      },
      child: MultiProvider(
        providers: [
          ChangeNotifierProvider(create: (_) => AuthProvider()),
          ChangeNotifierProvider(create: (_) => FirebaseWishlistProvider()),
          ChangeNotifierProvider(create: (_) => SubscriptionProvider()),
          ChangeNotifierProvider(create: (_) => IapService()..initialize()),
        ],
        child: MaterialApp(
          title: 'Wishlist Wizard',
          theme: ThemeData(
            primarySwatch: Colors.green,
            primaryColor: const Color(0xFF064E3B),
            hintColor: const Color(0xFF065F46),
            appBarTheme: const AppBarTheme(
              backgroundColor: Color(0xFF064E3B),
              foregroundColor: Colors.white,
              elevation: 2,
            ),
            elevatedButtonTheme: ElevatedButtonThemeData(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF064E3B),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
                padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
              ),
            ),
            inputDecorationTheme: InputDecorationTheme(
              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(8),
                borderSide: const BorderSide(color: Color(0xFF064E3B)),
              ),
            ),
            cardTheme: CardThemeData(
              elevation: 2,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
          ),
          home: const AuthWrapper(),
        ),
      ),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    if (kDebugMode) {
      debugPrint('[AuthWrapper] building auth gate');
    }
    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        if (authProvider.isLoading) {
          if (kDebugMode) {
            debugPrint('[AuthWrapper] showing loading gate');
          }
          return Scaffold(
            body: Container(
              color: const Color(0xFFECFDF5),
              child: const Center(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.card_giftcard,
                      size: 56,
                      color: Color(0xFF064E3B),
                    ),
                    SizedBox(height: 16),
                    CircularProgressIndicator(),
                    SizedBox(height: 16),
                    Text(
                      'Starting Wishlist Wizard...',
                      style: TextStyle(
                        color: Color(0xFF064E3B),
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        if (authProvider.isLoggedIn) {
          if (kDebugMode) {
            debugPrint('[AuthWrapper] routing to MainNavigator');
          }
          return const MainNavigator();
        }

        if (kDebugMode) {
          debugPrint('[AuthWrapper] routing to LoginScreen');
        }
        return const LoginScreen();
      },
    );
  }
}

class MainNavigator extends StatefulWidget {
  const MainNavigator({super.key});

  @override
  State<MainNavigator> createState() => _MainNavigatorState();
}

class _MainNavigatorState extends State<MainNavigator> {
  int _currentIndex = 0;
  final FCMManager _fcmManager = FCMManager();

  final List<Widget> _screens = [
    const HomeScreen(),
    const FirebaseWishlistsScreen(),
    const NotificationsScreen(),
    const ProfileScreen(),
  ];

  @override
  void initState() {
    super.initState();
    _initializeFcm();
  }

  Future<void> _initializeFcm() async {
    await _fcmManager.initialize(
      onTokenRefresh: (token) async {
        try {
          await FirebaseFunctionsService().saveFcmToken(
            token,
            platform: Platform.isIOS ? 'ios' : 'android',
          );
        } catch (e) {
          debugPrint('[FCM] Failed to save token to backend: $e');
        }
      },
      onMessageReceived: (notification) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('${notification.title}: ${notification.body}'),
            duration: const Duration(seconds: 4),
          ),
        );
      },
      onMessageOpenedApp: (notification) {
        if (!mounted) return;
        // Full deep-linking to the specific wishlist/item is handled from the
        // Notifications tab (see NotificationsScreen); opening the app from a
        // push just brings the user to that tab to continue from there.
        setState(() => _currentIndex = 2);
      },
    );

    if (_fcmManager.fcmToken != null) {
      try {
        await FirebaseFunctionsService().saveFcmToken(
          _fcmManager.fcmToken!,
          platform: Platform.isIOS ? 'ios' : 'android',
        );
      } catch (e) {
        debugPrint('[FCM] Failed to save initial token to backend: $e');
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    if (kDebugMode) {
      debugPrint('[MainNavigator] building tab index=$_currentIndex');
    }
    return Scaffold(
      body: _screens[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        type: BottomNavigationBarType.fixed,
        currentIndex: _currentIndex,
        onTap: (index) {
          setState(() {
            _currentIndex = index;
          });
        },
        selectedItemColor: Theme.of(context).primaryColor,
        unselectedItemColor: Colors.grey,
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Home'),
          BottomNavigationBarItem(icon: Icon(Icons.list), label: 'Wishlists'),
          BottomNavigationBarItem(
            icon: Icon(Icons.notifications),
            label: 'Notifications',
          ),
          BottomNavigationBarItem(icon: Icon(Icons.person), label: 'Profile'),
        ],
      ),
    );
  }
}

class NotificationDeepLinkParser {
  static String? extractWishlistId(FirebaseNotification notification) {
    final metadata = notification.metadata;

    final directValue = _extractStringValue(metadata, const [
      'wishlistId',
      'wishlist_id',
      'wishlist',
    ]);
    if (directValue != null) {
      return directValue;
    }

    final actionUrl = _extractActionUrl(metadata);
    if (actionUrl != null) {
      final fromQuery = _extractFromActionUrlQuery(actionUrl, const [
        'wishlistId',
        'wishlist_id',
        'wishlist',
      ]);
      if (fromQuery != null) {
        return fromQuery;
      }

      final match = RegExp(r'/wishlists?/([^/\s]+)').firstMatch(actionUrl);
      if (match != null && match.groupCount >= 1) {
        return match.group(1);
      }
    }

    return null;
  }

  static String? extractItemId(FirebaseNotification notification) {
    final metadata = notification.metadata;

    final directValue = _extractStringValue(metadata, const [
      'itemId',
      'item_id',
      'wishlistItemId',
      'wishlist_item_id',
      'item',
    ]);
    if (directValue != null) {
      return directValue;
    }

    final actionUrl = _extractActionUrl(metadata);
    if (actionUrl != null) {
      final fromQuery = _extractFromActionUrlQuery(actionUrl, const [
        'itemId',
        'item_id',
        'wishlistItemId',
        'wishlist_item_id',
        'item',
      ]);
      if (fromQuery != null) {
        return fromQuery;
      }

      final match = RegExp(r'/items?/([^/\s]+)').firstMatch(actionUrl);
      if (match != null && match.groupCount >= 1) {
        return match.group(1);
      }
    }

    return null;
  }

  static String? _extractStringValue(
    Map<String, dynamic> metadata,
    List<String> keys,
  ) {
    for (final key in keys) {
      final value = metadata[key];
      if (value is String && value.isNotEmpty) {
        return value;
      }
      if (value is num) {
        return value.toString();
      }
    }
    return null;
  }

  static String? _extractActionUrl(Map<String, dynamic> metadata) {
    return _extractStringValue(metadata, const [
      'actionUrl',
      'action_url',
      'url',
      'deepLink',
      'deep_link',
    ]);
  }

  static String? _extractFromActionUrlQuery(
    String actionUrl,
    List<String> keys,
  ) {
    final uri = Uri.tryParse(actionUrl);
    if (uri == null) {
      return null;
    }

    for (final key in keys) {
      final value = uri.queryParameters[key];
      if (value != null && value.isNotEmpty) {
        return value;
      }
    }

    return null;
  }
}

class NotificationsScreen extends StatelessWidget {
  const NotificationsScreen({super.key});

  String? _extractWishlistId(FirebaseNotification notification) {
    return NotificationDeepLinkParser.extractWishlistId(notification);
  }

  String? _extractItemId(FirebaseNotification notification) {
    return NotificationDeepLinkParser.extractItemId(notification);
  }

  Future<void> _handleNotificationTap(
    BuildContext context,
    FirebaseNotification notification,
    FirebaseWishlistProvider wishlistProvider,
  ) async {
    if (!notification.isRead) {
      await wishlistProvider.markNotificationAsRead(notification.id);
    }

    final extractedWishlistId = _extractWishlistId(notification);
    final itemId = _extractItemId(notification);

    String? resolvedWishlistId;
    if (itemId != null && itemId.isNotEmpty) {
      final item = await wishlistProvider.getWishlistItemById(itemId);
      resolvedWishlistId = item?.wishlistId;
    }

    resolvedWishlistId ??= extractedWishlistId;

    if (resolvedWishlistId == null || resolvedWishlistId.isEmpty) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No linked wishlist found for this notification.'),
          ),
        );
      }
      return;
    }

    final wishlist = await wishlistProvider.getWishlistById(resolvedWishlistId);
    if (wishlist != null && context.mounted) {
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => FirebaseWishlistItemsScreen(
            wishlist: wishlist,
            initialItemId: itemId,
          ),
        ),
      );
      return;
    }

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to open related wishlist.')),
      );
    }
  }

  IconData _iconForType(NotificationType type) {
    switch (type) {
      case NotificationType.priceDrop:
        return Icons.trending_down;
      case NotificationType.backInStock:
        return Icons.inventory_2;
      case NotificationType.wishlistShared:
        return Icons.share;
      case NotificationType.itemPurchased:
        return Icons.shopping_bag;
      case NotificationType.system:
        return Icons.info;
    }
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays > 7) {
      return '${date.day}/${date.month}/${date.year}';
    } else if (difference.inDays > 0) {
      return '${difference.inDays} day${difference.inDays == 1 ? '' : 's'} ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours} hour${difference.inHours == 1 ? '' : 's'} ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes} minute${difference.inMinutes == 1 ? '' : 's'} ago';
    }

    return 'Just now';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const CustomAppBar(title: 'Notifications'),
      body: Consumer2<AuthProvider, FirebaseWishlistProvider>(
        builder: (context, authProvider, wishlistProvider, child) {
          if (authProvider.user == null) {
            return const Center(
              child: Text('Please log in to view notifications'),
            );
          }

          return StreamBuilder<List<FirebaseNotification>>(
            stream: wishlistProvider.getNotificationsStream(
              authProvider.user!.id,
            ),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              if (snapshot.hasError) {
                return Center(
                  child: Text(
                    'Failed to load notifications: ${snapshot.error}',
                    style: const TextStyle(color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                );
              }

              final notifications = snapshot.data ?? [];

              if (notifications.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.notifications_none,
                        size: 64,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No notifications yet',
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(color: Colors.grey[600]),
                      ),
                    ],
                  ),
                );
              }

              return ListView.builder(
                padding: const EdgeInsets.all(16),
                itemCount: notifications.length,
                itemBuilder: (context, index) {
                  final notification = notifications[index];

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    color: notification.isRead
                        ? null
                        : Theme.of(
                            context,
                          ).primaryColor.withValues(alpha: 0.05),
                    child: ListTile(
                      leading: CircleAvatar(
                        backgroundColor: Theme.of(
                          context,
                        ).primaryColor.withValues(alpha: 0.1),
                        child: Icon(
                          _iconForType(notification.type),
                          color: Theme.of(context).primaryColor,
                        ),
                      ),
                      title: Text(
                        notification.title,
                        style: TextStyle(
                          fontWeight: notification.isRead
                              ? FontWeight.w500
                              : FontWeight.w700,
                        ),
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(notification.message),
                          const SizedBox(height: 4),
                          Text(
                            _formatDate(notification.createdAt),
                            style: TextStyle(
                              fontSize: 12,
                              color: Colors.grey[600],
                            ),
                          ),
                        ],
                      ),
                      onTap: () => _handleNotificationTap(
                        context,
                        notification,
                        wishlistProvider,
                      ),
                    ),
                  );
                },
              );
            },
          );
        },
      ),
    );
  }
}

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const CustomAppBar(title: 'Profile'),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Consumer<AuthProvider>(
              builder: (context, authProvider, child) {
                final user = authProvider.user;
                return Column(
                  children: [
                    CircleAvatar(
                      radius: 50,
                      backgroundImage: user?.profileImageUrl != null
                          ? NetworkImage(user!.profileImageUrl!)
                          : null,
                      child: user?.profileImageUrl == null
                          ? const Icon(Icons.person, size: 50)
                          : null,
                    ),
                    const SizedBox(height: 16),
                    Text(
                      user?.name ?? user?.email ?? 'Unknown User',
                      style: Theme.of(context).textTheme.headlineSmall,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      user?.email ?? '',
                      style: Theme.of(
                        context,
                      ).textTheme.bodyMedium?.copyWith(color: Colors.grey[600]),
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 32),
            ElevatedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const SubscriptionScreen(),
                  ),
                );
              },
              icon: const Icon(Icons.workspace_premium),
              label: const Text('Manage Subscription'),
            ),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => const AccountScreen(),
                  ),
                );
              },
              icon: const Icon(Icons.security),
              label: const Text('Account & Security'),
            ),
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: () {
                Provider.of<AuthProvider>(context, listen: false).logout();
              },
              child: const Text('Logout'),
            ),
            const SizedBox(height: 24),
            TextButton(
              onPressed: () => _showDeleteAccountDialog(context),
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              child: const Text('Delete Account'),
            ),
          ],
        ),
      ),
    );
  }

  void _showDeleteAccountDialog(BuildContext context) {
    final confirmController = TextEditingController();
    var deleting = false;

    showDialog(
      context: context,
      builder: (dialogContext) => StatefulBuilder(
        builder: (dialogContext, setDialogState) {
          final confirmed =
              confirmController.text.trim().toLowerCase() == 'delete my account';

          return AlertDialog(
            title: const Text('Delete Your Account?'),
            content: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'This action cannot be undone. All your wishlists, preferences, and data will be permanently deleted.',
                ),
                const SizedBox(height: 16),
                const Text('Please type "delete my account" to confirm:'),
                const SizedBox(height: 8),
                TextField(
                  controller: confirmController,
                  autofocus: true,
                  enabled: !deleting,
                  decoration: const InputDecoration(hintText: 'delete my account'),
                  onChanged: (_) => setDialogState(() {}),
                ),
              ],
            ),
            actions: [
              TextButton(
                onPressed: deleting ? null : () => Navigator.pop(dialogContext),
                child: const Text('Cancel'),
              ),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.red,
                  foregroundColor: Colors.white,
                ),
                onPressed: !confirmed || deleting
                    ? null
                    : () async {
                        setDialogState(() => deleting = true);
                        try {
                          await FirebaseFunctionsService().deleteAccount();
                          if (dialogContext.mounted) {
                            Navigator.pop(dialogContext);
                          }
                          if (context.mounted) {
                            Provider.of<AuthProvider>(context, listen: false).logout();
                          }
                        } catch (e) {
                          setDialogState(() => deleting = false);
                          if (dialogContext.mounted) {
                            ScaffoldMessenger.of(dialogContext).showSnackBar(
                              const SnackBar(
                                content: Text('Failed to delete account. Please try again.'),
                                backgroundColor: Colors.red,
                              ),
                            );
                          }
                        }
                      },
                child: Text(deleting ? 'Deleting...' : 'Delete Account'),
              ),
            ],
          );
        },
      ),
    );
  }
}

class CustomAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String title;
  final List<Widget>? actions;

  const CustomAppBar({super.key, required this.title, this.actions});

  @override
  Widget build(BuildContext context) {
    return AppBar(title: Text(title), actions: actions);
  }

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);
}
