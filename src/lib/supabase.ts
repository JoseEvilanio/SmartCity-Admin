import { createClient } from '@supabase/supabase-js';

// ── Credenciais Supabase – Projeto SmartCity ─────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error(
    '[Supabase] VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem estar definidas no ficheiro .env'
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  db: { schema: 'public' },
  global: {
    headers: {
      'x-application-name': 'smartcity-admin',
      'x-client-info': 'smartcity-admin/1.0.0',
    },
  },
});

const SERVICE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_KEY as string | undefined;
export const supabaseAdmin = SERVICE_KEY
  ? createClient(SUPABASE_URL, SERVICE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' },
    })
  : null;

// ── Metadados do projeto ──────────────────────────────────────
export const SUPABASE_CONFIG = {
  projectName: 'SmartCity',
  projectId: 'rqjwxoevziywtprkddst',
  region: 'sa-east-1',
  url: SUPABASE_URL,
  restUrl: 'https://rqjwxoevziywtprkddst.supabase.co/rest/v1/',
} as const;

// ── Tipos das tabelas DB (snake_case → camelCase mapeado no App) ──

export type DbMunicipality = {
  id: string;                  // ex: "T-4029-LIS"
  name: string;
  code: string;                // ex: "LX"
  status: 'Ativo' | 'Pendente' | 'Inativo';
  plan: 'Enterprise' | 'Premium' | 'Profissional' | 'Básico';
  users: number;
  occurrences_month: number;
  latitude: number;
  longitude: number;
  created_at?: string;
  tenant_id?: string;
  created_by?: string;
  updated_at?: string;
  state_id?: string;
  storage_used_bytes?: number;
};

export type DbOccurrence = {
  id: string;
  title: string;
  municipality: string;
  category: 'Trânsito' | 'Infraestrutura' | 'Saneamento' | 'Urgência' | 'Ambiente' |
            'Buraco na rua' | 'Vazamento de água' | 'Falta de iluminação' | 'Poste danificado' |
            'Esgoto a céu aberto' | 'Lixo acumulado' | 'Semáforo quebrado' | 'Árvore caída' |
            'Alagamento' | 'Transporte público' | 'Segurança pública' | 'Calçada danificada' |
            'Animais abandonados' | 'Outros';
  priority: 'Crítico' | 'Alto' | 'Médio' | 'Baixo';
  status: 'Pendente' | 'Em Resolução' | 'Resolvido' |
          'Aberto' | 'Em análise' | 'Encaminhado' | 'Em atendimento' |
          'Rejeitado' | 'Duplicado' | 'Cancelado' | 'Cancelada';
  date: string;
  reporter: string;
  created_at?: string;
  tenant_id?: string;
  created_by?: string;
  updated_at?: string;
  latitude?: number;
  longitude?: number;
  location?: any;
  address?: string;
  neighborhood?: string;
  state_id?: string;
  description?: string;
  secretariat_id?: string;
  team_id?: string;
};

export type DbTeamMember = {
  id: string;
  name: string;
  email: string;
  role: 'Super Administrador' | 'Administrador Local';
  municipality: string;
  status: 'Ativo' | 'Inativo';
  last_active: string;
  created_at?: string;
  tenant_id?: string;
  created_by?: string;
  updated_at?: string;
  team_id?: string;
  shift_start?: string; // Escalas
  shift_end?: string;
  productivity_score?: number; // Produtividade
};

// ── Tipos das Novas Tabelas (SaaS & Gamificação) ─────────────

export type DbState = {
  id: string;
  name: string;
  uf: string;
  tenant_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type DbProfile = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  cpf?: string;
  points: number;
  role: 'cidadao' | 'operador' | 'gestor' | 'super_admin';
  tenant_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type DbSecretariat = {
  id: string;
  municipality_id: string;
  name: string;
  sla_hours: number; // SLA da secretaria
  tenant_id: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type DbTeam = {
  id: string;
  secretariat_id: string;
  name: string;
  tenant_id: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type DbOccurrenceMedia = {
  id: string;
  occurrence_id: string;
  media_url: string;
  media_type: 'image' | 'video';
  tenant_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type DbOccurrenceComment = {
  id: string;
  occurrence_id: string;
  profile_id: string;
  comment: string;
  tenant_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type DbOccurrenceConfirmation = {
  id: string;
  occurrence_id: string;
  profile_id: string;
  tenant_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type DbOccurrenceStatusHistory = {
  id: string;
  occurrence_id: string;
  old_status?: string;
  new_status: string;
  changed_by?: string;
  notes?: string;
  tenant_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type DbServiceOrder = {
  id: string;
  os_number: string;
  occurrence_id: string;
  responsible_team_id?: string;
  deadline?: string;
  priority: 'Baixa' | 'Média' | 'Alta' | 'Crítica';
  status: 'Aberta' | 'Em Execução' | 'Concluída' | 'Cancelada';
  resolved_at?: string;
  resolution_report?: string;
  photo_before_url?: string;
  photo_after_url?: string;
  checklist?: any[]; // Checklists operacionais
  digital_signature_url?: string; // Assinatura digital
  tenant_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type DbNotification = {
  id: string;
  profile_id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  tenant_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type DbUserPoint = {
  id: string;
  profile_id: string;
  points: number;
  action_type: 'occurrence_registration' | 'confirmation' | 'comment' | 'community_participation';
  tenant_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type DbRanking = {
  id: string;
  profile_id: string;
  neighborhood: string;
  municipality_id: string;
  points: number;
  level: 'Cidadão Ativo' | 'Fiscal Comunitário' | 'Colaborador Urbano' | 'Guardião da Cidade';
  tenant_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type DbAuditLog = {
  id: string;
  user_id?: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values?: any;
  new_values?: any;
  ip_address?: string;
  tenant_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type DbPlan = {
  id: string;
  name: 'Enterprise' | 'Premium' | 'Profissional' | 'Básico';
  description?: string;
  price: number;
  max_users: number;
  max_occurrences_month: number;
  max_storage_bytes: number; // Consumo limite de armazenamento
  tenant_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type DbSubscription = {
  id: string;
  municipality_id: string;
  plan_id: string;
  status: 'Active' | 'Past Due' | 'Canceled' | 'Trialing';
  start_date: string;
  end_date?: string;
  contract_url?: string; // Contrato SaaS
  billing_email?: string; // Faturamento
  amount_paid: number; // Valor da fatura recorrente
  tenant_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type DbMunicipalitySettings = {
  id: string;
  municipality_id: string;
  theme_color?: string;
  logo_url?: string;
  timezone?: string;
  features_enabled?: any;
  tenant_id?: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
};

export type SupabaseClientType = typeof supabase;
