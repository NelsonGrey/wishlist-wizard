import 'package:flutter/material.dart';

import '../services/firebase_functions_service.dart';

double _parsePrice(dynamic value) {
  if (value is num) return value.toDouble();
  final cleaned = (value?.toString() ?? '').replaceAll(RegExp(r'[$,]'), '');
  return double.tryParse(cleaned) ?? 0;
}

/// Price alerts + recent price drops across the user's wishlist items --
/// mirrors web's PriceTracking.tsx "Your Alerts" and "Price Drops" tabs
/// (Intelligence/Volatility are analytics-heavy sub-tabs left for a later
/// pass). Reached from the Profile tab.
class PriceTrackingScreen extends StatefulWidget {
  const PriceTrackingScreen({super.key, FirebaseFunctionsService? functionsService})
      : _functionsService = functionsService;

  // Injectable for tests; defaults to the real Firebase-backed singleton.
  final FirebaseFunctionsService? _functionsService;

  @override
  State<PriceTrackingScreen> createState() => _PriceTrackingScreenState();
}

class _PriceTrackingScreenState extends State<PriceTrackingScreen> {
  late final FirebaseFunctionsService _service =
      widget._functionsService ?? FirebaseFunctionsService();

  bool _isLoadingAlerts = true;
  String? _alertsError;
  List<Map<String, dynamic>> _alerts = [];

  bool _isLoadingDrops = true;
  String? _dropsError;
  List<Map<String, dynamic>> _drops = [];

  String? _busyAlertId;

  @override
  void initState() {
    super.initState();
    _loadAlerts();
    _loadDrops();
  }

  Future<void> _loadAlerts() async {
    setState(() {
      _isLoadingAlerts = true;
      _alertsError = null;
    });
    try {
      final alerts = await _service.getPriceAlerts();
      if (!mounted) return;
      setState(() {
        _alerts = alerts;
        _isLoadingAlerts = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _alertsError = 'Failed to load price alerts.';
        _isLoadingAlerts = false;
      });
    }
  }

  Future<void> _loadDrops() async {
    setState(() {
      _isLoadingDrops = true;
      _dropsError = null;
    });
    try {
      final drops = await _service.getPriceDrops();
      if (!mounted) return;
      setState(() {
        _drops = drops;
        _isLoadingDrops = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _dropsError = 'Failed to load price drops.';
        _isLoadingDrops = false;
      });
    }
  }

  Future<void> _deleteAlert(String alertId) async {
    setState(() => _busyAlertId = alertId);
    try {
      await _service.deletePriceAlert(alertId);
      await _loadAlerts();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to delete price alert.'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _busyAlertId = null);
    }
  }

