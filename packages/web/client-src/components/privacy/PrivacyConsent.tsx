/**
 * Privacy Consent Components for Advertising
 * GDPR/CCPA compliant consent management for ads
 */

import React, { useState, useEffect } from 'react';
import { useAdSense } from '../../lib/adsense';
import './PrivacyConsent.css';

// Privacy consent interface
interface PrivacyConsent {
  gdpr: boolean;
  ccpa: boolean;
  personalizedAds: boolean;
  analytics: boolean;
  necessary: boolean;
  timestamp: Date;
}

// Default consent state
const DEFAULT_CONSENT: PrivacyConsent = {
  gdpr: false,
  ccpa: false,
  personalizedAds: false,
  analytics: false,
  necessary: true, // Always true for app functionality
  timestamp: new Date()
};

// Storage keys
const CONSENT_STORAGE_KEY = 'wishlist-wizard-privacy-consent';
const CONSENT_VERSION = '1.0';

/**
 * Privacy Consent Banner Component
 */
export const PrivacyConsentBanner: React.FC<{
  onConsentChange?: (consent: PrivacyConsent) => void;
}> = ({ onConsentChange }) => {
  const [showBanner, setShowBanner] = useState(false);
  const [consent, setConsent] = useState<PrivacyConsent>(DEFAULT_CONSENT);
  const [showDetails, setShowDetails] = useState(false);
  const { updatePrivacySettings } = useAdSense();

  // Check if consent is needed
  useEffect(() => {
    const savedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
    
    if (!savedConsent) {
      setShowBanner(true);
    } else {
      try {
        const parsed = JSON.parse(savedConsent);
        if (parsed.version !== CONSENT_VERSION) {
          // Consent version changed, need new consent
          setShowBanner(true);
        } else {
          setConsent(parsed.consent);
          updatePrivacySettings({
            gdprConsent: parsed.consent.gdpr,
            ccpaConsent: parsed.consent.ccpa,
            personalizedAds: parsed.consent.personalizedAds
          });
        }
      } catch (error) {
        console.error('[Privacy] Error parsing saved consent:', error);
        setShowBanner(true);
      }
    }
  }, [updatePrivacySettings]);

  // Save consent
  const saveConsent = (newConsent: PrivacyConsent) => {
    const consentData = {
      version: CONSENT_VERSION,
      consent: { ...newConsent, timestamp: new Date() },
    };
    
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentData));
    setConsent(newConsent);
    setShowBanner(false);
    
    // Update AdSense privacy settings
    updatePrivacySettings({
      gdprConsent: newConsent.gdpr,
      ccpaConsent: newConsent.ccpa,
      personalizedAds: newConsent.personalizedAds
    });
    
    onConsentChange?.(newConsent);
  };

  // Accept all cookies
  const acceptAll = () => {
    saveConsent({
      gdpr: true,
      ccpa: true,
      personalizedAds: true,
      analytics: true,
      necessary: true,
      timestamp: new Date()
    });
  };

  // Accept only necessary cookies
  const acceptNecessary = () => {
    saveConsent({
      gdpr: false,
      ccpa: false,
      personalizedAds: false,
      analytics: false,
      necessary: true,
      timestamp: new Date()
    });
  };

  // Custom consent selection
  const saveCustomConsent = () => {
    saveConsent(consent);
  };

  if (!showBanner) return null;

  return (
    <div className="privacy-consent-banner" role="dialog" aria-labelledby="consent-title">
      <div className="consent-content">
        <h3 id="consent-title">Cookie & Privacy Settings</h3>
        <p>
          We use cookies and similar technologies to provide and improve Wishlist Wizard. 
          This includes displaying relevant ads to support our free service.
        </p>

        {!showDetails ? (
          <div className="consent-buttons">
            <button 
              className="btn-accept-all"
              onClick={acceptAll}
              aria-label="Accept all cookies and personalized ads"
            >
              Accept All
            </button>
            <button 
              className="btn-necessary"
              onClick={acceptNecessary}
              aria-label="Accept only necessary cookies"
            >
              Necessary Only
            </button>
            <button 
              className="btn-customize"
              onClick={() => setShowDetails(true)}
              aria-label="Customize cookie preferences"
            >
              Customize
            </button>
          </div>
        ) : (
          <div className="consent-details">
            <div className="consent-options">
              <div className="consent-option">
                <label className="consent-checkbox">
                  <input
                    type="checkbox"
                    checked={consent.necessary}
                    disabled
                    aria-label="Necessary cookies (always enabled)"
                  />
                  <span className="checkmark"></span>
                  <div className="option-info">
                    <strong>Necessary Cookies</strong>
                    <p>Required for basic app functionality. Cannot be disabled.</p>
                  </div>
                </label>
              </div>

              <div className="consent-option">
                <label className="consent-checkbox">
                  <input
                    type="checkbox"
                    checked={consent.personalizedAds}
                    onChange={(e) => setConsent(prev => ({ 
                      ...prev, 
                      personalizedAds: e.target.checked 
                    }))}
                    aria-label="Personalized advertisements"
                  />
                  <span className="checkmark"></span>
                  <div className="option-info">
                    <strong>Personalized Ads</strong>
                    <p>Show ads tailored to your interests. Helps support our free service.</p>
                  </div>
                </label>
              </div>

              <div className="consent-option">
                <label className="consent-checkbox">
                  <input
                    type="checkbox"
                    checked={consent.analytics}
                    onChange={(e) => setConsent(prev => ({ 
                      ...prev, 
                      analytics: e.target.checked 
                    }))}
                    aria-label="Analytics and performance tracking"
                  />
                  <span className="checkmark"></span>
                  <div className="option-info">
                    <strong>Analytics</strong>
                    <p>Help us understand how you use the app to improve your experience.</p>
                  </div>
                </label>
              </div>

              <div className="consent-option">
                <label className="consent-checkbox">
                  <input
                    type="checkbox"
                    checked={consent.gdpr}
                    onChange={(e) => setConsent(prev => ({ 
                      ...prev, 
                      gdpr: e.target.checked 
                    }))}
                    aria-label="GDPR data processing consent"
                  />
                  <span className="checkmark"></span>
                  <div className="option-info">
                    <strong>Data Processing (GDPR)</strong>
                    <p>Consent to process your personal data under GDPR regulations.</p>
                  </div>
                </label>
              </div>

              <div className="consent-option">
                <label className="consent-checkbox">
                  <input
                    type="checkbox"
                    checked={consent.ccpa}
                    onChange={(e) => setConsent(prev => ({ 
                      ...prev, 
                      ccpa: e.target.checked 
                    }))}
                    aria-label="CCPA data sharing consent"
                  />
                  <span className="checkmark"></span>
                  <div className="option-info">
                    <strong>Data Sharing (CCPA)</strong>
                    <p>Allow sharing of personal information for advertising purposes.</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="consent-buttons">
              <button 
                className="btn-save"
                onClick={saveCustomConsent}
                aria-label="Save custom privacy preferences"
              >
                Save Preferences
              </button>
              <button 
                className="btn-back"
                onClick={() => setShowDetails(false)}
                aria-label="Go back to simple options"
              >
                Back
              </button>
            </div>
          </div>
        )}

        <div className="consent-links">
          <a href="/app/privacy-settings" target="_blank" rel="noopener noreferrer">
            Privacy Policy
          </a>
          <a href="/app/privacy-settings" target="_blank" rel="noopener noreferrer">
            Terms of Service
          </a>
        </div>
      </div>
    </div>
  );
};

