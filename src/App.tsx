import { useState, useEffect, useTransition, useCallback } from 'react';
import type { ActiveTab, Municipality, OccurrencesRecord, TeamMember } from './types';
import Sidebar from './components/Sidebar';
import MetricCards from './components/MetricCards';
import ChartsSection from './components/ChartsSection';
import MunicipalityTable from './components/MunicipalityTable';
import RegisterModal from './components/RegisterModal';
import FooterCards from './components/FooterCards';
import MapView from './components/MapView';
import OccurrencesTab from './components/OccurrencesTab';
import TeamTab from './components/TeamTab';
import HeatmapsTab from './components/HeatmapsTab';
import SettingsTab from './components/SettingsTab';
import { PlusCircle, Loader2, WifiOff, RefreshCw } from 'lucide-react';
import {
  fetchMunicipalities,
  fetchOccurrences,
  fetchTeamMembers,
  fetchServiceOrders,
  upsertMunicipality,
  deleteMunicipality,
  insertOccurrence,
  updateOccurrenceStatus,
  upsertTeamMember,
  deleteTeamMember,
  createTeamMemberAuth,
  dbToOccurrence,
  type ServiceOrderWithOccurrence,
} from './lib/dataService';
import { supabase } from './lib/supabase';
import type { DbOccurrence } from './lib/supabase';

// ── Dados de fallback (usados se Supabase não estiver acessível) ──
const FALLBACK_MUNICIPALITIES: Municipality[] = [
  { id: 'T-4029-LIS', name: 'Lisboa',  code: 'LX', status: 'Ativo',    plan: 'Enterprise', users: 245, occurrencesMonth: 12402, latitude: 38.7223, longitude: -9.1393 },
  { id: 'T-1182-POR', name: 'Porto',   code: 'PR', status: 'Ativo',    plan: 'Premium',    users: 112, occurrencesMonth: 8912,  latitude: 41.1579, longitude: -8.6291 },
  { id: 'T-9912-COI', name: 'Coimbra', code: 'CO', status: 'Pendente', plan: 'Básico',     users: 12,  occurrencesMonth: 144,   latitude: 40.2033, longitude: -8.4103 },
  { id: 'T-3321-BRA', name: 'Braga',   code: 'BR', status: 'Inativo',  plan: 'Enterprise', users: 85,  occurrencesMonth: 0,     latitude: 41.5503, longitude: -8.4201 },
];

const FALLBACK_OCCURRENCES: OccurrencesRecord[] = [
  { id: 'INC-4029-01', title: 'Semáforos desligados no cruzamento central',   municipality: 'Lisboa',  category: 'Trânsito',       priority: 'Crítico', status: 'Pendente',     date: '3 de Jun., 2026',  reporter: 'Carlos Cruz',    latitude: 38.7223, longitude: -9.1393 },
  { id: 'INC-1182-02', title: 'Inundação por rutura de cano principal',       municipality: 'Porto',   category: 'Saneamento',     priority: 'Alto',    status: 'Em Resolução', date: '3 de Jun., 2026',  reporter: 'Soraia Mendes',  latitude: 41.1579, longitude: -8.6291 },
  { id: 'INC-9912-03', title: 'Rachadura visível em pilar de viaduto',        municipality: 'Coimbra', category: 'Infraestrutura', priority: 'Crítico', status: 'Pendente',     date: '2 de Jun., 2026',  reporter: 'Gabriel Santos', latitude: 40.2033, longitude: -8.4103 },
  { id: 'INC-3321-04', title: 'Recipiente de resíduos bio-orgânicos danificado', municipality: 'Braga', category: 'Saneamento',  priority: 'Baixo',   status: 'Resolvido',    date: '1 de Jun., 2026',  reporter: 'Mariana Lima',   latitude: 41.5503, longitude: -8.4201 },
  { id: 'INC-4029-05', title: 'Emanação acústica anormal em zona residencial',municipality: 'Lisboa',  category: 'Ambiente',       priority: 'Médio',   status: 'Resolvido',    date: '31 de Maio, 2026', reporter: 'Rita Patrício',  latitude: 38.7223, longitude: -9.1393 },
];

