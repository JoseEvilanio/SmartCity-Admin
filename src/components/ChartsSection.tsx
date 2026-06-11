import { useState } from 'react';
import type { Municipality } from '../types';

interface ChartsSectionProps {
  municipalities: Municipality[];
  selectedPlanFilter: string | null;
  setSelectedPlanFilter: (plan: 'Enterprise' | 'Premium' | 'Básico' | null) => void;
}

export default function ChartsSection({ 
  municipalities, 
  selectedPlanFilter,
  setSelectedPlanFilter 
}: ChartsSectionProps) {
  const [timeframe, setTimeframe] = useState<'30' | '90' | '180'>('30');
  const [hoveredBarIndex, setHoveredBarIndex] = useState<number | null>(null);

  // Timeframe simulated datasets
  const barData: Record<'30' | '90' | '180', { week: string; label: string; value: number }[]> = {
    '30': [
      { week: 'Semana 1', label: 'Estatísticas Gerais d1-d4', value: 2400 },
      { week: 'Semana 1', label: 'Estatísticas Gerais d5-d7', value: 3200 },
      { week: 'Semana 2', label: 'Estatísticas Gerais d8-d11', value: 4100 },
      { week: 'Semana 2', label: 'Estatísticas Gerais d12-d14', value: 2800 },
      { week: 'Semana 3', label: 'Estatísticas Gerais d15-d18', value: 5600 },
      { week: 'Semana 3', label: 'Estatísticas Gerais d19-d21', value: 4800 },
      { week: 'Semana 4', label: 'Estatísticas Gerais d22-d25', value: 6800 },
      { week: 'Semana 4', label: 'Estatísticas Gerais d26-d30', value: 5700 },
    ],
    '90': [
      { week: 'Semana 1', label: 'Mês 1 (Início)', value: 8500 },
      { week: 'Semana 1', label: 'Mês 1 (Fim)', value: 9800 },
      { week: 'Semana 2', label: 'Mês 2 (Início)', value: 12400 },
      { week: 'Semana 2', label: 'Mês 2 (Fim)', value: 11000 },
      { week: 'Semana 3', label: 'Mês 3 (Início)', value: 15300 },
      { week: 'Semana 3', label: 'Mês 3 (Fim)', value: 14200 },
      { week: 'Semana 4', label: 'Consolidação Geral T1', value: 19500 },
      { week: 'Semana 4', label: 'Consolidação Geral T2', value: 16800 },
    ],
    '180': [
      { week: 'Semana 1', label: 'Bimestre 1', value: 18000 },
      { week: 'Semana 1', label: 'Bimestre 2', value: 22000 },
      { week: 'Semana 2', label: 'Bimestre 3', value: 29000 },
      { week: 'Semana 2', label: 'Bimestre 4', value: 21000 },
      { week: 'Semana 3', label: 'Bimestre 5', value: 37000 },
      { week: 'Semana 3', label: 'Bimestre 6', value: 33000 },
      { week: 'Semana 4', label: 'Semestre Consolidação A', value: 48000 },
      { week: 'Semana 4', label: 'Semestre Consolidação B', value: 41000 },
    ]
  };

  const currentBarData = barData[timeframe];
  const maxValue = Math.max(...currentBarData.map(b => b.value));

  // --- Donut Chart Dynamic Math ---
  const totalCities = municipalities.length;
  
  const counts = {
    Enterprise: municipalities.filter(m => m.plan === 'Enterprise').length,
    Premium: municipalities.filter(m => m.plan === 'Premium').length,
    Básico: municipalities.filter(m => m.plan === 'Básico').length,
  };

  const percentages = {
    Enterprise: totalCities > 0 ? Math.round((counts.Enterprise / totalCities) * 100) : 0,
    Premium: totalCities > 0 ? Math.round((counts.Premium / totalCities) * 100) : 0,
    Básico: totalCities > 0 ? Math.round((counts.Básico / totalCities) * 100) : 0,
  };

  // SVG Donut Calculations: Circumference of R=50 is 314.16
  const r = 50;
  const circ = 2 * Math.PI * r;

  const entPercent = percentages.Enterprise / 100;
  const premPercent = percentages.Premium / 100;
  const basPercent = percentages.Básico / 100;

  const strokeEnt = entPercent * circ;
  const strokePrem = premPercent * circ;
  const strokeBas = basPercent * circ;

  const offsetEnt = 0;
  const offsetPrem = strokeEnt;
  const offsetBas = strokeEnt + strokePrem;

  return (
    <div id="chart-and-analytics-area" className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-10">
      {/* 1. Bar Chart - Growth of Occurrences */}
      <div 
        id="analytics-card-bar-chart"
        className="lg:col-span-8 glass-card p-6 rounded-xl flex flex-col justify-between"
      >
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
          <div>
            <h4 className="text-lg font-bold text-on-surface">Crescimento de Ocorrências Global</h4>
            <p className="text-xs text-on-surface-variant">Monitorização periódica do fluxo de incidentes municipais</p>
          </div>
          <select 
            id="timeframe-select-trigger"
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as '30' | '90' | '180')}
            className="bg-surface-container-low border-none rounded-lg text-xs font-semibold py-2 px-3 focus:ring-2 focus:ring-primary text-on-surface-variant cursor-pointer outline-none"
          >
            <option value="30">ÚLTIMOS 30 DIAS</option>
            <option value="90">ÚLTIMOS 90 DIAS</option>
            <option value="180">ÚLTIMOS 180 DIAS</option>
          </select>
        </div>

        {/* Dynamic Interactive SVG Bar Chart Grid */}
        <div className="relative h-64 flex items-end justify-between gap-3 pt-6 border-b border-outline-variant px-2">
          {currentBarData.map((bar, index) => {
            // Calculate proportional height
            const pct = maxValue > 0 ? (bar.value / maxValue) * 100 : 15;
            const isHovered = hoveredBarIndex === index;
            
            // Set dynamic opacity based on position to emulate the beautiful gradient bars in the mockup:
            // bg-primary/10, bg-primary/15, bg-primary/20, bg-primary/30, bg-primary/40, bg-primary/60, bg-primary
            const opacityClass = index === 0 ? 'bg-primary/10' :
                                 index === 1 ? 'bg-primary/15' :
                                 index === 2 ? 'bg-primary/25' :
                                 index === 3 ? 'bg-primary/20' :
                                 index === 4 ? 'bg-primary/45' :
                                 index === 5 ? 'bg-primary/35' :
                                 index === 6 ? 'bg-primary' : 'bg-primary/60';

            return (
              <div 
                key={index} 
                className="group relative flex-1 flex flex-col h-full justify-end cursor-pointer"
                onMouseEnter={() => setHoveredBarIndex(index)}
                onMouseLeave={() => setHoveredBarIndex(null)}
              >
                {/* Tooltip Overlay */}
                {isHovered && (
                  <div className="absolute z-30 bottom-[105%] left-1/2 -translate-x-1/2 bg-on-background text-on-primary text-[11px] px-3 py-2 rounded-lg shadow-xl whitespace-nowrap leading-tight transition-all duration-150">
                    <p className="font-bold">{bar.label}</p>
                    <p className="text-[10px] opacity-85 mt-0.5">Ocorrências: <span className="font-extrabold">{bar.value.toLocaleString()}</span></p>
                  </div>
                )}

                {/* Animated Column Bar */}
                <div 
                  className={`w-full transition-all duration-300 ease-out rounded-t-sm ${opacityClass} ${isHovered ? 'opacity-80 scale-x-105 shadow-md' : 'opacity-100'}`}
                  style={{ 
                    height: `${pct}%`
                  }}
                />
              </div>
            );
          })}
        </div>

        {/* X-axis labels */}
        <div className="flex justify-between mt-3 px-2 text-xs font-semibold text-on-surface-variant">
          <span>Semana 1</span>
          <span>Semana 2</span>
          <span>Semana 3</span>
          <span>Semana 4</span>
        </div>
      </div>

      {/* 2. Donut Chart - Subscription Plan Distribution */}
      <div 
        id="analytics-card-donut-chart"
        className="lg:col-span-4 glass-card p-6 rounded-xl flex flex-col justify-between"
      >
        <div>
          <h4 className="text-lg font-bold text-on-surface">Distribuição de Planos</h4>
          <p className="text-xs text-on-surface-variant mb-4">Divisão de planos das autarquias ativas</p>
        </div>

        {/* Circle Center view */}
        <div className="flex-1 flex items-center justify-center relative my-4">
          <svg className="w-40 h-40 transform -rotate-90" viewBox="0 0 120 120">
            {/* Base clean track */}
            <circle
              cx="60"
              cy="60"
              r={r}
              className="stroke-surface-container"
              strokeWidth="11"
              fill="transparent"
            />
            
            {/* Enterprise Slice */}
            {counts.Enterprise > 0 && (
              <circle
                cx="60"
                cy="60"
                r={r}
                className="stroke-primary transition-all duration-500"
                strokeWidth="14"
                strokeDasharray={`${strokeEnt} ${circ}`}
                strokeDashoffset={-offsetEnt}
                fill="transparent"
                strokeLinecap="round"
              />
            )}

            {/* Premium Slice */}
            {counts.Premium > 0 && (
              <circle
                cx="60"
                cy="60"
                r={r}
                className="stroke-secondary transition-all duration-500"
                strokeWidth="14"
                strokeDasharray={`${strokePrem} ${circ}`}
                strokeDashoffset={-offsetPrem}
                fill="transparent"
                strokeLinecap="round"
              />
            )}

            {/* Básico Slice */}
            {counts.Básico > 0 && (
              <circle
                cx="60"
                cy="60"
                r={r}
                className="stroke-primary-container transition-all duration-500"
                strokeWidth="14"
                strokeDasharray={`${strokeBas} ${circ}`}
                strokeDashoffset={-offsetBas}
                fill="transparent"
                strokeLinecap="round"
              />
            )}
          </svg>

          {/* Centered Total Numeric Label */}
          <div className="absolute text-center flex flex-col justify-center items-center pointer-events-none">
            <span className="text-3xl font-bold text-on-surface leading-none">{totalCities}</span>
            <span className="text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mt-1">Total</span>
          </div>
        </div>

        {/* Dynamic Interactive Legend Group */}
        <div id="legends-group-panel" className="space-y-2 mt-4">
          {/* Enterprise */}
          <button
            onClick={() => setSelectedPlanFilter(selectedPlanFilter === 'Enterprise' ? null : 'Enterprise')}
            className={`w-full flex justify-between items-center px-4 py-2 rounded-lg transition-all text-left border cursor-pointer text-xs font-medium ${
              selectedPlanFilter === 'Enterprise' 
                ? 'bg-primary text-on-primary border-transparent' 
                : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-primary ${selectedPlanFilter === 'Enterprise' ? 'ring-2 ring-white' : ''}`}></div>
              <span>Enterprise</span>
            </div>
            <span className="font-semibold">
              {counts.Enterprise} ({percentages.Enterprise}%)
            </span>
          </button>

          {/* Premium */}
          <button
            onClick={() => setSelectedPlanFilter(selectedPlanFilter === 'Premium' ? null : 'Premium')}
            className={`w-full flex justify-between items-center px-4 py-2 rounded-lg transition-all text-left border cursor-pointer text-xs font-medium ${
              selectedPlanFilter === 'Premium' 
                ? 'bg-secondary text-on-secondary border-transparent' 
                : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-secondary ${selectedPlanFilter === 'Premium' ? 'ring-2 ring-white' : ''}`}></div>
              <span>Premium</span>
            </div>
            <span className="font-semibold">
              {counts.Premium} ({percentages.Premium}%)
            </span>
          </button>

          {/* Básico */}
          <button
            onClick={() => setSelectedPlanFilter(selectedPlanFilter === 'Básico' ? null : 'Básico')}
            className={`w-full flex justify-between items-center px-4 py-2 rounded-lg transition-all text-left border cursor-pointer text-xs font-medium ${
              selectedPlanFilter === 'Básico' 
                ? 'bg-primary-container text-on-primary-container border-transparent' 
                : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
            }`}
          >
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full bg-primary-container ${selectedPlanFilter === 'Básico' ? 'ring-2 ring-white' : ''}`}></div>
              <span>Básico</span>
            </div>
            <span className="font-semibold">
              {counts.Básico} ({percentages.Básico}%)
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
