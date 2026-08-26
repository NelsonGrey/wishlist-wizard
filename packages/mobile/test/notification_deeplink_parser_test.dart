import 'package:flutter_test/flutter_test.dart';
import 'package:wishlist_wizard_mobile/models/models.dart';
import 'package:wishlist_wizard_mobile/screens/notifications_screen.dart';

FirebaseNotification _buildNotification({Map<String, dynamic>? metadata}) {
  return FirebaseNotification(
    id: 'n1',
    userId: 'u1',
    title: 'Test',
    message: 'Test message',
    type: NotificationType.system,
    createdAt: DateTime(2026, 1, 1),
    metadata: metadata ?? const {},
  );
}

void main() {
  group('NotificationDeepLinkParser', () {
    test('extracts IDs from direct metadata keys', () {
      final notification = _buildNotification(
        metadata: {'wishlist_id': 'wishlist-123', 'item_id': 'item-456'},
      );

      expect(
        NotificationDeepLinkParser.extractWishlistId(notification),
        equals('wishlist-123'),
      );
      expect(
        NotificationDeepLinkParser.extractItemId(notification),
        equals('item-456'),
      );
    });

    test('extracts IDs from action URL query parameters', () {
      final notification = _buildNotification(
        metadata: {
          'actionUrl':
              'https://wishlistwizard.app/open?wishlistId=wishlist-q&itemId=item-q',
        },
      );

      expect(
        NotificationDeepLinkParser.extractWishlistId(notification),
        equals('wishlist-q'),
      );
      expect(
        NotificationDeepLinkParser.extractItemId(notification),
        equals('item-q'),
      );
    });

    test('extracts IDs from action URL path segments as fallback', () {
      final notification = _buildNotification(
        metadata: {
          'deep_link':
              'wishlistwizard://wishlists/wishlist-path/items/item-path/details',
        },
      );

      expect(
        NotificationDeepLinkParser.extractWishlistId(notification),
        equals('wishlist-path'),
      );
      expect(
        NotificationDeepLinkParser.extractItemId(notification),
        equals('item-path'),
      );
    });

    test('returns null when IDs are absent', () {
      final notification = _buildNotification(
        metadata: {'action_url': 'https://wishlistwizard.app/no-ids'},
      );

      expect(
        NotificationDeepLinkParser.extractWishlistId(notification),
        isNull,
      );
      expect(NotificationDeepLinkParser.extractItemId(notification), isNull);
    });
  });
}
