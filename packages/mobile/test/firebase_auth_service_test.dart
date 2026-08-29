import 'package:flutter_test/flutter_test.dart';
import 'package:wishlist_wizard_mobile/models/models.dart';
import 'package:wishlist_wizard_mobile/services/firebase_auth_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  // FirebaseAuthService is a real singleton whose _ensureFirebaseInitialized()
  // guard depends on FirebaseInitializationService() -- also a real
  // singleton, not constructor-injectable here, and (per
  // firebase_initialization_service_test.dart) unable to actually
  // initialize under `flutter test` since there's no live platform for
  // Firebase's Pigeon-based host API. That failure is deterministic and
  // persists for the rest of the process, which is exactly what makes this
  // a legitimate, valuable thing to test: every public method's real,
  // consistent fail-safe behavior when Firebase genuinely can't be reached
  // (e.g. first launch with no network) -- not a mock standing in for
  // "success", but the service's actual documented failure path.
  const unavailableMessage = 'Firebase not available. Please check your connection.';
  final service = FirebaseAuthService();

  group('FirebaseAuthService — singleton', () {
    test('returns the same instance every time', () {
      expect(identical(FirebaseAuthService(), FirebaseAuthService()), isTrue);
    });
  });

  group('FirebaseAuthService — every method fails safe when Firebase is unavailable', () {
    test('login', () async {
      final result = await service.login('mark@example.com', 'password123');
      expect(result.isSuccess, isFalse);
      expect(result.error, unavailableMessage);
    });

    test('register', () async {
      final result = await service.register('mark@example.com', 'password123', 'Mark');
      expect(result.isSuccess, isFalse);
      expect(result.error, unavailableMessage);
    });

    test('loginWithGoogle', () async {
      final result = await service.loginWithGoogle();
      expect(result.isSuccess, isFalse);
      expect(result.error, unavailableMessage);
    });

    test('loginWithApple', () async {
      final result = await service.loginWithApple();
      expect(result.isSuccess, isFalse);
      expect(result.error, unavailableMessage);
    });

    test('getCurrentUser returns null', () async {
      expect(await service.getCurrentUser(), isNull);
    });

    test('logout returns normally without throwing', () async {
      await expectLater(service.logout(), completes);
    });

    test('isLoggedIn returns false', () async {
      expect(await service.isLoggedIn(), isFalse);
    });

    test('reauthenticateWithPassword', () async {
      final result = await service.reauthenticateWithPassword('password123');
      expect(result.isSuccess, isFalse);
      expect(result.error, unavailableMessage);
    });

    test('updatePassword', () async {
      final result = await service.updatePassword('newPassword123');
      expect(result.isSuccess, isFalse);
      expect(result.error, unavailableMessage);
    });

    test('resetPassword', () async {
      final result = await service.resetPassword('mark@example.com');
      expect(result.isSuccess, isFalse);
      expect(result.error, unavailableMessage);
    });

    test('authStateChanges emits a single null', () async {
      final events = await service.authStateChanges.toList();
      expect(events, [null]);
    });
  });

  group('AuthResult', () {
    test('success() sets isSuccess and carries the user/token', () {
      final fakeUser = User(id: 'u1', email: 'mark@example.com', createdAt: DateTime(2026));
      final result = AuthResult.success(user: fakeUser, token: 't1');
      expect(result.isSuccess, isTrue);
      expect(result.user, fakeUser);
      expect(result.token, 't1');
      expect(result.error, isNull);
    });

    test('failure() sets isSuccess false and carries the error', () {
      final result = AuthResult.failure(error: 'boom');
      expect(result.isSuccess, isFalse);
      expect(result.error, 'boom');
      expect(result.user, isNull);
    });
  });
}
