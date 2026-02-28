import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Car, ArrowLeft, Plus, Trash2, Camera, X, Send, FileText,
  Wrench, Package, ClipboardCheck, AlertTriangle, CheckCircle2,
  Search, DollarSign, Hash, Shield, Gauge, Eye,
  MapPin, CircleAlert, Sparkles
} from 'lucide-react';
import type { useFleetData, FleetServiceOrder, FleetVehicle } from '@/hooks/useFleetData';

// ── Types ──
type Step = 1 | 2 | 3 | 4 | 5;

interface BudgetPart {
  id: string;
  codigo: string;
  descricao: string;
  marca: string;
  quantidade: number;
  valorUnitario: number;
  tipo: 'original' | 'paralela' | 'recondicionada';
  precoRef: number; // reference price for AI validation
  justificativa: string;
}

interface BudgetLabor {
  id: string;
  codigo: string;
  descricao: string;
  horasPadrao: number;
  valorHora: number;
}

// ── Damage zones for the visual checklist ──
const damageZones = [
  { id: 'motor', label: 'Motor', x: 50, y: 22 },
  { id: 'cabine', label: 'Cabine', x: 50, y: 38 },
  { id: 'eixo_dianteiro', label: 'Eixo Dianteiro', x: 25, y: 55 },
  { id: 'eixo_traseiro', label: 'Eixo Traseiro', x: 75, y: 55 },
  { id: 'suspensao_d', label: 'Suspensão Diant.', x: 20, y: 40 },
  { id: 'suspensao_t', label: 'Suspensão Tras.', x: 80, y: 40 },
  { id: 'freios_d', label: 'Freios Diant.', x: 15, y: 65 },
  { id: 'freios_t', label: 'Freios Tras.', x: 85, y: 65 },
  { id: 'transmissao', label: 'Transmissão', x: 50, y: 55 },
  { id: 'sistema_eletrico', label: 'Elétrica', x: 35, y: 28 },
  { id: 'escapamento', label: 'Escapamento', x: 65, y: 72 },
  { id: 'direcao', label: 'Direção', x: 35, y: 45 },
  { id: 'ar_condicionado', label: 'Ar-Condicionado', x: 65, y: 30 },
  { id: 'carroceria', label: 'Carroceria', x: 50, y: 80 },
  { id: 'pneus', label: 'Pneus', x: 50, y: 68 },
  { id: 'turbo', label: 'Turbo', x: 65, y: 22 },
];

// ── Parts catalog ──
const partsCatalog = [
  { code: 'FLT-OL-001', desc: 'Filtro de óleo motor', marca: 'Mann', precoRef: 45, categoria: 'motor' },
  { code: 'FLT-AR-001', desc: 'Filtro de ar motor', marca: 'Mann', precoRef: 65, categoria: 'motor' },
  { code: 'FLT-CB-001', desc: 'Filtro de combustível', marca: 'Bosch', precoRef: 85, categoria: 'motor' },
  { code: 'FLT-AC-001', desc: 'Filtro de ar-condicionado', marca: 'Mann', precoRef: 55, categoria: 'ar_condicionado' },
  { code: 'OLE-001', desc: 'Óleo motor 15W40 (litro)', marca: 'Shell', precoRef: 32, categoria: 'motor' },
  { code: 'OLE-002', desc: 'Óleo câmbio 75W90 (litro)', marca: 'Shell', precoRef: 48, categoria: 'transmissao' },
  { code: 'PAS-001', desc: 'Jogo de pastilhas de freio', marca: 'Fras-le', precoRef: 180, categoria: 'freios_d' },
  { code: 'PAS-002', desc: 'Jogo de pastilhas traseiras', marca: 'Fras-le', precoRef: 160, categoria: 'freios_t' },
  { code: 'DIS-001', desc: 'Disco de freio ventilado dianteiro', marca: 'Fremax', precoRef: 320, categoria: 'freios_d' },
  { code: 'DIS-002', desc: 'Disco de freio ventilado traseiro', marca: 'Fremax', precoRef: 290, categoria: 'freios_t' },
  { code: 'LON-001', desc: 'Lona de freio (jogo)', marca: 'Fras-le', precoRef: 250, categoria: 'freios_t' },
  { code: 'AMO-001', desc: 'Amortecedor dianteiro', marca: 'Monroe', precoRef: 450, categoria: 'suspensao_d' },
  { code: 'AMO-002', desc: 'Amortecedor traseiro', marca: 'Monroe', precoRef: 380, categoria: 'suspensao_t' },
  { code: 'MOL-001', desc: 'Feixe de molas traseiro', marca: 'Fabrini', precoRef: 950, categoria: 'suspensao_t' },
  { code: 'COR-001', desc: 'Kit correia dentada + tensor', marca: 'Gates', precoRef: 380, categoria: 'motor' },
  { code: 'COR-002', desc: 'Correia do alternador', marca: 'Gates', precoRef: 85, categoria: 'sistema_eletrico' },
  { code: 'EMB-KIT', desc: 'Kit embreagem completo', marca: 'Sachs', precoRef: 1200, categoria: 'transmissao' },
  { code: 'BAT-001', desc: 'Bateria 12V 150Ah', marca: 'Moura', precoRef: 680, categoria: 'sistema_eletrico' },
  { code: 'VEL-001', desc: 'Vela de ignição (unidade)', marca: 'NGK', precoRef: 35, categoria: 'motor' },
  { code: 'RAD-001', desc: 'Radiador completo', marca: 'Visconde', precoRef: 890, categoria: 'motor' },
  { code: 'TUR-001', desc: 'Turbocompressor recondicionado', marca: 'BorgWarner', precoRef: 3200, categoria: 'turbo' },
  { code: 'BIC-001', desc: 'Bico injetor (unidade)', marca: 'Bosch', precoRef: 450, categoria: 'motor' },
  { code: 'BOM-001', desc: 'Bomba d\'água', marca: 'Indisa', precoRef: 280, categoria: 'motor' },
  { code: 'ALT-001', desc: 'Alternador recondicionado', marca: 'Bosch', precoRef: 650, categoria: 'sistema_eletrico' },
  { code: 'MPA-001', desc: 'Motor de partida recondicionado', marca: 'Bosch', precoRef: 580, categoria: 'sistema_eletrico' },
  { code: 'CXD-001', desc: 'Caixa de direção hidráulica', marca: 'TRW', precoRef: 1800, categoria: 'direcao' },
  { code: 'BDI-001', desc: 'Bomba de direção hidráulica', marca: 'TRW', precoRef: 950, categoria: 'direcao' },
  { code: 'CMP-001', desc: 'Compressor de ar-condicionado', marca: 'Delphi', precoRef: 1400, categoria: 'ar_condicionado' },
  { code: 'PNE-001', desc: 'Pneu 295/80R22.5 (unidade)', marca: 'Bridgestone', precoRef: 1800, categoria: 'pneus' },
  { code: 'PNE-002', desc: 'Pneu 275/80R22.5 (unidade)', marca: 'Michelin', precoRef: 2100, categoria: 'pneus' },
  { code: 'ESC-001', desc: 'Silencioso do escapamento', marca: 'Cofap', precoRef: 650, categoria: 'escapamento' },
  { code: 'CAT-001', desc: 'Catalisador', marca: 'Umicore', precoRef: 2800, categoria: 'escapamento' },
];

