import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/sync_provider.dart';

class SyncStatusWidget extends StatelessWidget {
  const SyncStatusWidget({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<SyncProvider>(
      builder: (context, syncProvider, child) {
        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          decoration: BoxDecoration(
            color: _getStatusColor(syncProvider.syncStatus),
            borderRadius: BorderRadius.circular(20),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                _getStatusIcon(syncProvider.syncStatus),
                size: 16,
                color: Colors.white,
              ),
              const SizedBox(width: 8),
              Text(
                _getStatusText(syncProvider.syncStatus),
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                ),
              ),
              if (syncProvider.pendingActionsCount > 0) ...[
                const SizedBox(width: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 6,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.3),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Text(
                    '${syncProvider.pendingActionsCount}',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ],
          ),
        );
      },
    );
  }

  Color _getStatusColor(SyncStatus status) {
    switch (status) {
      case SyncStatus.synced:
        return Colors.green;
      case SyncStatus.syncing:
        return Colors.blue;
      case SyncStatus.offline:
        return Colors.orange;
      case SyncStatus.error:
        return Colors.red;
      case SyncStatus.conflicts:
        return Colors.purple;
    }
  }

  IconData _getStatusIcon(SyncStatus status) {
    switch (status) {
      case SyncStatus.synced:
        return Icons.cloud_done;
      case SyncStatus.syncing:
        return Icons.sync;
      case SyncStatus.offline:
        return Icons.cloud_off;
      case SyncStatus.error:
        return Icons.error;
      case SyncStatus.conflicts:
        return Icons.warning;
    }
  }

  String _getStatusText(SyncStatus status) {
    switch (status) {
      case SyncStatus.synced:
        return 'Synced';
      case SyncStatus.syncing:
        return 'Syncing...';
      case SyncStatus.offline:
        return 'Offline';
      case SyncStatus.error:
        return 'Sync Error';
      case SyncStatus.conflicts:
        return 'Conflicts';
    }
  }
}

class SyncFloatingActionButton extends StatelessWidget {
  const SyncFloatingActionButton({super.key});

  @override
  Widget build(BuildContext context) {
    return Consumer<SyncProvider>(
      builder: (context, syncProvider, child) {
        return FloatingActionButton(
          onPressed: syncProvider.syncStatus == SyncStatus.syncing
              ? null
              : () => syncProvider.performSync(),
          backgroundColor: syncProvider.syncStatus == SyncStatus.syncing
              ? Colors.grey
              : Theme.of(context).primaryColor,
          child: syncProvider.syncStatus == SyncStatus.syncing
              ? const SizedBox(
                  width: 24,
                  height: 24,
                  child: CircularProgressIndicator(
                    strokeWidth: 2,
                    valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                  ),
                )
              : const Icon(Icons.sync),
        );
      },
    );
  }
}

