/**
 * Firebase Analytics Event Tracking
 * Centralizes all analytics events for consistent tracking across the app
 * 
 * Maps to Business Requirements BR-008 (Creator analytics), BR-014 (Release gates)
 */

export interface AnalyticsEvent {
  name: string;
  parameters?: Record<string, string | number | boolean>;
  timestamp?: number;
}

/**
 * User properties for cohort analysis
 */
export interface UserAnalyticsProperties {
  user_role?: 'creator' | 'contributor' | 'occasional_shopper';
  occasion_type?: 'birthday' | 'holiday' | 'wedding' | 'graduation' | 'other';
  budget_category?: 'under_50' | '50_to_200' | '200_to_500' | 'over_500';
  feature_adoption?: string; // e.g., "price_alerts,group_gifting,calendar"
  platform?: 'web' | 'mobile' | 'extension';
}

/**
 * Central Analytics Tracker
 */
export class AnalyticsTracker {
  private events: AnalyticsEvent[] = [];
  private userProperties: Partial<UserAnalyticsProperties> = {};

  /**
   * Log a user signup event
   */
  logUserSignup(metadata?: Record<string, unknown>): void {
    this.logEvent('user_signup', {
      timestamp: new Date().toISOString(),
      ...metadata
    });
  }

  /**
   * Log user login
   */
  logUserLogin(method: 'email' | 'social' | 'custom'): void {
    this.logEvent('user_login', {
      login_method: method
    });
  }

  /**
   * Log wishlist creation
   */
  logWishlistCreated(wishlistType: string, metadata?: Record<string, unknown>): void {
    this.logEvent('wishlist_created', {
      wishlist_type: wishlistType,
      ...metadata
    });
  }

  /**
   * Log item addition
   */
  logItemAdded(source: 'manual' | 'extension' | 'recommended', metadata?: Record<string, unknown>): void {
    this.logEvent('item_added', {
      item_source: source,
      ...metadata
    });
  }

  /**
   * Log wishlist shared
   */
  logWishlistShared(shareType: 'public_link' | 'private_link' | 'email', metadata?: Record<string, unknown>): void {
    this.logEvent('wishlist_shared', {
      share_type: shareType,
      ...metadata
    });
  }

  /**
   * Log item reserved/purchased
   */
  logItemPurchased(source: 'direct_link' | 'affiliate_link' | 'group_gift', metadata?: Record<string, unknown>): void {
    this.logEvent('item_purchased', {
      purchase_source: source,
      ...metadata
    });
  }

  /**
   * Log price alert set
   */
  logPriceAlertSet(threshold: number): void {
    this.logEvent('price_alert_set', {
      threshold_type: threshold < 25 ? 'aggressive' : threshold < 50 ? 'moderate' : 'conservative'
    });
  }

  /**
   * Log group gift contributed
   */
  logGroupGiftContribution(amount: number, contributorCount?: number): void {
    this.logEvent('group_gift_contributed', {
      amount_usd: amount,
      participant_count: contributorCount
    });
  }

  /**
   * Log feature flag enabled
   */
  logFeatureFlagEnabled(featureName: string): void {
    this.logEvent('feature_flag_enabled', {
      feature_name: featureName
    });
  }

  /**
   * Log error event
   */
  logError(errorType: string, errorMessage: string, context?: string): void {
    this.logEvent('app_error', {
      error_type: errorType,
      error_message: errorMessage.substring(0, 100), // Truncate for PII
      context
    });
  }

  /**
   * Log page/screen view
   */
  logPageView(pagePath: string, pageTitle?: string): void {
    this.logEvent('page_view', {
      page_location: pagePath,
      page_title: pageTitle
    });
  }

  /**
   * Log generic event
   */
  logEvent(eventName: string, parameters?: Record<string, any>): void {
    const event: AnalyticsEvent = {
      name: eventName,
      parameters: this.sanitizeParameters(parameters),
      timestamp: Date.now()
    };

    this.events.push(event);
    console.log(`📊 Analytics event: ${eventName}`, parameters);

    // Send to Firebase if configured
    // Commented out until Firebase SDK is integrated
    // this.sendToFirebase(event);
  }

