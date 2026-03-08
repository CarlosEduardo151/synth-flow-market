import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OficinaPortal } from '@/components/oficina/OficinaPortal';
import { FleetChat } from '@/components/fleet/FleetChat';
import { ServiceStagePipeline, ServiceStageBadge, type ServiceStage } from '@/components/fleet/ServiceStagePipeline';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useProductAccess } from '@/hooks/useProductAccess';
import { useFleetData, type FleetVehicle } from '@/hooks/useFleetData';
import { MaintenanceRequestDialog } from '@/components/fleet/MaintenanceRequestDialog';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Truck, Wrench, Shield, Plus, Search,
  FileText, CheckCircle2, Clock,
  Car, Building2, Zap, BarChart3,
  Download, MessageCircle, Wallet,
  X, Check,
  Bell, Sun, Moon,
  ChevronDown,
  CircleDollarSign, FileBarChart, AlertCircle, Menu, UserCheck,
  Camera, ScanLine, Loader2, CheckCircle, Upload, Sparkles, Edit,
  FileDown
} from 'lucide-react';
import { generateBudgetPDF, type BudgetPDFData } from '@/lib/generateBudgetPDF';

type UserRole = 'select' | 'frota' | 'oficina';


// ═══════════════════════════════════════════════════════════
// FLEET SIDEBAR TABS
// ═══════════════════════════════════════════════════════════

type FrotaTab = 'overview' | 'aprovacoes' | 'cadastro' | 'frota' | 'orcamentos' | 'financeiro' | 'relatorios' | 'questionar';

const frotaTabs: { value: FrotaTab; label: string; desc: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: 'overview', label: 'Visão Geral', desc: 'Resumo de gastos, economia e status da frota', icon: BarChart3 },
  { value: 'aprovacoes', label: 'Aprovações', desc: 'Orçamentos aguardando sua decisão', icon: Shield },
  { value: 'cadastro', label: 'Cadastrar', desc: 'Adicione veículos com escaneamento VERO 1.0', icon: ScanLine },
  { value: 'frota', label: 'Veículos', desc: 'Todos os veículos e histórico de manutenção', icon: Truck },
  { value: 'orcamentos', label: 'Orçamentos', desc: 'Histórico completo de orçamentos recebidos', icon: FileText },
  { value: 'financeiro', label: 'Financeiro', desc: 'Notas fiscais, extratos e pagamentos', icon: CircleDollarSign },
  { value: 'relatorios', label: 'Relatórios', desc: 'Análises detalhadas e gráficos avançados', icon: FileBarChart },
  { value: 'questionar', label: 'Mensagens', desc: 'Chat direto com as oficinas parceiras', icon: MessageCircle },
];

// ═══════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════

