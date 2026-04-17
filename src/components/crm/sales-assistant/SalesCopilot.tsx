import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, TrendingUp, AlertTriangle, Lightbulb, FileText, Target, DollarSign, ArrowUpRight, Loader2, Inbox } from 'lucide-react';

interface Props { customerProductId: string; }

interface Suggestion {
  id: string;
  lead_name: string;
  suggestion: string;
  priority: string | null;
}

const priorityColor = (p: string) => {
  if (p === 'alta') return 'bg-red-500/10 text-red-500 border-red-500/30';
  if (p === 'media') return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
  return 'bg-muted';
};

export function SalesCopilot({ customerProductId }: Props) {
  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [forecast, setForecast] = useState<{ stage: string; value: number; prob: number }[]>([]);
  const [lossReasons, setLossReasons] = useState<{ reason: string; count: number; percent: number }[]>([]);
  const [stats, setStats] = useState({ forecast: 0, probAvg: 0, atRisk: 0, suggestionsToday: 0, suggestionsHigh: 0 });

  useEffect(() => {
    if (!customerProductId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      const [{ data: sugs }, { data: opps }, { data: alerts }] = await Promise.all([
        (supabase as any).from('sa_copilot_suggestions')
          .select('id,lead_name,suggestion,priority,created_at')
          .eq('customer_product_id', customerProductId)
          .order('created_at', { ascending: false }).limit(20),
        supabase.from('crm_opportunities')
          .select('value,stage,probability,lost_reason')
          .eq('customer_product_id', customerProductId).limit(1000),
        (supabase as any).from('sa_antichurn_alerts')
          .select('id').eq('customer_product_id', customerProductId).eq('status', 'active'),
      ]);

      if (!active) return;
      setSuggestions(sugs || []);

      const allOpps: any[] = opps || [];
      const open = allOpps.filter(o => !['won', 'lost'].includes((o.stage || '').toLowerCase()));
      const totalForecast = open.reduce((s, o) => s + Number(o.value || 0) * (Number(o.probability || 0) / 100), 0);
      const avgProb = open.length ? Math.round(open.reduce((s, o) => s + Number(o.probability || 0), 0) / open.length) : 0;

      const stagesMap = new Map<string, { value: number; prob: number; n: number }>();
      open.forEach(o => {
        const key = o.stage || 'Outros';
        const cur = stagesMap.get(key) || { value: 0, prob: 0, n: 0 };
        cur.value += Number(o.value || 0);
        cur.prob += Number(o.probability || 0);
        cur.n += 1;
        stagesMap.set(key, cur);
      });
      const fc = Array.from(stagesMap.entries())
        .map(([stage, v]) => ({ stage, value: v.value, prob: Math.round(v.prob / v.n) }))
        .sort((a, b) => b.value - a.value).slice(0, 4);

      const lost = allOpps.filter(o => (o.stage || '').toLowerCase() === 'lost');
      const reasonMap = new Map<string, number>();
      lost.forEach(o => {
        const r = o.lost_reason || 'Outros';
        reasonMap.set(r, (reasonMap.get(r) || 0) + 1);
      });
      const totalLost = lost.length || 1;
      const lr = Array.from(reasonMap.entries())
        .map(([reason, count]) => ({ reason, count, percent: Math.round((count / totalLost) * 100) }))
        .sort((a, b) => b.count - a.count).slice(0, 5);

      const today = (sugs || []).filter((s: any) => s.created_at >= since);

      setForecast(fc);
      setLossReasons(lr);
      setStats({
        forecast: totalForecast,
        probAvg: avgProb,
        atRisk: (alerts || []).length,
        suggestionsToday: today.length,
        suggestionsHigh: today.filter((s: any) => s.priority === 'alta').length,
      });
      setLoading(false);
    })();
    return () => { active = false; };
  }, [customerProductId]);

  const fmtMoney = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="p-4"><div className="flex items-center justify-between"><div>
            <p className="text-xs text-muted-foreground">Forecast do mês</p>
            <p className="text-2xl font-bold text-emerald-500">{fmtMoney(stats.forecast)}</p>
            <p className="text-[10px] text-muted-foreground mt-1">Probabilidade média {stats.probAvg}%</p>
          </div><DollarSign className="h-8 w-8 text-emerald-500 opacity-60" /></div></CardContent>
        </Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div>
          <p className="text-xs text-muted-foreground">Deals em risco</p>
          <p className="text-2xl font-bold text-red-500">{stats.atRisk}</p>
          <p className="text-[10px] text-muted-foreground mt-1">Alertas anti-churn ativos</p>
        </div><AlertTriangle className="h-8 w-8 text-red-500 opacity-60" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div>
          <p className="text-xs text-muted-foreground">Sugestões IA hoje</p>
          <p className="text-2xl font-bold text-primary">{stats.suggestionsToday}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{stats.suggestionsHigh} prioridade alta</p>
        </div><Lightbulb className="h-8 w-8 text-primary opacity-60" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" />Próximas ações sugeridas pela IA</CardTitle>
          <CardDescription>Sugestões em tempo real baseadas no comportamento de cada lead</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Nenhuma sugestão ativa. A IA gera recomendações conforme seus leads interagem.
            </div>
          ) : suggestions.map((s) => (
            <Card key={s.id} className="hover:bg-muted/30 transition-colors">
              <CardContent className="p-4 flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <p className="font-semibold text-sm">{s.lead_name}</p>
                    {s.priority && <Badge variant="outline" className={priorityColor(s.priority)}>Prioridade {s.priority}</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground">{s.suggestion}</p>
                </div>
                <Button size="sm" variant="outline">Executar <ArrowUpRight className="h-3 w-3 ml-1" /></Button>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-5 w-5 text-primary" />Forecast por estágio</CardTitle>
            <CardDescription>Receita projetada x probabilidade IA</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {forecast.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Sem oportunidades em aberto.</p>
            ) : forecast.map((f, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{f.stage}</span>
                  <span className="text-muted-foreground">{fmtMoney(f.value)} · {f.prob}%</span>
                </div>
                <Progress value={f.prob} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Target className="h-5 w-5 text-red-500" />Análise de perdas</CardTitle>
            <CardDescription>Padrões identificados pela IA nos deals perdidos</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {lossReasons.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum deal perdido registrado ainda.</p>
            ) : lossReasons.map((r, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{r.reason}</span>
                  <span className="text-muted-foreground">{r.count} deals · {r.percent}%</span>
                </div>
                <Progress value={r.percent} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <FileText className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Resumo automático de reuniões</p>
            <p className="text-xs text-muted-foreground mt-1">
              Após cada reunião, a IA gera transcrição completa, action items, objeções identificadas e próximos passos sugeridos — tudo já anexado ao card do lead no CRM.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