// ── Service catalog ──
const serviceCatalog = [
  { code: 'REV-050', desc: 'Revisão dos 50.000 km', defaultHours: 4, defaultRate: 120, categoria: 'motor' },
  { code: 'REV-100', desc: 'Revisão dos 100.000 km', defaultHours: 6, defaultRate: 120, categoria: 'motor' },
  { code: 'FRE-001', desc: 'Substituição de pastilhas de freio (eixo)', defaultHours: 1.5, defaultRate: 110, categoria: 'freios_d' },
  { code: 'FRE-002', desc: 'Substituição de discos de freio (eixo)', defaultHours: 2, defaultRate: 110, categoria: 'freios_d' },
  { code: 'FRE-003', desc: 'Regulagem de freio a tambor', defaultHours: 1, defaultRate: 100, categoria: 'freios_t' },
  { code: 'FRE-004', desc: 'Troca de lona de freio (eixo)', defaultHours: 2.5, defaultRate: 110, categoria: 'freios_t' },
  { code: 'MOT-001', desc: 'Troca de óleo e filtro do motor', defaultHours: 1, defaultRate: 100, categoria: 'motor' },
  { code: 'MOT-002', desc: 'Troca de correia dentada / alternador', defaultHours: 3.5, defaultRate: 130, categoria: 'motor' },
  { code: 'MOT-003', desc: 'Retífica de motor', defaultHours: 24, defaultRate: 150, categoria: 'motor' },
  { code: 'MOT-004', desc: 'Troca de bomba d\'água', defaultHours: 2.5, defaultRate: 120, categoria: 'motor' },
  { code: 'SUS-001', desc: 'Troca de amortecedores (par)', defaultHours: 2.5, defaultRate: 110, categoria: 'suspensao_d' },
  { code: 'SUS-002', desc: 'Alinhamento e balanceamento', defaultHours: 1, defaultRate: 80, categoria: 'eixo_dianteiro' },
  { code: 'SUS-003', desc: 'Troca de molas / feixe de molas', defaultHours: 4, defaultRate: 120, categoria: 'suspensao_t' },
  { code: 'EMB-001', desc: 'Substituição de embreagem completa', defaultHours: 6, defaultRate: 140, categoria: 'transmissao' },
  { code: 'ELE-001', desc: 'Diagnóstico elétrico completo', defaultHours: 2, defaultRate: 100, categoria: 'sistema_eletrico' },
  { code: 'ELE-002', desc: 'Troca de alternador / motor de partida', defaultHours: 2, defaultRate: 110, categoria: 'sistema_eletrico' },
  { code: 'ARR-001', desc: 'Reparo no sistema de ar-condicionado', defaultHours: 3, defaultRate: 120, categoria: 'ar_condicionado' },
  { code: 'CAM-001', desc: 'Revisão de câmbio automático', defaultHours: 8, defaultRate: 150, categoria: 'transmissao' },
  { code: 'TUR-001', desc: 'Reparo / troca de turbocompressor', defaultHours: 5, defaultRate: 140, categoria: 'turbo' },
  { code: 'INJ-001', desc: 'Limpeza / troca de bicos injetores', defaultHours: 3, defaultRate: 120, categoria: 'motor' },
  { code: 'DIR-001', desc: 'Reparo da caixa de direção', defaultHours: 4.5, defaultRate: 130, categoria: 'direcao' },
  { code: 'DIR-002', desc: 'Troca de bomba de direção', defaultHours: 2, defaultRate: 120, categoria: 'direcao' },
  { code: 'PNE-001', desc: 'Troca de pneu (unidade)', defaultHours: 0.5, defaultRate: 80, categoria: 'pneus' },
  { code: 'ESC-001', desc: 'Reparo do sistema de escapamento', defaultHours: 2, defaultRate: 100, categoria: 'escapamento' },
];

