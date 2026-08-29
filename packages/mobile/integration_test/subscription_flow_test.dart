import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wishlist_wizard_mobile/firebase_options.dart';
import 'package:wishlist_wizard_mobile/main.dart';

// The Subscription screen for a fresh free-tier user, run against the
// real dev Firebase project on a real device/simulator. Doesn't attempt
// a real purchase -- IAP has no real store connection on a Simulator (or
// in this dev environment at all), so "Upgrade to X" deterministically
// hits IapService's own not-available fallback, which is itself real,
// correct behavior worth confirming end-to-end (not a mock standing in
// for it).
//
// This test is what actually found two real, previously-undiscovered
// bugs on its first run (both since fixed): billingPlans() returned a
// bare array while FirebaseFunctionsService.billingPlans() cast it
// straight to a Map, throwing and silently landing the whole screen in
// its "Unable to load subscription data" error state every single time;
// and billingStatus()'s usage object used field names
// (wishlistsOwned/priceAlertsActive/apiCallsThisMonth) that matched
// neither what web nor mobile actually read, so the Items/Price Tracking
// usage rows always showed 0 on both platforms regardless of real usage
// -- invisible to unit tests because their fixtures used the same wrong
// keys the UI code did, and invisible to a fresh-account test like this
// one specifically because 0 was coincidentally the correct value either
// way.
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

  final email = 'e2e-mobile-sub-${DateTime.now().millisecondsSinceEpoch}@wishlist-wizard.test';
  const password = 'Test@Secure123Password';

  testWidgets(
    'a fresh account shows the free tier with real usage, and upgrading reports not-available',
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

      // --- Open Manage Subscription from the Profile tab ---
      await tester.tap(find.descendant(
        of: find.byType(BottomNavigationBar),
        matching: find.text('Profile'),
      ));
      await tester.pumpAndSettle();
      await tester.tap(find.widgetWithText(ElevatedButton, 'Manage Subscription'));
      // Real Cloud Function round-trip (billingStatus + billingPlans).
      await tester.pumpAndSettle(const Duration(seconds: 8));
      expect(find.text('Subscription'), findsWidgets); // AppBar title

      // --- A brand-new account is really on the free tier with real usage ---
      expect(find.text('FREE'), findsOneWidget);
      expect(find.text('0 / 3'), findsOneWidget); // Wishlists
      expect(find.text('0 / 25'), findsOneWidget); // Items
      expect(find.text('0 / 5'), findsOneWidget); // Price Tracking

      // --- Tapping Upgrade correctly reports IAP as unavailable here ---
      await tester.scrollUntilVisible(
        find.textContaining('Upgrade to'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.textContaining('Upgrade to').first);
      await tester.pumpAndSettle(const Duration(seconds: 5));
      expect(find.textContaining('is not available for purchase right now'), findsOneWidget);
    },
  );
}
