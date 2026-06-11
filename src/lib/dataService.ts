/**
 * smartcity-admin – Serviço de dados Supabase
 * Todas as operações CRUD das 3 entidades principais:
 *   municipalities | occurrences | team_members
 */
import { supabase, supabaseAdmin, DbMunicipality, DbOccurrence, DbTeamMember, DbServiceOrder } from './supabase';
import type { Municipality, OccurrencesRecord, TeamMember } from '../types';

// ── Mappers DB → App ──────────────────────────────────────────

function dbToMunicipality(r: DbMunicipality): Municipality {
  return {
    id: r.id,
    name: r.name,
    code: r.code,
    status: r.status,
    plan: r.plan,
    users: r.users,
    occurrencesMonth: r.occurrences_month,
    latitude: r.latitude,
    longitude: r.longitude,
  };
}

function municipalityToDb(m: Municipality): DbMunicipality {
  return {
    id: m.id,
    name: m.name,
    code: m.code,
    status: m.status,
    plan: m.plan,
    users: m.users,
    occurrences_month: m.occurrencesMonth,
    latitude: m.latitude,
    longitude: m.longitude,
  };
}

export function dbToOccurrence(r: DbOccurrence): OccurrencesRecord {
  return {
    id: r.id,
    title: r.title,
    municipality: r.municipality,
    category: r.category,
    priority: r.priority,
    status: r.status,
    date: r.date,
    reporter: r.reporter,
    latitude: r.latitude,
    longitude: r.longitude,
    description: r.description,
    neighborhood: r.neighborhood,
    address: r.address,
  };
}

function dbToTeamMember(r: DbTeamMember): TeamMember {
  return {
    id: r.id,
    name: r.name,
    email: r.email,
    role: r.role,
    municipality: r.municipality,
    status: r.status,
    lastActive: r.last_active,
  };
}

// ══════════════════════════════════════════════════════════════
// MUNICIPALITIES
// ══════════════════════════════════════════════════════════════

export async function fetchMunicipalities(): Promise<Municipality[]> {
  const { data, error } = await supabase
    .from('municipalities')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`[fetchMunicipalities] ${error.message}`);
  return (data as DbMunicipality[]).map(dbToMunicipality);
}

export async function upsertMunicipality(m: Municipality): Promise<void> {
  const { error } = await supabase
    .from('municipalities')
    .upsert(municipalityToDb(m), { onConflict: 'id' });

  if (error) throw new Error(`[upsertMunicipality] ${error.message}`);
}

export async function deleteMunicipality(id: string): Promise<void> {
  const { error } = await supabase
    .from('municipalities')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`[deleteMunicipality] ${error.message}`);
}

// ══════════════════════════════════════════════════════════════
// OCCURRENCES
// ══════════════════════════════════════════════════════════════

export async function fetchOccurrences(): Promise<OccurrencesRecord[]> {
  const { data, error } = await supabase
    .from('occurrences')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`[fetchOccurrences] ${error.message}`);
  return (data as DbOccurrence[]).map(dbToOccurrence);
}

export async function insertOccurrence(o: OccurrencesRecord): Promise<void> {
  const { error } = await supabase.from('occurrences').insert({
    id: o.id,
    title: o.title,
    municipality: o.municipality,
    category: o.category,
    priority: o.priority,
    status: o.status,
    date: o.date,
    reporter: o.reporter,
  } satisfies DbOccurrence);

  if (error) throw new Error(`[insertOccurrence] ${error.message}`);
}

export async function updateOccurrenceStatus(
  id: string,
  status: 'Pendente' | 'Em Resolução' | 'Resolvido'
): Promise<void> {
  const { error } = await supabase
    .from('occurrences')
    .update({ status })
    .eq('id', id);

  if (error) throw new Error(`[updateOccurrenceStatus] ${error.message}`);
}

// ══════════════════════════════════════════════════════════════
// TEAM MEMBERS
// ══════════════════════════════════════════════════════════════

export async function fetchTeamMembers(): Promise<TeamMember[]> {
  const { data, error } = await supabase
    .from('team_members')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw new Error(`[fetchTeamMembers] ${error.message}`);
  return (data as DbTeamMember[]).map(dbToTeamMember);
}

export async function upsertTeamMember(m: TeamMember): Promise<void> {
  const { error } = await supabase.from('team_members').upsert(
    {
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      municipality: m.municipality,
      status: m.status,
      last_active: m.lastActive,
    } satisfies DbTeamMember,
    { onConflict: 'id' }
  );

  if (error) throw new Error(`[upsertTeamMember] ${error.message}`);
}

export async function deleteTeamMember(id: string): Promise<void> {
  const { error } = await supabase
    .from('team_members')
    .delete()
    .eq('id', id);

  if (error) throw new Error(`[deleteTeamMember] ${error.message}`);
}

// ══════════════════════════════════════════════════════════════
// SERVICE ORDERS
// ══════════════════════════════════════════════════════════════

export type ServiceOrderWithOccurrence = DbServiceOrder & {
  occurrences: DbOccurrence | null;
};

export async function fetchServiceOrders(): Promise<ServiceOrderWithOccurrence[]> {
  const { data, error } = await supabase
    .from('service_orders')
    .select('*, occurrences(*)')
    .order('created_at', { ascending: false });

  if (error) throw new Error(`[fetchServiceOrders] ${error.message}`);
  return (data ?? []) as ServiceOrderWithOccurrence[];
}

// ══════════════════════════════════════════════════════════════
// AUTH – CRIAR OPERADOR
// ══════════════════════════════════════════════════════════════

function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pass = '';
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass + 'A1';
}

export async function createTeamMemberAuth(
  email: string,
  name: string,
  role: string
): Promise<string> {
  if (!supabaseAdmin) {
    throw new Error(
      '[createTeamMemberAuth] VITE_SUPABASE_SERVICE_KEY não definida. ' +
      'Adicione a service_role key no ficheiro .env para poder criar operadores.'
    );
  }

  const password = generateTempPassword();

  const { error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name,
      role: role === 'Super Administrador' ? 'super_admin' : 'operador',
    },
  });

  if (error?.message?.includes('already been registered')) {
    const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    if (listError) throw new Error(`[createTeamMemberAuth] ${listError.message}`);

    const existing = users?.users.find((u) => u.email === email);
    if (!existing) throw new Error(`[createTeamMemberAuth] Usuário com email ${email} não encontrado.`);

    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      existing.id,
      { password, user_metadata: { name, role: role === 'Super Administrador' ? 'super_admin' : 'operador' } }
    );

    if (updateError) throw new Error(`[createTeamMemberAuth] ${updateError.message}`);

    return password;
  }

  if (error) throw new Error(`[createTeamMemberAuth] ${error.message}`);

  return password;
}

// ══════════════════════════════════════════════════════════════
// HEALTH CHECK – verifica conectividade com o Supabase
// ══════════════════════════════════════════════════════════════

export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('municipalities')
      .select('id')
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}
