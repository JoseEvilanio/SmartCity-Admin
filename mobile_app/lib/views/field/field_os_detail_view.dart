import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:signature/signature.dart';
import '../../models/service_order.dart';
import '../../services/supabase_service.dart';

class FieldOsDetailView extends StatefulWidget {
  final ServiceOrder order;
  const FieldOsDetailView({super.key, required this.order});

  @override
  State<FieldOsDetailView> createState() => _FieldOsDetailViewState();
}

class _FieldOsDetailViewState extends State<FieldOsDetailView> {
  late ServiceOrder _order;
  final _reportCtrl = TextEditingController();
  final _svc = SupabaseService();
  final _picker = ImagePicker();
  final _signatureCtrl = SignatureController(
    penStrokeWidth: 3,
    penColor: Colors.white,
    exportBackgroundColor: const Color(0xFF1A2332),
  );

  File? _photoBefore;
  File? _photoAfter;
  List<Map<String, dynamic>> _checklist = [];
  bool _saving = false;
  bool _showSignature = false;
  String? _signatureUrl;

  @override
  void initState() {
    super.initState();
    _order = widget.order;
    _reportCtrl.text = _order.resolutionReport ?? '';
    // Initialize checklist from DB or default items
    _checklist = (_order.checklist?.cast<Map<String, dynamic>>()) ??
        [
          {'label': 'Local inspecionado', 'done': false},
          {'label': 'Ferramentas verificadas', 'done': false},
          {'label': 'EPI utilizado', 'done': false},
          {'label': 'Serviço executado', 'done': false},
          {'label': 'Local sinalizado/limpo', 'done': false},
        ];
  }

