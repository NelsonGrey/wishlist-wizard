import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wishlist_wizard_mobile/firebase_options.dart';
import 'package:wishlist_wizard_mobile/main.dart';

// Calendar screen, run against the real dev Firebase project on a real
// device/simulator.
//
// Covers the "My Calendar" tab's own event CRUD (create/edit/delete) --
// fully native Flutter, no platform-view or OS-browser dependency, unlike
// the "Connections" tab's OAuth provider flows (Google/Outlook/Facebook
// launch a real ASWebAuthenticationSession/Custom Tab, which WidgetTester
// can't drive through to completion -- same category of real-device
// limitation as CardField/the camera/the native share sheet). Also
// verifies the Connections tab's real tier gate: calendar connections are
// a paid feature, so a fresh free-tier account should see the upgrade
// prompt, not a broken or empty screen.
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

  final email = 'e2e-mobile-cal-${DateTime.now().millisecondsSinceEpoch}@wishlist-wizard.test';
  const password = 'Test@Secure123Password';
  final eventTitle = 'E2E Reminder ${DateTime.now().millisecondsSinceEpoch}';
  final editedTitle = '$eventTitle (edited)';

  testWidgets(
    'creates, edits, and deletes a calendar event; Connections tab shows the real paid-feature gate',
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

      // --- Open Calendar from the Profile tab ---
      await tester.tap(find.descendant(
        of: find.byType(BottomNavigationBar),
        matching: find.text('Profile'),
      ));
      await tester.pumpAndSettle();
      await tester.scrollUntilVisible(
        find.widgetWithText(OutlinedButton, 'Calendar'),
        200,
        scrollable: find.byType(Scrollable).first,
      );
      await tester.tap(find.widgetWithText(OutlinedButton, 'Calendar'));
      // Real Cloud Function round-trips: events + connections.
      await tester.pumpAndSettle(const Duration(seconds: 8));
      expect(find.text('Calendar'), findsWidgets); // AppBar title

      // --- A fresh account starts with no events ---
      expect(find.text('No calendar events yet. Tap + to add one.'), findsOneWidget);

      // --- Create an event (default type: Reminder -> "Upcoming" section) ---
      await tester.tap(find.byType(FloatingActionButton));
      await tester.pumpAndSettle();
      expect(find.text('Add Event'), findsOneWidget);
      await tester.enterText(find.widgetWithText(TextField, 'Title'), eventTitle);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Save'));
      await tester.pumpAndSettle(const Duration(seconds: 8));

      expect(find.text('Upcoming'), findsOneWidget);
      expect(find.text(eventTitle), findsOneWidget);

      // --- Edit it ---
      await tester.tap(find.text(eventTitle));
      await tester.pumpAndSettle();
      expect(find.text('Edit Event'), findsOneWidget);
      // widgetWithText matches a TextField's *label*, not its live
      // controller value -- check the prefilled value directly instead.
      final titleField = tester.widget<TextField>(find.widgetWithText(TextField, 'Title'));
      expect(titleField.controller?.text, eventTitle);
      await tester.enterText(find.widgetWithText(TextField, 'Title'), editedTitle);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Save'));
      await tester.pumpAndSettle(const Duration(seconds: 8));

      expect(find.text(editedTitle), findsOneWidget);
      expect(find.text(eventTitle), findsNothing);

      // --- Delete it ---
      await tester.tap(find.byTooltip('Delete calendar event'));
      await tester.pumpAndSettle(const Duration(seconds: 8));
      expect(find.text('No calendar events yet. Tap + to add one.'), findsOneWidget);

      // --- Connections tab shows the real paid-feature gate for a free account ---
      await tester.tap(find.widgetWithText(Tab, 'Connections'));
      await tester.pumpAndSettle(const Duration(seconds: 5));
      expect(find.text('Calendar connections are a paid feature'), findsOneWidget);
    },
  );
}
