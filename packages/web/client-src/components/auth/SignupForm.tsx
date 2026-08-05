import React, { useEffect, useRef, useState } from 'react';
import type { PasswordValidationStatus } from 'firebase/auth';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'wouter';
import { getFirebaseAuthErrorMessage } from '@/lib/firebase-auth-errors';

// Defaults match today's enforced Firebase password policy so the form is
// still usable if the live policy fetch fails (e.g. offline); the
// authoritative check in handleSubmit re-verifies against the real policy
// regardless of whether this fetch succeeded.
interface PasswordPolicyState {
  minLength: number;
  requiresUpper: boolean;
  requiresLower: boolean;
  requiresDigit: boolean;
  requiresSymbol: boolean;
}

const DEFAULT_POLICY: PasswordPolicyState = {
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
// network round-trip. handleSubmit re-validates authoritatively against
// Firebase itself before signing up, so this never needs to be the last
// word on whether a password is accepted.
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

export const SignupForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [policy, setPolicy] = useState<PasswordPolicyState>(DEFAULT_POLICY);
  const isSubmittingRef = useRef(false);
  const { signUp, checkPasswordPolicy } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    let cancelled = false;
    // A throwaway non-empty candidate -- only .passwordPolicy is used here,
    // not whether this specific placeholder is valid.
    checkPasswordPolicy(' ')
      .then((status) => {
        if (cancelled) return;
        const options = status.passwordPolicy.customStrengthOptions;
        setPolicy({
          minLength: options.minPasswordLength ?? DEFAULT_POLICY.minLength,
          requiresUpper: options.containsUppercaseLetter ?? false,
          requiresLower: options.containsLowercaseLetter ?? false,
          requiresDigit: options.containsNumericCharacter ?? false,
          requiresSymbol: options.containsNonAlphanumericCharacter ?? false,
        });
      })
      .catch(() => {
        // Keep DEFAULT_POLICY -- handleSubmit still authoritatively
        // re-checks the real password against the live policy at submit time.
      });
    return () => {
      cancelled = true;
    };
  }, [checkPasswordPolicy]);

  const isValidEmail = (value: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmittingRef.current) {
      return;
    }

    isSubmittingRef.current = true;
    setError('');
    const normalizedEmail = email.trim();

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      isSubmittingRef.current = false;
      return;
    }

    // Quick client-side pass using the cached live policy.
    const quickCheckError = quickPasswordCheck(password, policy);
    if (quickCheckError) {
      setError(quickCheckError);
      isSubmittingRef.current = false;
      return;
    }

    if (!normalizedEmail) {
      setError('Email is required.');
      isSubmittingRef.current = false;
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError('Please enter a valid email address.');
      isSubmittingRef.current = false;
      return;
    }

    setLoading(true);

    try {
      // Authoritative check against the live Firebase policy -- catches
      // drift between this form's cached copy and the real policy (e.g. it
      // changed after this form loaded, or the initial fetch failed)
      // before spending a round-trip on account creation.
      const status = await checkPasswordPolicy(password);
      if (!status.isValid) {
        setError(describePasswordPolicyFailure(status, policy));
        return;
      }

      await signUp(normalizedEmail, password, displayName.trim() || undefined);
      // ProtectedRoute will handle redirect after auth state change
    } catch (err: unknown) {
      setError(getFirebaseAuthErrorMessage(err, 'signup'));
    } finally {
      isSubmittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6">Create Account</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
            Display Name (optional)
          </label>
          <input
            type="text"
            id="displayName"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
          />
          <p className="text-xs text-gray-500 mt-1">
            {passwordRequirementsHint(policy)}
          </p>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            Confirm Password
          </label>
          <input
            type="password"
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={loading}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-emerald-500 focus:border-emerald-500 disabled:opacity-50"
          />
        </div>

        {error && (
          <div role="alert" className="text-red-600 text-sm mt-2 p-2 bg-red-50 border border-red-200 rounded">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gradient-to-r from-emerald-700 to-green-700 hover:from-emerald-800 hover:to-green-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Creating account...' : 'Create Account'}
        </button>
      </form>

      <div className="mt-4 text-center text-sm">
        <span className="text-gray-600">Already have an account? </span>
        <button
          onClick={() => setLocation('/login')}
          className="text-emerald-700 hover:text-emerald-800 font-medium"
        >
          Sign in
        </button>
      </div>
    </div>
  );
};

export default SignupForm;