const GestaoFrotasOficinasSystem = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const urlRole = searchParams.get('role') as UserRole | null;
  const [role, setRole] = useState<UserRole>(urlRole === 'frota' || urlRole === 'oficina' ? urlRole : 'select');
  const [roleLoading, setRoleLoading] = useState(role === 'select');
  const [activeTab, setActiveTab] = useState<FrotaTab>('overview');
  const [searchVeiculos, setSearchVeiculos] = useState('');
  const [frotaSidebarOpen, setFrotaSidebarOpen] = useState(false);
  const [maintenanceVehicle, setMaintenanceVehicle] = useState<FleetVehicle | null>(null);
  const [fleetLight, setFleetLight] = useState(() => localStorage.getItem('fleet-theme-mode') === 'light');
  const isMobile = useIsMobile();

  // Product access & fleet data
  const { customerId: customerProductId, loading: accessLoading } = useProductAccess('gestao-frotas-oficinas');
  const fleet = useFleetData(customerProductId);

  // VERO 1.0 states
  const [veroStep, setVeroStep] = useState<'idle' | 'uploading' | 'analyzing' | 'result' | 'confirmed'>('idle');
  const [veroImagePreview, setVeroImagePreview] = useState<string | null>(null);
  const [veroResult, setVeroResult] = useState<Record<string, any> | null>(null);
  const [veroScanType, setVeroScanType] = useState<'traseira' | 'documento'>('traseira');
  const [cadastroMode, setCadastroMode] = useState<'traseira' | 'documento' | 'manual'>('traseira');
  const [cadastroForm, setCadastroForm] = useState({ placa: '', marca: '', modelo: '', cor: '', ano: '', km: '', tipo: '', motorista: '', chassi: '', renavam: '', combustivel: '', potencia: '' });

  // Workshop ID for oficina users
  const [workshopId, setWorkshopId] = useState<string | null>(null);

  // Auto-detect role from DB when no URL param provided
  useEffect(() => {
    if (role !== 'select' || !user) {
      setRoleLoading(false);
      return;
    }
    const detectRole = async () => {
      try {
        // Check if user has a workshop record
        const { data: workshop } = await (supabase.from('fleet_partner_workshops') as any)
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        if (workshop) {
          setRole('oficina');
          setWorkshopId(workshop.id);
          setRoleLoading(false);
          return;
        }
        // Check if user has an operator record
        const { data: operator } = await (supabase.from('fleet_operators') as any)
          .select('id')
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle();
        if (operator) {
          setRole('frota');
          setRoleLoading(false);
          return;
        }
      } catch (e) {
        console.error('Role detection error:', e);
      }
      setRoleLoading(false);
    };
    detectRole();
  }, [user, role]);

  // For oficina role set via URL param, fetch workshop ID
  useEffect(() => {
    if (role !== 'oficina' || !user || workshopId) return;
    const fetchWorkshopId = async () => {
      const { data } = await (supabase.from('fleet_partner_workshops') as any)
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      if (data) setWorkshopId(data.id);
    };
    fetchWorkshopId();
  }, [role, user, workshopId]);

  const fleetThemeClass = fleetLight ? 'fleet-theme-light' : 'fleet-theme';
  const toggleFleetTheme = () => {
    setFleetLight(prev => {
      const next = !prev;
      localStorage.setItem('fleet-theme-mode', next ? 'light' : 'dark');
      return next;
    });
  };

  if (!user || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  // ─── Role Selection Screen ───
  if (role === 'select') {
    return (
      <div className={`min-h-screen bg-background ${fleetThemeClass}`}>
        <Header />
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          <div className="max-w-3xl w-full space-y-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Bem-vindo à Auditt</h1>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                A inteligência que audita sua frota e acelera seu caixa.
              </p>
              <p className="text-sm text-muted-foreground">Selecione seu perfil para acessar o painel correto</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              <button onClick={() => setRole('frota')} className="group relative p-8 rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300 text-left">
                <div className="absolute top-4 right-4"><Badge variant="secondary">Gestor</Badge></div>
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Truck className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Operador de Frota</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">Controle total da manutenção da sua frota. Sem manual, sem treinamento — é só clicar e usar.</p>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary shrink-0" /> <span><strong className="text-foreground">Aprovações</strong> — IA audita cada orçamento e diz se o preço é justo</span></li>
                    <li className="flex items-center gap-2"><Wallet className="w-4 h-4 text-primary shrink-0" /> <span><strong className="text-foreground">Financeiro</strong> — Notas fiscais, extratos e gastos por veículo</span></li>
                    <li className="flex items-center gap-2"><Car className="w-4 h-4 text-primary shrink-0" /> <span><strong className="text-foreground">Veículos</strong> — Histórico completo de manutenção de cada placa</span></li>
                    <li className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-primary shrink-0" /> <span><strong className="text-foreground">Mensagens</strong> — Chat direto com as oficinas sobre serviços</span></li>
                  </ul>
                </div>
              </button>
              <button onClick={() => setRole('oficina')} className="group relative p-8 rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300 text-left">
                <div className="absolute top-4 right-4"><Badge variant="secondary">Parceiro</Badge></div>
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <Wrench className="w-7 h-7 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Operador de Oficina</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">Receba veículos, envie orçamentos validados por IA e receba em D+1. Tudo autoexplicativo.</p>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><Plus className="w-4 h-4 text-emerald-500 shrink-0" /> <span><strong className="text-foreground">Check-in</strong> — Escaneia a placa e o sistema carrega tudo automaticamente</span></li>
                    <li className="flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-500 shrink-0" /> <span><strong className="text-foreground">Orçamentos</strong> — IA valida seus preços em tempo real</span></li>
                    <li className="flex items-center gap-2"><CircleDollarSign className="w-4 h-4 text-emerald-500 shrink-0" /> <span><strong className="text-foreground">Financeiro</strong> — Controle de recebíveis com depósito em D+1</span></li>
                    <li className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" /> <span><strong className="text-foreground">Mensagens</strong> — Negocie com os gestores sem sair do sistema</span></li>
                  </ul>
                </div>
              </button>
            </div>
            <div className="text-center pt-4">
              <p className="text-muted-foreground text-sm mb-2">Primeiro acesso?</p>
              <Button variant="outline" size="lg" onClick={() => navigate('/sistema/gestao-frotas-oficinas/onboarding')} className="gap-2">
                <UserCheck className="w-4 h-4" />
                Cadastre-se aqui
              </Button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // FROTA DASHBOARD — PROFESSIONAL REMASTER
  // ═══════════════════════════════════════════════════════════
  if (role === 'frota') {
    const totalFrota = fleet.vehicles.length;
    const veiculosManutencao = fleet.vehiclesInService.length;
    // Real pending budgets from fleet data (stage = orcamento_enviado or orcamento_analise)
    const pendingOrders = fleet.serviceOrders.filter(
      so => so.stage === 'orcamento_enviado' || so.stage === 'orcamento_analise'
    );
    const orcamentosPendentes = pendingOrders.length;

    // ── RENDER CONTENT BASED ON ACTIVE TAB ──
    const renderContent = () => {
      switch (activeTab) {

        // ════════════════════════════════════
        // VISÃO GERAL
        // ════════════════════════════════════
        case 'overview':
          return (
            <div className="space-y-6">
              {/* STATUS ROW */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border border-border/50 shadow-sm">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Truck className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{totalFrota}</p>
                      <p className="text-xs text-muted-foreground">Veículos na frota</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-border/50 shadow-sm">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Wrench className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{veiculosManutencao}</p>
                      <p className="text-xs text-muted-foreground">Em manutenção</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-border/50 shadow-sm">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <AlertCircle className="w-6 h-6 text-red-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{orcamentosPendentes}</p>
                      <p className="text-xs text-muted-foreground">Aprovações pendentes</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border border-border/50 shadow-sm">
                  <CardContent className="p-5 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">{fleet.vehiclesAvailable.length}</p>
                      <p className="text-xs text-muted-foreground">Disponíveis</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {totalFrota === 0 && (
                <Card className="border border-border/50">
                  <CardContent className="p-12 text-center">
                    <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-foreground">Nenhum veículo cadastrado</h3>
                    <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                      Cadastre seus veículos para começar a acompanhar manutenções, orçamentos e relatórios.
                    </p>
                    <Button className="mt-4 gap-2" onClick={() => setActiveTab('cadastro')}>
                      <Plus className="w-4 h-4" /> Cadastrar Veículo
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Recent service orders */}
              {fleet.serviceOrders.length > 0 && (
                <Card className="border border-border/50 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      Últimas Ordens de Serviço
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {fleet.serviceOrders.slice(0, 5).map((so) => {
                        const vehicle = fleet.vehicles.find(v => v.id === so.vehicle_id);
                        return (
                          <div key={so.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center">
                                <Car className="w-4 h-4 text-muted-foreground" />
                              </div>
                              <div>
                                <span className="font-mono font-bold text-foreground text-sm">{vehicle?.placa || '—'}</span>
                                <p className="text-xs text-muted-foreground">{so.oficina_nome || 'Sem oficina'}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {so.valor_orcamento && (
                                <span className="text-sm font-semibold text-foreground">
                                  R$ {so.valor_orcamento.toLocaleString('pt-BR')}
                                </span>
                              )}
                              <ServiceStageBadge stage={so.stage as ServiceStage} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          );

        // ════════════════════════════════════
        // CENTRAL DE APROVAÇÕES (REAL DATA)
        // ════════════════════════════════════
        case 'aprovacoes':
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Central de Aprovações</h2>
                  <p className="text-sm text-muted-foreground">{pendingOrders.length} orçamento(s) aguardando sua decisão</p>
                </div>
              </div>

              {pendingOrders.length === 0 && (
                <Card className="border border-border/50">
                  <CardContent className="p-12 text-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-foreground mb-1">Tudo em dia!</h3>
                    <p className="text-sm text-muted-foreground">Não há orçamentos pendentes de aprovação.</p>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-3">
                {pendingOrders.map((order) => {
                  const vehicle = fleet.vehicles.find(v => v.id === order.vehicle_id);
                  const placa = vehicle?.placa || 'N/A';
                  const modelo = vehicle ? `${vehicle.marca || ''} ${vehicle.modelo || ''}`.trim() : 'N/A';
                  const km = vehicle?.km_atual || 0;
                  const descricao = order.descricao_servico || 'Sem descrição';
                  const valor = order.valor_orcamento || 0;
                  const oficina = order.oficina_nome || 'Oficina';
                  const dataEntrada = order.data_entrada ? new Date(order.data_entrada).toLocaleDateString('pt-BR') : '--';

                  return (
                    <Card key={order.id} className="border border-border/50 shadow-sm overflow-hidden">
                      <div className={`h-1 ${order.stage === 'orcamento_enviado' ? 'bg-amber-500' : 'bg-primary'}`} />
                      <CardContent className="p-5">
                        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                          <div className="flex-1 min-w-0 space-y-3">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-mono font-bold text-foreground text-lg">{placa}</span>
                              <Separator orientation="vertical" className="h-5" />
                              <span className="text-sm text-muted-foreground">{modelo}</span>
                              <Separator orientation="vertical" className="h-5" />
                              <span className="text-sm font-medium text-muted-foreground">{oficina}</span>
                              <ServiceStageBadge stage={order.stage as ServiceStage} />
                            </div>

                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>KM: {km.toLocaleString('pt-BR')}</span>
                              <span>·</span>
                              <span>Entrada: {dataEntrada}</span>
                            </div>

                            {/* Budget details */}
                            <details className="group">
                              <summary className="cursor-pointer text-xs font-medium text-primary flex items-center gap-1">
                                <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
                                Ver detalhes do orçamento
                              </summary>
                              <div className="mt-2 p-3 rounded-lg bg-muted/30 border border-border/30">
                                <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed max-h-64 overflow-y-auto">
                                  {descricao}
                                </pre>
                              </div>
                            </details>
                          </div>

                          {/* Right side — Value & Actions */}
                          <div className="flex flex-col items-end gap-3 shrink-0 lg:min-w-[200px]">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-foreground">
                                {valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </p>
                              <p className="text-xs text-muted-foreground">Valor do orçamento</p>
                            </div>
                            <div className="flex gap-2 w-full lg:w-auto">
                              <Button
                                size="default"
                                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white flex-1 lg:flex-none"
                                disabled={fleet.saving}
                                onClick={async () => {
                                  const ok = await fleet.updateStage(
                                    order.id,
                                    'orcamento_aprovado',
                                    'gestor_frota',
                                    'Orçamento aprovado pelo gestor',
                                    { valor_aprovado: valor }
                                  );
                                  if (ok) toast.success(`Orçamento de ${placa} aprovado!`);
                                }}
                              >
                                <Check className="w-4 h-4" /> Aprovar
                              </Button>
                              <Button
                                size="default"
                                variant="outline"
                                className="gap-2 flex-1 lg:flex-none"
                                onClick={() => { setActiveTab('questionar'); }}
                              >
                                <MessageCircle className="w-4 h-4" /> Questionar
                              </Button>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="gap-1 text-xs text-destructive"
                              disabled={fleet.saving}
                              onClick={async () => {
                                const ok = await fleet.updateStage(
                                  order.id,
                                  'checkin',
                                  'gestor_frota',
                                  'Orçamento recusado pelo gestor — devolvido para check-in'
                                );
                                if (ok) toast.success(`Orçamento de ${placa} recusado.`);
                              }}
                            >
                              <X className="w-3.5 h-3.5" /> Recusar
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );

        // ════════════════════════════════════
        // CADASTRAR VEÍCULO — VERO 1.0
        // ════════════════════════════════════
        case 'cadastro': {
          const handleVeroScan = async (base64: string, mime: string, scanType: 'traseira' | 'documento') => {
            setVeroStep('uploading');
            try {
              setVeroStep('analyzing');
              const { data, error } = await supabase.functions.invoke('vero-scan', {
                body: { imageBase64: base64, mimeType: mime, scanType },
              });
              if (error) throw error;
              if (data?.error) {
                toast.error(data.message || data.error);
                setVeroStep('idle');
                return;
              }
              const r = data.result;
              setVeroResult(r);
              setVeroScanType(scanType);
              setVeroStep('result');
            } catch (err: any) {
              console.error('VERO scan error:', err);
              toast.error('Erro ao analisar imagem. Verifique as chaves de IA no painel admin.');
              setVeroStep('idle');
            }
          };

          const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, scanType: 'traseira' | 'documento') => {
            const file = e.target.files?.[0];
            if (file) {
              const reader = new FileReader();
              reader.onload = (ev) => {
                const dataUrl = ev.target?.result as string;
                setVeroImagePreview(dataUrl);
                const [header, base64] = dataUrl.split(',');
                const mime = header.match(/data:(.*?);/)?.[1] || 'image/jpeg';
                handleVeroScan(base64, mime, scanType);
              };
              reader.readAsDataURL(file);
            }
          };

          const handleVeroConfirm = async () => {
            if (!veroResult) return;
            const vehicle = await fleet.addVehicle({
              placa: veroResult.placa || '',
              marca: veroResult.marca !== 'N/A' ? veroResult.marca : undefined,
              modelo: veroResult.modelo !== 'N/A' ? veroResult.modelo : undefined,
              cor: veroResult.cor !== 'N/A' ? veroResult.cor : undefined,
              ano: veroResult.ano !== 'N/A' ? veroResult.ano : undefined,
              chassi: veroResult.chassi !== 'N/A' ? veroResult.chassi : undefined,
              renavam: veroResult.renavam !== 'N/A' ? veroResult.renavam : undefined,
              combustivel: veroResult.combustivel !== 'N/A' ? veroResult.combustivel : undefined,
              potencia: veroResult.potencia !== 'N/A' ? veroResult.potencia : undefined,
              ano_fabricacao: veroResult.ano_fabricacao !== 'N/A' ? veroResult.ano_fabricacao : undefined,
              ano_modelo: veroResult.ano_modelo !== 'N/A' ? veroResult.ano_modelo : undefined,
            });
            if (vehicle) {
              setVeroStep('confirmed');
              setTimeout(() => {
                setVeroStep('idle');
                setVeroImagePreview(null);
                setVeroResult(null);
              }, 3000);
            }
          };

          const handleVeroReject = () => {
            setVeroStep('idle');
            setVeroImagePreview(null);
            setVeroResult(null);
            setCadastroMode('manual');
            if (veroResult) {
              setCadastroForm(prev => ({
                ...prev,
                placa: veroResult.placa !== 'N/A' ? veroResult.placa : prev.placa,
                marca: veroResult.marca !== 'N/A' ? veroResult.marca : prev.marca,
                modelo: veroResult.modelo !== 'N/A' ? veroResult.modelo : prev.modelo,
                cor: veroResult.cor !== 'N/A' ? veroResult.cor : prev.cor,
                ano: veroResult.ano !== 'N/A' ? veroResult.ano : prev.ano,
                tipo: veroResult.tipo !== 'N/A' ? veroResult.tipo : prev.tipo,
                chassi: veroResult.chassi && veroResult.chassi !== 'N/A' ? veroResult.chassi : prev.chassi,
                renavam: veroResult.renavam && veroResult.renavam !== 'N/A' ? veroResult.renavam : prev.renavam,
                combustivel: veroResult.combustivel && veroResult.combustivel !== 'N/A' ? veroResult.combustivel : prev.combustivel,
                potencia: veroResult.potencia && veroResult.potencia !== 'N/A' ? veroResult.potencia : prev.potencia,
              }));
            }
          };

          const resetVero = () => {
            setVeroStep('idle');
            setVeroImagePreview(null);
            setVeroResult(null);
            setCadastroForm({ placa: '', marca: '', modelo: '', cor: '', ano: '', km: '', tipo: '', motorista: '', chassi: '', renavam: '', combustivel: '', potencia: '' });
          };

          const isVeroMode = cadastroMode === 'traseira' || cadastroMode === 'documento';

          // Build result fields dynamically based on scan type
          const resultFields = veroScanType === 'documento'
            ? [
                { label: 'Placa', value: veroResult?.placa, icon: '🔤' },
                { label: 'Marca', value: veroResult?.marca, icon: '🏭' },
                { label: 'Modelo', value: veroResult?.modelo, icon: '🚗' },
                { label: 'Ano Fab.', value: veroResult?.ano_fabricacao || veroResult?.ano, icon: '📅' },
                { label: 'Ano Mod.', value: veroResult?.ano_modelo || veroResult?.ano, icon: '📅' },
                { label: 'Cor', value: veroResult?.cor, icon: '🎨' },
                { label: 'Tipo', value: veroResult?.tipo, icon: '📦' },
                { label: 'Chassi', value: veroResult?.chassi, icon: '🔢' },
                { label: 'RENAVAM', value: veroResult?.renavam, icon: '🆔' },
                { label: 'Combustível', value: veroResult?.combustivel, icon: '⛽' },
                { label: 'Potência', value: veroResult?.potencia, icon: '🔧' },
              ].filter(f => f.value && f.value !== 'N/A')
            : [
                { label: 'Placa', value: veroResult?.placa, icon: '🔤' },
                { label: 'Marca', value: veroResult?.marca, icon: '🏭' },
                { label: 'Modelo', value: veroResult?.modelo, icon: '🚗' },
                { label: 'Ano', value: veroResult?.ano, icon: '📅' },
                { label: 'Cor', value: veroResult?.cor, icon: '🎨' },
                { label: 'Tipo', value: veroResult?.tipo, icon: '📦' },
              ];

          return (
            <div className="space-y-6 max-w-3xl">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Cadastrar Novo Veículo</h2>
                <p className="text-sm text-muted-foreground">Use o escaneamento inteligente ou preencha manualmente</p>
              </div>

              {/* Tabs: Foto Traseira / Foto Documento / Manual */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={cadastroMode === 'traseira' ? 'default' : 'outline'}
                  onClick={() => { setCadastroMode('traseira'); resetVero(); }}
                  className="gap-2"
                  size="sm"
                >
                  <Camera className="w-4 h-4" /> Foto Traseira
                </Button>
                <Button
                  variant={cadastroMode === 'documento' ? 'default' : 'outline'}
                  onClick={() => { setCadastroMode('documento'); resetVero(); }}
                  className="gap-2"
                  size="sm"
                >
                  <FileText className="w-4 h-4" /> Foto Documento
                </Button>
                <Button
                  variant={cadastroMode === 'manual' ? 'default' : 'outline'}
                  onClick={() => { setCadastroMode('manual'); setVeroStep('idle'); setVeroImagePreview(null); setVeroResult(null); }}
                  className="gap-2"
                  size="sm"
                >
                  <Edit className="w-4 h-4" /> Manual
                </Button>
              </div>

              {/* ── VERO 1.0 FLOW (traseira or documento) ── */}
              {isVeroMode && (
                <div className="space-y-5">
                  {/* Upload Area */}
                  {veroStep === 'idle' && (
                    <Card className="border-2 border-dashed border-primary/30 bg-primary/5 hover:border-primary/50 transition-colors">
                      <CardContent className="p-8 flex flex-col items-center justify-center text-center">
                        <label className="cursor-pointer flex flex-col items-center gap-4">
                          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center">
                            {cadastroMode === 'documento' ? <FileText className="w-10 h-10 text-primary" /> : <Camera className="w-10 h-10 text-primary" />}
                          </div>
                          <div className="space-y-1">
                            <p className="text-base font-semibold text-foreground">
                              {cadastroMode === 'documento'
                                ? 'Fotografe o documento do veículo (CRV/CRLV)'
                                : 'Fotografe a traseira do veículo'}
                            </p>
                            <p className="text-sm text-muted-foreground max-w-sm">
                              {cadastroMode === 'documento'
                                ? 'A VERO 1.0 vai extrair automaticamente os dados do documento: placa, marca, modelo, ano, chassi, RENAVAM e mais'
                                : 'A VERO 1.0 vai identificar automaticamente a placa, marca, modelo e ano do veículo a partir da imagem'}
                            </p>
                          </div>
                          <div className="flex gap-3 mt-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                              <Camera className="w-3.5 h-3.5" /> Tirar Foto
                            </span>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted text-muted-foreground text-xs font-medium">
                              <Upload className="w-3.5 h-3.5" /> Enviar Imagem
                            </span>
                          </div>
                          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFileChange(e, cadastroMode as 'traseira' | 'documento')} />
                        </label>
                      </CardContent>
                    </Card>
                  )}

                  {/* Analyzing */}
                  {(veroStep === 'uploading' || veroStep === 'analyzing') && (
                    <Card className="border border-primary/30 bg-card">
                      <CardContent className="p-8 flex flex-col items-center gap-5">
                        {veroImagePreview && (
                          <div className="w-full max-w-md rounded-xl overflow-hidden border border-border/50">
                            <img src={veroImagePreview} alt="Imagem escaneada" className="w-full h-48 object-cover" />
                          </div>
                        )}
                        <div className="flex flex-col items-center gap-3 text-center">
                          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
                            <ScanLine className="w-7 h-7 text-primary" />
                          </div>
                          <div>
                            <p className="text-base font-semibold text-foreground">
                              {veroStep === 'uploading' ? 'Enviando imagem...' : 'VERO 1.0 analisando...'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {veroStep === 'uploading'
                                ? 'Preparando a imagem para análise'
                                : cadastroMode === 'documento'
                                  ? 'Extraindo dados do documento veicular...'
                                  : 'Identificando placa, marca, modelo e características do veículo'}
                            </p>
                          </div>
                          <Loader2 className="w-6 h-6 text-primary animate-spin" />
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Result — Confirmation */}
                  {veroStep === 'result' && veroResult && (
                    <Card className="border border-primary/30 bg-card shadow-md">
                      <CardContent className="p-6 space-y-5">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">
                              VERO 1.0 — {veroScanType === 'documento' ? 'Dados do Documento' : 'Resultado da Análise'}
                            </p>
                            <p className="text-xs text-muted-foreground">Confiança: <strong className="text-primary">{veroResult.confianca || 0}%</strong></p>
                          </div>
                        </div>

                        {veroImagePreview && (
                          <div className="w-full rounded-xl overflow-hidden border border-border/50">
                            <img src={veroImagePreview} alt="Imagem analisada" className="w-full h-48 object-cover" />
                          </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                          {resultFields.map(item => (
                            <div key={item.label} className="p-3 bg-muted/30 rounded-lg border border-border/30">
                              <p className="text-[10px] text-muted-foreground uppercase font-semibold tracking-wider">{item.icon} {item.label}</p>
                              <p className="text-sm font-bold text-foreground mt-0.5">{item.value}</p>
                            </div>
                          ))}
                        </div>

                        <Separator />

                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                          <p className="text-sm font-semibold text-amber-600 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" /> Confirmação necessária
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Verifique se os dados acima correspondem ao veículo real. Ao confirmar, o veículo será registrado na sua frota.
                          </p>
                        </div>

                        <div className="flex gap-3">
                          <Button onClick={handleVeroConfirm} className="flex-1 gap-2">
                            <CheckCircle className="w-4 h-4" /> Confirmar Dados
                          </Button>
                          <Button onClick={handleVeroReject} variant="outline" className="gap-2">
                            <Edit className="w-4 h-4" /> Corrigir Manualmente
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Confirmed Success */}
                  {veroStep === 'confirmed' && (
                    <Card className="border border-emerald-500/30 bg-emerald-500/5">
                      <CardContent className="p-8 flex flex-col items-center gap-4 text-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center">
                          <CheckCircle className="w-8 h-8 text-emerald-500" />
                        </div>
                        <div>
                          <p className="text-lg font-bold text-foreground">Veículo cadastrado com sucesso!</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            <strong>{veroResult?.modelo}</strong> — {veroResult?.placa} adicionado à sua frota
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* ── MANUAL MODE ── */}
              {cadastroMode === 'manual' && (() => {
                const handleManualSubmit = async () => {
                  if (!cadastroForm.placa) {
                    toast.error('Placa é obrigatória.');
                    return;
                  }
                  const vehicle = await fleet.addVehicle({
                    placa: cadastroForm.placa,
                    marca: cadastroForm.marca || undefined,
                    modelo: cadastroForm.modelo || undefined,
                    cor: cadastroForm.cor || undefined,
                    ano: cadastroForm.ano || undefined,
                    chassi: cadastroForm.chassi || undefined,
                    renavam: cadastroForm.renavam || undefined,
                    combustivel: cadastroForm.combustivel || undefined,
                    potencia: cadastroForm.potencia || undefined,
                    km_atual: cadastroForm.km ? parseInt(cadastroForm.km) : 0,
                  });
                  if (vehicle) {
                    setCadastroForm({ placa: '', marca: '', modelo: '', cor: '', ano: '', km: '', tipo: '', motorista: '', chassi: '', renavam: '', combustivel: '', potencia: '' });
                  }
                };
                return (
                <Card className="border border-border/50 shadow-sm">
                  <CardContent className="p-6 space-y-4">
                    <div className="space-y-1">
                      <p className="text-sm font-semibold text-foreground">Cadastro Manual</p>
                      <p className="text-xs text-muted-foreground">Preencha todos os campos do veículo</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Placa (ex: ABC-1D23)" value={cadastroForm.placa} onChange={(e) => setCadastroForm({ ...cadastroForm, placa: e.target.value })} />
                      <Input placeholder="Marca (ex: Toyota)" value={cadastroForm.marca} onChange={(e) => setCadastroForm({ ...cadastroForm, marca: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Modelo (ex: Hilux SRV)" value={cadastroForm.modelo} onChange={(e) => setCadastroForm({ ...cadastroForm, modelo: e.target.value })} />
                      <Input placeholder="Cor" value={cadastroForm.cor} onChange={(e) => setCadastroForm({ ...cadastroForm, cor: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <Input placeholder="Ano" type="number" value={cadastroForm.ano} onChange={(e) => setCadastroForm({ ...cadastroForm, ano: e.target.value })} />
                      <Input placeholder="KM Atual" type="number" value={cadastroForm.km} onChange={(e) => setCadastroForm({ ...cadastroForm, km: e.target.value })} />
                      <Select value={cadastroForm.tipo} onValueChange={(v) => setCadastroForm({ ...cadastroForm, tipo: v })}>
                        <SelectTrigger><SelectValue placeholder="Tipo" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sedan">Sedan</SelectItem>
                          <SelectItem value="suv">SUV</SelectItem>
                          <SelectItem value="hatch">Hatch</SelectItem>
                          <SelectItem value="picape">Picape</SelectItem>
                          <SelectItem value="van">Van</SelectItem>
                          <SelectItem value="caminhao">Caminhão</SelectItem>
                          <SelectItem value="cavalo">Cavalo Mecânico</SelectItem>
                          <SelectItem value="carreta">Carreta</SelectItem>
                          <SelectItem value="truck">Truck</SelectItem>
                          <SelectItem value="moto">Moto</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Chassi (opcional)" value={cadastroForm.chassi} onChange={(e) => setCadastroForm({ ...cadastroForm, chassi: e.target.value })} />
                      <Input placeholder="RENAVAM (opcional)" value={cadastroForm.renavam} onChange={(e) => setCadastroForm({ ...cadastroForm, renavam: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <Input placeholder="Combustível (ex: Flex)" value={cadastroForm.combustivel} onChange={(e) => setCadastroForm({ ...cadastroForm, combustivel: e.target.value })} />
                      <Input placeholder="Potência (ex: 2.0)" value={cadastroForm.potencia} onChange={(e) => setCadastroForm({ ...cadastroForm, potencia: e.target.value })} />
                    </div>
                    <Input placeholder="Motorista responsável" value={cadastroForm.motorista} onChange={(e) => setCadastroForm({ ...cadastroForm, motorista: e.target.value })} />
                    <Button className="w-full gap-2" onClick={handleManualSubmit} disabled={fleet.saving}>
                      {fleet.saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Cadastrar Veículo
                    </Button>
                  </CardContent>
                </Card>
              );
              })()}
            </div>
          );
        }

        // ════════════════════════════════════
        // VEÍCULOS (FROTA)
        // ════════════════════════════════════
        case 'frota': {
          const allVehicles = fleet.vehiclesWithOrders.filter(v =>
            v.placa.toLowerCase().includes(searchVeiculos.toLowerCase()) ||
            (v.modelo || '').toLowerCase().includes(searchVeiculos.toLowerCase()) ||
            (v.marca || '').toLowerCase().includes(searchVeiculos.toLowerCase())
          );
          const emManutencao = allVehicles.filter(v => v.currentStage !== null);
          const disponiveis = allVehicles.filter(v => v.currentStage === null);

          return (
            <div className="space-y-5">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Minha Frota</h2>
                  <p className="text-sm text-muted-foreground">{fleet.vehicles.length} veículos · {emManutencao.length} em serviço</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Buscar placa, modelo, motorista..." className="pl-9 w-64" value={searchVeiculos} onChange={(e) => setSearchVeiculos(e.target.value)} />
                  </div>
                  <Button size="sm" className="gap-1.5" onClick={() => setActiveTab('cadastro')}>
                    <Plus className="w-4 h-4" /> Novo Veículo
                  </Button>
                </div>
              </div>

              {/* Vehicles in Service — Card view with pipeline */}
              {emManutencao.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-amber-500" /> Em Serviço ({emManutencao.length})
                  </h3>
                  {emManutencao.map((v) => (
                    <Card key={v.placa} className="border border-border/50 shadow-sm hover:border-primary/30 transition-colors overflow-hidden">
                      <CardContent className="p-4 sm:p-5">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <Car className="w-5 h-5 text-muted-foreground" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-foreground">{v.placa}</span>
                                <span className="text-xs text-muted-foreground">·</span>
                                <span className="text-sm text-muted-foreground">{v.modelo || v.marca || '—'} {v.ano ? `(${v.ano})` : ''}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                {v.activeOrder?.oficina_nome && <><Building2 className="w-3 h-3" /><span>{v.activeOrder.oficina_nome}</span><span>·</span></>}
                                <span className="font-mono">{(v.km_atual || 0).toLocaleString('pt-BR')} km</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right hidden sm:block">
                            {v.activeOrder?.valor_orcamento && (
                              <p className="text-sm font-semibold text-foreground">R$ {v.activeOrder.valor_orcamento.toLocaleString('pt-BR')}</p>
                            )}
                          </div>
                        </div>

                        {v.currentStage && <ServiceStagePipeline currentStage={v.currentStage} compact className="mb-3" />}

                        <div className="flex items-center gap-2 pt-3 border-t border-border/30">
                          {v.currentStage === 'orcamento_analise' && (
                            <Button size="sm" className="gap-1.5 text-xs" onClick={() => setActiveTab('aprovacoes')}>
                              <Shield className="w-3.5 h-3.5" /> Revisar Orçamento
                            </Button>
                          )}
                          {v.currentStage === 'veiculo_finalizado' && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Serviço concluído — aguardando retirada
                            </span>
                          )}
                          {v.currentStage === 'veiculo_entregue' && (
                            <ServiceStageBadge stage={v.currentStage} />
                          )}
                          {(v.currentStage === 'checkin' || v.currentStage === 'orcamento_enviado') && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" /> Aguardando oficina
                            </span>
                          )}
                          {v.currentStage === 'orcamento_aprovado' && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                              <Wrench className="w-3.5 h-3.5 text-primary" /> Em execução na oficina
                            </span>
                          )}
                          <div className="flex-1" />
                          <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setActiveTab('questionar')}>
                            <MessageCircle className="w-3.5 h-3.5" /> Chat
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Available vehicles — compact table */}
              {disponiveis.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Disponíveis ({disponiveis.length})
                  </h3>
                  <Card className="border border-border/50 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-muted/30">
                            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Placa</th>
                            <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Modelo</th>
                            <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">KM</th>
                            <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Status</th>
                            <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Ação</th>
                          </tr>
                        </thead>
                        <tbody>
                          {disponiveis.map((v) => (
                            <tr key={v.placa} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3.5"><span className="font-mono font-bold text-foreground text-sm">{v.placa}</span></td>
                              <td className="px-4 py-3.5">
                                <span className="text-sm text-foreground">{v.modelo || v.marca || '—'}</span>
                                {v.ano && <span className="text-xs text-muted-foreground ml-1">({v.ano})</span>}
                              </td>
                              <td className="px-4 py-3.5 text-center text-sm text-muted-foreground hidden lg:table-cell font-mono">{(v.km_atual || 0).toLocaleString('pt-BR')}</td>
                              <td className="px-4 py-3.5 text-center">
                                <Badge className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20" variant="outline">Disponível</Badge>
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 text-xs border-amber-500/30 text-amber-600 hover:bg-amber-500/10 hover:border-amber-500/50"
                                  onClick={() => setMaintenanceVehicle(v)}
                                >
                                  <Wrench className="w-3.5 h-3.5" /> Manutenção
                                </Button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </div>
              )}
            </div>
          );
        }
        // ════════════════════════════════════
        // TODOS OS ORÇAMENTOS
        // ════════════════════════════════════
        case 'orcamentos': {
          const allOrders = fleet.serviceOrders;
          return (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Orçamentos</h2>
                <p className="text-sm text-muted-foreground">Histórico de todos os orçamentos recebidos ({allOrders.length})</p>
              </div>

              {allOrders.length === 0 ? (
                <Card className="border border-border/50">
                  <CardContent className="p-12 text-center">
                    <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                    <h3 className="text-lg font-semibold text-foreground">Nenhum orçamento ainda</h3>
                    <p className="text-sm text-muted-foreground mt-1">Os orçamentos aparecerão aqui quando forem enviados pelas oficinas.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="border border-border/50 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Placa</th>
                          <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Oficina</th>
                          <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Serviço</th>
                          <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Etapa</th>
                          <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Valor</th>
                          <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Data</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allOrders.map((order) => {
                          const vehicle = fleet.vehicles.find(v => v.id === order.vehicle_id);
                          return (
                            <tr key={order.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                              <td className="px-4 py-3.5">
                                <span className="font-mono font-bold text-foreground text-sm">{vehicle?.placa || '—'}</span>
                                {vehicle?.modelo && <p className="text-[10px] text-muted-foreground">{vehicle.modelo}</p>}
                              </td>
                              <td className="px-4 py-3.5 text-sm text-foreground">{order.oficina_nome || '—'}</td>
                              <td className="px-4 py-3.5 text-sm text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{order.descricao_servico || '—'}</td>
                              <td className="px-4 py-3.5 text-center">
                                <ServiceStageBadge stage={order.stage as ServiceStage} />
                              </td>
                              <td className="px-4 py-3.5 text-right">
                                <span className="font-bold text-foreground">
                                  {order.valor_orcamento ? order.valor_orcamento.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}
                                </span>
                              </td>
                              <td className="px-4 py-3.5 text-center text-xs text-muted-foreground hidden sm:table-cell">
                                {order.data_entrada ? new Date(order.data_entrada).toLocaleDateString('pt-BR') : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </div>
          );
        }

        // ════════════════════════════════════
        // FINANCEIRO
        // ════════════════════════════════════
        case 'financeiro':
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Financeiro</h2>
                  <p className="text-sm text-muted-foreground">Controle de pagamentos e notas fiscais</p>
                </div>
              </div>
              <Card className="border border-border/50">
                <CardContent className="p-12 text-center">
                  <CircleDollarSign className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-foreground">Em breve</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    O módulo financeiro será alimentado automaticamente conforme os orçamentos forem aprovados e os serviços concluídos.
                  </p>
                </CardContent>
              </Card>
            </div>
          );

        // ════════════════════════════════════
        // RELATÓRIOS
        // ════════════════════════════════════
        case 'relatorios':
          return (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Relatórios & Análises</h2>
                <p className="text-sm text-muted-foreground">Visão analítica da sua operação</p>
              </div>
              <Card className="border border-border/50">
                <CardContent className="p-12 text-center">
                  <FileBarChart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-foreground">Em breve</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    Os relatórios serão gerados automaticamente a partir dos dados reais de manutenção da sua frota.
                  </p>
                </CardContent>
              </Card>
            </div>
          );

        // ════════════════════════════════════
        // QUESTIONAR — CHAT COM OFICINAS (REAL)
        // ════════════════════════════════════
        case 'questionar': {
          const cpId = customerProductId || '';
          return (
            <FleetChat
              customerProductId={cpId}
              currentRole="frota"
              currentName={user?.email?.split('@')[0] || 'Gestor'}
            />
          );
        }

        default:
          return null;
      }
    };

    const activeTabData = frotaTabs.find(t => t.value === activeTab);

    const FrotaSidebarNav = () => (
      <div className="flex flex-col h-full">
        <div className="px-5 py-5 border-b border-border/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
              <Truck className="w-4.5 h-4.5 text-primary" />
            </div>
            <div>
              <p className="font-semibold text-foreground text-sm leading-none">Auditt</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Gestão de Frotas</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {frotaTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.value;
            return (
              <button key={tab.value} onClick={() => { setActiveTab(tab.value); setFrotaSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] font-medium transition-colors ${
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                }`}>
                <Icon className="w-[18px] h-[18px] shrink-0" />
                <div className="flex-1 text-left min-w-0">
                  <span className="block">{tab.label}</span>
                  
                </div>
                {tab.value === 'aprovacoes' && (
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${active ? 'bg-primary/20 text-primary' : 'bg-red-500/10 text-red-500'}`}>
                    {orcamentosPendentes}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
        <div className="px-3 py-3 border-t border-border/50">
          <button onClick={() => setRole('select')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-[13px] text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors">
            <UserCheck className="w-[18px] h-[18px]" /><span>Trocar Perfil</span>
          </button>
        </div>
      </div>
    );

    return (
      <div className={`min-h-screen bg-background flex ${fleetThemeClass}`}>
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-56 border-r border-border/50 bg-card/50 sticky top-0 h-screen">
          <FrotaSidebarNav />
        </aside>

        {/* Main Content */}
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border/50 px-5 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sheet open={frotaSidebarOpen} onOpenChange={setFrotaSidebarOpen}>
                <SheetTrigger asChild><Button variant="ghost" size="icon" className="md:hidden h-8 w-8"><Menu className="w-4 h-4" /></Button></SheetTrigger>
                <SheetContent side="left" className="w-56 p-0"><FrotaSidebarNav /></SheetContent>
              </Sheet>
              <div>
                <h1 className="text-base font-semibold text-foreground leading-none">{activeTabData?.label}</h1>
                <p className="text-[11px] text-muted-foreground mt-0.5">{activeTabData?.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" onClick={toggleFleetTheme}>
                {fleetLight ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground relative">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive rounded-full text-[9px] text-destructive-foreground flex items-center justify-center font-bold">{orcamentosPendentes}</span>
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Download className="w-4 h-4" /></Button>
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">
            {renderContent()}
          </main>
        </div>

        {/* Maintenance Request Dialog */}
        {maintenanceVehicle && (
          <MaintenanceRequestDialog
            open={!!maintenanceVehicle}
            onOpenChange={(open) => { if (!open) setMaintenanceVehicle(null); }}
            vehicle={maintenanceVehicle}
            saving={fleet.saving}
            onSubmit={async (data) => {
              // Update vehicle km
              await supabase
                .from('fleet_vehicles')
                .update({ km_atual: data.km_atual })
                .eq('id', data.vehicle_id);

              // Create service order with description
              const descricao = `**Problema:** ${data.descricao_problema}\n\n**Serviços solicitados:**\n${data.servicos_solicitados.map(s => `• ${s}`).join('\n')}`;
              const result = await fleet.createServiceOrder({
                vehicle_id: data.vehicle_id,
                oficina_nome: data.oficina_nome,
                descricao_servico: descricao,
              });
              return !!result;
            }}
          />
        )}
      </div>
    );
  }

  // ─── OFICINA PORTAL ───
  return <OficinaPortal onSwitchRole={() => setRole('select')} fleet={fleet} customerProductId={customerProductId} fleetLight={fleetLight} toggleFleetTheme={toggleFleetTheme} workshopId={workshopId} />;
};

export default GestaoFrotasOficinasSystem;
