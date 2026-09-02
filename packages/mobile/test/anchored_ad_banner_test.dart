import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:provider/provider.dart';
import 'package:wishlist_wizard_mobile/providers/providers.dart';
import 'package:wishlist_wizard_mobile/widgets/anchored_ad_banner.dart';

class MockSubscriptionProvider extends Mock implements SubscriptionProvider {}

Widget _wrap(SubscriptionProvider sub) {
  return MaterialApp(
    home: Scaffold(
      body: ChangeNotifierProvider<SubscriptionProvider>.value(
        value: sub,
        child: const AnchoredAdBanner(),
      ),
    ),
  );
}

void main() {
  testWidgets('free tier reserves a fixed-height slot', (tester) async {
    final sub = MockSubscriptionProvider();
    when(() => sub.tier).thenReturn('free');

    await tester.pumpWidget(_wrap(sub));
    await tester.pump();

    final container = tester.widget<Container>(
      find.descendant(
        of: find.byType(AnchoredAdBanner),
        matching: find.byType(Container),
      ),
    );
    expect(container.constraints?.maxHeight, 60);
  });

  testWidgets('paid tier collapses the slot', (tester) async {
    final sub = MockSubscriptionProvider();
    when(() => sub.tier).thenReturn('creator_pro');

    await tester.pumpWidget(_wrap(sub));
    await tester.pump();

    expect(find.byType(Container), findsNothing);
    expect(tester.getSize(find.byType(AnchoredAdBanner)).height, 0);
  });

  testWidgets('renders as free when no SubscriptionProvider is in the tree', (
    tester,
  ) async {
    await tester.pumpWidget(
      const MaterialApp(home: Scaffold(body: AnchoredAdBanner())),
    );
    await tester.pump();

    expect(
      find.descendant(
        of: find.byType(AnchoredAdBanner),
        matching: find.byType(Container),
      ),
      findsOneWidget,
    );
  });
}
