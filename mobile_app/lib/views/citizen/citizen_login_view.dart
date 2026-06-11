import 'package:flutter/material.dart';
import '../../services/supabase_service.dart';
import 'citizen_dashboard_view.dart';

class CitizenLoginView extends StatefulWidget {
  const CitizenLoginView({super.key});

  @override
  State<CitizenLoginView> createState() => _CitizenLoginViewState();
}

class _CitizenLoginViewState extends State<CitizenLoginView> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  final _nameCtrl = TextEditingController();
  final _svc = SupabaseService();

  bool _isSignUp = false;
  bool _loading = false;
  String? _error;

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() { _loading = true; _error = null; });
    try {
      if (_isSignUp) {
        await _svc.signUp(_emailCtrl.text.trim(), _passCtrl.text, _nameCtrl.text.trim());
      } else {
        await _svc.signIn(_emailCtrl.text.trim(), _passCtrl.text);
      }
      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const CitizenDashboardView()),
        );
      }
    } catch (e) {
      setState(() { _error = e.toString(); });
    } finally {
      if (mounted) setState(() { _loading = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF0F172A), Color(0xFF1E3A5F), Color(0xFF0F172A)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(28),
              child: Column(children: [
                // Logo & Title
                Container(
                  width: 80, height: 80,
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(colors: [Color(0xFF3B82F6), Color(0xFF06B6D4)]),
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Icon(Icons.location_city, size: 44, color: Colors.white),
                ),
                const SizedBox(height: 20),
                const Text('SmartCity Cidadão', style: TextStyle(
                  fontSize: 28, fontWeight: FontWeight.bold, color: Colors.white,
                )),
                const SizedBox(height: 8),
                Text(
                  _isSignUp ? 'Crie a sua conta gratuitamente' : 'Entre para reportar ocorrências',
                  style: TextStyle(color: Colors.white.withOpacity(0.6), fontSize: 14),
                ),
                const SizedBox(height: 36),

                // Form Card
                Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white.withOpacity(0.05),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.white.withOpacity(0.1)),
                  ),
                  child: Form(
                    key: _formKey,
                    child: Column(children: [
                      if (_isSignUp) _field(_nameCtrl, 'Nome completo', Icons.person, false),
                      if (_isSignUp) const SizedBox(height: 14),
                      _field(_emailCtrl, 'E-mail', Icons.email_outlined, false),
                      const SizedBox(height: 14),
                      _field(_passCtrl, 'Senha', Icons.lock_outlined, true),
                      if (_error != null) ...[
                        const SizedBox(height: 14),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.withOpacity(0.15),
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.red.withOpacity(0.3)),
                          ),
                          child: Row(children: [
                            const Icon(Icons.error_outline, color: Colors.redAccent, size: 16),
                            const SizedBox(width: 8),
                            Expanded(child: Text(_error!, style: const TextStyle(color: Colors.redAccent, fontSize: 12))),
                          ]),
                        ),
                      ],
                      const SizedBox(height: 20),
                      SizedBox(
                        width: double.infinity, height: 52,
                        child: ElevatedButton(
                          onPressed: _loading ? null : _submit,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF3B82F6),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          ),
                          child: _loading
                              ? const SizedBox(width: 22, height: 22, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                              : Text(_isSignUp ? 'Criar Conta' : 'Entrar', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 16)),
                        ),
                      ),
                    ]),
                  ),
                ),
                const SizedBox(height: 20),
                TextButton(
                  onPressed: () => setState(() { _isSignUp = !_isSignUp; _error = null; }),
                  child: RichText(text: TextSpan(
                    style: const TextStyle(fontSize: 14),
                    children: [
                      TextSpan(
                        text: _isSignUp ? 'Já tem conta? ' : 'Não tem conta? ',
                        style: TextStyle(color: Colors.white.withOpacity(0.5)),
                      ),
                      TextSpan(
                        text: _isSignUp ? 'Faça login' : 'Registre-se',
                        style: const TextStyle(color: Color(0xFF3B82F6), fontWeight: FontWeight.bold),
                      ),
                    ],
                  )),
                ),
              ]),
            ),
          ),
        ),
      ),
    );
  }

  Widget _field(TextEditingController ctrl, String label, IconData icon, bool obscure) {
    return TextFormField(
      controller: ctrl,
      obscureText: obscure,
      style: const TextStyle(color: Colors.white),
      validator: (v) => (v == null || v.isEmpty) ? 'Campo obrigatório' : null,
      decoration: InputDecoration(
        labelText: label,
        labelStyle: TextStyle(color: Colors.white.withOpacity(0.6)),
        prefixIcon: Icon(icon, color: const Color(0xFF3B82F6), size: 20),
        enabledBorder: OutlineInputBorder(
          borderSide: BorderSide(color: Colors.white.withOpacity(0.15)),
          borderRadius: BorderRadius.circular(12),
        ),
        focusedBorder: OutlineInputBorder(
          borderSide: const BorderSide(color: Color(0xFF3B82F6)),
          borderRadius: BorderRadius.circular(12),
        ),
        filled: true,
        fillColor: Colors.white.withOpacity(0.05),
      ),
    );
  }

  @override
  void dispose() {
    _emailCtrl.dispose(); _passCtrl.dispose(); _nameCtrl.dispose();
    super.dispose();
  }
}
