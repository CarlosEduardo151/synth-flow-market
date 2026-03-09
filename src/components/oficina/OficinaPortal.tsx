import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { FleetEvidencePhotos } from '@/components/fleet/FleetEvidencePhotos';
import { FleetChat } from '@/components/fleet/FleetChat';
import { ServiceStagePipeline, ServiceStageBadge, type ServiceStage } from '@/components/fleet/ServiceStagePipeline';
import { BudgetCreationForm } from '@/components/fleet/BudgetCreationForm';
import type { useFleetData, FleetServiceOrder } from '@/hooks/useFleetData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import { toast } from 'sonner';
import {
  Wrench, Plus, Camera, DollarSign, Clock, CheckCircle2,
  FileText, Car, AlertTriangle, Timer,
  Receipt, Wallet, Send, X, ChevronRight, Bell, Search,
  TrendingUp, BarChart3, CalendarDays, Star, Users,
  Activity, Target, ArrowUpRight, Menu,
  LayoutDashboard, ClipboardList, UserCheck, ShieldCheck,
  MessageCircle, Sun, Moon
} from 'lucide-react';

// ─── Types ───
type OficinaView = 'home' | 'checkin' | 'orcamento' | 'patio' | 'finalizar' | 'financeiro' | 'mensagens';

interface VeiculoPatio {
  id: string;
  placa: string;
  modelo: string;
  motorista: string;
  stage: ServiceStage;
  valorTotal: number;
  horaEntrada: string;
  frota: string;
}

interface BudgetRow {
  id: string;
  service_order_id: string;
  total_bruto: number;
  total_liquido: number;
  total_pecas: number;
  total_mao_de_obra: number;
  comissao_pct: number;
  status: string;
  created_at: string;
}

// ─── Helpers ───
const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

// ─── KPI Card Component ───
function KpiCard({ label, value, sublabel, icon: Icon, accent }: {
  label: string; value: string; sublabel?: string; icon: any; accent?: string;
}) {
  const accentColor = accent || 'text-primary';
  return (
    <div className="bg-card border border-border/60 rounded-lg p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className={`w-4 h-4 ${accentColor}`} />
      </div>
      <p className={`text-2xl sm:text-3xl font-semibold tracking-tight ${accent ? accentColor : 'text-foreground'}`}>{value}</p>
      {sublabel && <p className="text-xs text-muted-foreground mt-1.5">{sublabel}</p>}
    </div>
  );
}

// ─── Chart Card Wrapper ───
function ChartCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border/60 rounded-lg">
      <div className="flex items-center gap-2 px-5 py-4 border-b border-border/40">
        <Icon className="w-4 h-4 text-muted-foreground" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Empty State ───
function EmptyState({ icon: Icon, title, desc }: { icon: any; title: string; desc: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Icon className="w-10 h-10 text-muted-foreground mb-3" />
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground max-w-xs">{desc}</p>
    </div>
  );
}

