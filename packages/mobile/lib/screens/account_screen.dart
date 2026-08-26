import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../providers/auth_provider.dart';
import '../services/password_policy_service.dart';

/// Account & security settings, reached from the Profile tab. Currently
/// just a change-password form; a natural home for future account-security
/// features (e.g. MFA) since it already carries the reauthentication flow
/// those would also need.
class AccountScreen extends StatefulWidget {
  const AccountScreen({
    super.key,
    PasswordPolicyService? passwordPolicyService,
  }) : _passwordPolicyService = passwordPolicyService;

  // Injectable for tests; defaults to a real Firebase-backed service (see
  // _AccountScreenState._passwordPolicyService below).
  final PasswordPolicyService? _passwordPolicyService;

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
      final newPassword = _newPasswordController.text;
      final status = await _passwordPolicyService.checkPassword(newPassword);
      if (!status.isValid) {
        if (mounted) {
          _showError(
            _passwordPolicyService.describeFailure(status, _passwordPolicy),
          );
        }
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
              ],
            ),
          ),
        ),
      ),
    );
  }
}
