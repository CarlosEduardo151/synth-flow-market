import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  MessageCircle, Loader2, CheckCircle2, XCircle, Copy,
  ExternalLink, Shield, RefreshCw, Smartphone, Zap
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface BotWhatsAppApiTabProps {
  customerProductId: string;
  isConnected: boolean;
  instanceId: string;
  token: string;
  phoneNumber: string;
  onInstanceIdChange: (v: string) => void;
  onTokenChange: (v: string) => void;
  onPhoneNumberChange: (v: string) => void;
  onConnectionChange: (connected: boolean) => void;
}

export function BotWhatsAppApiTab({
  customerProductId,
  isConnected,
  instanceId,
  token,
  phoneNumber,
  onInstanceIdChange,
  onTokenChange,
  onPhoneNumberChange,
  onConnectionChange,
}: BotWhatsAppApiTabProps) {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);

  const canTest = instanceId.trim() && token.trim() && phoneNumber.trim();

  const handleTestConnection = async () => {
    if (!canTest) return;
    setTesting(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke('send-whatsapp', {
        body: {
          instanceId,
          token,
          phoneNumber,
          productSlug: 'bots-automacao',
          productTitle: 'Bots de Automação',
          message: '✅ Teste de conexão bem-sucedido! Seu bot está pronto.',
        },
      });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || 'Falha no teste');

      onConnectionChange(true);
      toast({ title: '✅ Conectado!', description: 'Mensagem de teste enviada com sucesso.' });
    } catch (e: any) {
      onConnectionChange(false);
      toast({
        title: 'Falha na conexão',
        description: e.message || 'Verifique suas credenciais Z-API.',
        variant: 'destructive',
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSaveCredentials = async () => {
    if (!instanceId.trim() || !token.trim() || !phoneNumber.trim()) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setSaving(true);
    try {
      const { data: { user } } = await (supabase as any).auth.getUser();
      if (!user) throw new Error('Não autenticado');

      const credentials = [
        { key: 'zapi_instance_id', value: instanceId },
        { key: 'zapi_token', value: token },
        { key: 'zapi_phone', value: phoneNumber },
      ];

      for (const cred of credentials) {
        const { data: existing } = await (supabase as any)
          .from('product_credentials')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_slug', 'bots-automacao')
          .eq('credential_key', cred.key)
          .maybeSingle();

        if (existing?.id) {
          await (supabase as any).from('product_credentials').update({
            credential_value: cred.value,
            updated_at: new Date().toISOString(),
          }).eq('id', existing.id);
        } else {
          await (supabase as any).from('product_credentials').insert({
            user_id: user.id,
            product_slug: 'bots-automacao',
            credential_key: cred.key,
            credential_value: cred.value,
          });
        }
      }

      toast({ title: 'Credenciais salvas!', description: 'Suas credenciais Z-API foram armazenadas com segurança.' });
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = () => {
    onInstanceIdChange('');
    onTokenChange('');
    onPhoneNumberChange('');
    onConnectionChange(false);
    toast({ title: 'Desconectado', description: 'Credenciais removidas. O chat teste continuará funcionando sem WhatsApp real.' });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!' });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
              <Smartphone className="h-4 w-4 text-green-500" />
            </div>
            WhatsApp API
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Conecte ao WhatsApp real via Z-API. Esta integração é <strong>opcional</strong>.
          </p>
        </div>
        <Badge
          variant="outline"
          className={isConnected
            ? 'border-green-500/30 text-green-500 gap-1'
            : 'border-muted-foreground/30 text-muted-foreground gap-1'
          }
        >
          {isConnected ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
          {isConnected ? 'Conectado' : 'Não conectado'}
        </Badge>
      </div>

      {/* Info banner */}
      <Card className="border-blue-500/20 bg-blue-500/5">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="h-4 w-4 text-blue-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Integração opcional</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                O <strong>Chat Teste</strong> funciona sem a API do WhatsApp conectada, usando o motor de IA interno.
                Conectar a API permite que seu bot responda automaticamente no WhatsApp real.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Credentials form */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            Credenciais Z-API
          </CardTitle>
          <CardDescription>
            Configure suas credenciais do provedor Z-API para enviar e receber mensagens.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="zapi-instance" className="text-sm font-medium">
                ID da Instância
              </Label>
              <div className="relative">
                <Input
                  id="zapi-instance"
                  placeholder="Ex: 3C12345678"
                  value={instanceId}
                  onChange={(e) => onInstanceIdChange(e.target.value)}
                  className="pr-9"
                />
                {instanceId && (
                  <button
                    onClick={() => copyToClipboard(instanceId)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zapi-phone" className="text-sm font-medium">
                Número WhatsApp
              </Label>
              <Input
                id="zapi-phone"
                placeholder="5511999999999"
                value={phoneNumber}
                onChange={(e) => onPhoneNumberChange(e.target.value.replace(/\D/g, ''))}
              />
              <p className="text-[11px] text-muted-foreground">Com DDI + DDD, apenas números</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="zapi-token" className="text-sm font-medium">
              Token de Autenticação
            </Label>
            <Input
              id="zapi-token"
              type="password"
              placeholder="Seu token Z-API"
              value={token}
              onChange={(e) => onTokenChange(e.target.value)}
            />
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-3">
            <Button
              onClick={handleTestConnection}
              disabled={!canTest || testing}
              variant="outline"
              className="gap-2"
            >
              {testing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {testing ? 'Testando...' : 'Testar Conexão'}
            </Button>

            <Button
              onClick={handleSaveCredentials}
              disabled={!canTest || saving}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {saving ? 'Salvando...' : 'Salvar Credenciais'}
            </Button>

            {isConnected && (
              <Button variant="ghost" onClick={handleDisconnect} className="gap-2 text-destructive hover:text-destructive">
                <XCircle className="h-4 w-4" />
                Desconectar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* How to get credentials */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ExternalLink className="h-4 w-4 text-primary" />
            Como obter suas credenciais
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-3 text-sm">
            {[
              { step: '1', text: 'Acesse', link: 'https://z-api.io', linkText: 'z-api.io', suffix: ' e crie uma conta ou faça login' },
              { step: '2', text: 'No painel, clique em "Nova Instância" para criar uma conexão WhatsApp' },
              { step: '3', text: 'Escaneie o QR Code com seu WhatsApp para vincular o número' },
              { step: '4', text: 'Copie o ID da Instância e o Token da página de configurações' },
              { step: '5', text: 'Cole as credenciais aqui e clique em "Testar Conexão"' },
            ].map((item) => (
              <li key={item.step} className="flex items-start gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {item.step}
                </span>
                <span className="text-muted-foreground leading-relaxed">
                  {item.link ? (
                    <>
                      {item.text}{' '}
                      <a
                        href={item.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline underline-offset-2 hover:text-primary/80 transition-colors"
                      >
                        {item.linkText}
                      </a>
                      {item.suffix}
                    </>
                  ) : (
                    item.text
                  )}
                </span>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}
