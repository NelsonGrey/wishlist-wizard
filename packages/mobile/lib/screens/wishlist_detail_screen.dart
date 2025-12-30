import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../main.dart';

class WishlistDetailScreen extends StatefulWidget {
  final Wishlist wishlist;

  const WishlistDetailScreen({super.key, required this.wishlist});

  @override
  State<WishlistDetailScreen> createState() => _WishlistDetailScreenState();
}

class _WishlistDetailScreenState extends State<WishlistDetailScreen> {
  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: CustomAppBar(
        title: widget.wishlist.name,
        actions: [
          PopupMenuButton(
            itemBuilder: (context) => [
              const PopupMenuItem(
                value: 'edit',
                child: Row(
                  children: [
                    Icon(Icons.edit),
                    SizedBox(width: 8),
                    Text('Edit Wishlist'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'share',
                child: Row(
                  children: [
                    Icon(Icons.share),
                    SizedBox(width: 8),
                    Text('Share'),
                  ],
                ),
              ),
              const PopupMenuItem(
                value: 'delete',
                child: Row(
                  children: [
                    Icon(Icons.delete, color: Colors.red),
                    SizedBox(width: 8),
                    Text('Delete', style: TextStyle(color: Colors.red)),
                  ],
                ),
              ),
            ],
            onSelected: (value) {
              switch (value) {
                case 'edit':
                  _showEditWishlistDialog();
                  break;
                case 'share':
                  _shareWishlist();
                  break;
                case 'delete':
                  _confirmDeleteWishlist();
                  break;
              }
            },
          ),
        ],
      ),
      body: Consumer<WishlistProvider>(
        builder: (context, provider, child) {
          // Find the current wishlist from the provider
          final currentWishlist = provider.wishlists.firstWhere(
            (w) => w.id == widget.wishlist.id,
            orElse: () => widget.wishlist,
          );

          return Column(
            children: [
              // Wishlist header
              _buildWishlistHeader(currentWishlist),

              // Items list
              Expanded(child: _buildItemsList(currentWishlist)),
            ],
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () => _showAddItemDialog(),
        child: const Icon(Icons.add),
      ),
    );
  }

  Widget _buildWishlistHeader(Wishlist wishlist) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Theme.of(context).primaryColor.withValues(alpha: 0.1),
        border: Border(
          bottom: BorderSide(color: Theme.of(context).dividerColor),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(
                wishlist.isPublic ? Icons.public : Icons.lock,
                color: Theme.of(context).primaryColor,
              ),
              const SizedBox(width: 8),
              Text(
                wishlist.isPublic ? 'Public' : 'Private',
                style: TextStyle(
                  color: Theme.of(context).primaryColor,
                  fontWeight: FontWeight.w500,
                ),
              ),
              const Spacer(),
              Text(
                '${wishlist.items.length} items',
                style: TextStyle(color: Colors.grey[600]),
              ),
            ],
          ),
          if (wishlist.description != null) ...[
            const SizedBox(height: 8),
            Text(
              wishlist.description!,
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
          const SizedBox(height: 8),
          Text(
            'Created ${_formatDate(wishlist.createdAt)}',
            style: TextStyle(color: Colors.grey[600], fontSize: 12),
          ),
        ],
      ),
    );
  }

