import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wishlist_wizard_mobile/firebase_options.dart';
import 'package:wishlist_wizard_mobile/main.dart';

// The mobile equivalent of the web app's Tier 1 wishlist CRUD flows
// (T1.4-T1.10, T1.18), run against the real dev Firebase project on a real
// device/simulator rather than mocks -- this is the layer that catches
// wiring bugs a widget test with a mocked service can't (see this repo's
// history of App Check / security-rule / router bugs that unit tests never
// would have caught). Each run signs up a fresh dynamic user (same pattern
// as packages/web/e2e/tier-1-basic.spec.ts) rather than depending on a
// pre-provisioned TEST_EMAIL/TEST_PASSWORD account, so it's self-contained
// and always runnable.
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

  tearDownAll(() async {
    // Best-effort cleanup: delete the account this test created so dev
    // doesn't accumulate throwaway users. Wishlist/item documents are left
    // for backend TTL/cleanup, same as the web E2E suite's own approach.
    try {
      await fb.FirebaseAuth.instance.currentUser?.delete();
    } catch (_) {
      // Ignore -- best-effort only, not worth failing the run over.
    }
  });

  final email = 'e2e-mobile-${DateTime.now().millisecondsSinceEpoch}@wishlist-wizard.test';
  const password = 'Test@Secure123Password';
  final wishlistName = 'E2E Wishlist ${DateTime.now().millisecondsSinceEpoch}';
  const itemName = 'E2E Trail Backpack';

  testWidgets(
    'sign up, create a wishlist, add an item, mark it purchased, then delete both',
    (tester) async {
      await tester.pumpWidget(const WishlistWizardApp());
      await tester.pumpAndSettle(const Duration(seconds: 5));

      // --- Sign up ---
      await tester.tap(find.text("Don't have an account? Sign up"));
      await tester.pumpAndSettle();

      await tester.enterText(find.widgetWithText(TextFormField, 'Email'), email);
      await tester.enterText(find.widgetWithText(TextFormField, 'Password'), password);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign Up'));
      // Real network round-trip to Firebase Auth -- give it real time.
      await tester.pumpAndSettle(const Duration(seconds: 10));

      expect(find.text('Welcome back,'), findsOneWidget);

      // --- Navigate to Wishlists tab ---
      await tester.tap(find.text('Wishlists'));
      await tester.pumpAndSettle(const Duration(seconds: 5));
      expect(find.text('Firebase Wishlists'), findsOneWidget);

      // --- Create a wishlist ---
      await tester.tap(find.byType(FloatingActionButton));
      await tester.pumpAndSettle();
      expect(find.text('Create Wishlist'), findsOneWidget);

      await tester.enterText(find.widgetWithText(TextField, 'Wishlist Name'), wishlistName);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Create'));
      // Real Firestore write + the wishlist stream picking it back up.
      await tester.pumpAndSettle(const Duration(seconds: 8));

      await tester.scrollUntilVisible(
        find.text(wishlistName),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      expect(find.text(wishlistName), findsOneWidget);

      // --- Open it and add an item ---
      await tester.tap(find.text(wishlistName));
      await tester.pumpAndSettle(const Duration(seconds: 5));
      expect(find.text(wishlistName), findsWidgets); // now the AppBar title too

      await tester.tap(find.byType(FloatingActionButton));
      await tester.pumpAndSettle();
      expect(find.text('Add Item'), findsOneWidget);

      await tester.enterText(find.widgetWithText(TextField, 'Item name'), itemName);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Add'));
      await tester.pumpAndSettle(const Duration(seconds: 8));

      expect(find.text(itemName), findsOneWidget);

      // --- Mark it purchased via the popup menu ---
      await tester.tap(find.byType(PopupMenuButton<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Mark purchased'));
      await tester.pumpAndSettle(const Duration(seconds: 5));

      final purchasedTitle = tester.widget<Text>(find.text(itemName));
      expect(purchasedTitle.style?.decoration, TextDecoration.lineThrough);

      // --- Delete the item ---
      // Unlike wishlist deletion below, item deletion has no confirmation
      // dialog -- the popup menu action deletes immediately.
      await tester.tap(find.byType(PopupMenuButton<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Delete'));
      await tester.pumpAndSettle(const Duration(seconds: 5));
      expect(find.text(itemName), findsNothing);

      // --- Back out and delete the wishlist itself ---
      await tester.pageBack();
      await tester.pumpAndSettle(const Duration(seconds: 5));

      await tester.scrollUntilVisible(
        find.text(wishlistName),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.byType(PopupMenuButton<String>).first);
      await tester.pumpAndSettle();
      await tester.tap(find.text('Delete'));
      await tester.pumpAndSettle();
      expect(find.text('Delete Wishlist'), findsOneWidget); // confirmation dialog
      await tester.tap(find.widgetWithText(ElevatedButton, 'Delete'));
      await tester.pumpAndSettle(const Duration(seconds: 5));
      expect(find.text(wishlistName), findsNothing);
    },
  );
}
