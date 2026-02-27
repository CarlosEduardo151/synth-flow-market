import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OficinaPortal } from '@/components/oficina/OficinaPortal';
import { FleetChat } from '@/components/fleet/FleetChat';
import { ServiceStagePipeline, ServiceStageBadge, type ServiceStage } from '@/components/fleet/ServiceStagePipeline';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
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
  Truck, Wrench, Shield, DollarSign, Plus, Search, Star,
  MapPin, Phone, FileText, CheckCircle2, Clock, AlertTriangle,
  Car, Building2, TrendingUp, Eye, QrCode, Zap, Users, BarChart3,
  Download, MessageCircle, ChevronRight, Wallet, ShieldCheck,
  ShieldAlert, ShieldX, History, Receipt, X, Check, Filter,
  ArrowUpRight, ArrowDownRight, Fuel, CalendarDays, Activity,
  PieChart as PieChartIcon, Gauge, Bell, Settings, RefreshCw,
  ChevronDown, MoreHorizontal, Layers, Package, TrendingDown,
  CircleDollarSign, FileBarChart, AlertCircle, Menu, UserCheck,
  Camera, ScanLine, Loader2, CheckCircle, Upload, Sparkles, Edit
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Area, AreaChart, ComposedChart,
  Legend, RadialBarChart, RadialBar
} from 'recharts';

type UserRole = 'select' | 'frota' | 'oficina';

// ═══════════════════════════════════════════════════════════
// MOCK DATA — Frota
// ═══════════════════════════════════════════════════════════

const mockGastos12Meses = [
  { mes: 'Mar', valor: 62300, servicos: 18, preventiva: 28000, corretiva: 34300 },
  { mes: 'Abr', valor: 48100, servicos: 14, preventiva: 30000, corretiva: 18100 },
  { mes: 'Mai', valor: 55800, servicos: 16, preventiva: 25000, corretiva: 30800 },
  { mes: 'Jun', valor: 71200, servicos: 22, preventiva: 32000, corretiva: 39200 },
  { mes: 'Jul', valor: 43500, servicos: 12, preventiva: 27000, corretiva: 16500 },
  { mes: 'Ago', valor: 58900, servicos: 17, preventiva: 31000, corretiva: 27900 },
  { mes: 'Set', valor: 42500, servicos: 13, preventiva: 24000, corretiva: 18500 },
  { mes: 'Out', valor: 38200, servicos: 11, preventiva: 22000, corretiva: 16200 },
  { mes: 'Nov', valor: 55800, servicos: 15, preventiva: 28500, corretiva: 27300 },
  { mes: 'Dez', valor: 47100, servicos: 14, preventiva: 26000, corretiva: 21100 },
  { mes: 'Jan', valor: 31900, servicos: 9, preventiva: 20000, corretiva: 11900 },
  { mes: 'Fev', valor: 28700, servicos: 8, preventiva: 18000, corretiva: 10700 },
];

const mockCategoriaGastos = [
  { name: 'Motor & Transmissão', value: 145000, pct: 28 },
  { name: 'Freios & Suspensão', value: 98000, pct: 19 },
  { name: 'Elétrica & Eletrônica', value: 82000, pct: 16 },
  { name: 'Ar-Condicionado', value: 65000, pct: 13 },
  { name: 'Pneus & Rodas', value: 52000, pct: 10 },
  { name: 'Funilaria & Pintura', value: 38000, pct: 7 },
  { name: 'Outros', value: 36000, pct: 7 },
];

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)',
  'hsl(38, 92%, 50%)',
  'hsl(280, 65%, 60%)',
  'hsl(200, 80%, 50%)',
  'hsl(350, 80%, 55%)',
  'hsl(var(--muted-foreground))',
];

