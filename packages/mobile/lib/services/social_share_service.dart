import 'package:flutter/foundation.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

class SocialShareService {
  static final SocialShareService _instance = SocialShareService._internal();
  factory SocialShareService() => _instance;
  SocialShareService._internal();

  /// Share wishlist to multiple platforms
  Future<void> shareWishlist({
    required String wishlistName,
    required String shareLink,
    String? description,
  }) async {
    final message = _buildShareMessage(wishlistName, shareLink, description);

    try {
      await Share.share(
        message,
        subject: 'Check out my wishlist on Wishlist Wizard',
      );
    } catch (e) {
      debugPrint('[SocialShareService] Error sharing: $e');
      rethrow;
    }
  }

  /// Share directly to WhatsApp
  Future<void> shareToWhatsApp({
    required String wishlistName,
    required String shareLink,
    String? description,
  }) async {
    final message = _buildShareMessage(wishlistName, shareLink, description);
    final whatsappUrl = 'https://wa.me/?text=${Uri.encodeComponent(message)}';

    try {
      final uri = Uri.parse(whatsappUrl);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        throw Exception('WhatsApp is not installed');
      }
    } catch (e) {
      debugPrint('[SocialShareService] Error sharing to WhatsApp: $e');
      rethrow;
    }
  }

  /// Share to Instagram (via story or direct message)
  Future<void> shareToInstagram({required String shareLink}) async {
    try {
      // Instagram doesn't have a direct URL scheme for sharing text
      // We'll open the Instagram app and let the user share manually
      final instagramUrl = 'instagram://story';
      final uri = Uri.parse(instagramUrl);

      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
        // Show instruction to user
        await Share.share(shareLink, subject: 'Share this wishlist');
      } else {
        // Fallback to web
        final webUrl = 'https://www.instagram.com/';
        await launchUrl(
          Uri.parse(webUrl),
          mode: LaunchMode.externalApplication,
        );
      }
    } catch (e) {
      debugPrint('[SocialShareService] Error sharing to Instagram: $e');
      rethrow;
    }
  }

  /// Share to TikTok
  Future<void> shareToTikTok({required String shareLink}) async {
    try {
      final tiktokUrl = 'tiktok://share?link=${Uri.encodeComponent(shareLink)}';
      final uri = Uri.parse(tiktokUrl);

      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      } else {
        // Fallback to web
        final webUrl = 'https://www.tiktok.com/';
        await launchUrl(
          Uri.parse(webUrl),
          mode: LaunchMode.externalApplication,
        );
      }
    } catch (e) {
      debugPrint('[SocialShareService] Error sharing to TikTok: $e');
      rethrow;
    }
  }

  /// Share to Facebook
  Future<void> shareToFacebook({
    required String shareLink,
    String? quote,
  }) async {
    try {
      var facebookUrl =
          'https://www.facebook.com/sharer/sharer.php?u=${Uri.encodeComponent(shareLink)}';
      if (quote != null) {
        facebookUrl += '&quote=${Uri.encodeComponent(quote)}';
      }

      await launchUrl(
        Uri.parse(facebookUrl),
        mode: LaunchMode.externalApplication,
      );
    } catch (e) {
      debugPrint('[SocialShareService] Error sharing to Facebook: $e');
      rethrow;
    }
  }

  /// Share to Twitter/X
  Future<void> shareToTwitter({
    required String wishlistName,
    required String shareLink,
  }) async {
    try {
      final message =
          'Check out my wishlist: $wishlistName $shareLink #WishlistWizard';
      final twitterUrl =
          'https://twitter.com/intent/tweet?text=${Uri.encodeComponent(message)}';

      await launchUrl(
        Uri.parse(twitterUrl),
        mode: LaunchMode.externalApplication,
      );
    } catch (e) {
      debugPrint('[SocialShareService] Error sharing to Twitter: $e');
      rethrow;
    }
  }

  /// Share via email
  Future<void> shareViaEmail({
    required String wishlistName,
    required String shareLink,
    String? description,
    List<String>? recipients,
  }) async {
    try {
      final subject = 'Check out my wishlist: $wishlistName';
      final body = _buildShareMessage(wishlistName, shareLink, description);

      final emailUrl =
          'mailto:${recipients?.join(',') ?? ''}?subject=${Uri.encodeComponent(subject)}&body=${Uri.encodeComponent(body)}';

      await launchUrl(
        Uri.parse(emailUrl),
        mode: LaunchMode.externalApplication,
      );
    } catch (e) {
      debugPrint('[SocialShareService] Error sharing via email: $e');
      rethrow;
    }
  }

  /// Copy share link to clipboard
  Future<void> copyShareLink({required String shareLink}) async {
    try {
      // Note: This requires flutter/services for clipboard
      // For now, we'll use Share.share with just the link
      await Share.share(shareLink);
    } catch (e) {
      debugPrint('[SocialShareService] Error copying link: $e');
      rethrow;
    }
  }

  String _buildShareMessage(
    String wishlistName,
    String shareLink,
    String? description,
  ) {
    final buffer = StringBuffer();
    buffer.writeln('🎁 Check out my wishlist: $wishlistName');
    if (description != null && description.isNotEmpty) {
      buffer.writeln(description);
    }
    buffer.writeln(shareLink);
    buffer.writeln('\nShared via Wishlist Wizard');
    return buffer.toString().trim();
  }

  /// Get available social platforms
  List<SocialPlatform> getAvailablePlatforms() {
    return [
      SocialPlatform(
        name: 'WhatsApp',
        icon: 'whatsapp',
        color: 0xFF25D366,
        action: () => shareToWhatsApp,
      ),
      SocialPlatform(
        name: 'Instagram',
        icon: 'instagram',
        color: 0xFFE4405F,
        action: () => shareToInstagram,
      ),
      SocialPlatform(
        name: 'TikTok',
        icon: 'tiktok',
        color: 0xFF000000,
        action: () => shareToTikTok,
      ),
      SocialPlatform(
        name: 'Facebook',
        icon: 'facebook',
        color: 0xFF1877F2,
        action: () => shareToFacebook,
      ),
      SocialPlatform(
        name: 'Twitter',
        icon: 'twitter',
        color: 0xFF1DA1F2,
        action: () => shareToTwitter,
      ),
      SocialPlatform(
        name: 'Email',
        icon: 'email',
        color: 0xFFEA4335,
        action: () => shareViaEmail,
      ),
      SocialPlatform(
        name: 'Copy Link',
        icon: 'link',
        color: 0xFF6B46C1,
        action: () => copyShareLink,
      ),
    ];
  }
}

class SocialPlatform {
  final String name;
  final String icon;
  final int color;
  final Function action;

  SocialPlatform({
    required this.name,
    required this.icon,
    required this.color,
    required this.action,
  });
}
