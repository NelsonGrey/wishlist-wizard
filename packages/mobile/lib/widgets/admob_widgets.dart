/// AdMob Widget Components for Flutter
/// Reusable widgets for displaying Google AdMob ads in the mobile app
library;

import 'package:flutter/material.dart';
import 'package:google_mobile_ads/google_mobile_ads.dart';
import '../services/admob_service.dart';

/// Banner Ad Widget
class BannerAdWidget extends StatefulWidget {
  final AdSize adSize;
  final EdgeInsets margin;
  final String? customAdUnitId;

  const BannerAdWidget({
    super.key,
    this.adSize = AdSize.banner,
    this.margin = const EdgeInsets.symmetric(vertical: 8.0),
    this.customAdUnitId,
  });

  @override
  State<BannerAdWidget> createState() => _BannerAdWidgetState();
}

class _BannerAdWidgetState extends State<BannerAdWidget> {
  BannerAd? _bannerAd;
  bool _isAdLoaded = false;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _loadBannerAd();
  }

  void _loadBannerAd() {
    _bannerAd = BannerAd(
      adUnitId: widget.customAdUnitId ?? AdMobConfig.bannerAdUnitId,
      size: widget.adSize,
      request: const AdRequest(),
      listener: BannerAdListener(
        onAdLoaded: (ad) {
          if (mounted) {
            setState(() {
              _isAdLoaded = true;
              _hasError = false;
            });
          }
        },
        onAdFailedToLoad: (ad, error) {
          debugPrint('[BannerAdWidget] Failed to load ad: $error');
          if (mounted) {
            setState(() {
              _isAdLoaded = false;
              _hasError = true;
            });
          }
          ad.dispose();
        },
        onAdClicked: (ad) {
          debugPrint('[BannerAdWidget] Ad clicked');
        },
        onAdImpression: (ad) {
          debugPrint('[BannerAdWidget] Ad impression');
        },
      ),
    );

    _bannerAd!.load();
  }

  @override
  void dispose() {
    _bannerAd?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Don't show anything if there's an error or ad isn't loaded
    if (_hasError || !_isAdLoaded || _bannerAd == null) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: widget.margin,
      width: widget.adSize.width.toDouble(),
      height: widget.adSize.height.toDouble(),
      child: AdWidget(ad: _bannerAd!),
    );
  }
}

/// Native Ad Widget (for better integration with content)
class NativeAdWidget extends StatefulWidget {
  final String? customAdUnitId;
  final EdgeInsets margin;
  final double? height;

  const NativeAdWidget({
    super.key,
    this.customAdUnitId,
    this.margin = const EdgeInsets.symmetric(vertical: 12.0),
    this.height,
  });

  @override
  State<NativeAdWidget> createState() => _NativeAdWidgetState();
}

class _NativeAdWidgetState extends State<NativeAdWidget> {
  NativeAd? _nativeAd;
  bool _isAdLoaded = false;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _loadNativeAd();
  }

  void _loadNativeAd() {
    _nativeAd = NativeAd(
      adUnitId:
          widget.customAdUnitId ??
          AdMobConfig.bannerAdUnitId, // Use banner for now
      listener: NativeAdListener(
        onAdLoaded: (ad) {
          if (mounted) {
            setState(() {
              _isAdLoaded = true;
              _hasError = false;
            });
          }
        },
        onAdFailedToLoad: (ad, error) {
          debugPrint('[NativeAdWidget] Failed to load ad: $error');
          if (mounted) {
            setState(() {
              _isAdLoaded = false;
              _hasError = true;
            });
          }
          ad.dispose();
        },
        onAdClicked: (ad) {
          debugPrint('[NativeAdWidget] Ad clicked');
        },
        onAdImpression: (ad) {
          debugPrint('[NativeAdWidget] Ad impression');
        },
      ),
      request: const AdRequest(),
      nativeTemplateStyle: NativeTemplateStyle(
        templateType: TemplateType.medium,
        mainBackgroundColor: Theme.of(context).cardColor,
        cornerRadius: 12.0,
        callToActionTextStyle: NativeTemplateTextStyle(
          textColor: Colors.white,
          backgroundColor: Theme.of(context).colorScheme.primary,
          style: NativeTemplateFontStyle.bold,
          size: 16.0,
        ),
        primaryTextStyle: NativeTemplateTextStyle(
          textColor:
              Theme.of(context).textTheme.titleLarge?.color ?? Colors.black,
          style: NativeTemplateFontStyle.normal,
          size: 16.0,
        ),
        secondaryTextStyle: NativeTemplateTextStyle(
          textColor:
              Theme.of(context).textTheme.bodyMedium?.color ?? Colors.grey,
          style: NativeTemplateFontStyle.normal,
          size: 14.0,
        ),
      ),
    );

    _nativeAd!.load();
  }

  @override
  void dispose() {
    _nativeAd?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    // Don't show anything if there's an error or ad isn't loaded
    if (_hasError || !_isAdLoaded || _nativeAd == null) {
      return const SizedBox.shrink();
    }

    return Container(
      margin: widget.margin,
      height: widget.height ?? 300,
      child: AdWidget(ad: _nativeAd!),
    );
  }
}

