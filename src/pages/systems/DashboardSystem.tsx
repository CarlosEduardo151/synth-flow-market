import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Users, ShoppingCart, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
    const { data: configData, error: configError } = await supabase
      .from('dashboard_configs')
      .select('*')
      .eq('customer_product_id', productId)
      .single();

    if (configData) {
      setConfig(configData);
      
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
            { key: 'vendas_total', name: 'Vendas Totais', type: 'number' },
            { key: 'ticket_medio', name: 'Ticket Médio', type: 'number' },
            { key: 'clientes_ativos', name: 'Clientes Ativos', type: 'number' }
          ]
        })
        .select()
        .single();

      if (newConfig) {
        setConfig(newConfig);
        // Inserir dados de exemplo
        await supabase.from('dashboard_data').insert([
          { dashboard_config_id: newConfig.id, metric_key: 'vendas_total', value: 15000, metadata: {} },
          { dashboard_config_id: newConfig.id, metric_key: 'ticket_medio', value: 250, metadata: {} },
          { dashboard_config_id: newConfig.id, metric_key: 'clientes_ativos', value: 60, metadata: {} }
        ]);
        await loadDashboard(productId);
      }
    }
  };

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

  const getMetricValue = (key: string) => {
    const metric = data.find(d => d.metric_key === key);
    return metric ? metric.value : 0;
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
          <Button onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar Dados
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas Totais</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {getMetricValue('vendas_total').toLocaleString('pt-BR')}</div>
              <p className="text-xs text-muted-foreground">+20.1% em relação ao mês passado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R$ {getMetricValue('ticket_medio').toLocaleString('pt-BR')}</div>
              <p className="text-xs text-muted-foreground">+12% em relação ao mês passado</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getMetricValue('clientes_ativos')}</div>
              <p className="text-xs text-muted-foreground">+5 novos este mês</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa de Crescimento</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">+18.5%</div>
              <p className="text-xs text-muted-foreground">Crescimento mensal</p>
            </CardContent>
          </Card>
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
              <CardTitle>Integração via Webhook</CardTitle>
              <CardDescription>Configure o n8n para enviar dados para este dashboard</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-md font-mono text-sm break-all">
                POST {config.webhook_url}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Envie dados no formato: {`{ "metric_key": "vendas_total", "value": 15000 }`}
              </p>
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default DashboardSystem;