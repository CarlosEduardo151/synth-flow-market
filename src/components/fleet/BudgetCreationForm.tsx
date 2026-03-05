import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Plus, Trash2, Send, Loader2, Save,
  Wrench, Package, Search, X, Car, FileText
} from 'lucide-react';
import type { useFleetData, FleetServiceOrder, FleetVehicle } from '@/hooks/useFleetData';
import { toast } from 'sonner';

// ── Catalogs ──
const pecasCatalogo = [
  { code: 'FLT-OL-001', nome: 'Filtro de óleo motor', ref: 45 },
  { code: 'FLT-AR-001', nome: 'Filtro de ar motor', ref: 65 },
  { code: 'FLT-CB-001', nome: 'Filtro de combustível', ref: 85 },
  { code: 'FLT-SEP-001', nome: 'Filtro separador água/diesel', ref: 120 },
  { code: 'OLE-001', nome: 'Óleo motor 15W40 (litro)', ref: 32 },
  { code: 'OLE-002', nome: 'Óleo câmbio 75W90 (litro)', ref: 48 },
  { code: 'OLE-003', nome: 'Fluido de arrefecimento (litro)', ref: 22 },
  { code: 'PAS-001', nome: 'Pastilhas de freio (jogo)', ref: 180 },
  { code: 'DIS-001', nome: 'Disco de freio dianteiro', ref: 320 },
  { code: 'DIS-002', nome: 'Disco de freio traseiro', ref: 290 },
  { code: 'LON-001', nome: 'Lona de freio (jogo)', ref: 250 },
  { code: 'TAM-001', nome: 'Tambor de freio traseiro', ref: 380 },
  { code: 'AMO-001', nome: 'Amortecedor dianteiro', ref: 450 },
  { code: 'AMO-002', nome: 'Amortecedor traseiro', ref: 380 },
  { code: 'MOL-001', nome: 'Feixe de molas traseiro', ref: 950 },
  { code: 'PIV-001', nome: 'Pivô de suspensão', ref: 220 },
  { code: 'TER-001', nome: 'Terminal de direção', ref: 180 },
  { code: 'KIT-RET-001', nome: 'Kit retífica completo', ref: 4800 },
  { code: 'PIS-001', nome: 'Pistões com pinos (jogo)', ref: 1800 },
  { code: 'ANE-001', nome: 'Anéis de pistão (jogo)', ref: 650 },
  { code: 'BRZ-BIE-001', nome: 'Bronzinas de biela (jogo)', ref: 380 },
  { code: 'BRZ-MAN-001', nome: 'Bronzinas de mancal (jogo)', ref: 420 },
  { code: 'VIR-001', nome: 'Virabrequim retificado', ref: 3500 },
  { code: 'CAB-001', nome: 'Cabeçote retificado', ref: 4200 },
  { code: 'JNT-CAB-001', nome: 'Junta do cabeçote', ref: 280 },
  { code: 'JNT-KIT-001', nome: 'Kit juntas do motor', ref: 850 },
  { code: 'CMD-001', nome: 'Eixo comando de válvulas', ref: 1800 },
  { code: 'VOL-001', nome: 'Volante do motor', ref: 1200 },
  { code: 'BOM-OLE-001', nome: 'Bomba de óleo', ref: 520 },
  { code: 'COR-001', nome: 'Kit correia dentada + tensor', ref: 380 },
  { code: 'RAD-001', nome: 'Radiador completo', ref: 890 },
  { code: 'BOM-001', nome: 'Bomba d\'água', ref: 280 },
  { code: 'BIC-001', nome: 'Bico injetor (un)', ref: 450 },
  { code: 'BOM-COMB-001', nome: 'Bomba combustível alta pressão', ref: 3800 },
  { code: 'TUR-001', nome: 'Turbo recondicionado', ref: 3200 },
  { code: 'TUR-002', nome: 'Turbo novo', ref: 5800 },
  { code: 'EMB-KIT', nome: 'Kit embreagem completo', ref: 1200 },
  { code: 'EMB-VOL', nome: 'Volante bimassa', ref: 2800 },
  { code: 'DIF-001', nome: 'Kit reparo diferencial', ref: 2200 },
  { code: 'BAT-001', nome: 'Bateria 12V 150Ah', ref: 680 },
  { code: 'ALT-001', nome: 'Alternador recondicionado', ref: 650 },
  { code: 'CXD-001', nome: 'Caixa de direção hidráulica', ref: 1800 },
  { code: 'CMP-001', nome: 'Compressor ar-condicionado', ref: 1400 },
  { code: 'PNE-001', nome: 'Pneu 295/80R22.5', ref: 1800 },
  { code: 'ESC-001', nome: 'Silencioso escapamento', ref: 650 },
  { code: 'PBR-001', nome: 'Para-brisa', ref: 850 },
];

