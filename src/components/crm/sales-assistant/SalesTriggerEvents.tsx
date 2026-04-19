import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import {
  Radio, Briefcase, TrendingUp, DollarSign, Users, Newspaper, Bell, Zap,
  ArrowUpRight, Loader2, Inbox, Flame, RefreshCw, Sparkles, ExternalLink,
  CheckCircle2, Clock, Filter,
} from 'lucide-react';

interface Props { customerProductId: string; }

interface TriggerEvent {
  id: string;
  prospect_id: string | null;
  event_type: string;
  title: string;
  description: string | null;
  source: string | null;
  source_url: string | null;
  detected_at: string;
  relevance_score: number | null;
  status: string;
  metadata: any;
  prospect?: { name: string; company: string | null; position: string | null } | null;
}

const TRIGGER_TYPES = [
  { id: 'job_change', label: 'Mudança de cargo', icon: Briefcase, desc: 'Promoção ou novo emprego do contato', color: 'blue' },
  { id: 'funding', label: 'Captação', icon: DollarSign, desc: 'Empresa recebe rodada de investimento', color: 'emerald' },
  { id: 'hiring', label: 'Contratações', icon: Users, desc: 'Empresa abre múltiplas vagas', color: 'purple' },
  { id: 'news', label: 'Notícia', icon: Newspaper, desc: 'Empresa vira manchete', color: 'orange' },
  { id: 'expansion', label: 'Expansão', icon: TrendingUp, desc: 'Nova filial ou mercado', color: 'pink' },
] as const;

const typeMeta = (type: string) => TRIGGER_TYPES.find(t => t.id === type) || { id: type, label: type, icon: Bell, color: 'gray', desc: '' };

const colorClasses: Record<string, string> = {
  blue: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
  emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
  purple: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
  orange: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
  pink: 'text-pink-500 bg-pink-500/10 border-pink-500/30',
  gray: 'text-muted-foreground bg-muted border-border',
};

const timeAgo = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'agora';
  if (d < 3600) return `${Math.floor(d / 60)}min atrás`;
  if (d < 86400) return `${Math.floor(d / 3600)}h atrás`;
  return `${Math.floor(d / 86400)}d atrás`;
};

const scoreColor = (s: number) => s >= 75 ? 'text-red-500' : s >= 50 ? 'text-orange-500' : 'text-muted-foreground';

