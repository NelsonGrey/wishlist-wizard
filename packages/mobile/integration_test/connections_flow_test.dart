import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wishlist_wizard_mobile/firebase_options.dart';
import 'package:wishlist_wizard_mobile/main.dart';

// Mobile equivalent of the web app's Tier 3 connections flows (T3.3-T3.5),
// run against the real dev Firebase project on a real device/simulator.
// Also exercises the flutter_contacts 2.x migration's permission/picker
// path indirectly (ConnectionsScreen shares the same pattern as
// InviteCollaboratorDialog, already unit-tested) by reaching the screen at
// all -- this screen was unreachable before that fix (see
// wishlist_flow_test.dart's commit history) since it's the exact file
// migrated.
//
// A mobile app can only be signed in as one user at a time, unlike the web
// suite's parallel browser contexts -- so this test signs up both users up
// front, sends the request as A, switches to B via sign-out/sign-in
// (not sign-up again) to respond, then switches back to A to verify and
// clean up. sendConnectionRequest only creates a real pending connection
// when the target email already resolves to a real account (see
// connections.ts's getUserByEmail branch), so B must be registered before
// A sends the request to B's email.
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

  final runId = DateTime.now().millisecondsSinceEpoch;
  final emailA = 'e2e-mobile-a-$runId@wishlist-wizard.test';
  final emailB = 'e2e-mobile-b-$runId@wishlist-wizard.test';
  const password = 'Test@Secure123Password';

  Future<void> signUp(WidgetTester tester, String email) async {
    await tester.pumpWidget(const WishlistWizardApp());
    await tester.pumpAndSettle(const Duration(seconds: 5));
    await tester.tap(find.text("Don't have an account? Sign up"));
    await tester.pumpAndSettle();
    await tester.enterText(find.widgetWithText(TextFormField, 'Email'), email);
    await tester.enterText(find.widgetWithText(TextFormField, 'Password'), password);
    await tester.tap(find.widgetWithText(ElevatedButton, 'Sign Up'));
    await tester.pumpAndSettle(const Duration(seconds: 10));
    expect(find.text('Welcome back,'), findsOneWidget);
  }

  Future<void> signIn(WidgetTester tester, String email) async {
    await tester.pumpWidget(const WishlistWizardApp());
    await tester.pumpAndSettle(const Duration(seconds: 5));
    // Sign In is the default mode (no toggle needed).
    await tester.enterText(find.widgetWithText(TextFormField, 'Email'), email);
    await tester.enterText(find.widgetWithText(TextFormField, 'Password'), password);
    await tester.tap(find.widgetWithText(ElevatedButton, 'Sign In'));
    await tester.pumpAndSettle(const Duration(seconds: 10));
    expect(find.text('Welcome back,'), findsOneWidget);
  }

  // ConnectionsScreen (and any other tab-content screen reached via
  // Navigator.push) is a full-screen route of its own, covering
  // MainNavigator's BottomNavigationBar entirely -- pop back to the tab
  // view first, or "Profile" wouldn't be there to tap at all.
  Future<void> popToTabRoot(WidgetTester tester) async {
    while (find.byTooltip('Back').evaluate().isNotEmpty) {
      await tester.tap(find.byTooltip('Back').first);
      await tester.pumpAndSettle();
    }
  }

  Future<void> signOut(WidgetTester tester) async {
    await popToTabRoot(tester);
    await tester.tap(find.descendant(
      of: find.byType(BottomNavigationBar),
      matching: find.text('Profile'),
    ));
    await tester.pumpAndSettle();
    // ProfileScreen's content is below the fold on real devices (that's
    // the bug this session's ProfileScreen scroll fix addressed) -- the
    // Logout button isn't reachable to tap() until actually scrolled into
    // view, same as a real user would need to.
    await tester.scrollUntilVisible(
      find.widgetWithText(ElevatedButton, 'Logout'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.widgetWithText(ElevatedButton, 'Logout'));
    await tester.pumpAndSettle(const Duration(seconds: 5));
  }

  Future<void> openConnectionsScreen(WidgetTester tester) async {
    await tester.tap(find.descendant(
      of: find.byType(BottomNavigationBar),
      matching: find.text('Profile'),
    ));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.widgetWithText(OutlinedButton, 'Connections'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.widgetWithText(OutlinedButton, 'Connections'));
    await tester.pumpAndSettle(const Duration(seconds: 8));
    expect(find.text('Connections'), findsWidgets); // AppBar title
  }

  testWidgets(
    'A sends a connection request to B by email, B accepts, then A removes it',
    (tester) async {
      // --- B signs up first, so A's request resolves to a real account ---
      await signUp(tester, emailB);
      await signOut(tester);

      // --- A signs up and sends the request ---
      await signUp(tester, emailA);
      await openConnectionsScreen(tester);

      await tester.enterText(find.widgetWithText(TextField, 'Email'), emailB);
      await tester.tap(find.widgetWithText(ElevatedButton, 'Send Request'));
      // Real Cloud Function round-trip (getUserByEmail + Firestore write).
      await tester.pumpAndSettle(const Duration(seconds: 8));

      expect(find.text('Request pending'), findsOneWidget);
      await signOut(tester);

      // --- B signs back in and accepts ---
      await signIn(tester, emailB);
      await openConnectionsScreen(tester);
      await tester.pump(const Duration(seconds: 2)); // let _loadAll's stream settle

      expect(find.text('Wants to connect'), findsOneWidget);
      await tester.tap(find.byTooltip('Accept'));
      await tester.pumpAndSettle(const Duration(seconds: 8));

      expect(find.text('Wants to connect'), findsNothing);
      expect(find.text('Your Connections (1)'), findsOneWidget);
      await signOut(tester);

      // --- A signs back in, verifies, and removes the connection ---
      await signIn(tester, emailA);
      await openConnectionsScreen(tester);
      await tester.pump(const Duration(seconds: 2));

      expect(find.text('Your Connections (1)'), findsOneWidget);
      await tester.tap(find.byTooltip('Remove connection'));
      await tester.pumpAndSettle(const Duration(seconds: 8));

      expect(find.text('Your Connections (0)'), findsOneWidget);
    },
  );
}
