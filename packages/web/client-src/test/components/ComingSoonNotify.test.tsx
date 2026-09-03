import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ComingSoonNotify from '@/components/ComingSoonNotify';

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/queryClient', () => ({ apiRequest }));

describe('ComingSoonNotify', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefills the email field from defaultEmail', () => {
    render(<ComingSoonNotify tier="business" defaultEmail="owner@example.com" />);
    expect(screen.getByDisplayValue('owner@example.com')).toBeInTheDocument();
  });

  it('posts the tier, email and source to /api/tier-interest and confirms', async () => {
    apiRequest.mockResolvedValueOnce({ ok: true, alreadyRegistered: false });
    render(<ComingSoonNotify tier="creator" />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'me@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /notify me when it launches/i }));

    await waitFor(() =>
      expect(apiRequest).toHaveBeenCalledWith('/api/tier-interest', {
        method: 'POST',
        body: { email: 'me@example.com', tier: 'creator', source: 'web' },
      }),
    );
    expect(await screen.findByText(/we'll email you when Creator Pro launches/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /notify me/i })).not.toBeInTheDocument();
  });

  it('acknowledges an already-registered email distinctly', async () => {
    apiRequest.mockResolvedValueOnce({ ok: true, alreadyRegistered: true });
    render(<ComingSoonNotify tier="creator" defaultEmail="me@example.com" />);

    fireEvent.click(screen.getByRole('button', { name: /notify me when it launches/i }));

    expect(await screen.findByText(/already on the list/i)).toBeInTheDocument();
  });

  it('validates the email locally before hitting the API', async () => {
    render(<ComingSoonNotify tier="business" />);

    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'bad' },
    });
    fireEvent.click(screen.getByRole('button', { name: /notify me when it launches/i }));

    expect(await screen.findByText('Enter a valid email address.')).toBeInTheDocument();
    expect(apiRequest).not.toHaveBeenCalled();
  });

  it('surfaces a retryable error when the API call fails', async () => {
    apiRequest.mockRejectedValueOnce(new Error('boom'));
    render(<ComingSoonNotify tier="business" defaultEmail="me@example.com" />);

    fireEvent.click(screen.getByRole('button', { name: /notify me when it launches/i }));

    expect(await screen.findByText(/something went wrong/i)).toBeInTheDocument();
    // Button still present so the user can retry.
    expect(screen.getByRole('button', { name: /notify me when it launches/i })).toBeInTheDocument();
  });
});
