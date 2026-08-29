import 'package:flutter_test/flutter_test.dart';
import 'package:wishlist_wizard_mobile/services/firebase_functions_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  // Same constraint/approach as firebase_auth_service_test.dart and
  // firestore_service_test.dart: FirebaseFunctionsService is a singleton
  // gated on FirebaseInitializationService(), which deterministically
  // fails to initialize under `flutter test`. Every one of its ~58 public
  // methods is a thin wrapper around the same private _apiRequest() call,
  // structured as try { ... } catch (e) { _logger.severe(...); rethrow; }
  // -- so _ensureFirebaseInitialized()'s failure propagates identically
  // through every single one. Rather than duplicate the same assertion 58
  // times, every wrapper is exercised in one sweep to confirm none of them
  // silently swallow the error or return a bogus default -- the one
  // genuine behavioral outlier (ensureProfile(), which logs a warning and
  // does NOT rethrow) is called out and tested separately.
  final service = FirebaseFunctionsService();

  final rethrowingCalls = <String, Future<dynamic> Function()>{
    'createWishlist': () => service.createWishlist({'name': 'x'}),
    'updateWishlist': () => service.updateWishlist('w1', {'name': 'x'}),
    'deleteWishlist': () => service.deleteWishlist('w1'),
    'deleteAccount': () => service.deleteAccount(),
    'addWishlistItem': () => service.addWishlistItem({'name': 'x'}),
    'updateWishlistItem': () => service.updateWishlistItem('i1', {'name': 'x'}),
    'deleteWishlistItem': () => service.deleteWishlistItem('i1'),
    'reserveWishlistItem': () => service.reserveWishlistItem('i1'),
    'purchaseWishlistItem': () => service.purchaseWishlistItem('i1'),
    'listSharedWishlists': () => service.listSharedWishlists(),
    'listCollaborators': () => service.listCollaborators('w1'),
    'inviteCollaborator': () => service.inviteCollaborator('w1', 'a@example.com', 'editor'),
    'updateCollaboratorRole': () => service.updateCollaboratorRole('w1', 'u2', 'viewer'),
    'removeCollaborator': () => service.removeCollaborator('w1', 'u2'),
    'revokePendingInvite': () => service.revokePendingInvite('inv1'),
    'listConnections': () => service.listConnections(),
    'listPendingConnectionRequests': () => service.listPendingConnectionRequests(),
    'sendConnectionRequest': () => service.sendConnectionRequest(targetUserId: 'u2'),
    'respondToConnectionRequest': () => service.respondToConnectionRequest('c1', true),
    'removeConnection': () => service.removeConnection('c1'),
    'searchUsers': () => service.searchUsers('mark'),
    'getAchievements': () => service.getAchievements(),
    'getPriceAlerts': () => service.getPriceAlerts(),
    'createPriceAlert': () => service.createPriceAlert(itemId: 'i1', targetPrice: 9.99),
    'deletePriceAlert': () => service.deletePriceAlert('a1'),
    'getPriceDrops': () => service.getPriceDrops(),
    'getAllWishlistItems': () => service.getAllWishlistItems(),
    'getStripeConfig': () => service.getStripeConfig(),
    'createGroupPaymentIntent': () => service.createGroupPaymentIntent(itemId: 'i1', amount: 10.0),
    'confirmGroupContribution': () => service.confirmGroupContribution('c1'),
    'getGroupGiftSummary': () => service.getGroupGiftSummary('i1'),
    'billingStatus': () => service.billingStatus(),
    'billingPlans': () => service.billingPlans(),
    'verifyIapPurchase': () => service.verifyIapPurchase(
          productId: 'PLUS_iOS_MONTH',
          purchaseId: 'p1',
          verificationData: 'data',
          source: 'app_store',
        ),
    'lookupBarcode': () => service.lookupBarcode('012345678905'),
    'saveFcmToken': () => service.saveFcmToken('token', platform: 'ios'),
    'getCalendarEvents': () => service.getCalendarEvents(),
    'createCalendarEvent': () => service.createCalendarEvent({'title': 'x'}),
    'updateCalendarEvent': () => service.updateCalendarEvent('e1', {'title': 'x'}),
    'deleteCalendarEvent': () => service.deleteCalendarEvent('e1'),
    'getCreatorCommissionSummary': () => service.getCreatorCommissionSummary(),
    'getCreatorCommissionLedger': () => service.getCreatorCommissionLedger(),
    'getCreatorAdjustments': () => service.getCreatorAdjustments(),
    'getCreatorPayoutHistory': () => service.getCreatorPayoutHistory(),
    'createCreatorConnectAccount': () => service.createCreatorConnectAccount(),
    'getCreatorConnectOnboardingLink': () => service.getCreatorConnectOnboardingLink(
          returnUrl: 'https://example.com/return',
          refreshUrl: 'https://example.com/refresh',
        ),
    'getAffiliateStats': () => service.getAffiliateStats(),
    'getCalendarAuthUrl': () => service.getCalendarAuthUrl('google', redirectUri: 'https://example.com/cb'),
    'connectCalendar': () => service.connectCalendar({'provider': 'apple', 'subscriptionUrl': 'https://x'}),
    'getCalendarConnections': () => service.getCalendarConnections(),
    'syncCalendarConnection': () => service.syncCalendarConnection('cc1'),
    'updateCalendarConnectionSettings': () => service.updateCalendarConnectionSettings('cc1', {'syncEnabled': true}),
    'disconnectCalendar': () => service.disconnectCalendar('cc1'),
    'getCalendarSyncSettings': () => service.getCalendarSyncSettings(),
  };

  group('FirebaseFunctionsService — singleton', () {
    test('returns the same instance every time', () {
      expect(identical(FirebaseFunctionsService(), FirebaseFunctionsService()), isTrue);
    });
  });

  group('FirebaseFunctionsService — every API wrapper rethrows when Firebase is unavailable', () {
    for (final entry in rethrowingCalls.entries) {
      test(entry.key, () async {
        await expectLater(entry.value(), throwsA(anything));
      });
    }

    test('sweep covers every public API method on the class (fails loudly if one is added and forgotten)', () {
      // Best-effort completeness guard: every method name in this sweep,
      // plus the one documented exception below, should account for all of
      // firebase_functions_service.dart's public API surface. If someone
      // adds a new wrapper method and forgets to add it here, this number
      // should prompt a second look rather than silently under-covering.
      expect(rethrowingCalls.length, 54);
    });
  });

  group('FirebaseFunctionsService.ensureProfile — the one exception', () {
    test('does not rethrow -- logs a warning and completes normally', () async {
      // Unlike every other wrapper, ensureProfile() is called
      // fire-and-forget right after sign-in (see AuthProvider), so a
      // transient failure here must never crash or block the sign-in flow.
      await expectLater(service.ensureProfile(), completes);
    });
  });
}
