import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wishlist_wizard_mobile/screens/connections_screen.dart';
import 'package:wishlist_wizard_mobile/services/services.dart';

class MockFirebaseFunctionsService extends Mock
    implements FirebaseFunctionsService {}

Widget wrapScreen(FirebaseFunctionsService functionsService) {
  return MaterialApp(
    home: ConnectionsScreen(functionsService: functionsService),
  );
}

void main() {
  late MockFirebaseFunctionsService functionsService;

  setUp(() {
    functionsService = MockFirebaseFunctionsService();
    when(() => functionsService.listConnections()).thenAnswer((_) async => []);
    when(() => functionsService.listPendingConnectionRequests())
        .thenAnswer((_) async => {'incoming': [], 'outgoing': []});
  });

  testWidgets('shows empty state when there are no connections', (tester) async {
    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    expect(find.text('Your Connections (0)'), findsOneWidget);
    expect(
      find.text('No connections yet. Find friends below to get started.'),
      findsOneWidget,
    );
  });

  testWidgets('shows connections and pending requests', (tester) async {
    when(() => functionsService.listConnections()).thenAnswer(
      (_) async => [
        {
          'connectionId': 'c1',
          'user': {'displayName': 'Alice', 'username': 'alice', 'photoURL': null},
        },
      ],
    );
    when(() => functionsService.listPendingConnectionRequests()).thenAnswer(
      (_) async => {
        'incoming': [
          {
            'connectionId': 'c2',
            'user': {'displayName': 'Bob', 'username': null, 'photoURL': null},
          },
        ],
        'outgoing': [
          {
            'connectionId': 'c3',
            'user': {'displayName': 'Carol', 'username': null, 'photoURL': null},
          },
        ],
      },
    );

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    expect(find.text('Your Connections (1)'), findsOneWidget);
    expect(find.text('Alice'), findsOneWidget);
    expect(find.text('Bob'), findsOneWidget);
    expect(find.text('Wants to connect'), findsOneWidget);
    expect(find.text('Carol'), findsOneWidget);
    expect(find.text('Request pending'), findsOneWidget);
  });

  testWidgets('accepting an incoming request calls the service and reloads', (
    tester,
  ) async {
    when(() => functionsService.listPendingConnectionRequests()).thenAnswer(
      (_) async => {
        'incoming': [
          {
            'connectionId': 'c2',
            'user': {'displayName': 'Bob', 'username': null, 'photoURL': null},
          },
        ],
        'outgoing': [],
      },
    );
    when(() => functionsService.respondToConnectionRequest('c2', true))
        .thenAnswer((_) async => {'success': true, 'status': 'accepted'});

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Accept'));
    await tester.pumpAndSettle();

    verify(() => functionsService.respondToConnectionRequest('c2', true)).called(1);
    verify(() => functionsService.listConnections()).called(2);
  });

  testWidgets('removing a connection calls the service and reloads', (tester) async {
    when(() => functionsService.listConnections()).thenAnswer(
      (_) async => [
        {
          'connectionId': 'c1',
          'user': {'displayName': 'Alice', 'username': 'alice', 'photoURL': null},
        },
      ],
    );
    when(() => functionsService.removeConnection('c1')).thenAnswer((_) async {});

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Remove connection'));
    await tester.pumpAndSettle();

    verify(() => functionsService.removeConnection('c1')).called(1);
  });

  testWidgets('searching finds a user and sends a connection request', (tester) async {
    when(() => functionsService.searchUsers('ali')).thenAnswer(
      (_) async => [
        {'id': 'u1', 'displayName': 'Alice Smith', 'username': 'alice', 'photoURL': null},
      ],
    );
    when(() => functionsService.sendConnectionRequest(targetUserId: 'u1', email: null))
        .thenAnswer((_) async => {'status': 'pending'});

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    await tester.enterText(
      find.widgetWithText(TextField, 'Search by name or username'),
      'ali',
    );
    await tester.pump(const Duration(milliseconds: 350));
    await tester.pumpAndSettle();

    expect(find.text('Alice Smith'), findsOneWidget);

    await tester.tap(find.text('Connect'));
    await tester.pumpAndSettle();

    verify(() => functionsService.sendConnectionRequest(targetUserId: 'u1', email: null))
        .called(1);
    expect(find.text('Connection request sent to Alice Smith.'), findsOneWidget);
  });

  testWidgets('sending a request by email calls the service', (tester) async {
    when(() => functionsService.sendConnectionRequest(targetUserId: null, email: 'friend@example.com'))
        .thenAnswer((_) async => {'status': 'pending'});

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextField, 'Email'), 'friend@example.com');
    await tester.tap(find.text('Send Request'));
    await tester.pumpAndSettle();

    verify(() => functionsService.sendConnectionRequest(targetUserId: null, email: 'friend@example.com'))
        .called(1);
    expect(find.text('Connection request sent to friend@example.com.'), findsOneWidget);
  });

  testWidgets('Send Request is a no-op for an invalid email', (tester) async {
    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextField, 'Email'), 'not-an-email');
    await tester.tap(find.text('Send Request'));
    await tester.pump();

    verifyNever(() => functionsService.sendConnectionRequest(
          targetUserId: any(named: 'targetUserId'),
          email: any(named: 'email'),
        ));
    expect(find.text('Enter a valid email address.'), findsOneWidget);
  });
}
