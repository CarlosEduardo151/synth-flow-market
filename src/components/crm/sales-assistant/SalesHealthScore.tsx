import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Heart, Activity, TrendingUp, TrendingDown, Minus, AlertCircle,
  CheckCircle2, Clock, Loader2, Inbox, Sparkles, RefreshCw, Target,
  Users, Briefcase, Flame,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Props { customerProductId: string; }

interface DealScore {
  id: string;
  opportunity_id: string | null;
  lead_id: string | null;
  entity_type: 'opportunity' | 'lead';
  deal_name: string;
  contact_name: string | null;
  monthly_value: number | null;
  health_score: number;
  previous_score: number | null;
  trend: string | null;
  factors: any;
  signals: any;
  next_action: string | null;
  risk_level: string | null;
  ai_analysis: any;
  last_calculated_at: string;
}

const healthColor = (h: number) => {
  if (h >= 75) return { color: 'text-emerald-500', bar: 'bg-emerald-500', border: 'border-emerald-500/30 bg-emerald-500/5', glow: 'shadow-[0_0_20px_-8px_hsl(var(--primary)/0.4)]', label: 'Saudável' };
  if (h >= 50) return { color: 'text-yellow-500', bar: 'bg-yellow-500', border: 'border-yellow-500/30 bg-yellow-500/5', glow: '', label: 'Atenção' };
  if (h >= 25) return { color: 'text-orange-500', bar: 'bg-orange-500', border: 'border-orange-500/30 bg-orange-500/5', glow: '', label: 'Risco' };
  return { color: 'text-red-500', bar: 'bg-red-500', border: 'border-red-500/40 bg-red-500/10', glow: 'shadow-[0_0_20px_-8px_hsl(0_84%_60%/0.5)]', label: 'Crítico' };
};

const TrendIcon = ({ trend, delta }: { trend: string | null; delta: number | null }) => {
  if (trend === 'up') return <span className="inline-flex items-center gap-0.5 text-xs text-emerald-500"><TrendingUp className="h-3.5 w-3.5" />{delta != null ? `+${delta}` : ''}</span>;
  if (trend === 'down') return <span className="inline-flex items-center gap-0.5 text-xs text-red-500"><TrendingDown className="h-3.5 w-3.5" />{delta != null ? delta : ''}</span>;
  return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
};

