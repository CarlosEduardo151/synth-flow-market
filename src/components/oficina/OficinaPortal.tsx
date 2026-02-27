import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  Wrench, Plus, Camera, Trash2, DollarSign, Clock, CheckCircle2,
  FileText, Car, MessageCircle, ArrowLeft, Image as ImageIcon,
  AlertTriangle, Timer, Receipt, Wallet, Phone, HelpCircle,
  Gauge, Send, X, ChevronRight, Bell, Search, Upload
} from 'lucide-react';

// ─── Types ───
type OficinaView = 'home' | 'checkin' | 'orcamento' | 'patio' | 'finalizar' | 'financeiro';

interface OrcamentoItem {
  id: string;
  tipo: 'peca' | 'mao_de_obra';
  descricao: string;
  valor: number;
  statusIA: 'ok' | 'atencao' | 'alto' | null;
}

interface VeiculoPatio {
  id: string;
  placa: string;
  modelo: string;
  motorista: string;
  status: 'aguardando' | 'autorizado' | 'ajuste';
  valorTotal: number;
  horaEntrada: string;
}

interface Recebivel {
  id: string;
  placa: string;
  servico: string;
  valorBruto: number;
  valorLiquido: number;
  dataDeposito: string;
  status: 'depositado' | 'em_processo' | 'agendado';
}

// ─── Mock Data ───
const mockPatio: VeiculoPatio[] = [
  { id: '1', placa: 'ABC-1D23', modelo: 'Scania R450', motorista: 'Carlos Silva', status: 'aguardando', valorTotal: 4850, horaEntrada: '08:32' },
  { id: '2', placa: 'DEF-5G67', modelo: 'Volvo FH 540', motorista: 'João Pereira', status: 'autorizado', valorTotal: 3200, horaEntrada: '07:15' },
  { id: '3', placa: 'GHI-8J90', modelo: 'MB Actros 2651', motorista: 'Pedro Santos', status: 'ajuste', valorTotal: 12300, horaEntrada: '09:50' },
  { id: '4', placa: 'JKL-2M34', modelo: 'DAF XF 530', motorista: 'Marcos Lima', status: 'autorizado', valorTotal: 1890, horaEntrada: '10:05' },
];

const mockRecebiveis: Recebivel[] = [
  { id: '1', placa: 'DEF-5G67', servico: 'Troca de embreagem', valorBruto: 3200, valorLiquido: 2720, dataDeposito: '28/02/2026', status: 'em_processo' },
  { id: '2', placa: 'MNO-5P67', servico: 'Revisão completa', valorBruto: 5600, valorLiquido: 4760, dataDeposito: '28/02/2026', status: 'em_processo' },
  { id: '3', placa: 'PQR-9S01', servico: 'Troca de pastilhas', valorBruto: 1200, valorLiquido: 1020, dataDeposito: '27/02/2026', status: 'depositado' },
  { id: '4', placa: 'STU-3V45', servico: 'Alinhamento e balanceamento', valorBruto: 450, valorLiquido: 382.50, dataDeposito: '27/02/2026', status: 'depositado' },
  { id: '5', placa: 'VWX-6Y78', servico: 'Motor diesel - retífica', valorBruto: 18900, valorLiquido: 16065, dataDeposito: '01/03/2026', status: 'agendado' },
];

const mockHistorico = [
  { data: '15/01/2026', servico: 'Troca de óleo e filtros', km: 172000, oficina: 'Sua Oficina', valor: 850 },
  { data: '28/11/2025', servico: 'Substituição de pastilhas de freio', km: 165000, oficina: 'MecPlus', valor: 1200 },
  { data: '10/09/2025', servico: 'Revisão de suspensão', km: 155000, oficina: 'Sua Oficina', valor: 3400 },
];

// ─── Status Config ───
const statusConfig = {
  aguardando: { label: 'Aguardando Aprovação', color: 'bg-amber-500', textColor: 'text-amber-700 dark:text-amber-300', bgLight: 'bg-amber-50 dark:bg-amber-500/10', icon: Clock },
  autorizado: { label: 'Serviço Autorizado', color: 'bg-emerald-500', textColor: 'text-emerald-700 dark:text-emerald-300', bgLight: 'bg-emerald-50 dark:bg-emerald-500/10', icon: CheckCircle2 },
  ajuste: { label: 'Ajuste Solicitado', color: 'bg-red-500', textColor: 'text-red-700 dark:text-red-300', bgLight: 'bg-red-50 dark:bg-red-500/10', icon: AlertTriangle },
};

