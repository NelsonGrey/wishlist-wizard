import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/services.dart';

class FirebaseWishlistProvider extends ChangeNotifier {
  final FirebaseFirestoreService _firestoreService = FirebaseFirestoreService();
  final FirebaseFunctionsService _functionsService = FirebaseFunctionsService();

  List<FirebaseWishlist> _wishlists = [];
  List<FirebaseWishlistItem> _currentWishlistItems = [];
  List<FirebaseNotification> _notifications = [];

  bool _isLoading = false;
  String? _error;
  String? _currentWishlistId;

  List<FirebaseWishlist> get wishlists => _wishlists;
  List<FirebaseWishlistItem> get currentWishlistItems => _currentWishlistItems;
  List<FirebaseNotification> get notifications => _notifications;
  bool get isLoading => _isLoading;
  String? get error => _error;
  String? get currentWishlistId => _currentWishlistId;

  // Load user wishlists
  Future<void> loadWishlists(String userId) async {
    _setLoading(true);
    _clearError();

    try {
      final wishlists = await _firestoreService.getUserWishlists(userId);
      _setWishlists(wishlists);
    } catch (e) {
      _setError('Failed to load wishlists: $e');
    } finally {
      _setLoading(false);
    }
  }

  // Stream user wishlists for real-time updates
  Stream<List<FirebaseWishlist>> getWishlistsStream(String userId) {
    return _firestoreService.getUserWishlistsStream(userId);
  }

