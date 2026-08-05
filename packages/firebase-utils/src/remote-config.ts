/**
 * Firebase Remote Config Client Utilities
 * Manages feature flags and dynamic configuration without code deployment
 *
 * Maps to Business Requirement BR-014 (Release gates) and BR-002 (Feature rollout)
 */

import type { FirebaseApp } from 'firebase/app';
import {
  getRemoteConfig as getFirebaseRemoteConfig,
  fetchAndActivate,
  getBoolean as sdkGetBoolean,
  getString as sdkGetString,
  getNumber as sdkGetNumber,
  type RemoteConfig,
} from 'firebase/remote-config';

export interface RemoteConfigValue {
  asBoolean(): boolean;
  asNumber(): number;
  asString(): string;
  asJson(): Record<string, any>;
}

/**
 * Remote Config Feature Flags
 */
export enum FeatureFlags {
  // Work Package features
  PRICE_ALERTS_ENABLED = 'price_alerts_enabled',
  GROUP_GIFTING_ENABLED = 'group_gifting_enabled',
  CALENDAR_INTEGRATION_ENABLED = 'calendar_integration_enabled',
  BROWSER_EXTENSION_ENABLED = 'browser_extension_enabled',

  // Experimental features
  RECOMMENDATIONS_AI_ENABLED = 'recommendations_ai_enabled',
  AFFILIATE_TRACKING_ENABLED = 'affiliate_tracking_enabled',
  COLLABORATIVE_EDITING_ENABLED = 'collaborative_editing_enabled',

  // Performance/rollout gates
  ENABLE_PERFORMANCE_MONITORING = 'enable_performance_monitoring',
  ENABLE_ERROR_REPORTING = 'enable_error_reporting',
  ENABLE_ANALYTICS = 'enable_analytics',

  // Site availability kill switches. Default to fail-closed (true = offline)
  // so a Remote Config outage or a not-yet-created parameter never
  // accidentally exposes an unfinished site — see initialize()'s
  // defaultConfig and docs/WISHLIST_WIZARD_GO_LIVE.md.
  MARKETING_OFFLINE = 'marketing_offline',
  APP_OFFLINE = 'app_offline',
}

/**
 * Remote Config parameters for dynamic configuration
 */
export enum ConfigParameters {
  // Budget guardrails
  MIN_CONTRIBUTION_AMOUNT = 'min_contribution_amount',
  MAX_CONTRIBUTION_AMOUNT = 'max_contribution_amount',
  MAX_GROUP_GIFT_TOTAL = 'max_group_gift_total',

  // Price alert thresholds
  PRICE_ALERT_CHECK_INTERVAL_HOURS = 'price_alert_check_interval_hours',
  PRICE_DROP_THRESHOLD_PERCENT = 'price_drop_threshold_percent',

  // Performance thresholds
  API_TIMEOUT_MS = 'api_timeout_ms',
  MAX_CONCURRENT_REQUESTS = 'max_concurrent_requests',

  // Notification settings
  NOTIFICATION_BATCH_SIZE = 'notification_batch_size',
  NOTIFICATION_DELIVERY_DELAY_MS = 'notification_delivery_delay_ms',

  // Feature rollout percentages (0-100)
  PRICE_ALERTS_ROLLOUT_PERCENT = 'price_alerts_rollout_percent',
  GROUP_GIFTING_ROLLOUT_PERCENT = 'group_gifting_rollout_percent',
}

type ConfigKey = FeatureFlags | ConfigParameters;

/**
 * Client-side Remote Config Manager, backed by the real Firebase Remote
 * Config SDK. `initialize(app)` must be called with a live FirebaseApp
 * before values reflect anything fetched from the console; until then (and
 * whenever a fetch fails) every getter falls back to the same defaults a
 * real fetch would use, so callers never need to null-check.
 */
export class RemoteConfigManager {
  private remoteConfigInstance: RemoteConfig | null = null;
  private initialized: boolean = false;
  private readonly defaults: Record<string, string | number | boolean> = this.buildDefaults();

