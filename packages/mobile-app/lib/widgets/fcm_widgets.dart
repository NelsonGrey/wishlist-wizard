/// FCM Notification Widgets for Flutter Mobile App
/// Provides UI components for notification management and preferences
library;

import 'package:flutter/material.dart';
import '../services/fcm_service.dart';

/// FCM Notification Preferences Screen
class FCMNotificationPreferencesScreen extends StatefulWidget {
  const FCMNotificationPreferencesScreen({super.key});

  @override
  State<FCMNotificationPreferencesScreen> createState() =>
      _FCMNotificationPreferencesScreenState();
}

class _FCMNotificationPreferencesScreenState
    extends State<FCMNotificationPreferencesScreen> {
  final FCMManager _fcmManager = FCMManager();
  late FCMNotificationPreferences _preferences;
  bool _isLoading = false;

  @override
  void initState() {
    super.initState();
    _preferences = _fcmManager.preferences;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notification Settings'),
        actions: [
          if (_isLoading)
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
        ],
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            _buildMasterToggle(),
            const SizedBox(height: 24),
            _buildNotificationTypes(),
            const SizedBox(height: 24),
            _buildNotificationSettings(),
            const SizedBox(height: 24),
            _buildQuietHours(),
            const SizedBox(height: 24),
            _buildAdvancedSettings(),
          ],
        ),
      ),
    );
  }

  /// Master notification toggle
  Widget _buildMasterToggle() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(
                  _preferences.enabled
                      ? Icons.notifications_active
                      : Icons.notifications_off,
                  color: _preferences.enabled ? Colors.green : Colors.grey,
                ),
                const SizedBox(width: 12),
                const Expanded(
                  child: Text(
                    'Push Notifications',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
                Switch(
                  value: _preferences.enabled,
                  onChanged: (value) {
                    setState(() {
                      _preferences = FCMNotificationPreferences(
                        enabled: value,
                        types: _preferences.types,
                        sound: _preferences.sound,
                        vibration: _preferences.vibration,
                        badge: _preferences.badge,
                        quietHours: _preferences.quietHours,
                        updatedAt: DateTime.now(),
                      );
                    });
                    _savePreferences();
                  },
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              _preferences.enabled
                  ? 'You\'ll receive push notifications about your wishlists'
                  : 'Push notifications are disabled',
              style: TextStyle(color: Colors.grey[600], fontSize: 14),
            ),
          ],
        ),
      ),
    );
  }

  /// Notification types section
  Widget _buildNotificationTypes() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Notification Types',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            ..._preferences.types.entries.map((entry) {
              return _buildNotificationTypeToggle(entry.key, entry.value);
            }),
          ],
        ),
      ),
    );
  }

  /// Individual notification type toggle
  Widget _buildNotificationTypeToggle(FCMNotificationType type, bool enabled) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        children: [
          Icon(
            _getNotificationTypeIcon(type),
            color: enabled ? _getNotificationTypeColor(type) : Colors.grey,
            size: 20,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _getNotificationTypeTitle(type),
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
                Text(
                  _getNotificationTypeDescription(type),
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
              ],
            ),
          ),
          Switch(
            value: enabled && _preferences.enabled,
            onChanged: _preferences.enabled
                ? (value) {
                    setState(() {
                      final newTypes = Map<FCMNotificationType, bool>.from(
                        _preferences.types,
                      );
                      newTypes[type] = value;
                      _preferences = FCMNotificationPreferences(
                        enabled: _preferences.enabled,
                        types: newTypes,
                        sound: _preferences.sound,
                        vibration: _preferences.vibration,
                        badge: _preferences.badge,
                        quietHours: _preferences.quietHours,
                        updatedAt: DateTime.now(),
                      );
                    });
                    _savePreferences();
                  }
                : null,
          ),
        ],
      ),
    );
  }

  /// Notification settings (sound, vibration, badge)
  Widget _buildNotificationSettings() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Notification Style',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            _buildSettingToggle(
              icon: Icons.volume_up,
              title: 'Sound',
              subtitle: 'Play notification sounds',
              value: _preferences.sound,
              onChanged: (value) {
                setState(() {
                  _preferences = FCMNotificationPreferences(
                    enabled: _preferences.enabled,
                    types: _preferences.types,
                    sound: value,
                    vibration: _preferences.vibration,
                    badge: _preferences.badge,
                    quietHours: _preferences.quietHours,
                    updatedAt: DateTime.now(),
                  );
                });
                _savePreferences();
              },
            ),
            _buildSettingToggle(
              icon: Icons.vibration,
              title: 'Vibration',
              subtitle: 'Vibrate for notifications',
              value: _preferences.vibration,
              onChanged: (value) {
                setState(() {
                  _preferences = FCMNotificationPreferences(
                    enabled: _preferences.enabled,
                    types: _preferences.types,
                    sound: _preferences.sound,
                    vibration: value,
                    badge: _preferences.badge,
                    quietHours: _preferences.quietHours,
                    updatedAt: DateTime.now(),
                  );
                });
                _savePreferences();
              },
            ),
            _buildSettingToggle(
              icon: Icons.circle_notifications,
              title: 'Badge',
              subtitle: 'Show notification count on app icon',
              value: _preferences.badge,
              onChanged: (value) {
                setState(() {
                  _preferences = FCMNotificationPreferences(
                    enabled: _preferences.enabled,
                    types: _preferences.types,
                    sound: _preferences.sound,
                    vibration: _preferences.vibration,
                    badge: value,
                    quietHours: _preferences.quietHours,
                    updatedAt: DateTime.now(),
                  );
                });
                _savePreferences();
              },
            ),
          ],
        ),
      ),
    );
  }

  /// Setting toggle widget
  Widget _buildSettingToggle({
    required IconData icon,
    required String title,
    required String subtitle,
    required bool value,
    required ValueChanged<bool> onChanged,
  }) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        children: [
          Icon(icon, color: value ? Colors.blue : Colors.grey, size: 20),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(fontWeight: FontWeight.w500),
                ),
                Text(
                  subtitle,
                  style: TextStyle(color: Colors.grey[600], fontSize: 12),
                ),
              ],
            ),
          ),
          Switch(
            value: value && _preferences.enabled,
            onChanged: _preferences.enabled ? onChanged : null,
          ),
        ],
      ),
    );
  }

  /// Quiet hours section
  Widget _buildQuietHours() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.bedtime, color: Colors.indigo),
                const SizedBox(width: 8),
                const Text(
                  'Quiet Hours',
                  style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              'No notifications during these hours',
              style: TextStyle(color: Colors.grey[600], fontSize: 14),
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: _buildTimeSelector(
                    label: 'Start',
                    time: _preferences.quietHours['start']!,
                    onTimeChanged: (time) {
                      setState(() {
                        final newQuietHours = Map<String, String>.from(
                          _preferences.quietHours,
                        );
                        newQuietHours['start'] = time;
                        _preferences = FCMNotificationPreferences(
                          enabled: _preferences.enabled,
                          types: _preferences.types,
                          sound: _preferences.sound,
                          vibration: _preferences.vibration,
                          badge: _preferences.badge,
                          quietHours: newQuietHours,
                          updatedAt: DateTime.now(),
                        );
                      });
                      _savePreferences();
                    },
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: _buildTimeSelector(
                    label: 'End',
                    time: _preferences.quietHours['end']!,
                    onTimeChanged: (time) {
                      setState(() {
                        final newQuietHours = Map<String, String>.from(
                          _preferences.quietHours,
                        );
                        newQuietHours['end'] = time;
                        _preferences = FCMNotificationPreferences(
                          enabled: _preferences.enabled,
                          types: _preferences.types,
                          sound: _preferences.sound,
                          vibration: _preferences.vibration,
                          badge: _preferences.badge,
                          quietHours: newQuietHours,
                          updatedAt: DateTime.now(),
                        );
                      });
                      _savePreferences();
                    },
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  /// Time selector widget
  Widget _buildTimeSelector({
    required String label,
    required String time,
    required ValueChanged<String> onTimeChanged,
  }) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(fontWeight: FontWeight.w500)),
        const SizedBox(height: 4),
        InkWell(
          onTap: () async {
            final timeParts = time.split(':');
            final initialTime = TimeOfDay(
              hour: int.parse(timeParts[0]),
              minute: int.parse(timeParts[1]),
            );

            final pickedTime = await showTimePicker(
              context: context,
              initialTime: initialTime,
            );

            if (pickedTime != null) {
              final formattedTime =
                  '${pickedTime.hour.toString().padLeft(2, '0')}:${pickedTime.minute.toString().padLeft(2, '0')}';
              onTimeChanged(formattedTime);
            }
          },
          child: Container(
            padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
            decoration: BoxDecoration(
              border: Border.all(color: Colors.grey[300]!),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                const Icon(Icons.access_time, size: 18),
                const SizedBox(width: 8),
                Text(time),
              ],
            ),
          ),
        ),
      ],
    );
  }

  /// Advanced settings section
  Widget _buildAdvancedSettings() {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Advanced',
              style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.refresh, color: Colors.blue),
              title: const Text('Refresh FCM Token'),
              subtitle: const Text('Get a new push notification token'),
              onTap: _refreshFCMToken,
              contentPadding: EdgeInsets.zero,
            ),
            ListTile(
              leading: const Icon(Icons.info_outline, color: Colors.grey),
              title: const Text('Token Info'),
              subtitle: Text(
                _fcmManager.fcmToken != null
                    ? 'Token: ${_fcmManager.fcmToken!.substring(0, 20)}...'
                    : 'No token available',
              ),
              contentPadding: EdgeInsets.zero,
            ),
          ],
        ),
      ),
    );
  }

  /// Get notification type icon
  IconData _getNotificationTypeIcon(FCMNotificationType type) {
    switch (type) {
      case FCMNotificationType.itemAdded:
        return Icons.add_shopping_cart;
      case FCMNotificationType.itemReserved:
        return Icons.bookmark;
      case FCMNotificationType.itemPurchased:
        return Icons.shopping_bag;
      case FCMNotificationType.priceAlert:
        return Icons.trending_down;
      case FCMNotificationType.collaborationInvite:
        return Icons.people;
      case FCMNotificationType.systemUpdate:
        return Icons.system_update;
    }
  }

  /// Get notification type color
  Color _getNotificationTypeColor(FCMNotificationType type) {
    switch (type) {
      case FCMNotificationType.itemAdded:
        return Colors.green;
      case FCMNotificationType.itemReserved:
        return Colors.orange;
      case FCMNotificationType.itemPurchased:
        return Colors.blue;
      case FCMNotificationType.priceAlert:
        return Colors.red;
      case FCMNotificationType.collaborationInvite:
        return Colors.purple;
      case FCMNotificationType.systemUpdate:
        return Colors.grey;
    }
  }

  /// Get notification type title
  String _getNotificationTypeTitle(FCMNotificationType type) {
    switch (type) {
      case FCMNotificationType.itemAdded:
        return 'Item Updates';
      case FCMNotificationType.itemReserved:
        return 'Reservations';
      case FCMNotificationType.itemPurchased:
        return 'Purchases';
      case FCMNotificationType.priceAlert:
        return 'Price Alerts';
      case FCMNotificationType.collaborationInvite:
        return 'Collaboration Invites';
      case FCMNotificationType.systemUpdate:
        return 'System Updates';
    }
  }

  /// Get notification type description
  String _getNotificationTypeDescription(FCMNotificationType type) {
    switch (type) {
      case FCMNotificationType.itemAdded:
        return 'When items are added to shared wishlists';
      case FCMNotificationType.itemReserved:
        return 'When someone reserves an item';
      case FCMNotificationType.itemPurchased:
        return 'When items are marked as purchased';
      case FCMNotificationType.priceAlert:
        return 'Price drops and deal alerts';
      case FCMNotificationType.collaborationInvite:
        return 'Invitations to collaborate on wishlists';
      case FCMNotificationType.systemUpdate:
        return 'App updates and announcements';
    }
  }

  /// Save preferences
  void _savePreferences() {
    _fcmManager.updatePreferences(_preferences);
  }

  /// Refresh FCM token
  Future<void> _refreshFCMToken() async {
    setState(() {
      _isLoading = true;
    });

    try {
      await _fcmManager.deleteToken();
      // Token will be automatically regenerated
      await Future.delayed(const Duration(seconds: 1));

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('FCM token refreshed successfully'),
            backgroundColor: Colors.green,
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error refreshing token: $e'),
            backgroundColor: Colors.red,
          ),
        );
      }
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }
}

