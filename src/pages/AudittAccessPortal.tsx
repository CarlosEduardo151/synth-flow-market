import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ScanLine, Lock, Eye, EyeOff, Server, Fingerprint } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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

// ─── Mesh Gradient Background ─────────────────────────────
function MeshBackground() {
  return (
    <div className="fixed inset-0 overflow-hidden" style={{ background: '#00203F' }}>
      {/* Animated radial blobs */}
      <div
        className="absolute w-[800px] h-[800px] rounded-full opacity-30"
        style={{
          background: 'radial-gradient(circle, #004E92 0%, transparent 70%)',
          top: '-10%',
          right: '-10%',
          animation: 'meshFloat1 18s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full opacity-20"
        style={{
          background: 'radial-gradient(circle, #004E92 0%, transparent 70%)',
          bottom: '-15%',
          left: '-5%',
          animation: 'meshFloat2 22s ease-in-out infinite',
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full opacity-15"
        style={{
          background: 'radial-gradient(circle, #D4AF37 0%, transparent 70%)',
          top: '40%',
          left: '50%',
          animation: 'meshFloat3 25s ease-in-out infinite',
        }}
      />
      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(212,175,55,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(212,175,55,0.3) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  );
}

// ─── Scanning Animation ───────────────────────────────────
function ScanningOverlay({ label }: { label: string }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4"
      style={{
        background: 'rgba(0, 32, 63, 0.92)',
        backdropFilter: 'blur(20px)',
        borderRadius: 'inherit',
      }}
    >
      {/* Scan line */}
      <div className="relative w-32 h-32">
        <div
          className="absolute inset-0 border-2 rounded-lg"
          style={{ borderColor: '#D4AF37' }}
        />
        <motion.div
          className="absolute left-0 right-0 h-0.5"
          style={{ background: 'linear-gradient(90deg, transparent, #D4AF37, transparent)' }}
          animate={{ top: ['0%', '100%', '0%'] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
        <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12" style={{ color: '#D4AF37' }} />
      </div>
      <motion.p
        className="text-sm font-light tracking-[0.3em] uppercase"
        style={{ color: '#D4AF37' }}
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        {label}
      </motion.p>
      {/* Progress dots */}
      <div className="flex gap-2">
        {[0, 1, 2, 3, 4].map(i => (
          <motion.div
            key={i}
            className="w-2 h-2 rounded-full"
            style={{ background: '#D4AF37' }}
            animate={{ opacity: [0.2, 1, 0.2] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
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

  useEffect(() => {
    if (user) navigate('/sistema/gestao-frotas-oficinas');
  }, [user, navigate]);

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
    // Start scanning animation
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
    const { error } = await signIn(email, password);
    if (error) {
      toast({ title: 'Falha na autenticação', description: error.message, variant: 'destructive' });
    }
    setLoading(false);
  };

  // ── Asymmetric card style ────────────────────
  const cardStyle: React.CSSProperties = {
    borderRadius: '40px 12px 40px 12px',
    background: 'rgba(0, 32, 63, 0.55)',
    backdropFilter: 'blur(24px)',
    WebkitBackdropFilter: 'blur(24px)',
    border: '1px solid rgba(212, 175, 55, 0.15)',
    boxShadow: '0 30px 80px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255,255,255,0.05)',
  };

  const inputStyle: React.CSSProperties = {
    borderRadius: '16px 6px 16px 6px',
    background: 'rgba(0, 78, 146, 0.15)',
    border: '1px solid rgba(212, 175, 55, 0.2)',
    color: '#fff',
    padding: '14px 16px',
    fontSize: '15px',
    fontWeight: 300,
    letterSpacing: '0.05em',
    outline: 'none',
    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    width: '100%',
  };

  return (
    <>
      <style>{`
        @keyframes meshFloat1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-60px, 40px) scale(1.1); }
          66% { transform: translate(30px, -50px) scale(0.95); }
        }
        @keyframes meshFloat2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(50px, -30px) scale(1.08); }
          66% { transform: translate(-40px, 60px) scale(0.92); }
        }
        @keyframes meshFloat3 {
          0%, 100% { transform: translate(-50%, 0) scale(1); }
          50% { transform: translate(-50%, -40px) scale(1.15); }
        }
        @keyframes borderRun {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
        .auditt-input:focus {
          border-color: #D4AF37 !important;
          box-shadow: 0 0 20px rgba(212, 175, 55, 0.25), inset 0 0 20px rgba(212, 175, 55, 0.05) !important;
        }
        .auditt-input::placeholder {
          color: rgba(255, 255, 255, 0.3);
          font-weight: 300;
        }
        .auditt-btn-auth {
          position: relative;
          overflow: hidden;
          border: none;
          padding: 14px 32px;
          font-size: 15px;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: #00203F;
          background: linear-gradient(135deg, #D4AF37, #FFD700, #D4AF37);
          border-radius: 16px 6px 16px 6px;
          cursor: pointer;
          transition: all 0.3s ease;
          width: 100%;
        }
        .auditt-btn-auth::before {
          content: '';
          position: absolute;
          top: -2px; left: -2px; right: -2px; bottom: -2px;
          background: linear-gradient(90deg, transparent, rgba(255,215,0,0.8), transparent, rgba(212,175,55,0.6), transparent);
          background-size: 200% 100%;
          border-radius: inherit;
          z-index: -1;
          animation: borderRun 2s linear infinite;
        }
        .auditt-btn-auth:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 30px rgba(212, 175, 55, 0.4);
        }
        .auditt-btn-auth:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }
        .doc-toggle {
          padding: 8px 20px;
          font-size: 12px;
          font-weight: 600;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          border: 1px solid rgba(212, 175, 55, 0.3);
          background: transparent;
          color: rgba(255, 255, 255, 0.5);
          cursor: pointer;
          transition: all 0.3s ease;
        }
        .doc-toggle.active {
          background: rgba(212, 175, 55, 0.15);
          color: #D4AF37;
          border-color: #D4AF37;
        }
        .doc-toggle:first-child { border-radius: 12px 4px 4px 12px; }
        .doc-toggle:last-child { border-radius: 4px 12px 12px 4px; }
      `}</style>

      <MeshBackground />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-8">
        {/* ── Header ─────────────────────────────── */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -30, filter: 'blur(10px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <h1
            className="text-5xl md:text-6xl tracking-[0.2em] mb-2"
            style={{ color: '#fff', fontWeight: 800 }}
          >
            AUDITT
          </h1>
          <p
            className="text-sm tracking-[0.35em] uppercase"
            style={{ color: '#D4AF37', fontWeight: 300 }}
          >
            Intelligence Logistics
          </p>
        </motion.div>

        {/* ── Card ────────────────────────────────── */}
        <motion.div
          className="w-full max-w-md relative"
          style={cardStyle}
          initial={{ opacity: 0, scale: 0.95, filter: 'blur(12px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ duration: 0.9, delay: 0.2, ease: 'easeOut' }}
        >
          <div className="p-8 md:p-10">
            {/* Shield icon */}
            <div className="flex justify-center mb-6">
              <div
                className="w-16 h-16 flex items-center justify-center"
                style={{
                  borderRadius: '20px 8px 20px 8px',
                  background: 'rgba(212, 175, 55, 0.1)',
                  border: '1px solid rgba(212, 175, 55, 0.25)',
                }}
              >
                <Shield className="w-8 h-8" style={{ color: '#D4AF37' }} />
              </div>
            </div>

            <h2
              className="text-center text-lg tracking-[0.15em] uppercase mb-1"
              style={{ color: '#fff', fontWeight: 600 }}
            >
              Acesso Blindado
            </h2>
            <p
              className="text-center text-xs tracking-wider mb-8"
              style={{ color: 'rgba(255,255,255,0.4)', fontWeight: 300 }}
            >
              {step === 'credential'
                ? 'Identifique-se para iniciar o escaneamento'
                : step === 'scanning'
                ? 'Processando credenciais...'
                : 'Credencial verificada. Insira sua senha.'}
            </p>

            <AnimatePresence mode="wait">
              {/* ── Step 1: Document input ──── */}
              {step === 'credential' && (
                <motion.div
                  key="credential"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-5"
                >
                  {/* Toggle CNPJ / CPF */}
                  <div className="flex justify-center gap-0">
                    <button
                      className={`doc-toggle ${docType === 'cnpj' ? 'active' : ''}`}
                      onClick={() => { setDocType('cnpj'); setDocValue(''); }}
                    >
                      Oficina (CNPJ)
                    </button>
                    <button
                      className={`doc-toggle ${docType === 'cpf' ? 'active' : ''}`}
                      onClick={() => { setDocType('cpf'); setDocValue(''); }}
                    >
                      Gestor (CPF)
                    </button>
                  </div>

                  <div>
                    <label
                      className="block text-xs tracking-[0.2em] uppercase mb-2"
                      style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}
                    >
                      {docType === 'cnpj' ? 'CNPJ da Oficina' : 'CPF do Gestor'}
                    </label>
                    <div className="relative">
                      <Fingerprint
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                        style={{ color: 'rgba(212, 175, 55, 0.5)' }}
                      />
                      <input
                        className="auditt-input pl-11"
                        style={inputStyle}
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

                  <button className="auditt-btn-auth" onClick={handleDocSubmit}>
                    <span className="flex items-center justify-center gap-2">
                      <ScanLine className="w-4 h-4" />
                      Escanear Credenciais
                    </span>
                  </button>
                </motion.div>
              )}

              {/* ── Step 2: Scanning ────────── */}
              {step === 'scanning' && (
                <ScanningOverlay
                  key="scanning"
                  label="Verificando na base Auditt"
                />
              )}

              {/* ── Step 3: Password ─────────── */}
              {step === 'password' && (
                <motion.form
                  key="password"
                  onSubmit={handleLogin}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-5"
                >
                  {/* Verified badge */}
                  <div
                    className="flex items-center gap-3 p-3"
                    style={{
                      borderRadius: '12px 4px 12px 4px',
                      background: 'rgba(212, 175, 55, 0.08)',
                      border: '1px solid rgba(212, 175, 55, 0.2)',
                    }}
                  >
                    <Shield className="w-5 h-5 flex-shrink-0" style={{ color: '#D4AF37' }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#D4AF37' }}>
                        {docType === 'cnpj' ? 'CNPJ' : 'CPF'} Verificado
                      </p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        {docValue}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label
                      className="block text-xs tracking-[0.2em] uppercase mb-2"
                      style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}
                    >
                      E-mail de acesso
                    </label>
                    <input
                      className="auditt-input"
                      style={inputStyle}
                      type="email"
                      placeholder="operador@oficina.com"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label
                      className="block text-xs tracking-[0.2em] uppercase mb-2"
                      style={{ color: 'rgba(255,255,255,0.5)', fontWeight: 400 }}
                    >
                      Senha Segura
                    </label>
                    <div className="relative">
                      <Lock
                        className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4"
                        style={{ color: 'rgba(212, 175, 55, 0.5)' }}
                      />
                      <input
                        className="auditt-input pl-11 pr-11"
                        style={inputStyle}
                        type={showPassword ? 'text' : 'password'}
                        placeholder="••••••••"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                      />
                      <button
                        type="button"
                        className="absolute right-4 top-1/2 -translate-y-1/2"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ color: 'rgba(212, 175, 55, 0.5)' }}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <button className="auditt-btn-auth" type="submit" disabled={loading}>
                    {loading ? (
                      <span className="flex items-center justify-center gap-2">
                        <motion.div
                          className="w-4 h-4 border-2 rounded-full"
                          style={{ borderColor: '#00203F', borderTopColor: 'transparent' }}
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        />
                        Autenticando...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center gap-2">
                        <Lock className="w-4 h-4" />
                        Autenticar
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    className="w-full text-xs text-center mt-2"
                    style={{ color: 'rgba(255,255,255,0.3)', cursor: 'pointer', background: 'none', border: 'none' }}
                    onClick={() => { setStep('credential'); setPassword(''); setEmail(''); }}
                  >
                    ← Voltar ao escaneamento
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* ── Footer de Segurança ──────────────── */}
        <motion.div
          className="mt-8 text-center space-y-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.8 }}
        >
          <div className="flex items-center justify-center gap-2">
            <Server className="w-3 h-3" style={{ color: '#4ade80' }} />
            <span
              className="text-xs tracking-wider"
              style={{ color: 'rgba(255,255,255,0.35)', fontWeight: 300 }}
            >
              Imperatriz-MA — <span style={{ color: '#4ade80' }}>Operational</span>
            </span>
          </div>
          <p
            className="text-[10px] tracking-wider"
            style={{ color: 'rgba(255,255,255,0.2)', fontWeight: 300 }}
          >
            SESSION {sessionId}
          </p>
          <p
            className="text-[10px] tracking-wider"
            style={{ color: 'rgba(255,255,255,0.15)', fontWeight: 300 }}
          >
            © 2026 Auditt Tecnologia e Logística LTDA.
          </p>
        </motion.div>
      </div>
    </>
  );
}
