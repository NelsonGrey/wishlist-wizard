// firebase_auth's own AuthProvider/User collide with this app's AuthProvider
// (a ChangeNotifier) and User (a plain model) -- hide both since only
// PasswordValidationStatus is needed from this import.
import 'package:firebase_auth/firebase_auth.dart' hide AuthProvider, User;
// PasswordPolicy isn't re-exported from package:firebase_auth (only
// PasswordValidationStatus is) -- needed here to build PasswordValidationStatus
// fixtures for the authoritative-check stubs below.
import 'package:firebase_auth_platform_interface/firebase_auth_platform_interface.dart'
    show PasswordPolicy;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:provider/provider.dart';
import 'package:wishlist_wizard_mobile/models/models.dart';
import 'package:wishlist_wizard_mobile/providers/auth_provider.dart';
import 'package:wishlist_wizard_mobile/screens/login_screen.dart';
import 'package:wishlist_wizard_mobile/services/services.dart';

class MockFirebaseAuthService extends Mock implements FirebaseAuthService {}

class MockPasswordPolicyService extends Mock implements PasswordPolicyService {}

// Real FirebaseAuthService talks to a live Firebase project -- mocking it
// (rather than letting AuthProvider construct the real singleton) is what
// keeps these tests fast and hang-free, mirroring the DI pattern already
// used by FirebaseWishlistProvider/firebase_wishlist_provider_test.dart.
Widget wrapLoginScreen({
  required FirebaseAuthService authService,
  required PasswordPolicyService passwordPolicyService,
}) {
  return MaterialApp(
    home: ChangeNotifierProvider<AuthProvider>(
      create: (_) => AuthProvider(authService: authService),
      child: LoginScreen(passwordPolicyService: passwordPolicyService),
    ),
  );
}

Future<void> switchToRegisterMode(WidgetTester tester) async {
  await tester.tap(find.text("Don't have an account? Sign up"));
  await tester.pump();
}

void main() {
  late MockFirebaseAuthService authService;
  late MockPasswordPolicyService policyService;

  setUp(() {
    authService = MockFirebaseAuthService();
    policyService = MockPasswordPolicyService();

    // AuthProvider's constructor calls _initializeAuth(), which listens to
    // authStateChanges and fetches the current user -- stub both so the
    // provider settles as "signed out" without touching real Firebase.
    when(
      () => authService.authStateChanges,
    ).thenAnswer((_) => Stream<User?>.value(null));
    when(() => authService.getCurrentUser()).thenAnswer((_) async => null);

    when(
      () => policyService.loadPolicy(),
    ).thenAnswer((_) async => PasswordPolicyState.defaultPolicy);
    when(
      () => policyService.hint(PasswordPolicyState.defaultPolicy),
    ).thenReturn('Must be at least 8 characters.');
  });

  Widget buildScreen() => wrapLoginScreen(
        authService: authService,
        passwordPolicyService: policyService,
      );

  group('LoginScreen -- password hint', () {
    testWidgets('is shown under the password field in register mode', (
      tester,
    ) async {
      await tester.pumpWidget(buildScreen());
      await tester.pumpAndSettle();

      await switchToRegisterMode(tester);

      expect(find.text('Must be at least 8 characters.'), findsOneWidget);
    });

    testWidgets('is not shown in login mode', (tester) async {
      await tester.pumpWidget(buildScreen());
      await tester.pumpAndSettle();

      expect(find.text('Must be at least 8 characters.'), findsNothing);
    });
  });

  group('LoginScreen -- register-path password validation', () {
    testWidgets(
      'quickCheck failure blocks submission before the authoritative check runs',
      (tester) async {
        when(
          () => policyService.quickCheck(
            'weak',
            PasswordPolicyState.defaultPolicy,
          ),
        ).thenReturn('too weak (test)');

        await tester.pumpWidget(buildScreen());
        await tester.pumpAndSettle();
        await switchToRegisterMode(tester);

        await tester.enterText(
          find.widgetWithText(TextFormField, 'Email'),
          'user@example.com',
        );
        await tester.enterText(
          find.widgetWithText(TextFormField, 'Password'),
          'weak',
        );
        await tester.tap(find.widgetWithText(ElevatedButton, 'Sign Up'));
        await tester.pump();

        expect(find.text('too weak (test)'), findsOneWidget);
        verifyNever(() => policyService.checkPassword(any()));
        verifyNever(() => authService.register(any(), any(), any()));
      },
    );

    testWidgets(
      'authoritative-check failure blocks registration and shows describeFailure',
      (tester) async {
        const password = 'GoodPass1!';
        when(
          () => policyService.quickCheck(
            password,
            PasswordPolicyState.defaultPolicy,
          ),
        ).thenReturn(null);
        final invalidStatus = PasswordValidationStatus(
          false,
          PasswordPolicy({}),
        );
        when(
          () => policyService.checkPassword(password),
        ).thenAnswer((_) async => invalidStatus);
        when(
          () => policyService.describeFailure(
            invalidStatus,
            PasswordPolicyState.defaultPolicy,
          ),
        ).thenReturn('AUTHORITATIVE FAIL (test)');

        await tester.pumpWidget(buildScreen());
        await tester.pumpAndSettle();
        await switchToRegisterMode(tester);

        await tester.enterText(
          find.widgetWithText(TextFormField, 'Email'),
          'user@example.com',
        );
        await tester.enterText(
          find.widgetWithText(TextFormField, 'Password'),
          password,
        );
        await tester.tap(find.widgetWithText(ElevatedButton, 'Sign Up'));
        await tester.pumpAndSettle();

        expect(find.text('AUTHORITATIVE FAIL (test)'), findsOneWidget);
        verifyNever(() => authService.register(any(), any(), any()));
      },
    );

    testWidgets(
      'a password passing both checks proceeds to authProvider.register',
      (tester) async {
        const email = 'user@example.com';
        const password = 'GoodPass1!';
        when(
          () => policyService.quickCheck(
            password,
            PasswordPolicyState.defaultPolicy,
          ),
        ).thenReturn(null);
        final validStatus = PasswordValidationStatus(true, PasswordPolicy({}));
        when(
          () => policyService.checkPassword(password),
        ).thenAnswer((_) async => validStatus);
        when(
          () => authService.register(email, password, null),
        ).thenAnswer(
          (_) async => AuthResult.success(
            user: User(id: 'u1', email: email, createdAt: DateTime.now()),
          ),
        );

        await tester.pumpWidget(buildScreen());
        await tester.pumpAndSettle();
        await switchToRegisterMode(tester);

        await tester.enterText(
          find.widgetWithText(TextFormField, 'Email'),
          email,
        );
        await tester.enterText(
          find.widgetWithText(TextFormField, 'Password'),
          password,
        );
        await tester.tap(find.widgetWithText(ElevatedButton, 'Sign Up'));
        await tester.pumpAndSettle();

        verify(() => policyService.checkPassword(password)).called(1);
        verify(() => authService.register(email, password, null)).called(1);
      },
    );
  });
}
