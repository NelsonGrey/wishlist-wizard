import 'package:firebase_auth/firebase_auth.dart';

/// Snapshot of Firebase's console-configured password policy, as most
/// recently fetched by [PasswordPolicyService.loadPolicy].
///
/// This is only ever used for client-side hinting/quick-checks --
/// [PasswordPolicyService.checkPassword] is the authoritative re-check run
/// right before a password is actually submitted, so a stale or defaulted
/// state here never lets an invalid password through.
class PasswordPolicyState {
  const PasswordPolicyState({
    required this.minLength,
    required this.requiresUppercase,
    required this.requiresLowercase,
    required this.requiresDigit,
    required this.requiresSymbol,
  });

  final int minLength;
  final bool requiresUppercase;
  final bool requiresLowercase;
  final bool requiresDigit;
  final bool requiresSymbol;

  /// Matches today's enforced Firebase policy so signup/change-password
  /// forms are still usable if the live fetch fails (e.g. offline);
  /// [PasswordPolicyService.checkPassword] re-verifies against the real
  /// policy regardless of whether this fallback was ever used.
  static const defaultPolicy = PasswordPolicyState(
    minLength: 8,
    requiresUppercase: true,
    requiresLowercase: true,
    requiresDigit: true,
    requiresSymbol: true,
  );
}

/// Fetches, caches, and enforces the Firebase Auth password policy
/// configured in the console (min length + required character classes).
///
/// A console-configured policy is meaningless unless a client actively
/// fetches and enforces it -- [FirebaseAuth.validatePassword] is the only
/// API that exposes it, and it doubles as both "read the current policy"
/// and "check a candidate password against it" (see [loadPolicy] and
/// [checkPassword]).
class PasswordPolicyService {
  PasswordPolicyService([FirebaseAuth? auth])
      : _auth = auth ?? FirebaseAuth.instance;

  final FirebaseAuth _auth;

  /// Fetches the live policy from Firebase. Uses a throwaway non-empty
  /// candidate (a single space) purely to piggyback on [FirebaseAuth
  /// .validatePassword]'s round-trip -- only `.passwordPolicy` off the
  /// result is used here, not whether that placeholder itself is valid.
  ///
  /// Falls back to [PasswordPolicyState.defaultPolicy] if the fetch fails
  /// (e.g. offline). Callers should still run [checkPassword]
  /// authoritatively before actually submitting a password, so a stale or
  /// defaulted policy here only ever affects client-side hinting, never
  /// enforcement.
  Future<PasswordPolicyState> loadPolicy() async {
    try {
      final status = await _auth.validatePassword(_auth, ' ');
      final policy = status.passwordPolicy;
      return PasswordPolicyState(
        minLength: policy.minPasswordLength,
        // A null field means Firebase doesn't enforce that character class
        // for this policy -- default to not-required, or the client would
        // reject passwords the server actually accepts.
        requiresUppercase: policy.containsUppercaseCharacter ?? false,
        requiresLowercase: policy.containsLowercaseCharacter ?? false,
        requiresDigit: policy.containsNumericCharacter ?? false,
        requiresSymbol: policy.containsNonAlphanumericCharacter ?? false,
      );
    } catch (_) {
      return PasswordPolicyState.defaultPolicy;
    }
  }

  /// Human-readable requirements summary for hint text under a password
  /// field.
  String hint(PasswordPolicyState policy) {
    final requirements = <String>[
      if (policy.requiresUppercase) 'an uppercase letter',
      if (policy.requiresLowercase) 'a lowercase letter',
      if (policy.requiresDigit) 'a number',
      if (policy.requiresSymbol) 'a symbol',
    ];
    if (requirements.isEmpty) {
      return 'Must be at least ${policy.minLength} characters.';
    }
    return 'Must be at least ${policy.minLength} characters and include '
        '${_joinWithAnd(requirements)}.';
  }

  String _joinWithAnd(List<String> items) {
    if (items.length == 1) return items.first;
    return '${items.sublist(0, items.length - 1).join(', ')} and ${items.last}';
  }

  /// Client-side pass using the cached [policy] so users get immediate
  /// feedback while typing. Never the last word -- [checkPassword] is the
  /// authoritative re-check run right before actually submitting.
  String? quickCheck(String password, PasswordPolicyState policy) {
    if (password.isEmpty) {
      return 'Please enter a password';
    }
    if (password.length < policy.minLength) {
      return 'Password must be at least ${policy.minLength} characters';
    }
    if (policy.requiresUppercase && !password.contains(RegExp(r'[A-Z]'))) {
      return 'Password must include an uppercase letter';
    }
    if (policy.requiresLowercase && !password.contains(RegExp(r'[a-z]'))) {
      return 'Password must include a lowercase letter';
    }
    if (policy.requiresDigit && !password.contains(RegExp(r'[0-9]'))) {
      return 'Password must include a number';
    }
    if (policy.requiresSymbol &&
        !password.contains(RegExp(r'[^A-Za-z0-9]'))) {
      return 'Password must include a symbol (e.g. ! @ # ?)';
    }
    return null;
  }

  /// Authoritative check against the live Firebase policy -- catches drift
  /// between a screen's cached [PasswordPolicyState] and the real policy
  /// (e.g. it changed after the screen loaded, or the initial fetch
  /// failed) before spending a round-trip on account creation or a
  /// password change.
  Future<PasswordValidationStatus> checkPassword(String password) =>
      _auth.validatePassword(_auth, password);

  /// Turns a failed [PasswordValidationStatus] from [checkPassword] into a
  /// user-facing message.
  String describeFailure(
    PasswordValidationStatus status,
    PasswordPolicyState policy,
  ) {
    final missing = <String>[
      if (!status.meetsMinPasswordLength)
        'be at least ${policy.minLength} characters',
      if (!status.meetsUppercaseRequirement) 'include an uppercase letter',
      if (!status.meetsLowercaseRequirement) 'include a lowercase letter',
      if (!status.meetsDigitsRequirement) 'include a number',
      if (!status.meetsSymbolsRequirement) 'include a symbol',
    ];
    if (missing.isEmpty) {
      return 'Password does not meet the requirements for this account.';
    }
    return 'Password must ${missing.join(', ')}.';
  }
}
