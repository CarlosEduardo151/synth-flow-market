import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Trash2, Send, Loader2, Save, Camera, FileText } from 'lucide-react';
import type { useFleetData, FleetServiceOrder, FleetVehicle } from '@/hooks/useFleetData';

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

const disponibilidadeOpcoes = ['Selecione', 'Em estoque', 'Terei que encomendar', 'Fornecedor entrega'];

type ItemTipo = 'MECÂNICA' | 'PEÇAS';

interface BudgetItem {
  id: string;
  tipo: ItemTipo;
  descricao: string;
  code: string;
  detalhes: string;
  disponibilidade: string;
  prazo: number;
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
    ? new Date(serviceOrder.data_entrada).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  const osNumber = `SS ${vehicle.placa}/${serviceOrder.id.slice(0, 4).toUpperCase()}`;
  const veiculoDesc = `${vehicle.marca || ''} - ${vehicle.modelo || ''} ${vehicle.ano || ''}`.trim();

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const getValorFinal = (item: BudgetItem) => {
    if (item.tipo === 'MECÂNICA') {
      const base = (item.horas || 0) * (item.valorHora || 0);
      return base - (base * (item.desconto / 100));
    }
    const base = item.valorUnitario * item.qtd;
    return base - (base * (item.desconto / 100));
  };

  const totalBruto = items.reduce((s, i) => s + getValorFinal(i), 0);
  const totalPecas = items.filter(i => i.tipo === 'PEÇAS').reduce((s, i) => s + getValorFinal(i), 0);
  const totalMO = items.filter(i => i.tipo === 'MECÂNICA').reduce((s, i) => s + getValorFinal(i), 0);

  // Search results
  const searchResults = searchQuery.length >= 2
    ? searchType === 'PEÇAS'
      ? pecasCatalogo.filter(p => p.nome.toLowerCase().includes(searchQuery.toLowerCase()) || p.code.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8)
      : servicosCatalogo.filter(s => s.nome.toLowerCase().includes(searchQuery.toLowerCase()) || s.code.toLowerCase().includes(searchQuery.toLowerCase())).slice(0, 8)
    : [];

  const addFromCatalog = (entry: any) => {
    const exists = items.find(x => x.code === entry.code);
    if (exists) return;
    if (searchType === 'PEÇAS') {
      setItems(prev => [...prev, {
        id: Date.now().toString(), tipo: 'PEÇAS', descricao: entry.nome, code: entry.code,
        detalhes: '', disponibilidade: 'Selecione', prazo: 0, qtd: 1,
        valorUnitario: entry.ref, desconto: 0,
      }]);
    } else {
      setItems(prev => [...prev, {
        id: Date.now().toString(), tipo: 'MECÂNICA', descricao: entry.nome, code: entry.code,
        detalhes: '', disponibilidade: '', prazo: 0, qtd: 1,
        valorUnitario: 0, desconto: 0, horas: entry.horas, valorHora: entry.taxa,
      }]);
    }
    setSearchQuery(''); setSearchOpen(false);
  };

  const updateItem = (id: string, patch: Partial<BudgetItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  };

