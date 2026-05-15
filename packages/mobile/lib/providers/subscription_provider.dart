import 'package:flutter/material.dart';

import '../services/services.dart';

class SubscriptionUpgradeOption {
  final String tier;
  final String name;
  final double? monthlyPrice;
  final double? annualPrice;
  final double? annualSavings;

  const SubscriptionUpgradeOption({
    required this.tier,
    required this.name,
    this.monthlyPrice,
    this.annualPrice,
    this.annualSavings,
  });

  factory SubscriptionUpgradeOption.fromJson(Map<String, dynamic> json) {
    double? toDouble(dynamic value) {
      if (value is num) {
        return value.toDouble();
      }
      if (value is String) {
        return double.tryParse(value);
      }
      return null;
    }

    final tier = (json['tier'] ?? 'free').toString();
    return SubscriptionUpgradeOption(
      tier: tier,
      name: (json['name'] ?? json['displayName'] ?? tier).toString(),
      monthlyPrice: toDouble(json['monthlyPrice']),
      annualPrice: toDouble(json['annualPrice']),
      annualSavings: toDouble(json['annualSavings']),
    );
  }
}

class SubscriptionProvider extends ChangeNotifier {
  final FirebaseFunctionsService _functionsService = FirebaseFunctionsService();

  bool _isLoading = false;
  bool _isActionLoading = false;
  String? _error;

  String _tier = 'free';
  String _status = 'inactive';
  String _billingCycle = 'monthly';
  DateTime? _renewalDate;

  Map<String, dynamic> _usage = <String, dynamic>{};
  Map<String, dynamic> _limits = <String, dynamic>{};
  List<SubscriptionUpgradeOption> _upgradeOptions =
      <SubscriptionUpgradeOption>[];

  bool get isLoading => _isLoading;
  bool get isActionLoading => _isActionLoading;
  String? get error => _error;
  String get tier => _tier;
  String get status => _status;
  String get billingCycle => _billingCycle;
  DateTime? get renewalDate => _renewalDate;
  Map<String, dynamic> get usage => _usage;
  Map<String, dynamic> get limits => _limits;
  List<SubscriptionUpgradeOption> get upgradeOptions => _upgradeOptions;

  Future<void> loadSubscriptionData() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      final statusResponse = await _functionsService.getSubscriptionStatus();
      _applyStatusResponse(statusResponse);

      final optionsResponse = await _functionsService.getUpgradeOptions();
      _applyUpgradeOptionsResponse(optionsResponse);
    } catch (_) {
      _error = 'Unable to load subscription data';
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<String?> createCheckoutUrl(String tier, String billingCycle) async {
    _isActionLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _functionsService.createCheckout(
        tier,
        billingCycle,
      );
      return _pickFirstString(response, const <String>['checkoutUrl', 'url']);
    } catch (_) {
      _error = 'Unable to create checkout session';
      return null;
    } finally {
      _isActionLoading = false;
      notifyListeners();
    }
  }

  Future<String?> createBillingPortalUrl() async {
    _isActionLoading = true;
    _error = null;
    notifyListeners();

    try {
      final response = await _functionsService.createBillingPortal();
      return _pickFirstString(response, const <String>['portalUrl', 'url']);
    } catch (_) {
      _error = 'Unable to open billing portal';
      return null;
    } finally {
      _isActionLoading = false;
      notifyListeners();
    }
  }

  int usageCount(String key) {
    final value = _usage[key];
    if (value is num) {
      return value.toInt();
    }
    if (value is String) {
      return int.tryParse(value) ?? 0;
    }
    return 0;
  }

  int limitCount(String key) {
    final value = _limits[key];
    if (value is num) {
      return value.toInt();
    }
    if (value is String) {
      return int.tryParse(value) ?? 0;
    }
    return 0;
  }

  double usageProgress(String usageKey, String limitKey) {
    final usage = usageCount(usageKey);
    final limit = limitCount(limitKey);
    if (limit <= 0) {
      return 0;
    }
    return (usage / limit).clamp(0, 1).toDouble();
  }

  void _applyStatusResponse(Map<String, dynamic> response) {
    _tier = (response['tier'] ?? _tier).toString();
    _status = (response['status'] ?? _status).toString();
    _billingCycle = (response['billingCycle'] ?? _billingCycle).toString();

    final renewalRaw = response['renewalDate'];
    if (renewalRaw is String) {
      _renewalDate = DateTime.tryParse(renewalRaw);
    }

    _usage = Map<String, dynamic>.from(
      response['usage'] is Map ? response['usage'] as Map : <String, dynamic>{},
    );

    _limits = Map<String, dynamic>.from(
      response['limits'] is Map
          ? response['limits'] as Map
          : <String, dynamic>{},
    );
  }

  void _applyUpgradeOptionsResponse(Map<String, dynamic> response) {
    final dynamic available =
        response['available'] ?? response['upgradeOptions'];
    if (available is List) {
      _upgradeOptions = available
          .whereType<Map>()
          .map(
            (option) => SubscriptionUpgradeOption.fromJson(
              Map<String, dynamic>.from(option),
            ),
          )
          .toList(growable: false);
    } else {
      _upgradeOptions = <SubscriptionUpgradeOption>[];
    }
  }

  String? _pickFirstString(Map<String, dynamic> source, List<String> keys) {
    for (final key in keys) {
      final value = source[key];
      if (value is String && value.isNotEmpty) {
        return value;
      }
    }
    return null;
  }
}
