import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const getMessaging = vi.fn(() => ({ __type: 'messaging' }));
const getToken = vi.fn();
const onMessage = vi.fn();
const isSupported = vi.fn().mockResolvedValue(true);

vi.mock('firebase/messaging', () => ({
  getMessaging: (...args: unknown[]) => getMessaging(...args),
  getToken: (...args: unknown[]) => getToken(...args),
  onMessage: (...args: unknown[]) => onMessage(...args),
  isSupported: () => isSupported(),
}));

const doc = vi.fn((_db: unknown, path: string, id?: string) => ({ __type: 'doc', path, id }));
const getDoc = vi.fn();
const setDoc = vi.fn();
const updateDoc = vi.fn();

vi.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => doc(...(args as [unknown, string, string?])),
  getDoc: (...args: unknown[]) => getDoc(...args),
  setDoc: (...args: unknown[]) => setDoc(...args),
  updateDoc: (...args: unknown[]) => updateDoc(...args),
}));

const getFirestoreDb = vi.fn(() => ({ __type: 'db' }));
vi.mock('@/lib/firestore', () => ({
  getFirestoreDb: () => getFirestoreDb(),
}));

let mockFirebaseApp: unknown = { __type: 'app' };
let mockCurrentUser: { uid: string } | null = { uid: 'user-1' };
vi.mock('@/lib/firebase', () => ({
  get firebaseApp() {
    return mockFirebaseApp;
  },
  getCurrentUser: () => mockCurrentUser,
}));

const apiRequest = vi.fn();
vi.mock('@/lib/queryClient', () => ({ apiRequest }));

async function loadFcmModule() {
  vi.resetModules();
  return import('@/lib/fcm');
}

function stubNotification(overrides: Partial<{ permission: NotificationPermission; requestPermission: () => Promise<NotificationPermission> }> = {}) {
  const requestPermission = overrides.requestPermission ?? vi.fn().mockResolvedValue('granted');
  const NotificationStub = vi.fn() as unknown as typeof Notification;
  Object.assign(NotificationStub, {
    permission: overrides.permission ?? 'default',
    requestPermission,
  });
  Object.defineProperty(window, 'Notification', {
    configurable: true,
    writable: true,
    value: NotificationStub,
  });
  return { requestPermission };
}

