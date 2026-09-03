import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/providers.dart';
import '../theme/design_tokens.dart';
import 'admob_widgets.dart';

/// A fixed-height banner-ad slot pinned directly under the app bar.
///
/// The slot is "locked in": for the free tier it always reserves the same
/// vertical space, so the screen layout never jumps when an ad loads, fails to
/// load, or refreshes. `BannerAdWidget` collapses to nothing while it has no ad
/// to show, but the surrounding container keeps [_slotHeight], leaving a subtle
/// placeholder strip in the meantime.
///
/// For any paid tier the slot collapses entirely -- part of what the
/// subscription pays for is the removal of ads.
class AnchoredAdBanner extends StatelessWidget {
  const AnchoredAdBanner({super.key});

  /// Standard AdMob banner is 320x50; the extra 10px is breathing room so the
  /// ad isn't flush against the app bar and the content below it. The 1px
  /// bottom border sits inside this height.
  static const double _slotHeight = 61;

  String _tier(BuildContext context) {
    try {
      return context.watch<SubscriptionProvider>().tier;
    } on ProviderNotFoundException {
      // No SubscriptionProvider in the tree (e.g. a lean widget test) -- treat
      // as free so the slot still renders and behaves as it does in the app.
      return 'free';
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_tier(context) != 'free') {
      return const SizedBox.shrink();
    }

    // The border belongs to this fixed, non-scrolling slot (AppScaffold places
    // AnchoredAdBanner above the body's scroll view), so the separation line
    // between the ad and the app content stays put when the user scrolls.
    return Container(
      height: _slotHeight,
      width: double.infinity,
      alignment: Alignment.center,
      decoration: const BoxDecoration(
        // A whisper of warm grey marks the strip as chrome, not content; the
        // solid hairline underneath is the actual separator.
        color: Color(0xFFF6F6F5),
        border: Border(
          bottom: BorderSide(color: AppColors.border),
        ),
      ),
      child: const BannerAdWidget(margin: EdgeInsets.zero),
    );
  }
}
