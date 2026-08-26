import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../firebase_options.dart';
import '../services/firebase_functions_service.dart';

const Map<String, String> _payoutStatusLabels = {
  'not_created': 'Not started',
  'onboarding_incomplete': 'Onboarding in progress',
  'restricted': 'Action needed',
  'enabled': 'Ready for payouts',
};

const List<String> _commissionStates = ['Pending', 'Approved', 'Payable', 'Paid', 'Reversed'];

const Map<String, String> _adjustmentTypeLabels = {
  'return': 'Return',
  'chargeback': 'Chargeback',
  'fraud_hold': 'Fraud hold',
  'manual_correction': 'Manual correction',
  'network_correction': 'Network correction',
};

double _asDouble(dynamic value) => (value is num) ? value.toDouble() : 0;
int _asInt(dynamic value) => (value is num) ? value.toInt() : 0;

/// Creator dashboard -- mirrors web's CreatorOverview.tsx and its four
/// creator-dashboard/*.tsx panels (Performance/Commission Status/Payout
/// Readiness/Adjustments). Tier-gated: the commission-summary call doubles
/// as the tier check, same as web. Tracking-tag setup is left web-only for
/// now (secondary, one-time setup step). Reached from the Profile tab.
class CreatorDashboardScreen extends StatefulWidget {
  const CreatorDashboardScreen({super.key, FirebaseFunctionsService? functionsService})
      : _functionsService = functionsService;

  final FirebaseFunctionsService? _functionsService;

  @override
  State<CreatorDashboardScreen> createState() => _CreatorDashboardScreenState();
}

class _CreatorDashboardScreenState extends State<CreatorDashboardScreen> {
  late final FirebaseFunctionsService _service =
      widget._functionsService ?? FirebaseFunctionsService();

  bool _isLoading = true;
  bool _upgradeRequired = false;
  String? _error;

  Map<String, dynamic> _summary = {};
  Map<String, dynamic> _stats = {};
  List<Map<String, dynamic>> _ledger = [];
  List<Map<String, dynamic>> _adjustments = [];
  List<Map<String, dynamic>> _payoutHistory = [];

