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
  MessageSquare,
  ArrowUp,
  ArrowDown,
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

  const loadLogs = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("financial_whatsapp_logs")
      .select("id, direction, phone, message_text, attachment_type, status, created_at")
      .eq("customer_product_id", customerProductId)
      .order("created_at", { ascending: false })
      .limit(30);
    setLogs((data as LogRow[]) || []);
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
        // Fallback: request QR explicitly
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

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {/* Connection panel */}
      <Card className="lg:col-span-2">
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

      {/* Activity log */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">Últimas mensagens</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[420px] px-4 pb-4">
            {logs.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                Nenhuma mensagem ainda.
              </p>
            ) : (
              <div className="space-y-2">
                {logs.map((l) => (
                  <div
                    key={l.id}
                    className={`p-2 rounded-md border text-xs ${
                      l.direction === "in" ? "bg-muted/40" : "bg-primary/5 border-primary/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="flex items-center gap-1 font-medium">
                        {l.direction === "in" ? (
                          <ArrowDown className="h-3 w-3" />
                        ) : (
                          <ArrowUp className="h-3 w-3" />
                        )}
                        {l.direction === "in" ? "Recebido" : "Enviado"}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(l.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="line-clamp-3 whitespace-pre-wrap">{l.message_text}</div>
                    {l.attachment_type && (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {l.attachment_type === "image" ? (
                          <ImageIcon className="h-3 w-3 mr-1" />
                        ) : (
                          <FileText className="h-3 w-3 mr-1" />
                        )}
                        {l.attachment_type}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
