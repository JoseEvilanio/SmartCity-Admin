import { useState } from 'react';
import { Target, Activity, Flame, ShieldAlert, Wifi, Info } from 'lucide-react';

export default function HeatmapsTab() {
  const [activeLayer, setActiveLayer] = useState<'traffic' | 'noise' | 'pollution'>('traffic');
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  // Nodes representing sensory hotspots
  const hotspots = [
    { id: 'HOT-LIS', city: 'Lisboa Central', lat: 38.7223, lng: -9.1393, traffic: 89, noise: 74, pollution: 65, description: 'Elevada retenção de veículos em artérias nucleares.' },
    { id: 'HOT-POR', city: 'Porto Boavista', lat: 41.1579, lng: -8.6291, traffic: 72, noise: 84, pollution: 55, description: 'Fluxo sonoro crítico decorrente de obras públicas.' },
    { id: 'HOT-COI', city: 'Coimbra Baixa', lat: 40.2033, lng: -8.4103, traffic: 45, noise: 32, pollution: 12, description: 'Métricas gerais dentro dos parâmetros aceitáveis de biosfera.' },
    { id: 'HOT-BRA', city: 'Braga Centro', lat: 41.5503, lng: -8.4201, traffic: 68, noise: 56, pollution: 41, description: 'Rede rodoviária sob carga secundária estacional.' },
    { id: 'HOT-FAR', city: 'Faro Aeroporto', lat: 37.0179, lng: -7.9308, traffic: 34, noise: 91, pollution: 28, description: 'Nível sónico de decolagem de aeronaves comerciais.' },
  ];

  const getHeatValue = (node: typeof hotspots[number]) => {
    switch (activeLayer) {
      case 'traffic': return node.traffic;
      case 'noise': return node.noise;
      case 'pollution': return node.pollution;
    }
  };

  const getHeatColor = (value: number) => {
    if (value > 80) return 'from-error/40 to-transparent';
    if (value > 50) return 'from-tertiary/40 to-transparent';
    return 'from-secondary/35 to-transparent';
  };

  const currentHotspot = hotspots.find(h => h.id === hoveredNodeId);

  return (
    <div id="heatmaps-view-terminal" className="space-y-6 animate-in fade-in duration-300 font-sans">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-on-surface mb-1">Capa de Análise Térmica</h2>
        <p className="text-base text-on-surface-variant">Visualização combinada de sensores IoT ambientais e densidade de stress da malha urbana</p>
      </div>

      {/* Layer selector tabs */}
      <div className="flex flex-col sm:flex-row gap-2 bg-surface-container-low p-2 border border-outline-variant w-full sm:w-fit rounded-xl">
        <button
          onClick={() => setActiveLayer('traffic')}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider cursor-pointer border rounded-lg transition-all border-transparent ${
            activeLayer === 'traffic'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <Flame className="h-4 w-4" />
          <span>Foco do Tráfego</span>
        </button>

        <button
          onClick={() => setActiveLayer('noise')}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider cursor-pointer border rounded-lg transition-all border-transparent ${
            activeLayer === 'noise'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <Activity className="h-4 w-4" />
          <span>Ruído Sonoro</span>
        </button>

        <button
          onClick={() => setActiveLayer('pollution')}
          className={`flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider cursor-pointer border rounded-lg transition-all border-transparent ${
            activeLayer === 'pollution'
              ? 'bg-primary text-on-primary'
              : 'text-on-surface-variant hover:bg-surface-container'
          }`}
        >
          <Target className="h-4 w-4" />
          <span>Qualidade do Ar</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Heat Map Display Container (Spans 8 cols) */}
        <div className="lg:col-span-8 glass-card rounded-xl p-6 h-[500px] relative overflow-hidden bg-transparent border border-outline-variant flex items-center justify-center">
          
          {/* Coordinates grid lines */}
          <div className="absolute inset-0 bg-[radial-gradient(rgba(0,0,0,0.08)_1px,transparent_1px)] [background-size:20px_20px]"></div>

          {/* Graphical rendering of gradient blurs overlay */}
          {hotspots.map((node) => {
            const val = getHeatValue(node);
            // Translate GPS mathematically to simple visual regions
            let leftPercent = '20%';
            let topPercent = '70%';

            if (node.id === 'HOT-POR') { leftPercent = '28%'; topPercent = '25%'; }
            if (node.id === 'HOT-COI') { leftPercent = '26%'; topPercent = '42%'; }
            if (node.id === 'HOT-BRA') { leftPercent = '32%'; topPercent = '15%'; }
            if (node.id === 'HOT-FAR') { leftPercent = '45%'; topPercent = '82%'; }

            const isHovered = hoveredNodeId === node.id;

            return (
              <div 
                key={node.id}
                style={{ left: leftPercent, top: topPercent }}
                className="absolute -translate-x-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none"
              >
                {/* Bluffed gradient circle back */}
                <div 
                  className={`absolute w-36 h-36 rounded-full bg-gradient-to-r filter blur-3xl transition-all duration-500 ${
                    isHovered ? 'scale-150 opacity-90' : 'opacity-40'
                  } ${getHeatColor(val)}`}
                ></div>

                {/* Direct interact point trigger */}
                <button
                  onMouseEnter={() => setHoveredNodeId(node.id)}
                  onMouseLeave={() => setHoveredNodeId(null)}
                  className="relative pointer-events-auto h-7 w-7 rounded-full bg-surface-container-low hover:bg-surface-container-lowest border border-outline-variant hover:scale-125 focus:outline-none transition-all duration-150 flex items-center justify-center cursor-pointer shadow"
                >
                  <span className={`w-3 h-3 rounded-full ${
                    val > 80 ? 'bg-error' : val > 50 ? 'bg-tertiary' : 'bg-secondary'
                  }`}></span>
                </button>
              </div>
            );
          })}

          <div className="absolute bottom-6 left-6 flex items-center gap-2 bg-surface-container/95 border border-outline-variant p-3 z-10 rounded-xl shadow-sm">
            <Info className="h-4.5 w-4.5 text-primary shrink-0" />
            <span className="text-xs text-on-surface font-semibold">Passe o cursor sobre os nós de sensores operacionais.</span>
          </div>
        </div>

        {/* Side panel readout (Spans 4 cols) */}
        <div className="lg:col-span-4">
          <div className="glass-card p-6 h-full flex flex-col justify-between border border-outline-variant bg-transparent rounded-xl">
            {currentHotspot ? {
              traffic: (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div>
                    <h3 className="font-bold text-xl text-on-surface tracking-tight leading-none">{currentHotspot.city}</h3>
                    <p className="text-xs text-error font-semibold flex items-center gap-1 mt-2.5 tracking-wide">
                      <ShieldAlert className="h-4 w-4 shrink-0 animate-bounce" />
                      <span>Densidade de Tráfego Crítica</span>
                    </p>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <div className="flex justify-between font-semibold text-on-surface-variant/80 mb-2">
                        <span>Fluxo Rodoviário (Média)</span>
                        <span className="text-on-surface font-bold">{currentHotspot.traffic}%</span>
                      </div>
                      <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full bg-error rounded-full" style={{ width: `${currentHotspot.traffic}%` }}></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-semibold text-on-surface-variant/80 mb-2">
                        <span>Nível Ruído Adjacente</span>
                        <span className="text-on-surface font-bold">{currentHotspot.noise} dB</span>
                      </div>
                      <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full bg-tertiary rounded-full" style={{ width: `${currentHotspot.noise}%` }}></div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-surface-container border border-outline-variant rounded-xl text-xs">
                      <p className="text-[10px] font-semibold text-on-surface-variant/80 uppercase mb-1.5">Descrição</p>
                      <p className="text-on-surface font-medium leading-relaxed">{currentHotspot.description}</p>
                    </div>
                  </div>
                </div>
              ),
              noise: (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div>
                    <h3 className="font-bold text-xl text-on-surface tracking-tight leading-none">{currentHotspot.city}</h3>
                    <p className="text-xs text-tertiary font-semibold flex items-center gap-1 mt-2.5 tracking-wide">
                      <Activity className="h-4 w-4 shrink-0" />
                      <span>Sinal Sónico Amplificado</span>
                    </p>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <div className="flex justify-between font-semibold text-on-surface-variant/80 mb-2">
                        <span>Estudo Decibéis (dBA)</span>
                        <span className="text-on-surface font-bold">{currentHotspot.noise} dB</span>
                      </div>
                      <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full bg-error rounded-full" style={{ width: `${currentHotspot.noise}%` }}></div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-surface-container border border-outline-variant rounded-xl text-xs">
                      <p className="text-[10px] font-semibold text-on-surface-variant/80 uppercase mb-1.5">Diagnóstico Acústico</p>
                      <p className="text-on-surface font-medium leading-relaxed">{currentHotspot.description}</p>
                    </div>
                  </div>
                </div>
              ),
              pollution: (
                <div className="space-y-6 animate-in fade-in duration-200">
                  <div>
                    <h3 className="font-bold text-xl text-on-surface tracking-tight leading-none">{currentHotspot.city}</h3>
                    <p className="text-xs text-primary font-semibold flex items-center gap-1 mt-2.5 tracking-wide">
                      <Wifi className="h-4 w-4 shrink-0" />
                      <span>Concentração de Gás</span>
                    </p>
                  </div>

                  <div className="space-y-4 text-xs">
                    <div>
                      <div className="flex justify-between font-semibold text-on-surface-variant/80 mb-2">
                        <span>CO2 PPM (Partes por Milhão)</span>
                        <span className="text-on-surface font-bold">{currentHotspot.pollution} ppm</span>
                      </div>
                      <div className="w-full h-2 bg-surface-container rounded-full overflow-hidden">
                        <div className="h-full bg-primary rounded-full" style={{ width: `${currentHotspot.pollution}%` }}></div>
                      </div>
                    </div>

                    <div className="p-3.5 bg-surface-container border border-outline-variant rounded-xl text-xs">
                      <p className="text-[10px] font-semibold text-on-surface-variant/80 uppercase mb-1.5">Qualidade Geral do Ar</p>
                      <p className="text-on-surface font-medium leading-relaxed">{currentHotspot.pollution > 60 ? 'Ar com indicação de CO2 moderado.' : 'Qualidade de circulação atmosférica ideal.'}</p>
                    </div>
                  </div>
                </div>
              ),
            }[activeLayer] : (
              <div className="h-full flex flex-col justify-center items-center text-center p-6 text-on-surface-variant/40 font-sans text-xs">
                <Target className="h-10 w-10 text-primary/25 animate-pulse mb-3" />
                <p>Inspecione os nós para carregar leituras instantâneas dos sensores locais.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
