import 'package:flutter/material.dart';
import 'package:geolocator/geolocator.dart';
import '../../models/occurrence.dart';
import '../../services/supabase_service.dart';
import '../../services/offline_service.dart';
import 'citizen_report_view.dart';
import 'citizen_history_view.dart';

class CitizenDashboardView extends StatefulWidget {
  const CitizenDashboardView({super.key});

  @override
  State<CitizenDashboardView> createState() => _CitizenDashboardViewState();
}

class _CitizenDashboardViewState extends State<CitizenDashboardView> {
  int _tab = 0;
  List<Occurrence> _occurrences = [];
  bool _loading = true;
  final _svc = SupabaseService();
  final _offline = OfflineService();
  Position? _position;

  static const _categories = [
    ('Todos', Icons.grid_view_rounded, Color(0xFF3B82F6)),
    ('Trânsito', Icons.traffic, Color(0xFFF59E0B)),
    ('Infraestrutura', Icons.construction, Color(0xFFEF4444)),
    ('Saneamento', Icons.water_drop, Color(0xFF06B6D4)),
    ('Ambiente', Icons.eco, Color(0xFF10B981)),
  ];

  String _activeCategory = 'Todos';

  @override
  void initState() {
    super.initState();
    _init();
  }

  Future<void> _init() async {
    await _offline.init();
    await _loadLocation();
    await _loadOccurrences();
  }

  Future<void> _loadLocation() async {
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) return;
      LocationPermission perm = await Geolocator.checkPermission();
      if (perm == LocationPermission.denied) {
        perm = await Geolocator.requestPermission();
      }
      if (perm == LocationPermission.denied || perm == LocationPermission.deniedForever) return;
      _position = await Geolocator.getCurrentPosition();
    } catch (_) {}
  }

  Future<void> _loadOccurrences() async {
    setState(() => _loading = true);
    try {
      final raw = await _svc.fetchOccurrences();
      setState(() {
        _occurrences = raw.map(Occurrence.fromJson).toList();
      });
    } catch (_) {
      final cached = await _offline.getCachedData('occurrences');
      if (cached != null) {
        setState(() {
          _occurrences = (cached as List).map((e) => Occurrence.fromJson(Map<String, dynamic>.from(e))).toList();
        });
      }
    } finally {
      setState(() => _loading = false);
    }
  }

  List<Occurrence> get _filtered => _activeCategory == 'Todos'
      ? _occurrences
      : _occurrences.where((o) => o.category == _activeCategory).toList();

  Color _priorityColor(String p) => switch (p) {
    'Crítico' => const Color(0xFFEF4444),
    'Alto' => const Color(0xFFF97316),
    'Médio' => const Color(0xFFF59E0B),
    _ => const Color(0xFF10B981),
  };

  Color _statusColor(String s) => switch (s) {
    'Resolvido' || 'Concluída' => const Color(0xFF10B981),
    'Em Resolução' || 'Em atendimento' => const Color(0xFF3B82F6),
    _ => const Color(0xFFF59E0B),
  };

  @override
  Widget build(BuildContext context) {
    final user = _svc.currentUser;
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      body: SafeArea(
        child: Column(children: [
          // Header
          Padding(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 0),
            child: Row(children: [
              Container(
                width: 44, height: 44,
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF06B6D4)]),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.location_city, color: Colors.white, size: 24),
              ),
              const SizedBox(width: 12),
              Expanded(child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('SmartCity', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                  Text(user?.email ?? 'Cidadão', style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 12)),
                ],
              )),
              IconButton(
                icon: Icon(Icons.refresh, color: Colors.white.withOpacity(0.6)),
                onPressed: _loadOccurrences,
              ),
            ]),
          ),
          const SizedBox(height: 20),

          // Category filter chips
          SizedBox(
            height: 40,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 20),
              itemCount: _categories.length,
              separatorBuilder: (_, __) => const SizedBox(width: 8),
              itemBuilder: (ctx, i) {
                final (label, icon, color) = _categories[i];
                final active = _activeCategory == label;
                return GestureDetector(
                  onTap: () => setState(() => _activeCategory = label),
                  child: AnimatedContainer(
                    duration: const Duration(milliseconds: 200),
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      color: active ? color : color.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: active ? color : color.withOpacity(0.3)),
                    ),
                    child: Row(children: [
                      Icon(icon, size: 14, color: active ? Colors.white : color),
                      const SizedBox(width: 6),
                      Text(label, style: TextStyle(
                        color: active ? Colors.white : color,
                        fontSize: 12, fontWeight: FontWeight.w600,
                      )),
                    ]),
                  ),
                );
              },
            ),
          ),
          const SizedBox(height: 16),

          // Occurrences list
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6)))
                : _filtered.isEmpty
                    ? Center(child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(Icons.check_circle_outline, size: 60, color: Colors.white.withOpacity(0.2)),
                          const SizedBox(height: 12),
                          Text('Sem ocorrências nesta categoria', style: TextStyle(color: Colors.white.withOpacity(0.4))),
                        ],
                      ))
                    : RefreshIndicator(
                        onRefresh: _loadOccurrences,
                        color: const Color(0xFF3B82F6),
                        child: ListView.separated(
                          padding: const EdgeInsets.fromLTRB(20, 0, 20, 120),
                          itemCount: _filtered.length,
                          separatorBuilder: (_, __) => const SizedBox(height: 12),
                          itemBuilder: (ctx, i) {
                            final o = _filtered[i];
                            return _OccurrenceCard(
                              occurrence: o,
                              priorityColor: _priorityColor(o.priority),
                              statusColor: _statusColor(o.status),
                              onConfirm: () async {
                                try {
                                  await _svc.confirmOccurrence(o.id);
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    const SnackBar(content: Text('✅ Confirmação registada! +5 pontos'), backgroundColor: Color(0xFF10B981)),
                                  );
                                } catch (e) {
                                  ScaffoldMessenger.of(context).showSnackBar(
                                    SnackBar(content: Text('Erro: $e'), backgroundColor: Colors.redAccent),
                                  );
                                }
                              },
                            );
                          },
                        ),
                      ),
          ),
        ]),
      ),

      // Bottom navigation
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: const Color(0xFF1E293B),
          border: Border(top: BorderSide(color: Colors.white.withOpacity(0.08))),
        ),
        child: BottomNavigationBar(
          currentIndex: _tab,
          backgroundColor: Colors.transparent,
          selectedItemColor: const Color(0xFF3B82F6),
          unselectedItemColor: Colors.white38,
          elevation: 0,
          onTap: (i) {
            if (i == 1) {
              Navigator.of(context).push(MaterialPageRoute(builder: (_) => const CitizenHistoryView()));
            } else {
              setState(() => _tab = i);
            }
          },
          items: const [
            BottomNavigationBarItem(icon: Icon(Icons.map_outlined), label: 'Mapa'),
            BottomNavigationBarItem(icon: Icon(Icons.history), label: 'Histórico'),
          ],
        ),
      ),

      // FAB – Reportar
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () async {
          final result = await Navigator.of(context).push<bool>(
            MaterialPageRoute(builder: (_) => CitizenReportView(position: _position)),
          );
          if (result == true) _loadOccurrences();
        },
        backgroundColor: const Color(0xFF3B82F6),
        icon: const Icon(Icons.add_location_alt, color: Colors.white),
        label: const Text('Reportar', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
      ),
      floatingActionButtonLocation: FloatingActionButtonLocation.centerDocked,
    );
  }
}

