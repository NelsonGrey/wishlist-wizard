import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../widgets/admob_widgets.dart';
import '../main.dart';

class FirebaseWishlistsScreen extends StatefulWidget {
  const FirebaseWishlistsScreen({super.key});

  @override
  State<FirebaseWishlistsScreen> createState() =>
      _FirebaseWishlistsScreenState();
}

class _FirebaseWishlistsScreenState extends State<FirebaseWishlistsScreen> {
  @override
  void initState() {
    super.initState();
    _loadWishlists();
  }

  void _loadWishlists() {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final wishlistProvider = Provider.of<FirebaseWishlistProvider>(
      context,
      listen: false,
    );

    if (authProvider.user != null) {
      wishlistProvider.loadWishlists(authProvider.user!.id);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: const CustomAppBar(title: 'Firebase Wishlists'),
      body: Consumer2<AuthProvider, FirebaseWishlistProvider>(
        builder: (context, authProvider, wishlistProvider, child) {
          if (authProvider.user == null) {
            return const Center(child: Text('Please log in to view wishlists'));
          }

          if (wishlistProvider.isLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          if (wishlistProvider.error != null) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    wishlistProvider.error!,
                    style: const TextStyle(color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: () {
                      wishlistProvider.clearError();
                      _loadWishlists();
                    },
                    child: const Text('Retry'),
                  ),
                ],
              ),
            );
          }

          return StreamBuilder<List<FirebaseWishlist>>(
            stream: wishlistProvider.getWishlistsStream(authProvider.user!.id),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              if (snapshot.hasError) {
                return Center(
                  child: Text(
                    'Error: ${snapshot.error}',
                    style: const TextStyle(color: Colors.red),
                  ),
                );
              }

              final wishlists = snapshot.data ?? [];

              if (wishlists.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.list_alt, size: 64, color: Colors.grey[400]),
                      const SizedBox(height: 16),
                      Text(
                        'No wishlists yet',
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(color: Colors.grey[600]),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Create your first wishlist to get started!',
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                      const SizedBox(height: 24),
                      ElevatedButton.icon(
                        onPressed: () => _showCreateWishlistDialog(context),
                        icon: const Icon(Icons.add),
                        label: const Text('Create Wishlist'),
                      ),
                    ],
                  ),
                );
              }

              return Column(
                children: [
                  // Real-time indicator
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(8),
                    color: Colors.green.withValues(alpha: 0.1),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: const BoxDecoration(
                            color: Colors.green,
                            shape: BoxShape.circle,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text(
                          'Real-time Firebase sync active',
                          style: TextStyle(
                            color: Colors.green,
                            fontWeight: FontWeight.w500,
                            fontSize: 12,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Consumer<SubscriptionProvider>(
                    builder: (context, sub, _) {
                      if (sub.tier == 'free') {
                        return const AdContainer(
                          label: 'Advertisement',
                          child: BannerAdWidget(),
                        );
                      }
                      return const SizedBox.shrink();
                    },
                  ),
                  Expanded(
                    child: ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: wishlists.length,
                      itemBuilder: (context, index) {
                        final wishlist = wishlists[index];
                        return Card(
                          margin: const EdgeInsets.only(bottom: 12),
                          child: ListTile(
                            leading: CircleAvatar(
                              backgroundColor: Theme.of(
                                context,
                              ).primaryColor.withValues(alpha: 0.1),
                              child: Icon(
                                wishlist.isPublic ? Icons.public : Icons.lock,
                                color: Theme.of(context).primaryColor,
                              ),
                            ),
                            title: Text(
                              wishlist.name,
                              style: const TextStyle(
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                            subtitle: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                if (wishlist.description != null)
                                  Text(wishlist.description!),
                                const SizedBox(height: 4),
                                Row(
                                  children: [
                                    Icon(
                                      Icons.access_time,
                                      size: 14,
                                      color: Colors.grey[600],
                                    ),
                                    const SizedBox(width: 4),
                                    Text(
                                      _formatDate(wishlist.updatedAt),
                                      style: TextStyle(
                                        fontSize: 12,
                                        color: Colors.grey[600],
                                      ),
                                    ),
                                  ],
                                ),
                                if (wishlist.tags.isNotEmpty) ...[
                                  const SizedBox(height: 4),
                                  Wrap(
                                    spacing: 4,
                                    children: wishlist.tags.take(3).map((tag) {
                                      return Chip(
                                        label: Text(
                                          tag,
                                          style: const TextStyle(fontSize: 10),
                                        ),
                                        visualDensity: VisualDensity.compact,
                                        materialTapTargetSize:
                                            MaterialTapTargetSize.shrinkWrap,
                                      );
                                    }).toList(),
                                  ),
                                ],
                              ],
                            ),
                            onTap: () => _openWishlistItems(context, wishlist),
                            trailing: PopupMenuButton(
                              itemBuilder: (context) => [
                                const PopupMenuItem(
                                  value: 'edit',
                                  child: Row(
                                    children: [
                                      Icon(Icons.edit),
                                      SizedBox(width: 8),
                                      Text('Edit'),
                                    ],
                                  ),
                                ),
                                const PopupMenuItem(
                                  value: 'delete',
                                  child: Row(
                                    children: [
                                      Icon(Icons.delete, color: Colors.red),
                                      SizedBox(width: 8),
                                      Text(
                                        'Delete',
                                        style: TextStyle(color: Colors.red),
                                      ),
                                    ],
                                  ),
                                ),
                              ],
                              onSelected: (value) {
                                if (value == 'edit') {
                                  _showEditWishlistDialog(context, wishlist);
                                } else if (value == 'delete') {
                                  _confirmDeleteWishlist(context, wishlist);
                                }
                              },
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showCreateWishlistDialog(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  void _openWishlistItems(BuildContext context, FirebaseWishlist wishlist) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => FirebaseWishlistItemsScreen(wishlist: wishlist),
      ),
    );
  }

  void _showCreateWishlistDialog(BuildContext context) {
    final nameController = TextEditingController();
    final descriptionController = TextEditingController();
    bool isPublic = false;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Create Wishlist'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Wishlist Name',
                  hintText: 'Enter wishlist name',
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description (optional)',
                  hintText: 'Enter description',
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Checkbox(
                    value: isPublic,
                    onChanged: (value) =>
                        setState(() => isPublic = value ?? false),
                  ),
                  const Text('Make public'),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (nameController.text.trim().isEmpty) return;

                final authProvider = Provider.of<AuthProvider>(
                  context,
                  listen: false,
                );
                final wishlistProvider = Provider.of<FirebaseWishlistProvider>(
                  context,
                  listen: false,
                );

                Navigator.pop(context);

                final success = await wishlistProvider.createWishlist(
                  name: nameController.text.trim(),
                  userId: authProvider.user!.id,
                  description: descriptionController.text.trim().isEmpty
                      ? null
                      : descriptionController.text.trim(),
                  isPublic: isPublic,
                );

                if (!success && mounted) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          wishlistProvider.error ?? 'Failed to create wishlist',
                        ),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                }
              },
              child: const Text('Create'),
            ),
          ],
        ),
      ),
    );
  }

  void _showEditWishlistDialog(
    BuildContext context,
    FirebaseWishlist wishlist,
  ) {
    final nameController = TextEditingController(text: wishlist.name);
    final descriptionController = TextEditingController(
      text: wishlist.description ?? '',
    );
    bool isPublic = wishlist.isPublic;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Edit Wishlist'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(labelText: 'Wishlist Name'),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: descriptionController,
                decoration: const InputDecoration(
                  labelText: 'Description (optional)',
                ),
                maxLines: 2,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  Checkbox(
                    value: isPublic,
                    onChanged: (value) =>
                        setState(() => isPublic = value ?? false),
                  ),
                  const Text('Make public'),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (nameController.text.trim().isEmpty) return;

                final wishlistProvider = Provider.of<FirebaseWishlistProvider>(
                  context,
                  listen: false,
                );

                final updatedWishlist = FirebaseWishlist(
                  id: wishlist.id,
                  name: nameController.text.trim(),
                  description: descriptionController.text.trim().isEmpty
                      ? null
                      : descriptionController.text.trim(),
                  userId: wishlist.userId,
                  isPublic: isPublic,
                  tags: wishlist.tags,
                  createdAt: wishlist.createdAt,
                  updatedAt: DateTime.now(),
                );

                Navigator.pop(context);

                final success = await wishlistProvider.updateWishlist(
                  updatedWishlist,
                );

                if (!success && mounted) {
                  if (context.mounted) {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text(
                          wishlistProvider.error ?? 'Failed to update wishlist',
                        ),
                        backgroundColor: Colors.red,
                      ),
                    );
                  }
                }
              },
              child: const Text('Update'),
            ),
          ],
        ),
      ),
    );
  }

  void _confirmDeleteWishlist(BuildContext context, FirebaseWishlist wishlist) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Wishlist'),
        content: Text(
          'Are you sure you want to delete "${wishlist.name}"? This will also delete all items in the wishlist.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final wishlistProvider = Provider.of<FirebaseWishlistProvider>(
                context,
                listen: false,
              );

              Navigator.pop(context);

              final success = await wishlistProvider.deleteWishlist(
                wishlist.id,
              );

              if (!success && mounted) {
                if (context.mounted) {
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        wishlistProvider.error ?? 'Failed to delete wishlist',
                      ),
                      backgroundColor: Colors.red,
                    ),
                  );
                }
              }
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    final now = DateTime.now();
    final difference = now.difference(date);

    if (difference.inDays > 7) {
      return '${date.day}/${date.month}/${date.year}';
    } else if (difference.inDays > 0) {
      return '${difference.inDays} day${difference.inDays == 1 ? '' : 's'} ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours} hour${difference.inHours == 1 ? '' : 's'} ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes} minute${difference.inMinutes == 1 ? '' : 's'} ago';
    } else {
      return 'Just now';
    }
  }
}

