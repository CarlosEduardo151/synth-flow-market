import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { HeartCrack, Sparkles, Send, Clock, TrendingUp, RefreshCw, Brain, Loader2, Inbox, CheckCircle2, X, AlertCircle, Award } from 'lucide-react';
import { SalesSectionHeader } from './SalesSectionHeader';

interface Props { customerProductId: string; }

interface WinbackCampaign {
  id: string;
  lead_name: string | null;
  company: string | null;
  lost_reason: string | null;
  days_since_lost: number | null;
  monthly_value: number | null;
  trigger_type: string | null;
  suggested_message: string | null;
  success_probability: number | null;
  status: string;
  ai_analysis: any;
}

const successColor = (p: number) => {
  if (p >= 60) return 'text-emerald-500';
  if (p >= 40) return 'text-yellow-500';
  return 'text-orange-500';
};

const fmtMoney = (n: number | null) =>
  n ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) + '/mês' : '—';

export function SalesWinback({ customerProductId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [campaigns, setCampaigns] = useState<WinbackCampaign[]>([]);
  const [recovered, setRecovered] = useState(0);
  const [recoveredMrr, setRecoveredMrr] = useState(0);
  const [totalLost90, setTotalLost90] = useState(0);

  const load = useCallback(async () => {
    if (!customerProductId) return;
    setLoading(true);
    const since = new Date(Date.now() - 90 * 86400000).toISOString();
    const [{ data: cps }, { data: rec }, { count: lostCount }] = await Promise.all([
      (supabase as any).from('sa_winback_campaigns')
        .select('id,lead_name,company,lost_reason,days_since_lost,monthly_value,trigger_type,suggested_message,success_probability,status,ai_analysis')
        .eq('customer_product_id', customerProductId)
        .in('status', ['pending', 'scheduled', 'sent'])
        .order('success_probability', { ascending: false }),
      (supabase as any).from('sa_winback_campaigns')
        .select('monthly_value').eq('customer_product_id', customerProductId).eq('status', 'recovered'),
      supabase.from('crm_opportunities').select('*', { count: 'exact', head: true })
        .eq('customer_product_id', customerProductId).eq('stage', 'lost').gte('updated_at', since),
    ]);
    setCampaigns((cps || []) as WinbackCampaign[]);
    setRecovered((rec || []).length);
    setRecoveredMrr((rec || []).reduce((s: number, r: any) => s + Number(r.monthly_value || 0), 0));
    setTotalLost90(lostCount || 0);
    setLoading(false);
  }, [customerProductId]);

  useEffect(() => { load(); }, [load]);

  const handleScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('sa-winback-scan', {
        body: { customerProductId },
      });
      if (error) throw error;
      toast({
        title: 'Análise concluída',
        description: `${data?.created || 0} novas campanhas geradas (de ${data?.analyzed || 0} leads analisados).`,
      });
      await load();
    } catch (e: any) {
      toast({ title: 'Erro na análise', description: e.message || 'Falha ao processar', variant: 'destructive' });
    } finally {
      setScanning(false);
    }
  };

  const handleAction = async (campaignId: string, action: string) => {
    setActionId(campaignId + action);
    try {
      const { data, error } = await supabase.functions.invoke('sa-winback-action', {
        body: { campaignId, action },
      });
      if (error) throw error;
      const labels: Record<string, string> = {
        send: 'Mensagem enviada',
        schedule: 'Agendado para amanhã',
        regenerate: 'Nova variação gerada',
        mark_recovered: 'Lead marcado como recuperado',
        dismiss: 'Campanha descartada',
      };
      toast({ title: labels[action] || 'OK' });
      await load();
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message || 'Falha', variant: 'destructive' });
    } finally {
      setActionId(null);
    }
  };

  const winRate = (recovered + campaigns.length) ? Math.round((recovered / (recovered + campaigns.length)) * 100) : 0;

  return (
    <div className="space-y-4">
      <SalesSectionHeader
        icon={HeartCrack}
        iconColor="text-pink-500"
        title="Win-back Automático"
        description="IA Groq analisa seus leads perdidos e gera mensagens psicologicamente otimizadas"
        actions={
          <Button size="lg" onClick={handleScan} disabled={scanning} className="gap-2 shadow-lg">
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {scanning ? 'Analisando com IA...' : 'Analisar com IA'}
          </Button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-red-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Perdidos (90d)</p>
              <p className="text-3xl font-bold text-red-500">{totalLost90}</p>
            </div>
            <AlertCircle className="h-8 w-8 text-red-500 opacity-60" />
          </CardContent>
        </Card>
        <Card className="relative overflow-hidden border-primary/20">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none" />
          <CardContent className="p-4 relative flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Recuperáveis IA</p>
              <p className="text-3xl font-bold text-primary">{campaigns.length}</p>
            </div>
            <Sparkles className="h-8 w-8 text-primary opacity-60" />
          </CardContent>
        </Card>
        <Card className="border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-wide">Recuperados</p>
                <p className="text-3xl font-bold text-emerald-500">{recovered}</p>
              </div>
              <Award className="h-8 w-8 text-emerald-500 opacity-60" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{fmtMoney(recoveredMrr).replace('/mês', '')} MRR</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Taxa win-back</p>
              <p className="text-3xl font-bold">{winRate}%</p>
            </div>
            <TrendingUp className="h-8 w-8 text-primary opacity-60" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <HeartCrack className="h-4 w-4 text-pink-500" />Campanhas ativas
          </CardTitle>
          <CardDescription className="text-xs">Ordenadas por probabilidade de recuperação</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
              <p>Nenhuma campanha de recuperação ativa.</p>
              <p className="text-xs mt-1">Clique em <strong>"Analisar com IA"</strong> para que o Groq analise seus deals perdidos.</p>
            </div>
          ) : campaigns.map((d) => (
            <Card key={d.id} className="border-border/60">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-start justify-between flex-wrap gap-3">
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold">{d.lead_name}</p>
                      {d.lost_reason && <Badge variant="outline" className="text-[10px]">Perdido por: {d.lost_reason}</Badge>}
                      {d.status === 'sent' && <Badge variant="secondary" className="text-[10px]">Enviado</Badge>}
                      {d.status === 'scheduled' && <Badge variant="secondary" className="text-[10px]">Agendado</Badge>}
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
                    {d.ai_analysis?.reasoning && (
                      <p className="text-[11px] text-muted-foreground italic"><Brain className="h-3 w-3 inline mr-1" />{d.ai_analysis.reasoning}</p>
                    )}
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" className="flex-1 min-w-[120px]" disabled={!!actionId || d.status === 'sent'} onClick={() => handleAction(d.id, 'send')}>
                    {actionId === d.id + 'send' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}Enviar
                  </Button>
                  <Button size="sm" variant="outline" disabled={!!actionId} onClick={() => handleAction(d.id, 'schedule')}>
                    <Clock className="h-4 w-4 mr-2" />Agendar
                  </Button>
                  <Button size="sm" variant="outline" disabled={!!actionId} onClick={() => handleAction(d.id, 'regenerate')}>
                    {actionId === d.id + 'regenerate' ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Brain className="h-4 w-4 mr-2" />}Variação
                  </Button>
                  <Button size="sm" variant="ghost" disabled={!!actionId} onClick={() => handleAction(d.id, 'mark_recovered')} title="Marcar como recuperado">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  </Button>
                  <Button size="sm" variant="ghost" disabled={!!actionId} onClick={() => handleAction(d.id, 'dismiss')} title="Descartar">
                    <X className="h-4 w-4 text-muted-foreground" />
                  </Button>
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
              A IA Groq usa gatilhos psicológicos validados (escassez, prova social, FOMO, quebra de objeção, autoridade)
              calibrados pelo motivo de perda + tempo decorrido. Mensagens acima de 90 dias usam abordagem leve, sem pedido direto.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
