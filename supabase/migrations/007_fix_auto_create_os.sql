-- ============================================================
-- SmartCity – Corrige trigger de criação automática de OS
-- Agora dispara também no INSERT e ao mudar para Pendente/Em Resolução
-- ============================================================

CREATE OR REPLACE FUNCTION public.auto_create_service_order()
RETURNS trigger AS $$
DECLARE
  v_os_number TEXT;
  v_priority TEXT;
BEGIN
  -- Cria OS quando:
  --   - INSERT: ocorrência criada com status 'Aberto', 'Encaminhado' ou 'Em atendimento'
  --   - UPDATE: status muda para 'Encaminhado', 'Em atendimento', 'Pendente' ou 'Em Resolução'
  IF (
    (TG_OP = 'INSERT' AND NEW.status IN ('Aberto', 'Encaminhado', 'Em atendimento', 'Pendente', 'Em Resolução'))
    OR
    (TG_OP = 'UPDATE' AND NEW.status IN ('Encaminhado', 'Em atendimento', 'Pendente', 'Em Resolução') AND OLD.status IS DISTINCT FROM NEW.status)
  ) THEN
    -- Evita duplicatas: verifica se já existe OS para esta ocorrência
    IF EXISTS (SELECT 1 FROM public.service_orders WHERE occurrence_id = NEW.id) THEN
      RETURN NEW;
    END IF;

    -- Gerar número único da OS (OS-YYYYMMDD-XXXX)
    v_os_number := 'OS-' || to_char(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('public.service_order_number_seq')::text, 4, '0');

    -- Mapear prioridade
    v_priority := CASE NEW.priority
      WHEN 'Crítico' THEN 'Crítica'
      WHEN 'Alto' THEN 'Alta'
      WHEN 'Médio' THEN 'Média'
      ELSE 'Baixa'
    END;

    INSERT INTO public.service_orders (
      os_number,
      occurrence_id,
      responsible_team_id,
      deadline,
      priority,
      status,
      tenant_id,
      created_by
    ) VALUES (
      v_os_number,
      NEW.id,
      NEW.team_id,
      NOW() + INTERVAL '7 days',
      v_priority,
      'Aberta',
      NEW.tenant_id,
      COALESCE(NEW.created_by, auth.uid())
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_occurrence_approved_create_os ON public.occurrences;
CREATE TRIGGER on_occurrence_approved_create_os
  AFTER INSERT OR UPDATE OF status ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_service_order();
