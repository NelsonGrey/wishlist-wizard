import 'package:flutter/foundation.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:wishlist_wizard_mobile/services/admob_service.dart';

void main() {
  // AdMobManager's ad-loading/consent/show methods all go through
  // google_mobile_ads' real native SDK singletons (BannerAd/InterstitialAd/
  // RewardedAd/ConsentInformation/MobileAds) -- unlike firebase_core/
  // share_plus/url_launcher, this package ships no swappable platform-
  // interface test double, so those paths aren't reachable from a plain
  // `flutter test`. What IS real, pure logic covered here: AdMobConfig's
  // platform-based ad-unit-ID selection, and AdMobManager's singleton
  // identity, initial (never-loaded) getter states, and the safe-no-throw
  // dispose paths.
  group('AdMobConfig', () {
    final originalOverride = debugDefaultTargetPlatformOverride;

    tearDown(() {
      debugDefaultTargetPlatformOverride = originalOverride;
    });

    test('selects the iOS banner ad unit ID on iOS', () {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      expect(AdMobConfig.bannerAdUnitId, AdMobConfig.iosBannerAdUnitId);
    });

    test('selects the Android banner ad unit ID on Android', () {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      expect(AdMobConfig.bannerAdUnitId, AdMobConfig.androidBannerAdUnitId);
    });

    test('selects the iOS interstitial ad unit ID on iOS', () {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      expect(AdMobConfig.interstitialAdUnitId, AdMobConfig.iosInterstitialAdUnitId);
    });

    test('selects the Android interstitial ad unit ID on Android', () {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      expect(AdMobConfig.interstitialAdUnitId, AdMobConfig.androidInterstitialAdUnitId);
    });

    test('selects the iOS rewarded ad unit ID on iOS', () {
      debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
      expect(AdMobConfig.rewardedAdUnitId, AdMobConfig.iosRewardedAdUnitId);
    });

    test('selects the Android rewarded ad unit ID on Android', () {
      debugDefaultTargetPlatformOverride = TargetPlatform.android;
      expect(AdMobConfig.rewardedAdUnitId, AdMobConfig.androidRewardedAdUnitId);
    });

    test('falls back to the Android ID on a non-iOS platform (e.g. macOS test host)', () {
      debugDefaultTargetPlatformOverride = TargetPlatform.macOS;
      expect(AdMobConfig.bannerAdUnitId, AdMobConfig.androidBannerAdUnitId);
    });

    test('uses the debug (test) ad unit IDs, not the production ones, under kDebugMode', () {
      // flutter test always runs in debug mode.
      expect(AdMobConfig.androidBannerAdUnitId, 'ca-app-pub-3940256099942544/6300978111');
      expect(AdMobConfig.iosBannerAdUnitId, 'ca-app-pub-3940256099942544/2934735716');
    });
  });

  group('AdMobManager', () {
    test('returns the same singleton instance every time', () {
      expect(identical(AdMobManager(), AdMobManager()), isTrue);
    });

    test('starts with no ad loaded', () {
      final manager = AdMobManager();
      expect(manager.isBannerAdLoaded, isFalse);
      expect(manager.isInterstitialAdLoaded, isFalse);
      expect(manager.isRewardedAdLoaded, isFalse);
      expect(manager.bannerAd, isNull);
    });

    test('disposeBannerAd() does not throw when nothing is loaded', () {
      expect(() => AdMobManager().disposeBannerAd(), returnsNormally);
    });

    test('disposeAll() does not throw when nothing is loaded', () {
      expect(() => AdMobManager().disposeAll(), returnsNormally);
    });

    test('updatePrivacySettings() does not throw with a partial update', () {
      expect(() => AdMobManager().updatePrivacySettings(gdprConsent: true), returnsNormally);
    });
  });
}
