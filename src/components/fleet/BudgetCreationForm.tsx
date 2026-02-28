import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Car, ArrowLeft, Plus, Trash2, Camera, X, Send, FileText,
  Wrench, Package, ClipboardCheck, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, Search, Info, DollarSign, Hash
} from 'lucide-react';
import type { useFleetData, FleetServiceOrder, FleetVehicle } from '@/hooks/useFleetData';

// ── Types ──
interface BudgetPart {
  id: string;
  codigo: string;
  descricao: string;
  marca: string;
  quantidade: number;
  valorUnitario: number;
  tipo: 'original' | 'paralela' | 'recondicionada';
}

interface BudgetLabor {
  id: string;
  descricao: string;
  tempo: string;
  valorHora: number;
  horas: number;
}

interface BudgetPhoto {
  id: string;
  url: string;
  legenda: string;
}

// ── Pre-defined services catalog ──
const serviceCatalog = [
  { code: 'REV-050', desc: 'Revisão dos 50.000 km', defaultHours: 4, defaultRate: 120 },
  { code: 'REV-100', desc: 'Revisão dos 100.000 km', defaultHours: 6, defaultRate: 120 },
  { code: 'FRE-001', desc: 'Substituição de pastilhas de freio (eixo)', defaultHours: 1.5, defaultRate: 110 },
  { code: 'FRE-002', desc: 'Substituição de discos de freio (eixo)', defaultHours: 2, defaultRate: 110 },
  { code: 'FRE-003', desc: 'Regulagem de freio a tambor', defaultHours: 1, defaultRate: 100 },
  { code: 'MOT-001', desc: 'Troca de óleo e filtro do motor', defaultHours: 1, defaultRate: 100 },
  { code: 'MOT-002', desc: 'Troca de correia dentada / alternador', defaultHours: 3.5, defaultRate: 130 },
  { code: 'MOT-003', desc: 'Retífica de motor', defaultHours: 24, defaultRate: 150 },
  { code: 'SUS-001', desc: 'Troca de amortecedores (par)', defaultHours: 2.5, defaultRate: 110 },
  { code: 'SUS-002', desc: 'Alinhamento e balanceamento', defaultHours: 1, defaultRate: 80 },
  { code: 'SUS-003', desc: 'Troca de molas / feixe de molas', defaultHours: 4, defaultRate: 120 },
  { code: 'EMB-001', desc: 'Substituição de embreagem completa', defaultHours: 6, defaultRate: 140 },
  { code: 'ELE-001', desc: 'Diagnóstico elétrico completo', defaultHours: 2, defaultRate: 100 },
  { code: 'ELE-002', desc: 'Troca de alternador / motor de partida', defaultHours: 2, defaultRate: 110 },
  { code: 'ARR-001', desc: 'Reparo no sistema de ar-condicionado', defaultHours: 3, defaultRate: 120 },
  { code: 'CAM-001', desc: 'Revisão de câmbio automático', defaultHours: 8, defaultRate: 150 },
  { code: 'TUR-001', desc: 'Reparo / troca de turbocompressor', defaultHours: 5, defaultRate: 140 },
  { code: 'INJ-001', desc: 'Limpeza / troca de bicos injetores', defaultHours: 3, defaultRate: 120 },
];

// ── Parts catalog ──
const partsCatalog = [
  { code: 'FLT-OL-001', desc: 'Filtro de óleo motor', marca: 'Mann', precoRef: 45 },
  { code: 'FLT-AR-001', desc: 'Filtro de ar motor', marca: 'Mann', precoRef: 65 },
  { code: 'FLT-CB-001', desc: 'Filtro de combustível', marca: 'Bosch', precoRef: 85 },
  { code: 'FLT-AC-001', desc: 'Filtro de ar-condicionado', marca: 'Mann', precoRef: 55 },
  { code: 'OLE-001', desc: 'Óleo motor 15W40 (litro)', marca: 'Shell', precoRef: 32 },
  { code: 'PAS-001', desc: 'Jogo de pastilhas de freio', marca: 'Fras-le', precoRef: 180 },
  { code: 'DIS-001', desc: 'Disco de freio ventilado', marca: 'Fremax', precoRef: 320 },
  { code: 'AMO-001', desc: 'Amortecedor dianteiro', marca: 'Monroe', precoRef: 450 },
  { code: 'COR-001', desc: 'Kit correia dentada + tensor', marca: 'Gates', precoRef: 380 },
  { code: 'EMB-KIT', desc: 'Kit embreagem completo', marca: 'Sachs', precoRef: 1200 },
  { code: 'BAT-001', desc: 'Bateria 12V 150Ah', marca: 'Moura', precoRef: 680 },
  { code: 'VEL-001', desc: 'Vela de ignição (unidade)', marca: 'NGK', precoRef: 35 },
  { code: 'RAD-001', desc: 'Radiador completo', marca: 'Visconde', precoRef: 890 },
  { code: 'TUR-001', desc: 'Turbocompressor recondicionado', marca: 'BorgWarner', precoRef: 3200 },
  { code: 'BIC-001', desc: 'Bico injetor (unidade)', marca: 'Bosch', precoRef: 450 },
];

