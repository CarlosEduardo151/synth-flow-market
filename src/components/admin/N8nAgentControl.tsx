import { useState } from 'react';
import { Power, PowerOff, RefreshCw, Bot, CheckCircle, XCircle, Loader2, AlertTriangle, Copy, ExternalLink } from 'lucide-react';
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

const SUPABASE_URL = "https://agndhravgmcwpdjkozka.supabase.co";

export function N8nAgentControl({ 
  agentId = '5mMuugdT22IrK7wb',
  agentName = 'Agente de Automação'
}: N8nAgentControlProps) {
  const [status, setStatus] = useState<StatusState>({ type: 'idle', message: '' });
  const [currentAction, setCurrentAction] = useState<ActionType | null>(null);

  // URLs for n8n integration
  const webhookUrl = `${SUPABASE_URL}/functions/v1/n8n-agent-webhook`;
  const controlUrl = `${SUPABASE_URL}/functions/v1/n8n-control`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copiada!`);
  };

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
        
        // Dispatch event to notify N8nAgentChat about estado change
        const estadoMap: Record<ActionType, string> = {
          'ativar': 'ativado',
          'desativar': 'desativado',
          'reiniciar': 'reiniciando'
        };
        const newEstado = estadoMap[action];
        localStorage.setItem('agentEstado', newEstado);
        window.dispatchEvent(new CustomEvent('agentEstadoChanged', { 
          detail: { estado: newEstado } 
        }));
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
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Bot className="h-6 w-6 text-primary" />
          <CardTitle className="text-xl">Gerenciamento do Agente de Automação n8n</CardTitle>
        </div>
        <CardDescription>
          Controle o workflow de automação e integre com n8n
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

        {/* URLs Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            URLs para configurar no n8n
          </h3>
          
          {/* Webhook URL - n8n calls this */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                URL do Webhook (n8n → Supabase)
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={() => copyToClipboard(webhookUrl, 'URL do Webhook')}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copiar
              </Button>
            </div>
            <code className="block text-xs bg-background p-2 rounded border break-all font-mono">
              {webhookUrl}
            </code>
            <p className="text-xs text-muted-foreground">
              Use esta URL no node "HTTP Request" do n8n para enviar dados para o Supabase.
            </p>
          </div>

          {/* Control URL - to control n8n */}
          <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                URL de Controle (Supabase → n8n)
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 px-2"
                onClick={() => copyToClipboard(controlUrl, 'URL de Controle')}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copiar
              </Button>
            </div>
            <code className="block text-xs bg-background p-2 rounded border break-all font-mono">
              {controlUrl}
            </code>
            <p className="text-xs text-muted-foreground">
              Esta URL é usada internamente para enviar comandos ao n8n.
            </p>
          </div>
        </div>

        {/* Example Payload */}
        <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 space-y-2">
          <span className="text-xs font-medium">Exemplo de payload para n8n enviar:</span>
          <pre className="text-xs bg-background p-2 rounded border overflow-x-auto font-mono">
{`{
  "type": "status_update",
  "agentId": "${agentId}",
  "status": "running",
  "message": "Agente executando..."
}`}
          </pre>
          <p className="text-xs text-muted-foreground">
            Tipos suportados: <code className="bg-muted px-1 rounded">status_update</code>, <code className="bg-muted px-1 rounded">heartbeat</code>, <code className="bg-muted px-1 rounded">log</code>, <code className="bg-muted px-1 rounded">error</code>, <code className="bg-muted px-1 rounded">command_response</code>
          </p>
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
          <AlertTitle>Como configurar no n8n</AlertTitle>
          <AlertDescription className="text-xs space-y-1">
            <p>1. Crie um workflow com um node <strong>Webhook</strong> para receber comandos (ligar/desligar/reiniciar)</p>
            <p>2. Use um node <strong>HTTP Request</strong> para enviar status/logs para a URL do Webhook acima</p>
            <p>3. Configure o Header: <code className="bg-muted px-1 rounded">x-n8n-token</code> com seu token de segurança</p>
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
