// Shared Firebase utilities for Firebase-first architecture

// Client-side exports only
export { FirebaseClient } from './client.js';
export type { FirebaseConfig } from './client.js';
export {
  AuthHelpers,
  FunctionsHelpers,
  StorageHelpers
} from './client.js';
export {
  AnalyticsTracker,
  UserJourneyTracker,
  getAnalyticsTracker,
  initializeAnalytics
} from './analytics.js';
export type {
  AnalyticsEvent,
  UserAnalyticsProperties
} from './analytics.js';
export {
  ConfigParameters,
  FeatureFlags,
  RemoteConfigHelpers,
  RemoteConfigManager,
  getRemoteConfig,
  initializeRemoteConfig
} from './remote-config.js';
export type { RemoteConfigValue } from './remote-config.js';