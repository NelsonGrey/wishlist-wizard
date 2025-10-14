/// Google AdMob Integration for Flutter Mobile App
/// Handles mobile advertising with banner, interstitial, and rewarded ads
library;

import 'package:google_mobile_ads/google_mobile_ads.dart';
import 'package:flutter/foundation.dart';

/// AdMob configuration and IDs
class AdMobConfig {
  // Test Ad Unit IDs - Replace with real IDs for production
  static const String androidBannerAdUnitId = kDebugMode
      ? 'ca-app-pub-3940256099942544/6300978111' // Test banner
      : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'; // Your real banner ID

  static const String iosBannerAdUnitId = kDebugMode
      ? 'ca-app-pub-3940256099942544/2934735716' // Test banner
      : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'; // Your real banner ID

  static const String androidInterstitialAdUnitId = kDebugMode
      ? 'ca-app-pub-3940256099942544/1033173712' // Test interstitial
      : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'; // Your real interstitial ID

  static const String iosInterstitialAdUnitId = kDebugMode
      ? 'ca-app-pub-3940256099942544/4411468910' // Test interstitial
      : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'; // Your real interstitial ID

  static const String androidRewardedAdUnitId = kDebugMode
      ? 'ca-app-pub-3940256099942544/5224354917' // Test rewarded
      : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'; // Your real rewarded ID

  static const String iosRewardedAdUnitId = kDebugMode
      ? 'ca-app-pub-3940256099942544/1712485313' // Test rewarded
      : 'ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX'; // Your real rewarded ID

  /// Get platform-specific banner ad unit ID
  static String get bannerAdUnitId {
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      return iosBannerAdUnitId;
    } else {
      return androidBannerAdUnitId;
    }
  }

  /// Get platform-specific interstitial ad unit ID
  static String get interstitialAdUnitId {
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      return iosInterstitialAdUnitId;
    } else {
      return androidInterstitialAdUnitId;
    }
  }

  /// Get platform-specific rewarded ad unit ID
  static String get rewardedAdUnitId {
    if (defaultTargetPlatform == TargetPlatform.iOS) {
      return iosRewardedAdUnitId;
    } else {
      return androidRewardedAdUnitId;
    }
  }
}

/// AdMob Manager - Singleton for managing all ad operations
class AdMobManager {
  static final AdMobManager _instance = AdMobManager._internal();
  factory AdMobManager() => _instance;
  AdMobManager._internal();

  // Ad instances
  BannerAd? _bannerAd;
  InterstitialAd? _interstitialAd;
  RewardedAd? _rewardedAd;

  // Ad loading states
  bool _isBannerAdLoaded = false;
  bool _isInterstitialAdLoaded = false;
  bool _isRewardedAdLoaded = false;

  // Privacy and consent
  bool _personalizedAds = false;
  bool _gdprConsent = false;
  bool _ccpaConsent = false;

  // Getters for ad states
  bool get isBannerAdLoaded => _isBannerAdLoaded;
  bool get isInterstitialAdLoaded => _isInterstitialAdLoaded;
  bool get isRewardedAdLoaded => _isRewardedAdLoaded;
  BannerAd? get bannerAd => _bannerAd;

  /// Initialize AdMob
  Future<void> initialize() async {
    try {
      debugPrint('[AdMob] Initializing Google Mobile Ads SDK...');
      await MobileAds.instance.initialize();

      // Set request configuration for privacy compliance
      await _updateRequestConfiguration();

      debugPrint('[AdMob] Initialization complete');
    } catch (e) {
      debugPrint('[AdMob] Initialization error: $e');
    }
  }

  /// Update request configuration for privacy compliance
  Future<void> _updateRequestConfiguration() async {
    final requestConfig = RequestConfiguration(
      maxAdContentRating: MaxAdContentRating.g,
      tagForChildDirectedTreatment: TagForChildDirectedTreatment.unspecified,
      tagForUnderAgeOfConsent: TagForUnderAgeOfConsent.unspecified,
      testDeviceIds: kDebugMode ? ['YOUR_TEST_DEVICE_ID'] : [],
    );

    await MobileAds.instance.updateRequestConfiguration(requestConfig);
  }

