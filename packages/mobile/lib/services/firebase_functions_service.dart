import 'package:cloud_functions/cloud_functions.dart';
import 'package:logging/logging.dart';
import 'firebase_initialization_service.dart';

class FirebaseFunctionsService {
  static final FirebaseFunctionsService _instance =
      FirebaseFunctionsService._internal();
  factory FirebaseFunctionsService() => _instance;
  FirebaseFunctionsService._internal();

  final FirebaseInitializationService _firebaseInit =
      FirebaseInitializationService();
  FirebaseFunctions? _functions;
  final Logger _logger = Logger('FirebaseFunctionsService');

  Future<bool> _ensureFirebaseInitialized() async {
    if (_functions != null) return true;

    final initialized = await _firebaseInit.initialize();
    if (initialized) {
      try {
        _functions = FirebaseFunctions.instance;
        return true;
      } catch (e) {
        _logger.severe('Error accessing Firebase Functions: $e');
        return false;
      }
    }
    return false;
  }

  // =============================================================================
  // AUTHENTICATION FUNCTIONS
  // =============================================================================

  Future<Map<String, dynamic>> createUserProfile(
    Map<String, dynamic> data,
  ) async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      final result = await _functions!
          .httpsCallable('createUserProfile')
          .call(data);
      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      _logger.severe('Error calling createUserProfile: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getUserProfile(String userId) async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      final result = await _functions!.httpsCallable('getUserProfile').call({
        'userId': userId,
      });
      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      _logger.severe('Error calling getUserProfile: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> updateUserProfile(
    String userId,
    Map<String, dynamic> data,
  ) async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      final updateData = {'userId': userId, ...data};
      final result = await _functions!
          .httpsCallable('updateUserProfile')
          .call(updateData);
      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      _logger.severe('Error calling updateUserProfile: $e');
      rethrow;
    }
  }

  // =============================================================================
  // WISHLIST FUNCTIONS
  // =============================================================================

  Future<Map<String, dynamic>> createWishlist(Map<String, dynamic> data) async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      final result = await _functions!
          .httpsCallable('createWishlist')
          .call(data);
      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      _logger.severe('Error calling createWishlist: $e');
      rethrow;
    }
  }

  Future<List<dynamic>> getUserWishlists(String userId) async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      final result = await _functions!.httpsCallable('getUserWishlists').call({
        'userId': userId,
      });
      return List<dynamic>.from(result.data);
    } catch (e) {
      _logger.severe('Error calling getUserWishlists: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getWishlist(String wishlistId) async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      final result = await _functions!.httpsCallable('getWishlist').call({
        'wishlistId': wishlistId,
      });
      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      _logger.severe('Error calling getWishlist: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> updateWishlist(
    String wishlistId,
    Map<String, dynamic> data,
  ) async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      final updateData = {'wishlistId': wishlistId, ...data};
      final result = await _functions!
          .httpsCallable('updateWishlist')
          .call(updateData);
      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      _logger.severe('Error calling updateWishlist: $e');
      rethrow;
    }
  }

  Future<void> deleteWishlist(String wishlistId) async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      await _functions!.httpsCallable('deleteWishlist').call({
        'wishlistId': wishlistId,
      });
    } catch (e) {
      _logger.severe('Error calling deleteWishlist: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> addWishlistItem(
    String wishlistId,
    Map<String, dynamic> itemData,
  ) async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      final data = {'wishlistId': wishlistId, ...itemData};
      final result = await _functions!
          .httpsCallable('addWishlistItem')
          .call(data);
      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      _logger.severe('Error calling addWishlistItem: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> updateWishlistItem(
    String itemId,
    Map<String, dynamic> itemData,
  ) async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      final data = {'itemId': itemId, ...itemData};
      final result = await _functions!
          .httpsCallable('updateWishlistItem')
          .call(data);
      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      _logger.severe('Error calling updateWishlistItem: $e');
      rethrow;
    }
  }

  Future<void> deleteWishlistItem(String itemId) async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      await _functions!.httpsCallable('deleteWishlistItem').call({
        'itemId': itemId,
      });
    } catch (e) {
      _logger.severe('Error calling deleteWishlistItem: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> purchaseWishlistItem(
    String itemId,
    Map<String, dynamic> purchaseData,
  ) async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      final data = {'itemId': itemId, ...purchaseData};
      final result = await _functions!
          .httpsCallable('purchaseWishlistItem')
          .call(data);
      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      _logger.severe('Error calling purchaseWishlistItem: $e');
      rethrow;
    }
  }

  // =============================================================================
  // GENERIC CRUD FUNCTIONS
  // =============================================================================

  Future<Map<String, dynamic>> createDocument(
    String collection,
    Map<String, dynamic> data,
  ) async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      final result = await _functions!.httpsCallable('createDocument').call({
        'collection': collection,
        'data': data,
      });
      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      _logger.severe('Error calling createDocument: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getDocument(
    String collection,
    String documentId,
  ) async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      final result = await _functions!.httpsCallable('getDocument').call({
        'collection': collection,
        'documentId': documentId,
      });
      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      _logger.severe('Error calling getDocument: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> updateDocument(
    String collection,
    String documentId,
    Map<String, dynamic> data,
  ) async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      final result = await _functions!.httpsCallable('updateDocument').call({
        'collection': collection,
        'documentId': documentId,
        'data': data,
      });
      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      _logger.severe('Error calling updateDocument: $e');
      rethrow;
    }
  }

  Future<void> deleteDocument(String collection, String documentId) async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      await _functions!.httpsCallable('deleteDocument').call({
        'collection': collection,
        'documentId': documentId,
      });
    } catch (e) {
      _logger.severe('Error calling deleteDocument: $e');
      rethrow;
    }
  }

  Future<List<dynamic>> listDocuments(
    String collection, {
    Map<String, dynamic>? filters,
  }) async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      final Map<String, dynamic> data = {'collection': collection};
      if (filters != null) {
        data['filters'] = filters;
      }
      final result = await _functions!
          .httpsCallable('listDocuments')
          .call(data);
      return List<dynamic>.from(result.data);
    } catch (e) {
      _logger.severe('Error calling listDocuments: $e');
      rethrow;
    }
  }

  // =============================================================================
  // SUBSCRIPTION FUNCTIONS
  // =============================================================================

  Future<Map<String, dynamic>> billingStatus() async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      final result = await _functions!
          .httpsCallable('billingStatus')
          .call(<String, dynamic>{});
      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      _logger.severe('Error calling billingStatus: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> billingPlans() async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      final result = await _functions!
          .httpsCallable('billingPlans')
          .call(<String, dynamic>{});
      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      _logger.severe('Error calling billingPlans: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> billingCheckout(
    String tier,
    String billingCycle,
  ) async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      final result = await _functions!.httpsCallable('billingCheckout').call({
        'tier': tier,
        'billingCycle': billingCycle,
      });
      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      _logger.severe('Error calling billingCheckout: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> billingPortal() async {
    if (!await _ensureFirebaseInitialized()) {
      throw Exception('Firebase not initialized');
    }

    try {
      final result = await _functions!
          .httpsCallable('billingPortal')
          .call(<String, dynamic>{});
      return Map<String, dynamic>.from(result.data);
    } catch (e) {
      _logger.severe('Error calling billingPortal: $e');
      rethrow;
    }
  }
}
