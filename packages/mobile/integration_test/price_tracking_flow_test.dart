import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wishlist_wizard_mobile/firebase_options.dart';
import 'package:wishlist_wizard_mobile/main.dart';

// Creating a price alert against a real wishlist item, run against the
// real dev Firebase project on a real device/simulator. Covers the
// dropdown-of-real-items + auto-prefilled-target-price flow in
// _CreatePriceAlertSheet, which needs a real priced item to exist first
// (getAllWishlistItems() populates the dropdown; there's nothing to pick
// from otherwise).
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

  final email = 'e2e-mobile-price-${DateTime.now().millisecondsSinceEpoch}@wishlist-wizard.test';
  const password = 'Test@Secure123Password';
  final wishlistName = 'E2E Price Wishlist ${DateTime.now().millisecondsSinceEpoch}';
  final itemName = 'E2E Tracked Item ${DateTime.now().millisecondsSinceEpoch}';

  testWidgets(
    'creating a price alert against a real item shows it Active with the prefilled target',
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

      // --- Create a wishlist with one priced item ---
      await tester.tap(find.descendant(
        of: find.byType(BottomNavigationBar),
        matching: find.text('Wishlists'),
      ));
      await tester.pumpAndSettle(const Duration(seconds: 5));
      await tester.tap(find.byType(FloatingActionButton));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextField, 'Wishlist Name'), wishlistName);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Create'));
      await tester.pumpAndSettle(const Duration(seconds: 8));

      await tester.tap(find.text(wishlistName));
      await tester.pumpAndSettle(const Duration(seconds: 5));
      await tester.tap(find.byType(FloatingActionButton));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextField, 'Item name'), itemName);
      await tester.enterText(find.widgetWithText(TextField, 'Price (optional)'), '99.99');
      await tester.tap(find.widgetWithText(ElevatedButton, 'Add'));
      await tester.pumpAndSettle(const Duration(seconds: 8));
      expect(find.text(itemName), findsOneWidget);

      // --- Back to the Wishlists tab root, then open Price Tracking from Profile ---
      // FirebaseWishlistItemsScreen is a pushed full-screen route of its
      // own, covering MainNavigator's BottomNavigationBar entirely.
      await tester.tap(find.byTooltip('Back'));
      await tester.pumpAndSettle();
      await tester.tap(find.descendant(
        of: find.byType(BottomNavigationBar),
        matching: find.text('Profile'),
      ));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.widgetWithText(ListTile, 'Price Tracking'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.widgetWithText(ListTile, 'Price Tracking'));
      await tester.pumpAndSettle(const Duration(seconds: 8));
      expect(find.text('Price Tracking'), findsWidgets); // AppBar title
      expect(find.text('No price alerts set. Tap + to track an item.'), findsOneWidget);

      // --- Create the alert; the sheet's dropdown lists our real item ---
      await tester.tap(find.byType(FloatingActionButton));
      await tester.pumpAndSettle(const Duration(seconds: 5));
      expect(find.text('Add Price Alert'), findsOneWidget);
      expect(find.text(itemName), findsOneWidget); // pre-selected in the dropdown
      expect(
        find.widgetWithText(TextField, 'Target Price').evaluate().isNotEmpty,
        isTrue,
      );
      final targetField = tester.widget<TextField>(find.widgetWithText(TextField, 'Target Price'));
      expect(targetField.controller?.text, '89.99'); // 99.99 * 0.9, auto-prefilled

      await tester.tap(find.widgetWithText(ElevatedButton, 'Save'));
      await tester.pumpAndSettle(const Duration(seconds: 8));

      // --- It now shows in "Your Alerts" ---
      expect(find.text('Add Price Alert'), findsNothing); // sheet closed
      expect(find.text(itemName), findsOneWidget);
      expect(find.text('Current: \$99.99  •  Target: \$89.99'), findsOneWidget);
      expect(find.text('Active'), findsOneWidget);

      // --- Delete it ---
      await tester.tap(find.byTooltip('Delete price alert'));
      await tester.pumpAndSettle(const Duration(seconds: 8));
      expect(find.text('No price alerts set. Tap + to track an item.'), findsOneWidget);
    },
  );
}
