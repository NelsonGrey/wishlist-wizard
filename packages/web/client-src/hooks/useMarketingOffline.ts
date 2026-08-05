import { useEffect, useState } from 'react';
import { FeatureFlags } from '@shared/firebase-utils';
import { initFirebase } from '@/lib/firebase';

/**
 * Runtime "marketing site offline" kill switch, driven by Remote Config's
 * marketing_offline parameter — independent of useAppOffline. Gates the
 * public marketing route group (see marketingRoutes.ts), not the app itself:
 * legal/support pages and the app stay reachable even when this is true, so
 * a marketing-site refresh doesn't lock out existing users or hide required
 * legal content.
 *
 * Starts `true` (safe default) until the fetch-and-activate call resolves,
 * for the same reason as useAppOffline — avoid a flash of live marketing
 * content before the real value is known.
 */
export function useMarketingOffline(): boolean {
  const [isOffline, setIsOffline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    initFirebase({ enableRemoteConfig: true }).then(({ remoteConfig }) => {
      if (!cancelled && remoteConfig) {
        setIsOffline(remoteConfig.isFeatureEnabled(FeatureFlags.MARKETING_OFFLINE));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return isOffline;
}
