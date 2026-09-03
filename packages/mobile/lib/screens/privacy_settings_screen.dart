import 'package:flutter/material.dart';

import '../services/firebase_functions_service.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_scaffold.dart';

/// Account-wide privacy defaults, applied to newly created wishlists and
/// items. Backed by GET/PUT /api/privacy/defaults. The web also supports a
/// 'custom' per-list access list; that has no mobile UI, so an account
/// already set to 'custom' is shown but the picker only offers the three
/// simple options.
class PrivacySettingsScreen extends StatefulWidget {
  const PrivacySettingsScreen({super.key, FirebaseFunctionsService? functionsService})
      : _functionsService = functionsService;

  final FirebaseFunctionsService? _functionsService;

  @override
  State<PrivacySettingsScreen> createState() => _PrivacySettingsScreenState();
}

const _visibilityOptions = <String, String>{
  'public': 'Public — anyone with the link',
  'friends': 'Friends only — people you\'ve connected with',
  'private': 'Private — only you',
};

class _PrivacySettingsScreenState extends State<PrivacySettingsScreen> {
  late final FirebaseFunctionsService _service =
      widget._functionsService ?? FirebaseFunctionsService();

  bool _loading = true;
  bool _saving = false;
  String? _error;

  String _wishlistVisibility = 'private';
  String _itemVisibility = 'private';
  bool _allowComments = true;
  bool _allowReservations = true;
  bool _requireApproval = false;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final d = await _service.getPrivacyDefaults();
      setState(() {
        _wishlistVisibility =
            (d['defaultWishlistVisibility'] ?? 'private').toString();
        _itemVisibility = (d['defaultItemVisibility'] ?? 'private').toString();
        _allowComments = d['allowComments'] as bool? ?? true;
        _allowReservations = d['allowReservations'] as bool? ?? true;
        _requireApproval = d['requireApproval'] as bool? ?? false;
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _error = 'Could not load your privacy settings.';
        _loading = false;
      });
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await _service.updatePrivacyDefaults({
        'defaultWishlistVisibility': _wishlistVisibility,
        'defaultItemVisibility': _itemVisibility,
        'allowComments': _allowComments,
        'allowReservations': _allowReservations,
        'requireApproval': _requireApproval,
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Privacy settings saved.')),
      );
    } catch (_) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text('Could not save. Please try again.'),
          backgroundColor: Theme.of(context).colorScheme.error,
        ),
      );
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _visibilityGroup(
    String label,
    String value,
    ValueChanged<String> onChanged,
  ) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.only(left: 4, top: 8, bottom: 4),
          child: Text(
            label.toUpperCase(),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: AppColors.mutedForeground,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
            ),
          ),
        ),
        RadioGroup<String>(
          groupValue: value,
          onChanged: (v) => v == null ? null : onChanged(v),
          child: Column(
            children: [
              for (final entry in _visibilityOptions.entries)
                RadioListTile<String>(
                  contentPadding: EdgeInsets.zero,
                  title: Text(entry.value),
                  value: entry.key,
                ),
              if (!_visibilityOptions.containsKey(value))
                RadioListTile<String>(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Custom (set on the web)'),
                  value: value,
                  enabled: false,
                ),
            ],
          ),
        ),
      ],
    );
  }

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Privacy',
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
          ? Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(_error!),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: _load,
                    child: const Text('Retry'),
                  ),
                ],
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Text(
                  'These defaults apply to wishlists and items you create '
                  'from now on. You can still change each one individually.',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppColors.mutedForeground,
                  ),
                ),
                const SizedBox(height: 12),
                _visibilityGroup(
                  'New wishlist visibility',
                  _wishlistVisibility,
                  (v) => setState(() => _wishlistVisibility = v),
                ),
                const SizedBox(height: 8),
                _visibilityGroup(
                  'New item visibility',
                  _itemVisibility,
                  (v) => setState(() => _itemVisibility = v),
                ),
                const Divider(height: 32),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Allow comments'),
                  subtitle: const Text('Let viewers comment on your items'),
                  value: _allowComments,
                  onChanged: (v) => setState(() => _allowComments = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Allow reservations'),
                  subtitle: const Text(
                    'Let others reserve items so gifts aren\'t duplicated',
                  ),
                  value: _allowReservations,
                  onChanged: (v) => setState(() => _allowReservations = v),
                ),
                SwitchListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Require approval to view'),
                  subtitle: const Text(
                    'People must ask before they can see a shared list',
                  ),
                  value: _requireApproval,
                  onChanged: (v) => setState(() => _requireApproval = v),
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _saving ? null : _save,
                  child: _saving
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Save'),
                ),
              ],
            ),
    );
  }
}