interface BudgetCreationFormProps {
  serviceOrder: FleetServiceOrder;
  vehicle: FleetVehicle;
  fleet: ReturnType<typeof useFleetData>;
  onClose: () => void;
  onSuccess: () => void;
}

export function BudgetCreationForm({ serviceOrder, vehicle, fleet, onClose, onSuccess }: BudgetCreationFormProps) {
  // ── Step state ──
  const [step, setStep] = useState<Step>(1);

  // ── Step 1: Identification ──
  const [kmAtual, setKmAtual] = useState(vehicle.km_atual || 0);
  const [fotoHodometro, setFotoHodometro] = useState<string | null>(null);
  const hodometroRef = useRef<HTMLInputElement>(null);

  // ── Step 2: Visual Checklist ──
  const [selectedZones, setSelectedZones] = useState<string[]>([]);
  const [damagePhotos, setDamagePhotos] = useState<{ id: string; url: string; zone: string }[]>([]);
  const damagePhotoRef = useRef<HTMLInputElement>(null);
  const [activePhotoZone, setActivePhotoZone] = useState<string | null>(null);

  // ── Step 3: Parts ──
  const [parts, setParts] = useState<BudgetPart[]>([]);
  const [searchPart, setSearchPart] = useState('');
  const [showPartCatalog, setShowPartCatalog] = useState(false);

  // ── Step 4: Labor ──
  const [labors, setLabors] = useState<BudgetLabor[]>([]);
  const [searchLabor, setSearchLabor] = useState('');
  const [showLaborCatalog, setShowLaborCatalog] = useState(false);

  // ── Step 5: Submit ──
  const [saving, setSaving] = useState(false);
  const [urgencia, setUrgencia] = useState<'normal' | 'urgente' | 'critico'>('normal');
  const [laudoTecnico, setLaudoTecnico] = useState('');

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // ── Totals ──
  const totalPecas = parts.reduce((s, p) => s + (p.valorUnitario * p.quantidade), 0);
  const totalMaoObra = labors.reduce((s, l) => s + (l.valorHora * l.horasPadrao), 0);
  const totalBruto = totalPecas + totalMaoObra;
  const comissao = totalBruto * 0.15;
  const totalLiquido = totalBruto - comissao;

  // ── Price validation (30% tolerance) ──
  const getPriceStatus = (valor: number, ref: number): 'ok' | 'atencao' | 'alto' => {
    if (ref <= 0) return 'ok';
    const ratio = valor / ref;
    if (ratio > 1.5) return 'alto';
    if (ratio > 1.3) return 'atencao';
    return 'ok';
  };

  // ── Catalog filters ──
  const relevantPartsCatalog = searchPart.length > 0
    ? partsCatalog.filter(p =>
        p.desc.toLowerCase().includes(searchPart.toLowerCase()) ||
        p.code.toLowerCase().includes(searchPart.toLowerCase()) ||
        p.marca.toLowerCase().includes(searchPart.toLowerCase())
      )
    : partsCatalog.filter(p => selectedZones.includes(p.categoria));

  const relevantServiceCatalog = searchLabor.length > 0
    ? serviceCatalog.filter(l =>
        l.desc.toLowerCase().includes(searchLabor.toLowerCase()) ||
        l.code.toLowerCase().includes(searchLabor.toLowerCase())
      )
    : serviceCatalog.filter(l => selectedZones.includes(l.categoria));

  // ── Handlers ──
  const handleHodometroPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if (reader.result) setFotoHodometro(reader.result as string); };
    reader.readAsDataURL(file);
  };

  const toggleZone = (zoneId: string) => {
    setSelectedZones(prev => prev.includes(zoneId) ? prev.filter(z => z !== zoneId) : [...prev, zoneId]);
  };

  const handleDamagePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files || !activePhotoZone) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setDamagePhotos(prev => [...prev, { id: Date.now().toString() + Math.random(), url: reader.result as string, zone: activePhotoZone }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const addPartFromCatalog = (item: typeof partsCatalog[0]) => {
    if (parts.find(p => p.codigo === item.code)) return; // prevent duplicates
    setParts(prev => [...prev, {
      id: Date.now().toString(),
      codigo: item.code,
      descricao: item.desc,
      marca: item.marca,
      quantidade: 1,
      valorUnitario: item.precoRef,
      tipo: 'original',
      precoRef: item.precoRef,
      justificativa: '',
    }]);
    setShowPartCatalog(false);
    setSearchPart('');
  };

  const addLaborFromCatalog = (item: typeof serviceCatalog[0]) => {
    if (labors.find(l => l.codigo === item.code)) return;
    setLabors(prev => [...prev, {
      id: Date.now().toString(),
      codigo: item.code,
      descricao: `[${item.code}] ${item.desc}`,
      horasPadrao: item.defaultHours,
      valorHora: item.defaultRate,
    }]);
    setShowLaborCatalog(false);
    setSearchLabor('');
  };

  // ── Step validation ──
  const canAdvance = (s: Step): boolean => {
    switch (s) {
      case 1: return kmAtual > 0 && !!fotoHodometro;
      case 2: return selectedZones.length > 0 && damagePhotos.length >= 2;
      case 3: return parts.length > 0 && parts.every(p => getPriceStatus(p.valorUnitario, p.precoRef) !== 'alto' || p.justificativa.trim().length > 0);
      case 4: return labors.length > 0;
      case 5: return true;
    }
  };

  const goNext = () => { if (step < 5 && canAdvance(step)) setStep((step + 1) as Step); };
  const goBack = () => { if (step > 1) setStep((step - 1) as Step); };

  // ── Submit ──
  const handleSubmit = async () => {
    setSaving(true);
    try {
      const cpId = (serviceOrder as any).customer_product_id;

      // Update vehicle KM
      await supabase.from('fleet_vehicles').update({ km_atual: kmAtual }).eq('id', vehicle.id);

      // 1. Create budget header
      const zonesLabel = selectedZones.map(z => damageZones.find(d => d.id === z)?.label || z).join(', ');
      const laudoFull = [
        laudoTecnico || 'Orçamento gerado via sistema NovaLink.',
        `\n**Áreas afetadas:** ${zonesLabel}`,
        `**KM atual:** ${kmAtual.toLocaleString()}`,
        `**Urgência:** ${urgencia === 'critico' ? '🔴 Crítico' : urgencia === 'urgente' ? '🟡 Urgente' : '🟢 Normal'}`,
        `**Fotos anexadas:** ${damagePhotos.length + (fotoHodometro ? 1 : 0)}`,
      ].join('\n');

      const { data: budget, error: budgetErr } = await supabase
        .from('fleet_budgets')
        .insert({
          service_order_id: serviceOrder.id,
          customer_product_id: cpId,
          laudo_tecnico: laudoFull,
          urgencia,
          status: 'pendente',
          total_pecas: totalPecas,
          total_mao_de_obra: totalMaoObra,
          total_bruto: totalBruto,
          comissao_pct: 15,
          total_liquido: totalLiquido,
        })
        .select()
        .single();

      if (budgetErr) throw budgetErr;

      // 2. Insert budget items
      const items: any[] = [];
      parts.forEach((p, i) => items.push({
        budget_id: (budget as any).id,
        tipo: 'peca',
        codigo: p.codigo,
        descricao: p.descricao,
        marca: p.marca,
        tipo_peca: p.tipo,
        quantidade: p.quantidade,
        valor_unitario: p.valorUnitario,
        valor_total: p.valorUnitario * p.quantidade,
        sort_order: i,
      }));
      labors.forEach((l, i) => items.push({
        budget_id: (budget as any).id,
        tipo: 'mao_de_obra',
        descricao: l.descricao,
        quantidade: 1,
        valor_unitario: l.valorHora * l.horasPadrao,
        valor_total: l.valorHora * l.horasPadrao,
        horas: l.horasPadrao,
        valor_hora: l.valorHora,
        sort_order: parts.length + i,
      }));

      if (items.length > 0) {
        const { error: itemsErr } = await supabase.from('fleet_budget_items').insert(items);
        if (itemsErr) throw itemsErr;
      }

      // 3. Build description + update stage
      const descricao = [
        `## ORÇAMENTO VALIDADO NOVALINK`,
        `**KM:** ${kmAtual.toLocaleString()} · **Áreas:** ${zonesLabel}`,
        '',
        `## PEÇAS (${parts.length} itens)`,
        ...parts.map(p => `• [${p.codigo}] ${p.descricao} — ${p.marca} (${p.tipo}) — ${p.quantidade}x ${fmt(p.valorUnitario)} = ${fmt(p.valorUnitario * p.quantidade)}`),
        '',
        `## MÃO DE OBRA (${labors.length} serviços)`,
        ...labors.map(l => `• ${l.descricao} — ${l.horasPadrao}h × ${fmt(l.valorHora)} = ${fmt(l.valorHora * l.horasPadrao)}`),
        '',
        `---`,
        `**Total Peças:** ${fmt(totalPecas)}`,
        `**Total Mão de Obra:** ${fmt(totalMaoObra)}`,
        `**TOTAL BRUTO:** ${fmt(totalBruto)}`,
        `**Selo NovaLink:** ✅ Validado`,
      ].join('\n');

      await fleet.updateStage(
        serviceOrder.id,
        'orcamento_enviado',
        'oficina',
        'Orçamento inteligente enviado para aprovação',
        { descricao_servico: descricao, valor_orcamento: totalBruto }
      );
      onSuccess();
    } catch (err) {
      console.error('Budget submit error:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Step config ──
  const stepConfig = [
    { num: 1, label: 'Identificação', icon: Car },
    { num: 2, label: 'Vistoria 360°', icon: Eye },
    { num: 3, label: 'Peças', icon: Package },
    { num: 4, label: 'Mão de Obra', icon: Wrench },
    { num: 5, label: 'Resumo & Envio', icon: Send },
  ];

  const priceStatusColors = {
    ok: 'border-emerald-500/30 bg-emerald-500/5',
    atencao: 'border-amber-500/30 bg-amber-500/10',
    alto: 'border-red-500/30 bg-red-500/10',
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      {/* ═══ HEADER ═══ */}
      <div className="sticky top-0 z-20 bg-card border-b border-border/60 shadow-sm">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center gap-3 py-3">
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-base font-bold text-foreground truncate">Orçamento Inteligente</h1>
              <p className="text-[11px] text-muted-foreground font-mono">OS #{serviceOrder.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="text-right shrink-0">
              <p className="font-mono font-bold text-sm text-foreground">{vehicle.placa}</p>
              <p className="text-[10px] text-muted-foreground">{vehicle.marca} {vehicle.modelo}</p>
            </div>
          </div>

          {/* Step progress */}
          <div className="flex items-center gap-1 pb-3 overflow-x-auto">
            {stepConfig.map((s) => {
              const Icon = s.icon;
              const active = s.num === step;
              const done = s.num < step;
              return (
                <button key={s.num} onClick={() => { if (s.num < step) setStep(s.num as Step); }}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                    active ? 'bg-primary text-primary-foreground' :
                    done ? 'bg-primary/10 text-primary cursor-pointer' :
                    'text-muted-foreground/50'
                  }`}>
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.num}</span>
                </button>
              );
            })}
          </div>
          <Progress value={(step / 5) * 100} className="h-1" />
        </div>
      </div>

      {/* ═══ CONTENT ═══ */}
      <div className="max-w-3xl mx-auto px-4 py-5 space-y-5">

        {/* ══════════════════════════════════════
            PASSO 1: TRAVA DE IDENTIFICAÇÃO
        ══════════════════════════════════════ */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Vehicle data - auto loaded */}
            <div className="bg-card border border-border/60 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Car className="w-5 h-5 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Veículo Identificado</h2>
                <Badge variant="secondary" className="ml-auto text-[10px]">Dados do sistema</Badge>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Placa</p>
                  <p className="font-mono font-bold text-foreground text-lg">{vehicle.placa}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Modelo</p>
                  <p className="font-semibold text-foreground">{vehicle.marca} {vehicle.modelo}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Ano</p>
                  <p className="font-semibold text-foreground">{vehicle.ano || vehicle.ano_modelo || 'N/I'}</p>
                </div>
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Combustível</p>
                  <p className="font-semibold text-foreground">{vehicle.combustivel || 'Diesel'}</p>
                </div>
                {vehicle.chassi && (
                  <div className="bg-muted/30 rounded-lg p-3 col-span-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Chassi</p>
                    <p className="font-mono text-xs text-foreground">{vehicle.chassi}</p>
                  </div>
                )}
              </div>
            </div>

            {/* KM input */}
            <div className="bg-card border border-border/60 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Gauge className="w-5 h-5 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Quilometragem Atual *</h2>
              </div>
              <Input
                type="number"
                value={kmAtual || ''}
                onChange={e => setKmAtual(parseInt(e.target.value) || 0)}
                placeholder="Ex: 185000"
                className="h-14 text-xl font-mono font-bold text-center"
              />
              <p className="text-[11px] text-muted-foreground mt-2 text-center">
                KM anterior registrado: {(vehicle.km_atual || 0).toLocaleString()} km
              </p>
            </div>

            {/* Odometer photo */}
            <div className="bg-card border border-border/60 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Camera className="w-5 h-5 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Foto do Hodômetro *</h2>
              </div>
              {fotoHodometro ? (
                <div className="relative">
                  <img src={fotoHodometro} alt="Hodômetro" className="w-full max-h-48 object-cover rounded-lg border border-border/60" />
                  <button onClick={() => setFotoHodometro(null)}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button onClick={() => hodometroRef.current?.click()}
                  className="w-full h-32 border-2 border-dashed border-border/60 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-primary/40 transition-colors active:scale-[0.98]">
                  <Camera className="w-8 h-8 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground font-medium">Tirar foto do painel</span>
                </button>
              )}
              <input ref={hodometroRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleHodometroPhoto} />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            PASSO 2: CHECKLIST VISUAL 360°
        ══════════════════════════════════════ */}
        {step === 2 && (
          <div className="space-y-5">
            <div className="bg-card border border-border/60 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Áreas Afetadas *</h2>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Toque nas áreas do veículo com problema. Selecione pelo menos uma.
              </p>

              {/* Blueprint grid */}
              <div className="relative bg-muted/20 border border-border/40 rounded-xl p-4 min-h-[280px]">
                {/* Truck outline */}
                <div className="absolute inset-4 border-2 border-dashed border-border/30 rounded-xl" />
                <div className="absolute top-6 left-1/2 -translate-x-1/2 text-[10px] text-muted-foreground/50 font-semibold uppercase tracking-widest">
                  Blueprint do Veículo
                </div>

                {/* Clickable zones */}
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 pt-6">
                  {damageZones.map(zone => {
                    const selected = selectedZones.includes(zone.id);
                    const photosCount = damagePhotos.filter(p => p.zone === zone.id).length;
                    return (
                      <button key={zone.id} onClick={() => toggleZone(zone.id)}
                        className={`relative flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-center active:scale-95 ${
                          selected
                            ? 'border-primary bg-primary/10 text-primary shadow-sm'
                            : 'border-border/40 bg-card text-muted-foreground hover:border-border'
                        }`}>
                        <AlertTriangle className={`w-4 h-4 ${selected ? 'text-primary' : 'text-muted-foreground/50'}`} />
                        <span className="text-[10px] font-semibold leading-tight">{zone.label}</span>
                        {photosCount > 0 && (
                          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold flex items-center justify-center">
                            {photosCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-3">
                <span className="font-semibold text-foreground">{selectedZones.length}</span> área(s) selecionada(s)
              </p>
            </div>

            {/* Damage photos */}
            <div className="bg-card border border-border/60 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Camera className="w-5 h-5 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Fotos do Problema *</h2>
                <Badge variant={damagePhotos.length >= 2 ? 'default' : 'secondary'} className="ml-auto text-[10px]">
                  {damagePhotos.length}/2 mín.
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Tire pelo menos 2 fotos mostrando o problema no veículo.
              </p>

              {selectedZones.length > 0 ? (
                <div className="space-y-3">
                  {selectedZones.map(zoneId => {
                    const zone = damageZones.find(z => z.id === zoneId);
                    const zonePhotos = damagePhotos.filter(p => p.zone === zoneId);
                    return (
                      <div key={zoneId} className="bg-muted/20 border border-border/30 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-foreground">{zone?.label}</span>
                          <button onClick={() => { setActivePhotoZone(zoneId); damagePhotoRef.current?.click(); }}
                            className="flex items-center gap-1 text-xs text-primary font-semibold hover:underline active:scale-95">
                            <Camera className="w-3.5 h-3.5" /> Foto
                          </button>
                        </div>
                        <div className="flex gap-2 flex-wrap">
                          {zonePhotos.map(p => (
                            <div key={p.id} className="relative group">
                              <img src={p.url} alt="" className="w-20 h-20 rounded-lg object-cover border border-border/60" />
                              <button onClick={() => setDamagePhotos(prev => prev.filter(x => x.id !== p.id))}
                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                          {zonePhotos.length === 0 && (
                            <button onClick={() => { setActivePhotoZone(zoneId); damagePhotoRef.current?.click(); }}
                              className="w-20 h-20 border-2 border-dashed border-border/40 rounded-lg flex items-center justify-center active:scale-95">
                              <Plus className="w-5 h-5 text-muted-foreground" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Eye className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Selecione as áreas afetadas acima primeiro</p>
                </div>
              )}
              <input ref={damagePhotoRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleDamagePhoto} />
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            PASSO 3: CATÁLOGO FECHADO DE PEÇAS
        ══════════════════════════════════════ */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="bg-card border border-border/60 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Package className="w-5 h-5 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Catálogo de Peças NovaLink</h2>
                <Badge variant="secondary" className="ml-auto text-[10px]">{parts.length} itens</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {selectedZones.length > 0
                  ? 'Mostrando peças compatíveis com as áreas selecionadas. Use a busca para filtrar.'
                  : 'Busque peças no catálogo padronizado.'
                }
              </p>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar peça... (filtro, pastilha, correia, pneu)"
                  value={searchPart}
                  onChange={e => { setSearchPart(e.target.value); setShowPartCatalog(true); }}
                  onFocus={() => setShowPartCatalog(true)}
                  className="pl-10 h-12 text-base"
                />
                {showPartCatalog && (searchPart || selectedZones.length > 0) && relevantPartsCatalog.length > 0 && (
                  <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto">
                    {relevantPartsCatalog.map(p => {
                      const alreadyAdded = parts.some(x => x.codigo === p.code);
                      return (
                        <button key={p.code} onClick={() => !alreadyAdded && addPartFromCatalog(p)} disabled={alreadyAdded}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border/30 last:border-0 transition-colors ${
                            alreadyAdded ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted/50 active:bg-muted/70'
                          }`}>
                          <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{p.code}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{p.desc}</p>
                            <p className="text-[11px] text-muted-foreground">{p.marca}</p>
                          </div>
                          <span className="text-sm font-semibold text-foreground shrink-0">{fmt(p.precoRef)}</span>
                          {alreadyAdded ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> : <Plus className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Added parts */}
              {parts.length === 0 ? (
                <div className="text-center py-8 bg-muted/10 rounded-xl border border-dashed border-border/40">
                  <Package className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Busque e selecione peças do catálogo acima</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {parts.map((part) => {
                    const status = getPriceStatus(part.valorUnitario, part.precoRef);
                    return (
                      <div key={part.id} className={`border-2 rounded-xl p-4 transition-colors ${priceStatusColors[status]}`}>
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{part.codigo}</span>
                              <span className="text-xs text-muted-foreground">{part.marca}</span>
                            </div>
                            <p className="text-sm font-semibold text-foreground">{part.descricao}</p>

                            <div className="grid grid-cols-3 gap-2 mt-3">
                              <div>
                                <label className="text-[10px] text-muted-foreground mb-0.5 block">Qtd</label>
                                <Input type="number" min={1} value={part.quantidade}
                                  onChange={e => setParts(prev => prev.map(p => p.id === part.id ? { ...p, quantidade: parseInt(e.target.value) || 1 } : p))}
                                  className="h-10 text-sm font-mono text-center" />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground mb-0.5 block">Valor (R$)</label>
                                <Input type="number" step="0.01" value={part.valorUnitario}
                                  onChange={e => setParts(prev => prev.map(p => p.id === part.id ? { ...p, valorUnitario: parseFloat(e.target.value) || 0 } : p))}
                                  className="h-10 text-sm font-mono text-center" />
                              </div>
                              <div>
                                <label className="text-[10px] text-muted-foreground mb-0.5 block">Tipo</label>
                                <select value={part.tipo}
                                  onChange={e => setParts(prev => prev.map(p => p.id === part.id ? { ...p, tipo: e.target.value as any } : p))}
                                  className="w-full h-10 rounded-md border border-input bg-background px-2 text-xs">
                                  <option value="original">Original</option>
                                  <option value="paralela">Paralela</option>
                                  <option value="recondicionada">Recond.</option>
                                </select>
                              </div>
                            </div>

                            {/* Price alert */}
                            {status === 'atencao' && (
                              <div className="mt-2 flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                <CircleAlert className="w-3.5 h-3.5 shrink-0" />
                                <span className="text-[11px] font-medium">Valor acima da tabela regional (ref: {fmt(part.precoRef)})</span>
                              </div>
                            )}
                            {status === 'alto' && (
                              <div className="mt-2 space-y-1.5">
                                <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400">
                                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                  <span className="text-[11px] font-bold">Valor acima da tabela regional, justifique ou ajuste</span>
                                </div>
                                <Textarea
                                  placeholder="Justificativa obrigatória para valor acima da referência..."
                                  value={part.justificativa}
                                  onChange={e => setParts(prev => prev.map(p => p.id === part.id ? { ...p, justificativa: e.target.value } : p))}
                                  rows={2} className="text-xs"
                                />
                              </div>
                            )}

                            <p className="mt-2 text-xs text-muted-foreground">
                              Subtotal: <span className="font-bold text-foreground">{fmt(part.valorUnitario * part.quantidade)}</span>
                            </p>
                          </div>
                          <button onClick={() => setParts(prev => prev.filter(p => p.id !== part.id))}
                            className="text-muted-foreground hover:text-destructive transition-colors p-1">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {parts.length > 0 && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/40">
                  <span className="text-sm font-medium text-muted-foreground">Total Peças</span>
                  <span className="text-xl font-bold text-foreground font-mono">{fmt(totalPecas)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            PASSO 4: TABELA DE TEMPO PADRÃO
        ══════════════════════════════════════ */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="bg-card border border-border/60 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-1">
                <Wrench className="w-5 h-5 text-primary" />
                <h2 className="text-sm font-bold text-foreground">Serviços — Tempo Padrão</h2>
                <Badge variant="secondary" className="ml-auto text-[10px]">{labors.length} serviços</Badge>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                Selecione os serviços. O tempo é pré-definido pelo sistema NovaLink — sem edição manual.
              </p>

              {/* Search */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar serviço... (revisão, embreagem, freio)"
                  value={searchLabor}
                  onChange={e => { setSearchLabor(e.target.value); setShowLaborCatalog(true); }}
                  onFocus={() => setShowLaborCatalog(true)}
                  className="pl-10 h-12 text-base"
                />
                {showLaborCatalog && (searchLabor || selectedZones.length > 0) && relevantServiceCatalog.length > 0 && (
                  <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-card border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto">
                    {relevantServiceCatalog.map(l => {
                      const alreadyAdded = labors.some(x => x.codigo === l.code);
                      return (
                        <button key={l.code} onClick={() => !alreadyAdded && addLaborFromCatalog(l)} disabled={alreadyAdded}
                          className={`w-full flex items-center gap-3 px-4 py-3 text-left border-b border-border/30 last:border-0 transition-colors ${
                            alreadyAdded ? 'opacity-40 cursor-not-allowed' : 'hover:bg-muted/50 active:bg-muted/70'
                          }`}>
                          <span className="text-[9px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{l.code}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{l.desc}</p>
                            <p className="text-[11px] text-muted-foreground">{l.defaultHours}h × {fmt(l.defaultRate)}/h</p>
                          </div>
                          <span className="text-sm font-semibold text-foreground shrink-0">{fmt(l.defaultHours * l.defaultRate)}</span>
                          {alreadyAdded ? <CheckCircle2 className="w-4 h-4 text-primary shrink-0" /> : <Plus className="w-4 h-4 text-primary shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Added labors */}
              {labors.length === 0 ? (
                <div className="text-center py-8 bg-muted/10 rounded-xl border border-dashed border-border/40">
                  <Wrench className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Selecione os serviços no catálogo acima</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {labors.map((labor) => (
                    <div key={labor.id} className="border border-border/50 rounded-xl p-4 bg-card flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{labor.descricao}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <ClipboardCheck className="w-3 h-3" />
                            <span className="font-mono font-bold text-foreground">{labor.horasPadrao}h</span> tempo padrão
                          </span>
                          <span>×</span>
                          <span className="font-mono font-bold text-foreground">{fmt(labor.valorHora)}/h</span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-mono font-bold text-foreground">{fmt(labor.valorHora * labor.horasPadrao)}</p>
                      </div>
                      <button onClick={() => setLabors(prev => prev.filter(l => l.id !== labor.id))}
                        className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {labors.length > 0 && (
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/40">
                  <span className="text-sm font-medium text-muted-foreground">Total Mão de Obra</span>
                  <span className="text-xl font-bold text-foreground font-mono">{fmt(totalMaoObra)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════
            PASSO 5: RESUMO EXECUTIVO & ENVIO
        ══════════════════════════════════════ */}
        {step === 5 && (
          <div className="space-y-5">
            {/* Seal */}
            <div className="bg-emerald-500/5 border-2 border-emerald-500/30 rounded-xl p-5 text-center">
              <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-4 py-2 rounded-full mb-3">
                <Shield className="w-5 h-5" />
                <span className="text-sm font-bold">Selo de Validação NovaLink</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Todos os itens passaram pela auditoria de preço e são compatíveis com o veículo {vehicle.placa}.
              </p>
            </div>

            {/* Urgency */}
            <div className="bg-card border border-border/60 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-foreground mb-3">Nível de Urgência</h3>
              <div className="flex gap-2">
                {([
                  { v: 'normal' as const, label: '🟢 Normal', cls: 'border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' },
                  { v: 'urgente' as const, label: '🟡 Urgente', cls: 'border-amber-500 bg-amber-500/10 text-amber-600 dark:text-amber-400' },
                  { v: 'critico' as const, label: '🔴 Crítico', cls: 'border-red-500 bg-red-500/10 text-red-600 dark:text-red-400' },
                ]).map(u => (
                  <button key={u.v} onClick={() => setUrgencia(u.v)}
                    className={`flex-1 py-3 rounded-xl text-xs font-bold border-2 transition-all active:scale-95 ${
                      urgencia === u.v ? u.cls : 'border-border/40 text-muted-foreground'
                    }`}>
                    {u.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional note */}
            <div className="bg-card border border-border/60 rounded-xl p-5">
              <h3 className="text-xs font-semibold text-foreground mb-2">Observação Técnica (opcional)</h3>
              <Textarea
                rows={3}
                placeholder="Informações adicionais para o gestor de frota..."
                value={laudoTecnico}
                onChange={e => setLaudoTecnico(e.target.value)}
                className="text-sm"
              />
            </div>

            {/* Vehicle summary */}
            <div className="bg-card border border-border/60 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <Car className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-mono font-bold text-foreground">{vehicle.placa}</p>
                  <p className="text-xs text-muted-foreground">{vehicle.marca} {vehicle.modelo} · {kmAtual.toLocaleString()} km</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {selectedZones.map(z => (
                  <Badge key={z} variant="outline" className="text-[10px]">
                    {damageZones.find(d => d.id === z)?.label}
                  </Badge>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-2">
                {damagePhotos.length + (fotoHodometro ? 1 : 0)} foto(s) anexada(s)
              </p>
            </div>

            {/* Parts table */}
            {parts.length > 0 && (
              <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground">Peças ({parts.length})</h3>
                  <span className="font-mono font-bold text-foreground text-sm">{fmt(totalPecas)}</span>
                </div>
                <div className="divide-y divide-border/30">
                  {parts.map(p => (
                    <div key={p.id} className="px-5 py-2.5 flex items-center justify-between text-xs">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground">{p.descricao}</span>
                        <span className="text-muted-foreground ml-2">{p.quantidade}x</span>
                      </div>
                      <span className="font-mono font-semibold text-foreground">{fmt(p.valorUnitario * p.quantidade)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Labor table */}
            {labors.length > 0 && (
              <div className="bg-card border border-border/60 rounded-xl overflow-hidden">
                <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
                  <h3 className="text-xs font-bold text-foreground">Mão de Obra ({labors.length})</h3>
                  <span className="font-mono font-bold text-foreground text-sm">{fmt(totalMaoObra)}</span>
                </div>
                <div className="divide-y divide-border/30">
                  {labors.map(l => (
                    <div key={l.id} className="px-5 py-2.5 flex items-center justify-between text-xs">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-foreground">{l.descricao}</span>
                        <span className="text-muted-foreground ml-2">{l.horasPadrao}h</span>
                      </div>
                      <span className="font-mono font-semibold text-foreground">{fmt(l.valorHora * l.horasPadrao)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Grand total */}
            <div className="bg-card border-2 border-primary/30 rounded-xl p-5 space-y-2.5">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Peças</span>
                <span className="font-mono font-semibold text-foreground">{fmt(totalPecas)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Mão de Obra</span>
                <span className="font-mono font-semibold text-foreground">{fmt(totalMaoObra)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg">
                <span className="font-bold text-foreground">Total Bruto</span>
                <span className="font-mono font-bold text-foreground">{fmt(totalBruto)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Comissão NovaLink (15%)</span>
                <span className="font-mono text-destructive">-{fmt(comissao)}</span>
              </div>
              <div className="flex justify-between text-lg pt-2 border-t border-border/40">
                <span className="font-bold text-foreground">Líquido Oficina</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalLiquido)}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══ BOTTOM ACTION BAR ═══ */}
      <div className="fixed bottom-0 left-0 right-0 z-20 bg-card border-t border-border/60 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          {step > 1 && (
            <Button variant="outline" onClick={goBack} className="gap-1.5 h-12 px-5">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
          )}
          <div className="flex-1" />
          {step < 5 ? (
            <Button onClick={goNext} disabled={!canAdvance(step)} className="gap-2 h-12 px-6 text-base font-semibold">
              Próximo <span className="text-xs opacity-70">({step}/5)</span>
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving || (parts.length === 0 && labors.length === 0)}
              className="gap-2 h-14 px-8 text-base font-bold bg-emerald-600 hover:bg-emerald-700 text-white">
              {saving ? 'Enviando...' : (
                <>
                  <Send className="w-5 h-5" />
                  Enviar para o Cliente
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
