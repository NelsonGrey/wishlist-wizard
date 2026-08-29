import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter_contacts/flutter_contacts.dart';
import 'package:provider/provider.dart';
import '../providers/providers.dart';

/// Invite a collaborator by email, or by picking a contact from the
/// device's native contact picker (FlutterContacts.native.showPicker).
/// The picker UI itself (CNContactPickerViewController on iOS, ACTION_PICK
/// on Android) doesn't need contacts access to display, and fetching the
/// email property alongside it never needs a permission on iOS either --
/// only Android's ContentResolver-backed fetch does, so only Android needs
/// a runtime READ_CONTACTS grant (NSContactsUsageDescription is still
/// declared in Info.plist regardless, as iOS requires it be present even
/// though this flow never triggers its prompt). Either invite path ends up
/// calling the same invite-by-email backend route; a picked contact just
/// fills the field.
class InviteCollaboratorDialog extends StatefulWidget {
  final String wishlistId;

  const InviteCollaboratorDialog({super.key, required this.wishlistId});

  @override
  State<InviteCollaboratorDialog> createState() =>
      _InviteCollaboratorDialogState();
}

class _InviteCollaboratorDialogState extends State<InviteCollaboratorDialog> {
  final _emailController = TextEditingController();
  String _role = 'editor';
  bool _isSending = false;
  String? _pickedContactName;

  @override
  void dispose() {
    _emailController.dispose();
    super.dispose();
  }

  Future<void> _pickFromContacts() async {
    try {
      // native.showPicker's own doc: "permissionless on both platforms" for
      // the picker itself, but fetching the email property on Android needs
      // READ_CONTACTS granted first (throws a PlatformException otherwise)
      // -- iOS never needs it. Request only where it's actually required so
      // iOS users aren't prompted for nothing.
      if (defaultTargetPlatform == TargetPlatform.android) {
        final status = await FlutterContacts.permissions.request(
          PermissionType.read,
        );
        if (status != PermissionStatus.granted &&
            status != PermissionStatus.limited) {
          if (!mounted) return;
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(content: Text('Contacts permission was not granted.')),
          );
          return;
        }
      }

      // Opens the OS's own contact-picker UI, asking it to also include the
      // email property (id/displayName are always included regardless).
      final contact = await FlutterContacts.native.showPicker(
        properties: {ContactProperty.email},
      );
      if (contact == null || !mounted) return;

      if (contact.emails.isEmpty) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('That contact has no email address on file.'),
          ),
        );
        return;
      }

      final displayName = contact.displayName ?? '';
      setState(() {
        _emailController.text = contact.emails.first.address;
        _pickedContactName =
            displayName.isNotEmpty ? displayName : 'Selected contact';
      });
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Could not open contacts: $e')),
      );
    }
  }

  Future<void> _sendInvite() async {
    final email = _emailController.text.trim();
    if (email.isEmpty || !email.contains('@')) return;

    setState(() => _isSending = true);
    final wishlistProvider = Provider.of<FirebaseWishlistProvider>(
      context,
      listen: false,
    );
    final success = await wishlistProvider.inviteCollaborator(
      widget.wishlistId,
      email,
      _role,
    );
    if (!mounted) return;
    Navigator.pop(context);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          success ? 'Invitation sent to $email' : 'Failed to send invitation',
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return AlertDialog(
      title: const Text('Invite Collaborator'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          OutlinedButton.icon(
            onPressed: _isSending ? null : _pickFromContacts,
            icon: const Icon(Icons.contacts),
            label: const Text('Pick from Contacts'),
          ),
          if (_pickedContactName != null) ...[
            const SizedBox(height: 4),
            Text(
              'Selected: $_pickedContactName',
              style: Theme.of(context).textTheme.bodySmall,
              textAlign: TextAlign.center,
            ),
          ],
          const SizedBox(height: 16),
          Text(
            'Or enter an email directly',
            style: Theme.of(context).textTheme.bodySmall,
          ),
          const SizedBox(height: 4),
          TextField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            enabled: !_isSending,
            decoration: const InputDecoration(
              labelText: 'Email',
              hintText: 'name@example.com',
            ),
          ),
          const SizedBox(height: 16),
          DropdownButtonFormField<String>(
            initialValue: _role,
            decoration: const InputDecoration(labelText: 'Role'),
            items: const [
              DropdownMenuItem(
                value: 'editor',
                child: Text('Editor — can add/edit/remove items'),
              ),
              DropdownMenuItem(
                value: 'commenter',
                child: Text('Commenter — can reserve/purchase items'),
              ),
              DropdownMenuItem(
                value: 'viewer',
                child: Text('Viewer — can only view'),
              ),
            ],
            onChanged: _isSending
                ? null
                : (value) {
                    if (value != null) setState(() => _role = value);
                  },
          ),
        ],
      ),
      actions: [
        TextButton(
          onPressed: _isSending ? null : () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        ElevatedButton(
          onPressed: _isSending ? null : _sendInvite,
          child: _isSending
              ? const SizedBox(
                  height: 16,
                  width: 16,
                  child: CircularProgressIndicator(strokeWidth: 2),
                )
              : const Text('Send Invite'),
        ),
      ],
    );
  }
}
