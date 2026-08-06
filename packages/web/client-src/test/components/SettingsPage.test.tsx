import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { render } from '../utils';
import Settings from '@/pages/Settings';

const mockReauthenticateWithPassword = vi.fn();
const mockUpdatePassword = vi.fn();
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
    user: {
      uid: '100',
      email: 'mark@example.com',
      displayName: 'Mark Nelson',
      photoURL: null,
    },
    checkPasswordPolicy: mockCheckPasswordPolicy,
    reauthenticateWithPassword: mockReauthenticateWithPassword,
    updatePassword: mockUpdatePassword,
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
    mockCheckPasswordPolicy.mockResolvedValue({
      isValid: true,
      meetsMinPasswordLength: true,
      containsLowercaseLetter: true,
      containsUppercaseLetter: true,
      containsNumericCharacter: true,
      containsNonAlphanumericCharacter: true,
      passwordPolicy: { customStrengthOptions: {} },
    });
    mockReauthenticateWithPassword.mockResolvedValue(undefined);
    mockUpdatePassword.mockResolvedValue(undefined);
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

  describe('Change Password dialog', () => {
    it('opens from the Change Password button and shows the policy hint', async () => {
      render(<Settings />, { pathname: '/app/settings' });
      const user = userEvent.setup();

      await user.click(screen.getByTestId('settings-tab-account'));
      await user.click(await screen.findByRole('button', { name: 'Change Password' }));

      expect(await screen.findByRole('dialog', { name: 'Change Password' })).toBeInTheDocument();
      expect(await screen.findByTestId('change-password-hint')).toHaveTextContent(/at least 8 characters/);
    });

    it('shows a reauth error and does not update the password on wrong current password', async () => {
      mockReauthenticateWithPassword.mockRejectedValue({ code: 'auth/wrong-password' });
      const user = userEvent.setup();

      render(<Settings />, { pathname: '/app/settings' });
      await user.click(screen.getByTestId('settings-tab-account'));
      await user.click(await screen.findByRole('button', { name: 'Change Password' }));

      await user.type(screen.getByTestId('change-password-current-input'), 'wrongpass');
      await user.type(screen.getByTestId('change-password-new-input'), 'NewStrong1!');
      await user.type(screen.getByTestId('change-password-confirm-input'), 'NewStrong1!');
      await user.click(screen.getByTestId('change-password-submit'));

      expect(await screen.findByText('Incorrect password.')).toBeInTheDocument();
      expect(mockUpdatePassword).not.toHaveBeenCalled();
    });

    it('blocks submit on a weak new password without reauthenticating', async () => {
      const user = userEvent.setup();

      render(<Settings />, { pathname: '/app/settings' });
      await user.click(screen.getByTestId('settings-tab-account'));
      await user.click(await screen.findByRole('button', { name: 'Change Password' }));

      await user.type(screen.getByTestId('change-password-current-input'), 'currentpass');
      await user.type(screen.getByTestId('change-password-new-input'), 'weak');
      await user.type(screen.getByTestId('change-password-confirm-input'), 'weak');
      await user.click(screen.getByTestId('change-password-submit'));

      expect(await screen.findByText('Password must be at least 8 characters long.')).toBeInTheDocument();
      expect(mockReauthenticateWithPassword).not.toHaveBeenCalled();
      expect(mockUpdatePassword).not.toHaveBeenCalled();
    });

    it('reauthenticates then updates the password on valid submit, in order', async () => {
      const callOrder: string[] = [];
      mockReauthenticateWithPassword.mockImplementation(async () => {
        callOrder.push('reauth');
      });
      mockUpdatePassword.mockImplementation(async () => {
        callOrder.push('update');
      });
      const user = userEvent.setup();

      render(<Settings />, { pathname: '/app/settings' });
      await user.click(screen.getByTestId('settings-tab-account'));
      await user.click(await screen.findByRole('button', { name: 'Change Password' }));

      await user.type(screen.getByTestId('change-password-current-input'), 'currentpass');
      await user.type(screen.getByTestId('change-password-new-input'), 'NewStrong1!');
      await user.type(screen.getByTestId('change-password-confirm-input'), 'NewStrong1!');
      await user.click(screen.getByTestId('change-password-submit'));

      await waitFor(() => expect(mockUpdatePassword).toHaveBeenCalledWith('NewStrong1!'));
      expect(mockReauthenticateWithPassword).toHaveBeenCalledWith('currentpass');
      expect(callOrder).toEqual(['reauth', 'update']);
    });

    it('blocks the update when the authoritative policy check fails', async () => {
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

      render(<Settings />, { pathname: '/app/settings' });
      await user.click(screen.getByTestId('settings-tab-account'));
      await user.click(await screen.findByRole('button', { name: 'Change Password' }));

      await user.type(screen.getByTestId('change-password-current-input'), 'currentpass');
      await user.type(screen.getByTestId('change-password-new-input'), 'NewStrong1!');
      await user.type(screen.getByTestId('change-password-confirm-input'), 'NewStrong1!');
      await user.click(screen.getByTestId('change-password-submit'));

      expect(await screen.findByText(/include an uppercase letter/)).toBeInTheDocument();
      expect(mockUpdatePassword).not.toHaveBeenCalled();
    });
  });
});
