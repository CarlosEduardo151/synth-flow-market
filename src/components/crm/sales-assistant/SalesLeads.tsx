import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Flame, Inbox, ExternalLink, CheckCircle2, Clock, Trash2, UserPlus,
  Search, RefreshCw, TrendingUp, Building2, Loader2, Filter, Target, Sparkles,
} from 'lucide-react';

interface Props { customerProductId: string; }

interface LeadEvent {
  id: string;
  event_type: string;
  title: string;
  description: string | null;
  source: string | null;
  source_url: string | null;
  detected_at: string;
  relevance_score: number | null;
  status: string;
  metadata: any;
}

const STATUS_OPTS = [
  { value: 'new', label: 'Novo', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  { value: 'reviewing', label: 'Em análise', color: 'bg-purple-500/10 text-purple-500 border-purple-500/30' },
  { value: 'contacted', label: 'Contatado', color: 'bg-amber-500/10 text-amber-500 border-amber-500/30' },
  { value: 'qualified', label: 'Qualificado', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  { value: 'discarded', label: 'Descartado', color: 'bg-muted text-muted-foreground border-border' },
];

const sizeMeta: Record<string, { label: string; color: string }> = {
  micro: { label: 'Micro', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  pequena: { label: 'Pequena', color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30' },
  media: { label: 'Média', color: 'bg-blue-500/10 text-blue-500 border-blue-500/30' },
  grande: { label: 'Grande', color: 'bg-orange-500/10 text-orange-500 border-orange-500/30' },
};

const timeAgo = (iso: string) => {
  const d = (Date.now() - new Date(iso).getTime()) / 1000;
  if (d < 60) return 'agora';
  if (d < 3600) return `${Math.floor(d / 60)}min`;
  if (d < 86400) return `${Math.floor(d / 3600)}h`;
  return `${Math.floor(d / 86400)}d`;
};

const scoreColor = (s: number) =>
  s >= 75 ? 'text-red-500' : s >= 60 ? 'text-orange-500' : s >= 45 ? 'text-amber-500' : 'text-muted-foreground';

const scoreBg = (s: number) =>
  s >= 75 ? 'border-red-500/30 bg-red-500/5'
  : s >= 60 ? 'border-orange-500/20 bg-orange-500/5'
  : 'bg-muted/20';

export function SalesLeads({ customerProductId }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [leads, setLeads] = useState<LeadEvent[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [convertingId, setConvertingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from('sa_trigger_events')
      .select('id,event_type,title,description,source,source_url,detected_at,relevance_score,status,metadata')
      .eq('customer_product_id', customerProductId)
      .order('relevance_score', { ascending: false, nullsFirst: false })
      .order('detected_at', { ascending: false })
      .limit(300);
    setLeads(data || []);
    setLoading(false);
  };

  useEffect(() => { if (customerProductId) load(); }, [customerProductId]);

  const updateStatus = async (id: string, status: string) => {
    setLeads(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    await (supabase as any).from('sa_trigger_events').update({ status }).eq('id', id);
  };

  const deleteLead = async (id: string) => {
    if (!confirm('Excluir este lead?')) return;
    setLeads(prev => prev.filter(l => l.id !== id));
    await (supabase as any).from('sa_trigger_events').delete().eq('id', id);
    toast({ title: 'Lead removido' });
  };

  const convertToClient = async (lead: LeadEvent) => {
    setConvertingId(lead.id);
    try {
      const company = lead.metadata?.company || lead.title.split(':')[0]?.trim() || 'Empresa';
      const { error } = await (supabase as any).from('crm_customers').insert({
        customer_product_id: customerProductId,
        name: company,
        company,
        business_type: lead.metadata?.sector || null,
        status: 'lead',
        source: `Lead Scan · ${lead.source || 'web'}`,
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
    } catch (e: any) {
      toast({ title: 'Erro ao converter', description: e.message, variant: 'destructive' });
    } finally {
      setConvertingId(null);
    }
  };

  const filtered = useMemo(() => {
    return leads.filter(l => {
      if (filter === 'hot' && (l.relevance_score || 0) < 75) return false;
      if (filter === 'warm' && ((l.relevance_score || 0) < 60 || (l.relevance_score || 0) >= 75)) return false;
      if (filter === 'auto' && !l.metadata?.auto_scan) return false;
      if (statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (sizeFilter !== 'all' && l.metadata?.company_size !== sizeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${l.title} ${l.description || ''} ${l.metadata?.company || ''} ${l.metadata?.sector || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [leads, filter, statusFilter, sizeFilter, search]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const stats = useMemo(() => ({
    total: leads.length,
    hot: leads.filter(l => (l.relevance_score || 0) >= 75).length,
    today: leads.filter(l => new Date(l.detected_at) >= today).length,
    nuevos: leads.filter(l => l.status === 'new').length,
    qualificados: leads.filter(l => l.status === 'qualified').length,
  }), [leads]);

  return (
    <div className="space-y-4">
      {/* Hero stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total de leads</p>
                <p className="text-3xl font-bold text-primary">{stats.total}</p>
              </div>
              <Inbox className="h-8 w-8 text-primary/40" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500/10 to-transparent border-red-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Quentes 🔥</p>
                <p className="text-3xl font-bold text-red-500">{stats.hot}</p>
              </div>
              <Flame className="h-8 w-8 text-red-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-500/10 to-transparent border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Hoje</p>
                <p className="text-3xl font-bold text-blue-500">{stats.today}</p>
              </div>
              <Clock className="h-8 w-8 text-blue-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-amber-500/10 to-transparent border-amber-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Não abertos</p>
                <p className="text-3xl font-bold text-amber-500">{stats.nuevos}</p>
              </div>
              <Sparkles className="h-8 w-8 text-amber-500/40" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-500/10 to-transparent border-emerald-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Qualificados</p>
                <p className="text-3xl font-bold text-emerald-500">{stats.qualificados}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-500/40" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Target className="h-5 w-5 text-primary" /> Central de Leads
              </CardTitle>
              <CardDescription>
                Todos os prospects encontrados pelas varreduras. Gerencie status, qualifique e converta em clientes.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={load} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">Todos</TabsTrigger>
              <TabsTrigger value="hot">🔥 Quentes (≥75)</TabsTrigger>
              <TabsTrigger value="warm">🟠 Mornos (60-74)</TabsTrigger>
              <TabsTrigger value="auto">🤖 Da varredura</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por empresa, setor, motivo..."
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><Filter className="h-4 w-4 mr-1.5" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                {STATUS_OPTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={sizeFilter} onValueChange={setSizeFilter}>
              <SelectTrigger className="w-[140px]"><Building2 className="h-4 w-4 mr-1.5" /><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos portes</SelectItem>
                <SelectItem value="micro">Micro</SelectItem>
                <SelectItem value="pequena">Pequena</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="grande">Grande</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Leads list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Inbox className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-sm text-muted-foreground">
              {leads.length === 0
                ? 'Nenhum lead ainda. Vá em Trigger Events e rode uma busca massiva.'
                : 'Nenhum lead corresponde aos filtros.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map(lead => {
            const score = lead.relevance_score || 0;
            const company = lead.metadata?.company || lead.title.split(':')[0]?.trim();
            const size = lead.metadata?.company_size ? sizeMeta[lead.metadata.company_size] : null;
            const statusOpt = STATUS_OPTS.find(s => s.value === lead.status) || STATUS_OPTS[0];

            return (
              <Card key={lead.id} className={`transition ${scoreBg(score)}`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    {/* Score */}
                    <div className="flex flex-col items-center shrink-0 w-14">
                      <p className={`text-3xl font-bold ${scoreColor(score)}`}>{score}</p>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-wider">score</p>
                    </div>

                    {/* Body */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <p className="font-semibold text-sm">{company}</p>
                        {score >= 75 && (
                          <Badge className="bg-red-500/10 text-red-500 border-red-500/30 text-[10px] gap-1">
                            <Flame className="h-3 w-3" /> QUENTE
                          </Badge>
                        )}
                        {size && <Badge variant="outline" className={`text-[10px] ${size.color}`}>{size.label}</Badge>}
                        {lead.metadata?.sector && <Badge variant="outline" className="text-[10px]">{lead.metadata.sector}</Badge>}
                        <Badge variant="outline" className={`text-[10px] ${statusOpt.color}`}>{statusOpt.label}</Badge>
                      </div>

                      <p className="text-xs text-muted-foreground mb-1.5 truncate">
                        {lead.title} · via {lead.source || 'manual'} · {timeAgo(lead.detected_at)} atrás
                      </p>

                      {lead.description && (
                        <p className="text-xs text-foreground/80 mb-1.5 line-clamp-2">{lead.description}</p>
                      )}

                      {lead.metadata?.suggested_action && (
                        <p className="text-xs text-primary mb-2 line-clamp-2">
                          <TrendingUp className="h-3 w-3 inline mr-1" />
                          {lead.metadata.suggested_action}
                        </p>
                      )}

                      <div className="flex items-center gap-1.5 flex-wrap pt-1">
                        <Select value={lead.status} onValueChange={(v) => updateStatus(lead.id, v)}>
                          <SelectTrigger className="h-7 w-[130px] text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm" variant="outline" className="h-7 text-xs"
                          onClick={() => convertToClient(lead)}
                          disabled={convertingId === lead.id}
                        >
                          {convertingId === lead.id
                            ? <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            : <UserPlus className="h-3 w-3 mr-1" />}
                          Virar cliente
                        </Button>
                        {lead.source_url && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs" asChild>
                            <a href={lead.source_url} target="_blank" rel="noreferrer">
                              <ExternalLink className="h-3 w-3 mr-1" /> Fonte
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive"
                          onClick={() => deleteLead(lead.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
