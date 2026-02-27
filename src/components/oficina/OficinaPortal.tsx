import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Wrench, Plus, Camera, Trash2, DollarSign, Clock, CheckCircle2,
  FileText, Car, MessageCircle, ArrowLeft, AlertTriangle, Timer,
  Receipt, Wallet, Send, X, ChevronRight, Bell, Search,
  TrendingUp, BarChart3, PieChart, CalendarDays, Star, Users,
  Activity, Gauge, Target, ArrowUpRight, ArrowDownRight, Menu,
  LayoutDashboard, ClipboardList, UserCheck, Percent, ShieldCheck, Zap
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart as RechartsPie, Pie, Cell, Legend,
  RadialBarChart, RadialBar, ComposedChart
} from 'recharts';

// ─── Types ───
type OficinaView = 'home' | 'checkin' | 'orcamento' | 'patio' | 'finalizar' | 'financeiro';

interface OrcamentoItem {
  id: string;
  tipo: 'peca' | 'mao_de_obra';
  descricao: string;
  valor: number;
  statusIA: 'ok' | 'atencao' | 'alto' | null;
}

interface VeiculoPatio {
  id: string;
  placa: string;
  modelo: string;
  motorista: string;
  status: 'aguardando' | 'autorizado' | 'ajuste';
  valorTotal: number;
  horaEntrada: string;
}

interface Recebivel {
  id: string;
  placa: string;
  servico: string;
  valorBruto: number;
  valorLiquido: number;
  dataDeposito: string;
  status: 'depositado' | 'em_processo' | 'agendado';
}

// ─── Mock Data ───
const mockPatio: VeiculoPatio[] = [
  { id: '1', placa: 'ABC-1D23', modelo: 'Scania R450', motorista: 'Carlos Silva', status: 'aguardando', valorTotal: 4850, horaEntrada: '08:32' },
  { id: '2', placa: 'DEF-5G67', modelo: 'Volvo FH 540', motorista: 'João Pereira', status: 'autorizado', valorTotal: 3200, horaEntrada: '07:15' },
  { id: '3', placa: 'GHI-8J90', modelo: 'MB Actros 2651', motorista: 'Pedro Santos', status: 'ajuste', valorTotal: 12300, horaEntrada: '09:50' },
  { id: '4', placa: 'JKL-2M34', modelo: 'DAF XF 530', motorista: 'Marcos Lima', status: 'autorizado', valorTotal: 1890, horaEntrada: '10:05' },
  { id: '5', placa: 'MNO-3P56', modelo: 'Iveco S-Way', motorista: 'Roberto Alves', status: 'aguardando', valorTotal: 6700, horaEntrada: '11:20' },
  { id: '6', placa: 'PQR-7S89', modelo: 'Scania R500', motorista: 'André Costa', status: 'autorizado', valorTotal: 2450, horaEntrada: '06:45' },
];

const mockRecebiveis: Recebivel[] = [
  { id: '1', placa: 'DEF-5G67', servico: 'Troca de embreagem', valorBruto: 3200, valorLiquido: 2720, dataDeposito: '28/02/2026', status: 'em_processo' },
  { id: '2', placa: 'MNO-5P67', servico: 'Revisão completa', valorBruto: 5600, valorLiquido: 4760, dataDeposito: '28/02/2026', status: 'em_processo' },
  { id: '3', placa: 'PQR-9S01', servico: 'Troca de pastilhas', valorBruto: 1200, valorLiquido: 1020, dataDeposito: '27/02/2026', status: 'depositado' },
  { id: '4', placa: 'STU-3V45', servico: 'Alinhamento e balanceamento', valorBruto: 450, valorLiquido: 382.50, dataDeposito: '27/02/2026', status: 'depositado' },
  { id: '5', placa: 'VWX-6Y78', servico: 'Motor diesel - retífica', valorBruto: 18900, valorLiquido: 16065, dataDeposito: '01/03/2026', status: 'agendado' },
  { id: '6', placa: 'YZA-1B23', servico: 'Troca de turbo', valorBruto: 8500, valorLiquido: 7225, dataDeposito: '01/03/2026', status: 'agendado' },
  { id: '7', placa: 'BCD-4E56', servico: 'Revisão câmbio', valorBruto: 4200, valorLiquido: 3570, dataDeposito: '26/02/2026', status: 'depositado' },
  { id: '8', placa: 'EFG-7H89', servico: 'Suspensão pneumática', valorBruto: 6300, valorLiquido: 5355, dataDeposito: '25/02/2026', status: 'depositado' },
];

const mockHistorico = [
  { data: '15/01/2026', servico: 'Troca de óleo e filtros', km: 172000, oficina: 'Sua Oficina', valor: 850 },
  { data: '28/11/2025', servico: 'Substituição de pastilhas de freio', km: 165000, oficina: 'MecPlus', valor: 1200 },
  { data: '10/09/2025', servico: 'Revisão de suspensão', km: 155000, oficina: 'Sua Oficina', valor: 3400 },
  { data: '02/07/2025', servico: 'Troca correia dentada', km: 148000, oficina: 'Sua Oficina', valor: 2100 },
];

// ─── Chart Data ───
const faturamentoMensal = [
  { mes: 'Set', faturamento: 32500, servicos: 18, lucro: 27625 },
  { mes: 'Out', faturamento: 28200, servicos: 14, lucro: 23970 },
  { mes: 'Nov', faturamento: 45800, servicos: 22, lucro: 38930 },
  { mes: 'Dez', faturamento: 37100, servicos: 19, lucro: 31535 },
  { mes: 'Jan', faturamento: 51900, servicos: 25, lucro: 44115 },
  { mes: 'Fev', faturamento: 48700, servicos: 23, lucro: 41395 },
];

const faturamentoDiario = [
  { dia: '21', valor: 3200, servicos: 2 },
  { dia: '22', valor: 5100, servicos: 3 },
  { dia: '23', valor: 2800, servicos: 1 },
  { dia: '24', valor: 7400, servicos: 4 },
  { dia: '25', valor: 6300, servicos: 3 },
  { dia: '26', valor: 4200, servicos: 2 },
  { dia: '27', valor: 8900, servicos: 5 },
];

const servicosPorTipo = [
  { name: 'Motor', value: 35, color: 'hsl(var(--primary))' },
  { name: 'Freios', value: 25, color: 'hsl(142, 76%, 36%)' },
  { name: 'Suspensão', value: 20, color: 'hsl(43, 74%, 66%)' },
  { name: 'Elétrica', value: 12, color: 'hsl(346, 87%, 43%)' },
  { name: 'Outros', value: 8, color: 'hsl(215, 15%, 65%)' },
];

const avaliacaoSemanal = [
  { semana: 'Sem 1', nota: 4.2, atendimentos: 12 },
  { semana: 'Sem 2', nota: 4.5, atendimentos: 15 },
  { semana: 'Sem 3', nota: 4.8, atendimentos: 18 },
  { semana: 'Sem 4', nota: 4.6, atendimentos: 14 },
];

// ─── Pátio Chart Data ───
const patioStatusData = [
  { name: 'Aguardando', value: 2, color: 'hsl(43, 74%, 66%)' },
  { name: 'Autorizado', value: 3, color: 'hsl(142, 76%, 36%)' },
  { name: 'Ajuste', value: 1, color: 'hsl(346, 87%, 43%)' },
];

const patioTempoMedio = [
  { tipo: 'Motor', horas: 6.5 },
  { tipo: 'Freios', horas: 3.2 },
  { tipo: 'Suspensão', horas: 4.8 },
  { tipo: 'Elétrica', horas: 2.1 },
  { tipo: 'Câmbio', horas: 8.3 },
  { tipo: 'Revisão', horas: 5.0 },
];

const patioValorPorStatus = [
  { status: 'Aguardando', valor: 11550 },
  { status: 'Autorizado', valor: 7540 },
  { status: 'Ajuste', valor: 12300 },
];

