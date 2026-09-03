import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:provider/provider.dart';
import 'package:wishlist_wizard_mobile/providers/providers.dart';
import 'package:wishlist_wizard_mobile/screens/subscription_screen.dart';
import 'package:wishlist_wizard_mobile/services/iap_service.dart';
import 'package:wishlist_wizard_mobile/services/services.dart';

class MockFirebaseFunctionsService extends Mock implements FirebaseFunctionsService {}

const _fullStatus = {
  'tier': 'starter',
  'status': 'active',
  'billingCycle': 'monthly',
  'renewalDate': '2026-12-25T00:00:00.000Z',
  // Real field names from billingStatus() -- wishlists/itemsTotal (used
  // here previously) were never what the backend actually returns, which
  // made every usage-row test below pass without ever verifying the real
  // key mapping.
  'usage': {'wishlistsOwned': 4, 'totalItems': 20, 'priceTrackedItems': 9},
  'limits': {'maxWishlists': 5, 'maxItemsPerWishlist': 100, 'maxPriceTrackedItems': 10},
};
const _plansResponse = {
  'available': [
    // Plus is the one self-serve upgrade above Starter.
    {'tier': 'plus', 'name': 'Plus', 'monthlyPrice': 7.99, 'annualPrice': 79.0, 'annualSavings': 16.88},
    // Creator/Business are built but waitlist-gated (COMING_SOON_TIERS) and
    // the backend marks them comingSoon. On mobile the paywall drops them
    // entirely — the "Coming soon" waitlist lives on the web only, because a
    // plan shown on the App Store paywall with no StoreKit product behind it
    // fails review (Guideline 3.1.1). Kept in this fixture to prove the
    // screen filters them out.
    {'tier': 'creator', 'name': 'Creator Pro', 'monthlyPrice': 14.99, 'annualPrice': 149.0, 'annualSavings': 30.88, 'comingSoon': true},
    {'tier': 'business', 'name': 'Business', 'monthlyPrice': 29.99, 'annualPrice': 299.0, 'annualSavings': 60.88, 'comingSoon': true},
    // Contact-sales Enterprise tier (no IAP product) — also filtered out.
    {'tier': 'enterprise', 'name': 'Enterprise', 'monthlyPrice': null, 'annualPrice': null, 'comingSoon': true},
  ],
};

Widget wrapScreen(FirebaseFunctionsService functionsService) {
  return MaterialApp(
    home: MultiProvider(
      providers: [
        ChangeNotifierProvider<SubscriptionProvider>(
          create: (_) => SubscriptionProvider(functionsService: functionsService),
        ),
        // IapService can't be meaningfully mocked (no interface seam), but
        // its real un-initialized state (isAvailable: false, empty store
        // product catalog) is itself safe to render with -- purchase()'s
        // "product not found in _storeProducts" branch is pure/short-
        // circuiting and never touches the real platform SDK.
        ChangeNotifierProvider<IapService>.value(value: IapService()),
      ],
      child: const SubscriptionScreen(),
    ),
  );
}

// The upgrade options section renders below the tier/usage/billing-cycle
// cards, past the default test viewport's fold -- ListView only mounts
// elements near the visible viewport, so find() can't see "Business" (or
// anything below it) until the list is actually scrolled there, same as a
// real user would need to scroll on a real device.
Future<void> scrollToUpgradeOptions(WidgetTester tester) {
  return tester.scrollUntilVisible(find.text('Plus'), 200, scrollable: find.byType(Scrollable));
}

