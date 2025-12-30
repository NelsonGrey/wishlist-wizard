class User {
  final String id; // Changed from int to String to support Firebase UIDs
  final String email;
  final String? name;
  final String? profileImageUrl;
  final DateTime createdAt;

  const User({
    required this.id,
    required this.email,
    this.name,
    this.profileImageUrl,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'].toString(), // Handle both string and int IDs
      email: json['email'] as String,
      name: json['name'] as String?,
      profileImageUrl: json['profileImageUrl'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'profileImageUrl': profileImageUrl,
      'createdAt': createdAt.toIso8601String(),
    };
  }
}
