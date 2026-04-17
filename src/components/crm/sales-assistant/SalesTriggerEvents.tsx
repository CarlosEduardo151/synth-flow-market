import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Radio, Briefcase, TrendingUp, DollarSign, Users, Newspaper, Bell, Zap, ArrowUpRight, Loader2, Inbox } from 'lucide-react';

interface Props { customerProductId: string; }

interface TriggerEvent {
  id: string;
  lead_name: string;
  company: string | null;
  event_type: string;
  title: string;
  detail: string | null;
  detected_at: string;
  suggested_action: string | null;
  is_hot: boolean;
}

const triggerTypes = [
  { id: 'job', label: 'Mudança de cargo', icon: Briefcase, desc: 'Lead/contato muda de empresa ou recebe promoção' },
  { id: 'funding', label: 'Captação de investimento', icon: DollarSign, desc: 'Empresa do lead recebe rodada de investimento' },
  { id: 'hiring', label: 'Onda de contratações', icon: Users, desc: 'Empresa abre +5 vagas em uma área' },
  { id: 'news', label: 'Menção em notícia', icon: Newspaper, desc: 'Empresa do lead vira manchete (positivo ou crise)' },
  { id: 'expansion', label: 'Expansão geográfica', icon: TrendingUp, desc: 'Anuncia abertura de filial/mercado novo' },
];

const typeIcon = (type: string) => {
  const map: Record<string, any> = { job: Briefcase, funding: DollarSign, hiring: Users, news: Newspaper, expansion: TrendingUp };
  return map[type] || Bell;
};

const typeColor = (type: string) => {
  const map: Record<string, string> = {
    job: 'text-blue-500 bg-blue-500/10 border-blue-500/30',
    funding: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30',
    hiring: 'text-purple-500 bg-purple-500/10 border-purple-500/30',
    news: 'text-orange-500 bg-orange-500/10 border-orange-500/30',
    expansion: 'text-pink-500 bg-pink-500/10 border-pink-500/30',
  };
  return map[type] || 'text-muted-foreground';
};

const timeAgo = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 3600) return `${Math.floor(d / 60)}min atrás`;
  if (d < 86400) return `${Math.floor(d / 3600)}h atrás`;
  return `${Math.floor(d / 86400)}d atrás`;
};

export function SalesTriggerEvents({ customerProductId }: Props) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TriggerEvent[]>([]);
  const [enabledTypes, setEnabledTypes] = useState<Record<string, boolean>>({
    job: true, funding: true, hiring: true, news: false, expansion: true,
  });

  useEffect(() => {
    if (!customerProductId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const [{ data: ev }, { data: cfg }] = await Promise.all([
        (supabase as any).from('sa_trigger_events')
          .select('id,lead_name,company,event_type,title,detail,detected_at,suggested_action,is_hot')
          .eq('customer_product_id', customerProductId)
          .order('detected_at', { ascending: false }).limit(50),
        (supabase as any).from('sa_config').select('trigger_types_enabled')
          .eq('customer_product_id', customerProductId).maybeSingle(),
      ]);
      if (!active) return;
      setEvents(ev || []);
      if (cfg?.trigger_types_enabled) setEnabledTypes(cfg.trigger_types_enabled);
      setLoading(false);
    })();
    return () => { active = false; };
  }, [customerProductId]);

  const toggleType = async (id: string, value: boolean) => {
    const next = { ...enabledTypes, [id]: value };
    setEnabledTypes(next);
    await (supabase as any).from('sa_config').upsert({
      customer_product_id: customerProductId,
      trigger_types_enabled: next,
    }, { onConflict: 'customer_product_id' });
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const todayCount = events.filter(e => new Date(e.detected_at) >= today).length;
  const hotCount = events.filter(e => e.is_hot).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Eventos hoje</p><p className="text-2xl font-bold text-primary">{todayCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Eventos quentes 🔥</p><p className="text-2xl font-bold text-red-500">{hotCount}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Total detectados</p><p className="text-2xl font-bold">{events.length}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-muted-foreground">Tipos ativos</p><p className="text-2xl font-bold">{Object.values(enabledTypes).filter(Boolean).length}/{triggerTypes.length}</p></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Radio className="h-5 w-5 text-primary animate-pulse" />Trigger Events — Sinais de Compra Externos</CardTitle>
          <CardDescription>A IA monitora LinkedIn, notícias e bases públicas e te avisa nos momentos de ouro pra abordar</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : events.length === 0 ? (
            <div className="text-center py-12 text-sm text-muted-foreground">
              <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
              Nenhum evento detectado ainda. Ative os tipos abaixo para monitoramento.
            </div>
          ) : events.map((ev) => {
            const Icon = typeIcon(ev.event_type);
            return (
              <Card key={ev.id} className={ev.is_hot ? 'border-red-500/30 bg-red-500/5' : ''}>
                <CardContent className="p-4 flex items-start gap-3 flex-wrap">
                  <div className={`w-10 h-10 rounded-md border flex items-center justify-center shrink-0 ${typeColor(ev.event_type)}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-sm">{ev.title}</p>
                      {ev.is_hot && <Badge className="bg-red-500/10 text-red-500 border-red-500/30 text-[10px]">🔥 QUENTE</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{[ev.lead_name, ev.company, timeAgo(ev.detected_at)].filter(Boolean).join(' · ')}</p>
                    {ev.detail && <p className="text-xs mt-2">{ev.detail}</p>}
                    {ev.suggested_action && (
                      <div className="flex items-start gap-1.5 mt-2 p-2 rounded bg-primary/5 border border-primary/20">
                        <Zap className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <p className="text-xs"><span className="font-medium">Sugestão IA:</span> {ev.suggested_action}</p>
                      </div>
                    )}
                  </div>
                  <Button size="sm" variant="outline">Abordar <ArrowUpRight className="h-3 w-3 ml-1" /></Button>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Tipos de evento monitorados</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {triggerTypes.map(t => {
            const Icon = t.icon;
            return (
              <div key={t.id} className="flex items-center gap-3 p-2 rounded hover:bg-muted/30">
                <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1">
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
