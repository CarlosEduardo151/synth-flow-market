import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  ArrowLeft, Plus, Trash2, Send, Wrench, Package,
  AlertTriangle, CheckCircle2, Search, Shield, Loader2
} from 'lucide-react';
import type { useFleetData, FleetServiceOrder, FleetVehicle } from '@/hooks/useFleetData';

// ── Parts catalog ──
const partsCatalog = [
  { code: 'FLT-OL-001', desc: 'Filtro de óleo motor', marca: 'Mann', precoRef: 45 },
  { code: 'FLT-AR-001', desc: 'Filtro de ar motor', marca: 'Mann', precoRef: 65 },
  { code: 'FLT-CB-001', desc: 'Filtro de combustível', marca: 'Bosch', precoRef: 85 },
  { code: 'FLT-AC-001', desc: 'Filtro de ar-condicionado', marca: 'Mann', precoRef: 55 },
  { code: 'FLT-SEP-001', desc: 'Filtro separador de água/diesel', marca: 'Parker', precoRef: 120 },
  { code: 'OLE-001', desc: 'Óleo motor 15W40 (litro)', marca: 'Shell', precoRef: 32 },
  { code: 'OLE-002', desc: 'Óleo câmbio 75W90 (litro)', marca: 'Shell', precoRef: 48 },
  { code: 'OLE-003', desc: 'Fluido de arrefecimento (litro)', marca: 'Paraflu', precoRef: 22 },
  { code: 'OLE-004', desc: 'Óleo hidráulico direção (litro)', marca: 'Shell', precoRef: 38 },
  { code: 'PAS-001', desc: 'Jogo de pastilhas de freio', marca: 'Fras-le', precoRef: 180 },
  { code: 'PAS-002', desc: 'Jogo de pastilhas traseiras', marca: 'Fras-le', precoRef: 160 },
  { code: 'DIS-001', desc: 'Disco de freio ventilado dianteiro', marca: 'Fremax', precoRef: 320 },
  { code: 'DIS-002', desc: 'Disco de freio ventilado traseiro', marca: 'Fremax', precoRef: 290 },
  { code: 'LON-001', desc: 'Lona de freio (jogo)', marca: 'Fras-le', precoRef: 250 },
  { code: 'CIL-FRE-001', desc: 'Cilindro mestre de freio', marca: 'Bosch', precoRef: 480 },
  { code: 'FLU-FRE-001', desc: 'Fluido de freio DOT4 (500ml)', marca: 'Bosch', precoRef: 35 },
  { code: 'TAM-001', desc: 'Tambor de freio traseiro', marca: 'Fremax', precoRef: 380 },
  { code: 'AMO-001', desc: 'Amortecedor dianteiro', marca: 'Monroe', precoRef: 450 },
  { code: 'AMO-002', desc: 'Amortecedor traseiro', marca: 'Monroe', precoRef: 380 },
  { code: 'MOL-001', desc: 'Feixe de molas traseiro', marca: 'Fabrini', precoRef: 950 },
  { code: 'BUC-001', desc: 'Bucha de mola (jogo)', marca: 'Sampel', precoRef: 120 },
  { code: 'PIV-001', desc: 'Pivô de suspensão', marca: 'Nakata', precoRef: 220 },
  { code: 'TER-001', desc: 'Terminal de direção', marca: 'Nakata', precoRef: 180 },
  { code: 'BAR-EST-001', desc: 'Barra estabilizadora', marca: 'Sampel', precoRef: 350 },
  { code: 'KIT-RET-001', desc: 'Kit retífica completo', marca: 'Metal Leve/Mahle', precoRef: 4800 },
  { code: 'PIS-001', desc: 'Jogo de pistões com pinos', marca: 'Metal Leve', precoRef: 1800 },
  { code: 'ANE-001', desc: 'Jogo de anéis de pistão', marca: 'Mahle', precoRef: 650 },
  { code: 'BRZ-BIE-001', desc: 'Jogo de bronzinas de biela', marca: 'Metal Leve', precoRef: 380 },
  { code: 'BRZ-MAN-001', desc: 'Jogo de bronzinas de mancal', marca: 'Metal Leve', precoRef: 420 },
  { code: 'BIE-001', desc: 'Biela recondicionada (un)', marca: 'Motor Parts', precoRef: 650 },
  { code: 'VIR-001', desc: 'Virabrequim retificado', marca: 'Motor Parts', precoRef: 3500 },
  { code: 'CAB-001', desc: 'Cabeçote retificado completo', marca: 'Motor Parts', precoRef: 4200 },
  { code: 'JNT-CAB-001', desc: 'Junta do cabeçote', marca: 'Sabó', precoRef: 280 },
  { code: 'JNT-KIT-001', desc: 'Kit completo de juntas do motor', marca: 'Sabó', precoRef: 850 },
  { code: 'VLV-ADM-001', desc: 'Jogo de válvulas de admissão', marca: 'TRW', precoRef: 520 },
  { code: 'VLV-ESC-001', desc: 'Jogo de válvulas de escape', marca: 'TRW', precoRef: 580 },
  { code: 'GUA-VLV-001', desc: 'Jogo de guias de válvula', marca: 'Metal Leve', precoRef: 320 },
  { code: 'RET-VLV-001', desc: 'Jogo de retentores de válvula', marca: 'Sabó', precoRef: 180 },
  { code: 'CMD-001', desc: 'Eixo comando de válvulas', marca: 'Motor Parts', precoRef: 1800 },
  { code: 'TUC-001', desc: 'Jogo de tuchos hidráulicos', marca: 'INA', precoRef: 850 },
  { code: 'VOL-001', desc: 'Volante do motor', marca: 'Sachs', precoRef: 1200 },
  { code: 'RET-VIR-001', desc: 'Retentor dianteiro virabrequim', marca: 'Sabó', precoRef: 85 },
  { code: 'RET-VIR-002', desc: 'Retentor traseiro virabrequim', marca: 'Sabó', precoRef: 95 },
  { code: 'CRT-OLE-001', desc: 'Cárter de óleo do motor', marca: 'Motor Parts', precoRef: 680 },
  { code: 'BOM-OLE-001', desc: 'Bomba de óleo do motor', marca: 'Schadek', precoRef: 520 },
  { code: 'COR-001', desc: 'Kit correia dentada + tensor', marca: 'Gates', precoRef: 380 },
  { code: 'COR-002', desc: 'Correia do alternador', marca: 'Gates', precoRef: 85 },
  { code: 'VEL-001', desc: 'Vela de ignição (un)', marca: 'NGK', precoRef: 35 },
  { code: 'RAD-001', desc: 'Radiador completo', marca: 'Visconde', precoRef: 890 },
  { code: 'BOM-001', desc: 'Bomba d\'água', marca: 'Indisa', precoRef: 280 },
  { code: 'TRM-001', desc: 'Válvula termostática', marca: 'Wahler', precoRef: 120 },
  { code: 'MNG-001', desc: 'Kit mangueiras radiador', marca: 'Gates', precoRef: 180 },
  { code: 'INT-001', desc: 'Intercooler', marca: 'Visconde', precoRef: 1200 },
  { code: 'BIC-001', desc: 'Bico injetor (un)', marca: 'Bosch', precoRef: 450 },
  { code: 'BOM-COMB-001', desc: 'Bomba combustível alta pressão', marca: 'Bosch', precoRef: 3800 },
  { code: 'TUR-001', desc: 'Turbocompressor recondicionado', marca: 'BorgWarner', precoRef: 3200 },
  { code: 'TUR-002', desc: 'Turbocompressor novo', marca: 'Garrett', precoRef: 5800 },
  { code: 'EMB-KIT', desc: 'Kit embreagem completo', marca: 'Sachs', precoRef: 1200 },
  { code: 'EMB-VOL', desc: 'Volante bimassa', marca: 'Sachs', precoRef: 2800 },
  { code: 'CIL-EMB-001', desc: 'Cilindro de embreagem', marca: 'Sachs', precoRef: 450 },
  { code: 'RLM-EMB-001', desc: 'Rolamento de embreagem', marca: 'INA', precoRef: 280 },
  { code: 'CRD-001', desc: 'Cruzeta do cardã', marca: 'Spicer', precoRef: 320 },
  { code: 'DIF-001', desc: 'Kit reparo diferencial', marca: 'Eaton', precoRef: 2200 },
  { code: 'BAT-001', desc: 'Bateria 12V 150Ah', marca: 'Moura', precoRef: 680 },
  { code: 'ALT-001', desc: 'Alternador recondicionado', marca: 'Bosch', precoRef: 650 },
  { code: 'MPA-001', desc: 'Motor de partida recondi.', marca: 'Bosch', precoRef: 580 },
  { code: 'CXD-001', desc: 'Caixa de direção hidráulica', marca: 'TRW', precoRef: 1800 },
  { code: 'BDI-001', desc: 'Bomba de direção hidráulica', marca: 'TRW', precoRef: 950 },
  { code: 'CMP-001', desc: 'Compressor ar-condicionado', marca: 'Delphi', precoRef: 1400 },
  { code: 'PNE-001', desc: 'Pneu 295/80R22.5 (un)', marca: 'Bridgestone', precoRef: 1800 },
  { code: 'PNE-002', desc: 'Pneu 275/80R22.5 (un)', marca: 'Michelin', precoRef: 2100 },
  { code: 'ESC-001', desc: 'Silencioso do escapamento', marca: 'Cofap', precoRef: 650 },
  { code: 'CAT-001', desc: 'Catalisador', marca: 'Umicore', precoRef: 2800 },
  { code: 'FNR-001', desc: 'Farol dianteiro (un)', marca: 'Arteb', precoRef: 480 },
  { code: 'PBR-001', desc: 'Para-brisa', marca: 'Saint-Gobain', precoRef: 850 },
];

