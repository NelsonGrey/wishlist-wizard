// Define the gtag function globally
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

let _gaLoaded = false;

// Initialize Google Analytics — only call after the user has granted analytics consent.
// The Consent Mode v2 defaults in index.html ensure no data is sent before this runs.
export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId || _gaLoaded) return;

  // Verify consent before loading the script
  try {
    const stored = JSON.parse(localStorage.getItem('ww_consent') || 'null');
    if (!stored?.analytics) return;
  } catch {
    return;
  }

  _gaLoaded = true;

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', measurementId);
};

// Track page views - useful for single-page applications
export const trackPageView = (url: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) return;
  
  window.gtag('config', measurementId, {
    page_path: url
  });
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