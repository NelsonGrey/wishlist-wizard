import 'dart:convert';
import 'dart:io';

import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:provider/provider.dart';
import 'package:share_plus/share_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../providers/auth_provider.dart';
import '../services/firebase_functions_service.dart';
import '../services/password_policy_service.dart';

const _supportEmail = 'support@wishlist-wizard.com';

/// Account & security settings, reached from the Profile tab: change
/// password, plus data export, "log out everywhere", and a support link.
class AccountScreen extends StatefulWidget {
  const AccountScreen({
    super.key,
    PasswordPolicyService? passwordPolicyService,
    FirebaseFunctionsService? functionsService,
  }) : _passwordPolicyService = passwordPolicyService,
       _functionsService = functionsService;

  // Injectable for tests; default to real Firebase-backed services (see
  // the `late final` fields in _AccountScreenState below).
  final PasswordPolicyService? _passwordPolicyService;
  final FirebaseFunctionsService? _functionsService;

  @override
  State<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends State<AccountScreen> {
  final _formKey = GlobalKey<FormState>();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;
  bool _isSubmitting = false;

  late final PasswordPolicyService _passwordPolicyService =
      widget._passwordPolicyService ?? PasswordPolicyService();
  late final FirebaseFunctionsService _functionsService =
      widget._functionsService ?? FirebaseFunctionsService();

  /// Which secondary action ('export' | 'revoke') is running, if any.
  String? _busyAction;

  // Cached live policy, used for hint text and the new-password field's
  // quick client-side check while typing. _changePassword() authoritatively
  // re-checks against the real policy regardless of whether this fetch
  // succeeded.
  PasswordPolicyState _passwordPolicy = PasswordPolicyState.defaultPolicy;

  @override
  void initState() {
    super.initState();
    _loadPasswordPolicy();
  }

  Future<void> _loadPasswordPolicy() async {
    final policy = await _passwordPolicyService.loadPolicy();
    if (!mounted) return;
    setState(() => _passwordPolicy = policy);
  }

  @override
  void dispose() {
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  Future<void> _changePassword() async {
    if (_isSubmitting) return;
    if (!_formKey.currentState!.validate()) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    setState(() => _isSubmitting = true);

    try {
      // Firebase requires a "recent" sign-in before a sensitive operation
      // like changing the password -- reauthenticate first with the
      // current password the user just typed.
      final reauthed = await authProvider.reauthenticate(
        _currentPasswordController.text,
      );
      if (!reauthed) {
        if (mounted) {
          _showError(authProvider.error ?? 'Current password is incorrect.');
        }
        return;
      }

      // Authoritative check against the live Firebase policy -- catches
      // drift between the cached _passwordPolicy and the real policy (e.g.
      // it changed after this screen loaded, or the initial fetch failed)
      // before spending a round-trip on the actual password update.
      //
      // Falls back to the client-side quickCheck against the cached (or
      // default) policy if the live fetch itself throws -- same fix as
      // login_screen.dart's sign-up flow: FirebaseAuth.validatePassword
      // always calls Google's REST API directly rather than the native
      // SDK, on every platform, which 403s outright against a properly
      // platform-restricted API key (Google Cloud's own recommended
      // security config, and what this project's keys use). Letting that
      // failure block the entire operation with zero feedback would mean
      // nobody could ever change their password -- this sibling call site
      // just never got the same fix.
      final newPassword = _newPasswordController.text;
      String? failureMessage;
      try {
        final status = await _passwordPolicyService.checkPassword(newPassword);
        if (!status.isValid) {
          failureMessage = _passwordPolicyService.describeFailure(status, _passwordPolicy);
        }
      } catch (_) {
        failureMessage = _passwordPolicyService.quickCheck(newPassword, _passwordPolicy);
      }
      if (failureMessage != null) {
        if (mounted) _showError(failureMessage);
        return;
      }

      final updated = await authProvider.changePassword(newPassword);
      if (!mounted) return;

      if (updated) {
        _currentPasswordController.clear();
        _newPasswordController.clear();
        _confirmPasswordController.clear();
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Password updated.'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        _showError(authProvider.error ?? 'Failed to update password.');
      }
    } catch (_) {
      if (mounted) {
        _showError('Something went wrong. Please try again.');
      }
    } finally {
      if (mounted) {
        setState(() => _isSubmitting = false);
      }
    }
  }

  void _showError(String message) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message), backgroundColor: Colors.red),
    );
  }

  void _showInfo(String message) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  Future<void> _downloadMyData() async {
    if (_busyAction != null) return;
    setState(() => _busyAction = 'export');
    try {
      final data = await _functionsService.exportMyData();
      final dir = await getTemporaryDirectory();
      final file = File('${dir.path}/wishlist-wizard-data.json');
      await file.writeAsString(
        const JsonEncoder.withIndent('  ').convert(data),
      );
      await SharePlus.instance.share(
        ShareParams(
          files: [XFile(file.path, mimeType: 'application/json')],
          subject: 'My Wishlist Wizard data',
        ),
      );
    } catch (_) {
      if (mounted) _showError('Could not prepare your data export.');
    } finally {
      if (mounted) setState(() => _busyAction = null);
    }
  }

  Future<void> _logOutEverywhere() async {
    if (_busyAction != null) return;
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Log out of all devices?'),
        content: const Text(
          'This signs you out everywhere, including this device. '
          'You will need to sign in again.',
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Log out everywhere'),
          ),
        ],
      ),
    );
    if (confirmed != true || !mounted) return;

    setState(() => _busyAction = 'revoke');
    try {
      await _functionsService.revokeAllSessions();
      if (!mounted) return;
      await Provider.of<AuthProvider>(context, listen: false).logout();
    } catch (_) {
      if (mounted) {
        _showError('Could not log out of all devices. Please try again.');
        setState(() => _busyAction = null);
      }
    }
  }

  Future<void> _contactSupport() async {
    final uri = Uri(
      scheme: 'mailto',
      path: _supportEmail,
      query: 'subject=${Uri.encodeComponent('[Wishlist Wizard] Support request')}',
    );
    if (!await launchUrl(uri)) {
      if (mounted) _showInfo('Email us at $_supportEmail');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Account & Security')),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24.0),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(
                  'Change Password',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                Text(
                  'Enter your current password, then choose a new one.',
                  style: Theme.of(
                    context,
                  ).textTheme.bodyMedium?.copyWith(color: Colors.grey[600]),
                ),
                const SizedBox(height: 24),
                TextFormField(
                  controller: _currentPasswordController,
                  decoration: InputDecoration(
                    labelText: 'Current password',
                    prefixIcon: const Icon(Icons.lock_outline),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscureCurrent
                            ? Icons.visibility
                            : Icons.visibility_off,
                      ),
                      onPressed: () =>
                          setState(() => _obscureCurrent = !_obscureCurrent),
                    ),
                  ),
                  obscureText: _obscureCurrent,
                  autofillHints: const [AutofillHints.password],
                  textInputAction: TextInputAction.next,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter your current password';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _newPasswordController,
                  decoration: InputDecoration(
                    labelText: 'New password',
                    prefixIcon: const Icon(Icons.lock),
                    helperText: _passwordPolicyService.hint(_passwordPolicy),
                    helperMaxLines: 2,
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscureNew ? Icons.visibility : Icons.visibility_off,
                      ),
                      onPressed: () =>
                          setState(() => _obscureNew = !_obscureNew),
                    ),
                  ),
                  obscureText: _obscureNew,
                  autofillHints: const [AutofillHints.newPassword],
                  textInputAction: TextInputAction.next,
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please enter a new password';
                    }
                    return _passwordPolicyService.quickCheck(
                      value,
                      _passwordPolicy,
                    );
                  },
                ),
                const SizedBox(height: 16),
                TextFormField(
                  controller: _confirmPasswordController,
                  decoration: InputDecoration(
                    labelText: 'Confirm new password',
                    prefixIcon: const Icon(Icons.lock),
                    suffixIcon: IconButton(
                      icon: Icon(
                        _obscureConfirm
                            ? Icons.visibility
                            : Icons.visibility_off,
                      ),
                      onPressed: () => setState(
                        () => _obscureConfirm = !_obscureConfirm,
                      ),
                    ),
                  ),
                  obscureText: _obscureConfirm,
                  autofillHints: const [AutofillHints.newPassword],
                  textInputAction: TextInputAction.done,
                  onFieldSubmitted: (_) => _changePassword(),
                  validator: (value) {
                    if (value == null || value.isEmpty) {
                      return 'Please confirm your new password';
                    }
                    if (value != _newPasswordController.text) {
                      return 'Passwords do not match';
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 24),
                ElevatedButton(
                  onPressed: _isSubmitting ? null : _changePassword,
                  child: _isSubmitting
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Text('Update Password'),
                ),
                const SizedBox(height: 32),
                const Divider(),
                const SizedBox(height: 16),
                Text(
                  'Data & Privacy',
                  style: Theme.of(context).textTheme.titleLarge,
                ),
                const SizedBox(height: 8),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.download_outlined),
                  title: const Text('Download my data'),
                  subtitle: const Text(
                    'Export everything on your account as a file',
                  ),
                  trailing: _busyAction == 'export'
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.chevron_right),
                  onTap: _busyAction == null ? _downloadMyData : null,
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.logout),
                  title: const Text('Log out of all devices'),
                  subtitle: const Text(
                    'Ends every active session, including this one',
                  ),
                  trailing: _busyAction == 'revoke'
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.chevron_right),
                  onTap: _busyAction == null ? _logOutEverywhere : null,
                ),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.support_agent_outlined),
                  title: const Text('Contact Support'),
                  subtitle: const Text('Email the Wishlist Wizard team'),
                  trailing: const Icon(Icons.open_in_new),
                  onTap: _contactSupport,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
