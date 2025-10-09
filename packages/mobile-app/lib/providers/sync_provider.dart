import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../services/sync_service.dart';
import '../widgets/sync_widgets.dart';

class SyncProvider extends ChangeNotifier {
  final SyncService _syncService;

  SyncStatus _syncStatus = SyncStatus.offline;
  DateTime? _lastSyncTime;
  bool _autoSyncEnabled = true;
  int _syncInterval = 300000; // 5 minutes in milliseconds
  SyncStats? _syncStats;
  int _pendingActionsCount = 0;
  Timer? _autoSyncTimer;
  Timer? _connectivityTimer;

  SyncProvider(this._syncService) {
    _initialize();
  }

  // Getters
  SyncStatus get syncStatus => _syncStatus;
  DateTime? get lastSyncTime => _lastSyncTime;
  bool get autoSyncEnabled => _autoSyncEnabled;
  int get syncInterval => _syncInterval;
  SyncStats? get syncStats => _syncStats;
  int get pendingActionsCount => _pendingActionsCount;

  Future<void> _initialize() async {
    await _loadSettings();
    await _syncService.loadOfflineActionsFromStorage();
    _updatePendingActionsCount();

    // Check connectivity periodically
    _startConnectivityTimer();

    // Start auto-sync if enabled
    if (_autoSyncEnabled) {
      _startAutoSync();
    }
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    _autoSyncEnabled = prefs.getBool('auto_sync_enabled') ?? true;
    _syncInterval = prefs.getInt('sync_interval') ?? 300000;

    final lastSyncTimestamp = prefs.getInt('last_sync_time');
    if (lastSyncTimestamp != null) {
      _lastSyncTime = DateTime.fromMillisecondsSinceEpoch(lastSyncTimestamp);
    }

    notifyListeners();
  }

  Future<void> _saveSettings() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setBool('auto_sync_enabled', _autoSyncEnabled);
    await prefs.setInt('sync_interval', _syncInterval);
  }

  void _startConnectivityTimer() {
    _connectivityTimer?.cancel();
    _connectivityTimer = Timer.periodic(
      const Duration(seconds: 30),
      (_) => _checkConnectivityStatus(),
    );
  }

  Future<void> _checkConnectivityStatus() async {
    final isOnline = await _syncService.isOnline();

    if (isOnline && _syncStatus == SyncStatus.offline) {
      _updateSyncStatus(SyncStatus.synced);

      // Auto-sync if enabled and there are pending actions
      if (_autoSyncEnabled && _pendingActionsCount > 0) {
        performSync();
      }
    } else if (!isOnline && _syncStatus != SyncStatus.offline) {
      _updateSyncStatus(SyncStatus.offline);
    }
  }

  void _startAutoSync() {
    _autoSyncTimer?.cancel();
    _autoSyncTimer = Timer.periodic(
      Duration(milliseconds: _syncInterval),
      (_) => _autoSync(),
    );
  }

  void _stopAutoSync() {
    _autoSyncTimer?.cancel();
    _autoSyncTimer = null;
  }

  Future<void> _autoSync() async {
    if (_syncStatus != SyncStatus.syncing && await _syncService.isOnline()) {
      await performSync();
    }
  }

  void _updateSyncStatus(SyncStatus status) {
    if (_syncStatus != status) {
      _syncStatus = status;
      notifyListeners();
    }
  }

  void _updatePendingActionsCount() {
    final newCount = _syncService.pendingActionsCount;
    if (_pendingActionsCount != newCount) {
      _pendingActionsCount = newCount;
      notifyListeners();
    }
  }

  // Public methods
  Future<void> performSync() async {
    if (_syncStatus == SyncStatus.syncing) return;

    _updateSyncStatus(SyncStatus.syncing);

    try {
      final result = await _syncService.sync(lastSyncTime: _lastSyncTime);

      if (result.success) {
        _lastSyncTime = result.timestamp;
        _updatePendingActionsCount();

        // Save last sync time
        final prefs = await SharedPreferences.getInstance();
        await prefs.setInt(
          'last_sync_time',
          result.timestamp.millisecondsSinceEpoch,
        );

        // Check for conflicts
        if (result.offlineResults?.conflicts.isNotEmpty == true) {
          _updateSyncStatus(SyncStatus.conflicts);
        } else {
          _updateSyncStatus(SyncStatus.synced);
        }

        // Update sync stats
        await _loadSyncStats();
      } else {
        _updateSyncStatus(SyncStatus.error);
      }
    } catch (e) {
      _updateSyncStatus(SyncStatus.error);
    }
  }

  Future<void> _loadSyncStats() async {
    try {
      _syncStats = await _syncService.getSyncStats();
      notifyListeners();
    } catch (e) {
      // Handle error silently
    }
  }

  void setAutoSync(bool enabled) {
    _autoSyncEnabled = enabled;
    _saveSettings();

    if (enabled) {
      _startAutoSync();
    } else {
      _stopAutoSync();
    }

    notifyListeners();
  }

  void setSyncInterval(int interval) {
    _syncInterval = interval;
    _saveSettings();

    if (_autoSyncEnabled) {
      _startAutoSync(); // Restart with new interval
    }

    notifyListeners();
  }

  Future<void> validateDataIntegrity() async {
    try {
      final result = await _syncService.validateDataIntegrity();

      if (result != null && !result.valid) {
        _updateSyncStatus(SyncStatus.error);
      }
    } catch (e) {
      _updateSyncStatus(SyncStatus.error);
    }
  }

  void clearPendingActions() {
    _syncService.clearOfflineActions();
    _updatePendingActionsCount();

    if (_syncStatus == SyncStatus.conflicts) {
      _updateSyncStatus(SyncStatus.synced);
    }
  }

  // Offline action helpers
  void createWishlistOffline(Map<String, dynamic> wishlistData) {
    _syncService.createWishlistOffline(wishlistData);
    _updatePendingActionsCount();

    if (_syncStatus == SyncStatus.synced) {
      _updateSyncStatus(SyncStatus.offline);
    }
  }

  void createItemOffline(Map<String, dynamic> itemData) {
    _syncService.createItemOffline(itemData);
    _updatePendingActionsCount();

    if (_syncStatus == SyncStatus.synced) {
      _updateSyncStatus(SyncStatus.offline);
    }
  }

  void updateEntityOffline(EntityType entityType, Map<String, dynamic> data) {
    _syncService.updateEntityOffline(entityType, data);
    _updatePendingActionsCount();

    if (_syncStatus == SyncStatus.synced) {
      _updateSyncStatus(SyncStatus.offline);
    }
  }

  void deleteEntityOffline(EntityType entityType, int entityId) {
    _syncService.deleteEntityOffline(entityType, entityId);
    _updatePendingActionsCount();

    if (_syncStatus == SyncStatus.synced) {
      _updateSyncStatus(SyncStatus.offline);
    }
  }

  @override
  void dispose() {
    _autoSyncTimer?.cancel();
    _connectivityTimer?.cancel();
    super.dispose();
  }
}
