import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ServiceStageBadge, type ServiceStage } from './ServiceStagePipeline';
import { FleetEvidencePhotos } from './FleetEvidencePhotos';
import { BudgetAuditPanel, type AuditResult } from './BudgetAuditPanel';
import { generateBudgetPDF, type BudgetPDFData } from '@/lib/generateBudgetPDF';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog';
import {
  ChevronDown, Check, X, FileDown, MessageCircle,
  Package, Wrench, Loader2, Shield, ShieldCheck, ShieldAlert,
  DollarSign, Clock, Car
} from 'lucide-react';
import { toast } from 'sonner';
import type { FleetServiceOrder, FleetVehicle } from '@/hooks/useFleetData';

interface BudgetItem {
  id: string;
  tipo: string;
  codigo: string | null;
  descricao: string;
  quantidade: number;
  valor_unitario: number;
  valor_total: number;
  horas: number | null;
  valor_hora: number | null;
  marca: string | null;
  tipo_peca: string | null;
}

interface BudgetData {
  id: string;
  status: string;
  total_pecas: number;
  total_mao_de_obra: number;
  total_bruto: number;
  comissao_pct: number;
  total_liquido: number;
  laudo_tecnico: string | null;
  urgencia: string;
  observacoes: string | null;
}

interface Props {
  order: FleetServiceOrder;
  vehicle: FleetVehicle | undefined;
  customerProductId: string;
  saving: boolean;
  onApprove: (orderId: string, valor: number, notes: string) => Promise<boolean>;
  onReject: (orderId: string, notes: string) => Promise<boolean>;
  onQuestion: () => void;
  user: { id: string } | null;
}

