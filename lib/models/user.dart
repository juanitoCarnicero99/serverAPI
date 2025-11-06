class User {
  final int id;
  final String username;
  final String password;

  User({required this.id, required this.username, required this.password});

  @override
  String toString() => 'User(id: $id, username: $username)';
}
