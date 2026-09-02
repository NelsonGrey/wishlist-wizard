import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/providers.dart';
import '../services/iap_service.dart';
import '../widgets/app_scaffold.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  String _selectedBillingCycle = 'monthly';
  int _handledIapEventId = 0;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SubscriptionProvider>().loadSubscriptionData();
    });
  }

  void _showError(String message) {
    if (!mounted) {
      return;
    }
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Subscription',
      showAd: false,
      body: Consumer2<SubscriptionProvider, IapService>(
        builder: (context, provider, iapService, child) {
          if (iapService.eventId != _handledIapEventId) {
            final eventIdToHandle = iapService.eventId;
            final errorToShow = iapService.lastError;
            final purchasedTier = iapService.lastVerifiedTier;
            WidgetsBinding.instance.addPostFrameCallback((_) {
              if (!mounted) return;
              _handledIapEventId = eventIdToHandle;
              if (errorToShow != null) {
                _showError(errorToShow);
              } else if (purchasedTier != null) {
                provider.loadSubscriptionData();
              }
            });
          }

          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.error != null) {
            return Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    provider.error!,
                    style: const TextStyle(color: Colors.redAccent),
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: provider.loadSubscriptionData,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: provider.loadSubscriptionData,
            child: ListView(
              padding: const EdgeInsets.all(16),
              children: [
                _CurrentTierCard(provider: provider),
                const SizedBox(height: 16),
                _UsageCard(provider: provider),
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Billing cycle',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Wrap(
                          spacing: 8,
                          children: [
                            ChoiceChip(
                              label: const Text('Monthly'),
                              selected: _selectedBillingCycle == 'monthly',
                              onSelected: (_) {
                                setState(() {
                                  _selectedBillingCycle = 'monthly';
                                });
                              },
                            ),
                            ChoiceChip(
                              label: const Text('Annual'),
                              selected: _selectedBillingCycle == 'annual',
                              onSelected: (_) {
                                setState(() {
                                  _selectedBillingCycle = 'annual';
                                });
                              },
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Upgrade options',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                // Only offer tiers that have an in-app purchase product on
                // this platform. This filters out the contact-sales
                // "Enterprise" tier the backend returns for web -- offering a
                // non-IAP plan on mobile gets the app rejected in review.
                ...provider.upgradeOptions
                    .where(
                      (option) =>
                          iapService.purchasableTiers.contains(option.tier),
                    )
                    .map(
                      (option) => _UpgradeOptionCard(
                        option: option,
                        billingCycle: _selectedBillingCycle,
                        isLoading: iapService.isLoading,
                        priceOverride: iapService.priceFor(
                          option.tier,
                          _selectedBillingCycle,
                        ),
                        onUpgrade: () => iapService.purchase(
                          option.tier,
                          _selectedBillingCycle,
                        ),
                      ),
                    ),
                if (iapService.isAvailable) ...[
                  const SizedBox(height: 12),
                  TextButton(
                    onPressed: iapService.isLoading
                        ? null
                        : iapService.restorePurchases,
                    child: const Text('Restore purchases'),
                  ),
                ],
              ],
            ),
          );
        },
      ),
    );
  }
}

class _CurrentTierCard extends StatelessWidget {
  const _CurrentTierCard({required this.provider});

  final SubscriptionProvider provider;

  @override
  Widget build(BuildContext context) {
    final renewal = provider.renewalDate;
    final renewalLabel = renewal == null
        ? 'No renewal date available'
        : '${renewal.year}-${renewal.month.toString().padLeft(2, '0')}-${renewal.day.toString().padLeft(2, '0')}';

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Current plan',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 8),
            Text(
              provider.tier.toUpperCase(),
              style: Theme.of(context).textTheme.headlineSmall,
            ),
            const SizedBox(height: 4),
            Text(
              'Status: ${provider.status} • ${provider.billingCycle}',
              style: TextStyle(color: Colors.grey[700]),
            ),
            const SizedBox(height: 4),
            Text('Renews: $renewalLabel'),
          ],
        ),
      ),
    );
  }
}

class _UsageCard extends StatelessWidget {
  const _UsageCard({required this.provider});

  final SubscriptionProvider provider;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Usage',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
            ),
            const SizedBox(height: 12),
            // Field names must match billingStatus()'s real response
            // exactly (wishlistsOwned/totalItems/priceTrackedItems) --
            // usageCount()/usageProgress() default silently to 0 on a
            // missing key, so a wrong key here doesn't error, it just
            // always shows 0 regardless of real usage. That's exactly
            // what happened before this was fixed: wishlists/itemsTotal
            // were never the real field names.
            _UsageRow(
              label: 'Wishlists',
              used: provider.usageCount('wishlistsOwned'),
              limit: provider.limitCount('maxWishlists'),
              progress: provider.usageProgress('wishlistsOwned', 'maxWishlists'),
            ),
            const SizedBox(height: 10),
            _UsageRow(
              label: 'Items',
              used: provider.usageCount('totalItems'),
              limit: provider.limitCount('maxItemsPerWishlist'),
              progress: provider.usageProgress(
                'totalItems',
                'maxItemsPerWishlist',
              ),
            ),
            const SizedBox(height: 10),
            _UsageRow(
              label: 'Price Tracking',
              used: provider.usageCount('priceTrackedItems'),
              limit: provider.limitCount('maxPriceTrackedItems'),
              progress: provider.usageProgress(
                'priceTrackedItems',
                'maxPriceTrackedItems',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _UsageRow extends StatelessWidget {
  const _UsageRow({
    required this.label,
    required this.used,
    required this.limit,
    required this.progress,
  });

  final String label;
  final int used;
  final int limit;
  final double progress;

  @override
  Widget build(BuildContext context) {
    final isWarning = progress >= 0.8;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [Text(label), Text('$used / $limit')],
        ),
        const SizedBox(height: 6),
        LinearProgressIndicator(
          value: progress,
          minHeight: 8,
          borderRadius: BorderRadius.circular(100),
          color: isWarning ? Colors.orange : Theme.of(context).colorScheme.primary,
        ),
      ],
    );
  }
}

class _UpgradeOptionCard extends StatelessWidget {
  const _UpgradeOptionCard({
    required this.option,
    required this.billingCycle,
    required this.onUpgrade,
    required this.isLoading,
    required this.priceOverride,
  });

  final SubscriptionUpgradeOption option;
  final String billingCycle;
  final VoidCallback onUpgrade;
  final bool isLoading;

  /// Live price from StoreKit/Play Billing (falls back to a placeholder
  /// matching packages/shared/src/subscription.ts's TIER_PRICING until the
  /// store query resolves) — takes precedence over the Stripe-sourced
  /// option.monthlyPrice/annualPrice, since actual purchases go through the
  /// store, not Stripe, on mobile.
  final String priceOverride;

  @override
  Widget build(BuildContext context) {
    final savings = option.annualSavings;

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              option.name,
              style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 4),
            Text(priceOverride),
            if (billingCycle == 'annual' && savings != null) ...[
              const SizedBox(height: 4),
              Text(
                'Save \$${savings.toStringAsFixed(2)} annually',
                style: const TextStyle(color: Colors.green),
              ),
            ],
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: isLoading ? null : onUpgrade,
              child: Text(
                isLoading ? 'Processing...' : 'Upgrade to ${option.name}',
              ),
            ),
          ],
        ),
      ),
    );
  }
}
