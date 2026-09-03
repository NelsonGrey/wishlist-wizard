import 'package:flutter/material.dart';

import 'anchored_ad_banner.dart';

/// Standard screen chrome for the app's post-sign-in screens.
///
/// Wraps [Scaffold] and pins an [AnchoredAdBanner] directly beneath the app bar
/// -- outside the body's scroll view -- so the ad slot stays in the same place
/// on every screen that uses it. Set [showAd] to false for screens where an ad
/// would detract (camera capture, payment, auth, the subscription upsell).
class AppScaffold extends StatelessWidget {
  const AppScaffold({
    super.key,
    required this.title,
    required this.body,
    this.actions,
    this.bottom,
    this.floatingActionButton,
    this.showAd = true,
  });

  final String title;
  final Widget body;
  final List<Widget>? actions;

  /// Optional app-bar bottom, e.g. a [TabBar].
  final PreferredSizeWidget? bottom;
  final Widget? floatingActionButton;

  /// When true (default) a free-tier viewer sees the locked-in ad slot.
  final bool showAd;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title), actions: actions, bottom: bottom),
      body: Column(
        children: [
          if (showAd) const AnchoredAdBanner(),
          Expanded(child: body),
        ],
      ),
      floatingActionButton: floatingActionButton,
    );
  }
}
