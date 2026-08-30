import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wishlist_wizard_mobile/firebase_options.dart';
import 'package:wishlist_wizard_mobile/main.dart';

// Creator Tools screen for an actual Creator Pro account, run against the
// real dev Firebase project on a real device/simulator.
//
// Complements creator_dashboard_flow_test.dart, which only covers the
// free-tier upgrade-prompt gate: Creator Pro has no free trial reachable
// from a fresh sign-up, so a real subscription would have to go through
// Stripe Checkout to exercise this any other way. Instead this logs in as
// a fixed, pre-provisioned fixture account
// (e2e-mobile-creator-tier@wishlist-wizard.test) whose dev-only
// `subscriptions/{uid}` document was set to tier=creator/status=active
// directly via the Firestore REST API -- a disposable dev fixture, not a
// real subscription, and never done against staging/prod.
//
// Doesn't attempt "Set up payouts": that launches a real Stripe Connect
// onboarding link in an external browser (same class of limitation as the
// OAuth calendar-provider connections and the native purchase sheet).
// What's real and deterministic to verify: all four tabs load and render
// real backend data (or its correct empty state) without crashing, now
// that the dashboard is actually reachable past the tier gate.
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

  const email = 'e2e-mobile-creator-tier@wishlist-wizard.test';
  const password = 'Test@Secure123Password';

  testWidgets(
    'Creator Tools renders all four tabs for a real Creator Pro account',
    (tester) async {
      // --- Log in (fixture account already exists) ---
      await tester.pumpWidget(const WishlistWizardApp());
      await tester.pumpAndSettle(const Duration(seconds: 5));
      expect(find.text('Sign In'), findsOneWidget); // login is the default mode
      await tester.enterText(find.widgetWithText(TextFormField, 'Email'), email);
      await tester.enterText(find.widgetWithText(TextFormField, 'Password'), password);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
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
      // Real Cloud Function round-trips: commission summary, affiliate
      // stats, commission ledger, adjustments (all in parallel).
      await tester.pumpAndSettle(const Duration(seconds: 10));
      expect(find.text('Creator Tools'), findsOneWidget); // AppBar title

      // --- Past the gate: real tab bar, not the upgrade prompt ---
      expect(find.text('The creator dashboard is a Creator Pro feature'), findsNothing);
      expect(find.text('Performance'), findsOneWidget);
      expect(find.text('Commissions'), findsWidgets);
      expect(find.text('Payouts'), findsWidgets);
      expect(find.text('Adjustments'), findsWidgets);

      // --- Performance tab (default): real stat cards, zeroed for a
      // fixture account with no actual tracked clicks ---
      expect(find.text('Total clicks'), findsOneWidget);
      expect(find.text('0'), findsWidgets); // clicks + conversions cards
      expect(find.text('No clicks recorded yet.'), findsOneWidget);

      // --- Commissions tab: real per-state breakdown, empty ledger ---
      await tester.tap(find.widgetWithText(Tab, 'Commissions'));
      await tester.pumpAndSettle();
      for (final state in ['Pending', 'Approved', 'Payable', 'Paid', 'Reversed']) {
        expect(find.text(state), findsOneWidget);
      }
      expect(
        find.textContaining('fills in once a retailer report is reconciled'),
        findsOneWidget,
      );

      // --- Payouts tab: real Stripe Connect status + threshold progress ---
      await tester.tap(find.widgetWithText(Tab, 'Payouts'));
      await tester.pumpAndSettle();
      expect(find.text('Not started'), findsOneWidget); // stripeAccountStatus: not_created
      expect(find.widgetWithText(ElevatedButton, 'Set up payouts'), findsOneWidget);
      expect(find.text('Threshold progress'), findsOneWidget);
      expect(find.text('No payouts yet.'), findsOneWidget);

      // --- Adjustments tab: real empty state ---
      await tester.tap(find.widgetWithText(Tab, 'Adjustments'));
      await tester.pumpAndSettle();
      expect(find.text('No adjustments on your account.'), findsOneWidget);
    },
  );
}
