import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { HeartCrack, Sparkles, Send, Clock, TrendingUp, RefreshCw, Brain, Loader2, Inbox } from 'lucide-react';

interface Props { customerProductId: string; }

interface WinbackCampaign {
  id: string;
  lead_name: string;
  company: string | null;
  lost_reason: string | null;
  days_since_lost: number | null;
  monthly_value: number | null;
  trigger_type: string | null;
  suggested_message: string | null;
  success_probability: number | null;
  status: string;
}

const successColor = (p: number) => {
  if (p >= 60) return 'text-emerald-500';
  if (p >= 40) return 'text-yellow-500';
  return 'text-orange-500';
};

const fmtMoney = (n: number | null) => n ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) + '/mês' : '—';

export function SalesWinback({ customerProductId }: Props) {
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<WinbackCampaign[]>([]);
  const [recovered, setRecovered] = useState(0);
  const [recoveredMrr, setRecoveredMrr] = useState(0);
  const [totalLost90, setTotalLost90] = useState(0);

  useEffect(() => {
    if (!customerProductId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 90 * 86400000).toISOString();
      const [{ data: cps }, { data: rec }, { data: lost }] = await Promise.all([
        (supabase as any).from('sa_winback_campaigns')
          .select('id,lead_name,company,lost_reason,days_since_lost,monthly_value,trigger_type,suggested_message,success_probability,status')
          .eq('customer_product_id', customerProductId).eq('status', 'pending')
          .order('success_probability', { ascending: false }),
        (supabase as any).from('sa_winback_campaigns')
          .select('monthly_value').eq('customer_product_id', customerProductId).eq('status', 'recovered'),
        supabase.from('crm_opportunities').select('id', { count: 'exact', head: true })
          .eq('customer_product_id', customerProductId).eq('stage', 'lost').gte('updated_at', since),
      ]);
      if (!active) return;
      setCampaigns(cps || []);
      setRecovered((rec || []).length);
      setRecoveredMrr((rec || []).reduce((s: number, r: any) => s + Number(r.monthly_value || 0), 0));
      setTotalLost90((lost as any)?.count || 0);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [customerProductId]);

  const winRate = (recovered + campaigns.length) ? Math.round((recovered / (recovered + campaigns.length)) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Deals perdidos (90d)</p><p className="text-2xl font-bold">{totalLost90}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Recuperáveis (IA)</p><p className="text-2xl font-bold text-primary">{campaigns.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Recuperados</p><p className="text-2xl font-bold text-emerald-500">{recovered}</p><p className="text-[10px] text-muted-foreground mt-1">{fmtMoney(recoveredMrr).replace('/mês', '')} MRR</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Taxa win-back</p><p className="text-2xl font-bold">{winRate}%</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2"><HeartCrack className="h-5 w-5 text-pink-500" />Win-back Automático</CardTitle>
              <CardDescription>IA identifica leads perdidos com chance de voltar e gera mensagem psicologicamente otimizada</CardDescription>
            </div>
            <Button size="sm" variant="outline"><RefreshCw className="h-4 w-4 mr-2" />Reanalisar perdidos</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Nenhuma campanha de recuperação ativa. A IA analisa deals perdidos automaticamente.
            </div>
          ) : campaigns.map((d) => (
            <Card key={d.id}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{d.lead_name}</p>
                      {d.lost_reason && <Badge variant="outline" className="text-[10px]">Perdido por: {d.lost_reason}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {[d.company, fmtMoney(d.monthly_value), d.days_since_lost != null && `há ${d.days_since_lost} dias`].filter(Boolean).join(' · ')}
                    </p>
                  </div>
                  {d.success_probability != null && (
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground">Prob. recuperar</p>
                      <p className={`text-2xl font-bold ${successColor(d.success_probability)}`}>{d.success_probability}%</p>
                    </div>
                  )}
                </div>

                {d.suggested_message && (
                  <div className="space-y-2">
                    {d.trigger_type && (
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                          Gatilho psicológico: {d.trigger_type}
                        </p>
                      </div>
                    )}
                    <div className="p-3 rounded-md bg-muted/50 border text-sm italic">"{d.suggested_message}"</div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1"><Send className="h-4 w-4 mr-2" />Enviar agora</Button>
                  <Button size="sm" variant="outline"><Clock className="h-4 w-4 mr-2" />Agendar</Button>
                  <Button size="sm" variant="outline"><Brain className="h-4 w-4 mr-2" />Gerar variação</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <TrendingUp className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Mensagens que NÃO parecem desespero</p>
            <p className="text-xs text-muted-foreground mt-1">
              A IA usa gatilhos psicológicos validados (escassez, prova social, FOMO, quebra de objeção) calibrados pelo motivo de perda + tempo decorrido.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
