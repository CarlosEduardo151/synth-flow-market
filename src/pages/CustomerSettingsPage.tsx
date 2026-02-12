import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/sonner';
import {
  Shield,
  Lock,
  Bell,
  Mail,
  Smartphone,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  Settings,
  User,
  Fingerprint
} from 'lucide-react';
import { Link } from 'react-router-dom';

const CustomerSettingsPage = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  // Password states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  
  // Notification settings
  const [loginAlerts, setLoginAlerts] = useState(true);
  const [securityAlerts, setSecurityAlerts] = useState(true);
  const [newsEmails, setNewsEmails] = useState(false);

  // 2FA (email OTP) settings
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [loadingMfa, setLoadingMfa] = useState(true);
  const [savingMfa, setSavingMfa] = useState(false);

  // Email change
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  
  // Loading states
  const [sendingReset, setSendingReset] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    const loadMfa = async () => {
      if (!user) return;
      try {
        setLoadingMfa(true);
        const { data, error } = await supabase
          .from('user_mfa_settings')
          .select('is_enabled')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        setMfaEnabled(Boolean(data?.is_enabled));
      } catch (err) {
        console.error('Error loading MFA settings:', err);
        // fallback: disabled
        setMfaEnabled(false);
      } finally {
        setLoadingMfa(false);
      }
    };

    loadMfa();
  }, [user]);

  const handleToggleMfa = async (checked: boolean) => {
    if (!user) return;
    if (savingMfa) return;

    // UX: encourage verified email for email-based 2FA
    if (checked && !user.email_confirmed_at) {
      toast.error('Confirme seu e-mail antes de ativar a verificação em duas etapas.');
      return;
    }

    const prev = mfaEnabled;
    setMfaEnabled(checked);
    setSavingMfa(true);
    try {
      const { error } = await supabase
        .from('user_mfa_settings')
        .upsert(
          {
            user_id: user.id,
            is_enabled: checked,
            method: 'email',
            trusted_device_days: 30,
          },
          { onConflict: 'user_id' }
        );

      if (error) throw error;

      toast.success(checked ? 'Verificação em duas etapas ativada.' : 'Verificação em duas etapas desativada.');
    } catch (err: any) {
      console.error('Error saving MFA settings:', err);
      setMfaEnabled(prev);
      toast.error(err.message || 'Erro ao salvar configuração');
    } finally {
      setSavingMfa(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error('Preencha todos os campos');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast.error('As senhas não coincidem');
      return;
    }
    
    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres');
      return;
    }
    
    setChangingPassword(true);
    
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword
      });
      
      if (error) throw error;
      
      // Send security alert email
      await supabase.functions.invoke('send-welcome-email', {
        body: {
          to: user?.email,
          type: 'security-alert',
          userName: user?.user_metadata?.full_name || user?.email?.split('@')[0],
          alertType: 'Senha Alterada',
          alertDetails: `Sua senha foi alterada em ${new Date().toLocaleString('pt-BR')}. Se você não fez isso, entre em contato conosco imediatamente.`
        }
      });
      
      toast.success('Senha alterada com sucesso!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.message || 'Erro ao alterar senha');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRequestPasswordReset = async () => {
    if (!user?.email) return;
    
    setSendingReset(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/auth?reset=true`
      });
      
      if (error) throw error;
      
      toast.success('Email de redefinição enviado!', {
        description: 'Verifique sua caixa de entrada'
      });
    } catch (error: any) {
      console.error('Error sending reset email:', error);
      toast.error(error.message || 'Erro ao enviar email');
    } finally {
      setSendingReset(false);
    }
  };

  const getPasswordStrength = (password: string) => {
    let strength = 0;
    if (password.length >= 6) strength++;
    if (password.length >= 8) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^A-Za-z0-9]/.test(password)) strength++;
    return strength;
  };

  const passwordStrength = getPasswordStrength(newPassword);

  const handleChangeEmail = async () => {
    if (!user) return;
    const email = newEmail.trim();
    if (!email) {
      toast.error('Informe o novo e-mail');
      return;
    }
    if (email.length > 255 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('E-mail inválido');
      return;
    }

    setChangingEmail(true);
    try {
      const { error } = await supabase.auth.updateUser(
        { email },
        {
          emailRedirectTo: `${window.location.origin}/auth?pendingEmail=${encodeURIComponent(email)}&pendingType=email_change`,
        }
      );
      if (error) throw error;

      toast.success('Confirmação enviada para o novo e-mail', {
        description: 'Você precisa confirmar para continuar acessando a conta.',
      });

      // Enforce confirmation: sign out and send user to auth with pending state.
      await supabase.auth.signOut();
      navigate(`/auth?pendingEmail=${encodeURIComponent(email)}&pendingType=email_change`);
    } catch (err: any) {
      console.error('Error changing email:', err);
      toast.error(err.message || 'Erro ao alterar e-mail');
    } finally {
      setChangingEmail(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link to="/customer" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4 transition-colors">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar ao Painel
          </Link>
          
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 border border-primary/20">
              <Settings className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
              <p className="text-muted-foreground">Gerencie sua conta e preferências de segurança</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Account Info */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  Conta
                </CardTitle>
                <CardDescription>Informações da sua conta</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-muted-foreground text-sm">Email</Label>
                  <p className="text-foreground font-medium">{user.email}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="new-email" className="text-muted-foreground text-sm">Alterar e-mail</Label>
                  <Input
                    id="new-email"
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="novo@email.com"
                  />
                  <Button
                    onClick={handleChangeEmail}
                    disabled={changingEmail || !newEmail.trim()}
                    className="w-full"
                  >
                    {changingEmail ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando confirmação...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Confirmar novo e-mail
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground">
                    Ao alterar, você precisará confirmar no novo e-mail para continuar acessando.
                  </p>
                </div>
                
                <div>
                  <Label className="text-muted-foreground text-sm">Status da Conta</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {user.email_confirmed_at ? (
                      <Badge variant="outline" className="bg-green-500/10 text-green-500 border-green-500/30">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Verificada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-yellow-500/10 text-yellow-500 border-yellow-500/30">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Pendente
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div>
                  <Label className="text-muted-foreground text-sm">Membro desde</Label>
                  <p className="text-foreground">
                    {new Date(user.created_at).toLocaleDateString('pt-BR', {
                      day: '2-digit',
                      month: 'long',
                      year: 'numeric'
                    })}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Center Column - Security */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2 space-y-6"
          >
            {/* Change Password */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5 text-primary" />
                  Alterar Senha
                </CardTitle>
                <CardDescription>Atualize sua senha para manter sua conta segura</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Digite sua nova senha"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((level) => (
                          <div
                            key={level}
                            className={`h-1.5 flex-1 rounded-full transition-colors ${
                              level <= passwordStrength
                                ? passwordStrength <= 2
                                  ? 'bg-red-500'
                                  : passwordStrength <= 3
                                  ? 'bg-yellow-500'
                                  : 'bg-green-500'
                                : 'bg-muted'
                            }`}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {passwordStrength <= 2 ? 'Fraca' : passwordStrength <= 3 ? 'Média' : 'Forte'}
                      </p>
                    </div>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirme sua nova senha"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && newPassword !== confirmPassword && (
                    <p className="text-xs text-red-500">As senhas não coincidem</p>
                  )}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button 
                    onClick={handleChangePassword}
                    disabled={changingPassword || !newPassword || newPassword !== confirmPassword}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {changingPassword ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Alterando...
                      </>
                    ) : (
                      <>
                        <Key className="h-4 w-4 mr-2" />
                        Alterar Senha
                      </>
                    )}
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    onClick={handleRequestPasswordReset}
                    disabled={sendingReset}
                  >
                    {sendingReset ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Mail className="h-4 w-4 mr-2" />
                        Enviar Link por Email
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Two-Factor Authentication */}
            <Card className="border-border/50">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Fingerprint className="h-5 w-5 text-primary" />
                      Autenticação em Duas Etapas
                    </CardTitle>
                    <CardDescription>Adicione uma camada extra de segurança</CardDescription>
                  </div>
                  {loadingMfa ? (
                    <Badge variant="outline" className="bg-muted/40 text-muted-foreground border-border/50">
                      Carregando...
                    </Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className={
                        mfaEnabled
                          ? 'bg-primary/10 text-primary border-primary/30'
                          : 'bg-muted/40 text-muted-foreground border-border/50'
                      }
                    >
                      {mfaEnabled ? 'Ativa' : 'Desativada'}
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-border/50">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium text-foreground">Código por e-mail</p>
                      <p className="text-sm text-muted-foreground">Receba um código de 5 dígitos ao entrar</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {savingMfa && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                    <Switch
                      checked={mfaEnabled}
                      onCheckedChange={handleToggleMfa}
                      disabled={loadingMfa || savingMfa}
                    />
                  </div>
                </div>

                {!user.email_confirmed_at && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Para ativar 2FA por e-mail, primeiro confirme seu e-mail na sua conta.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Notification Preferences */}
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-primary" />
                  Preferências de Notificação
                </CardTitle>
                <CardDescription>Escolha quais emails você deseja receber</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-3">
                    <Shield className="h-5 w-5 text-green-500" />
                    <div>
                      <p className="font-medium text-foreground">Alertas de Login</p>
                      <p className="text-sm text-muted-foreground">Notificações sobre novos logins</p>
                    </div>
                  </div>
                  <Switch 
                    checked={loginAlerts} 
                    onCheckedChange={setLoginAlerts}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-500" />
                    <div>
                      <p className="font-medium text-foreground">Alertas de Segurança</p>
                      <p className="text-sm text-muted-foreground">Atividades suspeitas na conta</p>
                    </div>
                  </div>
                  <Switch 
                    checked={securityAlerts} 
                    onCheckedChange={setSecurityAlerts}
                  />
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/30">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="font-medium text-foreground">Novidades e Promoções</p>
                      <p className="text-sm text-muted-foreground">Receba ofertas e atualizações</p>
                    </div>
                  </div>
                  <Switch 
                    checked={newsEmails} 
                    onCheckedChange={setNewsEmails}
                  />
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default CustomerSettingsPage;
