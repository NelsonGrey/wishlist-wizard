import '../models/models.dart';
import 'api_client.dart';
import 'api_config.dart';

class AuthService {
  static final AuthService _instance = AuthService._internal();
  factory AuthService() => _instance;
  AuthService._internal();

  final ApiClient _apiClient = ApiClient();

  Future<AuthResult> login(String email, String password) async {
    try {
      final response = await _apiClient.post(
        ApiConfig.login,
        data: {'email': email, 'password': password},
      );

      final data = response.data;
      final token = data['token'] as String?;
      final user = User.fromJson(data['user'] as Map<String, dynamic>);

      if (token != null) {
        await _apiClient.setAuthToken(token);
      }

      return AuthResult.success(user: user, token: token);
    } on ApiException catch (e) {
      return AuthResult.failure(error: e.message);
    } catch (e) {
      return AuthResult.failure(error: 'An unexpected error occurred');
    }
  }

  Future<AuthResult> register(
    String email,
    String password,
    String? name,
  ) async {
    try {
      final response = await _apiClient.post(
        ApiConfig.register,
        data: {
          'email': email,
          'password': password,
          if (name != null) 'name': name,
        },
      );

      final data = response.data;
      final token = data['token'] as String?;
      final user = User.fromJson(data['user'] as Map<String, dynamic>);

      if (token != null) {
        await _apiClient.setAuthToken(token);
      }

      return AuthResult.success(user: user, token: token);
    } on ApiException catch (e) {
      return AuthResult.failure(error: e.message);
    } catch (e) {
      return AuthResult.failure(error: 'An unexpected error occurred');
    }
  }

  Future<User?> getCurrentUser() async {
    try {
      final response = await _apiClient.get(ApiConfig.currentUser);
      final data = response.data;
      return User.fromJson(data as Map<String, dynamic>);
    } on ApiException catch (e) {
      if (e.statusCode == 401) {
        // Token expired or invalid
        await logout();
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  Future<void> logout() async {
    try {
      await _apiClient.post(ApiConfig.logout);
    } catch (e) {
      // Continue with local logout even if server request fails
    } finally {
      // Clear local token
      await _apiClient.setAuthToken('');
    }
  }

  Future<bool> isLoggedIn() async {
    return await _apiClient.hasAuthToken();
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
