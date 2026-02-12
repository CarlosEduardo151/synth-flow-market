import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Receipt,
  ArrowUpRight,
  ArrowDownRight
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
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts';

interface Props {
  customerProductId: string;
  mode: 'personal' | 'business';
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
  category_id: string | null;
}

interface Invoice {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  status: string;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899'];

export function FinancialDashboard({ customerProductId, mode }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalIncome: 0,
    totalExpenses: 0,
    balance: 0,
    pendingInvoices: 0
  });

  useEffect(() => {
    fetchData();
  }, [customerProductId]);

  const fetchData = async () => {
    setLoading(true);
    
    const currentMonth = new Date().toISOString().slice(0, 7);
    
    try {
      // Fetch transactions
      const { data: txData } = await (supabase
        .from('financial_agent_transactions' as any)
        .select('*')
        .eq('customer_product_id', customerProductId)
        .gte('date', `${currentMonth}-01`)
        .order('date', { ascending: false }) as any);

      // Fetch pending invoices
      const { data: invData } = await (supabase
        .from('financial_agent_invoices' as any)
        .select('*')
        .eq('customer_product_id', customerProductId)
        .eq('status', 'pending')
        .order('due_date', { ascending: true }) as any);

      if (txData) {
        setTransactions(txData as Transaction[]);
        const income = (txData as any[]).filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
        const expenses = (txData as any[]).filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
        setStats({
          totalIncome: income,
          totalExpenses: expenses,
          balance: income - expenses,
          pendingInvoices: (invData as any[])?.reduce((sum, inv) => sum + Number(inv.amount), 0) || 0
        });
      }

      if (invData) {
        setInvoices(invData as Invoice[]);
      }
    } catch (error) {
      console.error('Error fetching financial data:', error);
    }

    setLoading(false);
  };

  // Prepare chart data
  const getLast7DaysData = () => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayTransactions = transactions.filter(t => t.date === dateStr);
      const income = dayTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + Number(t.amount), 0);
      const expenses = dayTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + Number(t.amount), 0);
      
      days.push({
        name: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
        receitas: income,
        despesas: expenses
      });
    }
    return days;
  };

  const getExpensesByCategory = () => {
    const categories: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        const category = t.description?.split(' ')[0] || 'Outros';
        categories[category] = (categories[category] || 0) + Number(t.amount);
      });
    
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-pulse">
        {[...Array(4)].map((_, i) => (
          <Card key={i} className="p-6 h-32 bg-muted/50" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-6 bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Receitas</p>
              <p className="text-2xl font-bold text-emerald-500">
                R$ {stats.totalIncome.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-emerald-500/20 rounded-full">
              <TrendingUp className="h-6 w-6 text-emerald-500" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm text-emerald-500">
            <ArrowUpRight className="h-4 w-4 mr-1" />
            Este mês
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-red-500/10 to-red-600/5 border-red-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Despesas</p>
              <p className="text-2xl font-bold text-red-500">
                R$ {stats.totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-red-500/20 rounded-full">
              <TrendingDown className="h-6 w-6 text-red-500" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm text-red-500">
            <ArrowDownRight className="h-4 w-4 mr-1" />
            Este mês
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Saldo</p>
              <p className={`text-2xl font-bold ${stats.balance >= 0 ? 'text-blue-500' : 'text-red-500'}`}>
                R$ {stats.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-blue-500/20 rounded-full">
              <Wallet className="h-6 w-6 text-blue-500" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm text-muted-foreground">
            Receitas - Despesas
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Faturas Pendentes</p>
              <p className="text-2xl font-bold text-amber-500">
                R$ {stats.pendingInvoices.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-3 bg-amber-500/20 rounded-full">
              <Receipt className="h-6 w-6 text-amber-500" />
            </div>
          </div>
          <div className="mt-2 flex items-center text-sm text-amber-500">
            {invoices.length} {invoices.length === 1 ? 'fatura' : 'faturas'}
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-card/80 backdrop-blur-sm">
          <h3 className="text-lg font-semibold mb-4">Fluxo dos Últimos 7 Dias</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={getLast7DaysData()}>
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
                <XAxis dataKey="name" className="text-muted-foreground" />
                <YAxis className="text-muted-foreground" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                  formatter={(value: number) => [`R$ ${value.toFixed(2)}`, '']}
                />
                <Legend />
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
          </div>
        </Card>

        <Card className="p-6 bg-card/80 backdrop-blur-sm">
          <h3 className="text-lg font-semibold mb-4">Despesas por Categoria</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={getExpensesByCategory()}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {getExpensesByCategory().map((_, index) => (
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

      {/* Recent Transactions & Upcoming Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 bg-card/80 backdrop-blur-sm">
          <h3 className="text-lg font-semibold mb-4">Transações Recentes</h3>
          <div className="space-y-3">
            {transactions.slice(0, 5).map(tx => (
              <div key={tx.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${tx.type === 'income' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                    {tx.type === 'income' ? (
                      <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{tx.description || (tx.type === 'income' ? 'Receita' : 'Despesa')}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(tx.date).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                <p className={`font-semibold ${tx.type === 'income' ? 'text-emerald-500' : 'text-red-500'}`}>
                  {tx.type === 'income' ? '+' : '-'} R$ {Number(tx.amount).toFixed(2)}
                </p>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma transação este mês
              </p>
            )}
          </div>
        </Card>

        <Card className="p-6 bg-card/80 backdrop-blur-sm">
          <h3 className="text-lg font-semibold mb-4">Próximas Faturas</h3>
          <div className="space-y-3">
            {invoices.slice(0, 5).map(inv => {
              const dueDate = new Date(inv.due_date);
              const today = new Date();
              const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              const isOverdue = daysUntil < 0;
              
              return (
                <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${isOverdue ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
                      <Receipt className={`h-4 w-4 ${isOverdue ? 'text-red-500' : 'text-amber-500'}`} />
                    </div>
                    <div>
                      <p className="font-medium">{inv.title}</p>
                      <p className={`text-sm ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {isOverdue 
                          ? `Vencida há ${Math.abs(daysUntil)} dias`
                          : daysUntil === 0 
                            ? 'Vence hoje'
                            : `Vence em ${daysUntil} dias`
                        }
                      </p>
                    </div>
                  </div>
                  <p className="font-semibold text-amber-500">
                    R$ {Number(inv.amount).toFixed(2)}
                  </p>
                </div>
              );
            })}
            {invoices.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma fatura pendente
              </p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
