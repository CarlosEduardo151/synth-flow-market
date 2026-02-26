import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import {
  ArrowLeft,
  FileText,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  Building2,
  Send,
  Settings,
  Webhook,
  Copy,
  Eye,
  Filter,
  Download,
  Search,
  Zap,
  ShieldCheck,
  Receipt,
  ArrowRight,
  Sparkles,
  Info,
  Trash2,
  Edit,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  Banknote,
  LayoutDashboard,
  FileCheck,
  BookOpen
} from 'lucide-react';

/* ─── Types ─── */
interface Invoice {
  id: string;
  customer: string;
  cnpj: string;
  value: number;
  status: 'authorized' | 'rejected' | 'processing' | 'pending' | 'cancelled';
  type: 'NF-e' | 'NFS-e';
  issuedAt: string;
  number: string;
  description: string;
}

interface Company {
  id: string;
  name: string;
  cnpj: string;
  regime: string;
  isActive: boolean;
}

/* ─── Mock data ─── */
const mockInvoices: Invoice[] = [
  { id: 'NF-001', customer: 'Tech Solutions Ltda', cnpj: '12.345.678/0001-90', value: 4500.00, status: 'authorized', type: 'NF-e', issuedAt: '2026-02-26T10:30:00', number: '000001', description: 'Licença de Software - Plano Pro' },
  { id: 'NF-002', customer: 'Digital Commerce SA', cnpj: '98.765.432/0001-10', value: 12800.00, status: 'authorized', type: 'NFS-e', issuedAt: '2026-02-25T14:15:00', number: '000002', description: 'Consultoria em Transformação Digital' },
  { id: 'NF-003', customer: 'Startup Inovação ME', cnpj: '11.222.333/0001-44', value: 950.00, status: 'rejected', type: 'NF-e', issuedAt: '2026-02-25T09:00:00', number: '000003', description: 'Suporte Técnico Mensal' },
  { id: 'NF-004', customer: 'Logística Express Ltda', cnpj: '55.666.777/0001-88', value: 7200.00, status: 'processing', type: 'NF-e', issuedAt: '2026-02-26T11:45:00', number: '000004', description: 'Implantação de Sistema ERP' },
  { id: 'NF-005', customer: 'Consultoria Premium', cnpj: '33.444.555/0001-22', value: 3200.00, status: 'authorized', type: 'NFS-e', issuedAt: '2026-02-24T16:30:00', number: '000005', description: 'Mentoria Empresarial' },
  { id: 'NF-006', customer: 'Varejo Digital ME', cnpj: '77.888.999/0001-66', value: 1850.00, status: 'pending', type: 'NF-e', issuedAt: '2026-02-26T08:00:00', number: '000006', description: 'Manutenção de E-commerce' },
];

const mockCompanies: Company[] = [
  { id: '1', name: 'NovaLink Tecnologia Ltda', cnpj: '12.345.678/0001-90', regime: 'Simples Nacional', isActive: true },
];

