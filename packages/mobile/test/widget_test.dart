// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wishlist_wizard_mobile/screens/coming_soon_screen.dart';

void main() {
  testWidgets('Coming soon screen smoke test', (WidgetTester tester) async {
    // Build our coming soon screen (which is currently enabled)
    await tester.pumpWidget(const MaterialApp(home: ComingSoonScreen()));

    // Pump once to build the widget
    await tester.pump();

    // Verify that we have the coming soon screen elements
    expect(find.text('Coming Soon'), findsOneWidget);
    expect(
      find.text('We\'re working on something amazing. Stay tuned!'),
      findsOneWidget,
    );
    expect(find.byType(Icon), findsOneWidget);
  });
}
