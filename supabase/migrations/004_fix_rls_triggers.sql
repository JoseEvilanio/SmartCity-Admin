-- ============================================================
-- SmartCity – Corrige RLS nas funções de gamificação
-- As triggers de recompensa (reward_*) executam como SECURITY DEFINER
-- para poderem inserir em user_points sem depender das permissões do cidadão
-- ============================================================

CREATE OR REPLACE FUNCTION public.reward_occurrence_creation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.created_by IS NOT NULL THEN
    INSERT INTO public.user_points (profile_id, points, action_type, tenant_id)
    VALUES (NEW.created_by, 20, 'occurrence_registration', NEW.tenant_id);

    UPDATE public.profiles
    SET points = points + 20
    WHERE id = NEW.created_by;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reward_confirmation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.profile_id IS NOT NULL THEN
    INSERT INTO public.user_points (profile_id, points, action_type, tenant_id)
    VALUES (NEW.profile_id, 5, 'confirmation', NEW.tenant_id);

    UPDATE public.profiles
    SET points = points + 5
    WHERE id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.reward_comment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.profile_id IS NOT NULL THEN
    INSERT INTO public.user_points (profile_id, points, action_type, tenant_id)
    VALUES (NEW.profile_id, 2, 'comment', NEW.tenant_id);

    UPDATE public.profiles
    SET points = points + 2
    WHERE id = NEW.profile_id;
  END IF;
  RETURN NEW;
END;
$$;
