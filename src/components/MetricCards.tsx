import { Building2, FileText, Coins, ShieldAlert } from 'lucide-react';
import type { Municipality } from '../types';

interface MetricCardsProps {
  municipalities: Municipality[];
  totalOccurrencesBase: number;
}

export default function MetricCards({ municipalities, totalOccurrencesBase }: MetricCardsProps) {
  // 1. Total Cities
  const totalCities = municipalities.length;
  
  // 2. Total Occurrences (base static value + dynamic sum of month reports of listed municipalities)
  const totalOccurrences = totalOccurrencesBase + municipalities.reduce((acc, current) => acc + current.occurrencesMonth, 0);

  // 3. Receita Global (MRR) - Dynamic formula based on municipal subscription tiers:
  // Enterprise = €3000, Premium = €1500, Básico = €500
  const mrrTotalRaw = municipalities.reduce((acc, curr) => {
    switch (curr.plan) {
      case 'Enterprise': return acc + 3000;
      case 'Premium': return acc + 1500;
      case 'Básico': return acc + 500;
      default: return acc;
    }
  }, 20000); // 20k base offset
  
  // Format to €K or €M
  const mrrFormatted = `€${(mrrTotalRaw / 1000).toFixed(0)}k`;

  // Calculate percentage of Enterprise
  const enterpriseCount = municipalities.filter(m => m.plan === 'Enterprise').length;
  const enterprisePercent = totalCities > 0 ? Math.round((enterpriseCount / totalCities) * 100) : 0;

  // 4. System alerts (dependent on 'Pendente' or deactivated states)
  const systemAlerts = municipalities.filter(m => m.status === 'Pendente').length + 2; // base offset

  return (
    <section id="metrics-bento-grid" className="grid grid-cols-12 gap-6 mb-10">
      {/* Total Cidades */}
      <div 
        id="metric-card-cities"
        className="col-span-12 md:col-span-3 glass-card p-6 rounded-xl shadow-sm border-l-4 border-primary hover:scale-[1.01] transition-transform duration-150"
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-primary bg-primary-container/20 p-2 rounded-lg">
            <Building2 className="h-5 w-5" />
          </span>
          <span className="text-secondary font-semibold text-xs tracking-wider">+4 este mês</span>
        </div>
        <p className="text-sm font-medium text-on-surface-variant">Total de Cidades</p>
        <h3 className="text-2xl font-bold mt-1 text-on-surface">{totalCities}</h3>
      </div>

      {/* Total Ocorrências */}
      <div 
        id="metric-card-occurrences"
        className="col-span-12 md:col-span-3 glass-card p-6 rounded-xl shadow-sm border-l-4 border-secondary hover:scale-[1.01] transition-transform duration-150"
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-secondary bg-secondary-container/20 p-2 rounded-lg">
            <FileText className="h-5 w-5" />
          </span>
          <span className="text-secondary font-semibold text-xs tracking-wider">+1.2k hoje</span>
        </div>
        <p className="text-sm font-medium text-on-surface-variant">Total de Ocorrências</p>
        <h3 className="text-2xl font-bold mt-1 text-on-surface">
          {totalOccurrences.toLocaleString('pt-PT')}
        </h3>
      </div>

      {/* Receita Global (MRR) */}
      <div 
        id="metric-card-mrr"
        className="col-span-12 md:col-span-3 glass-card p-6 rounded-xl shadow-sm border-l-4 border-tertiary hover:scale-[1.01] transition-transform duration-150"
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-tertiary bg-tertiary-container/20 p-2 rounded-lg">
            <Coins className="h-5 w-5" />
          </span>
          <span className="text-primary font-semibold text-xs tracking-wider">{enterprisePercent}% Enterprise</span>
        </div>
        <p className="text-sm font-medium text-on-surface-variant">Receita Global (MRR)</p>
        <h3 className="text-2xl font-bold mt-1 text-on-surface">{mrrFormatted}</h3>
      </div>

      {/* Alertas de Sistema */}
      <div 
        id="metric-card-alerts"
        className="col-span-12 md:col-span-3 glass-card p-6 rounded-xl shadow-sm border-l-4 border-error hover:scale-[1.01] transition-transform duration-150"
      >
        <div className="flex justify-between items-start mb-2">
          <span className="text-error bg-error-container/20 p-2 rounded-lg">
            <ShieldAlert className="h-5 w-5" />
          </span>
          <span className="text-error font-semibold text-xs tracking-wider">
            {municipalities.filter(m => m.status === 'Pendente').length} Críticos
          </span>
        </div>
        <p className="text-sm font-medium text-on-surface-variant">Alertas de Sistema</p>
        <h3 className="text-2xl font-bold mt-1 text-on-surface">
          {systemAlerts.toString().padStart(2, '0')}
        </h3>
      </div>
    </section>
  );
}
