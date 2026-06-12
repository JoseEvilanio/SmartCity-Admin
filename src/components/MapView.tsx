import { useState, useEffect, useRef, MutableRefObject } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Info, Users, AlertTriangle, ShieldCheck, Zap, LocateFixed, Loader2, MapPin, CheckCircle, FileText, Clock } from 'lucide-react';
import type { Municipality, OccurrencesRecord } from '../types';
import type { ServiceOrderWithOccurrence } from '../lib/dataService';

// Fix Leaflet default icon paths broken by Vite bundler
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({ iconUrl, iconRetinaUrl, shadowUrl });

// ─── Types ────────────────────────────────────────────────────
interface MapViewProps {
  municipalities: Municipality[];
  occurrences: OccurrencesRecord[];
  serviceOrders: ServiceOrderWithOccurrence[];
  onTriggerMockAlerts: (id: string) => void;
  onUpdateMunicipality: (updated: Municipality) => void;
  onUpdateOccurrenceStatus?: (id: string, nextStatus: 'Pendente' | 'Em Resolução' | 'Resolvido') => void;
}

type GeoState = 'idle' | 'locating' | 'found' | 'denied';

// ─── Helpers ───────────────────────────────────────────────────

/** Coloured SVG pin for municipality markers */
function createStatusIcon(status: string, isSelected: boolean): L.DivIcon {
  const color = isSelected
    ? '#4f46e5'
    : status === 'Ativo'
    ? '#16a34a'
    : status === 'Pendente'
    ? '#dc2626'
    : '#6b7280';

  const size = isSelected ? 36 : 28;
  const pulse = status === 'Ativo' || status === 'Pendente';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size * 1.3}" viewBox="0 0 36 47">
      ${pulse ? `<circle cx="18" cy="18" r="14" fill="${color}" opacity="0.18">
        <animate attributeName="r" values="12;18;12" dur="2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="0.18;0.04;0.18" dur="2s" repeatCount="indefinite"/>
      </circle>` : ''}
      <path d="M18 2C10.3 2 4 8.3 4 16c0 10.5 14 28 14 28S32 26.5 32 16C32 8.3 25.7 2 18 2z"
            fill="${color}" stroke="white" stroke-width="2"/>
      <circle cx="18" cy="16" r="5.5" fill="white"/>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [size, size * 1.3],
    iconAnchor: [size / 2, size * 1.3],
    popupAnchor: [0, -(size * 1.3)],
  });
}

/** OS marker – diamond shape */
function createOsIcon(status: string): L.DivIcon {
  const color =
    status === 'Aberta' ? '#f59e0b' :
    status === 'Em Execução' ? '#3b82f6' :
    status === 'Concluída' ? '#10b981' :
    '#6b7280';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 22 22">
      <rect x="2" y="2" width="18" height="18" rx="3" fill="${color}" stroke="white" stroke-width="1.5" transform="rotate(45, 11, 11)"/>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [22, 22],
    iconAnchor: [11, 11],
    popupAnchor: [0, -11],
  });
}

