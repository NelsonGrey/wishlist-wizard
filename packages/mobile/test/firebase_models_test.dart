import 'package:flutter_test/flutter_test.dart';
import 'package:wishlist_wizard_mobile/models/firebase_models.dart';

void main() {
  // ---------------------------------------------------------------------------
  // FirebaseWishlist
  // ---------------------------------------------------------------------------
  group('FirebaseWishlist.fromFirestore', () {
    test('parses minimal valid document', () {
      final data = {
        'name': 'My Wishlist',
        'userId': 'user-1',
        'isPublic': false,
        'createdAt': '2024-01-15T10:00:00.000Z',
        'updatedAt': '2024-01-15T10:00:00.000Z',
      };
      final w = FirebaseWishlist.fromFirestore('wl-1', data);

      expect(w.id, 'wl-1');
      expect(w.name, 'My Wishlist');
      expect(w.userId, 'user-1');
      expect(w.isPublic, false);
      expect(w.description, isNull);
      expect(w.tags, isEmpty);
    });

    test('parses all optional fields', () {
      final data = {
        'name': 'Birthday List',
        'userId': 'user-2',
        'isPublic': true,
        'description': 'Gifts I want for my birthday',
        'tags': ['gifts', 'birthday'],
        'createdAt': '2024-06-01T00:00:00.000Z',
        'updatedAt': '2024-06-15T12:30:00.000Z',
      };
      final w = FirebaseWishlist.fromFirestore('wl-2', data);

      expect(w.description, 'Gifts I want for my birthday');
      expect(w.isPublic, true);
      expect(w.tags, containsAll(['gifts', 'birthday']));
    });

    test('falls back to now when createdAt is null', () {
      final before = DateTime.now().subtract(const Duration(seconds: 1));
      final data = {
        'name': 'List',
        'userId': 'u',
        'isPublic': false,
        'createdAt': null,
        'updatedAt': null,
      };
      final w = FirebaseWishlist.fromFirestore('wl-3', data);
      expect(w.createdAt.isAfter(before), true);
    });

    test('uses empty defaults for entirely missing fields', () {
      final data = {
        'createdAt': '2024-01-01T00:00:00.000Z',
        'updatedAt': '2024-01-01T00:00:00.000Z',
      };
      final w = FirebaseWishlist.fromFirestore('wl-4', data);

      expect(w.name, '');
      expect(w.userId, '');
      expect(w.isPublic, false);
      expect(w.tags, isEmpty);
    });

    test('parses ISO-8601 timestamps correctly', () {
      final data = {
        'name': 'List',
        'userId': 'u',
        'isPublic': false,
        'createdAt': '2024-03-10T08:00:00.000Z',
        'updatedAt': '2024-03-10T09:00:00.000Z',
      };
      final w = FirebaseWishlist.fromFirestore('wl-5', data);

      expect(w.createdAt, DateTime.parse('2024-03-10T08:00:00.000Z'));
      expect(w.updatedAt, DateTime.parse('2024-03-10T09:00:00.000Z'));
    });
  });

  // ---------------------------------------------------------------------------
  // FirebaseWishlistItem
  // ---------------------------------------------------------------------------
  group('FirebaseWishlistItem.fromFirestore', () {
    Map<String, dynamic> base() => {
          'name': 'Headphones',
          'wishlistId': 'wl-1',
          'userId': 'user-1',
          'currency': 'USD',
          'isPurchased': false,
          'tags': <String>[],
          'priority': 'medium',
          'createdAt': '2024-02-01T00:00:00.000Z',
          'updatedAt': '2024-02-01T00:00:00.000Z',
        };

    test('parses standard item fields', () {
      final data = {
        ...base(),
        'price': 299.99,
        'url': 'https://amazon.com/dp/B123',
        'imageUrl': 'https://cdn.example.com/img.jpg',
        'description': 'Noise cancelling headphones',
      };
      final item = FirebaseWishlistItem.fromFirestore('item-1', data);

      expect(item.id, 'item-1');
      expect(item.name, 'Headphones');
      expect(item.price, 299.99);
      expect(item.url, 'https://amazon.com/dp/B123');
      expect(item.imageUrl, 'https://cdn.example.com/img.jpg');
      expect(item.description, 'Noise cancelling headphones');
      expect(item.priority, Priority.medium);
      expect(item.isPurchased, false);
    });

    // Cross-platform field aliases written by Cloud Functions ------------------

    test('"title" is accepted as alias for "name" (Functions field)', () {
      final data = {...base(), 'name': null, 'title': 'Wireless Speaker'};
      final item = FirebaseWishlistItem.fromFirestore('item-2', data);
      expect(item.name, 'Wireless Speaker');
    });

    test('"productUrl" is accepted as alias for "url" (Functions field)', () {
      final data = {
        ...base(),
        'url': null,
        'productUrl': 'https://store.com/product/speaker',
      };
      final item = FirebaseWishlistItem.fromFirestore('item-3', data);
      expect(item.url, 'https://store.com/product/speaker');
    });

    test('"addedBy" is accepted as alias for "userId" (Functions field)', () {
      final data = {...base(), 'userId': null, 'addedBy': 'user-from-function'};
      final item = FirebaseWishlistItem.fromFirestore('item-4', data);
      expect(item.userId, 'user-from-function');
    });

    test('"purchasedByUserId" marks item as purchased (Functions field)', () {
      final data = {
        ...base(),
        'isPurchased': false,
        'purchasedByUserId': 'buyer-uid',
      };
      final item = FirebaseWishlistItem.fromFirestore('item-5', data);
      expect(item.isPurchased, true);
      expect(item.purchasedBy, 'buyer-uid');
    });

    // Price coercion -----------------------------------------------------------

    test('coerces int price to double', () {
      final data = {...base(), 'price': 50};
      final item = FirebaseWishlistItem.fromFirestore('item-6', data);
      expect(item.price, 50.0);
      expect(item.price, isA<double>());
    });

    test('handles null price', () {
      final item = FirebaseWishlistItem.fromFirestore('item-7', base());
      expect(item.price, isNull);
    });

    // Priority mapping ---------------------------------------------------------

    test('maps all priority string values correctly', () {
      for (final entry in {
        'high': Priority.high,
        'medium': Priority.medium,
        'low': Priority.low,
        'UNKNOWN': Priority.medium, // unknown → default medium
        null: Priority.medium,      // missing → default medium
      }.entries) {
        final data = {...base(), 'priority': entry.key};
        final item = FirebaseWishlistItem.fromFirestore('x', data);
        expect(item.priority, entry.value,
            reason: 'priority="${entry.key}" should map to ${entry.value}');
      }
    });

    // Date parsing ------------------------------------------------------------

    test('parses ISO-8601 createdAt and updatedAt', () {
      final data = {
        ...base(),
        'createdAt': '2024-03-10T08:30:00.000Z',
        'updatedAt': '2024-03-10T09:00:00.000Z',
      };
      final item = FirebaseWishlistItem.fromFirestore('item-8', data);
      expect(item.createdAt, DateTime.parse('2024-03-10T08:30:00.000Z'));
      expect(item.updatedAt, DateTime.parse('2024-03-10T09:00:00.000Z'));
    });

    test('parses nullable purchasedAt ISO-8601 string', () {
      final data = {
        ...base(),
        'isPurchased': true,
        'purchasedBy': 'buyer',
        'purchasedAt': '2024-04-01T12:00:00.000Z',
      };
      final item = FirebaseWishlistItem.fromFirestore('item-9', data);
      expect(item.purchasedAt, DateTime.parse('2024-04-01T12:00:00.000Z'));
    });

    test('purchasedAt is null when field is absent', () {
      final item = FirebaseWishlistItem.fromFirestore('item-10', base());
      expect(item.purchasedAt, isNull);
    });

    // Tags --------------------------------------------------------------------

    test('parses tags list', () {
      final data = {...base(), 'tags': ['tech', 'audio']};
      final item = FirebaseWishlistItem.fromFirestore('item-11', data);
      expect(item.tags, containsAll(['tech', 'audio']));
    });

    test('tags defaults to empty list when absent', () {
      final data = {
        ...base()..remove('tags'),
        'createdAt': '2024-01-01T00:00:00.000Z',
        'updatedAt': '2024-01-01T00:00:00.000Z',
      };
      final item = FirebaseWishlistItem.fromFirestore('item-12', data);
      expect(item.tags, isEmpty);
    });
  });

  // ---------------------------------------------------------------------------
  // FirebaseNotification
  // ---------------------------------------------------------------------------
  group('FirebaseNotification.fromFirestore', () {
    Map<String, dynamic> base() => {
          'userId': 'user-1',
          'title': 'Price drop!',
          'message': 'Your item is cheaper',
          'type': 'priceDrop',
          'isRead': false,
          'createdAt': '2024-05-01T00:00:00.000Z',
        };

    test('parses all notification type strings', () {
      for (final entry in {
        'priceDrop': NotificationType.priceDrop,
        'backInStock': NotificationType.backInStock,
        'wishlistShared': NotificationType.wishlistShared,
        'itemPurchased': NotificationType.itemPurchased,
        'system': NotificationType.system,
        null: NotificationType.system,      // null → system
        'badValue': NotificationType.system, // unknown → system
      }.entries) {
        final data = {...base(), 'type': entry.key};
        final n = FirebaseNotification.fromFirestore('n', data);
        expect(n.type, entry.value,
            reason: 'type="${entry.key}" should map to ${entry.value}');
      }
    });

    test('"body" is accepted as alias for "message" (Functions field)', () {
      final data = {...base(), 'message': null, 'body': 'Body from Functions'};
      final n = FirebaseNotification.fromFirestore('n2', data);
      expect(n.message, 'Body from Functions');
    });

    // The real one: every createNotification() call site across the whole
    // backend (wishlists.ts, collaboration.ts, connections.ts,
    // triggers/collaboration.ts) writes `content`, never `message` or
    // `body` -- web's Notifications.tsx reads it directly. Without this
    // alias, every notification's body text rendered as an empty string
    // on mobile (found via a real integration test asserting the text a
    // user would actually see, not a synthetic fixture like `base()`'s
    // own `message` key above).
    test('"content" is accepted as alias for "message" (the field Functions actually writes)', () {
      final data = {...base(), 'message': null, 'content': 'Content from Functions'};
      final n = FirebaseNotification.fromFirestore('n2b', data);
      expect(n.message, 'Content from Functions');
    });

    test('"read" is accepted as alias for "isRead" (Functions field)', () {
      final data = {...base(), 'isRead': null, 'read': true};
      final n = FirebaseNotification.fromFirestore('n3', data);
      expect(n.isRead, true);
    });

    test('metadata is parsed as Map<String, dynamic>', () {
      final data = {
        ...base(),
        'metadata': {'key': 'value', 'count': 42},
      };
      final n = FirebaseNotification.fromFirestore('n4', data);
      expect(n.metadata['key'], 'value');
      expect(n.metadata['count'], 42);
    });

    test('"data" field is used as metadata when "metadata" absent (Functions field)', () {
      final data = {
        ...base(),
        'data': {'wishlistId': 'wl-99'},
      };
      final n = FirebaseNotification.fromFirestore('n5', data);
      expect(n.metadata['wishlistId'], 'wl-99');
    });

    test('metadata defaults to empty map when absent', () {
      final n = FirebaseNotification.fromFirestore('n6', base());
      expect(n.metadata, isEmpty);
    });

    test('parses nullable readAt ISO-8601 string', () {
      final data = {
        ...base(),
        'isRead': true,
        'readAt': '2024-05-01T01:00:00.000Z',
      };
      final n = FirebaseNotification.fromFirestore('n7', data);
      expect(n.readAt, DateTime.parse('2024-05-01T01:00:00.000Z'));
    });

    test('readAt is null when field is absent', () {
      final n = FirebaseNotification.fromFirestore('n8', base());
      expect(n.readAt, isNull);
    });

    test('parses basic fields correctly', () {
      final n = FirebaseNotification.fromFirestore('n9', base());
      expect(n.id, 'n9');
      expect(n.userId, 'user-1');
      expect(n.title, 'Price drop!');
      expect(n.message, 'Your item is cheaper');
      expect(n.isRead, false);
    });
  });
}
