import { useState } from 'react';
import { Power, PowerOff, RefreshCw, Bot, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface N8nAgentControlProps {
  agentId?: string;
  agentName?: string;
}

type ActionType = 'ativar' | 'desativar' | 'reiniciar';
type StatusType = 'idle' | 'loading' | 'success' | 'error';

interface StatusState {
  type: StatusType;
  message: string;
  hint?: string;
}

export function N8nAgentControl({ 
  agentId = '5mMuugdT22IrK7wb',
  agentName = 'Agente de Automação'
}: N8nAgentControlProps) {
  const [status, setStatus] = useState<StatusState>({ type: 'idle', message: '' });
  const [currentAction, setCurrentAction] = useState<ActionType | null>(null);

  const sendCommand = async (action: ActionType) => {
    setCurrentAction(action);
    setStatus({ type: 'loading', message: 'Comando em processamento...' });

    try {
      const { data, error } = await supabase.functions.invoke('n8n-control', {
        body: { agentId, action, httpMethod: 'POST' }
      });

      if (error) {
        throw new Error(error.message || 'Erro na comunicação com o servidor');
      }

      if (data?.success) {
        setStatus({ type: 'success', message: data.message });
        toast.success(data.message);
      } else {
        setStatus({ 
          type: 'error', 
          message: data?.message || 'Erro desconhecido',
          hint: data?.hint
        });
        toast.error(data?.message || 'Erro ao executar comando');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro ao executar comando';
      setStatus({ type: 'error', message: `ERRO: ${errorMessage}` });
      toast.error(errorMessage);
    } finally {
      setCurrentAction(null);
    }
  };

  const getStatusIcon = () => {
    switch (status.type) {
      case 'loading':
        return <Loader2 className="h-5 w-5 animate-spin text-primary" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-destructive" />;
      default:
        return null;
    }
  };

  const getStatusBgClass = () => {
    switch (status.type) {
      case 'loading':
        return 'bg-primary/10 border-primary/20';
      case 'success':
        return 'bg-green-500/10 border-green-500/20';
      case 'error':
        return 'bg-destructive/10 border-destructive/20';
      default:
        return 'bg-muted/50 border-border';
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Bot className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl">Gerenciamento do Agente de Automação n8n</CardTitle>
        </div>
        <CardDescription>
          Controle o workflow de automação
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Agent Info */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">ID do Agente:</span>
            <Badge variant="secondary" className="font-mono text-xs">
              {agentId}
            </Badge>
          </div>
          <span className="text-sm font-medium">{agentName}</span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            onClick={() => sendCommand('ativar')}
            disabled={currentAction !== null}
            className="flex flex-col items-center gap-2 h-auto py-4 bg-green-600 hover:bg-green-700 text-white"
          >
            {currentAction === 'ativar' ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <Power className="h-6 w-6" />
            )}
            <span className="text-sm font-medium">LIGAR</span>
          </Button>

          <Button
            onClick={() => sendCommand('desativar')}
            disabled={currentAction !== null}
            variant="destructive"
            className="flex flex-col items-center gap-2 h-auto py-4"
          >
            {currentAction === 'desativar' ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <PowerOff className="h-6 w-6" />
            )}
            <span className="text-sm font-medium">DESLIGAR</span>
          </Button>

          <Button
            onClick={() => sendCommand('reiniciar')}
            disabled={currentAction !== null}
            variant="secondary"
            className="flex flex-col items-center gap-2 h-auto py-4"
          >
            {currentAction === 'reiniciar' ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : (
              <RefreshCw className="h-6 w-6" />
            )}
            <span className="text-sm font-medium">REINICIAR</span>
          </Button>
        </div>

        {/* Status Display */}
        {status.message && (
          <div className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${getStatusBgClass()}`}>
            <div className="mt-0.5">{getStatusIcon()}</div>
            <div className="flex-1">
              <span className={`text-sm ${status.type === 'error' ? 'text-destructive' : status.type === 'success' ? 'text-green-600' : 'text-foreground'}`}>
                {status.message}
              </span>
              {status.hint && (
                <p className="text-xs text-muted-foreground mt-1">{status.hint}</p>
              )}
            </div>
          </div>
        )}

        {/* Help Alert */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Importante</AlertTitle>
          <AlertDescription className="text-xs">
            Certifique-se que o workflow no n8n está <strong>ATIVO</strong> e usando a URL de <strong>produção</strong> (não a de teste). 
            O webhook deve aceitar requisições POST.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
