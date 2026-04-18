import { useEffect, useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles, Target, TrendingUp, Search, Plus, Brain, Zap,
  Loader2, Inbox, MessageCircle, RefreshCw, Phone, Mail, Building2,
  ChevronRight, Award, Flame, Snowflake, Activity, Calendar,
  BarChart3, Wand2, AlertCircle, CheckCircle2, Clock, DollarSign,
  Users, Layers, Filter as FilterIcon, ArrowUpRight, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props { customerProductId: string; }

interface Lead {
  id: string;
  name: string;
  company: string | null;
  business_type: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  last_contact_date: string | null;
  created_at: string;
}

interface ProspectAI {
  email: string | null;
  phone: string | null;
  ai_score: number | null;
  qualification: string | null;
  ai_analysis: any;
  tags: string[] | null;
  updated_at: string;
}

// Score base local (fallback se IA ainda não rodou)
const baseScore = (l: Lead): number => {
  let s = 25;
  if (l.phone) s += 12;
  if (l.email) s += 10;
  if (l.company) s += 14;
  if (l.business_type) s += 10;
  if (l.notes && l.notes.length > 20) s += 8;
  if (l.last_contact_date) {
    const days = (Date.now() - new Date(l.last_contact_date).getTime()) / 86400000;
    if (days < 7) s += 14;
    else if (days < 30) s += 7;
  }
  if ((l.source || '').toLowerCase().includes('whatsapp')) s += 7;
  return Math.min(100, s);
};

const stageOf = (score: number, qualif?: string | null): 'SQL' | 'MQL' | 'Lead' | 'Descartar' => {
  if (qualif === 'SQL' || qualif === 'MQL' || qualif === 'Lead' || qualif === 'Descartar') return qualif;
  if (score >= 75) return 'SQL';
  if (score >= 50) return 'MQL';
  if (score >= 25) return 'Lead';
  return 'Descartar';
};

const scoreColor = (score: number) => {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-blue-500';
  if (score >= 40) return 'text-amber-500';
  return 'text-muted-foreground';
};

const scoreBg = (score: number) => {
  if (score >= 80) return 'from-emerald-500/20 to-emerald-500/5 border-emerald-500/30';
  if (score >= 60) return 'from-blue-500/20 to-blue-500/5 border-blue-500/30';
  if (score >= 40) return 'from-amber-500/20 to-amber-500/5 border-amber-500/30';
  return 'from-muted/40 to-muted/10 border-border';
};

const stageBadge = (stage: string) => ({
  SQL: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30',
  MQL: 'bg-blue-500/10 text-blue-600 border-blue-500/30',
  Lead: 'bg-amber-500/10 text-amber-600 border-amber-500/30',
  Descartar: 'bg-muted text-muted-foreground border-border',
}[stage] || 'bg-muted');

const stageIcon = (stage: string) => {
  if (stage === 'SQL') return <Flame className="h-3 w-3" />;
  if (stage === 'MQL') return <TrendingUp className="h-3 w-3" />;
  if (stage === 'Lead') return <Snowflake className="h-3 w-3" />;
  return <Inbox className="h-3 w-3" />;
};

const intentColor = (intent?: string) => {
  if (intent === 'alto') return 'text-emerald-600 bg-emerald-500/10';
  if (intent === 'medio') return 'text-amber-600 bg-amber-500/10';
  return 'text-muted-foreground bg-muted';
};

const sourceLabel: Record<string, string> = {
  whatsapp: 'WhatsApp', manual: 'Manual', site: 'Site',
  instagram: 'Instagram', indicacao: 'Indicação', evento: 'Evento',
};

const fmtBRL = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const leadSchema = z.object({
  name: z.string().trim().min(1, 'Nome obrigatório').max(120),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  email: z.string().trim().email('E-mail inválido').max(255).optional().or(z.literal('')),
  company: z.string().trim().max(120).optional().or(z.literal('')),
  business_type: z.string().trim().max(80).optional().or(z.literal('')),
  source: z.string().trim().max(60).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

type EnrichedLead = Lead & {
  _score: number;
  _stage: 'SQL' | 'MQL' | 'Lead' | 'Descartar';
  _ai?: ProspectAI;
  _hasAI: boolean;
};

export function SalesProspecting({ customerProductId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [aiMap, setAiMap] = useState<Map<string, ProspectAI>>(new Map());
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'recent' | 'name'>('score');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [qualifying, setQualifying] = useState(false);
  const [icpDialogOpen, setIcpDialogOpen] = useState(false);
  const [icp, setIcp] = useState('');
  const [detailLead, setDetailLead] = useState<EnrichedLead | null>(null);

  const [form, setForm] = useState({
    name: '', phone: '', email: '', company: '',
    business_type: '', source: 'manual', notes: '',
  });

  const [waLeads, setWaLeads] = useState<any[]>([]);
  const [waLoading, setWaLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchLeads = useCallback(async () => {
    if (!customerProductId) return;
    setLoading(true);
    const [{ data: leadData }, { data: aiData }] = await Promise.all([
      (supabase as any)
        .from('crm_customers')
        .select('id,name,company,business_type,phone,email,status,source,notes,last_contact_date,created_at')
        .eq('customer_product_id', customerProductId)
        .order('created_at', { ascending: false })
        .limit(500),
      (supabase as any)
        .from('sa_prospects')
        .select('email,phone,ai_score,qualification,ai_analysis,tags,updated_at')
        .eq('customer_product_id', customerProductId)
        .limit(500),
    ]);

    setLeads(leadData || []);
    const m = new Map<string, ProspectAI>();
    (aiData || []).forEach((p: ProspectAI) => {
      const key = (p.email || p.phone || '').toLowerCase();
      if (key) m.set(key, p);
    });
    setAiMap(m);
    setLoading(false);
  }, [customerProductId]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Realtime
  useEffect(() => {
    if (!customerProductId) return;
    const channel = (supabase as any)
      .channel(`crm_customers_${customerProductId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'crm_customers', filter: `customer_product_id=eq.${customerProductId}` },
        () => fetchLeads())
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'sa_prospects', filter: `customer_product_id=eq.${customerProductId}` },
        () => fetchLeads())
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [customerProductId, fetchLeads]);

  const syncFromWhatsApp = async () => {
    setSyncing(true);
    try {
      const { data: waData } = await (supabase as any)
        .from('whatsapp_leads')
        .select('id,phone_number,first_message,product_slug,created_at,status')
        .order('created_at', { ascending: false })
        .limit(200);

      const { data: existing } = await (supabase as any)
        .from('crm_customers')
        .select('phone')
        .eq('customer_product_id', customerProductId);

      const existingPhones = new Set((existing || []).map((c: any) => (c.phone || '').replace(/\D/g, '')));
      const toInsert = (waData || [])
        .filter((w: any) => w.phone_number && !existingPhones.has(w.phone_number.replace(/\D/g, '')))
        .map((w: any) => ({
          customer_product_id: customerProductId,
          name: `Lead WhatsApp ${w.phone_number.slice(-4)}`,
          phone: w.phone_number,
          source: 'whatsapp',
          status: 'novo',
          notes: w.first_message?.slice(0, 500) || null,
          last_contact_date: w.created_at,
        }));

      if (toInsert.length === 0) {
        toast({ title: 'Tudo sincronizado', description: 'Nenhum lead novo do WhatsApp.' });
      } else {
        const { error } = await (supabase as any).from('crm_customers').insert(toInsert);
        if (error) throw error;
        toast({ title: 'Sincronizado', description: `${toInsert.length} novo(s) lead(s) importado(s).` });
        fetchLeads();
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  };

  const qualifyAll = async (only?: string[]) => {
    setQualifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('sa-prospect-ai', {
        body: { customerProductId, leadIds: only, icp: icp || undefined },
      });
      if (error) throw error;
      toast({
        title: 'Qualificação concluída',
        description: `${data?.qualified || 0} lead(s) analisado(s) pela IA.`,
      });
      fetchLeads();
    } catch (e: any) {
      toast({ title: 'Erro na qualificação IA', description: e.message, variant: 'destructive' });
    } finally {
      setQualifying(false);
    }
  };

  const openDialog = () => {
    setForm({ name: '', phone: '', email: '', company: '', business_type: '', source: 'manual', notes: '' });
    setSelected(new Set());
    setDialogOpen(true);
    loadWhatsAppCandidates();
  };

  const loadWhatsAppCandidates = async () => {
    setWaLoading(true);
    const { data } = await (supabase as any)
      .from('whatsapp_leads')
      .select('id,phone_number,first_message,created_at,status')
      .order('created_at', { ascending: false })
      .limit(100);

    const { data: existing } = await (supabase as any)
      .from('crm_customers')
      .select('phone')
      .eq('customer_product_id', customerProductId);
    const phones = new Set((existing || []).map((c: any) => (c.phone || '').replace(/\D/g, '')));
    setWaLeads((data || []).filter((w: any) => w.phone_number && !phones.has(w.phone_number.replace(/\D/g, ''))));
    setWaLoading(false);
  };

  const saveManual = async () => {
    const parsed = leadSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: 'Dados inválidos', description: parsed.error.issues[0].message, variant: 'destructive' });
      return;
    }
    setSaving(true);
    const payload = {
      customer_product_id: customerProductId,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      company: parsed.data.company || null,
      business_type: parsed.data.business_type || null,
      source: parsed.data.source || 'manual',
      notes: parsed.data.notes || null,
      status: 'novo',
    };
    const { error } = await (supabase as any).from('crm_customers').insert(payload);
    setSaving(false);
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Lead criado', description: 'Disponível em todo o CRM.' });
    setDialogOpen(false);
    fetchLeads();
  };

  const importSelected = async () => {
    if (selected.size === 0) {
      toast({ title: 'Selecione ao menos 1 lead', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const rows = waLeads
      .filter((w) => selected.has(w.id))
      .map((w) => ({
        customer_product_id: customerProductId,
        name: `Lead WhatsApp ${w.phone_number.slice(-4)}`,
        phone: w.phone_number,
        source: 'whatsapp',
        status: 'novo',
        notes: w.first_message?.slice(0, 500) || null,
        last_contact_date: w.created_at,
      }));
    const { error } = await (supabase as any).from('crm_customers').insert(rows);
    setSaving(false);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Importado', description: `${rows.length} lead(s) adicionado(s).` });
    setDialogOpen(false);
    fetchLeads();
  };

  // Derivações
  const enriched: EnrichedLead[] = useMemo(() => leads.map((l) => {
    const key = (l.email || l.phone || '').toLowerCase();
    const ai = key ? aiMap.get(key) : undefined;
    const score = ai?.ai_score ?? baseScore(l);
    return {
      ...l,
      _score: score,
      _stage: stageOf(score, ai?.qualification),
      _ai: ai,
      _hasAI: !!ai,
    };
  }), [leads, aiMap]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    leads.forEach((l) => l.source && set.add(l.source));
    return Array.from(set);
  }, [leads]);

  const total = enriched.length;
  const sqls = enriched.filter((p) => p._stage === 'SQL');
  const mqls = enriched.filter((p) => p._stage === 'MQL');
  const cold = enriched.filter((p) => p._stage === 'Lead');
  const trash = enriched.filter((p) => p._stage === 'Descartar');
  const aiQualified = enriched.filter((p) => p._hasAI).length;
  const avgScore = total ? Math.round(enriched.reduce((s, p) => s + p._score, 0) / total) : 0;
  const conversion = mqls.length ? Math.round((sqls.length / (mqls.length + sqls.length)) * 100) : 0;
  const totalPipeline = enriched.reduce((s, p) => s + (Number(p._ai?.ai_analysis?.estimated_ticket_brl) || 0), 0);
  const last7d = enriched.filter((p) => (Date.now() - new Date(p.created_at).getTime()) < 7 * 86400000).length;

  const filtered = (list: EnrichedLead[]) => {
    let result = list;
    if (sourceFilter !== 'all') {
      result = result.filter((p) => p.source === sourceFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.company || '').toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p._ai?.ai_analysis?.summary || '').toLowerCase().includes(q)
      );
    }
    if (sortBy === 'score') result = [...result].sort((a, b) => b._score - a._score);
    if (sortBy === 'recent') result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (sortBy === 'name') result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    return result;
  };

  const renderLeadCard = (lead: EnrichedLead) => {
    const ai = lead._ai?.ai_analysis;
    const intent = ai?.intent;
    const ticket = Number(ai?.estimated_ticket_brl) || 0;
    const stage = lead._stage;
    return (
      <Card
        key={lead.id}
        onClick={() => setDetailLead(lead)}
        className={cn(
          'group relative cursor-pointer overflow-hidden transition-all hover:shadow-md hover:border-primary/40 bg-gradient-to-br',
          scoreBg(lead._score),
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            {/* Score circular */}
            <div className="shrink-0">
              <div className={cn(
                'relative w-14 h-14 rounded-full border-2 flex items-center justify-center bg-background/80 backdrop-blur',
                stage === 'SQL' ? 'border-emerald-500' :
                stage === 'MQL' ? 'border-blue-500' :
                stage === 'Lead' ? 'border-amber-500' : 'border-border'
              )}>
                <span className={cn('text-lg font-bold tabular-nums', scoreColor(lead._score))}>
                  {lead._score}
                </span>
                {lead._hasAI && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center ring-2 ring-background">
                    <Sparkles className="h-2.5 w-2.5 text-primary-foreground" />
                  </div>
                )}
              </div>
            </div>

            {/* Info principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{lead.name}</p>
                    <Badge variant="outline" className={cn('gap-1 text-[10px]', stageBadge(stage))}>
                      {stageIcon(stage)} {stage}
                    </Badge>
                    {intent && (
                      <Badge variant="outline" className={cn('text-[10px]', intentColor(intent))}>
                        Intent {intent}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {[lead.business_type, lead.company].filter(Boolean).join(' · ') || 'Sem contexto'}
                  </p>
                  {ai?.summary && (
                    <p className="text-xs text-foreground/80 mt-1.5 line-clamp-1">{ai.summary}</p>
                  )}
                </div>

                {ticket > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground">Ticket est.</p>
                    <p className="text-sm font-bold text-emerald-600">{fmtBRL(ticket)}</p>
                  </div>
                )}
              </div>

              {/* Ações sugeridas pela IA */}
              {ai?.next_best_action && (
                <div className="mt-2 flex items-start gap-1.5 p-2 rounded-md bg-background/60 border border-border/50">
                  <Wand2 className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-foreground/90 line-clamp-1">{ai.next_best_action}</p>
                </div>
              )}

              {/* Footer chips */}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {lead.source && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Layers className="h-2.5 w-2.5" />
                    {sourceLabel[lead.source] || lead.source}
                  </span>
                )}
                {lead.phone && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Phone className="h-2.5 w-2.5" />
                    {lead.phone}
                  </span>
                )}
                {lead.email && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground truncate max-w-[160px]">
                    <Mail className="h-2.5 w-2.5" />
                    {lead.email}
                  </span>
                )}
                {ai?.tags?.slice(0, 2).map((t: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-[9px] py-0 h-4">{t}</Badge>
                ))}
              </div>
            </div>

            <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary transition-colors shrink-0 mt-2" />
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderList = (list: EnrichedLead[]) => {
    const items = filtered(list);
    if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    if (!items.length) {
      return (
        <div className="text-center py-16 text-sm text-muted-foreground">
          <Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum lead nessa categoria</p>
          <p className="text-xs mt-1">Capture leads via WhatsApp, importe ou cadastre manualmente.</p>
        </div>
      );
    }
    return <div className="grid gap-2.5 lg:grid-cols-2">{items.map(renderLeadCard)}</div>;
  };

  return (
    <TooltipProvider>
      <div className="space-y-5">
        {/* HEADER */}
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
                <Target className="h-5 w-5 text-primary" />
              </div>
              Prospecção & Qualificação IA
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Base unificada de leads com scoring inteligente, ICP fit, BANT e próximas ações sugeridas pela IA
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" size="sm" onClick={() => setIcpDialogOpen(true)}>
              <Brain className="h-4 w-4 mr-2" />ICP
            </Button>
            <Button variant="outline" size="sm" onClick={syncFromWhatsApp} disabled={syncing}>
              {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sincronizar
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => qualifyAll()}
              disabled={qualifying || total === 0}
              className="bg-gradient-to-r from-primary to-primary/80"
            >
              {qualifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Qualificar com IA
            </Button>
            <Button size="sm" onClick={openDialog}><Plus className="h-4 w-4 mr-2" />Novo lead</Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-6">
          <Card className="bg-gradient-to-br from-background to-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Badge variant="secondary" className="text-[9px] h-4">+{last7d} 7d</Badge>
              </div>
              <p className="text-2xl font-bold tabular-nums">{total}</p>
              <p className="text-[11px] text-muted-foreground">Leads totais</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-background border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <Flame className="h-4 w-4 text-emerald-500" />
                <span className="text-[10px] text-emerald-600 font-medium">SQL</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-emerald-600">{sqls.length}</p>
              <p className="text-[11px] text-muted-foreground">Qualificados</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-500/10 to-background border-blue-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <TrendingUp className="h-4 w-4 text-blue-500" />
                <span className="text-[10px] text-blue-600 font-medium">MQL</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-blue-600">{mqls.length}</p>
              <p className="text-[11px] text-muted-foreground">Em maturação</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-primary/10 to-background border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <Brain className="h-4 w-4 text-primary" />
                <span className="text-[10px] text-primary font-medium">IA</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-primary">{avgScore}</p>
              <Progress value={avgScore} className="h-1 mt-1" />
              <p className="text-[11px] text-muted-foreground mt-1">Score médio</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-500/10 to-background border-amber-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <Zap className="h-4 w-4 text-amber-500" />
                <span className="text-[10px] text-amber-600 font-medium">Conv.</span>
              </div>
              <p className="text-2xl font-bold tabular-nums text-amber-600">{conversion}%</p>
              <p className="text-[11px] text-muted-foreground">MQL → SQL</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-emerald-500/10 to-background border-emerald-500/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-1">
                <DollarSign className="h-4 w-4 text-emerald-500" />
                <Award className="h-3 w-3 text-emerald-600" />
              </div>
              <p className="text-lg font-bold tabular-nums text-emerald-600 truncate">{fmtBRL(totalPipeline)}</p>
              <p className="text-[11px] text-muted-foreground">Pipeline est.</p>
            </CardContent>
          </Card>
        </div>

        {/* STATUS IA */}
        {total > 0 && aiQualified < total && (
          <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
            <CardContent className="p-4 flex items-center gap-3 flex-wrap">
              <div className="p-2 rounded-lg bg-primary/10">
                <AlertCircle className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1 min-w-[200px]">
                <p className="font-medium text-sm">
                  {total - aiQualified} lead(s) sem qualificação IA
                </p>
                <p className="text-xs text-muted-foreground">
                  {aiQualified}/{total} já analisados — clique em "Qualificar com IA" para análise BANT, ICP fit e próximas ações.
                </p>
              </div>
              <Progress value={(aiQualified / total) * 100} className="w-32 h-2" />
            </CardContent>
          </Card>
        )}

        {/* LISTA + FILTROS */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <Tabs defaultValue="todos">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <TabsList>
                  <TabsTrigger value="todos" className="gap-1.5">Todos <Badge variant="secondary" className="h-4 text-[10px]">{total}</Badge></TabsTrigger>
                  <TabsTrigger value="sql" className="gap-1.5"><Flame className="h-3 w-3" />SQL <Badge variant="secondary" className="h-4 text-[10px]">{sqls.length}</Badge></TabsTrigger>
                  <TabsTrigger value="mql" className="gap-1.5"><TrendingUp className="h-3 w-3" />MQL <Badge variant="secondary" className="h-4 text-[10px]">{mqls.length}</Badge></TabsTrigger>
                  <TabsTrigger value="frio" className="gap-1.5"><Snowflake className="h-3 w-3" />Frios <Badge variant="secondary" className="h-4 text-[10px]">{cold.length}</Badge></TabsTrigger>
                  <TabsTrigger value="lixo" className="gap-1.5"><Inbox className="h-3 w-3" />Descartar <Badge variant="secondary" className="h-4 text-[10px]">{trash.length}</Badge></TabsTrigger>
                </TabsList>

                <div className="flex items-center gap-2 flex-wrap">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar lead, empresa, email..."
                      className="pl-8 h-9 w-64"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <Select value={sourceFilter} onValueChange={setSourceFilter}>
                    <SelectTrigger className="h-9 w-36">
                      <FilterIcon className="h-3 w-3 mr-1" />
                      <SelectValue placeholder="Origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas origens</SelectItem>
                      {sources.map((s) => (
                        <SelectItem key={s} value={s}>{sourceLabel[s] || s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="h-9 w-36">
                      <BarChart3 className="h-3 w-3 mr-1" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="score">Maior score</SelectItem>
                      <SelectItem value="recent">Mais recente</SelectItem>
                      <SelectItem value="name">Nome A-Z</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-4">
                <TabsContent value="todos">{renderList(enriched)}</TabsContent>
                <TabsContent value="sql">{renderList(sqls)}</TabsContent>
                <TabsContent value="mql">{renderList(mqls)}</TabsContent>
                <TabsContent value="frio">{renderList(cold)}</TabsContent>
                <TabsContent value="lixo">{renderList(trash)}</TabsContent>
              </div>
            </Tabs>
          </CardContent>
        </Card>

        {/* DETALHE LEAD - Sheet lateral */}
        <Sheet open={!!detailLead} onOpenChange={(o) => !o && setDetailLead(null)}>
          <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
            {detailLead && (
              <>
                <SheetHeader className="pb-4 border-b">
                  <div className="flex items-start gap-4">
                    <div className={cn(
                      'w-16 h-16 rounded-xl border-2 flex items-center justify-center bg-gradient-to-br',
                      scoreBg(detailLead._score),
                      detailLead._stage === 'SQL' ? 'border-emerald-500' :
                      detailLead._stage === 'MQL' ? 'border-blue-500' :
                      detailLead._stage === 'Lead' ? 'border-amber-500' : 'border-border'
                    )}>
                      <span className={cn('text-2xl font-bold', scoreColor(detailLead._score))}>
                        {detailLead._score}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <SheetTitle className="text-lg">{detailLead.name}</SheetTitle>
                      <SheetDescription className="flex items-center gap-2 mt-1 flex-wrap">
                        <Badge variant="outline" className={cn('gap-1', stageBadge(detailLead._stage))}>
                          {stageIcon(detailLead._stage)} {detailLead._stage}
                        </Badge>
                        {detailLead._hasAI && (
                          <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                            <Sparkles className="h-3 w-3 mr-1" />Analisado
                          </Badge>
                        )}
                      </SheetDescription>
                    </div>
                  </div>
                </SheetHeader>

                <div className="space-y-5 py-4">
                  {/* Contato */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contato</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {detailLead.company && (
                        <div className="flex items-center gap-2 p-2 rounded bg-muted/40">
                          <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{detailLead.company}</span>
                        </div>
                      )}
                      {detailLead.business_type && (
                        <div className="flex items-center gap-2 p-2 rounded bg-muted/40">
                          <Award className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{detailLead.business_type}</span>
                        </div>
                      )}
                      {detailLead.phone && (
                        <div className="flex items-center gap-2 p-2 rounded bg-muted/40">
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{detailLead.phone}</span>
                        </div>
                      )}
                      {detailLead.email && (
                        <div className="flex items-center gap-2 p-2 rounded bg-muted/40">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="truncate">{detailLead.email}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* IA Analysis */}
                  {detailLead._ai?.ai_analysis ? (
                    <>
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="h-3 w-3" /> Análise IA
                        </p>
                        {detailLead._ai.ai_analysis.summary && (
                          <p className="text-sm p-3 rounded-lg bg-primary/5 border border-primary/20">
                            {detailLead._ai.ai_analysis.summary}
                          </p>
                        )}

                        {/* ICP fit */}
                        {detailLead._ai.ai_analysis.icp_fit !== undefined && (
                          <div>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground">ICP Fit</span>
                              <span className="font-semibold">{detailLead._ai.ai_analysis.icp_fit}%</span>
                            </div>
                            <Progress value={detailLead._ai.ai_analysis.icp_fit} className="h-2" />
                          </div>
                        )}

                        {/* BANT */}
                        {detailLead._ai.ai_analysis.bant && (
                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(detailLead._ai.ai_analysis.bant).map(([k, v]) => (
                              <div key={k} className="p-2 rounded bg-muted/40 text-xs">
                                <p className="text-[10px] text-muted-foreground uppercase">{k}</p>
                                <p className="font-medium capitalize">{String(v).replace(/_/g, ' ')}</p>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Buying signals */}
                        {detailLead._ai.ai_analysis.buying_signals?.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Sinais de compra</p>
                            <div className="space-y-1">
                              {detailLead._ai.ai_analysis.buying_signals.map((s: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-emerald-500/5 border border-emerald-500/20">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 shrink-0" />
                                  {s}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Objeções */}
                        {detailLead._ai.ai_analysis.objections_likely?.length > 0 && (
                          <div>
                            <p className="text-xs text-muted-foreground mb-1.5">Objeções prováveis</p>
                            <div className="space-y-1">
                              {detailLead._ai.ai_analysis.objections_likely.map((s: string, i: number) => (
                                <div key={i} className="flex items-start gap-2 text-xs p-2 rounded bg-amber-500/5 border border-amber-500/20">
                                  <AlertCircle className="h-3 w-3 text-amber-500 mt-0.5 shrink-0" />
                                  {s}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Next action */}
                        {detailLead._ai.ai_analysis.next_best_action && (
                          <div className="p-3 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/30">
                            <p className="text-[10px] text-primary uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                              <Wand2 className="h-3 w-3" />Próxima ação
                            </p>
                            <p className="text-sm font-medium">{detailLead._ai.ai_analysis.next_best_action}</p>
                            <div className="flex gap-2 mt-2 text-[10px] text-muted-foreground">
                              {detailLead._ai.ai_analysis.best_channel && (
                                <span>📱 {detailLead._ai.ai_analysis.best_channel}</span>
                              )}
                              {detailLead._ai.ai_analysis.best_time && (
                                <span>🕐 {detailLead._ai.ai_analysis.best_time}</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="p-4 rounded-lg border border-dashed text-center">
                      <Brain className="h-6 w-6 mx-auto text-muted-foreground/50 mb-2" />
                      <p className="text-sm text-muted-foreground">Lead ainda não analisado pela IA</p>
                      <Button
                        size="sm"
                        className="mt-3"
                        onClick={() => qualifyAll([detailLead.id])}
                        disabled={qualifying}
                      >
                        {qualifying ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Sparkles className="h-3 w-3 mr-2" />}
                        Qualificar este lead
                      </Button>
                    </div>
                  )}

                  {detailLead.notes && (
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Notas</p>
                      <p className="text-sm p-3 rounded-lg bg-muted/40">{detailLead.notes}</p>
                    </div>
                  )}
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>

        {/* ICP Dialog */}
        <Dialog open={icpDialogOpen} onOpenChange={setIcpDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Definir ICP (Cliente Ideal)</DialogTitle>
              <DialogDescription>
                Descreva seu cliente ideal para que a IA priorize melhor seus leads. Ex: "Restaurantes em SP com 5-50 funcionários, ticket médio R$80, dor com gestão de pedidos".
              </DialogDescription>
            </DialogHeader>
            <Textarea
              value={icp}
              onChange={(e) => setIcp(e.target.value)}
              placeholder="Segmento, porte, localização, dor principal..."
              rows={6}
              maxLength={1000}
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIcpDialogOpen(false)}>Cancelar</Button>
              <Button onClick={() => { setIcpDialogOpen(false); toast({ title: 'ICP salvo', description: 'Será usado nas próximas qualificações.' }); }}>
                Salvar
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal Novo Lead */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Novo lead</DialogTitle>
              <DialogDescription>Cadastre manualmente ou importe da fila do WhatsApp.</DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="manual">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual"><Plus className="h-4 w-4 mr-2" />Cadastro manual</TabsTrigger>
                <TabsTrigger value="whatsapp"><MessageCircle className="h-4 w-4 mr-2" />Importar do WhatsApp</TabsTrigger>
              </TabsList>

              <TabsContent value="manual" className="space-y-3 pt-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Nome *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={120} />
                  </div>
                  <div>
                    <Label>Telefone</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={30} />
                  </div>
                  <div>
                    <Label>E-mail</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} />
                  </div>
                  <div>
                    <Label>Empresa</Label>
                    <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} maxLength={120} />
                  </div>
                  <div>
                    <Label>Segmento / Cargo</Label>
                    <Input value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })} maxLength={80} />
                  </div>
                  <div className="col-span-2">
                    <Label>Origem</Label>
                    <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="manual">Manual</SelectItem>
                        <SelectItem value="whatsapp">WhatsApp</SelectItem>
                        <SelectItem value="indicacao">Indicação</SelectItem>
                        <SelectItem value="site">Site</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="evento">Evento</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label>Observações</Label>
                    <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} maxLength={1000} />
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button onClick={saveManual} disabled={saving}>
                    {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Salvar lead
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="whatsapp" className="space-y-3 pt-3">
                {waLoading ? (
                  <div className="py-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : waLeads.length === 0 ? (
                  <div className="text-center py-10 text-sm text-muted-foreground">
                    <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
                    Nenhum lead novo do WhatsApp.
                  </div>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">{waLeads.length} lead(s) ainda não importado(s).</p>
                    <ScrollArea className="h-72 border rounded-md">
                      <div className="p-2 space-y-1">
                        {waLeads.map((w) => (
                          <label key={w.id} className="flex items-start gap-3 p-2 rounded hover:bg-muted/40 cursor-pointer">
                            <Checkbox
                              checked={selected.has(w.id)}
                              onCheckedChange={(v) => {
                                const n = new Set(selected);
                                if (v) n.add(w.id); else n.delete(w.id);
                                setSelected(n);
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3 w-3 text-muted-foreground" />
                                <span className="font-medium">{w.phone_number}</span>
                                <Badge variant="secondary" className="text-[10px]">{w.status || 'novo'}</Badge>
                              </div>
                              {w.first_message && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{w.first_message}</p>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </ScrollArea>
                    <div className="flex justify-between items-center pt-2">
                      <p className="text-xs text-muted-foreground">{selected.size} selecionado(s)</p>
                      <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={importSelected} disabled={saving || selected.size === 0}>
                          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}Importar selecionados
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
