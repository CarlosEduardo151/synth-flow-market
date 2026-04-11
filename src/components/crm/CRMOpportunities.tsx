
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Plus, DollarSign, Calendar, TrendingUp, TrendingDown, Target,
  Clock, User, MoreHorizontal, Eye, Pencil, Trash2, Trophy,
  AlertTriangle, ArrowRight, Percent, Flame, BarChart3,
  PhoneCall, Handshake
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Opportunity {
  id: string;
  customer_id: string;
  title: string;
  value: number;
  stage: string;
  expected_close_date: string | null;
  notes: string | null;
  created_at: string;
  priority?: string;
  probability?: number;
  source?: string;
  lost_reason?: string;
}

interface CRMOpportunitiesProps {
  opportunities: Opportunity[];
  customers: any[];
  onRefresh: () => void;
}

const stages = [
  { value: 'novo_lead', label: 'Novo Lead', icon: Target, gradient: 'from-blue-500/10 to-blue-600/5', border: 'border-blue-500/30', text: 'text-blue-600', dot: 'bg-blue-500' },
  { value: 'qualificacao', label: 'Qualificação', icon: Eye, gradient: 'from-indigo-500/10 to-indigo-600/5', border: 'border-indigo-500/30', text: 'text-indigo-600', dot: 'bg-indigo-500' },
  { value: 'proposta', label: 'Proposta', icon: ArrowRight, gradient: 'from-amber-500/10 to-amber-600/5', border: 'border-amber-500/30', text: 'text-amber-600', dot: 'bg-amber-500' },
  { value: 'negociacao', label: 'Negociação', icon: Percent, gradient: 'from-orange-500/10 to-orange-600/5', border: 'border-orange-500/30', text: 'text-orange-600', dot: 'bg-orange-500' },
  { value: 'fechado_ganho', label: 'Ganho', icon: Trophy, gradient: 'from-green-500/10 to-green-600/5', border: 'border-green-500/30', text: 'text-green-600', dot: 'bg-green-500' },
  { value: 'fechado_perdido', label: 'Perdido', icon: TrendingDown, gradient: 'from-red-500/10 to-red-600/5', border: 'border-red-500/30', text: 'text-red-600', dot: 'bg-red-500' },
];

// Map legacy stages
const mapStage = (s: string) => {
  if (s === 'contato_feito') return 'qualificacao';
  if (s === 'em_negociacao') return 'negociacao';
  return s;
};

const priorities = [
  { value: 'baixa', label: 'Baixa', color: 'bg-muted text-muted-foreground' },
  { value: 'media', label: 'Média', color: 'bg-amber-500/10 text-amber-700' },
  { value: 'alta', label: 'Alta', color: 'bg-orange-500/10 text-orange-700' },
  { value: 'urgente', label: 'Urgente', color: 'bg-red-500/10 text-red-700' },
];

const sources = [
  { value: 'whatsapp', label: 'WhatsApp' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'site', label: 'Site' },
  { value: 'redes_sociais', label: 'Redes Sociais' },
  { value: 'cold_call', label: 'Cold Call' },
  { value: 'evento', label: 'Evento' },
  { value: 'outro', label: 'Outro' },
];

