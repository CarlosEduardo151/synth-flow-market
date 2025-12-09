import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Flame,
  Star
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

interface SalesDashboardProps {
  customerProductId: string;
}

interface Lead {
  id: string;
  name: string;
  status: string;
  priority: string;
  score: number;
  estimated_value: number;
  created_at: string;
}

interface Meeting {
  id: string;
  status: string;
  scheduled_at: string;
}

interface FollowUp {
  id: string;
  status: string;
  scheduled_at: string;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const STATUS_COLORS: Record<string, string> = {
  new: '#3b82f6',
  contacted: '#8b5cf6',
  qualified: '#f59e0b',
  proposal: '#ec4899',
  negotiation: '#10b981',
  won: '#22c55e',
  lost: '#ef4444'
};

export function SalesDashboard({ customerProductId }: SalesDashboardProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [customerProductId]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [leadsRes, meetingsRes, followUpsRes] = await Promise.all([
        supabase
          .from('sales_leads')
          .select('*')
          .eq('customer_product_id', customerProductId),
        supabase
          .from('sales_meetings')
          .select('*, sales_leads!inner(customer_product_id)')
          .eq('sales_leads.customer_product_id', customerProductId),
        supabase
          .from('sales_follow_ups')
          .select('*, sales_leads!inner(customer_product_id)')
          .eq('sales_leads.customer_product_id', customerProductId)
      ]);

      if (leadsRes.data) setLeads(leadsRes.data);
      if (meetingsRes.data) setMeetings(meetingsRes.data);
      if (followUpsRes.data) setFollowUps(followUpsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate stats
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter(l => l.status === 'qualified' || l.status === 'proposal' || l.status === 'negotiation').length;
  const wonLeads = leads.filter(l => l.status === 'won').length;
  const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0';
  const totalRevenue = leads.filter(l => l.status === 'won').reduce((sum, l) => sum + (l.estimated_value || 0), 0);
  const potentialRevenue = leads.filter(l => l.status !== 'won' && l.status !== 'lost').reduce((sum, l) => sum + (l.estimated_value || 0), 0);
  
  const upcomingMeetings = meetings.filter(m => 
    m.status === 'scheduled' || m.status === 'confirmed'
  ).length;
  
  const pendingFollowUps = followUps.filter(f => f.status === 'pending').length;
  const urgentLeads = leads.filter(l => l.priority === 'urgent' || l.priority === 'high').length;

  // Charts data
  const statusData = [
    { name: 'Novos', value: leads.filter(l => l.status === 'new').length, color: STATUS_COLORS.new },
    { name: 'Contatados', value: leads.filter(l => l.status === 'contacted').length, color: STATUS_COLORS.contacted },
    { name: 'Qualificados', value: leads.filter(l => l.status === 'qualified').length, color: STATUS_COLORS.qualified },
    { name: 'Proposta', value: leads.filter(l => l.status === 'proposal').length, color: STATUS_COLORS.proposal },
    { name: 'Negociação', value: leads.filter(l => l.status === 'negotiation').length, color: STATUS_COLORS.negotiation },
    { name: 'Ganhos', value: leads.filter(l => l.status === 'won').length, color: STATUS_COLORS.won },
    { name: 'Perdidos', value: leads.filter(l => l.status === 'lost').length, color: STATUS_COLORS.lost },
  ].filter(d => d.value > 0);

  // Weekly leads trend (last 7 days)
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayLeads = leads.filter(l => {
      const leadDate = new Date(l.created_at);
      return leadDate.toDateString() === date.toDateString();
    }).length;
    return {
      day: date.toLocaleDateString('pt-BR', { weekday: 'short' }),
      leads: dayLeads
    };
  });

  // Priority distribution
  const priorityData = [
    { name: 'Urgente', value: leads.filter(l => l.priority === 'urgent').length, fill: '#ef4444' },
    { name: 'Alta', value: leads.filter(l => l.priority === 'high').length, fill: '#f59e0b' },
    { name: 'Média', value: leads.filter(l => l.priority === 'medium').length, fill: '#3b82f6' },
    { name: 'Baixa', value: leads.filter(l => l.priority === 'low').length, fill: '#6b7280' },
  ];

  // Top leads by score
  const topLeads = [...leads]
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Leads</p>
                <p className="text-3xl font-bold">{totalLeads}</p>
                <p className="text-xs text-blue-500 flex items-center gap-1 mt-1">
                  <ArrowUpRight className="h-3 w-3" />
                  {qualifiedLeads} qualificados
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/5 border-emerald-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                <p className="text-3xl font-bold">{conversionRate}%</p>
                <p className="text-xs text-emerald-500 flex items-center gap-1 mt-1">
                  <TrendingUp className="h-3 w-3" />
                  {wonLeads} vendas fechadas
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                <Target className="h-6 w-6 text-emerald-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 border-amber-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Receita Potencial</p>
                <p className="text-3xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(potentialRevenue)}
                </p>
                <p className="text-xs text-amber-500 flex items-center gap-1 mt-1">
                  <DollarSign className="h-3 w-3" />
                  Em negociação
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Reuniões Agendadas</p>
                <p className="text-3xl font-bold">{upcomingMeetings}</p>
                <p className="text-xs text-purple-500 flex items-center gap-1 mt-1">
                  <Calendar className="h-3 w-3" />
                  {pendingFollowUps} follow-ups pendentes
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-purple-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-gradient-to-r from-red-500/10 to-orange-500/10 border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <Flame className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{urgentLeads}</p>
                <p className="text-sm text-muted-foreground">Leads Urgentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingFollowUps}</p>
                <p className="text-sm text-muted-foreground">Follow-ups Pendentes</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(totalRevenue)}
                </p>
                <p className="text-sm text-muted-foreground">Receita Fechada</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Leads by Status */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Status</CardTitle>
            <CardDescription>Visão geral do funil de vendas</CardDescription>
          </CardHeader>
          <CardContent>
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
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
                Nenhum lead cadastrado ainda
              </div>
            )}
          </CardContent>
        </Card>

        {/* Weekly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Novos Leads por Dia</CardTitle>
            <CardDescription>Últimos 7 dias</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="colorLeads" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="day" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="leads" 
                  stroke="#10b981" 
                  fillOpacity={1} 
                  fill="url(#colorLeads)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Priority Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Leads por Prioridade</CardTitle>
            <CardDescription>Distribuição de prioridades</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={priorityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis type="number" className="text-xs" />
                <YAxis dataKey="name" type="category" className="text-xs" width={70} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {priorityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Leads */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5 text-amber-500" />
              Top Leads por Score
            </CardTitle>
            <CardDescription>Leads mais qualificados</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topLeads.length > 0 ? topLeads.map((lead, index) => (
                <div key={lead.id} className="flex items-center gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{lead.name}</p>
                    <div className="flex items-center gap-2">
                      <Progress value={lead.score} className="h-2 flex-1" />
                      <span className="text-sm text-muted-foreground">{lead.score}%</span>
                    </div>
                  </div>
                  <Badge variant={lead.priority === 'urgent' ? 'destructive' : lead.priority === 'high' ? 'default' : 'secondary'}>
                    {lead.priority}
                  </Badge>
                </div>
              )) : (
                <p className="text-muted-foreground text-center py-8">Nenhum lead cadastrado</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
