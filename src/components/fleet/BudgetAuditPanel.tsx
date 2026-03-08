import { useState } from 'react';
import {
  Shield, ShieldAlert, ShieldCheck, TrendingDown,
  ExternalLink, Loader2, AlertTriangle, CheckCircle2,
  DollarSign, Zap, Globe, HelpCircle, ChevronDown, ChevronUp
} from 'lucide-react';

export interface AuditItem {
  descricao: string;
  code: string;
  category: 'peca' | 'servico';
  budgetPrice: number;
  budgetTotal: number;
  qtd: number;
  dbMinPrice: number;
  dbAvgPrice: number;
  dbMaxFair: number;
  catalogRef: number;
  scrapedPrice: number;
  scrapedSource: string;
  scrapedUrl: string;
  marketPrice: number;
  marketSource: string;
  regionalPrice: number;
  status: 'justo' | 'atencao' | 'sobrepreco' | 'sem_ref';
  diffPercent: number;
  suggestedPrice: number;
  savings: number;
  horas?: number;
  valorHora?: number;
  horasRef?: number;
  taxaRef?: number;
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
    margemAtencao: number;
    margemSobrepreco: number;
  };
  alerts: number;
  warnings: number;
  stats?: {
    cacheHits: number;
    scrapeCount: number;
    totalItems: number;
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
    rowBg: 'bg-[hsl(145,35%,96%)]',
    text: 'text-[hsl(145,50%,30%)]',
    badge: 'bg-[hsl(145,50%,40%)] text-white',
  },
  atencao: {
    label: 'Atenção',
    icon: AlertTriangle,
    rowBg: 'bg-[hsl(45,85%,95%)]',
    text: 'text-[hsl(35,80%,30%)]',
    badge: 'bg-[hsl(45,80%,50%)] text-white',
  },
  sobrepreco: {
    label: 'Sobrepreço',
    icon: ShieldAlert,
    rowBg: 'bg-[hsl(0,55%,96%)]',
    text: 'text-[hsl(0,60%,40%)]',
    badge: 'bg-[hsl(0,60%,50%)] text-white',
  },
  sem_ref: {
    label: 'Sem Ref.',
    icon: HelpCircle,
    rowBg: 'bg-[hsl(210,15%,97%)]',
    text: 'text-[hsl(215,15%,50%)]',
    badge: 'bg-[hsl(215,15%,70%)] text-white',
  },
};

