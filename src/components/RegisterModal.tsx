import { useState, useEffect, FormEvent } from 'react';
import { X, Check, Globe } from 'lucide-react';
import type { Municipality } from '../types';

interface RegisterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (municipality: Municipality) => void;
}

export default function RegisterModal({ isOpen, onClose, onSave }: RegisterModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [customId, setCustomId] = useState('');
  const [plan, setPlan] = useState<'Enterprise' | 'Premium' | 'Básico'>('Enterprise');
  const [status, setStatus] = useState<'Ativo' | 'Pendente' | 'Inativo'>('Ativo');
  const [users, setUsers] = useState<number>(120);
  const [occurrencesMonth, setOccurrencesMonth] = useState<number>(14);

  // Suggested coordinates in Portugal based on common search names
  const portugalCitiesGPS: Record<string, { lat: number; lng: number }> = {
    'aveiro': { lat: 40.6405, lng: -8.6538 },
    'faro': { lat: 37.0179, lng: -7.9308 },
    'guimaraes': { lat: 41.4425, lng: -8.2918 },
    'evora': { lat: 38.5714, lng: -7.9135 },
    'funchal': { lat: 32.6600, lng: -16.9200 },
    'viana do castelo': { lat: 41.6918, lng: -8.8344 },
    'leiria': { lat: 39.7438, lng: -8.8078 },
    'setubal': { lat: 38.5244, lng: -8.8931 },
  };

  // Auto generate ID and Code representation based on name input
  useEffect(() => {
    if (name.trim()) {
      const sanitized = name.trim().toLowerCase();
      const words = sanitized.split(' ');
      let generatedCode = '';
      if (words.length > 1) {
        generatedCode = (words[0][0] + words[1][0]).toUpperCase();
      } else {
        generatedCode = sanitized.substring(0, 2).toUpperCase();
      }
      setCode(generatedCode);

      // Unique simulation ID
      const randomId = Math.floor(1000 + Math.random() * 9000);
      setCustomId(`T-${randomId}-${generatedCode}`);
    } else {
      setCode('');
      setCustomId('');
    }
  }, [name]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Resolve or generate coordinates near central Portugal
    const lowerName = name.trim().toLowerCase();
    let lat = 39.5 + (Math.random() - 0.5) * 1.5;
    let lng = -8 + (Math.random() - 0.5) * 1.0;

    // Check pre-registered coordinates mapping
    Object.keys(portugalCitiesGPS).forEach((key) => {
      if (lowerName.includes(key)) {
        lat = portugalCitiesGPS[key].lat;
        lng = portugalCitiesGPS[key].lng;
      }
    });

    const newMunicipality: Municipality = {
      id: customId || `T-${Math.floor(1000 + Math.random() * 9000)}-NEW`,
      name: name.trim(),
      code: code || name.trim().substring(0, 2).toUpperCase(),
      status,
      plan,
      users,
      occurrencesMonth,
      latitude: lat,
      longitude: lng,
    };

    onSave(newMunicipality);
    // Reset state
    setName('');
    setPlan('Enterprise');
    setStatus('Ativo');
    setUsers(120);
    setOccurrencesMonth(14);
  };

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dynamic Overlay Backdrop */}
      <div 
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      ></div>

      {/* Flyout Window Dialog */}
      <div className="relative bg-surface-container-lowest border border-outline-variant p-6 shadow-2xl animate-in scale-in-95 fade-in duration-200 w-full max-w-lg rounded-2xl">
        <div className="flex justify-between items-start mb-6 border-b border-outline-variant pb-4">
          <div>
            <h3 className="text-xl font-bold text-on-surface tracking-tight">Registar Novo Município</h3>
            <p className="text-xs text-on-surface-variant mt-1 leading-normal">Introduza os dados administrativos para integração no sistema.</p>
          </div>
          <button 
            onClick={onClose}
            className="p-1 px-1.5 hover:bg-surface-container-high rounded-full text-on-surface-variant hover:text-on-surface transition-all cursor-pointer border-none bg-transparent"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          {/* Nome */}
          <div>
            <label className="block text-xs font-semibold text-on-surface mb-1.5">Nome do Município</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Aveiro, Faro, Setúbal, Guimarães..."
              className="w-full px-4 py-2 bg-surface hover:bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary text-on-surface rounded-lg text-sm transition-all placeholder-on-surface-variant/40"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Auto Generated Abbreviation Code */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Código Gerado</label>
              <input
                type="text"
                disabled
                value={code}
                placeholder="Gerando..."
                className="w-full px-4 py-2 bg-surface-container select-none border border-outline-variant text-on-surface-variant font-medium text-center rounded-lg cursor-not-allowed"
              />
            </div>

            {/* Auto Generated unique ID */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">ID Gerado</label>
              <input
                type="text"
                disabled
                value={customId}
                placeholder="Gerando..."
                className="w-full px-4 py-2 bg-surface-container select-none border border-outline-variant text-on-surface-variant font-medium text-center rounded-lg cursor-not-allowed text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Subscription Plan */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Plano Contratual</label>
              <select
                value={plan}
                onChange={(e) => setPlan(e.target.value as any)}
                className="w-full px-4 py-2 bg-surface hover:bg-surface-container-low border border-outline-variant text-on-surface rounded-lg text-sm transition-all cursor-pointer outline-none"
              >
                <option value="Enterprise">Enterprise</option>
                <option value="Premium">Premium</option>
                <option value="Básico">Básico</option>
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Estado Inicial</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-4 py-2 bg-surface hover:bg-surface-container-low border border-outline-variant text-on-surface rounded-lg text-sm transition-all cursor-pointer outline-none"
              >
                <option value="Ativo">Ativo</option>
                <option value="Pendente">Pendente</option>
                <option value="Inativo">Inativo</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Target base Users */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Nº Inicial Utilizadores</label>
              <input
                type="number"
                min="0"
                value={users}
                onChange={(e) => setUsers(parseInt(e.target.value, 10) || 0)}
                className="w-full px-4 py-2 bg-surface hover:bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary text-on-surface rounded-lg text-center font-medium"
              />
            </div>

            {/* Dynamic Month statistics */}
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Ocorrências Base</label>
              <input
                type="number"
                min="0"
                value={occurrencesMonth}
                onChange={(e) => setOccurrencesMonth(parseInt(e.target.value, 10) || 0)}
                className="w-full px-4 py-2 bg-surface hover:bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary text-on-surface rounded-lg text-center font-medium"
              />
            </div>
          </div>

          <div className="bg-surface-container border border-outline-variant p-4 rounded-xl flex gap-3 items-start">
            <Globe className="h-5 w-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-on-surface">Mapeamento Geográfico Inteligente</p>
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">As coordenadas GPS correspondentes ao território central de Portugal serão atribuídas e plotadas dinamicamente no painel.</p>
            </div>
          </div>

          {/* Dialog Action triggers */}
          <div className="flex gap-3 justify-end pt-4 border-t border-outline-variant mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-surface-container-high hover:bg-surface-variant text-on-surface font-semibold text-xs rounded-lg transition-all cursor-pointer border-none"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary text-on-primary hover:opacity-90 font-bold text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 shadow-md border-none"
            >
              <Check className="h-4 w-4" />
              <span>Salvar Registo</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