/** Smaller coloured circle for occurrence markers */
function createOccurrenceIcon(priority: OccurrencesRecord['priority']): L.DivIcon {
  const color =
    priority === 'Crítico' ? '#dc2626' :
    priority === 'Alto' ? '#ea580c' :
    priority === 'Médio' ? '#ca8a04' :
    '#6b7280';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 20 20">
      <circle cx="10" cy="10" r="7" fill="${color}" stroke="white" stroke-width="2"/>
    </svg>`;

  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10],
  });
}

/** Pulsing blue dot for the user's own location */
const USER_ICON = L.divIcon({
  html: `
    <div style="position:relative;width:22px;height:22px;display:flex;align-items:center;justify-content:center;">
      <span style="
        position:absolute;width:22px;height:22px;border-radius:50%;
        background:rgba(59,130,246,0.25);
        animation:userPulse 1.8s ease-out infinite;
      "></span>
      <span style="
        width:14px;height:14px;border-radius:50%;
        background:#3b82f6;border:2.5px solid white;
        box-shadow:0 0 0 2px rgba(59,130,246,0.5);
        position:relative;z-index:1;
      "></span>
    </div>
    <style>
      @keyframes userPulse {
        0%   { transform:scale(1);   opacity:0.7; }
        70%  { transform:scale(2.2); opacity:0;   }
        100% { transform:scale(1);   opacity:0;   }
      }
    </style>`,
  className: '',
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -14],
});

// ─── Inner map controllers ──────────────────────────────────────

/** Fly to a municipality when selected */
function FlyToCity({ city }: { city: Municipality | null }) {
  const map = useMap();
  useEffect(() => {
    if (city) map.flyTo([city.latitude, city.longitude], 12, { duration: 1.2 });
  }, [city, map]);
  return null;
}

/** Exposes the Leaflet map instance upward via a ref */
function MapRefCapture({ mapRef }: { mapRef: MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => { mapRef.current = map; }, [map]);
  return null;
}

// ─── Main Component ─────────────────────────────────────────────

export default function MapView({ municipalities, occurrences, serviceOrders, onTriggerMockAlerts, onUpdateMunicipality, onUpdateOccurrenceStatus }: MapViewProps) {
  const [selectedCityId, setSelectedCityId] = useState<string | null>(null);
  const [selectedEntity, setSelectedEntity] = useState<{
    type: 'municipality' | 'occurrence' | 'serviceOrder';
    id: string;
  } | null>(null);
  const [userPos, setUserPos]       = useState<[number, number] | null>(null);
  const [userAccuracy, setUserAccuracy] = useState<number>(0);
  const [geoState, setGeoState]     = useState<GeoState>('idle');
  const [geoError, setGeoError]     = useState<string | null>(null);
  const [initialCenter, setInitialCenter] = useState<[number, number]>([39.5, -8.0]);
  const [initialZoom, setInitialZoom]     = useState(7);
  const [mapReady, setMapReady]           = useState(false);

  const mapRef = useRef<L.Map | null>(null);
  const selectedMunicipality = selectedEntity?.type === 'municipality'
    ? municipalities.find((m) => m.id === selectedEntity.id)
    : null;

  const selectedOccurrence = selectedEntity?.type === 'occurrence'
    ? occurrences.find((o) => o.id === selectedEntity.id)
    : null;

  const selectedServiceOrder = selectedEntity?.type === 'serviceOrder'
    ? serviceOrders.find((so) => so.id === selectedEntity.id)
    : null;

  const selectedCity = selectedMunicipality ?? null;

  // ── Geolocation logic ──────────────────────────────────────
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setGeoError('O seu browser não suporta geolocalização.');
      setGeoState('denied');
      return;
    }
    setGeoState('locating');
    setGeoError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserPos([lat, lng]);
        setUserAccuracy(pos.coords.accuracy);
        setGeoState('found');
        // Fly to user location
        if (mapRef.current) {
          mapRef.current.flyTo([lat, lng], 13, { duration: 1.5 });
        }
      },
      (err) => {
        setGeoState('denied');
        setGeoError(
          err.code === 1
            ? 'Permissão de localização negada. Ative nas definições do browser.'
            : 'Não foi possível obter a localização. Tente novamente.'
        );
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Auto-request on first mount: silently try to get location to set initial center
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserPos([lat, lng]);
        setUserAccuracy(pos.coords.accuracy);
        setGeoState('found');
        setInitialCenter([lat, lng]);
        setInitialZoom(13);
      },
      () => {
        // silently fall back to Portugal
        setGeoState('idle');
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  // Show map only after initial center is resolved (prevents wrong initial render)
  useEffect(() => {
    const timer = setTimeout(() => setMapReady(true), 100);
    return () => clearTimeout(timer);
  }, []);

  // ── Geo button label ───────────────────────────────────────
  const geoButtonLabel =
    geoState === 'locating' ? 'A localizar…' :
    geoState === 'found'    ? 'Minha Localização' :
                              'Localizar-me';

  return (
    <div id="map-view-terminal" className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold text-on-surface mb-1">Ecrã de Monitorização GIS</h2>
          <p className="text-base text-on-surface-variant">
            Mapeamento em tempo real de sensores acoplados e conectividade das autarquias
          </p>
        </div>

        {/* Locate Me button */}
        <button
          id="btn-locate-user"
          onClick={requestLocation}
          disabled={geoState === 'locating'}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-outline-variant
                     bg-surface-container text-on-surface text-xs font-semibold uppercase tracking-wider
                     hover:bg-surface-container-high transition-all cursor-pointer disabled:opacity-60"
        >
          {geoState === 'locating'
            ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
            : <LocateFixed className={`h-4 w-4 ${geoState === 'found' ? 'text-blue-500' : 'text-primary'}`} />
          }
          {geoButtonLabel}
        </button>
      </div>

      {/* Geo error banner */}
      {geoError && (
        <div className="flex items-center gap-2 bg-error-container/60 border border-error/30 text-on-error-container px-4 py-2.5 rounded-xl text-xs font-medium">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {geoError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* ── Real Map (8 cols) ─────────────────────────────── */}
        <div className="lg:col-span-8 rounded-xl overflow-hidden border border-outline-variant shadow-md relative" style={{ height: 560 }}>

          {/* User location badge */}
          {geoState === 'found' && userPos && (
            <div className="absolute top-3 left-3 z-[1000] bg-blue-600/90 text-white text-[10px] font-semibold
                            px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-lg backdrop-blur-sm">
              <LocateFixed className="h-3 w-3" />
              {userPos[0].toFixed(4)}°, {userPos[1].toFixed(4)}°
            </div>
          )}

          {mapReady && (
            <MapContainer
              center={initialCenter}
              zoom={initialZoom}
              style={{ width: '100%', height: '100%' }}
              zoomControl={true}
              scrollWheelZoom={true}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* Internal map ref capture */}
              <MapRefCapture mapRef={mapRef} />

              {/* Fly to selected municipality */}
              <FlyToCity city={selectedCity} />

              {/* ── User location marker ── */}
              {userPos && (
                <>
                  {/* Accuracy circle */}
                  <Circle
                    center={userPos}
                    radius={userAccuracy}
                    pathOptions={{
                      color: '#3b82f6',
                      fillColor: '#3b82f6',
                      fillOpacity: 0.08,
                      weight: 1,
                      dashArray: '4 4',
                    }}
                  />
                  <Marker position={userPos} icon={USER_ICON}>
                    <Popup>
                      <div style={{ minWidth: 140 }}>
                        <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 4px', color: '#1d4ed8' }}>
                          📍 A sua localização
                        </p>
                        <p style={{ fontSize: 11, color: '#555', margin: 0 }}>
                          {userPos[0].toFixed(5)}°N, {Math.abs(userPos[1]).toFixed(5)}°W
                        </p>
                        <p style={{ fontSize: 10, color: '#888', margin: '3px 0 0' }}>
                          Precisão: ±{Math.round(userAccuracy)} m
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                </>
              )}

              {/* ── Municipality markers ── */}
              {municipalities.map((m) => (
                <Marker
                  key={m.id}
                  position={[m.latitude, m.longitude]}
                  icon={createStatusIcon(m.status, m.id === selectedCityId)}
                  eventHandlers={{
                    click: () => {
                      setSelectedCityId(m.id);
                      setSelectedEntity({ type: 'municipality', id: m.id });
                    }
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: 160 }}>
                      <p style={{ fontWeight: 700, fontSize: 14, margin: '0 0 4px' }}>{m.name}</p>
                      <p style={{ fontSize: 11, color: '#555', margin: '0 0 4px' }}>
                        Código: {m.code} · {m.plan}
                      </p>
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: 4,
                        fontSize: 11, fontWeight: 600,
                        background: m.status === 'Ativo' ? '#dcfce7' : m.status === 'Pendente' ? '#fee2e2' : '#f3f4f6',
                        color:      m.status === 'Ativo' ? '#15803d' : m.status === 'Pendente' ? '#b91c1c'  : '#374151',
                      }}>
                        {m.status}
                      </span>
                      <p style={{ fontSize: 11, color: '#666', margin: '6px 0 0' }}>
                        👥 {m.users.toLocaleString('pt-PT')} utilizadores
                      </p>
                      <p style={{ fontSize: 11, color: '#666', margin: '2px 0 0' }}>
                        ⚠️ {m.occurrencesMonth.toLocaleString('pt-PT')} ocorrências/mês
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* ── Occurrence markers ── */}
              {occurrences.filter((o) => o.latitude && o.longitude).map((o) => (
                <Marker
                  key={`occ-${o.id}`}
                  position={[o.latitude!, o.longitude!]}
                  icon={createOccurrenceIcon(o.priority)}
                  eventHandlers={{
                    click: () => {
                      setSelectedEntity({ type: 'occurrence', id: o.id });
                    }
                  }}
                >
                  <Popup>
                    <div style={{ minWidth: 180 }}>
                      <p style={{ fontWeight: 700, fontSize: 13, margin: '0 0 2px' }}>{o.title}</p>
                      <p style={{ fontSize: 11, color: '#666', margin: '0 0 4px' }}>{o.municipality}</p>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                        <span style={{
                          padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600,
                          background: o.status === 'Resolvido' ? '#dcfce7' : o.status === 'Pendente' || o.status === 'Aberto' ? '#fee2e2' : '#fef3c7',
                          color: o.status === 'Resolvido' ? '#15803d' : o.status === 'Pendente' || o.status === 'Aberto' ? '#b91c1c' : '#92400e',
                        }}>{o.status}</span>
                        <span style={{
                          padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600, background: '#e0e7ff', color: '#4338ca',
                        }}>{o.category}</span>
                        <span style={{
                          padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600, background: '#f3f4f6', color: '#374151',
                        }}>{o.priority}</span>
                      </div>
                      {o.description && (
                        <p style={{ fontSize: 10, color: '#888', margin: '2px 0' }}>{o.description}</p>
                      )}
                      <p style={{ fontSize: 10, color: '#999', margin: '2px 0 0' }}>
                        {o.date} · {o.reporter}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {/* ── Service Order markers ── */}
              {serviceOrders
                .filter((so) => so.occurrences?.latitude && so.occurrences?.longitude)
                .map((so) => {
                  const occ = so.occurrences!;
                  return (
                    <Marker
                      key={`os-${so.id}`}
                      position={[occ.latitude!, occ.longitude!]}
                      icon={createOsIcon(so.status)}
                      eventHandlers={{
                        click: () => {
                          setSelectedEntity({ type: 'serviceOrder', id: so.id });
                        }
                      }}
                    >
                      <Popup>
                        <div style={{ minWidth: 200 }}>
                          <div style={{ display: 'flex', justifycontent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: '#f59e0b' }}>{so.os_number}</span>
                            <span style={{
                              padding: '2px 8px', borderRadius: 4, fontSize: 10, fontWeight: 600,
                              background: so.status === 'Concluída' ? '#dcfce7' : so.status === 'Em Execução' ? '#dbeafe' : '#fef3c7',
                              color: so.status === 'Concluída' ? '#15803d' : so.status === 'Em Execução' ? '#1d4ed8' : '#92400e',
                            }}>{so.status}</span>
                          </div>
                          <p style={{ fontSize: 12, fontWeight: 600, margin: '0 0 2px', color: '#fff' }}>
                            {occ.title}
                          </p>
                          <p style={{ fontSize: 10, color: '#888', margin: '0 0 4px' }}>{occ.municipality}</p>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                            <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600, background: '#f3f4f6', color: '#374151' }}>
                              {so.priority}
                            </span>
                            <span style={{ padding: '1px 6px', borderRadius: 3, fontSize: 10, fontWeight: 600, background: '#e0e7ff', color: '#4338ca' }}>
                              {occ.category}
                            </span>
                          </div>
                          {so.deadline && (
                            <p style={{ fontSize: 10, color: '#f59e0b', margin: '2px 0' }}>
                              Prazo: {so.deadline.substring(0, 10)}
                            </p>
                          )}
                          <p style={{ fontSize: 10, color: '#999', margin: '2px 0 0' }}>
                            OS {so.os_number} · {so.status}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>
          )}
        </div>

        {/* ── Telemetry sidebar (4 cols) ──────────────────────── */}
        <div className="lg:col-span-4 space-y-4">

          {/* Legend */}
          <div className="glass-card rounded-xl border border-outline-variant p-4 space-y-3 text-xs font-semibold">
            <p className="text-[10px] uppercase tracking-wider text-on-surface-variant/70 border-b border-outline-variant pb-1.5 mb-2">
              Legenda do Mapa
            </p>
            
            {/* Autarquias Section */}
            <div className="space-y-2">
              <span className="text-[10px] text-on-surface-variant/50 block font-normal">AUTARQUIAS (PINOS)</span>
              <div className="flex flex-wrap gap-3">
                {[
                  { color: '#16a34a', label: 'Ativo' },
                  { color: '#dc2626', label: 'Pendente' },
                  { color: '#6b7280', label: 'Inativo' },
                  { color: '#4f46e5', label: 'Selecionado' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <svg width="12" height="15" viewBox="0 0 36 47" className="shrink-0">
                      <path d="M18 2C10.3 2 4 8.3 4 16c0 10.5 14 28 14 28S32 26.5 32 16C32 8.3 25.7 2 18 2z" fill={color} stroke="white" strokeWidth="3"/>
                    </svg>
                    <span className="text-on-surface-variant">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ocorrências Section */}
            <div className="space-y-2 pt-1 border-t border-outline-variant/50">
              <span className="text-[10px] text-on-surface-variant/50 block font-normal">OCORRÊNCIAS (CÍRCULOS)</span>
              <div className="flex flex-wrap gap-3">
                {[
                  { color: '#dc2626', label: 'Crítico' },
                  { color: '#ea580c', label: 'Alto' },
                  { color: '#ca8a04', label: 'Médio' },
                  { color: '#6b7280', label: 'Baixo' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full inline-block border border-white shadow-sm" style={{ background: color }} />
                    <span className="text-on-surface-variant">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ordens de Serviço Section */}
            <div className="space-y-2 pt-1 border-t border-outline-variant/50">
              <span className="text-[10px] text-on-surface-variant/50 block font-normal">ORDENS DE SERVIÇO (LOSANGOS)</span>
              <div className="flex flex-wrap gap-3">
                {[
                  { color: '#f59e0b', label: 'Aberta' },
                  { color: '#3b82f6', label: 'Em Execução' },
                  { color: '#10b981', label: 'Concluída' },
                ].map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 inline-block rotate-45 border border-white shadow-sm" style={{ background: color }} />
                    <span className="text-on-surface-variant">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Minha Posição */}
            <div className="pt-1 border-t border-outline-variant/50 flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full inline-block bg-[#3b82f6] border-2 border-white shadow-sm" />
              <span className="text-on-surface-variant">A sua posição</span>
            </div>
          </div>

          {/* Inspection Panel */}
          <div className="glass-card p-6 border border-outline-variant rounded-xl flex flex-col h-[460px] overflow-y-auto">
            {selectedMunicipality ? (
              <div className="flex flex-col justify-between h-full animate-in fade-in slide-in-from-right-2 duration-200">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-4">
                    <div>
                      <h3 className="font-bold text-xl text-on-surface leading-tight">{selectedMunicipality.name}</h3>
                      <p className="text-xs text-on-surface-variant mt-1">
                        Código: {selectedMunicipality.code} · ID: {selectedMunicipality.id}
                      </p>
                    </div>
                    <span className="bg-primary-container text-on-primary-container text-[11px] font-semibold px-2.5 py-1 rounded shrink-0">
                      {selectedMunicipality.plan}
                    </span>
                  </div>

                  <div className="border-t border-outline-variant mb-4" />

                  <div className="space-y-4 text-xs">
                    {[
                      {
                        icon: <Users className="h-4 w-4" />,
                        label: 'Utilizadores Ativos',
                        value: selectedMunicipality.users.toLocaleString('pt-PT'),
                      },
                      {
                        icon: <AlertTriangle className="h-4 w-4 text-tertiary" />,
                        label: 'Ocorrências este Mês',
                        value: selectedMunicipality.occurrencesMonth.toLocaleString('pt-PT'),
                      },
                      {
                        icon: <Navigation className="h-4 w-4 text-primary" />,
                        label: 'Coordenadas GPS',
                        value: `${selectedMunicipality.latitude.toFixed(4)}°N, ${Math.abs(selectedMunicipality.longitude).toFixed(4)}°W`,
                      },
                      {
                        icon: <ShieldCheck className="h-4 w-4 text-secondary" />,
                        label: 'Estado da Autarquia',
                        value: (
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{
                              background:
                                selectedMunicipality.status === 'Ativo'    ? '#16a34a' :
                                selectedMunicipality.status === 'Pendente' ? '#dc2626' : '#6b7280',
                            }} />
                            {selectedMunicipality.status}
                          </span>
                        ),
                      },
                    ].map(({ icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className="p-2 bg-surface-container border border-outline-variant text-on-surface rounded-lg shrink-0">
                          {icon}
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-on-surface-variant leading-none uppercase tracking-wider">
                            {label}
                          </p>
                          <p className="text-sm font-bold text-on-surface mt-1">{value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-6 border-t border-outline-variant mt-auto">
                  <button
                    id="btn-trigger-sensory-alert"
                    onClick={() => {
                      onTriggerMockAlerts(selectedMunicipality.id);
                      alert(`Sinal emitido para o nó de sensores em ${selectedMunicipality.name}. Ocorrência registada!`);
                    }}
                    className="w-full bg-primary hover:opacity-90 text-on-primary font-semibold text-xs uppercase tracking-wider py-3 rounded-lg cursor-pointer flex items-center justify-center gap-2 border-none shadow-sm"
                  >
                    <Zap className="h-4 w-4" />
                    <span>Disparar Alerta Local</span>
                  </button>

                  <button
                    id="btn-toggle-activity-map"
                    onClick={() => {
                      const nextStatus = selectedMunicipality.status === 'Ativo' ? 'Inativo' : 'Ativo';
                      onUpdateMunicipality({ ...selectedMunicipality, status: nextStatus as any });
                    }}
                    className="w-full bg-surface-container-high hover:bg-surface-variant text-on-surface font-semibold text-xs uppercase tracking-wider py-3 rounded-lg transition-all text-center cursor-pointer border-none"
                  >
                    Marcar como {selectedMunicipality.status === 'Ativo' ? 'Inativo' : 'Ativo'}
                  </button>
                </div>
              </div>
            ) : selectedOccurrence ? (
              <div className="flex flex-col justify-between h-full animate-in fade-in slide-in-from-right-2 duration-200">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-on-surface leading-tight">{selectedOccurrence.title}</h3>
                      <p className="text-[11px] text-on-surface-variant mt-1">
                        ID: {selectedOccurrence.id}
                      </p>
                    </div>
                    <span className="bg-tertiary-container text-on-tertiary-container text-[10px] font-semibold px-2 py-0.5 rounded shrink-0">
                      {selectedOccurrence.category}
                    </span>
                  </div>

                  <div className="border-t border-outline-variant mb-4" />

                  <div className="space-y-4 text-xs">
                    {[
                      {
                        icon: <MapPin className="h-4 w-4 text-primary" />,
                        label: 'Município',
                        value: selectedOccurrence.municipality,
                      },
                      {
                        icon: <Navigation className="h-4 w-4 text-secondary" />,
                        label: 'Localização / Endereço',
                        value: selectedOccurrence.address || selectedOccurrence.neighborhood || 'Não especificado',
                      },
                      {
                        icon: <AlertTriangle className="h-4 w-4 text-error" />,
                        label: 'Prioridade / Estado',
                        value: (
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{selectedOccurrence.priority}</span>
                            <span>·</span>
                            <span className="font-bold text-on-surface-variant">{selectedOccurrence.status}</span>
                          </div>
                        ),
                      },
                      {
                        icon: <Users className="h-4 w-4" />,
                        label: 'Relator / Data',
                        value: `${selectedOccurrence.reporter} em ${selectedOccurrence.date}`,
                      },
                    ].map(({ icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className="p-2 bg-surface-container border border-outline-variant text-on-surface rounded-lg shrink-0">
                          {icon}
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-on-surface-variant leading-none uppercase tracking-wider">
                            {label}
                          </p>
                          <p className="text-sm font-semibold text-on-surface mt-1">{value}</p>
                        </div>
                      </div>
                    ))}

                    {selectedOccurrence.description && (
                      <div className="mt-3 p-3 bg-surface-container border border-outline-variant rounded-lg">
                        <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                          Descrição
                        </p>
                        <p className="text-xs text-on-surface leading-normal">{selectedOccurrence.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {onUpdateOccurrenceStatus && selectedOccurrence.status !== 'Resolvido' && (
                  <div className="space-y-3 pt-6 border-t border-outline-variant mt-auto">
                    {selectedOccurrence.status === 'Pendente' || selectedOccurrence.status === 'Aberto' ? (
                      <button
                        onClick={() => {
                          onUpdateOccurrenceStatus(selectedOccurrence.id, 'Em Resolução');
                          setSelectedEntity({ type: 'occurrence', id: selectedOccurrence.id });
                          alert(`Ocorrência ${selectedOccurrence.id} despachada para equipa de terreno!`);
                        }}
                        className="w-full bg-primary hover:opacity-90 text-on-primary font-semibold text-xs uppercase tracking-wider py-3 rounded-lg cursor-pointer flex items-center justify-center gap-2 border-none shadow-sm"
                      >
                        <Zap className="h-4 w-4" />
                        <span>Despachar Ocorrência</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          onUpdateOccurrenceStatus(selectedOccurrence.id, 'Resolvido');
                          setSelectedEntity({ type: 'occurrence', id: selectedOccurrence.id });
                          alert(`Ocorrência ${selectedOccurrence.id} marcada como resolvida com sucesso!`);
                        }}
                        className="w-full bg-[#10b981] hover:opacity-90 text-white font-semibold text-xs uppercase tracking-wider py-3 rounded-lg cursor-pointer flex items-center justify-center gap-2 border-none shadow-sm"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Resolver Ocorrência</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : selectedServiceOrder ? (
              <div className="flex flex-col justify-between h-full animate-in fade-in slide-in-from-right-2 duration-200">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-4">
                    <div>
                      <h3 className="font-bold text-lg text-primary leading-tight">{selectedServiceOrder.os_number}</h3>
                      <p className="text-[11px] text-on-surface-variant mt-1">
                        Ordem de Serviço
                      </p>
                    </div>
                    <span className="bg-warning-container text-on-warning-container text-[10px] font-semibold px-2 py-0.5 rounded shrink-0">
                      {selectedServiceOrder.status}
                    </span>
                  </div>

                  <div className="border-t border-outline-variant mb-4" />

                  <div className="space-y-4 text-xs">
                    {[
                      {
                        icon: <FileText className="h-4 w-4 text-primary" />,
                        label: 'Ocorrência Associada',
                        value: selectedServiceOrder.occurrences?.title || 'Não disponível',
                      },
                      {
                        icon: <AlertTriangle className="h-4 w-4 text-error" />,
                        label: 'Prioridade',
                        value: selectedServiceOrder.priority,
                      },
                      {
                        icon: <Users className="h-4 w-4 text-secondary" />,
                        label: 'Equipa Responsável',
                        value: selectedServiceOrder.responsible_team_id || 'A aguardar atribuição',
                      },
                      {
                        icon: <Clock className="h-4 w-4" />,
                        label: 'Prazo Limite',
                        value: selectedServiceOrder.deadline ? selectedServiceOrder.deadline.substring(0, 10) : 'Sem prazo definido',
                      },
                    ].map(({ icon, label, value }) => (
                      <div key={label} className="flex items-center gap-3">
                        <div className="p-2 bg-surface-container border border-outline-variant text-on-surface rounded-lg shrink-0">
                          {icon}
                        </div>
                        <div>
                          <p className="text-[10px] font-semibold text-on-surface-variant leading-none uppercase tracking-wider">
                            {label}
                          </p>
                          <p className="text-sm font-semibold text-on-surface mt-1">{value}</p>
                        </div>
                      </div>
                    ))}

                    {selectedServiceOrder.resolution_report && (
                      <div className="mt-3 p-3 bg-surface-container border border-outline-variant rounded-lg">
                        <p className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                          Relatório de Resolução
                        </p>
                        <p className="text-xs text-on-surface leading-normal">{selectedServiceOrder.resolution_report}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col justify-center items-center text-center p-6 text-on-surface-variant/40 text-sm">
                <Navigation className="h-10 w-10 text-primary/20 animate-bounce mb-3" />
                <p>Clique num marcador no mapa para visualizar a telemetria do item selecionado.</p>
                {geoState === 'found' && userPos && (
                  <div className="mt-4 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-2 w-full">
                    <p className="text-[11px] text-blue-400 font-semibold flex items-center justify-center gap-1.5">
                      <LocateFixed className="h-3 w-3" />
                      Localizado em {userPos[0].toFixed(3)}°, {userPos[1].toFixed(3)}°
                    </p>
                  </div>
                )}
                <div className="mt-4 border-t border-outline-variant w-full pt-4">
                  <p className="text-[11px] font-mono text-on-surface-variant/50 uppercase tracking-widest">
                    MALHA NACIONAL · {municipalities.length} NODOS ATIVOS
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bottom info bar */}
      <div className="flex items-center gap-2 bg-surface-container/80 border border-outline-variant px-4 py-3 rounded-xl shadow-sm">
        <Info className="h-4 w-4 text-primary shrink-0" />
        <p className="text-xs text-on-surface font-medium">
          Mapa interativo OpenStreetMap · Localização automática via GPS do browser · Clique nos marcadores para inspecionar telemetria
        </p>
      </div>
    </div>
  );
}
