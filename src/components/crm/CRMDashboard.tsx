import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, TrendingUp, Target, Award } from 'lucide-react';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { CRMAIInsights } from './CRMAIInsights';

interface CRMCustomer {
  id: string;
  name: string;
  status: string;
  created_at: string;
  total_purchases: number;
}

interface CRMDashboardProps {
  customers: CRMCustomer[];
  opportunities: any[];
}

export const CRMDashboard = ({ customers, opportunities }: CRMDashboardProps) => {
  // Estatísticas gerais
  const totalClients = customers.length;
  const activeClients = customers.filter(c => c.status === 'customer').length;
  const leads = customers.filter(c => c.status === 'lead').length;
  const conversionRate = totalClients > 0 ? ((activeClients / totalClients) * 100).toFixed(1) : 0;

  // Dados para gráfico de pizza (clientes por status)
  const statusData = [
    { name: 'Clientes Ativos', value: activeClients, color: 'hsl(var(--chart-1))' },
    { name: 'Em Negociação', value: customers.filter(c => c.status === 'prospect').length, color: 'hsl(var(--chart-2))' },
    { name: 'Leads', value: leads, color: 'hsl(var(--chart-3))' },
    { name: 'Inativos', value: customers.filter(c => c.status === 'inactive').length, color: 'hsl(var(--chart-4))' }
  ].filter(item => item.value > 0);

  // Dados para gráfico de linha (evolução mensal)
  const getMonthlyData = () => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentYear = new Date().getFullYear();
    const monthlyCount: { [key: string]: number } = {};

    customers.forEach(customer => {
      const date = new Date(customer.created_at);
      if (date.getFullYear() === currentYear) {
        const monthName = months[date.getMonth()];
        monthlyCount[monthName] = (monthlyCount[monthName] || 0) + 1;
      }
    });

    return months.map(month => ({
      month,
      clientes: monthlyCount[month] || 0
    }));
  };

  const monthlyData = getMonthlyData();

  // Últimos 5 clientes adicionados
  const recentCustomers = [...customers]
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 5);

  const getStatusBadgeVariant = (status: string): any => {
    const variants: Record<string, any> = {
      customer: 'default',
      prospect: 'secondary',
      lead: 'outline',
      inactive: 'destructive',
    };
    return variants[status] ?? 'outline';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      customer: 'Cliente',
      prospect: 'Em Negociação',
      lead: 'Lead',
      inactive: 'Inativo',
    };
    return labels[status] ?? status;
  };

  return (
    <div className="space-y-6">
      {/* Análise Preditiva com IA */}
      <CRMAIInsights customers={customers} opportunities={opportunities} />
      {/* Cards de resumo */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClients}</div>
            <p className="text-xs text-muted-foreground">cadastrados no sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Ativos</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeClients}</div>
            <p className="text-xs text-muted-foreground">com status ativo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Oportunidades</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{opportunities.length}</div>
            <p className="text-xs text-muted-foreground">em andamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Conversão</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground">leads convertidos</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Clientes por Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="hsl(var(--muted))"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Evolução Mensal de Novos Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="clientes" 
                  stroke="hsl(var(--primary))" 
                  strokeWidth={2}
                  name="Novos Clientes"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Últimos clientes adicionados */}
      <Card>
        <CardHeader>
          <CardTitle>Últimos Clientes Adicionados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentCustomers.map(customer => (
              <div key={customer.id} className="flex items-center justify-between border-b pb-2">
                <div>
                  <p className="font-medium">{customer.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(customer.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant={getStatusBadgeVariant(customer.status)}>
                    {getStatusLabel(customer.status)}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};