class _OccurrenceCard extends StatelessWidget {
  final Occurrence occurrence;
  final Color priorityColor;
  final Color statusColor;
  final VoidCallback onConfirm;

  const _OccurrenceCard({
    required this.occurrence,
    required this.priorityColor,
    required this.statusColor,
    required this.onConfirm,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.05),
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: Colors.white.withOpacity(0.08)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: priorityColor.withOpacity(0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(occurrence.priority, style: TextStyle(color: priorityColor, fontSize: 10, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 8),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.15),
              borderRadius: BorderRadius.circular(6),
            ),
            child: Text(occurrence.status, style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold)),
          ),
          const Spacer(),
          Text(occurrence.date, style: TextStyle(color: Colors.white.withOpacity(0.35), fontSize: 11)),
        ]),
        const SizedBox(height: 10),
        Text(occurrence.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14)),
        if (occurrence.neighborhood != null) ...[
          const SizedBox(height: 4),
          Row(children: [
            Icon(Icons.location_on, size: 12, color: Colors.white.withOpacity(0.4)),
            const SizedBox(width: 4),
            Text(occurrence.neighborhood!, style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 12)),
          ]),
        ],
        const SizedBox(height: 12),
        Row(children: [
          Icon(Icons.person_outline, size: 12, color: Colors.white.withOpacity(0.35)),
          const SizedBox(width: 4),
          Text(occurrence.reporter, style: TextStyle(color: Colors.white.withOpacity(0.35), fontSize: 12)),
          const Spacer(),
          TextButton.icon(
            onPressed: onConfirm,
            icon: const Icon(Icons.thumb_up_outlined, size: 14),
            label: const Text('Confirmar', style: TextStyle(fontSize: 12)),
            style: TextButton.styleFrom(
              foregroundColor: const Color(0xFF3B82F6),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
          ),
        ]),
      ]),
    );
  }
}
