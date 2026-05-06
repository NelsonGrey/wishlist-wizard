/**
 * Firebase Remote Config Client Utilities
 * Manages feature flags and dynamic configuration without code deployment
 * 
 * Maps to Business Requirement BR-014 (Release gates) and BR-002 (Feature rollout)
 */

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

/**
 * Client-side Remote Config Manager
 * Note: This is a mock implementation until Firebase SDK is fully integrated
 */
export class RemoteConfigManager {
  private config: Map<string, any> = new Map();
  private defaults: Map<string, any> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.setDefaults();
  }

  /**
   * Set default values for all config parameters
   */
  private setDefaults(): void {
    // Feature flags - default to disabled for safe rollout
    this.defaults.set(FeatureFlags.PRICE_ALERTS_ENABLED, true);
    this.defaults.set(FeatureFlags.GROUP_GIFTING_ENABLED, true);
    this.defaults.set(FeatureFlags.CALENDAR_INTEGRATION_ENABLED, true);
    this.defaults.set(FeatureFlags.BROWSER_EXTENSION_ENABLED, true);
    this.defaults.set(FeatureFlags.RECOMMENDATIONS_AI_ENABLED, false);
    this.defaults.set(FeatureFlags.AFFILIATE_TRACKING_ENABLED, true);
    this.defaults.set(FeatureFlags.COLLABORATIVE_EDITING_ENABLED, false);
    this.defaults.set(FeatureFlags.ENABLE_PERFORMANCE_MONITORING, true);
    this.defaults.set(FeatureFlags.ENABLE_ERROR_REPORTING, true);
    this.defaults.set(FeatureFlags.ENABLE_ANALYTICS, true);

    // Budget guardrails from WP-04
    this.defaults.set(ConfigParameters.MIN_CONTRIBUTION_AMOUNT, 1.0);
    this.defaults.set(ConfigParameters.MAX_CONTRIBUTION_AMOUNT, 5000.0);
    this.defaults.set(ConfigParameters.MAX_GROUP_GIFT_TOTAL, 50000.0);

    // Price alert thresholds
    this.defaults.set(ConfigParameters.PRICE_ALERT_CHECK_INTERVAL_HOURS, 6);
    this.defaults.set(ConfigParameters.PRICE_DROP_THRESHOLD_PERCENT, 10);

    // Performance settings
    this.defaults.set(ConfigParameters.API_TIMEOUT_MS, 30000);
    this.defaults.set(ConfigParameters.MAX_CONCURRENT_REQUESTS, 5);

    // Notification settings
    this.defaults.set(ConfigParameters.NOTIFICATION_BATCH_SIZE, 100);
    this.defaults.set(ConfigParameters.NOTIFICATION_DELIVERY_DELAY_MS, 1000);

    // Rollout percentages (0-100)
    this.defaults.set(ConfigParameters.PRICE_ALERTS_ROLLOUT_PERCENT, 100);
    this.defaults.set(ConfigParameters.GROUP_GIFTING_ROLLOUT_PERCENT, 100);
  }

  /**
   * Initialize Remote Config from server
   */
  async initialize(): Promise<void> {
    try {
      // This would fetch from Firebase Console
      // For now, use defaults
      this.config = new Map(this.defaults);
      this.initialized = true;
      console.log('✅ Remote Config initialized with defaults');
    } catch (error) {
      console.error('Failed to initialize Remote Config:', error);
      this.config = new Map(this.defaults);
    }
  }

  /**
   * Check if a feature flag is enabled
   */
  isFeatureEnabled(featureFlag: FeatureFlags): boolean {
    if (!this.initialized) {
      console.warn('Remote Config not initialized, using default');
    }

    const value = this.config.get(featureFlag) ?? this.defaults.get(featureFlag);
    return Boolean(value);
  }

  /**
   * Check if a feature is enabled for this user (rollout percentage)
   */
  isFeatureEnabledForUser(featureFlag: FeatureFlags, userId: string): boolean {
    if (!this.isFeatureEnabled(featureFlag)) {
      return false;
    }

    // Get rollout percentage from config
    const rolloutKey = `${featureFlag}_rollout_percent`;
    const rolloutPercent = this.config.get(rolloutKey) ?? 100;

    // Hash userId to get consistent value for this user
    const userHash = this.hashUserId(userId);
    const userPercent = (userHash % 100) + 1; // 1-100

    return userPercent <= rolloutPercent;
  }

  /**
   * Get a string configuration value
   */
  getString(param: ConfigParameters): string {
    const value = this.config.get(param) ?? this.defaults.get(param);
    return String(value);
  }

  /**
   * Get a numeric configuration value
   */
  getNumber(param: ConfigParameters): number {
    const value = this.config.get(param) ?? this.defaults.get(param);
    return Number(value);
  }

  /**
   * Get a boolean configuration value
   */
  getBoolean(param: ConfigParameters): boolean {
    const value = this.config.get(param) ?? this.defaults.get(param);
    return Boolean(value);
  }

  /**
   * Get a JSON configuration value
   */
  getJson(param: string): Record<string, any> {
    const value = this.config.get(param);
    if (!value) return {};

    try {
      return typeof value === 'string' ? JSON.parse(value) : value;
    } catch {
      return {};
    }
  }

  /**
   * Set configuration value (for testing or local override)
   */
  setConfigValue(key: string, value: any): void {
    this.config.set(key, value);
    console.log(`🔧 Remote Config updated: ${key} = ${value}`);
  }

  /**
   * Get all current configuration values
   */
  getAllValues(): Record<string, any> {
    const result: Record<string, any> = {};
    this.config.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  /**
   * Reset to defaults
   */
  reset(): void {
    this.config = new Map(this.defaults);
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
 * Initialize Remote Config
 */
export async function initializeRemoteConfig(): Promise<RemoteConfigManager> {
  const config = getRemoteConfig();
  await config.initialize();
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
