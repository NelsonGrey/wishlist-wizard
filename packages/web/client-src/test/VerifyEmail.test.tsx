import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import VerifyEmail from '@/pages/VerifyEmail';

const mockSetLocation = vi.fn();
let mockToken: string | undefined = 'abc123';
vi.mock('wouter', async () => {
  const actual = await vi.importActual<typeof import('wouter')>('wouter');
  return { ...actual, useLocation: () => ['/verify-email/abc123', mockSetLocation], useParams: () => ({ token: mockToken }) };
});

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/queryClient', () => ({ apiRequest }));

describe('VerifyEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockToken = 'abc123';
  });

  it('shows an error immediately when there is no token', async () => {
    mockToken = undefined;
    render(<VerifyEmail />);

    expect(screen.getByText('Invalid verification link')).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('shows a loading state, then success once verification resolves', async () => {
    apiRequest.mockResolvedValue(undefined);
    render(<VerifyEmail />);

    expect(screen.getByText('Verifying your email address...')).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText('Your email has been successfully verified!')).toBeInTheDocument());
    expect(apiRequest).toHaveBeenCalledWith('/api/auth/verify-email/abc123');
    expect(screen.getByRole('button', { name: 'Continue to Login' })).toBeInTheDocument();
  });

  it('continues to login on success', async () => {
    apiRequest.mockResolvedValue(undefined);
    render(<VerifyEmail />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Continue to Login' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Continue to Login' }));

    expect(mockSetLocation).toHaveBeenCalledWith('/login');
  });

  it('shows the server error message and a way to create a new account on failure', async () => {
    apiRequest.mockRejectedValue(new Error('Token expired'));
    render(<VerifyEmail />);

    await waitFor(() => expect(screen.getByText('Token expired')).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Back to Registration' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create a new account' })).toBeInTheDocument();
  });

  it('falls back to a generic error message for a non-Error rejection', async () => {
    apiRequest.mockRejectedValue('some string rejection');
    render(<VerifyEmail />);

    await waitFor(() =>
      expect(screen.getByText('Failed to verify email. The link may be expired or invalid.')).toBeInTheDocument()
    );
  });

  it('goes back to registration on failure', async () => {
    apiRequest.mockRejectedValue(new Error('Token expired'));
    render(<VerifyEmail />);
    await waitFor(() => expect(screen.getByRole('button', { name: 'Back to Registration' })).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: 'Back to Registration' }));

    expect(mockSetLocation).toHaveBeenCalledWith('/register');
  });
});
