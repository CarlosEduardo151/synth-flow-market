import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { supabase } from '@/integrations/supabase/client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Checkbox } from '@/components/ui/checkbox';

export default function AuthPage() {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [pendingType, setPendingType] = useState<'signup' | 'email_change'>('signup');
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const pEmail = params.get('pendingEmail');
    const pType = params.get('pendingType');
    if (pEmail) {
      setPendingEmail(pEmail);
      setPendingType(pType === 'email_change' ? 'email_change' : 'signup');
    }
  }, [location.search]);

  const getDeviceFingerprint = () => {
    try {
      const key = 'starai_device_fingerprint_v1';
      let fp = localStorage.getItem(key);
      if (!fp) {
        fp = crypto.randomUUID();
        localStorage.setItem(key, fp);
      }
      return fp;
    } catch {
      return '';
    }
  };

  const checkIfMfaNeeded = async () => {
    if (!user) return false;
    try {
      // enabled?
      const { data: settings, error: sErr } = await supabase
        .from('user_mfa_settings')
        .select('is_enabled')
        .eq('user_id', user.id)
        .maybeSingle();
      if (sErr) throw sErr;
      if (!settings?.is_enabled) return false;

      // trusted device?
      const fp = getDeviceFingerprint();
      if (!fp) return true;
      const { data: trusted, error: tErr } = await supabase
        .from('mfa_trusted_devices')
        .select('id')
        .eq('user_id', user.id)
        .eq('device_fingerprint', fp)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
      if (tErr) throw tErr;
      return !trusted?.id;
    } catch (err) {
      console.error('Error checking MFA requirement:', err);
      // safest: require MFA if unsure
      return true;
    }
  };

  const startMfaFlow = async () => {
    if (!user) return;
    try {
      setOtp('');
      setOtpLoading(true);
      await supabase.functions.invoke('mfa-send-email-otp', {
        body: { deviceFingerprint: getDeviceFingerprint() },
      });
      setMfaRequired(true);
      toast({
        title: 'Código enviado',
        description: 'Enviamos um código de 5 dígitos para o seu e-mail.',
      });
    } catch (err: any) {
      console.error('Error starting MFA flow:', err);
      toast({
        title: 'Erro ao enviar código',
        description: err.message || 'Tente novamente em instantes.',
        variant: 'destructive',
      });
      // If we can't send code, we do not allow access silently.
      setMfaRequired(true);
    } finally {
      setOtpLoading(false);
    }
  };

  useEffect(() => {
    const run = async () => {
      if (!user) return;

      // Require email confirmation before allowing access (or 2FA).
      if (!user.email_confirmed_at) {
        setMfaRequired(false);
        setPendingEmail(user.email ?? null);
        setPendingType('signup');
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
        }
        return;
      }

      const needed = await checkIfMfaNeeded();
      if (needed) {
        await startMfaFlow();
        return;
      }
      navigate('/');
    };

    run();
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const { error } = await signIn(email, password);

    if (error) {
      const msg = String(error.message || '').toLowerCase();
      const needsConfirm = msg.includes('email') && (msg.includes('confirm') || msg.includes('confirmed') || msg.includes('not confirmed'));
      if (needsConfirm) {
        setPendingEmail(email);
        setPendingType('signup');
      }
      toast({
        title: "Erro no login",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta!",
      });
      // navigation will be handled by the user effect above (it will require 2FA if enabled)
    }

    setLoading(false);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp || otp.length !== 5) {
      toast({
        title: 'Código inválido',
        description: 'Digite os 5 dígitos.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setOtpLoading(true);
      const { data, error } = await supabase.functions.invoke('mfa-verify-email-otp', {
        body: {
          code: otp,
          rememberDevice,
          deviceFingerprint: getDeviceFingerprint(),
        },
      });
      if (error) throw error;
      if (!data?.ok) throw new Error('Não foi possível validar o código.');

      toast({
        title: 'Tudo certo!',
        description: 'Verificação concluída. Bem-vindo(a)!',
      });
      setMfaRequired(false);
      navigate('/');
    } catch (err: any) {
      console.error('Error verifying OTP:', err);
      toast({
        title: 'Código incorreto/expirado',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!user) return;
    await startMfaFlow();
  };

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = formData.get('fullName') as string;
    const phone = (formData.get('phone') as string) || '';
    const birthDate = formData.get('birthDate') as string;
    const cpf = formData.get('cpf') as string;

    if (!phone.trim()) {
      toast({
        title: 'Telefone obrigatório',
        description: 'Informe seu WhatsApp/telefone para criar a conta.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const { error } = await signUp(email, password, fullName, phone, birthDate, cpf);

    if (error) {
      toast({
        title: "Erro no cadastro",
        description: error.message,
        variant: "destructive",
      });
    } else {
      // Require email confirmation before access.
      setPendingEmail(email);
      setPendingType('signup');
      try {
        await supabase.auth.signOut();
      } catch {
        // ignore
      }
      toast({
        title: 'Confirme seu e-mail',
        description: 'Enviamos um link de confirmação. Você precisa confirmar para acessar a conta.',
      });
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>{mfaRequired ? 'Verificação em duas etapas' : 'Acesse sua conta'}</CardTitle>
              <CardDescription>
                {mfaRequired
                  ? 'Digite o código de 5 dígitos enviado para seu e-mail'
                  : pendingEmail
                    ? 'Confirme seu e-mail para continuar'
                    : 'Entre ou crie uma conta para finalizar suas compras'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mfaRequired ? (
                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Código (5 dígitos)</Label>
                    <div className="flex justify-center">
                      <InputOTP maxLength={5} value={otp} onChange={setOtp}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={rememberDevice}
                      onCheckedChange={(v) => setRememberDevice(Boolean(v))}
                      id="remember-device"
                    />
                    <Label htmlFor="remember-device" className="text-sm text-muted-foreground">
                      Confiar neste dispositivo
                    </Label>
                  </div>

                  <Button type="submit" className="w-full" disabled={otpLoading}>
                    {otpLoading ? 'Verificando...' : 'Confirmar e entrar'}
                  </Button>

                  <Button type="button" variant="outline" className="w-full" onClick={handleResendOtp} disabled={otpLoading}>
                    Reenviar código
                  </Button>
                </form>
              ) : pendingEmail ? (
                <div className="space-y-4">
                  <div className="rounded-lg border border-border bg-muted/30 p-4">
                    <p className="text-sm text-foreground">
                      Enviamos um e-mail de confirmação para <span className="font-medium">{pendingEmail}</span>. Clique no botão do e-mail
                      para confirmar e então volte aqui para entrar.
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">Dica: verifique Spam/Promoções.</p>
                  </div>

                  <Button
                    type="button"
                    className="w-full"
                    disabled={resendLoading}
                    onClick={async () => {
                      if (!pendingEmail) return;
                      try {
                        setResendLoading(true);
                        const { error } = await supabase.auth.resend({
                          type: pendingType,
                          email: pendingEmail,
                        });
                        if (error) throw error;
                        toast({
                          title: 'E-mail reenviado',
                          description: 'Enviamos um novo link de confirmação.',
                        });
                      } catch (err: any) {
                        toast({
                          title: 'Não foi possível reenviar',
                          description: err.message || 'Tente novamente em instantes.',
                          variant: 'destructive',
                        });
                      } finally {
                        setResendLoading(false);
                      }
                    }}
                  >
                    {resendLoading ? 'Reenviando...' : 'Reenviar e-mail de confirmação'}
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setPendingEmail(null);
                      setPendingType('signup');
                      // remove params if present
                      if (location.search) navigate('/auth', { replace: true });
                    }}
                  >
                    Voltar ao login
                  </Button>
                </div>
              ) : (
                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Entrar</TabsTrigger>
                    <TabsTrigger value="signup">Cadastrar</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="signin" className="space-y-4">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div>
                        <Label htmlFor="signin-email">Email</Label>
                        <Input 
                          id="signin-email" 
                          name="email" 
                          type="email" 
                          required 
                          placeholder="seu@email.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="signin-password">Senha</Label>
                        <Input 
                          id="signin-password" 
                          name="password" 
                          type="password" 
                          required 
                          placeholder="Sua senha"
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Entrando...' : 'Entrar'}
                      </Button>
                    </form>
                  </TabsContent>
                  
                  <TabsContent value="signup" className="space-y-4">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div>
                        <Label htmlFor="signup-name">Nome completo</Label>
                        <Input 
                          id="signup-name" 
                          name="fullName" 
                          type="text" 
                          required 
                          placeholder="João Silva"
                        />
                      </div>
                      <div>
                        <Label htmlFor="signup-email">Email</Label>
                        <Input 
                          id="signup-email" 
                          name="email" 
                          type="email" 
                          required 
                          placeholder="seu@email.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="signup-phone">Telefone</Label>
                        <Input 
                          id="signup-phone" 
                          name="phone" 
                          type="tel" 
                          required
                          placeholder="(00) 00000-0000"
                        />
                      </div>
                      <div>
                        <Label htmlFor="signup-birthdate">Data de Nascimento</Label>
                        <Input 
                          id="signup-birthdate" 
                          name="birthDate" 
                          type="date" 
                        />
                      </div>
                      <div>
                        <Label htmlFor="signup-cpf">CPF</Label>
                        <Input 
                          id="signup-cpf" 
                          name="cpf" 
                          type="text" 
                          placeholder="000.000.000-00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="signup-password">Senha</Label>
                        <Input 
                          id="signup-password" 
                          name="password" 
                          type="password" 
                          required 
                          placeholder="Crie uma senha forte"
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Criando conta...' : 'Criar conta'}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}