import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import { usePasswordPolicy, DEFAULT_PASSWORD_POLICY } from '@/hooks/usePasswordPolicy';
import type { PasswordValidationStatus } from 'firebase/auth';

function buildStatus(overrides: Partial<PasswordValidationStatus> = {}): PasswordValidationStatus {
  return {
    isValid: true,
    meetsMinPasswordLength: true,
    containsLowercaseLetter: true,
    containsUppercaseLetter: true,
    containsNumericCharacter: true,
    containsNonAlphanumericCharacter: true,
    passwordPolicy: {
      customStrengthOptions: {
        minPasswordLength: 10,
        containsUppercaseLetter: true,
        containsLowercaseLetter: true,
        containsNumericCharacter: true,
        containsNonAlphanumericCharacter: true,
      },
      enforcementState: 'ENFORCE',
    },
    ...overrides,
  } as unknown as PasswordValidationStatus;
}

describe('usePasswordPolicy', () => {
  it('starts with DEFAULT_PASSWORD_POLICY before the fetch resolves', () => {
    const checkPasswordPolicy = vi.fn(() => new Promise<PasswordValidationStatus>(() => {}));
    const { result } = renderHook(() => usePasswordPolicy(checkPasswordPolicy));

    expect(result.current.policy).toEqual(DEFAULT_PASSWORD_POLICY);
    expect(result.current.hint).toContain('8 characters');
  });

  it('adopts the live policy once the throwaway fetch resolves', async () => {
    const checkPasswordPolicy = vi.fn(async () => buildStatus());
    const { result } = renderHook(() => usePasswordPolicy(checkPasswordPolicy));

    await waitFor(() => {
      expect(result.current.policy.minLength).toBe(10);
    });

    expect(checkPasswordPolicy).toHaveBeenCalledWith(' ');
    expect(result.current.hint).toContain('10 characters');
  });

  it('keeps DEFAULT_PASSWORD_POLICY if the initial fetch rejects', async () => {
    const checkPasswordPolicy = vi.fn(async () => {
      throw new Error('offline');
    });
    const { result } = renderHook(() => usePasswordPolicy(checkPasswordPolicy));

    await waitFor(() => {
      expect(checkPasswordPolicy).toHaveBeenCalled();
    });

    expect(result.current.policy).toEqual(DEFAULT_PASSWORD_POLICY);
  });

  it('quickCheck flags a too-short password against the cached policy', () => {
    const checkPasswordPolicy = vi.fn(() => new Promise<PasswordValidationStatus>(() => {}));
    const { result } = renderHook(() => usePasswordPolicy(checkPasswordPolicy));

    expect(result.current.quickCheck('short')).toMatch(/at least 8 characters/);
  });

  it('quickCheck flags a missing uppercase letter', () => {
    const checkPasswordPolicy = vi.fn(() => new Promise<PasswordValidationStatus>(() => {}));
    const { result } = renderHook(() => usePasswordPolicy(checkPasswordPolicy));

    expect(result.current.quickCheck('lowercase123!')).toMatch(/uppercase/);
  });

  it('quickCheck returns null for a password meeting the cached policy', () => {
    const checkPasswordPolicy = vi.fn(() => new Promise<PasswordValidationStatus>(() => {}));
    const { result } = renderHook(() => usePasswordPolicy(checkPasswordPolicy));

    expect(result.current.quickCheck('Str0ng!Pass')).toBeNull();
  });

  it('checkPolicy re-fetches authoritatively via the bound function', async () => {
    const checkPasswordPolicy = vi.fn(async () => buildStatus());
    const { result } = renderHook(() => usePasswordPolicy(checkPasswordPolicy));

    await waitFor(() => expect(result.current.policy.minLength).toBe(10));

    let status: PasswordValidationStatus | undefined;
    await act(async () => {
      status = await result.current.checkPolicy('Str0ng!Pass');
    });

    expect(status?.isValid).toBe(true);
    expect(checkPasswordPolicy).toHaveBeenCalledWith('Str0ng!Pass');
  });

  it('describeFailure summarizes missing requirements from a validation status', async () => {
    const checkPasswordPolicy = vi.fn(async () => buildStatus());
    const { result } = renderHook(() => usePasswordPolicy(checkPasswordPolicy));

    await waitFor(() => expect(result.current.policy.minLength).toBe(10));

    const failing = buildStatus({
      isValid: false,
      containsUppercaseLetter: false,
      containsNonAlphanumericCharacter: false,
    });

    const message = result.current.describeFailure(failing);
    expect(message).toContain('include an uppercase letter');
    expect(message).toContain('include a symbol');
  });

  it('describeFailure falls back to a generic message when nothing specific is missing', () => {
    const checkPasswordPolicy = vi.fn(() => new Promise<PasswordValidationStatus>(() => {}));
    const { result } = renderHook(() => usePasswordPolicy(checkPasswordPolicy));

    const failing = buildStatus({ isValid: false });
    expect(result.current.describeFailure(failing)).toBe(
      'Password does not meet the requirements for this account.'
    );
  });
});
