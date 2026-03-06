import { useEffect, useRef, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import '../../styles/ads.css';

interface AdUnitProps {
  slot: string;
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

/**
 * AdUnit component for displaying Google AdSense ads
 * 
 * @param slot - The AdSense ad unit slot ID
 * @param format - Ad format (auto, horizontal, vertical, rectangle)
 * @param responsive - Whether the ad should be responsive
 * @param className - Additional CSS classes
 * @param style - Additional inline styles
 */
/**
 * ResponsiveAd component for displaying responsive Google AdSense ads
 * with predefined, commonly used ad format
 */
export function ResponsiveAd({ className = '' }: { className?: string }) {
  // Using a standard responsive ad slot
  return (
    <div className={`responsive-ad-container ${className}`}>
      <AdUnit 
        slot="5198775482" 
        format="auto" 
        responsive={true} 
        className="w-full"
      />
    </div>
  );
}

/**
 * SidebarAd component for displaying vertical ads in sidebars
 */
export function SidebarAd({ className = '' }: { className?: string }) {
  return (
    <div className={`sidebar-ad-container ${className}`}>
      <AdUnit 
        slot="7389144625" 
        format="vertical" 
        responsive={false} 
        className="w-full"
      />
    </div>
  );
}

/**
 * InlineAd component for displaying horizontal ads inline with content
 */
export function InlineAd({ className = '' }: { className?: string }) {
  return (
    <div className={`inline-ad-container ${className}`}>
      <AdUnit 
        slot="9287452186" 
        format="horizontal" 
        responsive={true} 
        className="w-full"
      />
    </div>
  );
}

export function AdUnit({
  slot,
  format = 'auto',
  responsive = true,
  className = '',

}: AdUnitProps) {
  const [publisherId, setPublisherId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [inView, setInView] = useState(false);
  const adElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const configuredPublisher = import.meta.env.VITE_ADSENSE_PUBLISHER_ID || '';

    if (!configuredPublisher) {
      setError('AdSense publisher is not configured');
      trackEvent('ad_slot_config_missing', 'advertising', slot);
      setLoading(false);
      return;
    }

    setPublisherId(configuredPublisher);
    setLoading(false);
  }, []);

  useEffect(() => {
    // Only push the ad to Google AdSense when the component mounts and we have a publisherId
    if (publisherId && !loading) {
      try {
        // Initialize the adsbygoogle object if it doesn't exist
        (window.adsbygoogle = window.adsbygoogle || []).push({});
        trackEvent('ad_slot_rendered', 'advertising', slot);
      } catch (error) {
        console.error('AdSense error:', error);
        trackEvent('ad_slot_render_failed', 'advertising', slot);
      }
    }
  }, [publisherId, loading, slot]);

  useEffect(() => {
    if (loading || error || inView) {
      return;
    }

    const adElement = adElementRef.current;
    if (!adElement || typeof window.IntersectionObserver === 'undefined') {
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      const entry = entries[0];
      if (!entry || !entry.isIntersecting || inView) {
        return;
      }

      setInView(true);
      trackEvent('ad_slot_viewable', 'advertising', slot);
      observer.disconnect();
    }, {
      threshold: 0.5,
    });

    observer.observe(adElement);
    return () => observer.disconnect();
  }, [loading, error, inView, slot]);

  if (loading) {
    return <div className={`ad-unit-loading ${className}`}></div>;
  }

  if (error) {
    // In development, show an error. In production, just render an empty div
    if (import.meta.env.DEV) {
      return (
        <div className={`ad-unit-error-dev ${className}`}>
          <div>Ad unit: {error}</div>
        </div>
      );
    }
    return <div className={`ad-unit-error ${className}`}></div>;
  }

  return (
    <div
      className={`ad-unit ${className}`}
      onClick={() => trackEvent('ad_slot_container_click', 'advertising', slot)}
    >
      <ins
        ref={(element) => {
          adElementRef.current = element;
        }}
        className="adsbygoogle"
        data-ad-client={publisherId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}