describe('fcm.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFirebaseApp = { __type: 'app' };
    mockCurrentUser = { uid: 'user-1' };
    isSupported.mockResolvedValue(true);
    // @ts-expect-error -- test cleanup between runs
    delete window.Notification;
    // @ts-expect-error -- test cleanup between runs
    delete navigator.serviceWorker;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initializeFCM', () => {
    it('returns false when messaging is not supported', async () => {
      isSupported.mockResolvedValue(false);
      const { initializeFCM } = await loadFcmModule();

      const result = await initializeFCM();

      expect(result).toBe(false);
      expect(getMessaging).not.toHaveBeenCalled();
    });

    it('returns false when firebaseApp is not initialized', async () => {
      mockFirebaseApp = null;
      const { initializeFCM } = await loadFcmModule();

      expect(await initializeFCM()).toBe(false);
    });

    it('initializes messaging and returns true', async () => {
      const { initializeFCM } = await loadFcmModule();

      const result = await initializeFCM();

      expect(result).toBe(true);
      expect(getMessaging).toHaveBeenCalledWith(mockFirebaseApp);
    });

    it('returns false when getMessaging throws', async () => {
      getMessaging.mockImplementation(() => {
        throw new Error('boom');
      });
      const { initializeFCM } = await loadFcmModule();

      expect(await initializeFCM()).toBe(false);
    });
  });

  describe('requestNotificationPermission', () => {
    it('returns null and does not request permission when the browser has no Notification API', async () => {
      const { requestNotificationPermission } = await loadFcmModule();

      const result = await requestNotificationPermission();

      expect(result).toBeNull();
    });

    it('returns null when the user denies permission', async () => {
      stubNotification({ requestPermission: vi.fn().mockResolvedValue('denied') });
      const { requestNotificationPermission } = await loadFcmModule();

      expect(await requestNotificationPermission()).toBeNull();
      expect(getToken).not.toHaveBeenCalled();
    });

    it('returns null when initializeFCM fails (not supported)', async () => {
      isSupported.mockResolvedValue(false);
      stubNotification();
      const { requestNotificationPermission } = await loadFcmModule();

      expect(await requestNotificationPermission()).toBeNull();
    });

    it('acquires a token, saves it via apiRequest, and returns it when granted', async () => {
      stubNotification();
      getToken.mockResolvedValue('fcm-token-abc');
      const { requestNotificationPermission } = await loadFcmModule();

      const result = await requestNotificationPermission();

      expect(result).toBe('fcm-token-abc');
      expect(apiRequest).toHaveBeenCalledWith('/api/fcm/token', {
        method: 'POST',
        body: expect.objectContaining({ token: 'fcm-token-abc', platform: 'web', enabled: true }),
        useFirebaseFunctions: true,
      });
    });

    it('does not attempt to save the token when there is no authenticated user', async () => {
      mockCurrentUser = null;
      stubNotification();
      getToken.mockResolvedValue('fcm-token-abc');
      const { requestNotificationPermission } = await loadFcmModule();

      await requestNotificationPermission();

      expect(apiRequest).not.toHaveBeenCalled();
    });

    it('returns null when getToken resolves with no token', async () => {
      stubNotification();
      getToken.mockResolvedValue(null);
      const { requestNotificationPermission } = await loadFcmModule();

      expect(await requestNotificationPermission()).toBeNull();
    });

    it('does not save the token and swallows a save failure without throwing', async () => {
      stubNotification();
      getToken.mockResolvedValue('fcm-token-abc');
      apiRequest.mockRejectedValue(new Error('offline'));
      const { requestNotificationPermission } = await loadFcmModule();

      await expect(requestNotificationPermission()).resolves.toBe('fcm-token-abc');
    });
  });

  describe('setupForegroundMessageListener', () => {
    it('returns null when messaging has not been initialized', async () => {
      const { setupForegroundMessageListener } = await loadFcmModule();
      expect(setupForegroundMessageListener(vi.fn())).toBeNull();
    });

    it('registers an onMessage listener and returns its unsubscribe function', async () => {
      const unsubscribe = vi.fn();
      onMessage.mockReturnValue(unsubscribe);
      const { initializeFCM, setupForegroundMessageListener } = await loadFcmModule();
      await initializeFCM();

      const result = setupForegroundMessageListener(vi.fn());

      expect(onMessage).toHaveBeenCalled();
      expect(result).toBe(unsubscribe);
    });

    it('shows a notification via the service worker registration and calls the callback', async () => {
      const showNotification = vi.fn();
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: { ready: Promise.resolve({ showNotification }) },
      });
      stubNotification({ permission: 'granted' });
      let capturedHandler: ((payload: unknown) => void) | undefined;
      onMessage.mockImplementation((_messaging, handler) => {
        capturedHandler = handler;
        return vi.fn();
      });
      const { initializeFCM, setupForegroundMessageListener } = await loadFcmModule();
      await initializeFCM();
      const onMessageReceived = vi.fn();
      setupForegroundMessageListener(onMessageReceived);

      const payload = { notification: { title: 'Hi', body: 'There' }, data: { type: 'wishlist' } };
      capturedHandler?.(payload);
      await Promise.resolve();
      await Promise.resolve();

      expect(showNotification).toHaveBeenCalledWith('Hi', expect.objectContaining({ body: 'There', tag: 'wishlist' }));
      expect(onMessageReceived).toHaveBeenCalledWith(payload);
    });

    it('does nothing extra when the payload has no notification field', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        configurable: true,
        value: { ready: Promise.resolve({ showNotification: vi.fn() }) },
      });
      let capturedHandler: ((payload: unknown) => void) | undefined;
      onMessage.mockImplementation((_messaging, handler) => {
        capturedHandler = handler;
        return vi.fn();
      });
      const { initializeFCM, setupForegroundMessageListener } = await loadFcmModule();
      await initializeFCM();
      const onMessageReceived = vi.fn();
      setupForegroundMessageListener(onMessageReceived);

      const payload = { data: { silent: 'true' } };
      expect(() => capturedHandler?.(payload)).not.toThrow();
      expect(onMessageReceived).toHaveBeenCalledWith(payload);
    });
  });

  describe('getNotificationPreferences', () => {
    it('returns defaults immediately when there is no authenticated user', async () => {
      mockCurrentUser = null;
      const { getNotificationPreferences } = await loadFcmModule();

      const result = await getNotificationPreferences();

      expect(result.enabled).toBe(true);
      expect(getDoc).not.toHaveBeenCalled();
    });

    it('merges stored preferences over the defaults when a doc exists', async () => {
      getDoc.mockResolvedValue({ exists: () => true, data: () => ({ enabled: false }) });
      const { getNotificationPreferences } = await loadFcmModule();

      const result = await getNotificationPreferences();

      expect(result.enabled).toBe(false);
      expect(result.types.itemAdded).toBe(true); // default preserved
    });

    it('creates default preferences via setDoc when none exist yet', async () => {
      getDoc.mockResolvedValue({ exists: () => false });
      const { getNotificationPreferences } = await loadFcmModule();

      const result = await getNotificationPreferences();

      expect(setDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ enabled: true }));
      expect(result.enabled).toBe(true);
    });

    it('falls back to defaults when reading throws', async () => {
      getDoc.mockRejectedValue(new Error('offline'));
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { getNotificationPreferences } = await loadFcmModule();

      const result = await getNotificationPreferences();

      expect(result.enabled).toBe(true);
    });
  });

  describe('updateNotificationPreferences', () => {
    it('returns false when there is no authenticated user', async () => {
      mockCurrentUser = null;
      const { updateNotificationPreferences } = await loadFcmModule();

      expect(await updateNotificationPreferences({ enabled: false })).toBe(false);
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('updates the preferences doc and returns true', async () => {
      const { updateNotificationPreferences } = await loadFcmModule();

      const result = await updateNotificationPreferences({ enabled: false });

      expect(doc).toHaveBeenCalledWith(expect.anything(), 'userNotificationPreferences', 'user-1');
      expect(updateDoc).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ enabled: false, lastUpdated: expect.any(Date) }));
      expect(result).toBe(true);
    });

    it('returns false when updateDoc throws', async () => {
      updateDoc.mockRejectedValue(new Error('offline'));
      vi.spyOn(console, 'error').mockImplementation(() => {});
      const { updateNotificationPreferences } = await loadFcmModule();

      expect(await updateNotificationPreferences({ enabled: false })).toBe(false);
    });
  });

  describe('isInQuietHours', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    const basePrefs = {
      enabled: true,
      types: {} as never,
      delivery: {} as never,
    };

    it('returns false when quiet hours are disabled', async () => {
      const { isInQuietHours } = await loadFcmModule();
      expect(isInQuietHours({ ...basePrefs, quietHours: { enabled: false, start: '22:00', end: '08:00' } })).toBe(false);
    });

    it('returns true within a same-day range', async () => {
      vi.setSystemTime(new Date('2026-08-27T13:00:00'));
      const { isInQuietHours } = await loadFcmModule();
      expect(isInQuietHours({ ...basePrefs, quietHours: { enabled: true, start: '12:00', end: '14:00' } })).toBe(true);
    });

    it('returns false outside a same-day range', async () => {
      vi.setSystemTime(new Date('2026-08-27T15:00:00'));
      const { isInQuietHours } = await loadFcmModule();
      expect(isInQuietHours({ ...basePrefs, quietHours: { enabled: true, start: '12:00', end: '14:00' } })).toBe(false);
    });

    it('handles a range spanning midnight -- true late at night', async () => {
      vi.setSystemTime(new Date('2026-08-27T23:30:00'));
      const { isInQuietHours } = await loadFcmModule();
      expect(isInQuietHours({ ...basePrefs, quietHours: { enabled: true, start: '22:00', end: '08:00' } })).toBe(true);
    });

    it('handles a range spanning midnight -- true early morning', async () => {
      vi.setSystemTime(new Date('2026-08-27T05:00:00'));
      const { isInQuietHours } = await loadFcmModule();
      expect(isInQuietHours({ ...basePrefs, quietHours: { enabled: true, start: '22:00', end: '08:00' } })).toBe(true);
    });

    it('handles a range spanning midnight -- false during the day', async () => {
      vi.setSystemTime(new Date('2026-08-27T12:00:00'));
      const { isInQuietHours } = await loadFcmModule();
      expect(isInQuietHours({ ...basePrefs, quietHours: { enabled: true, start: '22:00', end: '08:00' } })).toBe(false);
    });
  });

  describe('subscribeToTopic', () => {
    it('returns false when notification permission cannot be obtained', async () => {
      const { subscribeToTopic } = await loadFcmModule();
      expect(await subscribeToTopic('deals')).toBe(false);
      expect(apiRequest).not.toHaveBeenCalled();
    });

    it('subscribes via apiRequest once a token is obtained', async () => {
      stubNotification();
      getToken.mockResolvedValue('fcm-token-abc');
      const { subscribeToTopic } = await loadFcmModule();

      const result = await subscribeToTopic('deals');

      expect(result).toBe(true);
      expect(apiRequest).toHaveBeenCalledWith('/api/fcm/subscribe-topic', {
        method: 'POST',
        body: { token: 'fcm-token-abc', topic: 'deals' },
        useFirebaseFunctions: true,
      });
    });

    it('returns false when the subscribe request throws', async () => {
      stubNotification();
      getToken.mockResolvedValue('fcm-token-abc');
      apiRequest.mockRejectedValue(new Error('offline'));
      const { subscribeToTopic } = await loadFcmModule();

      expect(await subscribeToTopic('deals')).toBe(false);
    });
  });

  describe('unsubscribeFromTopic', () => {
    it('returns false when there is no authenticated user', async () => {
      mockCurrentUser = null;
      const { unsubscribeFromTopic } = await loadFcmModule();
      expect(await unsubscribeFromTopic('deals')).toBe(false);
    });

    it('unsubscribes via apiRequest and returns true', async () => {
      const { unsubscribeFromTopic } = await loadFcmModule();

      const result = await unsubscribeFromTopic('deals');

      expect(result).toBe(true);
      expect(apiRequest).toHaveBeenCalledWith('/api/fcm/unsubscribe-topic', {
        method: 'POST',
        body: { topic: 'deals' },
        useFirebaseFunctions: true,
      });
    });

    it('returns false when the request throws', async () => {
      apiRequest.mockRejectedValue(new Error('offline'));
      const { unsubscribeFromTopic } = await loadFcmModule();

      expect(await unsubscribeFromTopic('deals')).toBe(false);
    });
  });

  describe('sendTestNotification', () => {
    it('calls the test-notification endpoint and returns true', async () => {
      const { sendTestNotification } = await loadFcmModule();

      expect(await sendTestNotification()).toBe(true);
      expect(apiRequest).toHaveBeenCalledWith('/api/fcm/test-notification', {
        method: 'POST',
        useFirebaseFunctions: true,
      });
    });

    it('returns false when the request throws', async () => {
      apiRequest.mockRejectedValue(new Error('offline'));
      const { sendTestNotification } = await loadFcmModule();

      expect(await sendTestNotification()).toBe(false);
    });
  });

  describe('getCurrentFCMToken', () => {
    it('initializes messaging first if needed, then returns the token', async () => {
      getToken.mockResolvedValue('fcm-token-xyz');
      const { getCurrentFCMToken } = await loadFcmModule();

      const result = await getCurrentFCMToken();

      expect(getMessaging).toHaveBeenCalled();
      expect(result).toBe('fcm-token-xyz');
    });

    it('returns null when initialization fails', async () => {
      isSupported.mockResolvedValue(false);
      const { getCurrentFCMToken } = await loadFcmModule();

      expect(await getCurrentFCMToken()).toBeNull();
    });

    it('returns null when getToken resolves falsy', async () => {
      getToken.mockResolvedValue(undefined);
      const { getCurrentFCMToken } = await loadFcmModule();

      expect(await getCurrentFCMToken()).toBeNull();
    });
  });

  describe('isFCMAvailable', () => {
    it('returns true when supported and permission is granted', async () => {
      stubNotification({ permission: 'granted' });
      const { isFCMAvailable } = await loadFcmModule();

      expect(await isFCMAvailable()).toBe(true);
    });

    it('returns false when permission has not been granted', async () => {
      stubNotification({ permission: 'default' });
      const { isFCMAvailable } = await loadFcmModule();

      expect(await isFCMAvailable()).toBe(false);
    });

    it('returns false when messaging is not supported at all', async () => {
      isSupported.mockResolvedValue(false);
      const { isFCMAvailable } = await loadFcmModule();

      expect(await isFCMAvailable()).toBe(false);
    });

    it('returns false when the support check throws', async () => {
      isSupported.mockRejectedValue(new Error('boom'));
      const { isFCMAvailable } = await loadFcmModule();

      expect(await isFCMAvailable()).toBe(false);
    });
  });
});
