import { Database, BookOpen, HardDrive, Clock, BarChart3, Brain, CheckCircle2, ArrowRight, MessageSquare, Save, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
    <div className="space-y-6">
      {/* Banner informativo */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
        <CheckCircle2 className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium">Memória Ativa</p>
          <p className="text-xs text-muted-foreground mt-1">
            A IA lembra do contexto de cada conversa, garantindo respostas personalizadas e coerentes para cada contato.
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Brain className="h-5 w-5 text-primary" />
              Memória de Conversação
            </CardTitle>
            <CardDescription>
              Configure quantas mensagens anteriores a IA considera ao responder
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                O motor carrega até <strong>{contextWindowSize * 2}</strong> mensagens (pares enviadas/recebidas) do histórico de cada contato
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

            {/* Exemplo visual */}
            <div className="mt-4 p-3 rounded-xl bg-muted/30 border border-border/50 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Exemplo com janela de {contextWindowSize}:</p>
              <div className="space-y-1.5">
                {Array.from({ length: Math.min(contextWindowSize, 3) }).map((_, i) => (
                  <div key={i} className="flex gap-2 text-[11px]">
                    <span className="text-primary font-medium min-w-[52px]">Cliente:</span>
                    <span className="text-muted-foreground italic">Mensagem {i + 1}...</span>
                  </div>
                ))}
                {contextWindowSize > 3 && (
                  <p className="text-[11px] text-muted-foreground/60 pl-1">... +{contextWindowSize - 3} pares anteriores</p>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                A IA lê esse histórico antes de responder cada nova mensagem.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Como funciona */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                Como funciona na prática
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 flex-wrap text-xs">
                <Badge variant="outline" className="bg-muted/50">Cliente envia mensagem</Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="bg-muted/50">Motor carrega histórico</Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="bg-muted/50">IA gera resposta contextual</Badge>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">Resposta enviada</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                Quanto maior a janela de contexto, mais precisa a IA — mas mais tokens são consumidos por resposta.
              </p>
            </CardContent>
          </Card>

          {/* Armazenamento */}
          <Card className="border-border/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <HardDrive className="h-5 w-5 text-primary" />
                Armazenamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 rounded-xl bg-muted/50 border border-border/50 flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Conversas WhatsApp</p>
                  <p className="text-[11px] text-muted-foreground">Histórico por telefone, usado na memória contextual</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/50 border border-border/50 flex items-center gap-3">
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Métricas de Uso</p>
                  <p className="text-[11px] text-muted-foreground">Tokens, latência e volume por chamada IA</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/50 border border-border/50 flex items-center gap-3">
                <BookOpen className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Base de Conhecimento</p>
                  <p className="text-[11px] text-muted-foreground">Injetada no system prompt do motor</p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-muted/50 border border-border/50 flex items-center gap-3">
                <Database className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Eventos Brutos</p>
                  <p className="text-[11px] text-muted-foreground">Payloads Z-API para auditoria</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