/// FCM Notification History Widget
class FCMNotificationHistory extends StatefulWidget {
  const FCMNotificationHistory({super.key});

  @override
  State<FCMNotificationHistory> createState() => _FCMNotificationHistoryState();
}

class _FCMNotificationHistoryState extends State<FCMNotificationHistory> {
  final List<FCMNotificationData> _notifications = [];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notification History'),
        actions: [
          IconButton(
            icon: const Icon(Icons.clear_all),
            onPressed: _notifications.isNotEmpty ? _clearAll : null,
            tooltip: 'Clear all',
          ),
        ],
      ),
      body: _notifications.isEmpty
          ? _buildEmptyState()
          : ListView.builder(
              itemCount: _notifications.length,
              itemBuilder: (context, index) {
                final notification = _notifications[index];
                return _buildNotificationTile(notification);
              },
            ),
    );
  }

  /// Build empty state
  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.notifications_none, size: 64, color: Colors.grey[400]),
          const SizedBox(height: 16),
          Text(
            'No notifications yet',
            style: TextStyle(fontSize: 18, color: Colors.grey[600]),
          ),
          const SizedBox(height: 8),
          Text(
            'Your notification history will appear here',
            style: TextStyle(color: Colors.grey[500]),
          ),
        ],
      ),
    );
  }

  /// Build notification tile
  Widget _buildNotificationTile(FCMNotificationData notification) {
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: _getNotificationTypeColor(
            notification.type,
          ).withValues(alpha: 0.1),
          child: Icon(
            _getNotificationTypeIcon(notification.type),
            color: _getNotificationTypeColor(notification.type),
            size: 20,
          ),
        ),
        title: Text(
          notification.title,
          style: const TextStyle(fontWeight: FontWeight.w500),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(notification.body),
            const SizedBox(height: 4),
            Text(
              _formatTimestamp(notification.timestamp),
              style: TextStyle(color: Colors.grey[500], fontSize: 12),
            ),
          ],
        ),
        isThreeLine: true,
        onTap: () => _showNotificationDetails(notification),
      ),
    );
  }

  /// Format timestamp
  String _formatTimestamp(DateTime timestamp) {
    final now = DateTime.now();
    final difference = now.difference(timestamp);

    if (difference.inMinutes < 1) {
      return 'Just now';
    } else if (difference.inHours < 1) {
      return '${difference.inMinutes}m ago';
    } else if (difference.inDays < 1) {
      return '${difference.inHours}h ago';
    } else if (difference.inDays < 7) {
      return '${difference.inDays}d ago';
    } else {
      return '${timestamp.day}/${timestamp.month}/${timestamp.year}';
    }
  }

  /// Show notification details
  void _showNotificationDetails(FCMNotificationData notification) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(notification.title),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(notification.body),
            const SizedBox(height: 16),
            if (notification.data.isNotEmpty) ...[
              const Text(
                'Additional Data:',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 8),
              ...notification.data.entries.map(
                (entry) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 2),
                  child: Text('${entry.key}: ${entry.value}'),
                ),
              ),
            ],
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  /// Clear all notifications
  void _clearAll() {
    setState(() {
      _notifications.clear();
    });
  }

  /// Get notification type icon
  IconData _getNotificationTypeIcon(FCMNotificationType type) {
    switch (type) {
      case FCMNotificationType.itemAdded:
        return Icons.add_shopping_cart;
      case FCMNotificationType.itemReserved:
        return Icons.bookmark;
      case FCMNotificationType.itemPurchased:
        return Icons.shopping_bag;
      case FCMNotificationType.priceAlert:
        return Icons.trending_down;
      case FCMNotificationType.collaborationInvite:
        return Icons.people;
      case FCMNotificationType.systemUpdate:
        return Icons.system_update;
    }
  }

  /// Get notification type color
  Color _getNotificationTypeColor(FCMNotificationType type) {
    switch (type) {
      case FCMNotificationType.itemAdded:
        return Colors.green;
      case FCMNotificationType.itemReserved:
        return Colors.orange;
      case FCMNotificationType.itemPurchased:
        return Colors.blue;
      case FCMNotificationType.priceAlert:
        return Colors.red;
      case FCMNotificationType.collaborationInvite:
        return Colors.purple;
      case FCMNotificationType.systemUpdate:
        return Colors.grey;
    }
  }
}

/// FCM Status Widget - shows current FCM connection status
class FCMStatusWidget extends StatefulWidget {
  const FCMStatusWidget({super.key});

  @override
  State<FCMStatusWidget> createState() => _FCMStatusWidgetState();
}

class _FCMStatusWidgetState extends State<FCMStatusWidget> {
  final FCMManager _fcmManager = FCMManager();
  bool _isConnected = false;

  @override
  void initState() {
    super.initState();
    _checkStatus();
  }

  void _checkStatus() {
    setState(() {
      _isConnected = _fcmManager.fcmToken != null;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: _isConnected
            ? Colors.green.withValues(alpha: 0.1)
            : Colors.red.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _isConnected ? Colors.green : Colors.red,
          width: 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            _isConnected ? Icons.cloud_done : Icons.cloud_off,
            size: 16,
            color: _isConnected ? Colors.green : Colors.red,
          ),
          const SizedBox(width: 4),
          Text(
            _isConnected ? 'FCM Connected' : 'FCM Disconnected',
            style: TextStyle(
              color: _isConnected ? Colors.green : Colors.red,
              fontSize: 12,
              fontWeight: FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}