export function BudgetApprovalCard({
  order, vehicle, customerProductId, saving, onApprove, onReject, onQuestion, user,
}: Props) {
  const [budget, setBudget] = useState<BudgetData | null>(null);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [notes, setNotes] = useState('');

  // Fetch budget, items, and audit result
  const loadBudgetDetails = useCallback(async () => {
    setLoading(true);
    try {
      const { data: budgets } = await supabase
        .from('fleet_budgets')
        .select('*')
        .eq('service_order_id', order.id)
        .order('created_at', { ascending: false })
        .limit(1);

      const b = budgets?.[0] as any;
      if (!b) { setLoading(false); return; }
      setBudget(b);

      const [itemsRes, auditRes] = await Promise.all([
        supabase.from('fleet_budget_items')
          .select('*').eq('budget_id', b.id).order('sort_order', { ascending: true }),
        supabase.from('fleet_budget_audit_results')
          .select('*').eq('budget_id', b.id).order('created_at', { ascending: false }).limit(1),
      ]);

      setItems((itemsRes.data || []) as BudgetItem[]);

      const audit = auditRes.data?.[0] as any;
      if (audit && audit.status === 'done') {
        setAuditResult({
          ok: true,
          auditId: audit.id,
          totalOrcamento: audit.total_orcamento,
          totalMercado: audit.total_mercado,
          economiaPotencial: audit.economia_potencial,
          items: audit.items || [],
          config: audit.metadata?.config || { fretePercent: 15, convenienciaPercent: 5, margemAtencao: 15, margemSobrepreco: 30 },
          alerts: (audit.items || []).filter((i: any) => i.status === 'sobrepreco').length,
          warnings: (audit.items || []).filter((i: any) => i.status === 'atencao').length,
        });
      }
    } catch (err) {
      console.error('Error loading budget details:', err);
    }
    setLoading(false);
  }, [order.id]);

  useEffect(() => { loadBudgetDetails(); }, [loadBudgetDetails]);

  const placa = vehicle?.placa || 'N/A';
  const modelo = vehicle ? `${vehicle.marca || ''} ${vehicle.modelo || ''}`.trim() : 'N/A';
  const km = vehicle?.km_atual || 0;
  const oficina = order.oficina_nome || 'Oficina';
  const dataEntrada = order.data_entrada ? new Date(order.data_entrada).toLocaleDateString('pt-BR') : '--';
  const valor = budget?.total_bruto || order.valor_orcamento || 0;

  const pecas = items.filter(i => i.tipo === 'peca');
  const servicos = items.filter(i => i.tipo === 'servico');

  const hasAuditAlerts = auditResult && (auditResult.alerts > 0 || auditResult.warnings > 0);

  const handleDownloadPDF = async () => {
    if (!budget) return;
    try {
      const operatorRes = user
        ? await supabase.from('fleet_operators')
            .select('cnpj, nome_fantasia, razao_social')
            .eq('user_id', user.id).limit(1).single()
        : { data: null };

      const operatorCnpj = operatorRes.data?.cnpj;
      const operatorName = operatorRes.data?.nome_fantasia || operatorRes.data?.razao_social;
      const fmtCnpj = operatorCnpj
        ? operatorCnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
        : null;
      const gestorLabel = fmtCnpj ? `${operatorName ? operatorName + ' — ' : ''}CNPJ ${fmtCnpj}` : 'Gestor da Frota';

      const pdfData: BudgetPDFData = {
        osNumber: `${placa}/${order.id.slice(0, 4).toUpperCase()}`,
        placa,
        veiculo: modelo,
        km,
        dataEntrada,
        oficinaNome: oficina,
        laudoTecnico: budget.laudo_tecnico || '',
        items: items.map(it => ({
          tipo: it.tipo,
          codigo: it.codigo || '',
          descricao: it.descricao,
          quantidade: it.quantidade,
          valor_unitario: it.valor_unitario,
          valor_total: it.valor_total,
          horas: it.horas,
          valor_hora: it.valor_hora,
        })),
        totalPecas: budget.total_pecas,
        totalMaoDeObra: budget.total_mao_de_obra,
        totalBruto: budget.total_bruto,
        comissaoPct: budget.comissao_pct,
        totalLiquido: budget.total_liquido,
        status: budget.status,
        budgetId: budget.id,
        approvedBy: order.stage === 'orcamento_aprovado' ? gestorLabel : undefined,
        approvedAt: order.stage === 'orcamento_aprovado' ? new Date().toLocaleDateString('pt-BR') : undefined,
      };
      generateBudgetPDF(pdfData);
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('Erro ao gerar PDF');
    }
  };

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <>
      <Card className="border border-border/50 shadow-sm overflow-hidden">
        {/* Urgency bar */}
        <div className={`h-1.5 ${
          budget?.urgencia === 'urgente' ? 'bg-red-500' :
          budget?.urgencia === 'alta' ? 'bg-amber-500' :
          order.stage === 'orcamento_enviado' ? 'bg-amber-500' : 'bg-primary'
        }`} />
        <CardContent className="p-5 space-y-4">
          {/* Header row */}
          <div className="flex flex-col lg:flex-row lg:items-start gap-4">
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <Car className="w-5 h-5 text-muted-foreground" />
                  <span className="font-mono font-bold text-foreground text-lg">{placa}</span>
                </div>
                <Separator orientation="vertical" className="h-5" />
                <span className="text-sm text-muted-foreground">{modelo}</span>
                <Separator orientation="vertical" className="h-5" />
                <span className="text-sm font-medium text-muted-foreground">{oficina}</span>
                <ServiceStageBadge stage={order.stage as ServiceStage} />
                {budget?.urgencia && budget.urgencia !== 'normal' && (
                  <Badge variant="destructive" className="text-[10px]">
                    {budget.urgencia === 'urgente' ? '🔴 URGENTE' : '🟡 ALTA PRIORIDADE'}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>KM: {km.toLocaleString('pt-BR')}</span>
                <span>·</span>
                <span>Entrada: {dataEntrada}</span>
                {budget && (
                  <>
                    <span>·</span>
                    <span>Comissão: {budget.comissao_pct}%</span>
                  </>
                )}
              </div>
            </div>

            {/* Value summary */}
            <div className="flex flex-col items-end gap-1 shrink-0 lg:min-w-[200px]">
              <p className="text-2xl font-bold text-foreground">{fmt(valor)}</p>
              <p className="text-xs text-muted-foreground">Valor total do orçamento</p>
              {auditResult && auditResult.economiaPotencial > 0 && (
                <div className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <Shield className="w-3.5 h-3.5" />
                  Economia potencial: {fmt(auditResult.economiaPotencial)}
                </div>
              )}
            </div>
          </div>

          {/* VERO Audit summary badge */}
          {auditResult && (
            <div className={`flex items-center gap-2 p-3 rounded-lg border ${
              auditResult.alerts > 0
                ? 'bg-red-500/5 border-red-500/20'
                : auditResult.warnings > 0
                  ? 'bg-amber-500/5 border-amber-500/20'
                  : 'bg-emerald-500/5 border-emerald-500/20'
            }`}>
              {auditResult.alerts > 0 ? (
                <ShieldAlert className="w-5 h-5 text-red-500 shrink-0" />
              ) : auditResult.warnings > 0 ? (
                <Shield className="w-5 h-5 text-amber-500 shrink-0" />
              ) : (
                <ShieldCheck className="w-5 h-5 text-emerald-500 shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground">
                  {auditResult.alerts > 0
                    ? `VERO detectou ${auditResult.alerts} sobrepreço(s)`
                    : auditResult.warnings > 0
                      ? `VERO: ${auditResult.warnings} item(ns) com atenção`
                      : 'VERO: Preços dentro do esperado'}
                </p>
                <p className="text-xs text-muted-foreground">
                  Orçamento: {fmt(auditResult.totalOrcamento)} · Mercado: {fmt(auditResult.totalMercado)}
                </p>
              </div>
            </div>
          )}

          {/* Expandable details */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-xs font-medium text-primary cursor-pointer"
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
            {expanded ? 'Ocultar detalhes' : 'Ver itens do orçamento, evidências e auditoria'}
          </button>

          {expanded && (
            <div className="space-y-4 pt-2">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  {/* Laudo Técnico */}
                  {budget?.laudo_tecnico && (
                    <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">Laudo Técnico</p>
                      <p className="text-sm text-foreground whitespace-pre-wrap">{budget.laudo_tecnico}</p>
                    </div>
                  )}

                  {/* Items table */}
                  {items.length > 0 && (
                    <div className="rounded-lg border border-border/50 overflow-hidden">
                      {/* Peças */}
                      {pecas.length > 0 && (
                        <>
                          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border/30">
                            <Package className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs font-semibold text-foreground">
                              Peças ({pecas.length})
                            </span>
                            <span className="ml-auto text-xs font-bold text-foreground">{fmt(budget?.total_pecas || 0)}</span>
                          </div>
                          <div className="divide-y divide-border/20">
                            {pecas.map(item => (
                              <div key={item.id} className="flex items-center justify-between px-3 py-2 text-xs">
                                <div className="flex-1 min-w-0">
                                  <span className="text-foreground">{item.descricao}</span>
                                  {item.codigo && (
                                    <span className="ml-2 text-muted-foreground font-mono">{item.codigo}</span>
                                  )}
                                  {item.marca && (
                                    <span className="ml-2 text-muted-foreground">({item.marca})</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-4 shrink-0 text-right">
                                  <span className="text-muted-foreground">{item.quantidade}x</span>
                                  <span className="text-muted-foreground w-20">{fmt(item.valor_unitario)}</span>
                                  <span className="font-semibold text-foreground w-24">{fmt(item.valor_total)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Serviços */}
                      {servicos.length > 0 && (
                        <>
                          <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border/30 border-t">
                            <Wrench className="w-4 h-4 text-muted-foreground" />
                            <span className="text-xs font-semibold text-foreground">
                              Mão de Obra ({servicos.length})
                            </span>
                            <span className="ml-auto text-xs font-bold text-foreground">{fmt(budget?.total_mao_de_obra || 0)}</span>
                          </div>
                          <div className="divide-y divide-border/20">
                            {servicos.map(item => (
                              <div key={item.id} className="flex items-center justify-between px-3 py-2 text-xs">
                                <div className="flex-1 min-w-0">
                                  <span className="text-foreground">{item.descricao}</span>
                                </div>
                                <div className="flex items-center gap-4 shrink-0 text-right">
                                  {item.horas ? (
                                    <span className="text-muted-foreground">{item.horas}h × {fmt(item.valor_hora || 0)}</span>
                                  ) : (
                                    <span className="text-muted-foreground">{item.quantidade}x</span>
                                  )}
                                  <span className="font-semibold text-foreground w-24">{fmt(item.valor_total)}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}

                      {/* Totals footer */}
                      {budget && (
                        <div className="bg-muted/30 border-t border-border/30 px-3 py-3 space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Total Peças</span><span>{fmt(budget.total_pecas)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Total Mão de Obra</span><span>{fmt(budget.total_mao_de_obra)}</span>
                          </div>
                          <Separator className="my-1" />
                          <div className="flex justify-between text-sm font-bold text-foreground">
                            <span>Total Bruto</span><span>{fmt(budget.total_bruto)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Comissão Auditt ({budget.comissao_pct}%)</span>
                            <span>-{fmt(budget.total_bruto - budget.total_liquido)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Líquido Oficina</span><span>{fmt(budget.total_liquido)}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Audit details */}
                  {auditResult && (
                    <BudgetAuditPanel result={auditResult} loading={false} error={null} />
                  )}

                  {/* Evidence photos */}
                  <FleetEvidencePhotos
                    serviceOrderId={order.id}
                    customerProductId={customerProductId}
                    readOnly
                  />
                </>
              )}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-2 border-t border-border/30">
            <Button
              variant="outline"
              className="gap-2"
              onClick={handleDownloadPDF}
            >
              <FileDown className="w-4 h-4" /> Baixar PDF
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={onQuestion}
            >
              <MessageCircle className="w-4 h-4" /> Questionar
            </Button>
            <div className="flex-1" />
            <Button
              variant="ghost"
              className="gap-1 text-destructive hover:text-destructive"
              disabled={saving}
              onClick={() => { setNotes(''); setRejectOpen(true); }}
            >
              <X className="w-4 h-4" /> Recusar
            </Button>
            <Button
              className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={saving}
              onClick={() => { setNotes(''); setApproveOpen(true); }}
            >
              <Check className="w-4 h-4" /> Aprovar Orçamento
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Approve confirmation */}
      <AlertDialog open={approveOpen} onOpenChange={setApproveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-500" />
              Confirmar aprovação — {placa}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Você está aprovando o orçamento de <strong>{fmt(valor)}</strong> da oficina <strong>{oficina}</strong>.
                </p>
                {hasAuditAlerts && (
                  <div className="p-2 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-xs">
                    ⚠️ A auditoria VERO detectou itens com preço acima da referência. Verifique antes de aprovar.
                  </div>
                )}
                <Textarea
                  placeholder="Observações (opcional)..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="min-h-[60px]"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={saving}
              onClick={async (e) => {
                e.preventDefault();
                const ok = await onApprove(order.id, valor, notes);
                if (ok) setApproveOpen(false);
              }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              Confirmar Aprovação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject confirmation */}
      <AlertDialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <X className="w-5 h-5 text-destructive" />
              Recusar orçamento — {placa}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  O orçamento será devolvido para a oficina <strong>{oficina}</strong> para revisão.
                </p>
                <Textarea
                  placeholder="Motivo da recusa (obrigatório)..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="min-h-[80px]"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              disabled={saving || !notes.trim()}
              onClick={async (e) => {
                e.preventDefault();
                const ok = await onReject(order.id, notes);
                if (ok) setRejectOpen(false);
              }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
              Confirmar Recusa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
