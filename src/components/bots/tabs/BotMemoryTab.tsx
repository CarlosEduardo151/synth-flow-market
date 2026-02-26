import { useState, useEffect } from 'react';
import { Database, CheckCircle2, BookOpen, HardDrive, Clock, BarChart3 } from 'lucide-react';
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
            Memória de Conversação
          </CardTitle>
          <CardDescription>Como o agente lembra das conversas anteriores</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm text-green-500">PostgreSQL Ativa</p>
              <p className="text-xs text-muted-foreground">Banco de dados persistente configurado automaticamente</p>
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
              Quantidade de mensagens anteriores que o agente consegue lembrar em cada conversa
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
            <p className="text-xs text-muted-foreground">
              Por quanto tempo os logs de conversa são mantidos
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-primary" />
              Armazenamento
            </CardTitle>
            <CardDescription>Dados persistidos pelo sistema</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 rounded-xl bg-muted/50 border border-border/50 flex items-center gap-3">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Conversas WhatsApp</p>
                <code className="text-xs text-muted-foreground font-mono">bot_conversation_logs</code>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/50 border border-border/50 flex items-center gap-3">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Métricas de Uso</p>
                <code className="text-xs text-muted-foreground font-mono">bot_usage_metrics</code>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/50 border border-border/50 flex items-center gap-3">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Base de Conhecimento</p>
                <code className="text-xs text-muted-foreground font-mono">bot_knowledge_base</code>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-muted/50 border border-border/50 flex items-center gap-3">
              <Database className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">Eventos Brutos</p>
                <code className="text-xs text-muted-foreground font-mono">whatsapp_inbox_events</code>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Motor Edge Function Nativo</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Processamento direto via Supabase Edge Functions — sem dependência de serviços externos.
                  As conversas e métricas são armazenadas automaticamente no PostgreSQL.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