// ── Service catalog ──
const serviceCatalog = [
  { code: 'REV-050', desc: 'Revisão dos 50.000 km', defaultHours: 4, defaultRate: 120 },
  { code: 'REV-100', desc: 'Revisão dos 100.000 km', defaultHours: 6, defaultRate: 120 },
  { code: 'FRE-001', desc: 'Substituição de pastilhas de freio (eixo)', defaultHours: 1.5, defaultRate: 110 },
  { code: 'FRE-002', desc: 'Substituição de discos de freio (eixo)', defaultHours: 2, defaultRate: 110 },
  { code: 'FRE-003', desc: 'Regulagem de freio a tambor', defaultHours: 1, defaultRate: 100 },
  { code: 'FRE-004', desc: 'Troca de lona de freio (eixo)', defaultHours: 2.5, defaultRate: 110 },
  { code: 'FRE-005', desc: 'Troca de cilindro mestre de freio', defaultHours: 2, defaultRate: 110 },
  { code: 'MOT-001', desc: 'Troca de óleo e filtro do motor', defaultHours: 1, defaultRate: 100 },
  { code: 'MOT-002', desc: 'Troca de correia dentada / alternador', defaultHours: 3.5, defaultRate: 130 },
  { code: 'MOT-003', desc: 'Retífica completa de motor', defaultHours: 40, defaultRate: 150 },
  { code: 'MOT-004', desc: 'Troca de bomba d\'água', defaultHours: 2.5, defaultRate: 120 },
  { code: 'MOT-005', desc: 'Troca de válvula termostática', defaultHours: 1.5, defaultRate: 110 },
  { code: 'MOT-006', desc: 'Troca de radiador completo', defaultHours: 3, defaultRate: 120 },
  { code: 'MOT-010', desc: 'Desmontagem e diagnóstico interno do motor', defaultHours: 8, defaultRate: 140 },
  { code: 'MOT-011', desc: 'Retífica do bloco do motor', defaultHours: 12, defaultRate: 160 },
  { code: 'MOT-012', desc: 'Retífica do cabeçote', defaultHours: 8, defaultRate: 150 },
  { code: 'MOT-013', desc: 'Retífica do virabrequim', defaultHours: 6, defaultRate: 150 },
  { code: 'MOT-014', desc: 'Montagem e regulagem do motor retificado', defaultHours: 16, defaultRate: 150 },
  { code: 'MOT-015', desc: 'Instalação do motor retificado no veículo', defaultHours: 10, defaultRate: 140 },
  { code: 'MOT-016', desc: 'Troca de junta do cabeçote', defaultHours: 8, defaultRate: 140 },
  { code: 'MOT-017', desc: 'Troca de pistões e anéis', defaultHours: 12, defaultRate: 150 },
  { code: 'MOT-018', desc: 'Troca de bronzinas biela e mancal', defaultHours: 10, defaultRate: 150 },
  { code: 'MOT-019', desc: 'Substituição de bielas', defaultHours: 8, defaultRate: 150 },
  { code: 'MOT-020', desc: 'Troca de válvulas + guias + retentores', defaultHours: 6, defaultRate: 140 },
  { code: 'MOT-021', desc: 'Troca do eixo comando de válvulas', defaultHours: 5, defaultRate: 140 },
  { code: 'MOT-022', desc: 'Troca de tuchos hidráulicos', defaultHours: 4, defaultRate: 130 },
  { code: 'MOT-023', desc: 'Troca de bomba de óleo', defaultHours: 4, defaultRate: 130 },
  { code: 'MOT-024', desc: 'Troca de cárter + junta', defaultHours: 2, defaultRate: 110 },
  { code: 'MOT-025', desc: 'Troca de retentores do virabrequim', defaultHours: 3, defaultRate: 120 },
  { code: 'MOT-026', desc: 'Teste e amaciamento do motor retificado', defaultHours: 4, defaultRate: 120 },
  { code: 'INJ-001', desc: 'Limpeza / troca de bicos injetores', defaultHours: 3, defaultRate: 120 },
  { code: 'INJ-002', desc: 'Troca de bomba combustível alta pressão', defaultHours: 5, defaultRate: 140 },
  { code: 'INJ-003', desc: 'Diagnóstico eletrônico completo', defaultHours: 2, defaultRate: 120 },
  { code: 'SUS-001', desc: 'Troca de amortecedores (par)', defaultHours: 2.5, defaultRate: 110 },
  { code: 'SUS-002', desc: 'Alinhamento e balanceamento', defaultHours: 1, defaultRate: 80 },
  { code: 'SUS-003', desc: 'Troca de molas / feixe de molas', defaultHours: 4, defaultRate: 120 },
  { code: 'SUS-004', desc: 'Troca de pivôs e terminais', defaultHours: 2.5, defaultRate: 110 },
  { code: 'EMB-001', desc: 'Substituição de embreagem completa', defaultHours: 6, defaultRate: 140 },
  { code: 'EMB-002', desc: 'Troca de volante bimassa', defaultHours: 7, defaultRate: 140 },
  { code: 'CAM-001', desc: 'Revisão de câmbio automático', defaultHours: 8, defaultRate: 150 },
  { code: 'CAM-002', desc: 'Revisão de câmbio manual', defaultHours: 12, defaultRate: 140 },
  { code: 'ELE-001', desc: 'Diagnóstico elétrico completo', defaultHours: 2, defaultRate: 100 },
  { code: 'ELE-002', desc: 'Troca de alternador / motor de partida', defaultHours: 2, defaultRate: 110 },
  { code: 'TUR-001', desc: 'Reparo / troca de turbocompressor', defaultHours: 5, defaultRate: 140 },
  { code: 'ARR-001', desc: 'Reparo no ar-condicionado', defaultHours: 3, defaultRate: 120 },
  { code: 'ARR-002', desc: 'Carga de gás + teste vazamento', defaultHours: 1.5, defaultRate: 100 },
  { code: 'DIR-001', desc: 'Reparo da caixa de direção', defaultHours: 4.5, defaultRate: 130 },
  { code: 'PNE-001', desc: 'Troca de pneu (unidade)', defaultHours: 0.5, defaultRate: 80 },
  { code: 'ESC-001', desc: 'Reparo do sistema de escapamento', defaultHours: 2, defaultRate: 100 },
  { code: 'CAR-001', desc: 'Troca de para-brisa', defaultHours: 2, defaultRate: 100 },
  { code: 'DIF-001', desc: 'Revisão do diferencial', defaultHours: 8, defaultRate: 140 },
];

