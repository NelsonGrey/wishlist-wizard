import '../models/models.dart';
import 'api_client.dart';
import 'api_config.dart';

class WishlistService {
  static final WishlistService _instance = WishlistService._internal();
  factory WishlistService() => _instance;
  WishlistService._internal();

  final ApiClient _apiClient = ApiClient();

  Future<List<Wishlist>> getWishlists() async {
    try {
      final response = await _apiClient.get(ApiConfig.mobileWishlists);
      final data = response.data as List<dynamic>;
      return data
          .map((json) => Wishlist.fromJson(json as Map<String, dynamic>))
          .toList();
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(message: 'Failed to load wishlists');
    }
  }

  Future<Wishlist> getWishlist(int id) async {
    try {
      final response = await _apiClient.get('${ApiConfig.mobileWishlists}/$id');
      final data = response.data as Map<String, dynamic>;
      return Wishlist.fromJson(data);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(message: 'Failed to load wishlist');
    }
  }

  Future<Wishlist> createWishlist({
    required String name,
    String? description,
    bool isPublic = false,
  }) async {
    try {
      final response = await _apiClient.post(
        ApiConfig.mobileWishlists,
        data: {'name': name, 'description': description, 'isPublic': isPublic},
      );
      final data = response.data as Map<String, dynamic>;
      return Wishlist.fromJson(data);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(message: 'Failed to create wishlist');
    }
  }

  Future<Wishlist> updateWishlist(
    int id, {
    String? name,
    String? description,
    bool? isPublic,
  }) async {
    try {
      final response = await _apiClient.put(
        '${ApiConfig.mobileWishlists}/$id',
        data: {
          if (name != null) 'name': name,
          if (description != null) 'description': description,
          if (isPublic != null) 'isPublic': isPublic,
        },
      );
      final data = response.data as Map<String, dynamic>;
      return Wishlist.fromJson(data);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(message: 'Failed to update wishlist');
    }
  }

  Future<void> deleteWishlist(int id) async {
    try {
      await _apiClient.delete('${ApiConfig.mobileWishlists}/$id');
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(message: 'Failed to delete wishlist');
    }
  }

  Future<WishlistItem> addItem({
    required int wishlistId,
    required String name,
    String? description,
    String? imageUrl,
    String? productUrl,
    double? price,
  }) async {
    try {
      final response = await _apiClient.post(
        ApiConfig.mobileItems,
        data: {
          'wishlistId': wishlistId,
          'name': name,
          'description': description,
          'imageUrl': imageUrl,
          'productUrl': productUrl,
          'price': price,
        },
      );
      final data = response.data as Map<String, dynamic>;
      return WishlistItem.fromJson(data);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(message: 'Failed to add item');
    }
  }

  Future<WishlistItem> updateItem(
    int itemId, {
    String? name,
    String? description,
    String? imageUrl,
    String? productUrl,
    double? price,
    bool? isPurchased,
  }) async {
    try {
      final response = await _apiClient.put(
        '${ApiConfig.mobileItems}/$itemId',
        data: {
          if (name != null) 'name': name,
          if (description != null) 'description': description,
          if (imageUrl != null) 'imageUrl': imageUrl,
          if (productUrl != null) 'productUrl': productUrl,
          if (price != null) 'price': price,
          if (isPurchased != null) 'isPurchased': isPurchased,
        },
      );
      final data = response.data as Map<String, dynamic>;
      return WishlistItem.fromJson(data);
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(message: 'Failed to update item');
    }
  }

  Future<void> deleteItem(int itemId) async {
    try {
      await _apiClient.delete('${ApiConfig.mobileItems}/$itemId');
    } on ApiException {
      rethrow;
    } catch (e) {
      throw ApiException(message: 'Failed to delete item');
    }
  }
}
