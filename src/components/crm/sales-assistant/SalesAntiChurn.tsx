import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  AlertTriangle, TrendingDown, Activity, Shield, Zap, Clock, Eye,
  Loader2, Inbox, Sparkles, CheckCircle2, XCircle, Heart, MessageSquare,
  Volume2, VolumeX, Frown, Smile, Meh,
} from 'lucide-react';

interface Props { customerProductId: string; }

interface Alert {
  id: string;
  customer_name: string | null;
  company: string | null;
  churn_probability: number;
  days_since_contact: number | null;
  signals: any;
  suggested_action: string | null;
  monthly_value: number | null;
  status: string;
  crm_customer_id: string | null;
  // Avançados
  health_score: number | null;
  sentiment_score: number | null;
  sentiment_label: string | null;
  emotional_markers: string[] | null;
  churn_keywords: string[] | null;
  engagement_drop_pct: number | null;
  silent_negative: boolean | null;
  executive_summary: string | null;
  messages_analyzed: number | null;
}

const churnColor = (p: number) => {
  if (p >= 75) return 'text-red-500 bg-red-500/10 border-red-500/30';
  if (p >= 50) return 'text-orange-500 bg-orange-500/10 border-orange-500/30';
  return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/30';
};

const healthColor = (h: number | null) => {
  if (h == null) return 'text-muted-foreground';
  if (h >= 70) return 'text-emerald-500';
  if (h >= 40) return 'text-yellow-500';
  return 'text-red-500';
};

const sentimentIcon = (label: string | null) => {
  if (!label) return Meh;
  if (label.includes('Promotor') || label.includes('Satisfeito')) return Smile;
  if (label.includes('Detrator')) return Frown;
  return Meh;
};

const sentimentColor = (label: string | null) => {
  if (!label) return 'text-muted-foreground';
  if (label.includes('Promotor')) return 'text-emerald-500';
  if (label.includes('Satisfeito')) return 'text-emerald-400';
  if (label.includes('Detrator Crítico')) return 'text-red-500';
  if (label.includes('Detrator')) return 'text-orange-500';
  return 'text-muted-foreground';
};

const fmtMoney = (n: number | null) =>
  n ? n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : 'R$ 0';

interface MonitoredClient {
  id: string;
  name: string | null;
  company: string | null;
  health_score: number;
  churn_probability: number;
  risk_level: string;
  sentiment_label: string | null;
  days_since_contact: number | null;
  messages_analyzed: number;
  signals: string[];
}

