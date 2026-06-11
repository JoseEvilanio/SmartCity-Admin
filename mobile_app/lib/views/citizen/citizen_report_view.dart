import 'dart:io';
import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import 'package:image_picker/image_picker.dart';
import 'package:uuid/uuid.dart';
import '../../services/supabase_service.dart';
import '../../services/offline_service.dart';

class CitizenReportView extends StatefulWidget {
  final Position? position;
  const CitizenReportView({super.key, this.position});

  @override
  State<CitizenReportView> createState() => _CitizenReportViewState();
}

class _CitizenReportViewState extends State<CitizenReportView> {
  final _formKey = GlobalKey<FormState>();
  final _titleCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _neighCtrl = TextEditingController();

  final _svc = SupabaseService();
  final _offline = OfflineService();
  final _picker = ImagePicker();

  String _category = 'Buraco na rua';
  String _priority = 'Médio';
  final List<File> _photos = [];
  bool _submitting = false;

  static const _categories = [
    'Buraco na rua', 'Vazamento de água', 'Falta de iluminação', 'Poste danificado',
    'Esgoto a céu aberto', 'Lixo acumulado', 'Semáforo quebrado', 'Árvore caída',
    'Alagamento', 'Transporte público', 'Segurança pública', 'Calçada danificada',
    'Animais abandonados', 'Outros',
  ];

  static const _priorities = ['Baixo', 'Médio', 'Alto', 'Crítico'];

