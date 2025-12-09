import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Target,
  Calendar,
  Download,
  ArrowUpRight
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SalesReportsProps {
  customerProductId: string;
}

interface Lead {
  id: string;
  status: string;
  priority: string;
  estimated_value: number;
  source: string;
  created_at: string;
}

interface Meeting {
  id: string;
  status: string;
  created_at: string;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#6366f1'];

export function SalesReports({ customerProductId }: SalesReportsProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    loadData();
  }, [customerProductId, period]);

  const loadData = async () => {
    setIsLoading(true);
    const startDate = subDays(new Date(), parseInt(period)).toISOString();

    const [leadsRes, meetingsRes] = await Promise.all([
      supabase
        .from('sales_leads')
        .select('*')
        .eq('customer_product_id', customerProductId)
        .gte('created_at', startDate),
      supabase
        .from('sales_meetings')
        .select('*, sales_leads!inner(customer_product_id)')
        .eq('sales_leads.customer_product_id', customerProductId)
        .gte('created_at', startDate)
    ]);

    if (leadsRes.data) setLeads(leadsRes.data);
    if (meetingsRes.data) setMeetings(meetingsRes.data);
    setIsLoading(false);
  };

  // Calculate metrics
  const totalLeads = leads.length;
  const wonLeads = leads.filter(l => l.status === 'won').length;
  const lostLeads = leads.filter(l => l.status === 'lost').length;
  const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0';
  const totalRevenue = leads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.estimated_value || 0), 0);
  const avgDealSize = wonLeads > 0 ? totalRevenue / wonLeads : 0;
  const completedMeetings = meetings.filter(m => m.status === 'completed').length;

  // Daily leads trend
  const daysInPeriod = parseInt(period);
  const dailyData = Array.from({ length: Math.min(daysInPeriod, 30) }, (_, i) => {
    const date = subDays(new Date(), daysInPeriod - 1 - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayLeads = leads.filter(l => format(parseISO(l.created_at), 'yyyy-MM-dd') === dateStr);
    const dayMeetings = meetings.filter(m => format(parseISO(m.created_at), 'yyyy-MM-dd') === dateStr);
    
    return {
      date: format(date, 'dd/MM'),
      leads: dayLeads.length,
      won: dayLeads.filter(l => l.status === 'won').length,
      meetings: dayMeetings.length
    };
  });

  // Source distribution
  const sourceData = Object.entries(
    leads.reduce((acc, lead) => {
      const source = lead.source || 'Outro';
      acc[source] = (acc[source] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  ).map(([name, value], index) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1).replace('_', ' '),
    value,
    color: COLORS[index % COLORS.length]
  }));

  // Funnel data
  const funnelData = [
    { stage: 'Novos', count: leads.filter(l => l.status === 'new').length },
    { stage: 'Contatados', count: leads.filter(l => l.status === 'contacted').length },
    { stage: 'Qualificados', count: leads.filter(l => l.status === 'qualified').length },
    { stage: 'Proposta', count: leads.filter(l => l.status === 'proposal').length },
    { stage: 'Negociação', count: leads.filter(l => l.status === 'negotiation').length },
    { stage: 'Ganhos', count: leads.filter(l => l.status === 'won').length },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Relatórios de Vendas</h2>
          <p className="text-muted-foreground">Análise detalhada do desempenho comercial</p>
        </div>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Leads Gerados</p>
                <p className="text-3xl font-bold">{totalLeads}</p>
                <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  +{(totalLeads / parseInt(period)).toFixed(1)}/dia
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                <p className="text-3xl font-bold">{conversionRate}%</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  {wonLeads} ganhos / {lostLeads} perdidos
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Target className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Total</p>
                <p className="text-3xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(totalRevenue)}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  Ticket médio: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgDealSize)}
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reuniões Realizadas</p>
                <p className="text-3xl font-bold">{completedMeetings}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  {meetings.length} total agendadas
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução Diária</CardTitle>
            <CardDescription>Leads e conversões por dia</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorLeadsArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorWon" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Legend />
                <Area 
                  type="monotone" 
                  dataKey="leads" 
                  name="Leads"
                  stroke="#3b82f6" 
                  fillOpacity={1} 
                  fill="url(#colorLeadsArea)" 
                />
                <Area 
                  type="monotone" 
                  dataKey="won" 
                  name="Ganhos"
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorWon)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Source Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Origem dos Leads</CardTitle>
            <CardDescription>Distribuição por fonte</CardDescription>
          </CardHeader>
          <CardContent>
            {sourceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={sourceData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {sourceData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Sem dados disponíveis
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sales Funnel */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Funil de Vendas</CardTitle>
            <CardDescription>Conversão por etapa do pipeline</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={funnelData} layout="vertical">
                <defs>
                  <linearGradient id="funnelGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#3b82f6" />
                    <stop offset="100%" stopColor="#10b981" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="stage" type="category" className="text-xs" width={100} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="url(#funnelGradient)" 
                  radius={[0, 4, 4, 0]}
                  name="Leads"
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
