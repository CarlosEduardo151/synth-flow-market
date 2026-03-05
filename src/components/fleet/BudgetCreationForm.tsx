import { useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  ArrowLeft, Plus, Trash2, Send, Loader2, Save,
  Wrench, Package, Search, X, ChevronDown, Car, Calendar, Gauge
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
  const searchRef = useRef<HTMLInputElement>(null);

  const dataEntrada = serviceOrder.data_entrada
    ? new Date(serviceOrder.data_entrada).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');

  const veiculoDesc = [vehicle.marca, vehicle.modelo, vehicle.ano].filter(Boolean).join(' · ');

  const totalBruto = items.reduce((s, i) => s + getValorFinal(i), 0);
  const totalPecas = items.filter(i => i.tipo === 'PEÇAS').reduce((s, i) => s + getValorFinal(i), 0);
  const totalMO = items.filter(i => i.tipo === 'MECÂNICA').reduce((s, i) => s + getValorFinal(i), 0);

  const searchResults = searchQuery.length >= 2
    ? searchType === 'PEÇAS'
      ? pecasCatalogo.filter(p => p.nome.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 6)
      : servicosCatalogo.filter(s => s.nome.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 6)
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
      descricao: searchType === 'PEÇAS' ? 'Peça personalizada' : 'Serviço personalizado',
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
    if (items.length === 0) {
      toast.error('Adicione pelo menos um item ao orçamento.');
      return;
    }
    if (km <= 0) {
      toast.error('Informe o KM de entrada do veículo.');
      return;
    }
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

  const pecasItems = items.filter(i => i.tipo === 'PEÇAS');
  const mecanicaItems = items.filter(i => i.tipo === 'MECÂNICA');

  return (
    <div className="min-h-screen bg-background text-foreground pb-32">

      {/* ══ HEADER ══ */}
      <div className="sticky top-0 z-30 bg-card border-b-2 border-primary">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-sm font-bold truncate">Orçamento — {vehicle.placa}</h1>
            <p className="text-[11px] text-muted-foreground truncate">{veiculoDesc}</p>
          </div>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={saving || items.length === 0}
            className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shrink-0"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar
          </Button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">

        {/* ══ INFO DO VEÍCULO ══ */}
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 mb-3">
            <Car className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Dados do Veículo</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">Placa</label>
              <div className="h-9 px-3 flex items-center rounded-md bg-muted/30 border border-border text-sm font-mono font-bold">
                {vehicle.placa}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">Entrada</label>
              <div className="h-9 px-3 flex items-center rounded-md bg-muted/30 border border-border text-sm font-mono">
                {dataEntrada}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">KM Entrada *</label>
              <Input
                type="number"
                value={km || ''}
                onChange={e => setKm(Number(e.target.value))}
                placeholder="Ex: 85000"
                className="h-9 font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">Prev. Conclusão</label>
              <Input
                type="date"
                value={previsao}
                onChange={e => setPrevisao(e.target.value)}
                className="h-9"
              />
            </div>
          </div>
        </Card>

        {/* ══ BUSCA + ADICIONAR ITENS ══ */}
        <Card className="p-4 bg-card border-border">
          <div className="flex items-center gap-2 mb-3">
            <Search className="w-4 h-4 text-primary" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Adicionar Itens</h2>
          </div>

          {/* Type toggle */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => { setSearchType('PEÇAS'); setSearchQuery(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                searchType === 'PEÇAS'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              Peças
            </button>
            <button
              onClick={() => { setSearchType('MECÂNICA'); setSearchQuery(''); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                searchType === 'MECÂNICA'
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted/40 text-muted-foreground hover:bg-muted/60'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              Serviços
            </button>
          </div>

          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              ref={searchRef}
              placeholder={searchType === 'PEÇAS' ? 'Buscar peça por nome ou código...' : 'Buscar serviço por nome ou código...'}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              className="h-10 pl-9 pr-10"
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            )}

            {/* Dropdown results */}
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute z-40 w-full mt-1 bg-popover border border-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {searchResults.map((entry: any) => (
                  <button
                    key={entry.code}
                    onClick={() => addFromCatalog(entry)}
                    className="w-full text-left px-4 py-3 hover:bg-accent/50 border-b border-border/30 last:border-0 transition-colors"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{entry.nome}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{entry.code}</p>
                      </div>
                      <span className="text-xs font-mono font-bold text-primary shrink-0">
                        {searchType === 'PEÇAS' ? fmt(entry.ref) : `${entry.horas}h × ${fmt(entry.taxa)}`}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Manual add button */}
          <button
            onClick={addManualItem}
            className="mt-2 flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar {searchType === 'PEÇAS' ? 'peça' : 'serviço'} manualmente
          </button>
        </Card>

        {/* ══ SEÇÃO PEÇAS ══ */}
        {pecasItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-blue-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Peças ({pecasItems.length})
              </h3>
              <span className="ml-auto text-xs font-mono font-bold text-primary">{fmt(totalPecas)}</span>
            </div>
            <div className="space-y-2">
              {pecasItems.map(item => (
                <ItemCard key={item.id} item={item} onUpdate={updateItem} onRemove={removeItem} />
              ))}
            </div>
          </div>
        )}

        {/* ══ SEÇÃO SERVIÇOS ══ */}
        {mecanicaItems.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Wrench className="w-4 h-4 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                Mão de Obra ({mecanicaItems.length})
              </h3>
              <span className="ml-auto text-xs font-mono font-bold text-primary">{fmt(totalMO)}</span>
            </div>
            <div className="space-y-2">
              {mecanicaItems.map(item => (
                <ItemCard key={item.id} item={item} onUpdate={updateItem} onRemove={removeItem} />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 && (
          <Card className="p-8 bg-card border-border border-dashed flex flex-col items-center justify-center gap-2">
            <Package className="w-8 h-8 text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhum item adicionado</p>
            <p className="text-[11px] text-muted-foreground/60">Use a busca acima para adicionar peças e serviços</p>
          </Card>
        )}

        {/* ══ OBSERVAÇÕES ══ */}
        <Card className="p-4 bg-card border-border">
          <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 block">
            Observações / Laudo Técnico
          </label>
          <Textarea
            placeholder="Descreva o problema encontrado, condições do veículo, recomendações..."
            value={laudo}
            onChange={e => setLaudo(e.target.value)}
            className="min-h-[80px] text-sm resize-none"
          />
        </Card>

        {/* ══ RESUMO FINANCEIRO ══ */}
        {items.length > 0 && (
          <Card className="overflow-hidden border-primary/30">
            <div className="bg-primary/10 px-4 py-2.5 border-b border-primary/20">
              <h2 className="text-xs font-bold uppercase tracking-widest text-primary">Resumo Financeiro</h2>
            </div>
            <div className="px-4 py-3 space-y-2 bg-card">
              {totalPecas > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5" /> Peças
                  </span>
                  <span className="font-mono">{fmt(totalPecas)}</span>
                </div>
              )}
              {totalMO > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" /> Mão de Obra
                  </span>
                  <span className="font-mono">{fmt(totalMO)}</span>
                </div>
              )}
              <div className="h-px bg-border" />
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span className="font-mono text-primary">{fmt(totalBruto)}</span>
              </div>
              <div className="flex justify-between text-[11px] text-muted-foreground">
                <span>Comissão Auditt (15%)</span>
                <span className="font-mono">{fmt(totalBruto * 0.15)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-muted-foreground">Repasse Oficina (85%)</span>
                <span className="font-mono text-green-500">{fmt(totalBruto * 0.85)}</span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* ══ BOTTOM BAR MOBILE ══ */}
      {items.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-30 bg-card border-t border-border px-4 py-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase">Total do Orçamento</p>
            <p className="text-lg font-bold font-mono text-primary">{fmt(totalBruto)}</p>
          </div>
          <Button
            onClick={handleSubmit}
            disabled={saving || km <= 0}
            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar Orçamento
          </Button>
        </div>
      )}

      {/* Backdrop */}
      {searchOpen && searchResults.length > 0 && (
        <div className="fixed inset-0 z-20" onClick={() => setSearchOpen(false)} />
      )}
    </div>
  );
}

/* ══════════════════════════════════════════
   ITEM CARD — Cada peça ou serviço
   ══════════════════════════════════════════ */

function ItemCard({
  item,
  onUpdate,
  onRemove,
}: {
  item: BudgetItem;
  onUpdate: (id: string, patch: Partial<BudgetItem>) => void;
  onRemove: (id: string) => void;
}) {
  const valor = getValorFinal(item);
  const isMecanica = item.tipo === 'MECÂNICA';

  return (
    <Card className="p-3 bg-card border-border hover:border-primary/20 transition-colors group">
      {/* Row 1: Name + Remove + Value */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <Input
            value={item.descricao}
            onChange={e => onUpdate(item.id, { descricao: e.target.value })}
            className="h-7 text-sm font-medium border-0 bg-transparent px-0 focus-visible:ring-0 focus-visible:border-b focus-visible:border-primary rounded-none"
          />
          <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{item.code}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-sm font-bold font-mono text-primary">{fmt(valor)}</span>
          <button
            onClick={() => onRemove(item.id)}
            className="opacity-0 group-hover:opacity-100 text-destructive/60 hover:text-destructive transition-all p-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Row 2: Fields */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {isMecanica ? (
          <>
            <div>
              <label className="text-[9px] text-muted-foreground block mb-0.5">Horas</label>
              <Input
                type="number"
                step={0.5}
                min={0}
                value={item.horas || ''}
                onChange={e => onUpdate(item.id, { horas: Math.max(0, Number(e.target.value)) })}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground block mb-0.5">Valor/hora (R$)</label>
              <Input
                type="number"
                step={1}
                min={0}
                value={item.valorHora || ''}
                onChange={e => onUpdate(item.id, { valorHora: Math.max(0, Number(e.target.value)) })}
                className="h-8 text-xs font-mono"
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <label className="text-[9px] text-muted-foreground block mb-0.5">Qtde</label>
              <Input
                type="number"
                min={1}
                value={item.qtd}
                onChange={e => onUpdate(item.id, { qtd: Math.max(1, Number(e.target.value)) })}
                className="h-8 text-xs font-mono"
              />
            </div>
            <div>
              <label className="text-[9px] text-muted-foreground block mb-0.5">Valor Unit. (R$)</label>
              <Input
                type="number"
                step={0.01}
                min={0}
                value={item.valorUnitario || ''}
                onChange={e => onUpdate(item.id, { valorUnitario: Number(e.target.value) })}
                className="h-8 text-xs font-mono"
              />
            </div>
          </>
        )}
        <div>
          <label className="text-[9px] text-muted-foreground block mb-0.5">Desconto %</label>
          <Input
            type="number"
            min={0}
            max={100}
            value={item.desconto || ''}
            onChange={e => onUpdate(item.id, { desconto: Math.min(100, Math.max(0, Number(e.target.value))) })}
            className="h-8 text-xs font-mono"
          />
        </div>
        <div>
          <label className="text-[9px] text-muted-foreground block mb-0.5">Observação</label>
          <Input
            value={item.observacao}
            onChange={e => onUpdate(item.id, { observacao: e.target.value })}
            placeholder="Obs..."
            className="h-8 text-xs"
          />
        </div>
      </div>
    </Card>
  );
}
