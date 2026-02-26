import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
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
import { Textarea } from '@/components/ui/textarea';
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
  BarChart3,
  Settings,
  Webhook,
  Copy,
  Eye,
  Filter,
  Download
} from 'lucide-react';

// Mock data for the MVP dashboard
const mockInvoices = [
  { id: 'NF-001', customer: 'Tech Solutions Ltda', cnpj: '12.345.678/0001-90', value: 4500.00, status: 'authorized', type: 'NF-e', issuedAt: '2026-02-26T10:30:00', number: '000001' },
  { id: 'NF-002', customer: 'Digital Commerce SA', cnpj: '98.765.432/0001-10', value: 12800.00, status: 'authorized', type: 'NFS-e', issuedAt: '2026-02-25T14:15:00', number: '000002' },
  { id: 'NF-003', customer: 'Startup Inovação ME', cnpj: '11.222.333/0001-44', value: 950.00, status: 'rejected', type: 'NF-e', issuedAt: '2026-02-25T09:00:00', number: '000003' },
  { id: 'NF-004', customer: 'Logística Express Ltda', cnpj: '55.666.777/0001-88', value: 7200.00, status: 'processing', type: 'NF-e', issuedAt: '2026-02-26T11:45:00', number: '000004' },
  { id: 'NF-005', customer: 'Consultoria Premium', cnpj: '33.444.555/0001-22', value: 3200.00, status: 'authorized', type: 'NFS-e', issuedAt: '2026-02-24T16:30:00', number: '000005' },
  { id: 'NF-006', customer: 'Varejo Digital ME', cnpj: '77.888.999/0001-66', value: 1850.00, status: 'pending', type: 'NF-e', issuedAt: '2026-02-26T08:00:00', number: '000006' },
];

