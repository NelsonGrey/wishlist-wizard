import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wishlist_wizard_mobile/firebase_options.dart';
import 'package:wishlist_wizard_mobile/main.dart';

// Forgot Password screen, run against the real dev Firebase project on a
// real device/simulator.
//
// Doesn't verify receipt of the actual email (Firebase's own delivery,
// outside the app) -- what's real and deterministic to check is that
// requesting a reset for a genuine registered account round-trips through
// the real sendPasswordResetEmail call and flips to the "Email Sent!"
// confirmation state, plus the "Resend Email" affordance it exposes.
void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  setUpAll(() async {
    if (Firebase.apps.isEmpty) {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
    }
    await fb.FirebaseAuth.instance.signOut();
  });

  final email = 'e2e-mobile-forgot-${DateTime.now().millisecondsSinceEpoch}@wishlist-wizard.test';
  const password = 'Test@Secure123Password';

  testWidgets(
    'requesting a reset for a real account sends the email and shows the confirmation state',
    (tester) async {
      // --- Sign up, then sign back out (the account just needs to exist) ---
      await tester.pumpWidget(const WishlistWizardApp());
      await tester.pumpAndSettle(const Duration(seconds: 5));
      await tester.tap(find.text("Don't have an account? Sign up"));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextFormField, 'Email'), email);
      await tester.enterText(find.widgetWithText(TextFormField, 'Password'), password);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign Up'));
      await tester.pumpAndSettle(const Duration(seconds: 10));
      expect(find.textContaining('Welcome back,'), findsOneWidget);

      await fb.FirebaseAuth.instance.signOut();
      await tester.pumpAndSettle(const Duration(seconds: 3));
      expect(find.text('Sign In'), findsOneWidget);

      // --- Open Forgot Password from the login screen ---
      await tester.tap(find.text('Forgot Password?'));
      await tester.pumpAndSettle();
      expect(find.text('Forgot Password?'), findsWidgets); // heading + link

      // --- Request a reset for the real account ---
      await tester.enterText(find.widgetWithText(TextFormField, 'Email'), email);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Send Reset Link'));
      // Real Cloud round-trip: sendPasswordResetEmail.
      await tester.pumpAndSettle(const Duration(seconds: 8));
      expect(find.text('Email Sent!'), findsOneWidget);
      expect(find.widgetWithText(ElevatedButton, 'Back to Login'), findsOneWidget);
      expect(find.widgetWithText(TextButton, 'Resend Email'), findsOneWidget);

      // --- Back to Login returns to the real login screen, not stranded ---
      await tester.tap(find.widgetWithText(ElevatedButton, 'Back to Login'));
      await tester.pumpAndSettle();
      expect(find.text('Sign In'), findsOneWidget);
    },
  );
}
