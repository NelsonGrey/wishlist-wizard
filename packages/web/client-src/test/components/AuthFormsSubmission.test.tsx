import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import LoginForm from '@/components/auth/LoginForm';
import ForgotPasswordForm from '@/components/auth/ForgotPasswordForm';
import SignupForm from '@/components/auth/SignupForm';

const mockSignIn = vi.fn();
const mockResetPassword = vi.fn();
const mockSignUp = vi.fn();
const mockSetLocation = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    resetPassword: mockResetPassword,
    signUp: mockSignUp,
    checkPasswordPolicy: vi.fn(async () => ({
      isValid: true,
      passwordPolicy: { customStrengthOptions: {} },
    })),
  }),
}));

vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return {
    ...actual,
    useLocation: () => ['/login', mockSetLocation],
  };
});

describe('Auth Forms Submission Hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('trims email before login submit', async () => {
    mockSignIn.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), '  user@example.com  ');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(mockSignIn).toHaveBeenCalledWith('user@example.com', 'secret123');
  });

  it('shows normalized invalid-email validation copy on login', async () => {
    const user = userEvent.setup();

    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'not-an-email');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    const form = screen.getByRole('button', { name: 'Sign In' }).closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    expect(screen.getByRole('alert')).toHaveTextContent('Please enter a valid email address.');
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('shows required-password validation copy on login', async () => {
    const user = userEvent.setup();

    render(<LoginForm />);

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    const form = screen.getByRole('button', { name: 'Sign In' }).closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    expect(screen.getByRole('alert')).toHaveTextContent('Password is required.');
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('prevents duplicate forgot-password submits while request is in flight', async () => {
    let resolveReset: (() => void) | undefined;
    const pendingReset = new Promise<void>((resolve) => {
      resolveReset = resolve;
    });
    mockResetPassword.mockReturnValue(pendingReset);

    render(<ForgotPasswordForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '  user@example.com  ' } });
    const form = screen.getByRole('button', { name: 'Send Reset Email' }).closest('form');
    expect(form).toBeTruthy();

    fireEvent.submit(form!);
    fireEvent.submit(form!);

    expect(mockResetPassword).toHaveBeenCalledTimes(1);
    expect(mockResetPassword).toHaveBeenCalledWith('user@example.com');

    await act(async () => {
      resolveReset?.();
      await pendingReset;
    });
  });

  it('shows required-email validation copy on forgot password', () => {
    render(<ForgotPasswordForm />);

    const form = screen.getByRole('button', { name: 'Send Reset Email' }).closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    expect(screen.getByRole('alert')).toHaveTextContent('Email is required.');
    expect(mockResetPassword).not.toHaveBeenCalled();
  });

  it('trims email before signup submit', async () => {
    mockSignUp.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(<SignupForm />);

    await user.type(screen.getByLabelText('Display Name (optional)'), '  Mark  ');
    await user.type(screen.getByLabelText('Email'), '  user@example.com  ');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.type(screen.getByLabelText('Confirm Password'), 'secret123');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(mockSignUp).toHaveBeenCalledTimes(1);
    expect(mockSignUp).toHaveBeenCalledWith('user@example.com', 'secret123', 'Mark');
  });

  it('shows normalized password-mismatch validation copy on signup', async () => {
    const user = userEvent.setup();

    render(<SignupForm />);

    await user.type(screen.getByLabelText('Email'), 'user@example.com');
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.type(screen.getByLabelText('Confirm Password'), 'different');
    await user.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Passwords do not match.');
    expect(mockSignUp).not.toHaveBeenCalled();
  });

  it('shows required-email validation copy on signup', async () => {
    const user = userEvent.setup();

    render(<SignupForm />);

    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.type(screen.getByLabelText('Confirm Password'), 'secret123');
    const form = screen.getByRole('button', { name: 'Create Account' }).closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    expect(screen.getByRole('alert')).toHaveTextContent('Email is required.');
    expect(mockSignUp).not.toHaveBeenCalled();
  });
});