  /// Update privacy settings
  void updatePrivacySettings({
    bool? personalizedAds,
    bool? gdprConsent,
    bool? ccpaConsent,
  }) {
    _personalizedAds = personalizedAds ?? _personalizedAds;
    _gdprConsent = gdprConsent ?? _gdprConsent;
    _ccpaConsent = ccpaConsent ?? _ccpaConsent;

    debugPrint(
      '[AdMob] Privacy settings updated: '
      'personalized=$_personalizedAds, gdpr=$_gdprConsent, ccpa=$_ccpaConsent',
    );
  }

  /// Create ad request with privacy settings
  AdRequest _createAdRequest() {
    final extras = <String, String>{};

    // Add GDPR consent
    if (!_gdprConsent) {
      extras['npa'] = '1'; // Non-personalized ads
    }

    // Add CCPA consent
    if (!_ccpaConsent) {
      extras['rdp'] = '1'; // Restricted data processing
    }

    return AdRequest(extras: extras, nonPersonalizedAds: !_personalizedAds);
  }

  /// Load banner ad
  Future<void> loadBannerAd({AdSize size = AdSize.banner}) async {
    if (_isBannerAdLoaded) {
      debugPrint('[AdMob] Banner ad already loaded');
      return;
    }

    try {
      _bannerAd = BannerAd(
        adUnitId: AdMobConfig.bannerAdUnitId,
        size: size,
        request: _createAdRequest(),
        listener: BannerAdListener(
          onAdLoaded: (ad) {
            debugPrint('[AdMob] Banner ad loaded successfully');
            _isBannerAdLoaded = true;
          },
          onAdFailedToLoad: (ad, error) {
            debugPrint('[AdMob] Banner ad failed to load: $error');
            _isBannerAdLoaded = false;
            ad.dispose();
            _bannerAd = null;
          },
          onAdClicked: (ad) {
            debugPrint('[AdMob] Banner ad clicked');
          },
          onAdImpression: (ad) {
            debugPrint('[AdMob] Banner ad impression');
          },
        ),
      );

      await _bannerAd!.load();
    } catch (e) {
      debugPrint('[AdMob] Error loading banner ad: $e');
      _isBannerAdLoaded = false;
    }
  }

  /// Load interstitial ad
  Future<void> loadInterstitialAd() async {
    if (_isInterstitialAdLoaded) {
      debugPrint('[AdMob] Interstitial ad already loaded');
      return;
    }

    try {
      await InterstitialAd.load(
        adUnitId: AdMobConfig.interstitialAdUnitId,
        request: _createAdRequest(),
        adLoadCallback: InterstitialAdLoadCallback(
          onAdLoaded: (ad) {
            debugPrint('[AdMob] Interstitial ad loaded successfully');
            _interstitialAd = ad;
            _isInterstitialAdLoaded = true;

            _interstitialAd!.setImmersiveMode(true);
            _interstitialAd!
                .fullScreenContentCallback = FullScreenContentCallback(
              onAdShowedFullScreenContent: (ad) {
                debugPrint(
                  '[AdMob] Interstitial ad showed full screen content',
                );
              },
              onAdDismissedFullScreenContent: (ad) {
                debugPrint('[AdMob] Interstitial ad dismissed');
                ad.dispose();
                _interstitialAd = null;
                _isInterstitialAdLoaded = false;
                // Preload next interstitial
                loadInterstitialAd();
              },
              onAdFailedToShowFullScreenContent: (ad, error) {
                debugPrint('[AdMob] Interstitial ad failed to show: $error');
                ad.dispose();
                _interstitialAd = null;
                _isInterstitialAdLoaded = false;
              },
            );
          },
          onAdFailedToLoad: (error) {
            debugPrint('[AdMob] Interstitial ad failed to load: $error');
            _isInterstitialAdLoaded = false;
            _interstitialAd = null;
          },
        ),
      );
    } catch (e) {
      debugPrint('[AdMob] Error loading interstitial ad: $e');
      _isInterstitialAdLoaded = false;
    }
  }

