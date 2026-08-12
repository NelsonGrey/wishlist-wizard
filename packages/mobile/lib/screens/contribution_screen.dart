import 'package:flutter/material.dart';
import 'package:flutter_stripe/flutter_stripe.dart' hide Card;

import '../services/firebase_functions_service.dart';

const double _minContributionAmount = 0.5;
const double _maxContributionAmount = 10000;

double contributionLimit(double targetPrice, double currentTotal) {
  final remaining = (targetPrice - currentTotal).clamp(0, double.infinity);
  if (remaining == 0) return 0;
  return remaining < _maxContributionAmount ? remaining.toDouble() : _maxContributionAmount;
}

/// Contribute toward a group gift for a wishlist item -- real Stripe card
/// payment via CardField + confirmPayment, mirroring web's
/// ContributionDialog.tsx. Reached from an item's action menu.
class ContributionScreen extends StatefulWidget {
  const ContributionScreen({
    super.key,
    required this.itemId,
    required this.itemTitle,
    this.itemPrice,
    this.itemImageUrl,
    this.itemStore,
    FirebaseFunctionsService? functionsService,
  }) : _functionsService = functionsService;

  final String itemId;
  final String itemTitle;
  final double? itemPrice;
  final String? itemImageUrl;
  final String? itemStore;

  // Injectable for tests; defaults to the real Firebase-backed singleton.
  final FirebaseFunctionsService? _functionsService;

  @override
  State<ContributionScreen> createState() => _ContributionScreenState();
}

class _ContributionScreenState extends State<ContributionScreen> {
  late final FirebaseFunctionsService _service =
      widget._functionsService ?? FirebaseFunctionsService();

  bool _isLoading = true;
  String? _stripeUnavailableReason;

  double _currentTotal = 0;
  List<Map<String, dynamic>> _participants = [];

  final _amountController = TextEditingController();
  final _messageController = TextEditingController();
  bool _isAnonymous = false;
  CardFieldInputDetails? _cardDetails;
  bool _isProcessing = false;
  String? _submitError;

