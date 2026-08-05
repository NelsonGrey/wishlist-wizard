// ignore_for_file: avoid_print

import 'package:flutter/foundation.dart';
import 'package:firebase_auth/firebase_auth.dart' as firebase_auth;
import 'package:google_sign_in/google_sign_in.dart' as google_sign_in;
import 'package:sign_in_with_apple/sign_in_with_apple.dart' as apple;
import '../models/models.dart';
import 'firebase_initialization_service.dart';

class FirebaseAuthService {
  static final FirebaseAuthService _instance = FirebaseAuthService._internal();
  factory FirebaseAuthService() => _instance;
  FirebaseAuthService._internal();

  final FirebaseInitializationService _firebaseInit =
      FirebaseInitializationService();
  firebase_auth.FirebaseAuth? _firebaseAuth;
  bool _googleSignInInitialized = false;

  // Holds an OAuth credential recovered from an
  // account-exists-with-different-credential/credential-already-in-use
  // failure until the user next signs in successfully by any method. Email
  // enumeration protection means Firebase won't tell us which email/provider
  // already owns the account up front, so we can't look it up — a
  // successful sign-in (by the user's own action) is itself the proof of
  // ownership, so we link the stashed credential right after that succeeds.
  firebase_auth.AuthCredential? _pendingLinkCredential;

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

    if (kDebugMode) {
      debugPrint('[FirebaseAuthService] Ensuring Firebase is initialized');
    }
    final initialized = await _firebaseInit.initialize();
    if (initialized) {
      try {
        _firebaseAuth = firebase_auth.FirebaseAuth.instance;
        if (kDebugMode) {
          debugPrint('[FirebaseAuthService] FirebaseAuth instance ready');
        }
        return true;
      } catch (e) {
        print('Error accessing FirebaseAuth: $e');
        return false;
      }
    }
    if (kDebugMode) {
      debugPrint('[FirebaseAuthService] Firebase initialization failed');
    }
    return false;
  }

  Future<void> _linkPendingCredentialIfNeeded(
    firebase_auth.User? signedInUser,
  ) async {
    final pendingCredential = _pendingLinkCredential;
    if (pendingCredential == null || signedInUser == null) {
      return;
    }

    try {
      await signedInUser.linkWithCredential(pendingCredential);
      await signedInUser.reload();
    } on firebase_auth.FirebaseAuthException catch (e) {
      if (e.code != 'provider-already-linked' &&
          e.code != 'credential-already-in-use' &&
          e.code != 'requires-recent-login') {
        rethrow;
      }
    } finally {
      _pendingLinkCredential = null;
    }
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
      await _linkPendingCredentialIfNeeded(credential.user);

      if (credential.user != null) {
        final user = _firebaseUserToUser(credential.user!);
        return AuthResult.success(user: user);
      } else {
        return AuthResult.failure(error: 'Login failed');
      }
    } on firebase_auth.FirebaseAuthException catch (e) {
      if (kDebugMode) {
        debugPrint(
          '[FirebaseAuthService] login FirebaseAuthException code=${e.code} message=${e.message}',
        );
      }
      String errorMessage = _getErrorMessage(e.code);
      return AuthResult.failure(error: errorMessage);
    } catch (e) {
      if (kDebugMode) {
        debugPrint('[FirebaseAuthService] login unexpected error: $e');
      }
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

  Future<void> _ensureGoogleSignInInitialized() async {
    if (_googleSignInInitialized) return;
    await google_sign_in.GoogleSignIn.instance.initialize();
    _googleSignInInitialized = true;
  }

  /// Android-only, per this app's platform-native sign-in split.
  Future<AuthResult> loginWithGoogle() async {
    if (!await _ensureFirebaseInitialized()) {
      return AuthResult.failure(
        error: 'Firebase not available. Please check your connection.',
      );
    }

    try {
      await _ensureGoogleSignInInitialized();
      final googleUser = await google_sign_in.GoogleSignIn.instance
          .authenticate();
      final googleAuth = googleUser.authentication;
      final credential = firebase_auth.GoogleAuthProvider.credential(
        idToken: googleAuth.idToken,
      );
      return await _signInWithOAuthCredential(credential);
    } on google_sign_in.GoogleSignInException catch (e) {
      if (e.code == google_sign_in.GoogleSignInExceptionCode.canceled) {
        return AuthResult.failure(error: 'Sign-in was cancelled.');
      }
      if (kDebugMode) {
        debugPrint('[FirebaseAuthService] Google sign-in error: $e');
      }
      return AuthResult.failure(error: 'Google sign-in failed. Please try again.');
    } catch (e) {
      return AuthResult.failure(error: 'An unexpected error occurred: $e');
    }
  }

  /// iOS-only, per this app's platform-native sign-in split.
  Future<AuthResult> loginWithApple() async {
    if (!await _ensureFirebaseInitialized()) {
      return AuthResult.failure(
        error: 'Firebase not available. Please check your connection.',
      );
    }

    try {
      final appleCredential = await apple.SignInWithApple.getAppleIDCredential(
        scopes: [
          apple.AppleIDAuthorizationScopes.email,
          apple.AppleIDAuthorizationScopes.fullName,
        ],
      );

      final credential = firebase_auth.OAuthProvider('apple.com').credential(
        idToken: appleCredential.identityToken,
        accessToken: appleCredential.authorizationCode,
      );
      return await _signInWithOAuthCredential(credential);
    } on apple.SignInWithAppleAuthorizationException catch (e) {
      if (e.code == apple.AuthorizationErrorCode.canceled) {
        return AuthResult.failure(error: 'Sign-in was cancelled.');
      }
      if (kDebugMode) {
        debugPrint('[FirebaseAuthService] Apple sign-in error: $e');
      }
      return AuthResult.failure(error: 'Apple sign-in failed. Please try again.');
    } catch (e) {
      return AuthResult.failure(error: 'An unexpected error occurred: $e');
    }
  }

  Future<AuthResult> _signInWithOAuthCredential(
    firebase_auth.AuthCredential credential,
  ) async {
    try {
      final userCredential = await _auth.signInWithCredential(credential);
      final user = userCredential.user;
      if (user == null) {
        return AuthResult.failure(error: 'Sign-in failed');
      }
      return AuthResult.success(user: _firebaseUserToUser(user));
    } on firebase_auth.FirebaseAuthException catch (e) {
      if (e.code == 'account-exists-with-different-credential' ||
          e.code == 'credential-already-in-use') {
        _pendingLinkCredential = credential;
        return AuthResult.failure(
          error:
              'An account already exists with this email. Sign in with your existing method — we\'ll link this provider automatically.',
        );
      }
      return AuthResult.failure(error: _getErrorMessage(e.code));
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
    _pendingLinkCredential = null;
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

  Future<AuthResult> resetPassword(String email) async {
    if (!await _ensureFirebaseInitialized()) {
      return AuthResult.failure(
        error: 'Firebase not available. Please check your connection.',
      );
    }

    try {
      await _auth.sendPasswordResetEmail(email: email.trim());
      return AuthResult._(isSuccess: true);
    } on firebase_auth.FirebaseAuthException catch (e) {
      String errorMessage = _getErrorMessage(e.code);
      return AuthResult.failure(error: errorMessage);
    } catch (e) {
      return AuthResult.failure(error: 'An unexpected error occurred: $e');
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
