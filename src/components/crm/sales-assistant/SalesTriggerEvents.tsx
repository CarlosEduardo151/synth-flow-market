import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Radio, Briefcase, TrendingUp, DollarSign, Users, Newspaper, Bell, Zap,
  ArrowUpRight, Loader2, Inbox, Flame, Sparkles, ExternalLink,
  CheckCircle2, Clock, Filter, Link2, Plus, Target, Trash2, Building2,
  Search, Save, Globe2,
} from 'lucide-react';

interface Props { customerProductId: string; }

interface TriggerEvent {
  id: string;
  prospect_id: string | null;
  target_id: string | null;
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
  target?: { name: string; company: string | null; position: string | null } | null;
}

interface Prospect { id: string; name: string; company: string | null; position: string | null; }
interface TargetRow extends Prospect { linkedin_url: string | null; website_url: string | null; }

const TRIGGER_TYPES = [
  { id: 'job_change', label: 'Mudança de cargo', icon: Briefcase, desc: 'Promoção ou novo emprego', color: 'blue' },
  { id: 'funding', label: 'Captação', icon: DollarSign, desc: 'Rodada de investimento', color: 'emerald' },
  { id: 'hiring', label: 'Contratações', icon: Users, desc: 'Múltiplas vagas abertas', color: 'purple' },
  { id: 'news', label: 'Notícia', icon: Newspaper, desc: 'Empresa em destaque', color: 'orange' },
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
  const [extracting, setExtracting] = useState(false);
  const [events, setEvents] = useState<TriggerEvent[]>([]);
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [targets, setTargets] = useState<TargetRow[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [enabledTypes, setEnabledTypes] = useState<Record<string, boolean>>({
    job_change: true, funding: true, hiring: true, news: true, expansion: true,
  });

  // Extract dialog
  const [extractOpen, setExtractOpen] = useState(false);
  const [extractUrl, setExtractUrl] = useState('');
  const [extractSubjectKey, setExtractSubjectKey] = useState<string>(''); // formato: "p:uuid" ou "t:uuid"
  const [extractContext, setExtractContext] = useState('');

  // Target dialog
  const [targetOpen, setTargetOpen] = useState(false);
  const [tName, setTName] = useState('');
  const [tCompany, setTCompany] = useState('');
  const [tPosition, setTPosition] = useState('');
  const [tLinkedin, setTLinkedin] = useState('');
  const [tWebsite, setTWebsite] = useState('');

  const load = async () => {
    setLoading(true);
    const [{ data: ev }, { data: cfg }, { data: pr }, { data: tg }] = await Promise.all([
      (supabase as any).from('sa_trigger_events')
        .select('id,prospect_id,target_id,event_type,title,description,source,source_url,detected_at,relevance_score,status,metadata,sa_prospects(name,company,position),sa_trigger_targets(name,company,position)')
        .eq('customer_product_id', customerProductId)
        .order('detected_at', { ascending: false }).limit(100),
      (supabase as any).from('sa_config').select('modules_enabled')
        .eq('customer_product_id', customerProductId).maybeSingle(),
      (supabase as any).from('sa_prospects')
        .select('id,name,company,position')
        .eq('customer_product_id', customerProductId)
        .order('updated_at', { ascending: false }).limit(200),
      (supabase as any).from('sa_trigger_targets')
        .select('id,name,company,position,linkedin_url,website_url')
        .eq('customer_product_id', customerProductId)
        .order('created_at', { ascending: false }),
    ]);
    const list: TriggerEvent[] = (ev || []).map((e: any) => ({ ...e, prospect: e.sa_prospects, target: e.sa_trigger_targets }));
    setEvents(list);
    setProspects(pr || []);
    setTargets(tg || []);
    const triggerCfg = cfg?.modules_enabled?.trigger_types;
    if (triggerCfg) setEnabledTypes(prev => ({ ...prev, ...triggerCfg }));
    setLoading(false);
  };

  useEffect(() => { if (customerProductId) load(); }, [customerProductId]);

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

  const extractFromUrl = async () => {
    if (!extractUrl.trim()) {
      toast({ title: 'URL obrigatória', variant: 'destructive' });
      return;
    }
    setExtracting(true);
    try {
      const payload: any = {
        customer_product_id: customerProductId,
        url: extractUrl.trim(),
        context: extractContext.trim() || undefined,
      };
      if (extractSubjectKey.startsWith('p:')) payload.prospect_id = extractSubjectKey.slice(2);
      else if (extractSubjectKey.startsWith('t:')) payload.target_id = extractSubjectKey.slice(2);

      const { data, error } = await (supabase as any).functions.invoke('sa-trigger-extract-url', { body: payload });
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);

      if (data?.generated > 0) {
        toast({ title: '✨ Evento extraído', description: data.event?.title || 'Novo trigger criado' });
        setExtractOpen(false);
        setExtractUrl(''); setExtractContext(''); setExtractSubjectKey('');
        await load();
      } else {
        toast({ title: 'Nenhum sinal encontrado', description: data?.message || 'A página não trazia evento relevante.' });
      }
    } catch (e: any) {
      toast({ title: 'Falha ao extrair', description: e.message, variant: 'destructive' });
    } finally {
      setExtracting(false);
    }
  };

  const saveTarget = async () => {
    if (!tName.trim()) { toast({ title: 'Nome obrigatório', variant: 'destructive' }); return; }
    const { error } = await (supabase as any).from('sa_trigger_targets').insert({
      customer_product_id: customerProductId,
      name: tName.trim(),
      company: tCompany.trim() || null,
      position: tPosition.trim() || null,
      linkedin_url: tLinkedin.trim() || null,
      website_url: tWebsite.trim() || null,
    });
    if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Alvo adicionado' });
    setTargetOpen(false);
    setTName(''); setTCompany(''); setTPosition(''); setTLinkedin(''); setTWebsite('');
    await load();
  };

  const deleteTarget = async (id: string) => {
    await (supabase as any).from('sa_trigger_targets').delete().eq('id', id);
    await load();
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
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Eventos hoje</p>
              <p className="text-3xl font-bold text-primary">{todayCount}</p>
            </div>
            <Radio className="h-8 w-8 text-primary/40 animate-pulse" />
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Quentes 🔥</p>
              <p className="text-3xl font-bold text-red-500">{hotCount}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">score ≥ 75</p>
            </div>
            <Flame className="h-8 w-8 text-red-500/40" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Não tratados</p>
              <p className="text-3xl font-bold">{newCount}</p>
            </div>
            <Bell className="h-8 w-8 text-muted-foreground/30" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">Tipos ativos</p>
              <p className="text-3xl font-bold">{activeTypes}<span className="text-base text-muted-foreground">/{TRIGGER_TYPES.length}</span></p>
            </div>
            <Filter className="h-8 w-8 text-muted-foreground/30" />
          </CardContent>
        </Card>
      </div>

      {/* Action Bar */}
      <Card className="bg-gradient-to-r from-primary/5 via-transparent to-primary/5 border-primary/20">
        <CardContent className="p-4 flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <Link2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-sm">Extrair sinais a partir de URLs</p>
              <p className="text-xs text-muted-foreground">Cole o link de uma notícia, post ou página de empresa — a IA identifica o trigger event automaticamente. <span className="text-foreground/70">Sem custo extra.</span></p>
            </div>
          </div>
          <div className="flex gap-2">
            <Dialog open={targetOpen} onOpenChange={setTargetOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm"><Target className="h-4 w-4 mr-2" />Novo alvo</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar alvo de monitoramento</DialogTitle>
                  <DialogDescription>Pessoas/empresas que você quer rastrear sem precisar cadastrar como cliente do CRM.</DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div><Label>Nome *</Label><Input value={tName} onChange={e => setTName(e.target.value)} placeholder="João Silva" /></div>
                    <div><Label>Empresa</Label><Input value={tCompany} onChange={e => setTCompany(e.target.value)} placeholder="Acme Corp" /></div>
                  </div>
                  <div><Label>Cargo</Label><Input value={tPosition} onChange={e => setTPosition(e.target.value)} placeholder="CEO" /></div>
                  <div><Label>LinkedIn URL</Label><Input value={tLinkedin} onChange={e => setTLinkedin(e.target.value)} placeholder="https://linkedin.com/in/..." /></div>
                  <div><Label>Site da empresa</Label><Input value={tWebsite} onChange={e => setTWebsite(e.target.value)} placeholder="https://acme.com" /></div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setTargetOpen(false)}>Cancelar</Button>
                  <Button onClick={saveTarget}><Plus className="h-4 w-4 mr-2" />Adicionar</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Dialog open={extractOpen} onOpenChange={setExtractOpen}>
              <DialogTrigger asChild>
                <Button size="sm"><Sparkles className="h-4 w-4 mr-2" />Extrair de URL</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Extrair Trigger Event de URL</DialogTitle>
                  <DialogDescription>
                    Cole o link e a IA vai analisar o conteúdo. Aceita: notícias, blogs, sites de empresa, páginas de carreira.
                    <span className="block mt-1 text-amber-500/90">⚠️ LinkedIn bloqueia leitura — para posts/perfis, copie o texto e cole em "contexto adicional".</span>
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-3">
                  <div>
                    <Label>URL *</Label>
                    <Input value={extractUrl} onChange={e => setExtractUrl(e.target.value)} placeholder="https://..." />
                  </div>
                  <div>
                    <Label>Vincular a (opcional)</Label>
                    <Select value={extractSubjectKey} onValueChange={setExtractSubjectKey}>
                      <SelectTrigger><SelectValue placeholder="Selecione cliente ou alvo" /></SelectTrigger>
                      <SelectContent className="max-h-72">
                        {prospects.length > 0 && (
                          <>
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase">Clientes do CRM</div>
                            {prospects.map(p => (
                              <SelectItem key={`p-${p.id}`} value={`p:${p.id}`}>
                                {p.name}{p.company ? ` · ${p.company}` : ''}
                              </SelectItem>
                            ))}
                          </>
                        )}
                        {targets.length > 0 && (
                          <>
                            <div className="px-2 py-1 text-[10px] font-semibold text-muted-foreground uppercase mt-1">Alvos avulsos</div>
                            {targets.map(t => (
                              <SelectItem key={`t-${t.id}`} value={`t:${t.id}`}>
                                {t.name}{t.company ? ` · ${t.company}` : ''}
                              </SelectItem>
                            ))}
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Contexto adicional (opcional)</Label>
                    <Textarea value={extractContext} onChange={e => setExtractContext(e.target.value)} placeholder="Ex: cole aqui o texto do post do LinkedIn, ou descreva o alvo se não selecionou acima." rows={3} />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setExtractOpen(false)} disabled={extracting}>Cancelar</Button>
                  <Button onClick={extractFromUrl} disabled={extracting}>
                    {extracting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analisando...</> : <><Sparkles className="h-4 w-4 mr-2" />Extrair</>}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Main feed */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Radio className="h-5 w-5 text-primary animate-pulse" />
            Feed de Trigger Events
          </CardTitle>
          <CardDescription>Sinais externos detectados nos seus alvos</CardDescription>

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
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-sm text-muted-foreground">
              <Inbox className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p className="font-medium">Nenhum evento neste filtro</p>
              <p className="text-xs mt-1">Use "Extrair de URL" pra capturar um sinal a partir de um link.</p>
            </div>
          ) : filtered.map((ev) => {
            const meta = typeMeta(ev.event_type);
            const Icon = meta.icon;
            const isHot = (ev.relevance_score || 0) >= 75;
            const suggested = ev.metadata?.suggested_action;
            const subj = ev.prospect || ev.target;
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
                        {subj && <span className="font-medium text-foreground/70">{subj.name}</span>}
                        {subj?.company && <span>· {subj.company}</span>}
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
                          <Button size="sm" variant="outline" onClick={() => markStatus(ev.id, 'dismissed')}>Ignorar</Button>
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

      {/* Targets list */}
      {targets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2"><Target className="h-4 w-4" />Alvos avulsos ({targets.length})</CardTitle>
            <CardDescription>Pessoas/empresas que você monitora além do CRM</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            {targets.map(t => (
              <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30">
                <div className="w-9 h-9 rounded-md bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <Building2 className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{t.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {[t.position, t.company].filter(Boolean).join(' · ') || '—'}
                  </p>
                </div>
                <Button size="icon" variant="ghost" onClick={() => deleteTarget(t.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Type config */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2"><Filter className="h-4 w-4" />Tipos de evento monitorados</CardTitle>
          <CardDescription>Filtra os tipos que aparecem no feed</CardDescription>
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
