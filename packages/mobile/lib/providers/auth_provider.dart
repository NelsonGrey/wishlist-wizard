import 'package:flutter/foundation.dart';
import '../models/models.dart';
import '../services/firebase_auth_service.dart';
import '../services/firebase_functions_service.dart';

class AuthProvider extends ChangeNotifier {
  final FirebaseAuthService _authService;
  final FirebaseFunctionsService _functionsService;

  // Injectable (defaulting to the real singletons) so tests can substitute
  // mocks instead of needing a live Firebase connection -- mirrors
  // FirebaseWishlistProvider's constructor-level DI. functionsService in
  // particular must be injectable: without it, tests that trigger a real
  // auth-state change have no way to suppress the real ensureProfile()
  // network call below, which leaves a pending timer after the widget tree
  // is disposed and fails the test framework's invariant checks.
  AuthProvider({
    FirebaseAuthService? authService,
    FirebaseFunctionsService? functionsService,
  }) : _authService = authService ?? FirebaseAuthService(),
       _functionsService = functionsService ?? FirebaseFunctionsService() {
    _initializeAuth();
  }

  User? _user;
  bool _isLoading = false;
  String? _error;

  User? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isLoggedIn => _user != null;

  Future<void> _initializeAuth() async {
    _setLoading(true);
    if (kDebugMode) {
      debugPrint('[AuthProvider] Starting auth initialization');
    }
    try {
      // Listen to auth state changes
      _authService.authStateChanges.listen((user) {
        if (kDebugMode) {
          debugPrint(
            '[AuthProvider] Auth state changed: ${user == null ? 'signed out' : 'signed in'}',
          );
        }
        _setUser(user);
        if (user != null) {
          // Idempotent — no-ops if a users/{uid} profile doc already
          // exists. Single hook point covering every sign-in path (email,
          // Google, Apple; new account or returning session), mirroring
          // web's AuthContext.ensureProfileExists.
          _functionsService.ensureProfile();
        }
        if (!_isLoading) {
          _setLoading(false);
        }
      });

      // Get initial auth state
      final user = await _authService.getCurrentUser();
      if (kDebugMode) {
        debugPrint(
          '[AuthProvider] Initial auth state resolved: ${user == null ? 'signed out' : 'signed in'}',
        );
      }
      _setUser(user);
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[AuthProvider] Auth initialization error: $e');
      }
      _setError('Failed to check authentication status');
    } finally {
      _setLoading(false);
      if (kDebugMode) {
        debugPrint('[AuthProvider] Auth initialization complete');
      }
    }
  }

  Future<bool> login(String email, String password) async {
    _setLoading(true);
    _clearError();

    try {
      final result = await _authService.login(email, password);

      if (result.isSuccess) {
        _setUser(result.user);
        return true;
      } else {
        _setError(result.error ?? 'Login failed');
        return false;
      }
    } catch (e) {
      _setError('An unexpected error occurred');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> loginWithGoogle() async {
    _setLoading(true);
    _clearError();

    try {
      final result = await _authService.loginWithGoogle();

      if (result.isSuccess) {
        _setUser(result.user);
        return true;
      } else {
        _setError(result.error ?? 'Google sign-in failed');
        return false;
      }
    } catch (e) {
      _setError('An unexpected error occurred');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> loginWithApple() async {
    _setLoading(true);
    _clearError();

    try {
      final result = await _authService.loginWithApple();

      if (result.isSuccess) {
        _setUser(result.user);
        return true;
      } else {
        _setError(result.error ?? 'Apple sign-in failed');
        return false;
      }
    } catch (e) {
      _setError('An unexpected error occurred');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> register(String email, String password, String? name) async {
    _setLoading(true);
    _clearError();

    try {
      final result = await _authService.register(email, password, name);

      if (result.isSuccess) {
        _setUser(result.user);
        return true;
      } else {
        _setError(result.error ?? 'Registration failed');
        return false;
      }
    } catch (e) {
      _setError('An unexpected error occurred');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> logout() async {
    _setLoading(true);
    try {
      await _authService.logout();
      _setUser(null);
    } catch (e) {
      // Even if server logout fails, clear local user
      _setUser(null);
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> resetPassword(String email) async {
    _setLoading(true);
    _clearError();

    try {
      final result = await _authService.resetPassword(email);

      if (result.isSuccess) {
        return true;
      } else {
        _setError(result.error ?? 'Password reset failed');
        return false;
      }
    } catch (e) {
      _setError('An unexpected error occurred');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> reauthenticate(String currentPassword) async {
    _setLoading(true);
    _clearError();

    try {
      final result = await _authService.reauthenticateWithPassword(
        currentPassword,
      );

      if (result.isSuccess) {
        _setUser(result.user);
        return true;
      } else {
        _setError(result.error ?? 'Reauthentication failed');
        return false;
      }
    } catch (e) {
      _setError('An unexpected error occurred');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> changePassword(String newPassword) async {
    _setLoading(true);
    _clearError();

    try {
      final result = await _authService.updatePassword(newPassword);

      if (result.isSuccess) {
        _setUser(result.user);
        return true;
      } else {
        _setError(result.error ?? 'Failed to update password');
        return false;
      }
    } catch (e) {
      _setError('An unexpected error occurred');
      return false;
    } finally {
      _setLoading(false);
    }
  }

  void _setUser(User? user) {
    _user = user;
    notifyListeners();
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String? error) {
    _error = error;
    notifyListeners();
  }

  void _clearError() {
    _error = null;
    notifyListeners();
  }

  void clearError() {
    _clearError();
  }
}
