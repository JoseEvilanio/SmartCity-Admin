-- ============================================================
-- SmartCity Admin – Script de Expansão de Tabelas (SaaS & Multi-tenant)
-- Projeto: rqjwxoevziywtprkddst | Região: sa-east-1
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- Habilitar a extensão PostGIS se não estiver habilitada
CREATE EXTENSION IF NOT EXISTS postgis;

-- Criar a sequência para numeração automática das ordens de serviço
CREATE SEQUENCE IF NOT EXISTS public.service_order_number_seq START 1;

-- ── 1. Tabela de Estados (Estrutura: Estado -> Município) ────
CREATE TABLE IF NOT EXISTS public.states (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name       TEXT NOT NULL UNIQUE,
    uf         VARCHAR(2) NOT NULL UNIQUE,
    tenant_id  UUID,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir o estado correspondente a Portugal/Lisboa e Porto (para compatibilidade de dados)
INSERT INTO public.states (name, uf)
VALUES 
  ('Portugal Continental', 'PT'),
  ('São Paulo', 'SP')
ON CONFLICT (name) DO NOTHING;

-- ── 2. Alteração da Tabela Municipalities (Municípios) ────────
ALTER TABLE public.municipalities ADD COLUMN IF NOT EXISTS tenant_id UUID DEFAULT gen_random_uuid();
ALTER TABLE public.municipalities ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.municipalities ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.municipalities ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES public.states(id) ON DELETE SET NULL;
ALTER TABLE public.municipalities ADD COLUMN IF NOT EXISTS storage_used_bytes BIGINT DEFAULT 0;

-- Atualizar restrições de plano do município para incluir 'Profissional'
ALTER TABLE public.municipalities DROP CONSTRAINT IF EXISTS municipalities_plan_check;
ALTER TABLE public.municipalities ADD CONSTRAINT municipalities_plan_check CHECK (plan IN ('Enterprise', 'Premium', 'Profissional', 'Básico'));

-- ── 3. Tabela de Perfis de Utilizador (Profiles) ─────────────
CREATE TABLE IF NOT EXISTS public.profiles (
    id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    email      TEXT UNIQUE NOT NULL,
    phone      TEXT,
    avatar_url TEXT,
    cpf        TEXT,
    points     INTEGER NOT NULL DEFAULT 0,
    role       TEXT NOT NULL DEFAULT 'cidadao' CHECK (role IN ('cidadao', 'operador', 'gestor', 'super_admin')),
    tenant_id  UUID,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para criar perfil de utilizador automaticamente ao registar no Supabase Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── 4. Tabela de Secretarias (Secretariats) ──────────────────
CREATE TABLE IF NOT EXISTS public.secretariats (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipality_id TEXT NOT NULL REFERENCES public.municipalities(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    sla_hours       INTEGER NOT NULL DEFAULT 48, -- SLA de resolução padrão por secretaria
    tenant_id       UUID NOT NULL,
    created_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(municipality_id, name)
);

-- ── 5. Tabela de Equipas (Teams) ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.teams (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    secretariat_id  UUID NOT NULL REFERENCES public.secretariats(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    tenant_id       UUID NOT NULL,
    created_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(secretariat_id, name)
);

-- ── 6. Alterações na Tabela Team Members ──────────────────────
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS shift_start TIME;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS shift_end TIME;
ALTER TABLE public.team_members ADD COLUMN IF NOT EXISTS productivity_score NUMERIC DEFAULT 100.0;

-- ── 7. Alterações na Tabela Occurrences (Ocorrências) ─────────
ALTER TABLE public.occurrences ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.occurrences ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.occurrences ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.occurrences ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE public.occurrences ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE public.occurrences ADD COLUMN IF NOT EXISTS location geometry(Point, 4326);
ALTER TABLE public.occurrences ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.occurrences ADD COLUMN IF NOT EXISTS neighborhood TEXT;
ALTER TABLE public.occurrences ADD COLUMN IF NOT EXISTS state_id UUID REFERENCES public.states(id) ON DELETE SET NULL;
ALTER TABLE public.occurrences ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.occurrences ADD COLUMN IF NOT EXISTS secretariat_id UUID REFERENCES public.secretariats(id) ON DELETE SET NULL;
ALTER TABLE public.occurrences ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Atualizar Constraints de Categoria e Status no occurrences para suportar novos e antigos valores
ALTER TABLE public.occurrences DROP CONSTRAINT IF EXISTS occurrences_category_check;
ALTER TABLE public.occurrences ADD CONSTRAINT occurrences_category_check CHECK (
  category IN (
    'Trânsito', 'Infraestrutura', 'Saneamento', 'Urgência', 'Ambiente',
    'Buraco na rua', 'Vazamento de água', 'Falta de iluminação', 'Poste danificado',
    'Esgoto a céu aberto', 'Lixo acumulado', 'Semáforo quebrado', 'Árvore caída',
    'Alagamento', 'Transporte público', 'Segurança pública', 'Calçada danificada',
    'Animais abandonados', 'Outros'
  )
);

ALTER TABLE public.occurrences DROP CONSTRAINT IF EXISTS occurrences_status_check;
ALTER TABLE public.occurrences ADD CONSTRAINT occurrences_status_check CHECK (
  status IN (
    'Pendente', 'Em Resolução', 'Resolvido',
    'Aberto', 'Em análise', 'Encaminhado', 'Em atendimento',
    'Rejeitado', 'Duplicado', 'Cancelado', 'Cancelada'
  )
);

-- Trigger para atualizar automaticamente o campo "location" de PostGIS a partir de latitude/longitude
CREATE OR REPLACE FUNCTION public.update_occurrence_location()
RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW.location := st_setsrid(st_makepoint(NEW.longitude, NEW.latitude), 4326);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_occurrence_coords_changed ON public.occurrences;
CREATE TRIGGER on_occurrence_coords_changed
  BEFORE INSERT OR UPDATE OF latitude, longitude ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.update_occurrence_location();

-- ── 8. Tabela de Mídias de Ocorrência (Occurrence Media) ──────
CREATE TABLE IF NOT EXISTS public.occurrence_media (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occurrence_id TEXT NOT NULL REFERENCES public.occurrences(id) ON DELETE CASCADE,
    media_url     TEXT NOT NULL,
    media_type    TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
    tenant_id     UUID,
    created_by    UUID,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 9. Tabela de Comentários (Occurrence Comments) ────────────
CREATE TABLE IF NOT EXISTS public.occurrence_comments (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occurrence_id TEXT NOT NULL REFERENCES public.occurrences(id) ON DELETE CASCADE,
    profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    comment       TEXT NOT NULL,
    tenant_id     UUID,
    created_by    UUID,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 10. Tabela de Confirmações Populares ─────────────────────
CREATE TABLE IF NOT EXISTS public.occurrence_confirmations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occurrence_id TEXT NOT NULL REFERENCES public.occurrences(id) ON DELETE CASCADE,
    profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tenant_id     UUID,
    created_by    UUID,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(occurrence_id, profile_id)
);

-- ── 11. Tabela de Histórico de Status da Ocorrência ───────────
CREATE TABLE IF NOT EXISTS public.occurrence_status_history (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    occurrence_id TEXT NOT NULL REFERENCES public.occurrences(id) ON DELETE CASCADE,
    old_status    TEXT,
    new_status    TEXT NOT NULL,
    changed_by    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes         TEXT,
    tenant_id     UUID,
    created_by    UUID,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para registar alterações de status automaticamente
CREATE OR REPLACE FUNCTION public.log_occurrence_status_change()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_occurrence_status_changed ON public.occurrences;
CREATE TRIGGER on_occurrence_status_changed
  AFTER INSERT OR UPDATE OF status ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.log_occurrence_status_change();

-- ── 12. Tabela de Ordens de Serviço (Service Orders) ──────────
CREATE TABLE IF NOT EXISTS public.service_orders (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    os_number           TEXT NOT NULL UNIQUE,
    occurrence_id       TEXT NOT NULL REFERENCES public.occurrences(id) ON DELETE CASCADE,
    responsible_team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
    deadline            TIMESTAMPTZ,
    priority            TEXT NOT NULL CHECK (priority IN ('Baixa', 'Média', 'Alta', 'Crítica')),
    status              TEXT NOT NULL DEFAULT 'Aberta' CHECK (status IN ('Aberta', 'Em Execução', 'Concluída', 'Cancelada')),
    resolved_at         TIMESTAMPTZ,
    resolution_report   TEXT,
    photo_before_url    TEXT,
    photo_after_url     TEXT,
    checklist           JSONB DEFAULT '[]'::jsonb, -- Checklists operacionais das equipes
    digital_signature_url TEXT, -- URL da assinatura digital de encerramento
    tenant_id           UUID,
    created_by          UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para criação automática de Ordem de Serviço ao aprovar/encaminhar ocorrência
CREATE OR REPLACE FUNCTION public.auto_create_service_order()
RETURNS trigger AS $$
DECLARE
  v_os_number TEXT;
  v_priority TEXT;
BEGIN
  -- Cria OS quando a ocorrência muda de status para 'Encaminhado' ou 'Em atendimento'
  IF NEW.status IN ('Encaminhado', 'Em atendimento') AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.status IS NULL) THEN
    -- Gerar número único da OS (OS-YYYYMMDD-XXXX)
    v_os_number := 'OS-' || to_char(NOW(), 'YYYYMMDD') || '-' || LPAD(nextval('public.service_order_number_seq')::text, 4, '0');
    
    -- Mapear prioridade de ocorrência (Crítico, Alto, Médio, Baixo -> Crítica, Alta, Média, Baixa)
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
      auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_occurrence_approved_create_os ON public.occurrences;
CREATE TRIGGER on_occurrence_approved_create_os
  AFTER UPDATE OF status ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.auto_create_service_order();

-- ── 13. Tabela de Notificações ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.notifications (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title      TEXT NOT NULL,
    message    TEXT NOT NULL,
    type       TEXT NOT NULL,
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    tenant_id  UUID,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 14. Tabelas de Pontos e Rankings (Gamificação) ───────────
CREATE TABLE IF NOT EXISTS public.user_points (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    points      INTEGER NOT NULL,
    action_type TEXT NOT NULL CHECK (action_type IN ('occurrence_registration', 'confirmation', 'comment', 'community_participation')),
    tenant_id   UUID,
    created_by  UUID,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.rankings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id      UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    neighborhood    TEXT NOT NULL,
    municipality_id TEXT NOT NULL REFERENCES public.municipalities(id) ON DELETE CASCADE,
    points          INTEGER NOT NULL DEFAULT 0,
    level           TEXT NOT NULL CHECK (level IN ('Cidadão Ativo', 'Fiscal Comunitário', 'Colaborador Urbano', 'Guardião da Cidade')),
    tenant_id       UUID,
    created_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Função para calcular o nível da Gamificação com base nos pontos
CREATE OR REPLACE FUNCTION public.get_profile_level(p_points INTEGER)
RETURNS text AS $$
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
$$ LANGUAGE plpgsql;

-- Triggers para atribuir pontos automaticamente ao realizar ações na comunidade
CREATE OR REPLACE FUNCTION public.reward_occurrence_creation()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_occurrence_created_reward ON public.occurrences;
CREATE TRIGGER on_occurrence_created_reward
  AFTER INSERT ON public.occurrences
  FOR EACH ROW EXECUTE FUNCTION public.reward_occurrence_creation();

CREATE OR REPLACE FUNCTION public.reward_confirmation()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_confirmation_created_reward ON public.occurrence_confirmations;
CREATE TRIGGER on_confirmation_created_reward
  AFTER INSERT ON public.occurrence_confirmations
  FOR EACH ROW EXECUTE FUNCTION public.reward_confirmation();

CREATE OR REPLACE FUNCTION public.reward_comment()
RETURNS trigger AS $$
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
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_comment_created_reward ON public.occurrence_comments;
CREATE TRIGGER on_comment_created_reward
  AFTER INSERT ON public.occurrence_comments
  FOR EACH ROW EXECUTE FUNCTION public.reward_comment();

-- ── 15. Tabela de Logs de Auditoria (Audit Logs) ──────────────
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID,
    action     TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id  TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address TEXT,
    tenant_id  UUID,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 16. Tabelas de Planos e Subscrições (SaaS) ────────────────
CREATE TABLE IF NOT EXISTS public.plans (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name                  TEXT UNIQUE NOT NULL CHECK (name IN ('Enterprise', 'Premium', 'Profissional', 'Básico')),
    description           TEXT,
    price                 DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    max_users             INTEGER NOT NULL DEFAULT 10,
    max_occurrences_month INTEGER NOT NULL DEFAULT 100,
    max_storage_bytes     BIGINT NOT NULL DEFAULT 10737418240, -- Default 10 GB
    tenant_id             UUID,
    created_by            UUID,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Inserir os planos padrão (incluindo o plano Profissional)
INSERT INTO public.plans (name, description, price, max_users, max_occurrences_month, max_storage_bytes)
VALUES 
  ('Básico', 'Plano inicial para pequenos municípios', 199.00, 15, 500, 5368709120), -- 5 GB
  ('Premium', 'Plano avançado legado', 499.00, 100, 5000, 21474836480), -- 20 GB
  ('Profissional', 'Plano avançado profissional completo', 599.00, 150, 7500, 53687091200), -- 50 GB
  ('Enterprise', 'Plano completo com geolocalização ilimitada', 999.00, 9999, 99999, 536870912000) -- 500 GB
ON CONFLICT (name) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.subscriptions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipality_id TEXT NOT NULL REFERENCES public.municipalities(id) ON DELETE CASCADE,
    plan_id         UUID NOT NULL REFERENCES public.plans(id),
    status          TEXT NOT NULL DEFAULT 'Trialing' CHECK (status IN ('Active', 'Past Due', 'Canceled', 'Trialing')),
    start_date      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    end_date        TIMESTAMPTZ,
    contract_url    TEXT, -- Link para o PDF do contrato assinado
    billing_email   TEXT, -- Email faturamento
    amount_paid     DECIMAL(10,2) NOT NULL DEFAULT 0.00, -- Valor pago recorrente
    tenant_id       UUID,
    created_by      UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 17. Definições Customizadas do Município ─────────────────
CREATE TABLE IF NOT EXISTS public.municipalities_settings (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    municipality_id  TEXT NOT NULL REFERENCES public.municipalities(id) ON DELETE CASCADE UNIQUE,
    theme_color      TEXT,
    logo_url         TEXT,
    timezone         TEXT DEFAULT 'America/Sao_Paulo',
    features_enabled JSONB DEFAULT '{}'::jsonb,
    tenant_id        UUID,
    created_by       UUID,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 18. Backfill e Associação de Dados Existentes ────────────
-- Gerar UUIDs estáveis para os municípios existentes (caso ainda estejam sem tenant_id)
UPDATE public.municipalities SET tenant_id = gen_random_uuid() WHERE tenant_id IS NULL;

-- Associar os dados de ocorrências existentes aos novos tenant_ids gerados
UPDATE public.occurrences o
SET tenant_id = m.tenant_id
FROM public.municipalities m
WHERE o.municipality = m.name AND o.tenant_id IS NULL;

-- Associar os dados da equipa existentes aos novos tenant_ids gerados
UPDATE public.team_members t
SET tenant_id = m.tenant_id
FROM public.municipalities m
WHERE t.municipality = m.name AND t.tenant_id IS NULL;

-- Associar o Estado de Portugal aos municípios existentes
UPDATE public.municipalities
SET state_id = (SELECT id FROM public.states WHERE uf = 'PT' LIMIT 1)
WHERE id IN ('T-4029-LIS', 'T-1182-POR', 'T-9912-COI', 'T-3321-BRA');

-- ── 19. Triggers para atualização automática de "updated_at" ──
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tr_states_updated_at BEFORE UPDATE ON public.states FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER tr_municipalities_updated_at BEFORE UPDATE ON public.municipalities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER tr_occurrences_updated_at BEFORE UPDATE ON public.occurrences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER tr_team_members_updated_at BEFORE UPDATE ON public.team_members FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER tr_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER tr_secretariats_updated_at BEFORE UPDATE ON public.secretariats FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER tr_teams_updated_at BEFORE UPDATE ON public.teams FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER tr_occurrence_media_updated_at BEFORE UPDATE ON public.occurrence_media FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER tr_occurrence_comments_updated_at BEFORE UPDATE ON public.occurrence_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER tr_occurrence_confirmations_updated_at BEFORE UPDATE ON public.occurrence_confirmations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER tr_occurrence_status_history_updated_at BEFORE UPDATE ON public.occurrence_status_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER tr_service_orders_updated_at BEFORE UPDATE ON public.service_orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER tr_notifications_updated_at BEFORE UPDATE ON public.notifications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER tr_user_points_updated_at BEFORE UPDATE ON public.user_points FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER tr_rankings_updated_at BEFORE UPDATE ON public.rankings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER tr_audit_logs_updated_at BEFORE UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER tr_plans_updated_at BEFORE UPDATE ON public.plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER tr_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE OR REPLACE TRIGGER tr_municipalities_settings_updated_at BEFORE UPDATE ON public.municipalities_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ── 20. Habilitação de RLS em 100% das novas tabelas ──────────
ALTER TABLE public.states ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secretariats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrence_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrence_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrence_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrence_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rankings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.municipalities_settings ENABLE ROW LEVEL SECURITY;

-- ── 21. Funções Auxiliares de RLS para Obter Função/Tenant ───
CREATE OR REPLACE FUNCTION public.get_auth_role()
RETURNS text AS $$
  SELECT COALESCE(
    (SELECT role FROM public.profiles WHERE id = auth.uid()),
    'cidadao'
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_auth_tenant()
RETURNS uuid AS $$
  SELECT tenant_id FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER;

-- ── 22. Definição das Políticas RLS para cada tabela ─────────

-- STATES
CREATE POLICY "Allow select states" ON public.states FOR SELECT USING (true);
CREATE POLICY "Allow admin manage states" ON public.states FOR ALL TO authenticated
  USING (public.get_auth_role() = 'super_admin')
  WITH CHECK (public.get_auth_role() = 'super_admin');

-- PROFILES
CREATE POLICY "Allow select profiles" ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.get_auth_role() = 'super_admin' OR (public.get_auth_role() = 'gestor' AND tenant_id = public.get_auth_tenant()));
CREATE POLICY "Allow insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update profiles" ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.get_auth_role() = 'super_admin' OR (public.get_auth_role() = 'gestor' AND tenant_id = public.get_auth_tenant()))
  WITH CHECK (auth.uid() = id OR public.get_auth_role() = 'super_admin' OR (public.get_auth_role() = 'gestor' AND tenant_id = public.get_auth_tenant()));

-- SECRETARIATS
CREATE POLICY "Allow select secretariats" ON public.secretariats FOR SELECT
  USING (public.get_auth_role() = 'super_admin' OR tenant_id = public.get_auth_tenant() OR auth.uid() IS NULL);
CREATE POLICY "Allow gestor manage secretariats" ON public.secretariats FOR ALL TO authenticated
  USING (public.get_auth_role() = 'super_admin' OR (public.get_auth_role() = 'gestor' AND tenant_id = public.get_auth_tenant()))
  WITH CHECK (public.get_auth_role() = 'super_admin' OR (public.get_auth_role() = 'gestor' AND tenant_id = public.get_auth_tenant()));

-- TEAMS
CREATE POLICY "Allow select teams" ON public.teams FOR SELECT
  USING (public.get_auth_role() = 'super_admin' OR tenant_id = public.get_auth_tenant() OR auth.uid() IS NULL);
CREATE POLICY "Allow gestor manage teams" ON public.teams FOR ALL TO authenticated
  USING (public.get_auth_role() = 'super_admin' OR (public.get_auth_role() = 'gestor' AND tenant_id = public.get_auth_tenant()))
  WITH CHECK (public.get_auth_role() = 'super_admin' OR (public.get_auth_role() = 'gestor' AND tenant_id = public.get_auth_tenant()));

-- OCCURRENCES (Ajustadas para suportar operações anon do frontend sem falhas)
DROP POLICY IF EXISTS "Allow anon read occurrences" ON public.occurrences;
DROP POLICY IF EXISTS "Allow anon insert/update/delete occurrences" ON public.occurrences;
CREATE POLICY "Allow anon read occurrences" ON public.occurrences FOR SELECT USING (true);
CREATE POLICY "Allow anon write occurrences" ON public.occurrences FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow authenticated read occurrences" ON public.occurrences FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow cidadao insert occurrences" ON public.occurrences FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow cidadao update own occurrences" ON public.occurrences FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR public.get_auth_role() IN ('operador', 'gestor', 'super_admin'))
  WITH CHECK (created_by = auth.uid() OR public.get_auth_role() IN ('operador', 'gestor', 'super_admin'));

-- OCCURRENCE MEDIA
CREATE POLICY "Allow select occurrence_media" ON public.occurrence_media FOR SELECT USING (true);
CREATE POLICY "Allow write occurrence_media" ON public.occurrence_media FOR ALL USING (true) WITH CHECK (true);

-- OCCURRENCE COMMENTS
CREATE POLICY "Allow select occurrence_comments" ON public.occurrence_comments FOR SELECT USING (true);
CREATE POLICY "Allow insert occurrence_comments" ON public.occurrence_comments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow manage occurrence_comments" ON public.occurrence_comments FOR ALL TO authenticated
  USING (auth.uid() = profile_id OR public.get_auth_role() IN ('gestor', 'super_admin'));

-- OCCURRENCE CONFIRMATIONS
CREATE POLICY "Allow select occurrence_confirmations" ON public.occurrence_confirmations FOR SELECT USING (true);
CREATE POLICY "Allow manage occurrence_confirmations" ON public.occurrence_confirmations FOR ALL USING (true);

-- OCCURRENCE STATUS HISTORY
CREATE POLICY "Allow select status_history" ON public.occurrence_status_history FOR SELECT USING (true);

-- SERVICE ORDERS
CREATE POLICY "Allow select service_orders" ON public.service_orders FOR SELECT
  USING (public.get_auth_role() = 'super_admin' OR tenant_id = public.get_auth_tenant() OR auth.uid() IS NULL);
CREATE POLICY "Allow manage service_orders" ON public.service_orders FOR ALL TO authenticated
  USING (public.get_auth_role() = 'super_admin' OR ((public.get_auth_role() IN ('operador', 'gestor')) AND tenant_id = public.get_auth_tenant()))
  WITH CHECK (public.get_auth_role() = 'super_admin' OR ((public.get_auth_role() IN ('operador', 'gestor')) AND tenant_id = public.get_auth_tenant()));

-- NOTIFICATIONS
CREATE POLICY "Allow user manage own notifications" ON public.notifications FOR ALL
  USING (auth.uid() = profile_id OR auth.uid() IS NULL)
  WITH CHECK (auth.uid() = profile_id OR auth.uid() IS NULL);

-- USER POINTS
CREATE POLICY "Allow select user_points" ON public.user_points FOR SELECT
  USING (auth.uid() = profile_id OR public.get_auth_role() = 'super_admin' OR (public.get_auth_role() = 'gestor' AND tenant_id = public.get_auth_tenant()));

-- RANKINGS
CREATE POLICY "Allow select rankings" ON public.rankings FOR SELECT USING (true);

-- AUDIT LOGS
CREATE POLICY "Allow select audit_logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (public.get_auth_role() = 'super_admin' OR (public.get_auth_role() = 'gestor' AND tenant_id = public.get_auth_tenant()));

-- PLANS
CREATE POLICY "Allow select plans" ON public.plans FOR SELECT USING (true);
CREATE POLICY "Allow admin manage plans" ON public.plans FOR ALL TO authenticated
  USING (public.get_auth_role() = 'super_admin')
  WITH CHECK (public.get_auth_role() = 'super_admin');

-- SUBSCRIPTIONS
CREATE POLICY "Allow select subscriptions" ON public.subscriptions FOR SELECT
  USING (public.get_auth_role() = 'super_admin' OR tenant_id = public.get_auth_tenant() OR auth.uid() IS NULL);
CREATE POLICY "Allow admin manage subscriptions" ON public.subscriptions FOR ALL TO authenticated
  USING (public.get_auth_role() = 'super_admin')
  WITH CHECK (public.get_auth_role() = 'super_admin');

-- MUNICIPALITIES SETTINGS
CREATE POLICY "Allow select settings" ON public.municipalities_settings FOR SELECT USING (true);
CREATE POLICY "Allow manage settings" ON public.municipalities_settings FOR ALL
  USING (public.get_auth_role() = 'super_admin' OR (public.get_auth_role() = 'gestor' AND tenant_id = public.get_auth_tenant()) OR auth.uid() IS NULL)
  WITH CHECK (public.get_auth_role() = 'super_admin' OR (public.get_auth_role() = 'gestor' AND tenant_id = public.get_auth_tenant()) OR auth.uid() IS NULL);