  Future<void> _pickPhoto(bool isBefore) async {
    final source = await showModalBottomSheet<ImageSource>(
      context: context,
      backgroundColor: const Color(0xFF1A2332),
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(20))),
      builder: (_) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(mainAxisSize: MainAxisSize.min, children: [
          ListTile(
            leading: const Icon(Icons.camera_alt, color: Color(0xFFF59E0B)),
            title: const Text('Câmera', style: TextStyle(color: Colors.white)),
            onTap: () => Navigator.pop(context, ImageSource.camera),
          ),
          ListTile(
            leading: const Icon(Icons.photo_library, color: Color(0xFFF59E0B)),
            title: const Text('Galeria', style: TextStyle(color: Colors.white)),
            onTap: () => Navigator.pop(context, ImageSource.gallery),
          ),
        ]),
      ),
    );
    if (source == null) return;
    final xFile = await _picker.pickImage(source: source, imageQuality: 80);
    if (xFile != null) {
      setState(() {
        if (isBefore) _photoBefore = File(xFile.path);
        else _photoAfter = File(xFile.path);
      });
    }
  }

  Future<void> _saveProgress(String newStatus) async {
    setState(() => _saving = true);
    try {
      String? photoBeforeUrl = _order.photoBeforeUrl;
      String? photoAfterUrl = _order.photoAfterUrl;

      // Upload photos if available
      if (_photoBefore != null) {
        photoBeforeUrl = await _svc.uploadEvidence('os-${_order.id}-before', _photoBefore!, 'jpg');
      }
      if (_photoAfter != null) {
        photoAfterUrl = await _svc.uploadEvidence('os-${_order.id}-after', _photoAfter!, 'jpg');
      }

      final updatedPayload = {
        'id': _order.id,
        'status': newStatus,
        'resolution_report': _reportCtrl.text.trim(),
        'photo_before_url': photoBeforeUrl,
        'photo_after_url': photoAfterUrl,
        'checklist': _checklist,
        'digital_signature_url': _signatureUrl,
        if (newStatus == 'Concluída') 'resolved_at': DateTime.now().toIso8601String(),
      };

      await _svc.updateRaw('service_orders', _order.id, updatedPayload);

      setState(() {
        _order = _order.copyWith(
          status: newStatus,
          resolutionReport: _reportCtrl.text.trim(),
          photoBeforeUrl: photoBeforeUrl,
          photoAfterUrl: photoAfterUrl,
          checklist: _checklist,
          digitalSignatureUrl: _signatureUrl,
        );
      });

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(SnackBar(
          content: Text(newStatus == 'Concluída' ? '✅ OS concluída com sucesso!' : '💾 Progresso guardado'),
          backgroundColor: newStatus == 'Concluída' ? const Color(0xFF10B981) : const Color(0xFF3B82F6),
        ));
        if (newStatus == 'Concluída') Navigator.of(context).pop(_order);
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro: $e'), backgroundColor: Colors.redAccent),
        );
      }
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Future<void> _exportSignature() async {
    if (_signatureCtrl.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Desenhe a assinatura antes de confirmar')),
      );
      return;
    }
    final bytes = await _signatureCtrl.toPngBytes();
    if (bytes != null) {
      // Save to temp and upload
      final tempDir = Directory.systemTemp;
      final file = File('${tempDir.path}/signature_${_order.id}.png');
      await file.writeAsBytes(bytes);
      final url = await _svc.uploadEvidence('signatures/${_order.id}', file, 'png');
      setState(() {
        _signatureUrl = url;
        _showSignature = false;
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('✅ Assinatura registada'), backgroundColor: Color(0xFF10B981)),
        );
      }
    }
  }

  Color get _statusColor => switch (_order.status) {
    'Concluída' => const Color(0xFF10B981),
    'Em Execução' => const Color(0xFF3B82F6),
    'Cancelada' => const Color(0xFFEF4444),
    _ => const Color(0xFFF59E0B),
  };

  Color _occurrencePriorityColor(String p) => switch (p) {
    'Crítico' || 'Crítica' => const Color(0xFFEF4444),
    'Alto' || 'Alta' => const Color(0xFFF97316),
    'Médio' || 'Média' => const Color(0xFFF59E0B),
    _ => const Color(0xFF10B981),
  };

  int get _doneCount => _checklist.where((c) => c['done'] == true).length;

  @override
  Widget build(BuildContext context) {
    final occTitle = _order.occurrence?['title'] as String? ??
        'Ocorrência #${_order.occurrenceId.substring(0, 8)}';

    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1A2332),
        foregroundColor: Colors.white,
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(_order.osNumber, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          Text(_order.status, style: TextStyle(color: _statusColor, fontSize: 11, fontWeight: FontWeight.w600)),
        ]),
        elevation: 0,
      ),
      body: _showSignature ? _buildSignaturePanel() : _buildMainContent(occTitle),
      bottomNavigationBar: _showSignature ? null : _buildActionBar(),
    );
  }

  Widget _buildMainContent(String occTitle) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Occurrence info card
        _SectionCard(
          title: 'Detalhes da Ocorrência',
          icon: Icons.report_problem_outlined,
          iconColor: const Color(0xFFF59E0B),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                occTitle,
                style: const TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                ),
              ),
              const SizedBox(height: 10),
              
              // Priority & Category Tags
              Row(
                children: [
                  if (_order.occurrence?['category'] != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFF3B82F6).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.3)),
                      ),
                      child: Text(
                        _order.occurrence!['category'] as String,
                        style: const TextStyle(color: Color(0xFF3B82F6), fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(width: 8),
                  ],
                  if (_order.occurrence?['priority'] != null) ...[
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: _occurrencePriorityColor(_order.occurrence!['priority'] as String).withOpacity(0.15),
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: _occurrencePriorityColor(_order.occurrence!['priority'] as String).withOpacity(0.3)),
                      ),
                      child: Text(
                        'Prioridade: ${_order.occurrence!['priority']}',
                        style: TextStyle(
                          color: _occurrencePriorityColor(_order.occurrence!['priority'] as String),
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ],
                ],
              ),
              const SizedBox(height: 12),

              // Description
              if (_order.occurrence?['description'] != null && (_order.occurrence!['description'] as String).isNotEmpty) ...[
                const Text(
                  'Descrição do Cidadão:',
                  style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 4),
                Text(
                  _order.occurrence!['description'] as String,
                  style: TextStyle(color: Colors.white.withOpacity(0.85), fontSize: 13, height: 1.4),
                ),
                const SizedBox(height: 12),
              ],

              // Location / Address
              if (_order.occurrence?['address'] != null || _order.occurrence?['neighborhood'] != null) ...[
                const Row(
                  children: [
                    Icon(Icons.location_on, size: 14, color: Color(0xFFEF4444)),
                    SizedBox(width: 6),
                    Text(
                      'Localização:',
                      style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  [
                    if (_order.occurrence?['address'] != null && (_order.occurrence!['address'] as String).isNotEmpty) _order.occurrence!['address'] as String,
                    if (_order.occurrence?['neighborhood'] != null && (_order.occurrence!['neighborhood'] as String).isNotEmpty) 'Bairro: ${_order.occurrence!['neighborhood']}',
                  ].join(' - '),
                  style: TextStyle(color: Colors.white.withOpacity(0.75), fontSize: 13),
                ),
                const SizedBox(height: 12),
              ],

              // Reporter & Date
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Relatado por:', style: TextStyle(color: Colors.white38, fontSize: 11)),
                        const SizedBox(height: 2),
                        Text(
                          _order.occurrence?['reporter'] as String? ?? 'Cidadão Anônimo',
                          style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('Data do Registro:', style: TextStyle(color: Colors.white38, fontSize: 11)),
                        const SizedBox(height: 2),
                        Text(
                          _order.occurrence?['date'] as String? ?? 'Desconhecida',
                          style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 12, fontWeight: FontWeight.w500),
                        ),
                      ],
                    ),
                  ),
                ],
              ),

              // Citizen photos / Media
              if (_order.occurrence?['occurrence_media'] != null &&
                  (_order.occurrence!['occurrence_media'] as List).isNotEmpty) ...[
                const SizedBox(height: 16),
                const Text(
                  'Fotos Anexadas pelo Cidadão:',
                  style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold),
                ),
                const SizedBox(height: 8),
                SizedBox(
                  height: 100,
                  child: ListView.separated(
                    scrollDirection: Axis.horizontal,
                    itemCount: (_order.occurrence!['occurrence_media'] as List).length,
                    separatorBuilder: (_, __) => const SizedBox(width: 10),
                    itemBuilder: (context, index) {
                      final media = (_order.occurrence!['occurrence_media'] as List)[index];
                      final url = media['media_url'] as String;
                      return GestureDetector(
                        onTap: () {
                          // Show fullscreen image dialog
                          showDialog(
                            context: context,
                            builder: (context) => Dialog(
                              backgroundColor: Colors.transparent,
                              insetPadding: const EdgeInsets.all(10),
                              child: Stack(
                                alignment: Alignment.topRight,
                                children: [
                                  InteractiveViewer(
                                    child: Image.network(url, fit: BoxFit.contain),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.close, color: Colors.white, size: 30),
                                    onPressed: () => Navigator.pop(context),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                        child: ClipRRect(
                          borderRadius: BorderRadius.circular(10),
                          child: Image.network(
                            url,
                            width: 100,
                            height: 100,
                            fit: BoxFit.cover,
                            loadingBuilder: (context, child, progress) {
                              if (progress == null) return child;
                              return Container(
                                width: 100,
                                height: 100,
                                color: Colors.white.withOpacity(0.05),
                                child: const Center(
                                  child: CircularProgressIndicator(strokeWidth: 2, color: Color(0xFFF59E0B)),
                                ),
                              );
                            },
                            errorBuilder: (context, error, stackTrace) => Container(
                              width: 100,
                              height: 100,
                              color: Colors.white.withOpacity(0.05),
                              child: const Icon(Icons.broken_image, color: Colors.white30),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],

              if (_order.deadline != null) ...[
                const SizedBox(height: 16),
                const Divider(color: Colors.white10),
                const SizedBox(height: 8),
                Row(
                  children: [
                    const Icon(Icons.schedule, size: 14, color: Color(0xFFF59E0B)),
                    const SizedBox(width: 6),
                    Text(
                      'Prazo Limite para Resolução: ${_order.deadline!.substring(0, 10)}',
                      style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
        const SizedBox(height: 12),

        // Checklist
        _SectionCard(
          title: 'Checklist ($_doneCount/${_checklist.length})',
          icon: Icons.checklist_rounded,
          iconColor: const Color(0xFF3B82F6),
          child: Column(children: [
            // Progress
            ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: _checklist.isEmpty ? 0 : _doneCount / _checklist.length,
                backgroundColor: Colors.white.withOpacity(0.1),
                color: const Color(0xFF3B82F6),
                minHeight: 6,
              ),
            ),
            const SizedBox(height: 12),
            ..._checklist.asMap().entries.map((e) {
              final i = e.key;
              final item = e.value;
              return CheckboxListTile(
                value: item['done'] == true,
                onChanged: _order.status == 'Concluída' ? null : (v) {
                  setState(() => _checklist[i] = {...item, 'done': v});
                },
                title: Text(item['label'] as String,
                    style: TextStyle(
                      color: item['done'] == true
                          ? const Color(0xFF10B981)
                          : Colors.white.withOpacity(0.8),
                      fontSize: 13,
                      decoration: item['done'] == true ? TextDecoration.lineThrough : null,
                    )),
                activeColor: const Color(0xFF3B82F6),
                checkColor: Colors.white,
                controlAffinity: ListTileControlAffinity.leading,
                contentPadding: EdgeInsets.zero,
                dense: true,
              );
            }),
          ]),
        ),
        const SizedBox(height: 12),

        // Photos before/after
        _SectionCard(
          title: 'Evidências Fotográficas',
          icon: Icons.camera_alt_outlined,
          iconColor: const Color(0xFF8B5CF6),
          child: Row(children: [
            _PhotoSlot(
              label: 'Antes',
              file: _photoBefore,
              url: _order.photoBeforeUrl,
              color: const Color(0xFFEF4444),
              onTap: _order.status == 'Concluída' ? null : () => _pickPhoto(true),
            ),
            const SizedBox(width: 12),
            _PhotoSlot(
              label: 'Depois',
              file: _photoAfter,
              url: _order.photoAfterUrl,
              color: const Color(0xFF10B981),
              onTap: _order.status == 'Concluída' ? null : () => _pickPhoto(false),
            ),
          ]),
        ),
        const SizedBox(height: 12),

        // Resolution report
        _SectionCard(
          title: 'Relatório de Execução',
          icon: Icons.description_outlined,
          iconColor: const Color(0xFF06B6D4),
          child: TextFormField(
            controller: _reportCtrl,
            maxLines: 4,
            enabled: _order.status != 'Concluída',
            style: const TextStyle(color: Colors.white, fontSize: 13),
            decoration: InputDecoration(
              hintText: 'Descreva o serviço executado...',
              hintStyle: TextStyle(color: Colors.white.withOpacity(0.25), fontSize: 12),
              filled: true,
              fillColor: Colors.white.withOpacity(0.04),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(10),
                borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
              ),
            ),
          ),
        ),
        const SizedBox(height: 12),

        // Digital Signature
        _SectionCard(
          title: 'Assinatura Digital',
          icon: Icons.draw_outlined,
          iconColor: const Color(0xFFF59E0B),
          child: _signatureUrl != null
              ? Row(children: [
                  const Icon(Icons.verified, color: Color(0xFF10B981), size: 20),
                  const SizedBox(width: 8),
                  const Text('Assinatura registada', style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.w600)),
                ])
              : OutlinedButton.icon(
                  onPressed: _order.status == 'Concluída' ? null : () => setState(() => _showSignature = true),
                  icon: const Icon(Icons.draw, size: 16),
                  label: const Text('Assinar digitalmente'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFFF59E0B),
                    side: const BorderSide(color: Color(0xFFF59E0B)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                ),
        ),
        const SizedBox(height: 80),
      ],
    );
  }

  Widget _buildSignaturePanel() {
    return Column(children: [
      Container(
        color: const Color(0xFF1A2332),
        padding: const EdgeInsets.all(16),
        child: const Row(children: [
          Icon(Icons.draw_outlined, color: Color(0xFFF59E0B)),
          SizedBox(width: 12),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('Assinatura Digital', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            Text('Desenhe a assinatura na área abaixo', style: TextStyle(color: Colors.white54, fontSize: 12)),
          ]),
        ]),
      ),
      Expanded(
        child: Signature(
          controller: _signatureCtrl,
          backgroundColor: const Color(0xFF0D1117),
        ),
      ),
      Container(
        color: const Color(0xFF1A2332),
        padding: const EdgeInsets.all(16),
        child: Row(children: [
          Expanded(
            child: OutlinedButton.icon(
              onPressed: () { _signatureCtrl.clear(); setState(() => _showSignature = false); },
              icon: const Icon(Icons.close),
              label: const Text('Cancelar'),
              style: OutlinedButton.styleFrom(
                foregroundColor: Colors.white54,
                side: const BorderSide(color: Colors.white24),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: ElevatedButton.icon(
              onPressed: _exportSignature,
              icon: const Icon(Icons.check, color: Colors.white),
              label: const Text('Confirmar', style: TextStyle(color: Colors.white)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFF59E0B),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            ),
          ),
        ]),
      ),
    ]);
  }

  Widget _buildActionBar() {
    if (_order.status == 'Concluída') {
      return Container(
        color: const Color(0xFF1A2332),
        padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
        child: Row(children: [
          const Icon(Icons.check_circle, color: Color(0xFF10B981)),
          const SizedBox(width: 8),
          const Text('OS Concluída', style: TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold)),
        ]),
      );
    }

    return Container(
      color: const Color(0xFF1A2332),
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 24),
      child: Row(children: [
        if (_order.status == 'Aberta')
          Expanded(
            child: OutlinedButton(
              onPressed: _saving ? null : () => _saveProgress('Em Execução'),
              style: OutlinedButton.styleFrom(
                foregroundColor: const Color(0xFF3B82F6),
                side: const BorderSide(color: Color(0xFF3B82F6)),
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
              child: const Text('Iniciar Execução', style: TextStyle(fontWeight: FontWeight.bold)),
            ),
          ),
        if (_order.status == 'Aberta') const SizedBox(width: 10),
        Expanded(
          child: ElevatedButton(
            onPressed: _saving ? null : () => _saveProgress('Concluída'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF10B981),
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: _saving
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Text('Concluir OS', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
          ),
        ),
      ]),
    );
  }

  @override
  void dispose() {
    _reportCtrl.dispose();
    _signatureCtrl.dispose();
    super.dispose();
  }
}

class _SectionCard extends StatelessWidget {
  final String title;
  final IconData icon;
  final Color iconColor;
  final Widget child;

  const _SectionCard({required this.title, required this.icon, required this.iconColor, required this.child});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.07)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Icon(icon, color: iconColor, size: 16),
          const SizedBox(width: 8),
          Text(title, style: TextStyle(color: iconColor, fontWeight: FontWeight.bold, fontSize: 13)),
        ]),
        const SizedBox(height: 14),
        child,
      ]),
    );
  }
}

class _PhotoSlot extends StatelessWidget {
  final String label;
  final File? file;
  final String? url;
  final Color color;
  final VoidCallback? onTap;

  const _PhotoSlot({required this.label, this.file, this.url, required this.color, this.onTap});

  @override
  Widget build(BuildContext context) {
    return Expanded(
      child: GestureDetector(
        onTap: onTap,
        child: Container(
          height: 120,
          decoration: BoxDecoration(
            color: color.withOpacity(0.07),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: color.withOpacity(0.35)),
          ),
          child: file != null
              ? ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.file(file!, fit: BoxFit.cover))
              : url != null
                  ? ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.network(url!, fit: BoxFit.cover))
                  : Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Icon(Icons.camera_alt, color: color.withOpacity(0.7), size: 28),
                      const SizedBox(height: 6),
                      Text(label, style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 12)),
                    ]),
        ),
      ),
    );
  }
}
