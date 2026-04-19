import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2, CheckCircle2, XCircle, RefreshCw,
  Smartphone, Zap, QrCode, Wifi, WifiOff,
  ArrowDownLeft, ArrowUpRight, Activity, UserPlus,
  AlertTriangle, Clock
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { CRMLeadCapturePanel } from './CRMLeadCapturePanel';

interface CRMWhatsAppTabProps {
  customerProductId: string;
}

export function CRMWhatsAppTab({ customerProductId }: CRMWhatsAppTabProps) {
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrGeneratedAt, setQrGeneratedAt] = useState<number | null>(null);
  const [qrSecondsLeft, setQrSecondsLeft] = useState<number>(0);
  const [instanceName, setInstanceName] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [checking, setChecking] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [reconnecting, setReconnecting] = useState(false);

  const QR_LIFETIME_SEC = 55;

  const invokeInstance = (action: string) =>
    supabase.functions.invoke('whatsapp-instance', {
      body: { action, context: 'crm' },
    });

  const friendlyError = (raw: any): string => {
    const msg = (raw?.message || raw?.error || String(raw || '')).toLowerCase();
    if (msg.includes('apikey') || msg.includes('unauthor') || msg.includes('401')) {
      return 'Credenciais da Evolution API inválidas. Contate o suporte.';
    }
    if (msg.includes('timeout') || msg.includes('econnrefused') || msg.includes('fetch')) {
      return 'Servidor WhatsApp fora do ar. Tente novamente em instantes.';
    }
    if (msg.includes('already exists') || msg.includes('exists')) {
      return 'Instância já existe — sincronizando status atual...';
    }
    if (msg.includes('not found') || msg.includes('404')) {
      return 'Instância não encontrada. Clique em "Ativar" para recriar.';
    }
    return raw?.message || raw?.error || 'Erro desconhecido. Tente novamente.';
  };

  const checkStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'status', context: 'crm' },
      });
      if (error) throw error;
      const state = data?.state || '';
      const connected = data?.connected === true || state === 'open';
      setLastChecked(new Date());
      setLastError(null);
      if (connected) {
        setIsConnected(true);
        setQrCode(null);
        setQrGeneratedAt(null);
        setInstanceName(data.instanceName || null);
      } else {
        setIsConnected(false);
        if (data?.instanceName) setInstanceName(data.instanceName);
      }
      return { ...data, connected };
    } catch (e: any) {
      setLastError(friendlyError(e));
      return null;
    }
  }, []);

  useEffect(() => {
    checkStatus().finally(() => setInitialLoading(false));
  }, []);

  // Background polling when connected — detects drops every 30s
  useEffect(() => {
    if (!isConnected) return;
    const interval = setInterval(() => {
      checkStatus();
    }, 30_000);
    return () => clearInterval(interval);
  }, [isConnected, checkStatus]);

  // Fast polling while QR is shown — detects scan
  useEffect(() => {
    if (!qrCode) return;
    const interval = setInterval(async () => {
      const result = await checkStatus();
      if (result?.connected) {
        clearInterval(interval);
        toast({ title: '✅ WhatsApp CRM conectado!', description: 'Mensagens serão capturadas para o CRM.' });
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [qrCode, checkStatus, toast]);

  const handleRefreshQr = useCallback(async (silent = false) => {
    if (!silent) setChecking(true);
    try {
      const { data, error } = await invokeInstance('qrcode');
      if (error) throw error;
      if (data?.qrcode) {
        setQrCode(data.qrcode);
        setQrGeneratedAt(Date.now());
        if (!silent) toast({ title: 'QR Code atualizado!' });
      } else {
        if (!silent) toast({ title: 'QR Code indisponível', description: 'Tente criar a instância novamente.', variant: 'destructive' });
      }
    } catch (e: any) {
      const msg = friendlyError(e);
      setLastError(msg);
      if (!silent) toast({ title: 'Erro', description: msg, variant: 'destructive' });
    } finally {
      if (!silent) setChecking(false);
    }
  }, [toast]);

  // QR countdown + auto-refresh before expiry
  useEffect(() => {
    if (!qrCode || !qrGeneratedAt) return;
    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - qrGeneratedAt) / 1000);
      const left = Math.max(0, QR_LIFETIME_SEC - elapsed);
      setQrSecondsLeft(left);
      if (left === 0) {
        clearInterval(tick);
        handleRefreshQr(true);
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [qrCode, qrGeneratedAt, handleRefreshQr]);

  const handleActivate = async () => {
    setCreating(true);
    setLastError(null);
    try {
      const { data, error } = await invokeInstance('create');
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao criar instância');

      setInstanceName(data.instanceName);

      if (data.qrcode) {
        setQrCode(data.qrcode);
        setQrGeneratedAt(Date.now());
      } else {
        const qrResp = await invokeInstance('qrcode');
        if (qrResp.data?.qrcode) {
          setQrCode(qrResp.data.qrcode);
          setQrGeneratedAt(Date.now());
        }
      }

      if (data.status === 'open') {
        setIsConnected(true);
        toast({ title: '✅ Já conectado!', description: 'Instância CRM WhatsApp já estava ativa.' });
      } else {
        toast({ title: 'QR Code gerado!', description: 'Escaneie com o WhatsApp do CRM para conectar.' });
      }
    } catch (e: any) {
      const msg = friendlyError(e);
      setLastError(msg);
      toast({ title: 'Erro ao ativar', description: msg, variant: 'destructive' });
    } finally {
      setCreating(false);
    }
  };

  const handleReconnect = async () => {
    setReconnecting(true);
    setLastError(null);
    try {
      const { data, error } = await invokeInstance('qrcode');
      if (error) throw error;
      if (data?.qrcode) {
        setQrCode(data.qrcode);
        setQrGeneratedAt(Date.now());
        toast({ title: '🔄 Reconectando...', description: 'Escaneie o novo QR Code para reconectar.' });
      } else {
        await handleActivate();
      }
    } catch (e: any) {
      const msg = friendlyError(e);
      setLastError(msg);
      toast({ title: 'Erro ao reconectar', description: msg, variant: 'destructive' });
    } finally {
      setReconnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await invokeInstance('disconnect');
      setIsConnected(false);
      setQrCode(null);
      setQrGeneratedAt(null);
      toast({ title: 'Desconectado', description: 'WhatsApp CRM desconectado.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: friendlyError(e), variant: 'destructive' });
    }
  };

  const handleReconfigureWebhook = async () => {
    setChecking(true);
    try {
      await invokeInstance('reconfigure_webhook');
      toast({ title: '✅ Webhook reconfigurado!' });
    } catch (e: any) {
      toast({ title: 'Erro', description: friendlyError(e), variant: 'destructive' });
    } finally {
      setChecking(false);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    const result = await checkStatus();
    setChecking(false);
    if (result?.connected) {
      toast({ title: '✅ Conectado!', description: 'WhatsApp CRM está online.' });
    } else {
      toast({ title: 'Não conectado', description: 'Escaneie o QR Code para conectar.', variant: 'destructive' });
    }
  };

  const fmtLastChecked = () => {
    if (!lastChecked) return '—';
    const diff = Math.floor((Date.now() - lastChecked.getTime()) / 1000);
    if (diff < 5) return 'agora';
    if (diff < 60) return `há ${diff}s`;
    return `há ${Math.floor(diff / 60)}min`;
  };

  if (initialLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">WhatsApp CRM</h2>
            <p className="text-xs text-muted-foreground">
              Captura automática de leads via WhatsApp para o CRM
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={isConnected
              ? 'border-green-500/30 bg-green-500/5 text-green-600 gap-1.5 px-3 py-1'
              : qrCode
                ? 'border-blue-500/30 bg-blue-500/5 text-blue-600 gap-1.5 px-3 py-1'
                : 'border-orange-500/30 bg-orange-500/5 text-orange-600 gap-1.5 px-3 py-1'
            }
          >
            {isConnected ? <Wifi className="h-3 w-3" /> : qrCode ? <QrCode className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
            {isConnected ? 'Conectado' : qrCode ? 'Aguardando QR' : 'Desconectado'}
          </Badge>
          {lastChecked && (
            <span className="text-[10px] text-muted-foreground flex items-center gap-1" title={lastChecked.toLocaleString('pt-BR')}>
              <Clock className="h-2.5 w-2.5" />
              {fmtLastChecked()}
            </span>
          )}
        </div>
      </div>

      {/* Error banner */}
      {lastError && !isConnected && (
        <div className="flex items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
          <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
          <span className="text-sm text-destructive flex-1">{lastError}</span>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setLastError(null)}>
            Fechar
          </Button>
        </div>
      )}

      {/* Info card */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="py-3 px-4">
          <p className="text-sm text-blue-700 dark:text-blue-400">
            <strong>💡 Como funciona:</strong> Esta instância é separada do bot de automação. 
            A IA captura dados de clientes em potencial das conversas no WhatsApp e cadastra 
            automaticamente no CRM (nome, telefone, interesse, etc).
          </p>
        </CardContent>
      </Card>

      {/* Connected */}
      {isConnected && (
        <>
          <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
            <span className="text-sm font-medium text-green-700 dark:text-green-400 flex-1">
              WhatsApp CRM ativo — capturando leads automaticamente
            </span>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleCheckStatus} disabled={checking}>
                {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                Status
              </Button>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleReconfigureWebhook} disabled={checking}>
                <Zap className="h-3 w-3" />
                Webhook
              </Button>
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive" onClick={handleDisconnect}>
                <XCircle className="h-3 w-3" />
                Desconectar
              </Button>
            </div>
          </div>

           <CRMWhatsAppActivityLog customerProductId={customerProductId} />

          
        </>
      )}

      {/* Not connected - Activate or Reconnect */}
      {!isConnected && !qrCode && (
        <Card className="border-primary/20 max-w-xl mx-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              {instanceName ? 'Reconectar WhatsApp CRM' : 'Ativar WhatsApp CRM'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {instanceName ? (
              <>
                <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3">
                  <p className="text-sm text-orange-700 dark:text-orange-400 flex items-start gap-2">
                    <WifiOff className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      <strong>Instância existe mas está desconectada.</strong> Pode ter caído porque o celular ficou sem internet,
                      foi desligado ou a sessão expirou. Clique em <strong>Reconectar</strong> para gerar um novo QR Code.
                    </span>
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">
                  Instância: <code className="bg-muted px-1.5 py-0.5 rounded">{instanceName}</code>
                </p>
                <div className="flex gap-2">
                  <Button onClick={handleReconnect} disabled={reconnecting} className="flex-1 gap-2" size="lg">
                    {reconnecting ? <><Loader2 className="h-4 w-4 animate-spin" />Reconectando...</> : <><RefreshCw className="h-4 w-4" />Reconectar agora</>}
                  </Button>
                  <Button onClick={handleCheckStatus} variant="outline" size="lg" disabled={checking}>
                    {checking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wifi className="h-4 w-4" />}
                  </Button>
                </div>
              </>
            ) : (
              <>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Conecte um número WhatsApp exclusivo para o CRM. A IA irá analisar as conversas e
                  cadastrar automaticamente os clientes em potencial.
                </p>
                <ol className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">1</span>
                    <span>Clique em <strong>"Ativar WhatsApp CRM"</strong></span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">2</span>
                    <span>Escaneie o <strong>QR Code</strong> com o WhatsApp da empresa</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">3</span>
                    <span><strong>Pronto!</strong> Leads serão capturados automaticamente</span>
                  </li>
                </ol>
                <Button onClick={handleActivate} disabled={creating} className="w-full gap-2" size="lg">
                  {creating ? <><Loader2 className="h-4 w-4 animate-spin" />Preparando...</> : <><Smartphone className="h-4 w-4" />Ativar WhatsApp CRM</>}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* QR Code */}
      {!isConnected && qrCode && (
        <Card className="border-primary/20 max-w-xl mx-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <QrCode className="h-4 w-4 text-primary" />
              Escaneie o QR Code
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground text-center">
              Abra o WhatsApp no celular → <strong>Dispositivos conectados</strong> → <strong>Conectar dispositivo</strong>
            </p>
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-xl shadow-sm border">
                <img
                  src={qrCode.startsWith('data:') ? qrCode : `data:image/png;base64,${qrCode}`}
                  alt="QR Code WhatsApp CRM"
                  className="w-64 h-64 object-contain"
                />
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Aguardando leitura do QR Code...
            </div>
            <div className="flex justify-center">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleRefreshQr} disabled={checking}>
                {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Gerar novo QR Code
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Captura automática de leads */}
      <CRMLeadCapturePanel customerProductId={customerProductId} />

      <p className="text-[11px] text-muted-foreground text-center px-4">
        💡 Esta instância é <strong>separada</strong> do bot de automação. 
        Você pode ter ambos conectados simultaneamente em números diferentes.
      </p>
    </div>
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
        <div className="flex items-center justify-between">
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

