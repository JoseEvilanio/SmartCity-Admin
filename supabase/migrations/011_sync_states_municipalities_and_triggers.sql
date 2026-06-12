-- ============================================================
-- SmartCity – Sementeira de Dados e Sincronização de Status de OS
-- Semeia Estados e Municípios padrões (incluindo Auto-detectado)
-- Cria trigger para sincronizar status de Ordem de Serviço com Ocorrência
-- Atualiza retrospectivamente os status das ocorrências com OS concluídas
-- ============================================================

-- ── 1. Sementeira de Estados ──────────────────────────────────
INSERT INTO public.states (name, uf)
VALUES
  ('Portugal Continental', 'PT'),
  ('São Paulo', 'SP'),
  ('Alagoas', 'AL'),
  ('Outros', 'OT')
ON CONFLICT (name) DO NOTHING;

-- ── 2. Sementeira de Municípios ───────────────────────────────
INSERT INTO public.municipalities (id, name, code, status, plan, users, occurrences_month, latitude, longitude, state_id)
VALUES
  ('T-4029-LIS', 'Lisboa',  'LX', 'Ativo',    'Enterprise', 245, 12402, 38.7223, -9.1393, (SELECT id FROM public.states WHERE uf = 'PT')),
  ('T-1182-POR', 'Porto',   'PR', 'Ativo',    'Premium',    112, 8912,  41.1579, -8.6291, (SELECT id FROM public.states WHERE uf = 'PT')),
  ('T-9912-COI', 'Coimbra', 'CO', 'Pendente', 'Básico',     12,  144,   40.2033, -8.4103, (SELECT id FROM public.states WHERE uf = 'PT')),
  ('T-3321-BRA', 'Braga',   'BR', 'Inativo',  'Enterprise', 85,  0,     41.5503, -8.4201, (SELECT id FROM public.states WHERE uf = 'PT')),
  ('T-0000-AUT', 'Auto-detectado', 'AD', 'Ativo', 'Básico', 0, 0, 0.0, 0.0, (SELECT id FROM public.states WHERE uf = 'OT'))
ON CONFLICT (id) DO UPDATE
SET 
  name = EXCLUDED.name,
  code = EXCLUDED.code,
  status = EXCLUDED.status,
  plan = EXCLUDED.plan,
  users = EXCLUDED.users,
  occurrences_month = EXCLUDED.occurrences_month,
  latitude = EXCLUDED.latitude,
  longitude = EXCLUDED.longitude,
  state_id = EXCLUDED.state_id;

-- ── 3. Função e Trigger para Sincronização de Status ──────────
CREATE OR REPLACE FUNCTION public.sync_service_order_status_to_occurrence()
RETURNS trigger AS $$
BEGIN
  IF NEW.status = 'Concluída' THEN
    UPDATE public.occurrences
    SET status = 'Resolvido'
    WHERE id = NEW.occurrence_id;
  ELSIF NEW.status = 'Em Execução' THEN
    UPDATE public.occurrences
    SET status = 'Em Resolução'
    WHERE id = NEW.occurrence_id;
  ELSIF NEW.status = 'Cancelada' THEN
    UPDATE public.occurrences
    SET status = 'Cancelada'
    WHERE id = NEW.occurrence_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_sync_service_order_status ON public.service_orders;
CREATE TRIGGER tr_sync_service_order_status
  AFTER UPDATE OF status ON public.service_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_service_order_status_to_occurrence();

-- ── 4. Sincronização Retrospectiva dos Dados Existentes ───────
UPDATE public.occurrences o
SET status = 'Resolvido'
FROM public.service_orders s
WHERE o.id = s.occurrence_id AND s.status = 'Concluída' AND o.status <> 'Resolvido';

UPDATE public.occurrences o
SET status = 'Em Resolução'
FROM public.service_orders s
WHERE o.id = s.occurrence_id AND s.status = 'Em Execução' AND o.status <> 'Em Resolução';

-- Forçar recarregamento do cache do PostgREST
NOTIFY pgrst, 'reload schema';
