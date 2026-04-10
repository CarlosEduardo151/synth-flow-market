import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Loader2, CheckCircle2, XCircle, RefreshCw,
  Smartphone, Zap, QrCode, Wifi, WifiOff
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BotWhatsAppApiTabProps {
  customerProductId: string;
  isConnected: boolean;
  instanceId: string;
  token: string;
  clientToken: string;
  phoneNumber: string;
  onInstanceIdChange: (v: string) => void;
  onTokenChange: (v: string) => void;
  onClientTokenChange: (v: string) => void;
  onPhoneNumberChange: (v: string) => void;
  onConnectionChange: (connected: boolean) => void;
}

export function BotWhatsAppApiTab({
  customerProductId,
  isConnected,
  onConnectionChange,
}: BotWhatsAppApiTabProps) {
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'status' },
      });
      if (error) throw error;
      if (data?.connected) {
        onConnectionChange(true);
        setQrCode(null);
        setInstanceName(data.instanceName || null);
      } else if (data?.state === 'close' && instanceName) {
        // Instance exists but disconnected
        onConnectionChange(false);
      }
      return data;
    } catch {
      return null;
    }
  }, [onConnectionChange, instanceName]);

  // Check status on mount
  useEffect(() => {
    checkStatus().finally(() => setInitialLoading(false));
  }, []);

  // Poll for connection while QR code is showing
  useEffect(() => {
    if (!qrCode) return;
    const interval = setInterval(async () => {
      const result = await checkStatus();
      if (result?.connected) {
        clearInterval(interval);
        toast({ title: '✅ WhatsApp conectado!', description: 'Seu bot já está pronto para responder.' });
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [qrCode, checkStatus, toast]);

  const handleActivate = async () => {
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'create' },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'Falha ao criar instância');

      setInstanceName(data.instanceName);

      if (data.qrcode) {
        setQrCode(data.qrcode);
      } else {
        // Instance already existed, fetch QR
        const qrResp = await supabase.functions.invoke('whatsapp-instance', {
          body: { action: 'qrcode' },
        });
        if (qrResp.data?.qrcode) {
          setQrCode(qrResp.data.qrcode);
        }
      }

      if (data.status === 'open') {
        onConnectionChange(true);
        toast({ title: '✅ Já conectado!', description: 'Sua instância WhatsApp já estava ativa.' });
      } else {
        toast({ title: 'QR Code gerado!', description: 'Escaneie com o WhatsApp para conectar.' });
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
        body: { action: 'qrcode' },
      });
      if (error) throw error;
      if (data?.qrcode) {
        setQrCode(data.qrcode);
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

  const handleDisconnect = async () => {
    try {
      await supabase.functions.invoke('whatsapp-instance', {
        body: { action: 'disconnect' },
      });
      onConnectionChange(false);
      setQrCode(null);
      toast({ title: 'Desconectado', description: 'WhatsApp desconectado com sucesso.' });
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' });
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    const result = await checkStatus();
    setChecking(false);
    if (result?.connected) {
      toast({ title: '✅ Conectado!', description: 'WhatsApp está online.' });
    } else {
      toast({ title: 'Não conectado', description: 'Escaneie o QR Code para conectar.', variant: 'destructive' });
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
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Conectar WhatsApp</h2>
            <p className="text-xs text-muted-foreground">
              Conecte seu número para o bot responder automaticamente
            </p>
          </div>
        </div>
        <Badge
          variant="outline"
          className={isConnected
            ? 'border-green-500/30 bg-green-500/5 text-green-600 gap-1.5 px-3 py-1'
            : 'border-orange-500/30 bg-orange-500/5 text-orange-600 gap-1.5 px-3 py-1'
          }
        >
          {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {isConnected ? 'Conectado' : 'Desconectado'}
        </Badge>
      </div>

      {/* Connected State */}
      {isConnected && (
        <Card className="border-green-500/30 bg-green-500/5">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
              <div>
                <h3 className="font-semibold text-green-700 dark:text-green-400">WhatsApp ativo!</h3>
                <p className="text-sm text-green-600/80 dark:text-green-400/80">
                  Seu bot está respondendo automaticamente via WhatsApp.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleCheckStatus}
                disabled={checking}
              >
                {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Verificar Status
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="gap-2 text-destructive hover:text-destructive ml-auto"
                onClick={handleDisconnect}
              >
                <XCircle className="h-3.5 w-3.5" />
                Desconectar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not connected - Activate */}
      {!isConnected && !qrCode && (
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Ativar WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Clique no botão abaixo para ativar o WhatsApp no seu bot. 
              Um <strong>QR Code</strong> será gerado para você escanear com o WhatsApp que deseja conectar.
            </p>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">1</span>
                <span>Clique em <strong>"Ativar WhatsApp"</strong></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">2</span>
                <span>Escaneie o <strong>QR Code</strong> com seu WhatsApp</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">3</span>
                <span><strong>Pronto!</strong> O bot começa a responder automaticamente</span>
              </li>
            </ol>
            <Button
              onClick={handleActivate}
              disabled={creating}
              className="w-full gap-2"
              size="lg"
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Preparando...
                </>
              ) : (
                <>
                  <Smartphone className="h-4 w-4" />
                  Ativar WhatsApp
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* QR Code Display */}
      {!isConnected && qrCode && (
        <Card className="border-primary/20">
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
            <div className="flex justify-center">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleRefreshQr}
                disabled={checking}
              >
                {checking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                Gerar novo QR Code
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tip */}
      <p className="text-[11px] text-muted-foreground text-center px-4">
        💡 O <strong>Chat Teste</strong> (menu lateral) funciona sem essa integração. 
        A conexão WhatsApp é necessária apenas para respostas automáticas no WhatsApp real.
      </p>
    </div>
  );
}