const servicosCatalogo = [
  { code: 'MOT-001', nome: 'Troca de óleo e filtro', horas: 1, taxa: 100 },
  { code: 'MOT-002', nome: 'Troca de correia dentada', horas: 3.5, taxa: 130 },
  { code: 'MOT-003', nome: 'Retífica completa de motor', horas: 40, taxa: 150 },
  { code: 'MOT-004', nome: 'Troca de bomba d\'água', horas: 2.5, taxa: 120 },
  { code: 'MOT-006', nome: 'Troca de radiador', horas: 3, taxa: 120 },
  { code: 'MOT-010', nome: 'Diagnóstico interno do motor', horas: 8, taxa: 140 },
  { code: 'MOT-011', nome: 'Retífica do bloco', horas: 12, taxa: 160 },
  { code: 'MOT-012', nome: 'Retífica do cabeçote', horas: 8, taxa: 150 },
  { code: 'MOT-013', nome: 'Retífica do virabrequim', horas: 6, taxa: 150 },
  { code: 'MOT-014', nome: 'Montagem motor retificado', horas: 16, taxa: 150 },
  { code: 'MOT-015', nome: 'Instalação motor no veículo', horas: 10, taxa: 140 },
  { code: 'MOT-016', nome: 'Troca junta do cabeçote', horas: 8, taxa: 140 },
  { code: 'MOT-017', nome: 'Troca pistões e anéis', horas: 12, taxa: 150 },
  { code: 'MOT-026', nome: 'Teste motor retificado', horas: 4, taxa: 120 },
  { code: 'FRE-001', nome: 'Troca de pastilhas (eixo)', horas: 1.5, taxa: 110 },
  { code: 'FRE-002', nome: 'Troca de discos (eixo)', horas: 2, taxa: 110 },
  { code: 'FRE-004', nome: 'Troca de lona (eixo)', horas: 2.5, taxa: 110 },
  { code: 'SUS-001', nome: 'Troca amortecedores (par)', horas: 2.5, taxa: 110 },
  { code: 'SUS-002', nome: 'Alinhamento e balanceamento', horas: 1, taxa: 80 },
  { code: 'SUS-003', nome: 'Troca de feixe de molas', horas: 4, taxa: 120 },
  { code: 'EMB-001', nome: 'Troca de embreagem', horas: 6, taxa: 140 },
  { code: 'CAM-001', nome: 'Revisão câmbio automático', horas: 8, taxa: 150 },
  { code: 'CAM-002', nome: 'Revisão câmbio manual', horas: 12, taxa: 140 },
  { code: 'ELE-001', nome: 'Diagnóstico elétrico', horas: 2, taxa: 100 },
  { code: 'ELE-002', nome: 'Troca alternador/partida', horas: 2, taxa: 110 },
  { code: 'TUR-001S', nome: 'Troca de turbo', horas: 5, taxa: 140 },
  { code: 'ARR-001', nome: 'Reparo ar-condicionado', horas: 3, taxa: 120 },
  { code: 'DIR-001', nome: 'Reparo caixa de direção', horas: 4.5, taxa: 130 },
  { code: 'DIF-001S', nome: 'Revisão diferencial', horas: 8, taxa: 140 },
  { code: 'INJ-003', nome: 'Diagnóstico eletrônico (scanner)', horas: 2, taxa: 120 },
];

type ItemTipo = 'MECÂNICA' | 'PEÇAS';

interface BudgetItem {
  id: string;
  tipo: ItemTipo;
  descricao: string;
  code: string;
  observacao: string;
  qtd: number;
  valorUnitario: number;
  desconto: number;
  horas?: number;
  valorHora?: number;
}

