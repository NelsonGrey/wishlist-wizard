import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/services.dart';

class WishlistProvider extends ChangeNotifier {
  final WishlistService _wishlistService = WishlistService();

  List<Wishlist> _wishlists = [];
  Wishlist? _currentWishlist;
  bool _isLoading = false;
  String? _error;

  List<Wishlist> get wishlists => _wishlists;
  Wishlist? get currentWishlist => _currentWishlist;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> loadWishlists() async {
    _setLoading(true);
    _clearError();

    try {
      final wishlists = await _wishlistService.getWishlists();
      _setWishlists(wishlists);
    } on ApiException catch (e) {
      _setError(e.message);
    } catch (e) {
      _setError('Failed to load wishlists');
    } finally {
      _setLoading(false);
    }
  }

  Future<void> loadWishlist(int id) async {
    _setLoading(true);
    _clearError();

    try {
      final wishlist = await _wishlistService.getWishlist(id);
      _setCurrentWishlist(wishlist);
    } on ApiException catch (e) {
      _setError(e.message);
    } catch (e) {
      _setError('Failed to load wishlist');
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> createWishlist({
    required String name,
    String? description,
    bool isPublic = false,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final wishlist = await _wishlistService.createWishlist(
        name: name,
        description: description,
        isPublic: isPublic,
      );

      _addWishlist(wishlist);
      return true;
    } on ApiException catch (e) {
      _setError(e.message);
      return false;
    } catch (e) {
      _setError('Failed to create wishlist');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> updateWishlist(
    int id, {
    String? name,
    String? description,
    bool? isPublic,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final updatedWishlist = await _wishlistService.updateWishlist(
        id,
        name: name,
        description: description,
        isPublic: isPublic,
      );

      _updateWishlistInList(updatedWishlist);
      if (_currentWishlist?.id == id) {
        _setCurrentWishlist(updatedWishlist);
      }
      return true;
    } on ApiException catch (e) {
      _setError(e.message);
      return false;
    } catch (e) {
      _setError('Failed to update wishlist');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> deleteWishlist(int id) async {
    _setLoading(true);
    _clearError();

    try {
      await _wishlistService.deleteWishlist(id);
      _removeWishlist(id);
      if (_currentWishlist?.id == id) {
        _setCurrentWishlist(null);
      }
      return true;
    } on ApiException catch (e) {
      _setError(e.message);
      return false;
    } catch (e) {
      _setError('Failed to delete wishlist');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> addItem({
    required int wishlistId,
    required String name,
    String? description,
    String? imageUrl,
    String? productUrl,
    double? price,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final item = await _wishlistService.addItem(
        wishlistId: wishlistId,
        name: name,
        description: description,
        imageUrl: imageUrl,
        productUrl: productUrl,
        price: price,
      );

      _addItemToWishlist(wishlistId, item);
      return true;
    } on ApiException catch (e) {
      _setError(e.message);
      return false;
    } catch (e) {
      _setError('Failed to add item');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  void _setWishlists(List<Wishlist> wishlists) {
    _wishlists = wishlists;
    notifyListeners();
  }

  void _setCurrentWishlist(Wishlist? wishlist) {
    _currentWishlist = wishlist;
    notifyListeners();
  }

  void _addWishlist(Wishlist wishlist) {
    _wishlists.add(wishlist);
    notifyListeners();
  }

  void _updateWishlistInList(Wishlist updatedWishlist) {
    final index = _wishlists.indexWhere((w) => w.id == updatedWishlist.id);
    if (index != -1) {
      _wishlists[index] = updatedWishlist;
      notifyListeners();
    }
  }

  void _removeWishlist(int id) {
    _wishlists.removeWhere((w) => w.id == id);
    notifyListeners();
  }

  void _addItemToWishlist(int wishlistId, WishlistItem item) {
    // Update current wishlist if it matches
    if (_currentWishlist?.id == wishlistId) {
      final updatedItems = List<WishlistItem>.from(_currentWishlist!.items)
        ..add(item);
      _currentWishlist = Wishlist(
        id: _currentWishlist!.id,
        name: _currentWishlist!.name,
        description: _currentWishlist!.description,
        ownerId: _currentWishlist!.ownerId,
        isPublic: _currentWishlist!.isPublic,
        createdAt: _currentWishlist!.createdAt,
        updatedAt: _currentWishlist!.updatedAt,
        items: updatedItems,
      );
    }

    // Update in wishlists list
    final index = _wishlists.indexWhere((w) => w.id == wishlistId);
    if (index != -1) {
      final wishlist = _wishlists[index];
      final updatedItems = List<WishlistItem>.from(wishlist.items)..add(item);
      _wishlists[index] = Wishlist(
        id: wishlist.id,
        name: wishlist.name,
        description: wishlist.description,
        ownerId: wishlist.ownerId,
        isPublic: wishlist.isPublic,
        createdAt: wishlist.createdAt,
        updatedAt: wishlist.updatedAt,
        items: updatedItems,
      );
    }

    notifyListeners();
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String? error) {
    _error = error;
    notifyListeners();
  }

  void _clearError() {
    _error = null;
    notifyListeners();
  }

  void clearError() {
    _clearError();
  }
}
