import { useEffect, useState } from 'react';
import { FeatureFlags } from '@shared/firebase-utils';
import { initFirebase } from '@/lib/firebase';

/**
 * Runtime "app offline" kill switch, driven by Remote Config's app_offline
 * parameter so it can be flipped from the Firebase console without a
 * rebuild+redeploy — for a pre-launch window or a maintenance outage.
 * Gates sign-up/sign-in/checkout entry points AND already-authenticated
 * users' access to /app/* (see ProtectedRoute).
 *
 * Starts `true` (safe default) until the fetch-and-activate call resolves,
 * then reflects the real value. Starting from a synchronous cached value
 * instead would let a sign-in/sign-up/purchase form render — and become
 * interactive — for the brief window before the fetch resolves, even when
 * the console value is `true`.
 */
export function useAppOffline(): boolean {
  const [isOffline, setIsOffline] = useState(true);

  useEffect(() => {
    let cancelled = false;
    initFirebase({ enableRemoteConfig: true }).then(({ remoteConfig }) => {
      if (!cancelled && remoteConfig) {
        setIsOffline(remoteConfig.isFeatureEnabled(FeatureFlags.APP_OFFLINE));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return isOffline;
}
