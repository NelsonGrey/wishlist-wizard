import 'package:firebase_auth/firebase_auth.dart';
// PasswordPolicy itself isn't re-exported from package:firebase_auth (only
// PasswordValidationStatus is) -- pull it from the platform interface
// package directly to construct fixtures for loadPolicy/describeFailure.
import 'package:firebase_auth_platform_interface/firebase_auth_platform_interface.dart'
    show PasswordPolicy;
import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wishlist_wizard_mobile/services/password_policy_service.dart';

class MockFirebaseAuth extends Mock implements FirebaseAuth {}

void main() {
  // ---------------------------------------------------------------------------
  // PasswordPolicyState.defaultPolicy
  // ---------------------------------------------------------------------------
  group('PasswordPolicyState.defaultPolicy', () {
    test('matches the policy enforced today, as a fallback', () {
      const policy = PasswordPolicyState.defaultPolicy;
      expect(policy.minLength, 8);
      expect(policy.requiresUppercase, true);
      expect(policy.requiresLowercase, true);
      expect(policy.requiresDigit, true);
      expect(policy.requiresSymbol, true);
    });
  });

  // ---------------------------------------------------------------------------
  // hint
  // ---------------------------------------------------------------------------
  group('PasswordPolicyService.hint', () {
    final service = PasswordPolicyService(MockFirebaseAuth());

    test('lists every required character class', () {
      const policy = PasswordPolicyState(
        minLength: 10,
        requiresUppercase: true,
        requiresLowercase: true,
        requiresDigit: true,
        requiresSymbol: true,
      );

      final hint = service.hint(policy);

      expect(hint, contains('10 characters'));
      expect(hint, contains('an uppercase letter'));
      expect(hint, contains('a lowercase letter'));
      expect(hint, contains('a number'));
      expect(hint, contains('a symbol'));
    });

    test('omits the character-class list when none are required', () {
      const policy = PasswordPolicyState(
        minLength: 6,
        requiresUppercase: false,
        requiresLowercase: false,
        requiresDigit: false,
        requiresSymbol: false,
      );

      expect(service.hint(policy), 'Must be at least 6 characters.');
    });

    test('joins a single requirement without a comma', () {
      const policy = PasswordPolicyState(
        minLength: 8,
        requiresUppercase: true,
        requiresLowercase: false,
        requiresDigit: false,
        requiresSymbol: false,
      );

      expect(service.hint(policy), contains('include an uppercase letter.'));
    });
  });

  // ---------------------------------------------------------------------------
  // quickCheck
  // ---------------------------------------------------------------------------
  group('PasswordPolicyService.quickCheck', () {
    final service = PasswordPolicyService(MockFirebaseAuth());
    const policy = PasswordPolicyState.defaultPolicy;

    test('rejects an empty password', () {
      expect(service.quickCheck('', policy), isNotNull);
    });

    test('rejects a password shorter than minLength', () {
      expect(service.quickCheck('Ab1!', policy), contains('at least 8'));
    });

    test('rejects a password missing an uppercase letter', () {
      expect(service.quickCheck('abcdefg1!', policy), contains('uppercase'));
    });

    test('rejects a password missing a lowercase letter', () {
      expect(service.quickCheck('ABCDEFG1!', policy), contains('lowercase'));
    });

    test('rejects a password missing a digit', () {
      expect(service.quickCheck('Abcdefgh!', policy), contains('number'));
    });

    test('rejects a password missing a symbol', () {
      expect(service.quickCheck('Abcdefg1', policy), contains('symbol'));
    });

    test('accepts a password meeting every requirement', () {
      expect(service.quickCheck('Abcdefg1!', policy), isNull);
    });

    test('skips character-class checks the policy does not require', () {
      const relaxed = PasswordPolicyState(
        minLength: 4,
        requiresUppercase: false,
        requiresLowercase: false,
        requiresDigit: false,
        requiresSymbol: false,
      );

      expect(service.quickCheck('abcd', relaxed), isNull);
    });
  });

  // ---------------------------------------------------------------------------
  // loadPolicy
  // ---------------------------------------------------------------------------
  group('PasswordPolicyService.loadPolicy', () {
    test('maps a fetched PasswordPolicy onto PasswordPolicyState', () async {
      final auth = MockFirebaseAuth();
      final service = PasswordPolicyService(auth);
      final policy = PasswordPolicy({
        'customStrengthOptions': {
          'minPasswordLength': 10,
          'containsUppercaseCharacter': true,
          'containsLowercaseCharacter': true,
          'containsNumericCharacter': false,
          'containsNonAlphanumericCharacter': null,
        },
      });
      when(
        () => auth.validatePassword(auth, ' '),
      ).thenAnswer((_) async => PasswordValidationStatus(true, policy));

      final result = await service.loadPolicy();

      expect(result.minLength, 10);
      expect(result.requiresUppercase, true);
      expect(result.requiresLowercase, true);
      expect(result.requiresDigit, false);
      // A null field means Firebase doesn't enforce that class -- treated
      // as not-required, not a validation failure waiting to happen.
      expect(result.requiresSymbol, false);
    });

    test('falls back to the default policy when the fetch throws', () async {
      final auth = MockFirebaseAuth();
      final service = PasswordPolicyService(auth);
      when(
        () => auth.validatePassword(auth, ' '),
      ).thenThrow(Exception('network error'));

      final result = await service.loadPolicy();

      expect(result.minLength, PasswordPolicyState.defaultPolicy.minLength);
      expect(result.requiresUppercase, true);
      expect(result.requiresLowercase, true);
      expect(result.requiresDigit, true);
      expect(result.requiresSymbol, true);
    });
  });

  // ---------------------------------------------------------------------------
  // checkPassword
  // ---------------------------------------------------------------------------
  group('PasswordPolicyService.checkPassword', () {
    test('delegates to FirebaseAuth.validatePassword(auth, password)', () async {
      final auth = MockFirebaseAuth();
      final service = PasswordPolicyService(auth);
      final status = PasswordValidationStatus(false, PasswordPolicy({}));
      when(
        () => auth.validatePassword(auth, 'weak'),
      ).thenAnswer((_) async => status);

      final result = await service.checkPassword('weak');

      expect(result, same(status));
      verify(() => auth.validatePassword(auth, 'weak')).called(1);
    });
  });

  // ---------------------------------------------------------------------------
  // describeFailure
  // ---------------------------------------------------------------------------
  group('PasswordPolicyService.describeFailure', () {
    final service = PasswordPolicyService(MockFirebaseAuth());
    const policy = PasswordPolicyState.defaultPolicy;

    test('lists every unmet requirement and omits met ones', () {
      final status = PasswordValidationStatus(false, PasswordPolicy({}))
        ..meetsMinPasswordLength = false
        ..meetsUppercaseRequirement = false
        ..meetsLowercaseRequirement = true
        ..meetsDigitsRequirement = true
        ..meetsSymbolsRequirement = true;

      final message = service.describeFailure(status, policy);

      expect(message, contains('be at least 8 characters'));
      expect(message, contains('include an uppercase letter'));
      expect(message, isNot(contains('lowercase')));
      expect(message, isNot(contains('number')));
      expect(message, isNot(contains('symbol')));
    });

    test('falls back to a generic message when no field is flagged unmet', () {
      // PasswordValidationStatus's own constructor defaults every meets*
      // flag to true -- this can happen if Firebase rejects the password
      // for a reason this client doesn't independently model.
      final status = PasswordValidationStatus(false, PasswordPolicy({}));

      expect(
        service.describeFailure(status, policy),
        'Password does not meet the requirements for this account.',
      );
    });
  });
}
