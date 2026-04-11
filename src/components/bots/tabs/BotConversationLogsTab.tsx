import { useState, useEffect, useCallback } from 'react';
import { ScrollText, MessageCircle, Smartphone, TestTube, RefreshCw, Search, ChevronDown, ChevronUp, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ConversationLog {
  id: string;
  source: string;
  phone: string | null;
  direction: string;
  message_text: string;
  tokens_used: number;
  processing_ms: number;
  provider: string | null;
  model: string | null;
  created_at: string;
}

interface BotConversationLogsTabProps {
  customerProductId: string;
}

export function BotConversationLogsTab({ customerProductId }: BotConversationLogsTabProps) {
  const { toast } = useToast();
  const [logs, setLogs] = useState<ConversationLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'whatsapp' | 'test_chat'>('all');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const sb = supabase as any;
      let query = sb
        .from('bot_conversation_logs')
        .select('*')
        .eq('customer_product_id', customerProductId)
        .order('created_at', { ascending: false })
        .limit(200);

      if (filter !== 'all') {
        query = query.eq('source', filter);
      }

      const { data, error } = await query;
      if (error) {
        console.error('logs fetch error:', error);
        return;
      }
      setLogs(data || []);
    } catch (e) {
      console.error('logs error:', e);
    } finally {
      setLoading(false);
    }
  }, [customerProductId, filter]);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 10_000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  const filtered = search
    ? logs.filter(l => l.message_text.toLowerCase().includes(search.toLowerCase()) || l.phone?.includes(search))
    : logs;

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const handleExportCSV = () => {
    if (filtered.length === 0) {
      toast({ title: 'Nenhum dado para exportar', variant: 'destructive' });
      return;
    }

    const headers = ['Data/Hora', 'Direção', 'Fonte', 'Telefone', 'Mensagem', 'Tokens', 'Tempo (ms)', 'Provider', 'Modelo'];
    const rows = filtered.map(log => [
      new Date(log.created_at).toLocaleString('pt-BR'),
      log.direction === 'inbound' ? 'Recebida' : 'Enviada',
      log.source === 'whatsapp' ? 'WhatsApp' : 'Chat Teste',
      log.phone || '',
      `"${log.message_text.replace(/"/g, '""')}"`,
      log.tokens_used?.toString() || '0',
      log.processing_ms?.toString() || '0',
      log.provider || '',
      log.model || '',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-bot-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: `${filtered.length} registros exportados!` });
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ScrollText className="h-5 w-5 text-primary" />
                Logs de Conversas
              </CardTitle>
              <CardDescription className="mt-1">Histórico de todas as mensagens processadas pelo bot</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleExportCSV} disabled={filtered.length === 0} className="gap-2">
                <Download className="h-3.5 w-3.5" />
                Exportar CSV
              </Button>
              <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading} className="gap-2">
                <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por mensagem ou telefone..."
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('all')}
                className="gap-1.5"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Todos
              </Button>
              <Button
                variant={filter === 'whatsapp' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('whatsapp')}
                className="gap-1.5"
              >
                <Smartphone className="h-3.5 w-3.5" />
                WhatsApp
              </Button>
              <Button
                variant={filter === 'test_chat' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter('test_chat')}
                className="gap-1.5"
              >
                <TestTube className="h-3.5 w-3.5" />
                Chat Teste
              </Button>
            </div>
          </div>

          {/* Logs list */}
          <ScrollArea className="h-[500px]">
            {loading && logs.length === 0 ? (
              <div className="flex items-center justify-center py-16">
                <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <ScrollText className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhum log encontrado</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Envie mensagens pelo chat de teste ou WhatsApp para ver os logs aqui</p>
              </div>
            ) : (
              <div className="space-y-2 pr-4">
                {filtered.map((log) => {
                  const isExpanded = expandedId === log.id;
                  const isInbound = log.direction === 'inbound';

                  return (
                    <div
                      key={log.id}
                      className="rounded-lg border border-border/50 bg-card/50 hover:bg-card/80 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(isExpanded ? null : log.id)}
                    >
                      <div className="flex items-start gap-3 p-3">
                        <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isInbound ? 'bg-blue-500/10' : 'bg-green-500/10'
                        }`}>
                          {isInbound ? (
                            <MessageCircle className="h-4 w-4 text-blue-500" />
                          ) : (
                            <MessageCircle className="h-4 w-4 text-green-500" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {isInbound ? '← Recebida' : '→ Enviada'}
                            </Badge>
                            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${
                              log.source === 'whatsapp' ? 'border-green-500/30 text-green-600' : 'border-blue-500/30 text-blue-600'
                            }`}>
                              {log.source === 'whatsapp' ? '📱 WhatsApp' : '🧪 Teste'}
                            </Badge>
                            {log.phone && (
                              <span className="text-[10px] text-muted-foreground font-mono">{log.phone}</span>
                            )}
                          </div>

                          <p className="text-sm text-foreground line-clamp-2">{log.message_text}</p>

                          <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                            <span>{formatTime(log.created_at)}</span>
                            {log.tokens_used > 0 && <span>{log.tokens_used} tokens</span>}
                            {log.processing_ms > 0 && <span>{log.processing_ms}ms</span>}
                          </div>
                        </div>

                        <div className="shrink-0 mt-1">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="px-3 pb-3 pt-0 border-t border-border/30 mt-1">
                          <div className="bg-muted/30 rounded-lg p-3 mt-2">
                            <p className="text-sm whitespace-pre-wrap">{log.message_text}</p>
                          </div>
                          <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-muted-foreground">
                            {log.provider && <span>Provider: <strong className="text-foreground">{log.provider}</strong></span>}
                            {log.model && <span>Modelo: <strong className="text-foreground">{log.model}</strong></span>}
                            {log.tokens_used > 0 && <span>Tokens: <strong className="text-foreground">{log.tokens_used}</strong></span>}
                            {log.processing_ms > 0 && <span>Tempo: <strong className="text-foreground">{log.processing_ms}ms</strong></span>}
                            <span>ID: <code className="text-[10px]">{log.id.slice(0, 8)}</code></span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Footer stats */}
          {filtered.length > 0 && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
              <span>{filtered.length} registro{filtered.length !== 1 ? 's' : ''}</span>
              <span>Atualiza automaticamente a cada 10s</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
