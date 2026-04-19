
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
  PhoneCall, Handshake, GripVertical
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor,
  useSensor, useSensors, useDraggable, useDroppable, closestCorners,
  KeyboardSensor,
} from '@dnd-kit/core';

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
  customerProductId: string;
  onRefresh: () => void;
}

const stages = [
  { value: 'novo_lead', label: 'Novo Lead', icon: Target, gradient: 'from-blue-500/10 to-blue-600/5', border: 'border-blue-500/30', text: 'text-blue-600', dot: 'bg-blue-500' },
  { value: 'qualificacao', label: 'Qualificação', icon: Eye, gradient: 'from-indigo-500/10 to-indigo-600/5', border: 'border-indigo-500/30', text: 'text-indigo-600', dot: 'bg-indigo-500' },
  { value: 'contato', label: 'Contato Feito', icon: PhoneCall, gradient: 'from-cyan-500/10 to-cyan-600/5', border: 'border-cyan-500/30', text: 'text-cyan-600', dot: 'bg-cyan-500' },
  { value: 'proposta', label: 'Proposta', icon: ArrowRight, gradient: 'from-amber-500/10 to-amber-600/5', border: 'border-amber-500/30', text: 'text-amber-600', dot: 'bg-amber-500' },
  { value: 'negociacao', label: 'Negociação', icon: Percent, gradient: 'from-orange-500/10 to-orange-600/5', border: 'border-orange-500/30', text: 'text-orange-600', dot: 'bg-orange-500' },
  { value: 'compromisso', label: 'Compromisso', icon: Handshake, gradient: 'from-purple-500/10 to-purple-600/5', border: 'border-purple-500/30', text: 'text-purple-600', dot: 'bg-purple-500' },
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

export const CRMOpportunities = ({ opportunities, customers, customerProductId, onRefresh }: CRMOpportunitiesProps) => {
  const [isAddingOpportunity, setIsAddingOpportunity] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'list'>('kanban');
  const [detailOpp, setDetailOpp] = useState<Opportunity | null>(null);
  const [filterPriority, setFilterPriority] = useState<string>('all');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

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
    const customerId = formData.get('customer_id') as string;
    
    try {
      const { error } = await (supabase.from('crm_opportunities' as any).insert({
        customer_product_id: customerProductId,
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

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const oppId = String(active.id);
    const newStage = String(over.id);
    const opp = normalizedOpps.find(o => o.id === oppId);
    if (!opp || opp.stage === newStage) return;

    // Optimistic toast
    const stageInfo = stages.find(s => s.value === newStage);
    toast({ title: `Movido para ${stageInfo?.label || newStage}` });

    try {
      const { error } = await (supabase
        .from('crm_opportunities' as any)
        .update({ stage: newStage })
        .eq('id', oppId) as any);

      if (!error) {
        onRefresh();
      } else {
        toast({ title: "Erro ao mover oportunidade", variant: "destructive" });
        onRefresh();
      }
    } catch {
      toast({ title: "Erro ao mover oportunidade", variant: "destructive" });
      onRefresh();
    }
  };

  const activeOpp = useMemo(
    () => activeId ? normalizedOpps.find(o => o.id === activeId) : null,
    [activeId, normalizedOpps]
  );

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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {stages.map(stage => {
              const stageOpps = getOpportunitiesByStage(stage.value);
              return (
                <KanbanColumn
                  key={stage.value}
                  stage={stage}
                  opps={stageOpps}
                  customers={customers}
                  onDetail={setDetailOpp}
                  onDelete={handleDelete}
                  formatCurrency={formatCurrency}
                  getCustomerName={getCustomerName}
                  getDaysInStage={getDaysInStage}
                  isOverdue={isOverdue}
                  getPriorityInfo={getPriorityInfo}
                  activeId={activeId}
                />
              );
            })}
          </div>
          <DragOverlay>
            {activeOpp ? (
              <OpportunityCardOverlay
                opp={activeOpp}
                getCustomerName={getCustomerName}
                formatCurrency={formatCurrency}
                getPriorityInfo={getPriorityInfo}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
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

// ============= Drag & Drop subcomponents =============

interface KanbanColumnProps {
  stage: typeof stages[number];
  opps: Opportunity[];
  customers: any[];
  onDetail: (o: Opportunity) => void;
  onDelete: (id: string) => void;
  formatCurrency: (n: number) => string;
  getCustomerName: (id: string) => string;
  getDaysInStage: (createdAt: string) => number;
  isOverdue: (date: string | null) => boolean;
  getPriorityInfo: (p?: string) => { label: string; color: string };
  activeId: string | null;
}

const KanbanColumn = ({
  stage, opps, onDetail, onDelete, formatCurrency,
  getCustomerName, getDaysInStage, isOverdue, getPriorityInfo, activeId,
}: KanbanColumnProps) => {
  const { setNodeRef, isOver } = useDroppable({ id: stage.value });
  const StageIcon = stage.icon;
  const stageTotal = opps.reduce((s, o) => s + Number(o.value || 0), 0);

  return (
    <div
      ref={setNodeRef}
      className={`rounded-lg border bg-gradient-to-b ${stage.gradient} ${stage.border} transition-all ${
        isOver ? 'ring-2 ring-primary scale-[1.01] shadow-lg' : ''
      }`}
    >
      <div className="px-3 py-2.5 border-b border-border/40 sticky top-0 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-2 mb-1">
          <div className="flex items-center gap-1.5 min-w-0">
            <div className={`w-1.5 h-1.5 rounded-full ${stage.dot} shrink-0`} />
            <StageIcon className={`w-3.5 h-3.5 ${stage.text} shrink-0`} />
            <span className="text-xs font-semibold truncate">{stage.label}</span>
          </div>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">{opps.length}</Badge>
        </div>
        <p className="text-[10px] text-muted-foreground">{formatCurrency(stageTotal)}</p>
      </div>

      <div className="p-2 space-y-2 min-h-[120px] max-h-[60vh] overflow-y-auto">
        {opps.length === 0 ? (
          <div className="text-center py-6 text-[11px] text-muted-foreground/60 border border-dashed rounded-md">
            Solte aqui
          </div>
        ) : (
          opps.map(opp => (
            <DraggableOpportunityCard
              key={opp.id}
              opp={opp}
              isDragging={activeId === opp.id}
              onDetail={onDetail}
              onDelete={onDelete}
              formatCurrency={formatCurrency}
              getCustomerName={getCustomerName}
              getDaysInStage={getDaysInStage}
              isOverdue={isOverdue}
              getPriorityInfo={getPriorityInfo}
            />
          ))
        )}
      </div>
    </div>
  );
};

interface DraggableCardProps {
  opp: Opportunity;
  isDragging: boolean;
  onDetail: (o: Opportunity) => void;
  onDelete: (id: string) => void;
  formatCurrency: (n: number) => string;
  getCustomerName: (id: string) => string;
  getDaysInStage: (createdAt: string) => number;
  isOverdue: (date: string | null) => boolean;
  getPriorityInfo: (p?: string) => { label: string; color: string };
}

const DraggableOpportunityCard = ({
  opp, isDragging, onDetail, onDelete, formatCurrency,
  getCustomerName, getDaysInStage, isOverdue, getPriorityInfo,
}: DraggableCardProps) => {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({ id: opp.id });
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
  const overdue = isOverdue(opp.expected_close_date);
  const priority = getPriorityInfo(opp.priority);
  const days = getDaysInStage(opp.created_at);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-md border bg-card p-2.5 hover:shadow-md transition-all ${
        isDragging ? 'opacity-30' : ''
      } ${overdue ? 'border-red-500/40' : ''}`}
    >
      <div className="flex items-start gap-1.5 mb-1.5">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground touch-none"
          aria-label="Arrastar"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onDetail(opp)}
          className="flex-1 text-left min-w-0"
        >
          <p className="text-xs font-semibold line-clamp-2 leading-tight">{opp.title}</p>
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="text-muted-foreground/60 hover:text-foreground opacity-0 group-hover:opacity-100">
              <MoreHorizontal className="w-3.5 h-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-36">
            <DropdownMenuItem onClick={() => onDetail(opp)}>
              <Eye className="w-3.5 h-3.5 mr-2" /> Detalhes
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(opp.id)} className="text-red-500">
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <p className="text-[10px] text-muted-foreground truncate mb-1.5">
        <User className="w-2.5 h-2.5 inline mr-1" />
        {getCustomerName(opp.customer_id)}
      </p>

      <div className="flex items-center justify-between gap-1">
        <span className="text-xs font-bold text-foreground">{formatCurrency(opp.value)}</span>
        <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${priority.color}`}>
          {priority.label}
        </Badge>
      </div>

      {(opp.probability !== undefined && opp.probability !== null) && (
        <div className="mt-1.5">
          <Progress value={opp.probability} className="h-1" />
          <p className="text-[9px] text-muted-foreground mt-0.5">{opp.probability}% prob.</p>
        </div>
      )}

      <div className="flex items-center gap-2 mt-1.5 text-[9px] text-muted-foreground">
        <span><Clock className="w-2.5 h-2.5 inline mr-0.5" />{days}d</span>
        {overdue && (
          <span className="text-red-500 font-medium">
            <AlertTriangle className="w-2.5 h-2.5 inline mr-0.5" />Atrasada
          </span>
        )}
      </div>
    </div>
  );
};

interface OverlayProps {
  opp: Opportunity;
  getCustomerName: (id: string) => string;
  formatCurrency: (n: number) => string;
  getPriorityInfo: (p?: string) => { label: string; color: string };
}

const OpportunityCardOverlay = ({ opp, getCustomerName, formatCurrency, getPriorityInfo }: OverlayProps) => {
  const priority = getPriorityInfo(opp.priority);
  return (
    <div className="rounded-md border-2 border-primary bg-card p-2.5 shadow-2xl rotate-2 cursor-grabbing w-64">
      <p className="text-xs font-semibold line-clamp-2 mb-1">{opp.title}</p>
      <p className="text-[10px] text-muted-foreground truncate mb-1.5">
        {getCustomerName(opp.customer_id)}
      </p>
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold">{formatCurrency(opp.value)}</span>
        <Badge variant="outline" className={`text-[9px] px-1 py-0 h-4 ${priority.color}`}>
          {priority.label}
        </Badge>
      </div>
    </div>
  );
};
