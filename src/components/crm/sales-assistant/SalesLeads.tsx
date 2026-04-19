import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { useCRMLeads, CRMLead } from '@/contexts/CRMLeadsContext';
import {
  Flame, Inbox, ExternalLink, CheckCircle2, Clock, Trash2, UserPlus,
  Search, RefreshCw, TrendingUp, Building2, Loader2, Filter, Target, Sparkles,
  MapPin, Tag, Calendar, Globe, Zap, ChevronRight,
} from 'lucide-react';

interface Props { customerProductId: string; }

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

const scoreRing = (s: number) =>
  s >= 75 ? 'ring-2 ring-red-500/40 shadow-[0_0_20px_-5px] shadow-red-500/30'
  : s >= 60 ? 'ring-1 ring-orange-500/30'
  : 'ring-1 ring-border';

const scoreGradient = (s: number) =>
  s >= 75 ? 'from-red-500/20 via-red-500/5 to-transparent'
  : s >= 60 ? 'from-orange-500/15 via-orange-500/5 to-transparent'
  : s >= 45 ? 'from-amber-500/10 via-amber-500/5 to-transparent'
  : 'from-muted/30 to-transparent';

export function SalesLeads({ customerProductId }: Props) {
  const { toast } = useToast();
  const { leads, loading, refresh, updateStatus, removeLead, stats } = useCRMLeads();
  const [filter, setFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sizeFilter, setSizeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<CRMLead | null>(null);

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este lead?')) return;
    await removeLead(id);
    if (selected?.id === id) setSelected(null);
    toast({ title: 'Lead removido' });
  };

  const convertToClient = async (lead: CRMLead) => {
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
      setSelected(null);
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

  return (
    <div className="space-y-4">
      {/* Hero stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[
          { label: 'Total de leads', value: stats.total, icon: Inbox, color: 'primary', from: 'from-primary/10' },
          { label: 'Quentes 🔥', value: stats.hot, icon: Flame, color: 'red-500', from: 'from-red-500/10' },
          { label: 'Hoje', value: stats.today, icon: Clock, color: 'blue-500', from: 'from-blue-500/10' },
          { label: 'Não abertos', value: stats.new, icon: Sparkles, color: 'amber-500', from: 'from-amber-500/10' },
          { label: 'Qualificados', value: stats.qualified, icon: CheckCircle2, color: 'emerald-500', from: 'from-emerald-500/10' },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className={`bg-gradient-to-br ${s.from} to-transparent border-${s.color}/20`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className={`text-3xl font-bold text-${s.color}`}>{s.value}</p>
                  </div>
                  <Icon className={`h-8 w-8 text-${s.color}/40`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
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
                Todos os prospects encontrados. Clique em um card para ver detalhes e converter em cliente.
              </CardDescription>
            </div>
            <Button size="sm" variant="outline" onClick={refresh} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="all">Todos ({stats.total})</TabsTrigger>
              <TabsTrigger value="hot">🔥 Quentes ({stats.hot})</TabsTrigger>
              <TabsTrigger value="warm">🟠 Mornos</TabsTrigger>
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

      {/* Grid de cards */}
      {loading && leads.length === 0 ? (
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
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map(lead => {
            const score = lead.relevance_score || 0;
            const company = lead.metadata?.company || lead.title.split(':')[0]?.trim();
            const size = lead.metadata?.company_size ? sizeMeta[lead.metadata.company_size] : null;
            const statusOpt = STATUS_OPTS.find(s => s.value === lead.status) || STATUS_OPTS[0];
            const isHot = score >= 75;

            return (
              <button
                key={lead.id}
                onClick={() => setSelected(lead)}
                className={`group text-left bg-gradient-to-br ${scoreGradient(score)} ${scoreRing(score)} rounded-xl p-4 transition-all hover:scale-[1.02] hover:shadow-lg`}
              >
                {/* Top: score + hot */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex flex-col">
                    <span className={`text-4xl font-bold leading-none ${scoreColor(score)}`}>{score}</span>
                    <span className="text-[9px] text-muted-foreground uppercase tracking-widest mt-0.5">score</span>
                  </div>
                  {isHot && (
                    <Badge className="bg-red-500/15 text-red-500 border-red-500/40 text-[10px] gap-1 animate-pulse">
                      <Flame className="h-3 w-3" /> QUENTE
                    </Badge>
                  )}
                </div>

                {/* Company */}
                <p className="font-semibold text-sm mb-1 line-clamp-1">{company}</p>

                {/* Description */}
                {lead.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mb-3 min-h-[2rem]">
                    {lead.description}
                  </p>
                )}

                {/* Tags */}
                <div className="flex items-center gap-1 flex-wrap mb-3">
                  {size && <Badge variant="outline" className={`text-[9px] py-0 ${size.color}`}>{size.label}</Badge>}
                  {lead.metadata?.sector && (
                    <Badge variant="outline" className="text-[9px] py-0 max-w-[120px] truncate">
                      {lead.metadata.sector}
                    </Badge>
                  )}
                  <Badge variant="outline" className={`text-[9px] py-0 ${statusOpt.color}`}>{statusOpt.label}</Badge>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Globe className="h-3 w-3" /> {lead.source || 'manual'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {timeAgo(lead.detected_at)}
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/60 group-hover:text-primary transition-colors" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Sidebar de detalhes */}
      <Sheet open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          {selected && (() => {
            const score = selected.relevance_score || 0;
            const company = selected.metadata?.company || selected.title.split(':')[0]?.trim();
            const size = selected.metadata?.company_size ? sizeMeta[selected.metadata.company_size] : null;
            const statusOpt = STATUS_OPTS.find(s => s.value === selected.status) || STATUS_OPTS[0];
            return (
              <>
                <SheetHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <SheetTitle className="text-xl truncate">{company}</SheetTitle>
                      <SheetDescription className="line-clamp-2 mt-1">{selected.title}</SheetDescription>
                    </div>
                    <div className={`flex flex-col items-center px-3 py-1.5 rounded-lg ${scoreRing(score)}`}>
                      <span className={`text-3xl font-bold leading-none ${scoreColor(score)}`}>{score}</span>
                      <span className="text-[9px] text-muted-foreground uppercase tracking-wider mt-0.5">score</span>
                    </div>
                  </div>
                </SheetHeader>

                <div className="mt-5 space-y-5">
                  {/* Badges */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {score >= 75 && (
                      <Badge className="bg-red-500/15 text-red-500 border-red-500/40 gap-1">
                        <Flame className="h-3 w-3" /> Lead Quente
                      </Badge>
                    )}
                    {size && <Badge variant="outline" className={size.color}>{size.label} Porte</Badge>}
                    {selected.metadata?.sector && <Badge variant="outline">{selected.metadata.sector}</Badge>}
                    <Badge variant="outline" className={statusOpt.color}>{statusOpt.label}</Badge>
                  </div>

                  {/* Status select */}
                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">Status do lead</p>
                    <Select value={selected.status} onValueChange={(v) => {
                      updateStatus(selected.id, v);
                      setSelected({ ...selected, status: v });
                    }}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />

                  {/* Detalhes */}
                  {selected.description && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                        <Tag className="h-3.5 w-3.5" /> Por que é um bom lead
                      </p>
                      <p className="text-sm leading-relaxed">{selected.description}</p>
                    </div>
                  )}

                  {selected.metadata?.suggested_action && (
                    <div className="space-y-1.5 bg-primary/5 border border-primary/20 rounded-lg p-3">
                      <p className="text-xs font-medium text-primary flex items-center gap-1.5">
                        <Zap className="h-3.5 w-3.5" /> Ação sugerida pela IA
                      </p>
                      <p className="text-sm leading-relaxed">{selected.metadata.suggested_action}</p>
                    </div>
                  )}

                  {/* Metadata grid */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Globe className="h-3 w-3" /> Fonte
                      </p>
                      <p className="font-medium">{selected.source || 'manual'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                        <Calendar className="h-3 w-3" /> Detectado
                      </p>
                      <p className="font-medium">{new Date(selected.detected_at).toLocaleString('pt-BR')}</p>
                    </div>
                    {selected.metadata?.location && (
                      <div className="space-y-0.5 col-span-2">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                          <MapPin className="h-3 w-3" /> Localização
                        </p>
                        <p className="font-medium">{selected.metadata.location}</p>
                      </div>
                    )}
                  </div>

                  {selected.source_url && (
                    <Button variant="outline" className="w-full" asChild>
                      <a href={selected.source_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" /> Abrir fonte original
                      </a>
                    </Button>
                  )}

                  <Separator />

                  {/* Ações */}
                  <div className="space-y-2">
                    <Button
                      className="w-full"
                      onClick={() => convertToClient(selected)}
                      disabled={convertingId === selected.id}
                    >
                      {convertingId === selected.id
                        ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        : <UserPlus className="h-4 w-4 mr-2" />}
                      Virar cliente do CRM
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => handleDelete(selected.id)}
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
