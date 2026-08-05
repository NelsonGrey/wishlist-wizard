import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { FirebaseApp } from 'firebase/app';

const sdkGetBoolean = vi.fn();
const fetchAndActivate = vi.fn();
const getRemoteConfigSdk = vi.fn();

vi.mock('firebase/remote-config', () => ({
  getRemoteConfig: (...args: unknown[]) => getRemoteConfigSdk(...args),
  fetchAndActivate: (...args: unknown[]) => fetchAndActivate(...args),
  getBoolean: (...args: unknown[]) => sdkGetBoolean(...args),
  getString: vi.fn(() => ''),
  getNumber: vi.fn(() => 0),
}));

// Imported after the mock so the module under test picks it up.
const { RemoteConfigManager, FeatureFlags } = await import('./remote-config');

const fakeApp = {} as FirebaseApp;

describe('RemoteConfigManager — availability flags', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchAndActivate.mockResolvedValue(true);
    getRemoteConfigSdk.mockReturnValue({ settings: {} });
  });

  it('defaults marketing_offline and app_offline to true (fail closed) before initialize()', () => {
    const manager = new RemoteConfigManager();
    expect(manager.isFeatureEnabled(FeatureFlags.MARKETING_OFFLINE)).toBe(true);
    expect(manager.isFeatureEnabled(FeatureFlags.APP_OFFLINE)).toBe(true);
  });

  it('sets both flags in the SDK defaultConfig on initialize()', async () => {
    const manager = new RemoteConfigManager();
    await manager.initialize(fakeApp);
    const rcInstance = getRemoteConfigSdk.mock.results[0].value;
    expect(rcInstance.defaultConfig.marketing_offline).toBe(true);
    expect(rcInstance.defaultConfig.app_offline).toBe(true);
  });

  it('delegates isFeatureEnabled to the real SDK after initialize()', async () => {
    const manager = new RemoteConfigManager();
    await manager.initialize(fakeApp);
    sdkGetBoolean.mockReturnValue(false);

    expect(manager.isFeatureEnabled(FeatureFlags.APP_OFFLINE)).toBe(false);
    expect(sdkGetBoolean).toHaveBeenCalledWith(expect.anything(), 'app_offline');
  });

  it('stays fail-closed if fetchAndActivate rejects — never throws', async () => {
    fetchAndActivate.mockRejectedValue(new Error('network down'));
    const manager = new RemoteConfigManager();

    await expect(manager.initialize(fakeApp)).resolves.toBeUndefined();
    // remoteConfigInstance was still set, so this now reads via the SDK,
    // which reflects its own defaultConfig (also fail-closed) since no
    // fetch ever activated.
    sdkGetBoolean.mockReturnValue(true);
    expect(manager.isFeatureEnabled(FeatureFlags.APP_OFFLINE)).toBe(true);
  });

  it('stays fail-closed if getRemoteConfig(app) itself throws', async () => {
    getRemoteConfigSdk.mockImplementation(() => {
      throw new Error('no Firebase app');
    });
    const manager = new RemoteConfigManager();

    await manager.initialize(fakeApp);

    expect(manager.isFeatureEnabled(FeatureFlags.MARKETING_OFFLINE)).toBe(true);
    expect(manager.isFeatureEnabled(FeatureFlags.APP_OFFLINE)).toBe(true);
  });
});
