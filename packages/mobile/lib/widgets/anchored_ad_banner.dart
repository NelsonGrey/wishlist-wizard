import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/providers.dart';
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
  /// ad isn't flush against the app bar and the content below it.
  static const double _slotHeight = 60;

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

    return Container(
      height: _slotHeight,
      width: double.infinity,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: Theme.of(
          context,
        ).colorScheme.surfaceContainerHighest.withValues(alpha: 0.4),
        border: Border(
          bottom: BorderSide(
            color: Theme.of(context).dividerColor.withValues(alpha: 0.3),
          ),
        ),
      ),
      child: const BannerAdWidget(margin: EdgeInsets.zero),
    );
  }
}
