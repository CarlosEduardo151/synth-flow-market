import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  Package,
  Wallet,
  PiggyBank,
  Shield,
  Briefcase,
  Zap,
  ExternalLink
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface BoxBalance {
  box_type: string;
  balance: number;
}

interface Transaction {
  type: string;
  amount: number;
  reference_date: string;
}

const COLORS = ['#10b981', '#f59e0b', '#8b5cf6'];

export function FinancialOverview() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    customersCount: 0,
    productsCount: 0,
    reinvestment: 0,
    emergency: 0,
    prolabore: 0
  });
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);

    // Buscar transações do mês atual
    const currentMonth = new Date().toISOString().slice(0, 7);
    const { data: transactions } = await supabase
      .from('financial_transactions')
      .select('type, amount, reference_date')
      .gte('reference_date', `${currentMonth}-01`);

    // Buscar saldos das caixinhas
    const { data: boxBalances } = await supabase
      .from('box_balances')
      .select('box_type, balance');

    // Buscar contagem de clientes
    const { count: customersCount } = await supabase
      .from('admin_crm_customers')
      .select('*', { count: 'exact', head: true });

    // Buscar contagem de produtos
    const { count: productsCount } = await supabase
      .from('admin_products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Calcular estatísticas
    const income = (transactions || [])
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount), 0);
    
    const expenses = (transactions || [])
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount), 0);

    // Mapear saldos das caixinhas
    const boxMap: Record<string, number> = {};
    (boxBalances || []).forEach((b: BoxBalance) => {
      boxMap[b.box_type] = Number(b.balance);
    });

    setStats({
      totalIncome: income,
      totalExpenses: expenses,
      balance: income - expenses,
      customersCount: customersCount || 0,
      productsCount: productsCount || 0,
      reinvestment: boxMap['reinvestment'] || 0,
      emergency: boxMap['emergency'] || 0,
      prolabore: boxMap['prolabore'] || 0
    });

    // Preparar dados mensais para o gráfico
    const monthlyMap: Record<string, { income: number; expense: number }> = {};
    (transactions || []).forEach((t: Transaction) => {
      const date = t.reference_date;
      if (!monthlyMap[date]) {
        monthlyMap[date] = { income: 0, expense: 0 };
      }
      if (t.type === 'income') {
        monthlyMap[date].income += Number(t.amount);
      } else {
        monthlyMap[date].expense += Number(t.amount);
      }
    });

    const sortedDates = Object.keys(monthlyMap).sort();
    setMonthlyData(sortedDates.map(date => ({
      date: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      receitas: monthlyMap[date].income,
      despesas: monthlyMap[date].expense
    })));

    setLoading(false);
  };

  const boxesData = [
    { name: 'Reinvestimento', value: stats.reinvestment },
    { name: 'Emergência', value: stats.emergency },
    { name: 'Pró-labore', value: stats.prolabore }
  ];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(8)].map((_, i) => (
          <Card key={i} className="h-32 bg-muted/50" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Atalho Sniper HFT */}
      <Card className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border-amber-500/30">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/20">
              <Zap className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-500">Bot Sniper HFT</h3>
              <p className="text-sm text-muted-foreground">Trading automatizado de alta frequência</p>
            </div>
          </div>
          <Button 
            onClick={() => navigate('/sistemas/sniper-hft')}
            className="bg-amber-500 hover:bg-amber-600 text-black"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Acessar
          </Button>
        </CardContent>
      </Card>

      {/* Cards de estatísticas principais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receitas do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">
              {formatCurrency(stats.totalIncome)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Despesas do Mês</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {formatCurrency(stats.totalExpenses)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saldo</CardTitle>
            <Wallet className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
              {formatCurrency(stats.balance)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total nas Caixinhas</CardTitle>
            <PiggyBank className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-500">
              {formatCurrency(stats.reinvestment + stats.emergency + stats.prolabore)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cards das 3 Caixinhas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Caixinha Reinvestimento</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">
              {formatCurrency(stats.reinvestment)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">33% do lucro</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Caixinha Emergência</CardTitle>
            <Shield className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">
              {formatCurrency(stats.emergency)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">33% do lucro</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-violet-500/10 to-violet-600/5 border-violet-500/20">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Caixinha Pró-labore</CardTitle>
            <Briefcase className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-violet-500">
              {formatCurrency(stats.prolabore)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">33% do lucro</p>
          </CardContent>
        </Card>
      </div>

      {/* Cards de contagem */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Cadastrados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.customersCount}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.productsCount}</div>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Fluxo de Caixa do Mês</h3>
          <div className="h-[300px]">
            {monthlyData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorReceitas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorDespesas" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="receitas" 
                    stroke="#10b981" 
                    fillOpacity={1} 
                    fill="url(#colorReceitas)" 
                    name="Receitas"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="despesas" 
                    stroke="#ef4444" 
                    fillOpacity={1} 
                    fill="url(#colorDespesas)" 
                    name="Despesas"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Nenhuma transação registrada este mês
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Distribuição das Caixinhas</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={boxesData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {boxesData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatCurrency(value)}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
