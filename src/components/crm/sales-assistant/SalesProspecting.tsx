import { useEffect, useState, useCallback } from 'react';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  Sparkles, Target, TrendingUp, Search, Plus, Filter, Brain, Zap,
  Loader2, Inbox, MessageCircle, RefreshCw, Phone, Building2,
} from 'lucide-react';

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

// Score IA derivado do perfil + atividade real
const computeScore = (l: Lead): number => {
  let s = 30;
  if (l.phone) s += 15;
  if (l.email) s += 10;
  if (l.company) s += 15;
  if (l.business_type) s += 10;
  if (l.notes && l.notes.length > 20) s += 10;
  if (l.last_contact_date) {
    const days = (Date.now() - new Date(l.last_contact_date).getTime()) / 86400000;
    if (days < 7) s += 15;
    else if (days < 30) s += 8;
  }
  if ((l.source || '').toLowerCase().includes('whatsapp')) s += 5;
  return Math.min(100, s);
};

const stageOf = (l: Lead, score: number): 'SQL' | 'MQL' | 'Lead' => {
  const st = (l.status || '').toLowerCase();
  if (st === 'cliente' || st === 'qualificado' || score >= 80) return 'SQL';
  if (st === 'em_negociacao' || score >= 55) return 'MQL';
  return 'Lead';
};

const scoreColor = (score: number) => {
  if (score >= 80) return 'text-emerald-500';
  if (score >= 60) return 'text-yellow-500';
  if (score >= 40) return 'text-orange-500';
  return 'text-muted-foreground';
};

const stageBadge = (stage: string) => ({
  SQL: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30',
  MQL: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30',
  Lead: 'bg-muted text-muted-foreground',
}[stage] || 'bg-muted');

