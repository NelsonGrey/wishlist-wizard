import 'package:flutter/material.dart';
import '../models/models.dart';
import '../main.dart';

class PriceTrackingScreen extends StatefulWidget {
  final WishlistItem item;

  const PriceTrackingScreen({super.key, required this.item});

  @override
  State<PriceTrackingScreen> createState() => _PriceTrackingScreenState();
}

class _PriceTrackingScreenState extends State<PriceTrackingScreen> {
  bool _alertsEnabled = false;

  @override
  Widget build(BuildContext context) {
    final itemPrice = widget.item.price ?? 0.0;

    return Scaffold(
      appBar: CustomAppBar(
        title: 'Price Tracking',
        actions: [
          IconButton(
            icon: Icon(
              _alertsEnabled
                  ? Icons.notifications_active
                  : Icons.notifications_none,
            ),
            onPressed: () {
              setState(() {
                _alertsEnabled = !_alertsEnabled;
              });
              ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(
                  content: Text(
                    _alertsEnabled
                        ? 'Price alerts enabled'
                        : 'Price alerts disabled',
                  ),
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Product info card
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    if (widget.item.imageUrl != null)
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.network(
                          widget.item.imageUrl!,
                          width: 80,
                          height: 80,
                          fit: BoxFit.cover,
                          errorBuilder: (context, error, stackTrace) {
                            return Container(
                              width: 80,
                              height: 80,
                              color: Colors.grey[300],
                              child: const Icon(Icons.image_not_supported),
                            );
                          },
                        ),
                      )
                    else
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: Colors.grey[300],
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: const Icon(Icons.image_not_supported),
                      ),
                    const SizedBox(width: 16),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.item.name,
                            style: Theme.of(context).textTheme.titleMedium
                                ?.copyWith(fontWeight: FontWeight.bold),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            '\$${itemPrice.toStringAsFixed(2)}',
                            style: Theme.of(context).textTheme.headlineSmall
                                ?.copyWith(
                                  color: Theme.of(context).primaryColor,
                                  fontWeight: FontWeight.bold,
                                ),
                          ),
                          if (widget.item.productUrl != null)
                            Text(
                              Uri.tryParse(widget.item.productUrl!)?.host ??
                                  widget.item.productUrl!,
                              style: TextStyle(color: Colors.grey[600]),
                            ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 24),

            // Price history section
            Text(
              'Price History',
              style: Theme.of(
                context,
              ).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            _buildPriceChart(),
            const SizedBox(height: 24),

            // Price statistics
            _buildPriceStatistics(),
            const SizedBox(height: 24),

            // Alert settings
            _buildAlertSettings(),
          ],
        ),
      ),
    );
  }

