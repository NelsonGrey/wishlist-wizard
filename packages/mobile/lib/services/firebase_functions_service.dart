import 'dart:convert';

import 'package:firebase_app_check/firebase_app_check.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:http/http.dart' as http;
import 'package:logging/logging.dart';

import '../firebase_options.dart';
import 'firebase_initialization_service.dart';

/// Calls the `api` Cloud Function (packages/functions/src/api/router.ts)
/// over plain authenticated HTTP instead of the Firebase Functions SDK.
///
/// A Domain Restricted Sharing org policy blocks granting new `allUsers`
/// Cloud Run invoker bindings, so standalone onCall functions return a
/// bare infra-level 403 before ever reaching app code. `api` is the one
/// Cloud Function with a grandfathered invoker binding from before the
/// policy took effect, so every request goes through it — mirroring
/// packages/web/client-src/lib/queryClient.ts's apiRequest().
class FirebaseFunctionsService {
  static final FirebaseFunctionsService _instance =
      FirebaseFunctionsService._internal();
  factory FirebaseFunctionsService() => _instance;
  FirebaseFunctionsService._internal();

  final FirebaseInitializationService _firebaseInit =
      FirebaseInitializationService();
  final Logger _logger = Logger('FirebaseFunctionsService');

  Future<void> _ensureFirebaseInitialized() async {
    if (!await _firebaseInit.initialize()) {
      throw Exception('Firebase not initialized');
    }
  }

  String get _apiBaseUrl =>
      'https://${DefaultFirebaseOptions.currentPlatform.projectId}.web.app/api';

  Future<Map<String, String>> _buildHeaders({bool hasBody = false}) async {
    final user = firebase_auth.FirebaseAuth.instance.currentUser;
    if (user == null) {
      throw Exception('Not signed in');
    }
    final idToken = await user.getIdToken(true);

    final headers = <String, String>{'Authorization': 'Bearer $idToken'};
    if (hasBody) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      final appCheckToken = await FirebaseAppCheck.instance.getToken();
      if (appCheckToken != null) {
        headers['X-Firebase-AppCheck'] = appCheckToken;
      }
    } catch (e) {
      _logger.warning('Failed to get App Check token: $e');
    }

