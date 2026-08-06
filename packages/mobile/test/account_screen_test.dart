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
import 'package:wishlist_wizard_mobile/screens/account_screen.dart';
import 'package:wishlist_wizard_mobile/services/services.dart';

class MockFirebaseAuthService extends Mock implements FirebaseAuthService {}

class MockPasswordPolicyService extends Mock implements PasswordPolicyService {}

final _fakeUser = User(
  id: 'u1',
  email: 'user@example.com',
  createdAt: DateTime.now(),
);

Widget wrapAccountScreen({
  required FirebaseAuthService authService,
  required PasswordPolicyService passwordPolicyService,
}) {
  return MaterialApp(
    home: ChangeNotifierProvider<AuthProvider>(
      create: (_) => AuthProvider(authService: authService),
      child: AccountScreen(passwordPolicyService: passwordPolicyService),
    ),
  );
}

Future<void> fillForm(
  WidgetTester tester, {
  required String current,
  required String newPassword,
  required String confirm,
}) async {
  await tester.enterText(
    find.widgetWithText(TextFormField, 'Current password'),
    current,
  );
  await tester.enterText(
    find.widgetWithText(TextFormField, 'New password'),
    newPassword,
  );
  await tester.enterText(
    find.widgetWithText(TextFormField, 'Confirm new password'),
    confirm,
  );
}