void main() {
  late MockFirebaseFunctionsService functionsService;

  setUp(() {
    functionsService = MockFirebaseFunctionsService();
  });

  testWidgets('shows a loading indicator before data resolves', (tester) async {
    when(() => functionsService.billingStatus()).thenAnswer((_) => Completer<Map<String, dynamic>>().future);
    when(() => functionsService.billingPlans()).thenAnswer((_) => Completer<Map<String, dynamic>>().future);

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pump();

    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });

  testWidgets('shows an error state with Retry when loading fails', (tester) async {
    when(() => functionsService.billingStatus()).thenThrow(Exception('network error'));
    when(() => functionsService.billingPlans()).thenAnswer((_) async => _plansResponse);

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    expect(find.text('Unable to load subscription data'), findsOneWidget);
    final retryButton = find.widgetWithText(ElevatedButton, 'Retry');
    expect(retryButton, findsOneWidget);

    when(() => functionsService.billingStatus()).thenAnswer((_) async => _fullStatus);
    await tester.tap(retryButton);
    await tester.pumpAndSettle();

    expect(find.text('STARTER'), findsOneWidget); // reloaded successfully
  });

  group('loaded state', () {
    setUp(() {
      when(() => functionsService.billingStatus()).thenAnswer((_) async => _fullStatus);
      when(() => functionsService.billingPlans()).thenAnswer((_) async => _plansResponse);
    });

    testWidgets('renders the current tier, status, and renewal date', (tester) async {
      await tester.pumpWidget(wrapScreen(functionsService));
      await tester.pumpAndSettle();

      expect(find.text('STARTER'), findsOneWidget);
      expect(find.text('Status: active • monthly'), findsOneWidget);
      expect(find.text('Renews: 2026-12-25'), findsOneWidget);
    });

    testWidgets('shows "No renewal date available" when there is none', (tester) async {
      when(() => functionsService.billingStatus()).thenAnswer(
        (_) async => {..._fullStatus, 'renewalDate': null},
      );

      await tester.pumpWidget(wrapScreen(functionsService));
      await tester.pumpAndSettle();

      expect(find.text('Renews: No renewal date available'), findsOneWidget);
    });

    testWidgets('renders usage rows with used/limit counts', (tester) async {
      await tester.pumpWidget(wrapScreen(functionsService));
      await tester.pumpAndSettle();

      expect(find.text('4 / 5'), findsOneWidget); // wishlists
      expect(find.text('20 / 100'), findsOneWidget); // items
      expect(find.text('9 / 10'), findsOneWidget); // price tracking
    });

    testWidgets('renders an upgrade option card with its Stripe-sourced price as a placeholder', (tester) async {
      await tester.pumpWidget(wrapScreen(functionsService));
      await tester.pumpAndSettle();
      await scrollToUpgradeOptions(tester);

      expect(find.text('Plus'), findsOneWidget);
      expect(find.widgetWithText(ElevatedButton, 'Upgrade to Plus'), findsOneWidget);
    });

    testWidgets('never offers the Enterprise tier (no IAP product)', (tester) async {
      await tester.pumpWidget(wrapScreen(functionsService));
      await tester.pumpAndSettle();
      await scrollToUpgradeOptions(tester);

      expect(find.text('Enterprise'), findsNothing);
      expect(find.widgetWithText(ElevatedButton, 'Upgrade to Enterprise'), findsNothing);
    });

    testWidgets('shows annual savings only when the Annual billing cycle chip is selected', (tester) async {
      await tester.pumpWidget(wrapScreen(functionsService));
      await tester.pumpAndSettle();

      // "Annual" chip is above the fold (billing-cycle card); tap it before
      // scrolling down to the upgrade options section below it.
      await tester.tap(find.widgetWithText(ChoiceChip, 'Annual'));
      await tester.pumpAndSettle();
      await scrollToUpgradeOptions(tester);

      expect(find.textContaining('Save \$16.88 annually'), findsOneWidget);
    });

    testWidgets('does not show annual savings on the default Monthly cycle', (tester) async {
      await tester.pumpWidget(wrapScreen(functionsService));
      await tester.pumpAndSettle();
      await scrollToUpgradeOptions(tester);

      expect(find.textContaining('Save \$16.88 annually'), findsNothing);
    });

    testWidgets('tapping Upgrade records a not-available error via IapService (no store product loaded)', (tester) async {
      await tester.pumpWidget(wrapScreen(functionsService));
      await tester.pumpAndSettle();
      await scrollToUpgradeOptions(tester);

      await tester.tap(find.widgetWithText(ElevatedButton, 'Upgrade to Plus'));
      await tester.pumpAndSettle();

      expect(find.textContaining('is not available for purchase right now'), findsOneWidget);
    });

    testWidgets('hides Restore purchases when IAP is not available', (tester) async {
      await tester.pumpWidget(wrapScreen(functionsService));
      await tester.pumpAndSettle();

      expect(find.text('Restore purchases'), findsNothing);
    });

    testWidgets('pull-to-refresh reloads subscription data', (tester) async {
      await tester.pumpWidget(wrapScreen(functionsService));
      await tester.pumpAndSettle();
      clearInteractions(functionsService);
      when(() => functionsService.billingStatus()).thenAnswer((_) async => _fullStatus);
      when(() => functionsService.billingPlans()).thenAnswer((_) async => _plansResponse);

      await tester.fling(find.byType(ListView), const Offset(0, 300), 1000);
      await tester.pumpAndSettle();

      verify(() => functionsService.billingStatus()).called(1);
    });

    testWidgets('waitlist-gated and contact-sales tiers never appear on the paywall (App Store Guideline 3.1.1)', (tester) async {
      // Tall viewport so the whole ListView mounts at once.
      tester.view.physicalSize = const Size(1200, 5000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(wrapScreen(functionsService));
      await tester.pumpAndSettle();

      // Only Plus (the one purchasable upgrade above Starter) is offered.
      expect(find.widgetWithText(ElevatedButton, 'Upgrade to Plus'), findsOneWidget);

      // Creator/Business (waitlist-gated) and Enterprise (contact-sales, no
      // IAP product) must not be shown here in any form — a plan on the
      // paywall with no StoreKit product behind it reads as routing around
      // StoreKit and fails review.
      for (final absent in const ['Creator Pro', 'Business', 'Enterprise', 'Coming soon', 'Notify me when it launches']) {
        expect(find.text(absent), findsNothing, reason: '"$absent" must not be on the paywall');
      }
    });

    testWidgets('shows the auto-renew disclosure and Terms of Use / Privacy Policy links', (tester) async {
      tester.view.physicalSize = const Size(1200, 5000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(wrapScreen(functionsService));
      await tester.pumpAndSettle();

      expect(find.textContaining('charged to your Apple ID'), findsOneWidget);
      expect(find.textContaining('turn off auto-renew'), findsOneWidget);
      expect(find.textContaining('Account Settings'), findsOneWidget);
      expect(find.text('Terms of Use'), findsOneWidget);
      expect(find.text('Privacy Policy'), findsOneWidget);
    });
  });
}
