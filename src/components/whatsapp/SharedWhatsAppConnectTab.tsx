import { useState, useEffect, useCallback, ReactNode } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Loader2, CheckCircle2, XCircle, RefreshCw,
  Smartphone, Zap, QrCode, Wifi, WifiOff,
  Phone, Link2,
} from 'lucide-react';
import QRCode from 'qrcode';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export type WhatsAppContext = 'bot' | 'crm' | 'financial';

interface SharedWhatsAppConnectTabProps {
  /** customer_product_id usado para escopo de logs / vinculação */
  customerProductId: string;
  /** Backend context — define qual produto/ingest será associado */
  context: WhatsAppContext;
  /** Texto exibido no cabeçalho (ex: "WhatsApp", "WhatsApp CRM", "WhatsApp do Agente Financeiro") */
  title: string;
  /** Subtítulo explicativo curto */
  subtitle: string;
  /** Mensagem mostrada quando conectado */
  connectedMessage: string;
  /** Texto que descreve o que essa integração faz (acima do input) */
  description?: ReactNode;
  /** Slot opcional renderizado abaixo do bloco de conexão (logs, números autorizados, etc.) */
  children?: ReactNode;
  /** Notifica o pai sobre mudanças de conexão (opcional) */
  onConnectionChange?: (connected: boolean) => void;
}

/**
 * Componente unificado de conexão WhatsApp via número.
 * Reutilizado no Bots-Automação, CRM e Agente Financeiro para garantir UX
 * consistente: digite o número → se já conectado em outra instância, reaproveita;
 * se não, gera QR Code.
 */
