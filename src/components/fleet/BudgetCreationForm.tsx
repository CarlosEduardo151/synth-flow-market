import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { generateBudgetPDF } from '@/lib/generateBudgetPDF';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  ArrowLeft, Plus, Trash2, Send, Loader2, Save,
  Wrench, Package, Search, X, FileText, Printer
} from 'lucide-react';
import type { useFleetData, FleetServiceOrder, FleetVehicle } from '@/hooks/useFleetData';
import { toast } from 'sonner';
import { BudgetAuditPanel, type AuditResult } from './BudgetAuditPanel';

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
  refPrice?: number; // preço referência catálogo
  refHora?: number;  // taxa/hora referência catálogo
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
  const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);
  const [auditError, setAuditError] = useState<string | null>(null);

  const dataEntrada = serviceOrder.data_entrada
    ? new Date(serviceOrder.data_entrada).toLocaleDateString('pt-BR')
    : new Date().toLocaleDateString('pt-BR');

  const veiculoDesc = [vehicle.marca, vehicle.modelo, vehicle.ano].filter(Boolean).join(' ');
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
    if (items.find(x => x.code === entry.code)) { toast.info('Item já adicionado'); return; }
    if (searchType === 'PEÇAS') {
      setItems(prev => [...prev, {
        id: crypto.randomUUID(), tipo: 'PEÇAS', descricao: entry.nome, code: entry.code,
        observacao: '', qtd: 1, valorUnitario: 0, desconto: 0,
        refPrice: entry.ref,
      }]);
    } else {
      setItems(prev => [...prev, {
        id: crypto.randomUUID(), tipo: 'MECÂNICA', descricao: entry.nome, code: entry.code,
        observacao: '', qtd: 1, valorUnitario: 0, desconto: 0,
        horas: entry.horas, valorHora: 0,
        refHora: entry.taxa,
      }]);
    }
    setSearchQuery(''); setSearchOpen(false);
  };

  const addManualItem = () => {
    setItems(prev => [...prev, {
      id: crypto.randomUUID(), tipo: searchType,
      descricao: '', code: `CUSTOM-${Date.now().toString(36).toUpperCase()}`,
      observacao: '', qtd: 1, valorUnitario: 0, desconto: 0,
      ...(searchType === 'MECÂNICA' ? { horas: 1, valorHora: 0 } : {}),
    }]);
  };

  const updateItem = (id: string, patch: Partial<BudgetItem>) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, ...patch } : i));
  };

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));

  // ── Audit trigger ──
  const triggerAudit = async (budgetId: string) => {
    setAuditLoading(true);
    setAuditError(null);
    setAuditResult(null);
    try {
      const auditItems = items.map(item => ({
        descricao: item.descricao,
        tipo: item.tipo,
        code: item.code,
        valorUnitario: item.tipo === 'MECÂNICA' ? (item.horas || 0) * (item.valorHora || 0) : item.valorUnitario,
        valorTotal: getValorFinal(item),
        qtd: item.qtd,
        horas: item.horas || 0,
        valorHora: item.valorHora || 0,
        refPrice: item.refPrice || 0,
        refHora: item.refHora || 0,
        customer_product_id: serviceOrder.customer_product_id,
      }));

      const { data, error } = await supabase.functions.invoke('auditt-price-audit', {
        body: {
          budgetId,
          items: auditItems,
          vehicleInfo: {
            marca: vehicle.marca,
            modelo: vehicle.modelo,
            ano: vehicle.ano,
            placa: vehicle.placa,
          },
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAuditResult(data as AuditResult);
      
      if (data.economiaPotencial > 0) {
        toast.info(`💰 Economia potencial detectada: ${fmt(data.economiaPotencial)}`);
      } else {
        toast.success('✅ Auditoria concluída — preços dentro do esperado.');
      }
    } catch (err: any) {
      console.error('Audit error:', err);
      setAuditError(err.message || 'Erro na auditoria de preços');
    } finally {
      setAuditLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (items.length === 0) { toast.error('Adicione itens ao orçamento.'); return; }
    if (km <= 0) { toast.error('Informe o KM de entrada.'); return; }
    setSaving(true);
    try {
      const cpId = serviceOrder.customer_product_id;
      await supabase.from('fleet_vehicles').update({ km_atual: km }).eq('id', vehicle.id);
      const { data: budget, error: budgetErr } = await supabase.from('fleet_budgets').insert({
        service_order_id: serviceOrder.id, customer_product_id: cpId,
        laudo_tecnico: laudo || 'Orçamento gerado via Auditt.',
        urgencia: 'normal', status: 'pendente',
        total_pecas: totalPecas, total_mao_de_obra: totalMO, total_bruto: totalBruto,
        comissao_pct: 15, total_liquido: totalBruto * 0.85,
      }).select().single();
      if (budgetErr) throw budgetErr;
      const budgetId = (budget as any).id;
      const dbItems = items.map((item, i) => ({
        budget_id: budgetId,
        tipo: item.tipo === 'MECÂNICA' ? 'mao_de_obra' : 'peca',
        codigo: item.code, descricao: item.descricao, quantidade: item.qtd,
        valor_unitario: item.tipo === 'MECÂNICA' ? (item.horas || 0) * (item.valorHora || 0) : item.valorUnitario,
        valor_total: getValorFinal(item),
        horas: item.horas || null, valor_hora: item.valorHora || null, sort_order: i,
      }));
      if (dbItems.length > 0) {
        const { error } = await supabase.from('fleet_budget_items').insert(dbItems);
        if (error) throw error;
      }
      await fleet.updateStage(serviceOrder.id, 'orcamento_enviado', 'oficina',
        'Orçamento enviado para aprovação',
        { descricao_servico: `Peças: ${fmt(totalPecas)} | M.O: ${fmt(totalMO)} | Total: ${fmt(totalBruto)}`, valor_orcamento: totalBruto }
      );
      toast.success('Orçamento enviado! Gerando PDF...');
      
      // 📄 Auto-generate PDF
      const pdfItems = items.map(item => ({
        tipo: (item.tipo === 'MECÂNICA' ? 'mao_de_obra' : 'peca') as 'peca' | 'mao_de_obra',
        codigo: item.code,
        descricao: item.descricao,
        quantidade: item.qtd,
        valor_unitario: item.tipo === 'MECÂNICA' ? (item.horas || 0) * (item.valorHora || 0) : item.valorUnitario,
        valor_total: getValorFinal(item),
        horas: item.horas || null,
        valor_hora: item.valorHora || null,
      }));
      generateBudgetPDF({
        osNumber: osNumber,
        placa: vehicle.placa,
        veiculo: veiculoDesc || 'N/A',
        km,
        dataEntrada,
        oficinaNome: serviceOrder.oficina_nome || 'Oficina',
        laudoTecnico: laudo || 'Orçamento gerado via Auditt.',
        items: pdfItems,
        totalPecas, totalMaoDeObra: totalMO, totalBruto,
        comissaoPct: 15, totalLiquido: totalBruto * 0.85,
        status: 'pendente',
        budgetId,
      });

      // 🔥 Auto-trigger price audit after budget is saved
      triggerAudit(budgetId);
    } catch (err) { console.error(err); toast.error('Erro ao salvar orçamento.'); }
    finally { setSaving(false); }
  };

  // ─────────────────────────────────────────────
  // Style constants for GestãoClick-like ERP look
  // ─────────────────────────────────────────────
  const fieldLabel = "block text-[11px] font-semibold text-[hsl(215,15%,45%)] mb-1 uppercase tracking-wide";
  const fieldInput = "h-9 text-sm bg-white border border-[hsl(215,20%,88%)] rounded text-[hsl(215,25%,20%)] placeholder:text-[hsl(215,10%,70%)] focus:border-[hsl(210,80%,55%)] focus:ring-1 focus:ring-[hsl(210,80%,55%/0.3)]";
  const fieldReadonly = "h-9 px-3 flex items-center rounded bg-[hsl(210,20%,96%)] border border-[hsl(215,20%,88%)] text-sm text-[hsl(215,25%,30%)] font-medium";

  return (
    <div className="h-screen flex flex-col bg-[hsl(210,20%,97%)] overflow-hidden">

      {/* ══════════════════════════════════════════
          TOP BAR — azul escuro estilo GestãoClick
         ══════════════════════════════════════════ */}
      <div className="shrink-0 h-12 bg-[hsl(215,45%,18%)] flex items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <button onClick={onClose} className="text-white/70 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-5 w-px bg-white/20" />
          <FileText className="w-4 h-4 text-[hsl(210,80%,65%)]" />
          <span className="text-sm font-semibold text-white">Novo Orçamento</span>
          <span className="text-xs text-white/50 font-mono ml-1">OS {osNumber}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm"
            className="h-8 text-xs gap-1.5 text-white/70 hover:text-white hover:bg-white/10">
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </Button>
          <Button variant="outline" size="sm" onClick={handleSubmit}
            disabled={saving || items.length === 0 || km <= 0}
            className="h-8 text-xs gap-1.5 border-white/30 text-white hover:bg-white/10 bg-transparent">
            <Save className="w-3.5 h-3.5" /> Salvar
          </Button>
          <Button size="sm" onClick={handleSubmit}
            disabled={saving || items.length === 0 || km <= 0}
            className="h-8 text-xs gap-1.5 bg-[hsl(145,60%,40%)] hover:bg-[hsl(145,60%,35%)] text-white font-bold border-0">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Enviar Orçamento
          </Button>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          SCROLLABLE CONTENT
         ══════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto">
        <div className="w-full">

          {/* ── SECTION: Dados da OS ── */}
          <div className="bg-white border-b border-[hsl(215,20%,90%)]">
            <div className="px-5 py-4">
              <h2 className="text-xs font-bold text-[hsl(215,45%,18%)] uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-[hsl(210,80%,55%)] rounded-full" />
                Dados da Ordem de Serviço
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                <div>
                  <label className={fieldLabel}>Placa</label>
                  <div className={fieldReadonly}>
                    <span className="font-mono font-bold tracking-wider">{vehicle.placa}</span>
                  </div>
                </div>
                <div>
                  <label className={fieldLabel}>Veículo</label>
                  <div className={fieldReadonly}>
                    <span className="truncate">{veiculoDesc || '—'}</span>
                  </div>
                </div>
                <div>
                  <label className={fieldLabel}>Data Entrada</label>
                  <div className={fieldReadonly}>
                    <span className="font-mono">{dataEntrada}</span>
                  </div>
                </div>
                <div>
                  <label className={fieldLabel}>KM de Entrada *</label>
                  <Input type="number" value={km || ''} onChange={e => setKm(Number(e.target.value))}
                    placeholder="Ex: 85000" className={fieldInput + ' font-mono'} />
                </div>
                <div>
                  <label className={fieldLabel}>Prev. Conclusão</label>
                  <Input type="date" value={previsao} onChange={e => setPrevisao(e.target.value)}
                    className={fieldInput} />
                </div>
                <div>
                  <label className={fieldLabel}>Situação</label>
                  <div className="h-9 px-3 flex items-center rounded bg-[hsl(45,90%,92%)] border border-[hsl(45,70%,70%)] text-sm text-[hsl(35,80%,30%)] font-semibold">
                    Pendente
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── SECTION: Itens do Orçamento ── */}
          <div className="bg-white border-b border-[hsl(215,20%,90%)] mt-px">
            <div className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-[hsl(215,45%,18%)] uppercase tracking-widest flex items-center gap-2">
                  <span className="w-1 h-4 bg-[hsl(145,60%,40%)] rounded-full" />
                  Itens do Orçamento
                </h2>
                <span className="text-xs text-[hsl(215,15%,55%)]">{items.length} {items.length === 1 ? 'item' : 'itens'}</span>
              </div>

              {/* Search toolbar */}
              <div className="flex items-center gap-2 mb-3">
                <div className="flex border border-[hsl(215,20%,88%)] rounded overflow-hidden shrink-0">
                  <button onClick={() => { setSearchType('PEÇAS'); setSearchQuery(''); }}
                    className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold transition-colors ${
                      searchType === 'PEÇAS'
                        ? 'bg-[hsl(210,80%,55%)] text-white'
                        : 'bg-white text-[hsl(215,15%,50%)] hover:bg-[hsl(210,20%,96%)]'
                    }`}>
                    <Package className="w-3 h-3" /> Peças
                  </button>
                  <button onClick={() => { setSearchType('MECÂNICA'); setSearchQuery(''); }}
                    className={`flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold transition-colors border-l border-[hsl(215,20%,88%)] ${
                      searchType === 'MECÂNICA'
                        ? 'bg-[hsl(210,80%,55%)] text-white'
                        : 'bg-white text-[hsl(215,15%,50%)] hover:bg-[hsl(210,20%,96%)]'
                    }`}>
                    <Wrench className="w-3 h-3" /> Serviços
                  </button>
                </div>

                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(215,15%,60%)] pointer-events-none" />
                  <input
                    placeholder={searchType === 'PEÇAS' ? 'Buscar peça por nome ou código...' : 'Buscar serviço...'}
                    value={searchQuery}
                    onChange={e => { setSearchQuery(e.target.value); setSearchOpen(true); }}
                    onFocus={() => setSearchOpen(true)}
                    className="w-full h-9 pl-9 pr-9 rounded border border-[hsl(215,20%,88%)] bg-white text-sm text-[hsl(215,25%,20%)] placeholder:text-[hsl(215,10%,70%)] focus:outline-none focus:border-[hsl(210,80%,55%)] focus:ring-1 focus:ring-[hsl(210,80%,55%/0.3)]"
                  />
                  {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); setSearchOpen(false); }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(215,15%,60%)] hover:text-[hsl(215,25%,30%)]">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  {searchOpen && searchResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-[hsl(215,20%,88%)] rounded-lg shadow-xl max-h-64 overflow-y-auto">
                      {searchResults.map((entry: any) => (
                        <button key={entry.code} onClick={() => addFromCatalog(entry)}
                          className="w-full text-left px-4 py-2.5 hover:bg-[hsl(210,60%,97%)] border-b border-[hsl(215,20%,94%)] last:border-0 transition-colors flex justify-between items-center gap-3">
                          <div className="min-w-0">
                            <p className="text-sm text-[hsl(215,25%,20%)] truncate">{entry.nome}</p>
                            <p className="text-[10px] text-[hsl(215,10%,60%)] font-mono">{entry.code}</p>
                          </div>
                          <span className="text-xs font-mono font-bold text-[hsl(210,80%,45%)] shrink-0">
                            {searchType === 'PEÇAS' ? fmt(entry.ref) : `${entry.horas}h × ${fmt(entry.taxa)}`}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button onClick={addManualItem}
                  className="shrink-0 h-9 px-3 flex items-center gap-1 rounded border border-[hsl(215,20%,88%)] bg-white text-xs font-semibold text-[hsl(215,15%,45%)] hover:bg-[hsl(210,20%,96%)] transition-colors">
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>

              {/* ── TABLE ── */}
              <div className="border border-[hsl(215,20%,88%)] rounded-lg overflow-hidden">
                {/* Header */}
                <div className="bg-[hsl(215,30%,22%)] text-white">
                  <div className="grid grid-cols-[36px_60px_1fr_120px_70px_90px_90px_70px_90px_36px] items-center h-10 px-3 gap-1 text-[10px] font-bold uppercase tracking-wider">
                    <span className="text-center">#</span>
                    <span>Tipo</span>
                    <span>Descrição</span>
                    <span>Observação</span>
                    <span className="text-center">Qtd/Hrs</span>
                    <span className="text-right">Vlr. Unit.</span>
                    <span className="text-right">Vlr/Hora</span>
                    <span className="text-center">Desc%</span>
                    <span className="text-right">Total</span>
                    <span></span>
                  </div>
                </div>

                {/* Body */}
                {items.length === 0 ? (
                  <div className="py-12 text-center bg-white">
                    <Package className="w-10 h-10 mx-auto text-[hsl(215,15%,80%)] mb-2" />
                    <p className="text-sm text-[hsl(215,15%,55%)]">Nenhum item adicionado</p>
                    <p className="text-xs text-[hsl(215,10%,70%)] mt-1">Use a busca acima para adicionar peças e serviços</p>
                  </div>
                ) : (
                  items.map((item, idx) => {
                    const valor = getValorFinal(item);
                    const isMec = item.tipo === 'MECÂNICA';
                    return (
                      <div key={item.id}
                        className={`grid grid-cols-[36px_60px_1fr_120px_70px_90px_90px_70px_90px_36px] items-center px-3 gap-1 min-h-[52px] py-2 border-b border-[hsl(215,20%,93%)] last:border-0 group transition-colors ${
                          idx % 2 === 0 ? 'bg-white' : 'bg-[hsl(210,20%,98%)]'
                        } hover:bg-[hsl(210,60%,97%)]`}>
                        <span className="text-center text-[11px] text-[hsl(215,10%,60%)] font-mono">{idx + 1}</span>
                        {/* Tipo badge */}
                        <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded text-center ${
                          isMec
                            ? 'bg-[hsl(35,80%,92%)] text-[hsl(35,70%,35%)]'
                            : 'bg-[hsl(210,60%,93%)] text-[hsl(210,60%,35%)]'
                        }`}>
                          {isMec ? 'M.O.' : 'Peça'}
                        </span>
                        {/* Descrição */}
                        <input value={item.descricao}
                          onChange={e => updateItem(item.id, { descricao: e.target.value })}
                          placeholder={isMec ? 'Nome do serviço...' : 'Nome da peça...'}
                          className="w-full bg-transparent text-sm text-[hsl(215,25%,20%)] placeholder:text-[hsl(215,10%,75%)] outline-none truncate" />
                        {/* Observação */}
                        <input value={item.observacao}
                          onChange={e => updateItem(item.id, { observacao: e.target.value })}
                          placeholder="Obs..."
                          className="w-full text-xs text-[hsl(215,15%,45%)] placeholder:text-[hsl(215,10%,80%)] outline-none truncate px-1.5 py-1 rounded border-2 border-dashed border-[hsl(210,80%,70%)] bg-[hsl(210,80%,97%)] hover:border-[hsl(210,80%,55%)] focus:border-solid focus:border-[hsl(210,80%,55%)] focus:bg-white focus:shadow-[0_0_0_2px_hsl(210,80%,55%,0.2)] transition-all" />
                        {/* Qtd/Hrs */}
                        <input type="number" min={isMec ? 0 : 1} step={isMec ? 0.5 : 1}
                          value={isMec ? (item.horas ?? '') : item.qtd}
                          onChange={e => {
                            const v = Number(e.target.value);
                            isMec ? updateItem(item.id, { horas: Math.max(0, v) }) : updateItem(item.id, { qtd: Math.max(1, v) });
                          }}
                          className="w-full text-center text-xs font-mono text-[hsl(215,25%,20%)] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-1 py-1 rounded border-2 border-dashed border-[hsl(210,80%,70%)] bg-[hsl(210,80%,97%)] hover:border-[hsl(210,80%,55%)] focus:border-solid focus:border-[hsl(210,80%,55%)] focus:bg-white focus:shadow-[0_0_0_2px_hsl(210,80%,55%,0.2)] transition-all" />
                        {/* Valor Unit */}
                        {!isMec ? (
                          <div className="relative">
                            <input type="number" step={0.01} min={0} value={item.valorUnitario || ''}
                              onChange={e => updateItem(item.id, { valorUnitario: Number(e.target.value) })}
                              placeholder="0,00"
                              className={`w-full text-right text-xs font-mono outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-1.5 py-1 rounded border-2 border-dashed border-[hsl(210,80%,70%)] bg-[hsl(210,80%,97%)] hover:border-[hsl(210,80%,55%)] focus:border-solid focus:border-[hsl(210,80%,55%)] focus:bg-white focus:shadow-[0_0_0_2px_hsl(210,80%,55%,0.2)] transition-all ${
                                item.refPrice && item.valorUnitario !== item.refPrice && item.valorUnitario > 0
                                  ? item.valorUnitario > item.refPrice
                                    ? 'text-[hsl(35,80%,40%)] font-bold'
                                    : 'text-[hsl(145,50%,35%)] font-bold'
                                  : item.valorUnitario === 0 ? 'text-[hsl(0,60%,50%)]' : 'text-[hsl(215,25%,20%)]'
                              }`} />
                            {item.refPrice != null && (
                              <span className={`absolute -bottom-3.5 right-0 text-[8px] font-mono ${
                                item.valorUnitario !== item.refPrice ? 'text-[hsl(35,70%,50%)]' : 'text-[hsl(215,10%,70%)]'
                              }`}>
                                ref: {fmt(item.refPrice)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-right text-xs text-[hsl(215,10%,80%)]">—</span>
                        )}
                        {/* Valor/Hora */}
                        {isMec ? (
                          <div className="relative">
                            <input type="number" step={1} min={0} value={item.valorHora ?? ''}
                              onChange={e => updateItem(item.id, { valorHora: Math.max(0, Number(e.target.value)) })}
                              placeholder="0,00"
                              className={`w-full text-right text-xs font-mono outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none px-1.5 py-1 rounded border-2 border-dashed border-[hsl(210,80%,70%)] bg-[hsl(210,80%,97%)] hover:border-[hsl(210,80%,55%)] focus:border-solid focus:border-[hsl(210,80%,55%)] focus:bg-white focus:shadow-[0_0_0_2px_hsl(210,80%,55%,0.2)] transition-all ${
                                item.refHora && item.valorHora !== item.refHora && item.valorHora! > 0
                                  ? item.valorHora! > item.refHora
                                    ? 'text-[hsl(35,80%,40%)] font-bold'
                                    : 'text-[hsl(145,50%,35%)] font-bold'
                                  : item.valorHora === 0 ? 'text-[hsl(0,60%,50%)]' : 'text-[hsl(215,25%,20%)]'
                              }`} />
                            {item.refHora != null && (
                              <span className={`absolute -bottom-3.5 right-0 text-[8px] font-mono ${
                                item.valorHora !== item.refHora ? 'text-[hsl(35,70%,50%)]' : 'text-[hsl(215,10%,70%)]'
                              }`}>
                                ref: {fmt(item.refHora)}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-right text-xs text-[hsl(215,10%,80%)]">—</span>
                        )}
                        {/* Desconto */}
                        <input type="number" min={0} max={100} value={item.desconto || ''}
                          onChange={e => updateItem(item.id, { desconto: Math.min(100, Math.max(0, Number(e.target.value))) })}
                          className="w-full text-center bg-transparent text-xs font-mono text-[hsl(215,25%,20%)] outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
                        {/* Total */}
                        <span className="text-right text-xs font-mono font-bold text-[hsl(145,50%,35%)]">
                          {fmt(valor)}
                        </span>
                        {/* Delete */}
                        <button onClick={() => removeItem(item.id)}
                          className="opacity-0 group-hover:opacity-100 text-[hsl(0,60%,60%)] hover:text-[hsl(0,70%,45%)] transition-all flex justify-center">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })
                )}

                {/* Footer / Totals */}
                {items.length > 0 && (
                  <div className="bg-[hsl(210,20%,96%)] border-t border-[hsl(215,20%,88%)]">
                    <div className="grid grid-cols-[36px_60px_1fr_120px_70px_90px_90px_70px_90px_36px] items-center px-3 gap-1 h-10">
                      <span></span>
                      <span></span>
                      <div className="flex items-center gap-4 text-xs text-[hsl(215,15%,50%)]">
                        <span>Peças: <b className="text-[hsl(215,25%,25%)]">{fmt(totalPecas)}</b></span>
                        <span>M.O.: <b className="text-[hsl(215,25%,25%)]">{fmt(totalMO)}</b></span>
                      </div>
                      <span></span>
                      <span></span>
                      <span></span>
                      <span></span>
                      <span className="text-center text-[10px] font-bold text-[hsl(215,15%,45%)] uppercase">Total</span>
                      <span className="text-right text-sm font-mono font-black text-[hsl(215,45%,18%)]">{fmt(totalBruto)}</span>
                      <span></span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ── SECTION: Observações ── */}
          <div className="bg-white border-b border-[hsl(215,20%,90%)] mt-px">
            <div className="px-5 py-4">
              <h2 className="text-xs font-bold text-[hsl(215,45%,18%)] uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-1 h-4 bg-[hsl(35,80%,55%)] rounded-full" />
                Observações / Laudo Técnico
              </h2>
              <textarea
                placeholder="Descreva o problema encontrado, condições do veículo, recomendações..."
                value={laudo} onChange={e => setLaudo(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 rounded border border-[hsl(215,20%,88%)] bg-white text-sm text-[hsl(215,25%,20%)] placeholder:text-[hsl(215,10%,70%)] resize-none focus:outline-none focus:border-[hsl(210,80%,55%)] focus:ring-1 focus:ring-[hsl(210,80%,55%/0.3)]"
              />
            </div>
          </div>

          {/* ── SECTION: Resumo Financeiro ── */}
          {items.length > 0 && (
            <div className="bg-white mt-px">
              <div className="px-5 py-4">
                <h2 className="text-xs font-bold text-[hsl(215,45%,18%)] uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-1 h-4 bg-[hsl(145,60%,40%)] rounded-full" />
                  Resumo Financeiro
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="bg-[hsl(210,20%,97%)] rounded-lg p-3 border border-[hsl(215,20%,90%)]">
                    <p className="text-[10px] text-[hsl(215,15%,55%)] uppercase font-semibold mb-1">Total Peças</p>
                    <p className="text-lg font-bold font-mono text-[hsl(210,60%,40%)]">{fmt(totalPecas)}</p>
                  </div>
                  <div className="bg-[hsl(210,20%,97%)] rounded-lg p-3 border border-[hsl(215,20%,90%)]">
                    <p className="text-[10px] text-[hsl(215,15%,55%)] uppercase font-semibold mb-1">Total M.O.</p>
                    <p className="text-lg font-bold font-mono text-[hsl(35,70%,40%)]">{fmt(totalMO)}</p>
                  </div>
                  <div className="bg-[hsl(215,40%,15%)] rounded-lg p-3 border border-[hsl(215,30%,25%)]">
                    <p className="text-[10px] text-white/60 uppercase font-semibold mb-1">Total Bruto</p>
                    <p className="text-lg font-bold font-mono text-white">{fmt(totalBruto)}</p>
                  </div>
                  <div className="bg-[hsl(210,20%,97%)] rounded-lg p-3 border border-[hsl(215,20%,90%)]">
                    <p className="text-[10px] text-[hsl(215,15%,55%)] uppercase font-semibold mb-1">Auditt (15%)</p>
                    <p className="text-lg font-bold font-mono text-[hsl(215,25%,30%)]">{fmt(totalBruto * 0.15)}</p>
                  </div>
                  <div className="bg-[hsl(145,40%,95%)] rounded-lg p-3 border border-[hsl(145,40%,80%)]">
                    <p className="text-[10px] text-[hsl(145,40%,30%)] uppercase font-semibold mb-1">Repasse Oficina</p>
                    <p className="text-lg font-bold font-mono text-[hsl(145,50%,35%)]">{fmt(totalBruto * 0.85)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── SECTION: Auditoria VERO 1.0 ── */}
          <BudgetAuditPanel
            result={auditResult}
            loading={auditLoading}
            error={auditError}
            onRetry={() => {
              // We need budget ID to retry — only available after submit
              if (auditResult?.auditId) {
                triggerAudit(auditResult.auditId);
              }
            }}
          />

          {/* Bottom spacer */}
          <div className="h-6" />
        </div>
      </div>

      {/* Backdrop */}
      {searchOpen && searchResults.length > 0 && (
        <div className="fixed inset-0 z-40" onClick={() => setSearchOpen(false)} />
      )}
    </div>
  );
}
