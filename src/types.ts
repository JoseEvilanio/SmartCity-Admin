export type ActiveTab = 'dashboard' | 'map' | 'occurrences' | 'team' | 'heatmaps' | 'settings';

export interface Municipality {
  id: string; // e.g. "T-4029-LIS"
  name: string;
  code: string; // e.g. "LX"
  status: 'Ativo' | 'Pendente' | 'Inativo';
  plan: 'Enterprise' | 'Premium' | 'Básico';
  users: number;
  occurrencesMonth: number;
  latitude: number;
  longitude: number;
}

export interface OccurrencesChartPoint {
  week: string;
  value: number;
}

export type OccurrenceStatus =
  | 'Pendente' | 'Em Resolução' | 'Resolvido'
  | 'Aberto' | 'Em análise' | 'Encaminhado' | 'Em atendimento'
  | 'Rejeitado' | 'Duplicado' | 'Cancelado' | 'Cancelada';

export type OccurrenceCategory =
  | 'Trânsito' | 'Infraestrutura' | 'Saneamento' | 'Urgência' | 'Ambiente'
  | 'Buraco na rua' | 'Vazamento de água' | 'Falta de iluminação' | 'Poste danificado'
  | 'Esgoto a céu aberto' | 'Lixo acumulado' | 'Semáforo quebrado' | 'Árvore caída'
  | 'Alagamento' | 'Transporte público' | 'Segurança pública' | 'Calçada danificada'
  | 'Animais abandonados' | 'Outros';

export interface OccurrencesRecord {
  id: string;
  title: string;
  municipality: string;
  category: OccurrenceCategory;
  priority: 'Crítico' | 'Alto' | 'Médio' | 'Baixo';
  status: OccurrenceStatus;
  date: string;
  reporter: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  neighborhood?: string;
  address?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'Super Administrador' | 'Administrador Local';
  municipality: string;
  status: 'Ativo' | 'Inativo';
  lastActive: string;
}
