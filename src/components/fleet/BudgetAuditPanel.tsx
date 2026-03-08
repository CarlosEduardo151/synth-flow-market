import { useState } from 'react';
import {
  Shield, ShieldAlert, ShieldCheck, TrendingDown, TrendingUp,
  ExternalLink, Loader2, AlertTriangle, CheckCircle2, Search,
  DollarSign, Zap, Globe
} from 'lucide-react';

export interface AuditItem {
  descricao: string;
  searchTerm: string;
  category: 'peca' | 'servico';
  budgetPrice: number;
  budgetTotal: number;
  qtd: number;
  code: string;
  marketPrice: number | null;
  regionalPrice: number | null;
  status: 'justo' | 'atencao' | 'sobrepreco' | 'servico';
  diffPercent: number;
  suggestedPrice: number;
  scrapeData: {
    source: string;
    lowestPrice: number;
    prices: number[];
    url: string;
  } | null;
}

export interface AuditResult {
  ok: boolean;
  auditId: string;
  totalOrcamento: number;
  totalMercado: number;
  economiaPotencial: number;
  items: AuditItem[];
  config: {
    fretePercent: number;
    convenienciaPercent: number;
    margemSeguranca: number;
    margemCritica: number;
  };
}

interface Props {
  result: AuditResult | null;
  loading: boolean;
  error: string | null;
  onRetry?: () => void;
}

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const pct = (v: number) => `${v > 0 ? '+' : ''}${v}%`;

const statusConfig = {
  justo: {
    label: 'Preço Justo',
    icon: ShieldCheck,
    bg: 'bg-[hsl(145,40%,94%)]',
    border: 'border-[hsl(145,40%,75%)]',
    text: 'text-[hsl(145,50%,30%)]',
    badge: 'bg-[hsl(145,50%,40%)] text-white',
  },
  atencao: {
    label: 'Atenção',
    icon: AlertTriangle,
    bg: 'bg-[hsl(45,90%,94%)]',
    border: 'border-[hsl(45,70%,65%)]',
    text: 'text-[hsl(35,80%,30%)]',
    badge: 'bg-[hsl(45,80%,50%)] text-white',
  },
  sobrepreco: {
    label: 'Sobrepreço',
    icon: ShieldAlert,
    bg: 'bg-[hsl(0,60%,96%)]',
    border: 'border-[hsl(0,50%,75%)]',
    text: 'text-[hsl(0,60%,40%)]',
    badge: 'bg-[hsl(0,60%,50%)] text-white',
  },
  servico: {
    label: 'Serviço',
    icon: Shield,
    bg: 'bg-[hsl(210,20%,96%)]',
    border: 'border-[hsl(215,20%,88%)]',
    text: 'text-[hsl(215,15%,45%)]',
    badge: 'bg-[hsl(215,20%,70%)] text-white',
  },
};

