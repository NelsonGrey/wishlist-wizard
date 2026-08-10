import 'package:flutter_test/flutter_test.dart';
import 'package:mocktail/mocktail.dart';
import 'package:wishlist_wizard_mobile/models/firebase_models.dart';
import 'package:wishlist_wizard_mobile/providers/firebase_wishlist_provider.dart';
import 'package:wishlist_wizard_mobile/services/services.dart';

class MockFirebaseFunctionsService extends Mock
    implements FirebaseFunctionsService {}

void main() {
  setUpAll(() {
    // Required by mocktail whenever any()/captureAny() is used for a
    // parameter type that isn't a primitive — this instance is only ever
    // passed around, never interacted with.
    registerFallbackValue(
      FirebaseWishlistItem(
        id: 'fallback',
        name: 'fallback',
        wishlistId: 'fallback',
        userId: 'fallback',
        priority: Priority.medium,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      ),
    );
  });

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
  // markItemAsPurchased — routed through purchaseWishlistItem (the
  // dedicated endpoint, not a generic update) so the backend's collaborator
  // role checks apply; the backend, not local cache, is authoritative.
  // ---------------------------------------------------------------------------
  group('FirebaseWishlistProvider.markItemAsPurchased', () {
    test(
      'returns true and updates the item when the Cloud Function succeeds',
      () async {
        final functionsService = MockFirebaseFunctionsService();
        final provider = FirebaseWishlistProvider(
          functionsService: functionsService,
        );

        when(() => functionsService.purchaseWishlistItem(any())).thenAnswer(
          (_) async => {
            'id': 'item-1',
            'name': 'Trail Backpack',
            'wishlistId': 'wl-1',
            'userId': 'user-1',
            'isPurchased': true,
            'purchasedBy': 'buyer',
          },
        );

        final result = await provider.markItemAsPurchased('item-1', 'buyer');

        expect(result, true);
        expect(provider.error, isNull);
      },
    );

    test(
      'returns false and sets error when the Cloud Function throws (e.g. unknown item)',
      () async {
        final functionsService = MockFirebaseFunctionsService();
        final provider = FirebaseWishlistProvider(
          functionsService: functionsService,
        );

        when(
          () => functionsService.purchaseWishlistItem(any()),
        ).thenThrow(Exception('not-found'));

        final result = await provider.markItemAsPurchased(
          'nonexistent-id',
          'buyer',
        );

        expect(result, false);
        expect(provider.error, contains('Failed to mark item as purchased'));
      },
    );
  });

  // ---------------------------------------------------------------------------
  // getWishlistById — cache look-up
  // ---------------------------------------------------------------------------
  group('FirebaseWishlistProvider.getWishlistById', () {
    test(
      'returns null when wishlist list is empty without calling Firebase',
      () async {
        final provider = FirebaseWishlistProvider();
        // Cache is empty; Firebase not initialized → should return null gracefully.
        final result = await provider
            .getWishlistById('any-id')
            .then((v) => v, onError: (_) => null);
        expect(result, isNull);
      },
    );
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
    }) => FirebaseWishlistItem(
      id: id,
      name: 'Test Item',
      wishlistId: wishlistId,
      userId: 'user-1',
      priority: priority,
      createdAt: now,
      updatedAt: now,
    );

    test('toFirestore serialises priority to string', () {
      expect(
        makeItem(priority: Priority.high).toFirestore()['priority'],
        'high',
      );
      expect(
        makeItem(priority: Priority.medium).toFirestore()['priority'],
        'medium',
      );
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

  // ---------------------------------------------------------------------------
  // createWishlist — this is the exact regression case for the 2026-07-18 bug:
  // FirebaseWishlist.fromFirestore('', result) always produced an empty id
  // (fromFirestore's docId argument wins over any 'id' key inside the map),
  // so createWishlist() always reported failure even when the Cloud Function
  // genuinely created the wishlist and returned its real id.
  // ---------------------------------------------------------------------------
  group('FirebaseWishlistProvider.createWishlist', () {
    late MockFirebaseFunctionsService functionsService;
    late FirebaseWishlistProvider provider;

    setUp(() {
      functionsService = MockFirebaseFunctionsService();
      provider = FirebaseWishlistProvider(functionsService: functionsService);
    });

    test(
      'returns true and adds the wishlist when the Cloud Function returns a real id',
      () async {
        // Mirrors createWishlist's actual response shape:
        // Object.assign({ id: docRef.id }, wishlistData) — packages/functions/src/api/wishlists.ts
        when(() => functionsService.createWishlist(any())).thenAnswer(
          (_) async => {
            'id': 'wl-real-id-123',
            'name': 'Birthday List',
            'userId': 'user-1',
            'isPublic': false,
            'tags': <String>[],
            'createdAt': DateTime.now().toIso8601String(),
            'updatedAt': DateTime.now().toIso8601String(),
          },
        );

        final result = await provider.createWishlist(
          name: 'Birthday List',
          userId: 'user-1',
        );

        expect(result, true);
        expect(provider.error, isNull);
        expect(provider.wishlists, hasLength(1));
        expect(provider.wishlists.first.id, 'wl-real-id-123');
        expect(provider.wishlists.first.name, 'Birthday List');
      },
    );

    test(
      'regression guard: does not silently ignore a real id by passing an empty docId',
      () async {
        // If this call site ever regresses back to
        // FirebaseWishlist.fromFirestore('', result), createdWishlist.id would
        // be '' regardless of what the mock returns, and this test would fail.
        when(() => functionsService.createWishlist(any())).thenAnswer(
          (_) async => {
            'id': 'wl-should-be-used',
            'name': 'Test',
            'userId': 'user-1',
            'isPublic': false,
          },
        );

        await provider.createWishlist(name: 'Test', userId: 'user-1');

        expect(provider.wishlists.single.id, isNot(isEmpty));
        expect(provider.wishlists.single.id, 'wl-should-be-used');
      },
    );

    test(
      'returns false and sets error when the Cloud Function throws',
      () async {
        when(
          () => functionsService.createWishlist(any()),
        ).thenThrow(Exception('network error'));

        final result = await provider.createWishlist(
          name: 'Test',
          userId: 'user-1',
        );

        expect(result, false);
        expect(provider.error, contains('Failed to create wishlist'));
        expect(provider.wishlists, isEmpty);
      },
    );
  });

  // ---------------------------------------------------------------------------
  // updateWishlist
  // ---------------------------------------------------------------------------
  group('FirebaseWishlistProvider.updateWishlist', () {
    test(
      'returns true when the Cloud Function returns the updated fields',
      () async {
        final functionsService = MockFirebaseFunctionsService();
        final provider = FirebaseWishlistProvider(
          functionsService: functionsService,
        );
        final wishlist = FirebaseWishlist(
          id: 'wl-1',
          name: 'Updated Name',
          userId: 'user-1',
          isPublic: true,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );

        when(() => functionsService.updateWishlist(any(), any())).thenAnswer(
          (_) async => {
            'id': 'wl-1',
            'name': 'Updated Name',
            'userId': 'user-1',
            'isPublic': true,
          },
        );

        final result = await provider.updateWishlist(wishlist);

        expect(result, true);
        expect(provider.error, isNull);
      },
    );

    test(
      'returns false and sets error when the Cloud Function throws',
      () async {
        final functionsService = MockFirebaseFunctionsService();
        final provider = FirebaseWishlistProvider(
          functionsService: functionsService,
        );
        final wishlist = FirebaseWishlist(
          id: 'wl-1',
          name: 'Test',
          userId: 'user-1',
          isPublic: false,
          createdAt: DateTime.now(),
          updatedAt: DateTime.now(),
        );

        when(
          () => functionsService.updateWishlist(any(), any()),
        ).thenThrow(Exception('boom'));

        final result = await provider.updateWishlist(wishlist);

        expect(result, false);
        expect(provider.error, contains('Failed to update wishlist'));
      },
    );
  });

  // ---------------------------------------------------------------------------
  // addWishlistItem — routed through FirebaseFunctionsService (the api HTTP
  // router), not a direct Firestore write, so the backend's collaborator
  // role checks (owner/editor/commenter/viewer) actually apply on mobile.
  // See the "Shared with Me" feature notes on FirebaseWishlistProvider.
  // ---------------------------------------------------------------------------
  group('FirebaseWishlistProvider.addWishlistItem', () {
    test(
      'returns true when the Cloud Function returns a created item with a real id',
      () async {
        final functionsService = MockFirebaseFunctionsService();
        final provider = FirebaseWishlistProvider(
          functionsService: functionsService,
        );

        when(() => functionsService.addWishlistItem(any())).thenAnswer(
          (_) async => {
            'id': 'item-real-id',
            'title': 'Trail Backpack',
            'wishlistId': 'wl-1',
            'userId': 'user-1',
          },
        );

        final result = await provider.addWishlistItem(
          name: 'Trail Backpack',
          wishlistId: 'wl-1',
          userId: 'user-1',
        );

        expect(result, true);
        expect(provider.error, isNull);
      },
    );

    test(
      'returns false and sets error when the Cloud Function throws',
      () async {
        final functionsService = MockFirebaseFunctionsService();
        final provider = FirebaseWishlistProvider(
          functionsService: functionsService,
        );

        when(
          () => functionsService.addWishlistItem(any()),
        ).thenThrow(Exception('network error'));

        final result = await provider.addWishlistItem(
          name: 'Trail Backpack',
          wishlistId: 'wl-1',
          userId: 'user-1',
        );

        expect(result, false);
        expect(provider.error, contains('Failed to add item'));
      },
    );
  });
}
