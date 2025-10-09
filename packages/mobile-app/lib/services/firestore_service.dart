// ignore_for_file: avoid_print

import 'package:cloud_firestore/cloud_firestore.dart';
import '../models/models.dart';
import 'firebase_initialization_service.dart';

class FirebaseFirestoreService {
  static final FirebaseFirestoreService _instance =
      FirebaseFirestoreService._internal();
  factory FirebaseFirestoreService() => _instance;
  FirebaseFirestoreService._internal();

  final FirebaseInitializationService _firebaseInit =
      FirebaseInitializationService();
  FirebaseFirestore? _firestore;

  FirebaseFirestore get _db {
    if (_firestore == null) {
      throw Exception(
        'Firebase not initialized. Call _ensureFirebaseInitialized() first.',
      );
    }
    return _firestore!;
  }

  Future<bool> _ensureFirebaseInitialized() async {
    if (_firestore != null) return true;

    final initialized = await _firebaseInit.initialize();
    if (initialized) {
      try {
        _firestore = FirebaseFirestore.instance;
        return true;
      } catch (e) {
        print('Error accessing Firestore: $e');
        return false;
      }
    }
    return false;
  }

  // Wishlist operations
  Future<List<FirebaseWishlist>> getUserWishlists(String userId) async {
    if (!await _ensureFirebaseInitialized()) {
      return [];
    }

    try {
      final querySnapshot = await _db
          .collection('wishlists')
          .where('userId', isEqualTo: userId)
          .orderBy('createdAt', descending: true)
          .get();

      return querySnapshot.docs
          .map((doc) => _documentToFirebaseWishlist(doc))
          .toList();
    } catch (e) {
      print('Error fetching wishlists: $e');
      return [];
    }
  }

  Stream<List<FirebaseWishlist>> getUserWishlistsStream(String userId) {
    return Stream.fromFuture(_ensureFirebaseInitialized()).asyncExpand((
      initialized,
    ) {
      if (initialized) {
        return _db
            .collection('wishlists')
            .where('userId', isEqualTo: userId)
            .orderBy('createdAt', descending: true)
            .snapshots()
            .map(
              (snapshot) => snapshot.docs
                  .map((doc) => _documentToFirebaseWishlist(doc))
                  .toList(),
            );
      } else {
        return Stream.value(<FirebaseWishlist>[]);
      }
    });
  }

  Future<FirebaseWishlist?> createWishlist(FirebaseWishlist wishlist) async {
    if (!await _ensureFirebaseInitialized()) {
      return null;
    }

    try {
      final docRef = await _db.collection('wishlists').add({
        'name': wishlist.name,
        'description': wishlist.description,
        'userId': wishlist.userId,
        'isPublic': wishlist.isPublic,
        'tags': wishlist.tags,
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      });

      final doc = await docRef.get();
      return _documentToFirebaseWishlist(doc);
    } catch (e) {
      print('Error creating wishlist: $e');
      return null;
    }
  }

