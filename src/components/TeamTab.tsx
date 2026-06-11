import { useState, FormEvent, useMemo } from 'react';
import { Search, UserPlus, Trash2, Shield, UserCheck, UserX, Star } from 'lucide-react';
import type { TeamMember } from '../types';
import { ALAGOAS_MUNICIPALITIES } from '../lib/alagoasMunicipalities';

interface TeamTabProps {
  initialMembers: TeamMember[];
  onAddNewMember: (newMember: TeamMember) => void;
  onUpdateMember: (updated: TeamMember) => void;
  onDeleteMember: (id: string) => void;
  municipalities: { name: string }[];
}

export default function TeamTab({ 
  initialMembers, 
  onAddNewMember, 
  onUpdateMember, 
  onDeleteMember,
  municipalities
}: TeamTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'Super Administrador' | 'Administrador Local'>('Administrador Local');
  const [selectedMunicipality, setSelectedMunicipality] = useState('');
  const [municipalitySearch, setMunicipalitySearch] = useState('');

  const allMunicipalities = useMemo(() => {
    const registered = new Set(municipalities.map((m) => m.name));
    const combined = new Set([...ALAGOAS_MUNICIPALITIES, ...registered]);
    return [...combined].sort((a, b) => a.localeCompare(b, 'pt'));
  }, [municipalities]);

  const filteredMunicipalities = useMemo(() => {
    if (!municipalitySearch) return allMunicipalities;
    const q = municipalitySearch.toLowerCase();
    return allMunicipalities.filter((m) => m.toLowerCase().includes(q));
  }, [municipalitySearch, allMunicipalities]);

  const filtered = initialMembers.filter((m) => {
    return m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           m.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
           m.municipality.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const handleCreateMember = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const newMember: TeamMember = {
      id: `USR-${Math.floor(1000 + Math.random() * 9000)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role,
      municipality: role === 'Super Administrador' ? 'Multimunicipal' : selectedMunicipality || 'Lisboa',
      status: 'Ativo',
      lastActive: 'Agora'
    };

    onAddNewMember(newMember);

    // Reset Form
    setName('');
    setEmail('');
    setRole('Administrador Local');
    setSelectedMunicipality('');
    setMunicipalitySearch('');
    setShowAddForm(false);
  };

  return (
    <div id="team-view-terminal" className="space-y-6 animate-in fade-in duration-300 font-sans">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h2 className="text-3xl font-bold text-on-surface mb-1">Equipa Operacional</h2>
          <p className="text-base text-on-surface-variant">Credenciamento de governança e perfis de dispatchers regionais</p>
        </div>
        
        <button
          id="add-team-member-trigger"
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-primary text-on-primary hover:opacity-90 font-semibold text-xs px-4 py-2 rounded-xl border-none shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
        >
          <UserPlus className="h-4.5 w-4.5" />
          <span>Contratar Operador</span>
        </button>
      </div>

      {/* Add team member card form */}
      {showAddForm && (
        <div className="bg-surface-container border border-outline-variant p-5 rounded-2xl animate-in slide-in-from-top-3 duration-200">
          <h3 className="font-semibold text-on-surface text-sm mb-4">Adicionar Novo Gestor Regional</h3>
          <form onSubmit={handleCreateMember} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-xs">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Nome Completo</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full px-3 py-2 bg-surface hover:bg-surface-container-low border border-outline-variant text-on-surface rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all h-10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Correio Eletrónico</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Ex: joao@autarquia.gov"
                className="w-full px-3 py-2 bg-surface hover:bg-surface-container-low border border-outline-variant text-on-surface rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary transition-all h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Cargo</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-surface hover:bg-surface-container-low border border-outline-variant text-on-surface rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer h-10 transition-colors uppercase tracking-wider font-semibold"
                >
                  <option value="Administrador Local">REGIONAL</option>
                  <option value="Super Administrador">SUPER ADMIN</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1.5">Município</label>
                <input
                  list="municipality-list"
                  disabled={role === 'Super Administrador'}
                  value={municipalitySearch}
                  onChange={(e) => {
                    setMunicipalitySearch(e.target.value);
                    setSelectedMunicipality(e.target.value);
                  }}
                  placeholder="Pesquisar município..."
                  className="w-full px-3 py-2 bg-surface hover:bg-surface-container-low border border-outline-variant text-on-surface rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-30 h-10 transition-all"
                />
                <datalist id="municipality-list">
                  {filteredMunicipalities.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
              </div>
            </div>

            <div className="flex gap-2 h-10 mb-0.5">
              <button
                type="submit"
                className="flex-1 bg-primary border border-transparent hover:opacity-90 text-on-primary font-bold text-xs py-2 rounded-lg transition-colors cursor-pointer shadow-sm"
              >
                Registar
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-4 bg-surface-container-high hover:bg-surface-variant border border-outline-variant text-on-surface font-semibold text-xs py-2 rounded-lg transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Toolbar Search filter */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-outline h-4.5 w-4.5" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Pesquisar operadores por nome, email ou jurisdição..."
          className="w-full pl-10 pr-4 py-2 bg-surface-container hover:bg-surface-container-high h-11 border border-outline-variant rounded-lg text-xs text-on-surface placeholder-on-surface-variant/40 focus:outline-none focus:ring-2 focus:ring-primary transition-all font-sans"
        />
      </div>

      {/* Operator listing desk */}
      <div className="bg-transparent border border-outline-variant overflow-hidden rounded-xl shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container text-on-surface font-semibold text-xs border-b border-outline-variant">
                <th className="px-6 py-4">Nome Social</th>
                <th className="px-6 py-4">Cargo / Nível</th>
                <th className="px-6 py-4">Jurisdição Autárquica</th>
                <th className="px-6 py-4">Atividade Registada</th>
                <th className="px-6 py-4">Estado da Conta</th>
                <th className="px-6 py-4 text-right">Alterações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {filtered.map((member) => (
                <tr key={member.id} className="hover:bg-surface-container/30 transition-colors">
                  {/* Avatar Name & Email */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary-container/20 font-bold text-xs text-primary flex items-center justify-center border border-outline-variant uppercase">
                        {member.name.substring(0,2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-on-surface text-sm leading-none">{member.name}</p>
                          {member.email === 'netoevilanio@gmail.com' && (
                            <span className="bg-[#eaf1ff] text-[#0066ff] border border-transparent rounded px-1 text-[10px]" title="Dono do Sistema / Você">
                              <Star className="h-3 w-3 fill-[#0066ff] stroke-[#0066ff]" />
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-on-surface-variant mt-1">{member.email}</p>
                      </div>
                    </div>
                  </td>

                  {/* Level & Badge icon */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1.5">
                      <Shield className={`h-4.2 w-4.2 ${member.role === 'Super Administrador' ? 'text-primary' : 'text-on-surface-variant'}`} />
                      <span className="text-xs font-semibold text-on-surface-variant">{member.role}</span>
                    </div>
                  </td>

                  {/* Operational Bound Jurisdiction */}
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium text-on-surface-variant">
                      {member.municipality}
                    </span>
                  </td>

                  {/* Last Activity */}
                  <td className="px-6 py-4 text-xs font-medium text-on-surface-variant">
                    {member.lastActive}
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      member.status === 'Ativo'
                        ? 'bg-secondary-container/20 text-on-secondary-container border-secondary-container/30'
                        : 'bg-outline-variant/30 text-outline border-outline-variant/50'
                    }`}>
                      {member.status}
                    </span>
                  </td>

                  {/* Quick actions direct controls */}
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Active Account Switch */}
                      <button
                        onClick={() => {
                          onUpdateMember({
                            ...member,
                            status: member.status === 'Ativo' ? 'Inativo' : 'Ativo'
                          });
                        }}
                        className="p-1.5 hover:bg-surface-container-high border border-outline-variant text-on-surface-variant rounded-lg transition-all cursor-pointer bg-transparent"
                        title="Alternar Estado"
                      >
                        {member.status === 'Ativo' ? (
                          <UserX className="h-4 w-4 text-tertiary" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-secondary" />
                        )}
                      </button>

                      {/* Deletion protection for system owner */}
                      {member.email !== 'netoevilanio@gmail.com' && (
                        <button
                          onClick={() => {
                            if (confirm(`Tem a certeza de que pretende remover o utilizador operador ${member.name}?`)) {
                              onDeleteMember(member.id);
                            }
                          }}
                          className="p-1.5 hover:bg-error-container/20 border border-outline-variant text-error rounded-lg transition-all cursor-pointer bg-transparent"
                          title="Remover Operador"
                        >
                          <Trash2 className="h-4 w-4 text-error" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
