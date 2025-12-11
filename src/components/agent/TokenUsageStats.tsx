import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, Calendar, TrendingUp, Zap } from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth, endOfWeek, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TokenUsageStatsProps {
  workflowId: string;
}

interface UsageStats {
  today: { tokens: number; requests: number };
  week: { tokens: number; requests: number };
  month: { tokens: number; requests: number };
  dailyData: { date: string; tokens: number; requests: number }[];
}

export function TokenUsageStats({ workflowId }: TokenUsageStatsProps) {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<UsageStats>({
    today: { tokens: 0, requests: 0 },
    week: { tokens: 0, requests: 0 },
    month: { tokens: 0, requests: 0 },
    dailyData: [],
  });

  useEffect(() => {
    fetchStats();
  }, [workflowId]);

  const fetchStats = async () => {
    try {
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const monthStart = startOfMonth(today);
      const thirtyDaysAgo = subDays(today, 30);

      // Fetch usage data for the last 30 days by workflow_id
      const { data, error } = await supabase
        .from('ai_token_usage')
        .select('*')
        .eq('n8n_workflow_id', workflowId)
        .gte('date', format(thirtyDaysAgo, 'yyyy-MM-dd'))
        .order('date', { ascending: true });

      if (error) throw error;

      const todayStr = format(today, 'yyyy-MM-dd');
      const weekStartStr = format(weekStart, 'yyyy-MM-dd');
      const monthStartStr = format(monthStart, 'yyyy-MM-dd');

      // Calculate stats
      let todayTokens = 0, todayRequests = 0;
      let weekTokens = 0, weekRequests = 0;
      let monthTokens = 0, monthRequests = 0;

      const dailyData: { date: string; tokens: number; requests: number }[] = [];

      (data || []).forEach((row: any) => {
        const rowDate = row.date;
        const tokens = row.tokens_used || 0;
        const requests = row.requests_count || 0;

        dailyData.push({ date: rowDate, tokens, requests });

        // Today
        if (rowDate === todayStr) {
          todayTokens += tokens;
          todayRequests += requests;
        }

        // This week
        if (rowDate >= weekStartStr) {
          weekTokens += tokens;
          weekRequests += requests;
        }

        // This month
        if (rowDate >= monthStartStr) {
          monthTokens += tokens;
          monthRequests += requests;
        }
      });

      setStats({
        today: { tokens: todayTokens, requests: todayRequests },
        week: { tokens: weekTokens, requests: weekRequests },
        month: { tokens: monthTokens, requests: monthRequests },
        dailyData,
      });
    } catch (error) {
      console.error('Error fetching token usage:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Hoje',
      tokens: stats.today.tokens,
      requests: stats.today.requests,
      icon: Calendar,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Esta Semana',
      tokens: stats.week.tokens,
      requests: stats.week.requests,
      icon: TrendingUp,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Este Mês',
      tokens: stats.month.tokens,
      requests: stats.month.requests,
      icon: BarChart3,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
  ];

  // Calculate max for chart scaling
  const maxTokens = Math.max(...stats.dailyData.map(d => d.tokens), 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {statCards.map((card) => (
          <Card key={card.title} className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-amber-500" />
                      <span className="text-2xl font-bold">{formatNumber(card.tokens)}</span>
                      <span className="text-sm text-muted-foreground">tokens</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {card.requests} requisições
                    </p>
                  </div>
                </div>
                <div className={`p-3 rounded-full ${card.bgColor}`}>
                  <card.icon className={`h-5 w-5 ${card.color}`} />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Usage Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Histórico de Uso (Últimos 30 dias)
          </CardTitle>
          <CardDescription>
            Visualize o consumo de tokens ao longo do tempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.dailyData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <BarChart3 className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhum uso registrado</p>
              <p className="text-sm">Os dados de uso aparecerão aqui conforme você utiliza o agente.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Simple bar chart */}
              <div className="flex items-end gap-1 h-48 px-2">
                {stats.dailyData.slice(-14).map((day, index) => {
                  const height = (day.tokens / maxTokens) * 100;
                  return (
                    <div
                      key={day.date}
                      className="flex-1 flex flex-col items-center gap-1 group"
                    >
                      <div className="relative w-full">
                        <div
                          className="w-full bg-primary/80 rounded-t transition-all hover:bg-primary cursor-pointer"
                          style={{ height: `${Math.max(height, 2)}%`, minHeight: '4px' }}
                          title={`${day.date}: ${formatNumber(day.tokens)} tokens`}
                        />
                        {/* Tooltip on hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10">
                          <div className="bg-popover border rounded-md shadow-lg p-2 text-xs whitespace-nowrap">
                            <p className="font-medium">{format(new Date(day.date), 'dd/MM', { locale: ptBR })}</p>
                            <p>{formatNumber(day.tokens)} tokens</p>
                            <p>{day.requests} req.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* X-axis labels */}
              <div className="flex gap-1 px-2">
                {stats.dailyData.slice(-14).map((day, index) => (
                  <div key={day.date} className="flex-1 text-center">
                    <span className="text-[10px] text-muted-foreground">
                      {format(new Date(day.date), 'dd', { locale: ptBR })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity Table */}
      {stats.dailyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento Diário</CardTitle>
            <CardDescription>Últimos 7 dias de uso</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {stats.dailyData.slice(-7).reverse().map((day) => (
                <div
                  key={day.date}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {format(new Date(day.date), "dd 'de' MMMM", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <Badge variant="secondary" className="font-mono">
                      {formatNumber(day.tokens)} tokens
                    </Badge>
                    <Badge variant="outline" className="font-mono">
                      {day.requests} req.
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
