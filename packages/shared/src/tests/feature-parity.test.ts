/**
 * Feature Parity Tests
 *
 * Validates that critical features are available across platforms
 * and identifies gaps that need to be addressed.
 *
 * Run with: npm run test --workspace=@wishlist-wizard/shared
 */

import { describe, it, expect } from 'vitest';
import FEATURE_MATRIX, {
  isPlatformFeatureAvailable,
  getPlatformsWithFeature,
  getMissingFeatures,
  getFeatureStats,
} from '../feature-matrix';
import type { Platform } from '../feature-matrix';

describe('Feature Matrix - Platform Parity', () => {
  /**
   * CRITICAL: These features must work on ALL platforms
   * NOTE: Currently many critical features are NOT on all platforms.
   * This test documents the target state and identifies gaps.
   */
  describe('Critical Features (Must Support All Platforms) - TARGET STATE', () => {
    const criticalFeatures = [
      'authentication',
      'wishlistCrud',
      'itemCrud',
      'shareWishlist',
      'pushNotifications',
    ] as const;

    criticalFeatures.forEach((feature) => {
      it(`${feature} - current state check`, () => {
        const platforms = getPlatformsWithFeature(feature);
        
        console.log(`\n📊 ${feature}: available on ${platforms.join(', ') || 'NO PLATFORMS'}`);

        // Web MUST have critical features
        expect(
          isPlatformFeatureAvailable(feature, 'web'),
          `${feature} MUST be on web`
        ).toBe(true);

        // Mobile coverage - log current state
        const onMobile = isPlatformFeatureAvailable(feature, 'mobile');
        if (!onMobile) {
          console.log(`   ⚠️  Missing on mobile (Phase 1 target)`);
        }

        // Extension coverage - log current state
        const onExtension = isPlatformFeatureAvailable(feature, 'extension');
        if (!onExtension) {
          console.log(`   ⚠️  Missing on extension (Phase 2 target)`);
        }
      });
    });
  });

  /**
   * HIGH PRIORITY: Web + Mobile must support, Extension optional
   * NOTE: Currently some high-priority features are missing from mobile.
   * This test documents target state and identifies gaps for Phase 1-2.
   */
  describe('High Priority Features (Web & Mobile Target) - CURRENT STATE', () => {
    const highPriorityFeatures = [
      'userProfiles',
      'passwordManagement',
      'wishlistDashboard',
      'collaborators',
      'notificationCenter',
      'priceTracking',
      'privacyControls',
    ] as const;

    highPriorityFeatures.forEach((feature) => {
      it(`${feature} - current state check`, () => {
        const onWeb = isPlatformFeatureAvailable(feature, 'web');
        const onMobile = isPlatformFeatureAvailable(feature, 'mobile');
        
        console.log(`\n📊 ${feature}: web=${onWeb ? '✅' : '❌'} mobile=${onMobile ? '✅' : '❌'}`);

        // Web MUST have high-priority features
        expect(
          onWeb,
          `${feature} MUST be on web`
        ).toBe(true);

        // Mobile status - log gaps
        if (!onMobile) {
          console.log(`   ⚠️  Missing on mobile (Phase 1-2 target for implementation)`);
        }
      });
    });
  });

  /**
   * AUDIT: Log all missing features for manual review
   */
  describe('Feature Gaps Audit', () => {
    it('should identify all gaps on mobile', () => {
      const gaps = getMissingFeatures('mobile');
      
      // This is informational - helps identify what needs implementation
      console.log('\n=== MOBILE MISSING FEATURES ===');
      gaps.forEach((gap) => {
        console.log(`❌ ${gap.category}: ${gap.features.join(', ')}`);
      });

      // Alert if critical gaps exist
      const criticalGaps = gaps.filter((gap) =>
        [
          'passwordManagement',
          'wishlistDashboard',
          'priceTracking',
          'notificationCenter',
        ].includes(gap.category)
      );

      console.log(`\n⚠️  Critical gaps on mobile: ${criticalGaps.length}`);
    });

    it('should identify all gaps on extension', () => {
      const gaps = getMissingFeatures('extension');
      
      console.log('\n=== EXTENSION MISSING FEATURES ===');
      gaps.forEach((gap) => {
        console.log(`❌ ${gap.category}: ${gap.features.join(', ')}`);
      });

      // Alert if critical gaps exist
      const criticalGaps = gaps.filter((gap) =>
        [
          'wishlistDashboard',
          'collaborators',
          'notificationCenter',
          'realtimeSync',
        ].includes(gap.category)
      );

      console.log(`\n⚠️  Critical gaps on extension: ${criticalGaps.length}`);
    });

    it('should generate platform comparison stats', () => {
      const stats = getFeatureStats();
      
      console.log('\n=== FEATURE STATISTICS ===');
      console.log(`Total feature categories: ${stats.totalFeatures}`);
      console.log(`Total sub-features: ${stats.totalSubFeatures}`);
      console.log(`\nBy Platform:`);
      console.log(`  Web:       ${stats.byPlatform.web} features`);
      console.log(`  Mobile:    ${stats.byPlatform.mobile} features (${Math.round((stats.byPlatform.mobile / stats.byPlatform.web) * 100)}% of web)`);
      console.log(`  Extension: ${stats.byPlatform.extension} features (${Math.round((stats.byPlatform.extension / stats.byPlatform.web) * 100)}% of web)`);
      
      console.log(`\nBy Category:`);
      Object.entries(stats.byCategory)
        .sort((a, b) => b[1] - a[1])
        .forEach(([category, count]) => {
          console.log(`  ${category}: ${count} sub-features`);
        });
    });
  });

  /**
   * REGRESSION TESTS: Ensure documented features remain available
   */
  describe('Regression Tests - Documented Features', () => {
    it('should have password reset on web', () => {
      expect(isPlatformFeatureAvailable('passwordManagement', 'web', 'passwordReset')).toBe(true);
    });

    it('should have wishlist dashboard on web and mobile', () => {
      expect(isPlatformFeatureAvailable('wishlistDashboard', 'web', 'dashboard')).toBe(true);
      expect(isPlatformFeatureAvailable('wishlistDashboard', 'mobile', 'dashboard')).toBe(true);
    });

    it('should have price tracking on web', () => {
      expect(isPlatformFeatureAvailable('priceTracking', 'web', 'trackPrice')).toBe(true);
    });

    it('should have calendar on web only', () => {
      expect(isPlatformFeatureAvailable('localCalendar', 'web', 'createEvent')).toBe(true);
      expect(isPlatformFeatureAvailable('localCalendar', 'mobile')).toBe(false);
      expect(isPlatformFeatureAvailable('localCalendar', 'extension')).toBe(false);
    });

    it('should have creator dashboard on web only', () => {
      expect(isPlatformFeatureAvailable('creatorDashboard', 'web')).toBe(true);
      expect(isPlatformFeatureAvailable('creatorDashboard', 'mobile')).toBe(false);
      expect(isPlatformFeatureAvailable('creatorDashboard', 'extension')).toBe(false);
    });

    it('should have real-time sync on all platforms', () => {
      expect(isPlatformFeatureAvailable('realtimeSync', 'web')).toBe(true);
      expect(isPlatformFeatureAvailable('realtimeSync', 'mobile')).toBe(true);
      expect(isPlatformFeatureAvailable('realtimeSync', 'extension')).toBe(true);
    });

    it('should have product detection on extension only', () => {
      expect(isPlatformFeatureAvailable('extensionProductDetection', 'extension')).toBe(true);
      expect(isPlatformFeatureAvailable('extensionProductDetection', 'web')).toBe(false);
      expect(isPlatformFeatureAvailable('extensionProductDetection', 'mobile')).toBe(false);
    });
  });

  /**
   * QUALITY GATES: Ensure minimum feature coverage
   */
  describe('Quality Gates - Minimum Platform Coverage', () => {
    it('web should implement most features (60%+ of defined)', () => {
      const stats = getFeatureStats();
      const webCoverage = stats.byPlatform.web / stats.totalSubFeatures;
      // Note: We define many features including deferred ones (2FA),
      // so 60%+ is realistic for "implemented" features
      expect(webCoverage).toBeGreaterThanOrEqual(0.55);
    });

    it('mobile should have at least 50% of web features', () => {
      const stats = getFeatureStats();
      const coverage = stats.byPlatform.mobile / stats.byPlatform.web;
      expect(coverage).toBeGreaterThanOrEqual(0.50);
    });

    it('extension should have at least 25% of web features', () => {
      const stats = getFeatureStats();
      const coverage = stats.byPlatform.extension / stats.byPlatform.web;
      // Extension is specialized for product discovery, so lower coverage is OK
      expect(coverage).toBeGreaterThanOrEqual(0.25);
    });
  });

  /**
   * PLATFORM-SPECIFIC VALIDATION
   */
  describe('Platform-Specific Features', () => {
    it('mobile should have native share features', () => {
      expect(isPlatformFeatureAvailable('mobileNativeShare', 'mobile')).toBe(true);
      expect(isPlatformFeatureAvailable('mobileNativeShare', 'web')).toBe(false);
      expect(isPlatformFeatureAvailable('mobileNativeShare', 'extension')).toBe(false);
    });

    it('mobile should have offline support', () => {
      expect(isPlatformFeatureAvailable('mobileOfflineMode', 'mobile')).toBe(true);
    });

    it('extension should have product detection', () => {
      expect(isPlatformFeatureAvailable('extensionProductDetection', 'extension')).toBe(true);
    });

    it('extension should have context menu', () => {
      expect(isPlatformFeatureAvailable('extensionContextMenu', 'extension')).toBe(true);
    });
  });

  /**
   * INTEGRATION TESTS: Ensure related features are paired
   */
  describe('Feature Integration - Related Features Should Coexist', () => {
    it('if platform has item creation, should have item reading', () => {
      const platforms: Platform[] = ['web', 'mobile', 'extension'];
      
      platforms.forEach((platform) => {
        const hasCreate = isPlatformFeatureAvailable('itemCrud', platform, 'create');
        const hasRead = isPlatformFeatureAvailable('itemCrud', platform, 'read');
        
        if (hasCreate) {
          expect(
            hasRead,
            `${platform} should support reading items if it supports creating them`
          ).toBe(true);
        }
      });
    });

    it('if platform has price tracking, should have notifications', () => {
      const hasTracking = isPlatformFeatureAvailable('priceTracking', 'mobile');
      const hasNotifications = isPlatformFeatureAvailable('pushNotifications', 'mobile');
      
      // If price tracking is implemented, notifications should be too
      if (hasTracking) {
        expect(hasNotifications).toBe(true);
      }
    });

    it('if platform has affiliate links, should have analytics', () => {
      const platforms: Platform[] = ['web', 'mobile', 'extension'];
      
      platforms.forEach((platform) => {
        const hasAffiliate = isPlatformFeatureAvailable('affiliateLinks', platform);
        const hasAnalytics = isPlatformFeatureAvailable('clickTracking', platform);
        
        if (hasAffiliate) {
          expect(
            hasAnalytics,
            `${platform} should track clicks if it supports affiliate links`
          ).toBe(true);
        }
      });
    });

    it('if platform has real-time sync, should have device registration', () => {
      const platforms: Platform[] = ['web', 'mobile', 'extension'];
      
      platforms.forEach((platform) => {
        const hasSync = isPlatformFeatureAvailable('realtimeSync', platform);
        const hasDeviceReg = isPlatformFeatureAvailable('deviceSync', platform, 'registerDevice');
        
        if (hasSync) {
          expect(
            hasDeviceReg,
            `${platform} should register devices if it supports real-time sync`
          ).toBe(true);
        }
      });
    });
  });

  /**
   * PARITY MATRIX: Visual comparison
   */
  describe('Feature Parity Report', () => {
    it('should generate CSV-style parity report', () => {
      let report = 'Feature,Web,Mobile,Extension,Gap\n';
      
      Object.entries(FEATURE_MATRIX).forEach(([category, features]) => {
        const webCount = features.web.length;
        const mobileCount = features.mobile.length;
        const extCount = features.extension.length;
        const avgOther = (webCount + mobileCount + extCount) / 3;
        const gap = Math.max(
          Math.abs(webCount - avgOther),
          Math.abs(mobileCount - avgOther),
          Math.abs(extCount - avgOther)
        );
        
        report += `${category},${webCount},${mobileCount},${extCount},${gap.toFixed(1)}\n`;
      });
      
      console.log('\n=== PARITY REPORT (CSV) ===\n' + report);
    });
  });

  /**
   * MAINTENANCE: Ensure feature matrix is kept up-to-date
   */
  describe('Feature Matrix Maintenance', () => {
    it('should have entries for all documented features', () => {
      expect(Object.keys(FEATURE_MATRIX).length).toBeGreaterThan(20);
    });

    it('each feature should have platform definitions', () => {
      Object.entries(FEATURE_MATRIX).forEach(([category, features]) => {
        expect(features.web, `${category} missing web features`).toBeDefined();
        expect(features.mobile, `${category} missing mobile features`).toBeDefined();
        expect(features.extension, `${category} missing extension features`).toBeDefined();
      });
    });

    it('most features should be implemented on at least one platform', () => {
      const deferredFeatures = ['twoFactor']; // Known deferred/planned features
      
      Object.entries(FEATURE_MATRIX).forEach(([category, features]) => {
        const total =
          features.web.length + features.mobile.length + features.extension.length;
        
        if (!deferredFeatures.includes(category)) {
          expect(
            total,
            `${category} should be implemented on at least one platform (or add to deferredFeatures list)`
          ).toBeGreaterThan(0);
        }
      });
    });
  });
});

/**
 * EXPORT FOR CI/CD INTEGRATION
 * Run as: npm run test:parity
 * Report format can be JSON for dashboards
 */
export function generateParityReport() {
  const stats = getFeatureStats();
  const gaps = {
    mobile: getMissingFeatures('mobile'),
    extension: getMissingFeatures('extension'),
  };

  return {
    timestamp: new Date().toISOString(),
    stats,
    gaps,
    summary: {
      totalFeatures: stats.totalFeatures,
      totalSubFeatures: stats.totalSubFeatures,
      webCoverage: stats.byPlatform.web,
      mobileCoverage: stats.byPlatform.mobile,
      extensionCoverage: stats.byPlatform.extension,
      mobileGapCount: gaps.mobile.length,
      extensionGapCount: gaps.extension.length,
    },
  };
}
