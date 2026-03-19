import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Loader2, CheckCircle2, XCircle, Copy,
  ExternalLink, RefreshCw, Smartphone, Zap,
  ArrowRight, CircleDot, Link2, KeyRound, PhoneCall
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

  const currentStep = !instanceId.trim() && !token.trim() && !phoneNumber.trim()
    ? 1
    : !isConnected
      ? 2
      : 3;

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
      toast({ title: '✅ Conectado!', description: 'Mensagem de teste enviada com sucesso para o seu WhatsApp.' });
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
    if (!canTest) {
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

      toast({ title: 'Credenciais salvas!', description: 'Suas credenciais foram armazenadas com segurança.' });
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
    toast({ title: 'Desconectado', description: 'Credenciais removidas.' });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copiado!' });
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header com status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
            <Smartphone className="h-5 w-5 text-green-500" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Conectar WhatsApp</h2>
            <p className="text-xs text-muted-foreground">
              Vincule seu número para o bot responder automaticamente
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
          {isConnected ? <CheckCircle2 className="h-3 w-3" /> : <CircleDot className="h-3 w-3" />}
          {isConnected ? 'Conectado' : 'Pendente'}
        </Badge>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-0">
        <StepIndicator step={1} currentStep={currentStep} label="Criar conta Z-API" />
        <div className="flex-1 h-px bg-border mx-1" />
        <StepIndicator step={2} currentStep={currentStep} label="Inserir credenciais" />
        <div className="flex-1 h-px bg-border mx-1" />
        <StepIndicator step={3} currentStep={currentStep} label="Pronto!" />
      </div>

      {/* Step 1: Create Z-API account */}
      <Card className={`border transition-all ${currentStep === 1 ? 'border-primary/30 shadow-sm' : 'border-border/50 opacity-80'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              1
            </span>
            Crie sua conta na Z-API
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            A <strong>Z-API</strong> é o serviço que conecta seu WhatsApp ao nosso sistema. 
            É como uma "ponte" entre o WhatsApp e o bot.
          </p>
          <ol className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>Acesse <a href="https://z-api.io" target="_blank" rel="noopener noreferrer" className="text-primary font-medium underline underline-offset-2 hover:text-primary/80">z-api.io</a> e crie uma conta gratuita</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>Crie uma <strong>Nova Instância</strong> no painel</span>
            </li>
            <li className="flex items-start gap-2">
              <ArrowRight className="h-4 w-4 mt-0.5 text-primary shrink-0" />
              <span>Escaneie o <strong>QR Code</strong> com o WhatsApp que deseja usar</span>
            </li>
          </ol>
          <Button variant="outline" size="sm" className="gap-2 mt-1" asChild>
            <a href="https://z-api.io" target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              Abrir Z-API
            </a>
          </Button>
        </CardContent>
      </Card>

      {/* Step 2: Insert credentials */}
      <Card className={`border transition-all ${currentStep === 2 ? 'border-primary/30 shadow-sm' : 'border-border/50 opacity-80'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
              2
            </span>
            Cole suas credenciais
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Copie os dados da sua instância Z-API e cole nos campos abaixo.
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="zapi-instance" className="text-xs font-medium flex items-center gap-1.5">
                <KeyRound className="h-3 w-3 text-muted-foreground" />
                ID da Instância
              </Label>
              <div className="relative">
                <Input
                  id="zapi-instance"
                  placeholder="Ex: 3C12345678"
                  value={instanceId}
                  onChange={(e) => onInstanceIdChange(e.target.value)}
                  className="pr-8 text-sm"
                />
                {instanceId && (
                  <button
                    onClick={() => copyToClipboard(instanceId)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="zapi-phone" className="text-xs font-medium flex items-center gap-1.5">
                <PhoneCall className="h-3 w-3 text-muted-foreground" />
                Número do WhatsApp
              </Label>
              <Input
                id="zapi-phone"
                placeholder="5511999999999"
                value={phoneNumber}
                onChange={(e) => onPhoneNumberChange(e.target.value.replace(/\D/g, ''))}
                className="text-sm"
              />
              <p className="text-[10px] text-muted-foreground">DDI + DDD + número, só números</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="zapi-token" className="text-xs font-medium flex items-center gap-1.5">
              <Link2 className="h-3 w-3 text-muted-foreground" />
              Token de Autenticação
            </Label>
            <Input
              id="zapi-token"
              type="password"
              placeholder="Seu token Z-API"
              value={token}
              onChange={(e) => onTokenChange(e.target.value)}
              className="text-sm"
            />
            <p className="text-[10px] text-muted-foreground">
              Encontre na página da instância, em "Token" ou "Security Token"
            </p>
          </div>

          <Separator />

          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={handleSaveCredentials}
              disabled={!canTest || saving}
              size="sm"
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3.5 w-3.5" />
              )}
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>

            <Button
              onClick={handleTestConnection}
              disabled={!canTest || testing}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              {testing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <RefreshCw className="h-3.5 w-3.5" />
              )}
              {testing ? 'Testando...' : 'Testar Conexão'}
            </Button>

            {isConnected && (
              <Button variant="ghost" size="sm" onClick={handleDisconnect} className="gap-2 text-destructive hover:text-destructive ml-auto">
                <XCircle className="h-3.5 w-3.5" />
                Desconectar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Step 3: Connected */}
      <Card className={`border transition-all ${currentStep === 3 ? 'border-green-500/30 bg-green-500/5 shadow-sm' : 'border-border/50 opacity-60'}`}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
              currentStep === 3 ? 'bg-green-500/20 text-green-600' : 'bg-primary/10 text-primary'
            }`}>
              {currentStep === 3 ? <CheckCircle2 className="h-3.5 w-3.5" /> : '3'}
            </span>
            {currentStep === 3 ? 'WhatsApp conectado!' : 'Tudo pronto'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {currentStep === 3 ? (
            <div className="space-y-3">
              <p className="text-sm text-green-700 dark:text-green-400">
                Seu bot está <strong>ativo no WhatsApp</strong>. Qualquer mensagem recebida será respondida automaticamente pela IA.
              </p>
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  {phoneNumber}
                </span>
                <span className="flex items-center gap-1">
                  <Zap className="h-3 w-3" />
                  Z-API ativa
                </span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Complete os passos acima para ativar o bot no WhatsApp.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Tip */}
      <p className="text-[11px] text-muted-foreground text-center px-4">
        💡 O <strong>Chat Teste</strong> (menu lateral) funciona sem essa integração. 
        A conexão Z-API é necessária apenas para respostas automáticas no WhatsApp real.
      </p>
    </div>
  );
}

function StepIndicator({ step, currentStep, label }: { step: number; currentStep: number; label: string }) {
  const isDone = currentStep > step;
  const isActive = currentStep === step;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
        isDone
          ? 'bg-green-500 text-white'
          : isActive
            ? 'bg-primary text-primary-foreground ring-2 ring-primary/20'
            : 'bg-muted text-muted-foreground'
      }`}>
        {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : step}
      </div>
      <span className={`text-[10px] whitespace-nowrap ${isActive ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
        {label}
      </span>
    </div>
  );
}
