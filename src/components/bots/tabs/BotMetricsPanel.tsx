import { useState, useEffect, useRef } from 'react';
import { Activity, HardDrive, Cpu, Coins, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface MetricCardProps {
  label: string;
  value: number;
  max: number;
  unit: string;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  detail?: string;
}

function MetricGauge({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="relative w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold font-mono">{pct.toFixed(0)}%</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, max, unit, icon, color, trend, detail }: MetricCardProps) {
  return (
    <div className="relative p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur overflow-hidden group hover:border-border transition-colors">
      {/* Subtle glow */}
      <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full opacity-10 blur-2xl" style={{ background: color }} />

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ background: `${color}15` }}>
            {icon}
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
            trend >= 0 ? 'text-green-500 bg-green-500/10' : 'text-red-500 bg-red-500/10'
          }`}>
            {trend >= 0 ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
      </div>

      <div className="flex items-end justify-between">
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono">{value.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</span>
            <span className="text-xs text-muted-foreground font-medium">{unit}</span>
          </div>
          {detail && <p className="text-[10px] text-muted-foreground mt-0.5">{detail}</p>}
        </div>
        <MetricGauge value={value} max={max} color={color} />
      </div>

      {/* Bottom bar */}
      <div className="mt-3 h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${Math.min((value / max) * 100, 100)}%`, background: color }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-muted-foreground font-mono">0</span>
        <span className="text-[9px] text-muted-foreground font-mono">{max.toLocaleString('pt-BR')} {unit}</span>
      </div>
    </div>
  );
}

interface BotMetricsPanelProps {
  isActive: boolean;
}

export function BotMetricsPanel({ isActive }: BotMetricsPanelProps) {
  const [metrics, setMetrics] = useState({
    ram: 0,
    data: 0,
    cpu: 0,
    tokens: 0,
  });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Simulate real-time metrics fluctuation
  useEffect(() => {
    if (!isActive) {
      setMetrics({ ram: 0, data: 0, cpu: 0, tokens: 0 });
      return;
    }

    // Initial values
    setMetrics({
      ram: 128 + Math.random() * 80,
      data: 2.4 + Math.random() * 1.5,
      cpu: 12 + Math.random() * 25,
      tokens: 1240 + Math.floor(Math.random() * 800),
    });

    intervalRef.current = setInterval(() => {
      setMetrics(prev => ({
        ram: Math.max(64, Math.min(512, prev.ram + (Math.random() - 0.45) * 15)),
        data: Math.max(0.1, Math.min(10, prev.data + (Math.random() - 0.4) * 0.3)),
        cpu: Math.max(2, Math.min(100, prev.cpu + (Math.random() - 0.48) * 8)),
        tokens: Math.max(0, prev.tokens + Math.floor(Math.random() * 50)),
      }));
    }, 3000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isActive]);

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Activity className="h-5 w-5 text-primary" />
          Métricas em Tempo Real
          {isActive && (
            <span className="flex items-center gap-1.5 ml-auto text-[10px] font-normal text-green-500">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              LIVE
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!isActive ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Activity className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">Motor desligado — sem dados de telemetria</p>
            <p className="text-xs text-muted-foreground/60 mt-1">Ligue o motor para visualizar as métricas</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <MetricCard
              label="RAM"
              value={metrics.ram}
              max={512}
              unit="MB"
              icon={<HardDrive className="h-3.5 w-3.5" style={{ color: '#3b82f6' }} />}
              color="#3b82f6"
              trend={2.3}
              detail="Memória alocada pelo motor"
            />
            <MetricCard
              label="Dados Trafegados"
              value={metrics.data}
              max={10}
              unit="GB"
              icon={<Activity className="h-3.5 w-3.5" style={{ color: '#8b5cf6' }} />}
              color="#8b5cf6"
              trend={5.1}
              detail="Entrada + saída de dados"
            />
            <MetricCard
              label="Processamento"
              value={metrics.cpu}
              max={100}
              unit="%"
              icon={<Cpu className="h-3.5 w-3.5" style={{ color: '#f59e0b' }} />}
              color="#f59e0b"
              trend={-1.2}
              detail="Uso de CPU do motor IA"
            />
            <MetricCard
              label="Tokens Consumidos"
              value={metrics.tokens}
              max={10000}
              unit="tkns"
              icon={<Coins className="h-3.5 w-3.5" style={{ color: '#10b981' }} />}
              color="#10b981"
              trend={8.7}
              detail="Total da sessão atual"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
