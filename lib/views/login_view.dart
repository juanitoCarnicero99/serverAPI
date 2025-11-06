import '../controllers/auth_controller.dart';

/// Vista mínima de login (placeholder) — aquí tu app Flutter tendrá el UI real.
class LoginView {
  final AuthController controller;

  LoginView({required this.controller});

  // Placeholder: método que simula un intento de login en la vista.
  Future<bool> submit(String username, String password) async {
    return await controller.loginUser(username, password);
  }
}
