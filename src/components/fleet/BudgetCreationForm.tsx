import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Plus, Trash2, Send, Loader2, Search } from 'lucide-react';
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
  { code: 'TUR-001', nome: 'Troca de turbo', horas: 5, taxa: 140 },
  { code: 'ARR-001', nome: 'Reparo ar-condicionado', horas: 3, taxa: 120 },
  { code: 'DIR-001', nome: 'Reparo caixa de direção', horas: 4.5, taxa: 130 },
  { code: 'DIF-001', nome: 'Revisão diferencial', horas: 8, taxa: 140 },
  { code: 'INJ-003', nome: 'Diagnóstico eletrônico (scanner)', horas: 2, taxa: 120 },
];

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

  // Peças
  const [pecas, setPecas] = useState<{ id: string; nome: string; code: string; qtd: number; valor: number; ref: number }[]>([]);
  const [buscaPeca, setBuscaPeca] = useState('');
  const [pecaAberta, setPecaAberta] = useState(false);

  // Serviços
  const [servicos, setServicos] = useState<{ id: string; nome: string; code: string; horas: number; valorHora: number }[]>([]);
  const [buscaServico, setBuscaServico] = useState('');
  const [servicoAberto, setServicoAberto] = useState(false);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const totalPecas = pecas.reduce((s, p) => s + p.valor * p.qtd, 0);
  const totalServicos = servicos.reduce((s, l) => s + l.horas * l.valorHora, 0);
  const total = totalPecas + totalServicos;

  // Filtered
  const pecasFiltradas = buscaPeca.length >= 2
    ? pecasCatalogo.filter(p => p.nome.toLowerCase().includes(buscaPeca.toLowerCase())).slice(0, 6)
    : [];
  const servicosFiltrados = buscaServico.length >= 2
    ? servicosCatalogo.filter(s => s.nome.toLowerCase().includes(buscaServico.toLowerCase())).slice(0, 6)
    : [];

  const addPeca = (p: typeof pecasCatalogo[0]) => {
    if (pecas.find(x => x.code === p.code)) return;
    setPecas(prev => [...prev, { id: Date.now().toString(), nome: p.nome, code: p.code, qtd: 1, valor: p.ref, ref: p.ref }]);
    setBuscaPeca(''); setPecaAberta(false);
  };

  const addServico = (s: typeof servicosCatalogo[0]) => {
    if (servicos.find(x => x.code === s.code)) return;
    setServicos(prev => [...prev, { id: Date.now().toString(), nome: s.nome, code: s.code, horas: s.horas, valorHora: s.taxa }]);
    setBuscaServico(''); setServicoAberto(false);
  };

  const handleSubmit = async () => {
    if ((pecas.length + servicos.length) === 0 || km <= 0) return;
    setSaving(true);
    try {
      const cpId = (serviceOrder as any).customer_product_id;
      await supabase.from('fleet_vehicles').update({ km_atual: km }).eq('id', vehicle.id);

      const { data: budget, error: budgetErr } = await supabase.from('fleet_budgets').insert({
        service_order_id: serviceOrder.id,
        customer_product_id: cpId,
        laudo_tecnico: laudo || 'Orçamento gerado via NovaLink.',
        urgencia: 'normal',
        status: 'pendente',
        total_pecas: totalPecas,
        total_mao_de_obra: totalServicos,
        total_bruto: total,
        comissao_pct: 15,
        total_liquido: total * 0.85,
      }).select().single();
      if (budgetErr) throw budgetErr;

      const items: any[] = [];
      pecas.forEach((p, i) => items.push({
        budget_id: (budget as any).id, tipo: 'peca', codigo: p.code,
        descricao: p.nome, quantidade: p.qtd, valor_unitario: p.valor,
        valor_total: p.valor * p.qtd, sort_order: i,
      }));
      servicos.forEach((s, i) => items.push({
        budget_id: (budget as any).id, tipo: 'mao_de_obra',
        descricao: s.nome, quantidade: 1, valor_unitario: s.horas * s.valorHora,
        valor_total: s.horas * s.valorHora, horas: s.horas, valor_hora: s.valorHora,
        sort_order: pecas.length + i,
      }));

      if (items.length > 0) {
        const { error } = await supabase.from('fleet_budget_items').insert(items);
        if (error) throw error;
      }

      await fleet.updateStage(serviceOrder.id, 'orcamento_enviado', 'oficina',
        'Orçamento enviado para aprovação',
        { descricao_servico: `Peças: ${fmt(totalPecas)} | M.O: ${fmt(totalServicos)} | Total: ${fmt(total)}`, valor_orcamento: total }
      );
      onSuccess();
    } catch (err) { console.error(err); } finally { setSaving(false); }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-card border-b border-border px-4 py-3 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onClose}><ArrowLeft className="w-5 h-5" /></Button>
        <div className="flex-1">
          <h1 className="text-sm font-bold text-foreground">Novo Orçamento</h1>
          <p className="text-[10px] text-muted-foreground">{vehicle.placa} · {vehicle.marca} {vehicle.modelo}</p>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold font-mono text-foreground">{fmt(total)}</p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* KM + Previsão */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">KM Atual *</label>
            <Input type="number" value={km || ''} onChange={e => setKm(Number(e.target.value))} className="h-10 font-mono border-border" />
          </div>
          <div>
            <label className="text-[11px] text-muted-foreground mb-1 block">Previsão de Entrega</label>
            <Input type="date" value={previsao} onChange={e => setPrevisao(e.target.value)} className="h-10 border-border" />
          </div>
        </div>

        {/* ═══ PEÇAS ═══ */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-foreground uppercase">Peças</h2>
            <span className="text-[10px] text-muted-foreground">{fmt(totalPecas)}</span>
          </div>

          {/* Busca */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar peça..."
              value={buscaPeca}
              onChange={e => { setBuscaPeca(e.target.value); setPecaAberta(true); }}
              onFocus={() => setPecaAberta(true)}
              className="pl-9 h-10 border-border"
            />
            {pecaAberta && pecasFiltradas.length > 0 && (
              <div className="absolute z-30 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-44 overflow-y-auto">
                {pecasFiltradas.map(p => (
                  <button key={p.code} onClick={() => addPeca(p)}
                    className="w-full text-left px-3 py-2.5 hover:bg-muted/50 text-sm border-b border-border/30 last:border-0 flex justify-between">
                    <span className="text-foreground">{p.nome}</span>
                    <span className="text-muted-foreground font-mono">{fmt(p.ref)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lista de peças */}
          {pecas.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhuma peça adicionada</p>
          ) : (
            <div className="space-y-1.5">
              {pecas.map(p => (
                <div key={p.id} className="bg-card border border-border rounded-lg px-3 py-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{p.nome}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Input type="number" min={1} value={p.qtd}
                      onChange={e => setPecas(prev => prev.map(x => x.id === p.id ? { ...x, qtd: Math.max(1, Number(e.target.value)) } : x))}
                      className="w-12 h-7 text-xs text-center border-border" />
                    <span className="text-muted-foreground text-[10px]">×</span>
                    <Input type="number" value={p.valor}
                      onChange={e => setPecas(prev => prev.map(x => x.id === p.id ? { ...x, valor: Number(e.target.value) } : x))}
                      className="w-20 h-7 text-xs font-mono border-border" />
                    <span className="text-xs font-mono font-bold text-foreground w-20 text-right">{fmt(p.valor * p.qtd)}</span>
                    <button onClick={() => setPecas(prev => prev.filter(x => x.id !== p.id))} className="text-muted-foreground hover:text-destructive ml-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ MÃO DE OBRA ═══ */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-bold text-foreground uppercase">Mão de Obra</h2>
            <span className="text-[10px] text-muted-foreground">{fmt(totalServicos)}</span>
          </div>

          {/* Busca */}
          <div className="relative mb-2">
            <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Buscar serviço..."
              value={buscaServico}
              onChange={e => { setBuscaServico(e.target.value); setServicoAberto(true); }}
              onFocus={() => setServicoAberto(true)}
              className="pl-9 h-10 border-border"
            />
            {servicoAberto && servicosFiltrados.length > 0 && (
              <div className="absolute z-30 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-44 overflow-y-auto">
                {servicosFiltrados.map(s => (
                  <button key={s.code} onClick={() => addServico(s)}
                    className="w-full text-left px-3 py-2.5 hover:bg-muted/50 text-sm border-b border-border/30 last:border-0 flex justify-between">
                    <span className="text-foreground">{s.nome}</span>
                    <span className="text-muted-foreground">{s.horas}h · {fmt(s.taxa)}/h</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lista de serviços */}
          {servicos.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-3">Nenhum serviço adicionado</p>
          ) : (
            <div className="space-y-1.5">
              {servicos.map(s => (
                <div key={s.id} className="bg-card border border-border rounded-lg px-3 py-2 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-foreground truncate">{s.nome}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <Input type="number" step={0.5} min={0.5} value={s.horas}
                      onChange={e => setServicos(prev => prev.map(x => x.id === s.id ? { ...x, horas: Number(e.target.value) } : x))}
                      className="w-14 h-7 text-xs text-center border-border" />
                    <span className="text-muted-foreground text-[10px]">h</span>
                    <Input type="number" value={s.valorHora}
                      onChange={e => setServicos(prev => prev.map(x => x.id === s.id ? { ...x, valorHora: Number(e.target.value) } : x))}
                      className="w-20 h-7 text-xs font-mono border-border" />
                    <span className="text-muted-foreground text-[10px]">/h</span>
                    <span className="text-xs font-mono font-bold text-foreground w-20 text-right">{fmt(s.horas * s.valorHora)}</span>
                    <button onClick={() => setServicos(prev => prev.filter(x => x.id !== s.id))} className="text-muted-foreground hover:text-destructive ml-1">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ═══ LAUDO ═══ */}
        <div>
          <label className="text-[11px] text-muted-foreground mb-1 block">Observações / Laudo Técnico</label>
          <Textarea
            placeholder="Descreva o problema encontrado..."
            value={laudo}
            onChange={e => setLaudo(e.target.value)}
            className="min-h-[80px] text-sm border-border resize-none"
          />
        </div>

        {/* ═══ RESUMO + BOTÃO ═══ */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Peças</span>
            <span className="font-mono text-foreground">{fmt(totalPecas)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Mão de Obra</span>
            <span className="font-mono text-foreground">{fmt(totalServicos)}</span>
          </div>
          <div className="h-px bg-border my-1" />
          <div className="flex justify-between text-base font-bold">
            <span className="text-foreground">Total</span>
            <span className="font-mono text-foreground">{fmt(total)}</span>
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Comissão NovaLink (15%)</span>
            <span className="font-mono">{fmt(total * 0.15)}</span>
          </div>

          <Button onClick={handleSubmit} disabled={saving || (pecas.length + servicos.length) === 0 || km <= 0}
            className="w-full mt-3 h-12 text-base gap-2">
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            Enviar Orçamento
          </Button>
        </div>
      </div>

      {/* Backdrop para fechar dropdowns */}
      {(pecaAberta || servicoAberto) && (
        <div className="fixed inset-0 z-20" onClick={() => { setPecaAberta(false); setServicoAberto(false); }} />
      )}
    </div>
  );
}
