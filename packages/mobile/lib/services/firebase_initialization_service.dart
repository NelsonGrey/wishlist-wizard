// ignore_for_file: avoid_print

import 'package:firebase_core/firebase_core.dart';
import '../firebase_options.dart';

class FirebaseInitializationService {
  static final FirebaseInitializationService _instance =
      FirebaseInitializationService._internal();
  factory FirebaseInitializationService() => _instance;
  FirebaseInitializationService._internal();

  bool _isInitialized = false;
  bool _isInitializing = false;
  String? _initializationError;

  bool get isInitialized => _isInitialized;
  bool get isInitializing => _isInitializing;
  String? get initializationError => _initializationError;

  Future<bool> initialize() async {
    if (_isInitialized) return true;
    if (_isInitializing) {
      // Wait for ongoing initialization
      while (_isInitializing) {
        await Future.delayed(const Duration(milliseconds: 100));
      }
      return _isInitialized;
    }

    _isInitializing = true;
    _initializationError = null;

    try {
      await Firebase.initializeApp(
        options: DefaultFirebaseOptions.currentPlatform,
      );
      _isInitialized = true;
      print('Firebase initialized successfully');
      return true;
    } catch (e) {
      _initializationError = e.toString();
      print('Firebase initialization error: $e');

      // Try alternative initialization without options (fallback)
      try {
        await Firebase.initializeApp();
        _isInitialized = true;
        print('Firebase initialized with fallback method');
        return true;
      } catch (fallbackError) {
        print('Firebase fallback initialization failed: $fallbackError');
        _isInitialized = false;
        return false;
      }
    } finally {
      _isInitializing = false;
    }
  }

  Future<void> ensureInitialized() async {
    if (!_isInitialized && !_isInitializing) {
      await initialize();
    }
  }
}
