import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wishlist_wizard_mobile/firebase_options.dart';
import 'package:wishlist_wizard_mobile/main.dart';

// Mobile equivalent of the web app's Tier 3 achievements flows (T3.1/T3.2):
// signing up earns "Welcome Aboard" and creating a first wishlist earns
// "First Wish", both computed server-side on read (not a client-side
// guess) -- see packages/functions/src/api/achievements.ts. Run against
// the real dev Firebase project on a real device/simulator.
//
// Also verifies markAchievementsDirtySafely's cache invalidation: without
// it, getUserAchievements serves a cached result for up to an hour
// (STALE_AFTER_MS), so First Wish wouldn't show as earned right after
// creating the wishlist -- it would take an achievements-screen visit
// from well over an hour later to see it.
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

  final email = 'e2e-mobile-ach-${DateTime.now().millisecondsSinceEpoch}@wishlist-wizard.test';
  const password = 'Test@Secure123Password';
  final wishlistName = 'E2E Achievement Wishlist ${DateTime.now().millisecondsSinceEpoch}';

  // ConnectionsScreen (and any other tab-content screen reached via
  // Navigator.push) is a full-screen route of its own, covering
  // MainNavigator's BottomNavigationBar entirely -- pop back to the tab
  // view first, same helper as connections_flow_test.dart.
  Future<void> popToTabRoot(WidgetTester tester) async {
    while (find.byTooltip('Back').evaluate().isNotEmpty) {
      await tester.tap(find.byTooltip('Back').first);
      await tester.pumpAndSettle();
    }
  }

  // True if the given achievement's Card shows the "earned" check mark
  // (non-tiered achievements only -- Welcome Aboard/First Wish both are).
  bool isEarned(WidgetTester tester, String achievementName) {
    final card = find.ancestor(
      of: find.text(achievementName),
      matching: find.byType(Card),
    );
    return find.descendant(
      of: card,
      matching: find.byIcon(Icons.check_circle),
    ).evaluate().isNotEmpty;
  }

  Future<void> openAchievementsScreen(WidgetTester tester) async {
    await popToTabRoot(tester);
    await tester.tap(find.descendant(
      of: find.byType(BottomNavigationBar),
      matching: find.text('Profile'),
    ));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.widgetWithText(ListTile, 'Achievements'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.widgetWithText(ListTile, 'Achievements'));
    // Real Cloud Function round-trip (computed server-side on read).
    await tester.pumpAndSettle(const Duration(seconds: 8));
    expect(find.text('Achievements'), findsWidgets); // AppBar title
  }

  testWidgets(
    'signing up earns Welcome Aboard; creating a first wishlist earns First Wish immediately',
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

      // --- Welcome Aboard is earned immediately, First Wish is not yet ---
      await openAchievementsScreen(tester);
      await tester.scrollUntilVisible(
        find.text('Welcome Aboard'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(isEarned(tester, 'Welcome Aboard'), isTrue);
      await tester.scrollUntilVisible(
        find.text('First Wish'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(isEarned(tester, 'First Wish'), isFalse);

      // --- Create the first wishlist ---
      await popToTabRoot(tester);
      await tester.tap(find.descendant(
        of: find.byType(BottomNavigationBar),
        matching: find.text('Wishlists'),
      ));
      await tester.pumpAndSettle(const Duration(seconds: 5));
      await tester.tap(find.byType(FloatingActionButton));
      await tester.pumpAndSettle();
      expect(find.byType(AlertDialog), findsOneWidget);
      await tester.enterText(find.widgetWithText(TextField, 'Wishlist Name'), wishlistName);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Create'));
      await tester.pumpAndSettle(const Duration(seconds: 8));

      // --- First Wish is earned right away too, not up to an hour later --
      // proves markAchievementsDirtySafely's cache invalidation actually
      // works: without it, this would still read the cached "not earned"
      // result from the achievements-screen visit above.
      await openAchievementsScreen(tester);
      await tester.scrollUntilVisible(
        find.text('First Wish'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(isEarned(tester, 'First Wish'), isTrue);
    },
  );
}
