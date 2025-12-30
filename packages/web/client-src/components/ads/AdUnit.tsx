import { useEffect, useState } from 'react';
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
  const [publisherId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Skip API calls entirely - ads will be configured when backend is ready
    setError('Ads not configured');
    setLoading(false);
    
    /* This code is disabled until backend APIs are deployed
    fetch('/api/config/adsense')
      .then(response => {
        // Check if the response is actually JSON before trying to parse it
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return response.json();
        } else {
          // If it's not JSON (e.g., HTML 404 page), treat as unavailable
          throw new Error('AdSense configuration not available');
        }
      })
      .then(data => {
        if (data.publisherId) {
          setPublisherId(data.publisherId);
        } else {
          setError('Publisher ID not available');
        }
        setLoading(false);
      })
      .catch(err => {
        // Silently handle AdSense config errors
        setError('AdSense not configured');
        setLoading(false);
      });
    */
  }, []);

  useEffect(() => {
    // Only push the ad to Google AdSense when the component mounts and we have a publisherId
    if (publisherId && !loading) {
      try {
        // Initialize the adsbygoogle object if it doesn't exist
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.error('AdSense error:', error);
      }
    }
  }, [publisherId, loading]);

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
    <div className={`ad-unit ${className}`}>
      <ins
        className="adsbygoogle"
        data-ad-client={publisherId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}