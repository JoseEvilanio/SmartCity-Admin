-- ============================================================
-- SmartCity – Habilita Realtime para atualizações em tempo real
-- ============================================================

-- Adiciona tabelas à publicação supabase_realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.occurrences;
ALTER PUBLICATION supabase_realtime ADD TABLE public.service_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.occurrence_status_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.occurrence_media;
ALTER PUBLICATION supabase_realtime ADD TABLE public.occurrence_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.occurrence_confirmations;

-- Garante que a replica identity inclua os dados completos para eventos
ALTER TABLE public.occurrences REPLICA IDENTITY FULL;
ALTER TABLE public.service_orders REPLICA IDENTITY FULL;
