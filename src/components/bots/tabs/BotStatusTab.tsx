import { CheckCircle2, Wifi, ServerCog, RefreshCw, Loader2, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface BotStatusTabProps {
  n8nConnected: boolean | null;
  n8nTesting: boolean;
  workflowsCount: number;
  isActive: boolean;
  hasWorkflow: boolean;
  togglingAgent: boolean;
  onTestConnection: () => void;
  onToggleAgent: () => void;
  onRefreshExecutions: () => void;
  loadingExecutions: boolean;
}

export function BotStatusTab({
  n8nConnected,
  n8nTesting,
  workflowsCount,
  isActive,
  hasWorkflow,
  togglingAgent,
  onTestConnection,
  onRefreshExecutions,
  loadingExecutions,
}: BotStatusTabProps) {
  return (
    <div className="space-y-6">
      {/* Engine Always Connected */}
      <Card className="border-green-500/40 bg-green-500/5">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="h-5 w-5 text-green-500" />
            Motor Sempre Conectado
          </CardTitle>
          <CardDescription>Seu motor IA está permanentemente ativo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-xl border-2 border-green-500/40 bg-green-500/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-semibold text-green-600 dark:text-green-400">Motor Ativo</p>
                <p className="text-sm text-muted-foreground">
                  Respondendo mensagens automaticamente 24/7
                </p>
              </div>
            </div>
            <Badge className="bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30">
              <Wifi className="h-3 w-3 mr-1" />
              Online
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Connection Status */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ServerCog className="h-5 w-5 text-primary" />
            Motor de Automação
          </CardTitle>
          <CardDescription>Status da conexão com o motor StarAI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${
            n8nConnected === true ? 'border-green-500/40 bg-green-500/5' :
            n8nConnected === false ? 'border-destructive/40 bg-destructive/5' :
            'border-border bg-muted/30'
          }`}>
            <div className="flex items-center gap-3">
              {n8nConnected === true ? (
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                </div>
              )}
              <div>
                <p className="font-semibold">
                  {n8nConnected === true ? 'Conectado' :
                   n8nConnected === false ? 'Verificando...' : 'Verificando...'}
                </p>
                <p className="text-sm text-muted-foreground">Motor de Automação StarAI</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {n8nConnected && (
                <Badge variant="secondary">{workflowsCount} workflows</Badge>
              )}
              <Button variant="outline" size="icon" onClick={onTestConnection} disabled={n8nTesting}>
                {n8nTesting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
