import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ScanLine, Lock, Eye, EyeOff, Fingerprint, ChevronLeft, UserPlus, LogIn, CheckCircle2, ArrowRight, Building2, User, Phone, Mail } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import audittWorkshopImg from '@/assets/auditt-workshop.jpg';

// ─── Helpers ──────────────────────────────────────────────
function formatCNPJ(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

function formatCPF(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11);
  return d
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

function generateSessionId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(8)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

// ─── Password Strength ───────────────────────────────────
function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
  if (!pw) return { level: 0, label: '', color: '' };
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { level: 1, label: 'Fraca', color: 'bg-red-500' };
  if (score <= 2) return { level: 2, label: 'Razoável', color: 'bg-orange-500' };
  if (score <= 3) return { level: 3, label: 'Boa', color: 'bg-yellow-500' };
  if (score <= 4) return { level: 4, label: 'Forte', color: 'bg-emerald-500' };
  return { level: 5, label: 'Muito forte', color: 'bg-emerald-400' };
}

// ─── Scanning Animation ───────────────────────────────────
function ScanningOverlay({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-6 py-20"
    >
      <div className="relative w-16 h-16">
        <motion.div
          className="absolute inset-0 rounded-full border border-primary/30"
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0, 0.3] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.div
          className="absolute inset-0 rounded-full border border-primary/20"
          animate={{ scale: [1, 1.6, 1], opacity: [0.2, 0, 0.2] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.3 }}
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          >
            <ScanLine className="w-6 h-6 text-primary" />
          </motion.div>
        </div>
      </div>
      <div className="text-center space-y-1.5">
        <motion.p
          className="text-sm font-medium text-foreground tracking-wide"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {label}
        </motion.p>
        <p className="text-xs text-muted-foreground">Processando verificação segura...</p>
      </div>
    </motion.div>
  );
}

