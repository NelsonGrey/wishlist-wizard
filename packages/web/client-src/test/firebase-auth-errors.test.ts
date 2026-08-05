import { describe, expect, it } from 'vitest';
import { getFirebaseAuthErrorMessage } from '@/lib/firebase-auth-errors';

describe('getFirebaseAuthErrorMessage', () => {
  it('maps login errors to user-friendly messages', () => {
    expect(getFirebaseAuthErrorMessage({ code: 'auth/user-not-found' }, 'login')).toBe('No account found with this email address.');
    expect(getFirebaseAuthErrorMessage({ code: 'auth/wrong-password' }, 'login')).toBe('Incorrect password.');
    expect(getFirebaseAuthErrorMessage({ code: 'app/firebase-not-configured' }, 'login')).toBe('Firebase is not configured for this environment. Ask your admin to set VITE_FIREBASE_* env vars.');
  });

  it('maps signup errors to user-friendly messages', () => {
    expect(getFirebaseAuthErrorMessage({ code: 'auth/email-already-in-use' }, 'signup')).toBe('An account with this email already exists.');
    expect(getFirebaseAuthErrorMessage({ code: 'auth/weak-password' }, 'signup')).toBe('Password is too weak. Please choose a stronger password.');
  });

  it('maps reset password errors to user-friendly messages', () => {
    expect(getFirebaseAuthErrorMessage({ code: 'auth/invalid-email' }, 'reset-password')).toBe('Invalid email address.');
    expect(getFirebaseAuthErrorMessage({ code: 'auth/too-many-requests' }, 'reset-password')).toBe('Too many requests. Please try again later.');
  });

  it('falls back to context defaults for unknown errors', () => {
    expect(getFirebaseAuthErrorMessage({ code: 'unknown' }, 'login')).toBe('Failed to sign in. Please try again.');
    expect(getFirebaseAuthErrorMessage(new Error('boom'), 'signup')).toBe('Failed to create account. Please try again.');
    expect(getFirebaseAuthErrorMessage(null, 'reset-password')).toBe('Failed to send password reset email. Please try again.');
  });
});