const statusConfig: Record<string, { label: string; color: string; icon: typeof CheckCircle2 }> = {
  authorized: { label: 'Autorizada', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400', icon: CheckCircle2 },
  rejected: { label: 'Rejeitada', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400', icon: XCircle },
  processing: { label: 'Processando', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400', icon: RefreshCw },
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400', icon: Clock },
  cancelled: { label: 'Cancelada', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400', icon: XCircle },
};

export default function InvoiceAutomationSystem() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [invoices] = useState(mockInvoices);
  const [filterStatus, setFilterStatus] = useState('all');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookToken] = useState('tok_nf_' + crypto.randomUUID().slice(0, 16));

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) return null;

  const filteredInvoices = filterStatus === 'all'
    ? invoices
    : invoices.filter(i => i.status === filterStatus);

  const totalAuthorized = invoices.filter(i => i.status === 'authorized').reduce((s, i) => s + i.value, 0);
  const totalPending = invoices.filter(i => i.status === 'pending' || i.status === 'processing').reduce((s, i) => s + i.value, 0);
  const totalRejected = invoices.filter(i => i.status === 'rejected').length;
  const commission = totalAuthorized * 0.15;

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!', description: 'Texto copiado para a área de transferência.' });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 space-y-6">
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" asChild>
              <Link to="/meus-produtos"><ArrowLeft className="w-4 h-4 mr-2" />Voltar</Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <FileText className="h-6 w-6 text-primary" />
                Automação de Notas Fiscais
              </h1>
              <p className="text-sm text-muted-foreground">Motor inteligente de emissão NF-e / NFS-e</p>
            </div>
          </div>
          <Badge variant="outline" className="text-green-600 border-green-600">
            <span className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
            Sistema Ativo
          </Badge>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Notas Autorizadas</p>
                  <p className="text-2xl font-bold text-green-600">
                    {invoices.filter(i => i.status === 'authorized').length}
                  </p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-500/40" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                R$ {totalAuthorized.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pendentes / Processando</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {invoices.filter(i => i.status === 'pending' || i.status === 'processing').length}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-yellow-500/40" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rejeitadas</p>
                  <p className="text-2xl font-bold text-red-600">{totalRejected}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-500/40" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Requer atenção manual</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Comissão (15%)</p>
                  <p className="text-2xl font-bold text-primary">
                    R$ {commission.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-primary/40" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Split automático sobre autorizadas</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="invoices" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="invoices" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />Notas Fiscais
            </TabsTrigger>
            <TabsTrigger value="companies" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />Empresas
            </TabsTrigger>
            <TabsTrigger value="webhook" className="flex items-center gap-2">
              <Webhook className="h-4 w-4" />Webhook / API
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />Configurações
            </TabsTrigger>
          </TabsList>

          {/* INVOICES TAB */}
          <TabsContent value="invoices" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filtrar status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="authorized">Autorizadas</SelectItem>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="processing">Processando</SelectItem>
                    <SelectItem value="rejected">Rejeitadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />Exportar
                </Button>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />Emitir NF Manual
                </Button>
              </div>
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>CNPJ</TableHead>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((inv) => {
                      const sc = statusConfig[inv.status];
                      const Icon = sc.icon;
                      return (
                        <TableRow key={inv.id}>
                          <TableCell className="font-mono text-sm">{inv.number}</TableCell>
                          <TableCell className="font-medium">{inv.customer}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{inv.cnpj}</TableCell>
                          <TableCell><Badge variant="outline">{inv.type}</Badge></TableCell>
                          <TableCell className="font-medium">
                            R$ {inv.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${sc.color}`}>
                              <Icon className="h-3 w-3" />
                              {sc.label}
                            </span>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(inv.issuedAt).toLocaleDateString('pt-BR')}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="sm" variant="ghost"><Eye className="h-4 w-4" /></Button>
                              {inv.status === 'rejected' && (
                                <Button size="sm" variant="ghost" className="text-blue-600">
                                  <RefreshCw className="h-4 w-4" />
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
          </TabsContent>

          {/* COMPANIES TAB */}
          <TabsContent value="companies" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Empresas Cadastradas</h2>
              <Button size="sm"><Plus className="h-4 w-4 mr-2" />Nova Empresa</Button>
            </div>
            <Card>
              <CardContent className="pt-6">
                <div className="grid gap-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">NovaLink Tecnologia Ltda</p>
                        <p className="text-sm text-muted-foreground">CNPJ: 12.345.678/0001-90 · Simples Nacional</p>
                      </div>
                    </div>
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">Ativa</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Cadastre mais empresas para emitir notas fiscais de múltiplos CNPJs.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* WEBHOOK TAB */}
          <TabsContent value="webhook" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Webhook className="h-5 w-5" />
                  Recebimento de Vendas via Webhook
                </CardTitle>
                <CardDescription>
                  Configure seu ERP ou sistema de vendas para enviar dados automaticamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>URL do Webhook (POST)</Label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value="https://api.novalink.com/webhook/invoice/receive"
                      className="font-mono text-sm"
                    />
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard('https://api.novalink.com/webhook/invoice/receive')}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Token de Autenticação</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={webhookToken} className="font-mono text-sm" />
                    <Button variant="outline" size="sm" onClick={() => copyToClipboard(webhookToken)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <p className="text-sm font-medium">Exemplo de Payload (JSON)</p>
                  <pre className="text-xs bg-background p-3 rounded border overflow-x-auto">
{`{
  "sale_id": "venda-123",
  "customer": {
    "name": "Empresa Cliente Ltda",
    "cnpj": "12.345.678/0001-90",
    "address": { "street": "Rua A", "city": "São Paulo", "state": "SP" }
  },
  "items": [
    { "description": "Serviço de Consultoria", "quantity": 1, "unit_price": 1500.00, "ncm": "00000000" }
  ],
  "total": 1500.00,
  "payment_method": "pix"
}`}
                  </pre>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Testar Webhook</CardTitle>
                <CardDescription>Envie uma venda de teste para validar a integração.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => {
                    toast({
                      title: '🧪 Venda de teste recebida!',
                      description: 'A nota fiscal está sendo processada em ambiente de homologação.',
                    });
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Venda de Teste (Homologação)
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SETTINGS TAB */}
          <TabsContent value="settings" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Integração com Emissor Fiscal</CardTitle>
                <CardDescription>Configure as credenciais do serviço de emissão de notas.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Provedor de Emissão</Label>
                  <Select defaultValue="focus">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="focus">Focus NFe</SelectItem>
                      <SelectItem value="plugnotas">PlugNotas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>API Token do Emissor</Label>
                  <Input type="password" placeholder="Cole aqui sua API Key" />
                </div>
                <div className="space-y-2">
                  <Label>Ambiente</Label>
                  <Select defaultValue="homologation">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="homologation">Homologação (Testes)</SelectItem>
                      <SelectItem value="production">Produção</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button className="w-full">
                  <Settings className="h-4 w-4 mr-2" />Salvar Configurações
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Split de Pagamento</CardTitle>
                <CardDescription>Configuração automática de comissão sobre transações.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Cliente recebe</p>
                    <p className="text-2xl font-bold text-green-600">85%</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg text-center">
                    <p className="text-sm text-muted-foreground">Comissão NovaLink</p>
                    <p className="text-2xl font-bold text-primary">15%</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  O split é aplicado automaticamente sobre cada nota fiscal autorizada.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <Footer />
    </div>
  );
}
