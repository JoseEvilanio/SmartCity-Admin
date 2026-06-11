import { 
  LayoutDashboard, 
  Map, 
  ClipboardList, 
  Users, 
  Flame, 
  Settings, 
  Download, 
  HelpCircle, 
  LogOut
} from 'lucide-react';
import type { ActiveTab } from '../types';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  onExportReport: () => void;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, onExportReport, onLogout }: SidebarProps) {
  const menuItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'map' as ActiveTab, label: 'Map View', icon: Map },
    { id: 'occurrences' as ActiveTab, label: 'Ocorrências', icon: ClipboardList },
    { id: 'team' as ActiveTab, label: 'Gestão de Equipa', icon: Users },
    { id: 'heatmaps' as ActiveTab, label: 'Heatmaps', icon: Flame },
    { id: 'settings' as ActiveTab, label: 'Definições', icon: Settings },
  ];

  return (
    <aside 
      id="side-nav-bar"
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col p-6 h-screen w-72 bg-surface-container-low border-r border-outline-variant"
    >
      {/* Brand Header */}
      <div className="mb-10 px-2">
        <h1 className="text-xl font-bold text-primary tracking-tight">SmartCity Admin</h1>
        <p className="text-xs text-on-surface-variant">Centro Operacional</p>
      </div>

      {/* Navigation Space */}
      <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              id={`nav-item-${item.id}`}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-2 rounded-lg transition-all duration-150 text-left cursor-pointer text-xs font-semibold tracking-wide ${
                isActive
                  ? 'bg-secondary-container text-on-secondary-container scale-95'
                  : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
              }`}
            >
              <Icon className={`h-4.5 w-4.5 transition-colors ${isActive ? 'text-on-secondary-container' : 'text-on-surface-variant'}`} />
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Footer Action Hub */}
      <div className="mt-auto border-t border-outline-variant pt-6 space-y-1">
        <button
          id="btn-export-reports"
          onClick={onExportReport}
          className="w-full bg-primary hover:opacity-95 text-on-primary font-semibold text-xs tracking-wider py-2.5 px-4 rounded-lg shadow-sm transition-all duration-150 flex items-center justify-center gap-2 cursor-pointer mb-2"
        >
          <Download className="h-4 w-4" />
          <span>Exportar Relatório</span>
        </button>

        <button
          id="btn-help-center"
          onClick={() => alert("Central de Ajuda: Entre em contato com suporte@urbanpulse.gov")}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-all text-left text-xs font-semibold tracking-wider cursor-pointer"
        >
          <HelpCircle className="h-4.5 w-4.5 text-on-surface-variant" />
          <span>Ajuda & Suporte</span>
        </button>

        <button
          id="btn-logout-trigger"
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-error hover:bg-error-container/20 transition-all text-left text-xs font-semibold tracking-wider cursor-pointer"
        >
          <LogOut className="h-4.5 w-4.5 text-error" />
          <span>Terminar Sessão</span>
        </button>
      </div>
    </aside>
  );
}
