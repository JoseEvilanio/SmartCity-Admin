import { useState, useEffect, FormEvent } from 'react';
import { X, Check, Globe, Loader2 } from 'lucide-react';
import type { Municipality } from '../types';
import { ALAGOAS_MUNICIPALITIES } from '../lib/alagoasMunicipalities';

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

  // Coordinates for major municipalities in Alagoas, Brazil
  const alagoasCitiesGPS: Record<string, { lat: number; lng: number }> = {
    'maceio': { lat: -9.6658, lng: -35.7350 },
    'maceió': { lat: -9.6658, lng: -35.7350 },
    'arapiraca': { lat: -9.7512, lng: -36.6604 },
    'palmeira dos indios': { lat: -9.4072, lng: -36.6318 },
    'palmeira dos índios': { lat: -9.4072, lng: -36.6318 },
    'rio largo': { lat: -9.4805, lng: -35.8427 },
    'penedo': { lat: -10.2900, lng: -36.5861 },
    'uniao dos palmares': { lat: -9.1578, lng: -36.0311 },
    'união dos palmares': { lat: -9.1578, lng: -36.0311 },
    'delmiro gouveia': { lat: -9.3879, lng: -37.9008 },
    'santana do ipanema': { lat: -9.3789, lng: -37.2439 },
    'coruripe': { lat: -10.1256, lng: -36.1756 },
    'marechal deodoro': { lat: -9.7102, lng: -35.8947 },
    'maragogi': { lat: -9.0122, lng: -35.2222 },
    'sao miguel dos campos': { lat: -9.7811, lng: -36.0911 },
    'são miguel dos campos': { lat: -9.7811, lng: -36.0911 }
  };

  const [latitude, setLatitude] = useState<string>('-9.5713');
  const [longitude, setLongitude] = useState<string>('-36.7819');
  const [isSearchingCoords, setIsSearchingCoords] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  // Filter suggestions when typing name
  useEffect(() => {
    if (name.trim()) {
      const filtered = ALAGOAS_MUNICIPALITIES.filter((m) =>
        m.toLowerCase().includes(name.trim().toLowerCase())
      ).slice(0, 5);
      setSuggestions(filtered);
    } else {
      setSuggestions([]);
    }
  }, [name]);

  const searchCoordinatesForCity = async (cityName: string) => {
    if (!cityName.trim()) return;
    setIsSearchingCoords(true);
    setSearchError(null);
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
        cityName.trim()
      )},Alagoas,Brasil&format=json&limit=1`;
      
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'SmartCityAdmin/1.0'
        }
      });
      if (!response.ok) {
        throw new Error('Erro na resposta do serviço de geocodificação.');
      }
      const data = await response.json();
      if (data && data.length > 0) {
        const result = data[0];
        setLatitude(parseFloat(result.lat).toFixed(4));
        setLongitude(parseFloat(result.lon).toFixed(4));
        setSearchError(null);
      } else {
        setSearchError('Coordenadas não encontradas automaticamente. Insira manualmente.');
      }
    } catch (err: any) {
      console.error('[Nominatim API]', err);
      setSearchError('Erro ao pesquisar coordenadas. Insira manualmente.');
    } finally {
      setIsSearchingCoords(false);
    }
  };

  const handleSelectCity = (cityName: string) => {
    setName(cityName);
    setShowSuggestions(false);
    
    // Look up in local GPS
    const lowerName = cityName.trim().toLowerCase();
    let found = false;
    Object.keys(alagoasCitiesGPS).forEach((key) => {
      if (lowerName === key || lowerName.includes(key)) {
        setLatitude(alagoasCitiesGPS[key].lat.toFixed(4));
        setLongitude(alagoasCitiesGPS[key].lng.toFixed(4));
        found = true;
      }
    });

    if (!found) {
      searchCoordinatesForCity(cityName);
    } else {
      setSearchError(null);
    }
  };

  const handleManualSearch = (e: React.MouseEvent) => {
    e.preventDefault();
    searchCoordinatesForCity(name);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let lat = parseFloat(latitude);
    let lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) {
      lat = -9.5713 + (Math.random() - 0.5) * 0.1;
      lng = -36.7819 + (Math.random() - 0.5) * 0.1;
    }

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
    setLatitude('-9.5713');
    setLongitude('-36.7819');
    setSearchError(null);
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
          <div className="relative">
            <label className="block text-xs font-semibold text-on-surface mb-1.5">Nome do Município</label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setShowSuggestions(true);
                }}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                placeholder="Ex: Maceió, Arapiraca, Palmeira dos Índios..."
                className="flex-1 px-4 py-2 bg-surface hover:bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary text-on-surface rounded-lg text-sm transition-all placeholder-on-surface-variant/40"
              />
              <button
                type="button"
                onClick={handleManualSearch}
                disabled={isSearchingCoords || !name.trim()}
                className="px-3 bg-surface-container-high hover:bg-surface-variant text-on-surface font-semibold rounded-lg text-xs transition-all flex items-center gap-1.5 cursor-pointer border border-outline-variant disabled:opacity-40 disabled:cursor-not-allowed select-none"
              >
                {isSearchingCoords ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                ) : (
                  <Globe className="h-3.5 w-3.5 text-primary" />
                )}
                <span>Buscar GPS</span>
              </button>
            </div>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute left-0 right-0 z-50 mt-1 bg-surface-container-lowest border border-outline-variant rounded-lg shadow-lg overflow-hidden divide-y divide-outline-variant max-h-40 overflow-y-auto">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onMouseDown={() => handleSelectCity(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-surface-container-high text-on-surface text-sm transition-colors cursor-pointer border-none bg-transparent block"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
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

          {/* Latitude & Longitude Fields */}
          <div className="grid grid-cols-2 gap-4 animate-in fade-in duration-300">
            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Latitude (GPS)</label>
              <input
                type="number"
                step="any"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="-9.5713"
                className="w-full px-4 py-2 bg-surface hover:bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary text-on-surface text-center font-medium rounded-lg text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface mb-1.5">Longitude (GPS)</label>
              <input
                type="number"
                step="any"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="-36.7819"
                className="w-full px-4 py-2 bg-surface hover:bg-surface-container-low border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary text-on-surface text-center font-medium rounded-lg text-sm transition-all"
              />
            </div>
          </div>

          {searchError && (
            <div className="text-[10px] font-semibold text-error px-3 py-2 bg-error-container/20 border border-error/20 rounded-lg">
              {searchError}
            </div>
          )}

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
              <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">As coordenadas GPS correspondentes ao estado de Alagoas, Brasil serão atribuídas e plotadas dinamicamente no painel.</p>
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
