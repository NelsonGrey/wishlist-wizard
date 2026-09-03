import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:provider/provider.dart';

import '../providers/providers.dart';
import '../services/avatar_upload_service.dart';
import '../services/firebase_functions_service.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_scaffold.dart';

/// Edit the rich user profile the website exposes: display name, bio,
/// location, interests, favourite stores, gift sizes/categories, and avatar.
/// Backed by GET/PATCH /api/profile (+ Firebase Storage for the photo).
class EditProfileScreen extends StatefulWidget {
  const EditProfileScreen({
    super.key,
    FirebaseFunctionsService? functionsService,
    AvatarUploadService? avatarUploadService,
  }) : _functionsService = functionsService,
       _avatarUploadService = avatarUploadService;

  final FirebaseFunctionsService? _functionsService;
  final AvatarUploadService? _avatarUploadService;

  @override
  State<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends State<EditProfileScreen> {
  late final FirebaseFunctionsService _service =
      widget._functionsService ?? FirebaseFunctionsService();
  late final AvatarUploadService _avatars =
      widget._avatarUploadService ?? AvatarUploadService();

  final _displayName = TextEditingController();
  final _bio = TextEditingController();
  final _location = TextEditingController();
  final _clothingSize = TextEditingController();
  final _shoeSize = TextEditingController();

  List<String> _interests = [];
  List<String> _stores = [];
  List<String> _categories = [];
  String? _photoUrl;

  bool _loading = true;
  bool _saving = false;
  bool _uploadingAvatar = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _displayName.dispose();
    _bio.dispose();
    _location.dispose();
    _clothingSize.dispose();
    _shoeSize.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final p = await _service.getMyProfile();
      final gifts = (p['giftPreferences'] as Map?) ?? const {};
      final sizes = (gifts['sizes'] as Map?) ?? const {};
      setState(() {
        _displayName.text = (p['displayName'] ?? '').toString();
        _bio.text = (p['bio'] ?? '').toString();
        _location.text = (p['location'] ?? '').toString();
        _interests = _stringList(p['interests']);
        _stores = _stringList(p['favoriteStores']);
        _categories = _stringList(gifts['categories']);
        _clothingSize.text = (sizes['clothing'] ?? '').toString();
        _shoeSize.text = (sizes['shoes'] ?? '').toString();
        _photoUrl = (p['photoURL'] as String?)?.trim().isEmpty ?? true
            ? null
            : p['photoURL'] as String;
        _loading = false;
      });
    } catch (_) {
      setState(() {
        _error = 'Could not load your profile.';
        _loading = false;
      });
    }
  }

  List<String> _stringList(dynamic v) => v is List
      ? v.map((e) => e.toString()).where((s) => s.isNotEmpty).toList()
      : <String>[];

  Map<String, String> _sizes() {
    final m = <String, String>{};
    if (_clothingSize.text.trim().isNotEmpty) {
      m['clothing'] = _clothingSize.text.trim();
    }
    if (_shoeSize.text.trim().isNotEmpty) m['shoes'] = _shoeSize.text.trim();
    return m;
  }

  Future<void> _changeAvatar() async {
    final uid = context.read<AuthProvider>().user?.id;
    if (uid == null) return;

    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      builder: (ctx) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            ListTile(
              leading: const Icon(Icons.photo_camera_outlined),
              title: const Text('Take a photo'),
              onTap: () => Navigator.pop(ctx, ImageSource.camera),
            ),
            ListTile(
              leading: const Icon(Icons.photo_library_outlined),
              title: const Text('Choose from library'),
              onTap: () => Navigator.pop(ctx, ImageSource.gallery),
            ),
          ],
        ),
      ),
    );
    if (source == null) return;

    setState(() => _uploadingAvatar = true);
    try {
      final url = await _avatars.pickAndUpload(uid, source: source);
      if (url != null && mounted) setState(() => _photoUrl = url);
    } catch (_) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Could not update your photo.')),
        );
      }
    } finally {
      if (mounted) setState(() => _uploadingAvatar = false);
    }
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      await _service.updateMyProfile({
        'displayName': _displayName.text.trim(),
        'bio': _bio.text.trim(),
        'location': _location.text.trim(),
        'interests': _interests,
        'favoriteStores': _stores,
        'giftPreferences': {'sizes': _sizes(), 'categories': _categories},
        if (_photoUrl != null) 'photoURL': _photoUrl,
      });
      if (!mounted) return;
      await context.read<AuthProvider>().refreshUser();
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Profile saved.')),
      );
      Navigator.pop(context, true);
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

  @override
  Widget build(BuildContext context) {
    return AppScaffold(
      title: 'Edit Profile',
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
                  ElevatedButton(onPressed: _load, child: const Text('Retry')),
                ],
              ),
            )
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                Center(
                  child: Stack(
                    children: [
                      CircleAvatar(
                        radius: 44,
                        backgroundColor: AppColors.primary,
                        foregroundImage: _photoUrl != null
                            ? NetworkImage(_photoUrl!)
                            : null,
                        child: _uploadingAvatar
                            ? const CircularProgressIndicator(
                                color: Colors.white,
                              )
                            : (_photoUrl == null
                                  ? const Icon(
                                      Icons.person,
                                      size: 44,
                                      color: Colors.white,
                                    )
                                  : null),
                      ),
                      Positioned(
                        right: 0,
                        bottom: 0,
                        child: Material(
                          color: AppColors.emerald,
                          shape: const CircleBorder(),
                          child: InkWell(
                            customBorder: const CircleBorder(),
                            onTap: _uploadingAvatar ? null : _changeAvatar,
                            child: const Padding(
                              padding: EdgeInsets.all(6),
                              child: Icon(
                                Icons.edit,
                                size: 16,
                                color: Colors.white,
                              ),
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),
                TextField(
                  controller: _displayName,
                  decoration: const InputDecoration(labelText: 'Display name'),
                  textInputAction: TextInputAction.next,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _bio,
                  decoration: const InputDecoration(labelText: 'Bio'),
                  minLines: 2,
                  maxLines: 4,
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: _location,
                  decoration: const InputDecoration(labelText: 'Location'),
                ),
                const SizedBox(height: 20),
                _ChipListField(
                  label: 'Interests',
                  values: _interests,
                  onChanged: (v) => setState(() => _interests = v),
                ),
                const SizedBox(height: 16),
                _ChipListField(
                  label: 'Favourite stores',
                  values: _stores,
                  onChanged: (v) => setState(() => _stores = v),
                ),
                const SizedBox(height: 16),
                _ChipListField(
                  label: 'Gift categories',
                  values: _categories,
                  onChanged: (v) => setState(() => _categories = v),
                ),
                const SizedBox(height: 20),
                Text(
                  'SIZES',
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: AppColors.mutedForeground,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _clothingSize,
                        decoration: const InputDecoration(
                          labelText: 'Clothing',
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _shoeSize,
                        decoration: const InputDecoration(labelText: 'Shoes'),
                      ),
                    ),
                  ],
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

/// A labelled add/remove chip list backed by a String list.
class _ChipListField extends StatefulWidget {
  const _ChipListField({
    required this.label,
    required this.values,
    required this.onChanged,
  });

  final String label;
  final List<String> values;
  final ValueChanged<List<String>> onChanged;

  @override
  State<_ChipListField> createState() => _ChipListFieldState();
}

class _ChipListFieldState extends State<_ChipListField> {
  final _controller = TextEditingController();

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _add() {
    final v = _controller.text.trim();
    if (v.isEmpty || widget.values.contains(v)) {
      _controller.clear();
      return;
    }
    widget.onChanged([...widget.values, v]);
    _controller.clear();
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          widget.label.toUpperCase(),
          style: Theme.of(context).textTheme.labelSmall?.copyWith(
            color: AppColors.mutedForeground,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 6),
        if (widget.values.isNotEmpty)
          Wrap(
            spacing: 6,
            runSpacing: 0,
            children: [
              for (final value in widget.values)
                Chip(
                  label: Text(value),
                  onDeleted: () => widget.onChanged(
                    widget.values.where((v) => v != value).toList(),
                  ),
                ),
            ],
          ),
        TextField(
          controller: _controller,
          decoration: InputDecoration(
            hintText: 'Add ${widget.label.toLowerCase()}',
            suffixIcon: IconButton(
              icon: const Icon(Icons.add),
              onPressed: _add,
            ),
          ),
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _add(),
        ),
      ],
    );
  }
}
