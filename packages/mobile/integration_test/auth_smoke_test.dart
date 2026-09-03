import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wishlist_wizard_mobile/firebase_options.dart';
import 'package:wishlist_wizard_mobile/main.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  // Initialize Firebase once before all tests so setUp/setUpAll hooks can
  // call FirebaseAuth.instance safely.
  setUpAll(() async {
    try {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
    } on FirebaseException catch (e) {
      // Native iOS auto-configures the [DEFAULT] app from
      // GoogleService-Info.plist before this runs, so Firebase.apps.isEmpty
      // is unreliable here -- treat duplicate-app as already initialised
      // (same workaround as main.dart).
      if (e.code != 'duplicate-app') rethrow;
    }
  });

  // Sign out before each test so auth-group tests always start from the login
  // screen regardless of persisted session state.
  setUp(() async {
    await fb.FirebaseAuth.instance.signOut();
  });

  group('Auth flow', () {
    testWidgets('login screen renders with core controls', (tester) async {
      await tester.pumpWidget(const WishlistWizardApp());
      await tester.pumpAndSettle(const Duration(seconds: 5));

      expect(find.text('Wishlist Wizard'), findsOneWidget);
      expect(find.byType(Form), findsOneWidget);
      expect(find.text('Email'), findsOneWidget);
      expect(find.text('Password'), findsOneWidget);
      expect(find.text('Sign In'), findsOneWidget);
    });

    testWidgets('signup toggle switches to registration mode', (tester) async {
      await tester.pumpWidget(const WishlistWizardApp());
      await tester.pumpAndSettle(const Duration(seconds: 5));

      await tester.tap(find.text("Don't have an account? Sign up"));
      await tester.pumpAndSettle();

      expect(find.text('Sign Up'), findsOneWidget);
      expect(find.text('Name (optional)'), findsOneWidget);
      expect(find.text('Already have an account? Sign in'), findsOneWidget);
    });

    testWidgets('empty email shows validation error', (tester) async {
      await tester.pumpWidget(const WishlistWizardApp());
      await tester.pumpAndSettle(const Duration(seconds: 5));

      await tester.tap(find.text('Sign In'));
      await tester.pumpAndSettle();

      expect(find.text('Please enter your email'), findsOneWidget);
    });

    testWidgets('forgot password link navigates to reset screen', (tester) async {
      await tester.pumpWidget(const WishlistWizardApp());
      await tester.pumpAndSettle(const Duration(seconds: 5));

      await tester.tap(find.text('Forgot Password?'));
      await tester.pumpAndSettle();

      expect(find.text('Reset Password'), findsOneWidget);
    });
  });

  group('Home screen (logged in)', () {
    setUpAll(() async {
      final email = const String.fromEnvironment('TEST_EMAIL', defaultValue: '');
      final password = const String.fromEnvironment('TEST_PASSWORD', defaultValue: '');
      if (email.isNotEmpty && password.isNotEmpty) {
        await fb.FirebaseAuth.instance.signInWithEmailAndPassword(
          email: email,
          password: password,
        );
      }
    });

    tearDownAll(() async {
      await fb.FirebaseAuth.instance.signOut();
    });

    testWidgets('home screen shows welcome section', (tester) async {
      if (fb.FirebaseAuth.instance.currentUser == null) {
        markTestSkipped('TEST_EMAIL / TEST_PASSWORD not provided');
        return;
      }
      await tester.pumpWidget(const WishlistWizardApp());
      await tester.pumpAndSettle(const Duration(seconds: 5));

      expect(find.textContaining('Welcome back,'), findsOneWidget);
      expect(find.text('Home'), findsOneWidget);
    });

    testWidgets('bottom nav has four tabs', (tester) async {
      if (fb.FirebaseAuth.instance.currentUser == null) {
        markTestSkipped('TEST_EMAIL / TEST_PASSWORD not provided');
        return;
      }
      await tester.pumpWidget(const WishlistWizardApp());
      await tester.pumpAndSettle(const Duration(seconds: 5));

      expect(find.byType(BottomNavigationBar), findsOneWidget);
      expect(find.text('Home'), findsOneWidget);
      expect(find.text('Wishlists'), findsOneWidget);
      expect(find.text('Notifications'), findsOneWidget);
      expect(find.text('Profile'), findsOneWidget);
    });

    testWidgets('wishlists tab loads Firebase wishlist screen', (tester) async {
      if (fb.FirebaseAuth.instance.currentUser == null) {
        markTestSkipped('TEST_EMAIL / TEST_PASSWORD not provided');
        return;
      }
      await tester.pumpWidget(const WishlistWizardApp());
      await tester.pumpAndSettle(const Duration(seconds: 5));

      await tester.tap(find.text('Wishlists'));
      await tester.pumpAndSettle(const Duration(seconds: 5));

      expect(find.widgetWithText(AppBar, 'Wishlists'), findsOneWidget);
    });

    testWidgets('profile tab shows logout button', (tester) async {
      if (fb.FirebaseAuth.instance.currentUser == null) {
        markTestSkipped('TEST_EMAIL / TEST_PASSWORD not provided');
        return;
      }
      await tester.pumpWidget(const WishlistWizardApp());
      await tester.pumpAndSettle(const Duration(seconds: 5));

      await tester.tap(find.text('Profile'));
      await tester.pumpAndSettle();

      expect(find.text('Logout'), findsOneWidget);
    });
  });
}
