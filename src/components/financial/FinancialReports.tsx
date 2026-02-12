import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { Download, TrendingUp, TrendingDown, Wallet } from 'lucide-react';

interface Props {
  customerProductId: string;
  mode: 'personal' | 'business';
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function FinancialReports({ customerProductId, mode }: Props) {
  const [period, setPeriod] = useState('month');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [customerProductId, period]);

  const fetchData = async () => {
    setLoading(true);
    
    const today = new Date();
    let startDate: string;
    
    switch (period) {
      case 'week': {
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        break;
      }
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
        break;
      case 'quarter':
        startDate = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1).toISOString().split('T')[0];
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1).toISOString().split('T')[0];
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
    }

    const { data } = await (supabase
      .from('financial_agent_transactions' as any)
      .select('*')
      .eq('customer_product_id', customerProductId)
      .gte('date', startDate)
      .order('date', { ascending: true }) as any);

    setTransactions(data || []);
    setLoading(false);
  };

  const getTotalIncome = () => transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
  const getTotalExpenses = () => transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);

  const getMonthlyData = () => {
    const grouped: Record<string, { income: number; expense: number }> = {};
    
    transactions.forEach(t => {
      const month = t.date.slice(0, 7);
      if (!grouped[month]) grouped[month] = { income: 0, expense: 0 };
      grouped[month][t.type as 'income' | 'expense'] += Number(t.amount);
    });

    return Object.entries(grouped).map(([month, data]) => ({
      name: new Date(month + '-01').toLocaleDateString('pt-BR', { month: 'short' }),
      receitas: data.income,
      despesas: data.expense,
      saldo: data.income - data.expense
    }));
  };

  const getExpenseCategories = () => {
    const categories: Record<string, number> = {};
    
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const category = t.description?.split(' ')[0] || 'Outros';
        categories[category] = (categories[category] || 0) + Number(t.amount);
      });

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  };

  const getDailyBalance = () => {
    const dailyData: Record<string, number> = {};
    let runningBalance = 0;

    const sortedTx = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
    
    sortedTx.forEach(t => {
      const amount = t.type === 'income' ? Number(t.amount) : -Number(t.amount);
      runningBalance += amount;
      dailyData[t.date] = runningBalance;
    });

    return Object.entries(dailyData).map(([date, balance]) => ({
      name: new Date(date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
      saldo: balance
    }));
  };

  const handleExport = () => {
    const csvContent = [
      ['Data', 'Tipo', 'Valor', 'Descrição', 'Forma de Pagamento'],
      ...transactions.map(t => [
        t.date,
        t.type === 'income' ? 'Receita' : 'Despesa',
        Number(t.amount).toFixed(2),
        t.description || '',
        t.payment_method || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio-financeiro-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return <div className="animate-pulse space-y-4">
      {[...Array(3)].map((_, i) => <Card key={i} className="h-64 bg-muted/50" />)}
    </div>;
  }

  const totalIncome = getTotalIncome();
  const totalExpenses = getTotalExpenses();
  const balance = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Relatórios</h2>
        <div className="flex items-center gap-4">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Última Semana</SelectItem>
              <SelectItem value="month">Este Mês</SelectItem>
              <SelectItem value="quarter">Este Trimestre</SelectItem>
              <SelectItem value="year">Este Ano</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" /> Exportar CSV
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-emerald-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Receitas</p>
              <p className="text-2xl font-bold text-emerald-500">
                R$ {totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <div className="flex items-center gap-3">
            <TrendingDown className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm text-muted-foreground">Total Despesas</p>
              <p className="text-2xl font-bold text-red-500">
                R$ {totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Card>

        <Card className={`p-6 bg-gradient-to-br ${balance >= 0 ? 'from-blue-500/10 to-blue-600/5 border-blue-500/20' : 'from-red-500/10 to-red-600/5 border-red-500/20'}`}>
          <div className="flex items-center gap-3">
            <Wallet className={`h-8 w-8 ${balance >= 0 ? 'text-blue-500' : 'text-red-500'}`} />
            <div>
              <p className="text-sm text-muted-foreground">Saldo do Período</p>
              <p className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-card/80 backdrop-blur-sm">
          <h3 className="text-lg font-semibold mb-4">Receitas vs Despesas</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={getMonthlyData()}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip 
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="receitas" fill="#10b981" name="Receitas" radius={[4, 4, 0, 0]} />
                <Bar dataKey="despesas" fill="#ef4444" name="Despesas" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 bg-card/80 backdrop-blur-sm">
          <h3 className="text-lg font-semibold mb-4">Despesas por Categoria</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getExpenseCategories()}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {getExpenseCategories().map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
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

      <Card className="p-6 bg-card/80 backdrop-blur-sm">
        <h3 className="text-lg font-semibold mb-4">Evolução do Saldo</h3>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={getDailyBalance()}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value: number) => [`R$ ${value.toFixed(2)}`, 'Saldo']}
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Line 
                type="monotone" 
                dataKey="saldo" 
                stroke="#3b82f6" 
                strokeWidth={2}
                dot={{ fill: '#3b82f6', strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