export function SalesTriggerEvents({ customerProductId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [events, setEvents] = useState<TriggerEvent[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [enabledTypes, setEnabledTypes] = useState<Record<string, boolean>>({
    job_change: true, funding: true, hiring: true, news: false, expansion: true,
  });

  const load = async () => {
    setLoading(true);
    const [{ data: ev }, { data: cfg }] = await Promise.all([
      (supabase as any).from('sa_trigger_events')
        .select('id,prospect_id,event_type,title,description,source,source_url,detected_at,relevance_score,status,metadata,sa_prospects(name,company,position)')
        .eq('customer_product_id', customerProductId)
        .order('detected_at', { ascending: false }).limit(80),
      (supabase as any).from('sa_config').select('modules_enabled')
        .eq('customer_product_id', customerProductId).maybeSingle(),
    ]);
    const list: TriggerEvent[] = (ev || []).map((e: any) => ({ ...e, prospect: e.sa_prospects }));
    setEvents(list);
    const triggerCfg = cfg?.modules_enabled?.trigger_types;
    if (triggerCfg) setEnabledTypes({ ...enabledTypes, ...triggerCfg });
    setLoading(false);
  };

  useEffect(() => {
    if (!customerProductId) return;
    load();
  }, [customerProductId]);

  const toggleType = async (id: string, value: boolean) => {
    const next = { ...enabledTypes, [id]: value };
    setEnabledTypes(next);
    const { data: cfg } = await (supabase as any).from('sa_config')
      .select('id,modules_enabled').eq('customer_product_id', customerProductId).maybeSingle();
    const modules = { ...(cfg?.modules_enabled || {}), trigger_types: next };
    await (supabase as any).from('sa_config').upsert({
      ...(cfg?.id ? { id: cfg.id } : {}),
      customer_product_id: customerProductId,
      modules_enabled: modules,
    }, { onConflict: 'customer_product_id' });
  };

  const runScan = async () => {
    setScanning(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke('sa-trigger-scan', {
        body: { customer_product_id: customerProductId, mode: 'scan' },
      });
      if (error) throw error;
      toast({ title: 'Scan concluído', description: `${data?.generated ?? 0} novos eventos detectados` });
      await load();
    } catch (e: any) {
      toast({ title: 'Erro no scan', description: e.message || 'Falha ao buscar eventos', variant: 'destructive' });
    } finally {
      setScanning(false);
    }
  };

  const markStatus = async (id: string, status: string) => {
    setEvents(prev => prev.map(e => e.id === id ? { ...e, status } : e));
    await (supabase as any).from('sa_trigger_events').update({ status }).eq('id', id);
  };

  const filtered = useMemo(() => {
    if (filter === 'all') return events;
    if (filter === 'hot') return events.filter(e => (e.relevance_score || 0) >= 75);
    if (filter === 'new') return events.filter(e => e.status === 'new');
    return events.filter(e => e.event_type === filter);
  }, [events, filter]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayCount = events.filter(e => new Date(e.detected_at) >= today).length;
  const hotCount = events.filter(e => (e.relevance_score || 0) >= 75).length;
  const newCount = events.filter(e => e.status === 'new').length;
  const activeTypes = Object.values(enabledTypes).filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Hero Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Eventos hoje</p>
                <p className="text-3xl font-bold text-primary">{todayCount}</p>
              </div>
              <Radio className="h-8 w-8 text-primary/40 animate-pulse" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Quentes 🔥</p>
                <p className="text-3xl font-bold text-red-500">{hotCount}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">score ≥ 75</p>
              </div>
              <Flame className="h-8 w-8 text-red-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Não tratados</p>
                <p className="text-3xl font-bold">{newCount}</p>
              </div>
              <Bell className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Tipos ativos</p>
                <p className="text-3xl font-bold">{activeTypes}<span className="text-base text-muted-foreground">/{TRIGGER_TYPES.length}</span></p>
              </div>
              <Filter className="h-8 w-8 text-muted-foreground/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main feed */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-primary animate-pulse" />
                Trigger Events — Sinais de Compra Externos
              </CardTitle>
              <CardDescription>
                A IA monitora seus prospects e detecta momentos de ouro pra abordagem
              </CardDescription>
            </div>
            <Button onClick={runScan} disabled={scanning} size="sm">
              {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {scanning ? 'Escaneando...' : 'Escanear agora'}
            </Button>
          </div>

          <Tabs value={filter} onValueChange={setFilter} className="mt-3">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="all">Todos ({events.length})</TabsTrigger>
              <TabsTrigger value="hot">🔥 Quentes ({hotCount})</TabsTrigger>
              <TabsTrigger value="new">Novos ({newCount})</TabsTrigger>
              {TRIGGER_TYPES.map(t => {
                const c = events.filter(e => e.event_type === t.id).length;
                if (c === 0) return null;
                return <TabsTrigger key={t.id} value={t.id}>{t.label} ({c})</TabsTrigger>;
              })}
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhum evento neste filtro</p>
              <p className="text-xs mt-1">Clique em "Escanear agora" para a IA buscar sinais nos seus prospects</p>
            </div>
          ) : filtered.map((ev) => {
            const meta = typeMeta(ev.event_type);
            const Icon = meta.icon;
            const isHot = (ev.relevance_score || 0) >= 75;
            const suggested = ev.metadata?.suggested_action;
            return (
              <Card key={ev.id} className={`transition-all ${isHot ? 'border-red-500/30 bg-red-500/5' : ''} ${ev.status === 'dismissed' ? 'opacity-50' : ''}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3 flex-wrap">
                    <div className={`w-11 h-11 rounded-lg border flex items-center justify-center shrink-0 ${colorClasses[meta.color]}`}>
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-[240px]">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{ev.title}</p>
                        {isHot && <Badge className="bg-red-500/10 text-red-500 border-red-500/30 text-[10px] gap-1"><Flame className="h-3 w-3" />QUENTE</Badge>}
                        {ev.status === 'new' && <Badge variant="outline" className="text-[10px]">Novo</Badge>}
                        {ev.status === 'actioned' && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-[10px] gap-1"><CheckCircle2 className="h-3 w-3" />Abordado</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                        {ev.prospect && <span className="font-medium text-foreground/70">{ev.prospect.name}</span>}
                        {ev.prospect?.company && <span>· {ev.prospect.company}</span>}
                        <span>· <Clock className="h-3 w-3 inline" /> {timeAgo(ev.detected_at)}</span>
                        {ev.source && <span>· via {ev.source}</span>}
                      </p>

                      {ev.description && <p className="text-xs mt-2 text-foreground/80">{ev.description}</p>}

                      {suggested && (
                        <div className="flex items-start gap-1.5 mt-2 p-2 rounded-md bg-primary/5 border border-primary/20">
                          <Zap className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                          <p className="text-xs"><span className="font-medium">Sugestão IA:</span> {suggested}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {ev.relevance_score != null && (
                        <div className="text-right">
                          <p className="text-[10px] text-muted-foreground">Relevância</p>
                          <p className={`text-xl font-bold ${scoreColor(ev.relevance_score)}`}>{ev.relevance_score}</p>
                        </div>
                      )}
                      <div className="flex gap-1">
                        {ev.source_url && (
                          <Button size="sm" variant="ghost" asChild>
                            <a href={ev.source_url} target="_blank" rel="noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                          </Button>
                        )}
                        {ev.status !== 'actioned' && (
                          <Button size="sm" onClick={() => markStatus(ev.id, 'actioned')}>
                            Abordar <ArrowUpRight className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                        {ev.status === 'new' && (
                          <Button size="sm" variant="outline" onClick={() => markStatus(ev.id, 'dismissed')}>
                            Ignorar
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {/* Type config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Tipos de evento monitorados
          </CardTitle>
          <CardDescription>Ative os sinais que a IA deve buscar nos seus prospects</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2 sm:grid-cols-2">
          {TRIGGER_TYPES.map(t => {
            const Icon = t.icon;
            return (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition">
                <div className={`w-9 h-9 rounded-md border flex items-center justify-center shrink-0 ${colorClasses[t.color]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-[11px] text-muted-foreground">{t.desc}</p>
                </div>
                <Switch checked={!!enabledTypes[t.id]} onCheckedChange={(v) => toggleType(t.id, v)} />
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