class FirebaseWishlistItemsScreen extends StatefulWidget {
  final FirebaseWishlist wishlist;
  final String? initialItemId;

  const FirebaseWishlistItemsScreen({
    super.key,
    required this.wishlist,
    this.initialItemId,
  });

  @override
  State<FirebaseWishlistItemsScreen> createState() =>
      _FirebaseWishlistItemsScreenState();
}

class _FirebaseWishlistItemsScreenState
    extends State<FirebaseWishlistItemsScreen> {
  final ScrollController _scrollController = ScrollController();
  bool _didAutoScroll = false;

  String? _normalizeHttpUrl(String input) {
    final trimmed = input.trim();
    if (trimmed.isEmpty) {
      return null;
    }

    final normalizedInput = trimmed.contains('://')
        ? trimmed
        : 'https://$trimmed';
    final uri = Uri.tryParse(normalizedInput);

    if (uri == null || !uri.hasAuthority) {
      return null;
    }

    final scheme = uri.scheme.toLowerCase();
    if (scheme != 'http' && scheme != 'https') {
      return null;
    }

    return uri.toString();
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  void _autoScrollToFocusedItem(List<FirebaseWishlistItem> items) {
    if (_didAutoScroll ||
        widget.initialItemId == null ||
        !_scrollController.hasClients) {
      return;
    }

    final targetIndex = items.indexWhere(
      (item) => item.id == widget.initialItemId,
    );
    if (targetIndex == -1) {
      return;
    }

    const estimatedTileHeight = 110.0;
    final targetOffset = (targetIndex * estimatedTileHeight)
        .clamp(0.0, _scrollController.position.maxScrollExtent)
        .toDouble();

    _didAutoScroll = true;
    _scrollController.animateTo(
      targetOffset,
      duration: const Duration(milliseconds: 350),
      curve: Curves.easeOut,
    );
  }

  Future<void> _openItemUrl(String url) async {
    final normalizedUrl = _normalizeHttpUrl(url);
    if (normalizedUrl == null) {
      if (!mounted) return;
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('Invalid product URL.')));
      return;
    }

    final uri = Uri.parse(normalizedUrl);

    final launched = await launchUrl(uri, mode: LaunchMode.externalApplication);
    if (!launched && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to open product URL.')),
      );
    }
  }

  Future<void> _copyToClipboard(String value, String label) async {
    await Clipboard.setData(ClipboardData(text: value));
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text('$label copied to clipboard')));
  }

  void _showItemDetails(BuildContext context, FirebaseWishlistItem item) {
    final priceText = item.price != null
        ? '${item.currency} ${item.price!.toStringAsFixed(2)}'
        : 'Not set';

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(item.name, style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 8),
              if ((item.description ?? '').isNotEmpty) ...[
                Text(item.description!),
                const SizedBox(height: 8),
              ],
              Text('Price: $priceText'),
              const SizedBox(height: 4),
              Text('Priority: ${item.priority.name.toUpperCase()}'),
              const SizedBox(height: 4),
              Text(
                item.isPurchased
                    ? 'Status: Purchased'
                    : 'Status: Not purchased',
              ),
              const SizedBox(height: 16),
              if ((item.url ?? '').isNotEmpty)
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    onPressed: () async {
                      final url = item.url!;
                      Navigator.pop(context);
                      await _openItemUrl(url);
                    },
                    icon: const Icon(Icons.open_in_new),
                    label: const Text('Open Product Link'),
                  ),
                ),
              if ((item.url ?? '').isNotEmpty)
                SizedBox(
                  width: double.infinity,
                  child: OutlinedButton.icon(
                    onPressed: () => _copyToClipboard(item.url!, 'Product URL'),
                    icon: const Icon(Icons.copy),
                    label: const Text('Copy Product Link'),
                  ),
                ),
              SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _copyToClipboard(item.name, 'Item name'),
                  icon: const Icon(Icons.copy),
                  label: const Text('Copy Item Name'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildItemLeading(BuildContext context, FirebaseWishlistItem item) {
    final hasImage = (item.imageUrl ?? '').isNotEmpty;

    if (hasImage) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(20),
        child: Image.network(
          item.imageUrl!,
          width: 40,
          height: 40,
          fit: BoxFit.cover,
          errorBuilder: (context, error, stackTrace) => CircleAvatar(
            backgroundColor: item.isPurchased
                ? Colors.green.withValues(alpha: 0.1)
                : Theme.of(context).primaryColor.withValues(alpha: 0.1),
            child: Icon(
              item.isPurchased ? Icons.check : Icons.card_giftcard,
              color: item.isPurchased
                  ? Colors.green
                  : Theme.of(context).primaryColor,
            ),
          ),
        ),
      );
    }

    return CircleAvatar(
      backgroundColor: item.isPurchased
          ? Colors.green.withValues(alpha: 0.1)
          : Theme.of(context).primaryColor.withValues(alpha: 0.1),
      child: Icon(
        item.isPurchased ? Icons.check : Icons.card_giftcard,
        color: item.isPurchased ? Colors.green : Theme.of(context).primaryColor,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomAppBar(title: widget.wishlist.name),
      body: Consumer2<AuthProvider, FirebaseWishlistProvider>(
        builder: (context, authProvider, wishlistProvider, child) {
          if (authProvider.user == null) {
            return const Center(
              child: Text('Please log in to view wishlist items'),
            );
          }

          return StreamBuilder<List<FirebaseWishlistItem>>(
            stream: wishlistProvider.getWishlistItemsStream(widget.wishlist.id),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              if (snapshot.hasError) {
                return Center(
                  child: Text(
                    'Error loading items: ${snapshot.error}',
                    style: const TextStyle(color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                );
              }

              final items = snapshot.data ?? [];

              WidgetsBinding.instance.addPostFrameCallback((_) {
                if (!mounted) {
                  return;
                }
                _autoScrollToFocusedItem(items);
              });

              if (items.isEmpty) {
                return Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.card_giftcard,
                        size: 64,
                        color: Colors.grey[400],
                      ),
                      const SizedBox(height: 16),
                      Text(
                        'No items yet',
                        style: Theme.of(context).textTheme.headlineSmall
                            ?.copyWith(color: Colors.grey[600]),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Add your first item to this wishlist.',
                        style: TextStyle(color: Colors.grey[600]),
                      ),
                    ],
                  ),
                );
              }

              return ListView.builder(
                controller: _scrollController,
                padding: const EdgeInsets.all(16),
                itemCount: items.length,
                itemBuilder: (context, index) {
                  final item = items[index];
                  final isFocusedItem =
                      widget.initialItemId != null &&
                      item.id == widget.initialItemId;
                  final priceText = item.price != null
                      ? '${item.currency} ${item.price!.toStringAsFixed(2)}'
                      : null;

                  return Card(
                    margin: const EdgeInsets.only(bottom: 12),
                    color: isFocusedItem
                        ? Theme.of(context).primaryColor.withValues(alpha: 0.08)
                        : null,
                    child: ListTile(
                      leading: _buildItemLeading(context, item),
                      title: Text(
                        item.name,
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          decoration: item.isPurchased
                              ? TextDecoration.lineThrough
                              : TextDecoration.none,
                        ),
                      ),
                      subtitle: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          if ((item.description ?? '').isNotEmpty)
                            Text(item.description!),
                          if (priceText != null)
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                priceText,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          if (isFocusedItem)
                            Padding(
                              padding: const EdgeInsets.only(top: 4),
                              child: Text(
                                'Related to selected notification',
                                style: TextStyle(
                                  fontSize: 12,
                                  color: Theme.of(context).primaryColor,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                        ],
                      ),
                      onTap: () => _showItemDetails(context, item),
                      trailing: PopupMenuButton<String>(
                        onSelected: (value) async {
                          if (value == 'edit') {
                            _showEditItemDialog(context, item);
                            return;
                          }

                          if (value == 'toggle') {
                            if (item.isPurchased) {
                              final updated = FirebaseWishlistItem(
                                id: item.id,
                                name: item.name,
                                description: item.description,
                                price: item.price,
                                currency: item.currency,
                                url: item.url,
                                imageUrl: item.imageUrl,
                                wishlistId: item.wishlistId,
                                userId: item.userId,
                                isPurchased: false,
                                purchasedBy: null,
                                purchasedAt: null,
                                tags: item.tags,
                                priority: item.priority,
                                createdAt: item.createdAt,
                                updatedAt: DateTime.now(),
                              );
                              await wishlistProvider.updateWishlistItem(
                                updated,
                              );
                            } else {
                              await wishlistProvider.markItemAsPurchased(
                                item.id,
                                authProvider.user!.id,
                              );
                            }
                          }

                          if (value == 'delete') {
                            await wishlistProvider.deleteWishlistItem(
                              item.id,
                              widget.wishlist.id,
                            );
                          }
                        },
                        itemBuilder: (context) => [
                          const PopupMenuItem(
                            value: 'edit',
                            child: Row(
                              children: [
                                Icon(Icons.edit),
                                SizedBox(width: 8),
                                Text('Edit'),
                              ],
                            ),
                          ),
                          PopupMenuItem(
                            value: 'toggle',
                            child: Row(
                              children: [
                                Icon(
                                  item.isPurchased ? Icons.undo : Icons.check,
                                ),
                                const SizedBox(width: 8),
                                Text(
                                  item.isPurchased
                                      ? 'Mark unpurchased'
                                      : 'Mark purchased',
                                ),
                              ],
                            ),
                          ),
                          const PopupMenuItem(
                            value: 'delete',
                            child: Row(
                              children: [
                                Icon(Icons.delete, color: Colors.red),
                                SizedBox(width: 8),
                                Text(
                                  'Delete',
                                  style: TextStyle(color: Colors.red),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddItemDialog(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  void _showEditItemDialog(BuildContext context, FirebaseWishlistItem item) {
    final nameController = TextEditingController(text: item.name);
    final descriptionController = TextEditingController(
      text: item.description ?? '',
    );
    final priceController = TextEditingController(
      text: item.price?.toString() ?? '',
    );
    final urlController = TextEditingController(text: item.url ?? '');
    final imageUrlController = TextEditingController(text: item.imageUrl ?? '');

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Item'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'Item name'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description (optional)',
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: priceController,
              decoration: const InputDecoration(labelText: 'Price (optional)'),
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: urlController,
              decoration: const InputDecoration(
                labelText: 'Product URL (optional)',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: imageUrlController,
              decoration: const InputDecoration(
                labelText: 'Image URL (optional)',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final wishlistProvider = Provider.of<FirebaseWishlistProvider>(
                context,
                listen: false,
              );

              if (nameController.text.trim().isEmpty) {
                return;
              }

              final priceText = priceController.text.trim();
              final parsedPrice = priceText.isEmpty
                  ? null
                  : double.tryParse(priceText);
              final rawUrlText = urlController.text.trim();
              final rawImageUrlText = imageUrlController.text.trim();
              final normalizedUrlText = _normalizeHttpUrl(rawUrlText);
              final normalizedImageUrlText = _normalizeHttpUrl(rawImageUrlText);

              if (rawUrlText.isNotEmpty && normalizedUrlText == null) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Please enter a valid product URL.'),
                  ),
                );
                return;
              }

              if (rawImageUrlText.isNotEmpty &&
                  normalizedImageUrlText == null) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Please enter a valid image URL.'),
                  ),
                );
                return;
              }

              final updatedItem = FirebaseWishlistItem(
                id: item.id,
                name: nameController.text.trim(),
                description: descriptionController.text.trim().isEmpty
                    ? null
                    : descriptionController.text.trim(),
                price: parsedPrice,
                currency: item.currency,
                url: normalizedUrlText,
                imageUrl: normalizedImageUrlText,
                wishlistId: item.wishlistId,
                userId: item.userId,
                isPurchased: item.isPurchased,
                purchasedBy: item.purchasedBy,
                purchasedAt: item.purchasedAt,
                tags: item.tags,
                priority: item.priority,
                createdAt: item.createdAt,
                updatedAt: DateTime.now(),
              );

              Navigator.pop(context);

              final success = await wishlistProvider.updateWishlistItem(
                updatedItem,
              );

              if (!success && context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      wishlistProvider.error ?? 'Failed to update item',
                    ),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            child: const Text('Update'),
          ),
        ],
      ),
    );
  }

  void _showAddItemDialog(BuildContext context) {
    final nameController = TextEditingController();
    final descriptionController = TextEditingController();
    final priceController = TextEditingController();
    final urlController = TextEditingController();
    final imageUrlController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Item'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'Item name'),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: descriptionController,
              decoration: const InputDecoration(
                labelText: 'Description (optional)',
              ),
              maxLines: 2,
            ),
            const SizedBox(height: 12),
            TextField(
              controller: priceController,
              decoration: const InputDecoration(labelText: 'Price (optional)'),
              keyboardType: const TextInputType.numberWithOptions(
                decimal: true,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: urlController,
              decoration: const InputDecoration(
                labelText: 'Product URL (optional)',
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: imageUrlController,
              decoration: const InputDecoration(
                labelText: 'Image URL (optional)',
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final authProvider = Provider.of<AuthProvider>(
                context,
                listen: false,
              );
              final wishlistProvider = Provider.of<FirebaseWishlistProvider>(
                context,
                listen: false,
              );

              if (authProvider.user == null ||
                  nameController.text.trim().isEmpty) {
                return;
              }

              final parsedPrice = double.tryParse(priceController.text.trim());
              final rawUrlText = urlController.text.trim();
              final rawImageUrlText = imageUrlController.text.trim();
              final normalizedUrlText = _normalizeHttpUrl(rawUrlText);
              final normalizedImageUrlText = _normalizeHttpUrl(rawImageUrlText);

              if (rawUrlText.isNotEmpty && normalizedUrlText == null) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Please enter a valid product URL.'),
                  ),
                );
                return;
              }

              if (rawImageUrlText.isNotEmpty &&
                  normalizedImageUrlText == null) {
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(
                    content: Text('Please enter a valid image URL.'),
                  ),
                );
                return;
              }

              Navigator.pop(context);

              final success = await wishlistProvider.addWishlistItem(
                name: nameController.text.trim(),
                description: descriptionController.text.trim().isEmpty
                    ? null
                    : descriptionController.text.trim(),
                price: parsedPrice,
                url: normalizedUrlText,
                imageUrl: normalizedImageUrlText,
                wishlistId: widget.wishlist.id,
                userId: authProvider.user!.id,
              );

              if (!success && context.mounted) {
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(
                      wishlistProvider.error ?? 'Failed to add item',
                    ),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            child: const Text('Add'),
          ),
        ],
      ),
    );
  }
}
