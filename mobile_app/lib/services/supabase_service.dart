import 'dart:io';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../config.dart';

class SupabaseService {
  static final SupabaseService _instance = SupabaseService._internal();
  factory SupabaseService() => _instance;
  SupabaseService._internal();

  final SupabaseClient client = Supabase.instance.client;

  static Future<void> initialize() async {
    await Supabase.initialize(
      url: AppConfig.supabaseUrl,
      anonKey: AppConfig.supabaseAnonKey,
    );
  }

  // --- Auth API ---
  Future<AuthResponse> signUp(String email, String password, String name) async {
    return await client.auth.signUp(
      email: email,
      password: password,
      data: {'name': name, 'role': 'cidadao'},
    );
  }

  Future<AuthResponse> signIn(String email, String password) async {
    return await client.auth.signInWithPassword(email: email, password: password);
  }

  Future<void> signOut() async {
    await client.auth.signOut();
  }

  User? get currentUser => client.auth.currentUser;

  // --- Profile / Gamification ---
  Future<Map<String, dynamic>?> getProfile(String userId) async {
    final response = await client
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
    return response;
  }

  // --- Storage API ---
  Future<String> uploadEvidence(String occurrenceId, File file, String fileExtension) async {
    final fileName = '$occurrenceId/${DateTime.now().millisecondsSinceEpoch}.$fileExtension';
    
    // Upload file
    await client.storage.from('evidences').upload(
          fileName,
          file,
          fileOptions: const FileOptions(cacheControl: '3600', upsert: true),
        );

    // Get public URL
    final String publicUrl = client.storage.from('evidences').getPublicUrl(fileName);
    return publicUrl;
  }

  // --- Auth Profile ---
  Future<void> updatePassword(String newPassword) async {
    await client.auth.updateUser(UserAttributes(password: newPassword));
  }

  Future<Map<String, dynamic>?> getCurrentProfile() async {
    final user = currentUser;
    if (user == null) return null;
    final response = await client
        .from('profiles')
        .select('name, email, role')
        .eq('id', user.id)
        .maybeSingle();
    return response;
  }

  // --- DB API ---
  Future<List<Map<String, dynamic>>> fetchOccurrences() async {
    return List<Map<String, dynamic>>.from(
      await client.from('occurrences').select('*').order('created_at', ascending: false)
    );
  }

  Future<List<Map<String, dynamic>>> fetchServiceOrders() async {
    try {
      // Primeiro tenta com checklist (caso a coluna já exista)
      final result = await client
          .from('service_orders')
          .select('id, os_number, occurrence_id, responsible_team_id, deadline, priority, status, resolved_at, resolution_report, photo_before_url, photo_after_url, checklist, digital_signature_url, tenant_id, created_by, created_at, updated_at, occurrences(*, occurrence_media(*))')
          .order('created_at', ascending: false);
      return List<Map<String, dynamic>>.from(result);
    } catch (e) {
      // Se falhar (ex: coluna checklist não existe), tenta sem ela
      if (e.toString().contains('checklist') || e.toString().contains('PGRST204')) {
        final result = await client
            .from('service_orders')
            .select('id, os_number, occurrence_id, responsible_team_id, deadline, priority, status, resolved_at, resolution_report, photo_before_url, photo_after_url, tenant_id, created_by, created_at, updated_at, occurrences(*, occurrence_media(*))')
            .order('created_at', ascending: false);
        return List<Map<String, dynamic>>.from(result);
      }
      rethrow;
    }
  }


  Future<void> insertRaw(String table, Map<String, dynamic> record) async {
    await client.from(table).insert(record);
  }

  Future<void> updateRaw(String table, dynamic id, Map<String, dynamic> record) async {
    if (table == 'service_orders') {
      try {
        await client.from(table).update(record).eq('id', id);
      } catch (e) {
        // Se falhar por coluna não existir, tenta sem checklist e digital_signature_url
        if (e.toString().contains('checklist') || e.toString().contains('digital_signature_url') || e.toString().contains('PGRST204')) {
          final safeRecord = Map<String, dynamic>.from(record);
          safeRecord.remove('checklist');
          safeRecord.remove('digital_signature_url');
          await client.from(table).update(safeRecord).eq('id', id);
        } else {
          rethrow;
        }
      }
    } else {
      await client.from(table).update(record).eq('id', id);
    }
  }


  // Comments & Confirmations
  Future<void> addComment(String occurrenceId, String comment) async {
    final user = currentUser;
    if (user == null) throw Exception("Necessário autenticação.");

    await client.from('occurrence_comments').insert({
      'occurrence_id': occurrenceId,
      'profile_id': user.id,
      'comment': comment,
      'created_by': user.id,
    });
  }

  Future<void> confirmOccurrence(String occurrenceId) async {
    final user = currentUser;
    if (user == null) throw Exception("Necessário autenticação.");

    await client.from('occurrence_confirmations').insert({
      'occurrence_id': occurrenceId,
      'profile_id': user.id,
      'created_by': user.id,
    });
  }
}
