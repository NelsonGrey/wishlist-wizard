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

// flutter_contacts's own platform channel name (SwiftFlutterContactsPlugin.swift
// / FlutterContactsPlugin.kt) — mocked directly rather than relying on the
// ambient "no handler registered" behavior, which doesn't reject the way
// MissingPluginException normally would in this test environment.
const _contactsChannel = MethodChannel('github.com/QuisApp/flutter_contacts');

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
    });

    testWidgets('a thrown platform error is caught and shown, dialog stays usable', (
      tester,
    ) async {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(_contactsChannel, (call) async {
            if (call.method == 'requestPermission') {
              throw PlatformException(code: 'test_error', message: 'boom');
            }
            return null;
          });

      await tester.pumpWidget(wrapDialog(functionsService));
      await tester.tap(find.text('Open'));
      await tester.pumpAndSettle();

      await tester.tap(find.text('Pick from Contacts'));
      await tester.pump();

      expect(find.textContaining('Could not open contacts'), findsOneWidget);
      // Dialog stays open and usable rather than crashing.
      expect(find.text('Invite Collaborator'), findsOneWidget);
    });

    testWidgets('permission denied shows a message without crashing', (
      tester,
    ) async {
      TestDefaultBinaryMessengerBinding.instance.defaultBinaryMessenger
          .setMockMethodCallHandler(_contactsChannel, (call) async {
            if (call.method == 'requestPermission') return false;
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
    });
  });
}
