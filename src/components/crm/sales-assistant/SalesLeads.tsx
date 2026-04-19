import { useEffect, useMemo, useState, useCallback } from 'react';
import { z } from 'zod';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useCRMLeads, CRMLead } from '@/contexts/CRMLeadsContext';
import { cn } from '@/lib/utils';
import {
  Sparkles, Target, TrendingUp, Search, Plus, Brain, Zap, Loader2, Inbox,
  RefreshCw, Phone, Mail, Building2, ChevronRight, Award, Flame, Snowflake,
  BarChart3, Wand2, AlertCircle, DollarSign, Users, Layers, Filter as FilterIcon,
  Globe2, ExternalLink, CheckCircle2, Trash2, UserPlus, Clock, MapPin, Tag,
  Calendar, Save, Radio, Newspaper, Briefcase,
} from 'lucide-react';

interface Props { customerProductId: string; }

interface InternalLead {
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
}

// ---------------- helpers ----------------
const baseScore = (l: InternalLead): number => {
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

const scoreColorClass = (s: number) =>
  s >= 80 ? 'text-emerald-500' : s >= 60 ? 'text-blue-500' : s >= 40 ? 'text-amber-500' : 'text-muted-foreground';

const scoreBgGradient = (s: number) =>
  s >= 80 ? 'from-emerald-500/15 to-emerald-500/5 border-emerald-500/30'
  : s >= 60 ? 'from-blue-500/15 to-blue-500/5 border-blue-500/30'
  : s >= 40 ? 'from-amber-500/15 to-amber-500/5 border-amber-500/30'
  : 'from-muted/30 to-muted/5 border-border';

const stageBadgeClass = (stage: string) => ({
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

const sizeMeta: Record<string, { label: string; color: string }> = {
  micro: { label: 'Micro', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  pequena: { label: 'Pequena', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  media: { label: 'Média', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  grande: { label: 'Grande', color: 'bg-orange-500/10 text-orange-600 border-orange-500/30' },
};

const STATUS_OPTS = [
  { value: 'new', label: 'Novo', color: 'bg-blue-500/10 text-blue-600 border-blue-500/30' },
  { value: 'reviewing', label: 'Em análise', color: 'bg-purple-500/10 text-purple-600 border-purple-500/30' },
  { value: 'contacted', label: 'Contatado', color: 'bg-amber-500/10 text-amber-600 border-amber-500/30' },
  { value: 'qualified', label: 'Qualificado', color: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30' },
  { value: 'discarded', label: 'Descartado', color: 'bg-muted text-muted-foreground border-border' },
];

const sourceLabel: Record<string, string> = {
  whatsapp: 'WhatsApp', manual: 'Manual', site: 'Site',
  instagram: 'Instagram', indicacao: 'Indicação', evento: 'Evento',
};

const fmtBRL = (n: number) =>
  n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const timeAgo = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'agora';
  if (d < 3600) return `${Math.floor(d / 60)}min`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
};

const leadSchema = z.object({
  name: z.string().trim().min(1, 'Nome obrigatório').max(120),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  email: z.string().trim().email('E-mail inválido').max(255).optional().or(z.literal('')),
  company: z.string().trim().max(120).optional().or(z.literal('')),
  business_type: z.string().trim().max(80).optional().or(z.literal('')),
  source: z.string().trim().max(60).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

type EnrichedLead = InternalLead & {
  _score: number;
  _stage: 'SQL' | 'MQL' | 'Lead' | 'Descartar';
  _ai?: ProspectAI;
  _hasAI: boolean;
};

// ====================== Component ======================
export function SalesLeads({ customerProductId }: Props) {
  const { toast } = useToast();
  // External web-scan leads (sa_trigger_events) via global context
  const { leads: webLeads, refresh: refreshWebLeads, updateStatus, removeLead, stats: webStats } = useCRMLeads();

  // Internal CRM leads (crm_customers)
  const [internalLoading, setInternalLoading] = useState(true);
  const [internalLeads, setInternalLeads] = useState<InternalLead[]>([]);
  const [aiMap, setAiMap] = useState<Map<string, ProspectAI>>(new Map());

  // Tabs / filters
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'recent' | 'name'>('score');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');
  const [webFilter, setWebFilter] = useState<string>('all');
  const [stageTab, setStageTab] = useState<'todos' | 'sql' | 'mql' | 'frio' | 'lixo'>('todos');

  // Dialogs
  const [newLeadOpen, setNewLeadOpen] = useState(false);
  const [icpDialogOpen, setIcpDialogOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [detailLead, setDetailLead] = useState<EnrichedLead | null>(null);
  const [detailWeb, setDetailWeb] = useState<CRMLead | null>(null);

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [qualifying, setQualifying] = useState(false);
  const [qualifyingOne, setQualifyingOne] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [icpSaving, setIcpSaving] = useState(false);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '', phone: '', email: '', company: '', business_type: '', source: 'manual', notes: '',
  });

  // ICP / scan
  const [icp, setIcp] = useState('');
  const [scanSources, setScanSources] = useState<Record<string, boolean>>({
    news_br: true, tech_intl: true, reviews: true,
  });

  // ---------------- data load ----------------
  const fetchInternal = useCallback(async () => {
    if (!customerProductId) return;
    setInternalLoading(true);
    const [{ data: leadData }, { data: aiData }, { data: cfg }] = await Promise.all([
      (supabase as any).from('crm_customers')
        .select('id,name,company,business_type,phone,email,status,source,notes,last_contact_date,created_at')
        .eq('customer_product_id', customerProductId)
        .order('created_at', { ascending: false }).limit(500),
      (supabase as any).from('sa_prospects')
        .select('email,phone,ai_score,qualification,ai_analysis,tags')
        .eq('customer_product_id', customerProductId).limit(500),
      (supabase as any).from('sa_config')
        .select('icp_description').eq('customer_product_id', customerProductId).maybeSingle(),
    ]);
    setInternalLeads(leadData || []);
    const m = new Map<string, ProspectAI>();
    (aiData || []).forEach((p: ProspectAI) => {
      const key = (p.email || p.phone || '').toLowerCase();
      if (key) m.set(key, p);
    });
    setAiMap(m);
    if (cfg?.icp_description) setIcp(cfg.icp_description);
    setInternalLoading(false);
  }, [customerProductId]);

  useEffect(() => { fetchInternal(); }, [fetchInternal]);

  // Sync notes draft + reflect refreshes into the open detail sheet
  useEffect(() => {
    if (detailLead) {
      const fresh = internalLeads.find((l) => l.id === detailLead.id);
      if (fresh) {
        const key = (fresh.email || fresh.phone || '').toLowerCase();
        const ai = key ? aiMap.get(key) : undefined;
        const score = ai?.ai_score ?? baseScore(fresh);
        setDetailLead({ ...fresh, _score: score, _stage: stageOf(score, ai?.qualification), _ai: ai, _hasAI: !!ai });
      }
      setNotesDraft(detailLead.notes || '');
    } else {
      setNotesDraft('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detailLead?.id, internalLeads, aiMap]);

  useEffect(() => {
    if (!customerProductId) return;
    const ch = (supabase as any)
      .channel(`leads_internal_${customerProductId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'crm_customers', filter: `customer_product_id=eq.${customerProductId}` },
        () => fetchInternal())
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'sa_prospects', filter: `customer_product_id=eq.${customerProductId}` },
        () => fetchInternal())
      .subscribe();
    return () => { (supabase as any).removeChannel(ch); };
  }, [customerProductId, fetchInternal]);

  // ---------------- actions ----------------
  const syncFromWhatsApp = async () => {
    setSyncing(true);
    try {
      const { data: waData } = await (supabase as any)
        .from('whatsapp_leads').select('id,phone_number,first_message,created_at')
        .order('created_at', { ascending: false }).limit(200);
      const { data: existing } = await (supabase as any)
        .from('crm_customers').select('phone').eq('customer_product_id', customerProductId);
      const existingPhones = new Set((existing || []).map((c: any) => (c.phone || '').replace(/\D/g, '')));
      const toInsert = (waData || [])
        .filter((w: any) => w.phone_number && !existingPhones.has(w.phone_number.replace(/\D/g, '')))
        .map((w: any) => ({
          customer_product_id: customerProductId,
          name: `Lead WhatsApp ${w.phone_number.slice(-4)}`,
          phone: w.phone_number, source: 'whatsapp', status: 'novo',
          notes: w.first_message?.slice(0, 500) || null,
          last_contact_date: w.created_at,
        }));
      if (toInsert.length === 0) {
        toast({ title: 'Tudo sincronizado', description: 'Nenhum lead novo do WhatsApp.' });
      } else {
        await (supabase as any).from('crm_customers').insert(toInsert);
        toast({ title: 'Sincronizado', description: `${toInsert.length} novo(s) lead(s) importado(s).` });
        fetchInternal();
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally { setSyncing(false); }
  };

  const qualifyAll = async () => {
    setQualifying(true);
    try {
      const { error } = await supabase.functions.invoke('sa-prospect-ai', {
        body: { customerProductId, icp: icp || undefined },
      });
      if (error) throw error;
      toast({ title: '✨ Qualificação concluída', description: 'IA analisou seus leads (BANT + ICP).' });
      fetchInternal();
    } catch (e: any) {
      toast({ title: 'Erro na qualificação IA', description: e.message, variant: 'destructive' });
    } finally { setQualifying(false); }
  };

  const qualifySingleLead = async (leadId: string) => {
    setQualifyingOne(true);
    try {
      const { data, error } = await supabase.functions.invoke('sa-prospect-ai', {
        body: { customerProductId, leadIds: [leadId], icp: icp || undefined },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast({ title: '✨ Lead qualificado pela IA', description: 'Análise BANT + ICP atualizada.' });
      await fetchInternal();
    } catch (e: any) {
      toast({ title: 'Erro na qualificação', description: e.message, variant: 'destructive' });
    } finally { setQualifyingOne(false); }
  };

  const saveLeadNotes = async (leadId: string) => {
    setSavingNotes(true);
    const { error } = await (supabase as any)
      .from('crm_customers')
      .update({ notes: notesDraft || null, last_contact_date: new Date().toISOString() })
      .eq('id', leadId);
    setSavingNotes(false);
    if (error) {
      toast({ title: 'Erro ao salvar notas', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: '📝 Notas salvas' });
    await fetchInternal();
  };

  const saveManual = async () => {
    const parsed = leadSchema.safeParse(form);
    if (!parsed.success) {
      toast({ title: 'Dados inválidos', description: parsed.error.issues[0].message, variant: 'destructive' });
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any).from('crm_customers').insert({
      customer_product_id: customerProductId,
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      email: parsed.data.email || null,
      company: parsed.data.company || null,
      business_type: parsed.data.business_type || null,
      source: parsed.data.source || 'manual',
      notes: parsed.data.notes || null,
      status: 'novo',
    });
    setSaving(false);
    if (error) { toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' }); return; }
    toast({ title: 'Lead criado' });
    setNewLeadOpen(false);
    setForm({ name: '', phone: '', email: '', company: '', business_type: '', source: 'manual', notes: '' });
    fetchInternal();
  };

  const saveIcp = async () => {
    if (!icp.trim()) { toast({ title: 'Descreva seu cliente ideal', variant: 'destructive' }); return; }
    setIcpSaving(true);
    const { data: cfg } = await (supabase as any).from('sa_config')
      .select('id').eq('customer_product_id', customerProductId).maybeSingle();
    const { error } = await (supabase as any).from('sa_config').upsert({
      ...(cfg?.id ? { id: cfg.id } : {}),
      customer_product_id: customerProductId,
      icp_description: icp.trim(),
    }, { onConflict: 'customer_product_id' });
    setIcpSaving(false);
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    else toast({ title: '✅ ICP salvo', description: 'A IA usará isso na qualificação e varredura.' });
  };

  const runScan = async () => {
    if (!icp.trim()) { toast({ title: 'Defina o ICP primeiro', description: 'Salve o perfil do cliente ideal antes.', variant: 'destructive' }); return; }
    const sources = Object.entries(scanSources).filter(([, v]) => v).map(([k]) => k);
    if (sources.length === 0) { toast({ title: 'Selecione ao menos uma fonte', variant: 'destructive' }); return; }
    setScanning(true);
    try {
      const { data, error } = await supabase.functions.invoke('sa-prospect-scan', {
        body: { customer_product_id: customerProductId, sources, max_results: 15 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message || 'Falha no scan');
      toast({
        title: `🎯 ${data.total_scored || 0} prospects encontrados`,
        description: `${data.total_hot || 0} leads quentes (score ≥75).`,
      });
      setScanOpen(false);
      refreshWebLeads();
      // Refresca a Central de Leads (crm_customers) — os prospects foram auto-salvos pela edge function
      await fetchInternal();
    } catch (e: any) {
      toast({ title: 'Falha na busca', description: e.message, variant: 'destructive' });
    } finally { setScanning(false); }
  };

  const convertWebToClient = async (lead: CRMLead) => {
    setConvertingId(lead.id);
    try {
      const company = lead.metadata?.company || lead.title.split(':')[0]?.trim() || 'Empresa';
      const { error } = await (supabase as any).from('crm_customers').insert({
        customer_product_id: customerProductId,
        name: company, company,
        business_type: lead.metadata?.sector || null,
        status: 'lead',
        source: `web-scan · ${lead.source || 'web'}`,
        notes: [
          `🎯 Score: ${lead.relevance_score || 0}/100`,
          lead.metadata?.company_size ? `📊 Porte: ${sizeMeta[lead.metadata.company_size]?.label || lead.metadata.company_size}` : null,
          lead.description ? `💡 Motivo: ${lead.description}` : null,
          lead.metadata?.suggested_action ? `⚡ Ação sugerida: ${lead.metadata.suggested_action}` : null,
          lead.source_url ? `🔗 Fonte: ${lead.source_url}` : null,
        ].filter(Boolean).join('\n'),
      });
      if (error) throw error;
      await updateStatus(lead.id, 'qualified');
      toast({ title: '✅ Lead convertido em cliente', description: company });
      setDetailWeb(null);
      fetchInternal();
    } catch (e: any) {
      toast({ title: 'Erro ao converter', description: e.message, variant: 'destructive' });
    } finally { setConvertingId(null); }
  };

  const handleDeleteWeb = async (id: string) => {
    if (!confirm('Excluir este lead?')) return;
    await removeLead(id);
    if (detailWeb?.id === id) setDetailWeb(null);
    toast({ title: 'Lead removido' });
  };

  // ---------------- derived ----------------
  const enriched: EnrichedLead[] = useMemo(() => internalLeads.map((l) => {
    const key = (l.email || l.phone || '').toLowerCase();
    const ai = key ? aiMap.get(key) : undefined;
    const score = ai?.ai_score ?? baseScore(l);
    return { ...l, _score: score, _stage: stageOf(score, ai?.qualification), _ai: ai, _hasAI: !!ai };
  }), [internalLeads, aiMap]);

  const sources = useMemo(() => {
    const set = new Set<string>();
    internalLeads.forEach((l) => l.source && set.add(l.source));
    return Array.from(set);
  }, [internalLeads]);

  const total = enriched.length;
  const sqls = enriched.filter((p) => p._stage === 'SQL');
  const mqls = enriched.filter((p) => p._stage === 'MQL');
  const cold = enriched.filter((p) => p._stage === 'Lead');
  const trash = enriched.filter((p) => p._stage === 'Descartar');
  const aiQualified = enriched.filter((p) => p._hasAI).length;
  const avgScore = total ? Math.round(enriched.reduce((s, p) => s + p._score, 0) / total) : 0;
  const conversion = (mqls.length + sqls.length) > 0 ? Math.round((sqls.length / (mqls.length + sqls.length)) * 100) : 0;
  const totalPipeline = enriched.reduce((s, p) => s + (Number(p._ai?.ai_analysis?.estimated_ticket_brl) || 0), 0);
  const last7d = enriched.filter((p) => (Date.now() - new Date(p.created_at).getTime()) < 7 * 86400000).length;

  const filteredInternal = (list: EnrichedLead[]) => {
    let r = list;
    if (sourceFilter !== 'all') r = r.filter((p) => p.source === sourceFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((p) =>
        p.name.toLowerCase().includes(q) ||
        (p.company || '').toLowerCase().includes(q) ||
        (p.phone || '').toLowerCase().includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p._ai?.ai_analysis?.summary || '').toLowerCase().includes(q)
      );
    }
    if (sortBy === 'score') r = [...r].sort((a, b) => b._score - a._score);
    if (sortBy === 'recent') r = [...r].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    if (sortBy === 'name') r = [...r].sort((a, b) => a.name.localeCompare(b.name));
    return r;
  };

  const filteredWeb = useMemo(() => webLeads.filter((l) => {
    if (webFilter === 'hot' && (l.relevance_score || 0) < 75) return false;
    if (webFilter === 'warm' && ((l.relevance_score || 0) < 60 || (l.relevance_score || 0) >= 75)) return false;
    if (statusFilter !== 'all' && l.status !== statusFilter) return false;
    if (sizeFilter !== 'all' && l.metadata?.company_size !== sizeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${l.title} ${l.description || ''} ${l.metadata?.company || ''} ${l.metadata?.sector || ''}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }), [webLeads, webFilter, statusFilter, sizeFilter, search]);

  // ---------------- renderers ----------------
  const renderInternalCard = (lead: EnrichedLead) => {
    const ai = lead._ai?.ai_analysis;
    const intent = ai?.intent;
    const ticket = Number(ai?.estimated_ticket_brl) || 0;
    return (
      <Card
        key={lead.id}
        onClick={() => setDetailLead(lead)}
        className={cn(
          'group relative cursor-pointer overflow-hidden transition-all hover:shadow-md hover:border-primary/40 bg-gradient-to-br',
          scoreBgGradient(lead._score),
        )}
      >
        <CardContent className="p-4">
          <div className="flex items-start gap-4">
            <div className="shrink-0">
              <div className={cn(
                'relative w-14 h-14 rounded-full border-2 flex items-center justify-center bg-background/80 backdrop-blur',
                lead._stage === 'SQL' ? 'border-emerald-500' :
                lead._stage === 'MQL' ? 'border-blue-500' :
                lead._stage === 'Lead' ? 'border-amber-500' : 'border-border'
              )}>
                <span className={cn('text-lg font-bold tabular-nums', scoreColorClass(lead._score))}>{lead._score}</span>
                {lead._hasAI && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center ring-2 ring-background">
                    <Sparkles className="h-2.5 w-2.5 text-primary-foreground" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm truncate">{lead.name}</p>
                    <Badge variant="outline" className={cn('gap-1 text-[10px]', stageBadgeClass(lead._stage))}>
                      {stageIcon(lead._stage)} {lead._stage}
                    </Badge>
                    {intent && (
                      <Badge variant="outline" className={cn('text-[10px]',
                        intent === 'alto' ? 'text-emerald-600 bg-emerald-500/10' :
                        intent === 'medio' ? 'text-amber-600 bg-amber-500/10' :
                        'text-muted-foreground bg-muted'
                      )}>
                        Intent {intent}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {[lead.business_type, lead.company].filter(Boolean).join(' · ') || 'Sem contexto'}
                  </p>
                  {ai?.summary && <p className="text-xs text-foreground/80 mt-1.5 line-clamp-1">{ai.summary}</p>}
                </div>
                {ticket > 0 && (
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground">Ticket est.</p>
                    <p className="text-sm font-bold text-emerald-600">{fmtBRL(ticket)}</p>
                  </div>
                )}
              </div>
              {ai?.next_best_action && (
                <div className="mt-2 flex items-start gap-1.5 p-2 rounded-md bg-background/60 border border-border/50">
                  <Wand2 className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                  <p className="text-[11px] text-foreground/90 line-clamp-1">{ai.next_best_action}</p>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                {lead.source && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Layers className="h-2.5 w-2.5" />{sourceLabel[lead.source] || lead.source}
                  </span>
                )}
                {lead.phone && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                    <Phone className="h-2.5 w-2.5" />{lead.phone}
                  </span>
                )}
                {lead.email && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground truncate max-w-[160px]">
                    <Mail className="h-2.5 w-2.5" />{lead.email}
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

  const renderInternalList = (list: EnrichedLead[]) => {
    const items = filteredInternal(list);
    if (internalLoading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    if (!items.length) {
      return (
        <div className="text-center py-16 text-sm text-muted-foreground">
          <Inbox className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum lead nessa categoria</p>
          <p className="text-xs mt-1">Capture via WhatsApp, importe ou cadastre manualmente.</p>
        </div>
      );
    }
    return <div className="grid gap-2.5 lg:grid-cols-2">{items.map(renderInternalCard)}</div>;
  };

  const renderWebCard = (lead: CRMLead) => {
    const score = lead.relevance_score || 0;
    const company = lead.metadata?.company || lead.title.split(':')[0]?.trim();
    const size = lead.metadata?.company_size ? sizeMeta[lead.metadata.company_size] : null;
    const statusOpt = STATUS_OPTS.find(s => s.value === lead.status) || STATUS_OPTS[0];
    const isHot = score >= 75;
    return (
      <button
        key={lead.id}
        onClick={() => setDetailWeb(lead)}
        className={cn(
          'group text-left bg-gradient-to-br rounded-xl p-4 transition-all hover:scale-[1.01] hover:shadow-lg border',
          scoreBgGradient(score),
          isHot && 'ring-2 ring-red-500/40 shadow-[0_0_20px_-5px] shadow-red-500/30',
        )}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex flex-col">
            <span className={cn('text-4xl font-bold leading-none', scoreColorClass(score))}>{score}</span>
            <span className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">score</span>
          </div>
          {isHot && (
            <Badge className="bg-red-500/15 text-red-600 border-red-500/40 text-[10px] gap-1 animate-pulse">
              <Flame className="h-3 w-3" /> QUENTE
            </Badge>
          )}
        </div>
        <p className="font-semibold text-sm mb-1 line-clamp-1">{company}</p>
        {lead.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[2rem]">{lead.description}</p>}
        <div className="flex items-center gap-1 flex-wrap mb-3">
          {size && <Badge variant="outline" className={cn('text-[9px] py-0', size.color)}>{size.label}</Badge>}
          {lead.metadata?.sector && (
            <Badge variant="outline" className="text-[9px] py-0 max-w-[120px] truncate">{lead.metadata.sector}</Badge>
          )}
          <Badge variant="outline" className={cn('text-[9px] py-0', statusOpt.color)}>{statusOpt.label}</Badge>
        </div>
        <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><Globe2 className="h-3 w-3" /> {lead.source || 'manual'}</span>
          <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {timeAgo(lead.detected_at)}</span>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
        </div>
      </button>
    );
  };

  // ---------------- render ----------------
  return (
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20">
              <Target className="h-5 w-5 text-primary" />
            </div>
            Central de Leads
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Leads internos qualificados pela IA <span className="text-foreground/70">+</span> prospecção web automatizada
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
          <Button variant="outline" size="sm" onClick={qualifyAll} disabled={qualifying || total === 0}>
            {qualifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
            Qualificar IA
          </Button>
          <Button size="sm" variant="default" onClick={() => setNewLeadOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />Novo lead
          </Button>
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
            <p className="text-[11px] text-muted-foreground">Leads internos</p>
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
        <Card className="bg-gradient-to-br from-red-500/10 to-background border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <Globe2 className="h-4 w-4 text-red-500" />
              <span className="text-[10px] text-red-600 font-medium">WEB</span>
            </div>
            <p className="text-2xl font-bold tabular-nums text-red-600">{webStats.hot}</p>
            <p className="text-[11px] text-muted-foreground">Web quentes ({webStats.total})</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-background border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-1">
              <DollarSign className="h-4 w-4 text-emerald-500" />
              <Award className="h-3 w-3 text-emerald-600" />
            </div>
            <p className="text-lg font-bold tabular-nums text-emerald-600 truncate">{fmtBRL(totalPipeline)}</p>
            <p className="text-[11px] text-muted-foreground">Pipeline est. · {conversion}% conv.</p>
          </CardContent>
        </Card>
      </div>

      {/* Status IA pendente */}
      {total > 0 && aiQualified < total && (
        <Card className="border-primary/30 bg-gradient-to-r from-primary/5 to-transparent">
          <CardContent className="p-4 flex items-center gap-3 flex-wrap">
            <div className="p-2 rounded-lg bg-primary/10"><AlertCircle className="h-4 w-4 text-primary" /></div>
            <div className="flex-1 min-w-[200px]">
              <p className="font-medium text-sm">{total - aiQualified} lead(s) sem qualificação IA</p>
              <p className="text-xs text-muted-foreground">
                {aiQualified}/{total} já analisados — clique em "Qualificar IA" para análise BANT, ICP fit e próximas ações.
              </p>
            </div>
            <Progress value={(aiQualified / total) * 100} className="w-32 h-2" />
          </CardContent>
        </Card>
      )}

      {/* CENTRAL DE LEADS - TUDO INTEGRADO */}
      <Card>
        <CardContent className="p-4 space-y-6">
          {/* Tabs de classificação dos leads internos */}
          <Tabs value={stageTab} onValueChange={(v) => setStageTab(v as any)}>
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
                    placeholder="Buscar leads..."
                    className="pl-8 h-9 w-56"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={sourceFilter} onValueChange={setSourceFilter}>
                  <SelectTrigger className="h-9 w-36">
                    <FilterIcon className="h-3 w-3 mr-1" /><SelectValue placeholder="Origem" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas origens</SelectItem>
                    {sources.map((s) => <SelectItem key={s} value={s}>{sourceLabel[s] || s}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                  <SelectTrigger className="h-9 w-36">
                    <BarChart3 className="h-3 w-3 mr-1" /><SelectValue />
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
              <TabsContent value="todos">{renderInternalList(enriched)}</TabsContent>
              <TabsContent value="sql">{renderInternalList(sqls)}</TabsContent>
              <TabsContent value="mql">{renderInternalList(mqls)}</TabsContent>
              <TabsContent value="frio">{renderInternalList(cold)}</TabsContent>
              <TabsContent value="lixo">{renderInternalList(trash)}</TabsContent>
            </div>
          </Tabs>

          {/* SEPARADOR VISUAL */}
          <div className="relative py-2">
            <Separator className="my-4" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3">
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                <Globe2 className="h-3 w-3 mr-1" /> Prospecção Web Automática
              </Badge>
            </div>
          </div>

          {/* PAINEL DE CONTROLE DA PROSPECÇÃO WEB */}
          <div className="space-y-4">
            <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start gap-4 flex-wrap">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 shrink-0">
                    <Radio className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-[240px]">
                    <h3 className="font-bold text-base flex items-center gap-2">
                      Prospecção Web Automática
                      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 text-[10px]">IA</Badge>
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      Varre notícias, reviews e portais de tecnologia para detectar empresas alinhadas ao seu ICP.
                    </p>
                    <div className="flex items-center gap-3 mt-3 flex-wrap text-[11px]">
                      <span className="inline-flex items-center gap-1">
                        <span className={cn('h-1.5 w-1.5 rounded-full', icp.trim() ? 'bg-emerald-500' : 'bg-amber-500')} />
                        {icp.trim() ? 'ICP configurado' : 'ICP não definido'}
                      </span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{webStats.total} prospects coletados</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-red-600 font-medium">{webStats.hot} 🔥 quentes</span>
                      <span className="text-muted-foreground">·</span>
                      <span className="text-muted-foreground">{webStats.today} hoje</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <Button
                      size="sm" onClick={() => setScanOpen(true)} disabled={scanning}
                      className="bg-gradient-to-r from-primary to-primary/80"
                    >
                      {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Radio className="h-4 w-4 mr-2" />}
                      Buscar prospects
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIcpDialogOpen(true)}>
                      <Brain className="h-4 w-4 mr-2" />
                      {icp.trim() ? 'Editar ICP' : 'Definir ICP'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FILTROS DOS PROSPECTS WEB */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <Tabs value={webFilter} onValueChange={setWebFilter}>
                <TabsList className="flex-wrap h-auto">
                  <TabsTrigger value="all">Todos ({webStats.total})</TabsTrigger>
                  <TabsTrigger value="hot">🔥 Quentes ({webStats.hot})</TabsTrigger>
                  <TabsTrigger value="warm">🟠 Mornos</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="flex items-center gap-2 flex-wrap">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-9 w-36"><FilterIcon className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos status</SelectItem>
                    {STATUS_OPTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={sizeFilter} onValueChange={setSizeFilter}>
                  <SelectTrigger className="h-9 w-32"><Building2 className="h-3 w-3 mr-1" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos portes</SelectItem>
                    <SelectItem value="micro">Micro</SelectItem>
                    <SelectItem value="pequena">Pequena</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="grande">Grande</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* GRID DOS PROSPECTS WEB */}
            {filteredWeb.length === 0 ? (
              <div className="text-center py-12 text-sm text-muted-foreground border border-dashed rounded-xl bg-muted/20">
                <Globe2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">Nenhum prospect web ainda</p>
                <p className="text-xs mt-1 max-w-sm mx-auto">Configure seu ICP e clique em "Buscar prospects" para iniciar a varredura automática.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredWeb.map(renderWebCard)}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* DIALOG: Novo lead manual */}
      <Dialog open={newLeadOpen} onOpenChange={setNewLeadOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>Novo lead</DialogTitle>
            <DialogDescription>Cadastre um lead manualmente. Disponível em todo o CRM.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div><Label>Empresa</Label><Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
              <div><Label>Setor</Label><Input value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })} /></div>
            </div>
            <div className="grid gap-2">
              <Label>Origem</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                  <SelectItem value="site">Site</SelectItem>
                  <SelectItem value="instagram">Instagram</SelectItem>
                  <SelectItem value="indicacao">Indicação</SelectItem>
                  <SelectItem value="evento">Evento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2"><Label>Observações</Label><Textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewLeadOpen(false)}>Cancelar</Button>
            <Button onClick={saveManual} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}Salvar lead
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: ICP */}
      <Dialog open={icpDialogOpen} onOpenChange={setIcpDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /> Perfil do Cliente Ideal (ICP)</DialogTitle>
            <DialogDescription>
              Descreva quem é seu cliente perfeito. Isso é usado tanto na qualificação dos leads internos quanto na varredura web automática.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            rows={8}
            value={icp}
            onChange={(e) => setIcp(e.target.value)}
            placeholder="Ex: Pequenas e médias empresas brasileiras (5-100 funcionários), faturamento R$300mil-R$10M/ano, dos setores de varejo, serviços ou e-commerce, que precisam automatizar atendimento via WhatsApp e organizar leads no CRM. Foco em donos/gestores que valorizam preço acessível e setup rápido."
            className="font-mono text-xs"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIcpDialogOpen(false)}>Fechar</Button>
            <Button onClick={saveIcp} disabled={icpSaving}>
              {icpSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}Salvar ICP
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG: Varredura web */}
      <Dialog open={scanOpen} onOpenChange={setScanOpen}>
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Radio className="h-5 w-5 text-primary" /> Varredura web automática</DialogTitle>
            <DialogDescription>
              A IA analisa notícias e detecta empresas/pessoas alinhadas ao seu ICP. Resultados aparecem na aba "Web".
            </DialogDescription>
          </DialogHeader>
          {!icp.trim() && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
              ⚠️ Defina seu <strong>ICP</strong> antes de fazer a varredura — sem ele a IA não consegue priorizar.
            </div>
          )}
          <div className="space-y-3">
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Fontes</Label>
              <div className="space-y-2 mt-2">
                {[
                  { key: 'news_br', label: 'Notícias BR', icon: Newspaper, desc: 'G1, Valor, Exame, InfoMoney, Startups' },
                  { key: 'tech_intl', label: 'Tech Intl.', icon: TrendingUp, desc: 'TechCrunch, Crunchbase, VentureBeat' },
                  { key: 'reviews', label: 'Reviews', icon: Briefcase, desc: 'Trustpilot — sinais de insatisfação' },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <label key={s.key} className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/40 transition-colors">
                      <Checkbox
                        checked={scanSources[s.key]}
                        onCheckedChange={(v) => setScanSources({ ...scanSources, [s.key]: !!v })}
                      />
                      <Icon className="h-4 w-4 text-primary mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{s.label}</p>
                        <p className="text-[11px] text-muted-foreground">{s.desc}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScanOpen(false)}>Cancelar</Button>
            <Button onClick={runScan} disabled={scanning || !icp.trim()}>
              {scanning ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Zap className="h-4 w-4 mr-2" />}
              Iniciar varredura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* SHEET: Detalhe lead interno */}
      <Sheet open={!!detailLead} onOpenChange={(o) => !o && setDetailLead(null)}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          {detailLead && (
            <>
              <SheetHeader className="pb-4 border-b">
                <div className="flex items-start gap-4">
                  <div className={cn(
                    'w-16 h-16 rounded-xl border-2 flex items-center justify-center bg-gradient-to-br',
                    scoreBgGradient(detailLead._score),
                    detailLead._stage === 'SQL' ? 'border-emerald-500' :
                    detailLead._stage === 'MQL' ? 'border-blue-500' :
                    detailLead._stage === 'Lead' ? 'border-amber-500' : 'border-border',
                  )}>
                    <span className={cn('text-2xl font-bold', scoreColorClass(detailLead._score))}>{detailLead._score}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-lg">{detailLead.name}</SheetTitle>
                    <SheetDescription className="flex items-center gap-2 mt-1 flex-wrap">
                      <Badge variant="outline" className={cn('gap-1', stageBadgeClass(detailLead._stage))}>
                        {stageIcon(detailLead._stage)} {detailLead._stage}
                      </Badge>
                      {detailLead._hasAI && (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                          <Sparkles className="h-3 w-3 mr-1" />Analisado IA
                        </Badge>
                      )}
                    </SheetDescription>
                  </div>
                </div>
              </SheetHeader>
              <div className="space-y-5 py-4">
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contato</p>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {detailLead.company && <div className="flex items-center gap-2 p-2 rounded bg-muted/40"><Building2 className="h-3.5 w-3.5 text-muted-foreground" /><span className="truncate">{detailLead.company}</span></div>}
                    {detailLead.business_type && <div className="flex items-center gap-2 p-2 rounded bg-muted/40"><Award className="h-3.5 w-3.5 text-muted-foreground" /><span className="truncate">{detailLead.business_type}</span></div>}
                    {detailLead.phone && <div className="flex items-center gap-2 p-2 rounded bg-muted/40"><Phone className="h-3.5 w-3.5 text-muted-foreground" /><span className="truncate">{detailLead.phone}</span></div>}
                    {detailLead.email && <div className="flex items-center gap-2 p-2 rounded bg-muted/40"><Mail className="h-3.5 w-3.5 text-muted-foreground" /><span className="truncate">{detailLead.email}</span></div>}
                  </div>
                </div>
                {detailLead._ai?.ai_analysis ? (
                  <div className="space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Análise IA
                    </p>
                    {detailLead._ai.ai_analysis.summary && (
                      <p className="text-sm p-3 rounded-lg bg-primary/5 border border-primary/20">{detailLead._ai.ai_analysis.summary}</p>
                    )}
                    {detailLead._ai.ai_analysis.next_best_action && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                        <Wand2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[11px] font-semibold uppercase text-emerald-600">Próxima ação</p>
                          <p className="text-sm mt-0.5">{detailLead._ai.ai_analysis.next_best_action}</p>
                        </div>
                      </div>
                    )}
                    {detailLead._ai.ai_analysis.icp_fit !== undefined && (
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-muted-foreground">ICP Fit</span>
                          <span className="font-semibold">{detailLead._ai.ai_analysis.icp_fit}%</span>
                        </div>
                        <Progress value={detailLead._ai.ai_analysis.icp_fit} className="h-2" />
                      </div>
                    )}
                    {detailLead._ai.tags && detailLead._ai.tags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap">
                        {detailLead._ai.tags.map((t, i) => <Badge key={i} variant="secondary" className="text-[10px]">{t}</Badge>)}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 rounded-lg border border-dashed">
                    <Brain className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">Lead ainda não foi analisado pela IA.</p>
                    <Button size="sm" className="mt-3" onClick={() => qualifySingleLead(detailLead.id)} disabled={qualifyingOne}>
                      {qualifyingOne ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}Qualificar agora
                    </Button>
                  </div>
                )}
                {detailLead._hasAI && (
                  <Button size="sm" variant="outline" className="w-full" onClick={() => qualifySingleLead(detailLead.id)} disabled={qualifyingOne}>
                    {qualifyingOne ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Re-qualificar com IA
                  </Button>
                )}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notas</p>
                    {notesDraft !== (detailLead.notes || '') && (
                      <Badge variant="outline" className="text-[10px]">não salvo</Badge>
                    )}
                  </div>
                  <Textarea
                    rows={5}
                    placeholder="Anote contexto, próximos passos, objeções, decisor..."
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    className="resize-none"
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => saveLeadNotes(detailLead.id)}
                    disabled={savingNotes || notesDraft === (detailLead.notes || '')}
                  >
                    {savingNotes ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                    Salvar notas
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* SHEET: Detalhe lead web */}
      <Sheet open={!!detailWeb} onOpenChange={(o) => !o && setDetailWeb(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {detailWeb && (() => {
            const score = detailWeb.relevance_score || 0;
            const company = detailWeb.metadata?.company || detailWeb.title.split(':')[0]?.trim();
            const size = detailWeb.metadata?.company_size ? sizeMeta[detailWeb.metadata.company_size] : null;
            const statusOpt = STATUS_OPTS.find(s => s.value === detailWeb.status) || STATUS_OPTS[0];
            return (
              <>
                <SheetHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <SheetTitle className="text-xl truncate">{company}</SheetTitle>
                      <SheetDescription className="line-clamp-2 mt-1">{detailWeb.title}</SheetDescription>
                    </div>
                    <div className="flex flex-col items-center px-3 py-1.5 rounded-lg border">
                      <span className={cn('text-3xl font-bold leading-none', scoreColorClass(score))}>{score}</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">score</span>
                    </div>
                  </div>
                </SheetHeader>
                <div className="mt-5 space-y-5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {score >= 75 && (
                      <Badge className="bg-red-500/15 text-red-600 border-red-500/40 gap-1">
                        <Flame className="h-3 w-3" /> Lead Quente
                      </Badge>
                    )}
                    {size && <Badge variant="outline" className={size.color}>{size.label} Porte</Badge>}
                    {detailWeb.metadata?.sector && <Badge variant="outline">{detailWeb.metadata.sector}</Badge>}
                    <Badge variant="outline" className={statusOpt.color}>{statusOpt.label}</Badge>
                  </div>
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Status do lead</p>
                    <Select value={detailWeb.status} onValueChange={(v) => {
                      updateStatus(detailWeb.id, v);
                      setDetailWeb({ ...detailWeb, status: v });
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  {detailWeb.description && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5" /> Por que é um bom lead
                      </p>
                      <p className="text-sm leading-relaxed">{detailWeb.description}</p>
                    </div>
                  )}
                  {detailWeb.metadata?.suggested_action && (
                    <div className="space-y-1.5 bg-primary/5 border border-primary/20 rounded-lg p-3">
                      <p className="text-xs font-medium text-primary flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5" /> Ação sugerida pela IA
                      </p>
                      <p className="text-sm leading-relaxed">{detailWeb.metadata.suggested_action}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Globe2 className="h-3 w-3" /> Fonte
                      </p>
                      <p className="font-medium">{detailWeb.source || 'manual'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Detectado
                      </p>
                      <p className="font-medium">{new Date(detailWeb.detected_at).toLocaleString('pt-BR')}</p>
                    </div>
                    {detailWeb.metadata?.location && (
                      <div className="space-y-0.5 col-span-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Localização
                        </p>
                        <p className="font-medium">{detailWeb.metadata.location}</p>
                      </div>
                    )}
                  </div>
                  {detailWeb.source_url && (
                    <Button variant="outline" className="w-full" asChild>
                      <a href={detailWeb.source_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" /> Abrir fonte original
                      </a>
                    </Button>
                  )}
                  <Separator />
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => convertWebToClient(detailWeb)}
                      disabled={convertingId === detailWeb.id}
                    >
                      {convertingId === detailWeb.id
                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        : <UserPlus className="h-4 w-4 mr-2" />}
                      Virar cliente do CRM
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => handleDeleteWeb(detailWeb.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Excluir lead
                    </Button>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>
    </div>
  );
}
