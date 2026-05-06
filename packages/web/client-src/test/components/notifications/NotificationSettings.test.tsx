import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '../../utils';
import { NotificationSettings } from '@/components/notifications/NotificationSettings';

let isPriceAlertsEnabled = true;

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
      delivery: {
        push: true,
        email: true,
        inApp: true,
      },
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '07:00',
      },
    },
    loading: false,
    updatePreferences: vi.fn(async () => true),
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

describe('NotificationSettings price alerts gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isPriceAlertsEnabled = true;
  });

  it('shows price alerts type when feature flag is enabled', () => {
    render(<NotificationSettings />, { pathname: '/app/notifications' });

    expect(screen.getByText('Price Alerts')).toBeInTheDocument();
    expect(screen.getByText(/price drops to your target price/i)).toBeInTheDocument();
  });

  it('hides price alerts type when feature flag is disabled', () => {
    isPriceAlertsEnabled = false;

    render(<NotificationSettings />, { pathname: '/app/notifications' });

    expect(screen.queryByText('Price Alerts')).not.toBeInTheDocument();
    expect(screen.queryByText(/price drops to your target price/i)).not.toBeInTheDocument();
  });
});