/// Ad Container with loading state and error handling
class AdContainer extends StatelessWidget {
  final Widget child;
  final String? label;
  final EdgeInsets padding;
  final Color? backgroundColor;
  final BorderRadius? borderRadius;

  const AdContainer({
    super.key,
    required this.child,
    this.label,
    this.padding = const EdgeInsets.all(8.0),
    this.backgroundColor,
    this.borderRadius,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color:
            backgroundColor ??
            Theme.of(context).cardColor.withValues(alpha: 0.3),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: Theme.of(context).dividerColor.withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.center,
        mainAxisSize: MainAxisSize.min,
        children: [
          if (label != null) ...[
            Text(
              label!,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                color: Theme.of(context).textTheme.bodySmall?.color,
                fontSize: 10,
                letterSpacing: 0.5,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 4),
          ],
          child,
        ],
      ),
    );
  }
}

/// Interstitial Ad Helper
class InterstitialAdHelper {
  static Future<void> showInterstitialAd({
    required BuildContext context,
    VoidCallback? onAdClosed,
    VoidCallback? onAdFailedToShow,
  }) async {
    final adMobManager = AdMobManager();

    // Ensure ad is loaded
    if (!adMobManager.isInterstitialAdLoaded) {
      await adMobManager.loadInterstitialAd();
    }

    final success = await adMobManager.showInterstitialAd();

    if (success) {
      onAdClosed?.call();
    } else {
      onAdFailedToShow?.call();
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Advertisement not available right now'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    }
  }
}

/// Rewarded Ad Helper
class RewardedAdHelper {
  static Future<void> showRewardedAd({
    required BuildContext context,
    required Function(RewardItem reward) onReward,
    VoidCallback? onAdClosed,
    VoidCallback? onAdFailedToShow,
  }) async {
    final adMobManager = AdMobManager();

    // Ensure ad is loaded
    if (!adMobManager.isRewardedAdLoaded) {
      await adMobManager.loadRewardedAd();
    }

    final success = await adMobManager.showRewardedAd(
      onUserEarnedReward: (ad, reward) => onReward(reward),
    );

    if (success) {
      onAdClosed?.call();
    } else {
      onAdFailedToShow?.call();
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Reward video not available right now'),
            duration: Duration(seconds: 2),
          ),
        );
      }
    }
  }
}

/// Ad-supported feature unlock widget
class AdRewardedFeature extends StatefulWidget {
  final Widget child;
  final String rewardDescription;
  final VoidCallback onRewardEarned;
  final IconData? icon;

  const AdRewardedFeature({
    super.key,
    required this.child,
    required this.rewardDescription,
    required this.onRewardEarned,
    this.icon,
  });

  @override
  State<AdRewardedFeature> createState() => _AdRewardedFeatureState();
}

class _AdRewardedFeatureState extends State<AdRewardedFeature> {
  bool _isLoading = false;

  void _watchAdForReward() async {
    setState(() {
      _isLoading = true;
    });

    await RewardedAdHelper.showRewardedAd(
      context: context,
      onReward: (reward) {
        debugPrint(
          '[AdRewardedFeature] User earned reward: ${reward.amount} ${reward.type}',
        );
        widget.onRewardEarned();
      },
      onAdClosed: () {
        setState(() {
          _isLoading = false;
        });
      },
      onAdFailedToShow: () {
        setState(() {
          _isLoading = false;
        });
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        widget.child,
        const SizedBox(height: 16),
        Card(
          child: Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                if (widget.icon != null) ...[
                  Icon(
                    widget.icon,
                    size: 32,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(height: 8),
                ],
                Text(
                  widget.rewardDescription,
                  style: Theme.of(context).textTheme.bodyMedium,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 12),
                ElevatedButton.icon(
                  onPressed: _isLoading ? null : _watchAdForReward,
                  icon: _isLoading
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.play_arrow),
                  label: Text(_isLoading ? 'Loading...' : 'Watch Ad'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

/// Smart Ad Placement Widget - decides when to show ads
class SmartAdPlacement extends StatefulWidget {
  final Widget child;
  final AdSize adSize;
  final int minScrollOffset;
  final Duration minTimeBetweenAds;

  const SmartAdPlacement({
    super.key,
    required this.child,
    this.adSize = AdSize.banner,
    this.minScrollOffset = 1000,
    this.minTimeBetweenAds = const Duration(minutes: 2),
  });

  @override
  State<SmartAdPlacement> createState() => _SmartAdPlacementState();
}

class _SmartAdPlacementState extends State<SmartAdPlacement> {
  static DateTime? _lastAdShown;
  bool _shouldShowAd = false;

  @override
  void initState() {
    super.initState();
    _checkIfShouldShowAd();
  }

  void _checkIfShouldShowAd() {
    final now = DateTime.now();

    if (_lastAdShown == null ||
        now.difference(_lastAdShown!) > widget.minTimeBetweenAds) {
      setState(() {
        _shouldShowAd = true;
      });
      _lastAdShown = now;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (!_shouldShowAd) {
      return widget.child;
    }

    return Column(
      children: [
        widget.child,
        AdContainer(
          label: 'Advertisement',
          child: BannerAdWidget(adSize: widget.adSize),
        ),
      ],
    );
  }
}
