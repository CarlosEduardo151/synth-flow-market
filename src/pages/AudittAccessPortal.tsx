import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ScanLine, Lock, Eye, EyeOff, Fingerprint, ChevronLeft, UserPlus, LogIn, CheckCircle2 } from 'lucide-react';
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

// ─── Scanning Animation ───────────────────────────────────
function ScanningOverlay({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-5 py-16"
    >
      <div className="relative w-20 h-20">
        <motion.div
          className="absolute inset-0 rounded-2xl border-2 border-primary/40"
          animate={{ scale: [1, 1.08, 1], opacity: [0.4, 0.8, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <div className="absolute inset-0 rounded-2xl border border-primary/20" />
        <motion.div
          className="absolute left-1 right-1 h-px bg-primary/60"
          animate={{ top: ['10%', '90%', '10%'] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
        />
        <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-primary/70" />
      </div>
      <div className="text-center space-y-1">
        <motion.p
          className="text-sm font-medium text-foreground"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {label}
        </motion.p>
        <p className="text-xs text-muted-foreground">Aguarde um momento...</p>
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
  const [signupPassword, setSignupPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);

  const sessionId = useMemo(generateSessionId, []);
  const [justLoggedIn, setJustLoggedIn] = useState(false);

  useEffect(() => {
    if (user && justLoggedIn) navigate('/sistema/gestao-frotas-oficinas');
  }, [user, justLoggedIn, navigate]);

  const handleDocSubmit = () => {
    const raw = docValue.replace(/\D/g, '');
    const valid = docType === 'cnpj' ? raw.length === 14 : raw.length === 11;
    if (!valid) {
      toast({ title: 'Documento inválido', description: `Informe um ${docType.toUpperCase()} válido.`, variant: 'destructive' });
      return;
    }
    setStep('scanning');
    setTimeout(() => setStep('password'), 2400);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast({ title: 'Preencha todos os campos', variant: 'destructive' }); return; }
    setLoading(true);
    setJustLoggedIn(true);
    const { error } = await signIn(email, password);
    if (error) { toast({ title: 'Falha na autenticação', description: error.message, variant: 'destructive' }); setJustLoggedIn(false); }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupEmail || !signupPhone || !signupPassword) { toast({ title: 'Preencha todos os campos', variant: 'destructive' }); return; }
    setLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName, signupPhone);
    if (error) { toast({ title: 'Erro no cadastro', description: error.message, variant: 'destructive' }); }
    else { toast({ title: 'Conta criada!', description: 'Verifique seu e-mail para confirmar.' }); setActiveTab('signin'); }
    setLoading(false);
  };

  const benefits = [
    'Pagamentos D+1 garantidos',
    'Auditoria por IA em tempo real',
    'Monitoramento 24/7 da operação',
    'Acesso à maior rede automotiva',
  ];

  return (
    <div className="min-h-screen bg-background">
      <motion.div
        className="w-full min-h-screen grid lg:grid-cols-[1fr_1fr] overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* ══ LEFT — Image + Branding ══ */}
        <div className="hidden lg:flex relative min-h-screen">
          <img
            src={audittWorkshopImg}
            alt="Profissionais utilizando a plataforma Auditt em oficina"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/30" />

          <div className="relative z-10 flex flex-col justify-between p-10 w-full">
            {/* Logo */}
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight text-white">AUDITT</h2>
              <p className="text-[11px] tracking-[0.2em] uppercase text-white/50 mt-0.5">Intelligence Logistics</p>
            </div>

            {/* Bottom content */}
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-white leading-snug">
                  A inteligência que<br />blinda o seu lucro.
                </h3>
                <p className="text-sm text-white/60 mt-2 leading-relaxed max-w-xs">
                  Controle total da operação automotiva com auditoria e pagamentos inteligentes.
                </p>
              </div>

              <ul className="space-y-2.5">
                {benefits.map((b, i) => (
                  <motion.li
                    key={b}
                    className="flex items-center gap-2.5 text-sm text-white/80"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 + i * 0.1 }}
                  >
                    <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                    {b}
                  </motion.li>
                ))}
              </ul>

              {/* Testimonial */}
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <p className="text-sm text-white/70 italic leading-relaxed">
                  "A transparência e velocidade dos pagamentos transformaram nossa operação."
                </p>
                <div className="mt-3 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                    TC
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white/90">ThermoCar</p>
                    <p className="text-[10px] text-white/40">Imperatriz-MA</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ══ RIGHT — Auth Forms ══ */}
        <div className="flex flex-col bg-card">
          {/* Mobile logo */}
          <div className="lg:hidden text-center pt-8 pb-2">
            <h2 className="text-2xl font-extrabold tracking-tight gradient-text">AUDITT</h2>
            <p className="text-[10px] tracking-[0.2em] uppercase text-muted-foreground">Intelligence Logistics</p>
          </div>

          <div className="flex-1 flex flex-col justify-center px-8 md:px-12 py-10">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full max-w-sm mx-auto">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="signin" className="gap-1.5 text-xs">
                  <LogIn className="w-3.5 h-3.5" />
                  Entrar
                </TabsTrigger>
                <TabsTrigger value="signup" className="gap-1.5 text-xs">
                  <UserPlus className="w-3.5 h-3.5" />
                  Cadastrar
                </TabsTrigger>
              </TabsList>

              {/* ── LOGIN TAB ── */}
              <TabsContent value="signin" className="mt-0">
                <AnimatePresence mode="wait">
                  {step === 'credential' && (
                    <motion.div
                      key="cred"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-6"
                    >
                      <div>
                        <h3 className="text-xl font-semibold text-foreground">Acesso seguro</h3>
                        <p className="text-sm text-muted-foreground mt-1">Identifique sua empresa para continuar</p>
                      </div>

                      <div className="flex rounded-lg border border-border overflow-hidden">
                        {(['cnpj', 'cpf'] as const).map(t => (
                          <button
                            key={t}
                            type="button"
                            className={`flex-1 py-2.5 text-xs font-medium tracking-wide uppercase transition-colors ${
                              docType === t
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-muted/40'
                            }`}
                            onClick={() => { setDocType(t); setDocValue(''); }}
                          >
                            {t === 'cnpj' ? 'Oficina (CNPJ)' : 'Gestor (CPF)'}
                          </button>
                        ))}
                      </div>

                      <div className="space-y-2">
                        <Label>{docType === 'cnpj' ? 'CNPJ da Oficina' : 'CPF do Gestor'}</Label>
                        <div className="relative">
                          <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            className="pl-10"
                            placeholder={docType === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
                            value={docValue}
                            onChange={e => setDocValue(docType === 'cnpj' ? formatCNPJ(e.target.value) : formatCPF(e.target.value))}
                            onKeyDown={e => e.key === 'Enter' && handleDocSubmit()}
                          />
                        </div>
                      </div>

                      <Button className="w-full" size="lg" onClick={handleDocSubmit}>
                        <ScanLine className="w-4 h-4 mr-2" />
                        Verificar credenciais
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
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-5"
                    >
                      <div>
                        <h3 className="text-xl font-semibold text-foreground">Autenticar</h3>
                        <p className="text-sm text-muted-foreground mt-1">Credencial verificada com sucesso</p>
                      </div>

                      <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
                        <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-primary">{docType.toUpperCase()} verificado</p>
                          <p className="text-xs text-muted-foreground truncate">{docValue}</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>E-mail</Label>
                        <Input type="email" placeholder="operador@oficina.com" value={email} onChange={e => setEmail(e.target.value)} required />
                      </div>

                      <div className="space-y-2">
                        <Label>Senha</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input className="pl-10 pr-10" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
                          <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowPassword(!showPassword)}>
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <Button className="w-full" size="lg" type="submit" disabled={loading}>
                        {loading ? 'Autenticando...' : 'Entrar'}
                      </Button>

                      <button
                        type="button"
                        className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer pt-1"
                        onClick={() => { setStep('credential'); setPassword(''); setEmail(''); }}
                      >
                        <ChevronLeft className="w-3 h-3" />
                        Voltar
                      </button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </TabsContent>

              {/* ── SIGNUP TAB ── */}
              <TabsContent value="signup" className="mt-0">
                <motion.form
                  onSubmit={handleSignUp}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="space-y-5"
                >
                  <div>
                    <h3 className="text-xl font-semibold text-foreground">Criar conta</h3>
                    <p className="text-sm text-muted-foreground mt-1">Cadastre sua oficina na rede Auditt</p>
                  </div>

                  <div className="space-y-2">
                    <Label>Nome completo</Label>
                    <Input placeholder="João Silva" value={signupName} onChange={e => setSignupName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input type="email" placeholder="seu@email.com" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone / WhatsApp</Label>
                    <Input type="tel" placeholder="(00) 00000-0000" value={signupPhone} onChange={e => setSignupPhone(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input className="pl-10 pr-10" type={showSignupPassword ? 'text' : 'password'} placeholder="Crie uma senha forte" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} required />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" onClick={() => setShowSignupPassword(v => !v)}>
                        {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <Button className="w-full" size="lg" type="submit" disabled={loading}>
                    {loading ? 'Criando conta...' : 'Criar conta'}
                  </Button>
                </motion.form>
              </TabsContent>
            </Tabs>
          </div>

          {/* Footer */}
          <div className="px-8 md:px-12 pb-6 text-center space-y-1">
            <p className="text-[10px] text-muted-foreground/50 font-mono tracking-wider">
              SESSION {sessionId}
            </p>
            <p className="text-[10px] text-muted-foreground/40">
              © 2026 Auditt Tecnologia e Logística LTDA.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
