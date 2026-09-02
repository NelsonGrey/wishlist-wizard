import 'dart:async';
import 'dart:io' show Platform;

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';
import 'package:logging/logging.dart';
import 'package:flutter/foundation.dart';
import 'firebase_options.dart';
import 'providers/providers.dart';
import 'services/services.dart';
import 'services/admob_service.dart';
import 'services/fcm_service.dart';
import 'services/iap_service.dart';
import 'theme/app_theme.dart';
import 'theme/design_tokens.dart';
import 'screens/login_screen.dart';
import 'screens/home_screen.dart';
import 'screens/firebase_wishlists_screen.dart';
import 'screens/notifications_screen.dart';
import 'screens/profile_screen.dart';
import 'widgets/error_boundary.dart';

// Lets AuthWrapper pop back to the app's root route when the user becomes
// signed out while a screen is pushed on top (e.g. account_screen.dart's
// Account & Security, reached via Navigator.push from the Profile tab) --
// otherwise a sign-out that happens away from the root (a revoked session,
// or account_screen.dart's own change-password flow re-authenticating and
// then, in principle, ending up signed out) rebuilds LoginScreen
// underneath while the pushed route stays on top of the Navigator stack,
// stranding the user on a stale screen with no way back except a restart.
final rootNavigatorKey = GlobalKey<NavigatorState>();

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
    await Firebase.initializeApp(
      options: DefaultFirebaseOptions.currentPlatform,
    );
  } on FirebaseException catch (e) {
    if (e.code != 'duplicate-app') rethrow;
  }

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
          navigatorKey: rootNavigatorKey,
          title: 'Wishlist Wizard',
          theme: AppTheme.light(),
          darkTheme: AppTheme.dark(),
          themeMode: ThemeMode.light,
          home: const AuthWrapper(),
        ),
      ),
    );
  }
}

class AuthWrapper extends StatefulWidget {
  const AuthWrapper({super.key});

  @override
  State<AuthWrapper> createState() => _AuthWrapperState();
}

class _AuthWrapperState extends State<AuthWrapper> {
  // Tracks isLoggedIn across builds so the pop-to-root below only fires on
  // an actual signed-in -> signed-out transition, not on every rebuild
  // that happens to land on the LoginScreen branch -- Consumer rebuilds on
  // every notifyListeners() call, including the per-operation loading
  // toggle from resetPassword() (called from ForgotPasswordScreen, itself
  // pushed on top of LoginScreen while already signed out) or any other
  // auth call made while already logged out. Unconditionally popping on
  // every such rebuild would strand that pushed screen right back at
  // login, the same bug this was meant to fix in the first place.
  bool? _wasLoggedIn;

  @override
  Widget build(BuildContext context) {
    if (kDebugMode) {
      debugPrint('[AuthWrapper] building auth gate');
    }
    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        if (authProvider.isInitializing) {
          if (kDebugMode) {
            debugPrint('[AuthWrapper] showing loading gate');
          }
          return Scaffold(
            backgroundColor: AppColors.ivory,
            body: Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  SvgPicture.asset('assets/logo.svg', width: 72, height: 72),
                  const SizedBox(height: 20),
                  const CircularProgressIndicator(),
                  const SizedBox(height: 16),
                  const Text(
                    'Starting Wishlist Wizard...',
                    style: TextStyle(
                      color: AppColors.emerald,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
          );
        }

        final wasLoggedIn = _wasLoggedIn;
        _wasLoggedIn = authProvider.isLoggedIn;

        if (authProvider.isLoggedIn) {
          if (kDebugMode) {
            debugPrint('[AuthWrapper] routing to MainNavigator');
          }
          return const MainNavigator();
        }

        if (kDebugMode) {
          debugPrint('[AuthWrapper] routing to LoginScreen');
        }
        if (wasLoggedIn == true) {
          // A real signed-in -> signed-out transition (as opposed to a
          // rebuild that merely lands here again while already logged
          // out) -- drop any route pushed on top of this one (Account &
          // Security, Calendar, etc.). Otherwise the pushed route stays on
          // top of the Navigator's stack while LoginScreen rebuilds
          // underneath it, stranding the user on a stale screen. Scheduled
          // for after this frame since Navigator can't be mutated
          // mid-build.
          WidgetsBinding.instance.addPostFrameCallback((_) {
            rootNavigatorKey.currentState?.popUntil((route) => route.isFirst);
          });
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
        selectedItemColor: Theme.of(context).colorScheme.primary,
        unselectedItemColor: AppColors.mutedForeground,
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
