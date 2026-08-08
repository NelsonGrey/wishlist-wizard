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