  Widget _buildItemsList(Wishlist wishlist) {
    if (wishlist.items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.card_giftcard_outlined,
              size: 64,
              color: Colors.grey[400],
            ),
            const SizedBox(height: 16),
            Text(
              'No items yet',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 8),
            Text(
              'Add your first item to get started',
              style: TextStyle(color: Colors.grey[600]),
            ),
            const SizedBox(height: 24),
            ElevatedButton.icon(
              onPressed: () => _showAddItemDialog(),
              icon: const Icon(Icons.add),
              label: const Text('Add Item'),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: wishlist.items.length,
      itemBuilder: (context, index) {
        final item = wishlist.items[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: item.imageUrl != null
                ? ClipRRect(
                    borderRadius: BorderRadius.circular(8),
                    child: Image.network(
                      item.imageUrl!,
                      width: 56,
                      height: 56,
                      fit: BoxFit.cover,
                      errorBuilder: (context, error, stackTrace) {
                        return Container(
                          width: 56,
                          height: 56,
                          decoration: BoxDecoration(
                            color: Colors.grey[200],
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Icon(Icons.image_not_supported),
                        );
                      },
                    ),
                  )
                : Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: Theme.of(
                        context,
                      ).primaryColor.withValues(alpha: 0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Icon(
                      Icons.card_giftcard,
                      color: Theme.of(context).primaryColor,
                    ),
                  ),
            title: Text(
              item.name,
              style: TextStyle(
                decoration: item.isPurchased
                    ? TextDecoration.lineThrough
                    : null,
                color: item.isPurchased ? Colors.grey : null,
              ),
            ),
            subtitle: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (item.description != null)
                  Text(
                    item.description!,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                if (item.price != null)
                  Text(
                    '\$${item.price!.toStringAsFixed(2)}',
                    style: TextStyle(
                      color: Theme.of(context).primaryColor,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                if (item.isPurchased)
                  const Text(
                    'Purchased',
                    style: TextStyle(
                      color: Colors.green,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
              ],
            ),
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
                if (!item.isPurchased)
                  const PopupMenuItem(
                    value: 'purchase',
                    child: Row(
                      children: [
                        Icon(Icons.check_circle, color: Colors.green),
                        SizedBox(width: 8),
                        Text('Mark as Purchased'),
                      ],
                    ),
                  ),
                if (item.productUrl != null)
                  const PopupMenuItem(
                    value: 'open_link',
                    child: Row(
                      children: [
                        Icon(Icons.open_in_new),
                        SizedBox(width: 8),
                        Text('Open Link'),
                      ],
                    ),
                  ),
                const PopupMenuItem(
                  value: 'delete',
                  child: Row(
                    children: [
                      Icon(Icons.delete, color: Colors.red),
                      SizedBox(width: 8),
                      Text('Delete', style: TextStyle(color: Colors.red)),
                    ],
                  ),
                ),
              ],
              onSelected: (value) => _handleItemAction(value, item),
            ),
          ),
        );
      },
    );
  }

  Future<void> _handleItemAction(String action, WishlistItem item) async {
    switch (action) {
      case 'edit':
        _showEditItemDialog(item);
        break;
      case 'purchase':
        _markAsPurchased(item);
        break;
      case 'open_link':
        if (item.productUrl != null && item.productUrl!.isNotEmpty) {
          final uri = Uri.tryParse(item.productUrl!);
          if (uri != null && await canLaunchUrl(uri)) {
            await launchUrl(uri, mode: LaunchMode.externalApplication);
          } else {
            if (!mounted) return;
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Unable to open link')),
            );
          }
        }
        break;
      case 'delete':
        _confirmDeleteItem(item);
        break;
    }
  }

