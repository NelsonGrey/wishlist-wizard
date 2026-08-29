import 'package:flutter_test/flutter_test.dart';
import 'package:share_plus_platform_interface/share_plus_platform_interface.dart';
import 'package:url_launcher_platform_interface/link.dart';
import 'package:url_launcher_platform_interface/url_launcher_platform_interface.dart';
import 'package:wishlist_wizard_mobile/services/social_share_service.dart';

class _FakeSharePlatform extends SharePlatform {
  ShareParams? lastParams;

  @override
  Future<ShareResult> share(ShareParams params) async {
    lastParams = params;
    return ShareResult('', ShareResultStatus.success);
  }
}

class _FakeUrlLauncher extends UrlLauncherPlatform {
  final List<String> launchedUrls = [];
  // Per-scheme override so Instagram/TikTok's "app installed?" branching is
  // testable both ways (e.g. 'instagram' -> false forces the web fallback).
  bool Function(String url)? canLaunchOverride;

  @override
  LinkDelegate? get linkDelegate => null;

  @override
  Future<bool> canLaunch(String url) async => canLaunchOverride?.call(url) ?? true;

  @override
  Future<bool> launch(
    String url, {
    required bool useSafariVC,
    required bool useWebView,
    required bool enableJavaScript,
    required bool enableDomStorage,
    required bool universalLinksOnly,
    required Map<String, String> headers,
    String? webOnlyWindowName,
  }) async {
    launchedUrls.add(url);
    return true;
  }

  @override
  Future<bool> launchUrl(String url, LaunchOptions options) async {
    launchedUrls.add(url);
    return true;
  }
}

