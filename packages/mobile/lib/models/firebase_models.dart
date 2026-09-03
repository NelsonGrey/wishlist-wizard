import 'package:cloud_firestore/cloud_firestore.dart';

DateTime _parseDate(dynamic v, {DateTime? fallback}) {
  if (v is Timestamp) return v.toDate();
  if (v is String) return DateTime.tryParse(v) ?? (fallback ?? DateTime.now());
  return fallback ?? DateTime.now();
}

DateTime? _parseDateNullable(dynamic v) {
  if (v == null) return null;
  if (v is Timestamp) return v.toDate();
  if (v is String) return DateTime.tryParse(v);
  return null;
}

enum Priority { low, medium, high }

enum NotificationType {
  priceDrop,
  backInStock,
  wishlistShared,
  itemPurchased,
  system,
}

/// Collaborator role for the "Shared with Me" feature. 'owner' is never
/// stored server-side (implicit via userId) but is used client-side as the
/// default when myRole isn't present on the response (i.e. the caller's own
/// wishlist).
enum CollaboratorRole { owner, editor, commenter, viewer }

CollaboratorRole _parseCollaboratorRole(dynamic value) {
  switch (value) {
    case 'editor':
      return CollaboratorRole.editor;
    case 'commenter':
      return CollaboratorRole.commenter;
    case 'viewer':
      return CollaboratorRole.viewer;
    default:
      return CollaboratorRole.owner;
  }
}

class FirebaseWishlist {
  final String id;
  final String name;
  final String? description;
  final String userId;
  final bool isPublic;
  final bool isCollaborative;
  final String? shareId;
  final List<String> tags;
  final CollaboratorRole myRole;
  final DateTime createdAt;
  final DateTime updatedAt;

