import { useCallback, useEffect, useRef, useState } from 'react';
import type { PasswordValidationStatus } from 'firebase/auth';

// Defaults match today's enforced Firebase password policy so callers still
// have something usable if the live policy fetch fails (e.g. offline); the
// authoritative checkPolicy() re-verifies against the real policy regardless
// of whether this fetch succeeded.
export interface PasswordPolicyState {
  minLength: number;
  requiresUpper: boolean;
  requiresLower: boolean;
  requiresDigit: boolean;
  requiresSymbol: boolean;
}

export const DEFAULT_PASSWORD_POLICY: PasswordPolicyState = {
  minLength: 8,
  requiresUpper: true,
  requiresLower: true,
  requiresDigit: true,
  requiresSymbol: true,
};

function passwordRequirementsHint(policy: PasswordPolicyState): string {
  const requirements = [
    policy.requiresUpper && 'an uppercase letter',
    policy.requiresLower && 'a lowercase letter',
    policy.requiresDigit && 'a number',
    policy.requiresSymbol && 'a symbol',
  ].filter(Boolean) as string[];
  if (requirements.length === 0) {
    return `Must be at least ${policy.minLength} characters long`;
  }
  return `Must be at least ${policy.minLength} characters, including ${requirements.join(', ')}`;
}

// Quick pass using the cached live policy, for immediate feedback without a
// network round-trip. checkPolicy() re-validates authoritatively against
// Firebase itself, so this never needs to be the last word on whether a
// password is accepted.
function quickPasswordCheck(password: string, policy: PasswordPolicyState): string | null {
  if (password.length < policy.minLength) {
    return `Password must be at least ${policy.minLength} characters long.`;
  }
  if (policy.requiresUpper && !/[A-Z]/.test(password)) {
    return 'Password must include an uppercase letter.';
  }
  if (policy.requiresLower && !/[a-z]/.test(password)) {
    return 'Password must include a lowercase letter.';
  }
  if (policy.requiresDigit && !/[0-9]/.test(password)) {
    return 'Password must include a number.';
  }
  if (policy.requiresSymbol && !/[^A-Za-z0-9]/.test(password)) {
    return 'Password must include a symbol (e.g. ! @ # ?).';
  }
  return null;
}

function describePasswordPolicyFailure(status: PasswordValidationStatus, policy: PasswordPolicyState): string {
  const missing = [
    status.meetsMinPasswordLength === false && `be at least ${policy.minLength} characters`,
    status.containsUppercaseLetter === false && 'include an uppercase letter',
    status.containsLowercaseLetter === false && 'include a lowercase letter',
    status.containsNumericCharacter === false && 'include a number',
    status.containsNonAlphanumericCharacter === false && 'include a symbol',
  ].filter(Boolean) as string[];
  if (missing.length === 0) {
    return 'Password does not meet the requirements for this account.';
  }
  return `Password must ${missing.join(', ')}.`;
}

/**
 * Fetches and caches the live Firebase password policy (falling back to
 * DEFAULT_PASSWORD_POLICY until the fetch resolves, or if it fails), and
 * exposes helpers to render a hint, do a quick client-side check, and run
 * the authoritative server-verified check before submit.
 *
 * `checkPasswordPolicy` is a bound function (e.g. AuthContext's
 * `checkPasswordPolicy`) that already knows how to lazily init Firebase —
 * this hook doesn't duplicate that init logic.
 */
export function usePasswordPolicy(
  checkPasswordPolicy: (password: string) => Promise<PasswordValidationStatus>
) {
  const [policy, setPolicy] = useState<PasswordPolicyState>(DEFAULT_PASSWORD_POLICY);

  useEffect(() => {
    let cancelled = false;
    // A throwaway non-empty candidate -- only .passwordPolicy is used here,
    // not whether this specific placeholder is valid.
    checkPasswordPolicy(' ')
      .then((status) => {
        if (cancelled) return;
        const options = status.passwordPolicy.customStrengthOptions;
        setPolicy({
          minLength: options.minPasswordLength ?? DEFAULT_PASSWORD_POLICY.minLength,
          requiresUpper: options.containsUppercaseLetter ?? false,
          requiresLower: options.containsLowercaseLetter ?? false,
          requiresDigit: options.containsNumericCharacter ?? false,
          requiresSymbol: options.containsNonAlphanumericCharacter ?? false,
        });
      })
      .catch(() => {
        // Keep DEFAULT_PASSWORD_POLICY -- checkPolicy() still authoritatively
        // re-checks the real password against the live policy at submit time.
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkPasswordPolicy]);

  // Keep the latest policy accessible from stable callbacks below without
  // forcing them to change identity on every fetch resolution.
  const policyRef = useRef(policy);
  policyRef.current = policy;

  const hint = passwordRequirementsHint(policy);

  const quickCheck = useCallback((password: string): string | null => {
    return quickPasswordCheck(password, policyRef.current);
  }, []);

  const checkPolicy = useCallback(
    (password: string): Promise<PasswordValidationStatus> => checkPasswordPolicy(password),
    [checkPasswordPolicy]
  );

  const describeFailure = useCallback((status: PasswordValidationStatus): string => {
    return describePasswordPolicyFailure(status, policyRef.current);
  }, []);

  return { policy, hint, quickCheck, checkPolicy, describeFailure };
}

export default usePasswordPolicy;
