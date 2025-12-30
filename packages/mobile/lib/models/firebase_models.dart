import 'wishlist.dart';

enum Priority { low, medium, high }

enum NotificationType {
  priceDrop,
  backInStock,
  wishlistShared,
  itemPurchased,
  system,
}

class FirebaseWishlist {
  final String id;
  final String name;
  final String? description;
  final String userId;
  final bool isPublic;
  final List<String> tags;
  final DateTime createdAt;
  final DateTime updatedAt;

  const FirebaseWishlist({
    required this.id,
    required this.name,
    this.description,
    required this.userId,
    required this.isPublic,
    this.tags = const [],
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
      tags: List<String>.from(data['tags'] ?? []),
      createdAt: (data['createdAt'] as DateTime?) ?? DateTime.now(),
      updatedAt: (data['updatedAt'] as DateTime?) ?? DateTime.now(),
    );
  }

  // Convert to legacy Wishlist model for backward compatibility
  Wishlist toLegacyWishlist() {
    return Wishlist(
      id: int.tryParse(id) ?? 0,
      name: name,
      description: description,
      ownerId: int.tryParse(userId) ?? 0,
      isPublic: isPublic,
      createdAt: createdAt,
      updatedAt: updatedAt,
      items: const [],
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
  final String wishlistId;
  final String userId;
  final bool isPurchased;
  final String? purchasedBy;
  final DateTime? purchasedAt;
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
    required this.wishlistId,
    required this.userId,
    this.isPurchased = false,
    this.purchasedBy,
    this.purchasedAt,
    this.tags = const [],
    this.priority = Priority.medium,
    required this.createdAt,
    required this.updatedAt,
  });

  Map<String, dynamic> toFirestore() {
    return {
      'name': name,
      'description': description,
      'price': price,
      'currency': currency,
      'url': url,
      'imageUrl': imageUrl,
      'wishlistId': wishlistId,
      'userId': userId,
      'isPurchased': isPurchased,
      'purchasedBy': purchasedBy,
      'purchasedAt': purchasedAt,
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
    return FirebaseWishlistItem(
      id: docId,
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
      purchasedAt: data['purchasedAt'] as DateTime?,
      tags: List<String>.from(data['tags'] ?? []),
      priority: _stringToPriority(data['priority']),
      createdAt: (data['createdAt'] as DateTime?) ?? DateTime.now(),
      updatedAt: (data['updatedAt'] as DateTime?) ?? DateTime.now(),
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

  // Convert to legacy WishlistItem model for backward compatibility
  WishlistItem toLegacyWishlistItem() {
    return WishlistItem(
      id: int.tryParse(id) ?? 0,
      name: name,
      description: description,
      imageUrl: imageUrl,
      productUrl: url,
      price: price,
      wishlistId: int.tryParse(wishlistId) ?? 0,
      createdAt: createdAt,
      isPurchased: isPurchased,
      purchasedBy: int.tryParse(purchasedBy ?? '') ?? 0,
    );
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
    return FirebaseNotification(
      id: docId,
      userId: data['userId'] ?? '',
      title: data['title'] ?? '',
      message: data['message'] ?? '',
      type: _stringToNotificationType(data['type']),
      isRead: data['isRead'] ?? false,
      createdAt: (data['createdAt'] as DateTime?) ?? DateTime.now(),
      readAt: data['readAt'] as DateTime?,
      metadata: Map<String, dynamic>.from(data['metadata'] ?? {}),
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
