import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:logging/logging.dart';
import 'firebase_options.dart';
import 'models/models.dart';
import 'providers/providers.dart';
import 'services/services.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/firebase_wishlists_screen.dart';
import 'screens/subscription_screen.dart';

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

  // Initialize Firebase
  await Firebase.initializeApp(options: DefaultFirebaseOptions.currentPlatform);

  // Initialize API client (for non-auth requests)
  ApiClient().initialize();

  runApp(const WishlistWizardApp());
}

class WishlistWizardApp extends StatelessWidget {
  const WishlistWizardApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => WishlistProvider()),
        ChangeNotifierProvider(create: (_) => FirebaseWishlistProvider()),
        ChangeNotifierProvider(create: (_) => SubscriptionProvider()),
      ],
      child: MaterialApp(
        title: 'Wishlist Wizard',
        theme: ThemeData(
          primarySwatch: Colors.purple,
          primaryColor: const Color(0xFF6B46C1),
          hintColor: const Color(0xFF9333EA),
          appBarTheme: const AppBarTheme(
            backgroundColor: Color(0xFF6B46C1),
            foregroundColor: Colors.white,
            elevation: 2,
          ),
          elevatedButtonTheme: ElevatedButtonThemeData(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF6B46C1),
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
              borderSide: const BorderSide(color: Color(0xFF6B46C1)),
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
    );
  }
}

class AuthWrapper extends StatelessWidget {
  const AuthWrapper({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        if (authProvider.isLoading) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }

        if (authProvider.isLoggedIn) {
          return const MainNavigator();
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

  final List<Widget> _screens = [
    const HomeScreen(),
    const FirebaseWishlistsScreen(),
    const NotificationsScreen(),
    const ProfileScreen(),
  ];

  @override
  Widget build(BuildContext context) {
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
            ElevatedButton(
              onPressed: () {
                Provider.of<AuthProvider>(context, listen: false).logout();
              },
              child: const Text('Logout'),
            ),
          ],
        ),
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
