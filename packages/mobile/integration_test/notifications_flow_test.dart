import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wishlist_wizard_mobile/firebase_options.dart';
import 'package:wishlist_wizard_mobile/main.dart';

// Creating a wishlist fires a real "Wishlist Created" notification (see
// wishlists.ts's createWishlist -> createNotification call). Run against
// the real dev Firebase project on a real device/simulator.
//
// Also verifies the notification body-text fix: FirebaseNotification.
// fromFirestore only read data['message']/data['body'], but every
// createNotification() call site actually writes `content` -- every
// notification's body text rendered blank on mobile until that was
// fixed. Asserting the real message text (not just that *some* card
// renders) is what makes this test actually catch that class of bug
// again if it ever regresses.
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

  final email = 'e2e-mobile-notif-${DateTime.now().millisecondsSinceEpoch}@wishlist-wizard.test';
  const password = 'Test@Secure123Password';
  final wishlistName = 'E2E Notification Wishlist ${DateTime.now().millisecondsSinceEpoch}';

  Future<void> openNotificationsTab(WidgetTester tester) async {
    await tester.tap(find.descendant(
      of: find.byType(BottomNavigationBar),
      matching: find.text('Notifications'),
    ));
    // Real-time Firestore stream -- give it a moment to deliver the
    // just-created document.
    await tester.pumpAndSettle(const Duration(seconds: 8));
  }

  testWidgets(
    'creating a wishlist produces a real notification with readable title and body text',
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

      // --- Create a wishlist ---
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

      // --- The notification appears, unread, with a real, readable body ---
      await openNotificationsTab(tester);
      expect(find.text('Wishlist Created'), findsOneWidget);
      expect(
        find.text('Your wishlist "$wishlistName" has been created successfully'),
        findsOneWidget,
      );
      expect(find.text('Mark all as read'), findsOneWidget); // present => something is unread

      // --- Mark all as read ---
      await tester.tap(find.text('Mark all as read'));
      await tester.pumpAndSettle(const Duration(seconds: 5));
      expect(find.text('Mark all as read'), findsNothing); // gone => nothing left unread

      // --- Delete it ---
      await tester.tap(find.byTooltip('Delete notification'));
      await tester.pumpAndSettle(const Duration(seconds: 5));
      expect(find.text('No notifications yet'), findsOneWidget);
    },
  );
}
