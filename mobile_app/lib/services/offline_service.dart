import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:uuid/uuid.dart';
import 'supabase_service.dart';

class OfflineService extends ChangeNotifier {
  static final OfflineService _instance = OfflineService._internal();
  factory OfflineService() => _instance;
  OfflineService._internal();

  Box? _pendingBox;
  Box? _cacheBox;
  bool _isOnline = true;
  bool _initialized = false;
  final SupabaseService _supabaseService = SupabaseService();

  bool get isOnline => _isOnline;

  Future<void> init() async => _ensureInit();

  Future<void> _ensureInit() async {
    if (_initialized) return;
    await Hive.initFlutter();
    _pendingBox = await Hive.openBox('pending_actions');
    _cacheBox = await Hive.openBox('cached_data');

    _isOnline = await _checkInitialConnection();
    Connectivity().onConnectivityChanged.listen((List<ConnectivityResult> results) {
      final hasConnection = !results.contains(ConnectivityResult.none);
      if (hasConnection != _isOnline) {
        _isOnline = hasConnection;
        notifyListeners();
        if (_isOnline) {
          syncPendingActions();
        }
      }
    });

    _initialized = true;
    notifyListeners();
  }

  Future<bool> _checkInitialConnection() async {
    final result = await Connectivity().checkConnectivity();
    return !result.contains(ConnectivityResult.none);
  }

  // --- Caching local data ---
  Future<void> cacheData(String key, dynamic value) async {
    await _ensureInit();
    await _cacheBox!.put(key, jsonEncode(value));
  }

  Future<dynamic> getCachedData(String key) async {
    await _ensureInit();
    final cached = await _cacheBox!.get(key);
    if (cached != null) {
      return jsonDecode(cached);
    }
    return null;
  }

  // --- Queue offline actions ---
  Future<void> queueAction({
    required String table,
    required String actionType,
    required Map<String, dynamic> payload,
  }) async {
    await _ensureInit();
    final id = const Uuid().v4();
    final item = {
      'id': id,
      'table': table,
      'actionType': actionType,
      'payload': payload,
      'timestamp': DateTime.now().toIso8601String(),
    };

    await _pendingBox!.put(id, item);
    notifyListeners();

    if (_isOnline) {
      syncPendingActions();
    }
  }

  // --- Sincronizar Fila de Ações ---
  Future<void> syncPendingActions() async {
    await _ensureInit();
    if (!_isOnline || _pendingBox!.isEmpty) return;

    final keys = List.from(_pendingBox!.keys);
    for (var key in keys) {
      final action = _pendingBox!.get(key) as Map;
      final table = action['table'] as String;
      final actionType = action['actionType'] as String;
      final payload = Map<String, dynamic>.from(action['payload']);

      try {
        if (actionType == 'INSERT') {
          await _supabaseService.insertRaw(table, payload);
        } else if (actionType == 'UPDATE') {
          final idField = payload.containsKey('id') ? 'id' : 'occurrence_id';
          await _supabaseService.updateRaw(table, payload[idField], payload);
        }
        await _pendingBox!.delete(key);
      } catch (e) {
        print("[OfflineService] Erro ao sincronizar item $key: $e");
        break;
      }
    }
    notifyListeners();
  }

  Future<List<Map<String, dynamic>>> getPendingActions() async {
    await _ensureInit();
    return _pendingBox!.values
        .map((e) => Map<String, dynamic>.from(e as Map))
        .toList();
  }
}
