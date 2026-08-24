import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_contacts/flutter_contacts.dart';

import '../services/firebase_functions_service.dart';

/// Friends & connections — mutual-consent relationships used to share
/// wishlists and get gift suggestions from people you actually know. Backed
/// by packages/functions/src/api/connections.ts via the `api` HTTP router
/// (see FirebaseFunctionsService's CONNECTIONS section). Reached from the
/// Profile tab, same as AccountScreen/SubscriptionScreen.
class ConnectionsScreen extends StatefulWidget {
  const ConnectionsScreen({super.key, FirebaseFunctionsService? functionsService})
      : _functionsService = functionsService;

  // Injectable for tests; defaults to the real Firebase-backed singleton.
  final FirebaseFunctionsService? _functionsService;

  @override
  State<ConnectionsScreen> createState() => _ConnectionsScreenState();
}

class _ConnectionsScreenState extends State<ConnectionsScreen> {
  late final FirebaseFunctionsService _service =
      widget._functionsService ?? FirebaseFunctionsService();

  bool _isLoading = true;
  String? _loadError;
  List<Map<String, dynamic>> _connections = [];
  List<Map<String, dynamic>> _incoming = [];
  List<Map<String, dynamic>> _outgoing = [];

  final _searchController = TextEditingController();
  final _emailController = TextEditingController();
  Timer? _debounce;
  bool _isSearching = false;
  List<Map<String, dynamic>> _searchResults = [];
  String? _busyConnectionId;
  bool _isSendingRequest = false;

  @override
  void initState() {
    super.initState();
    _loadAll();
  }

  @override
  void dispose() {
    _searchController.dispose();
    _emailController.dispose();
    _debounce?.cancel();
    super.dispose();
  }

  Future<void> _loadAll() async {
    setState(() {
      _isLoading = true;
      _loadError = null;
    });
    try {
      final connections = await _service.listConnections();
      final pending = await _service.listPendingConnectionRequests();
      if (!mounted) return;
      setState(() {
        _connections = connections;
        _incoming = List<Map<String, dynamic>>.from(
          (pending['incoming'] as List).map((e) => Map<String, dynamic>.from(e as Map)),
        );
        _outgoing = List<Map<String, dynamic>>.from(
          (pending['outgoing'] as List).map((e) => Map<String, dynamic>.from(e as Map)),
        );
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loadError = 'Failed to load connections.';
        _isLoading = false;
      });
    }
  }

  void _onSearchChanged(String value) {
    _debounce?.cancel();
    _debounce = Timer(const Duration(milliseconds: 300), () => _runSearch(value.trim()));
  }