interface BudgetCreationFormProps {
  serviceOrder: FleetServiceOrder;
  vehicle: FleetVehicle;
  fleet: ReturnType<typeof useFleetData>;
  onClose: () => void;
  onSuccess: () => void;
}

export function BudgetCreationForm({ serviceOrder, vehicle, fleet, onClose, onSuccess }: BudgetCreationFormProps) {
  // ── State ──
  const [step, setStep] = useState<'laudo' | 'pecas' | 'mao_obra' | 'resumo'>('laudo');
  const [laudoTecnico, setLaudoTecnico] = useState('');
  const [esclarecimento, setEsclarecimento] = useState('');
  const [condicaoGeral, setCondicaoGeral] = useState('');
  const [urgencia, setUrgencia] = useState<'normal' | 'urgente' | 'critico'>('normal');
  const [parts, setParts] = useState<BudgetPart[]>([]);
  const [labors, setLabors] = useState<BudgetLabor[]>([]);
  const [photos, setPhotos] = useState<BudgetPhoto[]>([]);
  const [saving, setSaving] = useState(false);
  const [searchPart, setSearchPart] = useState('');
  const [searchLabor, setSearchLabor] = useState('');
  const [showPartCatalog, setShowPartCatalog] = useState(false);
  const [showLaborCatalog, setShowLaborCatalog] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // ── Totals ──
  const totalPecas = parts.reduce((s, p) => s + (p.valorUnitario * p.quantidade), 0);
  const totalMaoObra = labors.reduce((s, l) => s + (l.valorHora * l.horas), 0);
  const totalBruto = totalPecas + totalMaoObra;
  const comissao = totalBruto * 0.15;
  const totalLiquido = totalBruto - comissao;

  // ── Add Part ──
  const addPartFromCatalog = (item: typeof partsCatalog[0]) => {
    setParts(prev => [...prev, {
      id: Date.now().toString(),
      codigo: item.code,
      descricao: item.desc,
      marca: item.marca,
      quantidade: 1,
      valorUnitario: item.precoRef,
      tipo: 'original',
    }]);
    setShowPartCatalog(false);
    setSearchPart('');
  };

  const addCustomPart = () => {
    setParts(prev => [...prev, {
      id: Date.now().toString(),
      codigo: '',
      descricao: '',
      marca: '',
      quantidade: 1,
      valorUnitario: 0,
      tipo: 'original',
    }]);
  };

  // ── Add Labor ──
  const addLaborFromCatalog = (item: typeof serviceCatalog[0]) => {
    setLabors(prev => [...prev, {
      id: Date.now().toString(),
      descricao: `[${item.code}] ${item.desc}`,
      tempo: `${item.defaultHours}h`,
      valorHora: item.defaultRate,
      horas: item.defaultHours,
    }]);
    setShowLaborCatalog(false);
    setSearchLabor('');
  };

  const addCustomLabor = () => {
    setLabors(prev => [...prev, {
      id: Date.now().toString(),
      descricao: '',
      tempo: '',
      valorHora: 0,
      horas: 1,
    }]);
  };

  // ── Photos ──
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          setPhotos(prev => [...prev, { id: Date.now().toString() + Math.random(), url: reader.result as string, legenda: '' }]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // ── Submit ──
  const handleSubmit = async () => {
    setSaving(true);
    try {
      const cpId = (serviceOrder as any).customer_product_id;

      // 1. Create budget header
      const { data: budget, error: budgetErr } = await supabase
        .from('fleet_budgets')
        .insert({
          service_order_id: serviceOrder.id,
          customer_product_id: cpId,
          laudo_tecnico: [laudoTecnico, esclarecimento, condicaoGeral].filter(Boolean).join('\n\n---\n\n'),
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

      // 2. Insert budget items (parts + labor)
      const items: any[] = [];
      parts.forEach((p, i) => items.push({
        budget_id: (budget as any).id,
        tipo: 'peca',
        codigo: p.codigo || null,
        descricao: p.descricao,
        marca: p.marca || null,
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
        valor_unitario: l.valorHora * l.horas,
        valor_total: l.valorHora * l.horas,
        horas: l.horas,
        valor_hora: l.valorHora,
        sort_order: parts.length + i,
      }));

      if (items.length > 0) {
        const { error: itemsErr } = await supabase
          .from('fleet_budget_items')
          .insert(items);
        if (itemsErr) throw itemsErr;
      }

      // 3. Build description + update stage
      const descricao = [
        `## LAUDO TÉCNICO`, laudoTecnico, '',
        esclarecimento ? `## ESCLARECIMENTO TÉCNICO\n${esclarecimento}\n` : '',
        condicaoGeral ? `## CONDIÇÃO GERAL\n${condicaoGeral}\n` : '',
        `**Urgência:** ${urgencia === 'critico' ? '🔴 Crítico' : urgencia === 'urgente' ? '🟡 Urgente' : '🟢 Normal'}`, '',
        `## PEÇAS (${parts.length} itens)`,
        ...parts.map(p => `• [${p.codigo || 'S/C'}] ${p.descricao} — ${p.marca} (${p.tipo}) — ${p.quantidade}x ${fmt(p.valorUnitario)} = ${fmt(p.valorUnitario * p.quantidade)}`), '',
        `## MÃO DE OBRA (${labors.length} serviços)`,
        ...labors.map(l => `• ${l.descricao} — ${l.horas}h × ${fmt(l.valorHora)} = ${fmt(l.valorHora * l.horas)}`), '',
        `---`,
        `**Total Peças:** ${fmt(totalPecas)}`,
        `**Total Mão de Obra:** ${fmt(totalMaoObra)}`,
        `**TOTAL BRUTO:** ${fmt(totalBruto)}`,
      ].filter(Boolean).join('\n');

      await fleet.updateStage(
        serviceOrder.id,
        'orcamento_enviado',
        'oficina',
        'Orçamento detalhado enviado para aprovação',
        { descricao_servico: descricao, valor_orcamento: totalBruto }
      );
      onSuccess();
    } catch (err) {
      console.error('Budget submit error:', err);
    } finally {
      setSaving(false);
    }
  };

  // ── Step indicators ──
  const steps = [
    { key: 'laudo', label: 'Laudo Técnico', icon: ClipboardCheck },
    { key: 'pecas', label: 'Peças', icon: Package },
    { key: 'mao_obra', label: 'Mão de Obra', icon: Wrench },
    { key: 'resumo', label: 'Resumo & Envio', icon: Send },
  ] as const;

  const stepIndex = steps.findIndex(s => s.key === step);

  const filteredParts = partsCatalog.filter(p =>
    p.desc.toLowerCase().includes(searchPart.toLowerCase()) ||
    p.code.toLowerCase().includes(searchPart.toLowerCase())
  );

  const filteredLabors = serviceCatalog.filter(l =>
    l.desc.toLowerCase().includes(searchLabor.toLowerCase()) ||
    l.code.toLowerCase().includes(searchLabor.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-card border-b border-border/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="flex items-center gap-4 py-4">
            <Button variant="ghost" size="sm" onClick={onClose} className="gap-1.5">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground">Elaborar Orçamento</h1>
              <p className="text-xs text-muted-foreground">Ordem de Serviço #{serviceOrder.id.slice(0, 8).toUpperCase()}</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <Car className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-right">
                <p className="font-mono font-bold text-sm text-foreground">{vehicle.placa}</p>
                <p className="text-[11px] text-muted-foreground">{vehicle.marca} {vehicle.modelo}</p>
              </div>
            </div>
          </div>

          {/* Vehicle info bar */}
          <div className="flex flex-wrap items-center gap-3 pb-3 text-xs text-muted-foreground">
            <Badge variant="outline" className="gap-1 font-normal">
              <Hash className="w-3 h-3" /> Chassi: {vehicle.chassi || 'N/I'}
            </Badge>
            <Badge variant="outline" className="gap-1 font-normal">
              KM: {(vehicle.km_atual || 0).toLocaleString()}
            </Badge>
            <Badge variant="outline" className="gap-1 font-normal">
              Cor: {vehicle.cor || 'N/I'}
            </Badge>
            <Badge variant="outline" className="gap-1 font-normal">
              Ano: {vehicle.ano || vehicle.ano_modelo || 'N/I'}
            </Badge>
            {vehicle.combustivel && (
              <Badge variant="outline" className="gap-1 font-normal">
                {vehicle.combustivel}
              </Badge>
            )}
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-1 pb-4 overflow-x-auto">
            {steps.map((s, i) => {
              const Icon = s.icon;
              const active = i === stepIndex;
              const done = i < stepIndex;
              return (
                <button key={s.key} onClick={() => setStep(s.key)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                    active ? 'bg-primary text-primary-foreground' :
                    done ? 'bg-primary/10 text-primary' :
                    'text-muted-foreground hover:bg-muted/50'
                  }`}>
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Icon className="w-3.5 h-3.5" />}
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">

        {/* ══════ STEP 1: LAUDO TÉCNICO ══════ */}
        {step === 'laudo' && (
          <div className="space-y-6">
            {/* Problema reportado pelo gestor */}
            {serviceOrder.descricao_servico && (
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-1">Relato do Gestor de Frota</p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{serviceOrder.descricao_servico}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-card border border-border/60 rounded-lg">
              <div className="px-5 py-4 border-b border-border/40">
                <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <ClipboardCheck className="w-4 h-4 text-primary" /> Laudo Técnico
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">Descreva o diagnóstico técnico detalhado após a inspeção do veículo.</p>
              </div>
              <div className="p-5 space-y-5">
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Diagnóstico Técnico *</label>
                  <Textarea
                    rows={5}
                    placeholder="Descreva detalhadamente o diagnóstico após inspeção visual e instrumental. Ex: Após inspeção no elevador, constatamos desgaste irregular nas pastilhas de freio do eixo dianteiro (3mm restantes), disco com sulcos profundos necessitando troca..."
                    value={laudoTecnico}
                    onChange={e => setLaudoTecnico(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Esclarecimento Técnico</label>
                  <Textarea
                    rows={4}
                    placeholder="Justificativa técnica para os serviços propostos. Ex: A troca das pastilhas se faz necessária pois a espessura mínima de segurança é de 4mm conforme especificação do fabricante. O disco apresenta empeno de 0.15mm além do tolerável..."
                    value={esclarecimento}
                    onChange={e => setEsclarecimento(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Condição Geral do Veículo</label>
                  <Textarea
                    rows={3}
                    placeholder="Estado geral: pintura, pneus, lataria, interior, nível de fluidos, estado da bateria..."
                    value={condicaoGeral}
                    onChange={e => setCondicaoGeral(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Nível de Urgência</label>
                  <div className="flex gap-2">
                    {([
                      { value: 'normal' as const, label: 'Normal', color: 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400', activeColor: 'border-emerald-500 bg-emerald-500/15' },
                      { value: 'urgente' as const, label: 'Urgente', color: 'border-amber-500/30 bg-amber-500/5 text-amber-600 dark:text-amber-400', activeColor: 'border-amber-500 bg-amber-500/15' },
                      { value: 'critico' as const, label: 'Crítico — Risco', color: 'border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400', activeColor: 'border-red-500 bg-red-500/15' },
                    ]).map(u => (
                      <button key={u.value} onClick={() => setUrgencia(u.value)}
                        className={`flex-1 py-2.5 rounded-md text-xs font-semibold border transition-colors ${urgencia === u.value ? u.activeColor + ' ' + u.color : 'border-border/60 text-muted-foreground hover:bg-muted/50'}`}>
                        {u.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Fotos */}
                <div>
                  <label className="text-xs font-medium text-foreground mb-1.5 block">Evidências Fotográficas</label>
                  <div className="flex flex-wrap gap-3">
                    {photos.map(p => (
                      <div key={p.id} className="relative group">
                        <div className="w-24 h-24 rounded-lg overflow-hidden border border-border/60">
                          <img src={p.url} alt="" className="w-full h-full object-cover" />
                        </div>
                        <button onClick={() => setPhotos(prev => prev.filter(x => x.id !== p.id))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    <button onClick={() => fileRef.current?.click()}
                      className="w-24 h-24 rounded-lg border-2 border-dashed border-border/60 hover:border-primary/40 flex flex-col items-center justify-center gap-1.5 transition-colors">
                      <Camera className="w-5 h-5 text-muted-foreground" />
                      <span className="text-[10px] text-muted-foreground">Adicionar</span>
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handlePhotoUpload} />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => setStep('pecas')} className="gap-2" disabled={!laudoTecnico.trim()}>
                Próximo: Peças <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
              </Button>
            </div>
          </div>
        )}

        {/* ══════ STEP 2: PEÇAS ══════ */}
        {step === 'pecas' && (
          <div className="space-y-5">
            <div className="bg-card border border-border/60 rounded-lg">
              <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" /> Peças e Componentes
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Adicione as peças necessárias a partir do catálogo ou manualmente.</p>
                </div>
                <Badge variant="secondary">{parts.length} {parts.length === 1 ? 'item' : 'itens'}</Badge>
              </div>

              <div className="p-5 space-y-4">
                {/* Catalog search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar peça no catálogo... (ex: filtro, pastilha, correia)"
                    value={searchPart}
                    onChange={e => { setSearchPart(e.target.value); setShowPartCatalog(true); }}
                    onFocus={() => setShowPartCatalog(true)}
                    className="pl-10 h-11"
                  />
                  {showPartCatalog && searchPart && (
                    <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {filteredParts.length === 0 ? (
                        <p className="p-4 text-xs text-muted-foreground text-center">Nenhuma peça encontrada</p>
                      ) : filteredParts.map(p => (
                        <button key={p.code} onClick={() => addPartFromCatalog(p)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/30 last:border-0">
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{p.code}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{p.desc}</p>
                            <p className="text-[11px] text-muted-foreground">{p.marca}</p>
                          </div>
                          <span className="text-sm font-semibold text-foreground shrink-0">{fmt(p.precoRef)}</span>
                          <Plus className="w-3.5 h-3.5 text-primary shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button variant="outline" size="sm" onClick={addCustomPart} className="gap-1.5 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Adicionar peça manual
                </Button>

                {/* Parts list */}
                {parts.length === 0 && (
                  <div className="bg-muted/20 border border-border/30 rounded-lg p-8 text-center">
                    <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhuma peça adicionada</p>
                    <p className="text-xs text-muted-foreground mt-1">Pesquise no catálogo acima ou adicione manualmente</p>
                  </div>
                )}

                <div className="space-y-3">
                  {parts.map((part, idx) => (
                    <div key={part.id} className="border border-border/50 rounded-lg p-4 bg-card">
                      <div className="flex items-start gap-3">
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-1 shrink-0">{idx + 1}</span>
                        <div className="flex-1 space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div>
                              <label className="text-[11px] text-muted-foreground mb-1 block">Código</label>
                              <Input value={part.codigo} onChange={e => setParts(prev => prev.map(p => p.id === part.id ? { ...p, codigo: e.target.value } : p))} placeholder="FLT-OL-001" className="h-9 text-xs font-mono" />
                            </div>
                            <div className="sm:col-span-2">
                              <label className="text-[11px] text-muted-foreground mb-1 block">Descrição</label>
                              <Input value={part.descricao} onChange={e => setParts(prev => prev.map(p => p.id === part.id ? { ...p, descricao: e.target.value } : p))} placeholder="Filtro de óleo motor" className="h-9 text-xs" />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <div>
                              <label className="text-[11px] text-muted-foreground mb-1 block">Marca</label>
                              <Input value={part.marca} onChange={e => setParts(prev => prev.map(p => p.id === part.id ? { ...p, marca: e.target.value } : p))} placeholder="Mann" className="h-9 text-xs" />
                            </div>
                            <div>
                              <label className="text-[11px] text-muted-foreground mb-1 block">Tipo</label>
                              <select value={part.tipo} onChange={e => setParts(prev => prev.map(p => p.id === part.id ? { ...p, tipo: e.target.value as any } : p))}
                                className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs">
                                <option value="original">Original</option>
                                <option value="paralela">Paralela</option>
                                <option value="recondicionada">Recondicionada</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-[11px] text-muted-foreground mb-1 block">Qtd</label>
                              <Input type="number" min={1} value={part.quantidade} onChange={e => setParts(prev => prev.map(p => p.id === part.id ? { ...p, quantidade: parseInt(e.target.value) || 1 } : p))} className="h-9 text-xs" />
                            </div>
                            <div>
                              <label className="text-[11px] text-muted-foreground mb-1 block">Valor Unit. (R$)</label>
                              <Input type="number" step="0.01" value={part.valorUnitario} onChange={e => setParts(prev => prev.map(p => p.id === part.id ? { ...p, valorUnitario: parseFloat(e.target.value) || 0 } : p))} className="h-9 text-xs font-mono" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Subtotal: <span className="font-semibold text-foreground">{fmt(part.valorUnitario * part.quantidade)}</span></span>
                          </div>
                        </div>
                        <button onClick={() => setParts(prev => prev.filter(p => p.id !== part.id))} className="text-muted-foreground hover:text-destructive transition-colors mt-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {parts.length > 0 && (
                  <div className="flex items-center justify-between pt-3 border-t border-border/40">
                    <span className="text-sm font-medium text-muted-foreground">Total Peças</span>
                    <span className="text-lg font-bold text-foreground">{fmt(totalPecas)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('laudo')} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Laudo
              </Button>
              <Button onClick={() => setStep('mao_obra')} className="gap-2">
                Próximo: Mão de Obra <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
              </Button>
            </div>
          </div>
        )}

        {/* ══════ STEP 3: MÃO DE OBRA ══════ */}
        {step === 'mao_obra' && (
          <div className="space-y-5">
            <div className="bg-card border border-border/60 rounded-lg">
              <div className="px-5 py-4 border-b border-border/40 flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Wrench className="w-4 h-4 text-primary" /> Mão de Obra / Serviços
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Selecione os serviços do catálogo ou adicione manualmente.</p>
                </div>
                <Badge variant="secondary">{labors.length} {labors.length === 1 ? 'serviço' : 'serviços'}</Badge>
              </div>

              <div className="p-5 space-y-4">
                {/* Service catalog search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar serviço... (ex: revisão, embreagem, freio)"
                    value={searchLabor}
                    onChange={e => { setSearchLabor(e.target.value); setShowLaborCatalog(true); }}
                    onFocus={() => setShowLaborCatalog(true)}
                    className="pl-10 h-11"
                  />
                  {showLaborCatalog && searchLabor && (
                    <div className="absolute z-20 top-full mt-1 left-0 right-0 bg-card border border-border rounded-lg shadow-lg max-h-64 overflow-y-auto">
                      {filteredLabors.length === 0 ? (
                        <p className="p-4 text-xs text-muted-foreground text-center">Nenhum serviço encontrado</p>
                      ) : filteredLabors.map(l => (
                        <button key={l.code} onClick={() => addLaborFromCatalog(l)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors text-left border-b border-border/30 last:border-0">
                          <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">{l.code}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{l.desc}</p>
                            <p className="text-[11px] text-muted-foreground">{l.defaultHours}h × {fmt(l.defaultRate)}/h</p>
                          </div>
                          <span className="text-sm font-semibold text-foreground shrink-0">{fmt(l.defaultHours * l.defaultRate)}</span>
                          <Plus className="w-3.5 h-3.5 text-primary shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <Button variant="outline" size="sm" onClick={addCustomLabor} className="gap-1.5 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Adicionar serviço manual
                </Button>

                {labors.length === 0 && (
                  <div className="bg-muted/20 border border-border/30 rounded-lg p-8 text-center">
                    <Wrench className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Nenhum serviço adicionado</p>
                    <p className="text-xs text-muted-foreground mt-1">Pesquise no catálogo ou adicione manualmente</p>
                  </div>
                )}

                <div className="space-y-3">
                  {labors.map((labor, idx) => (
                    <div key={labor.id} className="border border-border/50 rounded-lg p-4 bg-card">
                      <div className="flex items-start gap-3">
                        <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded mt-1 shrink-0">{idx + 1}</span>
                        <div className="flex-1 space-y-3">
                          <div>
                            <label className="text-[11px] text-muted-foreground mb-1 block">Descrição do Serviço</label>
                            <Input value={labor.descricao} onChange={e => setLabors(prev => prev.map(l => l.id === labor.id ? { ...l, descricao: e.target.value } : l))} placeholder="Ex: Troca de embreagem completa" className="h-9 text-xs" />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="text-[11px] text-muted-foreground mb-1 block">Horas</label>
                              <Input type="number" step="0.5" min={0.5} value={labor.horas} onChange={e => setLabors(prev => prev.map(l => l.id === labor.id ? { ...l, horas: parseFloat(e.target.value) || 1 } : l))} className="h-9 text-xs font-mono" />
                            </div>
                            <div>
                              <label className="text-[11px] text-muted-foreground mb-1 block">Valor/Hora (R$)</label>
                              <Input type="number" step="10" value={labor.valorHora} onChange={e => setLabors(prev => prev.map(l => l.id === labor.id ? { ...l, valorHora: parseFloat(e.target.value) || 0 } : l))} className="h-9 text-xs font-mono" />
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Subtotal: <span className="font-semibold text-foreground">{fmt(labor.valorHora * labor.horas)}</span></span>
                          </div>
                        </div>
                        <button onClick={() => setLabors(prev => prev.filter(l => l.id !== labor.id))} className="text-muted-foreground hover:text-destructive transition-colors mt-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {labors.length > 0 && (
                  <div className="flex items-center justify-between pt-3 border-t border-border/40">
                    <span className="text-sm font-medium text-muted-foreground">Total Mão de Obra</span>
                    <span className="text-lg font-bold text-foreground">{fmt(totalMaoObra)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('pecas')} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Peças
              </Button>
              <Button onClick={() => setStep('resumo')} className="gap-2" disabled={parts.length === 0 && labors.length === 0}>
                Próximo: Resumo <ChevronDown className="w-4 h-4 rotate-[-90deg]" />
              </Button>
            </div>
          </div>
        )}

        {/* ══════ STEP 4: RESUMO ══════ */}
        {step === 'resumo' && (
          <div className="space-y-5">
            {/* Vehicle summary */}
            <div className="bg-card border border-border/60 rounded-lg p-5">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Car className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="font-mono text-xl font-bold text-foreground">{vehicle.placa}</p>
                  <p className="text-sm text-muted-foreground">{vehicle.marca} {vehicle.modelo} · {(vehicle.km_atual || 0).toLocaleString()} km</p>
                </div>
                {urgencia !== 'normal' && (
                  <Badge variant={urgencia === 'critico' ? 'destructive' : 'secondary'} className="ml-auto gap-1">
                    <AlertTriangle className="w-3 h-3" /> {urgencia === 'critico' ? 'CRÍTICO' : 'URGENTE'}
                  </Badge>
                )}
              </div>
            </div>

            {/* Laudo summary */}
            <div className="bg-card border border-border/60 rounded-lg">
              <div className="px-5 py-3.5 border-b border-border/40 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Laudo Técnico</h3>
                <Button variant="ghost" size="sm" onClick={() => setStep('laudo')} className="text-xs h-7">Editar</Button>
              </div>
              <div className="p-5 text-sm text-foreground whitespace-pre-wrap">{laudoTecnico}</div>
              {esclarecimento && (
                <div className="px-5 pb-5">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Esclarecimento Técnico:</p>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{esclarecimento}</p>
                </div>
              )}
            </div>

            {/* Photos */}
            {photos.length > 0 && (
              <div className="bg-card border border-border/60 rounded-lg p-5">
                <p className="text-xs font-medium text-muted-foreground mb-3">Evidências ({photos.length} fotos)</p>
                <div className="flex flex-wrap gap-2">
                  {photos.map(p => (
                    <div key={p.id} className="w-20 h-20 rounded-lg overflow-hidden border border-border/60">
                      <img src={p.url} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Parts summary table */}
            {parts.length > 0 && (
              <div className="bg-card border border-border/60 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/40 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Peças ({parts.length})</h3>
                  <Button variant="ghost" size="sm" onClick={() => setStep('pecas')} className="text-xs h-7">Editar</Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 text-muted-foreground">
                        <th className="text-left px-4 py-2.5 font-medium">Código</th>
                        <th className="text-left px-4 py-2.5 font-medium">Descrição</th>
                        <th className="text-left px-4 py-2.5 font-medium">Marca</th>
                        <th className="text-left px-4 py-2.5 font-medium">Tipo</th>
                        <th className="text-right px-4 py-2.5 font-medium">Qtd</th>
                        <th className="text-right px-4 py-2.5 font-medium">Unit.</th>
                        <th className="text-right px-4 py-2.5 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parts.map(p => (
                        <tr key={p.id} className="border-b border-border/30">
                          <td className="px-4 py-2.5 font-mono text-muted-foreground">{p.codigo || '—'}</td>
                          <td className="px-4 py-2.5 font-medium text-foreground">{p.descricao}</td>
                          <td className="px-4 py-2.5 text-muted-foreground">{p.marca}</td>
                          <td className="px-4 py-2.5"><Badge variant="outline" className="text-[10px] h-5">{p.tipo}</Badge></td>
                          <td className="px-4 py-2.5 text-right">{p.quantidade}</td>
                          <td className="px-4 py-2.5 text-right font-mono">{fmt(p.valorUnitario)}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold">{fmt(p.valorUnitario * p.quantidade)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/20">
                        <td colSpan={6} className="px-4 py-2.5 text-right font-medium text-muted-foreground">Subtotal Peças</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">{fmt(totalPecas)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Labor summary table */}
            {labors.length > 0 && (
              <div className="bg-card border border-border/60 rounded-lg overflow-hidden">
                <div className="px-5 py-3.5 border-b border-border/40 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">Mão de Obra ({labors.length})</h3>
                  <Button variant="ghost" size="sm" onClick={() => setStep('mao_obra')} className="text-xs h-7">Editar</Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/30 text-muted-foreground">
                        <th className="text-left px-4 py-2.5 font-medium">Serviço</th>
                        <th className="text-right px-4 py-2.5 font-medium">Horas</th>
                        <th className="text-right px-4 py-2.5 font-medium">R$/Hora</th>
                        <th className="text-right px-4 py-2.5 font-medium">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {labors.map(l => (
                        <tr key={l.id} className="border-b border-border/30">
                          <td className="px-4 py-2.5 font-medium text-foreground">{l.descricao}</td>
                          <td className="px-4 py-2.5 text-right font-mono">{l.horas}h</td>
                          <td className="px-4 py-2.5 text-right font-mono">{fmt(l.valorHora)}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-semibold">{fmt(l.valorHora * l.horas)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-muted/20">
                        <td colSpan={3} className="px-4 py-2.5 text-right font-medium text-muted-foreground">Subtotal Mão de Obra</td>
                        <td className="px-4 py-2.5 text-right font-mono font-bold text-foreground">{fmt(totalMaoObra)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Grand Total */}
            <div className="bg-card border-2 border-primary/30 rounded-lg p-5 space-y-3">
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
                <span className="font-semibold text-foreground">Total Bruto</span>
                <span className="font-mono font-bold text-foreground">{fmt(totalBruto)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Comissão NovaLink (15%)</span>
                <span className="font-mono text-destructive">-{fmt(comissao)}</span>
              </div>
              <div className="flex justify-between text-lg pt-2 border-t border-border/40">
                <span className="font-semibold text-foreground">Valor Líquido Oficina</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalLiquido)}</span>
              </div>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep('mao_obra')} className="gap-2">
                <ArrowLeft className="w-4 h-4" /> Mão de Obra
              </Button>
              <Button onClick={handleSubmit} disabled={saving || (parts.length === 0 && labors.length === 0)} className="gap-2 px-8">
                {saving ? 'Enviando...' : <><Send className="w-4 h-4" /> Enviar Orçamento para Aprovação</>}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
