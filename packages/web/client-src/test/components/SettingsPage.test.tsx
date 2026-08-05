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
    preferences: {
      types: {
        itemAdded: true,
        itemReserved: true,
        itemPurchased: true,
        priceAlerts: true,
        collaborationInvites: true,
        wishlistShared: true,
        systemNotifications: true,
      },
      delivery: { push: true, email: true, inApp: true },
      quietHours: { enabled: false, start: '22:00', end: '07:00' },
    },
    loading: false,
    updatePreferences: vi.fn(async () => true),
  }),
}));

describe('Settings page (App Settings hub)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows Notification Settings on the default tab', async () => {
    render(<Settings />, { pathname: '/app/settings' });

    expect(await screen.findByText('Notification Settings')).toBeInTheDocument();
  });

  it('shows Default Privacy Preferences on the Privacy tab', async () => {
    render(<Settings />, { pathname: '/app/settings' });
    const user = userEvent.setup();

    await user.click(screen.getByTestId('settings-tab-privacy'));

    expect(await screen.findByText('Default Privacy Preferences')).toBeInTheDocument();
  });

  it('shows theme/regional Preferences on the Preferences tab', async () => {
    render(<Settings />, { pathname: '/app/settings' });
    const user = userEvent.setup();

    await user.click(screen.getByTestId('settings-tab-preferences'));

    expect(await screen.findByLabelText('Theme')).toBeInTheDocument();
    expect(screen.getByLabelText('Language')).toBeInTheDocument();
    expect(screen.getByLabelText('Currency')).toBeInTheDocument();
  });
});