export function SalesAntiChurn({ customerProductId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [monitored, setMonitored] = useState<MonitoredClient[]>([]);
  const [recovered, setRecovered] = useState(0);
  const [recoveredValue, setRecoveredValue] = useState(0);

  const fetchData = async () => {
    setLoading(true);
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [{ data: act }, { data: rec }] = await Promise.all([
      (supabase as any).from('sa_antichurn_alerts')
        .select('id,customer_name,company,churn_probability,days_since_contact,signals,suggested_action,monthly_value,status,crm_customer_id,health_score,sentiment_score,sentiment_label,emotional_markers,churn_keywords,engagement_drop_pct,silent_negative,executive_summary,messages_analyzed')
        .eq('customer_product_id', customerProductId)
        .in('status', ['open', 'active'])
        .order('churn_probability', { ascending: false }),
      (supabase as any).from('sa_antichurn_alerts')
        .select('monthly_value')
        .eq('customer_product_id', customerProductId)
        .eq('status', 'recovered')
        .gte('updated_at', since),
    ]);
    setAlerts(act || []);
    setRecovered((rec || []).length);
    setRecoveredValue((rec || []).reduce((s: number, r: any) => s + Number(r.monthly_value || 0), 0));
    setLoading(false);
  };

  useEffect(() => {
    if (!customerProductId) return;
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerProductId]);

  const runScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('sa-antichurn-scan', {
        body: { customerProductId },
      });
      if (error) throw error;
      const created = data?.alerts_created || 0;
      const updated = data?.alerts_updated || 0;
      const scanned = data?.scanned || 0;
      const atRisk = data?.at_risk || 0;
      toast({
        title: 'Análise preditiva concluída',
        description: `${scanned} clientes analisados · ${atRisk} em risco · ${created} novos · ${updated} atualizados`,
      });
      await fetchData();
    } catch (e: any) {
      toast({
        title: 'Erro na análise',
        description: e?.message || 'Tente novamente em alguns instantes',
        variant: 'destructive',
      });
    } finally {
      setScanning(false);
    }
  };

  const applyAction = async (alertId: string, action: 'acted' | 'recovered' | 'false_positive' | 'dismissed') => {
    setActingId(alertId);
    try {
      const { error } = await supabase.functions.invoke('sa-antichurn-action', {
        body: { alertId, action },
      });
      if (error) throw error;
      toast({
        title:
          action === 'acted' ? 'Ação registrada'
          : action === 'recovered' ? 'Cliente recuperado!'
          : action === 'false_positive' ? 'Alerta marcado como falso positivo'
          : 'Alerta dispensado',
      });
      await fetchData();
    } catch (e: any) {
      toast({
        title: 'Erro',
        description: e?.message || 'Falha ao registrar ação',
        variant: 'destructive',
      });
    } finally {
      setActingId(null);
    }
  };

  const critical = alerts.filter(a => a.churn_probability >= 75);
  const medium = alerts.filter(a => a.churn_probability >= 50 && a.churn_probability < 75);
  const valueAtRisk = critical.reduce((s, a) => s + Number(a.monthly_value || 0), 0);
  const avgHealth = alerts.length > 0
    ? Math.round(alerts.reduce((s, a) => s + (a.health_score || 0), 0) / alerts.length)
    : 0;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Risco crítico</p>
              <p className="text-2xl font-bold text-red-500">{critical.length}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{fmtMoney(valueAtRisk)} em risco/mês</p>
            </div>
            <AlertTriangle className="h-7 w-7 text-red-500 opacity-60" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Health score médio</p>
              <p className={`text-2xl font-bold ${healthColor(avgHealth)}`}>{avgHealth}<span className="text-sm text-muted-foreground">/100</span></p>
              <p className="text-[10px] text-muted-foreground mt-1">{medium.length} risco médio</p>
            </div>
            <Heart className={`h-7 w-7 opacity-60 ${healthColor(avgHealth)}`} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Recuperados (30d)</p>
              <p className="text-2xl font-bold text-emerald-500">{recovered}</p>
              <p className="text-[10px] text-muted-foreground mt-1">{fmtMoney(recoveredValue)} salvos</p>
            </div>
            <Shield className="h-7 w-7 text-emerald-500 opacity-60" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Total monitorado</p>
              <p className="text-2xl font-bold">{alerts.length}</p>
              <p className="text-[10px] text-muted-foreground mt-1">alertas ativos</p>
            </div>
            <Activity className="h-7 w-7 text-primary opacity-60" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />Anti-Churn Preditivo
            </CardTitle>
            <CardDescription>
              IA cruza WhatsApp + CRM + oportunidades. Detecta sentimento, palavras de risco, queda de engajamento e silêncio negativo
            </CardDescription>
          </div>
          <Button onClick={runScan} disabled={scanning} className="gap-2 shrink-0">
            {scanning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {scanning ? 'Analisando...' : 'Analisar com IA'}
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : alerts.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Nenhum alerta de churn ativo.<br />
              Clique em <span className="font-semibold text-foreground">"Analisar com IA"</span> para escanear seus clientes.
            </div>
          ) : alerts.map((c) => {
            const signals: string[] = Array.isArray(c.signals) ? c.signals : [];
            const markers: string[] = Array.isArray(c.emotional_markers) ? c.emotional_markers : [];
            const keywords: string[] = Array.isArray(c.churn_keywords) ? c.churn_keywords : [];
            const isActing = actingId === c.id;
            const SentIcon = sentimentIcon(c.sentiment_label);
            const sentColor = sentimentColor(c.sentiment_label);

            return (
              <Card key={c.id} className={c.churn_probability >= 75 ? 'border-red-500/30' : ''}>
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div className="flex-1 min-w-[200px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{c.customer_name || 'Cliente sem nome'}</p>
                        <Badge variant="outline" className={churnColor(c.churn_probability)}>
                          {c.churn_probability}% prob. churn
                        </Badge>
                        {c.silent_negative && (
                          <Badge variant="outline" className="text-red-500 border-red-500/30 bg-red-500/10 gap-1">
                            <VolumeX className="h-3 w-3" />Silêncio negativo
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {[
                          c.company,
                          c.monthly_value ? `${fmtMoney(c.monthly_value)}/mês` : null,
                          c.days_since_contact != null ? `Sem contato há ${c.days_since_contact} dias` : null,
                          c.messages_analyzed ? `${c.messages_analyzed} msgs analisadas` : null,
                        ].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                  </div>

                  {/* Health score + sentiment */}
                  <div className="grid sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Heart className={`h-3.5 w-3.5 ${healthColor(c.health_score)}`} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Health Score</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-xl font-bold ${healthColor(c.health_score)}`}>{c.health_score ?? '—'}</span>
                        <span className="text-xs text-muted-foreground">/100</span>
                      </div>
                      <Progress value={c.health_score ?? 0} className="h-1.5" />
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <SentIcon className={`h-3.5 w-3.5 ${sentColor}`} />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sentimento</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-sm font-bold ${sentColor}`}>{c.sentiment_label || 'Neutro'}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Score: {c.sentiment_score != null ? c.sentiment_score.toFixed(2) : '0.00'} (-1 a +1)
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <TrendingDown className="h-3.5 w-3.5 text-orange-500" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Engajamento</span>
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-xl font-bold ${(c.engagement_drop_pct || 0) >= 30 ? 'text-orange-500' : 'text-foreground'}`}>
                          {c.engagement_drop_pct != null ? `-${c.engagement_drop_pct}%` : '—'}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">vs. semana anterior</p>
                    </div>
                  </div>

                  {/* Resumo executivo */}
                  {c.executive_summary && (
                    <div className="flex items-start gap-2 p-2.5 rounded bg-amber-500/5 border border-amber-500/20">
                      <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Resumo executivo</p>
                        <p className="text-xs mt-0.5">{c.executive_summary}</p>
                      </div>
                    </div>
                  )}

                  {/* Marcadores emocionais */}
                  {markers.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Marcadores emocionais</p>
                      <div className="flex flex-wrap gap-1.5">
                        {markers.map((m, j) => (
                          <Badge key={j} variant="outline" className="text-[10px]">{m}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Palavras-chave de churn */}
                  {keywords.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">Palavras de risco detectadas</p>
                      <div className="flex flex-wrap gap-1.5">
                        {keywords.slice(0, 8).map((k, j) => (
                          <Badge key={j} variant="outline" className="text-[10px] text-red-500 border-red-500/30 bg-red-500/5">
                            "{k}"
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Sinais técnicos */}
                  {signals.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sinais detectados</p>
                      <div className="flex flex-wrap gap-1.5">
                        {signals.map((s, j) => (
                          <Badge key={j} variant="secondary" className="text-[10px] gap-1">
                            <Eye className="h-2.5 w-2.5" />{s}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Ação recomendada */}
                  {c.suggested_action && (
                    <div className="flex items-start gap-2 p-2.5 rounded bg-primary/5 border border-primary/20">
                      <Zap className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-primary">Ação recomendada IA</p>
                        <p className="text-xs mt-0.5">{c.suggested_action}</p>
                      </div>
                    </div>
                  )}

                  {/* Botões */}
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button size="sm" onClick={() => applyAction(c.id, 'acted')} disabled={isActing} className="gap-1.5">
                      {isActing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                      Executar ação
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => applyAction(c.id, 'recovered')} disabled={isActing}
                      className="gap-1.5 text-emerald-600 hover:text-emerald-700 border-emerald-500/30">
                      <CheckCircle2 className="h-3 w-3" />Recuperado
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => applyAction(c.id, 'false_positive')} disabled={isActing}
                      className="gap-1.5 text-muted-foreground">
                      <XCircle className="h-3 w-3" />Falso positivo
                    </Button>
                  </div>
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
              99% das ferramentas só te avisam que o cliente CANCELOU. Aqui você recebe alerta dias/semanas antes —
              com health score, sentimento, palavras de risco e ação recomendada para salvar a receita.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