  /**
   * Set user properties for cohort analysis
   */
  setUserProperties(properties: Partial<UserAnalyticsProperties>): void {
    this.userProperties = { ...this.userProperties, ...properties };
    console.log('👤 User properties updated:', this.userProperties);
  }

  /**
   * Get current user properties
   */
  getUserProperties(): Partial<UserAnalyticsProperties> {
    return { ...this.userProperties };
  }

  /**
   * Track user adoption of features
   */
  logFeatureAdoption(features: string[]): void {
    this.setUserProperties({
      feature_adoption: features.join(',')
    });

    this.logEvent('feature_adoption_update', {
      features: features.join(','),
      feature_count: features.length
    });
  }

  /**
   * Sanitize parameters to remove PII
   */
  private sanitizeParameters(params?: Record<string, any>): Record<string, string | number | boolean> | undefined {
    if (!params) return undefined;

    const sanitized: Record<string, string | number | boolean> = {};

    for (const [key, value] of Object.entries(params)) {
      // Skip PII fields
      if (['email', 'password', 'token', 'userId', 'user_id'].includes(key.toLowerCase())) {
        continue;
      }

      // Only allow safe types
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        sanitized[key] = value;
      }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
  }

  /**
   * Get all recorded events
   */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /**
   * Get event count by type
   */
  getEventCounts(): Record<string, number> {
    const counts: Record<string, number> = {};

    for (const event of this.events) {
      counts[event.name] = (counts[event.name] || 0) + 1;
    }

    return counts;
  }

  /**
   * Clear events
   */
  clearEvents(): void {
    this.events = [];
  }

  /**
   * Send analytics events to Firebase (when SDK integrated)
   */
  private async sendToFirebase(event: AnalyticsEvent): Promise<void> {
    try {
      // This will integrate with Firebase Analytics SDK
      // await analytics.logEvent(event.name, event.parameters);
      console.log(`📤 Analytics event sent to Firebase: ${event.name}`);
    } catch (error) {
      console.error('Failed to send analytics event:', error);
    }
  }
}

/**
 * Global analytics tracker instance
 */
let globalAnalytics: AnalyticsTracker | null = null;

/**
 * Get or create global analytics tracker
 */
export function getAnalyticsTracker(): AnalyticsTracker {
  if (!globalAnalytics) {
    globalAnalytics = new AnalyticsTracker();
  }
  return globalAnalytics;
}

/**
 * Initialize analytics tracking
 */
export function initializeAnalytics(): AnalyticsTracker {
  const tracker = getAnalyticsTracker();
  
  // Log initial page view
  tracker.logPageView(window.location.pathname, document.title);

  // Track page navigation
  window.addEventListener('popstate', () => {
    tracker.logPageView(window.location.pathname, document.title);
  });

  return tracker;
}

/**
 * Analytics event helpers for common user journeys
 */
export class UserJourneyTracker {
  /**
   * Track sign-up to first wishlist creation funnel
   */
  static trackSignupFunnel(stepName: string, metadata?: Record<string, unknown>): void {
    const tracker = getAnalyticsTracker();
    tracker.logEvent('signup_funnel_step', {
      step_name: stepName,
      ...metadata
    });
  }

  /**
   * Track wishlist to purchase funnel
   */
  static trackConversionFunnel(stepName: string, conversionStage: 'share' | 'click' | 'view' | 'purchase'): void {
    const tracker = getAnalyticsTracker();
    tracker.logEvent('conversion_funnel_step', {
      step_name: stepName,
      conversion_stage: conversionStage
    });
  }

  /**
   * Track feature adoption (especially new features in WP)
   */
  static trackFeatureAdoption(featureName: string, workPackage: string): void {
    const tracker = getAnalyticsTracker();
    tracker.logEvent('feature_adoption_tracked', {
      feature_name: featureName,
      work_package: workPackage
    });
  }

  /**
   * Track error flow for debugging
   */
  static trackErrorFlow(flowName: string, errorName: string, retryable: boolean): void {
    const tracker = getAnalyticsTracker();
    tracker.logEvent('error_flow_tracked', {
      flow_name: flowName,
      error_name: errorName,
      is_retryable: retryable
    });
  }
}
