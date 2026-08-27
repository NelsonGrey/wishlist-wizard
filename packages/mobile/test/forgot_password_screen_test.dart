import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:provider/provider.dart';
import 'package:wishlist_wizard_mobile/models/models.dart';
import 'package:wishlist_wizard_mobile/providers/auth_provider.dart';
import 'package:wishlist_wizard_mobile/screens/forgot_password_screen.dart';
import 'package:wishlist_wizard_mobile/services/services.dart';

class MockFirebaseAuthService extends Mock implements FirebaseAuthService {}

// Mirrors login_screen_test.dart's DI pattern: mock FirebaseAuthService
// rather than let AuthProvider construct the real singleton, so these
// tests are fast and never touch a live Firebase project.
Widget wrapScreen(FirebaseAuthService authService) {
  return MaterialApp(
    home: ChangeNotifierProvider<AuthProvider>(
      create: (_) => AuthProvider(authService: authService),
      // A second route beneath it so "Back to Login" (Navigator.pop) has
      // somewhere real to pop to instead of popping the whole app.
      child: Navigator(
        onGenerateRoute: (settings) => MaterialPageRoute(
          builder: (context) => Scaffold(
            body: Builder(
              builder: (context) => ElevatedButton(
                onPressed: () => Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const ForgotPasswordScreen()),
                ),
                child: const Text('Open'),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

void main() {
  late MockFirebaseAuthService authService;

  setUp(() {
    authService = MockFirebaseAuthService();
    when(() => authService.authStateChanges).thenAnswer((_) => Stream<User?>.value(null));
    when(() => authService.getCurrentUser()).thenAnswer((_) async => null);
  });

  Future<void> pumpScreen(WidgetTester tester) async {
    await tester.pumpWidget(wrapScreen(authService));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
  }

  testWidgets('renders the initial form with title and email field', (tester) async {
    await pumpScreen(tester);

    expect(find.text('Forgot Password?'), findsOneWidget);
    expect(find.byType(TextFormField), findsOneWidget);
    expect(find.widgetWithText(ElevatedButton, 'Send Reset Link'), findsOneWidget);
  });

  testWidgets('validates an empty email', (tester) async {
    await pumpScreen(tester);

    await tester.tap(find.widgetWithText(ElevatedButton, 'Send Reset Link'));
    await tester.pump();

    expect(find.text('Please enter your email'), findsOneWidget);
    verifyNever(() => authService.resetPassword(any()));
  });

  testWidgets('validates an email missing "@"', (tester) async {
    await pumpScreen(tester);

    await tester.enterText(find.byType(TextFormField), 'not-an-email');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Send Reset Link'));
    await tester.pump();

    expect(find.text('Please enter a valid email'), findsOneWidget);
  });

  testWidgets('sends a trimmed email and shows the sent state on success', (tester) async {
    when(() => authService.resetPassword('mark@example.com')).thenAnswer(
      (_) async => AuthResult.success(user: User(id: 'u1', email: 'mark@example.com', createdAt: DateTime(2026))),
    );
    await pumpScreen(tester);

    await tester.enterText(find.byType(TextFormField), '  mark@example.com  ');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Send Reset Link'));
    await tester.pumpAndSettle();

    expect(find.text('Email Sent!'), findsOneWidget);
    expect(find.text('Password reset email sent! Check your inbox.'), findsOneWidget);
    verify(() => authService.resetPassword('mark@example.com')).called(1);
  });

  testWidgets('shows an error snackbar and stays on the form when reset fails', (tester) async {
    when(() => authService.resetPassword(any())).thenAnswer(
      (_) async => AuthResult.failure(error: 'No user found with this email address.'),
    );
    await pumpScreen(tester);

    await tester.enterText(find.byType(TextFormField), 'nobody@example.com');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Send Reset Link'));
    await tester.pumpAndSettle();

    expect(find.text('No user found with this email address.'), findsOneWidget);
    expect(find.text('Forgot Password?'), findsOneWidget); // still on the form, not "Email Sent!"
  });

  testWidgets('"Resend Email" returns to the form from the sent state', (tester) async {
    when(() => authService.resetPassword(any())).thenAnswer(
      (_) async => AuthResult.success(user: User(id: 'u1', email: 'mark@example.com', createdAt: DateTime(2026))),
    );
    await pumpScreen(tester);
    await tester.enterText(find.byType(TextFormField), 'mark@example.com');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Send Reset Link'));
    await tester.pumpAndSettle();
    expect(find.text('Email Sent!'), findsOneWidget);

    await tester.tap(find.text('Resend Email'));
    await tester.pump();

    expect(find.text('Forgot Password?'), findsOneWidget);
    expect(find.byType(TextFormField), findsOneWidget);
  });

  testWidgets('"Back to Login" pops the screen', (tester) async {
    when(() => authService.resetPassword(any())).thenAnswer(
      (_) async => AuthResult.success(user: User(id: 'u1', email: 'mark@example.com', createdAt: DateTime(2026))),
    );
    await pumpScreen(tester);
    await tester.enterText(find.byType(TextFormField), 'mark@example.com');
    await tester.tap(find.widgetWithText(ElevatedButton, 'Send Reset Link'));
    await tester.pumpAndSettle();

    await tester.tap(find.widgetWithText(ElevatedButton, 'Back to Login'));
    await tester.pumpAndSettle();

    expect(find.text('Forgot Password?'), findsNothing);
    expect(find.text('Open'), findsOneWidget); // back to the underlying screen
  });
}