void main() {
  late MockFirebaseAuthService authService;
  late MockPasswordPolicyService policyService;

  setUp(() {
    authService = MockFirebaseAuthService();
    policyService = MockPasswordPolicyService();

    // AuthProvider's constructor calls _initializeAuth(), which listens to
    // authStateChanges and fetches the current user -- stub both so the
    // provider settles as "signed in" without touching real Firebase.
    when(
      () => authService.authStateChanges,
    ).thenAnswer((_) => Stream<User?>.value(_fakeUser));
    when(
      () => authService.getCurrentUser(),
    ).thenAnswer((_) async => _fakeUser);

    when(
      () => policyService.loadPolicy(),
    ).thenAnswer((_) async => PasswordPolicyState.defaultPolicy);
    when(
      () => policyService.hint(PasswordPolicyState.defaultPolicy),
    ).thenReturn('Must be at least 8 characters.');
  });

  Widget buildScreen() => wrapAccountScreen(
        authService: authService,
        passwordPolicyService: policyService,
      );

  testWidgets('shows the new-password hint sourced from the policy service', (
    tester,
  ) async {
    await tester.pumpWidget(buildScreen());
    await tester.pumpAndSettle();

    expect(find.text('Must be at least 8 characters.'), findsOneWidget);
  });

  testWidgets(
    'quickCheck failure blocks submission before reauthentication is attempted',
    (tester) async {
      when(
        () => policyService.quickCheck(
          'weak',
          PasswordPolicyState.defaultPolicy,
        ),
      ).thenReturn('too weak (test)');

      await tester.pumpWidget(buildScreen());
      await tester.pumpAndSettle();

      await fillForm(
        tester,
        current: 'CurrentPass1!',
        newPassword: 'weak',
        confirm: 'weak',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Update Password'));
      await tester.pump();

      expect(find.text('too weak (test)'), findsOneWidget);
      verifyNever(() => authService.reauthenticateWithPassword(any()));
      verifyNever(() => policyService.checkPassword(any()));
    },
  );

  testWidgets('confirm-password mismatch is rejected before submission', (
    tester,
  ) async {
    when(
      () => policyService.quickCheck(
        'NewGoodPass1!',
        PasswordPolicyState.defaultPolicy,
      ),
    ).thenReturn(null);

    await tester.pumpWidget(buildScreen());
    await tester.pumpAndSettle();

    await fillForm(
      tester,
      current: 'CurrentPass1!',
      newPassword: 'NewGoodPass1!',
      confirm: 'SomethingElse1!',
    );
    await tester.tap(find.widgetWithText(ElevatedButton, 'Update Password'));
    await tester.pump();

    expect(find.text('Passwords do not match'), findsOneWidget);
    verifyNever(() => authService.reauthenticateWithPassword(any()));
  });

  testWidgets(
    'reauthentication failure blocks the authoritative check and surfaces the error',
    (tester) async {
      when(
        () => policyService.quickCheck(
          'NewGoodPass1!',
          PasswordPolicyState.defaultPolicy,
        ),
      ).thenReturn(null);
      when(
        () => authService.reauthenticateWithPassword('WrongCurrent1!'),
      ).thenAnswer(
        (_) async => AuthResult.failure(error: 'Incorrect current password.'),
      );

      await tester.pumpWidget(buildScreen());
      await tester.pumpAndSettle();

      await fillForm(
        tester,
        current: 'WrongCurrent1!',
        newPassword: 'NewGoodPass1!',
        confirm: 'NewGoodPass1!',
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Update Password'));
      await tester.pumpAndSettle();

      expect(find.text('Incorrect current password.'), findsOneWidget);
      verifyNever(() => policyService.checkPassword(any()));
      verifyNever(() => authService.updatePassword(any()));
    },
  );

  testWidgets(
    'authoritative-check failure after a successful reauth blocks updatePassword',
    (tester) async {
      const newPassword = 'NewGoodPass1!';
      when(
        () => policyService.quickCheck(
          newPassword,
          PasswordPolicyState.defaultPolicy,
        ),
      ).thenReturn(null);
      when(
        () => authService.reauthenticateWithPassword('CurrentPass1!'),
      ).thenAnswer((_) async => AuthResult.success(user: _fakeUser));
      final invalidStatus = PasswordValidationStatus(
        false,
        PasswordPolicy({}),
      );
      when(
        () => policyService.checkPassword(newPassword),
      ).thenAnswer((_) async => invalidStatus);
      when(
        () => policyService.describeFailure(
          invalidStatus,
          PasswordPolicyState.defaultPolicy,
        ),
      ).thenReturn('AUTH FAIL (test)');

      await tester.pumpWidget(buildScreen());
      await tester.pumpAndSettle();

      await fillForm(
        tester,
        current: 'CurrentPass1!',
        newPassword: newPassword,
        confirm: newPassword,
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Update Password'));
      await tester.pumpAndSettle();

      expect(find.text('AUTH FAIL (test)'), findsOneWidget);
      verifyNever(() => authService.updatePassword(any()));
    },
  );

  testWidgets(
    'a password passing reauth and the authoritative check updates the password',
    (tester) async {
      const newPassword = 'NewGoodPass1!';
      when(
        () => policyService.quickCheck(
          newPassword,
          PasswordPolicyState.defaultPolicy,
        ),
      ).thenReturn(null);
      when(
        () => authService.reauthenticateWithPassword('CurrentPass1!'),
      ).thenAnswer((_) async => AuthResult.success(user: _fakeUser));
      final validStatus = PasswordValidationStatus(true, PasswordPolicy({}));
      when(
        () => policyService.checkPassword(newPassword),
      ).thenAnswer((_) async => validStatus);
      when(
        () => authService.updatePassword(newPassword),
      ).thenAnswer((_) async => AuthResult.success(user: _fakeUser));

      await tester.pumpWidget(buildScreen());
      await tester.pumpAndSettle();

      await fillForm(
        tester,
        current: 'CurrentPass1!',
        newPassword: newPassword,
        confirm: newPassword,
      );
      await tester.tap(find.widgetWithText(ElevatedButton, 'Update Password'));
      await tester.pumpAndSettle();

      verify(
        () => authService.reauthenticateWithPassword('CurrentPass1!'),
      ).called(1);
      verify(() => policyService.checkPassword(newPassword)).called(1);
      verify(() => authService.updatePassword(newPassword)).called(1);
      expect(find.text('Password updated.'), findsOneWidget);
    },
  );
}
