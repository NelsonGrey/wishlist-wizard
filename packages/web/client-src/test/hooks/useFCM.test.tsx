import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';

const initializeFCM = vi.fn();
const requestNotificationPermission = vi.fn();
const setupForegroundMessageListener = vi.fn();
const getNotificationPreferences = vi.fn();
const updateNotificationPreferences = vi.fn();
const getCurrentFCMToken = vi.fn();
const isFCMAvailable = vi.fn();

vi.mock('@/lib/fcm', () => ({
  initializeFCM: (...a: unknown[]) => initializeFCM(...a),
  requestNotificationPermission: (...a: unknown[]) => requestNotificationPermission(...a),
  setupForegroundMessageListener: (...a: unknown[]) => setupForegroundMessageListener(...a),
  getNotificationPreferences: (...a: unknown[]) => getNotificationPreferences(...a),
  updateNotificationPreferences: (...a: unknown[]) => updateNotificationPreferences(...a),
  getCurrentFCMToken: (...a: unknown[]) => getCurrentFCMToken(...a),
  isFCMAvailable: (...a: unknown[]) => isFCMAvailable(...a),
}));

let mockUser: { uid: string } | null = { uid: 'user-1' };
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('@/lib/queryClient', () => ({ apiRequest }));

const DEFAULT_PREFS = {
  enabled: true,
  types: {} as Record<string, boolean>,
  delivery: {} as Record<string, boolean>,
  quietHours: { enabled: false, start: '22:00', end: '08:00' },
};

function stubNotificationPermission(permission: NotificationPermission) {
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    writable: true,
    value: { permission },
  });
}