const mockPendencias = [
  {
    id: '1', oficina: 'ThermoCar', cnpj: '12.345.678/0001-90',
    placa: 'ABC-1D23', modelo: 'Scania R450', ano: 2022, km: 185420,
    servico: 'Troca do compressor de ar-condicionado + filtro secador',
    itens: [
      { desc: 'Compressor Denso 10PA17C', qtd: 1, unit: 2800, total: 2800 },
      { desc: 'Filtro Secador', qtd: 1, unit: 350, total: 350 },
      { desc: 'Gás R134a (kg)', qtd: 3, unit: 120, total: 360 },
      { desc: 'Mão de obra (h)', qtd: 4, unit: 185, total: 740 },
      { desc: 'Diagnóstico eletrônico', qtd: 1, unit: 250, total: 250 },
      { desc: 'Higienização do sistema', qtd: 1, unit: 350, total: 350 },
    ],
    valor: 4850.00, auditoria: 'verde' as const,
    iaMsg: 'Preço dentro da média regional BR-010. Todas as peças são compatíveis com Scania R450 2022.',
    iaScore: 92, data: '26/02/2026', fotos: 3,
  },
  {
    id: '2', oficina: 'EngeMec', cnpj: '98.765.432/0001-10',
    placa: 'DEF-5G67', modelo: 'Volvo FH 540', ano: 2021, km: 220380,
    servico: 'Retífica do motor + troca de bronzinas e junta do cabeçote',
    itens: [
      { desc: 'Retífica completa do motor D13', qtd: 1, unit: 8500, total: 8500 },
      { desc: 'Jogo de bronzinas (biela+mancal)', qtd: 1, unit: 2800, total: 2800 },
      { desc: 'Junta do cabeçote OEM', qtd: 1, unit: 1900, total: 1900 },
      { desc: 'Filtro de óleo HDF396', qtd: 2, unit: 280, total: 560 },
      { desc: 'Óleo sintético 15W40 (L)', qtd: 38, unit: 42, total: 1596 },
      { desc: 'Mão de obra especializada (h)', qtd: 18, unit: 195, total: 3510 },
      { desc: 'Teste de bancada', qtd: 1, unit: 350, total: 350 },
    ],
    valor: 19216.00, auditoria: 'amarelo' as const,
    iaMsg: 'Filtro de óleo HDF396 está 15% acima da média regional (R$243). Mão de obra compatível. Considere solicitar ajuste.',
    iaScore: 74, data: '25/02/2026', fotos: 8,
  },
  {
    id: '3', oficina: 'Oskauto', cnpj: '11.222.333/0001-44',
    placa: 'GHI-8J90', modelo: 'Mercedes Actros 2651', ano: 2023, km: 95120,
    servico: 'Substituição do módulo de injeção eletrônica + reprogramação ECU',
    itens: [
      { desc: 'Módulo de injeção PLD MR2', qtd: 1, unit: 8900, total: 8900 },
      { desc: 'Reprogramação ECU', qtd: 1, unit: 1800, total: 1800 },
      { desc: 'Mão de obra (h)', qtd: 6, unit: 200, total: 1200 },
      { desc: 'Diagnóstico avançado Star', qtd: 1, unit: 400, total: 400 },
    ],
    valor: 12300.00, auditoria: 'vermelho' as const,
    iaMsg: 'Módulo PLD MR2 cotado a R$8.900 — fornecedor homologado oferece por R$6.050 (32% mais barato). Recomendação: solicitar revisão ou trocar fornecedor.',
    iaScore: 38, data: '24/02/2026', fotos: 2,
  },
  {
    id: '4', oficina: 'AutoTech BR', cnpj: '55.666.777/0001-88',
    placa: 'JKL-2M34', modelo: 'DAF XF 530', ano: 2022, km: 161200,
    servico: 'Revisão preventiva 160.000km — troca de correias, filtros e fluidos',
    itens: [
      { desc: 'Kit correia dentada + tensor', qtd: 1, unit: 1850, total: 1850 },
      { desc: 'Correia do alternador', qtd: 1, unit: 320, total: 320 },
      { desc: 'Filtro de ar primário', qtd: 1, unit: 280, total: 280 },
      { desc: 'Filtro de ar secundário', qtd: 1, unit: 190, total: 190 },
      { desc: 'Filtro separador de água', qtd: 1, unit: 210, total: 210 },
      { desc: 'Fluido de arrefecimento (L)', qtd: 20, unit: 28, total: 560 },
      { desc: 'Mão de obra (h)', qtd: 6, unit: 175, total: 1050 },
    ],
    valor: 4460.00, auditoria: 'verde' as const,
    iaMsg: 'Revisão preventiva dentro do esperado para 160.000km. Todos os itens com preço justo.',
    iaScore: 96, data: '27/02/2026', fotos: 4,
  },
];

