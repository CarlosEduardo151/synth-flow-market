import { Database, CheckCircle2, Send, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const RETENTION_OPTIONS = [
  { value: '7days', label: '7 dias' },
  { value: '30days', label: '30 dias' },
  { value: '90days', label: '90 dias' },
  { value: 'unlimited', label: 'Ilimitado' },
];

interface BotMemoryTabProps {
  contextWindowSize: number;
  retentionPolicy: string;
  sessionKeyId: string;
  workflowId: string;
  syncingMemory: boolean;
  onContextWindowChange: (size: number) => void;
  onRetentionChange: (policy: string) => void;
  onSessionKeyChange: (key: string) => void;
  onSyncMemory: () => void;
}

export function BotMemoryTab({
  contextWindowSize,
  retentionPolicy,
  sessionKeyId,
  workflowId,
  syncingMemory,
  onContextWindowChange,
  onRetentionChange,
  onSessionKeyChange,
  onSyncMemory,
}: BotMemoryTabProps) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5 text-primary" />
            Memória Persistente
          </CardTitle>
          <CardDescription>Configuração de memória do agente</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm text-green-500">PostgreSQL Ativa</p>
              <p className="text-xs text-muted-foreground">Memória persistente configurada automaticamente</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Janela de Contexto</Label>
            <Input
              type="number"
              value={contextWindowSize}
              onChange={(e) => onContextWindowChange(parseInt(e.target.value) || 10)}
              min={1}
              max={100}
            />
            <p className="text-xs text-muted-foreground">
              Mensagens anteriores que o agente lembra
            </p>
          </div>

          <div className="space-y-2">
            <Label>Política de Retenção</Label>
            <Select value={retentionPolicy} onValueChange={onRetentionChange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RETENTION_OPTIONS.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={onSyncMemory}
            disabled={syncingMemory || !workflowId}
            className="w-full"
            variant="outline"
          >
            {syncingMemory ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Send className="h-4 w-4 mr-2" />}
            Sincronizar Memória
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Sessão & Isolamento</CardTitle>
          <CardDescription>Como identificar sessões únicas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Session Key ID</Label>
            <Input
              value={sessionKeyId}
              onChange={(e) => onSessionKeyChange(e.target.value)}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Variável para identificar sessões únicas
            </p>
          </div>

          <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-sm font-medium mb-1.5">Tabela de Histórico</p>
            <code className="text-xs bg-background px-2 py-1 rounded block font-mono">
              n8n_chat_histories
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
