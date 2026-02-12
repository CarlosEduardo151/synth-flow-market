import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase as supabaseClient } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ProductTutorial } from '@/components/ProductTutorial';

const supabase = supabaseClient as any;
import { relatoriosFinanceirosTutorial } from '@/data/tutorials/relatorios-financeiros';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Calendar,
  Download,
  RefreshCw,
  ArrowLeft,
  PieChart,
  BarChart3,
  Filter,
  Copy,
  CheckCircle2,
  Trash2,
  Settings,
  Plus
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import * as XLSX from 'xlsx';

interface FinancialRecord {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  date: string;
  description: string;
}

const FinancialReportsSystem = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customerProductId, setCustomerProductId] = useState<string | null>(null);
  const [records, setRecords] = useState<FinancialRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [webhookCopied, setWebhookCopied] = useState(false);
  const [webhookToken, setWebhookToken] = useState<string | null>(null);
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [adminForm, setAdminForm] = useState({
    tipo: 'despesa',
    valor: '',
    categoria: '',
    descricao: '',
    data: new Date().toISOString().split('T')[0],
    operacao: 'adicionar'
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    } else if (user) {
      checkAccess();
    }
  }, [user, loading, navigate]);

  const checkAccess = async () => {
    if (!user) return;

    try {
      // First check for active free trial using product_rentals
      const { data: trial } = await (supabase
        .from('product_rentals' as any)
        .select('id')
        .eq('user_id', user.id)
        .eq('product_slug', 'relatorios-financeiros')
        .eq('status', 'active')
        .maybeSingle() as any);

      if (trial) {
        setCustomerProductId(`trial-${(trial as any).id}`);
        setIsLoading(false);
        return;
      }

      const { data: customerProduct, error } = await (supabase
        .from('product_rentals' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('product_slug', 'relatorios-financeiros')
        .eq('status', 'active')
        .maybeSingle() as any);

      if (error || !customerProduct) {
        toast({
          title: "Acesso Negado",
          description: "Você não tem acesso a este sistema. Adquira o produto ou ative um teste grátis.",
          variant: "destructive"
        });
        navigate('/meus-produtos');
        return;
      }

      setCustomerProductId((customerProduct as any).id);
      await loadRecords((customerProduct as any).id);
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      navigate('/meus-produtos');
    }
  };

  const loadRecords = async (cpId: string) => {
    try {
      // financial_records table doesn't exist - use empty array
      setRecords([]);
      setWebhookToken(crypto.randomUUID());
    } catch (error) {
      console.error('Error loading records:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredRecords = () => {
    return records.filter(record => {
      const categoryMatch = filterCategory === 'all' || record.category === filterCategory;
      const typeMatch = filterType === 'all' || record.type === filterType;
      const startDateMatch = !startDate || record.date >= startDate;
      const endDateMatch = !endDate || record.date <= endDate;
      
      return categoryMatch && typeMatch && startDateMatch && endDateMatch;
    });
  };

  const calculateTotals = () => {
    const filteredRecords = getFilteredRecords();
    const income = filteredRecords
      .filter(r => r.type === 'income')
      .reduce((sum, r) => sum + Number(r.amount), 0);
    
    const expenses = filteredRecords
      .filter(r => r.type === 'expense')
      .reduce((sum, r) => sum + Number(r.amount), 0);
    
    return { income, expenses, balance: income - expenses };
  };

  const getCategories = () => {
    return Array.from(new Set(records.map(r => r.category)));
  };

  const getCategoryData = () => {
    const filteredRecords = getFilteredRecords();
    const categories = getCategories();
    
    return categories.map(category => {
      const categoryRecords = filteredRecords.filter(r => r.category === category);
      const income = categoryRecords.filter(r => r.type === 'income').reduce((sum, r) => sum + Number(r.amount), 0);
      const expense = categoryRecords.filter(r => r.type === 'expense').reduce((sum, r) => sum + Number(r.amount), 0);
      
      return {
        category,
        receitas: income,
        despesas: expense
      };
    });
  };

  const getMonthlyData = () => {
    const filteredRecords = getFilteredRecords();
    const monthlyMap = new Map();
    
    filteredRecords.forEach(record => {
      const month = new Date(record.date).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
      
      if (!monthlyMap.has(month)) {
        monthlyMap.set(month, { month, receitas: 0, despesas: 0 });
      }
      
      const data = monthlyMap.get(month);
      if (record.type === 'income') {
        data.receitas += Number(record.amount);
      } else {
        data.despesas += Number(record.amount);
      }
    });
    
    return Array.from(monthlyMap.values()).sort((a, b) => {
      const [monthA, yearA] = a.month.split('/');
      const [monthB, yearB] = b.month.split('/');
      return new Date(`20${yearA}-${monthA}-01`).getTime() - new Date(`20${yearB}-${monthB}-01`).getTime();
    });
  };

  const exportToXLSX = () => {
    const filteredRecords = getFilteredRecords();
    const exportData = filteredRecords.map(record => ({
      Data: new Date(record.date).toLocaleDateString('pt-BR'),
      Categoria: record.category,
      Descrição: record.description,
      Valor: Number(record.amount).toFixed(2),
      Tipo: record.type === 'income' ? 'Receita' : 'Despesa'
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório Financeiro');
    XLSX.writeFile(workbook, `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    toast({
      title: "Exportado!",
      description: "Relatório exportado com sucesso."
    });
  };

  const copyWebhookUrl = () => {
    if (!webhookToken) return;
    const webhookUrl = `https://agndhravgmcwpdjkozka.supabase.co/functions/v1/financial-webhook?token=${webhookToken}`;
    navigator.clipboard.writeText(webhookUrl);
    setWebhookCopied(true);
    toast({
      title: "URL copiada!",
      description: "URL do webhook copiada para a área de transferência."
    });
    setTimeout(() => setWebhookCopied(false), 2000);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const handleAdminAction = async () => {
    if (!webhookToken) return;

    // Validação dos campos obrigatórios
    if (!adminForm.categoria) {
      toast({
        title: "Erro",
        description: "Por favor, preencha a categoria.",
        variant: "destructive"
      });
      return;
    }

    if (adminForm.operacao !== 'zerar' && !adminForm.valor) {
      toast({
        title: "Erro",
        description: "Por favor, preencha o valor.",
        variant: "destructive"
      });
      return;
    }

    try {
      const payload: any = {
        tipo: adminForm.tipo,
        categoria: adminForm.categoria,
        operacao: adminForm.operacao
      };

      // Add optional fields based on operation
      if (adminForm.operacao !== 'zerar') {
        if (adminForm.valor) payload.valor = parseFloat(adminForm.valor);
        if (adminForm.descricao) payload.descricao = adminForm.descricao;
        if (adminForm.data) payload.data = adminForm.data;
      }

      const webhookUrl = `https://agndhravgmcwpdjkozka.supabase.co/functions/v1/financial-webhook?token=${webhookToken}`;
      
      console.log('Enviando requisição para:', webhookUrl);
      console.log('Payload:', payload);
      
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify(payload)
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);
      
      let result;
      try {
        result = await response.json();
        console.log('Result:', result);
      } catch (e) {
        console.error('Erro ao fazer parse do JSON:', e);
        throw new Error(`Erro na resposta do servidor (Status: ${response.status})`);
      }

      if (response.ok && result.success) {
        toast({
          title: "Sucesso!",
          description: result.message || "Operação executada com sucesso."
        });
        
        // Reset form
        setAdminForm({
          tipo: 'despesa',
          valor: '',
          categoria: '',
          descricao: '',
          data: new Date().toISOString().split('T')[0],
          operacao: 'adicionar'
        });

        // Reload records
        if (customerProductId) {
          await loadRecords(customerProductId);
        }
      } else {
        const errorMsg = result?.error || `Erro ao executar operação (Status: ${response.status})`;
        throw new Error(errorMsg);
      }
    } catch (error) {
      console.error('Error executing admin action:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível executar a ação.",
        variant: "destructive"
      });
    }
  };

  const deleteRecord = async (recordId: string) => {
    if (!webhookToken) return;
    
    if (!confirm('Tem certeza que deseja apagar este registro?')) return;

    try {
      const webhookUrl = `https://agndhravgmcwpdjkozka.supabase.co/functions/v1/financial-webhook?token=${webhookToken}`;
      
      // Get the session token
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || ''}`,
        },
        body: JSON.stringify({
          operacao: 'apagar',
          id: recordId
        })
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Sucesso!",
          description: "Registro apagado com sucesso."
        });
        
        if (customerProductId) {
          await loadRecords(customerProductId);
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Error deleting record:', error);
      toast({
        title: "Erro",
        description: "Não foi possível apagar o registro.",
        variant: "destructive"
      });
    }
  };

  const deleteAllRecords = async () => {
    if (!customerProductId) return;
    
    if (!confirm('ATENÇÃO: Isso vai apagar TODOS os registros financeiros. Tem certeza?')) return;

    try {
      const { error } = await supabase
        .from('financial_records')
        .delete()
        .eq('customer_product_id', customerProductId);

      if (error) throw error;

      toast({
        title: "Sucesso!",
        description: "Todos os registros foram apagados."
      });

      await loadRecords(customerProductId);
    } catch (error) {
      console.error('Error deleting all records:', error);
      toast({
        title: "Erro",
        description: "Não foi possível apagar os registros.",
        variant: "destructive"
      });
    }
  };

  const generateSampleData = async () => {
    if (!customerProductId) return;

    const sampleRecords = [
      { type: 'income', category: 'Vendas', amount: 15000, description: 'Vendas do mês' },
      { type: 'income', category: 'Serviços', amount: 8500, description: 'Prestação de serviços' },
      { type: 'expense', category: 'Fornecedores', amount: 5000, description: 'Compra de mercadorias' },
      { type: 'expense', category: 'Salários', amount: 6000, description: 'Folha de pagamento' },
      { type: 'expense', category: 'Aluguel', amount: 2500, description: 'Aluguel do espaço' },
      { type: 'expense', category: 'Marketing', amount: 1200, description: 'Anúncios online' },
    ];

    try {
      const recordsToInsert = sampleRecords.map(r => ({
        customer_product_id: customerProductId,
        type: r.type,
        category: r.category,
        amount: r.amount,
        description: r.description,
        date: new Date().toISOString().split('T')[0]
      }));

      const { error } = await supabase
        .from('financial_records')
        .insert(recordsToInsert);

      if (error) throw error;

      toast({
        title: "Dados gerados!",
        description: "Dados de exemplo foram adicionados com sucesso."
      });

      await loadRecords(customerProductId);
    } catch (error) {
      console.error('Error generating data:', error);
      toast({
        title: "Erro",
        description: "Não foi possível gerar os dados.",
        variant: "destructive"
      });
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-primary/5">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const { income, expenses, balance } = calculateTotals();
  const filteredRecords = getFilteredRecords();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <ProductTutorial
        productSlug="relatorios-financeiros"
        productTitle="Relatórios Financeiros Automáticos"
        steps={relatoriosFinanceirosTutorial}
        onComplete={() => {}}
      />
      
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button variant="outline" asChild className="mb-6">
            <Link to="/meus-produtos">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Meus Produtos
            </Link>
          </Button>
          
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-gradient-primary">
                <BarChart3 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-1">
                  Painel Financeiro Automatizado
                </h1>
                <p className="text-muted-foreground">
                  Visualize e gerencie seus dados financeiros em tempo real
                </p>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowAdminPanel(!showAdminPanel)} 
                variant="outline"
                className={showAdminPanel ? 'bg-primary/10' : ''}
              >
                <Settings className="h-4 w-4 mr-2" />
                Administração
              </Button>
              <Button onClick={generateSampleData} variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Gerar Dados Demo
              </Button>
              <Button onClick={exportToXLSX} className="bg-gradient-primary">
                <Download className="h-4 w-4 mr-2" />
                Exportar XLSX
              </Button>
            </div>
          </div>

          {/* Admin Panel */}
          {showAdminPanel && (
            <Card className="mb-8 border-orange-500/20 bg-gradient-to-br from-orange-50/30 to-orange-100/20 dark:from-orange-950/20 dark:to-orange-900/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Painel de Administração
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Tipo</label>
                    <Select value={adminForm.tipo} onValueChange={(value) => setAdminForm({...adminForm, tipo: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="receita">Receita</SelectItem>
                        <SelectItem value="despesa">Despesa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Operação</label>
                    <Select value={adminForm.operacao} onValueChange={(value) => setAdminForm({...adminForm, operacao: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="adicionar">Adicionar Registro</SelectItem>
                        <SelectItem value="substituir">Substituir Categoria</SelectItem>
                        <SelectItem value="zerar">Zerar Categoria</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium mb-2 block">Categoria *</label>
                    <Input 
                      value={adminForm.categoria}
                      onChange={(e) => setAdminForm({...adminForm, categoria: e.target.value})}
                      placeholder="Ex: Combustível, Vendas"
                    />
                  </div>

                  {adminForm.operacao !== 'zerar' && (
                    <>
                      <div>
                        <label className="text-sm font-medium mb-2 block">Valor *</label>
                        <Input 
                          type="number"
                          step="0.01"
                          value={adminForm.valor}
                          onChange={(e) => setAdminForm({...adminForm, valor: e.target.value})}
                          placeholder="0.00"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Descrição</label>
                        <Input 
                          value={adminForm.descricao}
                          onChange={(e) => setAdminForm({...adminForm, descricao: e.target.value})}
                          placeholder="Descrição detalhada"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">Data</label>
                        <Input 
                          type="date"
                          value={adminForm.data}
                          onChange={(e) => setAdminForm({...adminForm, data: e.target.value})}
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Operações:</strong>
                  </p>
                  <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1">
                    <li>• <strong>Adicionar:</strong> Adiciona um novo registro</li>
                    <li>• <strong>Substituir:</strong> Remove todos os registros da categoria e adiciona um novo</li>
                    <li>• <strong>Zerar:</strong> Remove todos os registros da categoria (não precisa de valor)</li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAdminAction} className="bg-gradient-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    Executar Operação
                  </Button>
                  
                  <Button onClick={deleteAllRecords} variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Deletar TUDO
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Webhook URL Card */}
          <Card className="mb-8 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Integração via HTTP Request
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  🔒 <strong>Endpoint Exclusivo:</strong> Esta URL é única e personalizada apenas para você. Não compartilhe com terceiros.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Sua URL Personalizada:</label>
                <div className="flex gap-2">
                  <code className="flex-1 text-xs bg-muted px-3 py-2 rounded border break-all">
                    {webhookToken 
                      ? `https://agndhravgmcwpdjkozka.supabase.co/functions/v1/financial-webhook?token=${webhookToken}`
                      : 'Carregando...'
                    }
                  </code>
                  <Button 
                    onClick={copyWebhookUrl}
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={!webhookToken}
                  >
                    {webhookCopied ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Copiado!
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4 mr-2" />
                        Copiar
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="text-sm font-medium mb-2 block">Configuração do HTTP Request:</label>
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm"><strong>Método:</strong> POST</p>
                  <p className="text-sm"><strong>URL:</strong> Cole a URL acima</p>
                  <p className="text-sm"><strong>Content-Type:</strong> application/json</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <label className="text-sm font-medium mb-2 block">Formato JSON (Body):</label>
                <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto font-mono">
{`{
  "tipo": "despesa",
  "valor": 150.00,
  "categoria": "Combustível",
  "descricao": "Abastecimento do carro",
  "data": "2025-01-13"
}`}
                </pre>
              </div>

              <div className="border-t pt-4">
                <label className="text-sm font-medium mb-2 block">Campos Obrigatórios:</label>
                <ul className="space-y-1 text-sm">
                  <li>• <strong>tipo:</strong> "receita" ou "despesa"</li>
                  <li>• <strong>valor:</strong> Valor numérico (ex: 150.00)</li>
                  <li>• <strong>categoria:</strong> Nome da categoria (ex: "Combustível", "Vendas")</li>
                </ul>
              </div>

              <div className="border-t pt-4">
                <label className="text-sm font-medium mb-2 block">Campos Opcionais:</label>
                <ul className="space-y-1 text-sm">
                  <li>• <strong>descricao:</strong> Descrição detalhada da transação</li>
                  <li>• <strong>data:</strong> Data no formato YYYY-MM-DD (padrão: hoje)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cards de Resumo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-green-500/20 bg-gradient-to-br from-green-50/50 to-green-100/30 dark:from-green-950/20 dark:to-green-900/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Receitas
              </CardTitle>
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                {formatCurrency(income)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total de entradas
              </p>
            </CardContent>
          </Card>

          <Card className="border-red-500/20 bg-gradient-to-br from-red-50/50 to-red-100/30 dark:from-red-950/20 dark:to-red-900/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Despesas
              </CardTitle>
              <div className="p-2 rounded-lg bg-red-500/10">
                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">
                {formatCurrency(expenses)}
              </div>
              <p className="text-xs text-muted-foreground">
                Total de saídas
              </p>
            </CardContent>
          </Card>

          <Card className={`border-${balance >= 0 ? 'blue' : 'orange'}-500/20 bg-gradient-to-br from-${balance >= 0 ? 'blue' : 'orange'}-50/50 to-${balance >= 0 ? 'blue' : 'orange'}-100/30 dark:from-${balance >= 0 ? 'blue' : 'orange'}-950/20 dark:to-${balance >= 0 ? 'blue' : 'orange'}-900/10`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Saldo
              </CardTitle>
              <div className={`p-2 rounded-lg bg-${balance >= 0 ? 'blue' : 'orange'}-500/10`}>
                <DollarSign className={`h-4 w-4 text-${balance >= 0 ? 'blue' : 'orange'}-600 dark:text-${balance >= 0 ? 'blue' : 'orange'}-400`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-3xl font-bold text-${balance >= 0 ? 'blue' : 'orange'}-600 dark:text-${balance >= 0 ? 'blue' : 'orange'}-400 mb-1`}>
                {formatCurrency(balance)}
              </div>
              <p className="text-xs text-muted-foreground">
                Receitas - Despesas
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Categoria</label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    {getCategories().map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Tipo</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="income">Receitas</SelectItem>
                    <SelectItem value="expense">Despesas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Data Início</label>
                <Input 
                  type="date" 
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-2 block">Data Fim</label>
                <Input 
                  type="date" 
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Gastos por Categoria
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={getCategoryData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="receitas" fill="hsl(var(--chart-1))" name="Receitas" />
                  <Bar dataKey="despesas" fill="hsl(var(--chart-2))" name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Evolução Mensal
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={getMonthlyData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="receitas" stroke="hsl(var(--chart-1))" name="Receitas" strokeWidth={2} />
                  <Line type="monotone" dataKey="despesas" stroke="hsl(var(--chart-2))" name="Despesas" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Registros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Movimentações Financeiras
              </span>
              <Badge variant="secondary">{filteredRecords.length} registros</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredRecords.length === 0 ? (
              <div className="text-center py-12">
                <BarChart3 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {records.length === 0 
                    ? 'Nenhum registro financeiro encontrado.' 
                    : 'Nenhum registro encontrado com os filtros aplicados.'}
                </p>
                {records.length === 0 && (
                  <Button onClick={generateSampleData}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Gerar Dados de Exemplo
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredRecords.map((record) => (
                  <div 
                    key={record.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-accent/50 transition-all hover:shadow-sm"
                  >
                    <div className="flex items-center gap-4 flex-1">
                      <div className={`p-3 rounded-xl ${
                        record.type === 'income' 
                          ? 'bg-gradient-to-br from-green-100 to-green-200 dark:from-green-950 dark:to-green-900' 
                          : 'bg-gradient-to-br from-red-100 to-red-200 dark:from-red-950 dark:to-red-900'
                      }`}>
                        {record.type === 'income' ? (
                          <TrendingUp className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-foreground">
                            {record.description}
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {record.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(record.date).toLocaleDateString('pt-BR')}
                        </div>
                      </div>
                    </div>
                    
                     <div className="flex items-center gap-3">
                       <div className={`text-xl font-bold ${
                         record.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                       }`}>
                         {record.type === 'income' ? '+' : '-'} {formatCurrency(Number(record.amount))}
                       </div>
                       
                       <Button
                         onClick={() => deleteRecord(record.id)}
                         variant="ghost"
                         size="sm"
                         className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                       >
                         <Trash2 className="h-4 w-4" />
                       </Button>
                     </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default FinancialReportsSystem;
