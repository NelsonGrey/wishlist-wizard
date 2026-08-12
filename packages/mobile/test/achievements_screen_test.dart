import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wishlist_wizard_mobile/screens/achievements_screen.dart';
import 'package:wishlist_wizard_mobile/services/services.dart';

class MockFirebaseFunctionsService extends Mock
    implements FirebaseFunctionsService {}

Widget wrapScreen(FirebaseFunctionsService functionsService) {
  return MaterialApp(
    home: AchievementsScreen(functionsService: functionsService),
  );
}

void main() {
  late MockFirebaseFunctionsService functionsService;

  setUp(() {
    functionsService = MockFirebaseFunctionsService();
  });

  // All 12 achievement cards need to be laid out (not just scrolled into
  // view) for text finders to see them — a tall test surface avoids
  // per-test scrolling boilerplate.
  Future<void> useTallSurface(WidgetTester tester) async {
    tester.view.physicalSize = const Size(800, 4000);
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
  }

  testWidgets('renders every achievement definition, even with no data', (tester) async {
    when(() => functionsService.getAchievements())
        .thenAnswer((_) async => {'achievements': {}, 'computedAt': '2026-01-01T00:00:00Z'});

    await useTallSurface(tester);
    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    expect(find.text('Welcome Aboard'), findsOneWidget);
    expect(find.text('Tracker'), findsOneWidget);
    expect(find.text('Gift Giver'), findsOneWidget);
  });

  testWidgets('shows earned checkmark for a one-time achievement', (tester) async {
    when(() => functionsService.getAchievements()).thenAnswer(
      (_) async => {
        'achievements': {
          'welcome-aboard': {'earned': true, 'tier': 0, 'count': 0},
        },
        'computedAt': '2026-01-01T00:00:00Z',
      },
    );

    await useTallSurface(tester);
    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    expect(find.byIcon(Icons.check_circle), findsOneWidget);
  });

  testWidgets('shows tier badge and progress for a tiered achievement', (tester) async {
    when(() => functionsService.getAchievements()).thenAnswer(
      (_) async => {
        'achievements': {
          'tracker': {'earned': true, 'tier': 2, 'count': 7},
        },
        'computedAt': '2026-01-01T00:00:00Z',
      },
    );

    await useTallSurface(tester);
    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    expect(find.text('Adept'), findsOneWidget);
    expect(find.text('7 / 15 toward Sorcerer'), findsOneWidget);
  });

  testWidgets('shows a load error with pull-to-refresh available', (tester) async {
    when(() => functionsService.getAchievements()).thenThrow(Exception('boom'));

    await useTallSurface(tester);
    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    expect(find.text('Failed to load achievements.'), findsOneWidget);
    expect(find.byType(RefreshIndicator), findsOneWidget);
  });
}
