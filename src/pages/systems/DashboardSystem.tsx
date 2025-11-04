import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, Users, ShoppingCart, RefreshCw, Settings, Copy, Wallet, PiggyBank, BarChart3, ArrowUpRight, ArrowDownRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';

interface DashboardConfig {
  id: string;
  name: string;
  metrics: any;
  webhook_url: string | null;
}

interface DashboardData {
  metric_key: string;
  value: number;
  metadata: any;
  timestamp: string;
}

const DashboardSystem = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [config, setConfig] = useState<DashboardConfig | null>(null);
  const [data, setData] = useState<DashboardData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [periodFilter, setPeriodFilter] = useState('mensal');
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [isAddDataDialogOpen, setIsAddDataDialogOpen] = useState(false);
  const [selectedMetricKey, setSelectedMetricKey] = useState('');
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    checkAccess();
  }, [user]);

  const checkAccess = async () => {
    if (!user) return;

    try {
      console.log('Verificando acesso para usuário:', user.id);
      
      const { data: productData, error: productError } = await supabase
        .from('customer_products')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_slug', 'dashboards-personalizados')
        .eq('is_active', true)
        .maybeSingle();

      console.log('Resultado da busca:', { productData, productError });

      if (productError) {
        console.error('Erro ao buscar produto:', productError);
        toast({
          title: "Erro",
          description: "Erro ao verificar acesso: " + productError.message,
          variant: "destructive"
        });
        navigate('/meus-produtos');
        return;
      }

      if (!productData) {
        console.log('Produto não encontrado para o usuário');
        toast({
          title: "Acesso Negado",
          description: "Você precisa comprar o Dashboard para acessar este sistema.",
          variant: "destructive"
        });
        navigate('/meus-produtos');
        return;
      }

      console.log('Acesso concedido! Carregando dashboard...');
      await loadDashboard(productData.id);
    } catch (error) {
      console.error('Error checking access:', error);
      navigate('/meus-produtos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboard = async (productId: string) => {
    // Buscar customer_product para pegar o token
    const { data: cpData } = await supabase
      .from('customer_products')
      .select('webhook_token')
      .eq('id', productId)
      .single();

    const { data: configData } = await supabase
      .from('dashboard_configs')
      .select('*')
      .eq('customer_product_id', productId)
      .single();

    if (configData) {
      // Gerar webhook URL com token se não existir ou se não tiver token
      let webhookUrl = configData.webhook_url;
      if (!webhookUrl || !webhookUrl.includes('token=')) {
        if (cpData?.webhook_token) {
          webhookUrl = `https://agndhravgmcwpdjkozka.supabase.co/functions/v1/dashboard-webhook?token=${cpData.webhook_token}`;
          await supabase
            .from('dashboard_configs')
            .update({ webhook_url: webhookUrl })
            .eq('id', configData.id);
        }
      }
      
      setConfig({ ...configData, webhook_url: webhookUrl || '' });
      
      const { data: dashboardData } = await supabase
        .from('dashboard_data')
        .select('*')
        .eq('dashboard_config_id', configData.id)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (dashboardData) {
        setData(dashboardData);
        if (dashboardData.length > 0) {
          setLastUpdate(new Date(dashboardData[0].timestamp));
        }
      }
    } else {
      // Criar configuração padrão
      const { data: newConfig } = await supabase
        .from('dashboard_configs')
        .insert({
          customer_product_id: productId,
          name: 'Meu Dashboard',
          metrics: [
            { key: 'vendas_total', name: 'Vendas Totais', type: 'currency', enabled: true },
            { key: 'ticket_medio', name: 'Ticket Médio', type: 'currency', enabled: true },
            { key: 'clientes_ativos', name: 'Clientes Ativos', type: 'number', enabled: true },
            { key: 'lucro_liquido', name: 'Lucro Líquido', type: 'currency', enabled: true },
            { key: 'despesas_mensais', name: 'Despesas Mensais', type: 'currency', enabled: true },
            { key: 'lucro_bruto', name: 'Lucro Bruto', type: 'currency', enabled: true },
            { key: 'crescimento_receita', name: 'Crescimento de Receita', type: 'percentage', enabled: true },
            { key: 'fluxo_caixa', name: 'Fluxo de Caixa Atual', type: 'currency', enabled: true },
            { key: 'receita_anual', name: 'Receita Total do Ano', type: 'currency', enabled: true },
            { key: 'saldo_atual', name: 'Saldo Atual da Empresa', type: 'currency', enabled: true }
          ]
        })
        .select()
        .single();

      if (newConfig) {
        // Buscar token do customer_product
        const { data: cpData } = await supabase
          .from('customer_products')
          .select('webhook_token')
          .eq('id', productId)
          .single();

        const webhookUrl = cpData?.webhook_token 
          ? `https://agndhravgmcwpdjkozka.supabase.co/functions/v1/dashboard-webhook?token=${cpData.webhook_token}`
          : '';
        
        await supabase
          .from('dashboard_configs')
          .update({ webhook_url: webhookUrl })
          .eq('id', newConfig.id);
        
        // Inserir dados de exemplo
        await supabase.from('dashboard_data').insert([
          { dashboard_config_id: newConfig.id, metric_key: 'vendas_total', value: 15000, metadata: { previous: 12000 } },
          { dashboard_config_id: newConfig.id, metric_key: 'ticket_medio', value: 250, metadata: { previous: 220 } },
          { dashboard_config_id: newConfig.id, metric_key: 'clientes_ativos', value: 60, metadata: { previous: 55 } },
          { dashboard_config_id: newConfig.id, metric_key: 'lucro_liquido', value: 5000, metadata: { previous: 4200 } },
          { dashboard_config_id: newConfig.id, metric_key: 'despesas_mensais', value: 8000, metadata: { previous: 7500 } },
          { dashboard_config_id: newConfig.id, metric_key: 'lucro_bruto', value: 13000, metadata: { previous: 11000 } },
          { dashboard_config_id: newConfig.id, metric_key: 'crescimento_receita', value: 25, metadata: { previous: 18 } },
          { dashboard_config_id: newConfig.id, metric_key: 'fluxo_caixa', value: 22000, metadata: { previous: 19000 } },
          { dashboard_config_id: newConfig.id, metric_key: 'receita_anual', value: 180000, metadata: { previous: 150000 } },
          { dashboard_config_id: newConfig.id, metric_key: 'saldo_atual', value: 45000, metadata: { previous: 42000 } }
        ]);
        await loadDashboard(productId);
      }
    }
  };

  useEffect(() => {
    if (!config) return;

    // Realtime subscription para novos dados
    const channel = supabase
      .channel('dashboard-data-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'dashboard_data',
          filter: `dashboard_config_id=eq.${config.id}`
        },
        (payload) => {
          setData(prev => [payload.new as DashboardData, ...prev.slice(0, 99)]);
          setLastUpdate(new Date());
          toast({ title: "Dados atualizados!", description: "Novos dados recebidos em tempo real" });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [config]);

  const refreshData = async () => {
    if (!config) return;
    toast({ title: "Atualizando dados..." });
    const { data: productData } = await supabase
      .from('dashboard_configs')
      .select('customer_product_id')
      .eq('id', config.id)
      .single();
    
    if (productData) {
      await loadDashboard(productData.customer_product_id);
      toast({ title: "Dados atualizados!" });
    }
  };

  const copyWebhookUrl = () => {
    if (config?.webhook_url) {
      navigator.clipboard.writeText(config.webhook_url);
      toast({ title: "URL copiada!", description: "Cole no seu n8n" });
    }
  };

  const getMetricFormFields = (metricKey: string) => {
    const formFields: Record<string, any> = {
      vendas_total: [
        { name: 'value', label: 'Valor Total de Vendas', type: 'number', required: true, placeholder: '15000.00', step: '0.01' },
        { name: 'produto', label: 'Produto/Serviço', type: 'text', required: false, placeholder: 'Nome do produto' },
        { name: 'cliente', label: 'Cliente', type: 'text', required: false, placeholder: 'Nome do cliente' },
        { name: 'observacoes', label: 'Observações', type: 'textarea', required: false, placeholder: 'Informações adicionais' }
      ],
      ticket_medio: [
        { name: 'value', label: 'Ticket Médio', type: 'number', required: true, placeholder: '250.00', step: '0.01' },
        { name: 'total_vendas', label: 'Total de Vendas', type: 'number', required: false, placeholder: '60', step: '1' },
        { name: 'observacoes', label: 'Observações', type: 'textarea', required: false, placeholder: 'Informações adicionais' }
      ],
      clientes_ativos: [
        { name: 'value', label: 'Quantidade de Clientes Ativos', type: 'number', required: true, placeholder: '60', step: '1' },
        { name: 'novos_clientes', label: 'Novos Clientes', type: 'number', required: false, placeholder: '5', step: '1' },
        { name: 'clientes_perdidos', label: 'Clientes Perdidos', type: 'number', required: false, placeholder: '2', step: '1' },
        { name: 'observacoes', label: 'Observações', type: 'textarea', required: false, placeholder: 'Informações adicionais' }
      ],
      lucro_liquido: [
        { name: 'value', label: 'Lucro Líquido', type: 'number', required: true, placeholder: '5000.00', step: '0.01' },
        { name: 'receita_bruta', label: 'Receita Bruta', type: 'number', required: false, placeholder: '15000.00', step: '0.01' },
        { name: 'impostos', label: 'Impostos Pagos', type: 'number', required: false, placeholder: '2000.00', step: '0.01' },
        { name: 'periodo', label: 'Período', type: 'text', required: false, placeholder: 'Janeiro 2025' },
        { name: 'observacoes', label: 'Observações', type: 'textarea', required: false, placeholder: 'Informações adicionais' }
      ],
      despesas_mensais: [
        { name: 'value', label: 'Valor da Despesa', type: 'number', required: true, placeholder: '8000.00', step: '0.01' },
        { name: 'categoria', label: 'Categoria', type: 'select', required: true, 
          options: ['Marketing', 'Operacional', 'Vendas', 'Administrativo', 'RH', 'Tecnologia', 'Financeiro', 'Outros'] },
        { name: 'fornecedor', label: 'Fornecedor', type: 'text', required: false, placeholder: 'Nome do fornecedor' },
        { name: 'descricao', label: 'Descrição', type: 'textarea', required: false, placeholder: 'Descrição detalhada da despesa' }
      ],
      lucro_bruto: [
        { name: 'value', label: 'Lucro Bruto', type: 'number', required: true, placeholder: '13000.00', step: '0.01' },
        { name: 'receita_total', label: 'Receita Total', type: 'number', required: false, placeholder: '21000.00', step: '0.01' },
        { name: 'custos_variaveis', label: 'Custos Variáveis', type: 'number', required: false, placeholder: '8000.00', step: '0.01' },
        { name: 'observacoes', label: 'Observações', type: 'textarea', required: false, placeholder: 'Informações adicionais' }
      ],
      crescimento_receita: [
        { name: 'value', label: 'Percentual de Crescimento (%)', type: 'number', required: true, placeholder: '25', step: '0.1' },
        { name: 'receita_atual', label: 'Receita Atual', type: 'number', required: false, placeholder: '15000.00', step: '0.01' },
        { name: 'receita_anterior', label: 'Receita Anterior', type: 'number', required: false, placeholder: '12000.00', step: '0.01' },
        { name: 'periodo_comparacao', label: 'Período de Comparação', type: 'text', required: false, placeholder: 'vs mês anterior' },
        { name: 'observacoes', label: 'Observações', type: 'textarea', required: false, placeholder: 'Informações adicionais' }
      ],
      fluxo_caixa: [
        { name: 'value', label: 'Fluxo de Caixa', type: 'number', required: true, placeholder: '22000.00', step: '0.01' },
        { name: 'entradas', label: 'Total de Entradas', type: 'number', required: false, placeholder: '30000.00', step: '0.01' },
        { name: 'saidas', label: 'Total de Saídas', type: 'number', required: false, placeholder: '8000.00', step: '0.01' },
        { name: 'tipo', label: 'Tipo', type: 'select', required: false, options: ['Positivo', 'Negativo', 'Neutro'] },
        { name: 'observacoes', label: 'Observações', type: 'textarea', required: false, placeholder: 'Informações adicionais' }
      ],
      receita_anual: [
        { name: 'value', label: 'Receita Anual', type: 'number', required: true, placeholder: '180000.00', step: '0.01' },
        { name: 'ano', label: 'Ano', type: 'text', required: false, placeholder: '2025' },
        { name: 'meta_anual', label: 'Meta Anual', type: 'number', required: false, placeholder: '200000.00', step: '0.01' },
        { name: 'observacoes', label: 'Observações', type: 'textarea', required: false, placeholder: 'Informações adicionais' }
      ],
      saldo_atual: [
        { name: 'value', label: 'Saldo Atual', type: 'number', required: true, placeholder: '45000.00', step: '0.01' },
        { name: 'conta', label: 'Conta', type: 'text', required: false, placeholder: 'Conta corrente principal' },
        { name: 'banco', label: 'Banco', type: 'text', required: false, placeholder: 'Nome do banco' },
        { name: 'reserva_emergencia', label: 'Reserva de Emergência', type: 'number', required: false, placeholder: '10000.00', step: '0.01' },
        { name: 'observacoes', label: 'Observações', type: 'textarea', required: false, placeholder: 'Informações adicionais' }
      ]
    };

    return formFields[metricKey] || [
      { name: 'value', label: 'Valor', type: 'number', required: true, placeholder: '0', step: '0.01' },
      { name: 'observacoes', label: 'Observações', type: 'textarea', required: false, placeholder: 'Informações adicionais' }
    ];
  };

  const handleAddData = async () => {
    if (!config || !selectedMetricKey) {
      toast({ 
        title: "Erro", 
        description: "Por favor, selecione uma métrica",
        variant: "destructive"
      });
      return;
    }

    const fields = getMetricFormFields(selectedMetricKey);
    const requiredFields = fields.filter(f => f.required);
    
    // Validar campos obrigatórios
    for (const field of requiredFields) {
      if (!formData[field.name] || formData[field.name] === '') {
        toast({ 
          title: "Erro", 
          description: `O campo "${field.label}" é obrigatório`,
          variant: "destructive"
        });
        return;
      }
    }

    try {
      // Extrair o valor principal (sempre será 'value' agora)
      const value = parseFloat(formData.value);
      
      if (isNaN(value)) {
        toast({ 
          title: "Erro", 
          description: "O valor deve ser um número válido",
          variant: "destructive"
        });
        return;
      }

      // Criar metadata com todos os outros campos
      const metadata: Record<string, any> = {};
      fields.forEach(field => {
        if (field.name !== 'value' && formData[field.name]) {
          metadata[field.name] = formData[field.name];
        }
      });

      // Buscar valor anterior da mesma métrica para calcular variação
      const previousData = data.find(d => d.metric_key === selectedMetricKey);
      if (previousData) {
        metadata.previous = Number(previousData.value);
      }

      // Inserir os dados
      const { error } = await supabase
        .from('dashboard_data')
        .insert({
          dashboard_config_id: config.id,
          metric_key: selectedMetricKey,
          value: value,
          metadata: metadata
        });

      if (error) throw error;

      toast({ 
        title: "✅ Dados Adicionados!", 
        description: `Métrica "${config.metrics.find((m: any) => m.key === selectedMetricKey)?.name}" atualizada com sucesso`
      });

      setIsAddDataDialogOpen(false);
      setSelectedMetricKey('');
      setFormData({});
      await refreshData();
    } catch (error) {
      console.error('Error adding data:', error);
      toast({ 
        title: "Erro ao Adicionar", 
        description: "Não foi possível adicionar os dados. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const toggleMetric = async (metricKey: string) => {
    if (!config) return;
    
    const updatedMetrics = config.metrics.map((m: any) => 
      m.key === metricKey ? { ...m, enabled: !m.enabled } : m
    );
    
    await supabase
      .from('dashboard_configs')
      .update({ metrics: updatedMetrics })
      .eq('id', config.id);
    
    setConfig({ ...config, metrics: updatedMetrics });
    toast({ title: "Métricas atualizadas!" });
  };

  const getMetricValue = (key: string) => {
    const metric = data.find(d => d.metric_key === key);
    return metric ? Number(metric.value) : 0;
  };

  const getMetricData = (key: string) => {
    return data.find(d => d.metric_key === key);
  };

  const calculateVariation = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getMetricVariation = (key: string) => {
    const metric = getMetricData(key);
    if (!metric || !metric.metadata?.previous) return null;
    
    const current = Number(metric.value);
    const previous = Number(metric.metadata.previous);
    return calculateVariation(current, previous);
  };

  const isMetricEnabled = (key: string) => {
    if (!config) return false;
    const metric = config.metrics.find((m: any) => m.key === key);
    return metric?.enabled ?? false;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getMetricIcon = (key: string) => {
    const icons: Record<string, any> = {
      vendas_total: DollarSign,
      ticket_medio: ShoppingCart,
      clientes_ativos: Users,
      lucro_liquido: TrendingUp,
      despesas_mensais: Wallet,
      lucro_bruto: PiggyBank,
      crescimento_receita: BarChart3,
      fluxo_caixa: ArrowUpRight,
      receita_anual: DollarSign,
      saldo_atual: Wallet
    };
    return icons[key] || DollarSign;
  };

  const salesData = [
    { name: 'Jan', vendas: 4000, despesas: 3000, lucro: 1000 },
    { name: 'Fev', vendas: 3000, despesas: 2500, lucro: 500 },
    { name: 'Mar', vendas: 2000, despesas: 2200, lucro: -200 },
    { name: 'Abr', vendas: 2780, despesas: 2100, lucro: 680 },
    { name: 'Mai', vendas: 1890, despesas: 1700, lucro: 190 },
    { name: 'Jun', vendas: getMetricValue('vendas_total'), despesas: getMetricValue('despesas_mensais'), lucro: getMetricValue('lucro_liquido') }
  ];

  const profitEvolutionData = [
    { mes: 'Jan', lucro: 1000 },
    { mes: 'Fev', lucro: 500 },
    { mes: 'Mar', lucro: -200 },
    { mes: 'Abr', lucro: 680 },
    { mes: 'Mai', lucro: 190 },
    { mes: 'Jun', lucro: getMetricValue('lucro_liquido') }
  ];

  const expensesByCategoryData = [
    { name: 'Marketing', value: 2500 },
    { name: 'Operacional', value: 3000 },
    { name: 'Vendas', value: 1500 },
    { name: 'Outros', value: 1000 }
  ];

  const statusData = [
    { name: 'Ativos', value: getMetricValue('clientes_ativos') },
    { name: 'Inativos', value: 20 }
  ];

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))'];
  const PROFIT_COLOR = 'hsl(142, 76%, 36%)';
  const LOSS_COLOR = 'hsl(0, 84%, 60%)';

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
    </div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Dashboard Personalizado</h1>
            <p className="text-muted-foreground mt-2">Acompanhe suas métricas em tempo real</p>
            {lastUpdate && (
              <p className="text-xs text-muted-foreground mt-1">
                Última atualização: {lastUpdate.toLocaleString('pt-BR')}
              </p>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[140px]">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="trimestral">Trimestral</SelectItem>
                <SelectItem value="anual">Anual</SelectItem>
              </SelectContent>
            </Select>
            
            <Dialog open={isAddDataDialogOpen} onOpenChange={setIsAddDataDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Dados
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="text-2xl">📊 Adicionar Dados ao Dashboard</DialogTitle>
                  <DialogDescription className="text-base">
                    Selecione a métrica e preencha TODOS os dados para atualizar seu dashboard em tempo real
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Métrica *</Label>
                    <Select 
                      value={selectedMetricKey} 
                      onValueChange={(value) => {
                        setSelectedMetricKey(value);
                        setFormData({});
                      }}
                    >
                      <SelectTrigger className="h-11">
                        <SelectValue placeholder="Selecione a métrica que deseja atualizar" />
                      </SelectTrigger>
                      <SelectContent>
                        {config?.metrics?.filter((m: any) => m.enabled).map((metric: any) => (
                          <SelectItem key={metric.key} value={metric.key} className="py-3">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{metric.name}</span>
                              <Badge variant="secondary" className="text-xs">
                                {metric.type === 'currency' ? 'R$' : metric.type === 'percentage' ? '%' : '#'}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedMetricKey && (
                    <div className="space-y-5 border-t pt-6">
                      <div className="bg-muted/50 p-4 rounded-lg">
                        <p className="text-sm font-medium">
                          📝 Preencha os campos abaixo para a métrica: <span className="text-primary">{config?.metrics.find((m: any) => m.key === selectedMetricKey)?.name}</span>
                        </p>
                      </div>
                      
                      {getMetricFormFields(selectedMetricKey).map((field) => (
                        <div key={field.name} className="space-y-2">
                          <Label className="text-sm font-semibold flex items-center gap-1">
                            {field.label}
                            {field.required && <span className="text-destructive">*</span>}
                            {!field.required && <span className="text-muted-foreground text-xs">(opcional)</span>}
                          </Label>
                          {field.type === 'select' ? (
                            <Select 
                              value={formData[field.name] || ''} 
                              onValueChange={(value) => setFormData(prev => ({ ...prev, [field.name]: value }))}
                            >
                              <SelectTrigger className="h-11">
                                <SelectValue placeholder={`Selecione ${field.label.toLowerCase()}`} />
                              </SelectTrigger>
                              <SelectContent>
                                {field.options?.map((option: string) => (
                                  <SelectItem key={option} value={option}>
                                    {option}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : field.type === 'textarea' ? (
                            <Textarea
                              placeholder={field.placeholder}
                              value={formData[field.name] || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                              required={field.required}
                              rows={3}
                              className="resize-none"
                            />
                          ) : (
                            <Input
                              type={field.type}
                              placeholder={field.placeholder}
                              value={formData[field.name] || ''}
                              onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                              required={field.required}
                              step={field.step}
                              className="h-11"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-end gap-3 pt-6 border-t">
                    <Button variant="outline" onClick={() => {
                      setIsAddDataDialogOpen(false);
                      setSelectedMetricKey('');
                      setFormData({});
                    }} size="lg">
                      Cancelar
                    </Button>
                    <Button onClick={handleAddData} disabled={!selectedMetricKey} size="lg" className="min-w-[150px]">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar Dados
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Settings className="h-4 w-4 mr-2" />
                  Configurar Métricas
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configurar Métricas</DialogTitle>
                  <DialogDescription>Escolha quais métricas deseja acompanhar no seu dashboard</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  {config?.metrics?.map((metric: any) => (
                    <div key={metric.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={metric.key}
                        checked={metric.enabled}
                        onCheckedChange={() => toggleMetric(metric.key)}
                      />
                      <Label htmlFor={metric.key} className="cursor-pointer">
                        {metric.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </DialogContent>
            </Dialog>
            <Button onClick={refreshData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </Button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          {config?.metrics?.filter((m: any) => m.enabled).map((metric: any) => {
            const Icon = getMetricIcon(metric.key);
            const value = getMetricValue(metric.key);
            const variation = getMetricVariation(metric.key);
            const isPositiveMetric = !['despesas_mensais'].includes(metric.key);
            const isProfit = variation ? (isPositiveMetric ? variation > 0 : variation < 0) : null;

            return (
              <Card key={metric.key}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {metric.type === 'currency' && formatCurrency(value)}
                    {metric.type === 'number' && value}
                    {metric.type === 'percentage' && `${value}%`}
                  </div>
                  {variation !== null && (
                    <div className="flex items-center gap-1 mt-1">
                      {isProfit ? (
                        <>
                          <ArrowUpRight className="h-3 w-3 text-green-600" />
                          <span className="text-xs font-medium text-green-600">
                            {formatPercentage(Math.abs(variation))}
                          </span>
                        </>
                      ) : (
                        <>
                          <ArrowDownRight className="h-3 w-3 text-red-600" />
                          <span className="text-xs font-medium text-red-600">
                            {formatPercentage(Math.abs(variation))}
                          </span>
                        </>
                      )}
                      <span className="text-xs text-muted-foreground ml-1">vs mês anterior</span>
                    </div>
                  )}
                  {!variation && (
                    <p className="text-xs text-muted-foreground mt-1">Atualização em tempo real</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <Card>
            <CardHeader>
              <CardTitle>Receitas vs Despesas</CardTitle>
              <CardDescription>Comparativo mensal dos últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="vendas" fill="hsl(var(--chart-1))" name="Receitas" />
                  <Bar dataKey="despesas" fill="hsl(var(--chart-2))" name="Despesas" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Evolução do Lucro Líquido</CardTitle>
              <CardDescription>Desempenho mensal do lucro</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={profitEvolutionData}>
                  <defs>
                    <linearGradient id="colorProfit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={PROFIT_COLOR} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={PROFIT_COLOR} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis />
                  <Tooltip />
                  <Area 
                    type="monotone" 
                    dataKey="lucro" 
                    stroke={PROFIT_COLOR} 
                    fillOpacity={1} 
                    fill="url(#colorProfit)" 
                    name="Lucro Líquido"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 mb-4">
          <Card>
            <CardHeader>
              <CardTitle>Despesas por Categoria</CardTitle>
              <CardDescription>Distribuição dos gastos mensais</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={expensesByCategoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent, value }) => `${name}: ${formatCurrency(value)} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {expensesByCategoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Status de Clientes</CardTitle>
              <CardDescription>Distribuição de clientes ativos vs inativos</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {config?.webhook_url && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Integração via Webhook (n8n)</CardTitle>
              <CardDescription>Configure o n8n para enviar dados automaticamente para este dashboard</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Endpoint do Webhook</Label>
                <div className="flex gap-2 mt-2">
                  <div className="bg-muted p-4 rounded-md font-mono text-sm break-all flex-1">
                    {config.webhook_url}
                  </div>
                  <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              <div>
                <Label>Formato dos Dados</Label>
                <div className="bg-muted p-4 rounded-md font-mono text-xs mt-2">
                  {`{
  "metric_key": "vendas_total",
  "value": 15000,
  "metadata": {}
}`}
                </div>
              </div>

              <div>
                <Label>Métricas Disponíveis</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {config.metrics?.map((metric: any) => (
                    <div key={metric.key} className="bg-muted p-2 rounded text-xs">
                      <span className="font-mono">{metric.key}</span>
                      <span className="text-muted-foreground ml-2">- {metric.name}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                <p>💡 <strong>Dica:</strong> No n8n, use um nó HTTP Request configurado como POST para este endpoint.</p>
                <p className="mt-1">Os dados serão atualizados automaticamente no dashboard em tempo real.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default DashboardSystem;