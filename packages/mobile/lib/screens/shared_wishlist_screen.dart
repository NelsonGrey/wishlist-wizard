import 'package:flutter/material.dart';

import '../models/models.dart';
import '../services/firebase_functions_service.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_scaffold.dart';

/// Read-only public view of a wishlist, opened by its share id — the same
/// thing a recipient sees at `<web>/shared/<id>`. No edit affordances.
class SharedWishlistScreen extends StatefulWidget {
  const SharedWishlistScreen({
    super.key,
    required this.shareId,
    FirebaseFunctionsService? functionsService,
  }) : _functionsService = functionsService;

  final String shareId;
  final FirebaseFunctionsService? _functionsService;

  @override
  State<SharedWishlistScreen> createState() => _SharedWishlistScreenState();
}

class _SharedWishlistScreenState extends State<SharedWishlistScreen> {
  late final FirebaseFunctionsService _service =
      widget._functionsService ?? FirebaseFunctionsService();

  bool _loading = true;
  String? _error;
  Map<String, dynamic> _wishlist = const {};
  List<FirebaseWishlistItem> _items = const [];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _service.getSharedWishlist(widget.shareId);
      final w = (res['wishlist'] as Map?)?.cast<String, dynamic>() ?? {};
      final rawItems = (res['items'] as List?) ?? const [];
      setState(() {
        _wishlist = w;
        _items = rawItems
            .whereType<Map>()
            .map(
              (m) => FirebaseWishlistItem.fromFirestore(
                (m['id'] ?? '').toString(),
                m.cast<String, dynamic>(),
              ),
            )
            .toList();
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _error = 'This shared wishlist is unavailable or private.';
        _loading = false;
      });
    }
  }

  String _statusLabel(FirebaseWishlistItem i) {
    if (i.isPurchased) return 'Purchased';
    if (i.isReserved) return 'Reserved';
    return 'Available';
  }

  @override
  Widget build(BuildContext context) {
    final name = (_wishlist['name'] ?? _wishlist['title'] ?? 'Shared wishlist')
        .toString();

    return AppScaffold(
      title: _loading ? 'Shared wishlist' : name,
      showAd: false,
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_error!),
                  const SizedBox(height: 12),
                  ElevatedButton(onPressed: _load, child: const Text('Retry')),
                ],
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                if ((_wishlist['description'] ?? '').toString().isNotEmpty) ...[
                  Text(
                    _wishlist['description'].toString(),
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: AppColors.mutedForeground,
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                Text(
                  '${_items.length} item${_items.length == 1 ? '' : 's'}',
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: AppColors.mutedForeground,
                  ),
                ),
                const SizedBox(height: 8),
                if (_items.isEmpty)
                  const Padding(
                    padding: EdgeInsets.only(top: 24),
                    child: Text('This wishlist has no items yet.'),
                  )
                else
                  for (final item in _items)
                    Card(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: ListTile(
                        title: Text(item.name),
                        subtitle: Text(
                          [
                            if (item.price != null)
                              '${item.currency} ${item.price!.toStringAsFixed(2)}',
                            if ((item.store ?? '').isNotEmpty) item.store!,
                            _statusLabel(item),
                          ].join(' · '),
                        ),
                        trailing: item.isPurchased
                            ? const Icon(Icons.check, color: AppColors.success)
                            : item.isReserved
                            ? const Icon(
                                Icons.bookmark,
                                color: AppColors.warning,
                              )
                            : null,
                      ),
                    ),
              ],
            ),
    );
  }
}