  void _showAddItemDialog() {
    final nameController = TextEditingController();
    final descriptionController = TextEditingController();
    final priceController = TextEditingController();
    final urlController = TextEditingController();

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Add Item'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Item Name',
                  hintText: 'What do you want?',
                ),
                autofocus: true,
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
              TextField(
                controller: priceController,
                decoration: const InputDecoration(
                  labelText: 'Price (optional)',
                  prefixText: '\$',
                ),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: urlController,
                decoration: const InputDecoration(
                  labelText: 'Product URL (optional)',
                  hintText: 'https://...',
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.trim().isEmpty) return;

              final name = nameController.text.trim();
              final description = descriptionController.text.trim().isEmpty
                  ? null
                  : descriptionController.text.trim();
              final productUrl = urlController.text.trim().isEmpty
                  ? null
                  : urlController.text.trim();

              double? price;
              if (priceController.text.trim().isNotEmpty) {
                price = double.tryParse(priceController.text.trim());
                if (price == null) {
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Please enter a valid price'),
                      backgroundColor: Colors.red,
                    ),
                  );
                  return;
                }
              }

              final provider = Provider.of<WishlistProvider>(
                context,
                listen: false,
              );

              final success = await provider.addItem(
                wishlistId: widget.wishlist.id,
                name: name,
                description: description,
                productUrl: productUrl,
                price: price,
              );

              if (!mounted) return;

              // ignore: use_build_context_synchronously
              Navigator.pop(context); // Close dialog

              if (success) {
                // ignore: use_build_context_synchronously
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Item added successfully!')),
                );
              } else {
                // ignore: use_build_context_synchronously
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(provider.error ?? 'Failed to add item'),
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

  void _showEditItemDialog(WishlistItem item) {
    final nameController = TextEditingController(text: item.name);
    final descriptionController = TextEditingController(text: item.description);
    final priceController = TextEditingController(
      text: item.price != null ? item.price!.toStringAsFixed(2) : '',
    );
    final urlController = TextEditingController(text: item.productUrl);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit Item'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: nameController,
                decoration: const InputDecoration(
                  labelText: 'Item Name',
                  hintText: 'What do you want?',
                ),
                autofocus: true,
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
              TextField(
                controller: priceController,
                decoration: const InputDecoration(
                  labelText: 'Price (optional)',
                  prefixText: '\$',
                ),
                keyboardType: TextInputType.number,
              ),
              const SizedBox(height: 16),
              TextField(
                controller: urlController,
                decoration: const InputDecoration(
                  labelText: 'Product URL (optional)',
                  hintText: 'https://...',
                ),
              ),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              if (nameController.text.trim().isEmpty) return;

              final name = nameController.text.trim();
              final description = descriptionController.text.trim().isEmpty
                  ? null
                  : descriptionController.text.trim();
              final productUrl = urlController.text.trim().isEmpty
                  ? null
                  : urlController.text.trim();

              double? price;
              if (priceController.text.trim().isNotEmpty) {
                price = double.tryParse(priceController.text.trim());
                if (price == null) {
                  if (!mounted) return;
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Please enter a valid price'),
                      backgroundColor: Colors.red,
                    ),
                  );
                  return;
                }
              }

              final provider = Provider.of<WishlistProvider>(
                context,
                listen: false,
              );

              final success = await provider.updateItem(
                item.id,
                name: name,
                description: description,
                productUrl: productUrl,
                price: price,
              );

              if (!mounted) return;

              // ignore: use_build_context_synchronously
              Navigator.pop(context); // Close dialog

              if (success) {
                // ignore: use_build_context_synchronously
                ScaffoldMessenger.of(context).showSnackBar(
                  const SnackBar(content: Text('Item updated successfully!')),
                );
              } else {
                // ignore: use_build_context_synchronously
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(provider.error ?? 'Failed to update item'),
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

  void _markAsPurchased(WishlistItem item) async {
    final provider = Provider.of<WishlistProvider>(context, listen: false);

    final success = await provider.updateItem(item.id, isPurchased: true);

    if (!mounted) return;

    if (success) {
      // ignore: use_build_context_synchronously
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('${item.name} marked as purchased!')),
      );
    } else {
      // ignore: use_build_context_synchronously
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(provider.error ?? 'Failed to mark item as purchased'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _confirmDeleteItem(WishlistItem item) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Item'),
        content: Text('Are you sure you want to delete "${item.name}"?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final provider = Provider.of<WishlistProvider>(
                context,
                listen: false,
              );
              Navigator.pop(context); // Close confirmation dialog

              final success = await provider.deleteItem(item.id);

              if (!mounted) return;

              if (success) {
                // ignore: use_build_context_synchronously
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('${item.name} deleted successfully!')),
                );
              } else {
                // ignore: use_build_context_synchronously
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(
                    content: Text(provider.error ?? 'Failed to delete item'),
                    backgroundColor: Colors.red,
                  ),
                );
              }
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _showEditWishlistDialog() {
    final nameController = TextEditingController(text: widget.wishlist.name);
    final descriptionController = TextEditingController(
      text: widget.wishlist.description,
    );
    bool isPublic = widget.wishlist.isPublic;

    showDialog(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Edit Wishlist'),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextField(
                  controller: nameController,
                  decoration: const InputDecoration(
                    labelText: 'Wishlist Name',
                    hintText: 'My Wishlist',
                  ),
                  autofocus: true,
                ),
                const SizedBox(height: 16),
                TextField(
                  controller: descriptionController,
                  decoration: const InputDecoration(
                    labelText: 'Description (optional)',
                    hintText: 'A description of your wishlist',
                  ),
                  maxLines: 2,
                ),
                const SizedBox(height: 16),
                Row(
                  children: [
                    const Text('Visibility:'),
                    const SizedBox(width: 16),
                    Expanded(
                      child: SegmentedButton<bool>(
                        segments: const [
                          ButtonSegment<bool>(
                            value: false,
                            label: Text('Private'),
                            icon: Icon(Icons.lock),
                          ),
                          ButtonSegment<bool>(
                            value: true,
                            label: Text('Public'),
                            icon: Icon(Icons.public),
                          ),
                        ],
                        selected: {isPublic},
                        onSelectionChanged: (Set<bool> selected) {
                          setState(() {
                            isPublic = selected.first;
                          });
                        },
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                Text(
                  isPublic
                      ? 'Public wishlists can be viewed by anyone with the link'
                      : 'Private wishlists are only visible to you',
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () async {
                if (nameController.text.trim().isEmpty) return;

                final name = nameController.text.trim();
                final description = descriptionController.text.trim().isEmpty
                    ? null
                    : descriptionController.text.trim();

                final provider = Provider.of<WishlistProvider>(
                  context,
                  listen: false,
                );

                final success = await provider.updateWishlist(
                  widget.wishlist.id,
                  name: name,
                  description: description,
                  isPublic: isPublic,
                );

                if (!mounted) return;

                // ignore: use_build_context_synchronously
                Navigator.pop(context); // Close dialog

                if (success) {
                  // ignore: use_build_context_synchronously
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Wishlist updated successfully!'),
                    ),
                  );
                } else {
                  // ignore: use_build_context_synchronously
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        provider.error ?? 'Failed to update wishlist',
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
      ),
    );
  }

  void _shareWishlist() {
    // Create shareable content
    final wishlistName = widget.wishlist.name;
    final itemCount = widget.wishlist.items.length;
    final isPublic = widget.wishlist.isPublic;

    if (!isPublic) {
      // Show dialog explaining that private wishlists can't be shared
      showDialog(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Cannot Share Private Wishlist'),
          content: const Text(
            'This wishlist is private. To share it with others, first make it public in the wishlist settings.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () {
                Navigator.pop(context); // Close this dialog
                _showEditWishlistDialog(); // Open edit dialog
              },
              child: const Text('Make Public'),
            ),
          ],
        ),
      );
      return;
    }

    // Create shareable message
    final shareText =
        '''
Check out my wishlist: "$wishlistName"

${widget.wishlist.description != null ? '${widget.wishlist.description}\n\n' : ''}It has $itemCount ${itemCount == 1 ? 'item' : 'items'}.

View it here: https://wishlist-wizard.com/wishlist/${widget.wishlist.id}
'''
            .trim();

    // Share using share_plus
    SharePlus.instance.share(ShareParams(text: shareText));
  }

  void _confirmDeleteWishlist() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Wishlist'),
        content: Text(
          'Are you sure you want to delete "${widget.wishlist.name}"? This will also delete all items in the wishlist.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () async {
              final provider = Provider.of<WishlistProvider>(
                context,
                listen: false,
              );
              Navigator.pop(context); // Close dialog

              final success = await provider.deleteWishlist(widget.wishlist.id);

              if (context.mounted) {
                if (success) {
                  Navigator.pop(context); // Return to previous screen
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(content: Text('Wishlist deleted')),
                  );
                } else {
                  ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Failed to delete wishlist'),
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
