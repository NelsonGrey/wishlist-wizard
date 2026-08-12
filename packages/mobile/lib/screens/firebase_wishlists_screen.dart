import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../models/models.dart';
import '../providers/providers.dart';
import '../services/social_share_service.dart';
import '../widgets/admob_widgets.dart';
import '../widgets/invite_collaborator_dialog.dart';
import '../main.dart';
import 'contribution_screen.dart';

// Production web app origin used to build shareable wishlist links from mobile
// (mirrors the `${window.location.origin}/shared/:shareId` link built on web).
const String _webAppOrigin = 'https://wishlist-wizard.web.app';

class FirebaseWishlistsScreen extends StatefulWidget {
  const FirebaseWishlistsScreen({super.key});

  @override
  State<FirebaseWishlistsScreen> createState() =>
      _FirebaseWishlistsScreenState();
}

enum _WishlistScope { mine, shared }

class _FirebaseWishlistsScreenState extends State<FirebaseWishlistsScreen> {
  _WishlistScope _scope = _WishlistScope.mine;

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
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
            child: SegmentedButton<_WishlistScope>(
              segments: const [
                ButtonSegment(
                  value: _WishlistScope.mine,
                  label: Text('My Wishlists'),
                ),
                ButtonSegment(
                  value: _WishlistScope.shared,
                  label: Text('Shared with Me'),
                ),
              ],
              selected: {_scope},
              onSelectionChanged: (selection) {
                setState(() => _scope = selection.first);
                if (selection.first == _WishlistScope.shared) {
                  Provider.of<FirebaseWishlistProvider>(
                    context,
                    listen: false,
                  ).loadSharedWishlists();
                }
              },
            ),
          ),
          Expanded(
            child: _scope == _WishlistScope.mine
                ? _buildMyWishlists(context)
                : _buildSharedWishlists(context),
          ),
        ],
      ),
      floatingActionButton: _scope == _WishlistScope.mine
          ? FloatingActionButton(
              onPressed: () => _showCreateWishlistDialog(context),
              child: const Icon(Icons.add),
            )
          : null,
    );
  }

  Widget _buildSharedWishlists(BuildContext context) {
    return Consumer<FirebaseWishlistProvider>(
      builder: (context, wishlistProvider, child) {
        if (wishlistProvider.isLoading &&
            wishlistProvider.sharedWishlists.isEmpty) {
          return const Center(child: CircularProgressIndicator());
        }

        final sharedWishlists = wishlistProvider.sharedWishlists;
        if (sharedWishlists.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.people_outline, size: 64, color: Colors.grey[400]),
                const SizedBox(height: 16),
                Text(
                  'Nothing shared with you yet',
                  style: Theme.of(
                    context,
                  ).textTheme.headlineSmall?.copyWith(color: Colors.grey[600]),
                ),
                const SizedBox(height: 8),
                Text(
                  "When someone invites you to collaborate,\nit'll show up here.",
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey[600]),
                ),
              ],
            ),
          );
        }

        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: sharedWishlists.length,
          itemBuilder: (context, index) {
            final wishlist = sharedWishlists[index];
            return Card(
              margin: const EdgeInsets.only(bottom: 12),
              child: ListTile(
                leading: CircleAvatar(
                  backgroundColor: Theme.of(
                    context,
                  ).primaryColor.withValues(alpha: 0.1),
                  child: Icon(
                    Icons.group,
                    color: Theme.of(context).primaryColor,
                  ),
                ),
                title: Text(
                  wishlist.name,
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                subtitle: Text(
                  '${wishlist.myRole.name[0].toUpperCase()}${wishlist.myRole.name.substring(1)} access',
                ),
                onTap: () => _openWishlistItems(context, wishlist),
                trailing: IconButton(
                  icon: const Icon(Icons.exit_to_app),
                  tooltip: 'Leave this wishlist',
                  onPressed: () =>
                      _confirmLeaveSharedWishlist(context, wishlist),
                ),
              ),
            );
          },
        );
      },
    );
  }

  void _confirmLeaveSharedWishlist(
    BuildContext context,
    FirebaseWishlist wishlist,
  ) {
    showDialog(
      context: context,
      builder: (dialogContext) => AlertDialog(
        title: const Text('Leave Wishlist'),
        content: Text(
          'Leave "${wishlist.name}"? You\'ll need a new invite to access it again.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(dialogContext),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(dialogContext);
              final authProvider = Provider.of<AuthProvider>(
                context,
                listen: false,
              );
              final wishlistProvider = Provider.of<FirebaseWishlistProvider>(
                context,
                listen: false,
              );
              if (authProvider.user == null) return;
              await wishlistProvider.removeCollaborator(
                wishlist.id,
                authProvider.user!.id,
              );
            },
            child: const Text('Leave', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
  }

  Widget _buildMyWishlists(BuildContext context) {
    return Consumer2<AuthProvider, FirebaseWishlistProvider>(
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
                            style: const TextStyle(fontWeight: FontWeight.w600),
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
                  shareId: wishlist.shareId,
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

  bool get _isOwner => widget.wishlist.myRole == CollaboratorRole.owner;
  bool get _canAddItems => widget.wishlist.myRole != CollaboratorRole.viewer;
  bool get _canEditItems =>
      widget.wishlist.myRole == CollaboratorRole.owner ||
      widget.wishlist.myRole == CollaboratorRole.editor;
  bool get _canReserveOrPurchase =>
      widget.wishlist.myRole != CollaboratorRole.viewer;

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

  Future<void> _shareWishlist() async {
    final shareId = widget.wishlist.shareId;
    if (shareId == null || shareId.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('This wishlist doesn\'t have a share link yet.'),
        ),
      );
      return;
    }

    try {
      await SocialShareService().shareWishlist(
        wishlistName: widget.wishlist.name,
        shareLink: '$_webAppOrigin/shared/$shareId',
        description: widget.wishlist.description,
      );
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to share right now.')),
      );
    }
  }

  void _showCollaboratorsSheet(BuildContext context) {
    final wishlistProvider = Provider.of<FirebaseWishlistProvider>(
      context,
      listen: false,
    );

    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      builder: (sheetContext) => StatefulBuilder(
        builder: (sheetContext, setSheetState) {
          Future<Map<String, dynamic>?>? collaboratorsFuture;
          collaboratorsFuture ??= wishlistProvider.listCollaborators(
            widget.wishlist.id,
          );

          return SafeArea(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              child: FutureBuilder<Map<String, dynamic>?>(
                future: collaboratorsFuture,
                builder: (context, snapshot) {
                  if (snapshot.connectionState == ConnectionState.waiting) {
                    return const SizedBox(
                      height: 120,
                      child: Center(child: CircularProgressIndicator()),
                    );
                  }

                  final collaborators = List<Map<String, dynamic>>.from(
                    (snapshot.data?['collaborators'] as List?) ?? [],
                  );
                  final pendingInvites = List<Map<String, dynamic>>.from(
                    (snapshot.data?['pendingInvites'] as List?) ?? [],
                  );

                  return Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Collaborators',
                        style: Theme.of(context).textTheme.titleLarge,
                      ),
                      const SizedBox(height: 12),
                      if (collaborators.isEmpty && pendingInvites.isEmpty)
                        const Padding(
                          padding: EdgeInsets.symmetric(vertical: 16),
                          child: Text('No collaborators yet.'),
                        ),
                      ...collaborators.map(
                        (collaborator) => ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            (collaborator['displayName'] as String?) ??
                                (collaborator['email'] as String?) ??
                                'Collaborator',
                          ),
                          subtitle: Text(
                            (collaborator['role'] as String?) ?? 'editor',
                          ),
                          trailing: IconButton(
                            icon: const Icon(Icons.close),
                            tooltip: 'Remove',
                            onPressed: () async {
                              await wishlistProvider.removeCollaborator(
                                widget.wishlist.id,
                                collaborator['userId'] as String,
                              );
                              setSheetState(() {
                                collaboratorsFuture = wishlistProvider
                                    .listCollaborators(widget.wishlist.id);
                              });
                            },
                          ),
                        ),
                      ),
                      ...pendingInvites.map(
                        (invite) => ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(invite['email'] as String? ?? ''),
                          subtitle: Text(
                            '${invite['role'] ?? 'editor'} • awaiting signup',
                          ),
                          trailing: IconButton(
                            icon: const Icon(Icons.close),
                            tooltip: 'Revoke invite',
                            onPressed: () async {
                              await wishlistProvider.revokePendingInvite(
                                invite['id'] as String,
                              );
                              setSheetState(() {
                                collaboratorsFuture = wishlistProvider
                                    .listCollaborators(widget.wishlist.id);
                              });
                            },
                          ),
                        ),
                      ),
                      const SizedBox(height: 8),
                      SizedBox(
                        width: double.infinity,
                        child: ElevatedButton.icon(
                          onPressed: () async {
                            Navigator.pop(sheetContext);
                            await _showInviteCollaboratorDialog(context);
                          },
                          icon: const Icon(Icons.person_add),
                          label: const Text('Invite Collaborator'),
                        ),
                      ),
                    ],
                  );
                },
              ),
            ),
          );
        },
      ),
    );
  }

  Future<void> _showInviteCollaboratorDialog(BuildContext context) async {
    await showDialog<void>(
      context: context,
      builder: (dialogContext) =>
          InviteCollaboratorDialog(wishlistId: widget.wishlist.id),
    );
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
              if ((item.store ?? '').isNotEmpty) ...[
                Text('Store: ${item.store}'),
                const SizedBox(height: 4),
              ],
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
      appBar: CustomAppBar(
        title: widget.wishlist.name,
        actions: [
          if (_isOwner)
            IconButton(
              icon: const Icon(Icons.people_outline),
              tooltip: 'Collaborators',
              onPressed: () => _showCollaboratorsSheet(context),
            ),
          IconButton(
            icon: const Icon(Icons.share),
            tooltip: 'Share wishlist',
            onPressed: _shareWishlist,
          ),
        ],
      ),
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
                      trailing: (_canEditItems || _canReserveOrPurchase)
                          ? PopupMenuButton<String>(
                              onSelected: (value) async {
                                if (value == 'edit') {
                                  _showEditItemDialog(context, item);
                                  return;
                                }

                                if (value == 'contribute') {
                                  Navigator.push(
                                    context,
                                    MaterialPageRoute(
                                      builder: (context) => ContributionScreen(
                                        itemId: item.id,
                                        itemTitle: item.name,
                                        itemPrice: item.price,
                                        itemImageUrl: item.imageUrl,
                                        itemStore: item.store,
                                      ),
                                    ),
                                  );
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
                                if (_canEditItems)
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
                                if (_canReserveOrPurchase)
                                  PopupMenuItem(
                                    value: 'toggle',
                                    child: Row(
                                      children: [
                                        Icon(
                                          item.isPurchased
                                              ? Icons.undo
                                              : Icons.check,
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
                                if (_canReserveOrPurchase && !item.isPurchased)
                                  const PopupMenuItem(
                                    value: 'contribute',
                                    child: Row(
                                      children: [
                                        Icon(Icons.volunteer_activism_outlined),
                                        SizedBox(width: 8),
                                        Text('Contribute'),
                                      ],
                                    ),
                                  ),
                                if (_canEditItems)
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
                            )
                          : null,
                    ),
                  );
                },
              );
            },
          );
        },
      ),
      floatingActionButton: _canAddItems
          ? FloatingActionButton(
              onPressed: () => _showAddItemDialog(context),
              child: const Icon(Icons.add),
            )
          : null,
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
    final storeController = TextEditingController(text: item.store ?? '');

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
              controller: storeController,
              decoration: const InputDecoration(labelText: 'Store (optional)'),
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
                store: storeController.text.trim().isEmpty
                    ? null
                    : storeController.text.trim(),
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
    final storeController = TextEditingController();

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
              controller: storeController,
              decoration: const InputDecoration(labelText: 'Store (optional)'),
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
                store: storeController.text.trim().isEmpty
                    ? null
                    : storeController.text.trim(),
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
