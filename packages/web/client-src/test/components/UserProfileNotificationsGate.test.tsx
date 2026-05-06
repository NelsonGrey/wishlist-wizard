import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import UserProfile from '@/pages/UserProfile';

let isPriceAlertsEnabled = true;

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

vi.mock('@shared/firebase-utils', async () => {
  const actual = await vi.importActual<typeof import('@shared/firebase-utils')>('@shared/firebase-utils');
  return {
    ...actual,
    FeatureFlags: {
      ...actual.FeatureFlags,
      PRICE_ALERTS_ENABLED: 'price_alerts_enabled',
    },
    getRemoteConfig: () => ({
      isFeatureEnabled: () => isPriceAlertsEnabled,
    }),
  };
});

describe('UserProfile notifications price alerts gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    isPriceAlertsEnabled = true;
  });

  it('shows price drop alerts toggle when feature flag is enabled', async () => {
    render(<UserProfile />, { pathname: '/user-profile' });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    expect(await screen.findByText('Price Drop Alerts')).toBeInTheDocument();
  });

  it('hides price drop alerts toggle when feature flag is disabled', async () => {
    isPriceAlertsEnabled = false;

    render(<UserProfile />, { pathname: '/user-profile' });
    const user = userEvent.setup();

    await user.click(screen.getByRole('button', { name: /notifications/i }));

    expect(screen.queryByText('Price Drop Alerts')).not.toBeInTheDocument();
    expect(screen.queryByText(/item prices drop/i)).not.toBeInTheDocument();
  });
});
