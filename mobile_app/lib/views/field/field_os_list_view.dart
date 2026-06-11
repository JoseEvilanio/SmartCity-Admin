import 'package:flutter/material.dart';
import '../../models/service_order.dart';
import '../../services/supabase_service.dart';
import 'field_os_detail_view.dart';
import 'field_profile_view.dart';

class FieldOsListView extends StatefulWidget {
  const FieldOsListView({super.key});

  @override
  State<FieldOsListView> createState() => _FieldOsListViewState();
}

class _FieldOsListViewState extends State<FieldOsListView> {
  final _svc = SupabaseService();
  List<ServiceOrder> _orders = [];
  bool _loading = true;
  String _filter = 'Todas';
  String? _errorMessage;

  static const _filters = ['Todas', 'Aberta', 'Em Execução', 'Concluída'];

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() { _loading = true; _errorMessage = null; });
    try {
      final raw = await _svc.fetchServiceOrders();
      setState(() {
        _orders = raw.map(ServiceOrder.fromJson).toList();
      });
    } catch (e) {
      debugPrint('Error loading OS: $e');
      if (mounted) setState(() => _errorMessage = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  List<ServiceOrder> get _filtered => _filter == 'Todas'
      ? _orders
      : _orders.where((o) => o.status == _filter).toList();

  Color _priorityColor(String p) => switch (p) {
    'Crítica' => const Color(0xFFEF4444),
    'Alta' => const Color(0xFFF97316),
    'Média' => const Color(0xFFF59E0B),
    _ => const Color(0xFF10B981),
  };

  Color _statusColor(String s) => switch (s) {
    'Concluída' => const Color(0xFF10B981),
    'Em Execução' => const Color(0xFF3B82F6),
    'Cancelada' => const Color(0xFFEF4444),
    _ => const Color(0xFFF59E0B),
  };

  @override
  Widget build(BuildContext context) {
    final pending = _orders.where((o) => o.status == 'Aberta').length;

    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1A2332),
        foregroundColor: Colors.white,
        title: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          const Text('Ordens de Serviço', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          Text('${_orders.length} atribuídas • $pending pendentes',
              style: TextStyle(color: Colors.white.withOpacity(0.5), fontSize: 11)),
        ]),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Color(0xFFF59E0B)),
            onPressed: _load,
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.more_vert, color: Colors.white54),
            onSelected: (v) async {
              if (v == 'profile') {
                await Navigator.of(context).push(
                  MaterialPageRoute(builder: (_) => const FieldProfileView()),
                );
              } else if (v == 'logout') {
                await _svc.signOut();
                if (context.mounted) Navigator.of(context).pop();
              }
            },
            itemBuilder: (_) => [
              const PopupMenuItem(value: 'profile', child: ListTile(
                leading: Icon(Icons.person, color: Color(0xFFF59E0B)),
                title: Text('Meu Perfil'),
                dense: true,
                contentPadding: EdgeInsets.zero,
              )),
              const PopupMenuItem(value: 'logout', child: ListTile(
                leading: Icon(Icons.logout, color: Colors.white54),
                title: Text('Terminar sessão'),
                dense: true,
                contentPadding: EdgeInsets.zero,
              )),
            ],
          ),
        ],
        elevation: 0,
      ),
      body: Column(children: [
        // Stats row
        Container(
          color: const Color(0xFF1A2332),
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: Row(children: [
            _StatPill('Abertas', pending, const Color(0xFFF59E0B)),
            const SizedBox(width: 8),
            _StatPill('Em Execução', _orders.where((o) => o.status == 'Em Execução').length, const Color(0xFF3B82F6)),
            const SizedBox(width: 8),
            _StatPill('Concluídas', _orders.where((o) => o.status == 'Concluída').length, const Color(0xFF10B981)),
          ]),
        ),

        // Filter tabs
        Container(
          color: const Color(0xFF0D1117),
          padding: const EdgeInsets.fromLTRB(16, 12, 16, 0),
          child: Row(
            children: _filters.map((f) {
              final active = _filter == f;
              return Expanded(child: GestureDetector(
                onTap: () => setState(() => _filter = f),
                child: AnimatedContainer(
                  duration: const Duration(milliseconds: 180),
                  margin: const EdgeInsets.only(right: 6),
                  padding: const EdgeInsets.symmetric(vertical: 8),
                  decoration: BoxDecoration(
                    color: active ? const Color(0xFFF59E0B).withOpacity(0.15) : Colors.transparent,
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(
                      color: active ? const Color(0xFFF59E0B) : Colors.white.withOpacity(0.1),
                    ),
                  ),
                  child: Text(f, textAlign: TextAlign.center, style: TextStyle(
                    color: active ? const Color(0xFFF59E0B) : Colors.white.withOpacity(0.45),
                    fontSize: 11, fontWeight: active ? FontWeight.bold : FontWeight.normal,
                  )),
                ),
              ));
            }).toList(),
          ),
        ),
        const SizedBox(height: 12),

        // List
        Expanded(
          child: _loading
              ? const Center(child: CircularProgressIndicator(color: Color(0xFFF59E0B)))
              : _errorMessage != null
                  ? Center(child: Padding(
                      padding: const EdgeInsets.all(24),
                      child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                        const Icon(Icons.error_outline, size: 56, color: Color(0xFFEF4444)),
                        const SizedBox(height: 12),
                        const Text('Erro ao carregar OS', style: TextStyle(color: Color(0xFFEF4444), fontWeight: FontWeight.bold, fontSize: 16)),
                        const SizedBox(height: 8),
                        Text(_errorMessage!, style: const TextStyle(color: Colors.white54, fontSize: 11), textAlign: TextAlign.center),
                        const SizedBox(height: 16),
                        ElevatedButton.icon(
                          onPressed: _load,
                          icon: const Icon(Icons.refresh),
                          label: const Text('Tentar novamente'),
                          style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFF59E0B)),
                        ),
                      ]),
                    ))
                  : _filtered.isEmpty
                  ? Center(child: Column(mainAxisAlignment: MainAxisAlignment.center, children: [
                      Icon(Icons.assignment_outlined, size: 56, color: Colors.white.withOpacity(0.15)),
                      const SizedBox(height: 12),
                      Text('Nenhuma OS nesta categoria', style: TextStyle(color: Colors.white.withOpacity(0.3))),
                    ]))
                  : RefreshIndicator(
                      onRefresh: _load,
                      color: const Color(0xFFF59E0B),
                      child: ListView.separated(
                        padding: const EdgeInsets.fromLTRB(16, 0, 16, 30),
                        itemCount: _filtered.length,
                        separatorBuilder: (_, __) => const SizedBox(height: 10),
                        itemBuilder: (ctx, i) {
                          final os = _filtered[i];
                          return _OsCard(
                            order: os,
                            priorityColor: _priorityColor(os.priority),
                            statusColor: _statusColor(os.status),
                            onTap: () async {
                              final updated = await Navigator.of(ctx).push<ServiceOrder>(
                                MaterialPageRoute(builder: (_) => FieldOsDetailView(order: os)),
                              );
                              if (updated != null) _load();
                            },
                          );
                        },
                      ),
                    ),
        ),
      ]),
    );
  }
}