class SyncSettingsScreen extends StatelessWidget {
  const SyncSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Sync Settings')),
      body: Consumer<SyncProvider>(
        builder: (context, syncProvider, child) {
          return ListView(
            padding: const EdgeInsets.all(16),
            children: [
              // Sync Status Card
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Icon(
                            Icons.sync,
                            color: Theme.of(context).primaryColor,
                          ),
                          const SizedBox(width: 8),
                          Text(
                            'Sync Status',
                            style: Theme.of(context).textTheme.titleLarge,
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      SyncStatusWidget(),
                      const SizedBox(height: 8),
                      Text(
                        'Last sync: ${syncProvider.lastSyncTime != null ? _formatDateTime(syncProvider.lastSyncTime!) : 'Never'}',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      if (syncProvider.pendingActionsCount > 0) ...[
                        const SizedBox(height: 8),
                        Text(
                          '${syncProvider.pendingActionsCount} pending changes',
                          style: Theme.of(context).textTheme.bodySmall
                              ?.copyWith(
                                color: Colors.orange,
                                fontWeight: FontWeight.w500,
                              ),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Auto Sync Settings
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Auto Sync',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      SwitchListTile(
                        title: const Text('Enable Auto Sync'),
                        subtitle: const Text('Automatically sync when online'),
                        value: syncProvider.autoSyncEnabled,
                        onChanged: (value) => syncProvider.setAutoSync(value),
                      ),
                      if (syncProvider.autoSyncEnabled)
                        ListTile(
                          title: const Text('Sync Interval'),
                          subtitle: Text(
                            '${syncProvider.syncInterval ~/ 60000} minutes',
                          ),
                          trailing: const Icon(Icons.chevron_right),
                          onTap: () =>
                              _showSyncIntervalDialog(context, syncProvider),
                        ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Sync Actions
              Card(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Actions',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      ListTile(
                        leading: const Icon(Icons.sync),
                        title: const Text('Sync Now'),
                        subtitle: const Text('Force sync with server'),
                        onTap: syncProvider.syncStatus == SyncStatus.syncing
                            ? null
                            : () => syncProvider.performSync(),
                        enabled: syncProvider.syncStatus != SyncStatus.syncing,
                      ),
                      ListTile(
                        leading: const Icon(Icons.check_circle),
                        title: const Text('Validate Data'),
                        subtitle: const Text('Check data integrity'),
                        onTap: () => syncProvider.validateDataIntegrity(),
                      ),
                      if (syncProvider.pendingActionsCount > 0)
                        ListTile(
                          leading: const Icon(Icons.clear),
                          title: const Text('Clear Pending Changes'),
                          subtitle: const Text('Discard offline changes'),
                          onTap: () =>
                              _showClearPendingDialog(context, syncProvider),
                        ),
                    ],
                  ),
                ),
              ),

              // Sync Statistics
              if (syncProvider.syncStats != null) ...[
                const SizedBox(height: 16),
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Statistics',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 8),
                        _buildStatRow(
                          'Total Syncs',
                          syncProvider.syncStats!.totalSyncs.toString(),
                        ),
                        _buildStatRow(
                          'Creates',
                          syncProvider.syncStats!.creates.toString(),
                        ),
                        _buildStatRow(
                          'Updates',
                          syncProvider.syncStats!.updates.toString(),
                        ),
                        _buildStatRow(
                          'Deletes',
                          syncProvider.syncStats!.deletes.toString(),
                        ),
                        if (syncProvider.syncStats!.failures > 0)
                          _buildStatRow(
                            'Failures',
                            syncProvider.syncStats!.failures.toString(),
                            Colors.red,
                          ),
                      ],
                    ),
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }

  Widget _buildStatRow(String label, String value, [Color? valueColor]) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label),
          Text(
            value,
            style: TextStyle(fontWeight: FontWeight.w500, color: valueColor),
          ),
        ],
      ),
    );
  }

  void _showSyncIntervalDialog(
    BuildContext context,
    SyncProvider syncProvider,
  ) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Sync Interval'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              title: const Text('1 minute'),
              onTap: () {
                syncProvider.setSyncInterval(60000);
                Navigator.of(context).pop();
              },
            ),
            ListTile(
              title: const Text('5 minutes'),
              onTap: () {
                syncProvider.setSyncInterval(300000);
                Navigator.of(context).pop();
              },
            ),
            ListTile(
              title: const Text('15 minutes'),
              onTap: () {
                syncProvider.setSyncInterval(900000);
                Navigator.of(context).pop();
              },
            ),
            ListTile(
              title: const Text('30 minutes'),
              onTap: () {
                syncProvider.setSyncInterval(1800000);
                Navigator.of(context).pop();
              },
            ),
          ],
        ),
      ),
    );
  }

  void _showClearPendingDialog(
    BuildContext context,
    SyncProvider syncProvider,
  ) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Clear Pending Changes'),
        content: const Text(
          'This will discard all offline changes that haven\'t been synced yet. Are you sure?',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () {
              syncProvider.clearPendingActions();
              Navigator.of(context).pop();
            },
            child: const Text('Clear'),
          ),
        ],
      ),
    );
  }

  String _formatDateTime(DateTime dateTime) {
    final now = DateTime.now();
    final difference = now.difference(dateTime);

    if (difference.inDays > 0) {
      return '${difference.inDays}d ago';
    } else if (difference.inHours > 0) {
      return '${difference.inHours}h ago';
    } else if (difference.inMinutes > 0) {
      return '${difference.inMinutes}m ago';
    } else {
      return 'Just now';
    }
  }
}

enum SyncStatus { synced, syncing, offline, error, conflicts }
