import 'dart:io';

import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';
import '../services/password_policy_service.dart';
import '../theme/design_tokens.dart';
import 'forgot_password_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, PasswordPolicyService? passwordPolicyService})
      : _passwordPolicyService = passwordPolicyService;

  // Injectable for tests; defaults to a real Firebase-backed service (see
  // _LoginScreenState._passwordPolicyService below).
  final PasswordPolicyService? _passwordPolicyService;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _nameController = TextEditingController();
  bool _isLogin = true;
  bool _obscurePassword = true;

  late final PasswordPolicyService _passwordPolicyService =
      widget._passwordPolicyService ?? PasswordPolicyService();

  // Cached live policy, used for hint text and _validatePassword's quick
  // client-side check while typing. Only relevant in register mode --
  // _submit() authoritatively re-checks against the real policy regardless
  // of whether this fetch succeeded.
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
    _emailController.dispose();
    _passwordController.dispose();
    _nameController.dispose();
    super.dispose();
  }

  String? _validatePassword(String? value) {
    if (value == null || value.isEmpty) {
      return 'Please enter your password';
    }
    if (!_isLogin) {
      return _passwordPolicyService.quickCheck(value, _passwordPolicy);
    }
    return null;
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final password = _passwordController.text;
    bool success;

    if (_isLogin) {
      success = await authProvider.login(
        _emailController.text.trim(),
        password,
      );
    } else {
      // Authoritative check against the live Firebase policy -- catches
      // drift between the cached _passwordPolicy and the real policy
      // (e.g. it changed after this screen loaded, or the initial fetch
      // failed) before spending a round-trip on account creation.
      //
      // Falls back to the client-side quickCheck against the cached (or
      // default) policy if the live fetch itself throws --
      // FirebaseAuth.validatePassword always calls Google's REST API
      // directly rather than the native SDK, on every platform, which 403s
      // outright against a properly platform-restricted API key (Google
      // Cloud's own recommended security config, and what this project's
      // keys use). Letting that failure block or crash sign-up entirely
      // would mean nobody could ever create an account; this was found via
      // an integration test throwing this exact uncaught exception.
      String? failureMessage;
      try {
        final status = await _passwordPolicyService.checkPassword(password);
        if (!status.isValid) {
          failureMessage = _passwordPolicyService.describeFailure(
            status,
            _passwordPolicy,
          );
        }
      } catch (_) {
        failureMessage = _passwordPolicyService.quickCheck(
          password,
          _passwordPolicy,
        );
      }
      if (failureMessage != null) {
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(failureMessage),
              backgroundColor: Colors.red,
            ),
          );
        }
        return;
      }

      success = await authProvider.register(
        _emailController.text.trim(),
        password,
        _nameController.text.trim().isEmpty
            ? null
            : _nameController.text.trim(),
      );
    }

    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.error ?? 'Authentication failed'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _submitWithProvider(
    Future<bool> Function() signIn,
  ) async {
    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    final success = await signIn();

    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.error ?? 'Authentication failed'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    debugPrint('[LoginScreen] build');
    return Scaffold(
      backgroundColor: AppColors.background,
      body: SafeArea(
        child: LayoutBuilder(
          builder: (context, constraints) {
            return SingleChildScrollView(
              padding: const EdgeInsets.all(24.0),
              keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
              child: ConstrainedBox(
                constraints: BoxConstraints(minHeight: constraints.maxHeight),
                child: Consumer<AuthProvider>(
                  builder: (context, authProvider, child) {
                    return Form(
                      key: _formKey,
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.start,
                        crossAxisAlignment: CrossAxisAlignment.stretch,
                        children: [
                          // App Logo/Title
                          Center(
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(AppRadius.xl),
                              child: SvgPicture.asset(
                                'assets/logo.svg',
                                width: 88,
                                height: 88,
                              ),
                            ),
                          ),
                          const SizedBox(height: 24),
                          Text(
                            'Wishlist Wizard',
                            style: Theme.of(context).textTheme.headlineMedium
                                ?.copyWith(
                                  color: AppColors.emerald,
                                  fontWeight: FontWeight.bold,
                                ),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _isLogin ? 'Welcome back!' : 'Create your account',
                            style: Theme.of(context).textTheme.bodyLarge
                                ?.copyWith(color: Colors.grey[600]),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 48),

                          // Name field (only for register)
                          if (!_isLogin) ...[
                            TextFormField(
                              controller: _nameController,
                              decoration: const InputDecoration(
                                labelText: 'Name (optional)',
                                prefixIcon: Icon(Icons.person),
                              ),
                              textInputAction: TextInputAction.next,
                            ),
                            const SizedBox(height: 16),
                          ],

                          // Email field
                          TextFormField(
                            controller: _emailController,
                            decoration: const InputDecoration(
                              labelText: 'Email',
                              prefixIcon: Icon(Icons.email),
                            ),
                            keyboardType: TextInputType.emailAddress,
                            textInputAction: TextInputAction.next,
                            // Android's Autofill Framework hint -- also what
                            // Firebase Test Lab / Play Console pre-launch
                            // report Robo crawls use to auto-detect the login
                            // field, since a Flutter TextField has no native
                            // Android resource-id for Robo's "resource name"
                            // login-credential setting to target directly.
                            autofillHints: const [AutofillHints.email],
                            validator: (value) {
                              if (value == null || value.isEmpty) {
                                return 'Please enter your email';
                              }
                              if (!value.contains('@')) {
                                return 'Please enter a valid email';
                              }
                              return null;
                            },
                          ),
                          const SizedBox(height: 16),

                          // Password field
                          TextFormField(
                            controller: _passwordController,
                            decoration: InputDecoration(
                              labelText: 'Password',
                              prefixIcon: const Icon(Icons.lock),
                              // Only shown in register mode -- on login,
                              // the password's requirements are whatever
                              // they were when the account was created.
                              helperText: !_isLogin
                                  ? _passwordPolicyService.hint(
                                      _passwordPolicy,
                                    )
                                  : null,
                              helperMaxLines: 2,
                              suffixIcon: IconButton(
                                icon: Icon(
                                  _obscurePassword
                                      ? Icons.visibility
                                      : Icons.visibility_off,
                                ),
                                onPressed: () {
                                  setState(() {
                                    _obscurePassword = !_obscurePassword;
                                  });
                                },
                              ),
                            ),
                            obscureText: _obscurePassword,
                            autofillHints: const [AutofillHints.password],
                            textInputAction: TextInputAction.done,
                            onFieldSubmitted: (_) => _submit(),
                            validator: _validatePassword,
                          ),
                          const SizedBox(height: 24),

                          // Submit button
                          ElevatedButton(
                            onPressed: authProvider.isLoading ? null : _submit,
                            child: authProvider.isLoading
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      valueColor: AlwaysStoppedAnimation<Color>(
                                        Colors.white,
                                      ),
                                    ),
                                  )
                                : Text(_isLogin ? 'Sign In' : 'Sign Up'),
                          ),
                          const SizedBox(height: 16),

                          // Platform-native social sign-in (Apple on iOS, Google on Android)
                          Row(
                            children: [
                              const Expanded(child: Divider()),
                              Padding(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 12,
                                ),
                                child: Text(
                                  'or',
                                  style: Theme.of(context).textTheme.bodySmall
                                      ?.copyWith(color: Colors.grey[600]),
                                ),
                              ),
                              const Expanded(child: Divider()),
                            ],
                          ),
                          const SizedBox(height: 16),
                          if (Platform.isIOS)
                            OutlinedButton.icon(
                              onPressed: authProvider.isLoading
                                  ? null
                                  : () => _submitWithProvider(
                                      authProvider.loginWithApple,
                                    ),
                              icon: const Icon(Icons.apple),
                              label: const Text('Continue with Apple'),
                            )
                          else if (Platform.isAndroid)
                            OutlinedButton.icon(
                              onPressed: authProvider.isLoading
                                  ? null
                                  : () => _submitWithProvider(
                                      authProvider.loginWithGoogle,
                                    ),
                              icon: const Icon(Icons.g_mobiledata),
                              label: const Text('Continue with Google'),
                            ),
                          const SizedBox(height: 16),

                          // Toggle between login/register
                          TextButton(
                            onPressed: authProvider.isLoading
                                ? null
                                : () {
                                    setState(() {
                                      _isLogin = !_isLogin;
                                      authProvider.clearError();
                                    });
                                  },
                            child: Text(
                              _isLogin
                                  ? "Don't have an account? Sign up"
                                  : "Already have an account? Sign in",
                            ),
                          ),

                          // Forgot Password link (only for login)
                          if (_isLogin)
                            TextButton(
                              onPressed: authProvider.isLoading
                                  ? null
                                  : () {
                                      Navigator.push(
                                        context,
                                        MaterialPageRoute(
                                          builder: (context) =>
                                              const ForgotPasswordScreen(),
                                        ),
                                      );
                                    },
                              child: const Text('Forgot Password?'),
                            ),
                        ],
                      ),
                    );
                  },
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