interface Props {
  serviceOrder: FleetServiceOrder;
  vehicle: FleetVehicle;
  fleet: ReturnType<typeof useFleetData>;
  onClose: () => void;
  onSuccess: () => void;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

function getValorFinal(item: BudgetItem) {
  const base = item.tipo === 'MECÂNICA'
    ? (item.horas || 0) * (item.valorHora || 0)
    : item.valorUnitario * item.qtd;
  return base * (1 - item.desconto / 100);
}

export function BudgetCreationForm({ serviceOrder, vehicle, fleet, onClose, onSuccess }: Props) {
  const [km, setKm] = useState(vehicle.km_atual || 0);
  const [previsao, setPrevisao] = useState('');
  const [laudo, setLaudo] = useState('');
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchType, setSearchType] = useState<ItemTipo>('PEÇAS');

  const dataEntrada = serviceOrder.data_entrada
    ? new Date(serviceOrder.data_entrada).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');

  const veiculoDesc = [vehicle.marca, vehicle.modelo, vehicle.ano].filter(Boolean).join(' · ');
  const osNumber = `${vehicle.placa}/${serviceOrder.id.slice(0, 4).toUpperCase()}`;

  const totalBruto = items.reduce((s, i) => s + getValorFinal(i), 0);
  const totalPecas = items.filter(i => i.tipo === 'PEÇAS').reduce((s, i) => s + getValorFinal(i), 0);
  const totalMO = items.filter(i => i.tipo === 'MECÂNICA').reduce((s, i) => s + getValorFinal(i), 0);

  const searchResults = searchQuery.length >= 2
    ? searchType === 'PEÇAS'
      ? pecasCatalogo.filter(p => p.nome.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8)
      : servicosCatalogo.filter(s => s.nome.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8)
    : [];

  const addFromCatalog = (entry: any) => {
    if (items.find(x => x.code === entry.code)) {
      toast.info('Item já adicionado');
      return;
    }
    if (searchType === 'PEÇAS') {
      setItems(prev => [...prev, {
        id: crypto.randomUUID(), tipo: 'PEÇAS', descricao: entry.nome, code: entry.code,
        observacao: '', qtd: 1, valorUnitario: entry.ref, desconto: 0,
      }]);
    } else {
      setItems(prev => [...prev, {
        id: crypto.randomUUID(), tipo: 'MECÂNICA', descricao: entry.nome, code: entry.code,
        observacao: '', qtd: 1, valorUnitario: 0, desconto: 0,
        horas: entry.horas, valorHora: entry.taxa,
      }]);
    }
    setSearchQuery('');
    setSearchOpen(false);
  };

  const addManualItem = () => {
    setItems(prev => [...prev, {
      id: crypto.randomUUID(),
      tipo: searchType,
      descricao: '',
      code: `CUSTOM-${Date.now().toString(36).toUpperCase()}`,
      observacao: '', qtd: 1, valorUnitario: 0, desconto: 0,
      ...(searchType === 'MECÂNICA' ? { horas: 1, valorHora: 100 } : {}),
    }]);
  };

