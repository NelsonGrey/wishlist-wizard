import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wishlist_wizard_mobile/firebase_options.dart';
import 'package:wishlist_wizard_mobile/main.dart';

// The Subscription screen for a fresh free-tier user, run against the
// real dev Firebase project on a real device/simulator.
//
// Doesn't tap "Upgrade to X": this app has real products configured in
// App Store Connect, so on a real device/simulator that resolves to a
// genuine StoreKit purchase flow (a native system sheet), not
// IapService's own "not available" fallback -- there's no store product
// catalog missing here to short-circuit on, unlike this repo's other
// real-device-limited flows (the camera-dependent barcode scanner, the
// native OS share sheet). Completing or even reliably dismissing that
// system UI isn't something to force through in an automated test, so
// this only verifies what's real and deterministic: the tier/usage data
// itself, and that the upgrade options render with their real prices.
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
    await fb.FirebaseAuth.instance.signOut();
  });

  final email = 'e2e-mobile-sub-${DateTime.now().millisecondsSinceEpoch}@wishlist-wizard.test';
  const password = 'Test@Secure123Password';

  testWidgets(
    'a fresh account shows the real free-tier status, usage, and upgrade options',
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
      expect(find.textContaining('Welcome back,'), findsOneWidget);

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

      // --- Real upgrade options render with real, correctly-mapped prices ---
      // (billingPlans() previously threw before this ever rendered at all.)
      await tester.scrollUntilVisible(
        find.textContaining('Upgrade to').first,
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text('Starter'), findsOneWidget);
      expect(find.text('\$3.99'), findsOneWidget);
      expect(find.widgetWithText(ElevatedButton, 'Upgrade to Starter'), findsOneWidget);
    },
  );
}
