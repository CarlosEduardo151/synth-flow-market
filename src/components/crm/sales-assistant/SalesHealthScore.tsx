import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Heart, Activity, TrendingUp, TrendingDown, Minus, AlertCircle, CheckCircle2, Clock, Loader2, Inbox } from 'lucide-react';

interface Props { customerProductId: string; }

interface DealScore {
  id: string;
  deal_name: string;
  contact_name: string | null;
  monthly_value: number | null;
  health_score: number;
  trend: string | null;
  factors: any;
  next_action: string | null;
}

const healthColor = (h: number) => {
  if (h >= 75) return { color: 'text-emerald-500', border: 'border-emerald-500/30 bg-emerald-500/5', label: 'Saudável' };
  if (h >= 50) return { color: 'text-yellow-500', border: 'border-yellow-500/30 bg-yellow-500/5', label: 'Atenção' };
  if (h >= 25) return { color: 'text-orange-500', border: 'border-orange-500/30 bg-orange-500/5', label: 'Risco' };
  return { color: 'text-red-500', border: 'border-red-500/30 bg-red-500/5', label: 'Crítico' };
};

const TrendIcon = ({ trend }: { trend: string | null }) => {
  if (trend === 'up') return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-500" />;
  return <Minus className="h-4 w-4 text-muted-foreground" />;
};

const fmtMoney = (n: number | null) => n ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) + '/mês' : '—';

export function SalesHealthScore({ customerProductId }: Props) {
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState<DealScore[]>([]);

  useEffect(() => {
    if (!customerProductId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await (supabase as any)
        .from('sa_deal_health_scores')
        .select('id,deal_name,contact_name,monthly_value,health_score,trend,factors,next_action')
        .eq('customer_product_id', customerProductId)
        .order('health_score', { ascending: true });
      if (!active) return;
      setDeals(data || []);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [customerProductId]);

  const avg = deals.length ? Math.round(deals.reduce((s, d) => s + d.health_score, 0) / deals.length) : 0;
  const healthy = deals.filter(d => d.health_score >= 75).length;
  const atRisk = deals.filter(d => d.health_score >= 25 && d.health_score < 50).length;
  const critical = deals.filter(d => d.health_score < 25).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div>
          <p className="text-xs text-muted-foreground">Health médio</p>
          <p className="text-2xl font-bold">{avg}</p>
        </div><Heart className="h-7 w-7 text-primary opacity-60" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">💚 Saudáveis</p><p className="text-2xl font-bold text-emerald-500">{healthy}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">⚠️ Em risco</p><p className="text-2xl font-bold text-orange-500">{atRisk}</p></CardContent></Card>
        <Card className="border-red-500/30 bg-red-500/5"><CardContent className="p-4"><div className="flex items-center justify-between"><div>
          <p className="text-xs text-muted-foreground">🚨 Críticos</p>
          <p className="text-2xl font-bold text-red-500">{critical}</p>
        </div><AlertCircle className="h-7 w-7 text-red-500 opacity-60" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5 text-primary" />Deal Health Score em Tempo Real</CardTitle>
          <CardDescription>Pontuação 0-100 atualizada a cada interação. Vermelho = ação urgente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : deals.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Nenhum deal monitorado ainda. A IA pontua suas oportunidades automaticamente.
            </div>
          ) : deals.map((d) => {
            const c = healthColor(d.health_score);
            const factors: { label: string; positive: boolean }[] = Array.isArray(d.factors) ? d.factors : [];
            return (
              <Card key={d.id} className={c.border}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{d.deal_name}</p>
                        <Badge variant="outline" className={`${c.color} border-current`}>{c.label}</Badge>
                        <TrendIcon trend={d.trend} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{[d.contact_name, fmtMoney(d.monthly_value)].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div className="text-right min-w-[140px]">
                      <div className="flex items-center justify-end gap-2 mb-1">
                        <Heart className={`h-4 w-4 ${c.color}`} />
                        <span className={`text-3xl font-bold ${c.color}`}>{d.health_score}</span>
                        <span className="text-xs text-muted-foreground">/100</span>
                      </div>
                      <Progress value={d.health_score} className="h-2" />
                    </div>
                  </div>

                  {factors.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {factors.map((f, j) => (
                        <div key={j} className="flex items-center gap-2 text-xs">
                          {f.positive ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" /> : <AlertCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />}
                          <span className={f.positive ? 'text-foreground' : 'text-muted-foreground'}>{f.label}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {d.next_action && (
                    <div className="flex items-center justify-between gap-3 pt-2 border-t flex-wrap">
                      <div className="flex items-center gap-2 text-xs">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Próxima ação:</span>
                        <span className="font-medium">{d.next_action}</span>
                      </div>
                      <Button size="sm" variant={d.health_score < 50 ? 'default' : 'outline'}>
                        {d.health_score < 50 ? 'Agir agora' : 'Ver detalhes'}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Activity className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Como o Health Score é calculado</p>
            <p className="text-xs text-muted-foreground mt-1">
              IA combina 18 sinais: tempo de resposta, abertura de e-mails, presença de champion, decisor confirmado, orçamento, etapa, tempo no estágio, sentimento das mensagens, menções a concorrente, etc.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
