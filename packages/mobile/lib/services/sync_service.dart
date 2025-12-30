import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class SyncService {
  final String baseUrl;
  final http.Client _httpClient;
  String? _authToken;

  // Offline action queue
  final List<OfflineAction> _offlineActions = [];

  SyncService({required this.baseUrl, http.Client? httpClient})
    : _httpClient = httpClient ?? http.Client();

  // Initialize with stored auth token
  Future<void> initialize() async {
    final prefs = await SharedPreferences.getInstance();
    _authToken = prefs.getString('auth_token');
  }

  // Set authentication token
  void setAuthToken(String token) {
    _authToken = token;
  }

  // Get headers with authentication
  Map<String, String> get _headers => {
    'Content-Type': 'application/json',
    if (_authToken != null) 'Authorization': 'Bearer $_authToken',
  };

  // Sync with server - upload offline actions and download changes
  Future<SyncResult> sync({DateTime? lastSyncTime}) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      lastSyncTime ??= DateTime.fromMillisecondsSinceEpoch(
        prefs.getInt('last_sync_time') ?? 0,
      );

      // Upload offline actions first
      OfflineActionResults? offlineResults;
      if (_offlineActions.isNotEmpty) {
        offlineResults = await _uploadOfflineActions();
      }

      // Download changes since last sync
      final changes = await _downloadChanges(lastSyncTime);

      // Update last sync time
      await prefs.setInt(
        'last_sync_time',
        DateTime.now().millisecondsSinceEpoch,
      );

      return SyncResult(
        success: true,
        timestamp: DateTime.now(),
        changes: changes,
        offlineResults: offlineResults,
      );
    } catch (e) {
      return SyncResult(
        success: false,
        error: e.toString(),
        timestamp: DateTime.now(),
      );
    }
  }

  // Upload offline actions to server
  Future<OfflineActionResults> _uploadOfflineActions() async {
    final response = await _httpClient.post(
      Uri.parse('$baseUrl/api/sync/offline-actions'),
      headers: _headers,
      body: jsonEncode({
        'actions': _offlineActions.map((a) => a.toJson()).toList(),
      }),
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final results = OfflineActionResults.fromJson(data['results']);

      // Clear successful actions from queue
      _offlineActions.clear();

      return results;
    } else {
      throw Exception('Failed to upload offline actions: ${response.body}');
    }
  }

  // Download changes from server
  Future<SyncChanges> _downloadChanges(DateTime since) async {
    final response = await _httpClient.get(
      Uri.parse('$baseUrl/api/sync/changes?since=${since.toIso8601String()}'),
      headers: _headers,
    );

    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return SyncChanges.fromJson(data['changes']);
    } else {
      throw Exception('Failed to download changes: ${response.body}');
    }
  }

  // Add offline action to queue
  void addOfflineAction(OfflineAction action) {
    _offlineActions.add(action);
    _saveOfflineActionsToStorage();
  }

  // Create offline action for wishlist creation
  void createWishlistOffline(Map<String, dynamic> wishlistData) {
    final action = OfflineAction(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      type: OfflineActionType.create,
      entityType: EntityType.wishlist,
      data: wishlistData,
      timestamp: DateTime.now(),
      tempId: 'temp_${DateTime.now().millisecondsSinceEpoch}',
    );
    addOfflineAction(action);
  }

  // Create offline action for item creation
  void createItemOffline(Map<String, dynamic> itemData) {
    final action = OfflineAction(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      type: OfflineActionType.create,
      entityType: EntityType.item,
      data: itemData,
      timestamp: DateTime.now(),
      tempId: 'temp_item_${DateTime.now().millisecondsSinceEpoch}',
    );
    addOfflineAction(action);
  }

  // Create offline action for updates
  void updateEntityOffline(EntityType entityType, Map<String, dynamic> data) {
    final action = OfflineAction(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      type: OfflineActionType.update,
      entityType: entityType,
      data: data,
      timestamp: DateTime.now(),
    );
    addOfflineAction(action);
  }

  // Create offline action for deletions
  void deleteEntityOffline(EntityType entityType, int entityId) {
    final action = OfflineAction(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      type: OfflineActionType.delete,
      entityType: entityType,
      data: {'id': entityId},
      timestamp: DateTime.now(),
    );
    addOfflineAction(action);
  }

  // Save offline actions to local storage
  Future<void> _saveOfflineActionsToStorage() async {
    final prefs = await SharedPreferences.getInstance();
    final actionsJson = _offlineActions.map((a) => a.toJson()).toList();
    await prefs.setString('offline_actions', jsonEncode(actionsJson));
  }

  // Load offline actions from local storage
  Future<void> loadOfflineActionsFromStorage() async {
    final prefs = await SharedPreferences.getInstance();
    final actionsString = prefs.getString('offline_actions');

    if (actionsString != null) {
      final actionsList = jsonDecode(actionsString) as List;
      _offlineActions.clear();
      _offlineActions.addAll(
        actionsList.map((json) => OfflineAction.fromJson(json)).toList(),
      );
    }
  }

  // Check if device is online
  Future<bool> isOnline() async {
    try {
      final response = await _httpClient
          .get(Uri.parse('$baseUrl/api/sync/status'), headers: _headers)
          .timeout(const Duration(seconds: 5));

      return response.statusCode == 200;
    } catch (e) {
      return false;
    }
  }

  // Get sync statistics
  Future<SyncStats?> getSyncStats() async {
    try {
      final response = await _httpClient.get(
        Uri.parse('$baseUrl/api/sync/status'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return SyncStats.fromJson(data['stats']);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // Validate data integrity
  Future<DataIntegrityResult?> validateDataIntegrity() async {
    try {
      final response = await _httpClient.get(
        Uri.parse('$baseUrl/api/sync/validate'),
        headers: _headers,
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        return DataIntegrityResult.fromJson(data['validation']);
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  // Get pending offline actions count
  int get pendingActionsCount => _offlineActions.length;

  // Clear all offline actions (use with caution)
  void clearOfflineActions() {
    _offlineActions.clear();
    _saveOfflineActionsToStorage();
  }

  void dispose() {
    _httpClient.close();
  }
}

// Data models for sync functionality
class SyncResult {
  final bool success;
  final DateTime timestamp;
  final String? error;
  final SyncChanges? changes;
  final OfflineActionResults? offlineResults;

  SyncResult({
    required this.success,
    required this.timestamp,
    this.error,
    this.changes,
    this.offlineResults,
  });
}

class SyncChanges {
  final List<Map<String, dynamic>> wishlists;
  final List<Map<String, dynamic>> items;
  final List<Map<String, dynamic>> beneficiaries;
  final List<Map<String, dynamic>> notifications;
  final List<Map<String, dynamic>> deletions;

  SyncChanges({
    required this.wishlists,
    required this.items,
    required this.beneficiaries,
    required this.notifications,
    required this.deletions,
  });

  factory SyncChanges.fromJson(Map<String, dynamic> json) {
    return SyncChanges(
      wishlists: List<Map<String, dynamic>>.from(json['wishlists'] ?? []),
      items: List<Map<String, dynamic>>.from(json['items'] ?? []),
      beneficiaries: List<Map<String, dynamic>>.from(
        json['beneficiaries'] ?? [],
      ),
      notifications: List<Map<String, dynamic>>.from(
        json['notifications'] ?? [],
      ),
      deletions: List<Map<String, dynamic>>.from(json['deletions'] ?? []),
    );
  }
}

class OfflineAction {
  final String id;
  final OfflineActionType type;
  final EntityType entityType;
  final Map<String, dynamic> data;
  final DateTime timestamp;
  final String? tempId;

  OfflineAction({
    required this.id,
    required this.type,
    required this.entityType,
    required this.data,
    required this.timestamp,
    this.tempId,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'type': type.name,
      'entityType': entityType.name,
      'data': data,
      'timestamp': timestamp.toIso8601String(),
      'tempId': tempId,
    };
  }

  factory OfflineAction.fromJson(Map<String, dynamic> json) {
    return OfflineAction(
      id: json['id'],
      type: OfflineActionType.values.firstWhere((e) => e.name == json['type']),
      entityType: EntityType.values.firstWhere(
        (e) => e.name == json['entityType'],
      ),
      data: json['data'],
      timestamp: DateTime.parse(json['timestamp']),
      tempId: json['tempId'],
    );
  }
}

class OfflineActionResults {
  final List<Map<String, dynamic>> processed;
  final List<Map<String, dynamic>> conflicts;
  final Map<String, dynamic> summary;

  OfflineActionResults({
    required this.processed,
    required this.conflicts,
    required this.summary,
  });

  factory OfflineActionResults.fromJson(Map<String, dynamic> json) {
    return OfflineActionResults(
      processed: List<Map<String, dynamic>>.from(json['processed'] ?? []),
      conflicts: List<Map<String, dynamic>>.from(json['conflicts'] ?? []),
      summary: json['summary'] ?? {},
    );
  }
}

class SyncStats {
  final int totalSyncs;
  final int creates;
  final int updates;
  final int deletes;
  final int failures;
  final int devices;
  final int? mostRecentSync;

  SyncStats({
    required this.totalSyncs,
    required this.creates,
    required this.updates,
    required this.deletes,
    required this.failures,
    required this.devices,
    this.mostRecentSync,
  });

  factory SyncStats.fromJson(Map<String, dynamic> json) {
    return SyncStats(
      totalSyncs: json['totalSyncs'] ?? 0,
      creates: json['creates'] ?? 0,
      updates: json['updates'] ?? 0,
      deletes: json['deletes'] ?? 0,
      failures: json['failures'] ?? 0,
      devices: json['devices'] ?? 0,
      mostRecentSync: json['mostRecentSync'],
    );
  }
}

class DataIntegrityResult {
  final bool valid;
  final List<Map<String, dynamic>> issues;
  final String? error;

  DataIntegrityResult({required this.valid, required this.issues, this.error});

  factory DataIntegrityResult.fromJson(Map<String, dynamic> json) {
    return DataIntegrityResult(
      valid: json['valid'] ?? false,
      issues: List<Map<String, dynamic>>.from(json['issues'] ?? []),
      error: json['error'],
    );
  }
}

enum OfflineActionType { create, update, delete }

enum EntityType { wishlist, item, beneficiary }
