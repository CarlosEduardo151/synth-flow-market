import { useState } from 'react';
import { OficinaPortal } from '@/components/oficina/OficinaPortal';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import {
  Truck, Wrench, Shield, DollarSign, Plus, Search, Star,
  MapPin, Phone, FileText, CheckCircle2, Clock, AlertTriangle,
  Car, Building2, TrendingUp, Eye, QrCode, Zap, Users, BarChart3,
  Download, MessageCircle, ChevronRight, Wallet, ShieldCheck,
  ShieldAlert, ShieldX, History, Receipt, X, Check
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

type UserRole = 'select' | 'frota' | 'oficina';

// Mock data for the fleet dashboard
const mockGastos6Meses = [
  { mes: 'Set', valor: 42500 },
  { mes: 'Out', valor: 38200 },
  { mes: 'Nov', valor: 55800 },
  { mes: 'Dez', valor: 47100 },
  { mes: 'Jan', valor: 31900 },
  { mes: 'Fev', valor: 28700 },
];

const mockPendencias = [
  {
    id: '1',
    oficina: 'ThermoCar',
    placa: 'ABC-1D23',
    modelo: 'Scania R450',
    servico: 'Troca do compressor de ar-condicionado + filtro secador',
    valor: 4850.00,
    auditoria: 'verde' as const,
    iaMsg: 'Preço dentro da média regional. Peças compatíveis com o modelo.',
    data: '26/02/2026',
  },
  {
    id: '2',
    oficina: 'EngeMec',
    placa: 'DEF-5G67',
    modelo: 'Volvo FH 540',
    servico: 'Retífica do motor + troca de bronzinas e junta do cabeçote',
    valor: 18900.00,
    auditoria: 'amarelo' as const,
    iaMsg: 'Filtro de óleo 15% acima da média regional. Mão de obra compatível.',
    data: '25/02/2026',
  },
  {
    id: '3',
    oficina: 'Oskauto',
    placa: 'GHI-8J90',
    modelo: 'Mercedes Actros 2651',
    servico: 'Substituição do módulo de injeção eletrônica + reprogramação ECU',
    valor: 12300.00,
    auditoria: 'vermelho' as const,
    iaMsg: 'Valor do módulo 32% acima do fornecedor homologado. Solicite revisão.',
    data: '24/02/2026',
  },
];

const mockVeiculos = [
  { placa: 'ABC-1D23', modelo: 'Scania R450', ano: 2022, km: 185000, tipo: 'Caminhão', status: 'Em manutenção', servicos: 12 },
  { placa: 'DEF-5G67', modelo: 'Volvo FH 540', ano: 2021, km: 220000, tipo: 'Caminhão', status: 'Ativo', servicos: 8 },
  { placa: 'GHI-8J90', modelo: 'Mercedes Actros 2651', ano: 2023, km: 95000, tipo: 'Caminhão', status: 'Em manutenção', servicos: 4 },
  { placa: 'JKL-2M34', modelo: 'DAF XF 530', ano: 2022, km: 160000, tipo: 'Caminhão', status: 'Ativo', servicos: 15 },
  { placa: 'MNO-5P67', modelo: 'Iveco S-Way', ano: 2024, km: 45000, tipo: 'Caminhão', status: 'Ativo', servicos: 2 },
];

const mockNotas = [
  { id: 'NF-001', tipo: 'Serviço', emitente: 'ThermoCar', valor: 4850.00, data: '26/02/2026', status: 'Disponível' },
  { id: 'NF-002', tipo: 'Tecnologia', emitente: 'NovaLink', valor: 727.50, data: '26/02/2026', status: 'Disponível' },
  { id: 'NF-003', tipo: 'Serviço', emitente: 'EngeMec', valor: 8200.00, data: '20/02/2026', status: 'Disponível' },
  { id: 'NF-004', tipo: 'Tecnologia', emitente: 'NovaLink', valor: 1230.00, data: '20/02/2026', status: 'Disponível' },
];

const auditoriaConfig = {
  verde: { icon: ShieldCheck, label: 'Preço Justo', bg: 'bg-emerald-500/10', text: 'text-emerald-500', border: 'border-emerald-500/20' },
  amarelo: { icon: ShieldAlert, label: 'Atenção', bg: 'bg-amber-500/10', text: 'text-amber-500', border: 'border-amber-500/20' },
  vermelho: { icon: ShieldX, label: 'Sobrepreço', bg: 'bg-red-500/10', text: 'text-red-500', border: 'border-red-500/20' },
};

const GestaoFrotasOficinasSystem = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<UserRole>('select');
  const [activeTab, setActiveTab] = useState('dashboard');

  if (!user) {
    navigate('/auth');
    return null;
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
              <button
                onClick={() => setRole('frota')}
                className="group relative p-8 rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300 text-left"
              >
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary">Gestor</Badge>
                </div>
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Truck className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Operador de Frota</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Gerencie milhões em manutenção com poucos cliques. Aprove orçamentos auditados pela IA.
                    </p>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><Shield className="w-4 h-4 text-primary" /> IA anti-fraude nos orçamentos</li>
                    <li className="flex items-center gap-2"><Wallet className="w-4 h-4 text-primary" /> Controle financeiro total</li>
                    <li className="flex items-center gap-2"><Car className="w-4 h-4 text-primary" /> Histórico completo de revisões</li>
                  </ul>
                </div>
              </button>

              <button
                onClick={() => setRole('oficina')}
                className="group relative p-8 rounded-2xl border-2 border-border bg-card hover:border-primary/50 hover:shadow-lg transition-all duration-300 text-left"
              >
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary">Parceiro</Badge>
                </div>
                <div className="space-y-4">
                  <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                    <Wrench className="w-7 h-7 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-foreground mb-2">Operador de Oficina</h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Receba solicitações, envie orçamentos e receba pagamento em D+1.
                    </p>
                  </div>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2"><DollarSign className="w-4 h-4 text-emerald-500" /> Pagamento em D+1</li>
                    <li className="flex items-center gap-2"><FileText className="w-4 h-4 text-emerald-500" /> Receber solicitações</li>
                    <li className="flex items-center gap-2"><Star className="w-4 h-4 text-emerald-500" /> Avaliações e ranking</li>
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

  // ─── FROTA DASHBOARD (Complete Redesign) ───
  if (role === 'frota') {
    const saldoDisponivel = 185000;
    const economiaMes = 12450;
    const veiculosManutencao = 2;

    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-6">

          {/* Top Bar */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Painel do Gestor</h1>
              <p className="text-sm text-muted-foreground">NovaLink — Gestão Inteligente de Frotas</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setRole('select')}>
              Trocar Perfil
            </Button>
          </div>

          {/* ── 1. Dashboard de Impacto ── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-0 shadow-md bg-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-primary" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Saldo Disponível</span>
                </div>
                <p className="text-3xl font-bold text-foreground tracking-tight">
                  {saldoDisponivel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Para manutenções aprovadas</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Economia c/ IA</span>
                </div>
                <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {economiaMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Sobrepreços evitados este mês</p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-md bg-card">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                    <Wrench className="w-5 h-5 text-amber-500" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Em Manutenção</span>
                </div>
                <p className="text-3xl font-bold text-foreground tracking-tight">
                  {veiculosManutencao} <span className="text-base font-normal text-muted-foreground">veículos</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">Serviços em andamento agora</p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico de Gastos 6 Meses */}
          <Card className="border-0 shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                Gastos com Manutenção — Últimos 6 Meses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mockGastos6Meses} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="mes" axisLine={false} tickLine={false} className="text-xs" />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      className="text-xs"
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value: number) => [value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }), 'Gasto']}
                      contentStyle={{ borderRadius: '12px', border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                    />
                    <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Tabs para as seções */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-card border shadow-sm w-full justify-start overflow-x-auto">
              <TabsTrigger value="dashboard" className="gap-1.5"><Shield className="w-4 h-4" /> Aprovações</TabsTrigger>
              <TabsTrigger value="veiculos" className="gap-1.5"><Car className="w-4 h-4" /> Frota</TabsTrigger>
              <TabsTrigger value="financeiro" className="gap-1.5"><Receipt className="w-4 h-4" /> Extrato & NFs</TabsTrigger>
            </TabsList>

            {/* ── 2. Central de Aprovações ── */}
            <TabsContent value="dashboard" className="mt-4 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Central de Aprovações</h2>
                  <p className="text-sm text-muted-foreground">{mockPendencias.length} orçamentos aguardando sua decisão</p>
                </div>
                <Badge variant="secondary" className="text-xs">{mockPendencias.length} pendentes</Badge>
              </div>

              <div className="space-y-4">
                {mockPendencias.map((item) => {
                  const audit = auditoriaConfig[item.auditoria];
                  const AuditIcon = audit.icon;
                  return (
                    <Card key={item.id} className={`border-0 shadow-md overflow-hidden`}>
                      <div className={`h-1 ${item.auditoria === 'verde' ? 'bg-emerald-500' : item.auditoria === 'amarelo' ? 'bg-amber-500' : 'bg-red-500'}`} />
                      <CardContent className="p-5">
                        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                          {/* Left: Vehicle + Service Info */}
                          <div className="flex-1 min-w-0 space-y-2">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-mono font-bold text-foreground text-lg">{item.placa}</span>
                              <span className="text-sm text-muted-foreground">·</span>
                              <span className="text-sm text-muted-foreground">{item.modelo}</span>
                              <span className="text-sm text-muted-foreground">·</span>
                              <span className="text-sm font-medium text-muted-foreground">{item.oficina}</span>
                            </div>
                            <p className="text-sm text-foreground">{item.servico}</p>
                            
                            {/* Selo de Auditoria */}
                            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${audit.bg} border ${audit.border}`}>
                              <AuditIcon className={`w-4 h-4 ${audit.text}`} />
                              <span className={`text-xs font-semibold ${audit.text}`}>{audit.label}</span>
                              <span className="text-xs text-muted-foreground">— {item.iaMsg}</span>
                            </div>
                          </div>

                          {/* Right: Value + Actions */}
                          <div className="flex flex-col items-end gap-3 shrink-0">
                            <div className="text-right">
                              <p className="text-2xl font-bold text-foreground">
                                {item.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                              </p>
                              <p className="text-xs text-muted-foreground">{item.data}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button size="lg" className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-md">
                                <Check className="w-5 h-5" />
                                Aprovar Serviço
                              </Button>
                              <Button size="lg" variant="outline" className="gap-2">
                                <MessageCircle className="w-5 h-5" />
                                Questionar
                              </Button>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>

            {/* ── 3. Gestão de Veículos e Motoristas ── */}
            <TabsContent value="veiculos" className="mt-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Minha Frota</h2>
                  <p className="text-sm text-muted-foreground">{mockVeiculos.length} veículos cadastrados</p>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1.5"><Plus className="w-4 h-4" /> Novo Veículo</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cadastrar Veículo</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <Input placeholder="Placa (ex: ABC-1D23)" />
                      <Input placeholder="Modelo (ex: Scania R450)" />
                      <div className="grid grid-cols-2 gap-3">
                        <Input placeholder="Ano" type="number" />
                        <Input placeholder="KM Atual" type="number" />
                      </div>
                      <Select>
                        <SelectTrigger><SelectValue placeholder="Tipo de veículo" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="caminhao">Caminhão</SelectItem>
                          <SelectItem value="carreta">Carreta</SelectItem>
                          <SelectItem value="van">Van</SelectItem>
                          <SelectItem value="carro">Carro</SelectItem>
                          <SelectItem value="onibus">Ônibus</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Chassi (opcional)" />
                      <Button className="w-full">Cadastrar Veículo</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Vehicles Table */}
              <Card className="border-0 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">PLACA</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">MODELO</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 hidden sm:table-cell">ANO</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 hidden md:table-cell">KM</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">STATUS</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 hidden sm:table-cell">SERVIÇOS</th>
                        <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockVeiculos.map((v) => (
                        <tr key={v.placa} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-4">
                            <span className="font-mono font-bold text-foreground">{v.placa}</span>
                          </td>
                          <td className="px-5 py-4 text-sm text-foreground">{v.modelo}</td>
                          <td className="px-5 py-4 text-sm text-muted-foreground hidden sm:table-cell">{v.ano}</td>
                          <td className="px-5 py-4 text-sm text-muted-foreground hidden md:table-cell">{v.km.toLocaleString('pt-BR')} km</td>
                          <td className="px-5 py-4">
                            <Badge variant={v.status === 'Ativo' ? 'secondary' : 'default'} className={`text-xs ${v.status === 'Em manutenção' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' : ''}`}>
                              {v.status}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-sm text-muted-foreground hidden sm:table-cell">{v.servicos} registros</td>
                          <td className="px-5 py-4 text-right">
                            <Button variant="ghost" size="sm" className="gap-1 text-xs">
                              <History className="w-3.5 h-3.5" /> Histórico
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </TabsContent>

            {/* ── 4. Extrato e Notas Fiscais ── */}
            <TabsContent value="financeiro" className="mt-4 space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Extrato & Notas Fiscais</h2>
                  <p className="text-sm text-muted-foreground">Baixe NFs de serviço e de tecnologia em um clique</p>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Download className="w-4 h-4" /> Baixar Todas
                </Button>
              </div>

              <Card className="border-0 shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/30">
                        <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">Nº NF</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">TIPO</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3">EMITENTE</th>
                        <th className="text-left text-xs font-semibold text-muted-foreground px-5 py-3 hidden sm:table-cell">DATA</th>
                        <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3">VALOR</th>
                        <th className="text-right text-xs font-semibold text-muted-foreground px-5 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {mockNotas.map((nf) => (
                        <tr key={nf.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-4">
                            <span className="font-mono text-sm font-medium text-foreground">{nf.id}</span>
                          </td>
                          <td className="px-5 py-4">
                            <Badge variant="secondary" className={`text-xs ${nf.tipo === 'Tecnologia' ? 'bg-primary/10 text-primary border-primary/20' : ''}`}>
                              {nf.tipo === 'Serviço' ? '🔧 Serviço' : '💻 Tecnologia'}
                            </Badge>
                          </td>
                          <td className="px-5 py-4 text-sm text-foreground">{nf.emitente}</td>
                          <td className="px-5 py-4 text-sm text-muted-foreground hidden sm:table-cell">{nf.data}</td>
                          <td className="px-5 py-4 text-right">
                            <span className="font-semibold text-foreground">
                              {nf.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <Button variant="ghost" size="sm" className="gap-1 text-xs">
                              <Download className="w-3.5 h-3.5" /> PDF
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Resumo fiscal */}
              <div className="grid sm:grid-cols-2 gap-4">
                <Card className="border-0 shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <Wrench className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">NFs de Serviço (Oficinas)</span>
                    </div>
                    <p className="text-2xl font-bold text-foreground">R$ 13.050,00</p>
                    <p className="text-xs text-muted-foreground mt-1">2 notas neste período</p>
                  </CardContent>
                </Card>
                <Card className="border-0 shadow-md">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-2">
                      <Zap className="w-5 h-5 text-primary" />
                      <span className="text-sm font-medium text-muted-foreground">NFs de Tecnologia (NovaLink)</span>
                    </div>
                    <p className="text-2xl font-bold text-primary">R$ 1.957,50</p>
                    <p className="text-xs text-muted-foreground mt-1">15% de comissão · 2 notas</p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

        </main>

        {/* ── 5. Botão Flutuante WhatsApp ── */}
        <a
          href="https://wa.me/5599999999999?text=Olá%20NovaLink,%20preciso%20de%20suporte!"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
          title="Suporte via WhatsApp"
        >
          <MessageCircle className="w-6 h-6 text-white" />
          <span className="absolute right-16 bg-card border shadow-md text-foreground text-xs font-medium px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Falar com Suporte
          </span>
        </a>

        <Footer />
      </div>
    );
  }

  // ─── OFICINA PORTAL (Complete Redesign) ───
  return <OficinaPortal onSwitchRole={() => setRole('select')} />;
};

export default GestaoFrotasOficinasSystem;
