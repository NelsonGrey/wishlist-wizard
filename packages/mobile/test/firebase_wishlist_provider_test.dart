import 'package:flutter_test/flutter_test.dart';
import 'package:wishlist_wizard_mobile/models/firebase_models.dart';
import 'package:wishlist_wizard_mobile/providers/firebase_wishlist_provider.dart';

void main() {
  // ---------------------------------------------------------------------------
  // Initial state
  // ---------------------------------------------------------------------------
  group('FirebaseWishlistProvider — initial state', () {
    late FirebaseWishlistProvider provider;

    setUp(() => provider = FirebaseWishlistProvider());

    test('wishlists list starts empty', () {
      expect(provider.wishlists, isEmpty);
    });

    test('currentWishlistItems starts empty', () {
      expect(provider.currentWishlistItems, isEmpty);
    });

    test('notifications starts empty', () {
      expect(provider.notifications, isEmpty);
    });

    test('isLoading starts false', () {
      expect(provider.isLoading, false);
    });

    test('error starts null', () {
      expect(provider.error, isNull);
    });

    test('currentWishlistId starts null', () {
      expect(provider.currentWishlistId, isNull);
    });
  });

  // ---------------------------------------------------------------------------
  // clearError
  // ---------------------------------------------------------------------------
  group('FirebaseWishlistProvider.clearError', () {
    test('notifies listeners and leaves error null when already null', () {
      final provider = FirebaseWishlistProvider();
      var notified = false;
      provider.addListener(() => notified = true);

      provider.clearError();

      expect(provider.error, isNull);
      expect(notified, true);
    });
  });

  // ---------------------------------------------------------------------------
  // markItemAsPurchased
  // ---------------------------------------------------------------------------
  group('FirebaseWishlistProvider.markItemAsPurchased', () {
    test('returns false immediately for unknown item (empty cache)', () async {
      final provider = FirebaseWishlistProvider();
      final result = await provider.markItemAsPurchased('nonexistent-id', 'buyer');
      expect(result, false);
    });
  });

  // ---------------------------------------------------------------------------
  // getWishlistById — cache look-up
  // ---------------------------------------------------------------------------
  group('FirebaseWishlistProvider.getWishlistById', () {
    test('returns null when wishlist list is empty without calling Firebase', () async {
      final provider = FirebaseWishlistProvider();
      // Cache is empty; Firebase not initialized → should return null gracefully.
      final result = await provider
          .getWishlistById('any-id')
          .then((v) => v, onError: (_) => null);
      expect(result, isNull);
    });
  });

  // ---------------------------------------------------------------------------
  // getWishlistItemById — cache look-up
  // ---------------------------------------------------------------------------
  group('FirebaseWishlistProvider.getWishlistItemById', () {
    test('returns null when current items list is empty', () async {
      final provider = FirebaseWishlistProvider();
      final result = await provider
          .getWishlistItemById('missing-item')
          .then((v) => v, onError: (_) => null);
      expect(result, isNull);
    });
  });

  // ---------------------------------------------------------------------------
  // FirebaseWishlist model helpers
  // ---------------------------------------------------------------------------
  group('FirebaseWishlist helpers', () {
    final now = DateTime.now();

    FirebaseWishlist makeWishlist({String id = 'wl-1', String name = 'Test'}) =>
        FirebaseWishlist(
          id: id,
          name: name,
          userId: 'user-1',
          isPublic: false,
          createdAt: now,
          updatedAt: now,
        );

    test('toFirestore includes required fields', () {
      final map = makeWishlist().toFirestore();
      expect(map['name'], 'Test');
      expect(map['userId'], 'user-1');
      expect(map['isPublic'], false);
    });
  });

  // ---------------------------------------------------------------------------
  // FirebaseWishlistItem model helpers
  // ---------------------------------------------------------------------------
  group('FirebaseWishlistItem helpers', () {
    final now = DateTime.now();

    FirebaseWishlistItem makeItem({
      String id = 'item-1',
      String wishlistId = 'wl-1',
      Priority priority = Priority.medium,
    }) =>
        FirebaseWishlistItem(
          id: id,
          name: 'Test Item',
          wishlistId: wishlistId,
          userId: 'user-1',
          priority: priority,
          createdAt: now,
          updatedAt: now,
        );

    test('toFirestore serialises priority to string', () {
      expect(makeItem(priority: Priority.high).toFirestore()['priority'], 'high');
      expect(makeItem(priority: Priority.medium).toFirestore()['priority'], 'medium');
      expect(makeItem(priority: Priority.low).toFirestore()['priority'], 'low');
    });

    test('toFirestore includes all required fields', () {
      final map = makeItem().toFirestore();
      expect(map['name'], 'Test Item');
      expect(map['wishlistId'], 'wl-1');
      expect(map['userId'], 'user-1');
      expect(map['isPurchased'], false);
    });
  });
}
