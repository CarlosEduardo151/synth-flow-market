import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { Users, TrendingUp, Gift, Award, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';

interface DashboardProps {
  customerProductId: string;
}

export function LoyaltyDashboard({ customerProductId }: DashboardProps) {
  const { toast } = useToast();
  const [stats, setStats] = useState({
    totalClients: 0,
    totalPointsIssued: 0,
    totalRewardsRedeemed: 0,
    activeClientsThisMonth: 0
  });
  const [topClients, setTopClients] = useState<any[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [rewardsData, setRewardsData] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, [customerProductId]);

  const fetchDashboardData = async () => {
    // Buscar estatísticas gerais
    const { data: clients } = await (supabase
      .from('loyalty_clients' as any)
      .select('points_balance, total_points_earned, total_points_redeemed, status, last_transaction_date')
      .eq('customer_product_id', customerProductId) as any);

    if (clients) {
      const totalClients = clients.length;
      
      // Clientes ativos no mês atual (que tiveram transações)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      
      const activeClientsThisMonth = clients.filter((c: any) => {
        if (!c.last_transaction_date) return false;
        const lastTransaction = new Date(c.last_transaction_date);
        return lastTransaction >= startOfMonth;
      }).length;
      
      const totalPointsIssued = clients.reduce((sum: number, c: any) => sum + c.total_points_earned, 0);
      const totalRewardsRedeemed = clients.reduce((sum: number, c: any) => sum + c.total_points_redeemed, 0);

      setStats({ totalClients, activeClientsThisMonth, totalPointsIssued, totalRewardsRedeemed });
    }

    // Buscar top 10 clientes
    const { data: topClientsData } = await (supabase
      .from('loyalty_clients' as any)
      .select('name, points_balance')
      .eq('customer_product_id', customerProductId)
      .order('points_balance', { ascending: false })
      .limit(10) as any);

    setTopClients(topClientsData || []);

    // Buscar transações recentes
    const { data: transactions } = await (supabase
      .from('loyalty_transactions' as any)
      .select('*, client:loyalty_clients(name)')
      .eq('customer_product_id', customerProductId)
      .order('created_at', { ascending: false })
      .limit(10) as any);

    setRecentTransactions(transactions || []);

    // Buscar dados mensais (últimos 6 meses)
    const { data: monthlyTransactions } = await (supabase
      .from('loyalty_transactions' as any)
      .select('created_at, transaction_type, points_amount')
      .eq('customer_product_id', customerProductId)
      .gte('created_at', new Date(new Date().setMonth(new Date().getMonth() - 6)).toISOString()) as any);

    if (monthlyTransactions) {
      const monthlyMap = new Map();
      monthlyTransactions.forEach((t: any) => {
        const month = new Date(t.created_at).toLocaleDateString('pt-BR', { month: 'short' });
        if (!monthlyMap.has(month)) {
          monthlyMap.set(month, { month, ganhos: 0, trocas: 0 });
        }
        const data = monthlyMap.get(month);
        if (t.transaction_type === 'add') {
          data.ganhos += t.points_amount;
        } else if (t.transaction_type === 'redeem') {
          data.trocas += t.points_amount;
        }
      });
      setMonthlyData(Array.from(monthlyMap.values()));
    }

    // Buscar recompensas mais resgatadas
    const { data: rewards } = await (supabase
      .from('loyalty_rewards' as any)
      .select('name, total_redeemed')
      .eq('customer_product_id', customerProductId)
      .gt('total_redeemed', 0)
      .order('total_redeemed', { ascending: false })
      .limit(5) as any);

    setRewardsData(rewards || []);
  };

  const COLORS = ['#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe', '#ede9fe'];

  const exportDashboard = () => {
    const dashboardData = [
      { Métrica: 'Total de Clientes', Valor: stats.totalClients },
      { Métrica: 'Clientes Ativos no Mês', Valor: stats.activeClientsThisMonth },
      { Métrica: 'Pontos Emitidos', Valor: stats.totalPointsIssued },
      { Métrica: 'Pontos Resgatados', Valor: stats.totalRewardsRedeemed }
    ];

    const ws1 = XLSX.utils.json_to_sheet(dashboardData);
    
    const topClientsExport = topClients.map((c, i) => ({
      Posição: i + 1,
      Nome: c.name,
      Pontos: c.points_balance
    }));
    const ws2 = XLSX.utils.json_to_sheet(topClientsExport);
    
    const transactionsExport = recentTransactions.map(t => ({
      Data: new Date(t.created_at).toLocaleString('pt-BR'),
      Cliente: t.client?.name || 'N/A',
      Tipo: t.transaction_type === 'add' ? 'Adição' : 'Resgate',
      Pontos: t.points_amount,
      Descrição: t.description
    }));
    const ws3 = XLSX.utils.json_to_sheet(transactionsExport);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, 'Estatísticas');
    XLSX.utils.book_append_sheet(wb, ws2, 'Top Clientes');
    XLSX.utils.book_append_sheet(wb, ws3, 'Transações Recentes');
    
    XLSX.writeFile(wb, `dashboard-fidelidade-${new Date().toISOString().split('T')[0]}.xlsx`);
    toast({ title: "Sucesso", description: "Dashboard exportado com sucesso!" });
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Painel de Fidelidade Digital</h2>
          <p className="text-muted-foreground mt-1">
            Acompanhe em tempo real os pontos, recompensas e engajamento dos clientes
          </p>
        </div>
        <Button onClick={exportDashboard} variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Exportar Dashboard
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-green-200 dark:border-green-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Cadastrados</CardTitle>
            <Users className="h-5 w-5 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClients}</div>
            <p className="text-xs text-muted-foreground">Total de clientes no programa</p>
          </CardContent>
        </Card>

        <Card className="border-yellow-200 dark:border-yellow-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pontos Emitidos</CardTitle>
            <TrendingUp className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPointsIssued.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Total acumulado de pontos</p>
          </CardContent>
        </Card>

        <Card className="border-blue-200 dark:border-blue-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recompensas Resgatadas</CardTitle>
            <Gift className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRewardsRedeemed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Pontos trocados por prêmios</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 dark:border-purple-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos no Mês</CardTitle>
            <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeClientsThisMonth}</div>
            <p className="text-xs text-muted-foreground">Com transações este mês</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Gráfico de Barras */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução Mensal de Pontos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Bar dataKey="ganhos" fill="#eab308" name="Pontos Ganhos" radius={[8, 8, 0, 0]} />
                <Bar dataKey="trocas" fill="#3b82f6" name="Pontos Trocados" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Gráfico de Pizza */}
        <Card>
          <CardHeader>
            <CardTitle>Recompensas Mais Resgatadas</CardTitle>
          </CardHeader>
          <CardContent>
            {rewardsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={rewardsData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={(entry) => `${entry.name} (${entry.total_redeemed})`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="total_redeemed"
                  >
                    {rewardsData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                Nenhuma recompensa resgatada ainda
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Top 10 Clientes */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="w-5 h-5 text-yellow-600" />
              Top 10 Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topClients.length > 0 ? (
                topClients.map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                        index === 0 ? 'bg-yellow-500 text-white' :
                        index === 1 ? 'bg-gray-400 text-white' :
                        index === 2 ? 'bg-orange-600 text-white' :
                        'bg-primary/10 text-primary'
                      }`}>
                        {index + 1}
                      </div>
                      <span className="font-medium">{client.name}</span>
                    </div>
                    <span className="text-sm font-bold text-yellow-600 dark:text-yellow-400">
                      {client.points_balance} pts
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum cliente cadastrado
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Últimas Transações */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              Últimas Transações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentTransactions.length > 0 ? (
                recentTransactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                    <div className="flex-1">
                      <p className="font-medium">{transaction.client?.name}</p>
                      <p className="text-xs text-muted-foreground">{transaction.description}</p>
                    </div>
                    <div className="text-right ml-4">
                      <p className={`font-bold text-sm ${
                        transaction.transaction_type === 'add' 
                          ? 'text-green-600 dark:text-green-400' 
                          : 'text-red-600 dark:text-red-400'
                      }`}>
                        {transaction.transaction_type === 'add' ? '+' : '-'}{transaction.points_amount} pts
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(transaction.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  Nenhuma transação registrada
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