const recStatusConfig = {
  depositado: { label: 'Depositado ✓', color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
  em_processo: { label: 'Em Processo', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' },
  agendado: { label: 'Agendado', color: 'text-muted-foreground', bg: 'bg-muted' },
};

export function OficinaPortal({ onSwitchRole }: { onSwitchRole: () => void }) {
  const [view, setView] = useState<OficinaView>('home');
  const [placaInput, setPlacaInput] = useState('');
  const [veiculoCarregado, setVeiculoCarregado] = useState(false);
  const [orcamentoItems, setOrcamentoItems] = useState<OrcamentoItem[]>([]);
  const [novoItemDesc, setNovoItemDesc] = useState('');
  const [novoItemValor, setNovoItemValor] = useState('');
  const [novoItemTipo, setNovoItemTipo] = useState<'peca' | 'mao_de_obra'>('peca');
  const [fotos, setFotos] = useState<string[]>([]);
  const [finalizarDialog, setFinalizarDialog] = useState(false);
  const [selectedVeiculo, setSelectedVeiculo] = useState<VeiculoPatio | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fotoServicoRef = useRef<HTMLInputElement>(null);

  const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  // ─── Simulate plate lookup ───
  const buscarPlaca = () => {
    if (placaInput.length >= 7) {
      setVeiculoCarregado(true);
    }
  };

  // ─── Add budget item ───
  const addItem = () => {
    if (!novoItemDesc || !novoItemValor) return;
    const valor = parseFloat(novoItemValor.replace(',', '.'));
    if (isNaN(valor)) return;
    
    // Simular validação da IA
    let statusIA: 'ok' | 'atencao' | 'alto' | null = 'ok';
    if (valor > 3000) statusIA = 'atencao';
    if (valor > 8000) statusIA = 'alto';

    setOrcamentoItems(prev => [...prev, {
      id: Date.now().toString(),
      tipo: novoItemTipo,
      descricao: novoItemDesc,
      valor,
      statusIA,
    }]);
    setNovoItemDesc('');
    setNovoItemValor('');
  };

  const removeItem = (id: string) => {
    setOrcamentoItems(prev => prev.filter(i => i.id !== id));
  };

  const totalOrcamento = orcamentoItems.reduce((s, i) => s + i.valor, 0);

  // ─── Handle photo upload ───
  const handleFoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) setFotos(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  // ─── KPIs ───
  const totalReceberHoje = mockRecebiveis.filter(r => r.status === 'em_processo').reduce((s, r) => s + r.valorLiquido, 0);
  const totalRecebido = mockRecebiveis.filter(r => r.status === 'depositado').reduce((s, r) => s + r.valorLiquido, 0);
  const servicosAtivos = mockPatio.filter(v => v.status === 'autorizado').length;

  // ─── Header Bar ───
  const PortalHeader = ({ title, showBack = true }: { title: string; showBack?: boolean }) => (
    <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b px-4 py-3 flex items-center gap-3">
      {showBack && (
        <button onClick={() => setView('home')} className="w-10 h-10 rounded-xl flex items-center justify-center hover:bg-muted active:scale-95 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}
      <h1 className="text-lg font-bold text-foreground flex-1">{title}</h1>
      <button
        onClick={onSwitchRole}
        className="text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted transition-colors"
      >
        Trocar Perfil
      </button>
    </div>
  );

  // ══════════════════════════════════════════════
  // VIEW: HOME — Tela Principal
  // ══════════════════════════════════════════════
  if (view === 'home') {
    return (
      <div className="min-h-screen bg-background">
        <PortalHeader title="Painel da Oficina" showBack={false} />
        
        <div className="p-4 space-y-5 max-w-lg mx-auto pb-32">
          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-card rounded-2xl p-4 border shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-emerald-500" />
                <span className="text-xs text-muted-foreground">A Receber (D+1)</span>
              </div>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalReceberHoje)}</p>
            </div>
            <div className="bg-card rounded-2xl p-4 border shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span className="text-xs text-muted-foreground">Em Andamento</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{servicosAtivos} <span className="text-sm font-normal text-muted-foreground">serviços</span></p>
            </div>
          </div>

          {/* BOTÃO GIGANTE: Novo Atendimento */}
          <button
            onClick={() => setView('checkin')}
            className="w-full bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 active:scale-[0.98] text-white rounded-2xl p-6 flex items-center justify-center gap-4 shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center">
              <Plus className="w-10 h-10" />
            </div>
            <div className="text-left">
              <p className="text-2xl font-bold">Novo Atendimento</p>
              <p className="text-sm text-emerald-100">Escanear placa ou digitar CPF/CNPJ</p>
            </div>
          </button>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setView('patio')}
              className="bg-card rounded-2xl p-5 border shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left"
            >
              <Car className="w-7 h-7 text-primary mb-2" />
              <p className="font-semibold text-foreground text-sm">Pátio Digital</p>
              <p className="text-xs text-muted-foreground mt-1">{mockPatio.length} veículos</p>
            </button>
            <button
              onClick={() => setView('financeiro')}
              className="bg-card rounded-2xl p-5 border shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left"
            >
              <Wallet className="w-7 h-7 text-emerald-500 mb-2" />
              <p className="font-semibold text-foreground text-sm">Recebíveis</p>
              <p className="text-xs text-muted-foreground mt-1">{fmt(totalRecebido)} recebidos</p>
            </button>
          </div>

          {/* Notificações recentes */}
          {mockPatio.filter(v => v.status === 'autorizado').length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Bell className="w-4 h-4 text-emerald-500" />
                Serviços Aprovados — Iniciar Agora!
              </h3>
              {mockPatio.filter(v => v.status === 'autorizado').map(v => (
                <button
                  key={v.id}
                  onClick={() => { setSelectedVeiculo(v); setView('patio'); }}
                  className="w-full bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 flex items-center gap-3 active:scale-[0.98] transition-all"
                >
                  <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
                  <div className="text-left flex-1 min-w-0">
                    <p className="font-mono font-bold text-foreground">{v.placa}</p>
                    <p className="text-xs text-muted-foreground truncate">{v.modelo} · {v.motorista}</p>
                  </div>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{fmt(v.valorTotal)}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* FAB: WhatsApp Suporte */}
        <a
          href="https://wa.me/5599999999999?text=Olá%20NovaLink,%20preciso%20de%20ajuda%20no%20portal%20da%20oficina!"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg flex items-center justify-center active:scale-95 transition-all"
          title="Pé na Graxa — Suporte"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </a>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // VIEW: CHECK-IN — Entrada de Veículo
  // ══════════════════════════════════════════════
  if (view === 'checkin') {
    return (
      <div className="min-h-screen bg-background">
        <PortalHeader title="Novo Atendimento" />

        <div className="p-4 space-y-5 max-w-lg mx-auto">
          {/* Scan / Input */}
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Identifique o veículo para iniciar</p>

            <button
              className="w-full bg-muted/50 hover:bg-muted border-2 border-dashed border-border rounded-2xl p-8 flex flex-col items-center gap-3 active:scale-[0.98] transition-all"
            >
              <Camera className="w-10 h-10 text-muted-foreground" />
              <div className="text-center">
                <p className="font-semibold text-foreground">Escanear Placa</p>
                <p className="text-xs text-muted-foreground">Aponte a câmera para a placa do veículo</p>
              </div>
            </button>

            <div className="flex items-center gap-2">
              <Separator className="flex-1" />
              <span className="text-xs text-muted-foreground">ou digite</span>
              <Separator className="flex-1" />
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Placa (ABC-1D23) ou CPF/CNPJ"
                value={placaInput}
                onChange={(e) => setPlacaInput(e.target.value.toUpperCase())}
                className="h-14 text-lg font-mono text-center tracking-wider"
              />
              <Button onClick={buscarPlaca} className="h-14 px-6 bg-emerald-500 hover:bg-emerald-600 text-white">
                <Search className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Resultado: Veículo Encontrado */}
          {veiculoCarregado && (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
              <Card className="border-emerald-200 dark:border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-500/5">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Car className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                      <p className="font-mono text-xl font-bold text-foreground">{placaInput || 'ABC-1D23'}</p>
                      <p className="text-sm text-muted-foreground">Scania R450 · 2022 · 185.000 km</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">Motorista: Carlos Silva · Frota: TransLog Ltda</p>
                </CardContent>
              </Card>

              {/* Histórico do veículo */}
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4 text-muted-foreground" />
                  Histórico de Serviços
                </h3>
                {mockHistorico.map((h, i) => (
                  <div key={i} className="bg-card rounded-xl p-3 border flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{h.servico}</p>
                      <p className="text-xs text-muted-foreground">{h.data} · {h.km.toLocaleString()} km · {h.oficina}</p>
                    </div>
                    <span className="text-sm font-semibold text-foreground shrink-0">{fmt(h.valor)}</span>
                  </div>
                ))}
              </div>

              {/* Iniciar orçamento */}
              <Button
                onClick={() => setView('orcamento')}
                className="w-full h-14 text-lg bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md gap-2"
              >
                <FileText className="w-5 h-5" />
                Elaborar Orçamento
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // VIEW: ORÇAMENTO — Elaboração Inteligente
  // ══════════════════════════════════════════════
  if (view === 'orcamento') {
    return (
      <div className="min-h-screen bg-background">
        <PortalHeader title="Elaborar Orçamento" />

        <div className="p-4 space-y-5 max-w-lg mx-auto pb-32">
          {/* Vehicle Header */}
          <div className="flex items-center gap-3 bg-card rounded-xl p-3 border">
            <Car className="w-5 h-5 text-muted-foreground" />
            <div>
              <p className="font-mono font-bold text-foreground">{placaInput || 'ABC-1D23'}</p>
              <p className="text-xs text-muted-foreground">Scania R450 · 185.000 km</p>
            </div>
          </div>

          {/* Type Toggle */}
          <div className="flex gap-2">
            <button
              onClick={() => setNovoItemTipo('peca')}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${
                novoItemTipo === 'peca'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              🔩 Peça
            </button>
            <button
              onClick={() => setNovoItemTipo('mao_de_obra')}
              className={`flex-1 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98] ${
                novoItemTipo === 'mao_de_obra'
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              🛠️ Mão de Obra
            </button>
          </div>

          {/* Add Item Form */}
          <div className="space-y-3">
            <Input
              placeholder={novoItemTipo === 'peca' ? 'Ex: Filtro de óleo Mann W940' : 'Ex: Troca de embreagem'}
              value={novoItemDesc}
              onChange={(e) => setNovoItemDesc(e.target.value)}
              className="h-12"
            />
            <div className="flex gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                <Input
                  placeholder="0,00"
                  value={novoItemValor}
                  onChange={(e) => setNovoItemValor(e.target.value)}
                  className="h-12 pl-10 text-lg font-mono"
                />
              </div>
              <Button onClick={addItem} className="h-12 px-6 bg-emerald-500 hover:bg-emerald-600 text-white">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Items List */}
          {orcamentoItems.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground">Itens do Orçamento</h3>
              {orcamentoItems.map((item) => (
                <div key={item.id} className="bg-card rounded-xl p-3 border flex items-center gap-3">
                  <span className="text-lg">{item.tipo === 'peca' ? '🔩' : '🛠️'}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.descricao}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {item.statusIA === 'ok' && <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">✓ Preço OK</span>}
                      {item.statusIA === 'atencao' && <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">⚠ Atenção</span>}
                      {item.statusIA === 'alto' && <span className="text-xs text-red-600 dark:text-red-400 font-medium">⛔ Acima da média</span>}
                    </div>
                  </div>
                  <span className="font-mono font-bold text-foreground">{fmt(item.valor)}</span>
                  <button onClick={() => removeItem(item.id)} className="p-1.5 rounded-lg hover:bg-muted active:scale-90 transition-all">
                    <Trash2 className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Fotos */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Camera className="w-4 h-4 text-muted-foreground" />
              Fotos (peças danificadas / hodômetro)
            </h3>
            <div className="flex flex-wrap gap-2">
              {fotos.map((f, i) => (
                <div key={i} className="relative w-20 h-20 rounded-xl overflow-hidden border bg-muted">
                  <img src={f} alt={`Foto ${i + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setFotos(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center"
                  >
                    <X className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-20 h-20 rounded-xl border-2 border-dashed border-border hover:border-primary/50 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
              >
                <Camera className="w-5 h-5 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">Adicionar</span>
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleFoto} />
            </div>
          </div>

          {/* Observações */}
          <Textarea placeholder="Observações para o gestor da frota (opcional)" rows={2} />
        </div>

        {/* Bottom Bar: Total + Enviar */}
        {orcamentoItems.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm border-t p-4 z-40">
            <div className="max-w-lg mx-auto flex items-center gap-4">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Total do Orçamento</p>
                <p className="text-2xl font-bold text-foreground">{fmt(totalOrcamento)}</p>
                <p className="text-xs text-muted-foreground">Você recebe: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{fmt(totalOrcamento * 0.85)}</span> (85%)</p>
              </div>
              <Button
                className="h-14 px-8 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-bold rounded-xl shadow-lg gap-2"
              >
                <Send className="w-5 h-5" />
                Enviar
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // VIEW: PÁTIO DIGITAL — Status de Aprovação
  // ══════════════════════════════════════════════
  if (view === 'patio') {
    return (
      <div className="min-h-screen bg-background">
        <PortalHeader title="Pátio Digital" />

        <div className="p-4 space-y-4 max-w-lg mx-auto pb-32">
          <p className="text-sm text-muted-foreground">{mockPatio.length} veículos no pátio</p>

          {mockPatio.map(v => {
            const cfg = statusConfig[v.status];
            const StatusIcon = cfg.icon;
            return (
              <div
                key={v.id}
                className="bg-card rounded-2xl border shadow-sm overflow-hidden"
              >
                {/* Status bar */}
                <div className={`h-1.5 ${cfg.color}`} />
                <div className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <p className="font-mono text-xl font-bold text-foreground">{v.placa}</p>
                      <span className="text-sm text-muted-foreground">{v.modelo}</span>
                    </div>
                    <span className="text-sm font-bold text-foreground">{fmt(v.valorTotal)}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`w-4 h-4 ${cfg.textColor}`} />
                      <span className={`text-sm font-medium ${cfg.textColor}`}>{cfg.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">Entrada: {v.horaEntrada}</span>
                  </div>

                  <p className="text-xs text-muted-foreground">Motorista: {v.motorista}</p>

                  {/* Actions */}
                  {v.status === 'autorizado' && (
                    <Button
                      onClick={() => { setSelectedVeiculo(v); setFinalizarDialog(true); }}
                      className="w-full h-12 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl gap-2"
                    >
                      <CheckCircle2 className="w-5 h-5" />
                      Finalizar Serviço
                    </Button>
                  )}
                  {v.status === 'ajuste' && (
                    <Button
                      onClick={() => setView('orcamento')}
                      className="w-full h-12 font-bold rounded-xl gap-2"
                      variant="outline"
                    >
                      <FileText className="w-5 h-5" />
                      Revisar Orçamento
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Dialog: Finalizar Serviço */}
        <Dialog open={finalizarDialog} onOpenChange={setFinalizarDialog}>
          <DialogContent className="max-w-md mx-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                Finalizar Serviço
              </DialogTitle>
            </DialogHeader>
            {selectedVeiculo && (
              <div className="space-y-4 mt-2">
                <div className="bg-muted rounded-xl p-3 flex items-center gap-3">
                  <Car className="w-5 h-5 text-muted-foreground" />
                  <div>
                    <p className="font-mono font-bold text-foreground">{selectedVeiculo.placa}</p>
                    <p className="text-xs text-muted-foreground">{selectedVeiculo.modelo}</p>
                  </div>
                </div>

                {/* Foto do serviço pronto */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-2">Foto do serviço concluído</p>
                  <button
                    onClick={() => fotoServicoRef.current?.click()}
                    className="w-full border-2 border-dashed border-border rounded-xl p-6 flex flex-col items-center gap-2 hover:border-primary/50 active:scale-[0.98] transition-all"
                  >
                    <Camera className="w-8 h-8 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Tirar foto ou selecionar</span>
                  </button>
                  <input ref={fotoServicoRef} type="file" accept="image/*" capture="environment" className="hidden" />
                </div>

                <Separator />

                {/* Split Preview */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-foreground">Resumo Financeiro</p>
                  <div className="bg-muted rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Valor do serviço</span>
                      <span className="font-bold text-foreground">{fmt(selectedVeiculo.valorTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Comissão NovaLink (15%)</span>
                      <span className="text-red-500 font-medium">-{fmt(selectedVeiculo.valorTotal * 0.15)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="font-semibold text-foreground">Você recebe</span>
                      <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{fmt(selectedVeiculo.valorTotal * 0.85)}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Timer className="w-3.5 h-3.5" />
                      <span>Depósito em até 24 horas (D+1)</span>
                    </div>
                  </div>
                </div>

                <Button
                  onClick={() => setFinalizarDialog(false)}
                  className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white text-lg font-bold rounded-xl shadow-lg gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Confirmar Finalização
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* FAB: WhatsApp */}
        <a
          href="https://wa.me/5599999999999?text=Preciso%20de%20ajuda%20com%20um%20serviço"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg flex items-center justify-center active:scale-95 transition-all"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </a>
      </div>
    );
  }

  // ══════════════════════════════════════════════
  // VIEW: FINANCEIRO — Histórico de Recebíveis
  // ══════════════════════════════════════════════
  if (view === 'financeiro') {
    const depositos = mockRecebiveis.filter(r => r.status === 'depositado');
    const emProcesso = mockRecebiveis.filter(r => r.status === 'em_processo');
    const agendados = mockRecebiveis.filter(r => r.status === 'agendado');

    return (
      <div className="min-h-screen bg-background">
        <PortalHeader title="Recebíveis" />

        <div className="p-4 space-y-5 max-w-lg mx-auto">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-emerald-50 dark:bg-emerald-500/10 rounded-2xl p-4 text-center border border-emerald-200 dark:border-emerald-500/20">
              <p className="text-xs text-muted-foreground mb-1">Recebido</p>
              <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{fmt(totalRecebido)}</p>
            </div>
            <div className="bg-amber-50 dark:bg-amber-500/10 rounded-2xl p-4 text-center border border-amber-200 dark:border-amber-500/20">
              <p className="text-xs text-muted-foreground mb-1">Em D+1</p>
              <p className="text-lg font-bold text-amber-600 dark:text-amber-400">{fmt(totalReceberHoje)}</p>
            </div>
            <div className="bg-card rounded-2xl p-4 text-center border">
              <p className="text-xs text-muted-foreground mb-1">Agendado</p>
              <p className="text-lg font-bold text-foreground">{fmt(agendados.reduce((s, r) => s + r.valorLiquido, 0))}</p>
            </div>
          </div>

          {/* Em Processo */}
          {emProcesso.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Timer className="w-4 h-4 text-amber-500" />
                Pagamento em Processo — D+1
              </h3>
              {emProcesso.map(r => (
                <div key={r.id} className="bg-card rounded-xl p-4 border space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono font-bold text-foreground">{r.placa}</p>
                      <p className="text-xs text-muted-foreground">{r.servico}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{fmt(r.valorLiquido)}</p>
                      <p className="text-[10px] text-muted-foreground line-through">{fmt(r.valorBruto)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                    </div>
                    <span className="text-xs text-muted-foreground">Depósito: {r.dataDeposito}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Agendados */}
          {agendados.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Clock className="w-4 h-4 text-muted-foreground" />
                Agendados
              </h3>
              {agendados.map(r => (
                <div key={r.id} className="bg-card rounded-xl p-4 border flex items-center justify-between">
                  <div>
                    <p className="font-mono font-bold text-foreground">{r.placa}</p>
                    <p className="text-xs text-muted-foreground">{r.servico}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-foreground">{fmt(r.valorLiquido)}</p>
                    <p className="text-xs text-muted-foreground">{r.dataDeposito}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Depositados */}
          {depositos.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Depositados
              </h3>
              {depositos.map(r => (
                <div key={r.id} className="bg-card rounded-xl p-4 border flex items-center justify-between opacity-80">
                  <div>
                    <p className="font-mono font-bold text-foreground">{r.placa}</p>
                    <p className="text-xs text-muted-foreground">{r.servico}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">{fmt(r.valorLiquido)}</p>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400">✓ {r.dataDeposito}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FAB: WhatsApp */}
        <a
          href="https://wa.me/5599999999999?text=Dúvida%20sobre%20meus%20recebíveis"
          target="_blank"
          rel="noopener noreferrer"
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-lg flex items-center justify-center active:scale-95 transition-all"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </a>
      </div>
    );
  }

  // ─── Fallback ───
  return null;
}
