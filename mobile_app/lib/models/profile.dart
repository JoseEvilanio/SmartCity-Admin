class UserProfile {
  final String id;
  final String name;
  final String email;
  final String? phone;
  final String? avatarUrl;
  final String? cpf;
  final int points;
  final String role;
  final String? tenantId;

  UserProfile({
    required this.id,
    required this.name,
    required this.email,
    this.phone,
    this.avatarUrl,
    this.cpf,
    required this.points,
    required this.role,
    this.tenantId,
  });

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String,
      name: json['name'] as String,
      email: json['email'] as String,
      phone: json['phone'] as String?,
      avatarUrl: json['avatar_url'] as String?,
      cpf: json['cpf'] as String?,
      points: (json['points'] as num?)?.toInt() ?? 0,
      role: json['role'] as String? ?? 'cidadao',
      tenantId: json['tenant_id'] as String?,
    );
  }

  String get levelTitle {
    if (points >= 1000) return 'Guardião da Cidade';
    if (points >= 500) return 'Colaborador Urbano';
    if (points >= 100) return 'Fiscal Comunitário';
    return 'Cidadão Ativo';
  }

  int get nextLevelPoints {
    if (points >= 1000) return 1000;
    if (points >= 500) return 1000;
    if (points >= 100) return 500;
    return 100;
  }

  double get levelProgress {
    if (points >= 1000) return 1.0;
    if (points >= 500) return (points - 500) / 500.0;
    if (points >= 100) return (points - 100) / 400.0;
    return points / 100.0;
  }
}
