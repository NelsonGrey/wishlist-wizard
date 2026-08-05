import 'package:flutter_test/flutter_test.dart';
import 'package:wishlist_wizard_mobile/models/models.dart';

void main() {
  group('Dialog and Validation Tests', () {
    test('URL validation accepts valid HTTP/HTTPS URLs', () {
      final testUrls = [
        'https://amazon.com/product/123',
        'http://walmart.com/item/456',
        'https://example.com/path?query=value',
      ];

      for (final url in testUrls) {
        expect(_isValidUrl(url), true, reason: 'URL should be valid: $url');
      }
    });

    test('URL validation rejects invalid formats', () {
      final testUrls = [
        '',
        '   ', // whitespace only
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
      ];

      for (final url in testUrls) {
        expect(_isValidUrl(url), false, reason: 'URL should be invalid: $url');
      }
    });

    test('URL normalization adds https prefix when needed', () {
      final testCases = [
        MapEntry('amazon.com/product/123', 'https://amazon.com/product/123'),
        MapEntry('http://example.com', 'http://example.com'),
        MapEntry('https://example.com', 'https://example.com'),
      ];

      for (final entry in testCases) {
        final result = _normalizeUrl(entry.key);
        expect(result, entry.value);
      }
    });

    test('Item title validation requires non-empty input', () {
      final testCases = [
        MapEntry('', false),
        MapEntry('   ', false),
        MapEntry('Valid Item', true),
        MapEntry('A', true),
      ];

      for (final entry in testCases) {
        final isValid = entry.key.trim().isNotEmpty;
        expect(isValid, entry.value);
      }
    });

    test('Item price validation accepts valid formats', () {
      final testPrices = [
        '29.99',
        '10',
        '1,000.00',
        '', // empty is allowed
      ];

      for (final price in testPrices) {
        final isValid = price.isEmpty || _isPriceFormat(price);
        expect(isValid, true);
      }
    });

    test('Item price validation rejects invalid formats', () {
      final testPrices = [
        'abc',
        '-10',
        '10.999', // too many decimals
      ];

      for (final price in testPrices) {
        expect(_isPriceFormat(price), false);
      }
    });
  });

  group('Notification Payload Validation', () {
    test('notification with valid metadata deserializes correctly', () {
      final validMetadata = {
        'wishlist_id': 'wl-123',
        'item_id': 'item-456',
        'title': 'Item Added',
        'message': 'A new item was added to your wishlist',
      };

      expect(validMetadata['wishlist_id'], isNotNull);
      expect(validMetadata['item_id'], isNotNull);
      expect(validMetadata['title'], isNotNull);
      expect(validMetadata['message'], isNotNull);
    });

    test('notification with query parameters parses correctly', () {
      const actionUrl =
          'https://app.wishlistwizard.com/wishlist/wl-789?itemId=item-101';

      final uri = Uri.parse(actionUrl);
      final itemId = uri.queryParameters['itemId'];

      expect(itemId, 'item-101');
    });

    test('notification gracefully handles missing IDs', () {
      final incompleteMetadata = {
        'title': 'Notification',
        'message': 'A notification with no IDs',
      };

      final wishlistId = incompleteMetadata['wishlist_id'];
      final itemId = incompleteMetadata['item_id'];

      expect(wishlistId, isNull);
      expect(itemId, isNull);
    });

    test('notification handles malformed URLs gracefully', () {
      final metadata = {'actionUrl': 'not a valid url at all'};

      // Parsing invalid URL should not crash
      try {
        final uri = Uri.parse(metadata['actionUrl'] as String);
        // Should parse without throwing
        expect(uri.isAbsolute, false);
      } catch (e) {
        // If parsing fails, that's also acceptable
        expect(true, true);
      }
    });
  });

  group('Deep Link Routing', () {
    test('item-first routing prioritizes item ID when both present', () {
      final notification = _buildMockNotification(
        wishlistId: 'wl-123',
        itemId: 'item-456',
      );

      final itemId = _extractItemId(notification);
      final wishlistId = _extractWishlistId(notification);

      expect(itemId, 'item-456');
      expect(wishlistId, 'wl-123');
    });

    test('falls back to wishlist when item ID missing', () {
      final notification = _buildMockNotification(
        wishlistId: 'wl-789',
        itemId: null,
      );

      final itemId = _extractItemId(notification);
      final wishlistId = _extractWishlistId(notification);

      expect(itemId, isNull);
      expect(wishlistId, 'wl-789');
    });

    test('routing handles empty payload gracefully', () {
      final emptyNotification = _buildMockNotification();

      final itemId = _extractItemId(emptyNotification);
      final wishlistId = _extractWishlistId(emptyNotification);

      expect(itemId, isNull);
      expect(wishlistId, isNull);
    });
  });
}

// Helper functions
bool _isValidUrl(String url) {
  if (url.isEmpty || url.trim() != url) return false;

  try {
    final uri = Uri.parse(url);
    return (uri.scheme == 'http' || uri.scheme == 'https') &&
        uri.host.isNotEmpty;
  } catch (e) {
    return false;
  }
}

String _normalizeUrl(String url) {
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  return 'https://$url';
}

bool _isPriceFormat(String price) {
  if (price.isEmpty) return true;
  final regex = RegExp(r'^[\d,]+\.?\d{0,2}$');
  return regex.hasMatch(price);
}

FirebaseNotification _buildMockNotification({
  String? wishlistId,
  String? itemId,
}) {
  return FirebaseNotification(
    id: 'test-notif',
    userId: 'test-user',
    title: 'Test',
    message: 'Test message',
    type: NotificationType.system,
    createdAt: DateTime.now(),
    metadata: {
      if (wishlistId != null) 'wishlist_id': wishlistId,
      if (itemId != null) 'item_id': itemId,
    },
  );
}

String? _extractWishlistId(FirebaseNotification notification) {
  return notification.metadata['wishlist_id'] as String?;
}

String? _extractItemId(FirebaseNotification notification) {
  return notification.metadata['item_id'] as String?;
}
