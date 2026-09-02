import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:provider/provider.dart';
import 'package:wishlist_wizard_mobile/models/models.dart';
import 'package:wishlist_wizard_mobile/providers/providers.dart';
import 'package:wishlist_wizard_mobile/screens/profile_screen.dart';
import 'package:wishlist_wizard_mobile/theme/app_theme.dart';
import 'package:wishlist_wizard_mobile/theme/design_tokens.dart';

class MockAuthProvider extends Mock implements AuthProvider {}

class MockSubscriptionProvider extends Mock implements SubscriptionProvider {}

void main() {
  group('AppTheme', () {
    test('light theme is built from the brand tokens', () {
      final theme = AppTheme.light();
      expect(theme.brightness, Brightness.light);
      expect(theme.colorScheme.primary, AppColors.primary);
      expect(theme.appBarTheme.backgroundColor, AppColors.emerald);
      expect(theme.useMaterial3, isTrue);
    });

    test('dark theme keeps the emerald primary', () {
      final theme = AppTheme.dark();
      expect(theme.brightness, Brightness.dark);
      expect(theme.colorScheme.primary, AppColors.primary);
    });
  });

  group('ProfileScreen', () {
    late MockAuthProvider auth;
    late MockSubscriptionProvider sub;

    setUp(() {
      auth = MockAuthProvider();
      sub = MockSubscriptionProvider();
      when(() => auth.user).thenReturn(
        User(
          id: 'u1',
          email: 'jo@example.com',
          name: 'Jo Rivers',
          createdAt: DateTime(2026, 1, 1),
        ),
      );
      when(() => sub.tier).thenReturn('free');
    });

    testWidgets('renders grouped menu sections and a Logout button', (
      tester,
    ) async {
      tester.view.physicalSize = const Size(1000, 3000);
      tester.view.devicePixelRatio = 1.0;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);

      await tester.pumpWidget(
        MultiProvider(
          providers: [
            ChangeNotifierProvider<AuthProvider>.value(value: auth),
            ChangeNotifierProvider<SubscriptionProvider>.value(value: sub),
          ],
          child: MaterialApp(
            theme: AppTheme.light(),
            home: const ProfileScreen(),
          ),
        ),
      );
      await tester.pump();

      expect(find.text('Jo Rivers'), findsOneWidget);
      expect(find.text('Free plan'), findsOneWidget);
      // Section labels are rendered upper-cased by _MenuCard.
      expect(find.text('YOUR WIZARD'), findsOneWidget);
      expect(find.text('SOCIAL'), findsOneWidget);
      expect(find.text('ACCOUNT'), findsOneWidget);
      expect(find.widgetWithText(ListTile, 'Achievements'), findsOneWidget);
      expect(find.widgetWithText(ListTile, 'Account & Security'), findsOneWidget);
      expect(find.widgetWithText(ElevatedButton, 'Logout'), findsOneWidget);
      expect(find.text('Delete Account'), findsOneWidget);
    });
  });
}