void main() {
  final service = SocialShareService();
  late _FakeSharePlatform fakeShare;
  late _FakeUrlLauncher fakeLauncher;

  // Share.share() (which the source under test calls) always resolves
  // through the package-level `SharePlus.instance` singleton, which is a
  // `static final` that captures whatever `SharePlatform.instance` is at
  // its OWN first access and then never re-reads it. Reassigning
  // SharePlatform.instance to a fresh fake in each test's setUp() is a
  // no-op after the first test -- Share.share keeps routing to the first
  // fake. So one fake instance is installed once, up front, and reset
  // (not replaced) between tests instead.
  fakeShare = _FakeSharePlatform();
  SharePlatform.instance = fakeShare;

  setUp(() {
    fakeShare.lastParams = null;
    fakeLauncher = _FakeUrlLauncher();
    UrlLauncherPlatform.instance = fakeLauncher;
  });

  group('SocialShareService — singleton', () {
    test('returns the same instance every time', () {
      expect(identical(SocialShareService(), SocialShareService()), isTrue);
    });
  });

  group('SocialShareService.shareWishlist', () {
    test('builds a message with the wishlist name, link, and a fixed subject', () async {
      await service.shareWishlist(
        wishlistName: 'Birthday List',
        shareLink: 'https://wishlist-wizard.com/s/abc123',
      );

      expect(fakeShare.lastParams!.text, contains('Birthday List'));
      expect(fakeShare.lastParams!.text, contains('https://wishlist-wizard.com/s/abc123'));
      expect(fakeShare.lastParams!.text, contains('Shared via Wishlist Wizard'));
      expect(fakeShare.lastParams!.subject, 'Check out my wishlist on Wishlist Wizard');
    });

    test('includes the description when provided', () async {
      await service.shareWishlist(
        wishlistName: 'Birthday List',
        shareLink: 'https://example.com/s/abc',
        description: 'For my big day!',
      );

      expect(fakeShare.lastParams!.text, contains('For my big day!'));
    });

    test('omits a blank description', () async {
      await service.shareWishlist(
        wishlistName: 'Birthday List',
        shareLink: 'https://example.com/s/abc',
        description: '',
      );

      // Message is: emoji line, [description line if any], link, footer --
      // with an empty description the line count drops by one.
      final lineCount = fakeShare.lastParams!.text!.split('\n').length;
      await service.shareWishlist(
        wishlistName: 'Birthday List',
        shareLink: 'https://example.com/s/abc',
        description: 'Non-empty',
      );
      final lineCountWithDescription = fakeShare.lastParams!.text!.split('\n').length;
      expect(lineCountWithDescription, greaterThan(lineCount));
    });
  });

  group('SocialShareService.shareToWhatsApp', () {
    test('launches a wa.me link with the URL-encoded message when WhatsApp is available', () async {
      await service.shareToWhatsApp(wishlistName: 'Birthday List', shareLink: 'https://example.com/s/abc');

      expect(fakeLauncher.launchedUrls, hasLength(1));
      expect(fakeLauncher.launchedUrls.single, startsWith('https://wa.me/?text='));
      expect(fakeLauncher.launchedUrls.single, contains('Birthday%20List'));
    });

    test('throws when WhatsApp is not installed', () async {
      fakeLauncher.canLaunchOverride = (_) => false;

      expect(
        () => service.shareToWhatsApp(wishlistName: 'Birthday List', shareLink: 'https://example.com/s/abc'),
        throwsA(isA<Exception>()),
      );
    });
  });

  group('SocialShareService.shareToInstagram', () {
    test('opens the Instagram app and shares the link when installed', () async {
      await service.shareToInstagram(shareLink: 'https://example.com/s/abc');

      expect(fakeLauncher.launchedUrls, contains('instagram://story'));
      expect(fakeShare.lastParams!.text, 'https://example.com/s/abc');
    });

    test('falls back to the Instagram website when the app is not installed', () async {
      fakeLauncher.canLaunchOverride = (url) => !url.startsWith('instagram://');

      await service.shareToInstagram(shareLink: 'https://example.com/s/abc');

      expect(fakeLauncher.launchedUrls, contains('https://www.instagram.com/'));
      expect(fakeLauncher.launchedUrls, isNot(contains('instagram://story')));
    });
  });

  group('SocialShareService.shareToTikTok', () {
    test('opens the TikTok app with the encoded link when installed', () async {
      await service.shareToTikTok(shareLink: 'https://example.com/s/abc');

      expect(fakeLauncher.launchedUrls.single, startsWith('tiktok://share?link='));
    });

    test('falls back to the TikTok website when the app is not installed', () async {
      fakeLauncher.canLaunchOverride = (url) => !url.startsWith('tiktok://');

      await service.shareToTikTok(shareLink: 'https://example.com/s/abc');

      expect(fakeLauncher.launchedUrls, contains('https://www.tiktok.com/'));
    });
  });

  group('SocialShareService.shareToFacebook', () {
    test('builds a sharer URL without a quote param when none is given', () async {
      await service.shareToFacebook(shareLink: 'https://example.com/s/abc');

      expect(fakeLauncher.launchedUrls.single, isNot(contains('&quote=')));
      expect(fakeLauncher.launchedUrls.single, contains('facebook.com/sharer/sharer.php'));
    });

    test('appends an encoded quote when provided', () async {
      await service.shareToFacebook(shareLink: 'https://example.com/s/abc', quote: 'Check this out!');

      expect(fakeLauncher.launchedUrls.single, contains('&quote=Check%20this%20out!'));
    });
  });

  group('SocialShareService.shareToTwitter', () {
    test('builds an intent URL with the wishlist name, link, and hashtag', () async {
      await service.shareToTwitter(wishlistName: 'Birthday List', shareLink: 'https://example.com/s/abc');

      final url = fakeLauncher.launchedUrls.single;
      expect(url, startsWith('https://twitter.com/intent/tweet?text='));
      expect(Uri.decodeComponent(url.split('text=').last), contains('#WishlistWizard'));
    });
  });

  group('SocialShareService.shareViaEmail', () {
    test('builds a mailto: URL with subject, body, and joined recipients', () async {
      await service.shareViaEmail(
        wishlistName: 'Birthday List',
        shareLink: 'https://example.com/s/abc',
        recipients: ['a@example.com', 'b@example.com'],
      );

      final url = fakeLauncher.launchedUrls.single;
      expect(url, startsWith('mailto:a@example.com,b@example.com?'));
      expect(url, contains('subject=Check%20out%20my%20wishlist%3A%20Birthday%20List'));
    });

    test('defaults to no recipients when none are given', () async {
      await service.shareViaEmail(wishlistName: 'Birthday List', shareLink: 'https://example.com/s/abc');

      expect(fakeLauncher.launchedUrls.single, startsWith('mailto:?'));
    });
  });

  group('SocialShareService.copyShareLink', () {
    test('shares just the link with no subject', () async {
      await service.copyShareLink(shareLink: 'https://example.com/s/abc');

      expect(fakeShare.lastParams!.text, 'https://example.com/s/abc');
      expect(fakeShare.lastParams!.subject, isNull);
    });
  });

  group('SocialShareService.getAvailablePlatforms', () {
    test('lists all seven platforms with names and brand colors', () {
      final platforms = service.getAvailablePlatforms();

      expect(platforms.map((p) => p.name), [
        'WhatsApp',
        'Instagram',
        'TikTok',
        'Facebook',
        'Twitter',
        'Email',
        'Copy Link',
      ]);
      expect(platforms.first.color, 0xFF25D366);
    });
  });
}