export function BudgetAuditPanel({ result, loading, error, onRetry }: Props) {
  const [expanded, setExpanded] = useState(true);
  const [detailOpen, setDetailOpen] = useState<string | null>(null);

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
                Analisando orçamento contra base regional e mercado...
              </p>
            </div>
          </div>
          <div className="space-y-2.5">
            {[
              'Consultando base de preços BR-010 (Imperatriz-MA)...',
              'Buscando preços no Mercado Livre (API)...',
              'Aplicando margem de frete (+12%) e conveniência (+8%)...',
              'Classificando itens e calculando economia potencial...',
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-[hsl(215,15%,50%)]">
                <Loader2 className="w-3 h-3 animate-spin text-[hsl(210,80%,55%)] shrink-0" />
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
  const noRef = result.items.filter(i => i.status === 'sem_ref');

  const savingsPercent = result.totalOrcamento > 0
    ? Math.round((result.economiaPotencial / result.totalOrcamento) * 100)
    : 0;

  return (
    <div className="bg-white border-b border-[hsl(215,20%,90%)] mt-px">
      <div className="px-5 py-4">
        {/* Header */}
        <button onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between mb-3">
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
                Base Regional BR-010 + Mercado Livre (ao vivo)
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            {alerts.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[hsl(0,60%,50%)] text-white animate-pulse">
                🔴 {alerts.length} sobrepreço
              </span>
            )}
            {warnings.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[hsl(45,80%,50%)] text-white">
                🟡 {warnings.length} atenção
              </span>
            )}
            {fair.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[hsl(145,50%,40%)] text-white">
                🟢 {fair.length} justo
              </span>
            )}
            {noRef.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[hsl(215,15%,70%)] text-white">
                ⚪ {noRef.length} sem ref
              </span>
            )}
            {expanded ? <ChevronUp className="w-4 h-4 text-[hsl(215,15%,60%)]" /> : <ChevronDown className="w-4 h-4 text-[hsl(215,15%,60%)]" />}
          </div>
        </button>

        {expanded && (
          <>
            {/* ── Lucro Retido Summary ── */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <div className="rounded-lg p-3 bg-[hsl(210,20%,97%)] border border-[hsl(215,20%,90%)]">
                <p className="text-[9px] uppercase font-bold text-[hsl(215,15%,55%)] tracking-wider flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Orçamento Oficina
                </p>
                <p className="text-lg font-black font-mono text-[hsl(215,25%,25%)] mt-1">{fmt(result.totalOrcamento)}</p>
              </div>
              <div className="rounded-lg p-3 bg-[hsl(210,20%,97%)] border border-[hsl(215,20%,90%)]">
                <p className="text-[9px] uppercase font-bold text-[hsl(215,15%,55%)] tracking-wider flex items-center gap-1">
                  <Globe className="w-3 h-3" /> Preço Mercado (c/ frete)
                </p>
                <p className="text-lg font-black font-mono text-[hsl(210,60%,40%)] mt-1">{fmt(result.totalMercado)}</p>
              </div>
              <div className={`rounded-lg p-3 border ${
                result.economiaPotencial > 0
                  ? 'bg-[hsl(145,45%,93%)] border-[hsl(145,40%,70%)]'
                  : 'bg-[hsl(210,20%,97%)] border-[hsl(215,20%,90%)]'
              }`}>
                <p className="text-[9px] uppercase font-bold text-[hsl(145,40%,30%)] tracking-wider flex items-center gap-1">
                  <TrendingDown className="w-3 h-3" /> 💰 Lucro Retido
                </p>
                <p className={`text-lg font-black font-mono mt-1 ${
                  result.economiaPotencial > 0 ? 'text-[hsl(145,50%,30%)]' : 'text-[hsl(215,15%,60%)]'
                }`}>
                  {fmt(result.economiaPotencial)}
                </p>
              </div>
              <div className={`rounded-lg p-3 border ${
                savingsPercent > 20 ? 'bg-[hsl(0,55%,96%)] border-[hsl(0,50%,80%)]'
                  : savingsPercent > 10 ? 'bg-[hsl(45,85%,95%)] border-[hsl(45,70%,75%)]'
                    : 'bg-[hsl(145,35%,95%)] border-[hsl(145,40%,75%)]'
              }`}>
                <p className={`text-[9px] uppercase font-bold tracking-wider ${
                  savingsPercent > 20 ? 'text-[hsl(0,60%,40%)]' : savingsPercent > 10 ? 'text-[hsl(35,80%,30%)]' : 'text-[hsl(145,40%,30%)]'
                }`}>
                  Diferença Total
                </p>
                <p className={`text-lg font-black font-mono mt-1 ${
                  savingsPercent > 20 ? 'text-[hsl(0,60%,40%)]' : savingsPercent > 10 ? 'text-[hsl(35,80%,30%)]' : 'text-[hsl(145,50%,30%)]'
                }`}>
                  {savingsPercent > 0 ? `+${savingsPercent}%` : `${savingsPercent}%`} acima
                </p>
              </div>
            </div>

            {/* ── Items Detail ── */}
            <div className="border border-[hsl(215,20%,88%)] rounded-lg overflow-hidden">
              {/* Header */}
              <div className="bg-[hsl(215,30%,22%)] text-white">
                <div className="grid grid-cols-[1fr_85px_85px_85px_65px_75px_85px] items-center h-9 px-3 gap-1 text-[9px] font-bold uppercase tracking-wider">
                  <span>Item</span>
                  <span className="text-right">Orçamento</span>
                  <span className="text-right">Mercado</span>
                  <span className="text-right">Regional</span>
                  <span className="text-center">Diff</span>
                  <span className="text-center">Veredito</span>
                  <span className="text-right">Sugerido</span>
                </div>
              </div>

              {/* Body */}
              {result.items.map((item, idx) => {
                const cfg = statusConfig[item.status];
                const StatusIcon = cfg.icon;
                const isDetailOpen = detailOpen === item.code + idx;

                return (
                  <div key={idx}>
                    <button
                      onClick={() => setDetailOpen(isDetailOpen ? null : item.code + idx)}
                      className={`w-full grid grid-cols-[1fr_85px_85px_85px_65px_75px_85px] items-center px-3 gap-1 min-h-[44px] py-2 border-b border-[hsl(215,20%,93%)] ${cfg.rowBg} hover:brightness-[0.97] transition-all cursor-pointer`}
                    >
                      {/* Item name */}
                      <div className="min-w-0 text-left">
                        <p className={`text-xs truncate font-medium ${cfg.text}`}>{item.descricao}</p>
                        <p className="text-[9px] text-[hsl(215,10%,60%)] font-mono truncate flex items-center gap-1">
                          {item.code}
                          {item.scrapedPrice > 0 && (
                            <span className="text-[hsl(210,60%,50%)]">• ML</span>
                          )}
                        </p>
                      </div>
                      {/* Budget price */}
                      <span className="text-right text-xs font-mono font-bold text-[hsl(215,25%,25%)]">
                        {fmt(item.budgetPrice)}
                      </span>
                      {/* Market price */}
                      <span className="text-right text-xs font-mono text-[hsl(210,60%,45%)]">
                        {item.marketPrice > 0 ? fmt(item.marketPrice) : (
                          <span className="text-[hsl(215,10%,75%)]">—</span>
                        )}
                      </span>
                      {/* Regional */}
                      <span className="text-right text-xs font-mono text-[hsl(215,15%,45%)]">
                        {item.regionalPrice > 0 ? fmt(item.regionalPrice) : (
                          <span className="text-[hsl(215,10%,75%)]">—</span>
                        )}
                      </span>
                      {/* Diff */}
                      <span className={`text-center text-[10px] font-bold font-mono ${
                        item.status === 'sem_ref' ? 'text-[hsl(215,10%,70%)]'
                          : item.diffPercent > 50 ? 'text-[hsl(0,60%,45%)]'
                            : item.diffPercent > 30 ? 'text-[hsl(35,80%,40%)]'
                              : item.diffPercent > 0 ? 'text-[hsl(145,50%,35%)]'
                                : 'text-[hsl(215,15%,55%)]'
                      }`}>
                        {item.status === 'sem_ref' ? '—' : pct(item.diffPercent)}
                      </span>
                      {/* Status badge */}
                      <div className="flex justify-center">
                        <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-bold ${cfg.badge}`}>
                          <StatusIcon className="w-2.5 h-2.5" />
                          {cfg.label}
                        </span>
                      </div>
                      {/* Suggested */}
                      <div className="text-right">
                        {item.savings > 0 ? (
                          <span className="text-xs font-mono font-bold text-[hsl(145,50%,35%)]">
                            {fmt(item.suggestedPrice)}
                          </span>
                        ) : (
                          <span className="text-xs text-[hsl(215,10%,75%)]">—</span>
                        )}
                      </div>
                    </button>

                    {/* Expanded detail row */}
                    {isDetailOpen && (
                      <div className="px-4 py-3 bg-[hsl(210,15%,97%)] border-b border-[hsl(215,20%,90%)] text-xs text-[hsl(215,15%,40%)] space-y-1.5">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <div>
                            <span className="text-[9px] uppercase font-bold text-[hsl(215,15%,60%)]">Base Regional</span>
                            <p className="font-mono font-semibold">
                              {item.dbAvgPrice > 0
                                ? `Min ${fmt(item.dbMinPrice)} / Méd ${fmt(item.dbAvgPrice)} / Teto ${fmt(item.dbMaxFair)}`
                                : 'Não disponível'
                              }
                            </p>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-[hsl(215,15%,60%)]">Catálogo Ref.</span>
                            <p className="font-mono font-semibold">
                              {item.catalogRef > 0 ? fmt(item.catalogRef) : '—'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-[hsl(215,15%,60%)]">Mercado Livre</span>
                            <p className="font-mono font-semibold flex items-center gap-1">
                              {item.scrapedPrice > 0 ? (
                                <>
                                  {fmt(item.scrapedPrice)}
                                  {item.scrapedUrl && (
                                    <a href={item.scrapedUrl} target="_blank" rel="noopener noreferrer"
                                      className="text-[hsl(210,60%,50%)] hover:text-[hsl(210,70%,40%)]"
                                      onClick={e => e.stopPropagation()}>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  )}
                                </>
                              ) : 'Não encontrado'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[9px] uppercase font-bold text-[hsl(215,15%,60%)]">Fonte Usada</span>
                            <p className="font-mono font-semibold">{item.marketSource || '—'}</p>
                          </div>
                        </div>
                        {item.savings > 0 && (
                          <div className="mt-2 p-2 rounded bg-[hsl(0,50%,96%)] border border-[hsl(0,40%,85%)] flex items-center gap-2">
                            <ShieldAlert className="w-4 h-4 text-[hsl(0,60%,50%)] shrink-0" />
                            <span className="text-[hsl(0,50%,35%)] font-semibold">
                              Economia de {fmt(item.savings)} por unidade ({item.qtd > 1 ? `${fmt(item.savings * item.qtd)} total` : 'unidade única'}).
                              Sugerido: {fmt(item.suggestedPrice)}
                            </span>
                          </div>
                        )}
                        {item.category === 'servico' && item.horas && item.valorHora && (
                          <div className="text-[10px] text-[hsl(215,15%,55%)]">
                            {item.horas}h × {fmt(item.valorHora)}/h = {fmt(item.horas * item.valorHora)}
                            {item.taxaRef ? ` (ref: ${fmt(item.taxaRef)}/h)` : ''}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ── Footer ── */}
            <div className="mt-3 flex items-center justify-between text-[9px] text-[hsl(215,10%,60%)]">
              <div className="flex items-center gap-2 flex-wrap">
                <span>📊 {result.items.length} itens analisados</span>
                <span>•</span>
                <span>Frete: +{result.config.fretePercent}%</span>
                <span>•</span>
                <span>Conveniência: +{result.config.convenienciaPercent}%</span>
                {result.stats && (
                  <>
                    <span>•</span>
                    <span>💾 {result.stats.cacheHits} cache hits</span>
                    <span>•</span>
                    <span>🌐 {result.stats.scrapeCount} scrapes ao vivo</span>
                  </>
                )}
              </div>
              <span className="text-[hsl(210,60%,50%)] font-semibold">Powered by VERO 1.0 — Cache Inteligente</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
