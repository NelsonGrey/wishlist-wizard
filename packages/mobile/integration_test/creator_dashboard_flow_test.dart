import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wishlist_wizard_mobile/firebase_options.dart';
import 'package:wishlist_wizard_mobile/main.dart';

// Creator Tools screen, run against the real dev Firebase project on a real
// device/simulator.
//
// Creator Pro is a paid tier with no free trial path exercisable from a
// fresh sign-up, so this only verifies the real tier gate: a free-tier
// account should see the upgrade prompt, not the dashboard's four tabs or
// a raw error. The dashboard's load short-circuits on the first call
// (getCreatorCommissionSummary); its four tabs and the Stripe Connect
// onboarding link launch (a real external browser hop, same class of
// limitation as the OAuth calendar-provider connections) aren't covered
// here for that reason.
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

  final email = 'e2e-mobile-creator-${DateTime.now().millisecondsSinceEpoch}@wishlist-wizard.test';
  const password = 'Test@Secure123Password';

  testWidgets(
    'Creator Tools shows the real paid-feature gate for a free-tier account',
    (tester) async {
      // --- Sign up ---
      await tester.pumpWidget(const WishlistWizardApp());
      await tester.pumpAndSettle(const Duration(seconds: 5));
      await tester.tap(find.text("Don't have an account? Sign up"));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextFormField, 'Email'), email);
      await tester.enterText(find.widgetWithText(TextFormField, 'Password'), password);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign Up'));
      await tester.pumpAndSettle(const Duration(seconds: 10));
      expect(find.text('Welcome back,'), findsOneWidget);

      // --- Open Creator Tools from the Profile tab ---
      await tester.tap(find.descendant(
        of: find.byType(BottomNavigationBar),
        matching: find.text('Profile'),
      ));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.widgetWithText(OutlinedButton, 'Creator Tools'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.widgetWithText(OutlinedButton, 'Creator Tools'));
      // Real Cloud Function round-trip: creatorCommissionDashboardSummary.
      await tester.pumpAndSettle(const Duration(seconds: 8));
      expect(find.text('Creator Tools'), findsOneWidget); // AppBar title

      // --- Real backend tier gate, not a broken or empty screen ---
      expect(find.text('The creator dashboard is a Creator Pro feature'), findsOneWidget);
      expect(find.text('Performance'), findsNothing); // tab bar hidden while gated
    },
  );
}
