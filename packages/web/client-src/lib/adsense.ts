/**
 * Google AdSense Integration for Wishlist Wizard Web App
 * Handles ad loading, placement management, and privacy compliance
 */

import { useState, useEffect, useCallback } from 'react';

// AdSense configuration interface
export interface AdSenseConfig {
  publisherId: string;
  enabled: boolean;
  testMode: boolean;
  privacy: {
    gdprConsent: boolean;
    ccpaConsent: boolean;
    personalizedAds: boolean;
  };
  placements: {
    header: boolean;
    sidebar: boolean;
    footer: boolean;
    inContent: boolean;
    modal: boolean;
  };
}

// Ad unit configuration
export interface AdUnitConfig {
  slotId: string;
  size: 'banner' | 'leaderboard' | 'rectangle' | 'skyscraper' | 'mobile-banner' | 'responsive';
  format?: 'auto' | 'horizontal' | 'vertical' | 'rectangle';
  responsive?: boolean;
  testMode?: boolean;
}

// Default AdSense configuration
const DEFAULT_CONFIG: AdSenseConfig = {
  publisherId: process.env.REACT_APP_ADSENSE_PUBLISHER_ID || 'ca-pub-0000000000000000',
  enabled: process.env.NODE_ENV === 'production',
  testMode: process.env.NODE_ENV !== 'production',
  privacy: {
    gdprConsent: false,
    ccpaConsent: false,
    personalizedAds: false
  },
  placements: {
    header: true,
    sidebar: true,
    footer: true,
    inContent: true,
    modal: false
  }
};

// Ad size configurations
export const AD_SIZES = {
  banner: { width: 728, height: 90 },
  leaderboard: { width: 728, height: 90 },
  rectangle: { width: 300, height: 250 },
  skyscraper: { width: 160, height: 600 },
  'mobile-banner': { width: 320, height: 50 },
  responsive: { width: 'auto', height: 'auto' }
};

// AdSense script loading state
let adSenseLoaded = false;
let adSenseLoading = false;

/**
 * Load Google AdSense script
 */
export async function loadAdSense(publisherId: string): Promise<boolean> {
  if (adSenseLoaded) return true;
  if (adSenseLoading) {
    // Wait for existing load to complete
    return new Promise((resolve) => {
      const checkLoaded = () => {
        if (adSenseLoaded) {
          resolve(true);
        } else {
          setTimeout(checkLoaded, 100);
        }
      };
      checkLoaded();
    });
  }

  adSenseLoading = true;

  try {
    // Check if script already exists
    const existingScript = document.querySelector('script[src*="googlesyndication.com"]');
    if (existingScript) {
      adSenseLoaded = true;
      adSenseLoading = false;
      return true;
    }

    // Create and load AdSense script
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
    
    return new Promise((resolve, reject) => {
      script.onload = () => {
        adSenseLoaded = true;
        adSenseLoading = false;
        console.log('[AdSense] Script loaded successfully');
        resolve(true);
      };
      
      script.onerror = () => {
        adSenseLoading = false;
        console.error('[AdSense] Failed to load script');
        reject(false);
      };
      
      document.head.appendChild(script);
    });
  } catch (error) {
    adSenseLoading = false;
    console.error('[AdSense] Error loading script:', error);
    return false;
  }
}

/**
 * Initialize AdSense with privacy settings
 */
export function initializeAdSense(config: Partial<AdSenseConfig> = {}): void {
  const fullConfig = { ...DEFAULT_CONFIG, ...config };
  
  if (!fullConfig.enabled) {
    console.log('[AdSense] Disabled by configuration');
    return;
  }

  // Set privacy settings before loading ads
  if (window.gtag) {
    // Configure Google Analytics/AdSense privacy settings
    window.gtag('consent', 'default', {
      ad_storage: fullConfig.privacy.personalizedAds ? 'granted' : 'denied',
      ad_user_data: fullConfig.privacy.personalizedAds ? 'granted' : 'denied',
      ad_personalization: fullConfig.privacy.personalizedAds ? 'granted' : 'denied',
      analytics_storage: fullConfig.privacy.gdprConsent ? 'granted' : 'denied'
    });
  }

  // Initialize AdSense
  loadAdSense(fullConfig.publisherId).then((loaded) => {
    if (loaded) {
      console.log('[AdSense] Initialized successfully');
    } else {
      console.error('[AdSense] Failed to initialize');
    }
  });
}

