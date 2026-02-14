import { CheckCircle2, Wifi, ServerCog, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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

export function BotStatusTab({}: BotStatusTabProps) {
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

      {/* Native Engine Info */}
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <ServerCog className="h-5 w-5 text-primary" />
            Motor Nativo StarAI
          </CardTitle>
          <CardDescription>Processamento direto sem dependências externas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-xl border-2 border-green-500/40 bg-green-500/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="font-semibold">Conectado</p>
                <p className="text-sm text-muted-foreground">Motor nativo ativo — sem n8n</p>
              </div>
            </div>
            <Badge variant="secondary" className="bg-green-500/10 text-green-600 dark:text-green-400">
              Nativo
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