    return headers;
  }

  Future<dynamic> _apiRequest(
    String method,
    String path, {
    Map<String, dynamic>? body,
  }) async {
    await _ensureFirebaseInitialized();
    final headers = await _buildHeaders(hasBody: body != null);
    final uri = Uri.parse('$_apiBaseUrl$path');
    final encodedBody = body != null ? jsonEncode(body) : null;

    late final http.Response response;
    switch (method) {
      case 'GET':
        response = await http.get(uri, headers: headers);
      case 'POST':
        response = await http.post(uri, headers: headers, body: encodedBody);
      case 'PATCH':
        response = await http.patch(uri, headers: headers, body: encodedBody);
      case 'DELETE':
        response = await http.delete(uri, headers: headers, body: encodedBody);
      default:
        throw ArgumentError('Unsupported method: $method');
    }

    if (response.statusCode < 200 || response.statusCode >= 300) {
      throw Exception(
        'API request to $path failed (${response.statusCode}): ${response.body}',
      );
    }

    if (response.body.isEmpty) return null;
    return jsonDecode(response.body);
  }

  // =============================================================================
  // WISHLIST FUNCTIONS
  // =============================================================================

  Future<Map<String, dynamic>> createWishlist(Map<String, dynamic> data) async {
    try {
      final result = await _apiRequest('POST', '/wishlists', body: data);
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling createWishlist: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> updateWishlist(
    String wishlistId,
    Map<String, dynamic> data,
  ) async {
    try {
      final result = await _apiRequest(
        'PATCH',
        '/wishlists/$wishlistId',
        body: data,
      );
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling updateWishlist: $e');
      rethrow;
    }
  }

  Future<void> deleteWishlist(String wishlistId) async {
    try {
      await _apiRequest('DELETE', '/wishlists/$wishlistId');
    } catch (e) {
      _logger.severe('Error calling deleteWishlist: $e');
      rethrow;
    }
  }

  Future<void> deleteAccount() async {
    try {
      await _apiRequest('DELETE', '/account');
    } catch (e) {
      _logger.severe('Error calling deleteAccount: $e');
      rethrow;
    }
  }

  // =============================================================================
  // USER PROFILE
  // =============================================================================

  /// Idempotent — no-ops if a users/{uid} profile doc already exists. Call
  /// after every sign-in (new account or returning), same as web's
  /// AuthContext.ensureProfileExists.
  Future<void> ensureProfile() async {
    try {
      await _apiRequest('POST', '/profile/ensure');
    } catch (e) {
      _logger.warning('Error calling ensureProfile: $e');
    }
  }

  // =============================================================================
  // WISHLIST ITEM MUTATIONS
  //
  // Routed through the api HTTP router (same as createWishlist/updateWishlist
  // above) rather than direct Firestore writes via FirebaseFirestoreService.
  // This is required, not just a style choice: the backend's collaborator
  // role checks (owner/editor/commenter/viewer) only apply to requests that
  // go through these callables — a direct Firestore write from the client
  // bypasses them entirely. See the "Shared with Me" feature notes.
  // =============================================================================

  Future<Map<String, dynamic>> addWishlistItem(
    Map<String, dynamic> data,
  ) async {
    try {
      final result = await _apiRequest('POST', '/items', body: data);
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling addWishlistItem: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> updateWishlistItem(
    String itemId,
    Map<String, dynamic> updates,
  ) async {
    try {
      final result = await _apiRequest(
        'PATCH',
        '/items/$itemId',
        body: updates,
      );
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling updateWishlistItem: $e');
      rethrow;
    }
  }

  Future<void> deleteWishlistItem(String itemId) async {
    try {
      await _apiRequest('DELETE', '/items/$itemId');
    } catch (e) {
      _logger.severe('Error calling deleteWishlistItem: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> reserveWishlistItem(String itemId) async {
    try {
      final result = await _apiRequest('POST', '/items/$itemId/reserve');
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling reserveWishlistItem: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> purchaseWishlistItem(String itemId) async {
    try {
      final result = await _apiRequest('POST', '/items/$itemId/purchase');
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling purchaseWishlistItem: $e');
      rethrow;
    }
  }

  // =============================================================================
  // COLLABORATION FUNCTIONS ("Shared with Me")
  // =============================================================================

  Future<List<Map<String, dynamic>>> listSharedWishlists() async {
    try {
      final result = await _apiRequest('GET', '/wishlists/shared-with-me');
      return List<Map<String, dynamic>>.from(
        (result as List).map((item) => Map<String, dynamic>.from(item as Map)),
      );
    } catch (e) {
      _logger.severe('Error calling listSharedWishlists: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> listCollaborators(String wishlistId) async {
    try {
      final result = await _apiRequest(
        'GET',
        '/wishlists/$wishlistId/collaborators',
      );
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling listCollaborators: $e');
      rethrow;
    }
  }

  /// [role] must be one of 'editor', 'commenter', 'viewer'.
  Future<Map<String, dynamic>> inviteCollaborator(
    String wishlistId,
    String email,
    String role,
  ) async {
    try {
      final result = await _apiRequest(
        'POST',
        '/wishlists/$wishlistId/collaborators/invite',
        body: {'email': email, 'role': role},
      );
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling inviteCollaborator: $e');
      rethrow;
    }
  }

  Future<void> updateCollaboratorRole(
    String wishlistId,
    String targetUserId,
    String role,
  ) async {
    try {
      await _apiRequest(
        'PATCH',
        '/wishlists/$wishlistId/collaborators/$targetUserId',
        body: {'role': role},
      );
    } catch (e) {
      _logger.severe('Error calling updateCollaboratorRole: $e');
      rethrow;
    }
  }

  /// Also used for "leave this wishlist" when [targetUserId] is the caller's
  /// own uid.
  Future<void> removeCollaborator(
    String wishlistId,
    String targetUserId,
  ) async {
    try {
      await _apiRequest(
        'DELETE',
        '/wishlists/$wishlistId/collaborators/$targetUserId',
      );
    } catch (e) {
      _logger.severe('Error calling removeCollaborator: $e');
      rethrow;
    }
  }

  Future<void> revokePendingInvite(String inviteId) async {
    try {
      await _apiRequest('DELETE', '/invites/$inviteId');
    } catch (e) {
      _logger.severe('Error calling revokePendingInvite: $e');
      rethrow;
    }
  }

  // =============================================================================
  // CONNECTIONS (friends/social graph — see
  // packages/functions/src/api/connections.ts)
  // =============================================================================

  Future<List<Map<String, dynamic>>> listConnections() async {
    try {
      final result = await _apiRequest('GET', '/connections');
      final connections = (result as Map)['connections'] as List;
      return List<Map<String, dynamic>>.from(
        connections.map((item) => Map<String, dynamic>.from(item as Map)),
      );
    } catch (e) {
      _logger.severe('Error calling listConnections: $e');
      rethrow;
    }
  }

  /// Returns `{incoming: [...], outgoing: [...]}`, both lists of
  /// `{connectionId, user}` — same shape as listConnections' entries.
  Future<Map<String, dynamic>> listPendingConnectionRequests() async {
    try {
      final result = await _apiRequest('GET', '/connections/pending');
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling listPendingConnectionRequests: $e');
      rethrow;
    }
  }

  /// Exactly one of [targetUserId] or [email] must be set — mirrors
  /// sendConnectionRequest's dual-path shape. Returns `{status: 'active' |
  /// 'pending'}`.
  Future<Map<String, dynamic>> sendConnectionRequest({
    String? targetUserId,
    String? email,
  }) async {
    try {
      final result = await _apiRequest(
        'POST',
        '/connections/request',
        body: targetUserId != null
            ? {'targetUserId': targetUserId}
            : {'email': email},
      );
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling sendConnectionRequest: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> respondToConnectionRequest(
    String connectionId,
    bool accept,
  ) async {
    try {
      final result = await _apiRequest(
        'POST',
        '/connections/$connectionId/respond',
        body: {'accept': accept},
      );
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling respondToConnectionRequest: $e');
      rethrow;
    }
  }

  Future<void> removeConnection(String connectionId) async {
    try {
      await _apiRequest('DELETE', '/connections/$connectionId');
    } catch (e) {
      _logger.severe('Error calling removeConnection: $e');
      rethrow;
    }
  }

  Future<List<Map<String, dynamic>>> searchUsers(String query) async {
    try {
      final result = await _apiRequest(
        'GET',
        '/users/search?q=${Uri.encodeComponent(query)}',
      );
      final users = (result as Map)['users'] as List;
      return List<Map<String, dynamic>>.from(
        users.map((item) => Map<String, dynamic>.from(item as Map)),
      );
    } catch (e) {
      _logger.severe('Error calling searchUsers: $e');
      rethrow;
    }
  }

  // =============================================================================
  // ACHIEVEMENTS (computed-on-read — see
  // packages/functions/src/api/achievements.ts)
  // =============================================================================

  /// Returns `{achievements: {<id>: {earned, tier, count}}, computedAt}`.
  Future<Map<String, dynamic>> getAchievements() async {
    try {
      final result = await _apiRequest('GET', '/achievements');
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling getAchievements: $e');
      rethrow;
    }
  }

  // =============================================================================
  // PRICE TRACKING (see packages/functions/src/api/router.ts's
  // /api/price-alerts, /api/price-drops, /api/wishlist-items routes)
  // =============================================================================

  /// Each entry: `{id, itemId, targetPrice, currentPrice, createdAt, status,
  /// notified, item: {title, price, imageUrl, store}}`.
  Future<List<Map<String, dynamic>>> getPriceAlerts() async {
    try {
      final result = await _apiRequest('GET', '/price-alerts');
      return List<Map<String, dynamic>>.from(
        (result as List).map((item) => Map<String, dynamic>.from(item as Map)),
      );
    } catch (e) {
      _logger.severe('Error calling getPriceAlerts: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> createPriceAlert({
    required String itemId,
    required double targetPrice,
  }) async {
    try {
      final result = await _apiRequest(
        'POST',
        '/price-alerts',
        body: {'itemId': itemId, 'targetPrice': targetPrice},
      );
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling createPriceAlert: $e');
      rethrow;
    }
  }

  Future<void> deletePriceAlert(String alertId) async {
    try {
      await _apiRequest('DELETE', '/price-alerts/$alertId');
    } catch (e) {
      _logger.severe('Error calling deletePriceAlert: $e');
      rethrow;
    }
  }

  /// Wishlist items with a significant recent price reduction. Each entry:
  /// `{id, title, imageUrl, price, currentPrice, previousPrice,
  /// dropPercentage, percentDrop, store}`.
  Future<List<Map<String, dynamic>>> getPriceDrops() async {
    try {
      final result = await _apiRequest('GET', '/price-drops');
      return List<Map<String, dynamic>>.from(
        (result as List).map((item) => Map<String, dynamic>.from(item as Map)),
      );
    } catch (e) {
      _logger.severe('Error calling getPriceDrops: $e');
      rethrow;
    }
  }

  /// Flat list of every item across the caller's wishlists — used to pick a
  /// target item when creating a price alert. Each entry: `{id, title,
  /// price, store, imageUrl, isRetailerSpecific}`.
  Future<List<Map<String, dynamic>>> getAllWishlistItems() async {
    try {
      final result = await _apiRequest('GET', '/wishlist-items');
      return List<Map<String, dynamic>>.from(
        (result as List).map((item) => Map<String, dynamic>.from(item as Map)),
      );
    } catch (e) {
      _logger.severe('Error calling getAllWishlistItems: $e');
      rethrow;
    }
  }

  // =============================================================================
  // SUBSCRIPTION FUNCTIONS
  // =============================================================================

  Future<Map<String, dynamic>> billingStatus() async {
    try {
      final result = await _apiRequest('GET', '/billing/status');
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling billingStatus: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> billingPlans() async {
    try {
      final result = await _apiRequest('GET', '/billing/plans');
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling billingPlans: $e');
      rethrow;
    }
  }

  /// Verifies a native StoreKit/Play Billing purchase server-side and
  /// updates the user's subscription tier. See packages/functions/src/api/iap.ts.
  Future<Map<String, dynamic>> verifyIapPurchase({
    required String productId,
    required String? purchaseId,
    required String verificationData,
    required String source,
  }) async {
    try {
      final result = await _apiRequest(
        'POST',
        '/billing/verify-purchase',
        body: {
          'productId': productId,
          'purchaseId': purchaseId,
          'verificationData': verificationData,
          'source': source,
        },
      );
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling verifyIapPurchase: $e');
      rethrow;
    }
  }

  // =============================================================================
  // MOBILE HELPERS
  // =============================================================================

  /// Looks up a scanned/entered barcode via packages/functions/src/api/mobile.ts.
  /// Returns `{found: false}` when the barcode isn't recognized, or
  /// `{found: true, product: {title, price, store}}` on a match.
  Future<Map<String, dynamic>> lookupBarcode(String barcode) async {
    try {
      final result = await _apiRequest(
        'GET',
        '/mobile/barcode/${Uri.encodeComponent(barcode)}',
      );
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling lookupBarcode: $e');
      rethrow;
    }
  }

  // =============================================================================
  // NOTIFICATION FUNCTIONS
  // =============================================================================

  Future<void> saveFcmToken(String token, {required String platform}) async {
    try {
      await _apiRequest(
        'POST',
        '/fcm/token',
        body: {'token': token, 'platform': platform},
      );
    } catch (e) {
      _logger.severe('Error calling saveFCMToken: $e');
      rethrow;
    }
  }
}
