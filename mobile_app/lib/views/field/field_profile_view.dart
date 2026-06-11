import 'package:flutter/material.dart';
import '../../services/supabase_service.dart';

class FieldProfileView extends StatefulWidget {
  const FieldProfileView({super.key});

  @override
  State<FieldProfileView> createState() => _FieldProfileViewState();
}

class _FieldProfileViewState extends State<FieldProfileView> {
  final _svc = SupabaseService();
  final _currentPassCtrl = TextEditingController();
  final _newPassCtrl = TextEditingController();
  final _confirmPassCtrl = TextEditingController();

  String? _name;
  String? _email;
  String? _role;
  bool _loadingProfile = true;
  bool _saving = false;
  String? _error;
  String? _success;

  @override
  void initState() {
    super.initState();
    _loadProfile();
  }

  Future<void> _loadProfile() async {
    setState(() => _loadingProfile = true);
    try {
      final profile = await _svc.getCurrentProfile();
      if (profile != null) {
        setState(() {
          _name = profile['name'] as String?;
          _email = profile['email'] as String?;
          _role = profile['role'] as String?;
        });
      } else {
        final user = _svc.currentUser;
        setState(() {
          _name = user?.userMetadata?['name'] as String? ?? 'Operador';
          _email = user?.email;
        });
      }
    } catch (_) {}
    if (mounted) setState(() => _loadingProfile = false);
  }

  Future<void> _changePassword() async {
    final newPass = _newPassCtrl.text.trim();
    final confirm = _confirmPassCtrl.text.trim();

    if (newPass.isEmpty || newPass.length < 6) {
      setState(() { _error = 'A senha deve ter no mínimo 6 caracteres.'; _success = null; });
      return;
    }
    if (newPass != confirm) {
      setState(() { _error = 'As senhas não coincidem.'; _success = null; });
      return;
    }

    setState(() { _saving = true; _error = null; _success = null; });
    try {
      await _svc.updatePassword(newPass);
      setState(() {
        _success = 'Senha alterada com sucesso!';
        _error = null;
      });
      _currentPassCtrl.clear();
      _newPassCtrl.clear();
      _confirmPassCtrl.clear();
    } catch (e) {
      setState(() { _error = 'Erro ao alterar senha: $e'; _success = null; });
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0D1117),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1A2332),
        foregroundColor: Colors.white,
        title: const Text('Meu Perfil', style: TextStyle(fontWeight: FontWeight.bold)),
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.all(20),
        children: [
          // Avatar
          Center(
            child: Container(
              width: 80, height: 80,
              decoration: BoxDecoration(
                gradient: const LinearGradient(colors: [Color(0xFFF59E0B), Color(0xFFEF4444)]),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [BoxShadow(color: const Color(0xFFF59E0B).withOpacity(0.3), blurRadius: 20, spreadRadius: 2)],
              ),
              child: Center(
                child: Text(
                  (_name ?? 'OP').substring(0, 2).toUpperCase(),
                  style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white),
                ),
              ),
            ),
          ),
          const SizedBox(height: 16),

          // User info card
          if (_loadingProfile)
            const Center(child: Padding(
              padding: EdgeInsets.all(20),
              child: CircularProgressIndicator(color: Color(0xFFF59E0B)),
            ))
          else
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.04),
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.white.withOpacity(0.08)),
              ),
              child: Column(children: [
                _infoRow(Icons.person, 'Nome', _name ?? '---'),
                const Divider(color: Colors.white12, height: 20),
                _infoRow(Icons.email_outlined, 'Email', _email ?? '---'),
                if (_role != null) ...[
                  const Divider(color: Colors.white12, height: 20),
                  _infoRow(Icons.badge_outlined, 'Cargo', _role!.toUpperCase()),
                ],
              ]),
            ),
          const SizedBox(height: 24),

          // Change password section
          Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.04),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              Row(children: [
                Icon(Icons.lock_outline, color: const Color(0xFFF59E0B), size: 16),
                const SizedBox(width: 8),
                const Text('Alterar Senha', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
              ]),
              const SizedBox(height: 16),
              _field(_newPassCtrl, 'Nova senha', Icons.lock_outlined, true),
              const SizedBox(height: 12),
              _field(_confirmPassCtrl, 'Confirmar nova senha', Icons.lock_outlined, true),
              const SizedBox(height: 16),
              if (_error != null)
                Container(
                  padding: const EdgeInsets.all(10),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: Colors.red.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.red.withOpacity(0.3)),
                  ),
                  child: Row(children: [
                    const Icon(Icons.error_outline, color: Colors.redAccent, size: 16),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 12))),
                  ]),
                ),
              if (_success != null)
                Container(
                  padding: const EdgeInsets.all(10),
                  margin: const EdgeInsets.only(bottom: 12),
                  decoration: BoxDecoration(
                    color: Colors.green.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: Colors.green.withOpacity(0.3)),
                  ),
                  child: Row(children: [
                    const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 16),
                    const SizedBox(width: 8),
                    Expanded(child: Text(_success!, style: const TextStyle(color: Color(0xFF10B981), fontSize: 12))),
                  ]),
                ),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _saving ? null : _changePassword,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFFF59E0B),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: _saving
                      ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                      : const Text('Alterar Senha', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                ),
              ),
            ]),
          ),
        ],
      ),
    );
  }

  Widget _infoRow(IconData icon, String label, String value) {
    return Row(children: [
      Icon(icon, color: const Color(0xFFF59E0B), size: 16),
      const SizedBox(width: 10),
      Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
        Text(label, style: TextStyle(color: Colors.white.withOpacity(0.4), fontSize: 11)),
        const SizedBox(height: 2),
        Text(value, style: const TextStyle(color: Colors.white, fontSize: 14, fontWeight: FontWeight.w600)),
      ]),
    ]);
  }

  Widget _field(TextEditingController ctrl, String label, IconData icon, bool obscure) {
    return TextFormField(
      controller: ctrl,
      obscureText: obscure,
      style: const TextStyle(color: Colors.white),
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: Colors.white.withOpacity(0.5)),
        prefixIcon: Icon(icon, color: const Color(0xFFF59E0B), size: 18),
        enabledBorder: OutlineInputBorder(
          borderSide: BorderSide(color: Colors.white.withOpacity(0.12)),
          borderRadius: BorderRadius.circular(10),
        ),
        focusedBorder: OutlineInputBorder(
          borderSide: const BorderSide(color: Color(0xFFF59E0B)),
          borderRadius: BorderRadius.circular(10),
        ),
        filled: true,
        fillColor: Colors.white.withOpacity(0.04),
      ),
    );
  }

  @override
  void dispose() {
    _currentPassCtrl.dispose();
    _newPassCtrl.dispose();
    _confirmPassCtrl.dispose();
    super.dispose();
  }
}