class _StatPill extends StatelessWidget {
  final String label;
  final int count;
  final Color color;
  const _StatPill(this.label, this.count, this.color);

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(children: [
        Text('$count', style: TextStyle(color: color, fontWeight: FontWeight.bold, fontSize: 16)),
        Text(label, style: TextStyle(color: color.withOpacity(0.7), fontSize: 10)),
      ]),
    );
  }
}

class _OsCard extends StatelessWidget {
  final ServiceOrder order;
  final Color priorityColor;
  final Color statusColor;
  final VoidCallback onTap;

  const _OsCard({required this.order, required this.priorityColor, required this.statusColor, required this.onTap});

  @override
  Widget build(BuildContext context) {
    final title = order.occurrence?['title'] as String? ?? 'Ocorrência #${order.occurrenceId.substring(0, 8)}';
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white.withOpacity(0.04),
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: priorityColor.withOpacity(0.25)),
        ),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Row(children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: priorityColor.withOpacity(0.15),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(order.priority, style: TextStyle(color: priorityColor, fontSize: 10, fontWeight: FontWeight.bold)),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.12),
                borderRadius: BorderRadius.circular(6),
              ),
              child: Text(order.status, style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold)),
            ),
            const Spacer(),
            Text(order.osNumber, style: const TextStyle(color: Color(0xFFF59E0B), fontSize: 11, fontWeight: FontWeight.bold)),
          ]),
          const SizedBox(height: 10),
          Text(title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 14)),
          if (order.deadline != null) ...[
            const SizedBox(height: 6),
            Row(children: [
              Icon(Icons.schedule, size: 12, color: Colors.white.withOpacity(0.35)),
              const SizedBox(width: 4),
              Text('Prazo: ${order.deadline!.substring(0, 10)}',
                  style: TextStyle(color: Colors.white.withOpacity(0.35), fontSize: 11)),
            ]),
          ],
          const SizedBox(height: 8),
          Row(children: [
            const Spacer(),
            Icon(Icons.arrow_forward_ios, size: 12, color: Colors.white.withOpacity(0.3)),
          ]),
        ]),
      ),
    );
  }
}