const statusMap = {
  authorized: { label: 'Autorizada', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30', icon: CheckCircle2, dot: 'bg-emerald-500' },
  rejected:   { label: 'Rejeitada',  bg: 'bg-red-500/10',     text: 'text-red-400',     border: 'border-red-500/30',     icon: XCircle,      dot: 'bg-red-500' },
  processing: { label: 'Processando',bg: 'bg-blue-500/10',    text: 'text-blue-400',    border: 'border-blue-500/30',    icon: RefreshCw,    dot: 'bg-blue-500' },
  pending:    { label: 'Pendente',   bg: 'bg-amber-500/10',   text: 'text-amber-400',   border: 'border-amber-500/30',   icon: Clock,        dot: 'bg-amber-500' },
  cancelled:  { label: 'Cancelada',  bg: 'bg-gray-500/10',    text: 'text-gray-400',    border: 'border-gray-500/30',    icon: XCircle,      dot: 'bg-gray-500' },
};

/* ─── Guided Setup Steps ─── */
const setupSteps = [
  { key: 'company', label: 'Cadastrar Empresa', desc: 'Adicione seu CNPJ e dados fiscais', icon: Building2 },
  { key: 'provider', label: 'Conectar Emissor', desc: 'Focus NFe ou PlugNotas', icon: Zap },
  { key: 'webhook', label: 'Configurar Webhook', desc: 'Receba vendas automaticamente', icon: Webhook },
  { key: 'test', label: 'Testar Emissão', desc: 'Envie uma nota em homologação', icon: Send },
];

/* ─── Component ─── */
export default function InvoiceAutomationSystem() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [invoices] = useState(mockInvoices);
  const [companies, setCompanies] = useState(mockCompanies);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showNewInvoiceDialog, setShowNewInvoiceDialog] = useState(false);
  const [showNewCompanyDialog, setShowNewCompanyDialog] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // Setup progress
  const [completedSteps, setCompletedSteps] = useState<string[]>(['company']);
  const setupProgress = (completedSteps.length / setupSteps.length) * 100;

  // New invoice form
  const [newInvoice, setNewInvoice] = useState({ customerName: '', cnpj: '', description: '', value: '', type: 'NF-e' as 'NF-e' | 'NFS-e' });

  // New company form
  const [newCompany, setNewCompany] = useState({ name: '', cnpj: '', regime: 'simples' });

  // Settings
  const [provider, setProvider] = useState('focus');
  const [apiToken, setApiToken] = useState('');
  const [environment, setEnvironment] = useState('homologation');

  const webhookToken = 'tok_nf_' + (user?.id?.slice(0, 16) || 'demo');

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground text-sm">Carregando painel…</p>
        </div>
      </div>
    );
  }
  if (!user) return null;

  /* ─── Computed ─── */
  const filtered = invoices
    .filter(i => filterStatus === 'all' || i.status === filterStatus)
    .filter(i =>
      searchQuery === '' ||
      i.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.number.includes(searchQuery) ||
      i.cnpj.includes(searchQuery)
    );

  const stats = {
    authorized: invoices.filter(i => i.status === 'authorized'),
    pending: invoices.filter(i => i.status === 'pending' || i.status === 'processing'),
    rejected: invoices.filter(i => i.status === 'rejected'),
  };
  const totalAuthorized = stats.authorized.reduce((s, i) => s + i.value, 0);
  const totalPending = stats.pending.reduce((s, i) => s + i.value, 0);
  const commission = totalAuthorized * 0.15;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: '✅ Copiado!', description: 'Texto copiado para a área de transferência.' });
  };

  const handleCreateInvoice = () => {
    if (!newInvoice.customerName || !newInvoice.cnpj || !newInvoice.value) {
      toast({ title: '⚠️ Preencha todos os campos', variant: 'destructive' });
      return;
    }
    toast({ title: '🧾 Nota fiscal criada!', description: `NF para ${newInvoice.customerName} enviada para processamento.` });
    setShowNewInvoiceDialog(false);
    setNewInvoice({ customerName: '', cnpj: '', description: '', value: '', type: 'NF-e' });
  };

  const handleCreateCompany = () => {
    if (!newCompany.name || !newCompany.cnpj) {
      toast({ title: '⚠️ Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setCompanies([...companies, {
      id: String(companies.length + 1),
      name: newCompany.name,
      cnpj: newCompany.cnpj,
      regime: newCompany.regime === 'simples' ? 'Simples Nacional' : newCompany.regime === 'presumido' ? 'Lucro Presumido' : 'Lucro Real',
      isActive: true,
    }]);
    toast({ title: '🏢 Empresa cadastrada!', description: `${newCompany.name} foi adicionada com sucesso.` });
    setShowNewCompanyDialog(false);
    setNewCompany({ name: '', cnpj: '', regime: 'simples' });
    if (!completedSteps.includes('company')) setCompletedSteps([...completedSteps, 'company']);
  };

  const handleSaveSettings = () => {
    if (!apiToken) {
      toast({ title: '⚠️ Insira o token da API', variant: 'destructive' });
      return;
    }
    toast({ title: '✅ Configurações salvas!', description: `Emissor ${provider === 'focus' ? 'Focus NFe' : 'PlugNotas'} conectado em modo ${environment === 'homologation' ? 'homologação' : 'produção'}.` });
    if (!completedSteps.includes('provider')) setCompletedSteps([...completedSteps, 'provider']);
  };

  const handleCompleteStep = (step: string) => {
    if (!completedSteps.includes(step)) setCompletedSteps([...completedSteps, step]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6 space-y-6 max-w-7xl">

        {/* ─── TOP BAR ─── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" asChild className="shrink-0">
              <Link to="/meus-produtos"><ArrowLeft className="w-5 h-5" /></Link>
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Receipt className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-xl font-bold">Automação de Notas Fiscais</h1>
              </div>
              <p className="text-xs text-muted-foreground ml-9">Emissão automática NF-e / NFS-e · Motor NovaLink</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-emerald-500/50 text-emerald-400 text-xs">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5 animate-pulse" />
              Online
            </Badge>
            <Button size="sm" onClick={() => { setActiveTab('invoices'); setShowNewInvoiceDialog(true); }}>
              <Plus className="h-4 w-4 mr-1.5" />
              Nova NF
            </Button>
          </div>
        </div>

        {/* ─── SETUP GUIDE (shows if not all steps complete) ─── */}
        {completedSteps.length < setupSteps.length && (
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">Configuração Inicial</span>
                </div>
                <span className="text-xs text-muted-foreground">{completedSteps.length}/{setupSteps.length} etapas</span>
              </div>
              <Progress value={setupProgress} className="h-1.5 mb-4" />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {setupSteps.map((step) => {
                  const done = completedSteps.includes(step.key);
                  const StepIcon = step.icon;
                  return (
                    <button
                      key={step.key}
                      onClick={() => {
                        if (step.key === 'company') { setActiveTab('companies'); }
                        else if (step.key === 'provider') { setActiveTab('settings'); }
                        else if (step.key === 'webhook') { setActiveTab('webhook'); }
                        else if (step.key === 'test') { setActiveTab('webhook'); }
                      }}
                      className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                        done
                          ? 'border-emerald-500/30 bg-emerald-500/5 opacity-70'
                          : 'border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${done ? 'bg-emerald-500/10' : 'bg-muted'}`}>
                        {done ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <StepIcon className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-medium ${done ? 'line-through text-muted-foreground' : ''}`}>{step.label}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{step.desc}</p>
                      </div>
                      {!done && <ChevronRight className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* ─── KPI CARDS ─── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { label: 'Autorizadas', value: stats.authorized.length, money: totalAuthorized, color: 'emerald', icon: FileCheck },
            { label: 'Pendentes', value: stats.pending.length, money: totalPending, color: 'amber', icon: Clock },
            { label: 'Rejeitadas', value: stats.rejected.length, money: null, color: 'red', icon: AlertTriangle },
            { label: 'Comissão 15%', value: null, money: commission, color: 'primary', icon: Banknote },
          ].map((kpi, i) => (
            <Card key={i} className="overflow-hidden">
              <CardContent className="pt-4 pb-3 px-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{kpi.label}</p>
                    {kpi.value !== null && (
                      <p className={`text-2xl font-bold ${
                        kpi.color === 'emerald' ? 'text-emerald-400' :
                        kpi.color === 'amber' ? 'text-amber-400' :
                        kpi.color === 'red' ? 'text-red-400' : 'text-primary'
                      }`}>{kpi.value}</p>
                    )}
                    {kpi.money !== null && (
                      <p className={`${kpi.value !== null ? 'text-xs text-muted-foreground' : 'text-xl font-bold text-primary'}`}>
                        R$ {kpi.money.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </p>
                    )}
                  </div>
                  <div className={`p-2 rounded-lg ${
                    kpi.color === 'emerald' ? 'bg-emerald-500/10' :
                    kpi.color === 'amber' ? 'bg-amber-500/10' :
                    kpi.color === 'red' ? 'bg-red-500/10' : 'bg-primary/10'
                  }`}>
                    <kpi.icon className={`h-5 w-5 ${
                      kpi.color === 'emerald' ? 'text-emerald-500/60' :
                      kpi.color === 'amber' ? 'text-amber-500/60' :
                      kpi.color === 'red' ? 'text-red-500/60' : 'text-primary/60'
                    }`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ─── MAIN TABS ─── */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full justify-start bg-muted/50 p-1 overflow-x-auto">
            <TabsTrigger value="dashboard" className="gap-1.5 text-xs"><LayoutDashboard className="h-3.5 w-3.5" />Visão Geral</TabsTrigger>
            <TabsTrigger value="invoices" className="gap-1.5 text-xs"><FileText className="h-3.5 w-3.5" />Notas Fiscais</TabsTrigger>
            <TabsTrigger value="companies" className="gap-1.5 text-xs"><Building2 className="h-3.5 w-3.5" />Empresas</TabsTrigger>
            <TabsTrigger value="webhook" className="gap-1.5 text-xs"><Webhook className="h-3.5 w-3.5" />Integrações</TabsTrigger>
            <TabsTrigger value="settings" className="gap-1.5 text-xs"><Settings className="h-3.5 w-3.5" />Configurações</TabsTrigger>
          </TabsList>

          {/* ═══════ DASHBOARD TAB ═══════ */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Recent Activity */}
              <Card className="lg:col-span-2">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Últimas Notas Fiscais
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y divide-border">
                    {invoices.slice(0, 5).map((inv) => {
                      const s = statusMap[inv.status];
                      return (
                        <div key={inv.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium truncate">{inv.customer}</p>
                              <p className="text-xs text-muted-foreground">{inv.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span className="text-sm font-medium">R$ {inv.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${s.bg} ${s.text} ${s.border}`}>{s.label}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <div className="space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Ações Rápidas</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Button className="w-full justify-start gap-2 h-10" variant="outline" onClick={() => { setActiveTab('invoices'); setShowNewInvoiceDialog(true); }}>
                      <Plus className="h-4 w-4 text-primary" />
                      <span className="text-sm">Emitir Nova Nota Fiscal</span>
                    </Button>
                    <Button className="w-full justify-start gap-2 h-10" variant="outline" onClick={() => setActiveTab('companies')}>
                      <Building2 className="h-4 w-4 text-primary" />
                      <span className="text-sm">Cadastrar Empresa</span>
                    </Button>
                    <Button className="w-full justify-start gap-2 h-10" variant="outline" onClick={() => setActiveTab('webhook')}>
                      <Webhook className="h-4 w-4 text-primary" />
                      <span className="text-sm">Configurar Webhook</span>
                    </Button>
                    <Button className="w-full justify-start gap-2 h-10" variant="outline" onClick={() => setActiveTab('settings')}>
                      <Settings className="h-4 w-4 text-primary" />
                      <span className="text-sm">Conectar Emissor Fiscal</span>
                    </Button>
                  </CardContent>
                </Card>

                <Card className="border-primary/20">
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Split de Pagamento</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-center">
                        <p className="text-lg font-bold text-emerald-400">85%</p>
                        <p className="text-[10px] text-muted-foreground">Cliente</p>
                      </div>
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-center">
                        <p className="text-lg font-bold text-primary">15%</p>
                        <p className="text-[10px] text-muted-foreground">NovaLink</p>
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground text-center">Separação automática a cada nota autorizada</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ═══════ INVOICES TAB ═══════ */}
          <TabsContent value="invoices" className="space-y-4">
            {/* Search & filters bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por cliente, número ou CNPJ…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px] h-9 text-xs">
                    <Filter className="h-3 w-3 mr-1" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    <SelectItem value="authorized">Autorizadas</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="processing">Processando</SelectItem>
                    <SelectItem value="rejected">Rejeitadas</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-9 text-xs">
                  <Download className="h-3 w-3 mr-1" />Excel
                </Button>
                <Dialog open={showNewInvoiceDialog} onOpenChange={setShowNewInvoiceDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-9 text-xs">
                      <Plus className="h-3 w-3 mr-1" />Nova NF
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-lg">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-primary" />
                        Emitir Nova Nota Fiscal
                      </DialogTitle>
                      <DialogDescription>Preencha os dados para gerar e enviar a nota fiscal automaticamente.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-2">
                      <div className="grid grid-cols-2 gap-3">
                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-xs">Nome do Cliente / Razão Social</Label>
                          <Input
                            placeholder="Ex: Empresa XYZ Ltda"
                            value={newInvoice.customerName}
                            onChange={(e) => setNewInvoice({ ...newInvoice, customerName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">CNPJ</Label>
                          <Input
                            placeholder="00.000.000/0000-00"
                            value={newInvoice.cnpj}
                            onChange={(e) => setNewInvoice({ ...newInvoice, cnpj: e.target.value })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs">Tipo da Nota</Label>
                          <Select value={newInvoice.type} onValueChange={(v) => setNewInvoice({ ...newInvoice, type: v as any })}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="NF-e">NF-e (Produto)</SelectItem>
                              <SelectItem value="NFS-e">NFS-e (Serviço)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-xs">Descrição do Produto/Serviço</Label>
                          <Input
                            placeholder="Ex: Consultoria Mensal"
                            value={newInvoice.description}
                            onChange={(e) => setNewInvoice({ ...newInvoice, description: e.target.value })}
                          />
                        </div>
                        <div className="col-span-2 space-y-1.5">
                          <Label className="text-xs">Valor Total (R$)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0,00"
                            value={newInvoice.value}
                            onChange={(e) => setNewInvoice({ ...newInvoice, value: e.target.value })}
                          />
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                        <Info className="h-4 w-4 shrink-0" />
                        <span>A nota será validada e enviada automaticamente à SEFAZ/Prefeitura. Você pode acompanhar o status em tempo real.</span>
                      </div>
                      <div className="flex gap-2 justify-end">
                        <Button variant="outline" onClick={() => setShowNewInvoiceDialog(false)}>Cancelar</Button>
                        <Button onClick={handleCreateInvoice}>
                          <Send className="h-4 w-4 mr-1.5" />
                          Emitir Nota Fiscal
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Table */}
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs w-[80px]">Nº</TableHead>
                      <TableHead className="text-xs">Cliente</TableHead>
                      <TableHead className="text-xs hidden md:table-cell">CNPJ</TableHead>
                      <TableHead className="text-xs">Tipo</TableHead>
                      <TableHead className="text-xs text-right">Valor</TableHead>
                      <TableHead className="text-xs">Status</TableHead>
                      <TableHead className="text-xs hidden lg:table-cell">Data</TableHead>
                      <TableHead className="text-xs w-[80px]">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-sm">
                          Nenhuma nota fiscal encontrada.
                        </TableCell>
                      </TableRow>
                    ) : filtered.map((inv) => {
                      const s = statusMap[inv.status];
                      return (
                        <TableRow key={inv.id} className="group">
                          <TableCell className="font-mono text-xs">{inv.number}</TableCell>
                          <TableCell>
                            <div>
                              <p className="text-sm font-medium">{inv.customer}</p>
                              <p className="text-[11px] text-muted-foreground">{inv.description}</p>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden md:table-cell">{inv.cnpj}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{inv.type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm font-medium text-right tabular-nums">
                            R$ {inv.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border ${s.bg} ${s.text} ${s.border}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                              {s.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground hidden lg:table-cell">
                            {new Date(inv.issuedAt).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-0.5 opacity-50 group-hover:opacity-100 transition-opacity">
                              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => setSelectedInvoice(inv)}>
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {inv.status === 'rejected' && (
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-blue-400" onClick={() => toast({ title: '🔄 Reenviando…', description: 'A nota está sendo reprocessada.' })}>
                                  <RefreshCw className="h-3.5 w-3.5" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {/* Invoice detail dialog */}
            <Dialog open={!!selectedInvoice} onOpenChange={(v) => !v && setSelectedInvoice(null)}>
              <DialogContent className="max-w-md">
                {selectedInvoice && (() => {
                  const s = statusMap[selectedInvoice.status];
                  return (
                    <>
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          <FileText className="h-5 w-5 text-primary" />
                          Nota Fiscal #{selectedInvoice.number}
                        </DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border ${s.bg} ${s.text} ${s.border}`}>
                            <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                            {s.label}
                          </span>
                          <Badge variant="outline">{selectedInvoice.type}</Badge>
                        </div>
                        <Separator />
                        <div className="space-y-3 text-sm">
                          <div className="flex justify-between"><span className="text-muted-foreground">Cliente</span><span className="font-medium">{selectedInvoice.customer}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">CNPJ</span><span className="font-mono text-xs">{selectedInvoice.cnpj}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Descrição</span><span className="text-right max-w-[200px]">{selectedInvoice.description}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Valor</span><span className="font-bold">R$ {selectedInvoice.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Data de emissão</span><span>{new Date(selectedInvoice.issuedAt).toLocaleString('pt-BR')}</span></div>
                          <Separator />
                          <div className="flex justify-between"><span className="text-muted-foreground">Comissão (15%)</span><span className="text-primary font-medium">R$ {(selectedInvoice.value * 0.15).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Repasse cliente (85%)</span><span className="text-emerald-400 font-medium">R$ {(selectedInvoice.value * 0.85).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" className="flex-1 text-xs" size="sm"><Download className="h-3 w-3 mr-1" />Baixar XML</Button>
                          <Button variant="outline" className="flex-1 text-xs" size="sm"><Download className="h-3 w-3 mr-1" />Baixar PDF</Button>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* ═══════ COMPANIES TAB ═══════ */}
          <TabsContent value="companies" className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Empresas Cadastradas</h2>
                <p className="text-xs text-muted-foreground">Gerencie os CNPJs que podem emitir notas fiscais</p>
              </div>
              <Dialog open={showNewCompanyDialog} onOpenChange={setShowNewCompanyDialog}>
                <DialogTrigger asChild>
                  <Button size="sm"><Plus className="h-4 w-4 mr-1.5" />Nova Empresa</Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-primary" />
                      Cadastrar Nova Empresa
                    </DialogTitle>
                    <DialogDescription>Adicione um CNPJ para começar a emitir notas fiscais.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Razão Social</Label>
                      <Input placeholder="Ex: Minha Empresa Ltda" value={newCompany.name} onChange={(e) => setNewCompany({ ...newCompany, name: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">CNPJ</Label>
                      <Input placeholder="00.000.000/0000-00" value={newCompany.cnpj} onChange={(e) => setNewCompany({ ...newCompany, cnpj: e.target.value })} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Regime Tributário</Label>
                      <Select value={newCompany.regime} onValueChange={(v) => setNewCompany({ ...newCompany, regime: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="simples">Simples Nacional</SelectItem>
                          <SelectItem value="presumido">Lucro Presumido</SelectItem>
                          <SelectItem value="real">Lucro Real</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 text-xs text-muted-foreground">
                      <HelpCircle className="h-4 w-4 shrink-0" />
                      <span>Você precisará do Certificado Digital A1 para emissão em produção.</span>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={() => setShowNewCompanyDialog(false)}>Cancelar</Button>
                      <Button onClick={handleCreateCompany}><Plus className="h-4 w-4 mr-1" />Cadastrar</Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid gap-3">
              {companies.map((company) => (
                <Card key={company.id}>
                  <CardContent className="py-4 px-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-primary/10 rounded-xl">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{company.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-muted-foreground font-mono">{company.cnpj}</span>
                            <span className="text-xs text-muted-foreground">·</span>
                            <span className="text-xs text-muted-foreground">{company.regime}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={company.isActive ? 'border-emerald-500/30 text-emerald-400 text-[10px]' : 'text-[10px]'}>
                          {company.isActive ? 'Ativa' : 'Inativa'}
                        </Badge>
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0"><Edit className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ═══════ WEBHOOK TAB ═══════ */}
          <TabsContent value="webhook" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2"><Webhook className="h-4 w-4 text-primary" />Endpoint do Webhook</CardTitle>
                  <CardDescription className="text-xs">Envie os dados de cada venda para este endpoint via POST.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">URL (POST)</Label>
                    <div className="flex gap-2">
                      <Input readOnly value="https://api.novalink.com/webhook/invoice/receive" className="font-mono text-xs h-9" />
                      <Button variant="outline" size="sm" className="shrink-0 h-9" onClick={() => copyToClipboard('https://api.novalink.com/webhook/invoice/receive')}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">Token de Autenticação</Label>
                    <div className="flex gap-2">
                      <Input readOnly value={webhookToken} className="font-mono text-xs h-9" />
                      <Button variant="outline" size="sm" className="shrink-0 h-9" onClick={() => copyToClipboard(webhookToken)}>
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                  <Separator className="my-2" />
                  <Button
                    className="w-full"
                    size="sm"
                    onClick={() => {
                      toast({ title: '🧪 Venda de teste enviada!', description: 'A nota está sendo processada em homologação.' });
                      handleCompleteStep('test');
                      handleCompleteStep('webhook');
                    }}
                  >
                    <Send className="h-4 w-4 mr-1.5" />
                    Enviar Venda de Teste
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2"><BookOpen className="h-4 w-4 text-primary" />Exemplo de Payload</CardTitle>
                  <CardDescription className="text-xs">Formato JSON esperado pelo webhook.</CardDescription>
                </CardHeader>
                <CardContent>
                  <pre className="text-[11px] leading-relaxed bg-muted/50 p-4 rounded-lg border overflow-x-auto font-mono">
{`POST /webhook/invoice/receive
Authorization: Bearer ${webhookToken.slice(0, 20)}...

{
  "sale_id": "venda-123",
  "customer": {
    "name": "Empresa Ltda",
    "cnpj": "12.345.678/0001-90",
    "address": {
      "street": "Rua A, 100",
      "city": "São Paulo",
      "state": "SP",
      "zip": "01000-000"
    }
  },
  "items": [
    {
      "description": "Consultoria",
      "quantity": 1,
      "unit_price": 1500.00,
      "ncm": "00000000"
    }
  ],
  "total": 1500.00,
  "payment_method": "pix"
}`}
                  </pre>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ═══════ SETTINGS TAB ═══════ */}
          <TabsContent value="settings" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-primary" />Emissor Fiscal</CardTitle>
                  <CardDescription className="text-xs">Conecte seu provedor de emissão de notas fiscais.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Provedor</Label>
                    <Select value={provider} onValueChange={setProvider}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="focus">
                          <div className="flex items-center gap-2"><Zap className="h-3 w-3" />Focus NFe</div>
                        </SelectItem>
                        <SelectItem value="plugnotas">
                          <div className="flex items-center gap-2"><Zap className="h-3 w-3" />PlugNotas</div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">API Token</Label>
                    <Input
                      type="password"
                      placeholder="Cole aqui sua API Key do emissor"
                      value={apiToken}
                      onChange={(e) => setApiToken(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground">Encontre no painel do {provider === 'focus' ? 'Focus NFe' : 'PlugNotas'} → Configurações → API</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Ambiente</Label>
                    <Select value={environment} onValueChange={setEnvironment}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="homologation">🧪 Homologação (Testes)</SelectItem>
                        <SelectItem value="production">🚀 Produção (Real)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {environment === 'production' && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400">
                      <AlertTriangle className="h-4 w-4 shrink-0" />
                      <span>Em produção, as notas serão enviadas de verdade à SEFAZ/Prefeitura.</span>
                    </div>
                  )}
                  <Button className="w-full" onClick={handleSaveSettings}>
                    <CheckCircle2 className="h-4 w-4 mr-1.5" />
                    Salvar e Conectar
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2"><Banknote className="h-4 w-4 text-primary" />Split de Pagamento</CardTitle>
                  <CardDescription className="text-xs">Separação automática de comissão sobre cada nota autorizada.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center space-y-1">
                      <p className="text-3xl font-bold text-emerald-400">85%</p>
                      <p className="text-xs text-muted-foreground">Repasse ao Cliente</p>
                      <p className="text-[10px] text-emerald-400/60">Depositado automaticamente</p>
                    </div>
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 text-center space-y-1">
                      <p className="text-3xl font-bold text-primary">15%</p>
                      <p className="text-xs text-muted-foreground">Comissão NovaLink</p>
                      <p className="text-[10px] text-primary/60">Retido na fonte</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <p className="text-xs font-medium flex items-center gap-1.5"><Info className="h-3 w-3" />Como funciona</p>
                    <ol className="text-[11px] text-muted-foreground space-y-1 list-decimal list-inside">
                      <li>A venda chega via webhook ou é emitida manualmente</li>
                      <li>O sistema valida os dados e emite a NF automaticamente</li>
                      <li>Após autorização, o valor é dividido: 85% cliente + 15% NovaLink</li>
                      <li>O repasse é feito automaticamente para a conta configurada</li>
                    </ol>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
