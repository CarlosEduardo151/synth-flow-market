import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

interface Props {
  icon: LucideIcon;
  iconColor?: string; // ex.: 'text-primary', 'text-pink-500'
  title: string;
  description: string;
  actions?: ReactNode;
}

/**
 * Header padrão das abas do Assistente de Vendas (estilo "Leads").
 * Garante consistência visual entre Agendamentos, Copiloto, RolePlay,
 * Anti-Churn, Win-back e Health Score.
 */
export function SalesSectionHeader({ icon: Icon, iconColor = 'text-primary', title, description, actions }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Icon className={`h-5 w-5 ${iconColor}`} />
          <span className="truncate">{title}</span>
        </h2>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap gap-2 shrink-0">{actions}</div>}
    </div>
  );
}
