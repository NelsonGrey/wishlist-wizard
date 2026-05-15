import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../providers/providers.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  String _selectedBillingCycle = 'monthly';

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<SubscriptionProvider>().loadSubscriptionData();
    });
  }

  Future<void> _openUrl(String? url) async {
    if (url == null || url.isEmpty) {
      _showError('No checkout link returned from server');
      return;
    }

    final uri = Uri.tryParse(url);
    if (uri == null) {
      _showError('Invalid checkout URL');
      return;
    }

    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && mounted) {
      _showError('Could not open link');
    }
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
    return Scaffold(
      appBar: AppBar(title: const Text('Subscription')),
      body: Consumer<SubscriptionProvider>(
        builder: (context, provider, child) {
          if (provider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (provider.error != null) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      provider.error!,
                      textAlign: TextAlign.center,
                      style: const TextStyle(color: Colors.redAccent),
                    ),
                    const SizedBox(height: 12),
                    ElevatedButton(
                      onPressed: provider.loadSubscriptionData,
                      child: const Text('Retry'),
                    ),
                  ],
                ),
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
                ...provider.upgradeOptions.map(
                  (option) => _UpgradeOptionCard(
                    option: option,
                    billingCycle: _selectedBillingCycle,
                    isLoading: provider.isActionLoading,
                    onUpgrade: () async {
                      final url = await provider.createCheckoutUrl(
                        option.tier,
                        _selectedBillingCycle,
                      );
                      await _openUrl(url);
                    },
                  ),
                ),
                const SizedBox(height: 12),
                OutlinedButton.icon(
                  onPressed: provider.isActionLoading
                      ? null
                      : () async {
                          final url = await provider.createBillingPortalUrl();
                          await _openUrl(url);
                        },
                  icon: const Icon(Icons.payment),
                  label: const Text('Manage billing in Stripe'),
                ),
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
            _UsageRow(
              label: 'Wishlists',
              used: provider.usageCount('wishlists'),
              limit: provider.limitCount('maxWishlists'),
              progress: provider.usageProgress('wishlists', 'maxWishlists'),
            ),
            const SizedBox(height: 10),
            _UsageRow(
              label: 'Items',
              used: provider.usageCount('itemsTotal'),
              limit: provider.limitCount('maxItemsPerWishlist'),
              progress: provider.usageProgress(
                'itemsTotal',
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
          color: isWarning ? Colors.orange : Theme.of(context).primaryColor,
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
  });

  final SubscriptionUpgradeOption option;
  final String billingCycle;
  final VoidCallback onUpgrade;
  final bool isLoading;

  @override
  Widget build(BuildContext context) {
    final price = billingCycle == 'annual'
        ? option.annualPrice ?? option.monthlyPrice
        : option.monthlyPrice ?? option.annualPrice;

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
            Text(
              price == null
                  ? 'Pricing unavailable'
                  : '\$${price.toStringAsFixed(2)} / ${billingCycle == 'annual' ? 'year' : 'month'}',
            ),
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
                isLoading ? 'Opening...' : 'Upgrade to ${option.name}',
              ),
            ),
          ],
        ),
      ),
    );
  }
}
