import 'package:flutter/material.dart';
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

DateTime? _parseDate(dynamic value) {
  if (value == null) return null;
  return DateTime.tryParse(value.toString());
}

/// Personal calendar events -- mirrors web's Calendar.tsx "My Calendar" tab
/// as a flat grouped list rather than a month grid (external-provider
/// "Connections" sync is a paid web-only feature, not ported here).
/// Reached from the Profile tab.
class CalendarScreen extends StatefulWidget {
  const CalendarScreen({super.key, FirebaseFunctionsService? functionsService})
      : _functionsService = functionsService;

  final FirebaseFunctionsService? _functionsService;

  @override
  State<CalendarScreen> createState() => _CalendarScreenState();
}

class _CalendarScreenState extends State<CalendarScreen> {
  late final FirebaseFunctionsService _service =
      widget._functionsService ?? FirebaseFunctionsService();

  bool _isLoading = true;
  String? _error;
  List<Map<String, dynamic>> _events = [];
  String? _busyEventId;

  @override
  void initState() {
    super.initState();
    _loadEvents();
  }

  Future<void> _loadEvents() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });
    try {
      final events = await _service.getCalendarEvents();
      if (!mounted) return;
      setState(() {
        _events = events;
        _isLoading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = 'Failed to load calendar events.';
        _isLoading = false;
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

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Calendar')),
      floatingActionButton: FloatingActionButton(
        onPressed: _openCreateSheet,
        tooltip: 'Add calendar event',
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        onRefresh: _loadEvents,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      const SizedBox(height: 80),
                      Center(child: Text(_error!, style: const TextStyle(color: Colors.red))),
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
      ),
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