  bool _isConnecting = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _isLoading = true;
      _upgradeRequired = false;
      _error = null;
    });

    try {
      final summary = await _service.getCreatorCommissionSummary();
      if (!mounted) return;

      final results = await Future.wait([
        _service.getAffiliateStats(),
        _service.getCreatorCommissionLedger(),
        _service.getCreatorAdjustments(),
        _service.getCreatorPayoutHistory(),
      ]);
      if (!mounted) return;

      setState(() {
        _summary = summary;
        _stats = results[0] as Map<String, dynamic>;
        _ledger = results[1] as List<Map<String, dynamic>>;
        _adjustments = results[2] as List<Map<String, dynamic>>;
        _payoutHistory = results[3] as List<Map<String, dynamic>>;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      if (e.toString().contains('(403')) {
        setState(() {
          _upgradeRequired = true;
          _isLoading = false;
        });
      } else {
        setState(() {
          _error = 'Failed to load creator dashboard.';
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _setUpPayouts() async {
    setState(() => _isConnecting = true);
    try {
      await _service.createCreatorConnectAccount();
      final projectId = DefaultFirebaseOptions.currentPlatform.projectId;
      final returnUrl = 'https://$projectId.web.app/dashboard?tab=creator';
      final link = await _service.getCreatorConnectOnboardingLink(
        returnUrl: returnUrl,
        refreshUrl: returnUrl,
      );
      final url = link['url'] as String?;
      if (url != null) {
        final launched = await launchUrl(Uri.parse(url), mode: LaunchMode.externalApplication);
        if (!launched && mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Unable to open payout setup.')),
          );
        }
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text("Couldn't start payout setup."), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isConnecting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 4,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Creator Tools'),
          bottom: _isLoading || _upgradeRequired || _error != null
              ? null
              : const TabBar(
                  isScrollable: true,
                  tabs: [
                    Tab(text: 'Performance'),
                    Tab(text: 'Commissions'),
                    Tab(text: 'Payouts'),
                    Tab(text: 'Adjustments'),
                  ],
                ),
        ),
        body: _buildBody(),
      ),
    );
  }

  Widget _buildBody() {
    if (_isLoading) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_upgradeRequired) {
      return _buildUpgradePrompt();
    }
    if (_error != null) {
      return RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          physics: const AlwaysScrollableScrollPhysics(),
          children: [
            const SizedBox(height: 80),
            Center(child: Text(_error!, style: const TextStyle(color: Colors.red))),
          ],
        ),
      );
    }
    return TabBarView(
      children: [
        _buildPerformanceTab(),
        _buildCommissionsTab(),
        _buildPayoutsTab(),
        _buildAdjustmentsTab(),
      ],
    );
  }

  Widget _buildUpgradePrompt() {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24),
      children: const [
        SizedBox(height: 60),
        Icon(Icons.storefront_outlined, size: 48, color: Colors.grey),
        SizedBox(height: 16),
        Text(
          'The creator dashboard is a Creator Pro feature',
          textAlign: TextAlign.center,
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
        ),
        SizedBox(height: 8),
        Text(
          'Upgrade to track performance, commission status, payout readiness, and adjustments for the retail links you share.',
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildPerformanceTab() {
    final stats = _stats['stats'] as Map<String, dynamic>? ?? {};
    final clicks = _asInt(stats['totalClicks']);
    final conversions = _asInt(stats['totalConversions']);
    final ctr = clicks > 0 ? (conversions / clicks * 100).toStringAsFixed(1) : '0.0';
    final programs = (stats['topPrograms'] as List?)?.cast<Map<String, dynamic>>() ?? [];

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          Row(
            children: [
              Expanded(child: _StatCard(label: 'Total clicks', value: '$clicks')),
              const SizedBox(width: 12),
              Expanded(child: _StatCard(label: 'Conversions', value: '$conversions')),
              const SizedBox(width: 12),
              Expanded(child: _StatCard(label: 'Click-through rate', value: '$ctr%')),
            ],
          ),
          const SizedBox(height: 16),
          Text('Retailer breakdown', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (programs.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text('No clicks recorded yet.'),
            )
          else
            ...programs.map(
              (program) => Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  title: Text(program['program']?.toString() ?? ''),
                  trailing: Text(
                    '${_asInt(program['clicks'])} clicks · ${_asInt(program['conversions'])} conversions',
                  ),
                ),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildCommissionsTab() {
    final byState = _summary['byState'] as Map<String, dynamic>? ?? {};

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _commissionStates.map((state) {
              final entry = byState[state] as Map<String, dynamic>? ?? {};
              final totalUsd = _asDouble(entry['totalUsd']);
              final count = _asInt(entry['count']);
              return SizedBox(
                width: (MediaQuery.of(context).size.width - 32 - 8) / 2,
                child: Card(
                  child: Padding(
                    padding: const EdgeInsets.all(10),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(state, style: const TextStyle(fontSize: 12, color: Colors.grey)),
                        Text('\$${totalUsd.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                        Text('$count ${count == 1 ? 'item' : 'items'}', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                      ],
                    ),
                  ),
                ),
              );
            }).toList(),
          ),
          const SizedBox(height: 16),
          Text('Commission ledger', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (_ledger.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text('No commission activity yet. This fills in once a retailer report is reconciled against your tracked links.'),
            )
          else
            ..._ledger.map((entry) {
              final netUsd = _asDouble(entry['netCreatorCommissionUsd']);
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  title: Text(entry['network']?.toString() ?? ''),
                  subtitle: Text(entry['networkOrderId']?.toString() ?? ''),
                  trailing: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text('\$${netUsd.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                      _StateBadge(state: entry['state']?.toString() ?? ''),
                    ],
                  ),
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildPayoutsTab() {
    final readiness = _summary['payoutReadiness'] as Map<String, dynamic>? ?? {};
    final byState = _summary['byState'] as Map<String, dynamic>? ?? {};
    final status = readiness['stripeAccountStatus']?.toString() ?? 'not_created';
    final payableUsd = _asDouble((byState['Payable'] as Map<String, dynamic>?)?['totalUsd']);
    final threshold = _asDouble(readiness['minimumPayoutThresholdUsd']) == 0
        ? 25.0
        : _asDouble(readiness['minimumPayoutThresholdUsd']);
    final progress = threshold > 0 ? (payableUsd / threshold).clamp(0.0, 1.0) : 0.0;
    final clawback = _asDouble(readiness['outstandingClawbackBalanceUsd']);

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      const Icon(Icons.account_balance_wallet_outlined),
                      const SizedBox(width: 8),
                      Text(_payoutStatusLabels[status] ?? status, style: const TextStyle(fontWeight: FontWeight.w600)),
                    ],
                  ),
                  if (status != 'enabled') ...[
                    const SizedBox(height: 12),
                    ElevatedButton.icon(
                      onPressed: _isConnecting ? null : _setUpPayouts,
                      icon: _isConnecting
                          ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                          : const Icon(Icons.open_in_new),
                      label: Text(status == 'not_created' ? 'Set up payouts' : 'Continue setup'),
                    ),
                  ],
                  if (clawback > 0) ...[
                    const SizedBox(height: 12),
                    Text(
                      '\$${clawback.toStringAsFixed(2)} owed from a return or correction will be deducted from your next payout.',
                      style: const TextStyle(color: Colors.orange),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 12),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Threshold progress', style: Theme.of(context).textTheme.titleMedium),
                  Text('\$${payableUsd.toStringAsFixed(2)} of \$${threshold.toStringAsFixed(2)} minimum'),
                  const SizedBox(height: 8),
                  LinearProgressIndicator(value: progress),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Text('Payout history', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (_payoutHistory.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text('No payouts yet.'),
            )
          else
            ..._payoutHistory.map((batch) {
              final amount = _asDouble(batch['totalAmountUsd']);
              return Card(
                margin: const EdgeInsets.only(bottom: 8),
                child: ListTile(
                  title: Text(batch['periodLabel']?.toString() ?? ''),
                  subtitle: Text(batch['state']?.toString() ?? ''),
                  trailing: Text('\$${amount.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold)),
                ),
              );
            }),
        ],
      ),
    );
  }

  Widget _buildAdjustmentsTab() {
    return RefreshIndicator(
      onRefresh: _load,
      child: _adjustments.isEmpty
          ? ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: const [
                SizedBox(height: 60),
                Center(child: Text('No adjustments on your account.')),
              ],
            )
          : ListView(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.all(16),
              children: _adjustments.map((adjustment) {
                final amount = _asDouble(adjustment['amountUsd']);
                final type = adjustment['type']?.toString() ?? '';
                final reasonCode = adjustment['reasonCode']?.toString() ?? '';
                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: ListTile(
                    title: Text(_adjustmentTypeLabels[type] ?? type),
                    subtitle: Text(reasonCode.replaceAll('_', ' ')),
                    trailing: Text(
                      '${amount < 0 ? '-' : ''}\$${amount.abs().toStringAsFixed(2)}',
                      style: TextStyle(fontWeight: FontWeight.bold, color: amount < 0 ? Colors.red : null),
                    ),
                  ),
                );
              }).toList(),
            ),
    );
  }
}

class _StatCard extends StatelessWidget {
  const _StatCard({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey)),
            const SizedBox(height: 4),
            Text(value, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}

class _StateBadge extends StatelessWidget {
  const _StateBadge({required this.state});

  final String state;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: Colors.indigo.shade50, borderRadius: BorderRadius.circular(999)),
      child: Text(state, style: TextStyle(color: Colors.indigo.shade700, fontSize: 11, fontWeight: FontWeight.w600)),
    );
  }
}