const mockVeiculos = [
  { placa: 'ABC-1D23', modelo: 'Scania R450', ano: 2022, km: 185420, tipo: 'Cavalo Mecânico', stage: 'orcamento_analise' as ServiceStage, oficina: 'ThermoCar', servicos: 12, gastoTotal: 48500, ultimaRev: '26/02/2026', motorista: 'Carlos Silva' },
  { placa: 'DEF-5G67', modelo: 'Volvo FH 540', ano: 2021, km: 220380, tipo: 'Cavalo Mecânico', stage: 'orcamento_aprovado' as ServiceStage, oficina: 'EngeMec', servicos: 8, gastoTotal: 62300, ultimaRev: '25/02/2026', motorista: 'Roberto Santos' },
  { placa: 'GHI-8J90', modelo: 'Mercedes Actros 2651', ano: 2023, km: 95120, tipo: 'Cavalo Mecânico', stage: 'checkin' as ServiceStage, oficina: 'Oskauto', servicos: 4, gastoTotal: 18900, ultimaRev: '24/02/2026', motorista: 'João Pereira' },
  { placa: 'JKL-2M34', modelo: 'DAF XF 530', ano: 2022, km: 161200, tipo: 'Cavalo Mecânico', stage: 'veiculo_finalizado' as ServiceStage, oficina: 'AutoTech BR', servicos: 15, gastoTotal: 72100, ultimaRev: '10/02/2026', motorista: 'Pedro Oliveira' },
  { placa: 'MNO-5P67', modelo: 'Iveco S-Way', ano: 2024, km: 45200, tipo: 'Cavalo Mecânico', stage: null as ServiceStage | null, oficina: null, servicos: 2, gastoTotal: 5800, ultimaRev: '15/01/2026', motorista: 'Lucas Costa' },
  { placa: 'PQR-8S01', modelo: 'Scania R500', ano: 2023, km: 132000, tipo: 'Cavalo Mecânico', stage: null as ServiceStage | null, oficina: null, servicos: 7, gastoTotal: 34200, ultimaRev: '05/02/2026', motorista: 'Marcos Lima' },
  { placa: 'STU-3V45', modelo: 'Volvo FM 460', ano: 2021, km: 245000, tipo: 'Truck', stage: 'veiculo_entregue' as ServiceStage, oficina: 'Oskauto', servicos: 19, gastoTotal: 89500, ultimaRev: '18/02/2026', motorista: 'André Souza' },
  { placa: 'VWX-6Y78', modelo: 'Mercedes Atego 2430', ano: 2022, km: 178500, tipo: 'Truck', stage: null as ServiceStage | null, oficina: null, servicos: 11, gastoTotal: 41800, ultimaRev: '22/02/2026', motorista: 'Ricardo Alves' },
];

const mockNotas = [
  { id: 'NF-2026-001', tipo: 'Serviço', emitente: 'ThermoCar', placa: 'ABC-1D23', valor: 4850.00, data: '26/02/2026', status: 'Disponível' },
  { id: 'NF-2026-002', tipo: 'Tecnologia', emitente: 'NovaLink', placa: '—', valor: 727.50, data: '26/02/2026', status: 'Disponível' },
  { id: 'NF-2026-003', tipo: 'Serviço', emitente: 'EngeMec', placa: 'DEF-5G67', valor: 8200.00, data: '20/02/2026', status: 'Disponível' },
  { id: 'NF-2026-004', tipo: 'Tecnologia', emitente: 'NovaLink', placa: '—', valor: 1230.00, data: '20/02/2026', status: 'Disponível' },
  { id: 'NF-2026-005', tipo: 'Serviço', emitente: 'AutoTech BR', placa: 'JKL-2M34', valor: 3200.00, data: '15/02/2026', status: 'Disponível' },
  { id: 'NF-2026-006', tipo: 'Tecnologia', emitente: 'NovaLink', placa: '—', valor: 480.00, data: '15/02/2026', status: 'Disponível' },
  { id: 'NF-2026-007', tipo: 'Serviço', emitente: 'Oskauto', placa: 'STU-3V45', valor: 6800.00, data: '10/02/2026', status: 'Disponível' },
  { id: 'NF-2026-008', tipo: 'Tecnologia', emitente: 'NovaLink', placa: '—', valor: 1020.00, data: '10/02/2026', status: 'Disponível' },
];

const mockHistoricoVeiculo = [
  { data: '26/02/2026', oficina: 'ThermoCar', servico: 'Troca compressor A/C', valor: 4850, auditoria: 'verde', km: 185420 },
  { data: '15/01/2026', oficina: 'EngeMec', servico: 'Troca de pastilhas de freio', valor: 1200, auditoria: 'verde', km: 180200 },
  { data: '10/12/2025', oficina: 'AutoTech BR', servico: 'Revisão preventiva 175k', valor: 3800, auditoria: 'verde', km: 175000 },
  { data: '22/10/2025', oficina: 'ThermoCar', servico: 'Troca correia alternador', valor: 950, auditoria: 'verde', km: 168500 },
  { data: '05/09/2025', oficina: 'Oskauto', servico: 'Reparo no turbo + junta', valor: 7200, auditoria: 'amarelo', km: 160000 },
];

const mockEconomiaIA = [
  { mes: 'Set', economia: 3200 },
  { mes: 'Out', economia: 1800 },
  { mes: 'Nov', economia: 5400 },
  { mes: 'Dez', economia: 2100 },
  { mes: 'Jan', economia: 4800 },
  { mes: 'Fev', economia: 12450 },
];

