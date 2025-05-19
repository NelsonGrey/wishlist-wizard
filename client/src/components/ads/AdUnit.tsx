import { useEffect, useState } from 'react';

interface AdUnitProps {
  slot: string;
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

declare global {
  interface Window {
    adsbygoogle: any[];
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
export function AdUnit({
  slot,
  format = 'auto',
  responsive = true,
  className = '',
  style = { display: 'block', textAlign: 'center' },
}: AdUnitProps) {
  const [publisherId, setPublisherId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch the publisher ID from our API
    fetch('/api/config/adsense')
      .then(response => response.json())
      .then(data => {
        if (data.publisherId) {
          setPublisherId(data.publisherId);
        } else {
          setError('Publisher ID not available');
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching AdSense config:', err);
        setError('Failed to load ad configuration');
        setLoading(false);
      });
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
    return <div className={`ad-unit-loading ${className}`} style={{ ...style, minHeight: '100px' }}></div>;
  }

  if (error) {
    // In development, show an error. In production, just render an empty div
    if (import.meta.env.DEV) {
      return (
        <div className={`ad-unit-error ${className}`} style={{ ...style, padding: '10px', border: '1px dashed #ccc' }}>
          <div>Ad unit: {error}</div>
        </div>
      );
    }
    return <div className={`ad-unit-error ${className}`} style={{ ...style, minHeight: '100px' }}></div>;
  }

  return (
    <div className={`ad-unit ${className}`}>
      <ins
        className="adsbygoogle"
        style={style}
        data-ad-client={publisherId}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}