export const CRMOpportunities = ({ opportunities, customers, onRefresh }: CRMOpportunitiesProps) => {
  const [isAddingOpportunity, setIsAddingOpportunity] = useState(false);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [detailOpp, setDetailOpp] = useState<Opportunity | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');

  // Normalize stages
  const normalizedOpps = useMemo(() =>
    opportunities.map(o => ({ ...o, stage: mapStage(o.stage) })),
    [opportunities]
  );

  const filtered = useMemo(() => {
    if (filterPriority === 'all') return normalizedOpps;
    return normalizedOpps.filter(o => (o.priority || 'media') === filterPriority);
  }, [normalizedOpps, filterPriority]);

  // KPIs
  const stats = useMemo(() => {
    const active = normalizedOpps.filter(o => !['fechado_ganho', 'fechado_perdido'].includes(o.stage));
    const won = normalizedOpps.filter(o => o.stage === 'fechado_ganho');
    const lost = normalizedOpps.filter(o => o.stage === 'fechado_perdido');
    const totalPipeline = active.reduce((s, o) => s + Number(o.value || 0), 0);
    const totalWon = won.reduce((s, o) => s + Number(o.value || 0), 0);
    const winRate = won.length + lost.length > 0
      ? Math.round((won.length / (won.length + lost.length)) * 100)
      : 0;
    const avgTicket = won.length > 0 ? totalWon / won.length : 0;

    // Overdue opportunities
    const today = new Date().toISOString().split('T')[0];
    const overdue = active.filter(o => o.expected_close_date && o.expected_close_date < today);

    return { active: active.length, totalPipeline, totalWon, winRate, avgTicket, overdue: overdue.length, won: won.length, lost: lost.length };
  }, [normalizedOpps]);

  const handleAddOpportunity = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);

    try {
      const { error } = await (supabase.from('crm_opportunities' as any).insert({
        customer_id: formData.get('customer_id') as string,
        title: formData.get('title') as string,
        value: parseFloat(formData.get('value') as string) || 0,
        stage: formData.get('stage') as string || 'novo_lead',
        expected_close_date: formData.get('expected_close_date') as string || null,
        notes: formData.get('notes') as string || null,
        priority: formData.get('priority') as string || 'media',
        probability: parseInt(formData.get('probability') as string) || 50,
        source: formData.get('source') as string || null,
      }) as any);

      if (!error) {
        toast({ title: "Oportunidade criada com sucesso!" });
        setIsAddingOpportunity(false);
        onRefresh();
      } else {
        toast({ title: "Erro ao criar oportunidade", variant: "destructive" });
      }
    } catch {
      toast({ title: "Erro ao criar oportunidade", variant: "destructive" });
    }
  };

  const handleDragStart = (opportunityId: string) => setDraggedItem(opportunityId);
  const handleDragOver = (e: React.DragEvent, stage: string) => {
    e.preventDefault();
    setDragOverStage(stage);
  };
  const handleDragLeave = () => setDragOverStage(null);

  const handleDrop = async (newStage: string) => {
    setDragOverStage(null);
    if (!draggedItem) return;

    try {
      const { error } = await (supabase
        .from('crm_opportunities' as any)
        .update({ stage: newStage })
        .eq('id', draggedItem) as any);

      if (!error) {
        toast({ title: "Oportunidade movida!" });
        onRefresh();
      }
    } catch {
      console.error('Error updating opportunity');
    }
    setDraggedItem(null);
  };

  const handleDelete = async (id: string) => {
    try {
      await (supabase.from('crm_opportunities' as any).delete().eq('id', id) as any);
      toast({ title: "Oportunidade removida" });
      setDetailOpp(null);
      onRefresh();
    } catch {
      toast({ title: "Erro ao remover", variant: "destructive" });
    }
  };

  const getOpportunitiesByStage = (stage: string) => filtered.filter(o => o.stage === stage);

  const getCustomerName = (customerId: string) => {
    const customer = customers.find(c => c.id === customerId);
    return customer?.name || 'Desconhecido';
  };

  const getDaysInStage = (createdAt: string) => {
    const days = Math.floor((Date.now() - new Date(createdAt).getTime()) / 86400000);
    return days;
  };

  const isOverdue = (date: string | null) => {
    if (!date) return false;
    return date < new Date().toISOString().split('T')[0];
  };

  const getPriorityInfo = (p: string) => priorities.find(pr => pr.value === p) || priorities[1];

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Pipeline Ativo</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(stats.totalPipeline)}</p>
                <p className="text-xs text-muted-foreground">{stats.active} oportunidades</p>
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Total Ganho</p>
                <p className="text-xl font-bold mt-1 text-green-600">{formatCurrency(stats.totalWon)}</p>
                <p className="text-xs text-muted-foreground">{stats.won} negócios</p>
              </div>
              <div className="p-2.5 rounded-lg bg-green-500/10">
                <Trophy className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Taxa de Conversão</p>
                <p className="text-xl font-bold mt-1">{stats.winRate}%</p>
                <Progress value={stats.winRate} className="mt-2 h-1.5" />
              </div>
              <div className="p-2.5 rounded-lg bg-primary/10">
                <TrendingUp className="h-5 w-5 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground font-medium">Ticket Médio</p>
                <p className="text-xl font-bold mt-1">{formatCurrency(stats.avgTicket)}</p>
                {stats.overdue > 0 && (
                  <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
                    <AlertTriangle className="h-3 w-3" /> {stats.overdue} atrasadas
                  </p>
                )}
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10">
                <DollarSign className="h-5 w-5 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Pipeline de Vendas</h2>
        </div>
        <div className="flex items-center gap-2">
          <Select value={filterPriority} onValueChange={setFilterPriority}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Prioridade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {priorities.map(p => (
                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex border rounded-md overflow-hidden">
            <Button
              variant={viewMode === 'kanban' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none h-8 px-3 text-xs"
              onClick={() => setViewMode('kanban')}
            >
              Kanban
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'ghost'}
              size="sm"
              className="rounded-none h-8 px-3 text-xs"
              onClick={() => setViewMode('list')}
            >
              Lista
            </Button>
          </div>

          <Dialog open={isAddingOpportunity} onOpenChange={setIsAddingOpportunity}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-8">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Nova Oportunidade
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <form onSubmit={handleAddOpportunity}>
                <DialogHeader>
                  <DialogTitle>Nova Oportunidade</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Cliente *</Label>
                      <Select name="customer_id" required>
                        <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                        <SelectContent>
                          {customers.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Origem</Label>
                      <Select name="source" defaultValue="whatsapp">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {sources.map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Título *</Label>
                    <Input name="title" placeholder="Ex: Contrato de manutenção mensal" required />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Valor (R$)</Label>
                      <Input name="value" type="number" step="0.01" placeholder="0,00" />
                    </div>
                    <div className="space-y-2">
                      <Label>Probabilidade (%)</Label>
                      <Input name="probability" type="number" min="0" max="100" defaultValue="50" />
                    </div>
                    <div className="space-y-2">
                      <Label>Prioridade</Label>
                      <Select name="priority" defaultValue="media">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {priorities.map(p => (
                            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Estágio</Label>
                      <Select name="stage" defaultValue="novo_lead">
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {stages.filter(s => s.value !== 'fechado_perdido').map(s => (
                            <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Previsão de Fechamento</Label>
                      <Input name="expected_close_date" type="date" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Observações</Label>
                    <Textarea name="notes" placeholder="Detalhes sobre a oportunidade..." rows={3} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsAddingOpportunity(false)}>Cancelar</Button>
                  <Button type="submit">Criar Oportunidade</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Kanban View */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {stages.map(stage => {
            const stageOpps = getOpportunitiesByStage(stage.value);
            const totalValue = stageOpps.reduce((s, o) => s + Number(o.value || 0), 0);
            const StageIcon = stage.icon;
            const isDragOver = dragOverStage === stage.value;

            return (
              <div
                key={stage.value}
                onDragOver={(e) => handleDragOver(e, stage.value)}
                onDragLeave={handleDragLeave}
                onDrop={() => handleDrop(stage.value)}
                className="min-w-0"
              >
                <div className={`rounded-xl border ${isDragOver ? stage.border + ' bg-gradient-to-b ' + stage.gradient : 'border-border'} transition-all duration-200`}>
                  {/* Column Header */}
                  <div className={`px-3 py-3 border-b bg-gradient-to-r ${stage.gradient} rounded-t-xl`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${stage.dot}`} />
                        <span className="text-sm font-semibold">{stage.label}</span>
                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold">
                          {stageOpps.length}
                        </Badge>
                      </div>
                      <StageIcon className={`h-4 w-4 ${stage.text} opacity-60`} />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">
                      {formatCurrency(totalValue)}
                    </p>
                  </div>

                  {/* Cards */}
                  <div className="p-2 space-y-2 min-h-[120px] max-h-[500px] overflow-y-auto">
                    {stageOpps.map(opp => {
                      const days = getDaysInStage(opp.created_at);
                      const overdue = isOverdue(opp.expected_close_date);
                      const priorityInfo = getPriorityInfo(opp.priority || 'media');

                      return (
                        <Card
                          key={opp.id}
                          draggable
                          onDragStart={() => handleDragStart(opp.id)}
                          className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-all duration-150 border ${
                            draggedItem === opp.id ? 'opacity-40 scale-95' : ''
                          } ${overdue ? 'border-red-500/30' : ''}`}
                        >
                          <CardContent className="p-3 space-y-2">
                            {/* Header */}
                            <div className="flex items-start justify-between gap-1">
                              <h4 className="font-semibold text-sm leading-tight line-clamp-2 flex-1">{opp.title}</h4>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                                    <MoreHorizontal className="h-3.5 w-3.5" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-36">
                                  <DropdownMenuItem onClick={() => setDetailOpp(opp)}>
                                    <Eye className="h-3.5 w-3.5 mr-2" /> Detalhes
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(opp.id)}>
                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Excluir
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>

                            {/* Customer */}
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <User className="h-3 w-3 shrink-0" />
                              <span className="truncate">{getCustomerName(opp.customer_id)}</span>
                            </div>

                            {/* Value + Probability */}
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-bold text-primary">
                                {formatCurrency(Number(opp.value || 0))}
                              </span>
                              {(opp.probability !== undefined && opp.probability !== null) && (
                                <Badge variant="outline" className="text-[10px] h-5 gap-0.5">
                                  <Percent className="h-2.5 w-2.5" />{opp.probability}
                                </Badge>
                              )}
                            </div>

                            {/* Weighted value bar */}
                            {opp.probability !== undefined && opp.value > 0 && (
                              <Progress value={opp.probability || 50} className="h-1" />
                            )}

                            {/* Footer badges */}
                            <div className="flex items-center justify-between pt-1 flex-wrap gap-1">
                              <Badge variant="outline" className={`text-[10px] h-5 ${priorityInfo.color}`}>
                                {priorityInfo.label}
                              </Badge>

                              <div className="flex items-center gap-2">
                                {overdue && (
                                  <span className="text-[10px] text-red-500 flex items-center gap-0.5 font-medium">
                                    <Flame className="h-3 w-3" /> Atrasada
                                  </span>
                                )}
                                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                                  <Clock className="h-3 w-3" /> {days}d
                                </span>
                              </div>
                            </div>

                            {/* Close date */}
                            {opp.expected_close_date && (
                              <div className={`flex items-center gap-1 text-[10px] ${overdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                                <Calendar className="h-3 w-3" />
                                Prev: {new Date(opp.expected_close_date).toLocaleDateString('pt-BR')}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}

                    {stageOpps.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                        <StageIcon className="h-6 w-6 mb-2 opacity-30" />
                        <p className="text-xs">Nenhuma oportunidade</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Oportunidade</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Cliente</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Valor</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Estágio</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Prioridade</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Prob.</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Fechamento</th>
                    <th className="text-right py-3 px-4 font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-muted-foreground">
                        Nenhuma oportunidade encontrada
                      </td>
                    </tr>
                  ) : filtered.map(opp => {
                    const stageInfo = stages.find(s => s.value === opp.stage) || stages[0];
                    const priorityInfo = getPriorityInfo(opp.priority || 'media');
                    const overdue = isOverdue(opp.expected_close_date);

                    return (
                      <tr key={opp.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="py-3 px-4">
                          <span className="font-medium">{opp.title}</span>
                          {opp.source && (
                            <span className="text-xs text-muted-foreground ml-2">via {opp.source}</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{getCustomerName(opp.customer_id)}</td>
                        <td className="py-3 px-4 font-semibold">{formatCurrency(Number(opp.value || 0))}</td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-1.5">
                            <div className={`w-2 h-2 rounded-full ${stageInfo.dot}`} />
                            <span className="text-xs">{stageInfo.label}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className={`text-xs ${priorityInfo.color}`}>
                            {priorityInfo.label}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">{opp.probability ?? 50}%</td>
                        <td className="py-3 px-4">
                          {opp.expected_close_date ? (
                            <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
                              {new Date(opp.expected_close_date).toLocaleDateString('pt-BR')}
                              {overdue && ' ⚠️'}
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDetailOpp(opp)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500" onClick={() => handleDelete(opp.id)}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!detailOpp} onOpenChange={() => setDetailOpp(null)}>
        <DialogContent className="max-w-md">
          {detailOpp && (() => {
            const stageInfo = stages.find(s => s.value === detailOpp.stage) || stages[0];
            const priorityInfo = getPriorityInfo(detailOpp.priority || 'media');
            const overdue = isOverdue(detailOpp.expected_close_date);
            const weighted = Number(detailOpp.value || 0) * ((detailOpp.probability ?? 50) / 100);

            return (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${stageInfo.dot}`} />
                    {detailOpp.title}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Valor</p>
                      <p className="font-bold text-lg">{formatCurrency(Number(detailOpp.value || 0))}</p>
                    </div>
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">Valor Ponderado</p>
                      <p className="font-bold text-lg text-primary">{formatCurrency(weighted)}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cliente</span>
                      <span className="font-medium">{getCustomerName(detailOpp.customer_id)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Estágio</span>
                      <Badge variant="outline" className={`${stageInfo.text} text-xs`}>{stageInfo.label}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Prioridade</span>
                      <Badge variant="outline" className={`text-xs ${priorityInfo.color}`}>{priorityInfo.label}</Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Probabilidade</span>
                      <span>{detailOpp.probability ?? 50}%</span>
                    </div>
                    {detailOpp.source && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Origem</span>
                        <span>{sources.find(s => s.value === detailOpp.source)?.label || detailOpp.source}</span>
                      </div>
                    )}
                    {detailOpp.expected_close_date && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Previsão</span>
                        <span className={overdue ? 'text-red-500 font-medium' : ''}>
                          {new Date(detailOpp.expected_close_date).toLocaleDateString('pt-BR')}
                          {overdue && ' (Atrasada)'}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Criada em</span>
                      <span>{new Date(detailOpp.created_at).toLocaleDateString('pt-BR')}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Dias no pipeline</span>
                      <span>{getDaysInStage(detailOpp.created_at)} dias</span>
                    </div>
                  </div>

                  {detailOpp.notes && (
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground mb-1">Observações</p>
                      <p className="text-sm whitespace-pre-wrap">{detailOpp.notes}</p>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </div>
  );
};
