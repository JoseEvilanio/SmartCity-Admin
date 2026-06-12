-- ============================================================
-- SmartCity – Correção e Sincronização do Esquema de Banco
-- Sincroniza colunas e restrições ausentes do banco com os arquivos de migração.
-- Corrige também vulnerabilidades de search_path em funções SECURITY DEFINER.
-- ============================================================

-- ── 1. Adição de Colunas Ausentes ────────────────────────────

-- municipalities: storage_used_bytes
ALTER TABLE public.municipalities ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0;

-- secretariats: sla_hours
ALTER TABLE public.secretariats ADD COLUMN IF NOT EXISTS sla_hours INTEGER NOT NULL DEFAULT 48;

-- team_members: shift_start, shift_end, productivity_score
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS shift_start TIME;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS shift_end TIME;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS productivity_score NUMERIC DEFAULT 100.0;

-- plans: max_storage_bytes
ALTER TABLE public.plans ADD COLUMN IF NOT EXISTS max_storage_bytes BIGINT NOT NULL DEFAULT 10737418240;

-- subscriptions: contract_url, billing_email, amount_paid
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS contract_url TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS billing_email TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0.00;

-- ── 2. Atualização de Restrições e Seed de Planos ────────────

-- Atualiza restrição check de planos para incluir 'Profissional'
ALTER TABLE public.plans DROP CONSTRAINT IF EXISTS plans_name_check;
ALTER TABLE public.plans ADD CONSTRAINT plans_name_check CHECK (name IN ('Enterprise', 'Premium', 'Profissional', 'Básico'));

-- Sementeia / Atualiza os planos padrão com limites de armazenamento
INSERT INTO public.plans (name, description, price, max_users, max_occurrences_month, max_storage_bytes)
VALUES 
  ('Básico', 'Plano inicial para pequenos municípios', 199.00, 15, 500, 5368709120), -- 5 GB
  ('Premium', 'Plano avançado legado', 499.00, 100, 5000, 21474836480), -- 20 GB
  ('Profissional', 'Plano avançado profissional completo', 599.00, 150, 7500, 53687091200), -- 50 GB
  ('Enterprise', 'Plano completo com geolocalização ilimitada', 999.00, 9999, 99999, 536870912000) -- 500 GB
ON CONFLICT (name) DO UPDATE 
SET 
  description = EXCLUDED.description,
  price = EXCLUDED.price,
  max_users = EXCLUDED.max_users,
  max_occurrences_month = EXCLUDED.max_occurrences_month,
  max_storage_bytes = EXCLUDED.max_storage_bytes;

-- ── 3. Correções de Segurança (search_path) ──────────────────

-- update_occurrence_location
CREATE OR REPLACE FUNCTION public.update_occurrence_location()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := st_setsrid(st_makepoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$;

-- get_profile_level
CREATE OR REPLACE FUNCTION public.get_profile_level(p_points INTEGER)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_points >= 1000 THEN
    RETURN 'Guardião da Cidade';
  ELSIF p_points >= 500 THEN
    RETURN 'Colaborador Urbano';
  ELSIF p_points >= 100 THEN
    RETURN 'Fiscal Comunitário';
  ELSE
    RETURN 'Cidadão Ativo';
  END IF;
END;
$$;

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, role, tenant_id)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name', 'Cidadão'),
    new.email,
    new.phone,
    COALESCE(new.raw_user_meta_data->>'role', 'cidadao'),
    (new.raw_user_meta_data->>'tenant_id')::uuid
  );
  RETURN new;
END;
$$;

-- get_auth_role
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'cidadao'
  );
$$;

-- update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- get_auth_tenant
CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$;

-- Forçar recarregamento do schema cache do PostgREST
NOTIFY pgrst, 'reload schema';
