import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockResetPassword = vi.fn();
const mockVerifyResetPasswordCode = vi.fn();
const mockConfirmResetPassword = vi.fn();
const mockToast = vi.fn();
const mockSetLocation = vi.fn();
const mockCheckPasswordPolicy = vi.fn(async () => ({
  isValid: true,
  meetsMinPasswordLength: true,
  containsLowercaseLetter: true,
  containsUppercaseLetter: true,
  containsNumericCharacter: true,
  containsNonAlphanumericCharacter: true,
  passwordPolicy: { customStrengthOptions: {} },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
    resetPassword: mockResetPassword,
    verifyResetPasswordCode: mockVerifyResetPasswordCode,
    confirmResetPassword: mockConfirmResetPassword,
    checkPasswordPolicy: mockCheckPasswordPolicy,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
}));

// These tests exercise the real login/register/forgot-password forms, not
// the app_offline gate — resolve it to "online" rather than relying on the
// hook's real (fail-closed) default of true.
vi.mock('@/hooks/useAppOffline', () => ({
  useAppOffline: () => false,
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useLocation: () => ['/login', mockSetLocation],
  };
});

describe('Auth Pages Submission', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('trims email before login submit and uses shared error mapping', async () => {
    mockSignIn.mockRejectedValue({ code: 'auth/wrong-password' });
    const user = userEvent.setup();

    render(<Login />, { pathname: '/login' });

    await user.type(screen.getByLabelText('Email'), '  user@example.com  ');
    await user.type(screen.getByLabelText('Password'), 'secret123');

    const form = screen.getByRole('button', { name: 'Sign in' }).closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => expect(mockSignIn).toHaveBeenCalledTimes(1));
    expect(mockSignIn).toHaveBeenCalledWith('user@example.com', 'secret123');

    await waitFor(() => expect(mockToast).toHaveBeenCalledTimes(1));
    expect(mockToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Login failed',
        description: 'Incorrect password.',
      })
    );
  });

  it('trims email and display name before register submit', async () => {
    mockSignUp.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<Register />, { pathname: '/register' });

    await user.type(screen.getByLabelText('Display Name (optional)'), '  Mark  ');
    await user.type(screen.getByLabelText('Email'), '  user@example.com  ');
    await user.type(screen.getByLabelText('Password'), 'Secret123!');
    await user.type(screen.getByLabelText('Confirm Password'), 'Secret123!');

    const form = screen.getByRole('button', { name: 'Create account' }).closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));
    expect(mockSignUp).toHaveBeenCalledWith('user@example.com', 'Secret123!', 'Mark');
  });

  it('renders the password policy hint on the register form', async () => {
    render(<Register />, { pathname: '/register' });

    expect(await screen.findByTestId('register-password-hint')).toHaveTextContent(/at least 8 characters/);
  });

  it('blocks register submit on a weak password without calling signUp', async () => {
    const user = userEvent.setup();

    render(<Register />, { pathname: '/register' });

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'weak');
    await user.type(screen.getByLabelText('Confirm Password'), 'weak');

    const form = screen.getByRole('button', { name: 'Create account' }).closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters long/)).toBeInTheDocument();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('blocks register submit when the authoritative policy check fails', async () => {
    // The hook also calls checkPasswordPolicy(' ') as a throwaway fetch on
    // mount -- only fail the real password, not that placeholder call.
    mockCheckPasswordPolicy.mockImplementation(async (password: string) => {
      if (password === ' ') {
        return {
          isValid: true,
          meetsMinPasswordLength: true,
          containsLowercaseLetter: true,
          containsUppercaseLetter: true,
          containsNumericCharacter: true,
          containsNonAlphanumericCharacter: true,
          passwordPolicy: { customStrengthOptions: {} },
        };
      }
      return {
        isValid: false,
        meetsMinPasswordLength: true,
        containsLowercaseLetter: true,
        containsUppercaseLetter: false,
        containsNumericCharacter: true,
        containsNonAlphanumericCharacter: true,
        passwordPolicy: { customStrengthOptions: {} },
      };
    });
    const user = userEvent.setup();

    render(<Register />, { pathname: '/register' });

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'Secret123!');
    await user.type(screen.getByLabelText('Confirm Password'), 'Secret123!');

    const form = screen.getByRole('button', { name: 'Create account' }).closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText(/include an uppercase letter/)).toBeInTheDocument();
    });
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('trims email before forgot-password submit', async () => {
    mockResetPassword.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<ForgotPassword />, { pathname: '/forgot-password' });

    await user.type(screen.getByLabelText('Email Address'), '  user@example.com  ');

    const form = screen.getByRole('button', { name: 'Send Reset Link' }).closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => expect(mockResetPassword).toHaveBeenCalledTimes(1));
    expect(mockResetPassword).toHaveBeenCalledWith('user@example.com');
  });

  describe('ResetPassword', () => {
    afterEach(() => {
      window.history.pushState({}, '', '/');
    });

    it('shows an invalid-link error and never calls verifyResetPasswordCode when the URL has no oobCode', async () => {
      window.history.pushState({}, '', '/reset-password');

      render(<ResetPassword />, { pathname: '/reset-password' });

      await waitFor(() => {
        expect(screen.getByText('Invalid Link')).toBeInTheDocument();
      });
      expect(mockVerifyResetPasswordCode).not.toHaveBeenCalled();
    });

    it('verifies the oobCode from the link and shows the account email on the form', async () => {
      window.history.pushState({}, '', '/reset-password?mode=resetPassword&oobCode=abc123');
      mockVerifyResetPasswordCode.mockResolvedValue('user@example.com');

      render(<ResetPassword />, { pathname: '/reset-password' });

      await waitFor(() => expect(mockVerifyResetPasswordCode).toHaveBeenCalledWith('abc123'));
      expect(await screen.findByText(/Enter a new password for user@example.com/)).toBeInTheDocument();
    });

    it('shows a mapped error when the oobCode is expired', async () => {
      window.history.pushState({}, '', '/reset-password?mode=resetPassword&oobCode=expired-code');
      mockVerifyResetPasswordCode.mockRejectedValue({ code: 'auth/expired-action-code' });

      render(<ResetPassword />, { pathname: '/reset-password' });

      await waitFor(() => {
        expect(screen.getByText('This password reset link has expired. Please request a new one.')).toBeInTheDocument();
      });
    });

    it('submits confirmResetPassword with the oobCode and new password', async () => {
      window.history.pushState({}, '', '/reset-password?mode=resetPassword&oobCode=abc123');
      mockVerifyResetPasswordCode.mockResolvedValue('user@example.com');
      mockConfirmResetPassword.mockResolvedValue(undefined);
      const user = userEvent.setup();

      render(<ResetPassword />, { pathname: '/reset-password' });

      await screen.findByLabelText('New Password');
      await user.type(screen.getByLabelText('New Password'), 'Secret123!');
      await user.type(screen.getByLabelText('Confirm New Password'), 'Secret123!');

      const form = screen.getByRole('button', { name: 'Reset Password' }).closest('form');
      expect(form).toBeTruthy();
      fireEvent.submit(form!);

      await waitFor(() => expect(mockConfirmResetPassword).toHaveBeenCalledTimes(1));
      expect(mockConfirmResetPassword).toHaveBeenCalledWith('abc123', 'Secret123!');
      expect(await screen.findByText('Password Reset Successful')).toBeInTheDocument();
    });

    it('blocks submit when passwords do not match, without calling confirmResetPassword', async () => {
      window.history.pushState({}, '', '/reset-password?mode=resetPassword&oobCode=abc123');
      mockVerifyResetPasswordCode.mockResolvedValue('user@example.com');
      const user = userEvent.setup();

      render(<ResetPassword />, { pathname: '/reset-password' });

      await screen.findByLabelText('New Password');
      await user.type(screen.getByLabelText('New Password'), 'Secret123!');
      await user.type(screen.getByLabelText('Confirm New Password'), 'Different123!');

      const form = screen.getByRole('button', { name: 'Reset Password' }).closest('form');
      fireEvent.submit(form!);

      await waitFor(() => {
        expect(screen.getByText('Passwords do not match')).toBeInTheDocument();
      });
      expect(mockConfirmResetPassword).not.toHaveBeenCalled();
    });
  });
});
