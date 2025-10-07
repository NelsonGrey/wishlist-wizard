class ApiConfig {
  static const String _baseUrl = 'http://localhost:5000/api';

  // For Android emulator, localhost should be 10.0.2.2
  static String get baseUrl {
    // In a real app, you might detect platform or use flavors
    // For now, defaulting to localhost for iOS Simulator
    return _baseUrl;
  }

  static const int timeoutMs = 15000;

  // API endpoints
  static const String auth = '/auth';
  static const String wishlists = '/wishlists';
  static const String items = '/items';
  static const String users = '/users';
  static const String mobile = '/mobile';

  // Auth endpoints
  static const String login = '$auth/login';
  static const String register = '$auth/register';
  static const String logout = '$auth/logout';
  static const String currentUser = '$auth/me';

  // Mobile API endpoints (matching the Express routes)
  static const String mobileWishlists = '$mobile/wishlists';
  static const String mobileItems = '$mobile/items';
}
