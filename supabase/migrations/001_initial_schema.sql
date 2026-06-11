-- ============================================================
-- SmartCity Admin – Script de criação de tabelas Supabase
-- Projeto: rqjwxoevziywtprkddst | Região: sa-east-1
-- Execute este script no SQL Editor do Supabase Dashboard
-- ============================================================

-- ── 1. Municípios ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.municipalities (
  id               TEXT PRIMARY KEY,          -- ex: "T-4029-LIS"
  name             TEXT NOT NULL,
  code             TEXT NOT NULL,             -- ex: "LX"
  status           TEXT NOT NULL DEFAULT 'Ativo'
                   CHECK (status IN ('Ativo', 'Pendente', 'Inativo')),
  plan             TEXT NOT NULL DEFAULT 'Básico'
                   CHECK (plan IN ('Enterprise', 'Premium', 'Básico')),
  users            INTEGER NOT NULL DEFAULT 0,
  occurrences_month INTEGER NOT NULL DEFAULT 0,
  latitude         DOUBLE PRECISION NOT NULL,
  longitude        DOUBLE PRECISION NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 2. Ocorrências ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.occurrences (
  id           TEXT PRIMARY KEY,
  title        TEXT NOT NULL,
  municipality TEXT NOT NULL,
  category     TEXT NOT NULL
               CHECK (category IN ('Trânsito', 'Infraestrutura', 'Saneamento', 'Urgência', 'Ambiente')),
  priority     TEXT NOT NULL
               CHECK (priority IN ('Crítico', 'Alto', 'Médio', 'Baixo')),
  status       TEXT NOT NULL DEFAULT 'Pendente'
               CHECK (status IN ('Pendente', 'Em Resolução', 'Resolvido')),
  date         TEXT NOT NULL,
  reporter     TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 3. Membros da equipa ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.team_members (
  id           TEXT PRIMARY KEY,
  name         TEXT NOT NULL,
  email        TEXT NOT NULL UNIQUE,
  role         TEXT NOT NULL
               CHECK (role IN ('Super Administrador', 'Administrador Local')),
  municipality TEXT NOT NULL,
  status       TEXT NOT NULL DEFAULT 'Ativo'
               CHECK (status IN ('Ativo', 'Inativo')),
  last_active  TEXT NOT NULL DEFAULT 'Ativo agora',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── 4. Políticas Row Level Security (RLS) ────────────────────
-- Habilita RLS mas permite leitura pública com chave anon
ALTER TABLE public.municipalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.occurrences    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members   ENABLE ROW LEVEL SECURITY;

-- Leitura pública (anon)
CREATE POLICY "Allow anon read municipalities"
  ON public.municipalities FOR SELECT USING (true);

CREATE POLICY "Allow anon read occurrences"
  ON public.occurrences FOR SELECT USING (true);

CREATE POLICY "Allow anon read team_members"
  ON public.team_members FOR SELECT USING (true);

-- Escrita com chave anon (admin app)
CREATE POLICY "Allow anon insert/update/delete municipalities"
  ON public.municipalities FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon insert/update/delete occurrences"
  ON public.occurrences FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow anon insert/update/delete team_members"
  ON public.team_members FOR ALL USING (true) WITH CHECK (true);

-- ── 5. Dados iniciais – Municípios ───────────────────────────
INSERT INTO public.municipalities (id, name, code, status, plan, users, occurrences_month, latitude, longitude)
VALUES
  ('T-4029-LIS', 'Lisboa',  'LX', 'Ativo',    'Enterprise', 245, 12402, 38.7223, -9.1393),
  ('T-1182-POR', 'Porto',   'PR', 'Ativo',    'Premium',    112, 8912,  41.1579, -8.6291),
  ('T-9912-COI', 'Coimbra', 'CO', 'Pendente', 'Básico',     12,  144,   40.2033, -8.4103),
  ('T-3321-BRA', 'Braga',   'BR', 'Inativo',  'Enterprise', 85,  0,     41.5503, -8.4201)
ON CONFLICT (id) DO NOTHING;

-- ── 6. Dados iniciais – Ocorrências ─────────────────────────
INSERT INTO public.occurrences (id, title, municipality, category, priority, status, date, reporter)
VALUES
  ('INC-4029-01', 'Semáforos desligados no cruzamento central', 'Lisboa',  'Trânsito',      'Crítico', 'Pendente',      '3 de Jun., 2026', 'Carlos Cruz'),
  ('INC-1182-02', 'Inundação por rutura de cano principal',     'Porto',   'Saneamento',    'Alto',    'Em Resolução',  '3 de Jun., 2026', 'Soraia Mendes'),
  ('INC-9912-03', 'Rachadura visível em pilar de viaduto',      'Coimbra', 'Infraestrutura','Crítico', 'Pendente',      '2 de Jun., 2026', 'Gabriel Santos'),
  ('INC-3321-04', 'Recipiente de resíduos bio-orgânicos danificado', 'Braga', 'Saneamento', 'Baixo',   'Resolvido',     '1 de Jun., 2026', 'Mariana Lima'),
  ('INC-4029-05', 'Emanação acústica anormal em zona residencial',  'Lisboa', 'Ambiente',   'Médio',   'Resolvido',     '31 de Maio, 2026','Rita Patrício')
ON CONFLICT (id) DO NOTHING;

-- ── 7. Dados iniciais – Equipa ───────────────────────────────
INSERT INTO public.team_members (id, name, email, role, municipality, status, last_active)
VALUES
  ('USR-0001', 'Vilanio Neto',   'netoevilanio@gmail.com',      'Super Administrador',  'Multimunicipal', 'Ativo',   'Ativo agora'),
  ('USR-0002', 'Ana Silva',      'ana.silva@porto.gov.pt',      'Administrador Local',  'Porto',          'Ativo',   'Há 12 min'),
  ('USR-0003', 'Carlos Rebelo',  'c.rebelo@lisboa.pt',          'Administrador Local',  'Lisboa',         'Ativo',   'Há 1 hora'),
  ('USR-0004', 'Inês Costa',     'ines.costa@coimbra.pt',       'Administrador Local',  'Coimbra',        'Inativo', 'Há 3 dias')
ON CONFLICT (id) DO NOTHING;
