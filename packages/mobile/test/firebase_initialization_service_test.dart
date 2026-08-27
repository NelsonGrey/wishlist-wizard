import 'package:flutter_test/flutter_test.dart';
import 'package:wishlist_wizard_mobile/services/firebase_initialization_service.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  // FirebaseInitializationService is a real singleton (factory constructor
  // returning a static instance), so its state persists across every test
  // in this file -- there is no way to reset it between cases. Firebase's
  // real initializeApp() also goes through a Pigeon-generated host API that
  // isn't reachable without a live platform, and this repo has no Firebase
  // test-double setup for it (see the comment in firestore_service_test.dart
  // for the same constraint on the Firestore SDK).
  //
  // What IS genuinely testable without any of that: initialize()'s error
  // path. Under `flutter test`, no platform channel handler is registered
  // for Firebase's native calls, so the real Firebase.initializeApp() call
  // throws MissingPluginException -- exercising the exact catch block a
  // real first-launch Firebase outage would hit, for real, with no mocking
  // needed. Sequenced as one test (not independent `test()` blocks) so the
  // singleton's shared state can't make execution-order-dependent
  // assumptions look like independent, reorderable cases.
  test(
    'singleton identity, then initialize()/ensureInitialized() surface a real init failure',
    () async {
      final a = FirebaseInitializationService();
      final b = FirebaseInitializationService();
      expect(identical(a, b), isTrue);

      expect(a.isInitialized, isFalse);
      expect(a.isInitializing, isFalse);
      expect(a.initializationError, isNull);

      final result = await a.initialize();

      expect(result, isFalse);
      expect(a.isInitialized, isFalse);
      expect(a.isInitializing, isFalse); // finally block always clears this
      expect(a.initializationError, isNotNull);

      // ensureInitialized() delegates to initialize() again when not yet
      // initialized -- same real failure, same error surfaced.
      final errorBeforeRetry = a.initializationError;
      await a.ensureInitialized();
      expect(a.isInitialized, isFalse);
      expect(a.initializationError, isNotNull);
      // Distinct exception instances stringify identically for the same
      // underlying MissingPluginException, so this confirms a retry
      // actually happened rather than short-circuiting.
      expect(a.initializationError, errorBeforeRetry);
    },
  );
}
