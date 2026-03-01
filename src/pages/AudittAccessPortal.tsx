import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ScanLine, Lock, Eye, EyeOff, Server, Fingerprint, ChevronLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

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
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState<'credential' | 'scanning' | 'password'>('credential');
  const [docType, setDocType] = useState<'cnpj' | 'cpf'>('cnpj');
  const [docValue, setDocValue] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

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
          className="text-center mb-10"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-2">
            <span className="gradient-text">AUDITT</span>
          </h1>
          <p className="text-sm tracking-[0.25em] uppercase text-muted-foreground font-light">
            Intelligence Logistics
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          <Card className="glass border-border/30 shadow-[var(--shadow-card)]">
            <CardContent className="p-8">
              {/* Shield icon */}
              <div className="flex justify-center mb-6">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Shield className="w-7 h-7 text-primary" />
                </div>
              </div>

              <h2 className="text-center text-lg font-semibold tracking-wide mb-1 text-foreground">
                Acesso Blindado
              </h2>
              <p className="text-center text-sm text-muted-foreground mb-8">
                {step === 'credential'
                  ? 'Identifique-se para iniciar o escaneamento'
                  : step === 'scanning'
                  ? 'Processando credenciais...'
                  : 'Credencial verificada. Insira sua senha.'}
              </p>

              <AnimatePresence mode="wait">
                {/* Step 1: Document input */}
                {step === 'credential' && (
                  <motion.div
                    key="credential"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-5"
                  >
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

                {/* Step 2: Scanning */}
                {step === 'scanning' && (
                  <ScanningOverlay
                    key="scanning"
                    label="Verificando na base Auditt"
                  />
                )}

                {/* Step 3: Password */}
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
                    {/* Verified badge */}
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
                      <Label className="text-xs tracking-wider uppercase text-muted-foreground">
                        E-mail de acesso
                      </Label>
                      <Input
                        type="email"
                        placeholder="operador@oficina.com"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs tracking-wider uppercase text-muted-foreground">
                        Senha Segura
                      </Label>
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
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer */}
        <motion.div
          className="mt-8 text-center space-y-2"
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
