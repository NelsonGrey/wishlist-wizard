import 'package:flutter_test/flutter_test.dart';
import 'package:wishlist_wizard_mobile/services/iap_service.dart';

void main() {
  // IapService wraps two real platform singletons neither of which this repo
  // has a test double for: in_app_purchase's InAppPurchasePlatform.instance
  // (no official fake shipped, and its abstract surface is large enough that
  // hand-rolling one isn't worth it for this file alone) and
  // FirebaseFunctionsService(), constructed directly rather than injected
  // (unlike AuthProvider/FirebaseWishlistProvider's constructor-DI pattern).
  // So initialize()/purchase()/restorePurchases()/the purchase-stream
  // handling all go untested here. What's covered instead is the service's
  // real, pure business logic: the tier/billingCycle <-> store product ID
  // catalog lookup and the placeholder pricing table, run on whichever
  // platform catalog `Platform.isAndroid` resolves to under the test host
  // (this repo's CI runs `flutter test` on non-Android/non-iOS hosts, which
  // Platform.isAndroid reports as false -- so the iOS catalog is what's
  // actually exercised here).
  final service = IapService();

  group('IapService — initial state', () {
    test('starts unavailable, not loading, no error or verified tier', () {
      expect(service.isAvailable, isFalse);
      expect(service.isLoading, isFalse);
      expect(service.lastError, isNull);
      expect(service.lastVerifiedTier, isNull);
      expect(service.eventId, 0);
    });
  });

  group('IapService.productIdFor', () {
    test('resolves the iOS monthly product ID for a known tier', () {
      expect(service.productIdFor('plus', 'monthly'), 'PLUS_iOS_MONTH');
    });

    test('resolves the iOS annual product ID for a known tier', () {
      expect(service.productIdFor('creator', 'annual'), 'CREATOR_iOS_ANNUAL');
    });

    test('returns null for an unknown tier', () {
      expect(service.productIdFor('nonexistent-tier', 'monthly'), isNull);
    });

    test('returns null for an unknown billing cycle', () {
      expect(service.productIdFor('plus', 'weekly'), isNull);
    });
  });

  group('IapService.priceFor', () {
    test('falls back to the placeholder price when no store product is loaded yet', () {
      // initialize() never ran in this test (it needs a live IAP platform),
      // so _storeProducts stays empty -- priceFor always hits the
      // placeholder-price fallback path.
      expect(service.priceFor('starter', 'monthly'), r'$3.99/mo');
      expect(service.priceFor('business', 'annual'), r'$299.00/yr');
    });

    test('returns an em dash for an unknown tier/cycle combination', () {
      expect(service.priceFor('nonexistent-tier', 'monthly'), '—');
    });
  });

  group('IapService — Coming-Soon tier gating', () {
    test('comingSoonTiers matches shared COMING_SOON_TIERS', () {
      expect(IapService.comingSoonTiers, {'creator', 'business', 'enterprise'});
    });

    test('catalogTiers includes every tier with a store product', () {
      // Creator/Business have iOS/Android products even though they are
      // currently gated — that is what keeps them eligible for the
      // "Coming soon" waitlist row (vs. Enterprise, which has none).
      expect(service.catalogTiers, containsAll(<String>['starter', 'plus', 'creator', 'business']));
      expect(service.catalogTiers, isNot(contains('enterprise')));
    });

    test('purchasableTiers excludes the Coming-Soon tiers', () {
      expect(service.purchasableTiers, contains('starter'));
      expect(service.purchasableTiers, contains('plus'));
      expect(service.purchasableTiers, isNot(contains('creator')));
      expect(service.purchasableTiers, isNot(contains('business')));
    });
  });

  group('IapService.dispose', () {
    test('does not throw when no purchase subscription was ever started', () {
      final freshService = IapService();
      expect(() => freshService.dispose(), returnsNormally);
    });
  });
}