const FALLBACK_TEAM: TeamMember[] = [
  { id: 'USR-0001', name: 'Vilanio Neto',  email: 'netoevilanio@gmail.com',   role: 'Super Administrador', municipality: 'Multimunicipal', status: 'Ativo',   lastActive: 'Ativo agora' },
  { id: 'USR-0002', name: 'Ana Silva',     email: 'ana.silva@porto.gov.pt',   role: 'Administrador Local', municipality: 'Porto',          status: 'Ativo',   lastActive: 'Há 12 min'  },
  { id: 'USR-0003', name: 'Carlos Rebelo', email: 'c.rebelo@lisboa.pt',       role: 'Administrador Local', municipality: 'Lisboa',         status: 'Ativo',   lastActive: 'Há 1 hora'  },
  { id: 'USR-0004', name: 'Inês Costa',    email: 'ines.costa@coimbra.pt',    role: 'Administrador Local', municipality: 'Coimbra',        status: 'Inativo', lastActive: 'Há 3 dias'  },
];

// ── Tipos de estado de carregamento ────────────────────────────
type LoadState = 'loading' | 'ready' | 'error' | 'offline';

export default function App() {
  const [activeTab, setActiveTab]   = useState<ActiveTab>('dashboard');
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [occurrences, setOccurrences]       = useState<OccurrencesRecord[]>([]);
  const [teamMembers, setTeamMembers]       = useState<TeamMember[]>([]);
  const [serviceOrders, setServiceOrders]   = useState<ServiceOrderWithOccurrence[]>([]);
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedPlanFilter, setSelectedPlanFilter] = useState<'Enterprise' | 'Premium' | 'Básico' | null>(null);
  const [loadState, setLoadState]   = useState<LoadState>('loading');
  const [dbError, setDbError]       = useState<string | null>(null);

  const [, startTransition] = useTransition();

  const TOTAL_OCCURRENCES_BASE_OFFSET = 84291 - 21622;

  // ── Carregamento inicial dos dados do Supabase ───────────────
  const loadData = useCallback(async () => {
    setLoadState('loading');
    setDbError(null);
    try {
      const [muns, occs, team, sos] = await Promise.all([
        fetchMunicipalities(),
        fetchOccurrences(),
        fetchTeamMembers(),
        fetchServiceOrders(),
      ]);
      setMunicipalities(muns);
      setOccurrences(occs);
      setTeamMembers(team);
      setServiceOrders(sos);
      setLoadState('ready');
    } catch (err: any) {
      console.error('[Supabase] Erro ao carregar dados:', err);
      // Usar dados de fallback locais para não bloquear a UI
      setMunicipalities(FALLBACK_MUNICIPALITIES);
      setOccurrences(FALLBACK_OCCURRENCES);
      setTeamMembers(FALLBACK_TEAM);
      setServiceOrders([]);
      setDbError(err?.message ?? 'Erro de conexão com a base de dados.');
      setLoadState('offline');
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── Realtime: escuta mudanças em ocorrências ────────────────
  useEffect(() => {
    const channel = supabase
      .channel('occurrences-realtime')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'occurrences' },
        (payload) => {
          const record = dbToOccurrence(payload.new as DbOccurrence);
          setOccurrences((prev) => {
            if (prev.some((o) => o.id === record.id)) return prev;
            return [record, ...prev];
          });
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'occurrences' },
        (payload) => {
          const record = dbToOccurrence(payload.new as DbOccurrence);
          setOccurrences((prev) =>
            prev.map((o) => (o.id === record.id ? record : o))
          );
        }
      )
      .on('postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'occurrences' },
        (payload) => {
          const oldId = (payload.old as DbOccurrence).id;
          setOccurrences((prev) => prev.filter((o) => o.id !== oldId));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Handlers – Municípios ────────────────────────────────────
  const handleAddMunicipality = async (m: Municipality) => {
    setMunicipalities((prev) => [m, ...prev]);
    setIsRegisterOpen(false);
    try { await upsertMunicipality(m); }
    catch (e) { console.error('[upsertMunicipality]', e); }
  };

  const handleUpdateMunicipality = async (updated: Municipality) => {
    setMunicipalities((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    try { await upsertMunicipality(updated); }
    catch (e) { console.error('[upsertMunicipality]', e); }
  };

  const handleDeleteMunicipality = async (id: string) => {
    setMunicipalities((prev) => prev.filter((m) => m.id !== id));
    try { await deleteMunicipality(id); }
    catch (e) { console.error('[deleteMunicipality]', e); }
  };

  // ── Handlers – Alertas / Ocorrências ────────────────────────
  const handleTriggerMockAlerts = async (cityId: string) => {
    const city = municipalities.find((m) => m.id === cityId);
    if (!city) return;

    const randomId = `INC-${Math.floor(1000 + Math.random() * 9000)}`;
    const titles = [
      'Alerta acústico excedido em via pública',
      'Fuga de CO2 reportada por sensor atmosférico',
      'Bloqueio inesperado da artéria comercial',
      'Desprendimento menor de asfalto periférico',
    ];
    const categories: OccurrencesRecord['category'][] = ['Ambiente', 'Ambiente', 'Trânsito', 'Infraestrutura'];
    const idx = Math.floor(Math.random() * titles.length);

    const newTicket: OccurrencesRecord = {
      id: randomId,
      title: titles[idx],
      municipality: city.name,
      category: categories[idx],
      priority: Math.random() > 0.5 ? 'Crítico' : 'Alto',
      status: 'Pendente',
      date: 'Agora mesmo',
      reporter: 'Sensor IoT Automático',
    };

    // Optimistic UI
    setOccurrences((prev) => [newTicket, ...prev]);
    setMunicipalities((prev) =>
      prev.map((m) =>
        m.id === cityId
          ? { ...m, occurrencesMonth: m.occurrencesMonth + 1, status: 'Pendente' }
          : m
      )
    );

    // Persist
    try {
      await insertOccurrence(newTicket);
      await upsertMunicipality({
        ...city,
        occurrencesMonth: city.occurrencesMonth + 1,
        status: 'Pendente',
      });
    } catch (e) { console.error('[handleTriggerMockAlerts]', e); }
  };

  const handleUpdateOccurrenceStatus = async (
    id: string,
    nextStatus: 'Pendente' | 'Em Resolução' | 'Resolvido'
  ) => {
    setOccurrences((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: nextStatus } : item))
    );

    const ticket = occurrences.find((o) => o.id === id);
    if (ticket && nextStatus === 'Resolvido') {
      const city = municipalities.find((m) => m.name === ticket.municipality);
      if (city && city.status === 'Pendente') {
        const hasOtherPendings = occurrences.some(
          (o) => o.id !== id && o.municipality === ticket.municipality && o.status === 'Pendente'
        );
        if (!hasOtherPendings) {
          const updated = { ...city, status: 'Ativo' as const };
          setMunicipalities((prev) => prev.map((m) => (m.name === ticket.municipality ? updated : m)));
          try { await upsertMunicipality(updated); } catch (e) { console.error(e); }
        }
      }
    }

    try { await updateOccurrenceStatus(id, nextStatus); }
    catch (e) { console.error('[updateOccurrenceStatus]', e); }
  };

  const handleAddNewOccurrence = async (newRec: OccurrencesRecord) => {
    setOccurrences((prev) => [newRec, ...prev]);
    try { await insertOccurrence(newRec); }
    catch (e) { console.error('[insertOccurrence]', e); }
  };

  // ── Handlers – Equipa ────────────────────────────────────────
  const handleAddTeamMember = async (m: TeamMember) => {
    setTeamMembers((prev) => [m, ...prev]);
    try {
      const password = await createTeamMemberAuth(m.email, m.name, m.role);
      await upsertTeamMember(m);
      alert(
        `Operador criado com sucesso!\n\n` +
        `Email: ${m.email}\n` +
        `Senha temporária: ${password}\n\n` +
        `O operador deve usar estas credenciais no aplicativo móvel SmartCity Field.`
      );
    } catch (e) {
      console.error('[handleAddTeamMember]', e);
      alert(`Erro ao criar operador: ${e}`);
    }
  };

  const handleUpdateTeamMember = async (updated: TeamMember) => {
    setTeamMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    try { await upsertTeamMember(updated); }
    catch (e) { console.error('[upsertTeamMember]', e); }
  };

  const handleDeleteTeamMember = async (id: string) => {
    setTeamMembers((prev) => prev.filter((m) => m.id !== id));
    try { await deleteTeamMember(id); }
    catch (e) { console.error('[deleteTeamMember]', e); }
  };

  // ── Export ────────────────────────────────────────────────────
  const handleExportReport = () => {
    const reportData =
      `URBANPULSE SYSTEMS INTEGRAL SUMMARY EXPORT\n` +
      `===========================================\n` +
      `Cidades sob monitorização: ${municipalities.length}\n` +
      municipalities.map((m) => `  - ${m.name} (${m.plan}): ${m.users} utilizadores / ${m.occurrencesMonth} ocorrências\n`).join('') +
      `Total de Tickets Geridos: ${occurrences.length}\n` +
      `Ficheiro compilado pelo Super Administrador Vilanio Neto.\n`;

    const blob = new Blob([reportData], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SmartCity_UrbanPulse_Report_Export.txt`;
    link.click();
    URL.revokeObjectURL(url);
    alert('Ficheiro de relatório global compilado com sucesso e transferido!');
  };

  const handleLogout = () => {
    if (confirm('Tem certeza de que deseja terminar sessão do painel SmartCity Admin?')) {
      alert('Sessão encerrada com sucesso. Redirecionando para portal simulado.');
    }
  };

  // ── Loading screen ────────────────────────────────────────────
  if (loadState === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-on-surface">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin mx-auto" />
          <p className="text-sm font-semibold text-on-surface-variant">A conectar ao Supabase SmartCity…</p>
          <p className="text-xs text-on-surface-variant/50 font-mono">rqjwxoevziywtprkddst · sa-east-1</p>
        </div>
      </div>
    );
  }

  // ── Main UI ───────────────────────────────────────────────────
  return (
    <div className="flex min-h-screen bg-background text-on-surface font-sans selection:bg-surface-container-high selection:text-primary">

      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => startTransition(() => setActiveTab(tab))}
        onExportReport={handleExportReport}
        onLogout={handleLogout}
      />

      <main className="ml-72 flex-1 p-10 max-w-7xl mx-auto space-y-10 min-h-screen">

        {/* ── Banner de estado da BD ────────────────────────── */}
        {loadState === 'offline' && (
          <div className="flex items-center justify-between gap-3 bg-tertiary-container/60 border border-tertiary/30 text-on-tertiary-container px-4 py-3 rounded-xl text-xs font-medium">
            <div className="flex items-center gap-2">
              <WifiOff className="h-4 w-4 shrink-0" />
              <span>
                <strong>Modo offline</strong> — A mostrar dados locais.
                {dbError && <span className="ml-1 opacity-70">{dbError}</span>}
              </span>
            </div>
            <button
              onClick={loadData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-tertiary/20 hover:bg-tertiary/30 transition-all cursor-pointer border-none font-semibold"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Tentar novamente
            </button>
          </div>
        )}

        {loadState === 'ready' && (
          <div className="flex items-center gap-2 bg-secondary-container/40 border border-secondary/20 text-on-secondary-container px-4 py-2 rounded-xl text-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse inline-block" />
            Supabase conectado · <span className="font-mono opacity-70">rqjwxoevziywtprkddst · sa-east-1</span>
          </div>
        )}

        {/* ── Dashboard ─────────────────────────────────────── */}
        {activeTab === 'dashboard' && (
          <div className="animate-in fade-in duration-300 space-y-10">
            <header className="flex justify-between items-end mb-10">
              <div>
                <h2 className="text-3xl font-bold text-on-surface mb-1">Painel do Super Administrador</h2>
                <p className="text-base text-on-surface-variant">Visão global da infraestrutura UrbanPulse em múltiplas municipalidades.</p>
              </div>
              <button
                id="btn-onboarding-municipality"
                onClick={() => setIsRegisterOpen(true)}
                className="bg-primary-container text-on-primary-container hover:opacity-90 px-6 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer border-none"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Registar Novo Município</span>
              </button>
            </header>

            <MetricCards municipalities={municipalities} totalOccurrencesBase={TOTAL_OCCURRENCES_BASE_OFFSET} />
            <ChartsSection municipalities={municipalities} selectedPlanFilter={selectedPlanFilter} setSelectedPlanFilter={setSelectedPlanFilter} />
            <MunicipalityTable
              municipalities={municipalities}
              selectedPlanFilter={selectedPlanFilter}
              setSelectedPlanFilter={setSelectedPlanFilter}
              onUpdateMunicipality={handleUpdateMunicipality}
              onDeleteMunicipality={handleDeleteMunicipality}
              onTriggerMockAlerts={handleTriggerMockAlerts}
            />
            <FooterCards />
          </div>
        )}

        {/* ── Mapa GIS ─────────────────────────────────────── */}
        {activeTab === 'map' && (
          <MapView
            municipalities={municipalities}
            occurrences={occurrences}
            serviceOrders={serviceOrders}
            onUpdateMunicipality={handleUpdateMunicipality}
            onTriggerMockAlerts={handleTriggerMockAlerts}
          />
        )}

        {/* ── Ocorrências ──────────────────────────────────── */}
        {activeTab === 'occurrences' && (
          <OccurrencesTab
            initialOccurrences={occurrences}
            onAddNewOccurrence={handleAddNewOccurrence}
            onUpdateOccurrenceStatus={handleUpdateOccurrenceStatus}
          />
        )}

        {/* ── Equipa ───────────────────────────────────────── */}
        {activeTab === 'team' && (
          <TeamTab
            initialMembers={teamMembers}
            onAddNewMember={handleAddTeamMember}
            onUpdateMember={handleUpdateTeamMember}
            onDeleteMember={handleDeleteTeamMember}
            municipalities={municipalities}
          />
        )}

        {activeTab === 'heatmaps' && <HeatmapsTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>

      <RegisterModal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        onSave={handleAddMunicipality}
      />
    </div>
  );
}
