import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wishlist_wizard_mobile/screens/privacy_settings_screen.dart';
import 'package:wishlist_wizard_mobile/services/services.dart';

class MockFirebaseFunctionsService extends Mock
    implements FirebaseFunctionsService {}

Widget _wrap(FirebaseFunctionsService service) => MaterialApp(
      home: PrivacySettingsScreen(functionsService: service),
    );

void main() {
  late MockFirebaseFunctionsService service;

  setUp(() {
    service = MockFirebaseFunctionsService();
  });

  testWidgets('loads and reflects the current defaults', (tester) async {
    when(() => service.getPrivacyDefaults()).thenAnswer(
      (_) async => {
        'defaultWishlistVisibility': 'friends',
        'defaultItemVisibility': 'private',
        'allowComments': false,
        'allowReservations': true,
        'requireApproval': true,
      },
    );

    await tester.pumpWidget(_wrap(service));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Require approval to view'),
      200,
      scrollable: find.byType(Scrollable).first,
    );

    final commentsSwitch = tester.widget<SwitchListTile>(
      find.widgetWithText(SwitchListTile, 'Allow comments'),
    );
    expect(commentsSwitch.value, isFalse);
    final approvalSwitch = tester.widget<SwitchListTile>(
      find.widgetWithText(SwitchListTile, 'Require approval to view'),
    );
    expect(approvalSwitch.value, isTrue);
  });

  testWidgets('Save PUTs the edited settings', (tester) async {
    when(() => service.getPrivacyDefaults()).thenAnswer(
      (_) async => {
        'defaultWishlistVisibility': 'private',
        'defaultItemVisibility': 'private',
        'allowComments': true,
        'allowReservations': true,
        'requireApproval': false,
      },
    );
    when(() => service.updatePrivacyDefaults(any()))
        .thenAnswer((invocation) async =>
            invocation.positionalArguments.first as Map<String, dynamic>);

    await tester.pumpWidget(_wrap(service));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Allow comments'),
      200,
      scrollable: find.byType(Scrollable).first,
    );

    await tester.tap(find.text('Allow comments'));
    await tester.pumpAndSettle();
    await tester.scrollUntilVisible(
      find.text('Save'),
      200,
      scrollable: find.byType(Scrollable).first,
    );
    await tester.tap(find.text('Save'));
    await tester.pumpAndSettle();

    final captured = verify(
      () => service.updatePrivacyDefaults(captureAny()),
    ).captured.single as Map<String, dynamic>;
    expect(captured['allowComments'], isFalse);
    expect(captured['defaultWishlistVisibility'], 'private');
    expect(find.text('Privacy settings saved.'), findsOneWidget);
  });

  testWidgets('shows an error state with Retry when loading fails', (
    tester,
  ) async {
    when(() => service.getPrivacyDefaults()).thenThrow(Exception('nope'));

    await tester.pumpWidget(_wrap(service));
    await tester.pumpAndSettle();

    expect(find.text('Could not load your privacy settings.'), findsOneWidget);
    expect(find.widgetWithText(ElevatedButton, 'Retry'), findsOneWidget);
  });
}
