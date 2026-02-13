import { CheckCircle2, XCircle, Loader2, RefreshCw, Power, Play, Square, Wifi, WifiOff, ServerCog } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

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
  onToggleAgent,
  onRefreshExecutions,
  loadingExecutions,
}: BotStatusTabProps) {
  return (
    <div className="space-y-6">
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
              ) : n8nConnected === false ? (
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Loader2 className="h-5 w-5 text-muted-foreground animate-spin" />
                </div>
              )}
              <div>
                <p className="font-semibold">
                  {n8nConnected === true ? 'Conectado' :
                   n8nConnected === false ? 'Desconectado' : 'Verificando...'}
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

      {/* Agent Control */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Power className="h-5 w-5 text-primary" />
            Controle do Agente
          </CardTitle>
          <CardDescription>Ative ou desative seu bot</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className={`flex items-center justify-between p-5 rounded-xl border-2 transition-all duration-300 ${
            isActive ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20'
          }`}>
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl transition-all ${
                isActive ? 'bg-green-500/10' : 'bg-muted'
              }`}>
                {isActive ? (
                  <Wifi className="h-6 w-6 text-green-500" />
                ) : (
                  <WifiOff className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <div>
                <Label className="text-base font-semibold">
                  {isActive ? 'Bot Ativo' : 'Bot Desativado'}
                </Label>
                <p className="text-sm text-muted-foreground">
                  {isActive ? 'Respondendo mensagens automaticamente' : 'Clique para ativar'}
                </p>
              </div>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={onToggleAgent}
              disabled={togglingAgent || !hasWorkflow || !n8nConnected}
              className="scale-125"
            />
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1"
              variant={isActive ? "destructive" : "default"}
              onClick={onToggleAgent}
              disabled={togglingAgent || !hasWorkflow || !n8nConnected}
            >
              {togglingAgent ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : isActive ? (
                <Square className="h-4 w-4 mr-2" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              {isActive ? 'Desativar' : 'Ativar'}
            </Button>

            <Button
              variant="outline"
              onClick={onRefreshExecutions}
              disabled={loadingExecutions || !hasWorkflow}
            >
              {loadingExecutions ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
