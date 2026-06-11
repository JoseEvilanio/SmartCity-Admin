class ServiceOrder {
  final String id;
  final String osNumber;
  final String occurrenceId;
  final String? responsibleTeamId;
  final String? deadline;
  final String priority;
  final String status;
  final String? resolvedAt;
  final String? resolutionReport;
  final String? photoBeforeUrl;
  final String? photoAfterUrl;
  final List<dynamic>? checklist;
  final String? digitalSignatureUrl;
  final Map<String, dynamic>? occurrence;

  ServiceOrder({
    required this.id,
    required this.osNumber,
    required this.occurrenceId,
    this.responsibleTeamId,
    this.deadline,
    required this.priority,
    required this.status,
    this.resolvedAt,
    this.resolutionReport,
    this.photoBeforeUrl,
    this.photoAfterUrl,
    this.checklist,
    this.digitalSignatureUrl,
    this.occurrence,
  });

  factory ServiceOrder.fromJson(Map<String, dynamic> json) {
    final occData = json['occurrences'] ?? json['occurrence'];
    return ServiceOrder(
      id: json['id'] as String,
      osNumber: json['os_number'] as String,
      occurrenceId: json['occurrence_id'] as String,
      responsibleTeamId: json['responsible_team_id'] as String?,
      deadline: json['deadline'] as String?,
      priority: json['priority'] as String,
      status: json['status'] as String,
      resolvedAt: json['resolved_at'] as String?,
      resolutionReport: json['resolution_report'] as String?,
      photoBeforeUrl: json['photo_before_url'] as String?,
      photoAfterUrl: json['photo_after_url'] as String?,
      checklist: json['checklist'] as List<dynamic>?,
      digitalSignatureUrl: json['digital_signature_url'] as String?,
      occurrence: occData is List
          ? (occData.isNotEmpty ? occData[0] as Map<String, dynamic> : null)
          : occData as Map<String, dynamic>?,
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'os_number': osNumber,
    'occurrence_id': occurrenceId,
    'priority': priority,
    'status': status,
    'resolution_report': resolutionReport,
    'photo_before_url': photoBeforeUrl,
    'photo_after_url': photoAfterUrl,
    'checklist': checklist,
    'digital_signature_url': digitalSignatureUrl,
  };

  ServiceOrder copyWith({
    String? status,
    String? resolutionReport,
    String? photoBeforeUrl,
    String? photoAfterUrl,
    List<dynamic>? checklist,
    String? digitalSignatureUrl,
    String? resolvedAt,
  }) {
    return ServiceOrder(
      id: id,
      osNumber: osNumber,
      occurrenceId: occurrenceId,
      responsibleTeamId: responsibleTeamId,
      deadline: deadline,
      priority: priority,
      status: status ?? this.status,
      resolvedAt: resolvedAt ?? this.resolvedAt,
      resolutionReport: resolutionReport ?? this.resolutionReport,
      photoBeforeUrl: photoBeforeUrl ?? this.photoBeforeUrl,
      photoAfterUrl: photoAfterUrl ?? this.photoAfterUrl,
      checklist: checklist ?? this.checklist,
      digitalSignatureUrl: digitalSignatureUrl ?? this.digitalSignatureUrl,
      occurrence: occurrence,
    );
  }
}
