import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import UserProfile from '@/pages/UserProfile';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: '100',
      email: 'mark@example.com',
      displayName: 'Mark Nelson',
      photoURL: null,
    },
  }),
}));

describe('UserProfile payment gating', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows deferred payments message when Stripe is not configured', async () => {
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', '');

    render(<UserProfile />, { pathname: '/user-profile' });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /settings/i }));

    expect(await screen.findByTestId('profile-payments-deferred')).toBeInTheDocument();
    expect(screen.queryByText('Add Payment Method')).not.toBeInTheDocument();
  });

  it('shows payment sections when Stripe is configured', async () => {
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_12345');

    render(<UserProfile />, { pathname: '/user-profile' });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /settings/i }));

    expect(await screen.findByText('Payment Methods')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Payment Method' })).toBeInTheDocument();
    expect(screen.queryByTestId('profile-payments-deferred')).not.toBeInTheDocument();
  });
});
