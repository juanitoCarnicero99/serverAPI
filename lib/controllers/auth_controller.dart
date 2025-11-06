import '../repositories/user_repository.dart';

class AuthController {
  final UserRepository userRepository;

  AuthController({required this.userRepository});

  /// Intenta autenticar y retorna `true` si existe un usuario válido.
  Future<bool> loginUser(String username, String password) async {
    final user = await userRepository.authenticateUser(username, password);
    return user != null;
  }
}