  private buildDefaults(): Record<string, string | number | boolean> {
    return {
      // Feature flags - default to enabled unless noted otherwise
      [FeatureFlags.PRICE_ALERTS_ENABLED]: true,
      [FeatureFlags.GROUP_GIFTING_ENABLED]: true,
      [FeatureFlags.CALENDAR_INTEGRATION_ENABLED]: true,
      [FeatureFlags.BROWSER_EXTENSION_ENABLED]: true,
      [FeatureFlags.RECOMMENDATIONS_AI_ENABLED]: false,
      [FeatureFlags.AFFILIATE_TRACKING_ENABLED]: true,
      [FeatureFlags.COLLABORATIVE_EDITING_ENABLED]: false,
      [FeatureFlags.ENABLE_PERFORMANCE_MONITORING]: true,
      [FeatureFlags.ENABLE_ERROR_REPORTING]: true,
      [FeatureFlags.ENABLE_ANALYTICS]: true,

      // Site availability kill switches — fail closed everywhere. Per-project
      // console values (set independently for dev/staging/prod) are what
      // actually control behavior day to day; this is only the fallback
      // used before the first successful fetch or if a fetch ever fails.
      [FeatureFlags.MARKETING_OFFLINE]: true,
      [FeatureFlags.APP_OFFLINE]: true,

      // Budget guardrails
      [ConfigParameters.MIN_CONTRIBUTION_AMOUNT]: 1.0,
      [ConfigParameters.MAX_CONTRIBUTION_AMOUNT]: 5000.0,
      [ConfigParameters.MAX_GROUP_GIFT_TOTAL]: 50000.0,

      // Price alert thresholds
      [ConfigParameters.PRICE_ALERT_CHECK_INTERVAL_HOURS]: 6,
      [ConfigParameters.PRICE_DROP_THRESHOLD_PERCENT]: 10,

      // Performance settings
      [ConfigParameters.API_TIMEOUT_MS]: 30000,
      [ConfigParameters.MAX_CONCURRENT_REQUESTS]: 5,

      // Notification settings
      [ConfigParameters.NOTIFICATION_BATCH_SIZE]: 100,
      [ConfigParameters.NOTIFICATION_DELIVERY_DELAY_MS]: 1000,

      // Rollout percentages (0-100)
      [ConfigParameters.PRICE_ALERTS_ROLLOUT_PERCENT]: 100,
      [ConfigParameters.GROUP_GIFTING_ROLLOUT_PERCENT]: 100,
    };
  }

  /**
   * Initialize Remote Config against a real Firebase app and fetch the
   * live template. Never throws — a failed fetch leaves the fail-closed
   * defaults above active rather than breaking app startup.
   */
  async initialize(app: FirebaseApp): Promise<void> {
    try {
      this.remoteConfigInstance = getFirebaseRemoteConfig(app);
      this.remoteConfigInstance.settings.minimumFetchIntervalMillis =
        process.env.NODE_ENV === 'production' ? 60 * 60 * 1000 : 0;
      this.remoteConfigInstance.defaultConfig = this.defaults;
      this.initialized = true;

      await fetchAndActivate(this.remoteConfigInstance).catch((error) => {
        console.warn('Remote Config fetch failed, using defaults:', error);
      });
    } catch (error) {
      console.error('Failed to initialize Remote Config:', error);
      this.remoteConfigInstance = null;
    }
  }

  /**
   * Check if a feature flag is enabled
   */
  isFeatureEnabled(featureFlag: FeatureFlags): boolean {
    return this.getBoolean(featureFlag);
  }

  /**
   * Check if a feature is enabled for this user (rollout percentage)
   */
  isFeatureEnabledForUser(featureFlag: FeatureFlags, userId: string): boolean {
    if (!this.isFeatureEnabled(featureFlag)) {
      return false;
    }

    // Historical note: this rollout key never actually matches a real
    // ConfigParameters entry (e.g. "price_alerts_enabled_rollout_percent"
    // vs. the real PRICE_ALERTS_ROLLOUT_PERCENT="price_alerts_rollout_percent"),
    // so this has always effectively resolved to the 100 fallback in
    // practice. Preserved as-is rather than silently reworked.
    const rolloutKey = `${featureFlag}_rollout_percent`;
    const rolloutPercent = this.getNumber(rolloutKey as ConfigParameters) || 100;

    const userHash = this.hashUserId(userId);
    const userPercent = (userHash % 100) + 1; // 1-100

    return userPercent <= rolloutPercent;
  }

