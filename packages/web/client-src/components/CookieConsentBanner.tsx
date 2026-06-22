import React, { useState } from "react";
import { useConsent } from "@/hooks/useConsent";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { X } from "lucide-react";

export default function CookieConsentBanner() {
  const { consent, acceptAll, declineAll, acceptSelected } = useConsent();
  const [showPrefs, setShowPrefs] = useState(false);
  const [analyticsOn, setAnalyticsOn] = useState(false);
  const [marketingOn, setMarketingOn] = useState(false);

  if (consent.decided) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white shadow-2xl"
    >
      <div className="container mx-auto max-w-6xl px-4 py-4">
        {!showPrefs ? (
          /* ── Main banner ── */
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-gray-700 leading-relaxed">
              We use cookies and Google services (Analytics, Tag Manager) to
              improve your experience and understand how you use Wishlist
              Wizard.{" "}
              <a href="/privacy" className="underline hover:text-emerald-700">
                Privacy Policy
              </a>
            </p>
            <div className="flex flex-shrink-0 flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowPrefs(true)}
              >
                Manage Preferences
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={declineAll}
              >
                Decline All
              </Button>
              <Button
                size="sm"
                className="bg-emerald-700 text-white hover:bg-emerald-800"
                onClick={acceptAll}
              >
                Accept All
              </Button>
            </div>
          </div>
        ) : (
          /* ── Preferences panel ── */
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-gray-900">
                Cookie Preferences
              </h2>
              <button
                onClick={() => setShowPrefs(false)}
                aria-label="Close preferences"
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={18} />
              </button>
            </div>

            {/* Necessary – always on */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 bg-gray-50 p-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Necessary</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Authentication, security, and core site functionality. Always
                  active.
                </p>
              </div>
              <Switch checked disabled aria-label="Necessary cookies always on" />
            </div>

            {/* Analytics */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 p-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Analytics (Google Analytics / Firebase)
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Helps us understand page views, feature usage, and
                  performance. No personal data is sold.
                </p>
              </div>
              <Switch
                checked={analyticsOn}
                onCheckedChange={setAnalyticsOn}
                aria-label="Analytics cookies"
              />
            </div>

            {/* Marketing */}
            <div className="flex items-start justify-between gap-4 rounded-lg border border-gray-100 p-3">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Marketing (Google Tag Manager)
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Allows measurement of ad campaigns. Required for Google
                  Consent Mode ad features.
                </p>
              </div>
              <Switch
                checked={marketingOn}
                onCheckedChange={setMarketingOn}
                aria-label="Marketing cookies"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={declineAll}>
                Decline All
              </Button>
              <Button
                size="sm"
                className="bg-emerald-700 text-white hover:bg-emerald-800"
                onClick={() =>
                  acceptSelected({ analytics: analyticsOn, marketing: marketingOn })
                }
              >
                Save Preferences
              </Button>
              <Button
                size="sm"
                className="bg-emerald-700 text-white hover:bg-emerald-800"
                onClick={acceptAll}
              >
                Accept All
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