export function BudgetAuditPanel({ result, loading, error, onRetry }: Props) {
  const [expanded, setExpanded] = useState(true);

  if (loading) {
    return (
      <div className="bg-white border-b border-[hsl(215,20%,90%)] mt-px">
        <div className="px-5 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <Shield className="w-6 h-6 text-[hsl(210,80%,55%)]" />
              <Loader2 className="w-4 h-4 text-[hsl(210,80%,55%)] animate-spin absolute -bottom-1 -right-1" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[hsl(215,45%,18%)]">
                VERO 1.0 — Auditoria de Preços em Andamento
              </h2>
              <p className="text-xs text-[hsl(215,15%,55%)] mt-0.5">
                Normalizando itens com IA, buscando preços no mercado...
              </p>
            </div>
          </div>
          <div className="space-y-2">
            {['Mapeando itens do orçamento com IA...', 'Buscando preços no Mercado Livre...', 'Aplicando lógica regional de Imperatriz...'].map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-[hsl(215,15%,50%)]">
                <Loader2 className="w-3 h-3 animate-spin text-[hsl(210,80%,55%)]" />
                {step}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[hsl(0,60%,97%)] border-b border-[hsl(0,40%,85%)] mt-px">
        <div className="px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-[hsl(0,60%,50%)]" />
            <div>
              <p className="text-sm font-semibold text-[hsl(0,60%,40%)]">Falha na Auditoria</p>
              <p className="text-xs text-[hsl(0,40%,50%)]">{error}</p>
            </div>
          </div>
          {onRetry && (
            <button onClick={onRetry}
              className="px-3 py-1.5 text-xs font-bold rounded bg-[hsl(0,60%,50%)] text-white hover:bg-[hsl(0,60%,40%)] transition-colors">
              Tentar Novamente
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!result) return null;

  const alerts = result.items.filter(i => i.status === 'sobrepreco');
  const warnings = result.items.filter(i => i.status === 'atencao');
  const fair = result.items.filter(i => i.status === 'justo');
  const savingsPercent = result.totalOrcamento > 0
    ? Math.round((result.economiaPotencial / result.totalOrcamento) * 100)
    : 0;

  return (
    <div className="bg-white border-b border-[hsl(215,20%,90%)] mt-px">
      <div className="px-5 py-4">
        {/* Header */}
        <button onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[hsl(210,80%,50%)] to-[hsl(260,60%,55%)] flex items-center justify-center shadow-md">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="text-left">
              <h2 className="text-sm font-bold text-[hsl(215,45%,18%)] flex items-center gap-2">
                VERO 1.0 — Relatório de Auditoria
                <Zap className="w-3.5 h-3.5 text-[hsl(45,80%,50%)]" />
              </h2>
              <p className="text-[10px] text-[hsl(215,15%,55%)] uppercase tracking-wider mt-0.5">
                Web Scraping + Lógica Regional Imperatriz-MA
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {alerts.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[hsl(0,60%,50%)] text-white">
                {alerts.length} sobrepreço
              </span>
            )}
            {warnings.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[hsl(45,80%,50%)] text-white">
                {warnings.length} atenção
              </span>
            )}
            {fair.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[hsl(145,50%,40%)] text-white">
                {fair.length} justo
              </span>
            )}
          </div>
        </button>

        {expanded && (
          <>
            {/* ── Lucro Retido Summary ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg p-3 bg-[hsl(210,20%,97%)] border border-[hsl(215,20%,90%)]">
                <p className="text-[9px] uppercase font-bold text-[hsl(215,15%,55%)] tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Orçamento
                </p>
                <p className="text-lg font-black font-mono text-[hsl(215,25%,25%)] mt-1">{fmt(result.totalOrcamento)}</p>
              </div>
              <div className="rounded-lg p-3 bg-[hsl(210,20%,97%)] border border-[hsl(215,20%,90%)]">
                <p className="text-[9px] uppercase font-bold text-[hsl(215,15%,55%)] tracking-wider flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Preço Mercado
                </p>
                <p className="text-lg font-black font-mono text-[hsl(210,60%,40%)] mt-1">{fmt(result.totalMercado)}</p>
              </div>
              <div className={`rounded-lg p-3 border ${
                result.economiaPotencial > 0
                  ? 'bg-[hsl(145,45%,94%)] border-[hsl(145,40%,75%)]'
                  : 'bg-[hsl(210,20%,97%)] border-[hsl(215,20%,90%)]'
              }`}>
                <p className="text-[9px] uppercase font-bold text-[hsl(145,40%,35%)] tracking-wider flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> Lucro Retido
                </p>
                <p className="text-lg font-black font-mono text-[hsl(145,50%,30%)] mt-1">{fmt(result.economiaPotencial)}</p>
              </div>
              <div className={`rounded-lg p-3 border ${
                savingsPercent > 15
                  ? 'bg-[hsl(0,60%,96%)] border-[hsl(0,50%,80%)]'
                  : savingsPercent > 5
                    ? 'bg-[hsl(45,90%,95%)] border-[hsl(45,70%,75%)]'
                    : 'bg-[hsl(145,40%,94%)] border-[hsl(145,40%,75%)]'
              }`}>
                <p className="text-[9px] uppercase font-bold tracking-wider flex items-center gap-1"
                  style={{ color: savingsPercent > 15 ? 'hsl(0,60%,40%)' : savingsPercent > 5 ? 'hsl(35,80%,30%)' : 'hsl(145,40%,35%)' }}>
                  <Search className="w-3 h-3" /> Diferença
                </p>
                <p className="text-lg font-black font-mono mt-1"
                  style={{ color: savingsPercent > 15 ? 'hsl(0,60%,40%)' : savingsPercent > 5 ? 'hsl(35,80%,30%)' : 'hsl(145,50%,30%)' }}>
                  {savingsPercent}%
                </p>
              </div>
            </div>

            {/* ── Items Detail Table ── */}
            <div className="border border-[hsl(215,20%,88%)] rounded-lg overflow-hidden">
              <div className="bg-[hsl(215,30%,22%)] text-white">
                <div className="grid grid-cols-[1fr_80px_80px_80px_70px_80px_80px] items-center h-9 px-3 gap-1 text-[9px] font-bold uppercase tracking-wider">
                  <span>Item</span>
                  <span className="text-right">Orçamento</span>
                  <span className="text-right">Mercado</span>
                  <span className="text-right">Regional</span>
                  <span className="text-center">Diff</span>
                  <span className="text-center">Status</span>
                  <span className="text-right">Sugerido</span>
                </div>
              </div>

              {result.items.map((item, idx) => {
                const cfg = statusConfig[item.status];
                const StatusIcon = cfg.icon;
                return (
                  <div key={idx}
                    className={`grid grid-cols-[1fr_80px_80px_80px_70px_80px_80px] items-center px-3 gap-1 min-h-[44px] py-2 border-b border-[hsl(215,20%,93%)] last:border-0 ${cfg.bg} transition-colors`}>
                    <div className="min-w-0">
                      <p className={`text-xs truncate ${cfg.text} font-medium`}>{item.descricao}</p>
                      <p className="text-[9px] text-[hsl(215,10%,60%)] font-mono truncate">
                        {item.searchTerm}
                      </p>
                    </div>
                    <span className="text-right text-xs font-mono font-bold text-[hsl(215,25%,25%)]">
                      {fmt(item.budgetPrice)}
                    </span>
                    <span className="text-right text-xs font-mono text-[hsl(210,60%,45%)]">
                      {item.marketPrice != null && item.marketPrice > 0 ? fmt(item.marketPrice) : '—'}
                    </span>
                    <span className="text-right text-xs font-mono text-[hsl(215,15%,45%)]">
                      {item.regionalPrice != null && item.regionalPrice > 0 ? fmt(item.regionalPrice) : '—'}
                    </span>
                    <span className={`text-center text-[10px] font-bold font-mono ${
                      item.diffPercent > 50 ? 'text-[hsl(0,60%,45%)]'
                        : item.diffPercent > 30 ? 'text-[hsl(35,80%,40%)]'
                          : item.diffPercent > 0 ? 'text-[hsl(145,50%,35%)]'
                            : 'text-[hsl(215,10%,60%)]'
                    }`}>
                      {item.category === 'servico' ? '—' : pct(item.diffPercent)}
                    </span>
                    <div className="flex justify-center">
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold ${cfg.badge}`}>
                        <StatusIcon className="w-2.5 h-2.5" />
                        {cfg.label}
                      </span>
                    </div>
                    <div className="text-right">
                      {item.status === 'sobrepreco' || item.status === 'atencao' ? (
                        <span className="text-xs font-mono font-bold text-[hsl(145,50%,35%)]">
                          {fmt(item.suggestedPrice)}
                        </span>
                      ) : (
                        <span className="text-xs text-[hsl(215,10%,70%)]">—</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── Source & Config Footer ── */}
            <div className="mt-3 flex items-center justify-between text-[9px] text-[hsl(215,10%,60%)]">
              <div className="flex items-center gap-3">
                <span>Fontes: Mercado Livre</span>
                <span>•</span>
                <span>Frete: +{result.config.fretePercent}%</span>
                <span>•</span>
                <span>Conveniência: +{result.config.convenienciaPercent}%</span>
              </div>
              <div className="flex items-center gap-1">
                <span>Processado em tempo real por VERO 1.0</span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
