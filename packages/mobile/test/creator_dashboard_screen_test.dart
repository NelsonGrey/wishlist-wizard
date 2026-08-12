import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:url_launcher_platform_interface/link.dart';
import 'package:url_launcher_platform_interface/url_launcher_platform_interface.dart';
import 'package:wishlist_wizard_mobile/screens/creator_dashboard_screen.dart';
import 'package:wishlist_wizard_mobile/services/services.dart';

class MockFirebaseFunctionsService extends Mock
    implements FirebaseFunctionsService {}

class _FakeUrlLauncher extends UrlLauncherPlatform {
  @override
  LinkDelegate? get linkDelegate => null;

  @override
  Future<bool> canLaunch(String url) async => true;

  @override
  Future<bool> launch(
    String url, {
    required bool useSafariVC,
    required bool useWebView,
    required bool enableJavaScript,
    required bool enableDomStorage,
    required bool universalLinksOnly,
    required Map<String, String> headers,
    String? webOnlyWindowName,
  }) async =>
      true;

  @override
  Future<bool> launchUrl(String url, LaunchOptions options) async => true;
}

Widget wrapScreen(FirebaseFunctionsService functionsService) {
  return MaterialApp(
    home: CreatorDashboardScreen(functionsService: functionsService),
  );
}

Map<String, dynamic> _summary({String status = 'enabled', double clawback = 0}) {
  return {
    'byState': {
      'Pending': {'count': 1, 'totalUsd': 5.0},
      'Approved': {'count': 0, 'totalUsd': 0.0},
      'Payable': {'count': 2, 'totalUsd': 30.0},
      'Paid': {'count': 3, 'totalUsd': 90.0},
      'Reversed': {'count': 0, 'totalUsd': 0.0},
    },
    'payoutReadiness': {
      'payoutsEnabled': status == 'enabled',
      'minimumPayoutThresholdUsd': 25.0,
      'outstandingClawbackBalanceUsd': clawback,
      'stripeAccountStatus': status,
    },
  };
}

void main() {
  late MockFirebaseFunctionsService functionsService;

  setUp(() {
    functionsService = MockFirebaseFunctionsService();
    when(() => functionsService.getAffiliateStats()).thenAnswer(
      (_) async => {
        'stats': {'totalClicks': 0, 'totalConversions': 0, 'topPrograms': []},
      },
    );
    when(() => functionsService.getCreatorCommissionLedger()).thenAnswer((_) async => []);
    when(() => functionsService.getCreatorAdjustments()).thenAnswer((_) async => []);
    when(() => functionsService.getCreatorPayoutHistory()).thenAnswer((_) async => []);
  });

  testWidgets('shows an upgrade prompt on a 403 and skips the other calls', (tester) async {
    when(() => functionsService.getCreatorCommissionSummary())
        .thenThrow(Exception('API request to /creator/commission-summary failed (403): denied'));

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    expect(find.text('The creator dashboard is a Creator Pro feature'), findsOneWidget);
    verifyNever(() => functionsService.getAffiliateStats());
    verifyNever(() => functionsService.getCreatorCommissionLedger());
  });

  testWidgets('renders all four tabs once the summary loads', (tester) async {
    when(() => functionsService.getCreatorCommissionSummary())
        .thenAnswer((_) async => _summary());

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Commissions'));
    await tester.pumpAndSettle();
    expect(find.text('\$30.00'), findsOneWidget); // Payable state card
    expect(find.text('No commission activity yet. This fills in once a retailer report is reconciled against your tracked links.'), findsOneWidget);

    await tester.tap(find.text('Payouts'));
    await tester.pumpAndSettle();
    expect(find.text('Ready for payouts'), findsOneWidget);
    expect(find.text('Set up payouts'), findsNothing); // already enabled

    await tester.tap(find.text('Adjustments'));
    await tester.pumpAndSettle();
    expect(find.text('No adjustments on your account.'), findsOneWidget);
  });

  testWidgets('shows retailer breakdown and stats on the Performance tab', (tester) async {
    when(() => functionsService.getCreatorCommissionSummary())
        .thenAnswer((_) async => _summary());
    when(() => functionsService.getAffiliateStats()).thenAnswer(
      (_) async => {
        'stats': {
          'totalClicks': 10,
          'totalConversions': 2,
          'topPrograms': [
            {'program': 'Amazon Associates', 'clicks': 8, 'conversions': 2, 'revenue': 40.0},
          ],
        },
      },
    );

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    expect(find.text('10'), findsOneWidget);
    expect(find.text('Amazon Associates'), findsOneWidget);
    expect(find.text('20.0%'), findsOneWidget);
  });

  testWidgets('setting up payouts calls create then onboarding-link in order', (tester) async {
    final originalPlatform = UrlLauncherPlatform.instance;
    UrlLauncherPlatform.instance = _FakeUrlLauncher();
    addTearDown(() => UrlLauncherPlatform.instance = originalPlatform);

    when(() => functionsService.getCreatorCommissionSummary())
        .thenAnswer((_) async => _summary(status: 'not_created'));
    when(() => functionsService.createCreatorConnectAccount()).thenAnswer((_) async {});
    when(() => functionsService.getCreatorConnectOnboardingLink(
          returnUrl: any(named: 'returnUrl'),
          refreshUrl: any(named: 'refreshUrl'),
        )).thenAnswer((_) async => {'url': 'https://connect.stripe.com/setup/test'});

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Payouts'));
    await tester.pumpAndSettle();

    expect(find.text('Set up payouts'), findsOneWidget);
    await tester.tap(find.text('Set up payouts'));
    await tester.pumpAndSettle();

    verifyInOrder([
      () => functionsService.createCreatorConnectAccount(),
      () => functionsService.getCreatorConnectOnboardingLink(
            returnUrl: any(named: 'returnUrl'),
            refreshUrl: any(named: 'refreshUrl'),
          ),
    ]);
  });

  testWidgets('shows the clawback warning when a balance is outstanding', (tester) async {
    when(() => functionsService.getCreatorCommissionSummary())
        .thenAnswer((_) async => _summary(status: 'restricted', clawback: 4.5));

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Payouts'));
    await tester.pumpAndSettle();

    expect(find.text('Action needed'), findsOneWidget);
    expect(
      find.text('\$4.50 owed from a return or correction will be deducted from your next payout.'),
      findsOneWidget,
    );
  });
}
