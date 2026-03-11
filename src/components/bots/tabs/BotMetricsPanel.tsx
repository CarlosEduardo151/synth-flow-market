import { useState, useEffect, useRef } from 'react';
import { Activity, HardDrive, Cpu, Coins, TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

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
  const isUnlimited = max <= 0;
  const pct = isUnlimited ? 0 : Math.min((value / max) * 100, 100);
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
        <span className="text-lg font-bold font-mono">{isUnlimited ? '∞' : `${pct.toFixed(0)}%`}</span>
      </div>
    </div>
  );
}

function MetricCard({ label, value, max, unit, icon, color, trend, detail }: MetricCardProps) {
  return (
    <div className="relative p-4 rounded-xl border border-border/50 bg-card/50 backdrop-blur overflow-hidden group hover:border-border transition-colors">
      <div className="absolute -top-12 -right-12 w-24 h-24 rounded-full opacity-10 blur-2xl" style={{ background: color }} />

      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg" style={{ background: `${color}15` }}>
            {icon}
          </div>
          <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        </div>
        {trend !== undefined && trend !== 0 && (
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

      <div className="mt-3 h-1.5 rounded-full bg-muted/30 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: max <= 0 ? '0%' : `${Math.min((value / max) * 100, 100)}%`, background: color }}
        />
      </div>
      <div className="flex justify-between mt-1">
        <span className="text-[9px] text-muted-foreground font-mono">0</span>
        <span className="text-[9px] text-muted-foreground font-mono">{max <= 0 ? '∞' : `${max.toLocaleString('pt-BR')} ${unit}`}</span>
      </div>
    </div>
  );
}

interface BotMetricsPanelProps {
  isActive: boolean;
  customerProductId?: string | null;
}

interface MetricsData {
  totalRequests: number;
  totalTokens: number;
  totalDataBytes: number;
  avgProcessingMs: number;
}

function formatBytes(bytes: number): { value: number; unit: string } {
  if (bytes >= 1024 * 1024 * 1024) return { value: bytes / (1024 * 1024 * 1024), unit: 'GB' };
  if (bytes >= 1024 * 1024) return { value: bytes / (1024 * 1024), unit: 'MB' };
  if (bytes >= 1024) return { value: bytes / 1024, unit: 'KB' };
  return { value: bytes, unit: 'B' };
}

export function BotMetricsPanel({ isActive, customerProductId }: BotMetricsPanelProps) {
  const [metrics, setMetrics] = useState<MetricsData>({
    totalRequests: 0,
    totalTokens: 0,
    totalDataBytes: 0,
    avgProcessingMs: 0,
  });
  const [prevMetrics, setPrevMetrics] = useState<MetricsData | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMetrics = async () => {
    if (!customerProductId) return;
    try {
      const sb = supabase as any;

      const { data, error } = await sb
        .from('bot_usage_metrics')
        .select('tokens_total, data_bytes_in, data_bytes_out, processing_ms')
        .eq('customer_product_id', customerProductId);

      if (error) {
        console.error('metrics fetch error:', error);
        return;
      }

      const rows = data || [];
      const totalRequests = rows.length;
      const totalTokens = rows.reduce((s: number, r: any) => s + (r.tokens_total || 0), 0);
      const totalDataBytes = rows.reduce((s: number, r: any) => s + (r.data_bytes_in || 0) + (r.data_bytes_out || 0), 0);
      const avgProcessingMs = totalRequests > 0
        ? rows.reduce((s: number, r: any) => s + (r.processing_ms || 0), 0) / totalRequests
        : 0;

      setPrevMetrics(metrics);
      setMetrics({ totalRequests, totalTokens, totalDataBytes, avgProcessingMs });
    } catch (e) {
      console.error('metrics error:', e);
    }
  };

  useEffect(() => {
    if (!isActive || !customerProductId) {
      setMetrics({ totalRequests: 0, totalTokens: 0, totalDataBytes: 0, avgProcessingMs: 0 });
      return;
    }

    fetchMetrics();
    intervalRef.current = setInterval(fetchMetrics, 5_000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isActive, customerProductId]);

  const calcTrend = (current: number, prev: number | undefined) => {
    if (!prev || prev === 0) return 0;
    return ((current - prev) / prev) * 100;
  };

  const dataFormatted = formatBytes(metrics.totalDataBytes);

  // $15 USD default credits → tokens at GPT-4o-mini blended rate (~$0.375/1M tokens)
  // $15 / $0.000000375 = 40,000,000 tokens
  const TOKEN_BUDGET = 40_000_000;
  const tokensPct = (metrics.totalTokens / TOKEN_BUDGET) * 100;
  const creditsUsed = (metrics.totalTokens / TOKEN_BUDGET) * 15;

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
              label="Requisições"
              value={metrics.totalRequests}
              max={0}
              unit="reqs"
              icon={<HardDrive className="h-3.5 w-3.5" style={{ color: '#3b82f6' }} />}
              color="#3b82f6"
              trend={calcTrend(metrics.totalRequests, prevMetrics?.totalRequests)}
              detail="Ilimitado — sem teto"
            />
            <MetricCard
              label="Dados Trafegados"
              value={Number(dataFormatted.value.toFixed(1))}
              max={0}
              unit={dataFormatted.unit}
              icon={<Activity className="h-3.5 w-3.5" style={{ color: '#8b5cf6' }} />}
              color="#8b5cf6"
              trend={calcTrend(metrics.totalDataBytes, prevMetrics?.totalDataBytes)}
              detail="Ilimitado — sem teto"
            />
            <MetricCard
              label="Processamento Médio"
              value={Math.round(metrics.avgProcessingMs)}
              max={Math.max(Math.round(metrics.avgProcessingMs * 2), 5000)}
              unit="ms"
              icon={<Cpu className="h-3.5 w-3.5" style={{ color: '#f59e0b' }} />}
              color="#f59e0b"
              trend={calcTrend(metrics.avgProcessingMs, prevMetrics?.avgProcessingMs)}
              detail="Tempo médio de resposta IA"
            />
            <MetricCard
              label="Tokens Consumidos"
              value={metrics.totalTokens}
              max={TOKEN_BUDGET}
              unit="tkns"
              icon={<Coins className="h-3.5 w-3.5" style={{ color: '#10b981' }} />}
              color="#10b981"
              trend={calcTrend(metrics.totalTokens, prevMetrics?.totalTokens)}
              detail={`US$ ${creditsUsed.toFixed(2)} de US$ 15,00 (${tokensPct.toFixed(2)}%)`}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
