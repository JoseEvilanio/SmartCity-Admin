class Occurrence {
  final String id;
  final String title;
  final String municipality;
  final String category;
  final String priority;
  final String status;
  final String date;
  final String reporter;
  final double? latitude;
  final double? longitude;
  final String? address;
  final String? neighborhood;
  final String? description;

  Occurrence({
    required this.id,
    required this.title,
    required this.municipality,
    required this.category,
    required this.priority,
    required this.status,
    required this.date,
    required this.reporter,
    this.latitude,
    this.longitude,
    this.address,
    this.neighborhood,
    this.description,
  });

  factory Occurrence.fromJson(Map<String, dynamic> json) {
    return Occurrence(
      id: json['id'] as String,
      title: json['title'] as String,
      municipality: json['municipality'] as String,
      category: json['category'] as String,
      priority: json['priority'] as String,
      status: json['status'] as String,
      date: json['date'] as String,
      reporter: json['reporter'] as String,
      latitude: json['latitude'] != null ? (json['latitude'] as num).toDouble() : null,
      longitude: json['longitude'] != null ? (json['longitude'] as num).toDouble() : null,
      address: json['address'] as String?,
      neighborhood: json['neighborhood'] as String?,
      description: json['description'] as String?,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'municipality': municipality,
      'category': category,
      'priority': priority,
      'status': status,
      'date': date,
      'reporter': reporter,
      'latitude': latitude,
      'longitude': longitude,
      'address': address,
      'neighborhood': neighborhood,
      'description': description,
    };
  }
}
