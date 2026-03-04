import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAuth as useAuthContext } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/components/ui/sonner';
import {
  Wrench, Truck, ArrowLeft, ArrowRight, Check, Upload, Building2,
  Banknote, Camera, Shield, Search, Plus, Trash2, Copy, Share2,
  FileSpreadsheet, ScanLine, Brain, Image, Eye, EyeOff, Lock
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

// ─── Types ───
type UserType = null | 'oficina' | 'frota';
type OficinaStep = 'cnpj' | 'servicos' | 'banco' | 'documentos' | 'senha' | 'finalizado';
type FrotaStep = 'cnpj' | 'frota' | 'veiculos' | 'convite' | 'senha' | 'finalizado';

interface VeiculoForm {
  id: string;
  placa: string;
  modelo: string;
  ano: string;
}

const OFICINA_STEPS: { key: OficinaStep; label: string }[] = [
  { key: 'cnpj', label: 'Empresa' },
  { key: 'servicos', label: 'Serviços' },
  { key: 'banco', label: 'Banco' },
  { key: 'documentos', label: 'Documentos' },
  { key: 'senha', label: 'Acesso' },
  { key: 'finalizado', label: 'Pronto' },
];

const FROTA_STEPS: { key: FrotaStep; label: string }[] = [
  { key: 'cnpj', label: 'Empresa' },
  { key: 'frota', label: 'Frota' },
  { key: 'veiculos', label: 'Veículos' },
  { key: 'senha', label: 'Acesso' },
  { key: 'convite', label: 'Motoristas' },
  { key: 'finalizado', label: 'Pronto' },
];

const CATEGORIAS = [
  'Mecânica Geral', 'Elétrica', 'Suspensão', 'Freios',
  'Motor Diesel', 'Câmbio', 'Ar Condicionado', 'Funilaria',
];

// ─── Step Indicator (outside component to avoid remounts) ───
function StepBar({ steps, currentStepIdx, progress }: {
  steps: { key: string; label: string }[];
  currentStepIdx: number;
  progress: number;
}) {
  return (
    <div className="w-full space-y-3">
      <Progress value={progress} className="h-1.5" />
      <div className="flex justify-between">
        {steps.map((s, i) => (
          <div key={s.key} className="flex flex-col items-center gap-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-all ${
              i < currentStepIdx ? 'bg-primary border-primary text-primary-foreground' :
              i === currentStepIdx ? 'border-primary text-primary bg-primary/10' :
              'border-muted text-muted-foreground'
            }`}>
              {i < currentStepIdx ? <Check className="w-3.5 h-3.5" /> : i + 1}
            </div>
            <span className={`text-[10px] font-medium hidden sm:block ${i <= currentStepIdx ? 'text-foreground' : 'text-muted-foreground'}`}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Layout wrapper (outside component to avoid remounts) ───
function StepLayout({ title, subtitle, children, onNext, onBack, nextLabel, nextDisabled, loading, steps, currentStepIdx, progress }: {
  title: string; subtitle: string; children: React.ReactNode;
  onNext?: () => void | Promise<void>; onBack?: () => void; nextLabel?: string; nextDisabled?: boolean;
  loading?: boolean; steps: { key: string; label: string }[]; currentStepIdx: number; progress: number;
}) {
  return (
    <div className="min-h-screen bg-background flex flex-col fleet-theme">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto">
          <StepBar steps={steps} currentStepIdx={currentStepIdx} progress={progress} />
        </div>
      </div>
      <div className="flex-1 flex items-start justify-center p-4 pt-8">
        <div className="w-full max-w-lg space-y-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          </div>
          <div className="space-y-4">{children}</div>
          <div className="flex gap-3 pt-4">
            {onBack && (
              <Button variant="outline" onClick={onBack} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Voltar
              </Button>
            )}
            {onNext && (
              <Button onClick={onNext} disabled={nextDisabled || loading} className="flex-1 gap-2">
                {nextLabel || 'Continuar'} <ArrowRight className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FleetOnboardingPage() {
  const { user } = useAuth();
  const { signUp, signIn } = useAuthContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tipoParam = searchParams.get('tipo') as 'oficina' | 'frota' | null;
  const [userType, setUserType] = useState<UserType>(tipoParam || null);
  const [loading, setLoading] = useState(false);

  // Account creation state (for users not logged in)
  const [acctEmail, setAcctEmail] = useState('');
  const [acctPassword, setAcctPassword] = useState('');
  const [acctConfirmPassword, setAcctConfirmPassword] = useState('');
  const [showAcctPassword, setShowAcctPassword] = useState(false);

  // Oficina state
  const [oficinaStep, setOficinaStep] = useState<OficinaStep>('cnpj');
  const [oficinaCnpj, setOficinaCnpj] = useState('');
  const [oficinaRazao, setOficinaRazao] = useState('');
  const [oficinaNome, setOficinaNome] = useState('');
  const [oficinaEndereco, setOficinaEndereco] = useState('');
  const [oficinaCidade, setOficinaCidade] = useState('');
  const [oficinaEstado, setOficinaEstado] = useState('');
  const [oficinaCep, setOficinaCep] = useState('');
  const [oficinaTelefone, setOficinaTelefone] = useState('');
  const [oficinaEmail, setOficinaEmail] = useState('');
  const [valorHora, setValorHora] = useState('');
  const [categorias, setCategorias] = useState<string[]>([]);
  const [bancoNome, setBancoNome] = useState('');
  const [bancoAgencia, setBancoAgencia] = useState('');
  const [bancoConta, setBancoConta] = useState('');
  const [bancoTipo, setBancoTipo] = useState('corrente');
  const [bancoTitular, setBancoTitular] = useState('');
  const [bancoCpfCnpj, setBancoCpfCnpj] = useState('');
  const [pixChave, setPixChave] = useState('');
  const [alvaraFile, setAlvaraFile] = useState<File | null>(null);
  const [fachadaFile, setFachadaFile] = useState<File | null>(null);

  // Frota state
  const [frotaStep, setFrotaStep] = useState<FrotaStep>('cnpj');
  const [frotaCnpj, setFrotaCnpj] = useState('');
  const [frotaRazao, setFrotaRazao] = useState('');
  const [frotaNome, setFrotaNome] = useState('');
  const [frotaEndereco, setFrotaEndereco] = useState('');
  const [frotaCidade, setFrotaCidade] = useState('');
  const [frotaEstado, setFrotaEstado] = useState('');
  const [frotaTelefone, setFrotaTelefone] = useState('');
  const [frotaEmail, setFrotaEmail] = useState('');
  const [tamanhoFrota, setTamanhoFrota] = useState('');
  const [veiculos, setVeiculos] = useState<VeiculoForm[]>([
    { id: '1', placa: '', modelo: '', ano: '' }
  ]);
  const [inviteLink, setInviteLink] = useState('');
  const [veroScanning, setVeroScanning] = useState(false);
  const [veroFile, setVeroFile] = useState<File | null>(null);

  // ─── Password Strength ───
  const getPasswordStrength = (pw: string) => {
    if (!pw) return { level: 0, label: '', color: '' };
    let score = 0;
    if (pw.length >= 6) score++;
    if (pw.length >= 10) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: 1, label: 'Fraca', color: 'bg-destructive' };
    if (score <= 2) return { level: 2, label: 'Razoável', color: 'bg-orange-500' };
    if (score <= 3) return { level: 3, label: 'Boa', color: 'bg-yellow-500' };
    return { level: Math.min(score, 5), label: score <= 4 ? 'Forte' : 'Muito forte', color: 'bg-emerald-500' };
  };

  const passwordStrength = getPasswordStrength(acctPassword);

  // Store the Auditt user ID after account creation (separate from NovaLink user)
  const [audittUserId, setAudittUserId] = useState<string | null>(null);

  // ─── Create account if not logged in ───
  const ensureAccount = async (name: string, phone: string, cnpj: string): Promise<string | null> => {
    // Auditt has its own auth system — always require password creation regardless of NovaLink login state
    if (!acctPassword) {
      toast.error('Preencha a senha de acesso ao painel.');
      return null;
    }
    if (acctPassword !== acctConfirmPassword) {
      toast.error('As senhas não coincidem.');
      return null;
    }
    if (passwordStrength.level < 2) {
      toast.error('Senha muito fraca. Use letras maiúsculas, números e caracteres especiais.');
      return null;
    }
    // Use edge function to create auto-confirmed account with CNPJ-based email
    const rawCnpj = cnpj.replace(/\D/g, '');
    setLoading(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('auditt-signup', {
        body: { cnpj: rawCnpj, password: acctPassword, full_name: name, phone },
      });
      if (fnError || data?.error) {
        toast.error(data?.error || fnError?.message || 'Erro ao criar conta');
        setLoading(false);
        return null;
      }
      const newUserId = data?.user_id as string;
      
      // Auto-login after account creation
      const generatedEmail = `${rawCnpj}@auditt.app`;
      const { error: loginError } = await signIn(generatedEmail, acctPassword);
      if (loginError) {
        toast.error('Conta criada, mas não foi possível fazer login automático.');
      } else {
        toast.success('Conta criada com sucesso!');
      }
      setAudittUserId(newUserId);
      setLoading(false);
      return newUserId;
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar conta');
      setLoading(false);
      return null;
    }
  };

  // ─── CNPJ Lookup (BrasilAPI) ───
  const buscarCnpj = async (cnpj: string, type: 'oficina' | 'frota') => {
    const cleaned = cnpj.replace(/\D/g, '');
    if (cleaned.length !== 14) {
      toast.error('CNPJ deve ter 14 dígitos');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleaned}`);
      if (!res.ok) throw new Error('CNPJ não encontrado');
      const data = await res.json();
      if (type === 'oficina') {
        setOficinaRazao(data.razao_social || '');
        setOficinaNome(data.nome_fantasia || data.razao_social || '');
        setOficinaEndereco(`${data.logradouro || ''}, ${data.numero || ''} - ${data.bairro || ''}`);
        setOficinaCidade(data.municipio || '');
        setOficinaEstado(data.uf || '');
        setOficinaCep(data.cep || '');
      } else {
        setFrotaRazao(data.razao_social || '');
        setFrotaNome(data.nome_fantasia || data.razao_social || '');
        setFrotaEndereco(`${data.logradouro || ''}, ${data.numero || ''} - ${data.bairro || ''}`);
        setFrotaCidade(data.municipio || '');
        setFrotaEstado(data.uf || '');
      }
      toast.success('CNPJ encontrado! Dados preenchidos automaticamente.');
    } catch {
      toast.error('Não foi possível buscar o CNPJ. Preencha manualmente.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Upload file to storage ───
  const uploadDoc = async (file: File, folder: string, overrideUserId?: string): Promise<string | null> => {
    const uid = overrideUserId || audittUserId || user?.id;
    if (!uid) return null;
    const ext = file.name.split('.').pop();
    const path = `${uid}/${folder}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('fleet_docs').upload(path, file);
    if (error) { toast.error('Erro ao enviar arquivo'); return null; }
    return path;
  };

  // ─── Submit Oficina ───
  const submitOficina = async (overrideUserId?: string) => {
    const uid = overrideUserId || audittUserId || user?.id;
    if (!uid) { toast.error('Erro: usuário não identificado'); return; }
    setLoading(true);
    try {
      let alvaraUrl: string | null = null;
      let fachadaUrl: string | null = null;
      if (alvaraFile) alvaraUrl = await uploadDoc(alvaraFile, 'alvara', uid);
      if (fachadaFile) fachadaUrl = await uploadDoc(fachadaFile, 'fachada', uid);

      const { error } = await (supabase.from('fleet_partner_workshops') as any).insert({
        user_id: uid,
        cnpj: oficinaCnpj.replace(/\D/g, ''),
        razao_social: oficinaRazao,
        nome_fantasia: oficinaNome,
        endereco: oficinaEndereco,
        cidade: oficinaCidade,
        estado: oficinaEstado,
        cep: oficinaCep,
        telefone: oficinaTelefone,
        email: oficinaEmail,
        valor_hora_tecnica: parseFloat(valorHora) || 0,
        categorias,
        banco_nome: bancoNome,
        banco_agencia: bancoAgencia,
        banco_conta: bancoConta,
        banco_tipo_conta: bancoTipo,
        banco_titular: bancoTitular,
        banco_cpf_cnpj: bancoCpfCnpj,
        pix_chave: pixChave,
        alvara_url: alvaraUrl,
        fachada_url: fachadaUrl,
        status: 'pendente',
      });
      if (error) throw error;
      setOficinaStep('finalizado');
      toast.success('Cadastro enviado para aprovação!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  // ─── Submit Frota ───
  const submitFrota = async (overrideUserId?: string) => {
    const uid = overrideUserId || audittUserId || user?.id;
    if (!uid) { toast.error('Erro: usuário não identificado'); return; }
    setLoading(true);
    try {
      // Create operator
      const { data: op, error: opErr } = await (supabase.from('fleet_operators') as any)
        .insert({
          user_id: uid,
          cnpj: frotaCnpj.replace(/\D/g, ''),
          razao_social: frotaRazao,
          nome_fantasia: frotaNome,
          endereco: frotaEndereco,
          cidade: frotaCidade,
          estado: frotaEstado,
          telefone: frotaTelefone,
          email: frotaEmail,
          tamanho_frota: parseInt(tamanhoFrota) || 0,
        })
        .select('id')
        .single();
      if (opErr) throw opErr;

      // Create invite link
      const { data: invite, error: invErr } = await (supabase.from('fleet_driver_invites') as any)
        .insert({ operator_id: op.id })
        .select('invite_code')
        .single();
      if (invErr) throw invErr;
      setInviteLink(`${window.location.origin}/convite-motorista/${invite.invite_code}`);

      // Create customer_product if not exists
      await (supabase.from('customer_products') as any).upsert({
        user_id: uid,
        product_slug: 'gestao-frotas-oficinas',
        product_title: 'Gestão de Frotas & Oficinas',
        acquisition_type: 'purchase',
        is_active: true,
        delivered_at: new Date().toISOString(),
      }, { onConflict: 'user_id,product_slug' });

      // Insert vehicles with the customer_product_id
      const { data: cp } = await (supabase.from('customer_products') as any)
        .select('id')
        .eq('user_id', uid)
        .eq('product_slug', 'gestao-frotas-oficinas')
        .single();

      if (cp) {
        const validVeiculos = veiculos.filter(v => v.placa.trim());
        if (validVeiculos.length > 0) {
          await (supabase.from('fleet_vehicles') as any).insert(
            validVeiculos.map(v => ({
              customer_product_id: cp.id,
              placa: v.placa.toUpperCase().trim(),
              modelo: v.modelo.trim(),
              ano: v.ano.trim(),
              status: 'disponivel',
            }))
          );
        }
      }

      setFrotaStep('convite');
      toast.success('Frota cadastrada com sucesso!');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  // ─── Vehicle helpers ───
  const addVeiculo = () => setVeiculos(prev => [...prev, { id: Date.now().toString(), placa: '', modelo: '', ano: '' }]);
  const removeVeiculo = (id: string) => setVeiculos(prev => prev.filter(v => v.id !== id));
  const updateVeiculo = (id: string, field: keyof VeiculoForm, value: string) =>
    setVeiculos(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));

  // ─── VERO 1.0 Scan ───
  const handleVeroScan = async (file: File) => {
    setVeroScanning(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve((reader.result as string).split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const { data, error } = await supabase.functions.invoke('vero-scan', {
        body: { image: base64, mode: 'vehicle_rear' },
      });
      if (error) throw error;

      if (data?.placa) {
        const newV: VeiculoForm = {
          id: Date.now().toString(),
          placa: data.placa || '',
          modelo: data.modelo ? `${data.marca || ''} ${data.modelo}`.trim() : '',
          ano: data.ano_modelo || data.ano || '',
        };
        setVeiculos(prev => {
          const empty = prev.length === 1 && !prev[0].placa;
          return empty ? [newV] : [...prev, newV];
        });
        toast.success(`VERO 1.0 identificou: ${data.placa}`);
      } else {
        toast.error('VERO não conseguiu identificar o veículo. Tente outra foto.');
      }
    } catch (err: any) {
      console.error(err);
      toast.error('Erro no escaneamento VERO 1.0');
    } finally {
      setVeroScanning(false);
      setVeroFile(null);
    }
  };

  // ─── Progress calc ───
  const getProgress = () => {
    if (userType === 'oficina') {
      const idx = OFICINA_STEPS.findIndex(s => s.key === oficinaStep);
      return ((idx + 1) / OFICINA_STEPS.length) * 100;
    }
    if (userType === 'frota') {
      const idx = FROTA_STEPS.findIndex(s => s.key === frotaStep);
      return ((idx + 1) / FROTA_STEPS.length) * 100;
    }
    return 0;
  };

  const steps = userType === 'oficina' ? OFICINA_STEPS : userType === 'frota' ? FROTA_STEPS : [];
  const currentStepKey = userType === 'oficina' ? oficinaStep : frotaStep;
  const currentStepIdx = steps.findIndex(s => s.key === currentStepKey);

  // If no type selected (direct URL access without param), redirect to /auditt
  if (!userType) {
    navigate('/auditt');
    return null;
  }

  // stepLayoutProps shared across all steps
  const stepLayoutProps = { steps, currentStepIdx, progress: getProgress(), loading };

  // ────────────────────────────
  // OFICINA FLOW
  // ────────────────────────────
  if (userType === 'oficina') {
    if (oficinaStep === 'cnpj') {
      return (
        <StepLayout
          {...stepLayoutProps}
          title="Dados da Oficina"
          subtitle="Informe o CNPJ e preenchemos automaticamente"
          onBack={() => navigate('/auditt')}
          onNext={() => setOficinaStep('servicos')}
          nextDisabled={!oficinaCnpj || !oficinaNome}
        >
          <div className="space-y-1.5">
            <Label>CNPJ</Label>
            <div className="flex gap-2">
              <Input
                placeholder="00.000.000/0000-00"
                value={oficinaCnpj}
                onChange={e => setOficinaCnpj(e.target.value)}
              />
              <Button variant="outline" size="icon" onClick={() => buscarCnpj(oficinaCnpj, 'oficina')} disabled={loading}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Razão Social</Label>
            <Input value={oficinaRazao} onChange={e => setOficinaRazao(e.target.value)} placeholder="Preenchido automaticamente" />
          </div>
          <div className="space-y-1.5">
            <Label>Nome Fantasia</Label>
            <Input value={oficinaNome} onChange={e => setOficinaNome(e.target.value)} placeholder="Nome da oficina" />
          </div>
          <div className="space-y-1.5">
            <Label>Endereço</Label>
            <Input value={oficinaEndereco} onChange={e => setOficinaEndereco(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={oficinaCidade} onChange={e => setOficinaCidade(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Input value={oficinaEstado} onChange={e => setOficinaEstado(e.target.value)} maxLength={2} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={oficinaTelefone} onChange={e => setOficinaTelefone(e.target.value)} placeholder="(99) 99999-9999" />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={oficinaEmail} onChange={e => setOficinaEmail(e.target.value)} />
            </div>
          </div>
        </StepLayout>
      );
    }

    if (oficinaStep === 'servicos') {
      return (
        <StepLayout
          {...stepLayoutProps}
          title="Serviços e Valores"
          subtitle="Defina o valor da hora técnica e as categorias que você atende"
          onBack={() => setOficinaStep('cnpj')}
          onNext={() => setOficinaStep('banco')}
          nextDisabled={!valorHora || categorias.length === 0}
        >
          <div className="space-y-1.5">
            <Label>Valor da Hora Técnica (R$)</Label>
            <Input
              type="number"
              placeholder="150.00"
              value={valorHora}
              onChange={e => setValorHora(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Este valor será usado como referência nos orçamentos</p>
          </div>
          <Separator />
          <div className="space-y-3">
            <Label>Categorias Atendidas</Label>
            <div className="grid grid-cols-2 gap-2">
              {CATEGORIAS.map(cat => (
                <label key={cat} className="flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors">
                  <Checkbox
                    checked={categorias.includes(cat)}
                    onCheckedChange={(checked) => {
                      if (checked) setCategorias(prev => [...prev, cat]);
                      else setCategorias(prev => prev.filter(c => c !== cat));
                    }}
                  />
                  <span className="text-sm">{cat}</span>
                </label>
              ))}
            </div>
          </div>
        </StepLayout>
      );
    }

    if (oficinaStep === 'banco') {
      return (
        <StepLayout
          {...stepLayoutProps}
          title="Dados Bancários"
          subtitle="Onde você receberá os 85% dos serviços realizados"
          onBack={() => setOficinaStep('servicos')}
          onNext={() => setOficinaStep('documentos')}
          nextDisabled={!bancoNome || !bancoConta}
        >
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
            <Banknote className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-foreground">
              A Auditt retém <strong>15%</strong> como taxa de intermediação. Você recebe <strong>85%</strong> do valor bruto dos serviços via depósito automático D+1.
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Banco</Label>
            <Input placeholder="Ex: Banco do Brasil" value={bancoNome} onChange={e => setBancoNome(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Agência</Label>
              <Input placeholder="0001" value={bancoAgencia} onChange={e => setBancoAgencia(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Conta</Label>
              <Input placeholder="12345-6" value={bancoConta} onChange={e => setBancoConta(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={bancoTipo}
                onChange={e => setBancoTipo(e.target.value)}
              >
                <option value="corrente">Corrente</option>
                <option value="poupanca">Poupança</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>CPF/CNPJ do Titular</Label>
              <Input value={bancoCpfCnpj} onChange={e => setBancoCpfCnpj(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nome do Titular</Label>
            <Input value={bancoTitular} onChange={e => setBancoTitular(e.target.value)} />
          </div>
          <Separator />
          <div className="space-y-1.5">
            <Label>Chave PIX (opcional)</Label>
            <Input placeholder="CPF, e-mail, telefone ou chave aleatória" value={pixChave} onChange={e => setPixChave(e.target.value)} />
          </div>
        </StepLayout>
      );
    }

    if (oficinaStep === 'documentos') {
      return (
        <StepLayout
          {...stepLayoutProps}
          title="Documentos"
          subtitle="Envie uma foto do alvará ou da fachada para validação"
          onBack={() => setOficinaStep('banco')}
          onNext={() => setOficinaStep('senha')}
          nextDisabled={!alvaraFile && !fachadaFile}
        >
          <div className="bg-muted/30 border border-border rounded-lg p-3 flex items-start gap-2">
            <Shield className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Sua oficina será validada manualmente pela equipe Auditt antes de aparecer para as frotas. Isso garante segurança para todos.
            </p>
          </div>
          <FileUploadBox
            label="Alvará de Funcionamento"
            file={alvaraFile}
            onFile={setAlvaraFile}
            accept="image/*,.pdf"
          />
          <FileUploadBox
            label="Foto da Fachada"
            file={fachadaFile}
            onFile={setFachadaFile}
            accept="image/*"
          />
        </StepLayout>
      );
    }

    if (oficinaStep === 'senha') {
      return (
        <StepLayout
          {...stepLayoutProps}
          title="Senha de Acesso"
          subtitle="Defina o e-mail e a senha para acessar o painel após aprovação"
          onBack={() => setOficinaStep('documentos')}
          onNext={async () => {
            const newUserId = await ensureAccount(oficinaNome || oficinaRazao, oficinaTelefone, oficinaCnpj);
            if (!newUserId) return;
            await submitOficina(newUserId);
          }}
          nextLabel="Enviar Cadastro"
          nextDisabled={!acctPassword || !acctConfirmPassword}
        >
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
            <Lock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-foreground">
              Crie uma <strong>senha de acesso ao painel</strong>. Após a aprovação pela equipe Auditt, você usará o CNPJ e esta senha para entrar na plataforma.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Senha de acesso</Label>
            <div className="relative">
              <Input
                type={showAcctPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={acctPassword}
                onChange={e => setAcctPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowAcctPassword(!showAcctPassword)}
              >
                {showAcctPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {acctPassword && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.level / 5) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">{passwordStrength.label}</span>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar senha</Label>
            <Input
              type={showAcctPassword ? 'text' : 'password'}
              placeholder="Repita a senha"
              value={acctConfirmPassword}
              onChange={e => setAcctConfirmPassword(e.target.value)}
            />
          </div>
        </StepLayout>
      );
    }

    if (oficinaStep === 'finalizado') {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Cadastro Enviado!</h2>
              <p className="text-muted-foreground mt-2">
                Sua oficina está em análise. Você receberá uma notificação assim que for aprovada e começará a receber chamados das frotas da região.
              </p>
            </div>
            <Button onClick={() => navigate('/auditt')} className="w-full">
              Voltar ao Portal
            </Button>
          </div>
        </div>
      );
    }
  }

  // ────────────────────────────
  // FROTA FLOW
  // ────────────────────────────
  if (userType === 'frota') {
    if (frotaStep === 'cnpj') {
      return (
        <StepLayout
          {...stepLayoutProps}
          title="Dados da Empresa"
          subtitle="Informe o CNPJ da sua empresa de transporte"
          onBack={() => navigate('/auditt')}
          onNext={() => setFrotaStep('frota')}
          nextDisabled={!frotaCnpj || !frotaNome}
        >
          <div className="space-y-1.5">
            <Label>CNPJ</Label>
            <div className="flex gap-2">
              <Input placeholder="00.000.000/0000-00" value={frotaCnpj} onChange={e => setFrotaCnpj(e.target.value)} />
              <Button variant="outline" size="icon" onClick={() => buscarCnpj(frotaCnpj, 'frota')} disabled={loading}>
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Razão Social</Label>
            <Input value={frotaRazao} onChange={e => setFrotaRazao(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Nome Fantasia</Label>
            <Input value={frotaNome} onChange={e => setFrotaNome(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Endereço</Label>
            <Input value={frotaEndereco} onChange={e => setFrotaEndereco(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cidade</Label>
              <Input value={frotaCidade} onChange={e => setFrotaCidade(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Estado</Label>
              <Input value={frotaEstado} onChange={e => setFrotaEstado(e.target.value)} maxLength={2} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={frotaTelefone} onChange={e => setFrotaTelefone(e.target.value)} placeholder="(99) 99999-9999" />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail</Label>
              <Input type="email" value={frotaEmail} onChange={e => setFrotaEmail(e.target.value)} />
            </div>
          </div>
        </StepLayout>
      );
    }

    if (frotaStep === 'frota') {
      return (
        <StepLayout
          {...stepLayoutProps}
          title="Tamanho da Frota"
          subtitle="Quantos veículos sua empresa possui?"
          onBack={() => setFrotaStep('cnpj')}
          onNext={() => setFrotaStep('veiculos')}
          nextDisabled={!tamanhoFrota}
        >
          <div className="space-y-1.5">
            <Label>Número de Veículos</Label>
            <Input
              type="number"
              placeholder="Ex: 25"
              value={tamanhoFrota}
              onChange={e => setTamanhoFrota(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Você poderá cadastrar os veículos no próximo passo
            </p>
          </div>
        </StepLayout>
      );
    }

    if (frotaStep === 'veiculos') {
      return (
        <StepLayout
          {...stepLayoutProps}
          title="Cadastrar Veículos"
          subtitle="Use o VERO 1.0 para escanear ou cadastre manualmente"
          onBack={() => setFrotaStep('frota')}
          onNext={() => setFrotaStep('senha')}
          nextLabel="Continuar"
          nextDisabled={!veiculos.some(v => v.placa.trim())}
        >
          <Tabs defaultValue="vero" className="w-full">
            <TabsList className="w-full grid grid-cols-2">
              <TabsTrigger value="vero" className="gap-2">
                <Brain className="w-4 h-4" /> VERO 1.0
              </TabsTrigger>
              <TabsTrigger value="manual" className="gap-2">
                <Plus className="w-4 h-4" /> Manual
              </TabsTrigger>
            </TabsList>

            <TabsContent value="vero" className="space-y-4 mt-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Brain className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground text-sm">IA VERO 1.0</p>
                      <p className="text-xs text-muted-foreground">Tire uma foto da traseira do veículo</p>
                    </div>
                  </div>

                  <label className={`flex flex-col items-center justify-center h-32 rounded-lg border-2 border-dashed transition-colors cursor-pointer ${
                    veroScanning ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50 bg-muted/20'
                  }`}>
                    {veroScanning ? (
                      <div className="flex flex-col items-center gap-2">
                        <ScanLine className="w-8 h-8 text-primary animate-pulse" />
                        <span className="text-sm font-medium text-primary">VERO analisando...</span>
                      </div>
                    ) : (
                      <>
                        <Camera className="w-8 h-8 text-muted-foreground mb-1" />
                        <span className="text-xs text-muted-foreground">Clique para tirar foto ou enviar imagem</span>
                        <span className="text-[10px] text-muted-foreground mt-1">Placa, modelo e ano serão preenchidos automaticamente</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      disabled={veroScanning}
                      onChange={e => {
                        const f = e.target.files?.[0];
                        if (f) {
                          setVeroFile(f);
                          handleVeroScan(f);
                        }
                      }}
                    />
                  </label>

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ScanLine className="w-3 h-3" />
                    <span>Escaneie quantos veículos quiser — eles aparecem na lista abaixo</span>
                  </div>
                </CardContent>
              </Card>

              {/* Vehicle list from scans */}
              {veiculos.some(v => v.placa) && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Veículos identificados ({veiculos.filter(v => v.placa).length})</p>
                  {veiculos.filter(v => v.placa).map((v) => (
                    <div key={v.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border">
                      <div className="flex-1 grid grid-cols-3 gap-2 text-sm">
                        <Input value={v.placa} onChange={e => updateVeiculo(v.id, 'placa', e.target.value)} className="uppercase h-8 text-xs" />
                        <Input value={v.modelo} onChange={e => updateVeiculo(v.id, 'modelo', e.target.value)} className="h-8 text-xs" />
                        <Input value={v.ano} onChange={e => updateVeiculo(v.id, 'ano', e.target.value)} className="h-8 text-xs" maxLength={4} />
                      </div>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeVeiculo(v.id)}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="manual" className="space-y-4 mt-4">
              <div className="space-y-3">
                {veiculos.map((v, i) => (
                  <div key={v.id} className="flex items-end gap-2">
                    <div className="flex-1 grid grid-cols-3 gap-2">
                      <div className="space-y-1">
                        {i === 0 && <Label className="text-xs">Placa</Label>}
                        <Input
                          placeholder="ABC-1D23"
                          value={v.placa}
                          onChange={e => updateVeiculo(v.id, 'placa', e.target.value)}
                          className="uppercase"
                        />
                      </div>
                      <div className="space-y-1">
                        {i === 0 && <Label className="text-xs">Modelo</Label>}
                        <Input
                          placeholder="Scania R450"
                          value={v.modelo}
                          onChange={e => updateVeiculo(v.id, 'modelo', e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        {i === 0 && <Label className="text-xs">Ano</Label>}
                        <Input
                          placeholder="2024"
                          value={v.ano}
                          onChange={e => updateVeiculo(v.id, 'ano', e.target.value)}
                          maxLength={4}
                        />
                      </div>
                    </div>
                    {veiculos.length > 1 && (
                      <Button variant="ghost" size="icon" onClick={() => removeVeiculo(v.id)}>
                        <Trash2 className="w-4 h-4 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={addVeiculo} className="gap-2 text-sm">
                  <Plus className="w-4 h-4" /> Adicionar veículo
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground">
            Você pode cadastrar mais veículos depois pelo painel principal com VERO 1.0.
          </p>
        </StepLayout>
      );
    }

    if (frotaStep === 'convite') {
      return (
        <StepLayout
          {...stepLayoutProps}
          title="Convidar Motoristas"
          subtitle="Compartilhe este link para seus motoristas terem acesso ao app"
          onNext={() => setFrotaStep('finalizado')}
          nextLabel="Concluir"
        >
          {inviteLink ? (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input value={inviteLink} readOnly className="text-xs" />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(inviteLink);
                    toast.success('Link copiado!');
                  }}
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  const text = encodeURIComponent(`Acesse o app Auditt para check-in dos veículos: ${inviteLink}`);
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                }}
              >
                <Share2 className="w-4 h-4" /> Enviar via WhatsApp
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Os motoristas poderão fazer check-in e acompanhar o status dos veículos
              </p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Gerando link de convite...</p>
          )}
        </StepLayout>
      );
    }

    if (frotaStep === 'senha') {
      return (
        <StepLayout
          {...stepLayoutProps}
          title="Senha de Acesso"
          subtitle="Defina o e-mail e a senha para acessar o painel"
          onBack={() => setFrotaStep('veiculos')}
          onNext={async () => {
            const newUserId = await ensureAccount(frotaNome || frotaRazao, frotaTelefone, frotaCnpj);
            if (!newUserId) return;
            await submitFrota(newUserId);
            setFrotaStep('convite');
          }}
          nextLabel="Concluir Cadastro"
          nextDisabled={!acctPassword || !acctConfirmPassword}
        >
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
            <Lock className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-foreground">
              Crie uma <strong>senha de acesso ao painel</strong>. Você usará o CNPJ e esta senha para entrar na plataforma Auditt.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Senha de acesso</Label>
            <div className="relative">
              <Input
                type={showAcctPassword ? 'text' : 'password'}
                placeholder="Mínimo 6 caracteres"
                value={acctPassword}
                onChange={e => setAcctPassword(e.target.value)}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowAcctPassword(!showAcctPassword)}
              >
                {showAcctPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {acctPassword && (
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${passwordStrength.color}`}
                    style={{ width: `${(passwordStrength.level / 5) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] font-medium text-muted-foreground">{passwordStrength.label}</span>
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <Label>Confirmar senha</Label>
            <Input
              type={showAcctPassword ? 'text' : 'password'}
              placeholder="Repita a senha"
              value={acctConfirmPassword}
              onChange={e => setAcctConfirmPassword(e.target.value)}
            />
          </div>
        </StepLayout>
      );
    }

    if (frotaStep === 'finalizado') {
      return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="w-full max-w-md text-center space-y-6">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-foreground">Tudo Pronto!</h2>
              <p className="text-muted-foreground mt-2">
                Sua frota está cadastrada. Agora você pode abrir chamados de manutenção e acompanhar tudo pelo painel.
              </p>
            </div>
            <Button onClick={() => navigate('/auditt')} className="w-full">
              Voltar ao Portal
            </Button>
          </div>
        </div>
      );
    }
  }

  return null;
}

// ─── File Upload Component ───
function FileUploadBox({ label, file, onFile, accept }: {
  label: string; file: File | null; onFile: (f: File | null) => void; accept?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <label className="flex flex-col items-center justify-center h-28 rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-muted/20 cursor-pointer transition-colors">
        {file ? (
          <div className="flex items-center gap-2 text-sm text-foreground">
            <Check className="w-4 h-4 text-primary" />
            <span className="truncate max-w-[200px]">{file.name}</span>
            <button onClick={(e) => { e.preventDefault(); onFile(null); }} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <>
            <Upload className="w-6 h-6 text-muted-foreground mb-1" />
            <span className="text-xs text-muted-foreground">Clique para enviar</span>
          </>
        )}
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); }}
        />
      </label>
    </div>
  );
}
