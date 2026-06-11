import 'package:supabase_flutter/supabase_flutter.dart';
import 'config.dart';

void main() async {
  print('Initializing Supabase...');
  await Supabase.initialize(
    url: AppConfig.supabaseUrl,
    anonKey: AppConfig.supabaseAnonKey,
  );

  final client = Supabase.instance.client;
  print('Fetching service_orders...');
  try {
    final raw = await client
        .from('service_orders')
        .select('*, occurrences(*, occurrence_media(*))')
        .order('created_at', ascending: false)
        .limit(3);
    
    print('Raw response length: ${raw.length}');
    if (raw.isNotEmpty) {
      print('First item:');
      print(raw[0]);
      print('occurrences field type: ${raw[0]['occurrences'].runtimeType}');
    } else {
      print('No service orders found.');
    }
  } catch (e) {
    print('Error: $e');
  }
}
