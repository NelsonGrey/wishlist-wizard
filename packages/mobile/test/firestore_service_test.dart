import 'package:flutter_test/flutter_test.dart';
import 'package:wishlist_wizard_mobile/models/models.dart';
import 'package:wishlist_wizard_mobile/services/firestore_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  // Same constraint as firebase_auth_service_test.dart: FirebaseFirestoreService
  // is a singleton gated on FirebaseInitializationService(), which
  // deterministically fails to initialize under `flutter test` (no live
  // Firebase platform). That's exercised directly here -- every public
  // CRUD method's real fail-safe return value when Firebase genuinely
  // can't be reached. The private document<->model conversion helpers
  // (_documentToFirebaseWishlist etc.) aren't reachable this way since
  // they need a real DocumentSnapshot, and this repo has no
  // fake_cloud_firestore-style test double for that -- left untested.
  final service = FirebaseFirestoreService();
  final fakeWishlist = FirebaseWishlist(
    id: 'w1',
    name: 'Birthday List',
    userId: 'u1',
    isPublic: false,
    tags: const [],
    createdAt: DateTime(2026),
    updatedAt: DateTime(2026),
  );
  final fakeItem = FirebaseWishlistItem(
    id: 'i1',
    name: 'Lego Set',
    wishlistId: 'w1',
    userId: 'u1',
    priority: Priority.medium,
    createdAt: DateTime(2026),
    updatedAt: DateTime(2026),
  );

  group('FirebaseFirestoreService — singleton', () {
    test('returns the same instance every time', () {
      expect(identical(FirebaseFirestoreService(), FirebaseFirestoreService()), isTrue);
    });
  });

  group('FirebaseFirestoreService — every method fails safe when Firebase is unavailable', () {
    test('getUserWishlists returns an empty list', () async {
      expect(await service.getUserWishlists('u1'), isEmpty);
    });

    test('getWishlistById returns null', () async {
      expect(await service.getWishlistById('w1'), isNull);
    });

    test('getUserWishlistsStream emits a single empty list', () async {
      expect(await service.getUserWishlistsStream('u1').toList(), [<FirebaseWishlist>[]]);
    });

    test('createWishlist returns null', () async {
      expect(await service.createWishlist(fakeWishlist), isNull);
    });

    test('updateWishlist returns false', () async {
      expect(await service.updateWishlist(fakeWishlist), isFalse);
    });

    test('deleteWishlist returns false', () async {
      expect(await service.deleteWishlist('w1'), isFalse);
    });

    test('getWishlistItems returns an empty list', () async {
      expect(await service.getWishlistItems('w1'), isEmpty);
    });

    test('getWishlistItemsStream emits a single empty list', () async {
      expect(await service.getWishlistItemsStream('w1').toList(), [<FirebaseWishlistItem>[]]);
    });

    test('getWishlistItemById returns null', () async {
      expect(await service.getWishlistItemById('i1'), isNull);
    });

    test('addWishlistItem returns null', () async {
      expect(await service.addWishlistItem(fakeItem), isNull);
    });

    test('updateWishlistItem returns false', () async {
      expect(await service.updateWishlistItem(fakeItem), isFalse);
    });

    test('deleteWishlistItem returns false', () async {
      expect(await service.deleteWishlistItem('i1'), isFalse);
    });

    test('getUserNotifications returns an empty list', () async {
      expect(await service.getUserNotifications('u1'), isEmpty);
    });

    test('getUserNotificationsStream emits a single empty list', () async {
      expect(await service.getUserNotificationsStream('u1').toList(), [<FirebaseNotification>[]]);
    });

    test('markNotificationAsRead returns false', () async {
      expect(await service.markNotificationAsRead('n1'), isFalse);
    });

    test('markAllNotificationsAsRead returns false', () async {
      expect(await service.markAllNotificationsAsRead('u1'), isFalse);
    });

    test('deleteNotification returns false', () async {
      expect(await service.deleteNotification('n1'), isFalse);
    });
  });
}
