import 'package:flutter/material.dart';
import '../../models/occurrence.dart';
import '../../models/profile.dart';
import '../../services/supabase_service.dart';

class CitizenHistoryView extends StatefulWidget {
  const CitizenHistoryView({super.key});

  @override
  State<CitizenHistoryView> createState() => _CitizenHistoryViewState();
}

class _CitizenHistoryViewState extends State<CitizenHistoryView> {
  final _svc = SupabaseService();
  List<Occurrence> _occurrences = [];
  UserProfile? _profile;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final user = _svc.currentUser;
      if (user != null) {
        final profileData = await _svc.getProfile(user.id);
        if (profileData != null) {
          _profile = UserProfile.fromJson(profileData);
        }
      }
      final raw = await _svc.fetchOccurrences();
      setState(() {
        _occurrences = raw.map(Occurrence.fromJson).toList();
      });
    } catch (e) {
      debugPrint('Error loading history: $e');
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Color _statusColor(String s) => switch (s) {
    'Resolvido' => const Color(0xFF10B981),
    'Em Resolução' || 'Em atendimento' => const Color(0xFF3B82F6),
    'Rejeitado' || 'Cancelado' => const Color(0xFFEF4444),
    _ => const Color(0xFFF59E0B),
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        foregroundColor: Colors.white,
        title: const Text('Meu Histórico', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF3B82F6)))
          : RefreshIndicator(
              onRefresh: _load,
              color: const Color(0xFF3B82F6),
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  // Gamification card
                  if (_profile != null) _buildProfileCard(_profile!),
                  const SizedBox(height: 24),

                  Text(
                    'Ocorrências registadas (${_occurrences.length})',
                    style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 13, fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 12),

                  if (_occurrences.isEmpty)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.only(top: 40),
                        child: Column(children: [
                          Icon(Icons.inbox_outlined, size: 56, color: Colors.white.withOpacity(0.2)),
                          const SizedBox(height: 12),
                          Text('Nenhuma ocorrência registada ainda.',
                              style: TextStyle(color: Colors.white.withOpacity(0.35))),
                        ]),
                      ),
                    )
                  else
                    ...(_occurrences.map((o) => Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _HistoryTile(occurrence: o, statusColor: _statusColor(o.status)),
                        ))),
                ],
              ),
            ),
    );
  }

  Widget _buildProfileCard(UserProfile profile) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF1E3A5F), Color(0xFF1E293B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.3)),
      ),
      child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Row(children: [
          Container(
            width: 52, height: 52,
            decoration: BoxDecoration(
              gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF06B6D4)]),
              borderRadius: BorderRadius.circular(14),
            ),
            child: const Icon(Icons.emoji_events, color: Colors.white, size: 28),
          ),
          const SizedBox(width: 14),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text(profile.name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
            Text(profile.levelTitle, style: const TextStyle(color: Color(0xFF3B82F6), fontSize: 13, fontWeight: FontWeight.w600)),
          ]),
          const Spacer(),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
            decoration: BoxDecoration(
              color: const Color(0xFF3B82F6).withOpacity(0.15),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(color: const Color(0xFF3B82F6).withOpacity(0.4)),
            ),
            child: Text('${profile.points} pts', style: const TextStyle(color: Color(0xFF3B82F6), fontWeight: FontWeight.bold, fontSize: 13)),
          ),
        ]),
        const SizedBox(height: 16),
        // Progress bar
        Row(children: [
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(4),
              child: LinearProgressIndicator(
                value: profile.levelProgress.clamp(0.0, 1.0),
                backgroundColor: Colors.white.withOpacity(0.1),
                color: const Color(0xFF3B82F6),
                minHeight: 6,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Text(
            '${profile.nextLevelPoints} pts',
            style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 11),
          ),
        ]),
        const SizedBox(height: 6),
        Text('Para o próximo nível', style: TextStyle(color: Colors.white.withOpacity(0.35), fontSize: 11)),
      ]),
    );
  }
}

class _HistoryTile extends StatelessWidget {
  final Occurrence occurrence;
  final Color statusColor;
  const _HistoryTile({required this.occurrence, required this.statusColor});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white.withOpacity(0.04),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: Colors.white.withOpacity(0.07)),
      ),
      child: Row(children: [
        Container(
          width: 42, height: 42,
          decoration: BoxDecoration(
            color: statusColor.withOpacity(0.12),
            borderRadius: BorderRadius.circular(10),
          ),
          child: Icon(Icons.report_problem_outlined, color: statusColor, size: 20),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(occurrence.title, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 13),
              maxLines: 1, overflow: TextOverflow.ellipsis),
          const SizedBox(height: 3),
          Text('${occurrence.category} • ${occurrence.date}',
              style: TextStyle(color: Colors.white.withOpacity(0.35), fontSize: 11)),
        ])),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
          decoration: BoxDecoration(
            color: statusColor.withOpacity(0.12),
            borderRadius: BorderRadius.circular(6),
          ),
          child: Text(occurrence.status, style: TextStyle(color: statusColor, fontSize: 10, fontWeight: FontWeight.bold)),
        ),
      ]),
    );
  }
}
