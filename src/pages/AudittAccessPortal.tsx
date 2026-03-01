import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ScanLine, Lock, Eye, EyeOff, Server, Fingerprint, ChevronLeft, UserPlus, LogIn } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase()
    .replace(/(.{4})/g, '$1-')
    .slice(0, -1);
}

// ─── Scanning Animation ───────────────────────────────────
function ScanningOverlay({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center gap-6 py-12"
    >
      <div className="relative w-24 h-24">
        <div className="absolute inset-0 border-2 border-primary rounded-xl" />
        <motion.div
          className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 text-primary" />
      </div>
      <motion.p
        className="text-sm font-light tracking-[0.2em] uppercase text-primary"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {label}
      </motion.p>
      <div className="flex gap-1.5">
        {[0, 1, 2, 3, 4].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full bg-primary"
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
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

  // Signup fields
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
      toast({
        title: 'Documento inválido',
        description: `Informe um ${docType.toUpperCase()} válido.`,
        variant: 'destructive',
      });
      return;
    }
    setStep('scanning');
    setTimeout(() => setStep('password'), 2800);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setJustLoggedIn(true);
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: 'Falha na autenticação', description: error.message, variant: 'destructive' });
      setJustLoggedIn(false);
    }
    setLoading(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupName || !signupEmail || !signupPhone || !signupPassword) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }
    setLoading(true);
    const { error } = await signUp(signupEmail, signupPassword, signupName, signupPhone);
    if (error) {
      toast({ title: 'Erro no cadastro', description: error.message, variant: 'destructive' });
    } else {
      toast({
        title: 'Conta criada!',
        description: 'Verifique seu e-mail para confirmar o cadastro.',
      });
      setActiveTab('signin');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-tech-lines opacity-30" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[120px]" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] rounded-full bg-accent/5 blur-[100px]" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-1">
            <span className="gradient-text">AUDITT</span>
          </h1>
          <p className="text-xs tracking-[0.25em] uppercase text-muted-foreground font-light">
            Intelligence Logistics
          </p>
        </motion.div>

        {/* Main two-column layout */}
        <motion.div
          className="w-full max-w-5xl glass border border-border/30 shadow-[var(--shadow-card)] rounded-2xl overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <div className="grid lg:grid-cols-2 min-h-[560px]">
            {/* LEFT: Image / Branding side */}
            <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-primary/20 via-background to-accent/10">
              {/* Decorative content */}
              <div className="absolute inset-0 bg-tech-lines opacity-20" />
              <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[400px] h-[400px] rounded-full bg-primary/10 blur-[80px]" />
              
              <div className="relative z-10 flex flex-col justify-between p-10 w-full">
                {/* Top quote */}
                <div>
                  <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6">
                    <Shield className="w-6 h-6 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground mb-3">
                    A inteligência que
                    <br />
                    <span className="gradient-text">blinda o seu lucro.</span>
                  </h2>
                  <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                    Auditoria em tempo real, pagamentos D+1 e controle total da sua operação automotiva com IA de ponta.
                  </p>
                </div>

                {/* Stats */}
                <div className="space-y-4 mt-auto">
                  <div className="flex items-center gap-8">
                    <div>
                      <p className="text-2xl font-bold gradient-text">D+1</p>
                      <p className="text-xs text-muted-foreground">Pagamento</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold gradient-text">100%</p>
                      <p className="text-xs text-muted-foreground">Auditado por IA</p>
                    </div>
                    <div>
                      <p className="text-2xl font-bold gradient-text">24/7</p>
                      <p className="text-xs text-muted-foreground">Monitoramento</p>
                    </div>
                  </div>

                  {/* Testimonial card */}
                  <div className="glass rounded-xl p-4 border border-border/20">
                    <p className="text-sm text-muted-foreground italic leading-relaxed">
                      "Desde que entramos na rede Auditt, a transparência e a velocidade dos pagamentos transformaram nossa oficina."
                    </p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        TC
                      </div>
                      <div>
                        <p className="text-xs font-medium text-foreground">ThermoCar</p>
                        <p className="text-[10px] text-muted-foreground">Imperatriz-MA</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT: Auth forms */}
            <div className="flex flex-col justify-center p-8 md:p-10">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="signin" className="gap-2">
                    <LogIn className="w-4 h-4" />
                    Entrar
                  </TabsTrigger>
                  <TabsTrigger value="signup" className="gap-2">
                    <UserPlus className="w-4 h-4" />
                    Cadastrar
                  </TabsTrigger>
                </TabsList>

                {/* ── LOGIN TAB ── */}
                <TabsContent value="signin">
                  <AnimatePresence mode="wait">
                    {step === 'credential' && (
                      <motion.div
                        key="credential"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-5"
                      >
                        <div className="text-center mb-2">
                          <h2 className="text-lg font-semibold text-foreground">Acesso Blindado</h2>
                          <p className="text-sm text-muted-foreground">Identifique-se para iniciar</p>
                        </div>

                        {/* Toggle CNPJ / CPF */}
                        <div className="flex justify-center">
                          <div className="inline-flex rounded-lg border border-border overflow-hidden">
                            <button
                              type="button"
                              className={`px-5 py-2 text-xs font-semibold tracking-wider uppercase transition-colors ${
                                docType === 'cnpj'
                                  ? 'bg-primary/15 text-primary border-r border-border'
                                  : 'bg-transparent text-muted-foreground border-r border-border hover:bg-muted/50'
                              }`}
                              onClick={() => { setDocType('cnpj'); setDocValue(''); }}
                            >
                              Oficina (CNPJ)
                            </button>
                            <button
                              type="button"
                              className={`px-5 py-2 text-xs font-semibold tracking-wider uppercase transition-colors ${
                                docType === 'cpf'
                                  ? 'bg-primary/15 text-primary'
                                  : 'bg-transparent text-muted-foreground hover:bg-muted/50'
                              }`}
                              onClick={() => { setDocType('cpf'); setDocValue(''); }}
                            >
                              Gestor (CPF)
                            </button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs tracking-wider uppercase text-muted-foreground">
                            {docType === 'cnpj' ? 'CNPJ da Oficina' : 'CPF do Gestor'}
                          </Label>
                          <div className="relative">
                            <Fingerprint className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              className="pl-10"
                              placeholder={docType === 'cnpj' ? '00.000.000/0000-00' : '000.000.000-00'}
                              value={docValue}
                              onChange={e => {
                                const formatted = docType === 'cnpj' ? formatCNPJ(e.target.value) : formatCPF(e.target.value);
                                setDocValue(formatted);
                              }}
                              onKeyDown={e => e.key === 'Enter' && handleDocSubmit()}
                            />
                          </div>
                        </div>

                        <Button className="w-full" onClick={handleDocSubmit}>
                          <ScanLine className="w-4 h-4 mr-2" />
                          Escanear Credenciais
                        </Button>
                      </motion.div>
                    )}

                    {step === 'scanning' && (
                      <ScanningOverlay key="scanning" label="Verificando na base Auditt" />
                    )}

                    {step === 'password' && (
                      <motion.form
                        key="password"
                        onSubmit={handleLogin}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                        className="space-y-5"
                      >
                        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/15">
                          <Shield className="w-5 h-5 flex-shrink-0 text-primary" />
                          <div>
                            <p className="text-xs font-semibold text-primary">
                              {docType === 'cnpj' ? 'CNPJ' : 'CPF'} Verificado
                            </p>
                            <p className="text-xs text-muted-foreground">{docValue}</p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs tracking-wider uppercase text-muted-foreground">E-mail de acesso</Label>
                          <Input
                            type="email"
                            placeholder="operador@oficina.com"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs tracking-wider uppercase text-muted-foreground">Senha</Label>
                          <div className="relative">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              className="pl-10 pr-10"
                              type={showPassword ? 'text' : 'password'}
                              placeholder="••••••••"
                              value={password}
                              onChange={e => setPassword(e.target.value)}
                              required
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>

                        <Button className="w-full" type="submit" disabled={loading}>
                          {loading ? (
                            <>
                              <motion.div
                                className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full mr-2"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              />
                              Autenticando...
                            </>
                          ) : (
                            <>
                              <Lock className="w-4 h-4 mr-2" />
                              Autenticar
                            </>
                          )}
                        </Button>

                        <button
                          type="button"
                          className="w-full flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors bg-transparent border-none cursor-pointer"
                          onClick={() => { setStep('credential'); setPassword(''); setEmail(''); }}
                        >
                          <ChevronLeft className="w-3 h-3" />
                          Voltar ao escaneamento
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
                </TabsContent>

                {/* ── SIGNUP TAB ── */}
                <TabsContent value="signup">
                  <motion.form
                    onSubmit={handleSignUp}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-4"
                  >
                    <div className="text-center mb-2">
                      <h2 className="text-lg font-semibold text-foreground">Criar Conta</h2>
                      <p className="text-sm text-muted-foreground">Cadastre sua oficina na rede Auditt</p>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs tracking-wider uppercase text-muted-foreground">Nome completo</Label>
                      <Input
                        placeholder="João Silva"
                        value={signupName}
                        onChange={e => setSignupName(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs tracking-wider uppercase text-muted-foreground">E-mail</Label>
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        value={signupEmail}
                        onChange={e => setSignupEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs tracking-wider uppercase text-muted-foreground">Telefone / WhatsApp</Label>
                      <Input
                        type="tel"
                        placeholder="(00) 00000-0000"
                        value={signupPhone}
                        onChange={e => setSignupPhone(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs tracking-wider uppercase text-muted-foreground">Senha</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          className="pl-10 pr-10"
                          type={showSignupPassword ? 'text' : 'password'}
                          placeholder="Crie uma senha forte"
                          value={signupPassword}
                          onChange={e => setSignupPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                        >
                          {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <Button className="w-full" type="submit" disabled={loading}>
                      {loading ? 'Criando conta...' : 'Criar conta'}
                    </Button>
                  </motion.form>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </motion.div>

        {/* Footer */}
        <motion.div
          className="mt-6 text-center space-y-1.5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 0.6 }}
        >
          <div className="flex items-center justify-center gap-2">
            <Server className="w-3 h-3 text-green-500" />
            <span className="text-xs tracking-wider text-muted-foreground">
              Imperatriz-MA — <span className="text-green-500">Operational</span>
            </span>
          </div>
          <p className="text-[10px] tracking-wider text-muted-foreground/60 font-mono">
            SESSION {sessionId}
          </p>
          <p className="text-[10px] tracking-wider text-muted-foreground/40">
            © 2026 Auditt Tecnologia e Logística LTDA.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