  Future<bool> updateWishlist(FirebaseWishlist wishlist) async {
    if (!await _ensureFirebaseInitialized()) {
      return false;
    }

    try {
      await _db.collection('wishlists').doc(wishlist.id).update({
        'name': wishlist.name,
        'description': wishlist.description,
        'isPublic': wishlist.isPublic,
        'tags': wishlist.tags,
        'updatedAt': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      print('Error updating wishlist: $e');
      return false;
    }
  }

  Future<bool> deleteWishlist(String wishlistId) async {
    if (!await _ensureFirebaseInitialized()) {
      return false;
    }

    try {
      // Delete all items in the wishlist first
      final itemsSnapshot = await _db
          .collection('wishlist_items')
          .where('wishlistId', isEqualTo: wishlistId)
          .get();

      final batch = _db.batch();
      for (final doc in itemsSnapshot.docs) {
        batch.delete(doc.reference);
      }

      // Delete the wishlist
      batch.delete(_db.collection('wishlists').doc(wishlistId));

      await batch.commit();
      return true;
    } catch (e) {
      print('Error deleting wishlist: $e');
      return false;
    }
  }

  // Wishlist item operations
  Future<List<FirebaseWishlistItem>> getWishlistItems(String wishlistId) async {
    if (!await _ensureFirebaseInitialized()) {
      return [];
    }

    try {
      final querySnapshot = await _db
          .collection('wishlist_items')
          .where('wishlistId', isEqualTo: wishlistId)
          .orderBy('createdAt', descending: true)
          .get();

      return querySnapshot.docs
          .map((doc) => _documentToFirebaseWishlistItem(doc))
          .toList();
    } catch (e) {
      print('Error fetching wishlist items: $e');
      return [];
    }
  }

  Stream<List<FirebaseWishlistItem>> getWishlistItemsStream(String wishlistId) {
    return Stream.fromFuture(_ensureFirebaseInitialized()).asyncExpand((
      initialized,
    ) {
      if (initialized) {
        return _db
            .collection('wishlist_items')
            .where('wishlistId', isEqualTo: wishlistId)
            .orderBy('createdAt', descending: true)
            .snapshots()
            .map(
              (snapshot) => snapshot.docs
                  .map((doc) => _documentToFirebaseWishlistItem(doc))
                  .toList(),
            );
      } else {
        return Stream.value(<FirebaseWishlistItem>[]);
      }
    });
  }

  Future<FirebaseWishlistItem?> addWishlistItem(
    FirebaseWishlistItem item,
  ) async {
    if (!await _ensureFirebaseInitialized()) {
      return null;
    }

    try {
      final docRef = await _db.collection('wishlist_items').add({
        'name': item.name,
        'description': item.description,
        'price': item.price,
        'currency': item.currency,
        'url': item.url,
        'imageUrl': item.imageUrl,
        'wishlistId': item.wishlistId,
        'userId': item.userId,
        'isPurchased': item.isPurchased,
        'purchasedBy': item.purchasedBy,
        'purchasedAt': item.purchasedAt,
        'tags': item.tags,
        'priority': item.priority.toString().split('.').last,
        'createdAt': FieldValue.serverTimestamp(),
        'updatedAt': FieldValue.serverTimestamp(),
      });

      final doc = await docRef.get();
      return _documentToFirebaseWishlistItem(doc);
    } catch (e) {
      print('Error adding wishlist item: $e');
      return null;
    }
  }

  Future<bool> updateWishlistItem(FirebaseWishlistItem item) async {
    if (!await _ensureFirebaseInitialized()) {
      return false;
    }

    try {
      await _db.collection('wishlist_items').doc(item.id).update({
        'name': item.name,
        'description': item.description,
        'price': item.price,
        'currency': item.currency,
        'url': item.url,
        'imageUrl': item.imageUrl,
        'isPurchased': item.isPurchased,
        'purchasedBy': item.purchasedBy,
        'purchasedAt': item.purchasedAt,
        'tags': item.tags,
        'priority': item.priority.toString().split('.').last,
        'updatedAt': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      print('Error updating wishlist item: $e');
      return false;
    }
  }

  Future<bool> deleteWishlistItem(String itemId) async {
    if (!await _ensureFirebaseInitialized()) {
      return false;
    }

    try {
      await _db.collection('wishlist_items').doc(itemId).delete();
      return true;
    } catch (e) {
      print('Error deleting wishlist item: $e');
      return false;
    }
  }

  // Notification operations
  Future<List<FirebaseNotification>> getUserNotifications(String userId) async {
    if (!await _ensureFirebaseInitialized()) {
      return [];
    }

    try {
      final querySnapshot = await _db
          .collection('notifications')
          .where('userId', isEqualTo: userId)
          .orderBy('createdAt', descending: true)
          .limit(50)
          .get();

      return querySnapshot.docs
          .map((doc) => _documentToFirebaseNotification(doc))
          .toList();
    } catch (e) {
      print('Error fetching notifications: $e');
      return [];
    }
  }

  Stream<List<FirebaseNotification>> getUserNotificationsStream(String userId) {
    return Stream.fromFuture(_ensureFirebaseInitialized()).asyncExpand((
      initialized,
    ) {
      if (initialized) {
        return _db
            .collection('notifications')
            .where('userId', isEqualTo: userId)
            .orderBy('createdAt', descending: true)
            .limit(50)
            .snapshots()
            .map(
              (snapshot) => snapshot.docs
                  .map((doc) => _documentToFirebaseNotification(doc))
                  .toList(),
            );
      } else {
        return Stream.value(<FirebaseNotification>[]);
      }
    });
  }

  Future<bool> markNotificationAsRead(String notificationId) async {
    if (!await _ensureFirebaseInitialized()) {
      return false;
    }

    try {
      await _db.collection('notifications').doc(notificationId).update({
        'isRead': true,
        'readAt': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      print('Error marking notification as read: $e');
      return false;
    }
  }

  // Helper methods to convert Firestore documents to models
  FirebaseWishlist _documentToFirebaseWishlist(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return FirebaseWishlist(
      id: doc.id,
      name: data['name'] ?? '',
      description: data['description'],
      userId: data['userId'] ?? '',
      isPublic: data['isPublic'] ?? false,
      tags: List<String>.from(data['tags'] ?? []),
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  FirebaseWishlistItem _documentToFirebaseWishlistItem(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return FirebaseWishlistItem(
      id: doc.id,
      name: data['name'] ?? '',
      description: data['description'],
      price: (data['price'] as num?)?.toDouble(),
      currency: data['currency'] ?? 'USD',
      url: data['url'],
      imageUrl: data['imageUrl'],
      wishlistId: data['wishlistId'] ?? '',
      userId: data['userId'] ?? '',
      isPurchased: data['isPurchased'] ?? false,
      purchasedBy: data['purchasedBy'],
      purchasedAt: (data['purchasedAt'] as Timestamp?)?.toDate(),
      tags: List<String>.from(data['tags'] ?? []),
      priority: _stringToPriority(data['priority']),
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      updatedAt: (data['updatedAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
    );
  }

  FirebaseNotification _documentToFirebaseNotification(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    return FirebaseNotification(
      id: doc.id,
      userId: data['userId'] ?? '',
      title: data['title'] ?? '',
      message: data['message'] ?? '',
      type: _stringToNotificationType(data['type']),
      isRead: data['isRead'] ?? false,
      createdAt: (data['createdAt'] as Timestamp?)?.toDate() ?? DateTime.now(),
      readAt: (data['readAt'] as Timestamp?)?.toDate(),
      metadata: Map<String, dynamic>.from(data['metadata'] ?? {}),
    );
  }

  Priority _stringToPriority(String? priority) {
    switch (priority) {
      case 'high':
        return Priority.high;
      case 'medium':
        return Priority.medium;
      case 'low':
        return Priority.low;
      default:
        return Priority.medium;
    }
  }

  NotificationType _stringToNotificationType(String? type) {
    switch (type) {
      case 'priceDrop':
        return NotificationType.priceDrop;
      case 'backInStock':
        return NotificationType.backInStock;
      case 'wishlistShared':
        return NotificationType.wishlistShared;
      case 'itemPurchased':
        return NotificationType.itemPurchased;
      case 'system':
        return NotificationType.system;
      default:
        return NotificationType.system;
    }
  }
}
