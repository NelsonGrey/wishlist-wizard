import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wishlist_wizard_mobile/screens/price_tracking_screen.dart';
import 'package:wishlist_wizard_mobile/services/services.dart';

class MockFirebaseFunctionsService extends Mock
    implements FirebaseFunctionsService {}

Widget wrapScreen(FirebaseFunctionsService functionsService) {
  return MaterialApp(
    home: PriceTrackingScreen(functionsService: functionsService),
  );
}

void main() {
  late MockFirebaseFunctionsService functionsService;

  setUp(() {
    functionsService = MockFirebaseFunctionsService();
    when(() => functionsService.getPriceAlerts()).thenAnswer((_) async => []);
    when(() => functionsService.getPriceDrops()).thenAnswer((_) async => []);
  });

  testWidgets('shows empty state for alerts and drops', (tester) async {
    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    expect(find.text('No price alerts set. Tap + to track an item.'), findsOneWidget);

    await tester.tap(find.text('Price Drops'));
    await tester.pumpAndSettle();
    expect(find.text('No significant price drops found yet.'), findsOneWidget);
  });

  testWidgets('shows a price alert with current/target price and status', (tester) async {
    when(() => functionsService.getPriceAlerts()).thenAnswer(
      (_) async => [
        {
          'id': 'a1',
          'itemId': 'item-1',
          'targetPrice': '45.00',
          'currentPrice': '50.00',
          'notified': false,
          'item': {'title': 'Nice Blender', 'price': '50.00'},
        },
      ],
    );

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    expect(find.text('Nice Blender'), findsOneWidget);
    expect(find.text('Current: \$50.00  •  Target: \$45.00'), findsOneWidget);
    expect(find.text('Active'), findsOneWidget);
  });

  testWidgets('deleting an alert calls the service and reloads', (tester) async {
    when(() => functionsService.getPriceAlerts()).thenAnswer(
      (_) async => [
        {
          'id': 'a1',
          'itemId': 'item-1',
          'targetPrice': '45.00',
          'currentPrice': '50.00',
          'notified': false,
          'item': {'title': 'Nice Blender', 'price': '50.00'},
        },
      ],
    );
    when(() => functionsService.deletePriceAlert('a1')).thenAnswer((_) async {});

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Delete price alert'));
    await tester.pumpAndSettle();

    verify(() => functionsService.deletePriceAlert('a1')).called(1);
    verify(() => functionsService.getPriceAlerts()).called(2);
  });

  testWidgets('shows a price drop card', (tester) async {
    when(() => functionsService.getPriceDrops()).thenAnswer(
      (_) async => [
        {
          'id': 'd1',
          'title': 'Air Fryer',
          'store': 'Acme',
          'previousPrice': '100.00',
          'currentPrice': '80.00',
          'percentDrop': 20,
        },
      ],
    );

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Price Drops'));
    await tester.pumpAndSettle();

    expect(find.text('Air Fryer'), findsOneWidget);
    expect(find.text('20% off'), findsOneWidget);
  });

  testWidgets('creating a price alert calls the service and dismisses the sheet', (
    tester,
  ) async {
    when(() => functionsService.getAllWishlistItems()).thenAnswer(
      (_) async => [
        {'id': 'item-1', 'title': 'Nice Blender', 'price': '50.00'},
      ],
    );
    when(() => functionsService.createPriceAlert(itemId: 'item-1', targetPrice: 45.0))
        .thenAnswer((_) async => {'id': 'a1'});

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Add price alert'));
    await tester.pumpAndSettle();

    expect(find.text('Add Price Alert'), findsOneWidget);
    // Prefilled to 90% of the current price (50.00 -> 45.00).
    expect(find.widgetWithText(TextField, '45.00'), findsOneWidget);

    await tester.tap(find.widgetWithText(ElevatedButton, 'Save'));
    await tester.pumpAndSettle();

    verify(() => functionsService.createPriceAlert(itemId: 'item-1', targetPrice: 45.0))
        .called(1);
    expect(find.text('Add Price Alert'), findsNothing);
  });

  testWidgets('rejects a target price at or above the current price', (tester) async {
    when(() => functionsService.getAllWishlistItems()).thenAnswer(
      (_) async => [
        {'id': 'item-1', 'title': 'Nice Blender', 'price': '50.00'},
      ],
    );

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Add price alert'));
    await tester.pumpAndSettle();

    await tester.enterText(find.widgetWithText(TextField, '45.00'), '60');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Save'));
    await tester.pump();

    verifyNever(() => functionsService.createPriceAlert(
          itemId: any(named: 'itemId'),
          targetPrice: any(named: 'targetPrice'),
        ));
    expect(find.text('Target price should be below the current price.'), findsOneWidget);
  });
}
