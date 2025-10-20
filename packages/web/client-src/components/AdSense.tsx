import { useEffect } from 'react';

interface AdSenseProps {
  client: string;
  slot: string;
  format?: string;
  responsive?: boolean;
  className?: string;
}

declare global {
  interface Window {
    adsbygoogle: unknown[];
  }
}

export function AdSense({
  client,
  slot,
  format = 'auto',
  responsive = true,
  className = '',
}: AdSenseProps) {
  useEffect(() => {
    try {
      // Push the ad to Google AdSense when the component mounts
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (error) {
      console.error('AdSense error:', error);
    }
  }, []);

  return (
    <div className={`adsense-container ${className}`}>
      <ins
        className="adsbygoogle"
        data-ad-client={client}
        data-ad-slot={slot}
        data-ad-format={format}
        data-full-width-responsive={responsive ? 'true' : 'false'}
      />
    </div>
  );
}