// ─── Main Portal ──────────────────────────────────────────
export default function AudittAccessPortal() {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<'credential' | 'scanning' | 'password'>('credential');
  const [docType, setDocType] = useState<'cnpj' | 'cpf'>('cnpj');
  const [docValue, setDocValue] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [activeTab, setActiveTab] = useState('signin');

  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupCnpj, setSignupCnpj] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const passwordStrength = getPasswordStrength(signupPassword);

  const sessionId = useMemo(generateSessionId, []);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  useEffect(() => {
    if (user && justLoggedIn) navigate('/sistema/gestao-frotas-oficinas');
  }, [user, justLoggedIn, navigate]);

  const handleDocSubmit = async () => {
    const raw = docValue.replace(/\D/g, '');
    const valid = docType === 'cnpj' ? raw.length === 14 : raw.length === 11;
    if (!valid) {
      toast({ title: 'Documento inválido', description: `Informe um ${docType.toUpperCase()} válido.`, variant: 'destructive' });
      return;
    }
    setStep('scanning');

    // Look up email from CNPJ/CPF in the database
    try {
      if (docType === 'cnpj') {
        const { data } = await supabase
          .from('fleet_partner_workshops')
          .select('user_id')
          .eq('cnpj', raw)
          .limit(1)
          .maybeSingle();

        if (data?.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email')
            .eq('user_id', data.user_id)
            .maybeSingle();
          if (profile?.email) setEmail(profile.email);
        }
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('email')
          .eq('cpf', raw)
          .maybeSingle();
        if (profile?.email) setEmail(profile.email);
      }
    } catch (_) { /* continue even if lookup fails */ }

    setTimeout(() => setStep('password'), 2400);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast({ title: 'Preencha a senha', variant: 'destructive' }); return; }
    setLoading(true);
    setJustLoggedIn(true);
    const { error } = await signIn(email, password);
    if (error) { toast({ title: 'Falha na autenticação', description: error.message, variant: 'destructive' }); setJustLoggedIn(false); }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupEmail || !signupPhone || !signupCnpj || !signupPassword) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' }); return;
    }
    if (signupPassword !== signupConfirmPassword) {
      toast({ title: 'As senhas não coincidem', variant: 'destructive' }); return;
    }
    if (passwordStrength.level < 2) {
      toast({ title: 'Senha muito fraca', description: 'Use letras maiúsculas, números e caracteres especiais.', variant: 'destructive' }); return;
    }
    setLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName, signupPhone);
    if (error) { toast({ title: 'Erro no cadastro', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Conta criada!', description: 'Verifique seu e-mail para confirmar.' }); setActiveTab('signin'); }
    setLoading(false);
  };

  const stats = [
    { value: 'D+1', label: 'Pagamentos' },
    { value: '100%', label: 'Auditoria IA' },
    { value: '24/7', label: 'Monitoramento' },
  ];

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      {/* ══ LEFT — Hero Image ══ */}
      <div className="hidden lg:block relative overflow-hidden bg-black">
        <img
          src={audittWorkshopImg}
          alt="Profissionais utilizando a plataforma Auditt"
          className="absolute inset-0 w-full h-full object-cover opacity-60"
        />
        
        {/* Gradient overlays */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

        <div className="relative z-10 flex flex-col justify-between h-full p-12 xl:p-16">
          {/* Top — Logo */}
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight text-white">AUDITT</h2>
                <p className="text-[10px] tracking-[0.25em] uppercase text-white/40 -mt-0.5">Intelligence Logistics</p>
              </div>
            </div>
          </div>

          {/* Bottom — Content */}
          <div className="space-y-8">
            {/* Stats row */}
            <div className="flex gap-8">
              {stats.map((s) => (
                <div key={s.label}>
                  <p className="text-2xl xl:text-3xl font-bold text-white">{s.value}</p>
                  <p className="text-xs text-white/50 mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Headline */}
            <div>
              <h1 className="text-3xl xl:text-4xl font-bold text-white leading-tight">
                A inteligência que
                <br />
                <span className="text-primary">blinda o seu lucro.</span>
              </h1>
              <p className="text-sm text-white/50 mt-3 max-w-md leading-relaxed">
                Controle total da operação automotiva com auditoria por IA, 
                gestão de frotas e pagamentos inteligentes D+1.
              </p>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-2 gap-3">
              {[
                'Pagamentos D+1 garantidos',
                'Auditoria por IA em tempo real',
                'Monitoramento 24/7',
                'Maior rede automotiva',
              ].map((b, i) => (
                <motion.div
                  key={b}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.08 }}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                  <span className="text-xs text-white/70">{b}</span>
                </motion.div>
              ))}
            </div>

            {/* Testimonial */}
            <div className="bg-white/[0.04] backdrop-blur-sm rounded-xl p-5 border border-white/[0.06]">
              <p className="text-sm text-white/60 italic leading-relaxed">
                "A transparência e velocidade dos pagamentos transformaram completamente nossa operação."
              </p>
              <div className="mt-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-xs font-semibold text-primary">
                  TC
                </div>
                <div>
                  <p className="text-sm font-medium text-white/80">ThermoCar</p>
                  <p className="text-[11px] text-white/30">Imperatriz — MA</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ RIGHT — Auth Forms ══ */}
      <div className="flex flex-col bg-background min-h-screen">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-2.5 px-6 pt-8 pb-4">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold tracking-tight text-foreground">AUDITT</h2>
            <p className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground -mt-0.5">Intelligence Logistics</p>
          </div>
        </div>

        {/* Auth container */}
        <div className="flex-1 flex flex-col justify-center px-6 sm:px-10 md:px-16 lg:px-12 xl:px-20">
          <div className="w-full max-w-[420px] mx-auto">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-10 h-11 bg-muted/50">
                <TabsTrigger value="signin" className="gap-2 text-sm font-medium data-[state=active]:shadow-sm">
                  <LogIn className="w-4 h-4" />
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="signup" className="gap-2 text-sm font-medium data-[state=active]:shadow-sm">
                  <UserPlus className="w-4 h-4" />
                  Cadastrar
                </TabsTrigger>
              </TabsList>

              {/* ── LOGIN TAB ── */}
              <TabsContent value="signin" className="mt-0">
                <AnimatePresence mode="wait">
                  {step === 'credential' && (
                    <motion.div
                      key="cred"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-7"
                    >
                      <div>
                        <h3 className="text-2xl font-bold text-foreground tracking-tight">Acesso seguro</h3>
                        <p className="text-sm text-muted-foreground mt-1.5">Identifique sua empresa para continuar</p>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {(['cnpj', 'cpf'] as const).map(t => (
                          <button
                            key={t}
                            type="button"
                            className={`py-3 rounded-lg text-sm font-medium transition-all duration-200 border ${
                              docType === t
                                ? 'bg-primary/10 text-primary border-primary/20'
                                : 'bg-transparent text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground'
                            }`}
                            onClick={() => { setDocType(t); setDocValue(''); }}
                          >
                            {t === 'cnpj' ? 'Oficina (CNPJ)' : 'Gestor (CPF)'}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-2.5">
                        <Label className="text-sm font-medium">{docType === 'cnpj' ? 'CNPJ da Oficina' : 'CPF do Gestor'}</Label>
                        <div className="relative">
                          <Fingerprint className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            className="pl-11 h-12 text-sm bg-muted/30 border-border/60 focus:bg-background transition-colors"
                            placeholder={docType === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
                            value={docValue}
                            onChange={e => setDocValue(docType === 'cnpj' ? formatCNPJ(e.target.value) : formatCPF(e.target.value))}
                            onKeyDown={e => e.key === 'Enter' && handleDocSubmit()}
                          />
                        </div>
                      </div>

                      <Button className="w-full h-12 text-sm font-semibold" onClick={handleDocSubmit}>
                        Verificar credenciais
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </motion.div>
                  )}

                  {step === 'scanning' && (
                    <ScanningOverlay key="scan" label="Verificando na base Auditt" />
                  )}

                  {step === 'password' && (
                    <motion.form
                      key="pass"
                      onSubmit={handleLogin}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-6"
                    >
                      <div>
                        <h3 className="text-2xl font-bold text-foreground tracking-tight">Autenticar</h3>
                        <p className="text-sm text-muted-foreground mt-1.5">Credencial verificada com sucesso</p>
                      </div>

                      <div className="flex items-center gap-3 p-3.5 rounded-lg bg-primary/5 border border-primary/10">
                        <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-primary">{docType.toUpperCase()} verificado</p>
                          <p className="text-xs text-muted-foreground truncate">{docValue}</p>
                        </div>
                      </div>




                      <div className="space-y-2.5">
                        <Label className="text-sm font-medium">Senha</Label>
                        <div className="relative">
                          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            className="pl-11 pr-11 h-12 text-sm bg-muted/30 border-border/60 focus:bg-background transition-colors"
                            type={showPassword ? 'text' : 'password'}
                            placeholder="••••••••"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            required
                          />
                          <button type="button" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <Button className="w-full h-12 text-sm font-semibold" type="submit" disabled={loading}>
                        {loading ? 'Autenticando...' : 'Entrar'}
                      </Button>

                      <button
                        type="button"
                        className="w-full flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer pt-1"
                        onClick={() => { setStep('credential'); setPassword(''); setEmail(''); }}
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Voltar à verificação
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </TabsContent>

              {/* ── SIGNUP TAB ── */}
              <TabsContent value="signup" className="mt-0">
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-7"
                >
                  <div>
                    <h3 className="text-2xl font-bold text-foreground tracking-tight">Criar conta</h3>
                    <p className="text-sm text-muted-foreground mt-1.5">Cadastre sua oficina ou frota na rede Auditt</p>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Para criar sua conta, você será direcionado ao nosso processo de cadastro completo, onde poderá registrar sua <strong className="text-foreground">oficina</strong> ou <strong className="text-foreground">frota</strong> com segurança.
                  </p>

                  <div className="grid grid-cols-2 gap-4">
                    <button
                      type="button"
                      onClick={() => navigate('/sistema/gestao-frotas-oficinas/onboarding?tipo=oficina')}
                      className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group cursor-pointer bg-transparent"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-foreground">Oficina</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Cadastrar minha oficina</p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate('/sistema/gestao-frotas-oficinas/onboarding?tipo=frota')}
                      className="flex flex-col items-center gap-3 p-6 rounded-xl border border-border hover:border-primary/30 hover:bg-primary/5 transition-all duration-200 group cursor-pointer bg-transparent"
                    >
                      <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                        <User className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-center">
                        <p className="text-sm font-semibold text-foreground">Gestor de Frota</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Cadastrar minha frota</p>
                      </div>
                    </button>
                  </div>

                  <div className="flex items-center gap-2 p-3.5 rounded-lg bg-primary/5 border border-primary/10">
                    <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                    <p className="text-xs text-muted-foreground">Processo seguro com verificação de documentos e aprovação administrativa.</p>
                  </div>
                </motion.div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 sm:px-10 md:px-16 lg:px-12 xl:px-20 pb-8 pt-4">
          <div className="w-full max-w-[420px] mx-auto flex items-center justify-between">
            <p className="text-[10px] text-muted-foreground/40 font-mono tracking-wider">
              SESSION {sessionId}
            </p>
            <p className="text-[10px] text-muted-foreground/30">
              © 2026 Auditt Tecnologia
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
