import { useState } from 'react';
import { Search, Filter, MoreVertical, AlertOctagon, RefreshCcw, Trash2, HelpCircle } from 'lucide-react';
import type { Municipality } from '../types';

interface MunicipalityTableProps {
  municipalities: Municipality[];
  selectedPlanFilter: string | null;
  setSelectedPlanFilter: (plan: 'Enterprise' | 'Premium' | 'Profissional' | 'Básico' | null) => void;
  onUpdateMunicipality: (updated: Municipality) => void;
  onDeleteMunicipality: (id: string) => void;
  onTriggerMockAlerts: (id: string) => void;
}

export default function MunicipalityTable({
  municipalities,
  selectedPlanFilter,
  setSelectedPlanFilter,
  onUpdateMunicipality,
  onDeleteMunicipality,
  onTriggerMockAlerts,
}: MunicipalityTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Ativo' | 'Pendente' | 'Inativo'>('All');
  const [showFiltersDropdown, setShowFiltersDropdown] = useState(false);
  const [activeActionsMenu, setActiveActionsMenu] = useState<string | null>(null);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  // 1. Filter implementation
  const filtered = municipalities.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          m.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlan = selectedPlanFilter ? m.plan === selectedPlanFilter : true;
    const matchesStatus = statusFilter === 'All' ? true : m.status === statusFilter;
    return matchesSearch && matchesPlan && matchesStatus;
  });

  // Calculate pages
  const totalItems = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // Helper inside text initials
  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  // Dynamic Avatar Color class generator mapped to the user HTML template:
  // LX: primary, PR: secondary, CO: tertiary, other: on-surface-variant
  const getAvatarStyle = (code: string) => {
    switch (code) {
      case 'LX':
        return 'bg-primary-container/20 text-primary';
      case 'PR':
        return 'bg-secondary-container/20 text-secondary';
      case 'CO':
        return 'bg-tertiary-container/20 text-tertiary';
      default:
        return 'bg-on-surface-variant/20 text-on-surface-variant';
    }
  };

  // Status-badge styles generator supporting a native clean selects wrapper
  const getStatusBadgeStyle = (status: 'Ativo' | 'Pendente' | 'Inativo') => {
    switch (status) {
      case 'Ativo':
        return 'bg-secondary-container/20 text-on-secondary-container';
      case 'Pendente':
        return 'bg-error-container/20 text-on-error-container';
      case 'Inativo':
        return 'bg-outline-variant/30 text-outline';
    }
  };

  // Plan-badge styles generator
  const getPlanBadgeStyle = (plan: 'Enterprise' | 'Premium' | 'Profissional' | 'Básico') => {
    switch (plan) {
      case 'Enterprise':
        return 'border border-primary text-primary bg-transparent';
      case 'Premium':
        return 'border border-secondary text-secondary bg-transparent';
      case 'Profissional':
        return 'border border-tertiary text-tertiary bg-transparent';
      case 'Básico':
        return 'border border-outline text-on-surface-variant bg-transparent';
    }
  };

  // Reset all filters easily
  const resetFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setSelectedPlanFilter(null);
    setCurrentPage(1);
  };

  return (
    <section id="table-municipalities-cabinet" className="glass-card rounded-xl shadow-sm overflow-hidden mb-10">
      {/* Search and Filters Header Menu */}
      <div className="p-6 border-b border-outline-variant flex flex-col sm:flex-row justify-between items-center gap-4 bg-transparent">
        <div>
          <h4 className="text-lg font-bold text-on-surface">Gestão de Municípios</h4>
        </div>
        
        <div className="flex gap-3 w-full sm:w-auto relative">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-outline h-4.5 w-4.5" />
            <input
              id="search-municipalities-input"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Procurar cidade..."
              type="text"
              className="w-full pl-10 pr-4 py-2 bg-surface-container hover:bg-surface-container-high focus:bg-surface-container-high rounded-lg text-sm text-on-surface placeholder-on-surface-variant/60 focus:outline-none focus:ring-2 focus:ring-primary transition-all border-none"
            />
          </div>

          <div className="relative">
            <button
              id="btn-filter-settings"
              onClick={() => setShowFiltersDropdown(!showFiltersDropdown)}
              className="flex items-center gap-1 px-4 py-2 bg-surface-container-high rounded-lg text-xs font-semibold text-on-surface hover:bg-surface-variant transition-colors cursor-pointer border-none"
            >
              <Filter className="h-4 w-4" />
              <span>Filtros</span>
              {(statusFilter !== 'All' || selectedPlanFilter !== null) && (
                <span className="w-2.5 h-2.5 rounded-full bg-error ml-1"></span>
              )}
            </button>

            {/* Filter Float Selection Menu */}
            {showFiltersDropdown && (
              <div className="absolute right-0 mt-2 z-50 w-64 bg-surface-container-lowest border border-outline-variant p-4 rounded-xl shadow-xl">
                <p className="text-[10px] font-semibold text-on-surface-variant/80 uppercase tracking-wider mb-2">Filtro por Plano</p>
                <div className="grid grid-cols-2 gap-1.5 mb-4 text-[10px] uppercase">
                  {(['Enterprise', 'Premium', 'Profissional', 'Básico'] as const).map((p) => (
                    <button
                      key={p}
                      onClick={() => {
                        setSelectedPlanFilter(selectedPlanFilter === p ? null : p);
                        setCurrentPage(1);
                      }}
                      className={`px-3 py-1.5 font-bold border rounded-lg text-center transition-all cursor-pointer ${
                        selectedPlanFilter === p
                          ? 'bg-primary border-primary text-on-primary'
                          : 'bg-surface hover:bg-surface-container-high border-outline-variant text-on-surface'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <p className="text-[10px] font-semibold text-on-surface-variant/80 uppercase tracking-wider mb-2">Filtro por Status</p>
                <div className="grid grid-cols-2 gap-1.5 mb-4 text-[10px] uppercase">
                  {(['All', 'Ativo', 'Pendente', 'Inativo'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setStatusFilter(s);
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1.5 font-bold border rounded-lg text-center transition-all cursor-pointer ${
                        statusFilter === s
                          ? 'bg-primary border-primary text-on-primary'
                          : 'bg-surface hover:bg-surface-container-high border-outline-variant text-on-surface'
                      }`}
                    >
                      {s === 'All' ? 'Todos' : s}
                    </button>
                  ))}
                </div>

                <div className="flex gap-2 border-t border-outline-variant pt-3 mt-1 text-[10px]">
                  <button
                    onClick={resetFilters}
                    className="flex-1 px-3 py-2 bg-surface-container-low hover:bg-surface-container-high text-on-surface font-semibold rounded-lg transition-colors text-center cursor-pointer"
                  >
                    Repor Tudo
                  </button>
                  <button
                    onClick={() => setShowFiltersDropdown(false)}
                    className="flex-1 px-3 py-2 bg-primary text-on-primary font-bold rounded-lg transition-colors text-center cursor-pointer"
                  >
                    Fechar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Table View wrapper */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container-low text-on-surface-variant font-semibold text-xs border-b border-outline-variant">
              <th className="px-6 py-4">Município</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Plano</th>
              <th className="px-6 py-4">Utilizadores</th>
              <th className="px-6 py-4">Ocorrências (Mês)</th>
              <th className="px-6 py-4 text-right">Ação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {paginatedItems.length > 0 ? (
              paginatedItems.map((m) => (
                <tr key={m.id} className="hover:bg-surface-container/30 transition-colors">
                  {/* Municipality Code and Name */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${getAvatarStyle(m.code || getInitials(m.name))}`}>
                        {m.code || getInitials(m.name)}
                      </div>
                      <div>
                        <p className="font-semibold text-on-surface text-sm">{m.name}</p>
                        <p className="text-xs text-on-surface-variant">ID: {m.id}</p>
                      </div>
                    </div>
                  </td>

                  {/* Status Badges with Clickable Inline Transition */}
                  <td className="px-6 py-4">
                    <div className="relative inline-block">
                      <select
                        value={m.status}
                        onChange={(e) => {
                          onUpdateMunicipality({
                            ...m,
                            status: e.target.value as 'Ativo' | 'Pendente' | 'Inativo'
                          });
                        }}
                        className={`text-[11px] font-semibold px-2 py-1 cursor-pointer appearance-none text-center outline-none border-none rounded-full ${getStatusBadgeStyle(m.status)}`}
                      >
                        <option value="Ativo">Ativo</option>
                        <option value="Pendente">Pendente</option>
                        <option value="Inativo">Inativo</option>
                      </select>
                    </div>
                  </td>

                  {/* Plan selection badges */}
                  <td className="px-6 py-4">
                    <select
                      value={m.plan}
                      onChange={(e) => {
                        onUpdateMunicipality({
                          ...m,
                          plan: e.target.value as 'Enterprise' | 'Premium' | 'Profissional' | 'Básico'
                        });
                      }}
                      className={`text-[11px] font-semibold px-3 py-1 cursor-pointer appearance-none text-center outline-none rounded min-w-[100px] ${getPlanBadgeStyle(m.plan)}`}
                    >
                      <option value="Enterprise">Enterprise</option>
                      <option value="Premium">Premium</option>
                      <option value="Profissional">Profissional</option>
                      <option value="Básico">Básico</option>
                    </select>
                  </td>

                  {/* Users */}
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-on-surface">
                      {m.users.toLocaleString('pt-PT')}
                    </span>
                  </td>

                  {/* Occurrences Month counter */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-on-surface">
                        {m.occurrencesMonth.toLocaleString('pt-PT')}
                      </span>
                      {m.status === 'Pendente' && (
                        <span className="w-1.5 h-1.5 rounded-full bg-[#ba1a1a] animate-ping"></span>
                      )}
                    </div>
                  </td>

                  {/* Action Dropdown Options */}
                  <td className="px-6 py-4 text-right relative">
                    <button
                      id={`btn-actions-${m.id}`}
                      onClick={() => setActiveActionsMenu(activeActionsMenu === m.id ? null : m.id)}
                      className="p-1.5 hover:bg-surface-container-high rounded-full transition-all text-on-surface-variant cursor-pointer inline-flex items-center justify-center border-none"
                    >
                      <MoreVertical className="h-4.5 w-4.5" />
                    </button>

                    {/* Popover Actions Floating menu */}
                    {activeActionsMenu === m.id && (
                      <>
                        <div 
                          className="fixed inset-0 z-40" 
                          onClick={() => setActiveActionsMenu(null)}
                        ></div>
                        <div className="absolute right-6 top-10 z-50 w-52 bg-surface-container-lowest border border-outline-variant p-2.5 rounded-xl shadow-xl text-left text-xs">
                          <p className="text-[10px] font-semibold text-on-surface-variant/80 px-3 py-1 uppercase tracking-wider mb-1">Ações Rápidas</p>
                          
                          <button
                            onClick={() => {
                              onTriggerMockAlerts(m.id);
                              setActiveActionsMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 font-medium text-on-surface hover:bg-surface-container-low transition-colors rounded-lg cursor-pointer"
                          >
                            <AlertOctagon className="h-4 w-4 text-tertiary shrink-0" />
                            <span>Simular Ocorrência</span>
                          </button>

                          <button
                            onClick={() => {
                              onUpdateMunicipality({
                                ...m,
                                status: m.status === 'Ativo' ? 'Inativo' : 'Ativo'
                              });
                              setActiveActionsMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 font-medium text-on-surface hover:bg-surface-container-low transition-colors rounded-lg cursor-pointer"
                          >
                            <RefreshCcw className="h-4 w-4 text-primary shrink-0" />
                            <span>Alternar Atividade</span>
                          </button>

                          <div className="border-t border-outline-variant my-1.5"></div>

                          <button
                            onClick={() => {
                              if (confirm(`Tem a certeza de que pretende remover o município de ${m.name}?`)) {
                                onDeleteMunicipality(m.id);
                              }
                              setActiveActionsMenu(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 font-medium text-error hover:bg-error-container/20 transition-colors rounded-lg cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 text-error shrink-0" />
                            <span>Remover Autarquia</span>
                          </button>
                        </div>
                      </>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-on-surface-variant/60 text-sm tracking-widest">
                  <p>Nenhum município corresponde aos critérios de pesquisa.</p>
                  {(statusFilter !== 'All' || selectedPlanFilter !== null || searchTerm !== '') && (
                    <button
                      onClick={resetFilters}
                      className="mt-3 text-primary hover:underline font-black uppercase cursor-pointer block mx-auto text-xs"
                    >
                      Limpar Filtros Atuais
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer Actions */}
      <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface-container-low border-t border-outline-variant text-sm">
        <p className="text-on-surface-variant">
          A mostrar 1-{Math.min(startIndex + itemsPerPage, totalItems)} de {totalItems} municípios
        </p>
        
        <div className="flex gap-1">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="px-3 py-1 bg-surface-container-lowest border border-outline-variant hover:bg-surface-variant text-on-surface-variant hover:text-on-surface text-xs font-semibold rounded transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            Anterior
          </button>
          
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`px-3 py-1 rounded border text-xs font-semibold cursor-pointer ${
                currentPage === pageNum
                  ? 'bg-primary border-primary text-on-primary'
                  : 'bg-surface-container-lowest border-outline-variant text-on-surface hover:bg-surface-variant'
              }`}
            >
              {pageNum}
            </button>
          ))}

          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="px-3 py-1 bg-surface-container-lowest border border-outline-variant hover:bg-surface-variant text-on-surface-variant hover:text-on-surface text-xs font-semibold rounded transition-all disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
          >
            Próximo
          </button>
        </div>
      </div>
    </section>
  );
}
