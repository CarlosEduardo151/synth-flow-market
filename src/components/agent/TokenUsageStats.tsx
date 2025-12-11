import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { BarChart3, Calendar, TrendingUp, Zap, RefreshCw, Clock, Cpu, Loader2, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';
import { format, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface TokenUsageStatsProps {
  workflowId: string;
}

interface UsageStats {
  today: { tokens: number; requests: number };
  week: { tokens: number; requests: number };
  month: { tokens: number; requests: number };
  dailyData: { date: string; tokens: number; requests: number }[];
}

interface ExecutionTokenUsage {
  executionId: string;
  workflowId: string;
  status: string;
  startedAt: string;
  stoppedAt: string;
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    model: string | null;
    provider: string | null;
    nodeBreakdown: Array<{
      nodeName: string;
      nodeType: string;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      model?: string;
    }>;
  };
}

export function TokenUsageStats({ workflowId }: TokenUsageStatsProps) {
  const [loading, setLoading] = useState(true);
  const [loadingExecutions, setLoadingExecutions] = useState(false);
  const [stats, setStats] = useState<UsageStats>({
    today: { tokens: 0, requests: 0 },
    week: { tokens: 0, requests: 0 },
    month: { tokens: 0, requests: 0 },
    dailyData: [],
  });
  const [executionTokens, setExecutionTokens] = useState<ExecutionTokenUsage[]>([]);
  const [expandedExecutions, setExpandedExecutions] = useState<Set<string>>(new Set());
  const [lastFetched, setLastFetched] = useState<Date | null>(null);
  const { toast } = useToast();

  const fetchStats = useCallback(async () => {
    try {
      console.log('TokenUsageStats: Buscando dados para workflowId:', workflowId);
      const today = new Date();
      const weekStart = startOfWeek(today, { weekStartsOn: 0 });
      const monthStart = startOfMonth(today);
      const thirtyDaysAgo = subDays(today, 30);

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

      let todayTokens = 0, todayRequests = 0;
      let weekTokens = 0, weekRequests = 0;
      let monthTokens = 0, monthRequests = 0;

      const dailyData: { date: string; tokens: number; requests: number }[] = [];

      (data || []).forEach((row: any) => {
        const rowDate = row.date;
        const tokens = row.tokens_used || 0;
        const requests = row.requests_count || 0;

        dailyData.push({ date: rowDate, tokens, requests });

        if (rowDate === todayStr) {
          todayTokens += tokens;
          todayRequests += requests;
        }

        if (rowDate >= weekStartStr) {
          weekTokens += tokens;
          weekRequests += requests;
        }

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
  }, [workflowId]);

  const fetchExecutionTokenUsage = useCallback(async (showToast = true) => {
    if (!workflowId) return;
    
    setLoadingExecutions(true);
    try {
      // Buscar as últimas 20 execuções
      const { data: executionsData, error: executionsError } = await supabase.functions.invoke('n8n-api', {
        body: { action: 'get_executions', workflowId, limit: 20 }
      });

      if (executionsError) throw executionsError;
      
      const executions = executionsData.executions || [];
      const tokenUsageResults: ExecutionTokenUsage[] = [];

      // Buscar token usage de todas as execuções em paralelo
      const tokenPromises = executions.slice(0, 10).map(async (exec: any) => {
        try {
          const { data: tokenData, error: tokenError } = await supabase.functions.invoke('n8n-api', {
            body: { action: 'get_execution_token_usage', executionId: exec.id }
          });

          if (!tokenError && tokenData.success) {
            return {
              executionId: tokenData.executionId,
              workflowId: tokenData.workflowId,
              status: tokenData.status,
              startedAt: tokenData.startedAt,
              stoppedAt: tokenData.stoppedAt,
              tokenUsage: tokenData.tokenUsage,
            };
          }
        } catch (e) {
          console.warn(`Erro ao buscar tokens da execução ${exec.id}:`, e);
        }
        return null;
      });

      const results = await Promise.all(tokenPromises);
      results.forEach(result => {
        if (result) tokenUsageResults.push(result);
      });

      setExecutionTokens(tokenUsageResults);
      setLastFetched(new Date());
      
      if (showToast && tokenUsageResults.length > 0) {
        const totalTokens = tokenUsageResults.reduce((sum, e) => sum + e.tokenUsage.totalTokens, 0);
        toast({
          title: 'Monitoramento atualizado',
          description: `${tokenUsageResults.length} execuções carregadas (${formatNumber(totalTokens)} tokens total).`,
        });
      }
    } catch (error) {
      console.error('Error fetching execution token usage:', error);
      if (showToast) {
        toast({
          title: 'Erro ao carregar',
          description: 'Não foi possível buscar os dados de token usage das execuções.',
          variant: 'destructive',
        });
      }
    } finally {
      setLoadingExecutions(false);
    }
  }, [workflowId, toast]);

  // Carregar dados automaticamente ao montar e periodicamente
  useEffect(() => {
    fetchStats();
    fetchExecutionTokenUsage(false);

    // Atualizar a cada 30 segundos
    const interval = setInterval(() => {
      fetchStats();
      fetchExecutionTokenUsage(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [workflowId, fetchStats, fetchExecutionTokenUsage]);

  const toggleExpanded = (executionId: string) => {
    const newExpanded = new Set(expandedExecutions);
    if (newExpanded.has(executionId)) {
      newExpanded.delete(executionId);
    } else {
      newExpanded.add(executionId);
    }
    setExpandedExecutions(newExpanded);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const getProviderColor = (provider: string | null) => {
    switch (provider?.toLowerCase()) {
      case 'openai': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30';
      case 'gemini': return 'bg-blue-500/10 text-blue-600 border-blue-500/30';
      case 'anthropic': return 'bg-orange-500/10 text-orange-600 border-orange-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'running': return 'bg-blue-500 animate-pulse';
      default: return 'bg-gray-400';
    }
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

  const maxTokens = Math.max(...stats.dailyData.map(d => d.tokens), 1);

  // Calcular totais das execuções carregadas
  const executionTotals = executionTokens.reduce(
    (acc, exec) => ({
      prompt: acc.prompt + exec.tokenUsage.promptTokens,
      completion: acc.completion + exec.tokenUsage.completionTokens,
      total: acc.total + exec.tokenUsage.totalTokens,
    }),
    { prompt: 0, completion: 0, total: 0 }
  );

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

      {/* Execuções em Tempo Real */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Monitoramento em Tempo Real
              {loadingExecutions && (
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {lastFetched && (
                <span className="text-xs text-muted-foreground">
                  Atualizado: {format(lastFetched, 'HH:mm:ss', { locale: ptBR })}
                </span>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fetchExecutionTokenUsage(true)}
                disabled={loadingExecutions}
              >
                {loadingExecutions ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardTitle>
          <CardDescription>
            Atualiza automaticamente a cada 30 segundos • Últimas 10 execuções
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Totais das Execuções */}
          {executionTokens.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Prompt Tokens</p>
                <p className="text-xl font-bold text-blue-500">{formatNumber(executionTotals.prompt)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Completion Tokens</p>
                <p className="text-xl font-bold text-green-500">{formatNumber(executionTotals.completion)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-xl font-bold text-amber-500">{formatNumber(executionTotals.total)}</p>
              </div>
            </div>
          )}

          {executionTokens.length === 0 && !loadingExecutions ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Nenhuma execução encontrada</p>
              <p className="text-sm text-center max-w-md">
                Aguardando execuções do workflow. Os dados aparecerão automaticamente.
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px]">
              <div className="space-y-2">
                {executionTokens.map((exec) => (
                  <Collapsible 
                    key={exec.executionId}
                    open={expandedExecutions.has(exec.executionId)}
                    onOpenChange={() => toggleExpanded(exec.executionId)}
                  >
                    <div className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors">
                          <div className="flex items-center gap-3">
                            {expandedExecutions.has(exec.executionId) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                            <div className={`w-2 h-2 rounded-full ${getStatusColor(exec.status)}`} />
                            <div className="text-left">
                              <p className="font-mono text-sm font-medium">#{exec.executionId}</p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                {format(new Date(exec.startedAt), 'dd/MM HH:mm:ss', { locale: ptBR })}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            {exec.tokenUsage.provider && (
                              <Badge variant="outline" className={`text-xs ${getProviderColor(exec.tokenUsage.provider)}`}>
                                {exec.tokenUsage.provider}
                              </Badge>
                            )}
                            {exec.tokenUsage.model && (
                              <Badge variant="secondary" className="font-mono text-xs hidden sm:inline-flex">
                                {exec.tokenUsage.model}
                              </Badge>
                            )}
                            <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm ${
                              exec.tokenUsage.totalTokens > 0 
                                ? 'bg-amber-500/10 text-amber-600' 
                                : 'bg-muted text-muted-foreground'
                            }`}>
                              <Zap className="h-3.5 w-3.5" />
                              <span className="font-bold">{formatNumber(exec.tokenUsage.totalTokens)}</span>
                            </div>
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      <CollapsibleContent>
                        <div className="border-t bg-muted/30 p-4 space-y-4">
                          {/* Resumo de tokens */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-background rounded-lg p-3 border">
                              <p className="text-xs text-muted-foreground">Prompt</p>
                              <p className="text-lg font-bold text-blue-500">
                                {formatNumber(exec.tokenUsage.promptTokens)}
                              </p>
                            </div>
                            <div className="bg-background rounded-lg p-3 border">
                              <p className="text-xs text-muted-foreground">Completion</p>
                              <p className="text-lg font-bold text-green-500">
                                {formatNumber(exec.tokenUsage.completionTokens)}
                              </p>
                            </div>
                            <div className="bg-background rounded-lg p-3 border">
                              <p className="text-xs text-muted-foreground">Total</p>
                              <p className="text-lg font-bold text-amber-500">
                                {formatNumber(exec.tokenUsage.totalTokens)}
                              </p>
                            </div>
                          </div>

                          {/* Breakdown por node */}
                          {exec.tokenUsage.nodeBreakdown.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Por Node:</p>
                              <div className="space-y-1.5">
                                {exec.tokenUsage.nodeBreakdown.map((node, idx) => (
                                  <div 
                                    key={idx}
                                    className="flex items-center justify-between bg-background rounded-lg p-2.5 border text-sm"
                                  >
                                    <div className="flex items-center gap-2">
                                      <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                                      <span className="font-medium truncate max-w-[150px]">{node.nodeName}</span>
                                      {node.model && (
                                        <Badge variant="outline" className="text-xs">
                                          {node.model}
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs">
                                      <span className="text-blue-500">{node.promptTokens}p</span>
                                      <span className="text-green-500">{node.completionTokens}c</span>
                                      <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20">
                                        {node.totalTokens}
                                      </Badge>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {exec.tokenUsage.nodeBreakdown.length === 0 && exec.tokenUsage.totalTokens === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-2">
                              Nenhum token encontrado. O workflow pode não usar nós de IA.
                            </p>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Histórico e Gráfico */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Histórico (Últimos 30 dias)
          </CardTitle>
          <CardDescription>
            Dados agregados do banco de dados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.dailyData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <BarChart3 className="h-10 w-10 mb-3 opacity-50" />
              <p className="font-medium">Nenhum histórico registrado</p>
              <p className="text-sm">Os dados aparecerão conforme você utiliza o agente.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Bar chart */}
              <div className="flex items-end gap-1 h-32 px-2">
                {stats.dailyData.slice(-14).map((day) => {
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
              <div className="flex gap-1 px-2">
                {stats.dailyData.slice(-14).map((day) => (
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

      {/* Detalhamento Diário */}
      {stats.dailyData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhamento Diário</CardTitle>
            <CardDescription>Últimos 7 dias</CardDescription>
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
