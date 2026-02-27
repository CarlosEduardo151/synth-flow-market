import { CheckCircle2, Clock, FileText, Search, ThumbsUp, Wrench, PackageCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ServiceStage =
  | 'checkin'
  | 'orcamento_enviado'
  | 'orcamento_analise'
  | 'orcamento_aprovado'
  | 'veiculo_finalizado'
  | 'veiculo_entregue';

export const SERVICE_STAGES: { key: ServiceStage; label: string; shortLabel: string; icon: React.ComponentType<{ className?: string }>; }[] = [
  { key: 'checkin', label: 'Check-In', shortLabel: 'Check-In', icon: PackageCheck },
  { key: 'orcamento_enviado', label: 'Orçamento Enviado', shortLabel: 'Enviado', icon: FileText },
  { key: 'orcamento_analise', label: 'Orçamento em Análise', shortLabel: 'Análise', icon: Search },
  { key: 'orcamento_aprovado', label: 'Orçamento Aprovado', shortLabel: 'Aprovado', icon: ThumbsUp },
  { key: 'veiculo_finalizado', label: 'Veículo Finalizado', shortLabel: 'Finalizado', icon: Wrench },
  { key: 'veiculo_entregue', label: 'Veículo Entregue', shortLabel: 'Entregue', icon: CheckCircle2 },
];

function getStageIndex(stage: ServiceStage): number {
  return SERVICE_STAGES.findIndex(s => s.key === stage);
}

interface ServiceStagePipelineProps {
  currentStage: ServiceStage;
  compact?: boolean;
  className?: string;
}

export function ServiceStagePipeline({ currentStage, compact = false, className }: ServiceStagePipelineProps) {
  const currentIndex = getStageIndex(currentStage);

  return (
    <div className={cn('flex items-center w-full', className)}>
      {SERVICE_STAGES.map((stage, index) => {
        const Icon = stage.icon;
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        const isFuture = index > currentIndex;

        return (
          <div key={stage.key} className="flex items-center flex-1 min-w-0">
            {/* Stage Circle + Label */}
            <div className="flex flex-col items-center gap-1 min-w-0">
              <div
                className={cn(
                  'flex items-center justify-center rounded-full border-2 transition-all shrink-0',
                  compact ? 'w-7 h-7' : 'w-9 h-9',
                  isCompleted && 'bg-emerald-500 border-emerald-500 text-white',
                  isCurrent && 'bg-primary border-primary text-primary-foreground shadow-md shadow-primary/25',
                  isFuture && 'bg-muted border-border text-muted-foreground'
                )}
              >
                {isCompleted ? (
                  <CheckCircle2 className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                ) : (
                  <Icon className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                )}
              </div>
              <span
                className={cn(
                  'text-center leading-tight max-w-[72px] truncate',
                  compact ? 'text-[9px]' : 'text-[10px]',
                  isCompleted && 'text-emerald-600 dark:text-emerald-400 font-semibold',
                  isCurrent && 'text-primary font-bold',
                  isFuture && 'text-muted-foreground'
                )}
              >
                {compact ? stage.shortLabel : stage.label}
              </span>
            </div>

            {/* Connector Line */}
            {index < SERVICE_STAGES.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-1 rounded-full min-w-[8px]',
                  index < currentIndex
                    ? 'bg-emerald-500'
                    : index === currentIndex
                      ? 'bg-gradient-to-r from-primary to-border'
                      : 'bg-border'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Badge-style compact indicator showing current stage name + color */
export function ServiceStageBadge({ stage }: { stage: ServiceStage }) {
  const stageInfo = SERVICE_STAGES.find(s => s.key === stage);
  const index = getStageIndex(stage);
  if (!stageInfo) return null;

  const Icon = stageInfo.icon;
  const isEarly = index <= 2;
  const isMid = index === 3 || index === 4;
  const isDone = index === 5;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
        isDone && 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
        isMid && 'bg-primary/10 text-primary border-primary/20',
        isEarly && 'bg-amber-500/10 text-amber-600 border-amber-500/20'
      )}
    >
      <Icon className="w-3 h-3" />
      {stageInfo.shortLabel}
    </span>
  );
}
