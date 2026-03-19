import { Database, CheckCircle2, BookOpen, HardDrive, Clock, BarChart3, Brain, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
            <Brain className="h-5 w-5 text-primary" />
            Memória de Conversação
          </CardTitle>
          <CardDescription>O agente lembra mensagens anteriores de cada contato</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/20 flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            <div>
              <p className="font-medium text-sm text-green-600 dark:text-green-400">Memória Ativa</p>
              <p className="text-xs text-muted-foreground">O motor carrega as últimas mensagens automaticamente por telefone</p>
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

          {/* Visual preview of how memory works */}
          <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3">
            <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
              <MessageSquare className="h-3.5 w-3.5" />
              Como funciona na prática
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 border-blue-500/30 text-blue-500">Cliente</Badge>
                <span className="text-muted-foreground">"Qual o preço do plano?"</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 border-green-500/30 text-green-500">Bot</Badge>
                <span className="text-muted-foreground">"O plano custa R$ 99/mês..."</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 border-blue-500/30 text-blue-500">Cliente</Badge>
                <span className="text-muted-foreground">"Tem desconto?"</span>
              </div>
              <div className="flex items-start gap-2">
                <Badge variant="outline" className="text-[9px] px-1.5 py-0 shrink-0 border-green-500/30 text-green-500">Bot</Badge>
                <span className="text-muted-foreground">
                  ✅ <em>Lembra que falou de planos e responde contextualmente</em>
                </span>
              </div>
            </div>
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
            <CardDescription>Dados persistidos pelo motor</CardDescription>
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

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Database className="h-5 w-5 text-primary mt-0.5" />
              <div>
                <p className="text-sm font-medium">Pipeline do Motor</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  <strong>System Prompt</strong> → Tom de comunicação → Regras do agente → Base de conhecimento → <strong>Últimas {contextWindowSize * 2} mensagens</strong> → Resposta IA
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