export function OficinaPortal({ onSwitchRole, fleet, customerProductId, fleetLight, toggleFleetTheme, workshopId }: { 
  onSwitchRole: () => void;
  fleet?: ReturnType<typeof useFleetData>;
  customerProductId?: string | null;
  fleetLight?: boolean;
  toggleFleetTheme?: () => void;
  workshopId?: string | null;
}) {
  const [view, setView] = useState<OficinaView>('home');
  const [placaInput, setPlacaInput] = useState('');
  const [veiculoCarregado, setVeiculoCarregado] = useState(false);
  const [searchedVehicle, setSearchedVehicle] = useState<any>(null);
  const [vehicleHistory, setVehicleHistory] = useState<FleetServiceOrder[]>([]);
  const [finalizarDialog, setFinalizarDialog] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState<VeiculoPatio | null>(null);
  const [financeiroTab, setFinanceiroTab] = useState('recebiveis');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [budgetServiceOrder, setBudgetServiceOrder] = useState<FleetServiceOrder | null>(null);
  const [budgets, setBudgets] = useState<BudgetRow[]>([]);
  const isMobile = useIsMobile();

  // Load budgets from DB — query via service order's workshop_id for proper isolation
  const loadBudgets = useCallback(async () => {
    if (!workshopId && !customerProductId) return;
    try {
      // If we have workshopId, load budgets for SOs assigned to this workshop
      if (workshopId) {
        const { data: sos } = await supabase
          .from('fleet_service_orders')
          .select('id')
          .eq('workshop_id', workshopId);
        const soIds = (sos || []).map((s: any) => s.id);
        if (soIds.length === 0) { setBudgets([]); return; }
        const { data } = await supabase
          .from('fleet_budgets')
          .select('*')
          .in('service_order_id', soIds)
          .order('created_at', { ascending: false });
        if (data) setBudgets(data as BudgetRow[]);
      } else if (customerProductId) {
        const { data } = await supabase
          .from('fleet_budgets')
          .select('*')
          .eq('customer_product_id', customerProductId)
          .order('created_at', { ascending: false });
        if (data) setBudgets(data as BudgetRow[]);
      }
    } catch (err) {
      console.error('Error loading budgets:', err);
    }
  }, [customerProductId, workshopId]);

  useEffect(() => { loadBudgets(); }, [loadBudgets]);

  // Build patio data from real fleet data
  const patioData: VeiculoPatio[] = fleet ? fleet.serviceOrders
    .filter(so => so.stage !== 'veiculo_entregue')
    .map(so => {
      const vehicle = fleet.vehicles.find(v => v.id === so.vehicle_id);
      return {
        id: so.id,
        placa: vehicle?.placa || 'N/A',
        modelo: vehicle ? `${vehicle.marca || ''} ${vehicle.modelo || ''}`.trim() : 'N/A',
        motorista: '',
        stage: so.stage as ServiceStage,
        valorTotal: so.valor_orcamento || so.valor_aprovado || 0,
        horaEntrada: so.data_entrada ? new Date(so.data_entrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
        frota: 'Frota',
      };
    }) : [];

  const deliveredData: VeiculoPatio[] = fleet ? fleet.serviceOrders
    .filter(so => so.stage === 'veiculo_entregue')
    .slice(0, 10)
    .map(so => {
      const vehicle = fleet.vehicles.find(v => v.id === so.vehicle_id);
      return {
        id: so.id,
        placa: vehicle?.placa || 'N/A',
        modelo: vehicle ? `${vehicle.marca || ''} ${vehicle.modelo || ''}`.trim() : 'N/A',
        motorista: '',
        stage: so.stage as ServiceStage,
        valorTotal: so.valor_orcamento || so.valor_aprovado || 0,
        horaEntrada: so.data_entrada ? new Date(so.data_entrada).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '--:--',
        frota: 'Frota',
      };
    }) : [];

  // KPIs from real data
  const servicosAtivos = patioData.filter(v => v.stage === 'orcamento_aprovado' || v.stage === 'veiculo_finalizado').length;
  const aguardando = patioData.filter(v => v.stage === 'checkin' || v.stage === 'orcamento_enviado' || v.stage === 'orcamento_analise').length;
  const totalBruto = budgets.reduce((s, b) => s + (b.total_bruto || 0), 0);
  const totalLiquido = budgets.reduce((s, b) => s + (b.total_liquido || 0), 0);
  const ticketMedio = budgets.length > 0 ? totalBruto / budgets.length : 0;

  // Check-in: search vehicle by placa
  const buscarPlaca = async () => {
    if (!fleet || placaInput.length < 7) return;
    const found = await fleet.searchVehicleByPlaca(placaInput);
    if (found) {
      setSearchedVehicle(found);
      setVeiculoCarregado(true);
      // Load history for this vehicle
      const history = fleet.serviceOrders.filter(so => so.vehicle_id === found.id);
      setVehicleHistory(history);
    } else {
      toast.error('Veículo não encontrado nesta frota.');
      setVeiculoCarregado(false);
      setSearchedVehicle(null);
    }
  };

  const startCheckin = async () => {
    if (!fleet || !searchedVehicle) return;
    const existing = fleet.getActiveServiceOrder(searchedVehicle.id);
    if (existing) {
      toast.info('Este veículo já possui uma OS ativa.');
      setBudgetServiceOrder(existing);
      return;
    }
    const so = await fleet.createServiceOrder({ vehicle_id: searchedVehicle.id });
    if (so) {
      setBudgetServiceOrder(so);
    }
  };

  // Nav
  const navItems: { value: OficinaView; label: string; desc: string; icon: any; badge?: string }[] = [
    { value: 'home', label: 'Dashboard', desc: 'Resumo de serviços e orçamentos', icon: LayoutDashboard },
    { value: 'checkin', label: 'Novo Atendimento', desc: 'Buscar placa e iniciar serviço', icon: Plus },
    { value: 'orcamento', label: 'Orçamentos', desc: 'Orçamentos enviados e pendentes', icon: ClipboardList, badge: patioData.filter(v => v.stage === 'orcamento_enviado' || v.stage === 'orcamento_analise').length > 0 ? String(patioData.filter(v => v.stage === 'orcamento_enviado' || v.stage === 'orcamento_analise').length) : undefined },
    { value: 'patio', label: 'Pátio Digital', desc: 'Veículos em serviço e status', icon: Car, badge: patioData.length > 0 ? String(patioData.length) : undefined },
    { value: 'financeiro', label: 'Financeiro', desc: 'Recebíveis e orçamentos aprovados', icon: Wallet },
    { value: 'finalizar', label: 'Veículos', desc: 'Todos os veículos cadastrados', icon: Users },
    { value: 'mensagens', label: 'Mensagens', desc: 'Chat com gestores de frota', icon: MessageCircle },
  ];

  const navigateTo = (v: OficinaView) => { setView(v); setSidebarOpen(false); };
  const activeNavItem = navItems.find(n => n.value === view);

  // ─── Sidebar ───
  const SidebarNav = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
            <Wrench className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm leading-none">Auditt</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Portal da Oficina</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = view === item.value;
          return (
            <button key={item.value} onClick={() => navigateTo(item.value)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-colors ${
                active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}>
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <div className="flex-1 text-left min-w-0"><span className="block">{item.label}</span></div>
              {item.badge && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${active ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>
      <div className="px-3 py-3 border-t border-border/50">
        <button onClick={onSwitchRole} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
          <UserCheck className="w-[18px] h-[18px]" /><span>Trocar Perfil</span>
        </button>
      </div>
    </div>
  );

  // ─── Content ───
  const renderContent = () => {
    // ══════════════ HOME ══════════════
    if (view === 'home') {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Serviços Ativos" value={String(servicosAtivos)} sublabel={`${aguardando} aguardando`} icon={Activity} />
            <KpiCard label="No Pátio" value={String(patioData.length)} sublabel="veículos" icon={Car} />
            <KpiCard label="Orçamentos" value={String(budgets.length)} sublabel="total enviados" icon={FileText} />
            <KpiCard label="Ticket Médio" value={ticketMedio > 0 ? fmt(ticketMedio) : 'R$ 0'} icon={Target} />
          </div>

          {/* CTA */}
          <button onClick={() => setView('checkin')}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg p-5 flex items-center gap-4 transition-colors">
            <div className="w-12 h-12 rounded-md bg-primary-foreground/20 flex items-center justify-center"><Plus className="w-6 h-6" /></div>
            <div className="text-left">
              <p className="text-xl font-semibold">Novo Atendimento</p>
              <p className="text-sm opacity-80">Buscar placa para iniciar check-in</p>
            </div>
          </button>

          {/* Approved services quick list */}
          {patioData.filter(v => v.stage === 'orcamento_aprovado').length > 0 && (
            <ChartCard title="Aprovados — Iniciar Agora" icon={CheckCircle2}>
              <div className="space-y-2.5 max-h-52 overflow-y-auto">
                {patioData.filter(v => v.stage === 'orcamento_aprovado').map(v => (
                  <button key={v.id} onClick={() => { setSelectedVeiculo(v); setView('patio'); }}
                    className="w-full flex items-center gap-3 p-3 rounded-md border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors text-left">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-mono text-sm font-semibold text-foreground">{v.placa}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{v.modelo}</p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">{fmt(v.valorTotal)}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </ChartCard>
          )}

          {/* Recent service orders */}
          {fleet && fleet.serviceOrders.length > 0 && (
            <ChartCard title="Últimas Ordens de Serviço" icon={Clock}>
              <div className="space-y-2">
                {fleet.serviceOrders.slice(0, 8).map(so => {
                  const vehicle = fleet.vehicles.find(v => v.id === so.vehicle_id);
                  return (
                    <div key={so.id} className="flex items-center justify-between p-3 rounded-md border border-border/30 hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-sm text-foreground">{vehicle?.placa || 'N/A'}</span>
                        <span className="text-xs text-muted-foreground">{vehicle ? `${vehicle.marca || ''} ${vehicle.modelo || ''}`.trim() : ''}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {so.valor_orcamento && <span className="text-sm font-semibold text-foreground">{fmt(so.valor_orcamento)}</span>}
                        <ServiceStageBadge stage={so.stage} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          )}

          {patioData.length === 0 && fleet?.serviceOrders.length === 0 && (
            <EmptyState icon={Car} title="Nenhum serviço registrado" desc="Faça o check-in de um veículo para começar a usar o sistema." />
          )}
        </div>
      );
    }

    // ══════════════ CHECK-IN ══════════════
    if (view === 'checkin') {
      return (
        <div className="max-w-2xl mx-auto space-y-5">
          <p className="text-sm text-muted-foreground">Identifique o veículo para iniciar o atendimento.</p>

          <div className="flex items-center gap-3"><Separator className="flex-1" /><span className="text-xs text-muted-foreground">digite a placa</span><Separator className="flex-1" /></div>

          <div className="flex gap-2">
            <Input placeholder="Placa (ABC-1D23)" value={placaInput} onChange={(e) => setPlacaInput(e.target.value.toUpperCase())}
              className="h-12 text-base font-mono text-center tracking-widest" 
              onKeyDown={(e) => e.key === 'Enter' && buscarPlaca()} />
            <Button onClick={buscarPlaca} className="h-12 px-5"><Search className="w-4 h-4 mr-2" />Buscar</Button>
          </div>

          {veiculoCarregado && searchedVehicle && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-md bg-primary/10 flex items-center justify-center"><Car className="w-5 h-5 text-primary" /></div>
                  <div>
                    <p className="font-mono text-lg font-bold text-foreground">{searchedVehicle.placa}</p>
                    <p className="text-sm text-muted-foreground">
                      {searchedVehicle.marca} {searchedVehicle.modelo} · {searchedVehicle.ano || 'N/A'} · {(searchedVehicle.km_atual || 0).toLocaleString()} km
                    </p>
                  </div>
                </div>
                {searchedVehicle.chassi && <p className="text-xs text-muted-foreground mt-2">Chassi: {searchedVehicle.chassi}</p>}
              </div>

              {/* Histórico real */}
              {vehicleHistory.length > 0 && (
                <div className="bg-card border border-border/60 rounded-lg overflow-hidden">
                  <div className="px-4 py-3 border-b border-border/40">
                    <h3 className="text-sm font-semibold text-foreground">Histórico de Serviços ({vehicleHistory.length})</h3>
                  </div>
                  <div className="divide-y divide-border/30">
                    {vehicleHistory.map(h => (
                      <div key={h.id} className="flex items-center justify-between px-4 py-3 text-xs">
                        <div>
                          <p className="font-medium text-foreground">{h.descricao_servico || 'Serviço'}</p>
                          <p className="text-muted-foreground">{h.data_entrada ? new Date(h.data_entrada).toLocaleDateString('pt-BR') : '--'}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {h.valor_orcamento && <span className="font-semibold">{fmt(h.valor_orcamento)}</span>}
                          <ServiceStageBadge stage={h.stage} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={startCheckin} className="w-full h-12 gap-2">
                <FileText className="w-4 h-4" /> Iniciar Check-in e Elaborar Orçamento
              </Button>
            </div>
          )}
        </div>
      );
    }

    // ══════════════ ORÇAMENTOS ══════════════
    if (view === 'orcamento') {
      const pendentes = patioData.filter(v => v.stage === 'orcamento_enviado' || v.stage === 'orcamento_analise');
      const aprovados = patioData.filter(v => v.stage === 'orcamento_aprovado');
      const checkins = patioData.filter(v => v.stage === 'checkin');

      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Orçamentos" value={String(budgets.length)} icon={FileText} />
            <KpiCard label="Pendentes" value={String(pendentes.length)} icon={Clock} accent="text-amber-500" />
            <KpiCard label="Aprovados" value={String(aprovados.length)} icon={CheckCircle2} accent="text-emerald-600 dark:text-emerald-400" />
            <KpiCard label="Ticket Médio" value={ticketMedio > 0 ? fmt(ticketMedio) : 'R$ 0'} icon={Target} />
          </div>

          {/* Veículos aguardando orçamento (check-in feito) */}
          {checkins.length > 0 && (
            <ChartCard title="Aguardando Orçamento" icon={AlertTriangle}>
              <div className="space-y-2">
                {checkins.map(v => {
                  const so = fleet?.serviceOrders.find(s => s.id === v.id);
                  return (
                    <div key={v.id} className="flex items-center justify-between p-3 rounded-md border border-amber-500/20 bg-amber-500/5">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-sm">{v.placa}</span>
                        <span className="text-xs text-muted-foreground">{v.modelo}</span>
                      </div>
                      <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5" onClick={() => {
                        if (so) setBudgetServiceOrder(so);
                      }}>
                        <Plus className="w-3 h-3" /> Criar Orçamento
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ChartCard>
          )}

          {/* Lista de orçamentos reais */}
          {budgets.length > 0 ? (
            <div className="bg-card border border-border/60 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/40">
                <h3 className="text-sm font-semibold">Orçamentos Enviados</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/30 text-[11px] text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left font-medium">OS</th>
                    <th className="px-4 py-2.5 text-right font-medium">Peças</th>
                    <th className="px-4 py-2.5 text-right font-medium">M.O.</th>
                    <th className="px-4 py-2.5 text-right font-medium">Total</th>
                    <th className="px-4 py-2.5 text-right font-medium">Líquido (85%)</th>
                    <th className="px-4 py-2.5 text-left font-medium">Status</th>
                    <th className="px-4 py-2.5 text-left font-medium">Data</th>
                  </tr></thead>
                  <tbody>
                    {budgets.map(b => (
                      <tr key={b.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs">{b.service_order_id.slice(0, 8)}</td>
                        <td className="px-4 py-2.5 text-right text-xs">{fmt(b.total_pecas)}</td>
                        <td className="px-4 py-2.5 text-right text-xs">{fmt(b.total_mao_de_obra)}</td>
                        <td className="px-4 py-2.5 text-right text-xs font-semibold">{fmt(b.total_bruto)}</td>
                        <td className="px-4 py-2.5 text-right text-xs font-semibold text-emerald-600 dark:text-emerald-400">{fmt(b.total_liquido)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                            b.status === 'aprovado' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                            b.status === 'pendente' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {b.status === 'aprovado' ? 'Aprovado' : b.status === 'pendente' ? 'Pendente' : b.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState icon={FileText} title="Nenhum orçamento enviado" desc="Faça o check-in de um veículo e crie um orçamento para começar." />
          )}
        </div>
      );
    }

    // ══════════════ PÁTIO ══════════════
    if (view === 'patio') {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="No Pátio" value={String(patioData.length)} icon={Car} />
            <KpiCard label="Ativos" value={String(servicosAtivos)} icon={Activity} accent="text-emerald-600 dark:text-emerald-400" />
            <KpiCard label="Aguardando" value={String(aguardando)} icon={Clock} accent="text-amber-500" />
            <KpiCard label="Valor em Serviço" value={fmt(patioData.reduce((s, v) => s + v.valorTotal, 0))} icon={DollarSign} />
          </div>

          {/* Pipeline visual - show first active order's stage */}
          {patioData.length > 0 && (
            <div className="bg-card border border-border/60 rounded-lg p-4">
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wider">Pipeline de Serviço</p>
              <ServiceStagePipeline currentStage={patioData[0].stage} />
            </div>
          )}

          {/* Vehicle cards */}
          {patioData.length > 0 ? (
            <div className="bg-card border border-border/60 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/40">
                <h3 className="text-sm font-semibold">Veículos no Pátio</h3>
              </div>
              <div className="divide-y divide-border/30">
                {patioData.map(v => {
                  const soForPhotos = fleet?.serviceOrders.find(s => s.id === v.id);
                  const cpIdForPhotos = soForPhotos?.customer_product_id || customerProductId || '';
                  return (
                  <div key={v.id} className="px-5 py-3">
                    <div className="flex items-center justify-between hover:bg-muted/20 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-semibold text-sm text-foreground">{v.placa}</span>
                        <span className="text-sm text-muted-foreground">{v.modelo}</span>
                        <span className="text-xs text-muted-foreground">· Entrada {v.horaEntrada}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        {v.valorTotal > 0 && <span className="text-sm font-semibold text-foreground">{fmt(v.valorTotal)}</span>}
                        <ServiceStageBadge stage={v.stage} />
                        {v.stage === 'orcamento_aprovado' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setSelectedVeiculo(v); setFinalizarDialog(true); }}>
                            Finalizar
                          </Button>
                        )}
                        {v.stage === 'checkin' && (
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => {
                            const so = fleet?.serviceOrders.find(s => s.id === v.id);
                            if (so) setBudgetServiceOrder(so);
                          }}>
                            <Plus className="w-3 h-3" /> Orçamento
                          </Button>
                        )}
                      </div>
                    </div>
                    {/* Evidence Photos for this SO */}
                    {soForPhotos && (
                      <details className="mt-2 group">
                        <summary className="cursor-pointer text-xs font-medium text-primary flex items-center gap-1">
                          <Camera className="w-3.5 h-3.5" />
                          Fotos e Evidências
                        </summary>
                        <div className="mt-2">
                          <FleetEvidencePhotos
                            serviceOrderId={v.id}
                            customerProductId={cpIdForPhotos}
                            uploadedBy="oficina"
                          />
                        </div>
                      </details>
                    )}
                  </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <EmptyState icon={Car} title="Pátio vazio" desc="Nenhum veículo em serviço no momento." />
          )}

          {/* Delivered */}
          {deliveredData.length > 0 && (
            <div className="bg-card border border-border/60 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/40 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Entregues Recentemente
                </h3>
                <span className="text-xs text-muted-foreground">{deliveredData.length} veículos</span>
              </div>
              <div className="divide-y divide-border/30">
                {deliveredData.map(v => (
                  <div key={v.id} className="flex items-center justify-between px-5 py-3">
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold text-sm text-foreground">{v.placa}</span>
                      <span className="text-sm text-muted-foreground">{v.modelo}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">{fmt(v.valorTotal)}</span>
                      <ServiceStageBadge stage={v.stage} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Dialog open={finalizarDialog} onOpenChange={setFinalizarDialog}>
            <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Finalizar Serviço</DialogTitle></DialogHeader>
              {selectedVeiculo && (
                <div className="space-y-4 mt-2">
                  <div className="bg-muted/30 border border-border/40 rounded-md p-3 flex items-center gap-3">
                    <Car className="w-5 h-5 text-muted-foreground" />
                    <div><p className="font-mono font-semibold text-foreground">{selectedVeiculo.placa}</p><p className="text-xs text-muted-foreground">{selectedVeiculo.modelo}</p></div>
                  </div>
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-foreground">Resumo Financeiro</p>
                    <div className="bg-muted/20 border border-border/30 rounded-md p-4 space-y-2 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Valor do serviço</span><span className="font-semibold">{fmt(selectedVeiculo.valorTotal)}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Comissão (15%)</span><span className="text-red-500">-{fmt(selectedVeiculo.valorTotal * 0.15)}</span></div>
                      <Separator />
                      <div className="flex justify-between"><span className="font-medium">Valor líquido</span><span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{fmt(selectedVeiculo.valorTotal * 0.85)}</span></div>
                      <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground"><Timer className="w-3 h-3" /><span>Depósito em D+1 (24h)</span></div>
                    </div>
                  </div>
                  <Button onClick={async () => {
                    if (fleet && selectedVeiculo) {
                      await fleet.updateStage(selectedVeiculo.id, 'veiculo_finalizado', 'oficina', 'Serviço finalizado pela oficina');
                      await loadBudgets();
                    }
                    setFinalizarDialog(false);
                  }} className="w-full h-11 gap-2"><CheckCircle2 className="w-4 h-4" /> Confirmar Finalização</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      );
    }

    // ══════════════ FINANCEIRO ══════════════
    if (view === 'financeiro') {
      const aprovadoBudgets = budgets.filter(b => b.status === 'aprovado');
      const pendenteBudgets = budgets.filter(b => b.status === 'pendente');
      const totalBrutoAprovado = aprovadoBudgets.reduce((s, b) => s + b.total_bruto, 0);
      const totalLiquidoAprovado = aprovadoBudgets.reduce((s, b) => s + b.total_liquido, 0);
      const totalComissao = aprovadoBudgets.reduce((s, b) => s + (b.total_bruto - b.total_liquido), 0);

      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Bruto" value={fmt(totalBruto)} icon={DollarSign} />
            <KpiCard label="Total Líquido (85%)" value={fmt(totalLiquido)} icon={Wallet} accent="text-emerald-600 dark:text-emerald-400" />
            <KpiCard label="Comissão Auditt" value={fmt(totalBruto - totalLiquido)} icon={Receipt} accent="text-amber-500" />
            <KpiCard label="Orçamentos" value={String(budgets.length)} sublabel={`${aprovadoBudgets.length} aprovados`} icon={FileText} />
          </div>

          {/* Tabela de orçamentos com valores */}
          {budgets.length > 0 ? (
            <div className="bg-card border border-border/60 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
                <h3 className="text-sm font-semibold">Extrato de Orçamentos</h3>
                <span className="text-xs text-muted-foreground">{budgets.length} registros</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/30 text-[11px] text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left font-medium">OS</th>
                    <th className="px-4 py-2.5 text-right font-medium">Peças</th>
                    <th className="px-4 py-2.5 text-right font-medium">M.O.</th>
                    <th className="px-4 py-2.5 text-right font-medium">Bruto</th>
                    <th className="px-4 py-2.5 text-right font-medium">Comissão</th>
                    <th className="px-4 py-2.5 text-right font-medium">Líquido</th>
                    <th className="px-4 py-2.5 text-left font-medium">Status</th>
                    <th className="px-4 py-2.5 text-left font-medium">Data</th>
                  </tr></thead>
                  <tbody>
                    {budgets.map(b => (
                      <tr key={b.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs">{b.service_order_id.slice(0, 8)}</td>
                        <td className="px-4 py-2.5 text-right text-xs">{fmt(b.total_pecas)}</td>
                        <td className="px-4 py-2.5 text-right text-xs">{fmt(b.total_mao_de_obra)}</td>
                        <td className="px-4 py-2.5 text-right text-xs font-semibold">{fmt(b.total_bruto)}</td>
                        <td className="px-4 py-2.5 text-right text-xs text-red-500">-{fmt(b.total_bruto - b.total_liquido)}</td>
                        <td className="px-4 py-2.5 text-right text-xs font-semibold text-emerald-600 dark:text-emerald-400">{fmt(b.total_liquido)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                            b.status === 'aprovado' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                            b.status === 'pendente' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                            'bg-muted text-muted-foreground'
                          }`}>
                            {b.status === 'aprovado' ? 'Aprovado' : b.status === 'pendente' ? 'Pendente' : b.status}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(b.created_at).toLocaleDateString('pt-BR')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState icon={Wallet} title="Nenhum dado financeiro" desc="Os dados financeiros aparecerão quando orçamentos forem criados." />
          )}
        </div>
      );
    }

    // ══════════════ VEÍCULOS ══════════════
    if (view === 'finalizar') {
      const allVehicles = fleet?.vehicles || [];
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total Veículos" value={String(allVehicles.length)} icon={Car} />
            <KpiCard label="Disponíveis" value={String(fleet?.vehiclesAvailable.length || 0)} icon={CheckCircle2} accent="text-emerald-600 dark:text-emerald-400" />
            <KpiCard label="Em Serviço" value={String(fleet?.vehiclesInService.length || 0)} icon={Wrench} accent="text-amber-500" />
            <KpiCard label="Total Orçado" value={fmt(totalBruto)} icon={DollarSign} />
          </div>

          {allVehicles.length > 0 ? (
            <div className="bg-card border border-border/60 rounded-lg overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/40">
                <h3 className="text-sm font-semibold">Todos os Veículos</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-muted/30 text-[11px] text-muted-foreground uppercase tracking-wider">
                    <th className="px-4 py-2.5 text-left font-medium">Placa</th>
                    <th className="px-4 py-2.5 text-left font-medium">Veículo</th>
                    <th className="px-4 py-2.5 text-left font-medium">Ano</th>
                    <th className="px-4 py-2.5 text-right font-medium">KM</th>
                    <th className="px-4 py-2.5 text-left font-medium">Status</th>
                  </tr></thead>
                  <tbody>
                    {allVehicles.map(v => (
                      <tr key={v.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-2.5 font-mono font-semibold text-xs">{v.placa}</td>
                        <td className="px-4 py-2.5 text-xs">{v.marca} {v.modelo}</td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">{v.ano || '--'}</td>
                        <td className="px-4 py-2.5 text-right text-xs">{(v.km_atual || 0).toLocaleString()}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                            v.status === 'disponivel' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                            'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                          }`}>
                            {v.status === 'disponivel' ? 'Disponível' : 'Em Serviço'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <EmptyState icon={Users} title="Nenhum veículo" desc="Veículos cadastrados pelas frotas aparecerão aqui." />
          )}
        </div>
      );
    }

    // ══════════════ MENSAGENS ══════════════
    if (view === 'mensagens') {
      return (
        <FleetChat
          customerProductId={customerProductId || ''}
          currentRole="oficina"
          currentName="Oficina"
          workshopId={workshopId}
        />
      );
    }

    return null;
  };

  // ══════════════ BUDGET FORM (FULL SCREEN) ══════════════
  if (budgetServiceOrder && fleet) {
    const budgetVehicle = fleet.vehicles.find(v => v.id === budgetServiceOrder.vehicle_id);
    if (budgetVehicle) {
      const themeClass = fleetLight ? 'fleet-theme-light' : 'fleet-theme';
      return (
        <div className={`${themeClass} min-h-screen bg-background`}>
          <BudgetCreationForm
            serviceOrder={budgetServiceOrder}
            vehicle={budgetVehicle}
            fleet={fleet}
            onClose={() => setBudgetServiceOrder(null)}
            onSuccess={() => {
              setBudgetServiceOrder(null);
              setView('patio');
              loadBudgets();
            }}
          />
        </div>
      );
    }
  }

  // ══════════════ LAYOUT ══════════════
  const fleetThemeClass = fleetLight ? 'fleet-theme-light' : 'fleet-theme';

  return (
    <div className={`min-h-screen bg-background flex ${fleetThemeClass}`}>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-border/50 bg-card/50 sticky top-0 h-screen">
        <SidebarNav />
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border/50 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
              <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden h-8 w-8"><Menu className="w-4 h-4" /></Button></SheetTrigger>
              <SheetContent side="left" className="w-56 p-0"><SidebarNav /></SheetContent>
            </Sheet>
            <div>
              <h1 className="text-base font-semibold text-foreground leading-none">{activeNavItem?.label}</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5">{activeNavItem?.desc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {toggleFleetTheme && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={toggleFleetTheme} title={fleetLight ? 'Modo escuro' : 'Modo claro'}>
                {fleetLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Bell className="w-4 h-4" /></Button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
