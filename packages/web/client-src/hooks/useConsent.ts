import { useState, useCallback } from "react";

export interface ConsentState {
  decided: boolean;   // user has made a choice (banner should hide)
  analytics: boolean; // GA / Firebase Analytics
  marketing: boolean; // ad_storage, ad_user_data
}

const STORAGE_KEY = "ww_consent";
const DEFAULT: ConsentState = { decided: false, analytics: false, marketing: false };

function readStored(): ConsentState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    // ignore
  }
  return DEFAULT;
}

function applyToGtag(consent: ConsentState) {
  if (typeof window === "undefined" || typeof window.gtag !== "function") return;
  window.gtag("consent", "update", {
    analytics_storage: consent.analytics ? "granted" : "denied",
    functionality_storage: consent.analytics ? "granted" : "denied",
    personalization_storage: consent.analytics ? "granted" : "denied",
    ad_storage: consent.marketing ? "granted" : "denied",
    ad_user_data: consent.marketing ? "granted" : "denied",
    ad_personalization: consent.marketing ? "granted" : "denied",
  });
}

export function useConsent() {
  const [consent, setConsentState] = useState<ConsentState>(readStored);

  const saveConsent = useCallback((next: ConsentState) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore
    }
    applyToGtag(next);
    setConsentState(next);

    // Load GA now if analytics just became granted and it hasn't loaded yet.
    if (next.analytics && typeof window.gtag === "function") {
      import("../lib/analytics").then(({ initGA }) => initGA());
    }
  }, []);

  const acceptAll = useCallback(() => {
    saveConsent({ decided: true, analytics: true, marketing: true });
  }, [saveConsent]);

  const declineAll = useCallback(() => {
    saveConsent({ decided: true, analytics: false, marketing: false });
  }, [saveConsent]);

  const acceptSelected = useCallback(
    (prefs: Pick<ConsentState, "analytics" | "marketing">) => {
      saveConsent({ decided: true, ...prefs });
    },
    [saveConsent]
  );

  return { consent, acceptAll, declineAll, acceptSelected };
}
