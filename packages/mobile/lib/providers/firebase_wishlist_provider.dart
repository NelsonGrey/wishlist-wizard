import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/services.dart';

class FirebaseWishlistProvider extends ChangeNotifier {
  final FirebaseFirestoreService _firestoreService;
  final FirebaseFunctionsService _functionsService;

  // Services are injectable (defaulting to real instances) so tests can
  // substitute mocks instead of needing a live Firebase connection.
  FirebaseWishlistProvider({
    FirebaseFirestoreService? firestoreService,
    FirebaseFunctionsService? functionsService,
  }) : _firestoreService = firestoreService ?? FirebaseFirestoreService(),
       _functionsService = functionsService ?? FirebaseFunctionsService();

  final List<FirebaseWishlist> _wishlists = [];
  final List<FirebaseWishlist> _sharedWishlists = [];
  List<FirebaseWishlistItem> _currentWishlistItems = [];
  final List<FirebaseNotification> _notifications = [];

  bool _isLoading = false;
  String? _error;
  String? _currentWishlistId;

  List<FirebaseWishlist> get wishlists => _wishlists;
  List<FirebaseWishlist> get sharedWishlists => _sharedWishlists;
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

  Future<FirebaseWishlist?> getWishlistById(String wishlistId) async {
    try {
      final index = _wishlists.indexWhere((w) => w.id == wishlistId);
      if (index != -1) {
        return _wishlists[index];
      }

      return await _firestoreService.getWishlistById(wishlistId);
    } catch (e) {
      _setError('Failed to load wishlist: $e');
      return null;
    }
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
      final result = await _functionsService.createWishlist({
        'name': name,
        'userId': userId,
        'description': description,
        'isPublic': isPublic,
        'tags': tags,
      });
      // createWishlist's Cloud Function returns { id: docRef.id, ...wishlistData }
      // (see packages/functions/src/api/wishlists.ts) — fromFirestore's docId
      // argument must come from that real id, not an empty placeholder, or
      // createdWishlist.id is always '' and this always reports failure even
      // though the wishlist was created successfully.
      final createdWishlist = FirebaseWishlist.fromFirestore(
        (result['id'] as String?) ?? '',
        result,
      );
      if (createdWishlist.id.isNotEmpty) {
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

      if (result.isNotEmpty) {
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

  // =============================================================================
  // COLLABORATION ("Shared with Me")
  // =============================================================================

  // Load wishlists shared with the current user by other owners. Unlike
  // loadWishlists/getWishlistsStream (a direct Firestore query the caller
  // owns), this has no Firestore-stream equivalent — resolving "which
  // wishlists is this collaborator entry pointing at, and what's my role"
  // is a join the backend does in listSharedWishlists, so this is
  // callable-backed rather than a live stream. Matches the web design.
  Future<void> loadSharedWishlists() async {
    _setLoading(true);
    _clearError();

    try {
      final results = await _functionsService.listSharedWishlists();
      _sharedWishlists.clear();
      _sharedWishlists.addAll(
        results.map(
          (data) =>
              FirebaseWishlist.fromFirestore(data['id'] as String? ?? '', data),
        ),
      );
      notifyListeners();
    } catch (e) {
      _setError('Failed to load shared wishlists: $e');
    } finally {
      _setLoading(false);
    }
  }

  /// Returns `{collaborators: [...], pendingInvites: [...]}` — the latter
  /// only populated when the caller is the wishlist owner (see
  /// listCollaborators in packages/functions/src/api/collaboration.ts).
  Future<Map<String, dynamic>?> listCollaborators(String wishlistId) async {
    try {
      return await _functionsService.listCollaborators(wishlistId);
    } catch (e) {
      _setError('Failed to load collaborators: $e');
      return null;
    }
  }

  /// [role] must be 'editor', 'commenter', or 'viewer'. Owner-only.
  Future<bool> inviteCollaborator(
    String wishlistId,
    String email,
    String role,
  ) async {
    _setLoading(true);
    _clearError();

    try {
      await _functionsService.inviteCollaborator(wishlistId, email, role);
      return true;
    } catch (e) {
      _setError('Failed to invite collaborator: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  /// Owner-only.
  Future<bool> updateCollaboratorRole(
    String wishlistId,
    String targetUserId,
    String role,
  ) async {
    try {
      await _functionsService.updateCollaboratorRole(
        wishlistId,
        targetUserId,
        role,
      );
      return true;
    } catch (e) {
      _setError('Failed to update collaborator role: $e');
      return false;
    }
  }

  /// Owner can remove anyone; pass the caller's own uid as [targetUserId]
  /// to leave a wishlist shared with them.
  Future<bool> removeCollaborator(
    String wishlistId,
    String targetUserId,
  ) async {
    try {
      await _functionsService.removeCollaborator(wishlistId, targetUserId);
      _sharedWishlists.removeWhere((w) => w.id == wishlistId);
      notifyListeners();
      return true;
    } catch (e) {
      _setError('Failed to remove collaborator: $e');
      return false;
    }
  }

  /// Owner-only.
  Future<bool> revokePendingInvite(String inviteId) async {
    try {
      await _functionsService.revokePendingInvite(inviteId);
      return true;
    } catch (e) {
      _setError('Failed to revoke invite: $e');
      return false;
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

  Future<FirebaseWishlistItem?> getWishlistItemById(String itemId) async {
    try {
      final index = _currentWishlistItems.indexWhere(
        (item) => item.id == itemId,
      );
      if (index != -1) {
        return _currentWishlistItems[index];
      }

      return await _firestoreService.getWishlistItemById(itemId);
    } catch (e) {
      _setError('Failed to load wishlist item: $e');
      return null;
    }
  }

  // Add item to wishlist.
  //
  // Routed through FirebaseFunctionsService (the api HTTP router), NOT
  // FirebaseFirestoreService's direct Firestore write — the backend's
  // collaborator role checks (owner/editor/commenter/viewer) only apply to
  // requests that go through the callable, so a direct Firestore write
  // would let even a 'viewer' collaborator add items. See "Shared with Me".
  Future<bool> addWishlistItem({
    required String name,
    required String wishlistId,
    required String userId,
    String? description,
    double? price,
    String currency = 'USD',
    String? url,
    String? imageUrl,
    String? store,
    List<String> tags = const [],
    Priority priority = Priority.medium,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      final result = await _functionsService.addWishlistItem({
        'wishlistId': wishlistId,
        'title': name,
        'description': description,
        'price': price,
        'currency': currency,
        'productUrl': url,
        'imageUrl': imageUrl,
        'store': store,
        'tags': tags,
        'priority': priority.name,
      });
      final createdItem = FirebaseWishlistItem.fromFirestore(
        (result['id'] as String?) ?? '',
        result,
      );
      if (createdItem.id.isNotEmpty) {
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

  // Update wishlist item. See addWishlistItem's doc comment — routed
  // through the backend for the same collaborator-role-enforcement reason.
  Future<bool> updateWishlistItem(FirebaseWishlistItem item) async {
    _setLoading(true);
    _clearError();

    try {
      final result = await _functionsService.updateWishlistItem(item.id, {
        'title': item.name,
        'description': item.description,
        'price': item.price,
        'currency': item.currency,
        'productUrl': item.url,
        'imageUrl': item.imageUrl,
        'store': item.store,
        'tags': item.tags,
        'priority': item.priority.name,
      });
      final updatedItem = FirebaseWishlistItem.fromFirestore(item.id, result);
      if (_currentWishlistId == updatedItem.wishlistId) {
        _updateItemInCurrentList(updatedItem);
      }
      return true;
    } catch (e) {
      _setError('Failed to update item: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Delete wishlist item. See addWishlistItem's doc comment.
  Future<bool> deleteWishlistItem(String itemId, String wishlistId) async {
    _setLoading(true);
    _clearError();

    try {
      await _functionsService.deleteWishlistItem(itemId);
      if (_currentWishlistId == wishlistId) {
        _removeItemFromCurrentList(itemId);
      }
      return true;
    } catch (e) {
      _setError('Failed to delete item: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Mark item as purchased. Uses the dedicated purchaseWishlistItem
  // endpoint (not a generic update) — matches web's design and avoids a
  // client being able to set arbitrary fields (like purchasedBy for
  // someone else) via a generic update path. [purchasedBy] is accepted for
  // API-shape compatibility with existing callers but the backend always
  // attributes the purchase to the authenticated caller, not this value.
  Future<bool> markItemAsPurchased(String itemId, String purchasedBy) async {
    _setLoading(true);
    _clearError();

    try {
      final result = await _functionsService.purchaseWishlistItem(itemId);
      final updatedItem = FirebaseWishlistItem.fromFirestore(itemId, result);
      if (_currentWishlistId == updatedItem.wishlistId) {
        _updateItemInCurrentList(updatedItem);
      }
      return true;
    } catch (e) {
      _setError('Failed to mark item as purchased: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Reserve an item (a soft hold, distinct from purchase). Uses the
  // dedicated reserveWishlistItem endpoint -- like purchase, the backend
  // always attributes the reservation to the authenticated caller.
  Future<bool> reserveItem(String itemId) async {
    _setLoading(true);
    _clearError();

    try {
      final result = await _functionsService.reserveWishlistItem(itemId);
      final updatedItem = FirebaseWishlistItem.fromFirestore(itemId, result);
      if (_currentWishlistId == updatedItem.wishlistId) {
        _updateItemInCurrentList(updatedItem);
      }
      return true;
    } catch (e) {
      _setError('Failed to reserve item: $e');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  // Release a reservation. There's no dedicated endpoint (web is
  // reserve-only), so this clears the field via the generic update path --
  // which the backend only allows for owner/editor collaborators.
  Future<bool> unreserveItem(String itemId) async {
    _setLoading(true);
    _clearError();

    try {
      final result = await _functionsService.unreserveWishlistItem(itemId);
      final updatedItem = FirebaseWishlistItem.fromFirestore(itemId, result);
      if (_currentWishlistId == updatedItem.wishlistId) {
        _updateItemInCurrentList(updatedItem);
      }
      return true;
    } catch (e) {
      _setError('Failed to release reservation: $e');
      return false;
    } finally {
      _setLoading(false);
    }
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

      if (success) {
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

  // Mark all of a user's notifications as read. Doesn't touch the local
  // _notifications cache (unlike markNotificationAsRead above) — the
  // notifications screen renders from getNotificationsStream, which picks
  // up the Firestore batch update in real time regardless.
  Future<bool> markAllNotificationsAsRead(String userId) async {
    try {
      return await _firestoreService.markAllNotificationsAsRead(userId);
    } catch (e) {
      _setError('Failed to mark all notifications as read: $e');
      return false;
    }
  }

  Future<bool> deleteNotification(String notificationId) async {
    try {
      return await _firestoreService.deleteNotification(notificationId);
    } catch (e) {
      _setError('Failed to delete notification: $e');
      return false;
    }
  }

  // Private helper methods
  void _setWishlists(List<FirebaseWishlist> wishlists) {
    _wishlists.clear();
    _wishlists.addAll(wishlists);
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
    _currentWishlistItems.clear();
    _currentWishlistItems.addAll(items);
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
    _notifications.clear();
    _notifications.addAll(notifications);
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
