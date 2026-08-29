import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:provider/provider.dart';
import 'package:wishlist_wizard_mobile/providers/providers.dart';
import 'package:wishlist_wizard_mobile/services/services.dart';
import 'package:wishlist_wizard_mobile/widgets/invite_collaborator_dialog.dart';

class MockFirebaseFunctionsService extends Mock
    implements FirebaseFunctionsService {}

// flutter_contacts's own platform channel name (shared by every sub-API,
// including permissions.request) — mocked directly rather than relying on
// the ambient "no handler registered" behavior, which doesn't reject the
// way MissingPluginException normally would in this test environment.
const _contactsChannel = MethodChannel('flutter_contacts');

// The Provider must wrap MaterialApp, not sit inside `home:` — showDialog
// uses the root navigator by default, whose overlay attaches above `home`
// in the tree, so a Provider nested inside `home:` isn't visible to it.
// This mirrors main.dart's actual MultiProvider(child: MaterialApp(...))
// structure.
Widget wrapDialog(FirebaseFunctionsService functionsService) {
  return ChangeNotifierProvider<FirebaseWishlistProvider>(
    create: (_) => FirebaseWishlistProvider(functionsService: functionsService),
    child: MaterialApp(
      home: Builder(
        builder: (context) => Scaffold(
          body: Center(
            child: ElevatedButton(
              onPressed: () => showDialog<void>(
                context: context,
                builder: (_) =>
                    const InviteCollaboratorDialog(wishlistId: 'wl-1'),
              ),
              child: const Text('Open'),
            ),
          ),
        ),
      ),
    ),
  );
}

void main() {
  late MockFirebaseFunctionsService functionsService;

  setUp(() {
    functionsService = MockFirebaseFunctionsService();
  });

  testWidgets('renders email field, role dropdown, and contacts button', (
    tester,
  ) async {
    await tester.pumpWidget(wrapDialog(functionsService));
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();

    expect(find.text('Invite Collaborator'), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
    expect(find.text('Pick from Contacts'), findsOneWidget);
    expect(find.text('Send Invite'), findsOneWidget);
  });

  testWidgets('sending an invite by typed email calls the provider and closes', (
    tester,
  ) async {
    when(
      () => functionsService.inviteCollaborator(
        'wl-1',
        'friend@example.com',
        'editor',
      ),
    ).thenAnswer((_) async => {'status': 'pending'});

    await tester.pumpWidget(wrapDialog(functionsService));
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'friend@example.com');
    await tester.tap(find.text('Send Invite'));
    // Not pumpAndSettle: the success SnackBar's multi-second display timer
    // never "settles" within a bounded wait. A couple of frames is enough
    // for the mocked (near-instant) invite call and dialog pop to land.
    await tester.pump();
    await tester.pump(const Duration(milliseconds: 300));

    verify(
      () => functionsService.inviteCollaborator(
        'wl-1',
        'friend@example.com',
        'editor',
      ),
    ).called(1);
    // Dialog closes on success.
    expect(find.text('Invite Collaborator'), findsNothing);
    expect(find.text('Invitation sent to friend@example.com'), findsOneWidget);
  });

  testWidgets('Send Invite is a no-op for an invalid email', (tester) async {
    await tester.pumpWidget(wrapDialog(functionsService));
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField), 'not-an-email');
    await tester.tap(find.text('Send Invite'));
    await tester.pump();

    verifyNever(() => functionsService.inviteCollaborator(any(), any(), any()));
    expect(find.text('Invite Collaborator'), findsOneWidget);
  });

  group('contact picker platform failures', () {
    tearDown(() {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(_contactsChannel, null);
      debugDefaultTargetPlatformOverride = null;
    });

    // _pickFromContacts() only requests a permission on Android -- iOS's
    // showPicker never needs one (see the widget's own doc comment). The
    // permission-request call goes straight through the mocked channel;
    // debugDefaultTargetPlatformOverride is what makes the widget's own
    // `defaultTargetPlatform == TargetPlatform.android` branch take it.
    testWidgets('Android: permission denied shows a message without crashing', (
      tester,
    ) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(_contactsChannel, (call) async {
            if (call.method == 'permissions.request') return 'denied';
            return null;
          });

      await tester.pumpWidget(wrapDialog(functionsService));
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Pick from Contacts'));
      await tester.pump();

      expect(
        find.text('Contacts permission was not granted.'),
        findsOneWidget,
      );
      expect(find.text('Invite Collaborator'), findsOneWidget);

      // The test framework asserts every foundation debug var is back to
      // null as soon as the test body returns -- before tearDown runs --
      // so it has to be cleared here too, not just in tearDown.
      debugDefaultTargetPlatformOverride = null;
    });

    // Explicit iOS override -- flutter_test's TestWidgetsFlutterBinding
    // defaults defaultTargetPlatform to android with no override at all
    // (regardless of the actual host OS), which would otherwise silently
    // route this into the Android permission branch above instead of
    // reaching showPicker. On iOS, this widget skips straight to
    // showPicker(), which checks the *real* host OS (dart:io
    // Platform.isAndroid/isIOS, not the mockable defaultTargetPlatform)
    // before ever touching the channel, and throws
    // PlatformException('not_available', ...) on any other host, including
    // this test's actual macOS/Linux/Windows CI runner. That's a real
    // exception this widget's catch block must handle, not a contrived one
    // -- and it's also why the picker's *success* path (a contact actually
    // returned) can't be covered by a widget test at all, same limitation
    // already documented for mobile_scanner/google_mobile_ads elsewhere in
    // this suite.
    testWidgets('a thrown platform error is caught and shown, dialog stays usable', (
      tester,
    ) async {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      await tester.pumpWidget(wrapDialog(functionsService));
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Pick from Contacts'));
      await tester.pump();

      expect(find.textContaining('Could not open contacts'), findsOneWidget);
      // Dialog stays open and usable rather than crashing.
      expect(find.text('Invite Collaborator'), findsOneWidget);

      debugDefaultTargetPlatformOverride = null;
    });
  });
}
