import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wishlist_wizard_mobile/firebase_options.dart';
import 'package:wishlist_wizard_mobile/main.dart';

// Account & Security screen's change-password flow, run against the real
// dev Firebase project on a real device/simulator.
//
// Client-side validation (hint text, mismatch rejection, policy quick-check)
// is already covered at the widget level with a mocked PasswordPolicyService
// in test/account_screen_test.dart. What that can't cover: the real
// round-trip through Firebase Auth -- reauthenticate() against the actual
// current password, then changePassword() against the actual policy
// service. Proven end to end here by signing out and back in with the new
// password afterward, rather than trusting a transient SnackBar.
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

  final email = 'e2e-mobile-account-${DateTime.now().millisecondsSinceEpoch}@wishlist-wizard.test';
  const oldPassword = 'Test@Secure123Password';
  const newPassword = 'Test@Secure456Password';

  testWidgets(
    'change password reauthenticates with the old password and takes effect for the next sign-in',
    (tester) async {
      // --- Sign up ---
      await tester.pumpWidget(const WishlistWizardApp());
      await tester.pumpAndSettle(const Duration(seconds: 5));
      await tester.tap(find.text("Don't have an account? Sign up"));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextFormField, 'Email'), email);
      await tester.enterText(find.widgetWithText(TextFormField, 'Password'), oldPassword);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign Up'));
      await tester.pumpAndSettle(const Duration(seconds: 10));
      expect(find.textContaining('Welcome back'), findsOneWidget);

      // --- Open Account & Security from the Profile tab ---
      await tester.tap(find.descendant(
        of: find.byType(BottomNavigationBar),
        matching: find.text('Profile'),
      ));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.widgetWithText(ListTile, 'Account & Security'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.widgetWithText(ListTile, 'Account & Security'));
      await tester.pumpAndSettle();
      expect(find.text('Change Password'), findsOneWidget);

      // --- A wrong current password is rejected by real Firebase reauth ---
      // Not pumpAndSettle: its default SnackBar auto-dismisses in ~4s, and
      // an 8s settle step would pump straight through its whole
      // show-then-hide cycle before ever checking for it. Wait out the real
      // network round-trip with a plain timed pump instead, then pump once
      // more to render the SnackBar that appears right after.
      await tester.enterText(find.widgetWithText(TextFormField, 'Current password'), 'WrongPassword123!');
      await tester.enterText(find.widgetWithText(TextFormField, 'New password'), newPassword);
      await tester.enterText(find.widgetWithText(TextFormField, 'Confirm new password'), newPassword);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Update Password'));
      await tester.pump(const Duration(seconds: 8));
      await tester.pump();
      // Real Firebase error message, shared with the login flow's own
      // invalid-credential case -- not the "Current password is incorrect."
      // fallback AccountScreen only uses when authProvider.error is null.
      expect(find.text('Invalid email or password.'), findsOneWidget);
      // Let that SnackBar fully dismiss -- otherwise it can still be
      // covering the "Update Password" button when the next tap fires.
      await tester.pumpAndSettle();

      // --- The real current password succeeds ---
      // Not asserting on a "Password updated." SnackBar here: with the
      // previous SnackBar's own dismiss animation still in ScaffoldMessenger's
      // queue, this one can be queued behind it rather than shown
      // immediately, making the check flaky. The definitive proof that the
      // change actually took effect is the sign-out/sign-in round-trip
      // below anyway, so that's the only thing asserted on.
      await tester.enterText(find.widgetWithText(TextFormField, 'Current password'), oldPassword);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Update Password'));
      await tester.pumpAndSettle(const Duration(seconds: 8));

      // --- Sign out, then prove the new password actually works and the
      // old one no longer does ---
      await fb.FirebaseAuth.instance.signOut();
      await tester.pumpAndSettle(const Duration(seconds: 3));
      expect(find.text('Sign In'), findsOneWidget);

      await tester.enterText(find.widgetWithText(TextFormField, 'Email'), email);
      await tester.enterText(find.widgetWithText(TextFormField, 'Password'), oldPassword);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
      await tester.pumpAndSettle(const Duration(seconds: 8));
      expect(find.textContaining('Welcome back'), findsNothing); // old password now rejected
      // Let the resulting error SnackBar fully dismiss -- it can otherwise
      // still be covering the "Sign In" button for the next tap.
      await tester.pumpAndSettle();

      await tester.enterText(find.widgetWithText(TextFormField, 'Password'), newPassword);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
      await tester.pumpAndSettle(const Duration(seconds: 8));
      expect(find.textContaining('Welcome back'), findsOneWidget); // new password works
    },
  );
}