const mockGastoPorVeiculo = [
  { placa: 'STU-3V45', gasto: 89500 },
  { placa: 'JKL-2M34', gasto: 72100 },
  { placa: 'DEF-5G67', gasto: 62300 },
  { placa: 'ABC-1D23', gasto: 48500 },
  { placa: 'VWX-6Y78', gasto: 41800 },
];

const auditoriaConfig = {
  verde: { icon: ShieldCheck, label: 'Preço Justo', color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', barColor: 'hsl(142, 76%, 36%)' },
  amarelo: { icon: ShieldAlert, label: 'Atenção', color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', barColor: 'hsl(38, 92%, 50%)' },
  vermelho: { icon: ShieldX, label: 'Sobrepreço', color: 'text-red-500', bg: 'bg-red-500/10', border: 'border-red-500/20', barColor: 'hsl(0, 72%, 51%)' },
};

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
  const [role, setRole] = useState<UserRole>('select');
  const [activeTab, setActiveTab] = useState<FrotaTab>('overview');
  const [searchVeiculos, setSearchVeiculos] = useState('');
  const [selectedVeiculo, setSelectedVeiculo] = useState<string | null>(null);
  const [selectedOrcamento, setSelectedOrcamento] = useState<string | null>(null);
  const [filterAuditoria, setFilterAuditoria] = useState<string>('all');
  const [frotaSidebarOpen, setFrotaSidebarOpen] = useState(false);
  const [maintenanceVehicle, setMaintenanceVehicle] = useState<FleetVehicle | null>(null);
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

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    );
  }

  // ─── Role Selection Screen ───
  if (role === 'select') {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="min-h-[80vh] flex items-center justify-center p-4">
          <div className="max-w-3xl w-full space-y-8">
            <div className="text-center space-y-3">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <h1 className="text-3xl font-bold text-foreground">Bem-vindo à NovaLink</h1>
              <p className="text-muted-foreground text-lg max-w-md mx-auto">
                Selecione seu perfil para acessar o painel correto
              </p>
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
                    <li className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500 shrink-0" /> <span><strong className="text-foreground">Financeiro</strong> — Controle de recebíveis com depósito em D+1</span></li>
                    <li className="flex items-center gap-2"><MessageCircle className="w-4 h-4 text-emerald-500 shrink-0" /> <span><strong className="text-foreground">Mensagens</strong> — Negocie com os gestores sem sair do sistema</span></li>
                  </ul>
                </div>
              </button>
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
    const saldoDisponivel = 185000;
    const economiaMes = 12450;
    const veiculosManutencao = mockVeiculos.filter(v => v.stage !== null).length;
    const totalFrota = mockVeiculos.length;
    const ticketMedio = 4580;
    const totalGastoMes = 28700;
    const orcamentosPendentes = mockPendencias.length;

    const veiculosFiltrados = mockVeiculos.filter(v =>
      v.placa.toLowerCase().includes(searchVeiculos.toLowerCase()) ||
      v.modelo.toLowerCase().includes(searchVeiculos.toLowerCase()) ||
      v.motorista.toLowerCase().includes(searchVeiculos.toLowerCase())
    );

    const orcamentosFiltrados = filterAuditoria === 'all'
      ? mockPendencias
      : mockPendencias.filter(p => p.auditoria === filterAuditoria);

    // ── RENDER CONTENT BASED ON ACTIVE TAB ──
    const renderContent = () => {
      switch (activeTab) {

        // ════════════════════════════════════
        // VISÃO GERAL
        // ════════════════════════════════════
        case 'overview':
          return (
            <div className="space-y-6">
              {/* KPI ROW */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Saldo Disponível', value: saldoDisponivel, prefix: 'R$', icon: Wallet, trend: null, iconBg: 'bg-primary/10', iconColor: 'text-primary' },
                  { label: 'Economia c/ IA', value: economiaMes, prefix: 'R$', icon: TrendingUp, trend: '+34%', iconBg: 'bg-emerald-500/10', iconColor: 'text-emerald-500' },
                  { label: 'Gasto Mensal', value: totalGastoMes, prefix: 'R$', icon: TrendingDown, trend: '-10%', iconBg: 'bg-amber-500/10', iconColor: 'text-amber-500' },
                  { label: 'Ticket Médio', value: ticketMedio, prefix: 'R$', icon: Gauge, trend: null, iconBg: 'bg-muted', iconColor: 'text-muted-foreground' },
                ].map((kpi) => (
                  <Card key={kpi.label} className="border border-border/50 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center justify-between mb-3">
                        <div className={`w-9 h-9 rounded-lg ${kpi.iconBg} flex items-center justify-center`}>
                          <kpi.icon className={`w-4.5 h-4.5 ${kpi.iconColor}`} />
                        </div>
                        {kpi.trend && (
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${kpi.trend.startsWith('+') ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}>
                            {kpi.trend}
                          </span>
                        )}
                      </div>
                      <p className="text-2xl font-bold text-foreground tracking-tight">
                        {kpi.prefix}{' '}{kpi.value.toLocaleString('pt-BR')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

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
                      <Building2 className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">4</p>
                      <p className="text-xs text-muted-foreground">Oficinas ativas</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* CHARTS ROW */}
              <div className="grid lg:grid-cols-2 gap-4">
                {/* Gastos 12 meses — Preventiva vs Corretiva */}
                <Card className="border border-border/50 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-muted-foreground" />
                      Gastos com Manutenção — 12 Meses
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={mockGastos12Meses} barGap={0} barSize={14}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: number) => ['R$ ' + value.toLocaleString('pt-BR'), '']} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 12 }} />
                          <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="preventiva" name="Preventiva" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                          <Bar dataKey="corretiva" name="Corretiva" stackId="a" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                          <Line type="monotone" dataKey="servicos" name="Nº Serviços" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={{ r: 3 }} yAxisId={0} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Economia com IA */}
                <Card className="border border-border/50 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Shield className="w-4 h-4 text-emerald-500" />
                      Economia com Auditoria IA
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mockEconomiaIA}>
                          <defs>
                            <linearGradient id="econGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                              <stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: number) => ['R$ ' + value.toLocaleString('pt-BR'), 'Economia']} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 12 }} />
                          <Area type="monotone" dataKey="economia" stroke="hsl(142, 76%, 36%)" strokeWidth={2.5} fill="url(#econGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* BOTTOM ROW */}
              <div className="grid lg:grid-cols-3 gap-4">
                {/* Gastos por Categoria (Pie) */}
                <Card className="border border-border/50 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Gastos por Categoria</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-52">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={mockCategoriaGastos} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} strokeWidth={2} stroke="hsl(var(--card))">
                            {mockCategoriaGastos.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={(value: number) => ['R$ ' + value.toLocaleString('pt-BR'), '']} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 11 }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-1.5 mt-2">
                      {mockCategoriaGastos.slice(0, 4).map((c, i) => (
                        <div key={c.name} className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 rounded-sm" style={{ background: CHART_COLORS[i] }} />
                            <span className="text-muted-foreground truncate max-w-[140px]">{c.name}</span>
                          </div>
                          <span className="font-medium text-foreground">{c.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Top 5 Veículos — Gasto Acumulado */}
                <Card className="border border-border/50 shadow-sm lg:col-span-2">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Top 5 Veículos — Gasto Acumulado</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={mockGastoPorVeiculo} layout="vertical" barSize={20}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <YAxis type="category" dataKey="placa" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontFamily: 'monospace' }} width={80} />
                          <Tooltip formatter={(value: number) => ['R$ ' + value.toLocaleString('pt-BR'), 'Gasto Total']} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 12 }} />
                          <Bar dataKey="gasto" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          );

        // ════════════════════════════════════
        // CENTRAL DE APROVAÇÕES
        // ════════════════════════════════════
        case 'aprovacoes':
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Central de Aprovações</h2>
                  <p className="text-sm text-muted-foreground">{mockPendencias.length} orçamentos aguardando sua decisão</p>
                </div>
                <div className="flex items-center gap-2">
                  {(['all', 'verde', 'amarelo', 'vermelho'] as const).map((f) => (
                    <Button key={f} variant={filterAuditoria === f ? 'default' : 'outline'} size="sm" onClick={() => setFilterAuditoria(f)} className="text-xs">
                      {f === 'all' ? 'Todos' : f === 'verde' ? '🟢 Justo' : f === 'amarelo' ? '🟡 Atenção' : '🔴 Sobrepreço'}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                {orcamentosFiltrados.map((item) => {
                  const audit = auditoriaConfig[item.auditoria];
                  const AuditIcon = audit.icon;
                  return (
                    <Card key={item.id} className="border border-border/50 shadow-sm overflow-hidden">
                      <div className={`h-1 ${item.auditoria === 'verde' ? 'bg-emerald-500' : item.auditoria === 'amarelo' ? 'bg-amber-500' : 'bg-red-500'}`} />
                      <CardContent className="p-5">
                        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                          <div className="flex-1 min-w-0 space-y-3">
                            {/* Header */}
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-mono font-bold text-foreground text-lg">{item.placa}</span>
                              <Separator orientation="vertical" className="h-5" />
                              <span className="text-sm text-muted-foreground">{item.modelo} · {item.ano}</span>
                              <Separator orientation="vertical" className="h-5" />
                              <span className="text-sm font-medium text-muted-foreground">{item.oficina}</span>
                              <Badge variant="outline" className="text-[10px] font-mono">{item.cnpj}</Badge>
                            </div>
                            <p className="text-sm text-foreground font-medium">{item.servico}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>KM: {item.km.toLocaleString('pt-BR')}</span>
                              <span>·</span>
                              <span>{item.fotos} fotos anexadas</span>
                              <span>·</span>
                              <span>{item.data}</span>
                            </div>

                            {/* Selo IA */}
                            <div className={`flex items-start gap-3 px-4 py-3 rounded-lg ${audit.bg} border ${audit.border}`}>
                              <AuditIcon className={`w-5 h-5 ${audit.color} shrink-0 mt-0.5`} />
                              <div>
                                <div className="flex items-center gap-2 mb-1">
                                  <span className={`text-xs font-bold ${audit.color}`}>{audit.label}</span>
                                  <span className="text-xs text-muted-foreground">Score IA: {item.iaScore}/100</span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">{item.iaMsg}</p>
                              </div>
                            </div>

                            {/* Mini table */}
                            <details className="group">
                              <summary className="cursor-pointer text-xs font-medium text-primary flex items-center gap-1">
                                <ChevronDown className="w-3.5 h-3.5 group-open:rotate-180 transition-transform" />
                                Ver {item.itens.length} itens do orçamento
                              </summary>
                              <div className="mt-2 overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b bg-muted/30">
                                      <th className="text-left px-3 py-2 font-semibold text-muted-foreground">ITEM</th>
                                      <th className="text-center px-3 py-2 font-semibold text-muted-foreground">QTD</th>
                                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">UNIT.</th>
                                      <th className="text-right px-3 py-2 font-semibold text-muted-foreground">TOTAL</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {item.itens.map((it, idx) => (
                                      <tr key={idx} className="border-b border-border/30">
                                        <td className="px-3 py-2 text-foreground">{it.desc}</td>
                                        <td className="px-3 py-2 text-center text-muted-foreground">{it.qtd}</td>
                                        <td className="px-3 py-2 text-right text-muted-foreground">R$ {it.unit.toLocaleString('pt-BR')}</td>
                                        <td className="px-3 py-2 text-right font-medium text-foreground">R$ {it.total.toLocaleString('pt-BR')}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </details>
                          </div>

                          {/* Right side — Value & Actions */}
                          <div className="flex flex-col items-end gap-3 shrink-0 lg:min-w-[200px]">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-foreground">
                                {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </p>
                              <p className="text-xs text-muted-foreground">{item.itens.length} itens</p>
                            </div>
                            <div className="flex gap-2 w-full lg:w-auto">
                              <Button size="default" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white flex-1 lg:flex-none">
                                <Check className="w-4 h-4" /> Aprovar
                              </Button>
                              <Button size="default" variant="outline" className="gap-2 flex-1 lg:flex-none">
                                <MessageCircle className="w-4 h-4" /> Questionar
                              </Button>
                            </div>
                            <Button size="sm" variant="ghost" className="gap-1 text-xs text-destructive">
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
        case 'orcamentos':
          return (
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Orçamentos Completos</h2>
                <p className="text-sm text-muted-foreground">Histórico detalhado de todos os orçamentos recebidos</p>
              </div>

              <Card className="border border-border/50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Placa</th>
                        <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Oficina</th>
                        <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden md:table-cell">Serviço</th>
                        <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Auditoria IA</th>
                        <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Score</th>
                        <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden lg:table-cell">Itens</th>
                        <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Valor</th>
                        <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Data</th>
                        <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockPendencias.map((item) => {
                        const audit = auditoriaConfig[item.auditoria];
                        const AuditIcon = audit.icon;
                        return (
                          <tr key={item.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3.5">
                              <div>
                                <span className="font-mono font-bold text-foreground text-sm">{item.placa}</span>
                                <p className="text-[10px] text-muted-foreground">{item.modelo}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-sm text-foreground">{item.oficina}</td>
                            <td className="px-4 py-3.5 text-sm text-muted-foreground hidden md:table-cell max-w-[200px] truncate">{item.servico}</td>
                            <td className="px-4 py-3.5 text-center">
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full ${audit.bg} border ${audit.border}`}>
                                <AuditIcon className={`w-3.5 h-3.5 ${audit.color}`} />
                                <span className={`text-[10px] font-semibold ${audit.color}`}>{audit.label}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                              <span className={`text-sm font-bold ${item.iaScore >= 80 ? 'text-emerald-500' : item.iaScore >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                                {item.iaScore}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center text-sm text-muted-foreground hidden lg:table-cell">{item.itens.length}</td>
                            <td className="px-4 py-3.5 text-right">
                              <span className="font-bold text-foreground">
                                {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </span>
                            </td>
                            <td className="px-4 py-3.5 text-center text-xs text-muted-foreground hidden sm:table-cell">{item.data}</td>
                            <td className="px-4 py-3.5 text-right">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="gap-1 text-xs">
                                    <Eye className="w-3.5 h-3.5" /> Detalhar
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle className="flex items-center gap-2">
                                      <span className="font-mono">{item.placa}</span> — Orçamento {item.oficina}
                                    </DialogTitle>
                                  </DialogHeader>
                                  <div className="space-y-4 mt-2">
                                    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg ${audit.bg} border ${audit.border}`}>
                                      <AuditIcon className={`w-5 h-5 ${audit.color} shrink-0 mt-0.5`} />
                                      <div>
                                        <p className={`text-xs font-bold ${audit.color}`}>{audit.label} — Score {item.iaScore}/100</p>
                                        <p className="text-xs text-muted-foreground mt-1">{item.iaMsg}</p>
                                      </div>
                                    </div>
                                    <table className="w-full text-xs">
                                      <thead>
                                        <tr className="border-b bg-muted/30">
                                          <th className="text-left px-3 py-2 font-semibold text-muted-foreground">ITEM</th>
                                          <th className="text-center px-3 py-2 font-semibold text-muted-foreground">QTD</th>
                                          <th className="text-right px-3 py-2 font-semibold text-muted-foreground">UNIT.</th>
                                          <th className="text-right px-3 py-2 font-semibold text-muted-foreground">TOTAL</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {item.itens.map((it, idx) => (
                                          <tr key={idx} className="border-b border-border/30">
                                            <td className="px-3 py-2 text-foreground">{it.desc}</td>
                                            <td className="px-3 py-2 text-center text-muted-foreground">{it.qtd}</td>
                                            <td className="px-3 py-2 text-right text-muted-foreground">R$ {it.unit.toLocaleString('pt-BR')}</td>
                                            <td className="px-3 py-2 text-right font-medium text-foreground">R$ {it.total.toLocaleString('pt-BR')}</td>
                                          </tr>
                                        ))}
                                        <tr className="bg-muted/20">
                                          <td colSpan={3} className="px-3 py-2 text-right font-bold text-foreground">TOTAL</td>
                                          <td className="px-3 py-2 text-right font-bold text-foreground text-sm">
                                            {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                    <div className="flex gap-2 justify-end">
                                      <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
                                        <Check className="w-4 h-4" /> Aprovar
                                      </Button>
                                      <Button variant="outline" className="gap-2">
                                        <MessageCircle className="w-4 h-4" /> Questionar
                                      </Button>
                                      <Button variant="ghost" className="gap-2 text-destructive">
                                        <X className="w-4 h-4" /> Recusar
                                      </Button>
                                    </div>
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          );

        // ════════════════════════════════════
        // FINANCEIRO
        // ════════════════════════════════════
        case 'financeiro':
          const totalServico = mockNotas.filter(n => n.tipo === 'Serviço').reduce((s, n) => s + n.valor, 0);
          const totalTecnologia = mockNotas.filter(n => n.tipo === 'Tecnologia').reduce((s, n) => s + n.valor, 0);
          return (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Extrato & Notas Fiscais</h2>
                  <p className="text-sm text-muted-foreground">Controle completo de NFs de serviço e tecnologia</p>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5"><Download className="w-4 h-4" /> Exportar Tudo</Button>
              </div>

              {/* Summary cards */}
              <div className="grid sm:grid-cols-3 gap-4">
                <Card className="border border-border/50 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center">
                        <Receipt className="w-4.5 h-4.5 text-muted-foreground" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">Total Geral</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">R$ {(totalServico + totalTecnologia).toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{mockNotas.length} notas emitidas</p>
                  </CardContent>
                </Card>
                <Card className="border border-border/50 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <Wrench className="w-4.5 h-4.5 text-amber-500" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">NFs de Serviço</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">R$ {totalServico.toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{mockNotas.filter(n => n.tipo === 'Serviço').length} notas · Oficinas parceiras</p>
                  </CardContent>
                </Card>
                <Card className="border border-border/50 shadow-sm">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Zap className="w-4.5 h-4.5 text-primary" />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">NFs de Tecnologia</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">R$ {totalTecnologia.toLocaleString('pt-BR')}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">{mockNotas.filter(n => n.tipo === 'Tecnologia').length} notas · NovaLink 15%</p>
                  </CardContent>
                </Card>
              </div>

              {/* NF Table */}
              <Card className="border border-border/50 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Nº NF</th>
                        <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Tipo</th>
                        <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Emitente</th>
                        <th className="text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Placa</th>
                        <th className="text-center text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3 hidden sm:table-cell">Data</th>
                        <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3">Valor</th>
                        <th className="text-right text-[11px] font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockNotas.map((nf) => (
                        <tr key={nf.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-3.5"><span className="font-mono text-sm font-medium text-foreground">{nf.id}</span></td>
                          <td className="px-4 py-3.5">
                            <Badge variant="outline" className={`text-[10px] ${nf.tipo === 'Tecnologia' ? 'bg-primary/10 text-primary border-primary/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}`}>
                              {nf.tipo === 'Serviço' ? '🔧 Serviço' : '⚡ Tecnologia'}
                            </Badge>
                          </td>
                          <td className="px-4 py-3.5 text-sm text-foreground">{nf.emitente}</td>
                          <td className="px-4 py-3.5 text-sm font-mono text-muted-foreground hidden sm:table-cell">{nf.placa}</td>
                          <td className="px-4 py-3.5 text-center text-xs text-muted-foreground hidden sm:table-cell">{nf.data}</td>
                          <td className="px-4 py-3.5 text-right">
                            <span className="font-semibold text-foreground">R$ {nf.valor.toLocaleString('pt-BR')}</span>
                          </td>
                          <td className="px-4 py-3.5 text-right">
                            <Button variant="ghost" size="sm" className="gap-1 text-xs"><Download className="w-3.5 h-3.5" /> PDF</Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          );

        // ════════════════════════════════════
        // RELATÓRIOS
        // ════════════════════════════════════
        case 'relatorios':
          return (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Relatórios & Análises</h2>
                <p className="text-sm text-muted-foreground">Visão analítica completa da sua operação</p>
              </div>

              <div className="grid lg:grid-cols-2 gap-4">
                {/* Preventiva vs Corretiva (trend) */}
                <Card className="border border-border/50 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Preventiva vs Corretiva — Tendência</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={mockGastos12Meses}>
                          <defs>
                            <linearGradient id="prevGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.2} />
                              <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                            </linearGradient>
                            <linearGradient id="corrGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0.2} />
                              <stop offset="100%" stopColor="hsl(38, 92%, 50%)" stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: number) => ['R$ ' + value.toLocaleString('pt-BR'), '']} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 12 }} />
                          <Legend iconType="square" wrapperStyle={{ fontSize: 11 }} />
                          <Area type="monotone" dataKey="preventiva" name="Preventiva" stroke="hsl(var(--primary))" strokeWidth={2} fill="url(#prevGrad)" />
                          <Area type="monotone" dataKey="corretiva" name="Corretiva" stroke="hsl(38, 92%, 50%)" strokeWidth={2} fill="url(#corrGrad)" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Score IA por orçamento */}
                <Card className="border border-border/50 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">Score IA por Orçamento</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={mockPendencias.map(p => ({ name: p.placa, score: p.iaScore, valor: p.valor }))} barSize={32}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontFamily: 'monospace' }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} domain={[0, 100]} />
                          <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 12 }} />
                          <Bar dataKey="score" name="Score IA" radius={[6, 6, 0, 0]}>
                            {mockPendencias.map((p, i) => (
                              <Cell key={i} fill={auditoriaConfig[p.auditoria].barColor} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Gasto acumulado por veículo */}
              <Card className="border border-border/50 shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold">Gasto Acumulado por Veículo (Ranking Completo)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mockVeiculos.sort((a, b) => b.gastoTotal - a.gastoTotal).map(v => ({ placa: v.placa, gasto: v.gastoTotal, modelo: v.modelo }))} layout="vertical" barSize={18}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                        <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `R$ ${(v / 1000).toFixed(0)}k`} />
                        <YAxis type="category" dataKey="placa" axisLine={false} tickLine={false} tick={{ fontSize: 11, fontFamily: 'monospace' }} width={80} />
                        <Tooltip formatter={(value: number) => ['R$ ' + value.toLocaleString('pt-BR'), 'Gasto']} contentStyle={{ borderRadius: '8px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))', fontSize: 12 }} />
                        <Bar dataKey="gasto" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
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
              <p className="font-semibold text-foreground text-sm leading-none">NovaLink</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Gestor de Frota</p>
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
      <div className="min-h-screen bg-background flex">
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
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground relative">
                <Bell className="w-4 h-4" />
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 rounded-full text-[9px] text-white flex items-center justify-center font-bold">{orcamentosPendentes}</span>
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
  return <OficinaPortal onSwitchRole={() => setRole('select')} />;
};

export default GestaoFrotasOficinasSystem;
