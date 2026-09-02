import 'package:flutter/material.dart';

/// Brand + design tokens mirrored from the web app.
///
/// Sources of truth:
///  - `packages/web/client-src/index.css` (`--primary: 158 64% 42%`, warm-grey
///    text/borders, `--destructive`, `--radius: 0.5rem`).
///  - `packages/web/public/logo.svg` (deep emerald `#004E36`, gold sparkle
///    `#F59E0B`/`#FBBF24`, ivory gift `#FFF8E8`).
///
/// Everything in the app should reference these instead of ad-hoc `Colors.green`
/// / hex literals so the mobile look-and-feel tracks the website.
class AppColors {
  AppColors._();

  /// Deep brand emerald — the logo background. App bars, splash, deep surfaces.
  static const emerald = Color(0xFF004E36);

  /// Primary interactive colour (buttons, links, FAB, selected states).
  /// Web `hsl(158 64% 42%)`.
  static const primary = Color(0xFF27B07D);

  /// Pressed / hover shade for [primary]. Web `hover:bg-emerald-800`.
  static const primaryPressed = Color(0xFF065F46);

  /// Gold accent — the logo sparkle. Achievements, highlights, badges.
  static const gold = Color(0xFFF59E0B);
  static const goldLight = Color(0xFFFBBF24);

  /// Warm off-white from the logo's ivory gift — subtle tinted surfaces.
  static const ivory = Color(0xFFFFF8E8);

  static const background = Color(0xFFFFFFFF);
  static const surface = Color(0xFFFFFFFF);

  /// Primary text. Web `--foreground` (warm near-black).
  static const foreground = Color(0xFF1C1917);

  /// Secondary / caption text. Web `--muted-foreground` (warm grey).
  static const mutedForeground = Color(0xFF78716C);

  /// Hairlines and outlines. Web `--border`.
  static const border = Color(0xFFE7E5E4);

  /// Semantic status colours (match web Tailwind `.500` shades).
  static const destructive = Color(0xFFEF4444);
  static const success = Color(0xFF22C55E);
  static const warning = Color(0xFFF59E0B);

  // ---- Dark (defined for a future dark-mode pass; not wired on yet). ----
  static const darkBackground = Color(0xFF0C0A09);
  static const darkSurface = Color(0xFF1C1917);
  static const darkForeground = Color(0xFFFAFAF9);
  static const darkMutedForeground = Color(0xFFA8A29E);
  static const darkBorder = Color(0xFF292524);
}

/// 4px spacing scale.
class AppSpacing {
  AppSpacing._();
  static const x1 = 4.0;
  static const x2 = 8.0;
  static const x3 = 12.0;
  static const x4 = 16.0;
  static const x5 = 20.0;
  static const x6 = 24.0;
  static const x8 = 32.0;
}

/// Corner radii. Web `--radius: 0.5rem` (8px) as the base step.
class AppRadius {
  AppRadius._();
  static const base = 8.0;
  static const lg = 12.0;
  static const xl = 16.0;
}
