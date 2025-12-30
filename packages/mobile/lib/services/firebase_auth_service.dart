// ignore_for_file: avoid_print

import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import '../models/models.dart';
import 'firebase_initialization_service.dart';

class FirebaseAuthService {
  static final FirebaseAuthService _instance = FirebaseAuthService._internal();
  factory FirebaseAuthService() => _instance;
  FirebaseAuthService._internal();

  final FirebaseInitializationService _firebaseInit =
      FirebaseInitializationService();
  firebase_auth.FirebaseAuth? _firebaseAuth;

  firebase_auth.FirebaseAuth get _auth {
    if (_firebaseAuth == null) {
      throw Exception(
        'Firebase not initialized. Call _ensureFirebaseInitialized() first.',
      );
    }
    return _firebaseAuth!;
  }

  Future<bool> _ensureFirebaseInitialized() async {
    if (_firebaseAuth != null) return true;

    final initialized = await _firebaseInit.initialize();
    if (initialized) {
      try {
        _firebaseAuth = firebase_auth.FirebaseAuth.instance;
        return true;
      } catch (e) {
        print('Error accessing FirebaseAuth: $e');
        return false;
      }
    }
    return false;
  }

  Future<AuthResult> login(String email, String password) async {
    if (!await _ensureFirebaseInitialized()) {
      return AuthResult.failure(
        error: 'Firebase not available. Please check your connection.',
      );
    }

    try {
      final credential = await _auth.signInWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );

      if (credential.user != null) {
        final user = _firebaseUserToUser(credential.user!);
        return AuthResult.success(user: user);
      } else {
        return AuthResult.failure(error: 'Login failed');
      }
    } on firebase_auth.FirebaseAuthException catch (e) {
      String errorMessage = _getErrorMessage(e.code);
      return AuthResult.failure(error: errorMessage);
    } catch (e) {
      return AuthResult.failure(error: 'An unexpected error occurred: $e');
    }
  }

  Future<AuthResult> register(
    String email,
    String password,
    String? name,
  ) async {
    if (!await _ensureFirebaseInitialized()) {
      return AuthResult.failure(
        error: 'Firebase not available. Please check your connection.',
      );
    }

    try {
      final credential = await _auth.createUserWithEmailAndPassword(
        email: email.trim(),
        password: password,
      );

      if (credential.user != null) {
        // Update the display name if provided
        if (name != null && name.trim().isNotEmpty) {
          await credential.user!.updateDisplayName(name.trim());
          await credential.user!.reload();
        }

        final user = _firebaseUserToUser(credential.user!);
        return AuthResult.success(user: user);
      } else {
        return AuthResult.failure(error: 'Registration failed');
      }
    } on firebase_auth.FirebaseAuthException catch (e) {
      String errorMessage = _getErrorMessage(e.code);
      return AuthResult.failure(error: errorMessage);
    } catch (e) {
      return AuthResult.failure(error: 'An unexpected error occurred: $e');
    }
  }

  Future<User?> getCurrentUser() async {
    if (!await _ensureFirebaseInitialized()) {
      return null;
    }

    try {
      final firebaseUser = _auth.currentUser;
      if (firebaseUser != null) {
        return _firebaseUserToUser(firebaseUser);
      }
      return null;
    } catch (e) {
      print('Error getting current user: $e');
      return null;
    }
  }

  Future<void> logout() async {
    if (!await _ensureFirebaseInitialized()) {
      return;
    }

    try {
      await _auth.signOut();
    } catch (e) {
      // Handle logout error if needed
      print('Logout error: $e');
    }
  }

  Future<bool> isLoggedIn() async {
    if (!await _ensureFirebaseInitialized()) {
      return false;
    }

    try {
      return _auth.currentUser != null;
    } catch (e) {
      print('Error checking login status: $e');
      return false;
    }
  }

  // Stream to listen to auth state changes
  Stream<User?> get authStateChanges {
    return Stream.fromFuture(_ensureFirebaseInitialized()).asyncExpand((
      initialized,
    ) {
      if (initialized) {
        return _auth.authStateChanges().map((firebaseUser) {
          return firebaseUser != null
              ? _firebaseUserToUser(firebaseUser)
              : null;
        });
      } else {
        return Stream.value(null);
      }
    });
  }

  // Convert Firebase User to our User model
  User _firebaseUserToUser(firebase_auth.User firebaseUser) {
    return User(
      id: firebaseUser.uid,
      email: firebaseUser.email ?? '',
      name:
          firebaseUser.displayName ??
          firebaseUser.email?.split('@')[0] ??
          'User',
      profileImageUrl: firebaseUser.photoURL,
      createdAt: firebaseUser.metadata.creationTime ?? DateTime.now(),
    );
  }

  // Convert Firebase Auth error codes to user-friendly messages
  String _getErrorMessage(String errorCode) {
    switch (errorCode) {
      case 'user-not-found':
        return 'No user found with this email address.';
      case 'wrong-password':
        return 'Incorrect password.';
      case 'invalid-email':
        return 'Invalid email address.';
      case 'user-disabled':
        return 'This account has been disabled.';
      case 'too-many-requests':
        return 'Too many requests. Please try again later.';
      case 'email-already-in-use':
        return 'An account already exists with this email address.';
      case 'weak-password':
        return 'Password is too weak. Please choose a stronger password.';
      case 'operation-not-allowed':
        return 'Email/password accounts are not enabled.';
      case 'invalid-credential':
        return 'Invalid email or password.';
      default:
        return 'An error occurred. Please try again.';
    }
  }
}

class AuthResult {
  final bool isSuccess;
  final User? user;
  final String? token;
  final String? error;

  const AuthResult._({
    required this.isSuccess,
    this.user,
    this.token,
    this.error,
  });

  factory AuthResult.success({required User user, String? token}) {
    return AuthResult._(isSuccess: true, user: user, token: token);
  }

  factory AuthResult.failure({required String error}) {
    return AuthResult._(isSuccess: false, error: error);
  }
}
