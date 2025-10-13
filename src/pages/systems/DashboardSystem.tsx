import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Users, ShoppingCart, RefreshCw, Settings, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/hooks/use-toast';

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
      const { data: productData, error: productError } = await supabase
        .from('customer_products')
        .select('id')
        .eq('user_id', user.id)
        .eq('product_slug', 'dashboards-personalizados')
        .eq('is_active', true)
        .single();

      if (productError || !productData) {
        toast({
          title: "Acesso Negado",
          description: "Você precisa comprar o Dashboard para acessar este sistema.",
          variant: "destructive"
        });
        navigate('/meus-produtos');
        return;
      }

      await loadDashboard(productData.id);
    } catch (error) {
      console.error('Error checking access:', error);
      navigate('/meus-produtos');
    } finally {
      setIsLoading(false);
    }
  };

  const loadDashboard = async (productId: string) => {
    const { data: configData } = await supabase
      .from('dashboard_configs')
      .select('*')
      .eq('customer_product_id', productId)
      .single();

    if (configData) {
      setConfig(configData);
      
      // Gerar webhook URL se não existir
      if (!configData.webhook_url) {
        const webhookUrl = `https://agndhravgmcwpdjkozka.supabase.co/functions/v1/dashboard-webhook?config_id=${configData.id}`;
        await supabase
          .from('dashboard_configs')
          .update({ webhook_url: webhookUrl })
          .eq('id', configData.id);
        setConfig({ ...configData, webhook_url: webhookUrl });
      }
      
      const { data: dashboardData } = await supabase
        .from('dashboard_data')
        .select('*')
        .eq('dashboard_config_id', configData.id)
        .order('timestamp', { ascending: false })
        .limit(100);

      if (dashboardData) {
        setData(dashboardData);
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
            { key: 'despesas_mensais', name: 'Despesas Mensais', type: 'currency', enabled: false }
          ]
        })
        .select()
        .single();

      if (newConfig) {
        const webhookUrl = `https://agndhravgmcwpdjkozka.supabase.co/functions/v1/dashboard-webhook?config_id=${newConfig.id}`;
        await supabase
          .from('dashboard_configs')
          .update({ webhook_url: webhookUrl })
          .eq('id', newConfig.id);
        
        // Inserir dados de exemplo
        await supabase.from('dashboard_data').insert([
          { dashboard_config_id: newConfig.id, metric_key: 'vendas_total', value: 15000, metadata: {} },
          { dashboard_config_id: newConfig.id, metric_key: 'ticket_medio', value: 250, metadata: {} },
          { dashboard_config_id: newConfig.id, metric_key: 'clientes_ativos', value: 60, metadata: {} },
          { dashboard_config_id: newConfig.id, metric_key: 'lucro_liquido', value: 5000, metadata: {} }
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

  const salesData = [
    { name: 'Jan', vendas: 4000 },
    { name: 'Fev', vendas: 3000 },
    { name: 'Mar', vendas: 2000 },
    { name: 'Abr', vendas: 2780 },
    { name: 'Mai', vendas: 1890 },
    { name: 'Jun', vendas: getMetricValue('vendas_total') }
  ];

  const statusData = [
    { name: 'Ativos', value: getMetricValue('clientes_ativos') },
    { name: 'Inativos', value: 20 }
  ];

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

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
          </div>
          <div className="flex gap-2">
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
          {isMetricEnabled('vendas_total') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Vendas Totais</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(getMetricValue('vendas_total'))}</div>
                <p className="text-xs text-muted-foreground">Atualização em tempo real</p>
              </CardContent>
            </Card>
          )}

          {isMetricEnabled('ticket_medio') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(getMetricValue('ticket_medio'))}</div>
                <p className="text-xs text-muted-foreground">Valor médio por venda</p>
              </CardContent>
            </Card>
          )}

          {isMetricEnabled('clientes_ativos') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{getMetricValue('clientes_ativos')}</div>
                <p className="text-xs text-muted-foreground">Base de clientes</p>
              </CardContent>
            </Card>
          )}

          {isMetricEnabled('lucro_liquido') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Lucro Líquido</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(getMetricValue('lucro_liquido'))}</div>
                <p className="text-xs text-muted-foreground">Lucro do período</p>
              </CardContent>
            </Card>
          )}

          {isMetricEnabled('despesas_mensais') && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Despesas Mensais</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(getMetricValue('despesas_mensais'))}</div>
                <p className="text-xs text-muted-foreground">Gastos do mês</p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Vendas por Mês</CardTitle>
              <CardDescription>Evolução de vendas nos últimos 6 meses</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="vendas" stroke="#8884d8" strokeWidth={2} />
                </LineChart>
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