  /// Load rewarded ad
  Future<void> loadRewardedAd() async {
    if (_isRewardedAdLoaded) {
      debugPrint('[AdMob] Rewarded ad already loaded');
      return;
    }

    try {
      await RewardedAd.load(
        adUnitId: AdMobConfig.rewardedAdUnitId,
        request: _createAdRequest(),
        rewardedAdLoadCallback: RewardedAdLoadCallback(
          onAdLoaded: (ad) {
            debugPrint('[AdMob] Rewarded ad loaded successfully');
            _rewardedAd = ad;
            _isRewardedAdLoaded = true;

            _rewardedAd!.fullScreenContentCallback = FullScreenContentCallback(
              onAdShowedFullScreenContent: (ad) {
                debugPrint('[AdMob] Rewarded ad showed full screen content');
              },
              onAdDismissedFullScreenContent: (ad) {
                debugPrint('[AdMob] Rewarded ad dismissed');
                ad.dispose();
                _rewardedAd = null;
                _isRewardedAdLoaded = false;
                // Preload next rewarded ad
                loadRewardedAd();
              },
              onAdFailedToShowFullScreenContent: (ad, error) {
                debugPrint('[AdMob] Rewarded ad failed to show: $error');
                ad.dispose();
                _rewardedAd = null;
                _isRewardedAdLoaded = false;
              },
            );
          },
          onAdFailedToLoad: (error) {
            debugPrint('[AdMob] Rewarded ad failed to load: $error');
            _isRewardedAdLoaded = false;
            _rewardedAd = null;
          },
        ),
      );
    } catch (e) {
      debugPrint('[AdMob] Error loading rewarded ad: $e');
      _isRewardedAdLoaded = false;
    }
  }

  /// Show interstitial ad
  Future<bool> showInterstitialAd() async {
    if (!_isInterstitialAdLoaded || _interstitialAd == null) {
      debugPrint('[AdMob] Interstitial ad not ready to show');
      // Try to load and show
      await loadInterstitialAd();
      if (!_isInterstitialAdLoaded || _interstitialAd == null) {
        return false;
      }
    }

    try {
      await _interstitialAd!.show();
      return true;
    } catch (e) {
      debugPrint('[AdMob] Error showing interstitial ad: $e');
      return false;
    }
  }

  /// Show rewarded ad
  Future<bool> showRewardedAd({
    required OnUserEarnedRewardCallback onUserEarnedReward,
  }) async {
    if (!_isRewardedAdLoaded || _rewardedAd == null) {
      debugPrint('[AdMob] Rewarded ad not ready to show');
      // Try to load and show
      await loadRewardedAd();
      if (!_isRewardedAdLoaded || _rewardedAd == null) {
        return false;
      }
    }

    try {
      await _rewardedAd!.show(onUserEarnedReward: onUserEarnedReward);
      return true;
    } catch (e) {
      debugPrint('[AdMob] Error showing rewarded ad: $e');
      return false;
    }
  }

  /// Dispose banner ad
  void disposeBannerAd() {
    _bannerAd?.dispose();
    _bannerAd = null;
    _isBannerAdLoaded = false;
  }

  /// Dispose all ads
  void disposeAll() {
    _bannerAd?.dispose();
    _interstitialAd?.dispose();
    _rewardedAd?.dispose();

    _bannerAd = null;
    _interstitialAd = null;
    _rewardedAd = null;

    _isBannerAdLoaded = false;
    _isInterstitialAdLoaded = false;
    _isRewardedAdLoaded = false;
  }

  /// Preload all ads
  Future<void> preloadAllAds() async {
    await Future.wait([loadBannerAd(), loadInterstitialAd(), loadRewardedAd()]);
  }
}
