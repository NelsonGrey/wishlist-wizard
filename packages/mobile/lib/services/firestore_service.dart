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
          .get();

      final list = querySnapshot.docs
          .map((doc) => _documentToFirebaseWishlist(doc))
          .toList();
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return list;
    } catch (e) {
      print('Error fetching wishlists: $e');
      return [];
    }
  }

  Future<FirebaseWishlist?> getWishlistById(String wishlistId) async {
    if (!await _ensureFirebaseInitialized()) {
      return null;
    }

    try {
      final doc = await _db.collection('wishlists').doc(wishlistId).get();
      if (!doc.exists) {
        return null;
      }
      return _documentToFirebaseWishlist(doc);
    } catch (e) {
      print('Error fetching wishlist by id: $e');
      return null;
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
            .snapshots()
            .map((snapshot) {
              final list = snapshot.docs
                  .map((doc) => _documentToFirebaseWishlist(doc))
                  .toList();
              list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
              return list;
            });
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
          .collection('wishlistItems')
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
          .collection('wishlistItems')
          .where('wishlistId', isEqualTo: wishlistId)
          .get();

      final list = querySnapshot.docs
          .map((doc) => _documentToFirebaseWishlistItem(doc))
          .toList();
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return list;
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
            .collection('wishlistItems')
            .where('wishlistId', isEqualTo: wishlistId)
            .snapshots()
            .map((snapshot) {
              final list = snapshot.docs
                  .map((doc) => _documentToFirebaseWishlistItem(doc))
                  .toList();
              list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
              return list;
            });
      } else {
        return Stream.value(<FirebaseWishlistItem>[]);
      }
    });
  }

  Future<FirebaseWishlistItem?> getWishlistItemById(String itemId) async {
    if (!await _ensureFirebaseInitialized()) {
      return null;
    }

    try {
      final doc = await _db.collection('wishlistItems').doc(itemId).get();
      if (!doc.exists) {
        return null;
      }
      return _documentToFirebaseWishlistItem(doc);
    } catch (e) {
      print('Error fetching wishlist item by id: $e');
      return null;
    }
  }

  Future<FirebaseWishlistItem?> addWishlistItem(
    FirebaseWishlistItem item,
  ) async {
    if (!await _ensureFirebaseInitialized()) {
      return null;
    }

    try {
      final docRef = await _db.collection('wishlistItems').add({
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
      await _db.collection('wishlistItems').doc(item.id).update({
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
      await _db.collection('wishlistItems').doc(itemId).delete();
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
          .limit(50)
          .get();

      final list = querySnapshot.docs
          .map((doc) => _documentToFirebaseNotification(doc))
          .toList();
      list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
      return list;
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
            .limit(50)
            .snapshots()
            .map((snapshot) {
              final list = snapshot.docs
                  .map((doc) => _documentToFirebaseNotification(doc))
                  .toList();
              list.sort((a, b) => b.createdAt.compareTo(a.createdAt));
              return list;
            });
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
        'read': true,
        'readAt': FieldValue.serverTimestamp(),
      });
      return true;
    } catch (e) {
      print('Error marking notification as read: $e');
      return false;
    }
  }

  // Mirrors the backend's markAllNotificationsAsRead
  // (packages/functions/src/api/notifications.ts) client-side, since this
  // screen reads/writes Firestore directly rather than through the router —
  // security rules (firestore.rules) already scope every notification
  // document to request.auth.uid == resource.data.userId.
  Future<bool> markAllNotificationsAsRead(String userId) async {
    if (!await _ensureFirebaseInitialized()) {
      return false;
    }

    try {
      final unread = await _db
          .collection('notifications')
          .where('userId', isEqualTo: userId)
          .where('isRead', isEqualTo: false)
          .get();

      if (unread.docs.isEmpty) {
        return true;
      }

      final batch = _db.batch();
      for (final doc in unread.docs) {
        batch.update(doc.reference, {
          'isRead': true,
          'read': true,
          'readAt': FieldValue.serverTimestamp(),
        });
      }
      await batch.commit();
      return true;
    } catch (e) {
      print('Error marking all notifications as read: $e');
      return false;
    }
  }

  Future<bool> deleteNotification(String notificationId) async {
    if (!await _ensureFirebaseInitialized()) {
      return false;
    }

    try {
      await _db.collection('notifications').doc(notificationId).delete();
      return true;
    } catch (e) {
      print('Error deleting notification: $e');
      return false;
    }
  }

  // Safely parse a Firestore timestamp field that may be stored as a
  // Firestore Timestamp OR as an ISO-8601 String (written by Functions/web).
  DateTime _parseTimestamp(dynamic value, {DateTime? fallback}) {
    if (value is Timestamp) return value.toDate();
    if (value is String) return DateTime.tryParse(value) ?? (fallback ?? DateTime.now());
    return fallback ?? DateTime.now();
  }

  DateTime? _parseTimestampNullable(dynamic value) {
    if (value == null) return null;
    if (value is Timestamp) return value.toDate();
    if (value is String) return DateTime.tryParse(value);
    return null;
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
      shareId: data['shareId'],
      tags: List<String>.from(data['tags'] ?? []),
      createdAt: _parseTimestamp(data['createdAt']),
      updatedAt: _parseTimestamp(data['updatedAt']),
    );
  }

  FirebaseWishlistItem _documentToFirebaseWishlistItem(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    try {
      return FirebaseWishlistItem(
        id: doc.id,
        // Functions may write 'title' instead of 'name'
        name: (data['name'] ?? data['title'] ?? '').toString(),
        description: data['description']?.toString(),
        // price may be stored as String by some clients
        price: _parsePrice(data['price']),
        currency: (data['currency'] ?? 'USD').toString(),
        // Functions may write 'productUrl' instead of 'url'
        url: (data['url'] ?? data['productUrl'])?.toString(),
        imageUrl: data['imageUrl']?.toString(),
        store: data['store']?.toString(),
        wishlistId: (data['wishlistId'] ?? '').toString(),
        // Functions may write 'addedBy' instead of 'userId'
        userId: (data['userId'] ?? data['addedBy'] ?? '').toString(),
        isPurchased: data['isPurchased'] == true || data['purchasedByUserId'] != null,
        purchasedBy: (data['purchasedBy'] ?? data['purchasedByUserId'])?.toString(),
        purchasedAt: _parseTimestampNullable(data['purchasedAt']),
        tags: List<String>.from(data['tags'] ?? []),
        priority: _stringToPriority(_toPriorityString(data['priority'])),
        createdAt: _parseTimestamp(data['createdAt']),
        updatedAt: _parseTimestamp(data['updatedAt']),
      );
    } catch (e, stack) {
      print('[FirestoreService] Failed to parse wishlist item ${doc.id}: $e');
      print('[FirestoreService] Data: $data');
      print('[FirestoreService] Stack: $stack');
      rethrow;
    }
  }

  double? _parsePrice(dynamic value) {
    if (value == null) return null;
    if (value is num) return value.toDouble();
    if (value is String) return double.tryParse(value);
    return null;
  }

  // Normalise numeric priority (Functions use int 1-3) to string form.
  String? _toPriorityString(dynamic value) {
    if (value == null) return null;
    if (value is String) return value;
    if (value is num) {
      if (value >= 3) return 'high';
      if (value == 2) return 'medium';
      return 'low';
    }
    return null;
  }

  FirebaseNotification _documentToFirebaseNotification(DocumentSnapshot doc) {
    final data = doc.data() as Map<String, dynamic>;
    final dynamic rawMetadata = data['metadata'] ?? data['data'] ?? {};

    Map<String, dynamic> metadata;
    if (rawMetadata is Map<String, dynamic>) {
      metadata = rawMetadata;
    } else if (rawMetadata is Map) {
      metadata = rawMetadata.map(
        (key, value) => MapEntry(key.toString(), value),
      );
    } else {
      metadata = <String, dynamic>{};
    }

    return FirebaseNotification(
      id: doc.id,
      userId: data['userId'] ?? '',
      title: data['title'] ?? '',
      message: (data['message'] ?? data['body'] ?? data['content'] ?? '')
          .toString(),
      type: _stringToNotificationType(data['type']),
      isRead: (data['isRead'] ?? data['read'] ?? false) == true,
      createdAt: _parseTimestamp(data['createdAt']),
      readAt: _parseTimestampNullable(data['readAt']),
      metadata: metadata,
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
