/**
 * Google AdSense React Components
 * Reusable ad components for different placements and sizes
 */

import React, { useEffect, useRef, useState } from 'react';
import { useAdSense, pushAd, AD_SIZES } from '../../lib/adsense';
import './AdSenseComponents.css';

// Base AdSense component props
interface AdSenseComponentProps {
  slotId: string;
  size?: keyof typeof AD_SIZES;
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
  responsive?: boolean;
  className?: string;
  style?: React.CSSProperties;
  testMode?: boolean;
  onAdLoad?: () => void;
  onAdError?: (error: Error) => void;
}

/**
 * Base AdSense Component
 */
export const AdSenseAd: React.FC<AdSenseComponentProps> = ({
  slotId,
  size = 'responsive',
  format = 'auto',
  responsive = true,
  className = '',
  style = {},
  testMode = false,
  onAdLoad,
  onAdError
}) => {
  const adRef = useRef<HTMLModElement>(null);
  const [adLoaded, setAdLoaded] = useState(false);
  const { isLoaded, config } = useAdSense();

  // Load ad when AdSense is ready
  useEffect(() => {
    if (!isLoaded || !config.enabled || adLoaded) return;
    
    try {
      // Push ad to AdSense queue
      pushAd(adRef.current || undefined);
      setAdLoaded(true);
      onAdLoad?.();
    } catch (error) {
      console.error('[AdSense] Error loading ad:', error);
      onAdError?.(error instanceof Error ? error : new Error('Ad loading failed'));
    }
  }, [isLoaded, config.enabled, adLoaded, onAdLoad, onAdError]);

  // Don't render if AdSense is disabled or not loaded
  if (!config.enabled || (!isLoaded && !config.testMode)) {
    return null;
  }

  return (
    <div className={`adsense-container ${className}`}>
      {config.testMode || testMode ? (
        // Test mode placeholder
        <div className="ad-placeholder">
          AdSense Ad ({String(size)}) - Test Mode
        </div>
      ) : (
        <ins
          ref={adRef}
          className="adsbygoogle"
          data-ad-client={config.publisherId}
          data-ad-slot={slotId}
          data-ad-format={responsive ? format : undefined}
          data-full-width-responsive={responsive ? 'true' : 'false'}
        />
      )}
    </div>
  );
};

/**
 * Header Banner Ad (728x90 Leaderboard)
 */
export const HeaderBannerAd: React.FC<{
  slotId: string;
  className?: string;
}> = ({ slotId, className = '' }) => {
  const { config } = useAdSense();
  
  if (!config.placements.header) return null;
  
  return (
    <AdSenseAd
      slotId={slotId}
      size="leaderboard"
      responsive={true}
      className={`header-banner-ad ${className}`}
      style={{ marginBottom: '20px' }}
    />
  );
};

/**
 * Sidebar Rectangle Ad (300x250)
 */
export const SidebarRectangleAd: React.FC<{
  slotId: string;
  className?: string;
}> = ({ slotId, className = '' }) => {
  const { config } = useAdSense();
  
  if (!config.placements.sidebar) return null;
  
  return (
    <AdSenseAd
      slotId={slotId}
      size="rectangle"
      responsive={false}
      className={`sidebar-rectangle-ad ${className}`}
      style={{ margin: '20px 0' }}
    />
  );
};

/**
 * Footer Banner Ad (728x90)
 */
export const FooterBannerAd: React.FC<{
  slotId: string;
  className?: string;
}> = ({ slotId, className = '' }) => {
  const { config } = useAdSense();
  
  if (!config.placements.footer) return null;
  
  return (
    <AdSenseAd
      slotId={slotId}
      size="banner"
      responsive={true}
      className={`footer-banner-ad ${className}`}
      style={{ marginTop: '20px' }}
    />
  );
};

/**
 * In-Content Ad (Responsive)
 */
export const InContentAd: React.FC<{
  slotId: string;
  className?: string;
}> = ({ slotId, className = '' }) => {
  const { config } = useAdSense();
  
  if (!config.placements.inContent) return null;
  
  return (
    <AdSenseAd
      slotId={slotId}
      size="responsive"
      format="rectangle"
      responsive={true}
      className={`in-content-ad ${className}`}
      style={{ margin: '30px 0' }}
    />
  );
};

/**
 * Mobile Banner Ad (320x50)
 */
export const MobileBannerAd: React.FC<{
  slotId: string;
  className?: string;
}> = ({ slotId, className = '' }) => {
  const { config } = useAdSense();
  const [isMobile, setIsMobile] = useState(false);

  // Check if mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);
  
  if (!config.placements.header || !isMobile) return null;
  
  return (
    <AdSenseAd
      slotId={slotId}
      size="mobile-banner"
      responsive={true}
      className={`mobile-banner-ad ${className}`}
      style={{ margin: '10px 0' }}
    />
  );
};

/**
 * Skyscraper Ad (160x600) for wide sidebars
 */
export const SkyscraperAd: React.FC<{
  slotId: string;
  className?: string;
}> = ({ slotId, className = '' }) => {
  const { config } = useAdSense();
  
  if (!config.placements.sidebar) return null;
  
  return (
    <AdSenseAd
      slotId={slotId}
      size="skyscraper"
      responsive={false}
      className={`skyscraper-ad ${className}`}
      style={{ margin: '20px 0' }}
    />
  );
};

/**
 * Ad Container with loading state and error handling
 */
export const AdContainer: React.FC<{
  children: React.ReactNode;
  title?: string;
  className?: string;
}> = ({ children, title = 'Advertisement', className = '' }) => {
  const [hasError, setHasError] = useState(false);
  const { isLoading, error } = useAdSense();

  if (hasError || error) {
    return null; // Don't show anything if ads fail
  }

  return (
    <div className={`ad-container ${className}`} role="complementary" aria-label={title}>
      {title && (
        <div className="ad-label">
          {title}
        </div>
      )}
      
      <div 
        className="ad-content"
        onError={() => setHasError(true)}
      >
        {isLoading ? (
          <div className="ad-loading">
            Loading advertisement...
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
};

/**
 * Privacy-compliant ad blocker detection component
 */
export const AdBlockerNotice: React.FC<{
  className?: string;
}> = ({ className = '' }) => {
  const [isBlocked, setIsBlocked] = useState(false);
  const [showNotice, setShowNotice] = useState(false);

  useEffect(() => {
    // Simple ad blocker detection
    const detectAdBlocker = async () => {
      try {
        const testAd = document.createElement('div');
        testAd.innerHTML = '&nbsp;';
        testAd.className = 'adsbox';
        testAd.style.position = 'absolute';
        testAd.style.left = '-10000px';
        testAd.style.width = '1px';
        testAd.style.height = '1px';
        
        document.body.appendChild(testAd);
        
        setTimeout(() => {
          const blocked = testAd.offsetHeight === 0;
          setIsBlocked(blocked);
          setShowNotice(blocked);
          document.body.removeChild(testAd);
        }, 100);
      } catch (error) {
        console.log('[AdSense] Ad blocker detection failed:', error);
      }
    };

    detectAdBlocker();
  }, []);

  if (!showNotice || !isBlocked) return null;

  return (
    <div className={`ad-blocker-notice ${className}`}>
      <strong>Supporting Wishlist Wizard</strong>
      <p>
        We notice you're using an ad blocker. Wishlist Wizard is free and ad-supported. 
        Please consider allowing ads to help us keep the service running!
      </p>
      <button onClick={() => setShowNotice(false)}>
        Dismiss
      </button>
    </div>
  );
};