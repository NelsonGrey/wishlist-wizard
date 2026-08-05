import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import Settings from '@/pages/Settings';

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

vi.mock('@/hooks/useFCM', () => ({
  useFCM: () => ({
    isSupported: true,
    isEnabled: false,
    canEnable: true,
    permission: 'default',
    token: null,
    enableNotifications: vi.fn(async () => true),
    disableNotifications: vi.fn(async () => true),
    sendTestNotification: vi.fn(async () => true),
  }),
  useNotificationPreferences: () => ({
    preferences: null,
    loading: false,
    updatePreferences: vi.fn(async () => true),
  }),
}));

describe('Settings Account tab payment gating', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  it('shows deferred payments message when Stripe is not configured', async () => {
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', '');

    render(<Settings />, { pathname: '/app/settings' });
    const user = userEvent.setup();

    await user.click(screen.getByTestId('settings-tab-account'));

    expect(await screen.findByTestId('profile-payments-deferred')).toBeInTheDocument();
    expect(screen.queryByText('Add Payment Method')).not.toBeInTheDocument();
  });

  it('shows payment sections when Stripe is configured', async () => {
    vi.stubEnv('VITE_STRIPE_PUBLISHABLE_KEY', 'pk_test_12345');

    render(<Settings />, { pathname: '/app/settings' });
    const user = userEvent.setup();

    await user.click(screen.getByTestId('settings-tab-account'));

    expect(await screen.findByText('Payment Methods')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Payment Method' })).toBeInTheDocument();
    expect(screen.queryByTestId('profile-payments-deferred')).not.toBeInTheDocument();
  });
});