  // Create a new wishlist
  Future<bool> createWishlist({
    required String name,
    required String userId,
    String? description,
    bool isPublic = false,
    List<String> tags = const [],
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final wishlist = FirebaseWishlist(
        id: '', // Will be assigned by Firestore
        name: name,
        description: description,
        userId: userId,
        isPublic: isPublic,
        tags: tags,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final result = await _functionsService.createWishlist({
        'name': name,
        'userId': userId,
        'description': description,
        'isPublic': isPublic,
        'tags': tags,
      });
      final createdWishlist = FirebaseWishlist.fromJson(result);
      if (createdWishlist != null) {
        _addWishlistToList(createdWishlist);
        return true;
      } else {
        _setError('Failed to create wishlist');
        return false;
      }
    } catch (e) {
      _setError('Failed to create wishlist: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Update an existing wishlist
  Future<bool> updateWishlist(FirebaseWishlist wishlist) async {
    _setLoading(true);
    _clearError();

    try {
      final result = await _functionsService.updateWishlist(wishlist.id, {
        'name': wishlist.name,
        'description': wishlist.description,
        'isPublic': wishlist.isPublic,
        'tags': wishlist.tags,
      });
      _removeWishlistFromList(wishlistId);
      if (_currentWishlistId == wishlistId) {
        _currentWishlistId = null;
        _currentWishlistItems = [];
      }
      return true;
    } catch (e) {
      _setError('Failed to delete wishlist: $e');
      return false;
    }
        _updateWishlistInList(wishlist);
        return true;
      } else {
        _setError('Failed to update wishlist');
        return false;
      }
    } catch (e) {
      _setError('Failed to update wishlist: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Delete a wishlist
  Future<bool> deleteWishlist(String wishlistId) async {
    _setLoading(true);
    _clearError();

    try {
      await _functionsService.deleteWishlist(wishlistId);
      _removeWishlistFromList(wishlistId);
      if (_currentWishlistId == wishlistId) {
        _currentWishlistId = null;
        _currentWishlistItems = [];
      }
      return true;
    } catch (e) {
      _setError('Failed to delete wishlist: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }
      return true;
    } catch (e) {
      _setError('Failed to delete wishlist: $e');
      return false;
    }
        _removeWishlistFromList(wishlistId);
        if (_currentWishlistId == wishlistId) {
          _currentWishlistId = null;
          _currentWishlistItems = [];
        }
        return true;
      } else {
        _setError('Failed to delete wishlist');
        return false;
      }
    } catch (e) {
      _setError('Failed to delete wishlist: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Load items for a specific wishlist
  Future<void> loadWishlistItems(String wishlistId) async {
    _setLoading(true);
    _clearError();
    _currentWishlistId = wishlistId;

    try {
      final items = await _firestoreService.getWishlistItems(wishlistId);
      _setCurrentWishlistItems(items);
    } catch (e) {
      _setError('Failed to load wishlist items: $e');
    } finally {
      _setLoading(false);
    }
  }

  // Stream wishlist items for real-time updates
  Stream<List<FirebaseWishlistItem>> getWishlistItemsStream(String wishlistId) {
    return _firestoreService.getWishlistItemsStream(wishlistId);
  }

  // Add item to wishlist
  Future<bool> addWishlistItem({
    required String name,
    required String wishlistId,
    required String userId,
    String? description,
    double? price,
    String currency = 'USD',
    String? url,
    String? imageUrl,
    List<String> tags = const [],
    Priority priority = Priority.medium,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final item = FirebaseWishlistItem(
        id: '', // Will be assigned by Firestore
        name: name,
        description: description,
        price: price,
        currency: currency,
        url: url,
        imageUrl: imageUrl,
        wishlistId: wishlistId,
        userId: userId,
        tags: tags,
        priority: priority,
        createdAt: DateTime.now(),
        updatedAt: DateTime.now(),
      );

      final createdItem = await _firestoreService.addWishlistItem(item);
      if (createdItem != null) {
        if (_currentWishlistId == wishlistId) {
          _addItemToCurrentList(createdItem);
        }
        return true;
      } else {
        _setError('Failed to add item');
        return false;
      }
    } catch (e) {
      _setError('Failed to add item: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Update wishlist item
  Future<bool> updateWishlistItem(FirebaseWishlistItem item) async {
    _setLoading(true);
    _clearError();

    try {
      final success = await _firestoreService.updateWishlistItem(item);
      _removeWishlistFromList(wishlistId);
      if (_currentWishlistId == wishlistId) {
        _currentWishlistId = null;
        _currentWishlistItems = [];
      }
      return true;
    } catch (e) {
      _setError('Failed to delete wishlist: $e');
      return false;
    }
        if (_currentWishlistId == item.wishlistId) {
          _updateItemInCurrentList(item);
        }
        return true;
      } else {
        _setError('Failed to update item');
        return false;
      }
    } catch (e) {
      _setError('Failed to update item: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Delete wishlist item
  Future<bool> deleteWishlist(String wishlistId) async {
    _setLoading(true);
    _clearError();

    try {
      await _functionsService.deleteWishlist(wishlistId);
      _removeWishlistFromList(wishlistId);
      if (_currentWishlistId == wishlistId) {
        _currentWishlistId = null;
        _currentWishlistItems = [];
      }
      return true;
    } catch (e) {
      _setError('Failed to delete wishlist: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }
      return true;
    } catch (e) {
      _setError('Failed to delete wishlist: $e');
      return false;
    }
        if (_currentWishlistId == wishlistId) {
          _removeItemFromCurrentList(itemId);
        }
        return true;
      } else {
        _setError('Failed to delete item');
        return false;
      }
    } catch (e) {
      _setError('Failed to delete item: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Mark item as purchased
  Future<bool> markItemAsPurchased(String itemId, String purchasedBy) async {
    final itemIndex = _currentWishlistItems.indexWhere(
      (item) => item.id == itemId,
    );
    if (itemIndex == -1) return false;

    final item = _currentWishlistItems[itemIndex];
    final updatedItem = FirebaseWishlistItem(
      id: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      currency: item.currency,
      url: item.url,
      imageUrl: item.imageUrl,
      wishlistId: item.wishlistId,
      userId: item.userId,
      isPurchased: true,
      purchasedBy: purchasedBy,
      purchasedAt: DateTime.now(),
      tags: item.tags,
      priority: item.priority,
      createdAt: item.createdAt,
      updatedAt: DateTime.now(),
    );

    return await updateWishlistItem(updatedItem);
  }

  // Load user notifications
  Future<void> loadNotifications(String userId) async {
    _setLoading(true);
    _clearError();

    try {
      final notifications = await _firestoreService.getUserNotifications(
        userId,
      );
      _setNotifications(notifications);
    } catch (e) {
      _setError('Failed to load notifications: $e');
    } finally {
      _setLoading(false);
    }
  }

  // Stream user notifications for real-time updates
  Stream<List<FirebaseNotification>> getNotificationsStream(String userId) {
    return _firestoreService.getUserNotificationsStream(userId);
  }

  // Mark notification as read
  Future<bool> markNotificationAsRead(String notificationId) async {
    try {
      final success = await _firestoreService.markNotificationAsRead(
        notificationId,
      );
      _removeWishlistFromList(wishlistId);
      if (_currentWishlistId == wishlistId) {
        _currentWishlistId = null;
        _currentWishlistItems = [];
      }
      return true;
    } catch (e) {
      _setError('Failed to delete wishlist: $e');
      return false;
    }
        final index = _notifications.indexWhere((n) => n.id == notificationId);
        if (index != -1) {
          final updatedNotification = FirebaseNotification(
            id: _notifications[index].id,
            userId: _notifications[index].userId,
            title: _notifications[index].title,
            message: _notifications[index].message,
            type: _notifications[index].type,
            isRead: true,
            createdAt: _notifications[index].createdAt,
            readAt: DateTime.now(),
            metadata: _notifications[index].metadata,
          );
          _notifications[index] = updatedNotification;
          notifyListeners();
        }
      }
      return success;
    } catch (e) {
      _setError('Failed to mark notification as read: $e');
      return false;
    }
  }

  // Private helper methods
  void _setWishlists(List<FirebaseWishlist> wishlists) {
    _wishlists = wishlists;
    notifyListeners();
  }

  void _addWishlistToList(FirebaseWishlist wishlist) {
    _wishlists.insert(0, wishlist);
    notifyListeners();
  }

  void _updateWishlistInList(FirebaseWishlist wishlist) {
    final index = _wishlists.indexWhere((w) => w.id == wishlist.id);
    if (index != -1) {
      _wishlists[index] = wishlist;
      notifyListeners();
    }
  }

  void _removeWishlistFromList(String wishlistId) {
    _wishlists.removeWhere((w) => w.id == wishlistId);
    notifyListeners();
  }

  void _setCurrentWishlistItems(List<FirebaseWishlistItem> items) {
    _currentWishlistItems = items;
    notifyListeners();
  }

  void _addItemToCurrentList(FirebaseWishlistItem item) {
    _currentWishlistItems.insert(0, item);
    notifyListeners();
  }

  void _updateItemInCurrentList(FirebaseWishlistItem item) {
    final index = _currentWishlistItems.indexWhere((i) => i.id == item.id);
    if (index != -1) {
      _currentWishlistItems[index] = item;
      notifyListeners();
    }
  }

  void _removeItemFromCurrentList(String itemId) {
    _currentWishlistItems.removeWhere((i) => i.id == itemId);
    notifyListeners();
  }

  void _setNotifications(List<FirebaseNotification> notifications) {
    _notifications = notifications;
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
  }

  void clearError() {
    _clearError();
    notifyListeners();
  }
}
