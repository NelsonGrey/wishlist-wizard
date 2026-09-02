import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wishlist_wizard_mobile/firebase_options.dart';
import 'package:wishlist_wizard_mobile/main.dart';

// Group gifting / Contribute screen, run against the real dev Firebase
// project on a real device/simulator.
//
// Doesn't fill the CardField or actually confirm a payment: CardField is a
// native platform view (UIKit/Android native card input embedded via
// PlatformView, not a normal Flutter text field), which isn't something
// WidgetTester's enterText()/tap() can drive -- same category of
// real-device limitation already documented for the camera-dependent
// barcode scanner and the native OS share sheet. What's real and
// deterministic to verify instead: the screen's actual backend calls
// (getStripeConfig, getGroupGiftSummary) return real data and render it
// correctly, and the client-side validation that runs *before* Stripe is
// ever touched -- amount-range checking and the "complete card details"
// guard, which _submit() checks before calling createGroupPaymentIntent
// or Stripe.instance.confirmPayment, so exercising it doesn't risk a real
// payment attempt.
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

  final email = 'e2e-mobile-contrib-${DateTime.now().millisecondsSinceEpoch}@wishlist-wizard.test';
  const password = 'Test@Secure123Password';
  final wishlistName = 'E2E Group Gift Wishlist ${DateTime.now().millisecondsSinceEpoch}';
  const itemName = 'E2E Group Gift Item';

  Future<void> popToTabRoot(WidgetTester tester) async {
    while (find.byTooltip('Back').evaluate().isNotEmpty) {
      await tester.tap(find.byTooltip('Back').first);
      await tester.pumpAndSettle();
    }
  }

  testWidgets(
    'Contribute screen loads real group-gift data and validates before touching Stripe',
    (tester) async {
      // --- Sign up, create a wishlist with a priced item ---
      await tester.pumpWidget(const WishlistWizardApp());
      await tester.pumpAndSettle(const Duration(seconds: 5));
      await tester.tap(find.text("Don't have an account? Sign up"));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextFormField, 'Email'), email);
      await tester.enterText(find.widgetWithText(TextFormField, 'Password'), password);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Sign Up'));
      await tester.pumpAndSettle(const Duration(seconds: 10));
      expect(find.textContaining('Welcome back,'), findsOneWidget);

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

      await tester.scrollUntilVisible(
        find.text(wishlistName),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.text(wishlistName));
      await tester.pumpAndSettle(const Duration(seconds: 5));

      await tester.tap(find.byType(FloatingActionButton));
      await tester.pumpAndSettle();
      await tester.enterText(find.widgetWithText(TextField, 'Item name'), itemName);
      await tester.enterText(find.widgetWithText(TextField, 'Price (optional)'), '150.00');
      await tester.tap(find.widgetWithText(ElevatedButton, 'Add'));
      await tester.pumpAndSettle(const Duration(seconds: 8));
      expect(find.text(itemName), findsOneWidget);

      // --- Open Contribute from the item's popup menu ---
      await tester.tap(find.byType(PopupMenuButton<String>));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Contribute'));
      // Real Cloud Function round-trips: getStripeConfig + getGroupGiftSummary.
      await tester.pumpAndSettle(const Duration(seconds: 8));
      expect(find.text('Contribute to Gift'), findsOneWidget); // AppBar title

      // --- Real backend data rendered correctly ---
      expect(find.text(itemName), findsOneWidget);
      expect(find.text('\$150.00'), findsOneWidget); // item card's own price line
      expect(find.text('Goal: \$150.00'), findsOneWidget);
      expect(find.text('Raised: \$0.00'), findsOneWidget); // fresh item, no contributions yet
      expect(find.textContaining('still needed'), findsOneWidget);

      // --- Client-side validation runs before Stripe is ever touched ---
      // The amount field is the first TextField on the form (declared
      // before the "Message (optional)" field).
      await tester.enterText(find.byType(TextField).first, '25.00');
      await tester.tap(find.widgetWithText(ElevatedButton, 'Contribute'));
      await tester.pumpAndSettle();
      expect(find.text('Enter your complete card details.'), findsOneWidget);

      // Out-of-range amount is caught by the same guard, before card
      // completeness is even checked.
      await tester.enterText(find.byType(TextField).first, '999999');
      await tester.tap(find.widgetWithText(ElevatedButton, 'Contribute'));
      await tester.pumpAndSettle();
      expect(find.textContaining('Enter an amount between'), findsOneWidget);

      await popToTabRoot(tester);
    },
  );
}
