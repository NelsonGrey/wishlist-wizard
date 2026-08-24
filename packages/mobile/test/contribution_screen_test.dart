import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wishlist_wizard_mobile/screens/contribution_screen.dart';
import 'package:wishlist_wizard_mobile/services/services.dart';

class MockFirebaseFunctionsService extends Mock
    implements FirebaseFunctionsService {}

Widget wrapScreen(
  FirebaseFunctionsService functionsService, {
  String itemId = 'item-1',
  String itemTitle = 'Nice Blender',
  double? itemPrice = 100,
}) {
  return MaterialApp(
    home: ContributionScreen(
      itemId: itemId,
      itemTitle: itemTitle,
      itemPrice: itemPrice,
      functionsService: functionsService,
    ),
  );
}

void main() {
  late MockFirebaseFunctionsService functionsService;

  setUp(() {
    functionsService = MockFirebaseFunctionsService();
  });

  group('contributionLimit', () {
    test('caps at the remaining amount when below the max', () {
      expect(contributionLimit(100, 60), 40);
    });

    test('caps at the global max when remaining exceeds it', () {
      expect(contributionLimit(20000, 0), 10000);
    });

    test('returns 0 once the goal is met', () {
      expect(contributionLimit(100, 100), 0);
      expect(contributionLimit(100, 150), 0);
    });
  });

  testWidgets('shows a clear message when Stripe is not configured', (tester) async {
    when(() => functionsService.getStripeConfig()).thenAnswer((_) async => {'publishableKey': null});

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    expect(
      find.text('Payments unavailable — Stripe is not configured for this environment.'),
      findsOneWidget,
    );
  });

  testWidgets('shows progress and contributors once loaded', (tester) async {
    when(() => functionsService.getStripeConfig())
        .thenAnswer((_) async => {'publishableKey': 'pk_test_123'});
    when(() => functionsService.getGroupGiftSummary('item-1')).thenAnswer(
      (_) async => {
        'itemId': 'item-1',
        'targetAmount': 100,
        'totalAmount': 40,
        'participants': [
          {
            'id': 'c1',
            'amount': 40,
            'contributionAmount': 40,
            'isAnonymous': false,
            'user': {'displayName': 'Alice'},
          },
        ],
      },
    );

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    expect(find.text('Raised: \$40.00'), findsOneWidget);
    expect(find.text('Goal: \$100.00'), findsOneWidget);
    expect(find.text('\$60.00 still needed'), findsOneWidget);
    expect(find.text('Contributors (1)'), findsOneWidget);
    expect(find.text('Alice (\$40)'), findsOneWidget);
    expect(find.text('Contribute'), findsOneWidget);
  });

  testWidgets('shows the unavailable card when the gift is fully funded', (tester) async {
    when(() => functionsService.getStripeConfig())
        .thenAnswer((_) async => {'publishableKey': 'pk_test_123'});
    when(() => functionsService.getGroupGiftSummary('item-1')).thenAnswer(
      (_) async => {'itemId': 'item-1', 'targetAmount': 100, 'totalAmount': 100, 'participants': []},
    );

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    expect(find.text('Goal reached! 🎉'), findsOneWidget);
    expect(
      find.text('This group gift is fully funded or below the minimum contribution threshold.'),
      findsOneWidget,
    );
    expect(find.widgetWithText(ElevatedButton, 'Contribute'), findsNothing);
  });

  testWidgets('rejects an out-of-range amount before touching the card field', (tester) async {
    when(() => functionsService.getStripeConfig())
        .thenAnswer((_) async => {'publishableKey': 'pk_test_123'});
    when(() => functionsService.getGroupGiftSummary('item-1')).thenAnswer(
      (_) async => {'itemId': 'item-1', 'targetAmount': 100, 'totalAmount': 0, 'participants': []},
    );

    tester.view.physicalSize = const Size(800, 2000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    await tester.enterText(find.byType(TextField).first, '99999');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Contribute'));
    await tester.pump();

    expect(
      find.text('Enter an amount between \$0.50 and \$100.00.'),
      findsOneWidget,
    );
    verifyNever(() => functionsService.createGroupPaymentIntent(
          itemId: any(named: 'itemId'),
          amount: any(named: 'amount'),
          message: any(named: 'message'),
          isAnonymous: any(named: 'isAnonymous'),
        ));
  });
}