  Future<void> _runSearch(String query) async {
    if (query.length < 2) {
      setState(() => _searchResults = []);
      return;
    }
    setState(() => _isSearching = true);
    try {
      final results = await _service.searchUsers(query);
      if (!mounted) return;
      setState(() {
        _searchResults = results;
        _isSearching = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSearching = false);
    }
  }

  Future<void> _sendRequest({String? targetUserId, String? email, required String label}) async {
    setState(() => _isSendingRequest = true);
    try {
      final result = await _service.sendConnectionRequest(targetUserId: targetUserId, email: email);
      if (!mounted) return;
      final status = result['status'] as String?;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            status == 'active'
                ? "You're now connected with $label."
                : 'Connection request sent to $label.',
          ),
        ),
      );
      _searchController.clear();
      _emailController.clear();
      setState(() => _searchResults = []);
      await _loadAll();
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to send connection request.'), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _isSendingRequest = false);
    }
  }

  void _sendRequestByEmail() {
    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Enter a valid email address.'), backgroundColor: Colors.red),
      );
      return;
    }
    _sendRequest(email: email, label: email);
  }

  Future<void> _pickFromContactsAndConnect() async {
    try {
      final granted = await FlutterContacts.requestPermission();
      if (!granted) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Contacts permission was not granted.')),
        );
        return;
      }
      final contact = await FlutterContacts.openExternalPick();
      if (contact == null || !mounted) return;
      if (contact.emails.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('That contact has no email address on file.')),
        );
        return;
      }
      final email = contact.emails.first.address;
      final name = contact.displayName.isNotEmpty ? contact.displayName : email;
      await _sendRequest(email: email, label: name);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not open contacts: $e')),
      );
    }
  }

  Future<void> _respond(String connectionId, bool accept) async {
    setState(() => _busyConnectionId = connectionId);
    try {
      await _service.respondToConnectionRequest(connectionId, accept);
      await _loadAll();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to respond to request.'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _busyConnectionId = null);
    }
  }

  Future<void> _remove(String connectionId) async {
    setState(() => _busyConnectionId = connectionId);
    try {
      await _service.removeConnection(connectionId);
      await _loadAll();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to remove connection.'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _busyConnectionId = null);
    }
  }

  String _displayName(Map<String, dynamic>? user) {
    if (user == null) return 'Wishlist Wizard user';
    final displayName = user['displayName'] as String?;
    if (displayName != null && displayName.isNotEmpty) return displayName;
    final username = user['username'] as String?;
    if (username != null && username.isNotEmpty) return '@$username';
    return 'Wishlist Wizard user';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Connections')),
      body: RefreshIndicator(
        onRefresh: _loadAll,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _loadError != null
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      const SizedBox(height: 80),
                      Center(child: Text(_loadError!, style: const TextStyle(color: Colors.red))),
                    ],
                  )
                : ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    children: [
                      _buildSectionHeader('Your Connections (${_connections.length})'),
                      const SizedBox(height: 8),
                      if (_connections.isEmpty)
                        _buildEmptyCard('No connections yet. Find friends below to get started.')
                      else
                        ..._connections.map(_buildConnectionTile),
                      if (_incoming.isNotEmpty || _outgoing.isNotEmpty) ...[
                        const SizedBox(height: 24),
                        _buildSectionHeader('Pending Requests'),
                        const SizedBox(height: 8),
                        ..._incoming.map(_buildIncomingRequestTile),
                        ..._outgoing.map(_buildOutgoingRequestTile),
                      ],
                      const SizedBox(height: 24),
                      _buildSectionHeader('Find Friends'),
                      const SizedBox(height: 8),
                      Text(
                        'Connect with friends to share wishlists, collaborate on gifts, and get gift suggestions.',
                        style: Theme.of(context).textTheme.bodySmall?.copyWith(color: Colors.grey[600]),
                      ),
                      const SizedBox(height: 12),
                      OutlinedButton.icon(
                        onPressed: _isSendingRequest ? null : _pickFromContactsAndConnect,
                        icon: const Icon(Icons.contacts),
                        label: const Text('Connect from Contacts'),
                      ),
                      const SizedBox(height: 16),
                      TextField(
                        controller: _searchController,
                        onChanged: _onSearchChanged,
                        decoration: const InputDecoration(
                          labelText: 'Search by name or username',
                          hintText: 'Type at least 2 characters...',
                          prefixIcon: Icon(Icons.search),
                        ),
                      ),
                      if (_isSearching) ...[
                        const SizedBox(height: 12),
                        const Center(child: CircularProgressIndicator(strokeWidth: 2)),
                      ] else if (_searchResults.isNotEmpty) ...[
                        const SizedBox(height: 8),
                        ..._searchResults.map(_buildSearchResultTile),
                      ],
                      const SizedBox(height: 16),
                      Text(
                        'Or invite by email',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                      const SizedBox(height: 4),
                      TextField(
                        controller: _emailController,
                        keyboardType: TextInputType.emailAddress,
                        decoration: const InputDecoration(
                          labelText: 'Email',
                          hintText: 'name@example.com',
                        ),
                      ),
                      const SizedBox(height: 8),
                      ElevatedButton.icon(
                        onPressed: _isSendingRequest ? null : _sendRequestByEmail,
                        icon: const Icon(Icons.mail_outline),
                        label: const Text('Send Request'),
                      ),
                    ],
                  ),
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(title, style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.bold));
  }

  Widget _buildEmptyCard(String message) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Center(
          child: Text(message, textAlign: TextAlign.center, style: TextStyle(color: Colors.grey[600])),
        ),
      ),
    );
  }

  Widget _buildConnectionTile(Map<String, dynamic> entry) {
    final connectionId = entry['connectionId'] as String;
    final user = entry['user'] as Map<String, dynamic>?;
    final name = _displayName(user);
    final busy = _busyConnectionId == connectionId;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?')),
        title: Text(name),
        trailing: busy
            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
            : IconButton(
                icon: const Icon(Icons.person_remove_outlined),
                tooltip: 'Remove connection',
                onPressed: () => _remove(connectionId),
              ),
      ),
    );
  }

  Widget _buildIncomingRequestTile(Map<String, dynamic> entry) {
    final connectionId = entry['connectionId'] as String;
    final user = entry['user'] as Map<String, dynamic>?;
    final name = _displayName(user);
    final busy = _busyConnectionId == connectionId;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?')),
        title: Text(name),
        subtitle: const Text('Wants to connect'),
        trailing: busy
            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
            : Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  IconButton(
                    icon: const Icon(Icons.check_circle_outline, color: Colors.green),
                    tooltip: 'Accept',
                    onPressed: () => _respond(connectionId, true),
                  ),
                  IconButton(
                    icon: const Icon(Icons.cancel_outlined, color: Colors.red),
                    tooltip: 'Decline',
                    onPressed: () => _respond(connectionId, false),
                  ),
                ],
              ),
      ),
    );
  }

  Widget _buildOutgoingRequestTile(Map<String, dynamic> entry) {
    final connectionId = entry['connectionId'] as String;
    final user = entry['user'] as Map<String, dynamic>?;
    final name = _displayName(user);
    final busy = _busyConnectionId == connectionId;
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?')),
        title: Text(name),
        subtitle: const Text('Request pending'),
        trailing: busy
            ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
            : TextButton(
                onPressed: () => _remove(connectionId),
                child: const Text('Cancel'),
              ),
      ),
    );
  }

  Widget _buildSearchResultTile(Map<String, dynamic> result) {
    final id = result['id'] as String;
    final displayName = result['displayName'] as String?;
    final username = result['username'] as String?;
    final name = (displayName != null && displayName.isNotEmpty)
        ? displayName
        : (username != null ? '@$username' : 'User');
    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      child: ListTile(
        leading: CircleAvatar(child: Text(name.isNotEmpty ? name[0].toUpperCase() : '?')),
        title: Text(name),
        subtitle: username != null && displayName != null && displayName.isNotEmpty ? Text('@$username') : null,
        trailing: ElevatedButton(
          onPressed: _isSendingRequest ? null : () => _sendRequest(targetUserId: id, label: name),
          child: const Text('Connect'),
        ),
      ),
    );
  }
}