  const updateItem = (id: string, patch: Partial<BudgetItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSubmit = async () => {
    if (items.length === 0) { toast.error('Adicione itens ao orçamento.'); return; }
    if (km <= 0) { toast.error('Informe o KM de entrada.'); return; }
    setSaving(true);
    try {
      const cpId = serviceOrder.customer_product_id;
      await supabase.from('fleet_vehicles').update({ km_atual: km }).eq('id', vehicle.id);

      const { data: budget, error: budgetErr } = await supabase.from('fleet_budgets').insert({
        service_order_id: serviceOrder.id,
        customer_product_id: cpId,
        laudo_tecnico: laudo || 'Orçamento gerado via Auditt.',
        urgencia: 'normal',
        status: 'pendente',
        total_pecas: totalPecas,
        total_mao_de_obra: totalMO,
        total_bruto: totalBruto,
        comissao_pct: 15,
        total_liquido: totalBruto * 0.85,
      }).select().single();
      if (budgetErr) throw budgetErr;

      const dbItems = items.map((item, i) => ({
        budget_id: (budget as any).id,
        tipo: item.tipo === 'MECÂNICA' ? 'mao_de_obra' : 'peca',
        codigo: item.code,
        descricao: item.descricao,
        quantidade: item.qtd,
        valor_unitario: item.tipo === 'MECÂNICA' ? (item.horas || 0) * (item.valorHora || 0) : item.valorUnitario,
        valor_total: getValorFinal(item),
        horas: item.horas || null,
        valor_hora: item.valorHora || null,
        sort_order: i,
      }));

      if (dbItems.length > 0) {
        const { error } = await supabase.from('fleet_budget_items').insert(dbItems);
        if (error) throw error;
      }

      await fleet.updateStage(serviceOrder.id, 'orcamento_enviado', 'oficina',
        'Orçamento enviado para aprovação',
        { descricao_servico: `Peças: ${fmt(totalPecas)} | M.O: ${fmt(totalMO)} | Total: ${fmt(totalBruto)}`, valor_orcamento: totalBruto }
      );
      toast.success('Orçamento enviado com sucesso!');
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error('Erro ao salvar orçamento.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[hsl(220,20%,7%)] text-foreground overflow-hidden">

      {/* ══════════ TOP BAR ══════════ */}
      <div className="shrink-0 flex items-center justify-between px-4 h-12 bg-[hsl(220,20%,10%)] border-b border-[hsl(175,60%,50%/0.3)]">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-5 w-px bg-border" />
          <FileText className="w-4 h-4 text-[hsl(175,60%,50%)]" />
          <span className="text-sm font-bold">Orçamento</span>
          <span className="text-xs text-muted-foreground font-mono">OS {osNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleSubmit} disabled={saving || items.length === 0 || km <= 0}
            className="h-8 text-xs gap-1.5 border-[hsl(175,60%,50%/0.4)] text-[hsl(175,60%,50%)] hover:bg-[hsl(175,60%,50%/0.1)]">
            <Save className="w-3.5 h-3.5" /> Salvar Rascunho
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={saving || items.length === 0 || km <= 0}
            className="h-8 text-xs gap-1.5 bg-[hsl(175,60%,50%)] hover:bg-[hsl(175,60%,45%)] text-[hsl(220,20%,7%)] font-bold">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Enviar Orçamento
          </Button>
        </div>
      </div>

      {/* ══════════ CONTENT AREA (sidebar + main) ══════════ */}
      <div className="flex-1 flex overflow-hidden">

        {/* ── LEFT SIDEBAR: Vehicle + Summary ── */}
        <div className="shrink-0 w-[280px] bg-[hsl(220,20%,9%)] border-r border-border overflow-y-auto">

          {/* Vehicle Card */}
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-2 mb-3">
              <Car className="w-4 h-4 text-[hsl(175,60%,50%)]" />
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Veículo</span>
            </div>
            <div className="bg-[hsl(220,20%,12%)] rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-lg font-black font-mono tracking-wider text-[hsl(175,60%,50%)]">{vehicle.placa}</span>
              </div>
              <p className="text-[11px] text-muted-foreground">{veiculoDesc || '—'}</p>
            </div>
          </div>

          {/* Meta Fields */}
          <div className="p-4 space-y-3 border-b border-border">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">KM de Entrada *</label>
              <Input type="number" value={km || ''} onChange={e => setKm(Number(e.target.value))}
                placeholder="Ex: 85000"
                className="h-8 font-mono text-xs bg-[hsl(220,20%,12%)] border-border" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Data de Entrada</label>
              <div className="h-8 px-3 flex items-center rounded-md bg-[hsl(220,20%,12%)] border border-border text-xs font-mono">
                {dataEntrada}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Prev. Conclusão</label>
              <Input type="date" value={previsao} onChange={e => setPrevisao(e.target.value)}
                className="h-8 text-xs bg-[hsl(220,20%,12%)] border-border" />
            </div>
          </div>

          {/* Laudo */}
          <div className="p-4 border-b border-border">
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-1">Laudo / Observações</label>
            <Textarea
              placeholder="Condições do veículo, problemas encontrados..."
              value={laudo} onChange={e => setLaudo(e.target.value)}
              className="min-h-[80px] text-xs bg-[hsl(220,20%,12%)] border-border resize-none"
            />
          </div>

          {/* Financial Summary */}
          <div className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Resumo</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1"><Package className="w-3 h-3" /> Peças</span>
                <span className="font-mono">{fmt(totalPecas)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground flex items-center gap-1"><Wrench className="w-3 h-3" /> Mão de Obra</span>
                <span className="font-mono">{fmt(totalMO)}</span>
              </div>
              <div className="h-px bg-border my-1" />
              <div className="flex justify-between text-sm font-bold">
                <span>Total</span>
                <span className="font-mono text-[hsl(175,60%,50%)]">{fmt(totalBruto)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground">
                <span>Auditt (15%)</span>
                <span className="font-mono">{fmt(totalBruto * 0.15)}</span>
              </div>
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-muted-foreground">Repasse (85%)</span>
                <span className="font-mono text-[hsl(145,60%,50%)]">{fmt(totalBruto * 0.85)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── MAIN: Items Table ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Search Bar */}
          <div className="shrink-0 px-4 py-3 bg-[hsl(220,20%,9%)] border-b border-border flex items-center gap-2">
            {/* Type toggle */}
            <div className="flex shrink-0">
              <button
                onClick={() => { setSearchType('PEÇAS'); setSearchQuery(''); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-l-md text-[11px] font-bold uppercase transition-colors border border-r-0 ${
                  searchType === 'PEÇAS'
                    ? 'bg-[hsl(175,60%,50%)] text-[hsl(220,20%,7%)] border-[hsl(175,60%,50%)]'
                    : 'bg-transparent text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                <Package className="w-3.5 h-3.5" /> Peças
              </button>
              <button
                onClick={() => { setSearchType('MECÂNICA'); setSearchQuery(''); }}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-r-md text-[11px] font-bold uppercase transition-colors border ${
                  searchType === 'MECÂNICA'
                    ? 'bg-[hsl(175,60%,50%)] text-[hsl(220,20%,7%)] border-[hsl(175,60%,50%)]'
                    : 'bg-transparent text-muted-foreground border-border hover:text-foreground'
                }`}
              >
                <Wrench className="w-3.5 h-3.5" /> Serviços
              </button>
            </div>

            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <input
                placeholder={searchType === 'PEÇAS' ? 'Buscar peça por nome ou código...' : 'Buscar serviço por nome ou código...'}
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                onFocus={() => setSearchOpen(true)}
                className="w-full h-9 pl-9 pr-10 rounded-md bg-[hsl(220,20%,12%)] border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-[hsl(175,60%,50%/0.5)]"
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
              {searchOpen && searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-[hsl(220,20%,12%)] border border-border rounded-lg shadow-2xl max-h-64 overflow-y-auto">
                  {searchResults.map((entry: any) => (
                    <button key={entry.code} onClick={() => addFromCatalog(entry)}
                      className="w-full text-left px-4 py-2.5 hover:bg-[hsl(175,60%,50%/0.08)] border-b border-border/30 last:border-0 transition-colors flex justify-between items-center gap-3">
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{entry.nome}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{entry.code}</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-[hsl(175,60%,50%)] shrink-0">
                        {searchType === 'PEÇAS' ? fmt(entry.ref) : `${entry.horas}h × ${fmt(entry.taxa)}`}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Manual add */}
            <Button variant="outline" size="sm" onClick={addManualItem}
              className="shrink-0 h-9 text-xs gap-1 border-border text-muted-foreground hover:text-foreground hover:border-[hsl(175,60%,50%/0.4)]">
              <Plus className="w-3.5 h-3.5" /> Manual
            </Button>
          </div>

          {/* ── TABLE HEADER ── */}
          <div className="shrink-0 bg-[hsl(145,55%,28%)] px-4">
            <div className="grid grid-cols-[40px_1fr_140px_80px_90px_90px_70px_100px_36px] items-center h-9 gap-2 text-[10px] font-bold uppercase tracking-wider text-white/90">
              <span className="text-center">#</span>
              <span>Descrição</span>
              <span>Observação</span>
              <span className="text-center">Qtde/Hrs</span>
              <span className="text-right">Valor Unit.</span>
              <span className="text-right">Valor/Hora</span>
              <span className="text-center">Desc %</span>
              <span className="text-right">Total</span>
              <span></span>
            </div>
          </div>

          {/* ── TABLE BODY ── */}
          <div className="flex-1 overflow-y-auto">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground/50 gap-3">
                <Package className="w-12 h-12" />
                <p className="text-sm">Nenhum item adicionado ao orçamento</p>
                <p className="text-xs">Use a busca acima para adicionar peças e serviços</p>
              </div>
            ) : (
              items.map((item, idx) => {
                const valor = getValorFinal(item);
                const isMec = item.tipo === 'MECÂNICA';
                return (
                  <div key={item.id}
                    className={`grid grid-cols-[40px_1fr_140px_80px_90px_90px_70px_100px_36px] items-center px-4 gap-2 h-12 border-b border-border/20 transition-colors group ${
                      idx % 2 === 0 ? 'bg-[hsl(220,20%,8%)]' : 'bg-[hsl(220,20%,9%)]'
                    } hover:bg-[hsl(175,60%,50%/0.04)]`}>
                    {/* # */}
                    <span className="text-center text-[10px] text-muted-foreground font-mono">{idx + 1}</span>
                    {/* Descrição */}
                    <div className="flex items-center gap-2 min-w-0">
                      <span className={`shrink-0 w-1.5 h-6 rounded-full ${isMec ? 'bg-amber-500' : 'bg-blue-500'}`} />
                      <input
                        value={item.descricao}
                        onChange={e => updateItem(item.id, { descricao: e.target.value })}
                        placeholder={isMec ? 'Nome do serviço...' : 'Nome da peça...'}
                        className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/40 outline-none truncate"
                      />
                    </div>
                    {/* Observação */}
                    <input
                      value={item.observacao}
                      onChange={e => updateItem(item.id, { observacao: e.target.value })}
                      placeholder="—"
                      className="w-full bg-transparent text-xs text-muted-foreground placeholder:text-muted-foreground/30 outline-none"
                    />
                    {/* Qtde/Horas */}
                    <input
                      type="number"
                      min={isMec ? 0 : 1}
                      step={isMec ? 0.5 : 1}
                      value={isMec ? (item.horas || '') : item.qtd}
                      onChange={e => {
                        const v = Number(e.target.value);
                        isMec ? updateItem(item.id, { horas: Math.max(0, v) }) : updateItem(item.id, { qtd: Math.max(1, v) });
                      }}
                      className="w-full text-center bg-transparent text-xs font-mono text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {/* Valor Unit. */}
                    {!isMec ? (
                      <input
                        type="number"
                        step={0.01}
                        min={0}
                        value={item.valorUnitario || ''}
                        onChange={e => updateItem(item.id, { valorUnitario: Number(e.target.value) })}
                        className="w-full text-right bg-transparent text-xs font-mono text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    ) : (
                      <span className="text-right text-xs font-mono text-muted-foreground/50">—</span>
                    )}
                    {/* Valor/Hora */}
                    {isMec ? (
                      <input
                        type="number"
                        step={1}
                        min={0}
                        value={item.valorHora || ''}
                        onChange={e => updateItem(item.id, { valorHora: Math.max(0, Number(e.target.value)) })}
                        className="w-full text-right bg-transparent text-xs font-mono text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    ) : (
                      <span className="text-right text-xs font-mono text-muted-foreground/50">—</span>
                    )}
                    {/* Desc % */}
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={item.desconto || ''}
                      onChange={e => updateItem(item.id, { desconto: Math.min(100, Math.max(0, Number(e.target.value))) })}
                      className="w-full text-center bg-transparent text-xs font-mono text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                    {/* Total */}
                    <span className="text-right text-xs font-mono font-bold text-[hsl(175,60%,50%)]">
                      {fmt(valor)}
                    </span>
                    {/* Remove */}
                    <button onClick={() => removeItem(item.id)}
                      className="opacity-0 group-hover:opacity-100 text-destructive/50 hover:text-destructive transition-all flex justify-center">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* ── TABLE FOOTER ── */}
          {items.length > 0 && (
            <div className="shrink-0 bg-[hsl(220,20%,10%)] border-t border-[hsl(175,60%,50%/0.2)] px-4">
              <div className="grid grid-cols-[40px_1fr_140px_80px_90px_90px_70px_100px_36px] items-center h-11 gap-2">
                <span></span>
                <span className="text-xs text-muted-foreground">{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span></span>
                <span className="text-right text-sm font-mono font-black text-[hsl(175,60%,50%)]">{fmt(totalBruto)}</span>
                <span></span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backdrop */}
      {searchOpen && searchResults.length > 0 && (
        <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)} />
      )}
    </div>
  );
}
