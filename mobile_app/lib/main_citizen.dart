import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'config.dart';
import 'services/offline_service.dart';
import 'views/citizen/citizen_login_view.dart';
import 'views/citizen/citizen_dashboard_view.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    anonKey: AppConfig.supabaseAnonKey,
  );
  await OfflineService().init();
  runApp(const CitizenApp());
}

class CitizenApp extends StatelessWidget {
  const CitizenApp({super.key});

  @override
  Widget build(BuildContext context) {
    final session = Supabase.instance.client.auth.currentSession;
    return MaterialApp(
      title: 'SmartCity Cidadão',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.dark(
          primary: const Color(0xFF3B82F6),
          secondary: const Color(0xFF06B6D4),
          surface: const Color(0xFF1E293B),
          background: const Color(0xFF0F172A),
        ),
        fontFamily: 'Inter',
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFF0F172A),
      ),
      home: session != null
          ? const CitizenDashboardView()
          : const CitizenLoginView(),
    );
  }
}