  Future<void> _pickPhoto() async {
    if (_photos.length >= 5) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Máximo de 5 fotos por ocorrência')),
      );
      return;
    }
    final xFile = await _picker.pickImage(source: ImageSource.camera, imageQuality: 80);
    if (xFile != null) setState(() => _photos.add(File(xFile.path)));
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);

    try {
      final user = _svc.currentUser;
      final id = const Uuid().v4();
      final now = DateTime.now();

      // Upload photos if online
      final mediaUrls = <String>[];
      if (_offline.isOnline) {
        for (final photo in _photos) {
          final url = await _svc.uploadEvidence(id, photo, 'jpg');
          mediaUrls.add(url);
        }
      }

      final payload = {
        'id': id,
        'title': _titleCtrl.text.trim(),
        'description': _descCtrl.text.trim(),
        'category': _category,
        'priority': _priority,
        'status': 'Aberto',
        'municipality': 'Auto-detectado',
        'reporter': user?.email ?? 'Cidadão',
        'date': '${now.day} de ${_monthName(now.month)}, ${now.year}',
        'neighborhood': _neighCtrl.text.trim().isEmpty ? null : _neighCtrl.text.trim(),
        'latitude': widget.position?.latitude,
        'longitude': widget.position?.longitude,
        'created_by': user?.id,
      };

      if (_offline.isOnline) {
        await _svc.insertRaw('occurrences', payload);
        for (final mediaUrl in mediaUrls) {
          await _svc.insertRaw('occurrence_media', {
            'occurrence_id': id,
            'media_url': mediaUrl,
            'media_type': 'image',
            'created_by': user?.id,
          });
        }
      } else {
        // When offline, include media urls placeholder for sync later
        if (mediaUrls.isNotEmpty) {
          payload['media_urls'] = mediaUrls;
        }
        await _offline.queueAction(table: 'occurrences', actionType: 'INSERT', payload: payload);
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('📴 Salvo offline. Será enviado quando houver conexão.'),
            backgroundColor: Color(0xFFF59E0B),
          ),
        );
      }

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('✅ Ocorrência registada! +20 pontos'),
          backgroundColor: Color(0xFF10B981),
        ),
      );
      Navigator.of(context).pop(true);
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Erro: $e'), backgroundColor: Colors.redAccent),
        );
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  String _monthName(int m) => const [
    '', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
    'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
  ][m];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        foregroundColor: Colors.white,
        title: const Text('Reportar Ocorrência', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
      ),
      body: Form(
        key: _formKey,
        child: ListView(
          padding: const EdgeInsets.all(20),
          children: [
            // Location badge
            if (widget.position != null)
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFF10B981).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
                ),
                child: Row(children: [
                  const Icon(Icons.location_on, color: Color(0xFF10B981), size: 16),
                  const SizedBox(width: 8),
                  Text(
                    'GPS: ${widget.position!.latitude.toStringAsFixed(5)}, ${widget.position!.longitude.toStringAsFixed(5)}',
                    style: const TextStyle(color: Color(0xFF10B981), fontSize: 12, fontWeight: FontWeight.w600),
                  ),
                ]),
              )
            else
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withOpacity(0.1),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.3)),
                ),
                child: const Row(children: [
                  Icon(Icons.location_off, color: Color(0xFFF59E0B), size: 16),
                  SizedBox(width: 8),
                  Text('GPS não disponível – preencha o bairro manualmente', style: TextStyle(color: Color(0xFFF59E0B), fontSize: 12)),
                ]),
              ),
            const SizedBox(height: 20),

            _label('Título da ocorrência'),
            _styledField(_titleCtrl, 'Ex: Buraco grande na Rua das Flores', maxLines: 1),
            const SizedBox(height: 16),

            _label('Categoria'),
            _dropdown(_category, _categories, (v) => setState(() => _category = v!)),
            const SizedBox(height: 16),

            _label('Prioridade'),
            _dropdown(_priority, _priorities, (v) => setState(() => _priority = v!)),
            const SizedBox(height: 16),

            _label('Bairro (opcional)'),
            _styledField(_neighCtrl, 'Ex: Centro, Vila Nova...', required: false, maxLines: 1),
            const SizedBox(height: 16),

            _label('Descrição detalhada'),
            _styledField(_descCtrl, 'Descreva o problema com mais detalhes...', maxLines: 4),
            const SizedBox(height: 20),

            // Photos
            _label('Fotos (até 5)'),
            const SizedBox(height: 8),
            SizedBox(
              height: 100,
              child: ListView(
                scrollDirection: Axis.horizontal,
                children: [
                  ..._photos.map((f) => Padding(
                    padding: const EdgeInsets.only(right: 10),
                    child: ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.file(f, width: 100, height: 100, fit: BoxFit.cover),
                    ),
                  )),
                  if (_photos.length < 5)
                    GestureDetector(
                      onTap: _pickPhoto,
                      child: Container(
                        width: 100, height: 100,
                        decoration: BoxDecoration(
                          color: Colors.white.withOpacity(0.05),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white.withOpacity(0.15), style: BorderStyle.solid),
                        ),
                        child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                          Icon(Icons.camera_alt, color: Colors.white.withOpacity(0.4)),
                          const SizedBox(height: 4),
                          Text('Adicionar', style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 11)),
                        ]),
                      ),
                    ),
                ],
              ),
            ),
            const SizedBox(height: 30),

            SizedBox(
              width: double.infinity, height: 54,
              child: ElevatedButton.icon(
                onPressed: _submitting ? null : _submit,
                icon: _submitting
                    ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.send_rounded, color: Colors.white),
                label: Text(
                  _submitting ? 'Enviando...' : 'Enviar Ocorrência',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16),
                ),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF3B82F6),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _label(String text) => Padding(
    padding: const EdgeInsets.only(bottom: 6),
    child: Text(text, style: TextStyle(color: Colors.white.withOpacity(0.7), fontSize: 13, fontWeight: FontWeight.w600)),
  );

  Widget _styledField(TextEditingController ctrl, String hint, {bool required = true, int maxLines = 1}) {
    return TextFormField(
      controller: ctrl,
      maxLines: maxLines,
      style: const TextStyle(color: Colors.white, fontSize: 14),
      validator: required ? (v) => (v == null || v.isEmpty) ? 'Campo obrigatório' : null : null,
      decoration: InputDecoration(
        hintText: hint,
        hintStyle: TextStyle(color: Colors.white.withOpacity(0.25), fontSize: 13),
        filled: true,
        fillColor: Colors.white.withOpacity(0.05),
        border: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
        ),
        enabledBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: BorderSide(color: Colors.white.withOpacity(0.1)),
        ),
        focusedBorder: OutlineInputBorder(
          borderRadius: BorderRadius.circular(12),
          borderSide: const BorderSide(color: Color(0xFF3B82F6)),
        ),
      ),
    );
  }

  Widget _dropdown(String value, List<String> items, ValueChanged<String?> onChanged) {
    return DropdownButtonFormField<String>(
      value: value,
      onChanged: onChanged,
      dropdownColor: const Color(0xFF1E293B),
      style: const TextStyle(color: Colors.white, fontSize: 14),
      decoration: InputDecoration(
        filled: true,
        fillColor: Colors.white.withOpacity(0.05),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.white.withOpacity(0.1))),
        enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide(color: Colors.white.withOpacity(0.1))),
        focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFF3B82F6))),
      ),
      items: items.map((v) => DropdownMenuItem(value: v, child: Text(v))).toList(),
    );
  }

  @override
  void dispose() {
    _titleCtrl.dispose(); _descCtrl.dispose(); _neighCtrl.dispose();
    super.dispose();
  }
}
