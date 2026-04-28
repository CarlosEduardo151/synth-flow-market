import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Shield, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Props {
  customerProductId: string;
  children: React.ReactNode;
}

// Persist 2FA verification for 12 hours across reloads / new sessions
const VERIFY_TTL_MS = 12 * 60 * 60 * 1000;
const STORAGE_KEY = (cpid: string) => `fin2fa_ok_${cpid}`;

// Temporary email-based bypass (no 2FA prompt while active)
const BYPASS_EMAILS: Record<string, number> = {
  // wenio.ar@outlook.com — valid until 2026-04-28T04:03:46Z (2h window)
  'wenio.ar@outlook.com': Date.parse('2026-04-28T04:03:46Z'),
};

function isVerifiedFresh(cpid: string): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY(cpid));
    if (!raw) return false;
    const ts = parseInt(raw, 10);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < VERIFY_TTL_MS;
  } catch {
    return false;
  }
}

function markVerified(cpid: string) {
  try {
    localStorage.setItem(STORAGE_KEY(cpid), String(Date.now()));
  } catch {}
}

export function Financial2FAGate({ customerProductId, children }: Props) {
  const [checking, setChecking] = useState(true);
  const [required, setRequired] = useState(false);
  const [verified, setVerified] = useState(false);
  const [code, setCode] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const init = async () => {
      try {
        const { data } = await (supabase
          .from('financial_agent_security' as any)
          .select('require_2fa')
          .eq('customer_product_id', customerProductId)
          .maybeSingle() as any);

        const needs = Boolean(data?.require_2fa);
        setRequired(needs);

        if (!needs) {
          setVerified(true);
        } else {
          const ok = sessionStorage.getItem(SESSION_KEY(customerProductId));
          if (ok === '1') setVerified(true);
        }
      } catch (e) {
        // sem config = sem 2fa
        setVerified(true);
      } finally {
        setChecking(false);
      }
    };
    init();
  }, [customerProductId]);

  const sendCode = async () => {
    setSending(true);
    try {
      const { error } = await supabase.functions.invoke('mfa-send-email-otp', { body: {} });
      if (error) throw error;
      setSent(true);
      toast({ title: 'Código enviado', description: 'Verifique seu e-mail (válido por 10 minutos).' });
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('MFA not enabled')) {
        toast({
          title: '2FA não configurado na conta',
          description: 'Ative o 2FA por e-mail no seu perfil para usar este recurso.',
          variant: 'destructive',
        });
      } else {
        toast({ title: 'Erro ao enviar código', description: msg, variant: 'destructive' });
      }
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async () => {
    if (!/^\d{5}$/.test(code)) {
      toast({ title: 'Código inválido', description: 'Digite os 5 dígitos.', variant: 'destructive' });
      return;
    }
    setVerifying(true);
    try {
      const { data, error } = await supabase.functions.invoke('mfa-verify-email-otp', {
        body: { code },
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error('Código inválido');
      sessionStorage.setItem(SESSION_KEY(customerProductId), '1');
      setVerified(true);
      toast({ title: 'Acesso liberado' });
    } catch (e: any) {
      toast({ title: 'Verificação falhou', description: e.message, variant: 'destructive' });
    } finally {
      setVerifying(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!required || verified) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 space-y-6 bg-card/80 backdrop-blur border-emerald-500/20">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center">
            <Shield className="h-7 w-7 text-emerald-500" />
          </div>
          <h2 className="text-2xl font-bold">Verificação em 2 etapas</h2>
          <p className="text-sm text-muted-foreground">
            Este Agente Financeiro está protegido. Confirme sua identidade com o código enviado por e-mail.
          </p>
        </div>

        {!sent ? (
          <Button onClick={sendCode} disabled={sending} className="w-full" size="lg">
            {sending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
            Enviar código por e-mail
          </Button>
        ) : (
          <div className="space-y-3">
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="00000"
              className="text-center text-2xl tracking-[0.6em] font-mono h-14"
              maxLength={5}
              inputMode="numeric"
              autoFocus
            />
            <Button onClick={verifyCode} disabled={verifying || code.length !== 5} className="w-full" size="lg">
              {verifying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Verificar e entrar
            </Button>
            <Button variant="ghost" size="sm" onClick={sendCode} disabled={sending} className="w-full">
              Reenviar código
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}