  Future<void> _openCreateAlertSheet() async {
    final created = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _CreatePriceAlertSheet(service: _service),
    );
    if (created == true) {
      _loadAlerts();
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Price Tracking'),
          bottom: const TabBar(
            tabs: [Tab(text: 'Your Alerts'), Tab(text: 'Price Drops')],
          ),
        ),
        floatingActionButton: FloatingActionButton(
          onPressed: _openCreateAlertSheet,
          tooltip: 'Add price alert',
          child: const Icon(Icons.add_alert_outlined),
        ),
        body: TabBarView(
          children: [_buildAlertsTab(), _buildDropsTab()],
        ),
      ),
    );
  }

  Widget _buildAlertsTab() {
    return RefreshIndicator(
      onRefresh: _loadAlerts,
      child: _isLoadingAlerts
          ? const Center(child: CircularProgressIndicator())
          : _alertsError != null
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    const SizedBox(height: 80),
                    Center(child: Text(_alertsError!, style: const TextStyle(color: Colors.red))),
                  ],
                )
              : _alerts.isEmpty
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16),
                      children: const [
                        SizedBox(height: 60),
                        Center(
                          child: Text(
                            'No price alerts set. Tap + to track an item.',
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                    )
                  : ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16),
                      children: _alerts.map(_buildAlertCard).toList(),
                    ),
    );
  }

  Widget _buildAlertCard(Map<String, dynamic> alert) {
    final id = alert['id'] as String;
    final item = alert['item'] as Map<String, dynamic>? ?? {};
    final title = item['title'] as String? ?? 'Item';
    final target = _parsePrice(alert['targetPrice']);
    final current = _parsePrice(alert['currentPrice'] ?? item['price']);
    final notified = alert['notified'] == true;
    final atTarget = current > 0 && target > 0 && current <= target;
    final busy = _busyAlertId == id;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text('Current: \$${current.toStringAsFixed(2)}  •  Target: \$${target.toStringAsFixed(2)}'),
                  const SizedBox(height: 4),
                  if (notified)
                    const _StatusChip(label: 'Triggered', color: Colors.green)
                  else if (atTarget)
                    const _StatusChip(label: 'At Target', color: Colors.blue)
                  else
                    const _StatusChip(label: 'Active', color: Colors.grey),
                ],
              ),
            ),
            busy
                ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : IconButton(
                    icon: const Icon(Icons.delete_outline),
                    tooltip: 'Delete price alert',
                    onPressed: () => _deleteAlert(id),
                  ),
          ],
        ),
      ),
    );
  }

  Widget _buildDropsTab() {
    return RefreshIndicator(
      onRefresh: _loadDrops,
      child: _isLoadingDrops
          ? const Center(child: CircularProgressIndicator())
          : _dropsError != null
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    const SizedBox(height: 80),
                    Center(child: Text(_dropsError!, style: const TextStyle(color: Colors.red))),
                  ],
                )
              : _drops.isEmpty
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16),
                      children: const [
                        SizedBox(height: 60),
                        Center(
                          child: Text(
                            'No significant price drops found yet.',
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                    )
                  : ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16),
                      children: _drops.map(_buildDropCard).toList(),
                    ),
    );
  }

  Widget _buildDropCard(Map<String, dynamic> drop) {
    final title = drop['title'] as String? ?? 'Item';
    final store = drop['store'] as String?;
    final previous = _parsePrice(drop['previousPrice']);
    final current = _parsePrice(drop['currentPrice'] ?? drop['price']);
    final percent = (drop['percentDrop'] ?? drop['dropPercentage'] ?? 0) as num;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                  if (store != null) Text(store, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Text(
                        '\$${previous.toStringAsFixed(2)}',
                        style: const TextStyle(decoration: TextDecoration.lineThrough, color: Colors.grey),
                      ),
                      const SizedBox(width: 8),
                      Text('\$${current.toStringAsFixed(2)}', style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: Colors.green.shade100, borderRadius: BorderRadius.circular(999)),
              child: Text('${percent.toStringAsFixed(0)}% off', style: TextStyle(color: Colors.green.shade800, fontWeight: FontWeight.w600, fontSize: 12)),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({required this.label, required this.color});

  final String label;
  final MaterialColor color;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: color.shade100, borderRadius: BorderRadius.circular(999)),
      child: Text(label, style: TextStyle(color: color.shade700, fontSize: 11, fontWeight: FontWeight.w600)),
    );
  }
}

class _CreatePriceAlertSheet extends StatefulWidget {
  const _CreatePriceAlertSheet({required this.service});

  final FirebaseFunctionsService service;

  @override
  State<_CreatePriceAlertSheet> createState() => _CreatePriceAlertSheetState();
}

class _CreatePriceAlertSheetState extends State<_CreatePriceAlertSheet> {
  bool _isLoadingItems = true;
  String? _loadError;
  List<Map<String, dynamic>> _items = [];
  String? _selectedItemId;
  final _targetPriceController = TextEditingController();
  bool _isSubmitting = false;
  String? _submitError;

  @override
  void initState() {
    super.initState();
    _loadItems();
  }

