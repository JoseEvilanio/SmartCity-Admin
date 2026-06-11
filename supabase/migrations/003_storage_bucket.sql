-- ============================================================
-- SmartCity – Criação do Storage Bucket "evidences"
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- ── 1. Criar o bucket "evidences" ─────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'evidences',
  'evidences',
  true,
  10485760, -- 10 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4']
)
ON CONFLICT (id) DO NOTHING;

-- ── 2. Políticas RLS para o bucket "evidences" ────────────

-- Permite leitura pública anônima de qualquer ficheiro
CREATE POLICY "Allow public read evidences"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'evidences');

-- Permite upload anônimo
CREATE POLICY "Allow public upload evidences"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'evidences');

-- Permite atualizar (upsert) anônimo
CREATE POLICY "Allow public update evidences"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'evidences')
  WITH CHECK (bucket_id = 'evidences');

-- Permite deletar anônimo
CREATE POLICY "Allow public delete evidences"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'evidences');
