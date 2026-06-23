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

  // Best-effort backend tracking (does not block UI)
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