  @override
  void dispose() {
    _targetPriceController.dispose();
    super.dispose();
  }

  Future<void> _loadItems() async {
    try {
      final items = await widget.service.getAllWishlistItems();
      if (!mounted) return;
      setState(() {
        _items = items;
        _isLoadingItems = false;
        if (items.isNotEmpty) {
          _selectedItemId = items.first['id'].toString();
          _prefillTargetPrice();
        }
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadError = 'Failed to load your wishlist items.';
        _isLoadingItems = false;
      });
    }
  }

  Map<String, dynamic>? _selectedItem() {
    for (final item in _items) {
      if (item['id'].toString() == _selectedItemId) return item;
    }
    return null;
  }

  void _prefillTargetPrice() {
    final current = _parsePrice(_selectedItem()?['price']);
    if (current > 0) {
      _targetPriceController.text = (current * 0.9).toStringAsFixed(2);
    } else {
      _targetPriceController.clear();
    }
  }

  Future<void> _submit() async {
    final itemId = _selectedItemId;
    if (itemId == null) return;
    final targetPrice = double.tryParse(_targetPriceController.text.trim());
    if (targetPrice == null || targetPrice <= 0) {
      setState(() => _submitError = 'Enter a valid target price.');
      return;
    }
    final currentPrice = _parsePrice(_selectedItem()?['price']);
    if (currentPrice > 0 && targetPrice >= currentPrice) {
      setState(() => _submitError = 'Target price should be below the current price.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _submitError = null;
    });
    try {
      await widget.service.createPriceAlert(itemId: itemId, targetPrice: targetPrice);
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitError = 'Failed to create price alert.';
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: _isLoadingItems
          ? const SizedBox(height: 120, child: Center(child: CircularProgressIndicator()))
          : _loadError != null
              ? SizedBox(height: 120, child: Center(child: Text(_loadError!, style: const TextStyle(color: Colors.red))))
              : _items.isEmpty
                  ? const SizedBox(
                      height: 120,
                      child: Center(child: Text('No wishlist items found yet. Add items to start tracking prices.')),
                    )
                  : Column(
                      mainAxisSize: MainAxisSize.min,
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text('Add Price Alert', style: Theme.of(context).textTheme.titleLarge),
                        const SizedBox(height: 16),
                        DropdownButtonFormField<String>(
                          initialValue: _selectedItemId,
                          decoration: const InputDecoration(labelText: 'Item'),
                          items: _items
                              .map(
                                (item) => DropdownMenuItem(
                                  value: item['id'].toString(),
                                  child: Text(
                                    item['title'] as String? ?? 'Item',
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ),
                              )
                              .toList(),
                          onChanged: _isSubmitting
                              ? null
                              : (value) {
                                  setState(() {
                                    _selectedItemId = value;
                                    _prefillTargetPrice();
                                  });
                                },
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _targetPriceController,
                          enabled: !_isSubmitting,
                          keyboardType: const TextInputType.numberWithOptions(decimal: true),
                          decoration: const InputDecoration(
                            labelText: 'Target Price',
                            prefixText: '\$ ',
                          ),
                        ),
                        if (_submitError != null) ...[
                          const SizedBox(height: 8),
                          Text(_submitError!, style: const TextStyle(color: Colors.red)),
                        ],
                        const SizedBox(height: 16),
                        Row(
                          children: [
                            Expanded(
                              child: OutlinedButton(
                                onPressed: _isSubmitting ? null : () => Navigator.pop(context, false),
                                child: const Text('Cancel'),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: ElevatedButton(
                                onPressed: _isSubmitting ? null : _submit,
                                child: _isSubmitting
                                    ? const SizedBox(
                                        height: 16,
                                        width: 16,
                                        child: CircularProgressIndicator(strokeWidth: 2),
                                      )
                                    : const Text('Save'),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
    );
  }
}
