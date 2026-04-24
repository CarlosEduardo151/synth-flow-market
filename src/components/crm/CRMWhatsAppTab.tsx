import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2, RefreshCw, ArrowDownLeft, ArrowUpRight,
  Activity, UserPlus,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CRMLeadCapturePanel } from './CRMLeadCapturePanel';
import { SharedWhatsAppConnectTab } from '@/components/whatsapp/SharedWhatsAppConnectTab';

interface CRMWhatsAppTabProps {
  customerProductId: string;
}

export function CRMWhatsAppTab({ customerProductId }: CRMWhatsAppTabProps) {
  return (
    <SharedWhatsAppConnectTab
      customerProductId={customerProductId}
      context="crm"
      title="WhatsApp CRM"
      subtitle="Captura automática de leads via WhatsApp para o CRM"
      connectedMessage="WhatsApp CRM ativo — capturando leads automaticamente"
      description={
        <p className="text-sm text-muted-foreground leading-relaxed">
          Conecte um número WhatsApp para o CRM. A IA analisa as conversas e
          cadastra automaticamente os clientes em potencial. Se esse número já
          estiver conectado em outro produto seu, reaproveitamos a sessão.
        </p>
      }
    >
      <CRMWhatsAppActivityLog customerProductId={customerProductId} />
      <CRMLeadCapturePanel customerProductId={customerProductId} />

      <p className="text-[11px] text-muted-foreground text-center px-4">
        💡 Pode usar o mesmo número do bot ou um número exclusivo —
        o sistema detecta automaticamente.
      </p>
    </SharedWhatsAppConnectTab>
  );
}

/* ───────── Activity log for CRM WhatsApp ───────── */
interface LogEntry {
  id: string;
  direction: string;
  phone: string | null;
  message_text: string;
  created_at: string;
  processing_ms: number | null;
  tokens_used: number | null;
  provider: string | null;
  model: string | null;
}

function CRMWhatsAppActivityLog({ customerProductId }: { customerProductId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await (supabase as any)
        .from('bot_conversation_logs')
        .select('id, direction, phone, message_text, created_at, processing_ms, tokens_used, provider, model')
        .eq('customer_product_id', customerProductId)
        .order('created_at', { ascending: false })
        .limit(50);
      setLogs(data || []);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [customerProductId]);

  const syncLeadsToCRM = useCallback(async () => {
    setSyncing(true);
    try {
      const inboundLogs = logs.filter(l => l.direction === 'inbound' && l.phone);
      if (inboundLogs.length === 0) {
        toast({ title: 'Nenhum contato para sincronizar', description: 'Não há mensagens recebidas com telefone válido.', variant: 'destructive' });
        setSyncing(false);
        return;
      }

      toast({ title: '🤖 Analisando conversas com IA...', description: 'Extraindo dados dos contatos automaticamente.' });

      const { data, error } = await supabase.functions.invoke('crm-extract-leads', {
        body: { customer_product_id: customerProductId },
      });

      if (error) throw error;
      if (!data?.ok) throw new Error(data?.error || 'Erro na extração');

      toast({
        title: `✅ ${data.extracted} lead(s) extraído(s) com IA!`,
        description: data.message,
      });
    } catch (e: any) {
      toast({ title: 'Erro ao sincronizar', description: e.message, variant: 'destructive' });
    } finally {
      setSyncing(false);
    }
  }, [logs, customerProductId, toast]);

  useEffect(() => {
    fetchLogs();
    const iv = setInterval(fetchLogs, 8_000);
    return () => clearInterval(iv);
  }, [fetchLogs]);

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const maskPhone = (p: string | null) => {
    if (!p || p.length < 6) return p || '—';
    return p.slice(0, 4) + '••••' + p.slice(-2);
  };

  const inCount = logs.filter(l => l.direction === 'inbound').length;
  const outCount = logs.filter(l => l.direction === 'outbound').length;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Atividade WhatsApp CRM
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Conversas capturadas para extração de leads
            </p>
          </div>
          <div className="flex items-center gap-3">
            {logs.length > 0 && (
              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <ArrowDownLeft className="h-3 w-3 text-blue-500" />
                  {inCount} recebidas
                </span>
                <span className="text-border">|</span>
                <span className="flex items-center gap-1">
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                  {outCount} enviadas
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              <span className="text-[10px] text-muted-foreground">LIVE</span>
            </div>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={syncLeadsToCRM} disabled={syncing || logs.length === 0}>
              {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserPlus className="h-3 w-3" />}
              Sincronizar Leads
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={fetchLogs} disabled={loading}>
              <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading && logs.length === 0 ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Activity className="h-10 w-10 text-muted-foreground/20 mb-3" />
            <p className="text-sm text-muted-foreground">Nenhuma atividade registrada</p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              Envie uma mensagem pelo WhatsApp conectado para ver a atividade aqui
            </p>
          </div>
        ) : (
          <div className="border-t border-border/40">
            <div className="grid grid-cols-[40px_1fr_120px_120px_140px] gap-2 px-4 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/30 bg-muted/30">
              <span></span>
              <span>Mensagem</span>
              <span>Contato</span>
              <span>Telefone</span>
              <span className="text-right">Data</span>
            </div>
            <ScrollArea className="h-[400px]">
              <div className="divide-y divide-border/20">
                {logs.map((l) => {
                  const isIn = l.direction === 'inbound';
                  const senderName = l.model || '—';
                  return (
                    <div
                      key={l.id}
                      className="grid grid-cols-[40px_1fr_120px_120px_140px] gap-2 px-4 py-2.5 text-xs hover:bg-muted/20 transition-colors items-center"
                    >
                      <div className="flex justify-center">
                        {isIn
                          ? <ArrowDownLeft className="h-3.5 w-3.5 text-blue-500" />
                          : <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />
                        }
                      </div>
                      <p className="truncate text-foreground">{l.message_text}</p>
                      <span className="text-muted-foreground truncate">{senderName}</span>
                      <span className="text-muted-foreground font-mono text-[11px]">{maskPhone(l.phone)}</span>
                      <span className="text-muted-foreground text-right text-[11px]">{fmtTime(l.created_at)}</span>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
