import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from '@/hooks/use-toast';
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  DollarSign,
  Target,
  ArrowUpRight,
  Clock,
  Flame,
  Star,
  Sparkles,
  Brain,
  Loader2,
  RefreshCw,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  Zap
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
  ai_score: number;
  created_at: string;
}

interface AIInsight {
  kpi_summary?: any;
  alerts?: Array<{ type: string; message: string; priority: string }>;
  opportunities?: Array<{ description: string; potential_value: string }>;
  trends?: string[];
  weekly_goals?: string[];
  ai_recommendations?: Array<{ title: string; description: string; impact: string }>;
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
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [followUps, setFollowUps] = useState<any[]>([]);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [pipeline, setPipeline] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [aiInsights, setAiInsights] = useState<AIInsight | null>(null);
  const [isLoadingAI, setIsLoadingAI] = useState(false);
  const [hasCRMIntegration, setHasCRMIntegration] = useState(false);

  useEffect(() => {
    if (user) {
      loadData();
      checkCRMIntegration();
    }
  }, [user]);

  const checkCRMIntegration = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('customer_products')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_slug', 'crm-simples')
      .eq('is_active', true)
      .maybeSingle();
    setHasCRMIntegration(!!data);
  };

  const loadData = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const [leadsRes, followUpsRes, meetingsRes, pipelineRes] = await Promise.all([
        supabase.from('sales_leads').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('sales_follow_ups').select('*').eq('user_id', user.id).eq('status', 'pending'),
        supabase.from('sales_meetings').select('*').eq('user_id', user.id).gte('scheduled_at', new Date().toISOString()),
        supabase.from('sales_pipeline').select('*, sales_leads(*)').eq('user_id', user.id)
      ]);

      if (leadsRes.data) setLeads(leadsRes.data);
      if (followUpsRes.data) setFollowUps(followUpsRes.data);
      if (meetingsRes.data) setMeetings(meetingsRes.data);
      if (pipelineRes.data) setPipeline(pipelineRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const generateAIInsights = async () => {
    if (!user) return;
    setIsLoadingAI(true);
    try {
      const { data, error } = await supabase.functions.invoke('sales-ai', {
        body: { action: 'dashboard_insights', userId: user.id }
      });

      if (error) throw error;
      if (data?.success && data?.data) {
        setAiInsights(data.data);
        toast({ title: 'Insights gerados com sucesso!' });
      } else if (data?.error) {
        throw new Error(data.error);
      }
    } catch (error: any) {
      console.error('AI Error:', error);
      toast({ 
        title: 'Erro ao gerar insights', 
        description: error.message || 'Tente novamente',
        variant: 'destructive' 
      });
    } finally {
      setIsLoadingAI(false);
    }
  };

  // Calculate stats
  const totalLeads = leads.length;
  const qualifiedLeads = leads.filter(l => ['qualified', 'proposal', 'negotiation'].includes(l.status)).length;
  const wonLeads = leads.filter(l => l.status === 'won').length;
  const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0';
  const pendingFollowUps = followUps.length;
  const upcomingMeetings = meetings.length;
  const urgentLeads = leads.filter(l => (l as any).priority === 'urgent' || (l as any).priority === 'high').length;

  // Charts data
  const statusData = [
    { name: 'Novos', value: leads.filter(l => l.status === 'new').length, color: STATUS_COLORS.new },
    { name: 'Contatados', value: leads.filter(l => l.status === 'contacted').length, color: STATUS_COLORS.contacted },
    { name: 'Qualificados', value: leads.filter(l => l.status === 'qualified').length, color: STATUS_COLORS.qualified },
    { name: 'Proposta', value: leads.filter(l => l.status === 'proposal').length, color: STATUS_COLORS.proposal },
    { name: 'Negociação', value: leads.filter(l => l.status === 'negotiation').length, color: STATUS_COLORS.negotiation },
    { name: 'Ganhos', value: leads.filter(l => l.status === 'won').length, color: STATUS_COLORS.won },
  ].filter(d => d.value > 0);

  // Weekly leads trend
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - i));
    const dayLeads = leads.filter(l => {
      const leadDate = new Date(l.created_at);
      return leadDate.toDateString() === date.toDateString();
    }).length;
    return { day: date.toLocaleDateString('pt-BR', { weekday: 'short' }), leads: dayLeads };
  });

  // Top leads by AI score
  const topLeads = [...leads].sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0)).slice(0, 5);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* AI Insights Section */}
      <Card className="bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-fuchsia-500/10 border-purple-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <Brain className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">Insights com IA</CardTitle>
                <CardDescription>Análise inteligente do seu pipeline de vendas</CardDescription>
              </div>
            </div>
            <Button 
              onClick={generateAIInsights} 
              disabled={isLoadingAI}
              className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
            >
              {isLoadingAI ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {isLoadingAI ? 'Analisando...' : 'Gerar Insights'}
            </Button>
          </div>
        </CardHeader>
        {aiInsights && (
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Alerts */}
              {aiInsights.alerts && aiInsights.alerts.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-500" />
                    Alertas
                  </h4>
                  {aiInsights.alerts.slice(0, 3).map((alert, i) => (
                    <div key={i} className="text-xs p-2 rounded bg-amber-500/10 border border-amber-500/20">
                      {alert.message}
                    </div>
                  ))}
                </div>
              )}

              {/* Opportunities */}
              {aiInsights.opportunities && aiInsights.opportunities.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Lightbulb className="h-4 w-4 text-emerald-500" />
                    Oportunidades
                  </h4>
                  {aiInsights.opportunities.slice(0, 3).map((opp, i) => (
                    <div key={i} className="text-xs p-2 rounded bg-emerald-500/10 border border-emerald-500/20">
                      {opp.description}
                    </div>
                  ))}
                </div>
              )}

              {/* Recommendations */}
              {aiInsights.ai_recommendations && aiInsights.ai_recommendations.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-blue-500" />
                    Recomendações
                  </h4>
                  {aiInsights.ai_recommendations.slice(0, 3).map((rec, i) => (
                    <div key={i} className="text-xs p-2 rounded bg-blue-500/10 border border-blue-500/20">
                      <strong>{rec.title}:</strong> {rec.description}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      {/* CRM Integration Badge */}
      {hasCRMIntegration && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
          <span className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
            Integração com CRM ativa - Dados do CRM estão sendo usados para enriquecer análises
          </span>
        </div>
      )}

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
                <p className="text-sm text-muted-foreground">Follow-ups Pendentes</p>
                <p className="text-3xl font-bold">{pendingFollowUps}</p>
                <p className="text-xs text-amber-500 flex items-center gap-1 mt-1">
                  <Clock className="h-3 w-3" />
                  Aguardando ação
                </p>
              </div>
              <div className="h-12 w-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-500" />
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
                  Próximas reuniões
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
                <p className="text-2xl font-bold">{pipeline.length}</p>
                <p className="text-sm text-muted-foreground">Deals no Pipeline</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

      {/* Top Leads by AI Score */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-500" />
            Top Leads por Score IA
          </CardTitle>
          <CardDescription>Leads mais qualificados pela inteligência artificial</CardDescription>
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
                    <Progress value={lead.ai_score || 0} className="h-2 flex-1" />
                    <span className="text-sm text-muted-foreground">{lead.ai_score || 0}%</span>
                  </div>
                </div>
                <Badge variant={lead.status === 'won' ? 'default' : 'secondary'}>
                  {lead.status}
                </Badge>
              </div>
            )) : (
              <p className="text-muted-foreground text-center py-8">Nenhum lead cadastrado</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