describe('useFCM hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { uid: 'user-1' };
    isFCMAvailable.mockResolvedValue(false);
    initializeFCM.mockResolvedValue(false);
    getNotificationPreferences.mockResolvedValue(DEFAULT_PREFS);
    setupForegroundMessageListener.mockReturnValue(vi.fn());
    stubNotificationPermission('default');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('useFCM', () => {
    it('finishes loading without initializing when there is no user', async () => {
      mockUser = null;
      const { useFCM } = await import('@/hooks/useFCM');
      const { result } = renderHook(() => useFCM());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(isFCMAvailable).not.toHaveBeenCalled();
    });

    it('marks unsupported when isFCMAvailable is false, without initializing', async () => {
      isFCMAvailable.mockResolvedValue(false);
      const { useFCM } = await import('@/hooks/useFCM');

      const { result } = renderHook(() => useFCM());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.isSupported).toBe(false);
      expect(initializeFCM).not.toHaveBeenCalled();
    });

    it('initializes, reads permission, fetches a token when granted, and loads preferences', async () => {
      isFCMAvailable.mockResolvedValue(true);
      initializeFCM.mockResolvedValue(true);
      stubNotificationPermission('granted');
      getCurrentFCMToken.mockResolvedValue('fcm-token-1');
      getNotificationPreferences.mockResolvedValue({ ...DEFAULT_PREFS, enabled: true });
      const { useFCM } = await import('@/hooks/useFCM');

      const { result } = renderHook(() => useFCM());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.isInitialized).toBe(true);
      expect(result.current.permission).toBe('granted');
      expect(result.current.token).toBe('fcm-token-1');
      expect(result.current.preferences?.enabled).toBe(true);
      expect(result.current.isEnabled).toBe(true);
    });

    it('does not fetch a token when permission is not granted', async () => {
      isFCMAvailable.mockResolvedValue(true);
      initializeFCM.mockResolvedValue(true);
      stubNotificationPermission('default');
      const { useFCM } = await import('@/hooks/useFCM');

      const { result } = renderHook(() => useFCM());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(getCurrentFCMToken).not.toHaveBeenCalled();
      expect(result.current.token).toBeNull();
    });

    it('sets up the foreground listener once initialized and dispatches fcm-message on receipt', async () => {
      isFCMAvailable.mockResolvedValue(true);
      initializeFCM.mockResolvedValue(true);
      let capturedCallback: ((payload: unknown) => void) | undefined;
      setupForegroundMessageListener.mockImplementation((cb) => {
        capturedCallback = cb;
        return vi.fn();
      });
      const { useFCM } = await import('@/hooks/useFCM');
      const { result } = renderHook(() => useFCM());
      await waitFor(() => expect(result.current.isInitialized).toBe(true));

      const dispatched = vi.fn();
      window.addEventListener('fcm-message', dispatched);
      act(() => {
        capturedCallback?.({ notification: { title: 'Hi' } });
      });

      expect(dispatched).toHaveBeenCalledTimes(1);
      window.removeEventListener('fcm-message', dispatched);
    });

    it('swallows an initialization error and still stops loading', async () => {
      isFCMAvailable.mockRejectedValue(new Error('boom'));
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { useFCM } = await import('@/hooks/useFCM');

      const { result } = renderHook(() => useFCM());

      await waitFor(() => expect(result.current.loading).toBe(false));
    });

    describe('enableNotifications', () => {
      it('sets token/permission and flips preferences.enabled on success', async () => {
        getNotificationPreferences.mockResolvedValue({ ...DEFAULT_PREFS, enabled: false });
        isFCMAvailable.mockResolvedValue(true);
        initializeFCM.mockResolvedValue(true);
        const { useFCM } = await import('@/hooks/useFCM');
        const { result } = renderHook(() => useFCM());
        await waitFor(() => expect(result.current.loading).toBe(false));

        requestNotificationPermission.mockResolvedValue('new-token');
        updateNotificationPreferences.mockResolvedValue(true);

        let success: boolean | undefined;
        await act(async () => {
          success = await result.current.enableNotifications();
        });

        expect(success).toBe(true);
        expect(result.current.token).toBe('new-token');
        expect(result.current.permission).toBe('granted');
        expect(updateNotificationPreferences).toHaveBeenCalledWith(expect.objectContaining({ enabled: true }));
      });

      it('falls back to the current browser permission and returns false when no token is granted', async () => {
        const { useFCM } = await import('@/hooks/useFCM');
        const { result } = renderHook(() => useFCM());
        await waitFor(() => expect(result.current.loading).toBe(false));

        requestNotificationPermission.mockResolvedValue(null);
        stubNotificationPermission('denied');

        let success: boolean | undefined;
        await act(async () => {
          success = await result.current.enableNotifications();
        });

        expect(success).toBe(false);
        expect(result.current.permission).toBe('denied');
      });

      it('returns false when requestNotificationPermission throws', async () => {
        const { useFCM } = await import('@/hooks/useFCM');
        const { result } = renderHook(() => useFCM());
        await waitFor(() => expect(result.current.loading).toBe(false));
        requestNotificationPermission.mockRejectedValue(new Error('boom'));
        vi.spyOn(console, 'error').mockImplementation(() => {});

        let success: boolean | undefined;
        await act(async () => {
          success = await result.current.enableNotifications();
        });

        expect(success).toBe(false);
      });
    });

    describe('disableNotifications', () => {
      // preferences is only ever populated by the main init effect when
      // isFCMAvailable/initializeFCM both resolve true (see the "does not
      // fetch a token..." test above for the unsupported case) -- and
      // disableNotifications/updatePreferences are no-ops (return true /
      // skip the update call) when preferences is still null. So these
      // must go through the full supported+initialized path to be
      // meaningful.
      beforeEach(() => {
        isFCMAvailable.mockResolvedValue(true);
        initializeFCM.mockResolvedValue(true);
      });

      it('flips preferences.enabled to false', async () => {
        getNotificationPreferences.mockResolvedValue({ ...DEFAULT_PREFS, enabled: true });
        const { useFCM } = await import('@/hooks/useFCM');
        const { result } = renderHook(() => useFCM());
        await waitFor(() => expect(result.current.preferences?.enabled).toBe(true));
        updateNotificationPreferences.mockResolvedValue(true);

        let success: boolean | undefined;
        await act(async () => {
          success = await result.current.disableNotifications();
        });

        expect(success).toBe(true);
        expect(result.current.preferences?.enabled).toBe(false);
      });

      it('returns false when the update throws', async () => {
        getNotificationPreferences.mockResolvedValue({ ...DEFAULT_PREFS, enabled: true });
        const { useFCM } = await import('@/hooks/useFCM');
        const { result } = renderHook(() => useFCM());
        await waitFor(() => expect(result.current.preferences?.enabled).toBe(true));
        updateNotificationPreferences.mockRejectedValue(new Error('boom'));
        vi.spyOn(console, 'error').mockImplementation(() => {});

        let success: boolean | undefined;
        await act(async () => {
          success = await result.current.disableNotifications();
        });

        expect(success).toBe(false);
      });
    });

    describe('updatePreferences', () => {
      beforeEach(() => {
        isFCMAvailable.mockResolvedValue(true);
        initializeFCM.mockResolvedValue(true);
      });

      it('merges the patch into local state when the update succeeds', async () => {
        getNotificationPreferences.mockResolvedValue({ ...DEFAULT_PREFS, enabled: true });
        const { useFCM } = await import('@/hooks/useFCM');
        const { result } = renderHook(() => useFCM());
        await waitFor(() => expect(result.current.preferences?.enabled).toBe(true));
        updateNotificationPreferences.mockResolvedValue(true);

        await act(async () => {
          await result.current.updatePreferences({ enabled: false });
        });

        expect(result.current.preferences?.enabled).toBe(false);
      });

      it('does not merge when the update fails', async () => {
        getNotificationPreferences.mockResolvedValue({ ...DEFAULT_PREFS, enabled: true });
        const { useFCM } = await import('@/hooks/useFCM');
        const { result } = renderHook(() => useFCM());
        await waitFor(() => expect(result.current.preferences?.enabled).toBe(true));
        updateNotificationPreferences.mockResolvedValue(false);

        await act(async () => {
          await result.current.updatePreferences({ enabled: false });
        });

        expect(result.current.preferences?.enabled).toBe(true);
      });
    });

    describe('sendTestNotification', () => {
      it('posts to /api/fcm/test-notification via apiRequest and returns true', async () => {
        apiRequest.mockResolvedValue(undefined);
        const { useFCM } = await import('@/hooks/useFCM');
        const { result } = renderHook(() => useFCM());
        await waitFor(() => expect(result.current.loading).toBe(false));

        let success: boolean | undefined;
        await act(async () => {
          success = await result.current.sendTestNotification();
        });

        expect(success).toBe(true);
        expect(apiRequest).toHaveBeenCalledWith('/api/fcm/test-notification', { method: 'POST' });
      });

      it('returns false when the request throws', async () => {
        apiRequest.mockRejectedValue(new Error('offline'));
        vi.spyOn(console, 'error').mockImplementation(() => {});
        const { useFCM } = await import('@/hooks/useFCM');
        const { result } = renderHook(() => useFCM());
        await waitFor(() => expect(result.current.loading).toBe(false));

        let success: boolean | undefined;
        await act(async () => {
          success = await result.current.sendTestNotification();
        });

        expect(success).toBe(false);
      });
    });

    describe('canEnable', () => {
      it('is false when permission is denied even if supported', async () => {
        isFCMAvailable.mockResolvedValue(true);
        initializeFCM.mockResolvedValue(true);
        stubNotificationPermission('denied');
        const { useFCM } = await import('@/hooks/useFCM');

        const { result } = renderHook(() => useFCM());

        await waitFor(() => expect(result.current.loading).toBe(false));
        expect(result.current.canEnable).toBe(false);
      });
    });
  });

  describe('useFCMMessages', () => {
    it('invokes the callback with the event detail and cleans up on unmount', async () => {
      const { useFCMMessages } = await import('@/hooks/useFCM');
      const callback = vi.fn();
      const { unmount } = renderHook(() => useFCMMessages(callback));

      window.dispatchEvent(new CustomEvent('fcm-message', { detail: { notification: { title: 'Hi' } } }));
      expect(callback).toHaveBeenCalledWith({ notification: { title: 'Hi' } });

      unmount();
      window.dispatchEvent(new CustomEvent('fcm-message', { detail: {} }));
      expect(callback).toHaveBeenCalledTimes(1); // no further calls after unmount
    });

    it('does not throw when no callback is provided', async () => {
      const { useFCMMessages } = await import('@/hooks/useFCM');
      renderHook(() => useFCMMessages());

      expect(() =>
        window.dispatchEvent(new CustomEvent('fcm-message', { detail: {} }))
      ).not.toThrow();
    });
  });

  describe('useNotificationPreferences', () => {
    it('loads preferences on mount', async () => {
      getNotificationPreferences.mockResolvedValue({ ...DEFAULT_PREFS, enabled: true });
      const { useNotificationPreferences } = await import('@/hooks/useFCM');

      const { result } = renderHook(() => useNotificationPreferences());

      await waitFor(() => expect(result.current.loading).toBe(false));
      expect(result.current.preferences?.enabled).toBe(true);
      expect(result.current.error).toBeNull();
    });

    it('surfaces a load error', async () => {
      getNotificationPreferences.mockRejectedValue(new Error('offline'));
      const { useNotificationPreferences } = await import('@/hooks/useFCM');

      const { result } = renderHook(() => useNotificationPreferences());

      await waitFor(() => expect(result.current.error).toBe('offline'));
    });

    it('updatePreferences merges the patch on success', async () => {
      getNotificationPreferences.mockResolvedValue({ ...DEFAULT_PREFS, enabled: true });
      updateNotificationPreferences.mockResolvedValue(true);
      const { useNotificationPreferences } = await import('@/hooks/useFCM');
      const { result } = renderHook(() => useNotificationPreferences());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.updatePreferences({ enabled: false });
      });

      expect(result.current.preferences?.enabled).toBe(false);
    });

    it('updatePreferences surfaces an error message on failure', async () => {
      getNotificationPreferences.mockResolvedValue({ ...DEFAULT_PREFS });
      updateNotificationPreferences.mockRejectedValue(new Error('rejected'));
      const { useNotificationPreferences } = await import('@/hooks/useFCM');
      const { result } = renderHook(() => useNotificationPreferences());
      await waitFor(() => expect(result.current.loading).toBe(false));

      await act(async () => {
        await result.current.updatePreferences({ enabled: false });
      });

      expect(result.current.error).toBe('rejected');
    });
  });
});
