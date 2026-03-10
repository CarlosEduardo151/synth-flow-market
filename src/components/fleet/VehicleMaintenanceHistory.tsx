import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ServiceStageBadge, type ServiceStage } from '@/components/fleet/ServiceStagePipeline';
import type { FleetVehicle, FleetServiceOrder, FleetStageHistory } from '@/hooks/useFleetData';
import {
  Car, Wrench, Clock, Building2, CircleDollarSign, FileText,
  ChevronDown, ChevronRight, ArrowLeft, Calendar, Shield, CheckCircle2,
  TrendingUp, AlertTriangle, Loader2
} from 'lucide-react';

interface Props {
  vehicle: FleetVehicle;
  serviceOrders: FleetServiceOrder[];
  onBack: () => void;
}

interface BudgetSummary {
  id: string;
  service_order_id: string;
  total_bruto: number;
  total_pecas: number;
  total_mao_de_obra: number;
  comissao_pct: number;
  status: string;
  urgencia: string;
  created_at: string;
}

interface AuditSummary {
  budget_id: string;
  economia_potencial: number;
  total_orcamento: number;
  total_mercado: number;
  status: string;
}

export function VehicleMaintenanceHistory({ vehicle, serviceOrders, onBack }: Props) {
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [stageHistories, setStageHistories] = useState<Record<string, FleetStageHistory[]>>({});
  const [budgets, setBudgets] = useState<Record<string, BudgetSummary[]>>({});
  const [audits, setAudits] = useState<Record<string, AuditSummary[]>>({});
  const [loading, setLoading] = useState(true);

  // Filter SOs for this vehicle, sorted newest first
  const vehicleOrders = serviceOrders
    .filter(so => so.vehicle_id === vehicle.id)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Load budgets + audits for all SOs
  const loadData = useCallback(async () => {
    if (vehicleOrders.length === 0) { setLoading(false); return; }
    setLoading(true);

    const soIds = vehicleOrders.map(so => so.id);

    const [budgetRes, auditRes] = await Promise.all([
      supabase.from('fleet_budgets').select('id, service_order_id, total_bruto, total_pecas, total_mao_de_obra, comissao_pct, status, urgencia, created_at').in('service_order_id', soIds),
      supabase.from('fleet_budget_audit_results').select('budget_id, economia_potencial, total_orcamento, total_mercado, status').in('budget_id', soIds), // will filter after
    ]);

    // Group budgets by SO
    const bMap: Record<string, BudgetSummary[]> = {};
    (budgetRes.data || []).forEach((b: any) => {
      if (!bMap[b.service_order_id]) bMap[b.service_order_id] = [];
      bMap[b.service_order_id].push(b);
    });
    setBudgets(bMap);

    // For audits, we need budget_ids from budgets
    const allBudgetIds = (budgetRes.data || []).map((b: any) => b.id);
    if (allBudgetIds.length > 0) {
      const { data: auditData } = await supabase
        .from('fleet_budget_audit_results')
        .select('budget_id, economia_potencial, total_orcamento, total_mercado, status')
        .in('budget_id', allBudgetIds);

      const aMap: Record<string, AuditSummary[]> = {};
      (auditData || []).forEach((a: any) => {
        // Map audit to SO via budget
        const budget = (budgetRes.data || []).find((b: any) => b.id === a.budget_id);
        if (budget) {
          const soId = (budget as any).service_order_id;
          if (!aMap[soId]) aMap[soId] = [];
          aMap[soId].push(a);
        }
      });
      setAudits(aMap);
    }

    setLoading(false);
  }, [vehicleOrders.length]);

  useEffect(() => { loadData(); }, [loadData]);

  // Load stage history on expand
  const toggleExpand = async (orderId: string) => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
      return;
    }
    setExpandedOrder(orderId);
    if (!stageHistories[orderId]) {
      const { data } = await supabase
        .from('fleet_stage_history')
        .select('*')
        .eq('service_order_id', orderId)
        .order('created_at', { ascending: true });
      setStageHistories(prev => ({ ...prev, [orderId]: (data as FleetStageHistory[]) || [] }));
    }
  };

  // Aggregate stats
  const totalOrders = vehicleOrders.length;
  const completedOrders = vehicleOrders.filter(so => so.stage === 'veiculo_entregue').length;
  const totalSpent = Object.values(budgets).flat().reduce((sum, b) => sum + (b.total_bruto || 0), 0);
  const totalSaved = Object.values(audits).flat().reduce((sum, a) => sum + (a.economia_potencial || 0), 0);

  const STAGE_LABELS: Record<string, string> = {
    checkin: 'Check-In',
    orcamento_enviado: 'Orçamento Enviado',
    orcamento_analise: 'Orçamento em Análise',
    orcamento_aprovado: 'Orçamento Aprovado',
    veiculo_finalizado: 'Veículo Finalizado',
    veiculo_entregue: 'Veículo Entregue',
  };

  const STAGE_ICONS: Record<string, React.ReactNode> = {
    checkin: <Car className="w-3.5 h-3.5" />,
    orcamento_enviado: <FileText className="w-3.5 h-3.5" />,
    orcamento_analise: <Shield className="w-3.5 h-3.5" />,
    orcamento_aprovado: <CheckCircle2 className="w-3.5 h-3.5" />,
    veiculo_finalizado: <Wrench className="w-3.5 h-3.5" />,
    veiculo_entregue: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
            <Car className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground font-mono">{vehicle.placa}</h2>
            <p className="text-sm text-muted-foreground">
              {vehicle.marca} {vehicle.modelo} {vehicle.ano ? `(${vehicle.ano})` : ''} · {(vehicle.km_atual || 0).toLocaleString('pt-BR')} km
            </p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total de Serviços', value: totalOrders, icon: Wrench, color: 'text-primary' },
          { label: 'Concluídos', value: completedOrders, icon: CheckCircle2, color: 'text-emerald-500' },
          { label: 'Gasto Total', value: totalSpent.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: CircleDollarSign, color: 'text-amber-500' },
          { label: 'Economia VERO', value: totalSaved.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), icon: TrendingUp, color: 'text-emerald-500' },
        ].map(kpi => (
          <Card key={kpi.label} className="border border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
                <span className="text-[11px] text-muted-foreground uppercase font-semibold tracking-wider">{kpi.label}</span>
              </div>
              <p className="text-xl font-bold text-foreground">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : vehicleOrders.length === 0 ? (
        <Card className="border border-border/50">
          <CardContent className="p-12 text-center">
            <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-foreground">Nenhum serviço registrado</h3>
            <p className="text-sm text-muted-foreground mt-1">O histórico de manutenções aparecerá aqui.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          {/* Vertical line */}
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />

          <div className="space-y-4">
            {vehicleOrders.map((order, idx) => {
              const isExpanded = expandedOrder === order.id;
              const orderBudgets = budgets[order.id] || [];
              const orderAudits = audits[order.id] || [];
              const budget = orderBudgets[0];
              const audit = orderAudits[0];
              const isActive = order.stage !== 'veiculo_entregue';
              const history = stageHistories[order.id] || [];

              return (
                <div key={order.id} className="relative pl-12">
                  {/* Timeline dot */}
                  <div className={`absolute left-3 top-4 w-4 h-4 rounded-full border-2 z-10 ${
                    isActive
                      ? 'bg-primary border-primary animate-pulse'
                      : 'bg-muted border-border'
                  }`} />

                  <Card
                    className={`border shadow-sm cursor-pointer transition-all hover:border-primary/30 ${
                      isActive ? 'border-primary/20 bg-primary/[0.02]' : 'border-border/50'
                    }`}
                    onClick={() => toggleExpand(order.id)}
                  >
                    <CardContent className="p-4">
                      {/* Header row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-foreground">
                                OS #{(idx + 1).toString().padStart(3, '0')}
                              </span>
                              <ServiceStageBadge stage={order.stage as ServiceStage} />
                              {isActive && (
                                <Badge className="text-[10px] bg-amber-500/10 text-amber-600 border-amber-500/20" variant="outline">
                                  Em andamento
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                              {order.oficina_nome && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3 h-3" /> {order.oficina_nome}
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {order.data_entrada ? new Date(order.data_entrada).toLocaleDateString('pt-BR') : new Date(order.created_at).toLocaleDateString('pt-BR')}
                              </span>
                              {order.data_entrega && (
                                <span className="flex items-center gap-1">
                                  → {new Date(order.data_entrega).toLocaleDateString('pt-BR')}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right hidden sm:block">
                          {budget ? (
                            <p className="text-sm font-bold text-foreground">
                              {budget.total_bruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          ) : order.valor_orcamento ? (
                            <p className="text-sm font-bold text-foreground">
                              {order.valor_orcamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          ) : null}
                          {audit && audit.economia_potencial > 0 && (
                            <p className="text-[10px] text-emerald-500 font-medium flex items-center gap-1 justify-end">
                              <TrendingUp className="w-3 h-3" /> Economia: {audit.economia_potencial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {order.descricao_servico && (
                        <p className="text-xs text-muted-foreground mt-2 ml-7 line-clamp-2">{order.descricao_servico}</p>
                      )}

                      {/* Expanded detail */}
                      {isExpanded && (
                        <div className="mt-4 ml-7 space-y-4" onClick={e => e.stopPropagation()}>
                          <Separator />

                          {/* Budget breakdown */}
                          {budget && (
                            <div className="space-y-2">
                              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <CircleDollarSign className="w-3.5 h-3.5 text-amber-500" /> Orçamento
                              </h4>
                              <div className="grid grid-cols-3 gap-2">
                                <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                                  <p className="text-[10px] text-muted-foreground uppercase">Peças</p>
                                  <p className="text-sm font-bold text-foreground">{budget.total_pecas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                                  <p className="text-[10px] text-muted-foreground uppercase">Mão de Obra</p>
                                  <p className="text-sm font-bold text-foreground">{budget.total_mao_de_obra.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                </div>
                                <div className="bg-muted/30 rounded-lg p-3 border border-border/30">
                                  <p className="text-[10px] text-muted-foreground uppercase">Total Bruto</p>
                                  <p className="text-sm font-bold text-foreground">{budget.total_bruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                </div>
                              </div>
                            </div>
                          )}

                          {/* Audit result */}
                          {audit && (
                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-lg p-3 space-y-1">
                              <h4 className="text-xs font-semibold text-emerald-600 flex items-center gap-1.5">
                                <Shield className="w-3.5 h-3.5" /> Auditoria VERO
                              </h4>
                              <div className="flex items-center gap-4 text-xs">
                                <span className="text-muted-foreground">Orçado: <strong className="text-foreground">{audit.total_orcamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></span>
                                <span className="text-muted-foreground">Mercado: <strong className="text-foreground">{audit.total_mercado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></span>
                                <span className="text-emerald-600 font-semibold">Economia: {audit.economia_potencial.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              </div>
                            </div>
                          )}

                          {/* Stage timeline */}
                          <div className="space-y-2">
                            <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-primary" /> Linha do Tempo
                            </h4>
                            {history.length === 0 ? (
                              <div className="flex items-center gap-2 py-2">
                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Carregando...</span>
                              </div>
                            ) : (
                              <div className="relative pl-4">
                                <div className="absolute left-[7px] top-1 bottom-1 w-px bg-border" />
                                {history.map((h, hIdx) => (
                                  <div key={h.id} className="relative pl-5 pb-3 last:pb-0">
                                    <div className={`absolute left-0 top-1.5 w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${
                                      hIdx === history.length - 1
                                        ? 'bg-primary border-primary'
                                        : 'bg-background border-muted-foreground/30'
                                    }`}>
                                      {hIdx === history.length - 1 && <div className="w-1.5 h-1.5 rounded-full bg-primary-foreground" />}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs font-medium text-foreground flex items-center gap-1">
                                          {STAGE_ICONS[h.to_stage] || <Clock className="w-3.5 h-3.5" />}
                                          {STAGE_LABELS[h.to_stage] || h.to_stage}
                                        </span>
                                        {h.changed_by && (
                                          <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                            {h.changed_by}
                                          </Badge>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {new Date(h.created_at).toLocaleDateString('pt-BR')} às {new Date(h.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                      {h.notes && (
                                        <p className="text-[11px] text-muted-foreground mt-1 italic">"{h.notes}"</p>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
