import 'package:firebase_auth/firebase_auth.dart' as fb;
import 'package:firebase_core/firebase_core.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:wishlist_wizard_mobile/firebase_options.dart';
import 'package:wishlist_wizard_mobile/main.dart';

import 'lib/beats.dart';
import 'lib/cinematic.dart';
import 'lib/persona_data.dart';

const personaId = String.fromEnvironment('PERSONA');
const testEmail = String.fromEnvironment('TEST_EMAIL');
const testPassword = String.fromEnvironment('TEST_PASSWORD');

Finder nav(String label) => find.descendant(
  of: find.byType(BottomNavigationBar),
  matching: find.text(label),
);

Future<void> signIn() async {
  if (testEmail.isEmpty || testPassword.isEmpty) {
    throw StateError('TEST_EMAIL and TEST_PASSWORD are required');
  }
  await fb.FirebaseAuth.instance.signInWithEmailAndPassword(
    email: testEmail,
    password: testPassword,
  );
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  setUpAll(() async {
    if (Firebase.apps.isEmpty) {
      try {
        await Firebase.initializeApp(
          options: DefaultFirebaseOptions.currentPlatform,
        );
      } on FirebaseException catch (error) {
        // On iOS the native Firebase SDK can already have configured the
        // default app from GoogleService-Info.plist before the Dart registry
        // has caught up. That state is safe to reuse for the capture test.
        if (error.code != 'duplicate-app') rethrow;
      }
    }
    await fb.FirebaseAuth.instance.signOut();
  });

  testWidgets('persona cinematic tour', (tester) async {
    if (!videoPersonas.containsKey(personaId)) {
      throw StateError('Unknown PERSONA=$personaId');
    }
    await signIn();
    await tester.pumpWidget(const WishlistWizardApp());
    await tester.pumpAndSettle(const Duration(seconds: 8));
    debugPrint('WW_CAPTURE_READY');
    // The host starts simctl recording when it sees the marker above.
    await tester.pump(const Duration(seconds: 5));
    final beats = VideoBeats()..start();
    final c = CinematicDriver(tester, beats);
    await c.installCaption();

    if (personaId == 'marcus') {
      beats.mark('m1');
      await c.caption('Keep the gear. Lose the full price.');
      await c.tapSlow(nav('Wishlists'));
      await c.tapSlow(find.text('Camera Kit').first);
      beats.mark('m2');
      await c.caption('Save the product link in seconds.');
      await c.tapSlow(find.byType(FloatingActionButton));
      final urlField = find.widgetWithText(TextField, 'Product URL (optional)');
      await tester.ensureVisible(urlField);
      await tester.pumpAndSettle();
      await c.typeSlow(
        urlField,
        'https://example.com/products/mirrorless-camera-body',
        cps: 32,
      );
      await c.hold(const Duration(seconds: 2));
      await c.tapSlow(find.widgetWithText(TextButton, 'Cancel'));
      await tester.pageBack();
      await tester.pumpAndSettle();
      await c.tapSlow(nav('Profile'));
      beats.mark('m3');
      await c.caption('Set your target. We watch the price.');
      await tester.scrollUntilVisible(find.text('Price Tracking'), 160);
      await c.tapSlow(find.text('Price Tracking'));
      await c.hold(const Duration(seconds: 4));
      await tester.pageBack();
      await tester.pumpAndSettle();
      beats.mark('m4');
      await c.caption('Get the alert when the price drops.');
      await c.tapSlow(nav('Notifications'));
      await c.hold(const Duration(seconds: 4));
      beats.mark('m5');
      await c.caption('Confirm the drop before you buy.');
      await c.tapSlow(nav('Profile'));
      await tester.scrollUntilVisible(find.text('Price Tracking'), 160);
      await c.tapSlow(find.text('Price Tracking'));
      await c.tapSlow(find.text('Price Drops'));
      await c.hold(const Duration(seconds: 4));
      await tester.pageBack();
      await tester.pumpAndSettle();
      beats.mark('m6');
      await c.caption('The retailer is one tap away.');
      await c.tapSlow(nav('Wishlists'));
      await c.tapSlow(find.text('Camera Kit').first);
      await c.tapSlow(find.text('Mirrorless Camera Body').first);
      await c.hold(const Duration(seconds: 4));
      beats.mark('m7');
    } else if (personaId == 'priya_mobile') {
      beats.mark('p6');
      await c.caption('Money comes in — you get notified.');
      await c.tapSlow(nav('Notifications'));
      await c.hold(const Duration(seconds: 4));
      beats.mark('p7');
      await c.caption('Watch it fund itself.');
      await c.tapSlow(nav('Wishlists'));
      await c.tapSlow(find.text('Baby Shower — Team Gift').first);
      await c.hold(const Duration(seconds: 5));
      beats.mark('p8');
      await c.caption('Then it is done. For real this time.');
      await c.hold(const Duration(seconds: 5));
      beats.mark('p9');
    } else {
      // The seeded identity is used so the achievements/connections beats are
      // populated. This films the fast sign-in flow instead of creating an
      // empty throwaway account that would make the rest of the story false.
      beats.mark('r1');
      await c.caption('From sign-in to your wishlist in seconds.');
      await c.hold(const Duration(seconds: 5));
      beats.mark('r2');
      await c.caption('One list. One link.');
      await c.tapSlow(nav('Wishlists'));
      await c.tapSlow(find.text('My Birthday 🎂').first);
      await c.hold(const Duration(seconds: 3));
      beats.mark('r3');
      await c.caption('Add anything — snap a photo or paste a link.');
      await c.tapSlow(find.byType(FloatingActionButton));
      await c.hold(const Duration(seconds: 5));
      await tester.pageBack();
      await tester.pumpAndSettle();
      beats.mark('r4');
      await c.caption("Send it to everyone who asks 'what do you want?'");
      await c.hold(const Duration(seconds: 4));
      await tester.pageBack();
      await tester.pumpAndSettle();
      await c.tapSlow(nav('Profile'));
      beats.mark('r5');
      await c.caption('And it is a little bit fun.');
      await tester.scrollUntilVisible(find.text('Achievements'), 160);
      await c.tapSlow(find.text('Achievements'));
      await c.hold(const Duration(seconds: 4));
      await tester.pageBack();
      await tester.pumpAndSettle();
      beats.mark('r6');
      await c.caption('Add your people. See their lists too.');
      await tester.scrollUntilVisible(find.text('Connections'), 160);
      await c.tapSlow(find.text('Connections'));
      await c.hold(const Duration(seconds: 5));
      beats.mark('r7');
    }
    await c.caption(null);
    await beats.flush(personaId);
    c.dispose();
  });
}
