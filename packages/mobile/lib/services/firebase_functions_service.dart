import 'dart:convert';

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
    // Not forcing a refresh — the SDK already caches the current token and
    // proactively refreshes it before real expiry. Forcing one on every
    // call (the previous behavior) meant concurrent requests each fired
    // their own forced-refresh, and the web app's equivalent code hit real
    // 401s from freshly-minted tokens racing the backend's verification —
    // see packages/web/client-src/lib/queryClient.ts's getAuthToken().
    final idToken = await user.getIdToken();

    final headers = <String, String>{'Authorization': 'Bearer $idToken'};
    if (hasBody) {
      headers['Content-Type'] = 'application/json';
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

  /// GDPR/CCPA data export — returns the full account payload
  /// (`exportMyData`, packages/functions/src/api/userProfile.ts).
  Future<Map<String, dynamic>> exportMyData() async {
    try {
      final result = await _apiRequest('POST', '/account/export');
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling exportMyData: $e');
      rethrow;
    }
  }

  /// Revokes every refresh token for the account, signing the user out of
  /// all other devices (`revokeAllSessions`).
  Future<void> revokeAllSessions() async {
    try {
      await _apiRequest('POST', '/account/revoke-sessions');
    } catch (e) {
      _logger.severe('Error calling revokeAllSessions: $e');
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

  /// Full user profile (`GET /api/profile` -> `getMyProfile`): displayName,
  /// photoURL, bio, location, interests[], favoriteStores[],
  /// giftPreferences{sizes:map, categories:[]}.
  Future<Map<String, dynamic>> getMyProfile() async {
    try {
      final result = await _apiRequest('GET', '/profile');
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling getMyProfile: $e');
      rethrow;
    }
  }

  /// Patch the user profile (`PATCH /api/profile` -> `updateMyProfile`).
  /// Accepts any subset of the profile fields above.
  Future<Map<String, dynamic>> updateMyProfile(
    Map<String, dynamic> updates,
  ) async {
    try {
      final result = await _apiRequest('PATCH', '/profile', body: updates);
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling updateMyProfile: $e');
      rethrow;
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

  /// Release a reservation. No dedicated endpoint exists (the backend's
  /// reserve is one-way), so this clears the reservation fields through the
  /// generic item-update route -- which the backend only permits for
  /// owner/editor collaborators.
  Future<Map<String, dynamic>> unreserveWishlistItem(String itemId) async {
    try {
      final result = await _apiRequest(
        'PATCH',
        '/items/$itemId',
        body: {'reservedByUserId': null, 'reservedBy': null},
      );
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling unreserveWishlistItem: $e');
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

  /// Read-only public view of a wishlist by its share id
  /// (`GET /api/shared/:shareId` -> `getSharedWishlist`), honouring privacy.
  /// Returns `{ wishlist: {...}, items: [...] }`.
  Future<Map<String, dynamic>> getSharedWishlist(String shareId) async {
    try {
      final result = await _apiRequest('GET', '/shared/$shareId');
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling getSharedWishlist: $e');
      rethrow;
    }
  }

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
  // GROUP GIFTING (real Stripe card payments -- see
  // packages/functions/src/api/groupPayments.ts)
  // =============================================================================

  /// Returns `{publishableKey: string | null}` -- null when Stripe isn't
  /// configured for this environment.
  Future<Map<String, dynamic>> getStripeConfig() async {
    try {
      final result = await _apiRequest('GET', '/billing/stripe-config');
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling getStripeConfig: $e');
      rethrow;
    }
  }

  /// Returns `{clientSecret, contributionId}`.
  Future<Map<String, dynamic>> createGroupPaymentIntent({
    required String itemId,
    required double amount,
    String message = '',
    bool isAnonymous = false,
  }) async {
    try {
      final result = await _apiRequest(
        'POST',
        '/group-payments/payment-intent',
        body: {
          'itemId': itemId,
          'amount': amount,
          'message': message,
          'isAnonymous': isAnonymous,
        },
      );
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling createGroupPaymentIntent: $e');
      rethrow;
    }
  }

  Future<void> confirmGroupContribution(String contributionId) async {
    try {
      await _apiRequest(
        'POST',
        '/group-payments/confirm',
        body: {'contributionId': contributionId},
      );
    } catch (e) {
      _logger.severe('Error calling confirmGroupContribution: $e');
      rethrow;
    }
  }

  /// Returns `{itemId, targetAmount, totalAmount, participants: [...]}`.
  Future<Map<String, dynamic>> getGroupGiftSummary(String itemId) async {
    try {
      final result = await _apiRequest('GET', '/group-payments/item/$itemId');
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling getGroupGiftSummary: $e');
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

  // =============================================================================
  // CALENDAR (personal events only — see
  // packages/functions/src/api/calendar.ts. External provider sync is a
  // paid web-only feature for now, not ported to mobile.)
  // =============================================================================

  /// Each entry: `{id, title, description, startDate, endDate, allDay,
  /// location, type, recurYearly, reminderDays, beneficiaryId, wishlistId,
  /// color}`, sorted by startDate ascending.
  Future<List<Map<String, dynamic>>> getCalendarEvents() async {
    try {
      final result = await _apiRequest('GET', '/calendar/events');
      return List<Map<String, dynamic>>.from(
        (result as List).map((item) => Map<String, dynamic>.from(item as Map)),
      );
    } catch (e) {
      _logger.severe('Error calling getCalendarEvents: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> createCalendarEvent(
    Map<String, dynamic> fields,
  ) async {
    try {
      final result = await _apiRequest(
        'POST',
        '/calendar/events',
        body: fields,
      );
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling createCalendarEvent: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> updateCalendarEvent(
    String eventId,
    Map<String, dynamic> fields,
  ) async {
    try {
      final result = await _apiRequest(
        'PATCH',
        '/calendar/events/$eventId',
        body: fields,
      );
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling updateCalendarEvent: $e');
      rethrow;
    }
  }

  Future<void> deleteCalendarEvent(String eventId) async {
    try {
      await _apiRequest('DELETE', '/calendar/events/$eventId');
    } catch (e) {
      _logger.severe('Error calling deleteCalendarEvent: $e');
      rethrow;
    }
  }

  // =============================================================================
  // CREATOR DASHBOARD (see packages/functions/src/api/commissionLedger.ts,
  // creatorPayoutAccount.ts, payouts.ts, affiliate.ts. Tier-gated --
  // getCreatorCommissionSummary throws on a 403 for non-creator tiers,
  // same as web's CreatorOverview.tsx.)
  // =============================================================================

  /// `{byState: {<state>: {count, totalUsd}}, payoutReadiness: {...}}`.
  /// Throws (message contains "(403") if the caller isn't on a
  /// creator-enabled tier -- this doubles as the tier-gate check.
  Future<Map<String, dynamic>> getCreatorCommissionSummary() async {
    try {
      final result = await _apiRequest('GET', '/creator/commission-summary');
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling getCreatorCommissionSummary: $e');
      rethrow;
    }
  }

  /// `{entries: [{id, network, networkOrderId, saleAmountUsd,
  /// actualCommissionUsd, netCreatorCommissionUsd, state, createdAt}]}`.
  Future<List<Map<String, dynamic>>> getCreatorCommissionLedger({int limit = 100}) async {
    try {
      final result = await _apiRequest(
        'POST',
        '/creator/commission-ledger',
        body: {'limit': limit},
      );
      final entries = (result as Map)['entries'] as List;
      return List<Map<String, dynamic>>.from(
        entries.map((item) => Map<String, dynamic>.from(item as Map)),
      );
    } catch (e) {
      _logger.severe('Error calling getCreatorCommissionLedger: $e');
      rethrow;
    }
  }

  /// Each entry: `{id, type, amountUsd, reasonCode, reasonNote, createdAt}`.
  Future<List<Map<String, dynamic>>> getCreatorAdjustments() async {
    try {
      final result = await _apiRequest('GET', '/creator/adjustments');
      final adjustments = (result as Map)['adjustments'] as List;
      return List<Map<String, dynamic>>.from(
        adjustments.map((item) => Map<String, dynamic>.from(item as Map)),
      );
    } catch (e) {
      _logger.severe('Error calling getCreatorAdjustments: $e');
      rethrow;
    }
  }

  /// Each entry: `{id, state, totalAmountUsd, periodLabel, createdAt,
  /// completedAt}`.
  Future<List<Map<String, dynamic>>> getCreatorPayoutHistory() async {
    try {
      final result = await _apiRequest('GET', '/creator/payout-history');
      final batches = (result as Map)['batches'] as List;
      return List<Map<String, dynamic>>.from(
        batches.map((item) => Map<String, dynamic>.from(item as Map)),
      );
    } catch (e) {
      _logger.severe('Error calling getCreatorPayoutHistory: $e');
      rethrow;
    }
  }

  Future<void> createCreatorConnectAccount() async {
    try {
      await _apiRequest('POST', '/creator/connect/create');
    } catch (e) {
      _logger.severe('Error calling createCreatorConnectAccount: $e');
      rethrow;
    }
  }

  /// Returns `{url}` -- a Stripe-hosted onboarding link to open externally.
  Future<Map<String, dynamic>> getCreatorConnectOnboardingLink({
    required String returnUrl,
    required String refreshUrl,
  }) async {
    try {
      final result = await _apiRequest(
        'POST',
        '/creator/connect/onboarding-link',
        body: {'returnUrl': returnUrl, 'refreshUrl': refreshUrl},
      );
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling getCreatorConnectOnboardingLink: $e');
      rethrow;
    }
  }

  /// `{stats: {totalClicks, totalConversions, topPrograms: [{program,
  /// clicks, conversions, revenue}]}}`.
  Future<Map<String, dynamic>> getAffiliateStats() async {
    try {
      final result = await _apiRequest('POST', '/affiliate/stats');
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling getAffiliateStats: $e');
      rethrow;
    }
  }

  // =============================================================================
  // CALENDAR CONNECTIONS (external provider sync -- see
  // packages/functions/src/api/calendar.ts. Google/Outlook/Facebook are real
  // OAuth 2.0; Apple is a pasted iCal subscription URL, not OAuth. Tier-gated
  // the same way as Creator Tools -- getCalendarConnections throws on a 403
  // for tiers without calendarEnabled.)
  // =============================================================================

  /// Returns `{url, provider}` for OAuth providers, or `{supported: false,
  /// message}` if that provider's OAuth app isn't configured server-side yet.
  Future<Map<String, dynamic>> getCalendarAuthUrl(
    String provider, {
    required String redirectUri,
  }) async {
    try {
      final result = await _apiRequest(
        'POST',
        '/calendar/auth/$provider',
        body: {'redirectUri': redirectUri},
      );
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling getCalendarAuthUrl: $e');
      rethrow;
    }
  }

  /// `fields` is either `{provider, code, state, redirectUri, displayName}`
  /// (OAuth providers) or `{provider: 'apple', subscriptionUrl, displayName}`.
  Future<Map<String, dynamic>> connectCalendar(
    Map<String, dynamic> fields,
  ) async {
    try {
      final result = await _apiRequest('POST', '/calendar/connect', body: fields);
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling connectCalendar: $e');
      rethrow;
    }
  }

  /// Each entry: `{id, calendarType, displayName, isActive, settings,
  /// hasRefreshToken, lastSyncedAt}` -- tokens are never sent to the client.
  Future<List<Map<String, dynamic>>> getCalendarConnections() async {
    try {
      final result = await _apiRequest('GET', '/calendar/connections');
      return List<Map<String, dynamic>>.from(
        (result as List).map((item) => Map<String, dynamic>.from(item as Map)),
      );
    } catch (e) {
      _logger.severe('Error calling getCalendarConnections: $e');
      rethrow;
    }
  }

  Future<void> syncCalendarConnection(String connectionId) async {
    try {
      await _apiRequest('POST', '/calendar/connections/$connectionId/sync');
    } catch (e) {
      _logger.severe('Error calling syncCalendarConnection: $e');
      rethrow;
    }
  }

  Future<void> updateCalendarConnectionSettings(
    String connectionId,
    Map<String, dynamic> settings,
  ) async {
    try {
      await _apiRequest(
        'POST',
        '/calendar/connections/$connectionId/settings',
        body: {'settings': settings},
      );
    } catch (e) {
      _logger.severe('Error calling updateCalendarConnectionSettings: $e');
      rethrow;
    }
  }

  Future<void> disconnectCalendar(String connectionId) async {
    try {
      await _apiRequest('DELETE', '/calendar/connections/$connectionId');
    } catch (e) {
      _logger.severe('Error calling disconnectCalendar: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> getCalendarSyncSettings() async {
    try {
      final result = await _apiRequest('GET', '/calendar/sync-settings');
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling getCalendarSyncSettings: $e');
      rethrow;
    }
  }

  // =============================================================================
  // PRIVACY DEFAULTS
  // =============================================================================

  /// Account-wide privacy defaults applied to new wishlists/items
  /// (`GET /api/privacy/defaults`): defaultWishlistVisibility,
  /// defaultItemVisibility, allowComments, allowReservations, requireApproval.
  Future<Map<String, dynamic>> getPrivacyDefaults() async {
    try {
      final result = await _apiRequest('GET', '/privacy/defaults');
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling getPrivacyDefaults: $e');
      rethrow;
    }
  }

  Future<Map<String, dynamic>> updatePrivacyDefaults(
    Map<String, dynamic> defaults,
  ) async {
    try {
      final result = await _apiRequest(
        'PUT',
        '/privacy/defaults',
        body: defaults,
      );
      return Map<String, dynamic>.from(result as Map);
    } catch (e) {
      _logger.severe('Error calling updatePrivacyDefaults: $e');
      rethrow;
    }
  }
}
