import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../models/models.dart';
import '../providers/providers.dart';
import '../widgets/app_scaffold.dart';
import 'firebase_wishlists_screen.dart';

/// In-app notification history: real-time list (Firestore-backed, matching
/// the security rules' request.auth.uid == resource.data.userId scoping),
/// tap-to-navigate deep linking, mark-as-read/mark-all-read/delete, and an
/// all/unread/read filter -- mirrors web's Notifications.tsx. Reached from
/// the bottom nav's Notifications tab and the Home tab's bell icon.
class NotificationDeepLinkParser {
  static String? extractWishlistId(FirebaseNotification notification) {
    final metadata = notification.metadata;

    final directValue = _extractStringValue(metadata, const [
      'wishlistId',
      'wishlist_id',
      'wishlist',
    ]);
    if (directValue != null) {
      return directValue;
    }

    final actionUrl = _extractActionUrl(metadata);
    if (actionUrl != null) {
      final fromQuery = _extractFromActionUrlQuery(actionUrl, const [
        'wishlistId',
        'wishlist_id',
        'wishlist',
      ]);
      if (fromQuery != null) {
        return fromQuery;
      }

      final match = RegExp(r'/wishlists?/([^/\s]+)').firstMatch(actionUrl);
      if (match != null && match.groupCount >= 1) {
        return match.group(1);
      }
    }

    return null;
  }

  static String? extractItemId(FirebaseNotification notification) {
    final metadata = notification.metadata;

    final directValue = _extractStringValue(metadata, const [
      'itemId',
      'item_id',
      'wishlistItemId',
      'wishlist_item_id',
      'item',
    ]);
    if (directValue != null) {
      return directValue;
    }

    final actionUrl = _extractActionUrl(metadata);
    if (actionUrl != null) {
      final fromQuery = _extractFromActionUrlQuery(actionUrl, const [
        'itemId',
        'item_id',
        'wishlistItemId',
        'wishlist_item_id',
        'item',
      ]);
      if (fromQuery != null) {
        return fromQuery;
      }

      final match = RegExp(r'/items?/([^/\s]+)').firstMatch(actionUrl);
      if (match != null && match.groupCount >= 1) {
        return match.group(1);
      }
    }

    return null;
  }

  static String? _extractStringValue(
    Map<String, dynamic> metadata,
    List<String> keys,
  ) {
    for (final key in keys) {
      final value = metadata[key];
      if (value is String && value.isNotEmpty) {
        return value;
      }
      if (value is num) {
        return value.toString();
      }
    }
    return null;
  }

  static String? _extractActionUrl(Map<String, dynamic> metadata) {
    return _extractStringValue(metadata, const [
      'actionUrl',
      'action_url',
      'url',
      'deepLink',
      'deep_link',
    ]);
  }

  static String? _extractFromActionUrlQuery(
    String actionUrl,
    List<String> keys,
  ) {
    final uri = Uri.tryParse(actionUrl);
    if (uri == null) {
      return null;
    }

    for (final key in keys) {
      final value = uri.queryParameters[key];
      if (value != null && value.isNotEmpty) {
        return value;
      }
    }

    return null;
  }
}