const patioEntradaSemanal = [
  { dia: 'Seg', entradas: 4, saidas: 3 },
  { dia: 'Ter', entradas: 6, saidas: 5 },
  { dia: 'Qua', entradas: 3, saidas: 4 },
  { dia: 'Qui', entradas: 7, saidas: 6 },
  { dia: 'Sex', entradas: 5, saidas: 5 },
  { dia: 'Sáb', entradas: 2, saidas: 3 },
];

// ─── Clientes Chart Data ───
const clientesFaturamento = [
  { nome: 'TransLog', valor: 45200 },
  { nome: 'ExpressC.', valor: 38100 },
  { nome: 'RodoNorte', valor: 32800 },
  { nome: 'BrasLog', valor: 28500 },
  { nome: 'Veloz', valor: 21400 },
];

const clientesSatisfacao = [
  { mes: 'Set', nota: 4.1 },
  { mes: 'Out', nota: 4.3 },
  { mes: 'Nov', nota: 4.5 },
  { mes: 'Dez', nota: 4.4 },
  { mes: 'Jan', nota: 4.7 },
  { mes: 'Fev', nota: 4.8 },
];

const clientesTipoVeiculo = [
  { name: 'Scania', value: 28, color: 'hsl(var(--primary))' },
  { name: 'Volvo', value: 22, color: 'hsl(142, 76%, 36%)' },
  { name: 'MB', value: 20, color: 'hsl(43, 74%, 66%)' },
  { name: 'DAF', value: 15, color: 'hsl(346, 87%, 43%)' },
  { name: 'Iveco', value: 10, color: 'hsl(215, 15%, 65%)' },
  { name: 'Outros', value: 5, color: 'hsl(270, 50%, 60%)' },
];

const clientesVisitasMensal = [
  { mes: 'Set', novos: 3, recorrentes: 15 },
  { mes: 'Out', novos: 5, recorrentes: 12 },
  { mes: 'Nov', novos: 4, recorrentes: 18 },
  { mes: 'Dez', novos: 2, recorrentes: 17 },
  { mes: 'Jan', novos: 6, recorrentes: 19 },
  { mes: 'Fev', novos: 3, recorrentes: 20 },
];

// ─── Orçamento Chart Data ───
const orcamentoHistorico = [
  { mes: 'Set', aprovados: 14, recusados: 4, ajustados: 2 },
  { mes: 'Out', aprovados: 10, recusados: 3, ajustados: 1 },
  { mes: 'Nov', aprovados: 18, recusados: 3, ajustados: 3 },
  { mes: 'Dez', aprovados: 15, recusados: 2, ajustados: 2 },
  { mes: 'Jan', aprovados: 21, recusados: 2, ajustados: 2 },
  { mes: 'Fev', aprovados: 19, recusados: 3, ajustados: 1 },
];

const orcamentoValidacaoIA = [
  { name: 'Preço OK', value: 72, color: 'hsl(142, 76%, 36%)' },
  { name: 'Atenção', value: 20, color: 'hsl(43, 74%, 66%)' },
  { name: 'Alto', value: 8, color: 'hsl(346, 87%, 43%)' },
];

const orcamentoTicketPorCategoria = [
  { categoria: 'Motor', ticket: 4500 },
  { categoria: 'Freios', ticket: 1800 },
  { categoria: 'Suspensão', ticket: 3200 },
  { categoria: 'Elétrica', ticket: 1200 },
  { categoria: 'Câmbio', ticket: 5800 },
  { categoria: 'Revisão', ticket: 2400 },
];

const orcamentoConversao = [
  { mes: 'Set', taxa: 70 },
  { mes: 'Out', taxa: 71 },
  { mes: 'Nov', taxa: 75 },
  { mes: 'Dez', taxa: 79 },
  { mes: 'Jan', taxa: 84 },
  { mes: 'Fev', taxa: 83 },
];

// ─── Financeiro Extra Data ───
const recebiveisTimeline = [
  { data: '22/02', depositado: 4200, pendente: 0 },
  { data: '23/02', depositado: 3800, pendente: 0 },
  { data: '24/02', depositado: 5100, pendente: 0 },
  { data: '25/02', depositado: 5355, pendente: 0 },
  { data: '26/02', depositado: 3570, pendente: 0 },
  { data: '27/02', depositado: 1402, pendente: 7480 },
  { data: '28/02', depositado: 0, pendente: 7480 },
  { data: '01/03', depositado: 0, pendente: 23290 },
];

const recebivelPorTipo = [
  { name: 'Depositado', value: 10327.5, color: 'hsl(142, 76%, 36%)' },
  { name: 'Em Processo', value: 7480, color: 'hsl(43, 74%, 66%)' },
  { name: 'Agendado', value: 23290, color: 'hsl(215, 15%, 65%)' },
];

