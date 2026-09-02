import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wishlist_wizard_mobile/screens/shared_wishlist_screen.dart';
import 'package:wishlist_wizard_mobile/services/services.dart';

class MockFirebaseFunctionsService extends Mock
    implements FirebaseFunctionsService {}

Widget _wrap(FirebaseFunctionsService service) => MaterialApp(
      home: SharedWishlistScreen(shareId: 'abc123', functionsService: service),
    );

void main() {
  late MockFirebaseFunctionsService service;

  setUp(() {
    service = MockFirebaseFunctionsService();
  });

  testWidgets('renders the wishlist name and items read-only', (tester) async {
    when(() => service.getSharedWishlist('abc123')).thenAnswer(
      (_) async => {
        'wishlist': {'name': "Jo's Birthday", 'description': 'ideas'},
        'items': [
          {
            'id': '1',
            'title': 'Board game',
            'price': 39.99,
            'currency': 'USD',
            'store': 'GameCo',
          },
          {'id': '2', 'title': 'Socks', 'purchasedByUserId': 'x'},
        ],
      },
    );

    await tester.pumpWidget(_wrap(service));
    await tester.pumpAndSettle();

    expect(find.text("Jo's Birthday"), findsOneWidget);
    expect(find.text('Board game'), findsOneWidget);
    expect(find.text('Socks'), findsOneWidget);
    expect(find.text('2 items'), findsOneWidget);
    // Read-only: no edit / popup / add affordances.
    expect(find.byType(PopupMenuButton), findsNothing);
    expect(find.byType(FloatingActionButton), findsNothing);
  });

  testWidgets('shows an unavailable message on error', (tester) async {
    when(() => service.getSharedWishlist('abc123'))
        .thenThrow(Exception('private'));

    await tester.pumpWidget(_wrap(service));
    await tester.pumpAndSettle();

    expect(
      find.text('This shared wishlist is unavailable or private.'),
      findsOneWidget,
    );
    expect(find.widgetWithText(ElevatedButton, 'Retry'), findsOneWidget);
  });
}