/**
 * React hook for AdSense management
 */
export function useAdSense(config: Partial<AdSenseConfig> = {}) {
  const [isLoaded, setIsLoaded] = useState(adSenseLoaded);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adConfig, setAdConfig] = useState<AdSenseConfig>({ ...DEFAULT_CONFIG, ...config });

  // Load AdSense on mount
  useEffect(() => {
    if (!adConfig.enabled) return;

    setIsLoading(true);
    loadAdSense(adConfig.publisherId)
      .then((loaded) => {
        setIsLoaded(loaded);
        setError(loaded ? null : 'Failed to load AdSense');
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'AdSense loading error');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [adConfig.enabled, adConfig.publisherId]);

  // Update privacy settings
  const updatePrivacySettings = useCallback((privacy: Partial<AdSenseConfig['privacy']>) => {
    setAdConfig(prev => ({
      ...prev,
      privacy: { ...prev.privacy, ...privacy }
    }));

    // Update consent if gtag is available
    if (window.gtag && isLoaded) {
      window.gtag('consent', 'update', {
        ad_storage: privacy.personalizedAds !== undefined 
          ? (privacy.personalizedAds ? 'granted' : 'denied')
          : (adConfig.privacy.personalizedAds ? 'granted' : 'denied'),
        ad_user_data: privacy.personalizedAds !== undefined
          ? (privacy.personalizedAds ? 'granted' : 'denied')
          : (adConfig.privacy.personalizedAds ? 'granted' : 'denied'),
        ad_personalization: privacy.personalizedAds !== undefined
          ? (privacy.personalizedAds ? 'granted' : 'denied')
          : (adConfig.privacy.personalizedAds ? 'granted' : 'denied')
      });
    }
  }, [isLoaded, adConfig.privacy]);

  // Enable/disable ad placements
  const updatePlacements = useCallback((placements: Partial<AdSenseConfig['placements']>) => {
    setAdConfig(prev => ({
      ...prev,
      placements: { ...prev.placements, ...placements }
    }));
  }, []);

  return {
    isLoaded,
    isLoading,
    error,
    config: adConfig,
    updatePrivacySettings,
    updatePlacements
  };
}

/**
 * Push ad to AdSense queue
 */
export function pushAd(element?: HTMLElement): void {
  if (typeof window !== 'undefined' && window.adsbygoogle && adSenseLoaded) {
    try {
      (window.adsbygoogle as any[]).push({});
      console.log('[AdSense] Ad pushed to queue');
    } catch (error) {
      console.error('[AdSense] Error pushing ad:', error);
    }
  }
}

/**
 * Refresh ads on a page
 */
export function refreshAds(): void {
  if (typeof window !== 'undefined' && window.adsbygoogle && adSenseLoaded) {
    try {
      // Clear existing ads
      const adElements = document.querySelectorAll('.adsbygoogle');
      adElements.forEach((el) => {
        (el as HTMLElement).innerHTML = '';
      });
      
      // Reinitialize ads
      adElements.forEach(() => {
        (window.adsbygoogle as any[]).push({});
      });
      
      console.log('[AdSense] Ads refreshed');
    } catch (error) {
      console.error('[AdSense] Error refreshing ads:', error);
    }
  }
}

/**
 * Check if ad blocker is detected
 */
export function detectAdBlocker(): Promise<boolean> {
  return new Promise((resolve) => {
    // Create a test ad element
    const testAd = document.createElement('div');
    testAd.innerHTML = '&nbsp;';
    testAd.className = 'adsbox';
    testAd.style.position = 'absolute';
    testAd.style.left = '-10000px';
    testAd.style.width = '1px';
    testAd.style.height = '1px';
    
    document.body.appendChild(testAd);
    
    // Check if the element is hidden by ad blocker
    setTimeout(() => {
      const isBlocked = testAd.offsetHeight === 0;
      document.body.removeChild(testAd);
      resolve(isBlocked);
    }, 100);
  });
}

// TypeScript declarations for global objects
declare global {
  interface Window {
    adsbygoogle: any[];
    gtag: (...args: any[]) => void;
  }
}