const leadSchema = z.object({
  name: z.string().trim().min(1, 'Nome obrigatório').max(120),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  email: z.string().trim().email('E-mail inválido').max(255).optional().or(z.literal('')),
  company: z.string().trim().max(120).optional().or(z.literal('')),
  business_type: z.string().trim().max(80).optional().or(z.literal('')),
  source: z.string().trim().max(60).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

export function SalesProspecting({ customerProductId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Form state
  const [form, setForm] = useState({
    name: '', phone: '', email: '', company: '',
    business_type: '', source: 'manual', notes: '',
  });

  // Importação WhatsApp
  const [waLeads, setWaLeads] = useState<any[]>([]);
  const [waLoading, setWaLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchLeads = useCallback(async () => {
    if (!customerProductId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('crm_customers')
      .select('id,name,company,business_type,phone,email,status,source,notes,last_contact_date,created_at')
      .eq('customer_product_id', customerProductId)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) {
      toast({ title: 'Erro ao carregar leads', description: error.message, variant: 'destructive' });
    } else {
      setLeads(data || []);
    }
    setLoading(false);
  }, [customerProductId, toast]);

  useEffect(() => { fetchLeads(); }, [fetchLeads]);

  // Realtime: novo lead capturado pelo WhatsApp aparece automaticamente
  useEffect(() => {
    if (!customerProductId) return;
    const channel = (supabase as any)
      .channel(`crm_customers_${customerProductId}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'crm_customers', filter: `customer_product_id=eq.${customerProductId}` },
        () => fetchLeads())
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [customerProductId, fetchLeads]);

  // Sincroniza leads brutos do WhatsApp (whatsapp_leads do tenant) para crm_customers
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
        toast({ title: 'Tudo sincronizado', description: 'Nenhum lead novo do WhatsApp para importar.' });
      } else {
        const { error } = await (supabase as any).from('crm_customers').insert(toInsert);
        if (error) throw error;
        toast({ title: 'Sincronizado', description: `${toInsert.length} novo(s) lead(s) importado(s) do WhatsApp.` });
        fetchLeads();
      }
    } catch (e: any) {
      toast({ title: 'Erro na sincronização', description: e.message || 'Falha ao sincronizar', variant: 'destructive' });
    } finally {
      setSyncing(false);
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
    toast({ title: 'Lead criado', description: 'Disponível em Prospecção, CRM e Pipeline.' });
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
      toast({ title: 'Erro ao importar', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Importado', description: `${rows.length} lead(s) adicionado(s).` });
    setDialogOpen(false);
    fetchLeads();
  };

  // Derivações
  const enriched = leads.map((l) => ({ ...l, _score: computeScore(l), _stage: stageOf(l, computeScore(l)) }));
  const total = enriched.length;
  const sqls = enriched.filter((p) => p._stage === 'SQL');
  const mqls = enriched.filter((p) => p._stage === 'MQL');
  const cold = enriched.filter((p) => p._stage === 'Lead');
  const avgScore = total ? Math.round(enriched.reduce((s, p) => s + p._score, 0) / total) : 0;
  const conversion = mqls.length ? Math.round((sqls.length / mqls.length) * 100) : 0;

  const filtered = (list: typeof enriched) => {
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      (p.company || '').toLowerCase().includes(q) ||
      (p.phone || '').toLowerCase().includes(q)
    );
  };

  const renderList = (list: typeof enriched) => {
    const items = filtered(list);
    if (loading) return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
    if (!items.length) {
      return (
        <div className="text-center py-12 text-sm text-muted-foreground">
          <Inbox className="h-10 w-10 mx-auto mb-2 opacity-40" />
          Nenhum lead encontrado. Capture leads via WhatsApp ou cadastre manualmente.
        </div>
      );
    }
    return items.map((lead) => (
      <Card key={lead.id} className="hover:bg-muted/30 transition-colors cursor-pointer">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold">{lead.name}</p>
                <Badge variant="outline" className={stageBadge(lead._stage)}>{lead._stage}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {[lead.business_type, lead.company, lead.phone].filter(Boolean).join(' · ') || '—'}
              </p>
            </div>
            <div className="flex items-center gap-2 min-w-[140px] flex-wrap">
              {lead.source && <Badge variant="secondary" className="text-[10px]">{lead.source}</Badge>}
              <Badge variant="outline" className="text-[10px]">{lead.status}</Badge>
            </div>
            <div className="min-w-[180px]">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-muted-foreground">Score IA</span>
                <span className={`text-sm font-bold ${scoreColor(lead._score)}`}>{lead._score}</span>
              </div>
              <Progress value={lead._score} className="h-1.5" />
            </div>
            <Button size="sm" variant="ghost">Ver detalhes</Button>
          </div>
        </CardContent>
      </Card>
    ));
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-4">
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Leads totais</p><p className="text-2xl font-bold">{total}</p></div><Target className="h-8 w-8 text-primary opacity-60" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">SQLs (qualificados)</p><p className="text-2xl font-bold text-emerald-500">{sqls.length}</p></div><TrendingUp className="h-8 w-8 text-emerald-500 opacity-60" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Score médio IA</p><p className="text-2xl font-bold">{avgScore}</p></div><Brain className="h-8 w-8 text-primary opacity-60" /></div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Taxa MQL → SQL</p><p className="text-2xl font-bold">{conversion}%</p></div><Zap className="h-8 w-8 text-yellow-500 opacity-60" /></div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Prospecção & Qualificação IA
              </CardTitle>
              <CardDescription>
                Base unificada — leads do WhatsApp, cadastro manual e captura externa em um único lugar
              </CardDescription>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" size="sm" onClick={syncFromWhatsApp} disabled={syncing}>
                {syncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                Sincronizar WhatsApp
              </Button>
              <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" />Filtros</Button>
              <Button size="sm" onClick={openDialog}><Plus className="h-4 w-4 mr-2" />Novo lead</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="todos">
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <TabsList>
                <TabsTrigger value="todos">Todos ({total})</TabsTrigger>
                <TabsTrigger value="sql">SQL ({sqls.length})</TabsTrigger>
                <TabsTrigger value="mql">MQL ({mqls.length})</TabsTrigger>
                <TabsTrigger value="frio">Frios ({cold.length})</TabsTrigger>
              </TabsList>
              <div className="relative w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Buscar lead..." className="pl-8 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
            </div>
            <TabsContent value="todos" className="space-y-2">{renderList(enriched)}</TabsContent>
            <TabsContent value="sql" className="space-y-2">{renderList(sqls)}</TabsContent>
            <TabsContent value="mql" className="space-y-2">{renderList(mqls)}</TabsContent>
            <TabsContent value="frio" className="space-y-2">{renderList(cold)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-4 flex items-start gap-3">
          <Brain className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Base unificada de leads</p>
            <p className="text-xs text-muted-foreground mt-1">
              Todos os leads ficam no mesmo lugar: capturados pelo WhatsApp, cadastrados manualmente ou importados.
              Aparecem automaticamente em Prospecção IA, CRM, Pipeline e demais módulos. O Score IA é calculado em tempo real
              com base no perfil (cargo, empresa, dados de contato) + atividade recente.
            </p>
          </div>
        </CardContent>
      </Card>

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
                  Nenhum lead novo do WhatsApp. Conecte sua instância na aba WhatsApp para começar a capturar.
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
  );
}
