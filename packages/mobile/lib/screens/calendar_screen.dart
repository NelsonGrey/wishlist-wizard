import 'package:flutter/material.dart';
import 'package:flutter_web_auth_2/flutter_web_auth_2.dart';
import 'package:intl/intl.dart';

import '../services/firebase_functions_service.dart';

const List<Map<String, String>> _eventTypes = [
  {'value': 'birthday', 'label': 'Birthday'},
  {'value': 'holiday', 'label': 'Holiday'},
  {'value': 'anniversary', 'label': 'Anniversary'},
  {'value': 'reminder', 'label': 'Reminder'},
  {'value': 'deadline', 'label': 'Deadline'},
  {'value': 'occasion', 'label': 'Occasion'},
];

const String _oauthCallbackScheme = 'wishlistwizard';
const String _oauthRedirectUri = '$_oauthCallbackScheme://calendar-callback';

const List<Map<String, String>> _oauthProviders = [
  {'value': 'google', 'label': 'Google Calendar'},
  {'value': 'outlook', 'label': 'Outlook Calendar'},
  {'value': 'facebook', 'label': 'Facebook Events'},
];

IconData _iconForType(String type) {
  switch (type) {
    case 'birthday':
      return Icons.cake_outlined;
    case 'holiday':
      return Icons.celebration_outlined;
    case 'anniversary':
      return Icons.favorite_outline;
    case 'deadline':
      return Icons.timer_outlined;
    case 'occasion':
      return Icons.card_giftcard_outlined;
    default:
      return Icons.notifications_outlined;
  }
}

String _labelForType(String type) {
  for (final entry in _eventTypes) {
    if (entry['value'] == type) return entry['label']!;
  }
  return 'Reminder';
}

IconData _iconForProvider(String provider) {
  switch (provider) {
    case 'google':
      return Icons.event_outlined;
    case 'outlook':
      return Icons.mail_outline;
    case 'facebook':
      return Icons.facebook_outlined;
    case 'apple':
      return Icons.apple;
    default:
      return Icons.calendar_month_outlined;
  }
}

String _labelForProvider(String provider) {
  switch (provider) {
    case 'google':
      return 'Google Calendar';
    case 'outlook':
      return 'Outlook Calendar';
    case 'facebook':
      return 'Facebook Events';
    case 'apple':
      return 'Apple Calendar';
    default:
      return provider;
  }
}

DateTime? _parseDate(dynamic value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString());
}

