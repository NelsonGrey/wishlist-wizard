import 'dart:async';
import 'dart:io' show Platform;

import 'package:flutter/foundation.dart';
import 'package:in_app_purchase/in_app_purchase.dart' as iap;

import 'firebase_functions_service.dart';

/// Native In-App Purchase handling for subscriptions.
///
/// The web app keeps using Stripe checkout (see subscription_provider.dart's
/// legacy billingCheckout/billingPortal calls, now unused on mobile) — that's
/// a completely separate distribution channel from Apple/Google's
/// perspective. This service exists because App Store/Play Store review
/// guidelines require any subscription purchased *from within* the app
/// binary to go through StoreKit/Play Billing, not an external processor.
class _IapProductSpec {
  final String tier;
  final String billingCycle;
  const _IapProductSpec(this.tier, this.billingCycle);
}

class IapService extends ChangeNotifier {
  static const Map<String, _IapProductSpec> _iosProductCatalog = {
    'STARTER_iOS_MONTH': _IapProductSpec('starter', 'monthly'),
    'STARTER_iOS_ANNUAL': _IapProductSpec('starter', 'annual'),
    'PLUS_iOS_MONTH': _IapProductSpec('plus', 'monthly'),
    'PLUS_iOS_ANNUAL': _IapProductSpec('plus', 'annual'),
    'CREATOR_iOS_MONTH': _IapProductSpec('creator', 'monthly'),
    'CREATOR_iOS_ANNUAL': _IapProductSpec('creator', 'annual'),
    'BUSINESS_iOS_MONTH': _IapProductSpec('business', 'monthly'),
    'BUSINESS_iOS_ANNUAL': _IapProductSpec('business', 'annual'),
  };
  static const Map<String, _IapProductSpec> _androidProductCatalog = {
    'starter_android_month': _IapProductSpec('starter', 'monthly'),
    'starter_android_annual': _IapProductSpec('starter', 'annual'),
    'plus_android_month': _IapProductSpec('plus', 'monthly'),
    'plus_android_annual': _IapProductSpec('plus', 'annual'),
    'creator_android_month': _IapProductSpec('creator', 'monthly'),
    'creator_android_annual': _IapProductSpec('creator', 'annual'),
    'business_android_month': _IapProductSpec('business', 'monthly'),
    'business_android_annual': _IapProductSpec('business', 'annual'),
  };
  static final Map<String, _IapProductSpec> _productCatalog =
      Platform.isAndroid ? _androidProductCatalog : _iosProductCatalog;

  // Shown until the live StoreKit/Play Billing query resolves; matches
  // packages/shared/src/subscription.ts's TIER_PRICING.
  static const Map<String, String> _iosPlaceholderPrices = {
    'STARTER_iOS_MONTH': r'$3.99/mo',
    'STARTER_iOS_ANNUAL': r'$39.00/yr',
    'PLUS_iOS_MONTH': r'$7.99/mo',
    'PLUS_iOS_ANNUAL': r'$79.00/yr',
    'CREATOR_iOS_MONTH': r'$14.99/mo',
    'CREATOR_iOS_ANNUAL': r'$149.00/yr',
    'BUSINESS_iOS_MONTH': r'$29.99/mo',
    'BUSINESS_iOS_ANNUAL': r'$299.00/yr',
  };
  static const Map<String, String> _androidPlaceholderPrices = {
    'starter_android_month': r'$3.99/mo',
    'starter_android_annual': r'$39.00/yr',
    'plus_android_month': r'$7.99/mo',
    'plus_android_annual': r'$79.00/yr',
    'creator_android_month': r'$14.99/mo',
    'creator_android_annual': r'$149.00/yr',
    'business_android_month': r'$29.99/mo',
    'business_android_annual': r'$299.00/yr',
  };
  static final Map<String, String> _placeholderPrices =
      Platform.isAndroid ? _androidPlaceholderPrices : _iosPlaceholderPrices;

  final FirebaseFunctionsService _functionsService = FirebaseFunctionsService();
  final Map<String, iap.ProductDetails> _storeProducts = {};
  StreamSubscription<List<iap.PurchaseDetails>>? _purchaseSubscription;

  bool _isAvailable = false;
  bool _isLoading = false;
  String? _lastError;
  String? _lastVerifiedTier;

  // Incremented once per terminal purchase-flow outcome (error or success),
  // so UI can distinguish "a new event just happened" from "still showing
  // the result of the last one" across rebuilds — a plain nullable field
  // would either replay the same snackbar on every rebuild, or (if cleared
  // after showing) miss a second purchase of the *same* tier since the
  // value wouldn't differ from what was already shown.
  int _eventId = 0;

  bool get isAvailable => _isAvailable;
  bool get isLoading => _isLoading;
  String? get lastError => _lastError;
  String? get lastVerifiedTier => _lastVerifiedTier;
  int get eventId => _eventId;