const fmtMoney = (n: number | null) => n ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—';
const fmtRelative = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'agora';
  if (m < 60) return `há ${m}min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
};

export function SalesHealthScore({ customerProductId }: Props) {
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [deals, setDeals] = useState<DealScore[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('sa_deal_health_scores')
      .select('*')
      .eq('customer_product_id', customerProductId)
      .order('health_score', { ascending: true });
    setDeals(data || []);
    setLoading(false);
  }, [customerProductId]);

  useEffect(() => { if (customerProductId) load(); }, [customerProductId, load]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('sa-health-scan', {
        body: { customerProductId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const r = data as any;
      if (r.analyzed === 0) {
        toast.info('Nenhuma oportunidade ativa para analisar');
      } else {
        toast.success(`✨ ${r.analyzed} deals analisados`, {
          description: `Health médio: ${r.avg_score} · ${r.critical} crítico(s) · ${r.at_risk} em risco`,
        });
      }
      await load();
    } catch (e: any) {
      toast.error('Falha na análise', { description: e?.message || 'erro desconhecido' });
    } finally {
      setScanning(false);
    }
  };

  const avg = deals.length ? Math.round(deals.reduce((s, d) => s + d.health_score, 0) / deals.length) : 0;
  const healthy = deals.filter(d => d.health_score >= 75).length;
  const atRisk = deals.filter(d => d.health_score >= 25 && d.health_score < 50).length;
  const critical = deals.filter(d => d.health_score < 25).length;
  const totalValue = deals.reduce((s, d) => s + (d.monthly_value || 0), 0);
  const valueAtRisk = deals.filter(d => d.health_score < 50).reduce((s, d) => s + (d.monthly_value || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header com KPIs e CTA principal */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Heart className="h-5 w-5 text-primary" />
            Deal Health Score
          </h2>
          <p className="text-sm text-muted-foreground">IA analisa engajamento, estágio e sinais para pontuar cada oportunidade</p>
        </div>
        <Button onClick={handleScan} disabled={scanning} size="lg" className="gap-2 shadow-lg">
          {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {scanning ? 'Analisando deals...' : 'Recalcular com IA'}
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Health médio</p>
                <p className="text-3xl font-bold">{avg}<span className="text-sm text-muted-foreground font-normal">/100</span></p>
              </div>
              <div className="relative">
                <Heart className="h-9 w-9 text-primary" />
                <div className="absolute inset-0 animate-ping opacity-20"><Heart className="h-9 w-9 text-primary" /></div>
              </div>
            </div>
            <Progress value={avg} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        <Card className="border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Saudáveis</p>
                <p className="text-3xl font-bold text-emerald-500">{healthy}</p>
              </div>
              <CheckCircle2 className="h-7 w-7 text-emerald-500/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Em risco</p>
                <p className="text-3xl font-bold text-orange-500">{atRisk}</p>
              </div>
              <AlertCircle className="h-7 w-7 text-orange-500/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Críticos</p>
                <p className="text-3xl font-bold text-red-500">{critical}</p>
              </div>
              <Activity className="h-7 w-7 text-red-500/60 animate-pulse" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Valor em risco</p>
            <p className="text-2xl font-bold text-orange-500">{fmtMoney(valueAtRisk)}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">de {fmtMoney(totalValue)} total</p>
          </CardContent>
        </Card>
      </div>

      {/* Lista de deals */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-4 w-4 text-primary" />Pipeline em tempo real</CardTitle>
              <CardDescription className="text-xs">Ordenado por urgência (menor score primeiro)</CardDescription>
            </div>
            {deals.length > 0 && (
              <Button variant="ghost" size="sm" onClick={load} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" /> Atualizar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2.5">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : deals.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium mb-1">Nenhum deal monitorado ainda</p>
              <p className="text-xs mb-4">Clique em "Recalcular com IA" para pontuar suas oportunidades</p>
              <Button onClick={handleScan} disabled={scanning} variant="outline" size="sm" className="gap-2">
                <Sparkles className="h-3.5 w-3.5" /> Analisar agora
              </Button>
            </div>
          ) : deals.map((d) => {
            const c = healthColor(d.health_score);
            const factors = Array.isArray(d.factors) ? d.factors : [];
            const signals = Array.isArray(d.signals) ? d.signals : [];
            const delta = d.previous_score != null ? d.health_score - d.previous_score : null;
            const isOpen = expanded === d.id;
            return (
              <div key={d.id} className={`border rounded-lg transition-all ${c.border} ${c.glow} ${isOpen ? 'ring-1 ring-primary/30' : ''}`}>
                <div className="p-4 cursor-pointer" onClick={() => setExpanded(isOpen ? null : d.id)}>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-[220px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{d.deal_name}</p>
                        <Badge variant="outline" className={`${c.color} border-current text-[10px] uppercase tracking-wide`}>{c.label}</Badge>
                        <TrendIcon trend={d.trend} delta={delta} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">
                        {d.contact_name && <span>👤 {d.contact_name}</span>}
                        {d.monthly_value ? <span>· 💰 {fmtMoney(d.monthly_value)}</span> : null}
                        <span>· 🕐 {fmtRelative(d.last_calculated_at)}</span>
                      </p>
                    </div>
                    <div className="text-right min-w-[160px]">
                      <div className="flex items-center justify-end gap-1.5 mb-1.5">
                        <span className={`text-3xl font-bold tabular-nums ${c.color}`}>{d.health_score}</span>
                        <span className="text-xs text-muted-foreground">/100</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full ${c.bar} transition-all duration-500`} style={{ width: `${d.health_score}%` }} />
                      </div>
                    </div>
                  </div>

                  {!isOpen && d.next_action && (
                    <div className="flex items-center gap-2 text-xs mt-3 pt-3 border-t">
                      <Target className="h-3.5 w-3.5 text-primary shrink-0" />
                      <span className="text-muted-foreground">Próxima ação:</span>
                      <span className="font-medium truncate flex-1">{d.next_action}</span>
                    </div>
                  )}
                </div>

                {isOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t pt-3 animate-in fade-in slide-in-from-top-1">
                    {factors.length > 0 && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">Fatores detectados</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {factors.map((f: any, j: number) => (
                            <div key={j} className="flex items-start gap-2 text-xs p-2 rounded bg-muted/40">
                              {f.positive
                                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                : <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />}
                              <span>{f.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {signals.length > 0 && (
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">Sinais</p>
                        <div className="flex flex-wrap gap-1.5">
                          {signals.map((s: string, j: number) => (
                            <Badge key={j} variant="secondary" className="text-[10px]">{s}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {d.ai_analysis?.reasoning && (
                      <div className="p-3 rounded-md bg-primary/5 border border-primary/20">
                        <p className="text-[11px] uppercase tracking-wide text-primary font-semibold mb-1 flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Análise da IA
                        </p>
                        <p className="text-xs leading-relaxed">{d.ai_analysis.reasoning}</p>
                      </div>
                    )}

                    {d.next_action && (
                      <div className="flex items-center justify-between gap-3 flex-wrap pt-2">
                        <div className="flex items-center gap-2 text-xs flex-1 min-w-0">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-muted-foreground">Sugestão:</span>
                          <span className="font-medium truncate">{d.next_action}</span>
                        </div>
                        <Button size="sm" variant={d.health_score < 50 ? 'default' : 'outline'} className="shrink-0">
                          {d.health_score < 50 ? '🚨 Agir agora' : 'Marcar feito'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