  /**
   * Get a string configuration value
   */
  getString(param: ConfigParameters): string {
    if (!this.remoteConfigInstance) {
      if (!this.initialized) console.warn('Remote Config not initialized, using default');
      return String(this.defaults[param] ?? '');
    }
    return sdkGetString(this.remoteConfigInstance, param);
  }

  /**
   * Get a numeric configuration value
   */
  getNumber(param: ConfigParameters): number {
    if (!this.remoteConfigInstance) {
      if (!this.initialized) console.warn('Remote Config not initialized, using default');
      return Number(this.defaults[param] ?? 0);
    }
    const value = sdkGetNumber(this.remoteConfigInstance, param);
    // The real SDK returns 0 for a key with no configured default (rather
    // than the caller's own fallback), which matters for the rollout-percent
    // lookup above — fall back to our own default map when a key was never
    // registered in defaultConfig.
    return param in this.defaults || value !== 0 ? value : Number(this.defaults[param] ?? 0);
  }

  /**
   * Get a boolean configuration value
   */
  getBoolean(param: ConfigKey): boolean {
    if (!this.remoteConfigInstance) {
      if (!this.initialized) console.warn('Remote Config not initialized, using default');
      return Boolean(this.defaults[param] ?? false);
    }
    return sdkGetBoolean(this.remoteConfigInstance, param);
  }

  /**
   * Get a JSON configuration value
   */
  getJson(param: string): Record<string, any> {
    const raw = this.remoteConfigInstance
      ? sdkGetString(this.remoteConfigInstance, param)
      : String(this.defaults[param] ?? '');
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }

  /**
   * Reset to an uninitialized state (test convenience).
   */
  reset(): void {
    this.remoteConfigInstance = null;
    this.initialized = false;
  }

  /**
   * Simple hash function for user ID
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }
}

/**
 * Global Remote Config instance
 */
let globalRemoteConfig: RemoteConfigManager | null = null;

/**
 * Get or create global Remote Config manager
 */
export function getRemoteConfig(): RemoteConfigManager {
  if (!globalRemoteConfig) {
    globalRemoteConfig = new RemoteConfigManager();
  }
  return globalRemoteConfig;
}

/**
 * Initialize Remote Config against a real Firebase app.
 */
export async function initializeRemoteConfig(app: FirebaseApp): Promise<RemoteConfigManager> {
  const config = getRemoteConfig();
  await config.initialize(app);
  return config;
}

/**
 * Simplified helpers for common use cases
 */
export class RemoteConfigHelpers {
  /**
   * Check if price alerts feature is available
   */
  static isPriceAlertsEnabled(userId?: string): boolean {
    const config = getRemoteConfig();
    if (userId) {
      return config.isFeatureEnabledForUser(FeatureFlags.PRICE_ALERTS_ENABLED, userId);
    }
    return config.isFeatureEnabled(FeatureFlags.PRICE_ALERTS_ENABLED);
  }

  /**
   * Check if group gifting is enabled
   */
  static isGroupGiftingEnabled(userId?: string): boolean {
    const config = getRemoteConfig();
    if (userId) {
      return config.isFeatureEnabledForUser(FeatureFlags.GROUP_GIFTING_ENABLED, userId);
    }
    return config.isFeatureEnabled(FeatureFlags.GROUP_GIFTING_ENABLED);
  }

  /**
   * Get budget limits for group gifting
   */
  static getBudgetLimits(): {
    minContribution: number;
    maxContribution: number;
    maxTotal: number;
  } {
    const config = getRemoteConfig();
    return {
      minContribution: config.getNumber(ConfigParameters.MIN_CONTRIBUTION_AMOUNT),
      maxContribution: config.getNumber(ConfigParameters.MAX_CONTRIBUTION_AMOUNT),
      maxTotal: config.getNumber(ConfigParameters.MAX_GROUP_GIFT_TOTAL)
    };
  }

  /**
   * Get API timeout configuration
   */
  static getApiTimeout(): number {
    const config = getRemoteConfig();
    return config.getNumber(ConfigParameters.API_TIMEOUT_MS);
  }

  /**
   * Get price alert check interval
   */
  static getPriceAlertInterval(): number {
    const config = getRemoteConfig();
    return config.getNumber(ConfigParameters.PRICE_ALERT_CHECK_INTERVAL_HOURS);
  }
}
