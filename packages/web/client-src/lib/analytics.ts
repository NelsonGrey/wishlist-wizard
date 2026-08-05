// Define the dataLayer/gtag globals set up by GTM (loaded in index.html).
declare global {
  interface Window {
    dataLayer: Record<string, unknown>[];
    gtag: (...args: unknown[]) => void;
  }
}

// Track SPA page views via GTM dataLayer.
// GTM should have a Custom Event trigger on "page_view" wired to a GA4 tag.
export const trackPageView = (url: string) => {
  if (typeof window === 'undefined') return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: 'page_view', page_path: url, page_title: document.title });
};

// Only fire backend analytics in the production project.
// The metricsTrackEvent callable function is not deployed to dev/staging,
// so calling it from those environments causes CORS errors in the browser console.
const IS_PROD_PROJECT = import.meta.env.VITE_FIREBASE_PROJECT_ID === 'wishlist-wizard-prod';

// Track events
export const trackEvent = (
  action: string,
  category?: string,
  label?: string,
  value?: number
) => {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
  }

  // Best-effort backend tracking — production only to avoid CORS errors on dev/staging.
  if (!IS_PROD_PROJECT) return;

  import('./queryClient').then(({ apiRequest }) => {
    apiRequest('/api/analytics/track', {
      method: 'POST',
      body: {
        action,
        category,
        label,
        value,
      }
    }).catch(() => {
      // Ignore backend tracking errors
    });
  }).catch(() => {
    // Ignore dynamic import failures
  });
};