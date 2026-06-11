import { useState } from 'react';
import { Search, Clock, RefreshCw, CheckCircle, HelpCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { OccurrencesRecord, OccurrenceStatus } from '../types';

interface OccurrencesTabProps {
  initialOccurrences: OccurrencesRecord[];
  onAddNewOccurrence: (newRec: OccurrencesRecord) => void;
  onUpdateOccurrenceStatus: (id: string, nextStatus: 'Pendente' | 'Em Resolução' | 'Resolvido') => void;
}

export default function OccurrencesTab({ 
  initialOccurrences, 
  onAddNewOccurrence, 
  onUpdateOccurrenceStatus 
}: OccurrencesTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [priorityFilter, setPriorityFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');

  // Stats
  const stats = {
    total: initialOccurrences.length,
    pendente: initialOccurrences.filter(o => o.status === 'Pendente').length,
    emResolucao: initialOccurrences.filter(o => o.status === 'Em Resolução').length,
    resolvido: initialOccurrences.filter(o => o.status === 'Resolvido').length,
  };

  // Filter application
  const filtered = initialOccurrences.filter((rec) => {
    const matchesSearch = rec.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          rec.municipality.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          rec.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' ? true : rec.category === categoryFilter;
    const matchesPriority = priorityFilter === 'All' ? true : rec.priority === priorityFilter;
    const matchesStatus = statusFilter === 'All' ? true : rec.status === statusFilter;
    
    return matchesSearch && matchesCategory && matchesPriority && matchesStatus;
  });

  const getPriorityBadgeStyle = (priority: OccurrencesRecord['priority']) => {
    switch (priority) {
      case 'Crítico': return 'border border-[#ba1a1a] text-[#ba1a1a] bg-[#ba1a1a]/10';
      case 'Alto': return 'border border-tertiary text-tertiary bg-tertiary/10';
      case 'Médio': return 'border border-primary text-primary bg-primary/10';
      case 'Baixo': return 'border border-outline text-on-surface-variant bg-surface-container';
      default: return 'border border-outline text-on-surface-variant bg-surface-container';
    }
  };

  const getStatusIconAndStyle = (status: OccurrenceStatus) => {
    switch (status) {
      case 'Pendente':
        return { icon: Clock, classes: 'border border-error text-error bg-error/10' };
      case 'Em Resolução':
        return { icon: RefreshCw, classes: 'border border-primary text-primary bg-primary/10 animate-spin-slow' };
      case 'Resolvido':
        return { icon: CheckCircle, classes: 'border border-secondary text-secondary bg-secondary/10' };
      case 'Aberto':
      case 'Em análise':
      case 'Encaminhado':
      case 'Em atendimento':
        return { icon: AlertTriangle, classes: 'border border-warning text-warning bg-warning/10' };
      case 'Rejeitado':
      case 'Duplicado':
      case 'Cancelado':
      case 'Cancelada':
        return { icon: XCircle, classes: 'border border-on-surface-variant text-on-surface-variant bg-surface-container/50' };
      default:
        return { icon: HelpCircle, classes: 'border border-outline text-on-surface-variant bg-surface-container' };
    }
  };

  return (
    <div id="occurrences-view-terminal" className="space-y-6 animate-in fade-in duration-300 font-sans">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-on-surface mb-1">Ocorrências Atendidas</h2>
        <p className="text-base text-on-surface-variant">Mapeamento, despacho e alteração imediata de relatórios municipais</p>
      </div>

      {/* Internal occurrence specific micro stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 bg-surface-container border border-outline-variant rounded-xl">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Mapeadas Ativas</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-on-surface">{stats.total}</span>
            <span className="text-[10px] text-on-surface-variant/70 uppercase">totais</span>
          </div>
        </div>

        <div className="p-5 bg-surface-container border border-outline-variant rounded-xl">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Pendentes de Despacho</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-error">{stats.pendente}</span>
            <span className="text-[10px] text-on-surface-variant/70 uppercase font-medium">críticos</span>
          </div>
        </div>

        <div className="p-5 bg-surface-container border border-outline-variant rounded-xl">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">A ser Resolvidas</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-primary">{stats.emResolucao}</span>
            <span className="text-[10px] text-on-surface-variant/70 uppercase font-medium">no terreno</span>
          </div>
        </div>

        <div className="p-5 bg-surface-container border border-outline-variant rounded-xl">
          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">Soluções Efetuadas</p>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-secondary">{stats.resolvido}</span>
            <span className="text-[10px] text-on-surface-variant/70 uppercase font-medium">concluídas</span>
          </div>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="bg-surface-container-low border border-outline-variant p-4 rounded-xl space-y-4">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Text Search block */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline h-4.5 w-4.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por título, município ou id..."
              className="w-full pl-10 pr-4 py-2 h-10 bg-surface border border-outline-variant rounded-lg text-xs text-on-surface placeholder-on-surface-variant/50 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-sans"
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 shrink-0">
            {/* Category selection */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-10 px-4 bg-surface border border-outline-variant text-on-surface-variant rounded-lg font-semibold text-xs transition-colors cursor-pointer outline-none"
            >
              <option value="All">CATEGORIAS (TODAS)</option>
              <option value="Trânsito">TRÂNSITO</option>
              <option value="Infraestrutura">INFRAESTRUTURA</option>
              <option value="Saneamento">SANEAMENTO</option>
              <option value="Urgência">URGÊNCIA</option>
              <option value="Ambiente">AMBIENTE</option>
            </select>

            {/* Priority filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="h-10 px-4 bg-surface border border-outline-variant text-on-surface-variant rounded-lg font-semibold text-xs transition-colors cursor-pointer outline-none"
            >
              <option value="All">PRIORIDADES (TODAS)</option>
              <option value="Crítico">CRÍTICO</option>
              <option value="Alto">ALTO</option>
              <option value="Médio">MÉDIO</option>
              <option value="Baixo">BAIXO</option>
            </select>

            {/* Ticket status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-10 px-4 bg-surface border border-outline-variant text-on-surface-variant rounded-lg font-semibold text-xs transition-colors cursor-pointer outline-none"
            >
              <option value="All">ESTADOS (TODOS)</option>
              <option value="Pendente">PENDENTE</option>
              <option value="Em Resolução">EM RESOLUÇÃO</option>
              <option value="Resolvido">RESOLVIDO</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main tickets view panel */}
      <div className="bg-transparent border border-outline-variant overflow-hidden rounded-xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container text-on-surface font-semibold text-xs border-b border-outline-variant">
                <th className="px-6 py-4">ID</th>
                <th className="px-6 py-4">Localização / Município</th>
                <th className="px-6 py-4">Incidente / Descrição</th>
                <th className="px-6 py-4">Prioridade</th>
                <th className="px-6 py-4">Categoria</th>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4 text-right">Ação Rápida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.length > 0 ? (
                filtered.map((item) => {
                  const statusInfo = getStatusIconAndStyle(item.status);
                  const StatusIcon = statusInfo.icon;
                  return (
                    <tr key={item.id} className="hover:bg-surface-container/30 transition-colors">
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono font-medium text-on-surface-variant">{item.id}</span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-on-surface text-sm uppercase tracking-tight">{item.municipality}</p>
                        <p className="text-[10px] text-on-surface-variant mt-1">{item.date}</p>
                      </td>
                      <td className="px-6 py-4 max-w-xs">
                        <p className="font-semibold text-on-surface text-sm truncate">{item.title}</p>
                        <p className="text-[10px] font-mono text-on-surface-variant mt-1 uppercase">RESP: {item.reporter}</p>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-[10px] font-semibold px-2.5 py-1 rounded inline-block ${getPriorityBadgeStyle(item.priority)}`}>
                          {item.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] font-semibold text-on-surface bg-surface-container-high border border-outline-variant px-2.5 py-1 rounded">
                          {item.category}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded w-fit ${statusInfo.classes}`}>
                          <StatusIcon className="h-3 w-3 shrink-0" />
                          <span>{item.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {item.status !== 'Resolvido' ? (
                          <button
                            onClick={() => {
                              const next = item.status === 'Pendente' ? 'Em Resolução' : 'Resolvido';
                              onUpdateOccurrenceStatus(item.id, next);
                            }}
                            className={`px-3 py-1.5 font-bold text-xs rounded-lg transition-all cursor-pointer border-none shadow-sm ${
                              item.status === 'Pendente'
                                ? 'bg-primary text-on-primary hover:opacity-90'
                                : 'bg-surface-container-high hover:bg-surface-variant text-on-surface'
                            }`}
                          >
                            {item.status === 'Pendente' ? 'Despachar' : 'Concluir'}
                          </button>
                        ) : (
                          <span className="text-xs text-secondary font-bold flex items-center gap-1.5 justify-end">
                            <CheckCircle className="h-4 w-4" />
                            <span>Resolvido</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-on-surface-variant/50 font-sans text-xs uppercase tracking-widest">
                    Nenhuma ocorrência municipal corresponde aos filtros ativos.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
