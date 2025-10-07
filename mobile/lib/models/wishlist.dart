class Wishlist {
  final int id;
  final String name;
  final String? description;
  final int ownerId;
  final bool isPublic;
  final DateTime createdAt;
  final DateTime updatedAt;
  final List<WishlistItem> items;

  const Wishlist({
    required this.id,
    required this.name,
    this.description,
    required this.ownerId,
    required this.isPublic,
    required this.createdAt,
    required this.updatedAt,
    this.items = const [],
  });

  factory Wishlist.fromJson(Map<String, dynamic> json) {
    return Wishlist(
      id: json['id'] as int,
      name: json['name'] as String,
      description: json['description'] as String?,
      ownerId: json['ownerId'] as int,
      isPublic: json['isPublic'] as bool,
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      items:
          (json['items'] as List<dynamic>?)
              ?.map(
                (item) => WishlistItem.fromJson(item as Map<String, dynamic>),
              )
              .toList() ??
          [],
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'ownerId': ownerId,
      'isPublic': isPublic,
      'createdAt': createdAt.toIso8601String(),
      'updatedAt': updatedAt.toIso8601String(),
      'items': items.map((item) => item.toJson()).toList(),
    };
  }
}

class WishlistItem {
  final int id;
  final String name;
  final String? description;
  final String? imageUrl;
  final String? productUrl;
  final double? price;
  final int wishlistId;
  final DateTime createdAt;
  final bool isPurchased;
  final int? purchasedBy;

  const WishlistItem({
    required this.id,
    required this.name,
    this.description,
    this.imageUrl,
    this.productUrl,
    this.price,
    required this.wishlistId,
    required this.createdAt,
    this.isPurchased = false,
    this.purchasedBy,
  });

  factory WishlistItem.fromJson(Map<String, dynamic> json) {
    return WishlistItem(
      id: json['id'] as int,
      name: json['name'] as String,
      description: json['description'] as String?,
      imageUrl: json['imageUrl'] as String?,
      productUrl: json['productUrl'] as String?,
      price: (json['price'] as num?)?.toDouble(),
      wishlistId: json['wishlistId'] as int,
      createdAt: DateTime.parse(json['createdAt'] as String),
      isPurchased: json['isPurchased'] as bool? ?? false,
      purchasedBy: json['purchasedBy'] as int?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'description': description,
      'imageUrl': imageUrl,
      'productUrl': productUrl,
      'price': price,
      'wishlistId': wishlistId,
      'createdAt': createdAt.toIso8601String(),
      'isPurchased': isPurchased,
      'purchasedBy': purchasedBy,
    };
  }
}