// ─── Status Config ───
const statusConfig = {
  aguardando: { label: 'Aguardando Aprovação', color: 'bg-amber-500', textColor: 'text-amber-700 dark:text-amber-300', bgLight: 'bg-amber-50 dark:bg-amber-500/10', icon: Clock },
  autorizado: { label: 'Serviço Autorizado', color: 'bg-emerald-500', textColor: 'text-emerald-700 dark:text-emerald-300', bgLight: 'bg-emerald-50 dark:bg-emerald-500/10', icon: CheckCircle2 },
  ajuste: { label: 'Ajuste Solicitado', color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-300', bgLight: 'bg-red-50 dark:bg-red-500/10', icon: AlertTriangle },
};

const tooltipStyle = { borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' };

export function OficinaPortal({ onSwitchRole }: { onSwitchRole: () => void }) {
  const [view, setView] = useState<OficinaView>('home');
  const [placaInput, setPlacaInput] = useState('');
  const [veiculoCarregado, setVeiculoCarregado] = useState(false);
  const [orcamentoItems, setOrcamentoItems] = useState<OrcamentoItem[]>([]);
  const [novoItemDesc, setNovoItemDesc] = useState('');
  const [novoItemValor, setNovoItemValor] = useState('');
  const [novoItemTipo, setNovoItemTipo] = useState<'peca' | 'mao_de_obra'>('peca');
  const [fotos, setFotos] = useState<string[]>([]);
  const [finalizarDialog, setFinalizarDialog] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState<VeiculoPatio | null>(null);
  const [financeiroTab, setFinanceiroTab] = useState('resumo');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fotoServicoRef = useRef<HTMLInputElement>(null);
  const isMobile = useIsMobile();

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const buscarPlaca = () => {
    if (placaInput.length >= 7) setVeiculoCarregado(true);
  };

  const addItem = () => {
    if (!novoItemDesc || !novoItemValor) return;
    const valor = parseFloat(novoItemValor.replace(',', '.'));
    if (isNaN(valor)) return;
    let statusIA: 'ok' | 'atencao' | 'alto' | null = 'ok';
    if (valor > 3000) statusIA = 'atencao';
    if (valor > 8000) statusIA = 'alto';
    setOrcamentoItems(prev => [...prev, { id: Date.now().toString(), tipo: novoItemTipo, descricao: novoItemDesc, valor, statusIA }]);
    setNovoItemDesc('');
    setNovoItemValor('');
  };

  const removeItem = (id: string) => setOrcamentoItems(prev => prev.filter(i => i.id !== id));
  const totalOrcamento = orcamentoItems.reduce((s, i) => s + i.valor, 0);

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => { if (reader.result) setFotos(prev => [...prev, reader.result as string]); };
      reader.readAsDataURL(file);
    });
  };

  // ─── KPIs ───
  const totalReceberHoje = mockRecebiveis.filter(r => r.status === 'em_processo').reduce((s, r) => s + r.valorLiquido, 0);
  const totalRecebido = mockRecebiveis.filter(r => r.status === 'depositado').reduce((s, r) => s + r.valorLiquido, 0);
  const totalAgendado = mockRecebiveis.filter(r => r.status === 'agendado').reduce((s, r) => s + r.valorLiquido, 0);
  const servicosAtivos = mockPatio.filter(v => v.status === 'autorizado').length;
  const aguardando = mockPatio.filter(v => v.status === 'aguardando').length;
  const faturamentoTotal = faturamentoMensal.reduce((s, m) => s + m.faturamento, 0);
  const servicosTotais = faturamentoMensal.reduce((s, m) => s + m.servicos, 0);
  const ticketMedio = faturamentoTotal / servicosTotais;

  // ─── Sidebar Nav Items ───
  const navItems: { value: OficinaView; label: string; icon: React.ReactNode; badge?: string }[] = [
    { value: 'home', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { value: 'checkin', label: 'Novo Atendimento', icon: <Plus className="w-5 h-5" /> },
    { value: 'orcamento', label: 'Orçamentos', icon: <ClipboardList className="w-5 h-5" />, badge: '3' },
    { value: 'patio', label: 'Pátio Digital', icon: <Car className="w-5 h-5" />, badge: String(mockPatio.length) },
    { value: 'financeiro', label: 'Financeiro', icon: <Wallet className="w-5 h-5" /> },
    { value: 'finalizar', label: 'Clientes', icon: <Users className="w-5 h-5" />, badge: '48' },
  ];

  const navigateTo = (v: OficinaView) => {
    setView(v);
    setSidebarOpen(false);
  };

  const viewTitle: Record<OficinaView, string> = {
    home: 'Painel da Oficina',
    checkin: 'Novo Atendimento',
    orcamento: 'Orçamentos',
    patio: 'Pátio Digital',
    finalizar: 'Clientes',
    financeiro: 'Financeiro',
  };

  // ─── Sidebar Content ───
  const SidebarNav = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <Wrench className="w-5 h-5 text-emerald-500" />
          </div>
          <div>
            <p className="font-bold text-foreground text-sm">Portal Oficina</p>
            <p className="text-xs text-muted-foreground">NovaLink</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <button key={item.value} onClick={() => navigateTo(item.value)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all active:scale-[0.98] ${
              view === item.value ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}>
            {item.icon}
            <span className="flex-1 text-left">{item.label}</span>
            {item.badge && <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">{item.badge}</Badge>}
          </button>
        ))}
      </nav>
      <div className="p-3 border-t border-border">
        <button onClick={onSwitchRole} className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-all">
          <UserCheck className="w-5 h-5" /><span>Trocar Perfil</span>
        </button>
      </div>
    </div>
  );

  // ─── Content renderer ───
  const renderContent = () => {
    // ══ HOME ══
    if (view === 'home') {
      return (
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-0 shadow-md"><CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center"><DollarSign className="w-4 h-4 text-emerald-500" /></div>
                <span className="text-xs text-muted-foreground">A Receber (D+1)</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalReceberHoje)}</p>
              <div className="flex items-center gap-1 mt-1"><ArrowUpRight className="w-3 h-3 text-emerald-500" /><span className="text-xs text-emerald-500 font-medium">+18% vs ontem</span></div>
            </CardContent></Card>
            <Card className="border-0 shadow-md"><CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center"><Activity className="w-4 h-4 text-primary" /></div>
                <span className="text-xs text-muted-foreground">Serviços Ativos</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{servicosAtivos}</p>
              <p className="text-xs text-muted-foreground mt-1">{aguardando} aguardando aprovação</p>
            </CardContent></Card>
            <Card className="border-0 shadow-md"><CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center"><Target className="w-4 h-4 text-amber-500" /></div>
                <span className="text-xs text-muted-foreground">Ticket Médio</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">{fmt(ticketMedio)}</p>
              <div className="flex items-center gap-1 mt-1"><ArrowUpRight className="w-3 h-3 text-emerald-500" /><span className="text-xs text-emerald-500 font-medium">+5% este mês</span></div>
            </CardContent></Card>
            <Card className="border-0 shadow-md"><CardContent className="p-4 sm:p-5">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-9 h-9 rounded-xl bg-yellow-500/10 flex items-center justify-center"><Star className="w-4 h-4 text-yellow-500" /></div>
                <span className="text-xs text-muted-foreground">Avaliação</span>
              </div>
              <p className="text-2xl sm:text-3xl font-bold text-foreground">4.8 <span className="text-sm font-normal text-muted-foreground">/ 5.0</span></p>
              <p className="text-xs text-muted-foreground mt-1">121 avaliações</p>
            </CardContent></Card>
          </div>

          <button onClick={() => setView('checkin')} className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 active:scale-[0.99] text-white rounded-2xl p-6 sm:p-8 flex items-center justify-center gap-4 shadow-lg hover:shadow-xl transition-all duration-200">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/20 flex items-center justify-center"><Plus className="w-10 h-10 sm:w-12 sm:h-12" /></div>
            <div className="text-left">
              <p className="text-2xl sm:text-3xl font-bold">Novo Atendimento</p>
              <p className="text-sm sm:text-base text-emerald-100">Escanear placa ou digitar CPF/CNPJ</p>
            </div>
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" />Faturamento — Últimos 7 Dias</CardTitle></CardHeader>
              <CardContent><div className="h-52 sm:h-64"><ResponsiveContainer width="100%" height="100%">
                <AreaChart data={faturamentoDiario}>
                  <defs><linearGradient id="colorFat" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} className="text-xs" />
                  <YAxis axisLine={false} tickLine={false} className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [fmt(value), 'Faturamento']} contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="valor" stroke="hsl(142, 76%, 36%)" fillOpacity={1} fill="url(#colorFat)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer></div></CardContent>
            </Card>

            <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><PieChart className="w-4 h-4 text-primary" />Serviços por Categoria</CardTitle></CardHeader>
              <CardContent><div className="flex items-center gap-4"><div className="h-52 sm:h-64 flex-1"><ResponsiveContainer width="100%" height="100%">
                <RechartsPie><Pie data={servicosPorTipo} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={4} dataKey="value">
                  {servicosPorTipo.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie><Tooltip formatter={(value: number) => [`${value}%`, '']} contentStyle={tooltipStyle} /></RechartsPie>
              </ResponsiveContainer></div>
              <div className="space-y-2 shrink-0">{servicosPorTipo.map((item, i) => (
                <div key={i} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} /><span className="text-xs text-muted-foreground">{item.name}</span><span className="text-xs font-bold text-foreground">{item.value}%</span></div>
              ))}</div></div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="grid grid-cols-2 gap-3 lg:col-span-1">
              <button onClick={() => setView('patio')} className="bg-card rounded-2xl p-5 border shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left"><Car className="w-7 h-7 text-primary mb-2" /><p className="font-semibold text-foreground text-sm">Pátio Digital</p><p className="text-xs text-muted-foreground mt-1">{mockPatio.length} veículos</p></button>
              <button onClick={() => setView('financeiro')} className="bg-card rounded-2xl p-5 border shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left"><Wallet className="w-7 h-7 text-emerald-500 mb-2" /><p className="font-semibold text-foreground text-sm">Recebíveis</p><p className="text-xs text-muted-foreground mt-1">{fmt(totalRecebido)} recebidos</p></button>
              <button onClick={() => setView('orcamento')} className="bg-card rounded-2xl p-5 border shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left"><FileText className="w-7 h-7 text-amber-500 mb-2" /><p className="font-semibold text-foreground text-sm">Orçamentos</p><p className="text-xs text-muted-foreground mt-1">3 pendentes</p></button>
              <button onClick={() => setView('finalizar')} className="bg-card rounded-2xl p-5 border shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left"><Users className="w-7 h-7 text-purple-500 mb-2" /><p className="font-semibold text-foreground text-sm">Clientes</p><p className="text-xs text-muted-foreground mt-1">48 frotas</p></button>
            </div>
            <Card className="border-0 shadow-md lg:col-span-2"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-muted-foreground" />Faturamento vs Lucro Mensal</CardTitle></CardHeader>
              <CardContent><div className="h-52 sm:h-64"><ResponsiveContainer width="100%" height="100%">
                <BarChart data={faturamentoMensal} barSize={20} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} className="text-xs" />
                  <YAxis axisLine={false} tickLine={false} className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [fmt(value), '']} contentStyle={tooltipStyle} />
                  <Bar dataKey="faturamento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Bruto" />
                  <Bar dataKey="lucro" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} name="Líquido (85%)" />
                </BarChart>
              </ResponsiveContainer></div>
              <div className="flex items-center justify-center gap-6 mt-2">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary" /><span className="text-xs text-muted-foreground">Bruto</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} /><span className="text-xs text-muted-foreground">Líquido (85%)</span></div>
              </div></CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" />Evolução da Avaliação</CardTitle></CardHeader>
              <CardContent><div className="h-48"><ResponsiveContainer width="100%" height="100%">
                <LineChart data={avaliacaoSemanal}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="semana" axisLine={false} tickLine={false} className="text-xs" />
                  <YAxis domain={[3, 5]} axisLine={false} tickLine={false} className="text-xs" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="nota" stroke="hsl(43, 74%, 66%)" strokeWidth={3} dot={{ r: 5, fill: 'hsl(43, 74%, 66%)' }} name="Nota" />
                  <Line type="monotone" dataKey="atendimentos" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} name="Atendimentos" />
                </LineChart>
              </ResponsiveContainer></div></CardContent>
            </Card>

            <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Bell className="w-4 h-4 text-emerald-500" />Serviços Aprovados — Iniciar Agora!</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {mockPatio.filter(v => v.status === 'autorizado').map(v => (
                  <button key={v.id} onClick={() => { setSelectedVeiculo(v); setView('patio'); }} className="w-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 flex items-center gap-3 active:scale-[0.98] transition-all">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                    <div className="text-left flex-1 min-w-0"><p className="font-mono font-bold text-foreground">{v.placa}</p><p className="text-xs text-muted-foreground truncate">{v.modelo} · {v.motorista}</p></div>
                    <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmt(v.valorTotal)}</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </button>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    // ══ CHECK-IN ══
    if (view === 'checkin') {
      return (
        <div className="p-4 sm:p-6 space-y-5 max-w-2xl mx-auto">
          <p className="text-sm text-muted-foreground">Identifique o veículo para iniciar</p>
          <button className="w-full bg-muted/50 hover:bg-muted border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center gap-3 active:scale-[0.98] transition-all">
            <Camera className="w-10 h-10 text-muted-foreground" />
            <div className="text-center"><p className="font-semibold text-foreground">Escanear Placa</p><p className="text-xs text-muted-foreground">Aponte a câmera para a placa do veículo</p></div>
          </button>
          <div className="flex items-center gap-2"><Separator className="flex-1" /><span className="text-xs text-muted-foreground">ou digite</span><Separator className="flex-1" /></div>
          <div className="flex gap-2">
            <Input placeholder="Placa (ABC-1D23) ou CPF/CNPJ" value={placaInput} onChange={(e) => setPlacaInput(e.target.value.toUpperCase())} className="h-14 text-lg font-mono text-center tracking-wider" />
            <Button onClick={buscarPlaca} className="h-14 px-6 bg-emerald-500 hover:bg-emerald-600 text-white"><Search className="w-5 h-5" /></Button>
          </div>
          {veiculoCarregado && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5"><CardContent className="p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center"><Car className="w-6 h-6 text-emerald-500" /></div>
                  <div><p className="font-mono text-xl font-bold text-foreground">{placaInput || 'ABC-1D23'}</p><p className="text-sm text-muted-foreground">Scania R450 · 2022 · 185.000 km</p></div>
                </div>
                <p className="text-xs text-muted-foreground">Motorista: Carlos Silva · Frota: TransLog Ltda</p>
              </CardContent></Card>
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><FileText className="w-4 h-4 text-muted-foreground" />Histórico de Serviços</h3>
                {mockHistorico.map((h, i) => (
                  <div key={i} className="bg-card rounded-xl p-3 border flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{h.servico}</p><p className="text-xs text-muted-foreground">{h.data} · {h.km.toLocaleString()} km · {h.oficina}</p></div>
                    <span className="text-sm font-semibold text-foreground shrink-0">{fmt(h.valor)}</span>
                  </div>
                ))}
              </div>
              <Button onClick={() => setView('orcamento')} className="w-full h-14 text-lg bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md gap-2"><FileText className="w-5 h-5" /> Elaborar Orçamento</Button>
            </div>
          )}
        </div>
      );
    }

    // ══ ORÇAMENTO ══
    if (view === 'orcamento') {
      return (
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto pb-32">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-0 shadow-md"><CardContent className="p-4 text-center">
              <FileText className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">Orçamentos este mês</p>
              <p className="text-2xl font-bold text-foreground">23</p>
            </CardContent></Card>
            <Card className="border-0 shadow-md"><CardContent className="p-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">Taxa de Aprovação</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">83%</p>
            </CardContent></Card>
            <Card className="border-0 shadow-md"><CardContent className="p-4 text-center">
              <ShieldCheck className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">Validação IA</p>
              <p className="text-2xl font-bold text-foreground">72% OK</p>
            </CardContent></Card>
            <Card className="border-0 shadow-md"><CardContent className="p-4 text-center">
              <Target className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">Ticket Médio</p>
              <p className="text-2xl font-bold text-foreground">{fmt(ticketMedio)}</p>
            </CardContent></Card>
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-muted-foreground" />Histórico de Aprovações</CardTitle></CardHeader>
              <CardContent><div className="h-56"><ResponsiveContainer width="100%" height="100%">
                <BarChart data={orcamentoHistorico} barSize={14} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} className="text-xs" />
                  <YAxis axisLine={false} tickLine={false} className="text-xs" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="aprovados" fill="hsl(142, 76%, 36%)" radius={[3, 3, 0, 0]} name="Aprovados" />
                  <Bar dataKey="ajustados" fill="hsl(43, 74%, 66%)" radius={[3, 3, 0, 0]} name="Ajustados" />
                  <Bar dataKey="recusados" fill="hsl(346, 87%, 43%)" radius={[3, 3, 0, 0]} name="Recusados" />
                </BarChart>
              </ResponsiveContainer></div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} /><span className="text-xs text-muted-foreground">Aprovados</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(43, 74%, 66%)' }} /><span className="text-xs text-muted-foreground">Ajustados</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(346, 87%, 43%)' }} /><span className="text-xs text-muted-foreground">Recusados</span></div>
              </div></CardContent>
            </Card>

            <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-emerald-500" />Validação IA — Distribuição</CardTitle></CardHeader>
              <CardContent><div className="flex items-center gap-4"><div className="h-56 flex-1"><ResponsiveContainer width="100%" height="100%">
                <RechartsPie><Pie data={orcamentoValidacaoIA} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                  {orcamentoValidacaoIA.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie><Tooltip formatter={(value: number) => [`${value}%`, '']} contentStyle={tooltipStyle} /></RechartsPie>
              </ResponsiveContainer></div>
              <div className="space-y-3 shrink-0">{orcamentoValidacaoIA.map((item, i) => (
                <div key={i} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-xs text-muted-foreground">{item.name}</span><span className="text-xs font-bold text-foreground">{item.value}%</span></div>
              ))}</div></div></CardContent>
            </Card>

            <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Target className="w-4 h-4 text-amber-500" />Ticket Médio por Categoria</CardTitle></CardHeader>
              <CardContent><div className="h-56"><ResponsiveContainer width="100%" height="100%">
                <BarChart data={orcamentoTicketPorCategoria} layout="vertical" barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" axisLine={false} tickLine={false} className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                  <YAxis type="category" dataKey="categoria" axisLine={false} tickLine={false} className="text-xs" width={70} />
                  <Tooltip formatter={(value: number) => [fmt(value), 'Ticket Médio']} contentStyle={tooltipStyle} />
                  <Bar dataKey="ticket" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer></div></CardContent>
            </Card>

            <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" />Taxa de Conversão (%)</CardTitle></CardHeader>
              <CardContent><div className="h-56"><ResponsiveContainer width="100%" height="100%">
                <AreaChart data={orcamentoConversao}>
                  <defs><linearGradient id="colorConv" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} className="text-xs" />
                  <YAxis domain={[60, 100]} axisLine={false} tickLine={false} className="text-xs" tickFormatter={(v) => `${v}%`} />
                  <Tooltip formatter={(value: number) => [`${value}%`, 'Conversão']} contentStyle={tooltipStyle} />
                  <Area type="monotone" dataKey="taxa" stroke="hsl(142, 76%, 36%)" fillOpacity={1} fill="url(#colorConv)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer></div></CardContent>
            </Card>
          </div>

          {/* Novo Orçamento Form */}
          <Card className="border-0 shadow-md"><CardHeader><CardTitle className="text-base font-semibold flex items-center gap-2"><Plus className="w-5 h-5 text-emerald-500" />Novo Orçamento</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 bg-muted/50 rounded-xl p-3">
                    <Car className="w-5 h-5 text-muted-foreground" />
                    <div><p className="font-mono font-bold text-foreground">{placaInput || 'ABC-1D23'}</p><p className="text-xs text-muted-foreground">Scania R450 · 185.000 km</p></div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setNovoItemTipo('peca')} className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${novoItemTipo === 'peca' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>🔩 Peça</button>
                    <button onClick={() => setNovoItemTipo('mao_de_obra')} className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${novoItemTipo === 'mao_de_obra' ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>🛠️ Mão de Obra</button>
                  </div>
                  <Input placeholder={novoItemTipo === 'peca' ? 'Ex: Filtro de óleo Mann W940' : 'Ex: Troca de embreagem'} value={novoItemDesc} onChange={(e) => setNovoItemDesc(e.target.value)} className="h-12" />
                  <div className="flex gap-2">
                    <div className="relative flex-1"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                      <Input placeholder="0,00" value={novoItemValor} onChange={(e) => setNovoItemValor(e.target.value)} className="h-12 pl-10 text-lg font-mono" /></div>
                    <Button onClick={addItem} className="h-12 px-6 bg-emerald-500 hover:bg-emerald-600 text-white"><Plus className="w-5 h-5" /></Button>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Camera className="w-4 h-4 text-muted-foreground" />Fotos</h3>
                    <div className="flex flex-wrap gap-2">
                      {fotos.map((f, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border bg-muted"><img src={f} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" /><button onClick={() => setFotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"><X className="w-3 h-3 text-white" /></button></div>
                      ))}
                      <button onClick={() => fileInputRef.current?.click()} className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"><Camera className="w-5 h-5 text-muted-foreground" /><span className="text-[10px] text-muted-foreground">Adicionar</span></button>
                      <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFoto} />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold text-foreground">Itens ({orcamentoItems.length})</h3>
                  {orcamentoItems.length === 0 && <div className="bg-muted/50 rounded-xl p-8 text-center"><FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" /><p className="text-sm text-muted-foreground">Adicione peças e mão de obra</p></div>}
                  {orcamentoItems.map((item) => (
                    <div key={item.id} className="bg-card rounded-xl p-3 border flex items-center gap-3">
                      <span className="text-lg">{item.tipo === 'peca' ? '🔩' : '🛠️'}</span>
                      <div className="flex-1 min-w-0"><p className="text-sm font-medium text-foreground truncate">{item.descricao}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {item.statusIA === 'ok' && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Preço OK</span>}
                          {item.statusIA === 'atencao' && <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">⚠ Atenção</span>}
                          {item.statusIA === 'alto' && <span className="text-xs text-red-600 dark:text-red-400 font-medium">✗ Alto</span>}
                        </div>
                      </div>
                      <span className="text-sm font-bold text-foreground">{fmt(item.valor)}</span>
                      <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-red-500 active:scale-90 transition-all"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                  {orcamentoItems.length > 0 && (
                    <div className="space-y-3 pt-3 border-t border-border">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total</span><span className="text-xl font-bold text-foreground">{fmt(totalOrcamento)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Comissão NovaLink (15%)</span><span className="text-red-500">-{fmt(totalOrcamento * 0.15)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Você recebe</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalOrcamento * 0.85)}</span></div>
                      <Button className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-bold rounded-xl shadow-lg gap-2"><Send className="w-5 h-5" /> Enviar para Aprovação</Button>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }

    // ══ PÁTIO DIGITAL ══
    if (view === 'patio') {
      return (
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-0 shadow-md"><CardContent className="p-4 text-center">
              <Car className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">Veículos no Pátio</p>
              <p className="text-2xl font-bold text-foreground">{mockPatio.length}</p>
            </CardContent></Card>
            <Card className="border-0 shadow-md"><CardContent className="p-4 text-center">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">Autorizados</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{mockPatio.filter(v => v.status === 'autorizado').length}</p>
            </CardContent></Card>
            <Card className="border-0 shadow-md"><CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 text-amber-500 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">Aguardando</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{mockPatio.filter(v => v.status === 'aguardando').length}</p>
            </CardContent></Card>
            <Card className="border-0 shadow-md"><CardContent className="p-4 text-center">
              <DollarSign className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-xs text-muted-foreground mb-1">Valor Total</p>
              <p className="text-2xl font-bold text-foreground">{fmt(mockPatio.reduce((s, v) => s + v.valorTotal, 0))}</p>
            </CardContent></Card>
          </div>

          {/* Pátio Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><PieChart className="w-4 h-4 text-primary" />Distribuição por Status</CardTitle></CardHeader>
              <CardContent><div className="flex items-center gap-4"><div className="h-48 flex-1"><ResponsiveContainer width="100%" height="100%">
                <RechartsPie><Pie data={patioStatusData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={4} dataKey="value">
                  {patioStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie><Tooltip contentStyle={tooltipStyle} /></RechartsPie>
              </ResponsiveContainer></div>
              <div className="space-y-2 shrink-0">{patioStatusData.map((item, i) => (
                <div key={i} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-xs text-muted-foreground">{item.name}</span><span className="text-xs font-bold text-foreground">{item.value}</span></div>
              ))}</div></div></CardContent>
            </Card>

            <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500" />Valor por Status</CardTitle></CardHeader>
              <CardContent><div className="h-48"><ResponsiveContainer width="100%" height="100%">
                <BarChart data={patioValorPorStatus} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="status" axisLine={false} tickLine={false} className="text-xs" />
                  <YAxis axisLine={false} tickLine={false} className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => [fmt(value), 'Valor']} contentStyle={tooltipStyle} />
                  <Bar dataKey="valor" radius={[6, 6, 0, 0]}>
                    <Cell fill="hsl(43, 74%, 66%)" />
                    <Cell fill="hsl(142, 76%, 36%)" />
                    <Cell fill="hsl(346, 87%, 43%)" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer></div></CardContent>
            </Card>

            <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-primary" />Entrada/Saída Semanal</CardTitle></CardHeader>
              <CardContent><div className="h-48"><ResponsiveContainer width="100%" height="100%">
                <BarChart data={patioEntradaSemanal} barSize={12} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} className="text-xs" />
                  <YAxis axisLine={false} tickLine={false} className="text-xs" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="entradas" fill="hsl(142, 76%, 36%)" radius={[3, 3, 0, 0]} name="Entradas" />
                  <Bar dataKey="saidas" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Saídas" />
                </BarChart>
              </ResponsiveContainer></div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} /><span className="text-xs text-muted-foreground">Entradas</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-primary" /><span className="text-xs text-muted-foreground">Saídas</span></div>
              </div></CardContent>
            </Card>
          </div>

          {/* Tempo Médio chart */}
          <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Timer className="w-4 h-4 text-amber-500" />Tempo Médio por Tipo de Serviço (horas)</CardTitle></CardHeader>
            <CardContent><div className="h-56"><ResponsiveContainer width="100%" height="100%">
              <BarChart data={patioTempoMedio} layout="vertical" barSize={16}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                <XAxis type="number" axisLine={false} tickLine={false} className="text-xs" tickFormatter={(v) => `${v}h`} />
                <YAxis type="category" dataKey="tipo" axisLine={false} tickLine={false} className="text-xs" width={70} />
                <Tooltip formatter={(value: number) => [`${value}h`, 'Tempo Médio']} contentStyle={tooltipStyle} />
                <Bar dataKey="horas" fill="hsl(43, 74%, 66%)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer></div></CardContent>
          </Card>

          {/* Vehicle Cards */}
          <h3 className="text-base font-semibold text-foreground">Veículos no Pátio</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockPatio.map(v => {
              const cfg = statusConfig[v.status];
              const StatusIcon = cfg.icon;
              return (
                <Card key={v.id} className="border-0 shadow-md overflow-hidden">
                  <div className={`${cfg.color} h-1.5`} />
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl ${cfg.bgLight} flex items-center justify-center`}><StatusIcon className={`w-5 h-5 ${cfg.textColor}`} /></div>
                        <div><p className="font-mono text-lg font-bold text-foreground">{v.placa}</p><p className="text-xs text-muted-foreground">{v.modelo}</p></div>
                      </div>
                      <span className="text-lg font-bold text-foreground">{fmt(v.valorTotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>🚛 {v.motorista}</span><span>⏰ {v.horaEntrada}</span>
                    </div>
                    <Badge className={`${cfg.bgLight} ${cfg.textColor} border-0 text-xs`}>{cfg.label}</Badge>
                    {v.status === 'autorizado' && <Button onClick={() => { setSelectedVeiculo(v); setFinalizarDialog(true); }} className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl gap-2"><CheckCircle2 className="w-4 h-4" /> Finalizar Serviço</Button>}
                    {v.status === 'ajuste' && <Button onClick={() => setView('orcamento')} className="w-full h-11 font-bold rounded-xl gap-2" variant="outline"><FileText className="w-4 h-4" /> Revisar Orçamento</Button>}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Dialog open={finalizarDialog} onOpenChange={setFinalizarDialog}>
            <DialogContent className="max-w-md mx-auto"><DialogHeader><DialogTitle className="flex items-center gap-2"><CheckCircle2 className="w-5 h-5 text-emerald-500" />Finalizar Serviço</DialogTitle></DialogHeader>
              {selectedVeiculo && (
                <div className="space-y-4 mt-2">
                  <div className="bg-muted rounded-xl p-3 flex items-center gap-3"><Car className="w-5 h-5 text-muted-foreground" /><div><p className="font-mono font-bold text-foreground">{selectedVeiculo.placa}</p><p className="text-xs text-muted-foreground">{selectedVeiculo.modelo}</p></div></div>
                  <div><p className="text-sm font-medium text-foreground mb-2">Foto do serviço concluído</p>
                    <button onClick={() => fotoServicoRef.current?.click()} className="w-full border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 hover:border-primary/50 active:scale-[0.98] transition-all"><Camera className="w-8 h-8 text-muted-foreground" /><span className="text-sm text-muted-foreground">Tirar foto ou selecionar</span></button>
                    <input ref={fotoServicoRef} type="file" accept="image/*" capture="environment" className="hidden" /></div>
                  <Separator />
                  <div className="space-y-2"><p className="text-sm font-medium text-foreground">Resumo Financeiro</p>
                    <div className="bg-muted rounded-xl p-4 space-y-2">
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Valor do serviço</span><span className="font-bold text-foreground">{fmt(selectedVeiculo.valorTotal)}</span></div>
                      <div className="flex justify-between text-sm"><span className="text-muted-foreground">Comissão NovaLink (15%)</span><span className="text-red-500 font-medium">-{fmt(selectedVeiculo.valorTotal * 0.15)}</span></div>
                      <Separator />
                      <div className="flex justify-between"><span className="font-semibold text-foreground">Você recebe</span><span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(selectedVeiculo.valorTotal * 0.85)}</span></div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground"><Timer className="w-3.5 h-3.5" /><span>Depósito em até 24 horas (D+1)</span></div>
                    </div>
                  </div>
                  <Button onClick={() => setFinalizarDialog(false)} className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-bold rounded-xl shadow-lg gap-2"><CheckCircle2 className="w-5 h-5" /> Confirmar Finalização</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      );
    }

    // ══ FINANCEIRO ══
    if (view === 'financeiro') {
      const depositos = mockRecebiveis.filter(r => r.status === 'depositado');
      const emProcesso = mockRecebiveis.filter(r => r.status === 'em_processo');
      const agendados = mockRecebiveis.filter(r => r.status === 'agendado');
      const fluxoCaixaData = [
        { dia: 'Seg', entrada: 4200, saida: 1800 },
        { dia: 'Ter', entrada: 6300, saida: 2100 },
        { dia: 'Qua', entrada: 3800, saida: 1500 },
        { dia: 'Qui', entrada: 7100, saida: 2800 },
        { dia: 'Sex', entrada: 8900, saida: 3200 },
        { dia: 'Sáb', entrada: 5400, saida: 1900 },
      ];

      return (
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-0 shadow-md bg-emerald-50 dark:bg-emerald-500/5"><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><span className="text-xs text-muted-foreground">Recebido</span></div>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalRecebido)}</p>
            </CardContent></Card>
            <Card className="border-0 shadow-md bg-amber-50 dark:bg-amber-500/5"><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2"><Timer className="w-4 h-4 text-amber-500" /><span className="text-xs text-muted-foreground">Em D+1</span></div>
              <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{fmt(totalReceberHoje)}</p>
            </CardContent></Card>
            <Card className="border-0 shadow-md"><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2"><CalendarDays className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Agendado</span></div>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{fmt(totalAgendado)}</p>
            </CardContent></Card>
            <Card className="border-0 shadow-md"><CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2"><Wallet className="w-4 h-4 text-primary" /><span className="text-xs text-muted-foreground">Total Geral</span></div>
              <p className="text-xl sm:text-2xl font-bold text-foreground">{fmt(totalRecebido + totalReceberHoje + totalAgendado)}</p>
            </CardContent></Card>
          </div>

          <Tabs value={financeiroTab} onValueChange={setFinanceiroTab}>
            <TabsList className="bg-card border shadow-sm w-full justify-start overflow-x-auto">
              <TabsTrigger value="resumo" className="gap-1.5"><BarChart3 className="w-4 h-4" /> Resumo</TabsTrigger>
              <TabsTrigger value="recebiveis" className="gap-1.5"><Receipt className="w-4 h-4" /> Recebíveis</TabsTrigger>
              <TabsTrigger value="fluxo" className="gap-1.5"><TrendingUp className="w-4 h-4" /> Fluxo de Caixa</TabsTrigger>
            </TabsList>

            <TabsContent value="resumo" className="mt-4 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4 text-muted-foreground" />Faturamento vs Lucro Mensal</CardTitle></CardHeader>
                  <CardContent><div className="h-56 sm:h-64"><ResponsiveContainer width="100%" height="100%">
                    <BarChart data={faturamentoMensal} barSize={18} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" axisLine={false} tickLine={false} className="text-xs" />
                      <YAxis axisLine={false} tickLine={false} className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => [fmt(value), '']} contentStyle={tooltipStyle} />
                      <Bar dataKey="faturamento" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Bruto" />
                      <Bar dataKey="lucro" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} name="Líquido" />
                    </BarChart>
                  </ResponsiveContainer></div>
                  <div className="flex items-center justify-center gap-6 mt-2">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-primary" /><span className="text-xs text-muted-foreground">Bruto</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} /><span className="text-xs text-muted-foreground">Líquido (85%)</span></div>
                  </div></CardContent>
                </Card>

                <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Activity className="w-4 h-4 text-muted-foreground" />Volume de Serviços</CardTitle></CardHeader>
                  <CardContent><div className="h-56 sm:h-64"><ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={faturamentoMensal}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="mes" axisLine={false} tickLine={false} className="text-xs" />
                      <YAxis yAxisId="left" axisLine={false} tickLine={false} className="text-xs" />
                      <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar yAxisId="left" dataKey="servicos" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Serviços" barSize={24} />
                      <Line yAxisId="right" type="monotone" dataKey="faturamento" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 4, fill: 'hsl(142, 76%, 36%)' }} name="Faturamento" />
                    </ComposedChart>
                  </ResponsiveContainer></div></CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <Card className="border-0 shadow-md"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Serviços este mês</p><p className="text-2xl font-bold text-foreground">23</p></CardContent></Card>
                <Card className="border-0 shadow-md"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Ticket Médio</p><p className="text-2xl font-bold text-foreground">{fmt(ticketMedio)}</p></CardContent></Card>
                <Card className="border-0 shadow-md"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Comissão Paga</p><p className="text-2xl font-bold text-red-500">{fmt(faturamentoTotal * 0.15)}</p></CardContent></Card>
                <Card className="border-0 shadow-md"><CardContent className="p-4 text-center"><p className="text-xs text-muted-foreground mb-1">Lucro Líquido</p><p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(faturamentoTotal * 0.85)}</p></CardContent></Card>
              </div>
            </TabsContent>

            <TabsContent value="recebiveis" className="mt-4 space-y-6">
              {/* Charts for recebiveis */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" />Timeline de Recebíveis</CardTitle></CardHeader>
                  <CardContent><div className="h-56"><ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={recebiveisTimeline}>
                      <defs>
                        <linearGradient id="colorDep" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} /></linearGradient>
                        <linearGradient id="colorPend" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(43, 74%, 66%)" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(43, 74%, 66%)" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="data" axisLine={false} tickLine={false} className="text-xs" />
                      <YAxis axisLine={false} tickLine={false} className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => [fmt(value), '']} contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="depositado" stroke="hsl(142, 76%, 36%)" fillOpacity={1} fill="url(#colorDep)" strokeWidth={2} name="Depositado" />
                      <Area type="monotone" dataKey="pendente" stroke="hsl(43, 74%, 66%)" fillOpacity={1} fill="url(#colorPend)" strokeWidth={2} name="Pendente" />
                    </AreaChart>
                  </ResponsiveContainer></div>
                  <div className="flex items-center justify-center gap-6 mt-2">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} /><span className="text-xs text-muted-foreground">Depositado</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(43, 74%, 66%)' }} /><span className="text-xs text-muted-foreground">Pendente</span></div>
                  </div></CardContent>
                </Card>

                <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><PieChart className="w-4 h-4 text-primary" />Recebíveis por Status</CardTitle></CardHeader>
                  <CardContent><div className="flex items-center gap-4"><div className="h-56 flex-1"><ResponsiveContainer width="100%" height="100%">
                    <RechartsPie><Pie data={recebivelPorTipo} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={4} dataKey="value">
                      {recebivelPorTipo.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                    </Pie><Tooltip formatter={(value: number) => [fmt(value), '']} contentStyle={tooltipStyle} /></RechartsPie>
                  </ResponsiveContainer></div>
                  <div className="space-y-3 shrink-0">{recebivelPorTipo.map((item, i) => (
                    <div key={i}><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-xs text-muted-foreground">{item.name}</span></div>
                    <p className="text-sm font-bold text-foreground ml-5">{fmt(item.value)}</p></div>
                  ))}</div></div></CardContent>
                </Card>
              </div>

              {/* Receivables list */}
              {emProcesso.length > 0 && (
                <div className="space-y-2"><h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Timer className="w-4 h-4 text-amber-500" />Pagamento em Processo — D+1</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{emProcesso.map(r => (
                    <Card key={r.id} className="border-0 shadow-md"><CardContent className="p-4 space-y-2">
                      <div className="flex items-center justify-between"><div><p className="font-mono font-bold text-foreground">{r.placa}</p><p className="text-xs text-muted-foreground">{r.servico}</p></div>
                      <div className="text-right"><p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{fmt(r.valorLiquido)}</p><p className="text-[10px] text-muted-foreground line-through">{fmt(r.valorBruto)}</p></div></div>
                      <div className="flex items-center gap-2"><Progress value={60} className="flex-1 h-2" /><span className="text-xs text-muted-foreground">{r.dataDeposito}</span></div>
                    </CardContent></Card>
                  ))}</div>
                </div>
              )}
              {agendados.length > 0 && (
                <div className="space-y-2"><h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><CalendarDays className="w-4 h-4 text-primary" />Agendados</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{agendados.map(r => (
                    <Card key={r.id} className="border-0 shadow-md"><CardContent className="p-4 flex items-center justify-between"><div><p className="font-mono font-bold text-foreground">{r.placa}</p><p className="text-xs text-muted-foreground">{r.servico}</p></div><div className="text-right"><p className="font-bold text-foreground">{fmt(r.valorLiquido)}</p><p className="text-xs text-muted-foreground">{r.dataDeposito}</p></div></CardContent></Card>
                  ))}</div>
                </div>
              )}
              {depositos.length > 0 && (
                <div className="space-y-2"><h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-500" />Depositados</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{depositos.map(r => (
                    <Card key={r.id} className="border-0 shadow-md opacity-80"><CardContent className="p-4 flex items-center justify-between"><div><p className="font-mono font-bold text-foreground">{r.placa}</p><p className="text-xs text-muted-foreground">{r.servico}</p></div><div className="text-right"><p className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(r.valorLiquido)}</p><p className="text-xs text-emerald-600 dark:text-emerald-400">✓ {r.dataDeposito}</p></div></CardContent></Card>
                  ))}</div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="fluxo" className="mt-4 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><TrendingUp className="w-4 h-4 text-emerald-500" />Fluxo de Caixa Semanal</CardTitle></CardHeader>
                  <CardContent><div className="h-64 sm:h-80"><ResponsiveContainer width="100%" height="100%">
                    <BarChart data={fluxoCaixaData} barGap={4}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="dia" axisLine={false} tickLine={false} className="text-xs" />
                      <YAxis axisLine={false} tickLine={false} className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number, name: string) => [fmt(value), name === 'entrada' ? 'Entradas' : 'Saídas']} contentStyle={tooltipStyle} />
                      <Bar dataKey="entrada" fill="hsl(142, 76%, 36%)" radius={[4, 4, 0, 0]} name="entrada" />
                      <Bar dataKey="saida" fill="hsl(346, 87%, 43%)" radius={[4, 4, 0, 0]} name="saida" />
                    </BarChart>
                  </ResponsiveContainer></div>
                  <div className="flex items-center justify-center gap-6 mt-4">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} /><span className="text-xs text-muted-foreground">Entradas</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(346, 87%, 43%)' }} /><span className="text-xs text-muted-foreground">Saídas</span></div>
                  </div></CardContent>
                </Card>

                <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" />Saldo Acumulado</CardTitle></CardHeader>
                  <CardContent><div className="h-64 sm:h-80"><ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={fluxoCaixaData.map((d, i, arr) => ({ ...d, saldo: arr.slice(0, i + 1).reduce((s, x) => s + x.entrada - x.saida, 0) }))}>
                      <defs><linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} /><stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis dataKey="dia" axisLine={false} tickLine={false} className="text-xs" />
                      <YAxis axisLine={false} tickLine={false} className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip formatter={(value: number) => [fmt(value), 'Saldo']} contentStyle={tooltipStyle} />
                      <Area type="monotone" dataKey="saldo" stroke="hsl(var(--primary))" fillOpacity={1} fill="url(#colorSaldo)" strokeWidth={2} />
                    </AreaChart>
                  </ResponsiveContainer></div></CardContent>
                </Card>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="border-0 shadow-md"><CardContent className="p-5 text-center">
                  <ArrowUpRight className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground mb-1">Total Entradas</p>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(fluxoCaixaData.reduce((s, d) => s + d.entrada, 0))}</p>
                </CardContent></Card>
                <Card className="border-0 shadow-md"><CardContent className="p-5 text-center">
                  <ArrowDownRight className="w-6 h-6 text-red-500 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground mb-1">Total Saídas</p>
                  <p className="text-2xl font-bold text-red-500">{fmt(fluxoCaixaData.reduce((s, d) => s + d.saida, 0))}</p>
                </CardContent></Card>
                <Card className="border-0 shadow-md"><CardContent className="p-5 text-center">
                  <DollarSign className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground mb-1">Saldo Líquido</p>
                  <p className="text-2xl font-bold text-foreground">{fmt(fluxoCaixaData.reduce((s, d) => s + d.entrada - d.saida, 0))}</p>
                </CardContent></Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      );
    }

    // ══ CLIENTES ══
    if (view === 'finalizar') {
      return (
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto pb-24">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <Card className="border-0 shadow-md"><CardContent className="p-4 text-center"><Users className="w-6 h-6 text-primary mx-auto mb-2" /><p className="text-xs text-muted-foreground mb-1">Total Clientes</p><p className="text-2xl font-bold text-foreground">48</p></CardContent></Card>
            <Card className="border-0 shadow-md"><CardContent className="p-4 text-center"><Car className="w-6 h-6 text-emerald-500 mx-auto mb-2" /><p className="text-xs text-muted-foreground mb-1">Veículos Atendidos</p><p className="text-2xl font-bold text-foreground">156</p></CardContent></Card>
            <Card className="border-0 shadow-md"><CardContent className="p-4 text-center"><Star className="w-6 h-6 text-yellow-500 mx-auto mb-2" /><p className="text-xs text-muted-foreground mb-1">Satisfação Média</p><p className="text-2xl font-bold text-foreground">4.8</p></CardContent></Card>
            <Card className="border-0 shadow-md"><CardContent className="p-4 text-center"><TrendingUp className="w-6 h-6 text-emerald-500 mx-auto mb-2" /><p className="text-xs text-muted-foreground mb-1">Recorrência</p><p className="text-2xl font-bold text-foreground">72%</p></CardContent></Card>
          </div>

          {/* Client Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500" />Faturamento por Cliente (Top 5)</CardTitle></CardHeader>
              <CardContent><div className="h-56"><ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientesFaturamento} layout="vertical" barSize={18}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" axisLine={false} tickLine={false} className="text-xs" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="nome" axisLine={false} tickLine={false} className="text-xs" width={80} />
                  <Tooltip formatter={(value: number) => [fmt(value), 'Faturamento']} contentStyle={tooltipStyle} />
                  <Bar dataKey="valor" fill="hsl(142, 76%, 36%)" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer></div></CardContent>
            </Card>

            <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Star className="w-4 h-4 text-yellow-500" />Evolução da Satisfação</CardTitle></CardHeader>
              <CardContent><div className="h-56"><ResponsiveContainer width="100%" height="100%">
                <LineChart data={clientesSatisfacao}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} className="text-xs" />
                  <YAxis domain={[3.5, 5]} axisLine={false} tickLine={false} className="text-xs" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="nota" stroke="hsl(43, 74%, 66%)" strokeWidth={3} dot={{ r: 5, fill: 'hsl(43, 74%, 66%)' }} name="Satisfação" />
                </LineChart>
              </ResponsiveContainer></div></CardContent>
            </Card>

            <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><PieChart className="w-4 h-4 text-primary" />Marcas dos Veículos</CardTitle></CardHeader>
              <CardContent><div className="flex items-center gap-4"><div className="h-56 flex-1"><ResponsiveContainer width="100%" height="100%">
                <RechartsPie><Pie data={clientesTipoVeiculo} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                  {clientesTipoVeiculo.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                </Pie><Tooltip formatter={(value: number) => [`${value}%`, '']} contentStyle={tooltipStyle} /></RechartsPie>
              </ResponsiveContainer></div>
              <div className="space-y-2 shrink-0">{clientesTipoVeiculo.map((item, i) => (
                <div key={i} className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} /><span className="text-xs text-muted-foreground">{item.name}</span><span className="text-xs font-bold text-foreground">{item.value}%</span></div>
              ))}</div></div></CardContent>
            </Card>

            <Card className="border-0 shadow-md"><CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Users className="w-4 h-4 text-primary" />Visitas Mensais: Novos vs Recorrentes</CardTitle></CardHeader>
              <CardContent><div className="h-56"><ResponsiveContainer width="100%" height="100%">
                <BarChart data={clientesVisitasMensal} barSize={14} barGap={2}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} className="text-xs" />
                  <YAxis axisLine={false} tickLine={false} className="text-xs" />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="recorrentes" fill="hsl(142, 76%, 36%)" radius={[3, 3, 0, 0]} name="Recorrentes" />
                  <Bar dataKey="novos" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Novos" />
                </BarChart>
              </ResponsiveContainer></div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} /><span className="text-xs text-muted-foreground">Recorrentes</span></div>
                <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-primary" /><span className="text-xs text-muted-foreground">Novos</span></div>
              </div></CardContent>
            </Card>
          </div>

          {/* Frotas list */}
          <Card className="border-0 shadow-md"><CardHeader><CardTitle className="text-base font-semibold">Frotas Cadastradas</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {['TransLog Ltda', 'ExpressCargas SA', 'RodoNorte Transportes', 'BrasLog Logística', 'Veloz Entregas'].map((name, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl border bg-card hover:bg-muted/50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Wrench className="w-5 h-5 text-primary" /></div>
                  <div className="flex-1 min-w-0"><p className="font-semibold text-foreground text-sm">{name}</p><p className="text-xs text-muted-foreground">{Math.floor(Math.random() * 30) + 5} veículos · {Math.floor(Math.random() * 20) + 3} serviços</p></div>
                  <Badge variant="secondary" className="text-[10px]">Ativo</Badge>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      );
    }

    return null;
  };

  // ═══════════════════════════════════════════════
  // MAIN LAYOUT WITH SIDEBAR
  // ═══════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-background flex">
      <aside className="hidden md:flex flex-col w-60 border-r border-border bg-card shrink-0 sticky top-0 h-screen"><SidebarNav /></aside>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b px-4 sm:px-6 py-3 flex items-center gap-3">
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetTrigger asChild><button className="md:hidden w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted active:scale-95 transition-all"><Menu className="w-5 h-5" /></button></SheetTrigger>
            <SheetContent side="left" className="w-64 p-0"><SidebarNav /></SheetContent>
          </Sheet>
          <h1 className="text-lg font-bold text-foreground flex-1">{viewTitle[view]}</h1>
        </div>
        {renderContent()}
      </div>
      <a href="https://wa.me/5599999999999?text=Olá%20NovaLink,%20preciso%20de%20ajuda%20no%20portal%20da%20oficina!" target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg flex items-center justify-center active:scale-95 transition-all" title="Pé na Graxa — Suporte">
        <MessageCircle className="w-6 h-6 text-white" />
      </a>
    </div>
  );
}
