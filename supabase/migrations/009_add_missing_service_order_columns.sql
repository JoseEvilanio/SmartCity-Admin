-- ============================================================
-- SmartCity – Adiciona colunas ausentes em service_orders
-- Correção do erro PGRST204: coluna 'checklist' não encontrada
-- ============================================================

-- Adiciona checklist se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_orders'
      AND column_name = 'checklist'
  ) THEN
    ALTER TABLE public.service_orders
      ADD COLUMN checklist JSONB DEFAULT '[]'::jsonb;
    RAISE NOTICE 'Coluna checklist adicionada em service_orders';
  ELSE
    RAISE NOTICE 'Coluna checklist já existe em service_orders';
  END IF;
END $$;

-- Adiciona digital_signature_url se não existir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_orders'
      AND column_name = 'digital_signature_url'
  ) THEN
    ALTER TABLE public.service_orders
      ADD COLUMN digital_signature_url TEXT;
    RAISE NOTICE 'Coluna digital_signature_url adicionada em service_orders';
  ELSE
    RAISE NOTICE 'Coluna digital_signature_url já existe em service_orders';
  END IF;
END $$;

-- Forçar o Supabase a recarregar o schema cache
NOTIFY pgrst, 'reload schema';