  double get _targetPrice => widget.itemPrice ?? 0;
  double get _maxAllowedContribution => contributionLimit(_targetPrice, _currentTotal);
  bool get _canContribute => _maxAllowedContribution >= _minContributionAmount;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _amountController.dispose();
    _messageController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() => _isLoading = true);
    try {
      final config = await _service.getStripeConfig();
      final publishableKey = config['publishableKey'] as String?;
      if (publishableKey == null || publishableKey.isEmpty) {
        if (!mounted) return;
        setState(() {
          _stripeUnavailableReason = 'Payments unavailable — Stripe is not configured for this environment.';
          _isLoading = false;
        });
        return;
      }
      Stripe.publishableKey = publishableKey;

      final summary = await _service.getGroupGiftSummary(widget.itemId);
      if (!mounted) return;
      setState(() {
        _currentTotal = ((summary['totalAmount'] as num?) ?? 0).toDouble();
        _participants = List<Map<String, dynamic>>.from(
          (summary['participants'] as List? ?? []).map((p) => Map<String, dynamic>.from(p as Map)),
        );
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _stripeUnavailableReason = 'Failed to load this group gift. Please try again.';
        _isLoading = false;
      });
    }
  }

  Future<void> _submit() async {
    final amount = double.tryParse(_amountController.text.trim()) ?? 0;
    if (amount < _minContributionAmount || amount > _maxAllowedContribution) {
      setState(() => _submitError =
          'Enter an amount between \$${_minContributionAmount.toStringAsFixed(2)} and \$${_maxAllowedContribution.toStringAsFixed(2)}.');
      return;
    }
    if (_cardDetails?.complete != true) {
      setState(() => _submitError = 'Enter your complete card details.');
      return;
    }

    setState(() {
      _isProcessing = true;
      _submitError = null;
    });

    try {
      final intent = await _service.createGroupPaymentIntent(
        itemId: widget.itemId,
        amount: amount,
        message: _messageController.text.trim(),
        isAnonymous: _isAnonymous,
      );
      final clientSecret = intent['clientSecret'] as String;
      final contributionId = intent['contributionId'] as String;

      await Stripe.instance.confirmPayment(
        paymentIntentClientSecret: clientSecret,
        data: const PaymentMethodParams.card(paymentMethodData: PaymentMethodData()),
      );

      await _service.confirmGroupContribution(contributionId);

      if (!mounted) return;
      Navigator.pop(context, true);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            'Thank you for contributing \$${amount.toStringAsFixed(2)} to "${widget.itemTitle}".',
          ),
        ),
      );
    } on StripeException catch (e) {
      if (!mounted) return;
      setState(() {
        _submitError = e.error.message;
        _isProcessing = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitError = 'There was an error processing your payment.';
        _isProcessing = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Contribute to Gift')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _stripeUnavailableReason != null
              ? Center(
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: Text(_stripeUnavailableReason!, textAlign: TextAlign.center),
                  ),
                )
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildItemCard(),
                      const SizedBox(height: 16),
                      _buildProgressCard(),
                      const SizedBox(height: 16),
                      if (_canContribute) _buildContributionForm() else _buildUnavailableCard(),
                    ],
                  ),
                ),
    );
  }

  Widget _buildItemCard() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            if (widget.itemImageUrl != null) ...[
              ClipRRect(
                borderRadius: BorderRadius.circular(8),
                child: Image.network(widget.itemImageUrl!, width: 56, height: 56, fit: BoxFit.cover),
              ),
              const SizedBox(width: 12),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(widget.itemTitle, style: const TextStyle(fontWeight: FontWeight.w600)),
                  if (_targetPrice > 0)
                    Text('\$${_targetPrice.toStringAsFixed(2)}${widget.itemStore != null ? ' from ${widget.itemStore}' : ''}'),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProgressCard() {
    final remaining = (_targetPrice - _currentTotal).clamp(0, double.infinity);
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text('Raised: \$${_currentTotal.toStringAsFixed(2)}'),
                Text('Goal: \$${_targetPrice.toStringAsFixed(2)}'),
              ],
            ),
            const SizedBox(height: 8),
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: _targetPrice > 0 ? (_currentTotal / _targetPrice).clamp(0, 1).toDouble() : 0,
                minHeight: 6,
              ),
            ),
            const SizedBox(height: 8),
            Text(
              remaining > 0 ? '\$${remaining.toStringAsFixed(2)} still needed' : 'Goal reached! 🎉',
              style: Theme.of(context).textTheme.bodySmall,
            ),
            if (_participants.isNotEmpty) ...[
              const SizedBox(height: 12),
              Text('Contributors (${_participants.length})', style: const TextStyle(fontWeight: FontWeight.w600)),
              const SizedBox(height: 6),
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: _participants.take(5).map((p) {
                  final isAnon = p['isAnonymous'] == true;
                  final user = p['user'] as Map<String, dynamic>?;
                  final name = isAnon || user == null ? 'Anonymous' : (user['displayName'] as String? ?? 'Someone');
                  final amount = (p['contributionAmount'] as num?) ?? (p['amount'] as num?) ?? 0;
                  return Chip(label: Text('$name (\$${amount.toStringAsFixed(0)})'));
                }).toList(),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildUnavailableCard() {
    return const Card(
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Text(
          'This group gift is fully funded or below the minimum contribution threshold.',
          textAlign: TextAlign.center,
        ),
      ),
    );
  }

  Widget _buildContributionForm() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text('Your Contribution', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        TextField(
          controller: _amountController,
          enabled: !_isProcessing,
          keyboardType: const TextInputType.numberWithOptions(decimal: true),
          decoration: InputDecoration(
            prefixText: '\$ ',
            helperText:
                'Allowed range: \$${_minContributionAmount.toStringAsFixed(2)} - \$${_maxAllowedContribution.toStringAsFixed(2)}',
          ),
        ),
        const SizedBox(height: 16),
        TextField(
          controller: _messageController,
          enabled: !_isProcessing,
          maxLines: 3,
          decoration: const InputDecoration(
            labelText: 'Message (optional)',
            alignLabelWithHint: true,
          ),
        ),
        const SizedBox(height: 8),
        CheckboxListTile(
          value: _isAnonymous,
          onChanged: _isProcessing ? null : (value) => setState(() => _isAnonymous = value ?? false),
          title: const Text('Make my contribution anonymous'),
          controlAffinity: ListTileControlAffinity.leading,
          contentPadding: EdgeInsets.zero,
        ),
        const SizedBox(height: 8),
        Text('Payment Method', style: Theme.of(context).textTheme.titleMedium),
        const SizedBox(height: 8),
        Container(
          decoration: BoxDecoration(border: Border.all(color: Colors.grey.shade400), borderRadius: BorderRadius.circular(8)),
          padding: const EdgeInsets.symmetric(horizontal: 8),
          child: CardField(
            onCardChanged: (details) => setState(() => _cardDetails = details),
          ),
        ),
        if (_submitError != null) ...[
          const SizedBox(height: 8),
          Text(_submitError!, style: const TextStyle(color: Colors.red)),
        ],
        const SizedBox(height: 16),
        ElevatedButton(
          onPressed: _isProcessing ? null : _submit,
          child: _isProcessing
              ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
              : const Text('Contribute'),
        ),
      ],
    );
  }
}
