import { Database, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  onContextWindowChange: (size: number) => void;
  onRetentionChange: (policy: string) => void;
}

export function BotMemoryTab({
  contextWindowSize,
  retentionPolicy,
  onContextWindowChange,
  onRetentionChange,
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
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Armazenamento</CardTitle>
          <CardDescription>Onde os dados são persistidos</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-sm font-medium mb-1.5">Eventos WhatsApp</p>
            <code className="text-xs bg-background px-2 py-1 rounded block font-mono">
              whatsapp_inbox_events
            </code>
          </div>

          <div className="p-3 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-sm font-medium mb-1.5">Motor</p>
            <code className="text-xs bg-background px-2 py-1 rounded block font-mono">
              whatsapp-bot-engine (Edge Function nativa)
            </code>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