enum _NotificationFilter { all, unread, read }

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({super.key});

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  _NotificationFilter _filter = _NotificationFilter.all;
  String? _markingAllReadFor;
  final Set<String> _deletingIds = {};

  String? _extractWishlistId(FirebaseNotification notification) {
    return NotificationDeepLinkParser.extractWishlistId(notification);
  }

  String? _extractItemId(FirebaseNotification notification) {
    return NotificationDeepLinkParser.extractItemId(notification);
  }

  Future<void> _handleNotificationTap(
    BuildContext context,
    FirebaseNotification notification,
    FirebaseWishlistProvider wishlistProvider,
  ) async {
    if (!notification.isRead) {
      await wishlistProvider.markNotificationAsRead(notification.id);
    }

    final extractedWishlistId = _extractWishlistId(notification);
    final itemId = _extractItemId(notification);

    String? resolvedWishlistId;
    if (itemId != null && itemId.isNotEmpty) {
      final item = await wishlistProvider.getWishlistItemById(itemId);
      resolvedWishlistId = item?.wishlistId;
    }

    resolvedWishlistId ??= extractedWishlistId;

    if (resolvedWishlistId == null || resolvedWishlistId.isEmpty) {
      if (context.mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('No linked wishlist found for this notification.'),
          ),
        );
      }
      return;
    }

    final wishlist = await wishlistProvider.getWishlistById(resolvedWishlistId);
    if (wishlist != null && context.mounted) {
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (context) => FirebaseWishlistItemsScreen(
            wishlist: wishlist,
            initialItemId: itemId,
          ),
        ),
      );
      return;
    }

    if (context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Unable to open related wishlist.')),
      );
    }
  }

  Future<void> _handleMarkAllAsRead(
    BuildContext context,
    String userId,
    FirebaseWishlistProvider wishlistProvider,
  ) async {
    setState(() => _markingAllReadFor = userId);
    final success = await wishlistProvider.markAllNotificationsAsRead(userId);
    if (!context.mounted) return;
    setState(() => _markingAllReadFor = null);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          success ? 'All notifications marked as read' : 'Failed to mark all as read',
        ),
      ),
    );
  }

  Future<void> _handleDelete(
    BuildContext context,
    FirebaseNotification notification,
    FirebaseWishlistProvider wishlistProvider,
  ) async {
    setState(() => _deletingIds.add(notification.id));
    final success = await wishlistProvider.deleteNotification(notification.id);
    if (!context.mounted) return;
    setState(() => _deletingIds.remove(notification.id));
    if (!success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to delete notification')),
      );
    }
  }

  IconData _iconForType(NotificationType type) {
    switch (type) {
      case NotificationType.priceDrop:
        return Icons.trending_down;
      case NotificationType.backInStock:
        return Icons.inventory_2;
      case NotificationType.wishlistShared:
        return Icons.share;
      case NotificationType.itemPurchased:
        return Icons.shopping_bag;
      case NotificationType.system:
        return Icons.info;
    }
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
    }

    return 'Just now';
  }

  List<FirebaseNotification> _applyFilter(List<FirebaseNotification> notifications) {
    switch (_filter) {
      case _NotificationFilter.unread:
        return notifications.where((n) => !n.isRead).toList();
      case _NotificationFilter.read:
        return notifications.where((n) => n.isRead).toList();
      case _NotificationFilter.all:
        return notifications;
    }
  }

  Widget _buildFilterChip(String label, int count, _NotificationFilter value) {
    final selected = _filter == value;
    return Expanded(
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4),
        child: OutlinedButton(
          onPressed: () => setState(() => _filter = value),
          style: OutlinedButton.styleFrom(
            backgroundColor: selected ? Theme.of(context).colorScheme.primary.withValues(alpha: 0.08) : null,
            side: BorderSide(
              color: selected ? Theme.of(context).colorScheme.primary : Colors.grey.shade300,
            ),
            padding: const EdgeInsets.symmetric(vertical: 10),
          ),
          child: Column(
            children: [
              Text(label, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
              Text('$count', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Notifications',
      body: Consumer2<AuthProvider, FirebaseWishlistProvider>(
        builder: (context, authProvider, wishlistProvider, child) {
          final user = authProvider.user;
          if (user == null) {
            return const Center(child: Text('Please log in to view notifications'));
          }

          return StreamBuilder<List<FirebaseNotification>>(
            stream: wishlistProvider.getNotificationsStream(user.id),
            builder: (context, snapshot) {
              if (snapshot.connectionState == ConnectionState.waiting) {
                return const Center(child: CircularProgressIndicator());
              }

              if (snapshot.hasError) {
                return Center(
                  child: Text(
                    'Failed to load notifications: ${snapshot.error}',
                    style: const TextStyle(color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                );
              }

              final allNotifications = snapshot.data ?? [];
              final unreadCount = allNotifications.where((n) => !n.isRead).length;
              final readCount = allNotifications.length - unreadCount;
              final notifications = _applyFilter(allNotifications);

              return Column(
                children: [
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                    child: Row(
                      children: [
                        _buildFilterChip('All', allNotifications.length, _NotificationFilter.all),
                        _buildFilterChip('Unread', unreadCount, _NotificationFilter.unread),
                        _buildFilterChip('Read', readCount, _NotificationFilter.read),
                      ],
                    ),
                  ),
                  if (unreadCount > 0)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
                      child: Align(
                        alignment: Alignment.centerRight,
                        child: TextButton(
                          onPressed: _markingAllReadFor == user.id
                              ? null
                              : () => _handleMarkAllAsRead(context, user.id, wishlistProvider),
                          child: Text(
                            _markingAllReadFor == user.id ? 'Marking all...' : 'Mark all as read',
                          ),
                        ),
                      ),
                    ),
                  Expanded(
                    child: notifications.isEmpty
                        ? Center(
                            child: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Icon(Icons.notifications_none, size: 64, color: Colors.grey[400]),
                                const SizedBox(height: 16),
                                Text(
                                  allNotifications.isEmpty
                                      ? 'No notifications yet'
                                      : 'No notifications in this view',
                                  style: Theme.of(context).textTheme.headlineSmall
                                      ?.copyWith(color: Colors.grey[600]),
                                ),
                              ],
                            ),
                          )
                        : ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: notifications.length,
                            itemBuilder: (context, index) {
                              final notification = notifications[index];
                              final deleting = _deletingIds.contains(notification.id);

                              return Card(
                                margin: const EdgeInsets.only(bottom: 12),
                                color: notification.isRead
                                    ? null
                                    : Theme.of(context).colorScheme.primary.withValues(alpha: 0.05),
                                child: ListTile(
                                  leading: CircleAvatar(
                                    backgroundColor:
                                        Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                                    child: Icon(
                                      _iconForType(notification.type),
                                      color: Theme.of(context).colorScheme.primary,
                                    ),
                                  ),
                                  title: Text(
                                    notification.title,
                                    style: TextStyle(
                                      fontWeight:
                                          notification.isRead ? FontWeight.w500 : FontWeight.w700,
                                    ),
                                  ),
                                  subtitle: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(notification.message),
                                      const SizedBox(height: 4),
                                      Text(
                                        _formatDate(notification.createdAt),
                                        style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                                      ),
                                    ],
                                  ),
                                  trailing: IconButton(
                                    icon: deleting
                                        ? const SizedBox(
                                            width: 16,
                                            height: 16,
                                            child: CircularProgressIndicator(strokeWidth: 2),
                                          )
                                        : const Icon(Icons.delete_outline, size: 20),
                                    tooltip: 'Delete notification',
                                    onPressed: deleting
                                        ? null
                                        : () => _handleDelete(context, notification, wishlistProvider),
                                  ),
                                  onTap: () =>
                                      _handleNotificationTap(context, notification, wishlistProvider),
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
    );
  }
}