  /// Tiers that can actually be bought in-app on this platform (i.e. have a
  /// store product). The subscription screen filters the backend's upgrade
  /// options to this set so tiers with no IAP product -- notably the
  /// contact-sales "Enterprise" tier -- are never offered on mobile, which
  /// App Store review rejects.
  Set<String> get purchasableTiers =>
      _productCatalog.values.map((spec) => spec.tier).toSet();

  String? productIdFor(String tier, String billingCycle) {
    for (final entry in _productCatalog.entries) {
      if (entry.value.tier == tier && entry.value.billingCycle == billingCycle) {
        return entry.key;
      }
    }
    return null;
  }

  String priceFor(String tier, String billingCycle) {
    final productId = productIdFor(tier, billingCycle);
    if (productId == null) return '—';
    final storeProduct = _storeProducts[productId];
    if (storeProduct != null) return storeProduct.price;
    return _placeholderPrices[productId] ?? '—';
  }

  Future<void> initialize() async {
    _isAvailable = await iap.InAppPurchase.instance.isAvailable();
    if (!_isAvailable) {
      debugPrint('IapService: in-app purchase not available on this device');
      return;
    }

    final response = await iap.InAppPurchase.instance.queryProductDetails(
      _productCatalog.keys.toSet(),
    );

    if (response.notFoundIDs.isNotEmpty) {
      debugPrint('IapService: products not found in store: ${response.notFoundIDs}');
    }

    for (final storeProduct in response.productDetails) {
      _storeProducts[storeProduct.id] = storeProduct;
    }

    _purchaseSubscription?.cancel();
    _purchaseSubscription = iap.InAppPurchase.instance.purchaseStream.listen(
      _handlePurchaseUpdates,
      onError: (error) {
        debugPrint('IapService: purchase stream error: $error');
        _isLoading = false;
        _lastError = 'Purchase stream error';
        notifyListeners();
      },
    );

    notifyListeners();
  }

  Future<void> purchase(String tier, String billingCycle) async {
    final productId = productIdFor(tier, billingCycle);
    final product = productId == null ? null : _storeProducts[productId];
    if (product == null) {
      _lastError = '$tier ($billingCycle) is not available for purchase right now';
      _eventId++;
      notifyListeners();
      return;
    }

    _isLoading = true;
    _lastError = null;
    notifyListeners();

    final purchaseParam = iap.PurchaseParam(productDetails: product);
    final launched = await iap.InAppPurchase.instance.buyNonConsumable(
      purchaseParam: purchaseParam,
    );

    if (!launched) {
      _isLoading = false;
      _lastError = 'Unable to start purchase';
      _eventId++;
      notifyListeners();
    }
  }

  Future<void> restorePurchases() async {
    _isLoading = true;
    _lastError = null;
    notifyListeners();
    await iap.InAppPurchase.instance.restorePurchases();
  }

  Future<void> _handlePurchaseUpdates(
    List<iap.PurchaseDetails> purchaseDetailsList,
  ) async {
    for (final purchaseDetails in purchaseDetailsList) {
      if (!_productCatalog.containsKey(purchaseDetails.productID)) continue;

      if (purchaseDetails.status == iap.PurchaseStatus.pending) {
        _isLoading = true;
        notifyListeners();
        continue;
      }

      if (purchaseDetails.status == iap.PurchaseStatus.error) {
        debugPrint('IapService: purchase error: ${purchaseDetails.error}');
        _isLoading = false;
        _lastError = 'The purchase could not be completed';
        _eventId++;
        notifyListeners();
      } else if (purchaseDetails.status == iap.PurchaseStatus.purchased ||
          purchaseDetails.status == iap.PurchaseStatus.restored) {
        final verified = await _verifyWithBackend(purchaseDetails);
        _isLoading = false;
        if (!verified) {
          _lastError = 'Purchase verification failed';
        }
        _eventId++;
        notifyListeners();
      }

      if (purchaseDetails.pendingCompletePurchase) {
        await iap.InAppPurchase.instance.completePurchase(purchaseDetails);
      }
    }
  }

  Future<bool> _verifyWithBackend(iap.PurchaseDetails purchaseDetails) async {
    try {
      final source = Platform.isAndroid ? 'play_store' : 'app_store';
      final result = await _functionsService.verifyIapPurchase(
        productId: purchaseDetails.productID,
        purchaseId: purchaseDetails.purchaseID,
        verificationData: purchaseDetails.verificationData.serverVerificationData,
        source: source,
      );

      if (result['success'] != true) return false;
      final entitlement = Map<String, dynamic>.from(
        result['entitlement'] as Map? ?? <String, dynamic>{},
      );
      _lastVerifiedTier = entitlement['tier']?.toString();
      return true;
    } catch (e) {
      debugPrint('IapService: backend verification failed: $e');
      return false;
    }
  }

  @override
  void dispose() {
    _purchaseSubscription?.cancel();
    super.dispose();
  }
}