export function SharedWhatsAppConnectTab({
  customerProductId,
  context,
  title,
  subtitle,
  connectedMessage,
  description,
  children,
  onConnectionChange,
}: SharedWhatsAppConnectTabProps) {
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [rawState, setRawState] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [phoneInput, setPhoneInput] = useState('');

  const getInvokeErrorMessage = (error: any, data?: any) => {
    return (
      data?.message ||
      data?.error ||
      error?.context?.message ||
      error?.message ||
      'Tente novamente.'
    );
  };

  const prepareQrForDisplay = async (value?: string | null) => {
    const raw = String(value || '').trim();
    if (!raw) return null;
    if (raw.startsWith('data:image')) return raw;
    if (/^(iVBORw0KGgo|\/9j\/|UklGR|R0lGOD)/.test(raw)) return `data:image/png;base64,${raw}`;
    return QRCode.toDataURL(raw, { errorCorrectionLevel: 'M', margin: 2, width: 320 });
  };

  const setConnected = useCallback((v: boolean) => {
    setIsConnected(v);
    onConnectionChange?.(v);
  }, [onConnectionChange]);

  const checkStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'status', context },
      });
      if (error) throw error;
      setRawState(data?.state || null);
      if (data?.connected) {
        setConnected(true);
        setQrCode(null);
        setInstanceName(data.instanceName || null);
      } else {
        setConnected(false);
        if (data?.instanceName) setInstanceName(data.instanceName);
        if (!data?.instanceName) {
          setInstanceName(null);
          setQrCode(null);
        }
      }
      return data;
    } catch {
      setConnected(false);
      setRawState(null);
      return null;
    }
  }, [context, setConnected]);

  // Initial status check
  useEffect(() => {
    checkStatus().finally(() => setInitialLoading(false));
  }, [checkStatus]);

  // Poll while QR is showing
  useEffect(() => {
    if (!qrCode) return;
    const interval = setInterval(async () => {
      const result = await checkStatus();
      if (result?.connected) {
        clearInterval(interval);
        toast({ title: '✅ WhatsApp conectado!', description: connectedMessage });
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [qrCode, checkStatus, toast, connectedMessage]);

  // Background polling — every 15s, even when "disconnected", because the
  // status endpoint also triggers an inline auto-heal (it tries to reconnect
  // respecting the persisted backoff). The user never needs to click anything:
  // open the tab and the system recovers on its own.
  useEffect(() => {
    if (qrCode) return; // already polling fast in the QR effect above
    const iv = setInterval(() => { checkStatus(); }, 15_000);
    return () => clearInterval(iv);
  }, [qrCode, checkStatus]);

  const handleForceReconnect = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'force_reconnect', context },
      });
      if (error) throw new Error(getInvokeErrorMessage(error, data));

      // Se a auto-reconexão devolveu um QR, mostramos imediatamente para re-scan
      if (data?.qrcode) {
        setQrCode(await prepareQrForDisplay(data.qrcode));
        setConnected(false);
        toast({
          title: '📱 Escaneie o QR Code',
          description: 'A sessão expirou. Escaneie o QR para reconectar.',
        });
        return;
      }

      const result = await checkStatus();
      if (result?.connected) {
        toast({ title: '✅ Reconectado!', description: 'Sessão WhatsApp restabelecida.' });
      } else {
        toast({
          title: 'Reconexão em andamento',
          description: data?.state
            ? `Estado atual: ${data.state}. O sistema continua tentando.`
            : 'O sistema continua tentando automaticamente. Mantenha o celular online.',
        });
      }
    } catch (e: any) {
      toast({ title: 'Erro ao reconectar', description: e.message, variant: 'destructive' });
    } finally {
      setChecking(false);
    }
  };

  const handleActivate = async () => {
    const cleaned = phoneInput.replace(/\D+/g, '');
    if (cleaned.length < 10) {
      toast({
        title: 'Número inválido',
        description: 'Digite o WhatsApp com DDD (ex: 11 91234-5678).',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'connect_by_number', phone: phoneInput, context },
      });
      if (error) throw new Error(getInvokeErrorMessage(error, data));
      if (!data?.success) throw new Error(data?.error || 'Falha ao ativar WhatsApp');

      setInstanceName(data.instanceName);

      // Already connected — instance reused, no QR needed
      if (data.alreadyConnected) {
        setConnected(true);
        setQrCode(null);
        toast({
          title: '✅ Número já conectado!',
          description: 'Reaproveitamos a sessão ativa — sem precisar escanear QR Code.',
        });
        return;
      }

      if (data.qrcode) {
        setQrCode(await prepareQrForDisplay(data.qrcode));
        toast({ title: 'QR Code gerado!', description: 'Escaneie com o WhatsApp para conectar.' });
      } else {
        toast({ title: 'Aguarde…', description: 'Instância criada. Gerando QR Code…' });
        const qrResp = await supabase.functions.invoke('whatsapp-instance', {
          body: { action: 'qrcode', context },
        });
        if (qrResp.data?.qrcode) setQrCode(await prepareQrForDisplay(qrResp.data.qrcode));
      }
    } catch (e: any) {
      toast({
        title: 'Erro ao ativar',
        description: e.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRefreshQr = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'qrcode', context, reset: true },
      });
      if (error) throw new Error(getInvokeErrorMessage(error, data));
      if (data?.qrcode) {
        setQrCode(await prepareQrForDisplay(data.qrcode));
        toast({ title: 'QR Code atualizado!' });
      } else {
        toast({ title: 'QR Code indisponível', description: 'Tente criar a instância novamente.', variant: 'destructive' });
      }
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setChecking(false);
    }
  };

  const handleTotalReset = async () => {
    if (!confirm('Isso vai apagar a sessão atual no servidor e gerar um QR Code novo do zero. Continuar?')) return;
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'qrcode', context, total_reset: true },
      });
      if (error) throw new Error(getInvokeErrorMessage(error, data));
      if (data?.qrcode) {
        setQrCode(await prepareQrForDisplay(data.qrcode));
        toast({ title: 'Sessão recriada', description: 'Escaneie o novo QR Code.' });
      } else {
        toast({ title: 'Reset feito', description: 'Aguarde e clique em "Gerar novo QR Code".' });
      }
    } catch (e: any) {
      toast({ title: 'Erro no reset total', description: e.message, variant: 'destructive' });
    } finally {
      setChecking(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'disconnect', context },
      });
      if (error) throw new Error(getInvokeErrorMessage(error, data));
      setConnected(false);
      setQrCode(null);
      setInstanceName(null);
      toast({ title: 'Desconectado', description: 'WhatsApp desconectado com sucesso.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleReconfigureWebhook = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'reconfigure_webhook', context },
      });
      if (error) throw new Error(getInvokeErrorMessage(error, data));
      toast({ title: '✅ Webhook reconfigurado!', description: 'As mensagens serão processadas corretamente.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    } finally {
      setChecking(false);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    const result = await checkStatus();
    setChecking(false);
    if (result?.connected) {
      toast({ title: '✅ Conectado!', description: 'WhatsApp está online.' });
    } else {
      toast({ title: 'Não conectado', description: 'Digite o número e ative para conectar.', variant: 'destructive' });
    }
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
            <h2 className="text-lg font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={isConnected
            ? 'border-green-500/30 bg-green-500/5 text-green-600 gap-1.5 px-3 py-1'
            : qrCode
              ? 'border-blue-500/30 bg-blue-500/5 text-blue-600 gap-1.5 px-3 py-1'
              : rawState === 'connecting'
                ? 'border-yellow-500/30 bg-yellow-500/5 text-yellow-600 gap-1.5 px-3 py-1'
                : rawState === 'service_unavailable'
                  ? 'border-zinc-500/30 bg-zinc-500/5 text-zinc-600 gap-1.5 px-3 py-1'
                  : 'border-orange-500/30 bg-orange-500/5 text-orange-600 gap-1.5 px-3 py-1'
          }
        >
          {isConnected ? <Wifi className="h-3 w-3" /> : qrCode ? <QrCode className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {isConnected
            ? `Conectado${rawState ? ` · ${rawState}` : ''}`
            : qrCode
              ? 'Aguardando QR'
              : rawState === 'connecting'
                ? 'Conectando…'
                : rawState === 'connecting_stalled'
                  ? 'Sessão travada — gere um QR novo'
                  : rawState === 'service_unavailable'
                    ? 'Provedor indisponível'
                    : rawState === 'not_provisioned'
                      ? 'Não conectado'
                      : `Desconectado${rawState ? ` · ${rawState}` : ''}`}
        </Badge>
      </div>

      {/* Diagnostic bar — visible whenever an instance exists, even disconnected */}
      {instanceName && !isConnected && !qrCode && (
        <div className="flex items-center gap-3 rounded-lg border border-orange-500/20 bg-orange-500/5 px-4 py-3">
          <WifiOff className="h-5 w-5 text-orange-500 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-orange-700 dark:text-orange-400">
              {rawState === 'connecting'
                ? 'Conectando ao WhatsApp…'
                : rawState === 'connecting_stalled'
                  ? 'A conexão ficou travada — escaneie um QR Code novo'
                  : rawState === 'service_unavailable'
                    ? 'Provedor WhatsApp temporariamente indisponível'
                    : 'Instância encontrada, mas não está em open'}
            </p>
            <p className="text-[11px] text-muted-foreground truncate">
              {instanceName} · estado atual: <strong>{rawState || 'desconhecido'}</strong>
            </p>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleCheckStatus} disabled={checking}>
              {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Status
            </Button>
            <Button
              variant="default"
              size="sm"
              className="h-7 text-xs gap-1.5 bg-green-600 hover:bg-green-700"
              onClick={handleForceReconnect}
              disabled={checking || rawState === 'connecting'}
            >
              <Zap className="h-3 w-3" />
              Reconectar agora
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleReconfigureWebhook} disabled={checking}>
              <Zap className="h-3 w-3" />
              Reconfigurar Webhook
            </Button>
          </div>
        </div>
      )}

      {/* Connected — status bar */}
      {isConnected && (
        <div className="flex items-center gap-3 rounded-lg border border-green-500/20 bg-green-500/5 px-4 py-3">
          <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
          <span className="text-sm font-medium text-green-700 dark:text-green-400 flex-1">
            {connectedMessage}
          </span>
          <div className="flex items-center gap-1.5">
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleCheckStatus} disabled={checking}>
              {checking ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
              Status
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5" onClick={handleReconfigureWebhook} disabled={checking}>
              <Zap className="h-3 w-3" />
              Reconfigurar Webhook
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-destructive hover:text-destructive" onClick={handleDisconnect}>
              <XCircle className="h-3 w-3" />
              Desconectar
            </Button>
          </div>
        </div>
      )}

      {/* Not connected — Activate by number */}
      {!isConnected && !qrCode && (
        <Card className="border-primary/20 max-w-xl mx-auto">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Ativar WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {description ?? (
              <p className="text-sm text-muted-foreground leading-relaxed">
                Digite o número do WhatsApp que você quer conectar. Se ele já estiver
                conectado em outra área do sistema, reaproveitamos a sessão automaticamente.
              </p>
            )}

            <div className="space-y-2">
              <Label htmlFor={`wa-phone-${context}`} className="text-xs font-medium flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-primary" />
                Número do WhatsApp
              </Label>
              <Input
                id={`wa-phone-${context}`}
                type="tel"
                placeholder="Ex: +55 11 91234-5678"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
                disabled={creating}
                autoComplete="tel"
                className="text-base"
              />
              <p className="text-[11px] text-muted-foreground">
                Aceita qualquer formato: <code>+55 11 9...</code>, <code>11 9...</code>, <code>5511...</code> etc.
              </p>
            </div>

            <ol className="space-y-1.5 text-xs text-muted-foreground pt-2 border-t border-border/40">
              <li className="flex items-start gap-2">
                <Link2 className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <span>Se o número <strong>já estiver conectado</strong> em outro painel → conexão instantânea, sem QR.</span>
              </li>
              <li className="flex items-start gap-2">
                <QrCode className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                <span>Se for um número <strong>novo</strong> → geramos um QR Code para você escanear.</span>
              </li>
            </ol>

            <Button onClick={handleActivate} disabled={creating || !phoneInput.trim()} className="w-full gap-2" size="lg">
              {creating ? <><Loader2 className="h-4 w-4 animate-spin" />Verificando número…</> : <><Smartphone className="h-4 w-4" />Conectar WhatsApp</>}
            </Button>
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
                  alt="QR Code WhatsApp"
                  className="w-64 h-64 object-contain"
                />
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Aguardando leitura do QR Code...
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={handleRefreshQr} disabled={checking}>
                {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Gerar novo QR Code
              </Button>
              <Button variant="destructive" size="sm" className="gap-2" onClick={handleTotalReset} disabled={checking}>
                <RefreshCw className="h-3.5 w-3.5" />
                Reset total (apagar sessão)
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Children — logs, números autorizados, etc. */}
      {children}
    </div>
  );
}