  Widget _buildPriceChart() {
    // Mock price history data - in production, fetch from Firestore
    final itemPrice = widget.item.price ?? 0.0;
    final priceHistory = [
      {
        'date': DateTime.now().subtract(const Duration(days: 30)),
        'price': itemPrice * 1.2,
      },
      {
        'date': DateTime.now().subtract(const Duration(days: 25)),
        'price': itemPrice * 1.15,
      },
      {
        'date': DateTime.now().subtract(const Duration(days: 20)),
        'price': itemPrice * 1.1,
      },
      {
        'date': DateTime.now().subtract(const Duration(days: 15)),
        'price': itemPrice * 1.05,
      },
      {
        'date': DateTime.now().subtract(const Duration(days: 10)),
        'price': itemPrice * 1.0,
      },
      {
        'date': DateTime.now().subtract(const Duration(days: 5)),
        'price': itemPrice * 0.95,
      },
      {'date': DateTime.now(), 'price': itemPrice},
    ];

    final prices = priceHistory.map((e) => e['price'] as double).toList();
    final minPrice = prices.reduce((a, b) => a < b ? a : b);
    final maxPrice = prices.reduce((a, b) => a > b ? a : b);
    final currentPrice = itemPrice;
    final lowestPrice = minPrice;
    final savings = currentPrice - lowestPrice;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Price summary
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                _buildPriceStat('Current', currentPrice, Colors.blue),
                _buildPriceStat('Lowest', lowestPrice, Colors.green),
                _buildPriceStat('Highest', maxPrice, Colors.red),
              ],
            ),
            const SizedBox(height: 16),
            if (savings > 0)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.green.withValues(alpha: 0.1),
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(
                    color: Colors.green.withValues(alpha: 0.3),
                  ),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.trending_down, color: Colors.green),
                    const SizedBox(width: 8),
                    Text(
                      'You save \$${savings.toStringAsFixed(2)} compared to the lowest price!',
                      style: const TextStyle(
                        color: Colors.green,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ],
                ),
              ),
            const SizedBox(height: 16),
            // Simple bar chart representation
            SizedBox(
              height: 150,
              child: CustomPaint(
                painter: PriceChartPainter(priceHistory),
                size: const Size(double.infinity, 150),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildPriceStat(String label, double price, Color color) {
    return Column(
      children: [
        Text(label, style: TextStyle(color: Colors.grey[600], fontSize: 12)),
        const SizedBox(height: 4),
        Text(
          '\$${price.toStringAsFixed(2)}',
          style: TextStyle(
            color: color,
            fontSize: 16,
            fontWeight: FontWeight.bold,
          ),
        ),
      ],
    );
  }

  Widget _buildPriceStatistics() {
    final itemPrice = widget.item.price ?? 0.0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Price Statistics',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            _buildStatRow('Price Drop (30 days)', '-15%', Colors.green),
            _buildStatRow(
              'Average Price',
              '\$${(itemPrice * 1.1).toStringAsFixed(2)}',
              Colors.grey,
            ),
            _buildStatRow('Volatility', 'Low', Colors.blue),
            _buildStatRow('Last Updated', '2 hours ago', Colors.grey),
          ],
        ),
      ),
    );
  }

  Widget _buildStatRow(String label, String value, Color color) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey[700])),
          Text(
            value,
            style: TextStyle(color: color, fontWeight: FontWeight.w600),
          ),
        ],
      ),
    );
  }

  Widget _buildAlertSettings() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Price Alerts',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            SwitchListTile(
              title: const Text('Enable Price Alerts'),
              subtitle: const Text('Get notified when price drops'),
              value: _alertsEnabled,
              onChanged: (value) {
                setState(() {
                  _alertsEnabled = value;
                });
              },
            ),
            if (_alertsEnabled) ...[
              const SizedBox(height: 16),
              Text(
                'Alert when price drops below:',
                style: TextStyle(color: Colors.grey[700]),
              ),
              const SizedBox(height: 8),
              TextField(
                decoration: const InputDecoration(
                  prefixText: '\$',
                  labelText: 'Price threshold',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.number,
                onChanged: (_) {},
              ),
              const SizedBox(height: 16),
              ElevatedButton(
                onPressed: () {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Alert settings saved')),
                  );
                },
                child: const Text('Save Alert Settings'),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class PriceChartPainter extends CustomPainter {
  final List<Map<String, dynamic>> priceHistory;

  PriceChartPainter(this.priceHistory);

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0xFF6B46C1)
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    final prices = priceHistory.map((e) => e['price'] as double).toList();
    final minPrice = prices.reduce((a, b) => a < b ? a : b);
    final maxPrice = prices.reduce((a, b) => a > b ? a : b);
    final priceRange = (maxPrice - minPrice) == 0 ? 1.0 : (maxPrice - minPrice);

    final path = Path();
    final barWidth = size.width / priceHistory.length;

    for (int i = 0; i < priceHistory.length; i++) {
      final price = prices[i];
      final normalizedPrice = (price - minPrice) / priceRange;
      final x = i * barWidth + barWidth / 2;
      final y = size.height - (normalizedPrice * size.height * 0.8) - 10;

      if (i == 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }

      // Draw point
      canvas.drawCircle(
        Offset(x, y),
        4,
        Paint()..color = const Color(0xFF6B46C1),
      );
    }

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
