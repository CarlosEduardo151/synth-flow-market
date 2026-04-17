import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, TrendingDown, Activity, Shield, Zap, Clock, Eye, Loader2, Inbox } from 'lucide-react';

interface Props { customerProductId: string; }

interface Alert {
  id: string;
  customer_name: string;
  company: string | null;
  churn_probability: number;
  days_since_contact: number | null;
  signals: any;
  suggested_action: string | null;
  monthly_value: number | null;
  status: string;
}

const churnColor = (p: number) => {
  if (p >= 75) return 'text-red-500 bg-red-500/10 border-red-500/30';
  if (p >= 50) return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
  return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
};

const fmtMoney = (n: number | null) => n ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) + '/mês' : '—';

export function SalesAntiChurn({ customerProductId }: Props) {
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [recovered, setRecovered] = useState(0);
  const [recoveredValue, setRecoveredValue] = useState(0);

  useEffect(() => {
    if (!customerProductId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 30 * 86400000).toISOString();
      const [{ data: act }, { data: rec }] = await Promise.all([
        (supabase as any).from('sa_antichurn_alerts')
          .select('id,customer_name,company,churn_probability,days_since_contact,signals,suggested_action,monthly_value,status')
          .eq('customer_product_id', customerProductId).eq('status', 'active')
          .order('churn_probability', { ascending: false }),
        (supabase as any).from('sa_antichurn_alerts')
          .select('monthly_value').eq('customer_product_id', customerProductId)
          .eq('status', 'recovered').gte('updated_at', since),
      ]);
      if (!active) return;
      setAlerts(act || []);
      setRecovered((rec || []).length);
      setRecoveredValue((rec || []).reduce((s: number, r: any) => s + Number(r.monthly_value || 0), 0));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [customerProductId]);

  const critical = alerts.filter(a => a.churn_probability >= 75);
  const medium = alerts.filter(a => a.churn_probability >= 50 && a.churn_probability < 75);
  const valueAtRisk = critical.reduce((s, a) => s + Number(a.monthly_value || 0), 0);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="border-red-500/30 bg-red-500/5"><CardContent className="p-4"><div className="flex items-center justify-between"><div>
          <p className="text-xs text-muted-foreground">Risco crítico</p>
          <p className="text-2xl font-bold text-red-500">{critical.length}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{fmtMoney(valueAtRisk).replace('/mês', '')} em risco</p>
        </div><AlertTriangle className="h-7 w-7 text-red-500 opacity-60" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div>
          <p className="text-xs text-muted-foreground">Risco médio</p>
          <p className="text-2xl font-bold text-orange-500">{medium.length}</p>
        </div><TrendingDown className="h-7 w-7 text-orange-500 opacity-60" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div>
          <p className="text-xs text-muted-foreground">Recuperados (30d)</p>
          <p className="text-2xl font-bold text-emerald-500">{recovered}</p>
          <p className="text-[10px] text-muted-foreground mt-1">{fmtMoney(recoveredValue).replace('/mês', '')} salvos</p>
        </div><Shield className="h-7 w-7 text-emerald-500 opacity-60" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div>
          <p className="text-xs text-muted-foreground">Total monitorado</p>
          <p className="text-2xl font-bold">{alerts.length}</p>
          <p className="text-[10px] text-muted-foreground mt-1">clientes ativos</p>
        </div><Activity className="h-7 w-7 text-primary opacity-60" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-red-500" />Anti-Churn Preditivo</CardTitle>
          <CardDescription>IA analisa comportamento dos últimos 30 dias e identifica clientes prestes a cancelar — antes deles sumirem</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Nenhum alerta de churn ativo. A IA monitora seus clientes em tempo real.
            </div>
          ) : alerts.map((c) => {
            const signals: string[] = Array.isArray(c.signals) ? c.signals : [];
            return (
              <Card key={c.id} className={c.churn_probability >= 75 ? 'border-red-500/30' : ''}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{c.customer_name}</p>
                        <Badge variant="outline" className={churnColor(c.churn_probability)}>{c.churn_probability}% prob. churn</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[c.company, fmtMoney(c.monthly_value), c.days_since_contact != null && `Sem contato há ${c.days_since_contact} dias`].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <div className="min-w-[160px]"><Progress value={c.churn_probability} className="h-2" /></div>
                  </div>

                  {signals.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sinais detectados</p>
                      <div className="flex flex-wrap gap-1.5">
                        {signals.map((s, j) => (
                          <Badge key={j} variant="secondary" className="text-[10px] gap-1"><Eye className="h-2.5 w-2.5" />{s}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {c.suggested_action && (
                    <div className="flex items-start gap-2 p-2.5 rounded bg-primary/5 border border-primary/20">
                      <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Ação recomendada IA</p>
                        <p className="text-xs mt-0.5">{c.suggested_action}</p>
                      </div>
                      <Button size="sm">Executar</Button>
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
          <Clock className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Por que isso muda o jogo</p>
            <p className="text-xs text-muted-foreground mt-1">
              99% das ferramentas só te avisam que o cliente CANCELOU. Aqui você recebe alerta dias/semanas antes — com tempo pra agir e salvar a receita.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