/**
 * Privacy Settings Component (for settings page)
 */
export const PrivacySettings: React.FC<{
  onConsentChange?: (consent: PrivacyConsent) => void;
}> = ({ onConsentChange }) => {
  const [consent, setConsent] = useState<PrivacyConsent>(DEFAULT_CONSENT);
  const [isLoading, setIsLoading] = useState(true);
  const { updatePrivacySettings } = useAdSense();

  // Load current consent
  useEffect(() => {
    const savedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
    
    if (savedConsent) {
      try {
        const parsed = JSON.parse(savedConsent);
        setConsent(parsed.consent || DEFAULT_CONSENT);
      } catch (error) {
        console.error('[Privacy] Error loading consent:', error);
      }
    }
    
    setIsLoading(false);
  }, []);

  // Save consent changes
  const updateConsent = (updates: Partial<PrivacyConsent>) => {
    const newConsent = { ...consent, ...updates, timestamp: new Date() };
    
    const consentData = {
      version: CONSENT_VERSION,
      consent: newConsent,
    };
    
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentData));
    setConsent(newConsent);
    
    // Update AdSense privacy settings
    updatePrivacySettings({
      gdprConsent: newConsent.gdpr,
      ccpaConsent: newConsent.ccpa,
      personalizedAds: newConsent.personalizedAds
    });
    
    onConsentChange?.(newConsent);
  };

  if (isLoading) {
    return (
      <div className="privacy-settings loading">
        <div className="loading-spinner"></div>
        <p>Loading privacy settings...</p>
      </div>
    );
  }

  return (
    <div className="privacy-settings">
      <div className="settings-header">
        <h2>Privacy & Advertising Settings</h2>
        <p>Manage how your data is used and what ads you see</p>
      </div>

      <div className="settings-section">
        <h3>Advertising Preferences</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4>Personalized Advertisements</h4>
            <p>
              Show ads based on your interests and activity. Personalized ads help us 
              provide better recommendations and keep Wishlist Wizard free.
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={consent.personalizedAds}
              onChange={(e) => updateConsent({ personalizedAds: e.target.checked })}
              aria-label="Enable personalized advertisements"
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h4>Analytics & Performance</h4>
            <p>
              Help us understand how you use Wishlist Wizard to improve the app 
              and fix issues.
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={consent.analytics}
              onChange={(e) => updateConsent({ analytics: e.target.checked })}
              aria-label="Enable analytics and performance tracking"
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Legal Compliance</h3>
        
        <div className="setting-item">
          <div className="setting-info">
            <h4>GDPR Data Processing</h4>
            <p>
              Consent to process your personal data under European GDPR regulations.
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={consent.gdpr}
              onChange={(e) => updateConsent({ gdpr: e.target.checked })}
              aria-label="GDPR data processing consent"
            />
            <span className="toggle-slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h4>CCPA Data Sharing</h4>
            <p>
              Allow sharing of personal information under California CCPA regulations.
            </p>
          </div>
          <label className="toggle-switch">
            <input
              type="checkbox"
              checked={consent.ccpa}
              onChange={(e) => updateConsent({ ccpa: e.target.checked })}
              aria-label="CCPA data sharing consent"
            />
            <span className="toggle-slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h3>Information</h3>
        <div className="info-text">
          <p>
            <strong>Last Updated:</strong> {consent.timestamp.toLocaleDateString()}
          </p>
          <p>
            Your privacy choices help us show you relevant ads while respecting 
            your preferences. You can change these settings anytime.
          </p>
          <p>
            <strong>Note:</strong> Disabling personalized ads doesn&apos;t mean you&apos;ll see 
            fewer ads, but they may be less relevant to your interests.
          </p>
        </div>
      </div>

      <div className="settings-actions">
        <button 
          className="btn-reset"
          onClick={() => {
            localStorage.removeItem(CONSENT_STORAGE_KEY);
            window.location.reload();
          }}
          aria-label="Reset all privacy preferences"
        >
          Reset All Preferences
        </button>
      </div>
    </div>
  );
};

/**
 * Hook for accessing current privacy consent
 */
export function usePrivacyConsent() {
  const [consent, setConsent] = useState<PrivacyConsent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedConsent = localStorage.getItem(CONSENT_STORAGE_KEY);
    
    if (savedConsent) {
      try {
        const parsed = JSON.parse(savedConsent);
        setConsent(parsed.consent || DEFAULT_CONSENT);
      } catch (error) {
        console.error('[Privacy] Error loading consent:', error);
        setConsent(DEFAULT_CONSENT);
      }
    } else {
      setConsent(null); // No consent given yet
    }
    
    setIsLoading(false);
  }, []);

  const updateConsent = (updates: Partial<PrivacyConsent>) => {
    if (!consent) return;
    
    const newConsent = { ...consent, ...updates, timestamp: new Date() };
    
    const consentData = {
      version: CONSENT_VERSION,
      consent: newConsent,
    };
    
    localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(consentData));
    setConsent(newConsent);
  };

  return {
    consent,
    isLoading,
    hasConsent: consent !== null,
    updateConsent
  };
}