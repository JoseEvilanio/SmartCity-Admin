-- ============================================================
-- SmartCity – Corrige RLS na trigger de histórico de status
-- A trigger log_occurrence_status_change executa como SECURITY DEFINER
-- para poder inserir em occurrence_status_history sem depender
-- das permissões do cidadão que criou a ocorrência
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_occurrence_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) OR (TG_OP = 'INSERT') THEN
    INSERT INTO public.occurrence_status_history (occurrence_id, old_status, new_status, changed_by, tenant_id)
    VALUES (
      NEW.id,
      CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END,
      NEW.status,
      auth.uid(),
      NEW.tenant_id
    );
  END IF;
  RETURN NEW;
END;
$$;
