import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wishlist_wizard_mobile/screens/calendar_screen.dart';
import 'package:wishlist_wizard_mobile/services/services.dart';

class MockFirebaseFunctionsService extends Mock
    implements FirebaseFunctionsService {}

class FakeMap extends Fake implements Map<String, dynamic> {}

Widget wrapScreen(FirebaseFunctionsService functionsService) {
  return MaterialApp(
    home: CalendarScreen(functionsService: functionsService),
  );
}

void main() {
  setUpAll(() {
    registerFallbackValue(FakeMap());
  });

  late MockFirebaseFunctionsService functionsService;

  setUp(() {
    functionsService = MockFirebaseFunctionsService();
    when(() => functionsService.getCalendarEvents()).thenAnswer((_) async => []);
  });

  testWidgets('shows empty state', (tester) async {
    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    expect(find.text('No calendar events yet. Tap + to add one.'), findsOneWidget);
  });

  testWidgets('shows events grouped into sections', (tester) async {
    when(() => functionsService.getCalendarEvents()).thenAnswer(
      (_) async => [
        {
          'id': 'e1',
          'title': 'Project Due',
          'type': 'deadline',
          'startDate': '2026-09-01T00:00:00.000Z',
          'recurYearly': false,
          'reminderDays': 3,
        },
        {
          'id': 'e2',
          'title': "Mom's Birthday",
          'type': 'birthday',
          'startDate': '2026-10-05T00:00:00.000Z',
          'recurYearly': true,
          'reminderDays': 7,
        },
      ],
    );

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    expect(find.text('Deadlines'), findsOneWidget);
    expect(find.text('Project Due'), findsOneWidget);
    expect(find.text('Birthdays'), findsOneWidget);
    expect(find.text("Mom's Birthday"), findsOneWidget);
    expect(find.text('Upcoming'), findsNothing);
  });

  testWidgets('deleting an event calls the service and reloads', (tester) async {
    when(() => functionsService.getCalendarEvents()).thenAnswer(
      (_) async => [
        {
          'id': 'e1',
          'title': 'Anniversary Dinner',
          'type': 'anniversary',
          'startDate': '2026-09-01T00:00:00.000Z',
          'recurYearly': false,
          'reminderDays': 7,
        },
      ],
    );
    when(() => functionsService.deleteCalendarEvent('e1')).thenAnswer((_) async {});

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Delete calendar event'));
    await tester.pumpAndSettle();

    verify(() => functionsService.deleteCalendarEvent('e1')).called(1);
    verify(() => functionsService.getCalendarEvents()).called(2);
  });

  testWidgets('creating an event calls the service and dismisses the sheet', (tester) async {
    when(() => functionsService.createCalendarEvent(any()))
        .thenAnswer((_) async => {'id': 'e1'});

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Add calendar event'));
    await tester.pumpAndSettle();

    expect(find.text('Add Event'), findsOneWidget);

    await tester.enterText(find.widgetWithText(TextField, 'Title'), 'Book Club');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Save'));
    await tester.pumpAndSettle();

    final captured = verify(() => functionsService.createCalendarEvent(captureAny()))
        .captured
        .single as Map<String, dynamic>;
    expect(captured['title'], 'Book Club');
    expect(captured['type'], 'reminder');
    expect(find.text('Add Event'), findsNothing);
  });

  testWidgets('rejects an empty title', (tester) async {
    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    await tester.tap(find.byTooltip('Add calendar event'));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(ElevatedButton, 'Save'));
    await tester.pump();

    verifyNever(() => functionsService.createCalendarEvent(any()));
    expect(find.text('Enter a title.'), findsOneWidget);
  });

  testWidgets('editing an event pre-fills the sheet and calls updateCalendarEvent', (tester) async {
    when(() => functionsService.getCalendarEvents()).thenAnswer(
      (_) async => [
        {
          'id': 'e1',
          'title': 'Book Club',
          'type': 'reminder',
          'startDate': '2026-09-01T00:00:00.000Z',
          'recurYearly': false,
          'reminderDays': 5,
        },
      ],
    );
    when(() => functionsService.updateCalendarEvent('e1', any()))
        .thenAnswer((_) async => {'id': 'e1'});

    await tester.pumpWidget(wrapScreen(functionsService));
    await tester.pumpAndSettle();

    await tester.tap(find.text('Book Club'));
    await tester.pumpAndSettle();

    expect(find.text('Edit Event'), findsOneWidget);
    expect(find.widgetWithText(TextField, 'Book Club'), findsOneWidget);

    await tester.tap(find.widgetWithText(ElevatedButton, 'Save'));
    await tester.pumpAndSettle();

    verify(() => functionsService.updateCalendarEvent('e1', any())).called(1);
  });
}
