import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/firebase_auth_service.dart';

class AuthProvider extends ChangeNotifier {
  final FirebaseAuthService _authService = FirebaseAuthService();

  User? _user;
  bool _isLoading = false;
  String? _error;

  User? get user => _user;
  bool get isLoading => _isLoading;
  String? get error => _error;
  bool get isLoggedIn => _user != null;

  AuthProvider() {
    _initializeAuth();
  }

  Future<void> _initializeAuth() async {
    _setLoading(true);
    try {
      // Listen to auth state changes
      _authService.authStateChanges.listen((user) {
        _setUser(user);
        if (!_isLoading) {
          _setLoading(false);
        }
      });

      // Get initial auth state
      final user = await _authService.getCurrentUser();
      _setUser(user);
    } catch (e) {
      _setError('Failed to check authentication status');
    } finally {
      _setLoading(false);
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
