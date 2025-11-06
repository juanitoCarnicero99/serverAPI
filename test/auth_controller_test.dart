import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_mvc_login/controllers/auth_controller.dart';
import 'package:flutter_mvc_login/repositories/user_repository.dart';
import 'package:flutter_mvc_login/models/user.dart';

void main() {
  group('AuthController', () {
    late AuthController authController;
    late UserRepository userRepository;

    setUp(() {
      userRepository = UserRepository();
      authController = AuthController(userRepository: userRepository);
    });

    test('loginUser returns true for valid credentials', () async {
      // Arrange
      final user = User(id: 1, username: 'testuser', password: 'password123');
      userRepository.authenticateUser = (username, password) async {
        return user; // Simulate successful authentication
      };

      // Act
      final result = await authController.loginUser('testuser', 'password123');

      // Assert
      expect(result, true);
    });

    test('loginUser returns false for invalid credentials', () async {
      // Arrange
      userRepository.authenticateUser = (username, password) async {
        return null; // Simulate failed authentication
      };

      // Act
      final result = await authController.loginUser('wronguser', 'wrongpass');

      // Assert
      expect(result, false);
    });
  });
}