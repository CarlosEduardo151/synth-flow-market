import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Heart, 
  Target,
  Calendar,
  Users,
  Zap,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CRMCustomer {
  id: string;
  name: string;
  status: string;
  created_at: string;
  total_purchases: number;
}

interface AIInsights {
  churnRisk?: { level: string; customers: string[]; reason: string };
  demandSurge?: { prediction: string; period: string; confidence: number };
  dissatisfactionReasons?: string[];
  currentSentiment?: { overall: string; score: number; description: string };
  upsellOpportunities?: { customer: string; product: string; probability: number }[];
  seasonality?: { currentPhase: string; nextTrend: string };
  segments?: { name: string; count: number; behavior: string }[];
  priorityActions?: { action: string; priority: string; impact: string }[];
  raw?: string;
}

interface CRMAIInsightsProps {
  customers: CRMCustomer[];
  opportunities: any[];
}

export const CRMAIInsights = ({ customers, opportunities }: CRMAIInsightsProps) => {
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const generateInsights = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/crm-ai-insights`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ customers, opportunities }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao gerar insights');
      }

      const data = await response.json();
      setInsights(data.insights);
      toast({
        title: "Análise concluída",
        description: "Insights preditivos gerados com sucesso!",
      });
    } catch (error) {
      console.error('Error generating insights:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Não foi possível gerar insights",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'alto': return 'bg-red-500';
      case 'medio': return 'bg-yellow-500';
      case 'baixo': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positivo': return 'text-green-500';
      case 'negativo': return 'text-red-500';
      default: return 'text-yellow-500';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority?.toLowerCase()) {
      case 'alta': return 'bg-red-100 text-red-800';
      case 'media': return 'bg-yellow-100 text-yellow-800';
      case 'baixa': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (!insights) {
    return (
      <Card className="border-dashed border-2">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Brain className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">Análise Preditiva com IA</h3>
          <p className="text-muted-foreground text-center mb-6 max-w-md">
            Use inteligência artificial para prever comportamentos de clientes, 
            identificar riscos e descobrir oportunidades ocultas.
          </p>
          <Button onClick={generateInsights} disabled={loading} size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analisando dados...
              </>
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Gerar Insights com IA
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          Insights Preditivos IA
        </h2>
        <Button onClick={generateInsights} variant="outline" disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Atualizar</span>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Risco de Churn */}
        {insights.churnRisk && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Risco de Churn
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Badge className={`${getRiskColor(insights.churnRisk.level)} text-white mb-2`}>
                {insights.churnRisk.level?.toUpperCase()}
              </Badge>
              <p className="text-xs text-muted-foreground">{insights.churnRisk.reason}</p>
              {insights.churnRisk.customers?.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium">Em risco:</p>
                  <p className="text-xs text-muted-foreground">
                    {insights.churnRisk.customers.slice(0, 3).join(', ')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sentimento Atual */}
        {insights.currentSentiment && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Sentimento dos Clientes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getSentimentColor(insights.currentSentiment.overall)}`}>
                {insights.currentSentiment.overall}
              </div>
              <Progress value={insights.currentSentiment.score} className="mt-2" />
              <p className="text-xs text-muted-foreground mt-2">{insights.currentSentiment.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Previsão de Demanda */}
        {insights.demandSurge && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Surto de Demanda
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{insights.demandSurge.prediction}</p>
              <p className="text-xs text-muted-foreground mt-1">Período: {insights.demandSurge.period}</p>
              <div className="mt-2">
                <div className="flex justify-between text-xs">
                  <span>Confiança</span>
                  <span>{insights.demandSurge.confidence}%</span>
                </div>
                <Progress value={insights.demandSurge.confidence} className="mt-1" />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Sazonalidade */}
        {insights.seasonality && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Sazonalidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">{insights.seasonality.currentPhase}</p>
              <p className="text-xs text-muted-foreground mt-2">
                Próxima tendência: {insights.seasonality.nextTrend}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Motivos de Insatisfação */}
        {insights.dissatisfactionReasons && insights.dissatisfactionReasons.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                Possíveis Motivos de Insatisfação
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {insights.dissatisfactionReasons.map((reason, index) => (
                  <li key={index} className="flex items-start gap-2 text-sm">
                    <span className="text-orange-500">•</span>
                    {reason}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Oportunidades de Upsell */}
        {insights.upsellOpportunities && insights.upsellOpportunities.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Target className="h-4 w-4 text-green-500" />
                Oportunidades de Upsell
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.upsellOpportunities.slice(0, 5).map((opp, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{opp.customer}</p>
                      <p className="text-xs text-muted-foreground">{opp.product}</p>
                    </div>
                    <Badge variant="outline">{opp.probability}%</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Segmentação */}
        {insights.segments && insights.segments.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Segmentação Inteligente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.segments.map((segment, index) => (
                  <div key={index} className="border-b pb-2 last:border-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{segment.name}</p>
                      <Badge variant="secondary">{segment.count} clientes</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{segment.behavior}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ações Prioritárias */}
        {insights.priorityActions && insights.priorityActions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-500" />
                Próximas Ações Recomendadas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {insights.priorityActions.map((action, index) => (
                  <div key={index} className="border-b pb-2 last:border-0">
                    <div className="flex items-center gap-2">
                      <Badge className={getPriorityColor(action.priority)}>
                        {action.priority}
                      </Badge>
                      <p className="text-sm font-medium">{action.action}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Impacto: {action.impact}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
