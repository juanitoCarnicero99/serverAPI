import '../models/user.dart';

/// Repositorio mínimo para autenticación.
///
/// Tiene un campo `authenticateUser` que los tests pueden sobrescribir
/// para simular autenticación exitosa o fallida.
class UserRepository {
  /// Función que realiza la autenticación. Por defecto retorna `null`.
  late Future<User?> Function(String username, String password) authenticateUser;

  UserRepository() {
    // Implementación por defecto: siempre falla (retorna null).
    authenticateUser = (String username, String password) async => null;
  }
}