  const FirebaseWishlist({
    required this.id,
    required this.name,
    this.description,
    required this.userId,
    required this.isPublic,
    this.isCollaborative = false,
    this.shareId,
    this.tags = const [],
    this.myRole = CollaboratorRole.owner,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toFirestore() {
    return {
      'name': name,
      'description': description,
      'userId': userId,
      'isPublic': isPublic,
      'tags': tags,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }

  factory FirebaseWishlist.fromFirestore(
    String docId,
    Map<String, dynamic> data,
  ) {
    return FirebaseWishlist(
      id: docId,
      name: data['name'] ?? '',
      description: data['description'],
      userId: data['userId'] ?? '',
      isPublic: data['isPublic'] ?? false,
      isCollaborative: data['isCollaborative'] ?? false,
      shareId: data['shareId'],
      tags: List<String>.from(data['tags'] ?? []),
      myRole: _parseCollaboratorRole(data['myRole']),
      createdAt: _parseDate(data['createdAt']),
      updatedAt: _parseDate(data['updatedAt']),
    );
  }

}

class FirebaseWishlistItem {
  final String id;
  final String name;
  final String? description;
  final double? price;
  final String currency;
  final String? url;
  final String? imageUrl;
  final String? store;
  final String wishlistId;
  final String userId;
  final bool isPurchased;
  final String? purchasedBy;
  final DateTime? purchasedAt;

  /// Uid of the person who has this item reserved (a soft hold, distinct from
  /// [isPurchased]). Null when nobody has reserved it.
  final String? reservedBy;
  final DateTime? reservedAt;
  final List<String> tags;
  final Priority priority;
  final DateTime createdAt;
  final DateTime updatedAt;

  const FirebaseWishlistItem({
    required this.id,
    required this.name,
    this.description,
    this.price,
    this.currency = 'USD',
    this.url,
    this.imageUrl,
    this.store,
    required this.wishlistId,
    required this.userId,
    this.isPurchased = false,
    this.purchasedBy,
    this.purchasedAt,
    this.reservedBy,
    this.reservedAt,
    this.tags = const [],
    this.priority = Priority.medium,
    required this.createdAt,
    required this.updatedAt,
  });

  /// True when the item is reserved by someone and not yet purchased.
  bool get isReserved => reservedBy != null && !isPurchased;

  Map<String, dynamic> toFirestore() {
    return {
      'name': name,
      'description': description,
      'price': price,
      'currency': currency,
      'url': url,
      'imageUrl': imageUrl,
      'store': store,
      'wishlistId': wishlistId,
      'userId': userId,
      'isPurchased': isPurchased,
      'purchasedBy': purchasedBy,
      'purchasedAt': purchasedAt,
      'reservedBy': reservedBy,
      'reservedAt': reservedAt,
      'tags': tags,
      'priority': priority.toString().split('.').last,
      'createdAt': createdAt,
      'updatedAt': updatedAt,
    };
  }

  factory FirebaseWishlistItem.fromFirestore(
    String docId,
    Map<String, dynamic> data,
  ) {
    // Support cross-platform field aliases written by Cloud Functions:
    //   title → name,  productUrl → url,  addedBy → userId,
    //   purchasedByUserId → isPurchased=true + purchasedBy
    //   reservedByUserId  → reservedBy
    final purchasedByUserId = data['purchasedByUserId'] as String?;
    return FirebaseWishlistItem(
      id: docId,
      name: data['name'] ?? data['title'] ?? '',
      description: data['description'],
      price: (data['price'] as num?)?.toDouble(),
      currency: data['currency'] ?? 'USD',
      url: data['url'] ?? data['productUrl'],
      imageUrl: data['imageUrl'],
      store: data['store'],
      wishlistId: data['wishlistId'] ?? '',
      userId: data['userId'] ?? data['addedBy'] ?? '',
      isPurchased:
          (data['isPurchased'] as bool? ?? false) || purchasedByUserId != null,
      purchasedBy: data['purchasedBy'] ?? purchasedByUserId,
      purchasedAt: _parseDateNullable(data['purchasedAt']),
      reservedBy: data['reservedByUserId'] ?? data['reservedBy'],
      reservedAt: _parseDateNullable(data['reservedAt']),
      tags: List<String>.from(data['tags'] ?? []),
      priority: _stringToPriority(data['priority']),
      createdAt: _parseDate(data['createdAt']),
      updatedAt: _parseDate(data['updatedAt']),
    );
  }

  static Priority _stringToPriority(String? priority) {
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
}

class FirebaseNotification {
  final String id;
  final String userId;
  final String title;
  final String message;
  final NotificationType type;
  final bool isRead;
  final DateTime createdAt;
  final DateTime? readAt;
  final Map<String, dynamic> metadata;

  const FirebaseNotification({
    required this.id,
    required this.userId,
    required this.title,
    required this.message,
    required this.type,
    this.isRead = false,
    required this.createdAt,
    this.readAt,
    this.metadata = const {},
  });

  Map<String, dynamic> toFirestore() {
    return {
      'userId': userId,
      'title': title,
      'message': message,
      'type': type.toString().split('.').last,
      'isRead': isRead,
      'createdAt': createdAt,
      'readAt': readAt,
      'metadata': metadata,
    };
  }

  factory FirebaseNotification.fromFirestore(
    String docId,
    Map<String, dynamic> data,
  ) {
    // Support cross-platform field aliases written by Cloud Functions:
    //   content → message,  read → isRead,  data → metadata
    // `content` is the field every createNotification() call site across
    // the whole backend actually writes (wishlists.ts, collaboration.ts,
    // connections.ts, triggers/collaboration.ts) -- web's Notifications.tsx
    // reads it directly. `message`/`body` were never actually written by
    // anything; every notification's body text rendered as an empty
    // string on mobile until this was found (via a real integration test
    // asserting the text a user would actually see).
    return FirebaseNotification(
      id: docId,
      userId: data['userId'] ?? '',
      title: data['title'] ?? '',
      message: data['message'] ?? data['content'] ?? data['body'] ?? '',
      type: _stringToNotificationType(data['type']),
      isRead: data['isRead'] as bool? ?? data['read'] as bool? ?? false,
      createdAt: _parseDate(data['createdAt']),
      readAt: _parseDateNullable(data['readAt']),
      metadata: Map<String, dynamic>.from(
        data['metadata'] ?? data['data'] ?? {},
      ),
    );
  }

  static NotificationType _stringToNotificationType(String? type) {
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
