import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2,
  QrCode,
  Power,
  RefreshCw,
  Smartphone,
  Activity,
  ArrowDownLeft,
  ArrowUpRight,
  Image as ImageIcon,
  FileText,
} from "lucide-react";

interface Props {
  customerProductId: string;
}

type Status = { connected: boolean; state: string; instanceName?: string } | null;

interface LogRow {
  id: string;
  direction: "in" | "out";
  phone: string | null;
  message_text: string | null;
  attachment_type: string | null;
  processing_ms: number | null;
  status: string;
  created_at: string;
}

export function FinancialWhatsApp({ customerProductId }: Props) {
  const { toast } = useToast();
  const [status, setStatus] = useState<Status>(null);
  const [qrcode, setQrcode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [polling, setPolling] = useState(false);
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);

  const invoke = useCallback(async (action: string) => {
    const { data, error } = await (supabase as any).functions.invoke("whatsapp-instance", {
      body: { action, context: "financial" },
    });
    if (error) throw new Error(error.message || "Erro ao contatar o servidor");
    if (data?.error) throw new Error(data.error);
    return data;
  }, []);

  const checkStatus = useCallback(async () => {
    try {
      const data = await invoke("status");
      setStatus({
        connected: !!data.connected,
        state: data.state || "unknown",
        instanceName: data.instanceName,
      });
      if (data.connected) setQrcode(null);
      return data;
    } catch {
      setStatus({ connected: false, state: "disconnected" });
      return null;
    }
  }, [invoke]);

  const reconfigureWebhook = useCallback(async (silent = false) => {
    try {
      await invoke("reconfigure_webhook");
      if (!silent) toast({ title: "Webhook reconfigurado", description: "O WhatsApp agora envia mensagens para o Agente Financeiro." });
    } catch (e) {
      if (!silent) {
        toast({
          title: "Erro ao reconfigurar",
          description: e instanceof Error ? e.message : "Falha desconhecida",
          variant: "destructive",
        });
      }
    }
  }, [invoke, toast]);

  const loadLogs = useCallback(async () => {
    try {
      const { data } = await (supabase as any)
        .from("financial_whatsapp_logs")
        .select("id, direction, phone, message_text, attachment_type, processing_ms, status, created_at")
        .eq("customer_product_id", customerProductId)
        .order("created_at", { ascending: false })
        .limit(50);
      setLogs((data as LogRow[]) || []);
    } catch { /* ignore */ }
    finally { setLogsLoading(false); }
  }, [customerProductId]);

  useEffect(() => {
    checkStatus();
    loadLogs();
    const logsInterval = setInterval(loadLogs, 8000);
    return () => clearInterval(logsInterval);
  }, [checkStatus, loadLogs]);

  // Poll status while showing QR code
  useEffect(() => {
    if (!qrcode || status?.connected) return;
    setPolling(true);
    const interval = setInterval(async () => {
      const s = await checkStatus();
      if (s?.connected) {
        setPolling(false);
        toast({ title: "Conectado!", description: "Seu WhatsApp foi vinculado ao Agente Financeiro." });
      }
    }, 3000);
    return () => {
      clearInterval(interval);
      setPolling(false);
    };
  }, [qrcode, status?.connected, checkStatus, toast]);

  const handleConnect = async () => {
    setLoading(true);
    try {
      const data = await invoke("create");
      if (data.qrcode) {
        setQrcode(data.qrcode);
      } else {
        const qr = await invoke("qrcode");
        setQrcode(qr.qrcode || null);
      }
      await checkStatus();
    } catch (e) {
      toast({
        title: "Erro ao conectar",
        description: e instanceof Error ? e.message : "Falha desconhecida",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshQR = async () => {
    setLoading(true);
    try {
      const qr = await invoke("qrcode");
      setQrcode(qr.qrcode || null);
    } catch (e) {
      toast({
        title: "Erro",
        description: e instanceof Error ? e.message : "Falha ao obter QR",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await invoke("disconnect");
      setQrcode(null);
      await checkStatus();
      toast({ title: "Desconectado", description: "WhatsApp foi desconectado." });
    } catch (e) {
      toast({
        title: "Erro",
        description: e instanceof Error ? e.message : "Falha ao desconectar",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const qrImg = qrcode
    ? qrcode.startsWith("data:")
      ? qrcode
      : `data:image/png;base64,${qrcode}`
    : null;

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const maskPhone = (p: string | null) => {
    if (!p || p.length < 6) return p || "—";
    return p.slice(0, 4) + "••••" + p.slice(-2);
  };

  const inCount = logs.filter(l => l.direction === "in").length;
  const outCount = logs.filter(l => l.direction === "out").length;

  return (
    <div className="space-y-4">
      {/* Connection panel */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            <CardTitle>WhatsApp do Agente Financeiro</CardTitle>
          </div>
          {status && (
            <Badge variant={status.connected ? "default" : "outline"}>
              {status.connected ? "🟢 Conectado" : "🔴 Desconectado"}
            </Badge>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-4 text-sm space-y-2">
            <p className="font-medium">O que dá para fazer pelo WhatsApp?</p>
            <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
              <li>Perguntar saldo, DRE, faturas, impostos — respostas com números reais.</li>
              <li>Registrar transações por texto: <em>"Recebi 250 de venda"</em>.</li>
              <li>Enviar PDF de boleto/nota — o bot extrai e cria a fatura/transação.</li>
              <li>Enviar foto de comprovante — o bot lê e registra automaticamente.</li>
            </ul>
          </div>

          {!status?.connected && !qrImg && (
            <Button onClick={handleConnect} disabled={loading} className="w-full sm:w-auto">
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <QrCode className="h-4 w-4 mr-2" />
              )}
              Conectar WhatsApp
            </Button>
          )}

          {qrImg && !status?.connected && (
            <div className="flex flex-col items-center gap-3 py-4">
              <div className="rounded-lg border bg-white p-3">
                <img src={qrImg} alt="QR Code WhatsApp" className="w-64 h-64" />
              </div>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Abra o WhatsApp → <strong>Aparelhos conectados</strong> → <strong>Conectar aparelho</strong> e escaneie o código.
                {polling && <span className="block mt-1 text-xs">Aguardando conexão...</span>}
              </p>
              <Button variant="outline" size="sm" onClick={handleRefreshQR} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
                Atualizar QR
              </Button>
            </div>
          )}

          {status?.connected && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={checkStatus} disabled={loading}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Verificar status
              </Button>
              <Button variant="destructive" onClick={handleDisconnect} disabled={loading}>
                <Power className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Activity log — estilo bots-automação */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="h-4 w-4 text-primary" />
                Atividade do Motor
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                Mensagens processadas pelo Agente Financeiro no WhatsApp conectado
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
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={loadLogs} disabled={logsLoading}>
                <RefreshCw className={`h-3 w-3 ${logsLoading ? "animate-spin" : ""}`} />
                Atualizar
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {logsLoading && logs.length === 0 ? (
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
              <div className="grid grid-cols-[40px_1fr_110px_80px_80px_150px] gap-2 px-4 py-2 text-[10px] font-medium text-muted-foreground uppercase tracking-wider border-b border-border/30 bg-muted/30">
                <span></span>
                <span>Mensagem</span>
                <span>Telefone</span>
                <span>Anexo</span>
                <span>Tempo</span>
                <span className="text-right">Data</span>
              </div>
              <ScrollArea className="h-[420px]">
                <div className="divide-y divide-border/20">
                  {logs.map((l) => {
                    const isIn = l.direction === "in";
                    return (
                      <div
                        key={l.id}
                        className="grid grid-cols-[40px_1fr_110px_80px_80px_150px] gap-2 px-4 py-2.5 text-xs hover:bg-muted/20 transition-colors items-center"
                      >
                        <div className="flex justify-center">
                          <div className={`rounded-md p-1 ${isIn ? "bg-blue-500/10" : "bg-green-500/10"}`}>
                            {isIn
                              ? <ArrowDownLeft className="h-3.5 w-3.5 text-blue-500" />
                              : <ArrowUpRight className="h-3.5 w-3.5 text-green-500" />}
                          </div>
                        </div>
                        <div className="min-w-0">
                          <p className="text-foreground truncate whitespace-pre-wrap">{l.message_text}</p>
                        </div>
                        <span className="text-muted-foreground font-mono text-[11px]">{maskPhone(l.phone)}</span>
                        <span>
                          {l.attachment_type ? (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {l.attachment_type === "image" ? (
                                <ImageIcon className="h-2.5 w-2.5 mr-1" />
                              ) : (
                                <FileText className="h-2.5 w-2.5 mr-1" />
                              )}
                              {l.attachment_type}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </span>
                        <span className="text-muted-foreground">{l.processing_ms ? `${l.processing_ms}ms` : "—"}</span>
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
              <span>{logs.length} registro{logs.length !== 1 ? "s" : ""} (últimos 50)</span>
              <span>Atualização automática a cada 8s</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
