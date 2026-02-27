import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Wrench, Plus, Camera, Trash2, DollarSign, Clock, CheckCircle2,
  FileText, Car, ArrowLeft, AlertTriangle, Timer,
  Receipt, Wallet, Send, X, ChevronRight, Bell, Search,
  TrendingUp, BarChart3, PieChart, CalendarDays, Star, Users,
  Activity, Target, ArrowUpRight, ArrowDownRight, Menu,
  LayoutDashboard, ClipboardList, UserCheck, ShieldCheck,
  ChevronDown, Eye, MoreHorizontal, Download, Filter,
  MessageCircle, Phone, Truck
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, AreaChart, Area, PieChart as RechartsPie, Pie, Cell,
  ComposedChart
} from 'recharts';

// ─── Types ───
type OficinaView = 'home' | 'checkin' | 'orcamento' | 'patio' | 'finalizar' | 'financeiro' | 'mensagens';

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
  { id: '5', placa: 'VWX-6Y78', servico: 'Motor diesel — retífica', valorBruto: 18900, valorLiquido: 16065, dataDeposito: '01/03/2026', status: 'agendado' },
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
  { dia: '21/02', valor: 3200, servicos: 2 },
  { dia: '22/02', valor: 5100, servicos: 3 },
  { dia: '23/02', valor: 2800, servicos: 1 },
  { dia: '24/02', valor: 7400, servicos: 4 },
  { dia: '25/02', valor: 6300, servicos: 3 },
  { dia: '26/02', valor: 4200, servicos: 2 },
  { dia: '27/02', valor: 8900, servicos: 5 },
];

