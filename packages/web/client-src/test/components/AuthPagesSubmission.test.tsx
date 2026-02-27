import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';

const mockSignIn = vi.fn();
const mockSignUp = vi.fn();
const mockResetPassword = vi.fn();
const mockToast = vi.fn();
const mockSetLocation = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
    signUp: mockSignUp,
    resetPassword: mockResetPassword,
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mockToast,
  }),
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
    await user.type(screen.getByLabelText('Password'), 'secret123');
    await user.type(screen.getByLabelText('Confirm Password'), 'secret123');

    const form = screen.getByRole('button', { name: 'Create account' }).closest('form');
    expect(form).toBeTruthy();
    fireEvent.submit(form!);

    await waitFor(() => expect(mockSignUp).toHaveBeenCalledTimes(1));
    expect(mockSignUp).toHaveBeenCalledWith('user@example.com', 'secret123', 'Mark');
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
});