// ── Types ──
interface BudgetItem {
  id: string;
  tipo: 'peca' | 'mao_de_obra';
  codigo: string;
  descricao: string;
  marca?: string;
  quantidade: number;
  valorUnitario: number;
  precoRef: number;
  horas?: number;
  valorHora?: number;
}

interface BudgetCreationFormProps {
  serviceOrder: FleetServiceOrder;
  vehicle: FleetVehicle;
  fleet: ReturnType<typeof useFleetData>;
  onClose: () => void;
  onSuccess: () => void;
}

export function BudgetCreationForm({ serviceOrder, vehicle, fleet, onClose, onSuccess }: BudgetCreationFormProps) {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [kmAtual, setKmAtual] = useState(vehicle.km_atual || 0);
  const [dataPrevisao, setDataPrevisao] = useState('');
  const [laudoTecnico, setLaudoTecnico] = useState('');
  const [saving, setSaving] = useState(false);

  // Search states
  const [searchPart, setSearchPart] = useState('');
  const [searchLabor, setSearchLabor] = useState('');
  const [showPartDropdown, setShowPartDropdown] = useState(false);
  const [showLaborDropdown, setShowLaborDropdown] = useState(false);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // ── Totals ──
  const pecas = items.filter(i => i.tipo === 'peca');
  const maoDeObra = items.filter(i => i.tipo === 'mao_de_obra');
  const totalPecas = pecas.reduce((s, p) => s + p.valorUnitario * p.quantidade, 0);
  const totalMaoObra = maoDeObra.reduce((s, l) => s + (l.valorHora || 0) * (l.horas || 0), 0);
  const totalBruto = totalPecas + totalMaoObra;
  const comissao = totalBruto * 0.15;
  const totalLiquido = totalBruto - comissao;
  const totalHoras = maoDeObra.reduce((s, l) => s + (l.horas || 0), 0);

  // ── Price check ──
  const getPriceFlag = (valor: number, ref: number) => {
    if (ref <= 0) return null;
    const ratio = valor / ref;
    if (ratio > 1.5) return 'alto';
    if (ratio > 1.3) return 'atencao';
    return null;
  };

  // ── Add part ──
  const addPart = (item: typeof partsCatalog[0]) => {
    if (items.find(i => i.codigo === item.code && i.tipo === 'peca')) return;
    setItems(prev => [...prev, {
      id: Date.now().toString(),
      tipo: 'peca',
      codigo: item.code,
      descricao: item.desc,
      marca: item.marca,
      quantidade: 1,
      valorUnitario: item.precoRef,
      precoRef: item.precoRef,
    }]);
    setSearchPart('');
    setShowPartDropdown(false);
  };

  // ── Add labor ──
  const addLabor = (item: typeof serviceCatalog[0]) => {
    if (items.find(i => i.codigo === item.code && i.tipo === 'mao_de_obra')) return;
    setItems(prev => [...prev, {
      id: Date.now().toString(),
      tipo: 'mao_de_obra',
      codigo: item.code,
      descricao: item.desc,
      quantidade: 1,
      valorUnitario: item.defaultHours * item.defaultRate,
      precoRef: item.defaultHours * item.defaultRate,
      horas: item.defaultHours,
      valorHora: item.defaultRate,
    }]);
    setSearchLabor('');
    setShowLaborDropdown(false);
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  const updateItem = (id: string, field: keyof BudgetItem, value: any) => {
    setItems(prev => prev.map(i => {
      if (i.id !== id) return i;
      const updated = { ...i, [field]: value };
      if (i.tipo === 'peca') {
        updated.valorUnitario = updated.valorUnitario;
      }
      if (i.tipo === 'mao_de_obra' && (field === 'horas' || field === 'valorHora')) {
        updated.valorUnitario = (updated.horas || 0) * (updated.valorHora || 0);
      }
      return updated;
    }));
  };

  // ── Filtered catalogs ──
  const filteredParts = searchPart.length >= 2
    ? partsCatalog.filter(p =>
        p.desc.toLowerCase().includes(searchPart.toLowerCase()) ||
        p.code.toLowerCase().includes(searchPart.toLowerCase())
      ).slice(0, 8)
    : [];

  const filteredLabor = searchLabor.length >= 2
    ? serviceCatalog.filter(l =>
        l.desc.toLowerCase().includes(searchLabor.toLowerCase()) ||
        l.code.toLowerCase().includes(searchLabor.toLowerCase())
      ).slice(0, 8)
    : [];

  // ── Submit ──
  const handleSubmit = async () => {
    if (items.length === 0 || kmAtual <= 0) return;
    setSaving(true);
    try {
      const cpId = (serviceOrder as any).customer_product_id;
      await supabase.from('fleet_vehicles').update({ km_atual: kmAtual }).eq('id', vehicle.id);

      const { data: budget, error: budgetErr } = await supabase
        .from('fleet_budgets')
        .insert({
          service_order_id: serviceOrder.id,
          customer_product_id: cpId,
          laudo_tecnico: laudoTecnico || 'Orçamento gerado via sistema NovaLink.',
          urgencia: 'normal',
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

      const budgetItems: any[] = [];
      pecas.forEach((p, i) => budgetItems.push({
        budget_id: (budget as any).id,
        tipo: 'peca',
        codigo: p.codigo,
        descricao: p.descricao,
        marca: p.marca || null,
        quantidade: p.quantidade,
        valor_unitario: p.valorUnitario,
        valor_total: p.valorUnitario * p.quantidade,
        sort_order: i,
      }));
      maoDeObra.forEach((l, i) => budgetItems.push({
        budget_id: (budget as any).id,
        tipo: 'mao_de_obra',
        descricao: l.descricao,
        quantidade: 1,
        valor_unitario: (l.valorHora || 0) * (l.horas || 0),
        valor_total: (l.valorHora || 0) * (l.horas || 0),
        horas: l.horas,
        valor_hora: l.valorHora,
        sort_order: pecas.length + i,
      }));

      if (budgetItems.length > 0) {
        const { error: itemsErr } = await supabase.from('fleet_budget_items').insert(budgetItems);
        if (itemsErr) throw itemsErr;
      }

      const descricao = [
        `ORÇAMENTO NOVALINK`,
        `KM: ${kmAtual.toLocaleString()} | Previsão: ${dataPrevisao || 'N/A'}`,
        `Peças: ${fmt(totalPecas)} | Mão de Obra: ${fmt(totalMaoObra)}`,
        `TOTAL: ${fmt(totalBruto)}`,
      ].join('\n');

      await fleet.updateStage(
        serviceOrder.id,
        'orcamento_enviado',
        'oficina',
        'Orçamento enviado para aprovação',
        { descricao_servico: descricao, valor_orcamento: totalBruto }
      );
      onSuccess();
    } catch (err) {
      console.error('Budget submit error:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* ═══ HEADER BAR ═══ */}
      <div className="sticky top-0 z-20 bg-card border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-3 py-3 flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold text-foreground">Novo Orçamento</h1>
            <p className="text-[10px] text-muted-foreground font-mono">
              OS #{serviceOrder.id.slice(0, 8).toUpperCase()} · {vehicle.placa}
            </p>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono shrink-0">
            {vehicle.marca} {vehicle.modelo}
          </Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-3 py-4 space-y-4">

        {/* ═══ TOP BAR: KM · DATA PREVISÃO · TOTAL ═══ */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-lg p-3">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">KM Atual</label>
            <Input
              type="number"
              value={kmAtual || ''}
              onChange={e => setKmAtual(Number(e.target.value))}
              className="mt-1 h-9 font-mono text-sm border-border"
              placeholder="0"
            />
          </div>
          <div className="bg-card border border-border rounded-lg p-3">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Previsão Entrega</label>
            <Input
              type="date"
              value={dataPrevisao}
              onChange={e => setDataPrevisao(e.target.value)}
              className="mt-1 h-9 text-sm border-border"
            />
          </div>
          <div className="bg-card border border-border rounded-lg p-3">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">Valor Total</label>
            <p className="mt-1 font-mono font-bold text-lg text-foreground leading-9">
              {fmt(totalBruto)}
            </p>
          </div>
        </div>

        {/* ═══ ITEMS SECTION ═══ */}
        <div className="bg-card border border-border rounded-lg">
          <div className="p-3 border-b border-border flex items-center justify-between">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">Itens do Orçamento</h2>
            <span className="text-[10px] text-muted-foreground">{items.length} item(ns)</span>
          </div>

          {/* Add Part */}
          <div className="p-3 border-b border-border/50 relative">
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Adicionar Peça</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar peça no catálogo..."
                value={searchPart}
                onChange={e => { setSearchPart(e.target.value); setShowPartDropdown(true); }}
                onFocus={() => setShowPartDropdown(true)}
                className="pl-8 h-9 text-sm border-border"
              />
              {showPartDropdown && filteredParts.length > 0 && (
                <div className="absolute z-30 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredParts.map(p => (
                    <button
                      key={p.code}
                      onClick={() => addPart(p)}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between text-xs border-b border-border/30 last:border-0"
                    >
                      <div>
                        <span className="font-mono text-muted-foreground mr-2">{p.code}</span>
                        <span className="text-foreground">{p.desc}</span>
                        <span className="text-muted-foreground ml-1">({p.marca})</span>
                      </div>
                      <span className="font-mono text-muted-foreground">{fmt(p.precoRef)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Add Labor */}
          <div className="p-3 border-b border-border/50 relative">
            <div className="flex items-center gap-2 mb-1">
              <Wrench className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">Adicionar Mão de Obra</span>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                placeholder="Buscar serviço no catálogo..."
                value={searchLabor}
                onChange={e => { setSearchLabor(e.target.value); setShowLaborDropdown(true); }}
                onFocus={() => setShowLaborDropdown(true)}
                className="pl-8 h-9 text-sm border-border"
              />
              {showLaborDropdown && filteredLabor.length > 0 && (
                <div className="absolute z-30 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  {filteredLabor.map(l => (
                    <button
                      key={l.code}
                      onClick={() => addLabor(l)}
                      className="w-full text-left px-3 py-2 hover:bg-muted/50 flex items-center justify-between text-xs border-b border-border/30 last:border-0"
                    >
                      <div>
                        <span className="font-mono text-muted-foreground mr-2">{l.code}</span>
                        <span className="text-foreground">{l.desc}</span>
                      </div>
                      <span className="text-muted-foreground">{l.defaultHours}h × {fmt(l.defaultRate)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Items list — separated by type */}
          <div>
            {items.length === 0 && (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Nenhum item adicionado. Use os campos acima para buscar peças ou serviços.
              </div>
            )}

            {/* ── PEÇAS ── */}
            {pecas.length > 0 && (
              <div>
                <div className="px-3 py-2 bg-muted/30 border-b border-border flex items-center gap-2">
                  <Package className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Peças</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{pecas.length} item(ns) · {fmt(totalPecas)}</span>
                </div>
                <div className="divide-y divide-border/30">
                  {pecas.map(item => {
                    const flag = getPriceFlag(item.valorUnitario, item.precoRef);
                    return (
                      <div key={item.id} className={`px-4 py-2.5 ${
                        flag === 'alto' ? 'bg-destructive/5' : flag === 'atencao' ? 'bg-yellow-500/5' : ''
                      }`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-foreground">{item.descricao}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-foreground">{fmt(item.valorUnitario * item.quantidade)}</span>
                            <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="text-muted-foreground">{item.marca}</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Qtd:</span>
                            <Input
                              type="number" min={1} value={item.quantidade}
                              onChange={e => updateItem(item.id, 'quantidade', Math.max(1, Number(e.target.value)))}
                              className="w-12 h-6 text-[11px] text-center border-border px-1"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Valor:</span>
                            <Input
                              type="number" value={item.valorUnitario}
                              onChange={e => updateItem(item.id, 'valorUnitario', Number(e.target.value))}
                              className="w-20 h-6 text-[11px] font-mono border-border px-1"
                            />
                          </div>
                          {flag && <AlertTriangle className={`w-3 h-3 ${flag === 'alto' ? 'text-destructive' : 'text-yellow-500'}`} />}
                        </div>
                        {flag === 'atencao' && <p className="text-[10px] text-yellow-600 mt-1">⚠ Valor acima da tabela regional</p>}
                        {flag === 'alto' && <p className="text-[10px] text-destructive mt-1">⚠ Valor muito acima — justifique antes de enviar</p>}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── MÃO DE OBRA ── */}
            {maoDeObra.length > 0 && (
              <div>
                <div className="px-3 py-2 bg-muted/30 border-y border-border flex items-center gap-2">
                  <Wrench className="w-3.5 h-3.5 text-primary" />
                  <span className="text-[11px] font-bold text-foreground uppercase tracking-wider">Mão de Obra</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">{maoDeObra.length} serviço(s) · {fmt(totalMaoObra)}</span>
                </div>
                <div className="divide-y divide-border/30">
                  {maoDeObra.map(item => {
                    const subtotal = (item.horas || 0) * (item.valorHora || 0);
                    return (
                      <div key={item.id} className="px-4 py-2.5">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-medium text-foreground">{item.descricao}</span>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-foreground">{fmt(subtotal)}</span>
                            <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Horas:</span>
                            <Input
                              type="number" step={0.5} min={0.5} value={item.horas || 0}
                              onChange={e => updateItem(item.id, 'horas', Number(e.target.value))}
                              className="w-14 h-6 text-[11px] text-center border-border px-1"
                            />
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="text-muted-foreground">Valor/Hora:</span>
                            <Input
                              type="number" value={item.valorHora || 0}
                              onChange={e => updateItem(item.id, 'valorHora', Number(e.target.value))}
                              className="w-20 h-6 text-[11px] font-mono border-border px-1"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ═══ BOTTOM ROW: LEFT (dados) · CENTER (laudo) · RIGHT (totais) ═══ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Left: Important data */}
          <div className="bg-card border border-border rounded-lg p-3 space-y-2">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Dados do Veículo</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Placa</span>
                <span className="font-mono font-bold text-foreground">{vehicle.placa}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Modelo</span>
                <span className="text-foreground">{vehicle.marca} {vehicle.modelo}</span>
              </div>
              {vehicle.ano && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Ano</span>
                  <span className="text-foreground">{vehicle.ano}</span>
                </div>
              )}
              {vehicle.chassi && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chassi</span>
                  <span className="font-mono text-[10px] text-foreground">{vehicle.chassi}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">KM</span>
                <span className="font-mono text-foreground">{kmAtual.toLocaleString()}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">Oficina</span>
                <span className="text-foreground">{serviceOrder.oficina_nome || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Itens</span>
                <span className="text-foreground">{pecas.length} peças · {maoDeObra.length} serviços</span>
              </div>
            </div>
          </div>

          {/* Center: Technical explanation */}
          <div className="bg-card border border-border rounded-lg p-3">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Esclarecimento Técnico</h3>
            <Textarea
              placeholder="Descreva o diagnóstico, problemas identificados e justificativas técnicas..."
              value={laudoTecnico}
              onChange={e => setLaudoTecnico(e.target.value)}
              className="min-h-[120px] text-xs border-border resize-none"
            />
          </div>

          {/* Right: Totals */}
          <div className="bg-card border border-border rounded-lg p-3 space-y-2">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Resumo Financeiro</h3>
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Peças ({pecas.length})</span>
                <span className="font-mono text-foreground">{fmt(totalPecas)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mão de Obra ({maoDeObra.length})</span>
                <span className="font-mono text-foreground">{fmt(totalMaoObra)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Total Horas</span>
                <span className="font-mono">{totalHoras}h</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold">
                <span className="text-foreground">Total Bruto</span>
                <span className="font-mono text-foreground">{fmt(totalBruto)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-[10px]">
                <span>Comissão NovaLink (15%)</span>
                <span className="font-mono">{fmt(comissao)}</span>
              </div>
              <div className="flex justify-between text-muted-foreground text-[10px]">
                <span>Repasse Oficina (85%)</span>
                <span className="font-mono">{fmt(totalLiquido)}</span>
              </div>
              <Separator />
              <div className="flex items-center gap-1.5 text-[10px] text-primary">
                <Shield className="w-3 h-3" />
                <span className="font-medium">Selo de Validação NovaLink</span>
                {items.length > 0 && <CheckCircle2 className="w-3 h-3 ml-auto" />}
              </div>
            </div>
          </div>
        </div>

        {/* ═══ SUBMIT ═══ */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={handleSubmit}
            disabled={saving || items.length === 0 || kmAtual <= 0}
            className="gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar Orçamento
          </Button>
        </div>
      </div>

      {/* Click outside to close dropdowns */}
      {(showPartDropdown || showLaborDropdown) && (
        <div
          className="fixed inset-0 z-20"
          onClick={() => { setShowPartDropdown(false); setShowLaborDropdown(false); }}
        />
      )}
    </div>
  );
}