const servicosPorTipo = [
  { name: 'Motor', value: 35, color: 'hsl(217, 91%, 60%)' },
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
  { name: 'Scania', value: 28, color: 'hsl(217, 91%, 60%)' },
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

// ─── Helpers ───
const statusConfig = {
  aguardando: { label: 'Aguardando', color: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10', icon: Clock },
  autorizado: { label: 'Autorizado', color: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10', icon: CheckCircle2 },
  ajuste: { label: 'Ajuste', color: 'bg-red-500', text: 'text-red-600 dark:text-red-400', bg: 'bg-red-500/10', icon: AlertTriangle },
};

const ttStyle = {
  borderRadius: '8px',
  border: '1px solid hsl(var(--border))',
  background: 'hsl(var(--card))',
  fontSize: '12px',
  boxShadow: '0 4px 12px hsl(var(--foreground) / 0.08)',
};

// ─── KPI Card Component ───
function KpiCard({ label, value, sublabel, icon: Icon, trend, trendDir = 'up', accent }: {
  label: string; value: string; sublabel?: string; icon: any; trend?: string; trendDir?: 'up' | 'down'; accent?: string;
}) {
  const accentColor = accent || 'text-primary';
  return (
    <div className="bg-card border border-border/60 rounded-lg p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
        <Icon className={`w-4 h-4 ${accentColor}`} />
      </div>
      <p className={`text-2xl sm:text-3xl font-semibold tracking-tight ${accent ? accentColor : 'text-foreground'}`}>{value}</p>
      <div className="flex items-center gap-1.5 mt-1.5">
        {trend && (
          <>
            {trendDir === 'up' ? <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" /> : <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />}
            <span className={`text-xs font-medium ${trendDir === 'up' ? 'text-emerald-500' : 'text-red-500'}`}>{trend}</span>
          </>
        )}
        {sublabel && <span className="text-xs text-muted-foreground">{sublabel}</span>}
      </div>
    </div>
  );
}

// ─── Chart Card Wrapper ───
function ChartCard({ title, icon: Icon, children, action }: { title: string; icon: any; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-card border border-border/60 rounded-lg">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

// ─── Data Table Row ───
function TableRow({ cols, header }: { cols: React.ReactNode[]; header?: boolean }) {
  return (
    <div className={`grid items-center gap-3 px-4 py-3 text-sm ${header ? 'bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider' : 'border-b border-border/30 text-foreground hover:bg-muted/20 transition-colors'}`}
      style={{ gridTemplateColumns: `repeat(${cols.length}, minmax(0, 1fr))` }}>
      {cols.map((col, i) => <div key={i}>{col}</div>)}
    </div>
  );
}

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

  const buscarPlaca = () => { if (placaInput.length >= 7) setVeiculoCarregado(true); };

  const addItem = () => {
    if (!novoItemDesc || !novoItemValor) return;
    const valor = parseFloat(novoItemValor.replace(',', '.'));
    if (isNaN(valor)) return;
    let statusIA: 'ok' | 'atencao' | 'alto' | null = 'ok';
    if (valor > 3000) statusIA = 'atencao';
    if (valor > 8000) statusIA = 'alto';
    setOrcamentoItems(prev => [...prev, { id: Date.now().toString(), tipo: novoItemTipo, descricao: novoItemDesc, valor, statusIA }]);
    setNovoItemDesc(''); setNovoItemValor('');
  };

  const removeItem = (id: string) => setOrcamentoItems(prev => prev.filter(i => i.id !== id));
  const totalOrcamento = orcamentoItems.reduce((s, i) => s + i.valor, 0);

  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => { if (reader.result) setFotos(prev => [...prev, reader.result as string]); };
      reader.readAsDataURL(file);
    });
  };

  // KPIs
  const totalReceberHoje = mockRecebiveis.filter(r => r.status === 'em_processo').reduce((s, r) => s + r.valorLiquido, 0);
  const totalRecebido = mockRecebiveis.filter(r => r.status === 'depositado').reduce((s, r) => s + r.valorLiquido, 0);
  const totalAgendado = mockRecebiveis.filter(r => r.status === 'agendado').reduce((s, r) => s + r.valorLiquido, 0);
  const servicosAtivos = mockPatio.filter(v => v.status === 'autorizado').length;
  const aguardando = mockPatio.filter(v => v.status === 'aguardando').length;
  const faturamentoTotal = faturamentoMensal.reduce((s, m) => s + m.faturamento, 0);
  const servicosTotais = faturamentoMensal.reduce((s, m) => s + m.servicos, 0);
  const ticketMedio = faturamentoTotal / servicosTotais;

  // Nav
  const navItems: { value: OficinaView; label: string; desc: string; icon: any; badge?: string }[] = [
    { value: 'home', label: 'Dashboard', desc: 'Resumo de receita, serviços e avaliações', icon: LayoutDashboard },
    { value: 'checkin', label: 'Novo Atendimento', desc: 'Escanear placa e iniciar serviço', icon: Plus },
    { value: 'orcamento', label: 'Orçamentos', desc: 'Criar, revisar e acompanhar orçamentos', icon: ClipboardList, badge: '3' },
    { value: 'patio', label: 'Pátio Digital', desc: 'Veículos em serviço e status em tempo real', icon: Car, badge: String(mockPatio.length) },
    { value: 'financeiro', label: 'Financeiro', desc: 'Recebíveis, depósitos e fluxo de caixa', icon: Wallet },
    { value: 'finalizar', label: 'Clientes', desc: 'Gestão de frotas parceiras e satisfação', icon: Users, badge: '48' },
    { value: 'mensagens', label: 'Mensagens', desc: 'Chat com gestores de frota sobre serviços', icon: MessageCircle, badge: '2' },
  ];

  const navigateTo = (v: OficinaView) => { setView(v); setSidebarOpen(false); };

  const activeNavItem = navItems.find(n => n.value === view);

  // Chat state for oficina
  const [oficinaChatMessages, setOficinaChatMessages] = useState([
    { id: 1, from: 'gestor' as const, text: 'Bom dia! O compressor do Scania R450 (ABC-1D23) já chegou? Precisamos do veículo até amanhã.', time: '09:15', gestor: 'TransLog S.A.' },
    { id: 2, from: 'oficina' as const, text: 'Bom dia! Sim, já está em estoque. Podemos iniciar hoje às 14h. Previsão de conclusão amanhã 10h.', time: '09:22', gestor: 'TransLog S.A.' },
    { id: 3, from: 'gestor' as const, text: 'Perfeito, o motorista Carlos já está a caminho.', time: '09:28', gestor: 'TransLog S.A.' },
    { id: 4, from: 'gestor' as const, text: 'Sobre o orçamento do Volvo FH 540, tem como reduzir o valor do filtro de óleo? Achamos um pouco acima da média.', time: '10:15', gestor: 'ExpressCargo' },
    { id: 5, from: 'oficina' as const, text: 'Posso verificar com nosso fornecedor. Retorno em 30 minutos com uma proposta melhor.', time: '10:20', gestor: 'ExpressCargo' },
  ]);
  const [oficinaChatInput, setOficinaChatInput] = useState('');
  const [oficinaChatFilter, setOficinaChatFilter] = useState<string>('all');
  const [oficinaChatSearch, setOficinaChatSearch] = useState('');

  // ─── Sidebar ───
  const SidebarNav = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-md bg-primary/10 flex items-center justify-center">
            <Wrench className="w-4.5 h-4.5 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-foreground text-sm leading-none">NovaLink</p>
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
                active
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
              }`}>
              <Icon className="w-[18px] h-[18px] shrink-0" />
              <div className="flex-1 text-left min-w-0">
                <span className="block">{item.label}</span>
                <span className={`block text-[10px] font-normal leading-tight mt-0.5 ${active ? 'text-primary/70' : 'text-muted-foreground/60'}`}>{item.desc}</span>
              </div>
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
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="A Receber (D+1)" value={fmt(totalReceberHoje)} icon={DollarSign} trend="+18% vs ontem" accent="text-emerald-600 dark:text-emerald-400" />
            <KpiCard label="Serviços Ativos" value={String(servicosAtivos)} sublabel={`${aguardando} aguardando`} icon={Activity} />
            <KpiCard label="Ticket Médio" value={fmt(ticketMedio)} icon={Target} trend="+5%" />
            <KpiCard label="Avaliação Geral" value="4.8 / 5.0" sublabel="121 avaliações" icon={Star} accent="text-amber-500" />
          </div>

          {/* CTA */}
          <button onClick={() => setView('checkin')}
            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg p-5 flex items-center gap-4 transition-colors">
            <div className="w-12 h-12 rounded-md bg-primary-foreground/20 flex items-center justify-center"><Plus className="w-6 h-6" /></div>
            <div className="text-left">
              <p className="text-xl font-semibold">Novo Atendimento</p>
              <p className="text-sm opacity-80">Escanear placa ou digitar CPF/CNPJ</p>
            </div>
          </button>

          {/* Charts Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Receita — Últimos 7 Dias" icon={TrendingUp}>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={faturamentoDiario}>
                    <defs><linearGradient id="gradFat" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.2} /><stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [fmt(v), 'Receita']} contentStyle={ttStyle} />
                    <Area type="monotone" dataKey="valor" stroke="hsl(142, 76%, 36%)" fill="url(#gradFat)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Distribuição de Serviços" icon={PieChart}>
              <div className="flex items-center gap-6">
                <div className="h-56 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie data={servicosPorTipo} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none">
                        {servicosPorTipo.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${v}%`, '']} contentStyle={ttStyle} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3 shrink-0 pr-2">
                  {servicosPorTipo.map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-muted-foreground w-16">{item.name}</span>
                      <span className="text-xs font-semibold text-foreground">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>
          </div>

          {/* Charts Row 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Faturamento × Lucro Líquido" icon={BarChart3}>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={faturamentoMensal} barSize={16} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [fmt(v), '']} contentStyle={ttStyle} />
                    <Bar dataKey="faturamento" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Bruto" />
                    <Bar dataKey="lucro" fill="hsl(142, 76%, 36%)" radius={[3, 3, 0, 0]} name="Líquido (85%)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-5 mt-3">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-primary" /><span className="text-[11px] text-muted-foreground">Bruto</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} /><span className="text-[11px] text-muted-foreground">Líquido</span></div>
              </div>
            </ChartCard>

            <ChartCard title="Satisfação do Cliente" icon={Star}>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={avaliacaoSemanal}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="semana" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis domain={[3, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={ttStyle} />
                    <Line type="monotone" dataKey="nota" stroke="hsl(43, 74%, 66%)" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(43, 74%, 66%)', stroke: 'hsl(var(--card))', strokeWidth: 2 }} name="Nota" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            {/* Approved services quick list */}
            <ChartCard title="Aprovados — Iniciar Agora" icon={Bell}>
              <div className="space-y-2.5 max-h-52 overflow-y-auto">
                {mockPatio.filter(v => v.status === 'autorizado').map(v => (
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
          </div>
        </div>
      );
    }

    // ══════════════ CHECK-IN ══════════════
    if (view === 'checkin') {
      return (
        <div className="max-w-2xl mx-auto space-y-5">
          <p className="text-sm text-muted-foreground">Identifique o veículo para iniciar o atendimento.</p>

          <button className="w-full border-2 border-dashed border-border/60 rounded-lg p-8 flex flex-col items-center gap-3 hover:border-primary/40 transition-colors">
            <Camera className="w-10 h-10 text-muted-foreground" />
            <div className="text-center">
              <p className="font-semibold text-foreground text-sm">Escanear Placa</p>
              <p className="text-xs text-muted-foreground mt-0.5">Aponte a câmera para a placa do veículo</p>
            </div>
          </button>

          <div className="flex items-center gap-3"><Separator className="flex-1" /><span className="text-xs text-muted-foreground">ou digite manualmente</span><Separator className="flex-1" /></div>

          <div className="flex gap-2">
            <Input placeholder="Placa (ABC-1D23) ou CPF/CNPJ" value={placaInput} onChange={(e) => setPlacaInput(e.target.value.toUpperCase())}
              className="h-12 text-base font-mono text-center tracking-widest" />
            <Button onClick={buscarPlaca} className="h-12 px-5"><Search className="w-4 h-4 mr-2" />Buscar</Button>
          </div>

          {veiculoCarregado && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-5">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-md bg-primary/10 flex items-center justify-center"><Car className="w-5 h-5 text-primary" /></div>
                  <div>
                    <p className="font-mono text-lg font-bold text-foreground">{placaInput || 'ABC-1D23'}</p>
                    <p className="text-sm text-muted-foreground">Scania R450 · 2022 · 185.000 km</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-3">Motorista: Carlos Silva · Frota: TransLog Ltda</p>
              </div>

              {/* Histórico como tabela */}
              <div className="bg-card border border-border/60 rounded-lg overflow-hidden">
                <div className="px-4 py-3 border-b border-border/40">
                  <h3 className="text-sm font-semibold text-foreground">Histórico de Serviços</h3>
                </div>
                <TableRow header cols={['Data', 'Serviço', 'KM', 'Valor']} />
                {mockHistorico.map((h, i) => (
                  <TableRow key={i} cols={[
                    <span className="text-xs">{h.data}</span>,
                    <span className="text-xs font-medium">{h.servico}</span>,
                    <span className="text-xs text-muted-foreground">{h.km.toLocaleString()}</span>,
                    <span className="text-xs font-semibold">{fmt(h.valor)}</span>,
                  ]} />
                ))}
              </div>

              <Button onClick={() => setView('orcamento')} className="w-full h-12 gap-2">
                <FileText className="w-4 h-4" /> Elaborar Orçamento
              </Button>
            </div>
          )}
        </div>
      );
    }

    // ══════════════ ORÇAMENTOS ══════════════
    if (view === 'orcamento') {
      return (
        <div className="space-y-6">
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Orçamentos/Mês" value="23" icon={FileText} />
            <KpiCard label="Taxa de Aprovação" value="83%" icon={CheckCircle2} accent="text-emerald-600 dark:text-emerald-400" />
            <KpiCard label="Validação IA OK" value="72%" icon={ShieldCheck} />
            <KpiCard label="Ticket Médio" value={fmt(ticketMedio)} icon={Target} trend="+5%" />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Histórico de Aprovações" icon={BarChart3}>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={orcamentoHistorico} barSize={12} barGap={1}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={ttStyle} />
                    <Bar dataKey="aprovados" fill="hsl(142, 76%, 36%)" radius={[2, 2, 0, 0]} name="Aprovados" />
                    <Bar dataKey="ajustados" fill="hsl(43, 74%, 66%)" radius={[2, 2, 0, 0]} name="Ajustados" />
                    <Bar dataKey="recusados" fill="hsl(346, 87%, 43%)" radius={[2, 2, 0, 0]} name="Recusados" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-3">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} /><span className="text-[11px] text-muted-foreground">Aprovados</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(43, 74%, 66%)' }} /><span className="text-[11px] text-muted-foreground">Ajustados</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(346, 87%, 43%)' }} /><span className="text-[11px] text-muted-foreground">Recusados</span></div>
              </div>
            </ChartCard>

            <ChartCard title="Validação IA — Distribuição" icon={ShieldCheck}>
              <div className="flex items-center gap-6">
                <div className="h-52 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie>
                      <Pie data={orcamentoValidacaoIA} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                        {orcamentoValidacaoIA.map((e, i) => <Cell key={i} fill={e.color} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => [`${v}%`, '']} contentStyle={ttStyle} />
                    </RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3 shrink-0 pr-2">
                  {orcamentoValidacaoIA.map((item, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} />
                      <span className="text-xs text-muted-foreground">{item.name}</span>
                      <span className="text-xs font-semibold text-foreground">{item.value}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </ChartCard>

            <ChartCard title="Ticket Médio por Categoria" icon={Target}>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={orcamentoTicketPorCategoria} layout="vertical" barSize={14}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`} />
                    <YAxis type="category" dataKey="categoria" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={65} />
                    <Tooltip formatter={(v: number) => [fmt(v), 'Ticket']} contentStyle={ttStyle} />
                    <Bar dataKey="ticket" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Taxa de Conversão" icon={TrendingUp}>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={orcamentoConversao}>
                    <defs><linearGradient id="gradConv" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.15} /><stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis domain={[60, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}%`} />
                    <Tooltip formatter={(v: number) => [`${v}%`, 'Conversão']} contentStyle={ttStyle} />
                    <Area type="monotone" dataKey="taxa" stroke="hsl(142, 76%, 36%)" fill="url(#gradConv)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          {/* Form */}
          <div className="bg-card border border-border/60 rounded-lg">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
              <div className="flex items-center gap-2">
                <Plus className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold text-foreground">Novo Orçamento</h3>
              </div>
            </div>
            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-muted/30 border border-border/40 rounded-md p-3">
                  <Car className="w-5 h-5 text-muted-foreground" />
                  <div><p className="font-mono font-semibold text-foreground text-sm">{placaInput || 'ABC-1D23'}</p><p className="text-xs text-muted-foreground">Scania R450 · 185.000 km</p></div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setNovoItemTipo('peca')}
                    className={`flex-1 py-2.5 rounded-md text-xs font-semibold transition-colors border ${novoItemTipo === 'peca' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border/60 hover:bg-muted/50'}`}>
                    Peça
                  </button>
                  <button onClick={() => setNovoItemTipo('mao_de_obra')}
                    className={`flex-1 py-2.5 rounded-md text-xs font-semibold transition-colors border ${novoItemTipo === 'mao_de_obra' ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground border-border/60 hover:bg-muted/50'}`}>
                    Mão de Obra
                  </button>
                </div>
                <Input placeholder={novoItemTipo === 'peca' ? 'Ex: Filtro de óleo Mann W940' : 'Ex: Troca de embreagem'} value={novoItemDesc} onChange={(e) => setNovoItemDesc(e.target.value)} className="h-11" />
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">R$</span>
                    <Input placeholder="0,00" value={novoItemValor} onChange={(e) => setNovoItemValor(e.target.value)} className="h-11 pl-9 font-mono" />
                  </div>
                  <Button onClick={addItem} className="h-11 px-4"><Plus className="w-4 h-4" /></Button>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Fotos do serviço</p>
                  <div className="flex flex-wrap gap-2">
                    {fotos.map((f, i) => (
                      <div key={i} className="relative w-16 h-16 rounded-md overflow-hidden border border-border/60"><img src={f} alt="" className="w-full h-full object-cover" /><button onClick={() => setFotos(prev => prev.filter((_, idx) => idx !== i))} className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center"><X className="w-2.5 h-2.5 text-white" /></button></div>
                    ))}
                    <button onClick={() => fileInputRef.current?.click()} className="w-16 h-16 rounded-md border border-dashed border-border/60 hover:border-primary/40 flex items-center justify-center transition-colors"><Camera className="w-4 h-4 text-muted-foreground" /></button>
                    <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFoto} />
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground">Itens do orçamento ({orcamentoItems.length})</p>
                {orcamentoItems.length === 0 && (
                  <div className="bg-muted/20 border border-border/30 rounded-md p-8 text-center">
                    <FileText className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">Adicione peças e mão de obra ao orçamento</p>
                  </div>
                )}
                {orcamentoItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 p-3 border border-border/40 rounded-md bg-card">
                    <span className="text-xs font-mono text-muted-foreground w-6 text-center">{item.tipo === 'peca' ? 'PÇ' : 'MO'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{item.descricao}</p>
                      {item.statusIA === 'ok' && <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">✓ Preço dentro da faixa</span>}
                      {item.statusIA === 'atencao' && <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">⚠ Preço acima da média</span>}
                      {item.statusIA === 'alto' && <span className="text-[11px] text-red-600 dark:text-red-400 font-medium">✗ Preço muito elevado</span>}
                    </div>
                    <span className="text-sm font-semibold text-foreground">{fmt(item.valor)}</span>
                    <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
                {orcamentoItems.length > 0 && (
                  <div className="pt-3 border-t border-border/40 space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total bruto</span><span className="font-semibold text-foreground">{fmt(totalOrcamento)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Comissão NovaLink (15%)</span><span className="text-red-500 font-medium">-{fmt(totalOrcamento * 0.15)}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-muted-foreground">Valor líquido</span><span className="font-bold text-emerald-600 dark:text-emerald-400 text-lg">{fmt(totalOrcamento * 0.85)}</span></div>
                    <Button className="w-full h-11 mt-2 gap-2"><Send className="w-4 h-4" /> Enviar para Aprovação</Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // ══════════════ PÁTIO DIGITAL ══════════════
    if (view === 'patio') {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="No Pátio" value={String(mockPatio.length)} icon={Car} />
            <KpiCard label="Autorizados" value={String(mockPatio.filter(v => v.status === 'autorizado').length)} icon={CheckCircle2} accent="text-emerald-600 dark:text-emerald-400" />
            <KpiCard label="Aguardando" value={String(mockPatio.filter(v => v.status === 'aguardando').length)} icon={Clock} accent="text-amber-500" />
            <KpiCard label="Valor Total" value={fmt(mockPatio.reduce((s, v) => s + v.valorTotal, 0))} icon={DollarSign} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Distribuição por Status" icon={PieChart}>
              <div className="flex items-center gap-4">
                <div className="h-44 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie><Pie data={patioStatusData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value" stroke="none">
                      {patioStatusData.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie><Tooltip contentStyle={ttStyle} /></RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2 shrink-0">{patioStatusData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} /><span className="text-xs text-muted-foreground">{item.name}</span><span className="text-xs font-semibold">{item.value}</span></div>
                ))}</div>
              </div>
            </ChartCard>

            <ChartCard title="Valor por Status" icon={DollarSign}>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={patioValorPorStatus} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="status" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => [fmt(v), '']} contentStyle={ttStyle} />
                    <Bar dataKey="valor" radius={[4, 4, 0, 0]}>
                      <Cell fill="hsl(43, 74%, 66%)" /><Cell fill="hsl(142, 76%, 36%)" /><Cell fill="hsl(346, 87%, 43%)" />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Fluxo Semanal" icon={Activity}>
              <div className="h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={patioEntradaSemanal} barSize={10} barGap={1}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={ttStyle} />
                    <Bar dataKey="entradas" fill="hsl(142, 76%, 36%)" radius={[2, 2, 0, 0]} name="Entradas" />
                    <Bar dataKey="saidas" fill="hsl(var(--primary))" radius={[2, 2, 0, 0]} name="Saídas" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} /><span className="text-[11px] text-muted-foreground">Entradas</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-primary" /><span className="text-[11px] text-muted-foreground">Saídas</span></div>
              </div>
            </ChartCard>
          </div>

          <ChartCard title="Tempo Médio por Tipo de Serviço (h)" icon={Timer}>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={patioTempoMedio} layout="vertical" barSize={14}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${v}h`} />
                  <YAxis type="category" dataKey="tipo" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={65} />
                  <Tooltip formatter={(v: number) => [`${v}h`, 'Tempo']} contentStyle={ttStyle} />
                  <Bar dataKey="horas" fill="hsl(43, 74%, 66%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartCard>

          {/* Vehicle Table */}
          <div className="bg-card border border-border/60 rounded-lg overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
              <h3 className="text-sm font-semibold text-foreground">Veículos no Pátio</h3>
              <span className="text-xs text-muted-foreground">{mockPatio.length} veículos</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-muted/30 text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="px-4 py-3 text-left font-medium">Placa</th>
                  <th className="px-4 py-3 text-left font-medium">Modelo</th>
                  <th className="px-4 py-3 text-left font-medium">Motorista</th>
                  <th className="px-4 py-3 text-left font-medium">Entrada</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-right font-medium">Valor</th>
                  <th className="px-4 py-3 text-center font-medium">Ação</th>
                </tr></thead>
                <tbody>
                  {mockPatio.map(v => {
                    const cfg = statusConfig[v.status];
                    return (
                      <tr key={v.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold">{v.placa}</td>
                        <td className="px-4 py-3 text-muted-foreground">{v.modelo}</td>
                        <td className="px-4 py-3 text-muted-foreground">{v.motorista}</td>
                        <td className="px-4 py-3 text-muted-foreground">{v.horaEntrada}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded ${cfg.bg} ${cfg.text}`}>
                            <cfg.icon className="w-3 h-3" />{cfg.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{fmt(v.valorTotal)}</td>
                        <td className="px-4 py-3 text-center">
                          {v.status === 'autorizado' && (
                            <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => { setSelectedVeiculo(v); setFinalizarDialog(true); }}>
                              <CheckCircle2 className="w-3 h-3" /> Finalizar
                            </Button>
                          )}
                          {v.status === 'ajuste' && (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => setView('orcamento')}>
                              <FileText className="w-3 h-3" /> Revisar
                            </Button>
                          )}
                          {v.status === 'aguardando' && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <Dialog open={finalizarDialog} onOpenChange={setFinalizarDialog}>
            <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Finalizar Serviço</DialogTitle></DialogHeader>
              {selectedVeiculo && (
                <div className="space-y-4 mt-2">
                  <div className="bg-muted/30 border border-border/40 rounded-md p-3 flex items-center gap-3">
                    <Car className="w-5 h-5 text-muted-foreground" />
                    <div><p className="font-mono font-semibold text-foreground">{selectedVeiculo.placa}</p><p className="text-xs text-muted-foreground">{selectedVeiculo.modelo}</p></div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-foreground mb-2">Foto do serviço concluído</p>
                    <button onClick={() => fotoServicoRef.current?.click()} className="w-full border border-dashed border-border/60 rounded-md p-5 flex flex-col items-center gap-2 hover:border-primary/40 transition-colors">
                      <Camera className="w-6 h-6 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Selecionar foto</span>
                    </button>
                    <input ref={fotoServicoRef} type="file" accept="image/*" capture="environment" className="hidden" />
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
                  <Button onClick={() => setFinalizarDialog(false)} className="w-full h-11 gap-2"><CheckCircle2 className="w-4 h-4" /> Confirmar Finalização</Button>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      );
    }

    // ══════════════ FINANCEIRO ══════════════
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
      const saldoAcumulado = fluxoCaixaData.reduce<{ dia: string; saldo: number }[]>((acc, d) => {
        const prev = acc.length > 0 ? acc[acc.length - 1].saldo : 0;
        acc.push({ dia: d.dia, saldo: prev + d.entrada - d.saida });
        return acc;
      }, []);

      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Recebido" value={fmt(totalRecebido)} icon={CheckCircle2} accent="text-emerald-600 dark:text-emerald-400" />
            <KpiCard label="Em D+1" value={fmt(totalReceberHoje)} icon={Timer} accent="text-amber-500" />
            <KpiCard label="Agendado" value={fmt(totalAgendado)} icon={CalendarDays} />
            <KpiCard label="Total Geral" value={fmt(totalRecebido + totalReceberHoje + totalAgendado)} icon={Wallet} />
          </div>

          <Tabs value={financeiroTab} onValueChange={setFinanceiroTab}>
            <TabsList className="bg-card border border-border/60 h-10">
              <TabsTrigger value="resumo" className="text-xs gap-1.5 data-[state=active]:bg-primary/10"><BarChart3 className="w-3.5 h-3.5" />Resumo</TabsTrigger>
              <TabsTrigger value="recebiveis" className="text-xs gap-1.5 data-[state=active]:bg-primary/10"><Receipt className="w-3.5 h-3.5" />Recebíveis</TabsTrigger>
              <TabsTrigger value="fluxo" className="text-xs gap-1.5 data-[state=active]:bg-primary/10"><TrendingUp className="w-3.5 h-3.5" />Fluxo de Caixa</TabsTrigger>
            </TabsList>

            <TabsContent value="resumo" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Faturamento × Lucro" icon={BarChart3}>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={faturamentoMensal} barSize={16} barGap={2}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => [fmt(v), '']} contentStyle={ttStyle} />
                        <Bar dataKey="faturamento" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Bruto" />
                        <Bar dataKey="lucro" fill="hsl(142, 76%, 36%)" radius={[3, 3, 0, 0]} name="Líquido" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-5 mt-3">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-primary" /><span className="text-[11px] text-muted-foreground">Bruto</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} /><span className="text-[11px] text-muted-foreground">Líquido</span></div>
                  </div>
                </ChartCard>

                <ChartCard title="Volume × Receita" icon={Activity}>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={faturamentoMensal}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="left" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <YAxis yAxisId="right" orientation="right" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip contentStyle={ttStyle} />
                        <Bar yAxisId="left" dataKey="servicos" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Serviços" barSize={20} />
                        <Line yAxisId="right" type="monotone" dataKey="faturamento" stroke="hsl(142, 76%, 36%)" strokeWidth={2} dot={{ r: 3, fill: 'hsl(142, 76%, 36%)' }} name="Receita" />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>

              {/* Summary Table */}
              <div className="bg-card border border-border/60 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/40"><h3 className="text-sm font-semibold">Indicadores do Período</h3></div>
                <div className="grid grid-cols-2 lg:grid-cols-4">
                  {[
                    { label: 'Serviços/mês', value: '23', sub: 'Fev 2026' },
                    { label: 'Ticket Médio', value: fmt(ticketMedio), sub: '+5% vs jan' },
                    { label: 'Comissão Paga', value: fmt(faturamentoTotal * 0.15), sub: '15% retido' },
                    { label: 'Lucro Líquido', value: fmt(faturamentoTotal * 0.85), sub: '85% recebido' },
                  ].map((item, i) => (
                    <div key={i} className={`p-4 ${i < 3 ? 'border-r border-border/30' : ''} ${i < 2 ? 'border-b lg:border-b-0 border-border/30' : i >= 2 ? 'border-b lg:border-b-0 border-border/30' : ''}`}>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-1">{item.label}</p>
                      <p className="text-lg font-semibold text-foreground">{item.value}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{item.sub}</p>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="recebiveis" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Timeline de Recebíveis" icon={TrendingUp}>
                  <div className="h-52">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={recebiveisTimeline}>
                        <defs>
                          <linearGradient id="gDep" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.15} /><stop offset="100%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} /></linearGradient>
                          <linearGradient id="gPend" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(43, 74%, 66%)" stopOpacity={0.15} /><stop offset="100%" stopColor="hsl(43, 74%, 66%)" stopOpacity={0} /></linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="data" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => [fmt(v), '']} contentStyle={ttStyle} />
                        <Area type="monotone" dataKey="depositado" stroke="hsl(142, 76%, 36%)" fill="url(#gDep)" strokeWidth={2} name="Depositado" />
                        <Area type="monotone" dataKey="pendente" stroke="hsl(43, 74%, 66%)" fill="url(#gPend)" strokeWidth={2} name="Pendente" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-5 mt-2">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} /><span className="text-[11px] text-muted-foreground">Depositado</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(43, 74%, 66%)' }} /><span className="text-[11px] text-muted-foreground">Pendente</span></div>
                  </div>
                </ChartCard>

                <ChartCard title="Composição por Status" icon={PieChart}>
                  <div className="flex items-center gap-6">
                    <div className="h-52 flex-1">
                      <ResponsiveContainer width="100%" height="100%">
                        <RechartsPie><Pie data={recebivelPorTipo} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                          {recebivelPorTipo.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie><Tooltip formatter={(v: number) => [fmt(v), '']} contentStyle={ttStyle} /></RechartsPie>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-3 shrink-0 pr-2">{recebivelPorTipo.map((item, i) => (
                      <div key={i}>
                        <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} /><span className="text-xs text-muted-foreground">{item.name}</span></div>
                        <p className="text-sm font-semibold text-foreground ml-5">{fmt(item.value)}</p>
                      </div>
                    ))}</div>
                  </div>
                </ChartCard>
              </div>

              {/* Receivables table */}
              <div className="bg-card border border-border/60 rounded-lg overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/40">
                  <h3 className="text-sm font-semibold">Extrato de Recebíveis</h3>
                  <span className="text-xs text-muted-foreground">{mockRecebiveis.length} registros</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-muted/30 text-[11px] text-muted-foreground uppercase tracking-wider">
                      <th className="px-4 py-2.5 text-left font-medium">Placa</th>
                      <th className="px-4 py-2.5 text-left font-medium">Serviço</th>
                      <th className="px-4 py-2.5 text-right font-medium">Bruto</th>
                      <th className="px-4 py-2.5 text-right font-medium">Líquido</th>
                      <th className="px-4 py-2.5 text-left font-medium">Depósito</th>
                      <th className="px-4 py-2.5 text-left font-medium">Status</th>
                    </tr></thead>
                    <tbody>
                      {mockRecebiveis.map(r => (
                        <tr key={r.id} className="border-b border-border/30 hover:bg-muted/20 transition-colors">
                          <td className="px-4 py-2.5 font-mono font-semibold text-xs">{r.placa}</td>
                          <td className="px-4 py-2.5 text-muted-foreground text-xs">{r.servico}</td>
                          <td className="px-4 py-2.5 text-right text-xs text-muted-foreground">{fmt(r.valorBruto)}</td>
                          <td className="px-4 py-2.5 text-right text-xs font-semibold">{fmt(r.valorLiquido)}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground">{r.dataDeposito}</td>
                          <td className="px-4 py-2.5">
                            <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${
                              r.status === 'depositado' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' :
                              r.status === 'em_processo' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {r.status === 'depositado' ? 'Depositado' : r.status === 'em_processo' ? 'Em Processo' : 'Agendado'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="fluxo" className="mt-4 space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartCard title="Entradas × Saídas" icon={BarChart3}>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={fluxoCaixaData} barGap={3}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number, n: string) => [fmt(v), n === 'entrada' ? 'Entradas' : 'Saídas']} contentStyle={ttStyle} />
                        <Bar dataKey="entrada" fill="hsl(142, 76%, 36%)" radius={[3, 3, 0, 0]} name="entrada" />
                        <Bar dataKey="saida" fill="hsl(346, 87%, 43%)" radius={[3, 3, 0, 0]} name="saida" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex items-center justify-center gap-5 mt-3">
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} /><span className="text-[11px] text-muted-foreground">Entradas</span></div>
                    <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(346, 87%, 43%)' }} /><span className="text-[11px] text-muted-foreground">Saídas</span></div>
                  </div>
                </ChartCard>

                <ChartCard title="Saldo Acumulado" icon={TrendingUp}>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={saldoAcumulado}>
                        <defs><linearGradient id="gradSaldo" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.15} /><stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} /></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => [fmt(v), 'Saldo']} contentStyle={ttStyle} />
                        <Area type="monotone" dataKey="saldo" stroke="hsl(var(--primary))" fill="url(#gradSaldo)" strokeWidth={2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </ChartCard>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      );
    }

    // ══════════════ CLIENTES ══════════════
    if (view === 'finalizar') {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard label="Total de Frotas" value="48" icon={Users} />
            <KpiCard label="Satisfação Média" value="4.8" sublabel="/ 5.0" icon={Star} accent="text-amber-500" />
            <KpiCard label="Clientes Novos" value="3" sublabel="este mês" icon={ArrowUpRight} accent="text-emerald-600 dark:text-emerald-400" />
            <KpiCard label="Receita/Cliente" value={fmt(45200)} icon={DollarSign} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Top 5 — Faturamento por Cliente" icon={BarChart3}>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientesFaturamento} layout="vertical" barSize={16}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                    <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <YAxis type="category" dataKey="nome" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} width={65} />
                    <Tooltip formatter={(v: number) => [fmt(v), 'Faturamento']} contentStyle={ttStyle} />
                    <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Evolução da Satisfação" icon={Star}>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={clientesSatisfacao}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis domain={[3.5, 5]} axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={ttStyle} />
                    <Line type="monotone" dataKey="nota" stroke="hsl(43, 74%, 66%)" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(43, 74%, 66%)', stroke: 'hsl(var(--card))', strokeWidth: 2 }} name="Nota" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Composição da Frota" icon={PieChart}>
              <div className="flex items-center gap-6">
                <div className="h-52 flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPie><Pie data={clientesTipoVeiculo} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value" stroke="none">
                      {clientesTipoVeiculo.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie><Tooltip formatter={(v: number) => [`${v}%`, '']} contentStyle={ttStyle} /></RechartsPie>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-2.5 shrink-0 pr-2">{clientesTipoVeiculo.map((item, i) => (
                  <div key={i} className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: item.color }} /><span className="text-xs text-muted-foreground w-10">{item.name}</span><span className="text-xs font-semibold">{item.value}%</span></div>
                ))}</div>
              </div>
            </ChartCard>

            <ChartCard title="Novos vs Recorrentes" icon={Users}>
              <div className="h-52">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={clientesVisitasMensal} barSize={14} barGap={2}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={ttStyle} />
                    <Bar dataKey="recorrentes" fill="hsl(var(--primary))" radius={[3, 3, 0, 0]} name="Recorrentes" />
                    <Bar dataKey="novos" fill="hsl(142, 76%, 36%)" radius={[3, 3, 0, 0]} name="Novos" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex items-center justify-center gap-5 mt-3">
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-primary" /><span className="text-[11px] text-muted-foreground">Recorrentes</span></div>
                <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} /><span className="text-[11px] text-muted-foreground">Novos</span></div>
              </div>
            </ChartCard>
          </div>
        </div>
      );
    }

    // ══════════════ MENSAGENS ══════════════
    if (view === 'mensagens') {
      const gestores = [...new Set(oficinaChatMessages.map(m => m.gestor))];
      const filteredMsgs = oficinaChatFilter === 'all'
        ? oficinaChatMessages
        : oficinaChatMessages.filter(m => m.gestor === oficinaChatFilter);

      const handleOficinaSend = () => {
        if (!oficinaChatInput.trim()) return;
        const target = oficinaChatFilter === 'all' ? (gestores[0] || 'TransLog S.A.') : oficinaChatFilter;
        setOficinaChatMessages(prev => [...prev, {
          id: Date.now(),
          from: 'oficina' as const,
          text: oficinaChatInput.trim(),
          time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          gestor: target,
        }]);
        setOficinaChatInput('');
        setTimeout(() => {
          setOficinaChatMessages(prev => [...prev, {
            id: Date.now() + 1,
            from: 'gestor' as const,
            text: 'Entendido, vou analisar e retorno em breve.',
            time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            gestor: target,
          }]);
        }, 2000);
      };

      return (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Canal de Comunicação</h2>
            <p className="text-sm text-muted-foreground">Converse diretamente com os gestores de frota sobre orçamentos e serviços</p>
          </div>

          <div className="grid lg:grid-cols-[280px_1fr] gap-4 h-[600px]">
            {/* Sidebar — Gestores */}
            <div className="bg-card border border-border/60 rounded-lg overflow-hidden flex flex-col">
              <div className="p-3 border-b border-border/40">
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Gestores de Frota</h3>
                <Input
                  value={oficinaChatSearch}
                  onChange={e => setOficinaChatSearch(e.target.value)}
                  placeholder="Buscar gestor..."
                  className="h-8 text-xs"
                />
              </div>
              <div className="flex-1 overflow-y-auto">
                <button
                  onClick={() => setOficinaChatFilter('all')}
                  className={`w-full text-left px-3 py-3 border-b border-border/20 hover:bg-muted/30 transition-colors flex items-center gap-3 ${oficinaChatFilter === 'all' ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                    <Users className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">Todos os Gestores</p>
                    <p className="text-[10px] text-muted-foreground">{oficinaChatMessages.length} mensagens</p>
                  </div>
                </button>
                {gestores
                  .filter(g => !oficinaChatSearch || g.toLowerCase().includes(oficinaChatSearch.toLowerCase()))
                  .map(gestor => {
                    const msgs = oficinaChatMessages.filter(m => m.gestor === gestor);
                    const lastMsg = msgs[msgs.length - 1];
                    const unread = msgs.filter(m => m.from === 'gestor').length;
                    return (
                      <button
                        key={gestor}
                        onClick={() => setOficinaChatFilter(gestor)}
                        className={`w-full text-left px-3 py-3 border-b border-border/20 hover:bg-muted/30 transition-colors flex items-center gap-3 ${oficinaChatFilter === gestor ? 'bg-primary/5 border-l-2 border-l-primary' : ''}`}
                      >
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Truck className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground truncate">{gestor}</p>
                            <span className="text-[10px] text-muted-foreground">{lastMsg?.time}</span>
                          </div>
                          <p className="text-[11px] text-muted-foreground truncate">{lastMsg?.text}</p>
                        </div>
                        {unread > 0 && (
                          <span className="w-5 h-5 rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center shrink-0">{unread}</span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Chat Area */}
            <div className="bg-card border border-border/60 rounded-lg overflow-hidden flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-border/40 flex items-center justify-between bg-muted/20">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">
                      {oficinaChatFilter === 'all' ? 'Todos os Gestores' : oficinaChatFilter}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                      <span className="text-[10px] text-muted-foreground">Online</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Phone className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><Search className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {filteredMsgs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <MessageCircle className="w-12 h-12 text-muted-foreground/20 mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhuma mensagem ainda</p>
                    <p className="text-xs text-muted-foreground/60 mt-1">Aguarde o gestor enviar uma mensagem ou inicie uma conversa</p>
                  </div>
                ) : (
                  filteredMsgs.map(msg => (
                    <div key={msg.id} className={`flex ${msg.from === 'oficina' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        msg.from === 'oficina'
                          ? 'bg-primary text-primary-foreground rounded-br-md'
                          : 'bg-muted/50 border border-border/50 text-foreground rounded-bl-md'
                      }`}>
                        {oficinaChatFilter === 'all' && (
                          <p className={`text-[10px] font-semibold mb-0.5 ${msg.from === 'oficina' ? 'text-primary-foreground/70' : 'text-primary'}`}>
                            {msg.from === 'oficina' ? 'Você' : msg.gestor}
                          </p>
                        )}
                        <p className="text-sm leading-relaxed">{msg.text}</p>
                        <p className={`text-[10px] mt-1 text-right ${msg.from === 'oficina' ? 'text-primary-foreground/50' : 'text-muted-foreground'}`}>
                          {msg.time} {msg.from === 'oficina' && '✓✓'}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Input */}
              <div className="p-3 border-t border-border/40 bg-muted/10">
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0"><Plus className="w-4 h-4" /></Button>
                  <Input
                    value={oficinaChatInput}
                    onChange={e => setOficinaChatInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleOficinaSend()}
                    placeholder={`Mensagem para ${oficinaChatFilter === 'all' ? 'gestor' : oficinaChatFilter}...`}
                    className="h-9 text-sm flex-1"
                  />
                  <Button
                    onClick={handleOficinaSend}
                    disabled={!oficinaChatInput.trim()}
                    size="sm"
                    className="h-9 px-4 gap-1.5"
                  >
                    <Send className="w-4 h-4" />
                    Enviar
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  // ══════════════ LAYOUT ══════════════
  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-56 border-r border-border/50 bg-card/50 sticky top-0 h-screen">
        <SidebarNav />
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border/50 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
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
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Bell className="w-4 h-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground"><Download className="w-4 h-4" /></Button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
