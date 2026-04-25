import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2, RefreshCw, Activity,
  ArrowDownLeft, ArrowUpRight,
} from "lucide-react";
import { FinancialAuthorizedNumbers } from "./FinancialAuthorizedNumbers";
import { SharedWhatsAppConnectTab } from "@/components/whatsapp/SharedWhatsAppConnectTab";

interface Props {
  customerProductId: string;
}

export function FinancialWhatsApp({ customerProductId }: Props) {
  return (
    <SharedWhatsAppConnectTab
      customerProductId={customerProductId}
      context="financial"
      title="WhatsApp do Agente Financeiro"
      subtitle="Registre transações, peça relatórios e envie comprovantes pelo WhatsApp"
      connectedMessage="Agente Financeiro ativo no WhatsApp"
      description={
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Conecte um número WhatsApp para falar com o Agente Financeiro. Se esse
            número já estiver conectado em outro produto seu, reaproveitamos a sessão.
          </p>
          <div className="rounded-lg border bg-muted/30 p-3 text-xs space-y-1">
            <p className="font-medium text-foreground">O que dá pra fazer pelo WhatsApp:</p>
            <ul className="list-disc pl-4 space-y-0.5 text-muted-foreground">
              <li>Perguntar saldo, DRE, faturas, impostos.</li>
              <li>Registrar transações: <em>"Recebi 250 de venda"</em>.</li>
              <li>Enviar PDF de boleto/nota — o bot extrai e cria a fatura.</li>
              <li>Enviar foto de comprovante — o bot lê e registra.</li>
            </ul>
          </div>
        </div>
      }
    >
      <FinancialAuthorizedNumbers customerProductId={customerProductId} />
      <FinancialActivityLog customerProductId={customerProductId} />
    </SharedWhatsAppConnectTab>
  );
}

/* ───────── Activity log Financeiro (espelha o CRM lendo bot_conversation_logs) ───────── */
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

function FinancialActivityLog({ customerProductId }: { customerProductId: string }) {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      // 1) Descobre o telefone vinculado a este customer_product_id (Evolution instance)
      const { data: inst } = await (supabase as any)
        .from('evolution_instances')
        .select('phone_number')
        .eq('customer_product_id', customerProductId)
        .maybeSingle();

      const phone: string | null = inst?.phone_number || null;

      // 2) Tenta buscar logs específicos do produto financeiro
      const { data: ownLogs } = await (supabase as any)
        .from('bot_conversation_logs')
        .select('id, direction, phone, message_text, created_at, processing_ms, tokens_used, provider, model')
        .eq('customer_product_id', customerProductId)
        .order('created_at', { ascending: false })
        .limit(50);

      let merged: LogEntry[] = (ownLogs as LogEntry[]) || [];

      // 3) Se houver telefone vinculado, agrega o histórico do mesmo número
      //    (mensagens antigas registradas por outros produtos no mesmo número)
      if (phone) {
        const { data: phoneLogs } = await (supabase as any)
          .from('bot_conversation_logs')
          .select('id, direction, phone, message_text, created_at, processing_ms, tokens_used, provider, model')
          .eq('phone', phone)
          .order('created_at', { ascending: false })
          .limit(50);

        const seen = new Set(merged.map((l) => l.id));
        for (const l of (phoneLogs as LogEntry[]) || []) {
          if (!seen.has(l.id)) {
            merged.push(l);
            seen.add(l.id);
          }
        }
        merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        merged = merged.slice(0, 50);
      }

      setLogs(merged);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [customerProductId]);

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

  const inCount = logs.filter(l => l.direction === 'inbound' || l.direction === 'in').length;
  const outCount = logs.filter(l => l.direction === 'outbound' || l.direction === 'out').length;

  return (
    <Card className="border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Atividade do Motor — Financeiro
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Mensagens processadas no número conectado ao Agente Financeiro
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
              <span>Origem</span>
              <span>Telefone</span>
              <span className="text-right">Data</span>
            </div>
            <ScrollArea className="h-[420px]">
              <div className="divide-y divide-border/20">
                {logs.map((l) => {
                  const isIn = l.direction === 'inbound' || l.direction === 'in';
                  const senderName = l.provider || l.model || '—';
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
        {logs.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-border/30 text-[10px] text-muted-foreground">
            <span>{logs.length} registro{logs.length !== 1 ? 's' : ''} (últimos 50)</span>
            <span>Atualização automática a cada 8s</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