  const removeItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleSubmit = async () => {
    if (items.length === 0 || km <= 0) return;
    setSaving(true);
    try {
      const cpId = (serviceOrder as any).customer_product_id;
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

      const dbItems: any[] = items.map((item, i) => ({
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
      onSuccess();
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">

      {/* ══ HEADER BAR ══ */}
      <div className="sticky top-0 z-30 border-b-2 border-[hsl(175,60%,50%)] bg-[hsl(220,20%,12%)]">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={onClose} className="shrink-0 text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-sm font-bold text-foreground">Operacional - Envio de Orçamento</h1>
              <p className="text-[10px] text-muted-foreground">CNPJ selecionado · {vehicle.placa} - {veiculoDesc}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs border-[hsl(175,60%,50%)] text-[hsl(175,60%,50%)] hover:bg-[hsl(175,60%,50%/.1)]">
              <Camera className="w-3.5 h-3.5" /> ENVIAR FOTOS
            </Button>
            <Button variant="outline" size="sm" onClick={handleSubmit} disabled={saving || items.length === 0 || km <= 0}
              className="h-8 gap-1.5 text-xs border-[hsl(120,60%,40%)] text-[hsl(120,60%,40%)] hover:bg-[hsl(120,60%,40%/.1)]">
              <Save className="w-3.5 h-3.5" /> SALVAR
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={saving || items.length === 0 || km <= 0}
              className="h-8 gap-1.5 text-xs bg-[hsl(175,60%,50%)] hover:bg-[hsl(175,60%,45%)] text-[hsl(220,20%,7%)] font-bold">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              SALVAR E ENVIAR
            </Button>
          </div>
        </div>
      </div>

      {/* ══ CADASTRO HEADER ══ */}
      <div className="bg-[hsl(220,20%,10%)] border-b border-border px-4 py-3">
        <h2 className="text-base font-bold text-foreground mb-2">Cadastro de Orçamento</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-0.5">Número SS / Sequencial</label>
            <div className="flex gap-1">
              <div className="h-8 px-3 flex items-center rounded border border-border bg-muted/20 text-xs font-mono text-foreground min-w-[100px]">
                {vehicle.placa}
              </div>
              <div className="h-8 px-3 flex items-center rounded border border-border bg-muted/20 text-xs font-mono text-foreground min-w-[50px]">
                {serviceOrder.id.slice(0, 4).toUpperCase()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ VEHICLE INFO + METADATA STRIP ══ */}
      <div className="bg-[hsl(220,20%,9%)] border-b border-border px-4 py-3">
        <div className="flex items-start gap-6 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <p className="text-sm font-bold text-foreground">{osNumber}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{veiculoDesc}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] text-muted-foreground">Valor Total Digitado</span>
              <span className="text-sm font-bold text-[hsl(175,60%,50%)] font-mono">{fmt(totalBruto)}</span>
            </div>
          </div>
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-0.5">KM de Entrada</label>
              <Input type="number" value={km || ''} onChange={e => setKm(Number(e.target.value))}
                className="h-8 w-28 font-mono text-xs bg-background border-border" placeholder="0" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-0.5">Data de Entrada</label>
              <div className="h-8 px-3 flex items-center rounded border border-border bg-[hsl(50,70%,85%)] text-xs text-[hsl(220,20%,15%)] font-mono min-w-[140px]">
                {dataEntrada}
              </div>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-0.5">Data de Prev. de Conclusão</label>
              <Input type="date" value={previsao} onChange={e => setPrevisao(e.target.value)}
                className="h-8 w-36 text-xs bg-background border-border" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase tracking-wider block mb-0.5">Valor Total Orçamento</label>
              <div className="h-8 px-3 flex items-center rounded border border-border bg-muted/20 text-xs font-mono font-bold text-foreground min-w-[120px]">
                R$ {totalBruto.toFixed(2).replace('.', ',')}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══ TABLE: PEÇAS E MÃO DE OBRA ══ */}
      <div className="px-4 py-3">
        {/* Green section header */}
        <div className="flex items-center justify-between bg-[hsl(145,60%,30%)] rounded-t-md px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-white text-xs font-bold uppercase tracking-wider">⚙ PEÇAS E MÃO DE OBRA</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-white/80 text-[10px] uppercase font-semibold">VALOR</span>
            <span className="text-white/80 text-[10px] uppercase font-semibold">DESCONTO</span>
          </div>
        </div>

        {/* Table */}
        <div className="border border-border border-t-0 rounded-b-md overflow-hidden">
          {/* Column Headers */}
          <div className="bg-muted/40 border-b border-border overflow-x-auto">
            <div className="grid grid-cols-[30px_110px_1fr_140px_140px_80px_60px_100px_70px_100px_36px] items-center px-2 py-2 gap-1 min-w-[1000px]">
              <span className="text-[9px] font-bold text-muted-foreground text-center">☐</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase">TIPO</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase">PEÇA (DESCRIÇÃO)</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase">DETALHES TÉCNICOS</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase">POSSUO O ITEM?</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase text-center">PREVISÃO<br/>EM DIAS ÚTEIS</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase text-center">QTDE</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase text-right">VALOR UNITÁRIO</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase text-center">DESC %</span>
              <span className="text-[9px] font-bold text-muted-foreground uppercase text-right">VALOR FINAL</span>
              <span></span>
            </div>
          </div>

          {/* Rows */}
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted-foreground">
              Adicione itens usando a barra de busca abaixo
            </div>
          ) : (
            <div className="overflow-x-auto">
              {items.map((item, idx) => (
                <div key={item.id}
                  className={`grid grid-cols-[30px_110px_1fr_140px_140px_80px_60px_100px_70px_100px_36px] items-center px-2 py-1.5 gap-1 border-b border-border/30 last:border-0 min-w-[1000px] ${idx % 2 === 0 ? 'bg-card/20' : 'bg-card/40'} hover:bg-[hsl(175,60%,50%/.05)] transition-colors`}>
                  {/* Checkbox */}
                  <div className="flex justify-center">
                    <input type="checkbox" className="w-3.5 h-3.5 accent-[hsl(175,60%,50%)]" />
                  </div>
                  {/* Tipo */}
                  <select value={item.tipo}
                    onChange={e => updateItem(item.id, { tipo: e.target.value as ItemTipo })}
                    className="h-7 text-[10px] bg-background border border-border rounded px-1 text-foreground cursor-pointer">
                    <option value="MECÂNICA">MECÂNICA</option>
                    <option value="PEÇAS">PEÇAS</option>
                  </select>
                  {/* Descrição */}
                  <div className="min-w-0">
                    <p className="text-[11px] text-foreground truncate font-medium">{item.descricao}</p>
                    <p className="text-[9px] text-muted-foreground">{item.code}</p>
                  </div>
                  {/* Detalhes Técnicos */}
                  <Input value={item.detalhes} placeholder="Obs"
                    onChange={e => updateItem(item.id, { detalhes: e.target.value })}
                    className="h-7 text-[10px] bg-background border-border" />
                  {/* Disponibilidade */}
                  <select value={item.disponibilidade}
                    onChange={e => updateItem(item.id, { disponibilidade: e.target.value })}
                    className="h-7 text-[10px] bg-background border border-border rounded px-1 text-foreground cursor-pointer">
                    {disponibilidadeOpcoes.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                  </select>
                  {/* Prazo */}
                  <Input type="number" min={0} value={item.prazo}
                    onChange={e => updateItem(item.id, { prazo: Math.max(0, Number(e.target.value)) })}
                    className="h-7 text-[10px] text-center bg-background border-border" />
                  {/* Qtde */}
                  <Input type="number" min={1} value={item.qtd}
                    onChange={e => updateItem(item.id, { qtd: Math.max(1, Number(e.target.value)) })}
                    className="h-7 text-[10px] text-center bg-background border-border" />
                  {/* Valor Unitário */}
                  {item.tipo === 'MECÂNICA' ? (
                    <div className="text-[10px] font-mono text-right text-muted-foreground pr-1">
                      {item.horas}h × {fmt(item.valorHora || 0)}
                    </div>
                  ) : (
                    <Input type="number" step={0.01} value={item.valorUnitario}
                      onChange={e => updateItem(item.id, { valorUnitario: Number(e.target.value) })}
                      className="h-7 text-[10px] font-mono text-right bg-background border-border" />
                  )}
                  {/* Desconto % */}
                  <div className="flex items-center gap-0.5">
                    <Input type="number" min={0} max={100} value={item.desconto}
                      onChange={e => updateItem(item.id, { desconto: Math.min(100, Math.max(0, Number(e.target.value))) })}
                      className="h-7 text-[10px] text-center bg-background border-border w-full" />
                    <span className="text-[10px] text-muted-foreground">%</span>
                  </div>
                  {/* Valor Final */}
                  <span className="text-[11px] font-mono font-bold text-right text-[hsl(175,60%,50%)]">
                    {fmt(getValorFinal(item))}
                  </span>
                  {/* Remove */}
                  <button onClick={() => removeItem(item.id)} className="text-destructive/60 hover:text-destructive transition-colors flex justify-center">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ══ ADD ITEM SEARCH BAR ══ */}
        <div className="mt-3 flex items-center gap-2">
          <select value={searchType} onChange={e => { setSearchType(e.target.value as ItemTipo); setSearchQuery(''); }}
            className="h-8 text-[11px] bg-background border border-border rounded px-2 text-foreground cursor-pointer w-32">
            <option value="PEÇAS">+ Peça</option>
            <option value="MECÂNICA">+ Serviço</option>
          </select>
          <div className="relative flex-1">
            <Input
              placeholder={searchType === 'PEÇAS' ? 'Buscar peça por nome ou código...' : 'Buscar serviço por nome ou código...'}
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              className="h-8 text-xs bg-background border-border"
            />
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute z-40 w-full mt-1 bg-card border border-border rounded-lg shadow-xl max-h-52 overflow-y-auto">
                {searchResults.map((entry: any) => (
                  <button key={entry.code} onClick={() => addFromCatalog(entry)}
                    className="w-full text-left px-3 py-2 hover:bg-[hsl(175,60%,50%/.1)] text-xs border-b border-border/30 last:border-0 flex justify-between items-center gap-2 transition-colors">
                    <div>
                      <span className="text-foreground font-medium">{entry.nome}</span>
                      <span className="text-muted-foreground ml-2">({entry.code})</span>
                    </div>
                    <span className="text-muted-foreground font-mono shrink-0">
                      {searchType === 'PEÇAS' ? fmt(entry.ref) : `${entry.horas}h · ${fmt(entry.taxa)}/h`}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ══ LAUDO ══ */}
      <div className="px-4 pb-3">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">Observações / Laudo Técnico</label>
        <Textarea
          placeholder="Descreva o problema encontrado, condições do veículo, recomendações..."
          value={laudo} onChange={e => setLaudo(e.target.value)}
          className="min-h-[70px] text-xs bg-background border-border resize-none"
        />
      </div>

      {/* ══ RESUMO FINANCEIRO ══ */}
      <div className="px-4 pb-6">
        <div className="border border-border rounded-md overflow-hidden">
          <div className="bg-[hsl(145,60%,30%)] px-4 py-2">
            <h2 className="text-[10px] font-bold uppercase tracking-widest text-white">Resumo Financeiro</h2>
          </div>
          <div className="px-4 py-3 space-y-1.5 bg-card/40">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total Peças</span>
              <span className="font-mono text-foreground">{fmt(totalPecas)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Total Mão de Obra</span>
              <span className="font-mono text-foreground">{fmt(totalMO)}</span>
            </div>
            <div className="h-px bg-border my-1" />
            <div className="flex justify-between text-sm font-bold">
              <span className="text-foreground">Total Bruto</span>
              <span className="font-mono text-[hsl(175,60%,50%)]">{fmt(totalBruto)}</span>
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>Comissão Auditt (15%)</span>
              <span className="font-mono">{fmt(totalBruto * 0.15)}</span>
            </div>
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Líquido Oficina (85%)</span>
              <span className="font-mono text-[hsl(120,60%,50%)]">{fmt(totalBruto * 0.85)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop for dropdown */}
      {searchOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setSearchOpen(false)} />
      )}
    </div>
  );
}
