import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import {
  Mail, MessageSquare, Phone, Plus, Play, Pause, Clock, Zap, ArrowRight, Loader2, Inbox,
  Sparkles, TrendingUp, Users, Target, Activity, MoreVertical, Trash2, Eye, Send,
  CheckCircle2, AlertCircle, Linkedin, Flame, BarChart3, Wand2, Calendar, Reply, Mic
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';

interface Props { customerProductId: string; }

interface CadenceStep {
  day: number;
  channel: 'email' | 'whatsapp' | 'call' | 'linkedin';
  subject?: string;
  prompt?: string;
  desc?: string;
}

interface Cadence {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  steps: CadenceStep[];
  total_steps: number;
  goal: string | null;
  target_audience: string | null;
  primary_channel: string | null;
  tone: string | null;
  open_rate: number | null;
  reply_rate: number | null;
  conversion_rate: number | null;
  active_leads: number | null;
  completed_leads: number | null;
  messages_sent: number | null;
  messages_replied: number | null;
  ai_personalization: boolean | null;
  created_at: string;
}

interface Enrollment {
  id: string;
  cadence_id: string;
  prospect_id: string;
  current_step: number;
  status: string;
  next_action_at: string | null;
  last_action_at: string | null;
  history: any;
  lead_name: string | null;
  lead_phone: string | null;
  opened_count: number | null;
  replied: boolean | null;
  converted: boolean | null;
}

const CHANNEL_META: Record<string, { icon: any; color: string; label: string }> = {
  email: { icon: Mail, color: 'text-blue-500 bg-blue-500/10 border-blue-500/30', label: 'E-mail' },
  whatsapp: { icon: MessageSquare, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/30', label: 'WhatsApp' },
  call: { icon: Phone, color: 'text-amber-500 bg-amber-500/10 border-amber-500/30', label: 'Ligação' },
  linkedin: { icon: Linkedin, color: 'text-sky-500 bg-sky-500/10 border-sky-500/30', label: 'LinkedIn' },
};

const ChannelIcon = ({ channel, className = '' }: { channel: string; className?: string }) => {
  const Meta = CHANNEL_META[channel] || CHANNEL_META.whatsapp;
  const Icon = Meta.icon;
  return <Icon className={`h-3.5 w-3.5 ${className}`} />;
};

export function SalesCadences({ customerProductId }: Props) {
  const [loading, setLoading] = useState(true);
  const [cadences, setCadences] = useState<Cadence[]>([]);
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [creating, setCreating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [openCreate, setOpenCreate] = useState(false);
  const [selected, setSelected] = useState<Cadence | null>(null);
  const [form, setForm] = useState({
    name: '',
    goal: 'qualificar',
    audience: '',
    channel: 'whatsapp',
    tone: 'consultivo',
    days: 7,
  });

  const load = async () => {
    if (!customerProductId) return;
    setLoading(true);
    const [c, e] = await Promise.all([
      (supabase as any).from('sa_cadences').select('*').eq('customer_product_id', customerProductId).order('created_at', { ascending: false }),
      (supabase as any).from('sa_cadence_enrollments').select('*').eq('customer_product_id', customerProductId).order('created_at', { ascending: false }).limit(200),
    ]);
    setCadences(c.data || []);
    setEnrollments(e.data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [customerProductId]);

  // Realtime
  useEffect(() => {
    if (!customerProductId) return;
    const ch = supabase
      .channel(`cad-${customerProductId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sa_cadences', filter: `customer_product_id=eq.${customerProductId}` }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sa_cadence_enrollments', filter: `customer_product_id=eq.${customerProductId}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [customerProductId]);

  const stats = useMemo(() => {
    const active = cadences.filter(c => c.is_active).length;
    const totalLeads = enrollments.filter(e => e.status === 'active').length;
    const totalSent = cadences.reduce((s, c) => s + (c.messages_sent || 0), 0);
    const totalReplied = cadences.reduce((s, c) => s + (c.messages_replied || 0), 0);
    const replyRate = totalSent > 0 ? Math.round((totalReplied / totalSent) * 100) : 0;
    const converted = enrollments.filter(e => e.converted).length;
    const convRate = enrollments.length > 0 ? Math.round((converted / enrollments.length) * 100) : 0;
    return { active, totalLeads, totalSent, replyRate, converted, convRate };
  }, [cadences, enrollments]);

  const createCadence = async () => {
    if (!form.name || !form.audience) {
      toast.error('Preencha nome e público-alvo');
      return;
    }
    setCreating(true);
    try {
      const { error } = await supabase.functions.invoke('sa-cadence-engine', {
        body: { action: 'create', customerProductId, ...form },
      });
      if (error) throw error;
      toast.success('Cadência criada pela IA!');
      setOpenCreate(false);
      setForm({ name: '', goal: 'qualificar', audience: '', channel: 'whatsapp', tone: 'consultivo', days: 7 });
      load();
    } catch (e: any) {
      toast.error('Erro: ' + e.message);
    } finally {
      setCreating(false);
    }
  };

  const toggleCadence = async (id: string, value: boolean) => {
    setCadences(prev => prev.map(c => c.id === id ? { ...c, is_active: value } : c));
    await supabase.functions.invoke('sa-cadence-engine', { body: { action: 'toggle', cadenceId: id, value, customerProductId } });
  };

  const deleteCadence = async (id: string) => {
    if (!confirm('Excluir esta cadência? Os leads enrolled serão removidos.')) return;
    await supabase.functions.invoke('sa-cadence-engine', { body: { action: 'delete', cadenceId: id, customerProductId } });
    toast.success('Cadência excluída');
    load();
  };

  const executeNow = async () => {
    setExecuting(true);
    try {
      const { data, error } = await supabase.functions.invoke('sa-cadence-engine', { body: { action: 'execute', customerProductId } });
      if (error) throw error;
      toast.success(`${data?.sent || 0} mensagem(ns) enviada(s) pela IA`);
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setExecuting(false);
    }
  };

  const enrollmentsByCadence = (cid: string) => enrollments.filter(e => e.cadence_id === cid);

  return (
    <div className="space-y-6">
      {/* HERO HEADER */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                <Zap className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  Cadências de Follow-up
                  <Badge variant="outline" className="gap-1 text-xs">
                    <Sparkles className="h-3 w-3" /> IA Generativa
                  </Badge>
                </h2>
                <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
                  Sequências multi-canal com mensagens 100% personalizadas pela IA. Cada lead recebe conteúdo único baseado em contexto, empresa, cargo e histórico.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={executeNow} disabled={executing}>
                {executing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                Executar Agora
              </Button>
              <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                <DialogTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Wand2 className="h-4 w-4" /> Nova Cadência IA
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" /> Criar Cadência com IA
                    </DialogTitle>
                    <DialogDescription>A IA vai gerar a sequência completa de passos baseada no objetivo e público.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Nome da cadência</Label>
                      <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Outbound SaaS B2B - Decisores" />
                    </div>
                    <div className="space-y-2">
                      <Label>Público-alvo (ICP)</Label>
                      <Textarea value={form.audience} onChange={e => setForm({ ...form, audience: e.target.value })} placeholder="Ex: CMOs e Heads de Marketing de empresas SaaS B2B com 50-500 funcionários no Brasil" rows={3} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label>Objetivo</Label>
                        <Select value={form.goal} onValueChange={v => setForm({ ...form, goal: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="qualificar">Qualificar lead (descoberta)</SelectItem>
                            <SelectItem value="agendar">Agendar reunião</SelectItem>
                            <SelectItem value="nutrir">Nutrir lead morno</SelectItem>
                            <SelectItem value="reativar">Reativar lead frio</SelectItem>
                            <SelectItem value="upsell">Upsell de cliente atual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Canal principal</Label>
                        <Select value={form.channel} onValueChange={v => setForm({ ...form, channel: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="whatsapp">WhatsApp</SelectItem>
                            <SelectItem value="email">E-mail</SelectItem>
                            <SelectItem value="linkedin">LinkedIn</SelectItem>
                            <SelectItem value="multi">Multi-canal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Tom de voz</Label>
                        <Select value={form.tone} onValueChange={v => setForm({ ...form, tone: v })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="consultivo">Consultivo</SelectItem>
                            <SelectItem value="direto">Direto e objetivo</SelectItem>
                            <SelectItem value="amigavel">Amigável</SelectItem>
                            <SelectItem value="provocativo">Provocativo</SelectItem>
                            <SelectItem value="formal">Formal</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Duração (passos)</Label>
                        <Select value={String(form.days)} onValueChange={v => setForm({ ...form, days: Number(v) })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="3">3 toques (curta)</SelectItem>
                            <SelectItem value="5">5 toques</SelectItem>
                            <SelectItem value="7">7 toques (recomendado)</SelectItem>
                            <SelectItem value="10">10 toques (longa)</SelectItem>
                            <SelectItem value="14">14 toques (intensiva)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpenCreate(false)}>Cancelar</Button>
                    <Button onClick={createCadence} disabled={creating}>
                      {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      Gerar com IA
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Cadências ativas', value: stats.active, icon: Activity, color: 'text-emerald-500' },
          { label: 'Leads em sequência', value: stats.totalLeads, icon: Users, color: 'text-blue-500' },
          { label: 'Mensagens enviadas', value: stats.totalSent, icon: Send, color: 'text-violet-500' },
          { label: 'Taxa de resposta', value: `${stats.replyRate}%`, icon: Reply, color: 'text-amber-500' },
          { label: 'Convertidos', value: stats.converted, icon: Target, color: 'text-rose-500' },
          { label: 'Conversão', value: `${stats.convRate}%`, icon: TrendingUp, color: 'text-primary' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1">
                  <Icon className={`h-4 w-4 ${s.color}`} />
                </div>
                <p className="text-2xl font-bold tracking-tight">{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{s.label}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* CADENCE LIST */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" />
              Suas cadências
            </CardTitle>
            <p className="text-xs text-muted-foreground">{cadences.length} total</p>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : cadences.length === 0 ? (
            <div className="text-center py-16 px-4">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Inbox className="h-8 w-8 text-primary opacity-60" />
              </div>
              <h3 className="font-semibold mb-1">Nenhuma cadência ainda</h3>
              <p className="text-sm text-muted-foreground mb-4 max-w-sm mx-auto">
                Crie sua primeira sequência multi-canal. A IA gera todos os passos e personaliza cada mensagem para cada lead.
              </p>
              <Button onClick={() => setOpenCreate(true)} size="sm" className="gap-2">
                <Wand2 className="h-4 w-4" /> Criar com IA
              </Button>
            </div>
          ) : (
            cadences.map((cad) => {
              const steps = Array.isArray(cad.steps) ? cad.steps : [];
              const enr = enrollmentsByCadence(cad.id);
              const activeLeads = enr.filter(e => e.status === 'active').length;
              const completedLeads = enr.filter(e => e.status === 'completed').length;
              const replyRate = cad.reply_rate ?? 0;
              return (
                <Card key={cad.id} className={`overflow-hidden transition-all hover:shadow-md ${cad.is_active ? 'border-primary/40 bg-gradient-to-r from-primary/5 to-transparent' : 'opacity-75'}`}>
                  <CardContent className="p-0">
                    {/* HEADER */}
                    <div className="p-4 flex items-start justify-between gap-4 flex-wrap">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <div className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${cad.is_active ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                          {cad.is_active ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold truncate">{cad.name}</h3>
                            {cad.ai_personalization && (
                              <Badge variant="outline" className="gap-1 text-[10px] h-5">
                                <Sparkles className="h-2.5 w-2.5" /> IA
                              </Badge>
                            )}
                            <Badge variant="secondary" className="text-[10px] h-5 capitalize">{cad.goal || 'qualificar'}</Badge>
                            {cad.tone && <Badge variant="outline" className="text-[10px] h-5 capitalize">{cad.tone}</Badge>}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                            {cad.target_audience || 'Sem público-alvo definido'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Switch checked={cad.is_active} onCheckedChange={(v) => toggleCadence(cad.id, v)} />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreVertical className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelected(cad)}>
                              <Eye className="h-4 w-4 mr-2" /> Ver detalhes
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => deleteCadence(cad.id)}>
                              <Trash2 className="h-4 w-4 mr-2" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* METRICS STRIP */}
                    <div className="px-4 pb-3 grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
                      <div className="p-2 rounded-md bg-muted/40">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Ativos</p>
                        <p className="text-lg font-bold text-blue-500">{activeLeads}</p>
                      </div>
                      <div className="p-2 rounded-md bg-muted/40">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Concluídos</p>
                        <p className="text-lg font-bold">{completedLeads}</p>
                      </div>
                      <div className="p-2 rounded-md bg-muted/40">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Enviadas</p>
                        <p className="text-lg font-bold text-violet-500">{cad.messages_sent || 0}</p>
                      </div>
                      <div className="p-2 rounded-md bg-muted/40">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Abertura</p>
                        <p className="text-lg font-bold text-amber-500">{cad.open_rate ?? 0}%</p>
                      </div>
                      <div className="p-2 rounded-md bg-muted/40">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Resposta</p>
                        <p className="text-lg font-bold text-emerald-500">{replyRate}%</p>
                      </div>
                    </div>

                    {/* STEPS TIMELINE */}
                    {steps.length > 0 && (
                      <div className="px-4 pb-4 pt-2 border-t bg-muted/20">
                        <div className="flex items-center gap-1.5 mb-2">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                            Sequência ({steps.length} {steps.length === 1 ? 'passo' : 'passos'})
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {steps.map((step, j) => {
                            const meta = CHANNEL_META[step.channel] || CHANNEL_META.whatsapp;
                            return (
                              <div key={j} className="flex items-center gap-1.5">
                                <div className={`flex items-center gap-1.5 px-2 py-1 rounded border text-[11px] ${meta.color}`}>
                                  <span className="font-bold opacity-70">D+{step.day ?? 0}</span>
                                  <ChannelIcon channel={step.channel} />
                                  <span className="font-medium truncate max-w-[120px]">{step.desc || meta.label}</span>
                                </div>
                                {j < steps.length - 1 && <ArrowRight className="h-3 w-3 text-muted-foreground/50" />}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* DETAIL SHEET */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" /> {selected.name}
                </SheetTitle>
                <SheetDescription>{selected.target_audience}</SheetDescription>
              </SheetHeader>
              <Tabs defaultValue="steps" className="mt-4">
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="steps">Passos</TabsTrigger>
                  <TabsTrigger value="leads">Leads ({enrollmentsByCadence(selected.id).length})</TabsTrigger>
                  <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>
                <TabsContent value="steps" className="space-y-3 mt-4">
                  {(selected.steps || []).map((s, i) => {
                    const meta = CHANNEL_META[s.channel] || CHANNEL_META.whatsapp;
                    return (
                      <Card key={i}>
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="gap-1">
                                <Calendar className="h-3 w-3" /> Dia {s.day}
                              </Badge>
                              <Badge className={meta.color + ' border'}>
                                <ChannelIcon channel={s.channel} className="mr-1" /> {meta.label}
                              </Badge>
                            </div>
                            <span className="text-xs text-muted-foreground">Passo {i + 1}</span>
                          </div>
                          {s.subject && <p className="text-sm font-medium">📧 {s.subject}</p>}
                          <p className="text-sm text-muted-foreground">{s.prompt || s.desc}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </TabsContent>
                <TabsContent value="leads" className="space-y-2 mt-4">
                  {enrollmentsByCadence(selected.id).length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">Nenhum lead matriculado ainda.</p>
                  ) : enrollmentsByCadence(selected.id).map((e) => (
                    <Card key={e.id}>
                      <CardContent className="p-3 flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium">{e.lead_name || e.lead_phone || 'Lead'}</p>
                          <p className="text-xs text-muted-foreground">Passo {e.current_step + 1} • {e.status}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {e.replied && <Badge variant="outline" className="gap-1"><Reply className="h-3 w-3" /> Respondeu</Badge>}
                          {e.converted && <Badge className="gap-1 bg-emerald-500"><CheckCircle2 className="h-3 w-3" /> Convertido</Badge>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </TabsContent>
                <TabsContent value="performance" className="space-y-4 mt-4">
                  {[
                    { label: 'Taxa de abertura', value: selected.open_rate ?? 0, color: 'bg-amber-500' },
                    { label: 'Taxa de resposta', value: selected.reply_rate ?? 0, color: 'bg-emerald-500' },
                    { label: 'Taxa de conversão', value: selected.conversion_rate ?? 0, color: 'bg-primary' },
                  ].map((m, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{m.label}</span>
                        <span className="font-semibold">{m.value}%</span>
                      </div>
                      <Progress value={m.value} className="h-2" />
                    </div>
                  ))}
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