/// Calendar -- "My Calendar" (personal events, computed lists) and
/// "Connections" (external provider sync: Google/Outlook/Facebook via real
/// OAuth 2.0, Apple via a pasted iCal subscription URL) tabs, mirroring
/// web's Calendar.tsx split. Reached from the Profile tab.
class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key, FirebaseFunctionsService? functionsService})
      : _functionsService = functionsService;

  final FirebaseFunctionsService? _functionsService;

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen>
    with SingleTickerProviderStateMixin {
  late final FirebaseFunctionsService _service =
      widget._functionsService ?? FirebaseFunctionsService();
  late final TabController _tabController;

  // My Calendar tab state
  bool _isLoadingEvents = true;
  String? _eventsError;
  List<Map<String, dynamic>> _events = [];
  String? _busyEventId;

  // Connections tab state
  bool _isLoadingConnections = true;
  bool _connectionsUpgradeRequired = false;
  String? _connectionsError;
  List<Map<String, dynamic>> _connections = [];
  String? _busyConnectionId;
  String? _connectingProvider;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this)
      ..addListener(() {
        if (!_tabController.indexIsChanging) setState(() {});
      });
    _loadEvents();
    _loadConnections();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadEvents() async {
    setState(() {
      _isLoadingEvents = true;
      _eventsError = null;
    });
    try {
      final events = await _service.getCalendarEvents();
      if (!mounted) return;
      setState(() {
        _events = events;
        _isLoadingEvents = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _eventsError = 'Failed to load calendar events.';
        _isLoadingEvents = false;
      });
    }
  }

  Future<void> _deleteEvent(String eventId) async {
    setState(() => _busyEventId = eventId);
    try {
      await _service.deleteCalendarEvent(eventId);
      await _loadEvents();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to delete event.'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _busyEventId = null);
    }
  }

  Future<void> _openCreateSheet() async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _EventFormSheet(service: _service),
    );
    if (saved == true) _loadEvents();
  }

  Future<void> _openEditSheet(Map<String, dynamic> event) async {
    final saved = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _EventFormSheet(service: _service, existingEvent: event),
    );
    if (saved == true) _loadEvents();
  }

  Future<void> _loadConnections() async {
    setState(() {
      _isLoadingConnections = true;
      _connectionsUpgradeRequired = false;
      _connectionsError = null;
    });
    try {
      final connections = await _service.getCalendarConnections();
      if (!mounted) return;
      setState(() {
        _connections = connections;
        _isLoadingConnections = false;
      });
    } catch (e) {
      if (!mounted) return;
      if (e.toString().contains('(403')) {
        setState(() {
          _connectionsUpgradeRequired = true;
          _isLoadingConnections = false;
        });
      } else {
        setState(() {
          _connectionsError = 'Failed to load calendar connections.';
          _isLoadingConnections = false;
        });
      }
    }
  }

  Future<void> _connectOAuthProvider(String provider) async {
    setState(() => _connectingProvider = provider);
    try {
      final authResult = await _service.getCalendarAuthUrl(provider, redirectUri: _oauthRedirectUri);
      if (authResult['supported'] == false) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(authResult['message']?.toString() ?? '$provider is not available yet.')),
          );
        }
        return;
      }

      final callbackUrl = await FlutterWebAuth2.authenticate(
        url: authResult['url'] as String,
        callbackUrlScheme: _oauthCallbackScheme,
      );
      final params = Uri.parse(callbackUrl).queryParameters;
      final code = params['code'];
      if (code == null) {
        throw Exception('No authorization code returned.');
      }

      await _service.connectCalendar({
        'provider': provider,
        'code': code,
        'state': params['state'],
        'redirectUri': _oauthRedirectUri,
      });
      await _loadConnections();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Couldn\'t connect $provider.'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _connectingProvider = null);
    }
  }

  Future<void> _openConnectAppleSheet() async {
    final connected = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      builder: (context) => _AppleCalendarSheet(service: _service),
    );
    if (connected == true) _loadConnections();
  }

  Future<void> _syncConnection(String connectionId) async {
    setState(() => _busyConnectionId = connectionId);
    try {
      await _service.syncCalendarConnection(connectionId);
      await _loadConnections();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Sync failed.'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _busyConnectionId = null);
    }
  }

  Future<void> _disconnectConnection(String connectionId) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Disconnect calendar?'),
        content: const Text('This stops syncing events from this calendar. You can reconnect it later.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Disconnect')),
        ],
      ),
    );
    if (confirmed != true) return;

    setState(() => _busyConnectionId = connectionId);
    try {
      await _service.disconnectCalendar(connectionId);
      await _loadConnections();
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Failed to disconnect calendar.'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _busyConnectionId = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Calendar'),
        bottom: TabBar(
          controller: _tabController,
          tabs: const [Tab(text: 'My Calendar'), Tab(text: 'Connections')],
        ),
      ),
      floatingActionButton: _tabController.index == 0
          ? FloatingActionButton(
              onPressed: _openCreateSheet,
              tooltip: 'Add calendar event',
              child: const Icon(Icons.add),
            )
          : null,
      body: TabBarView(
        controller: _tabController,
        children: [_buildMyCalendarTab(), _buildConnectionsTab()],
      ),
    );
  }

  Widget _buildMyCalendarTab() {
    return RefreshIndicator(
      onRefresh: _loadEvents,
      child: _isLoadingEvents
          ? const Center(child: CircularProgressIndicator())
          : _eventsError != null
              ? ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  children: [
                    const SizedBox(height: 80),
                    Center(child: Text(_eventsError!, style: const TextStyle(color: Colors.red))),
                  ],
                )
              : _events.isEmpty
                  ? ListView(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16),
                      children: const [
                        SizedBox(height: 60),
                        Center(
                          child: Text(
                            'No calendar events yet. Tap + to add one.',
                            textAlign: TextAlign.center,
                          ),
                        ),
                      ],
                    )
                  : _buildEventList(),
    );
  }

  Widget _buildEventList() {
    final birthdays = _events.where((e) => e['type'] == 'birthday').toList();
    final deadlines = _events.where((e) => e['type'] == 'deadline').toList();
    final upcoming = _events
        .where((e) => e['type'] != 'birthday' && e['type'] != 'deadline')
        .toList();

    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(16),
      children: [
        if (upcoming.isNotEmpty) ..._buildSection('Upcoming', upcoming),
        if (birthdays.isNotEmpty) ..._buildSection('Birthdays', birthdays),
        if (deadlines.isNotEmpty) ..._buildSection('Deadlines', deadlines),
      ],
    );
  }

  List<Widget> _buildSection(String title, List<Map<String, dynamic>> events) {
    return [
      Padding(
        padding: const EdgeInsets.only(bottom: 8, top: 8),
        child: Text(title, style: Theme.of(context).textTheme.titleMedium),
      ),
      ...events.map(_buildEventCard),
      const SizedBox(height: 8),
    ];
  }

  Widget _buildEventCard(Map<String, dynamic> event) {
    final id = event['id'] as String;
    final title = event['title'] as String? ?? 'Event';
    final type = event['type'] as String? ?? 'reminder';
    final recurYearly = event['recurYearly'] == true;
    final startDate = _parseDate(event['startDate']);
    final busy = _busyEventId == id;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: () => _openEditSheet(event),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              Icon(_iconForType(type), color: Colors.grey[700]),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(title, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        Text(startDate != null ? DateFormat('MMM d, yyyy').format(startDate) : 'No date'),
                        if (recurYearly) ...[
                          const SizedBox(width: 8),
                          const Icon(Icons.repeat, size: 14, color: Colors.grey),
                        ],
                      ],
                    ),
                    const SizedBox(height: 4),
                    _TypeBadge(label: _labelForType(type)),
                  ],
                ),
              ),
              busy
                  ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                  : IconButton(
                      icon: const Icon(Icons.delete_outline),
                      tooltip: 'Delete calendar event',
                      onPressed: () => _deleteEvent(id),
                    ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildConnectionsTab() {
    if (_isLoadingConnections) {
      return const Center(child: CircularProgressIndicator());
    }
    if (_connectionsUpgradeRequired) {
      return _buildConnectionsUpgradePrompt();
    }
    return RefreshIndicator(
      onRefresh: _loadConnections,
      child: ListView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        children: [
          if (_connectionsError != null) ...[
            Center(child: Text(_connectionsError!, style: const TextStyle(color: Colors.red))),
            const SizedBox(height: 16),
          ],
          Text('Connect a calendar', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          ..._oauthProviders.map((entry) {
            final provider = entry['value']!;
            final busy = _connectingProvider == provider;
            return Card(
              margin: const EdgeInsets.only(bottom: 8),
              child: ListTile(
                leading: Icon(_iconForProvider(provider)),
                title: Text(entry['label']!),
                trailing: busy
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
                    : const Icon(Icons.chevron_right),
                onTap: busy ? null : () => _connectOAuthProvider(provider),
              ),
            );
          }),
          Card(
            margin: const EdgeInsets.only(bottom: 8),
            child: ListTile(
              leading: Icon(_iconForProvider('apple')),
              title: const Text('Apple Calendar'),
              subtitle: const Text('Read-only, via a subscription URL'),
              trailing: const Icon(Icons.chevron_right),
              onTap: _openConnectAppleSheet,
            ),
          ),
          const SizedBox(height: 16),
          Text('Connected calendars', style: Theme.of(context).textTheme.titleMedium),
          const SizedBox(height: 8),
          if (_connections.isEmpty)
            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Text('No calendars connected yet.'),
            )
          else
            ..._connections.map(_buildConnectionCard),
        ],
      ),
    );
  }

  Widget _buildConnectionsUpgradePrompt() {
    return ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.all(24),
      children: const [
        SizedBox(height: 60),
        Icon(Icons.calendar_month_outlined, size: 48, color: Colors.grey),
        SizedBox(height: 16),
        Text(
          'Calendar connections are a paid feature',
          textAlign: TextAlign.center,
          style: TextStyle(fontWeight: FontWeight.w700, fontSize: 18),
        ),
        SizedBox(height: 8),
        Text(
          'Upgrade to sync Google, Outlook, Facebook, or Apple calendars with your Wishlist Wizard events.',
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildConnectionCard(Map<String, dynamic> connection) {
    final id = connection['id'] as String;
    final calendarType = connection['calendarType'] as String? ?? '';
    final displayName = connection['displayName'] as String? ?? _labelForProvider(calendarType);
    final isActive = connection['isActive'] != false;
    final lastSyncedAt = _parseDate(connection['lastSyncedAt']);
    final busy = _busyConnectionId == id;

    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Row(
          children: [
            Icon(_iconForProvider(calendarType), color: Colors.grey[700]),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(displayName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.w600)),
                  const SizedBox(height: 4),
                  Text(
                    lastSyncedAt != null
                        ? 'Last synced ${DateFormat('MMM d, yyyy').format(lastSyncedAt)}'
                        : 'Not synced yet',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                  if (!isActive) ...[
                    const SizedBox(height: 4),
                    const _TypeBadge(label: 'Inactive'),
                  ],
                ],
              ),
            ),
            if (busy)
              const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2))
            else ...[
              IconButton(
                icon: const Icon(Icons.sync),
                tooltip: 'Sync now',
                onPressed: calendarType == 'apple' ? null : () => _syncConnection(id),
              ),
              IconButton(
                icon: const Icon(Icons.link_off),
                tooltip: 'Disconnect calendar',
                onPressed: () => _disconnectConnection(id),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _TypeBadge extends StatelessWidget {
  const _TypeBadge({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(color: Colors.indigo.shade50, borderRadius: BorderRadius.circular(999)),
      child: Text(label, style: TextStyle(color: Colors.indigo.shade700, fontSize: 11, fontWeight: FontWeight.w600)),
    );
  }
}

class _EventFormSheet extends StatefulWidget {
  const _EventFormSheet({required this.service, this.existingEvent});

  final FirebaseFunctionsService service;
  final Map<String, dynamic>? existingEvent;

  @override
  State<_EventFormSheet> createState() => _EventFormSheetState();
}

class _EventFormSheetState extends State<_EventFormSheet> {
  final _titleController = TextEditingController();
  final _reminderDaysController = TextEditingController(text: '7');
  String _type = 'reminder';
  DateTime _startDate = DateTime.now();
  bool _recurYearly = false;
  bool _isSubmitting = false;
  String? _submitError;

  bool get _isEditing => widget.existingEvent != null;

  @override
  void initState() {
    super.initState();
    final existing = widget.existingEvent;
    if (existing != null) {
      _titleController.text = existing['title'] as String? ?? '';
      _type = existing['type'] as String? ?? 'reminder';
      _startDate = _parseDate(existing['startDate']) ?? DateTime.now();
      _recurYearly = existing['recurYearly'] == true;
      _reminderDaysController.text = (existing['reminderDays'] ?? 7).toString();
    }
  }

  @override
  void dispose() {
    _titleController.dispose();
    _reminderDaysController.dispose();
    super.dispose();
  }

  Future<void> _pickDate() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _startDate,
      firstDate: DateTime(2000),
      lastDate: DateTime(2100),
    );
    if (picked != null) setState(() => _startDate = picked);
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) {
      setState(() => _submitError = 'Enter a title.');
      return;
    }
    final reminderDays = int.tryParse(_reminderDaysController.text.trim()) ?? 7;

    setState(() {
      _isSubmitting = true;
      _submitError = null;
    });

    final fields = <String, dynamic>{
      'title': title,
      'type': _type,
      'startDate': _startDate.toIso8601String(),
      'allDay': true,
      'recurYearly': _recurYearly,
      'reminderDays': reminderDays,
    };

    try {
      if (_isEditing) {
        await widget.service.updateCalendarEvent(
          widget.existingEvent!['id'] as String,
          fields,
        );
      } else {
        await widget.service.createCalendarEvent(fields);
      }
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitError = _isEditing ? 'Failed to update event.' : 'Failed to create event.';
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(_isEditing ? 'Edit Event' : 'Add Event', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 16),
          TextField(
            controller: _titleController,
            enabled: !_isSubmitting,
            decoration: const InputDecoration(labelText: 'Title'),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _type,
            decoration: const InputDecoration(labelText: 'Type'),
            items: _eventTypes
                .map((entry) => DropdownMenuItem(value: entry['value'], child: Text(entry['label']!)))
                .toList(),
            onChanged: _isSubmitting ? null : (value) => setState(() => _type = value ?? _type),
          ),
          const SizedBox(height: 16),
          InkWell(
            onTap: _isSubmitting ? null : _pickDate,
            child: InputDecorator(
              decoration: const InputDecoration(labelText: 'Date'),
              child: Text(DateFormat('MMM d, yyyy').format(_startDate)),
            ),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _reminderDaysController,
            enabled: !_isSubmitting,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(labelText: 'Remind me (days before)'),
          ),
          CheckboxListTile(
            value: _recurYearly,
            onChanged: _isSubmitting ? null : (value) => setState(() => _recurYearly = value ?? false),
            title: const Text('Repeats yearly'),
            contentPadding: EdgeInsets.zero,
            controlAffinity: ListTileControlAffinity.leading,
          ),
          if (_submitError != null) ...[
            const SizedBox(height: 8),
            Text(_submitError!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _isSubmitting ? null : () => Navigator.pop(context, false),
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  child: _isSubmitting
                      ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Save'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AppleCalendarSheet extends StatefulWidget {
  const _AppleCalendarSheet({required this.service});

  final FirebaseFunctionsService service;

  @override
  State<_AppleCalendarSheet> createState() => _AppleCalendarSheetState();
}

class _AppleCalendarSheetState extends State<_AppleCalendarSheet> {
  final _urlController = TextEditingController();
  final _displayNameController = TextEditingController(text: 'Apple Calendar');
  bool _isSubmitting = false;
  String? _submitError;

  @override
  void dispose() {
    _urlController.dispose();
    _displayNameController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    final subscriptionUrl = _urlController.text.trim();
    if (subscriptionUrl.isEmpty) {
      setState(() => _submitError = 'Enter a subscription URL.');
      return;
    }

    setState(() {
      _isSubmitting = true;
      _submitError = null;
    });

    try {
      await widget.service.connectCalendar({
        'provider': 'apple',
        'subscriptionUrl': subscriptionUrl,
        'displayName': _displayNameController.text.trim(),
      });
      if (!mounted) return;
      Navigator.pop(context, true);
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitError = 'Failed to connect Apple Calendar.';
        _isSubmitting = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: EdgeInsets.only(
        left: 16,
        right: 16,
        top: 16,
        bottom: MediaQuery.of(context).viewInsets.bottom + 16,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Connect Apple Calendar', style: Theme.of(context).textTheme.titleLarge),
          const SizedBox(height: 8),
          const Text(
            'Apple Calendar syncs read-only via a public subscription URL. In the Calendar app '
            'on iCloud.com, share your calendar publicly and paste its link below.',
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _urlController,
            enabled: !_isSubmitting,
            decoration: const InputDecoration(labelText: 'Subscription URL'),
          ),
          const SizedBox(height: 16),
          TextField(
            controller: _displayNameController,
            enabled: !_isSubmitting,
            decoration: const InputDecoration(labelText: 'Display name'),
          ),
          if (_submitError != null) ...[
            const SizedBox(height: 8),
            Text(_submitError!, style: const TextStyle(color: Colors.red)),
          ],
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: OutlinedButton(
                  onPressed: _isSubmitting ? null : () => Navigator.pop(context, false),
                  child: const Text('Cancel'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton(
                  onPressed: _isSubmitting ? null : _submit,
                  child: _isSubmitting
                      ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                      : const Text('Connect'),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
