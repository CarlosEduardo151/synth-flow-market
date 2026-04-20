import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Award, BarChart3,
  Building2, CheckCircle2, Filter, Flame, Gauge, Lightbulb, Loader2, Minus,
  ShieldAlert, Sparkles, Target, TrendingDown, TrendingUp, Trophy, Zap,
} from "lucide-react";

interface Props {
  customerProductId: string;
}

interface Anomaly {
  title: string;
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  impact_brl?: number;
}

interface Optimization {
  title: string;
  action: string;
  estimated_monthly_saving: number;
  effort: "low" | "medium" | "high";
  category?: string;
}

interface Benchmark {
  metric: string;
  your_value: string;
  market_avg: string;
  status: "above_avg" | "avg" | "below_avg";
  comment: string;
}

interface InsightsResult {
  anomalies?: Anomaly[];
  optimizations?: Optimization[];
  benchmarks?: Benchmark[];
  health_score?: number;
  health_summary?: string;
  stats?: {
    total_income: number;
    total_expense: number;
    margin_pct: number;
    tx_count: number;
  };
}

const SEVERITY_META: Record<Anomaly["severity"], { label: string; ring: string; bg: string; text: string; dot: string; weight: number }> = {
  critical: { label: "Crítico", ring: "ring-rose-500/40", bg: "bg-rose-500/10 border-rose-500/30", text: "text-rose-400", dot: "bg-rose-500", weight: 4 },
  high:     { label: "Alto",    ring: "ring-orange-500/40", bg: "bg-orange-500/10 border-orange-500/30", text: "text-orange-400", dot: "bg-orange-500", weight: 3 },
  medium:   { label: "Médio",   ring: "ring-amber-500/40", bg: "bg-amber-500/10 border-amber-500/30", text: "text-amber-400", dot: "bg-amber-500", weight: 2 },
  low:      { label: "Baixo",   ring: "ring-cyan-500/40", bg: "bg-cyan-500/10 border-cyan-500/30", text: "text-cyan-400", dot: "bg-cyan-500", weight: 1 },
};

const EFFORT_META: Record<Optimization["effort"], { label: string; tone: string; weight: number; iconTone: string }> = {
  low:    { label: "Esforço baixo",    tone: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", weight: 1, iconTone: "text-emerald-400" },
  medium: { label: "Esforço médio",    tone: "bg-amber-500/15 text-amber-400 border-amber-500/30",       weight: 2, iconTone: "text-amber-400" },
  high:   { label: "Esforço alto",     tone: "bg-rose-500/15 text-rose-400 border-rose-500/30",          weight: 3, iconTone: "text-rose-400" },
};

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const SECTORS = [
  { v: "geral", l: "Geral" },
  { v: "saas", l: "SaaS / Tech" },
  { v: "ecommerce", l: "E-commerce" },
  { v: "servicos", l: "Serviços" },
  { v: "industria", l: "Indústria" },
  { v: "varejo", l: "Varejo" },
  { v: "agencia", l: "Agência" },
  { v: "restaurante", l: "Restaurante" },
];

function HealthRing({ score }: { score: number }) {
  const radius = 58;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 75 ? "hsl(160 84% 50%)" : score >= 50 ? "hsl(38 92% 55%)" : "hsl(0 84% 60%)";
  const tone = score >= 75 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-rose-400";
  return (
    <div className="relative h-36 w-36 shrink-0">
      <svg className="-rotate-90 h-36 w-36" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={radius} stroke="hsl(var(--border))" strokeWidth="10" fill="none" opacity="0.3" />
        <circle
          cx="70" cy="70" r={radius}
          stroke={color} strokeWidth="10" fill="none" strokeLinecap="round"
          strokeDasharray={circumference} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className={`text-4xl font-bold ${tone}`}>{score}</div>
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">/ 100</div>
      </div>
    </div>
  );
}

export function InsightsTab({ customerProductId }: Props) {
  const [sector, setSector] = useState("geral");
  const [size, setSize] = useState<"micro" | "small" | "medium" | "large">("small");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsightsResult | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [anomalyFilter, setAnomalyFilter] = useState<"all" | Anomaly["severity"]>("all");
  const { toast } = useToast();

  const run = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("financial-insights", {
        body: { customer_product_id: customerProductId, sector, company_size: size },
      });
      if (error) throw error;
      if (data?.error === "rate_limited") {
        toast({ title: "Limite da IA atingido", description: "Aguarde alguns minutos e tente novamente.", variant: "destructive" });
        return;
      }
      setResult(data);
      setActiveTab("overview");
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao gerar insights", description: e?.message || "Tente novamente", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const totalSavings = (result?.optimizations || []).reduce((s, o) => s + (o.estimated_monthly_saving || 0), 0);
  const totalImpact = (result?.anomalies || []).reduce((s, a) => s + (a.impact_brl || 0), 0);
  const healthScore = result?.health_score ?? 0;

  const sortedAnomalies = useMemo(() => {
    const list = result?.anomalies || [];
    const filtered = anomalyFilter === "all" ? list : list.filter((a) => a.severity === anomalyFilter);
    return [...filtered].sort((a, b) => SEVERITY_META[b.severity].weight - SEVERITY_META[a.severity].weight);
  }, [result, anomalyFilter]);

  const sortedOpts = useMemo(() => {
    return [...(result?.optimizations || [])].sort((a, b) => {
      // ROI = saving / effort weight
      const ra = a.estimated_monthly_saving / EFFORT_META[a.effort].weight;
      const rb = b.estimated_monthly_saving / EFFORT_META[b.effort].weight;
      return rb - ra;
    });
  }, [result]);

  const quickWins = sortedOpts.filter((o) => o.effort === "low").slice(0, 3);
  const annualSavings = totalSavings * 12;

  const benchScore = useMemo(() => {
    const list = result?.benchmarks || [];
    if (!list.length) return null;
    const above = list.filter((b) => b.status === "above_avg").length;
    const below = list.filter((b) => b.status === "below_avg").length;
    return { above, below, neutral: list.length - above - below, total: list.length };
  }, [result]);

  return (
    <div className="space-y-5">
      {/* ============== Toolbar ============== */}
      <Card className="p-4 border-border/60 bg-gradient-to-br from-card/60 via-card/40 to-card/20 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold leading-tight">Inteligência Financeira</h2>
              <p className="text-xs text-muted-foreground">
                Diagnóstico, anomalias, oportunidades e benchmarking de mercado.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Building2 className="h-3 w-3" /> Setor
              </Label>
              <Select value={sector} onValueChange={setSector}>
                <SelectTrigger className="w-44 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SECTORS.map((s) => <SelectItem key={s.v} value={s.v}>{s.l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                <Gauge className="h-3 w-3" /> Porte
              </Label>
              <Select value={size} onValueChange={(v: any) => setSize(v)}>
                <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="micro">Micro (MEI)</SelectItem>
                  <SelectItem value="small">Pequena</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="large">Grande</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={run} disabled={loading} className="h-9 gap-2 min-w-[150px]">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {loading ? "Analisando..." : result ? "Re-analisar" : "Gerar insights"}
            </Button>
          </div>
        </div>
      </Card>

      {/* ============== Empty / Loading ============== */}
      {!result && !loading && (
        <Card className="p-16 border-dashed border-border/60 bg-card/20 text-center">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Pronto para revelar o invisível</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Configure seu setor e porte e gere uma análise estratégica completa com IA — anomalias,
            oportunidades de economia e comparação com o mercado.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-5">
            <Badge variant="outline" className="gap-1"><ShieldAlert className="h-3 w-3" /> Anomalias</Badge>
            <Badge variant="outline" className="gap-1"><Lightbulb className="h-3 w-3" /> Otimizações</Badge>
            <Badge variant="outline" className="gap-1"><BarChart3 className="h-3 w-3" /> Benchmarks</Badge>
            <Badge variant="outline" className="gap-1"><Award className="h-3 w-3" /> Health Score</Badge>
          </div>
        </Card>
      )}

      {loading && !result && (
        <Card className="p-16 border-border/60 bg-card/30 text-center">
          <Loader2 className="h-10 w-10 mx-auto text-primary animate-spin mb-3" />
          <p className="text-sm text-muted-foreground">A IA está auditando seus dados financeiros…</p>
        </Card>
      )}

      {/* ============== Result ============== */}
      {result && (
        <>
          {/* HERO */}
          <Card className="p-6 border-border/60 bg-gradient-to-br from-primary/5 via-card/40 to-card/20 backdrop-blur overflow-hidden relative">
            <div className="absolute -top-20 -right-20 h-60 w-60 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
            <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr_auto] gap-6 items-center relative">
              <HealthRing score={healthScore} />
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Award className="h-4 w-4 text-primary" />
                  <span className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Health Score Financeiro</span>
                </div>
                <h3 className="text-2xl font-semibold mb-2">
                  {healthScore >= 75 ? "Saúde robusta" : healthScore >= 50 ? "Estável com pontos de atenção" : "Requer ação imediata"}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {result.health_summary}
                </p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:w-56">
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Zap className="h-3 w-3 text-emerald-400" /> Economia/mês
                  </div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">{fmtBRL(totalSavings)}</div>
                  <div className="text-[10px] text-muted-foreground">{fmtBRL(annualSavings)}/ano</div>
                </div>
                <div className="rounded-xl border border-rose-500/30 bg-rose-500/5 p-3">
                  <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <Flame className="h-3 w-3 text-rose-400" /> Impacto em risco
                  </div>
                  <div className="text-xl font-bold text-rose-400 mt-1">{fmtBRL(totalImpact)}</div>
                  <div className="text-[10px] text-muted-foreground">{result.anomalies?.length || 0} anomalia(s)</div>
                </div>
              </div>
            </div>
          </Card>

          {/* KPIs SECUNDÁRIOS */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiTile
              icon={<ArrowUpRight className="h-3.5 w-3.5" />}
              label="Receita período"
              value={result.stats ? fmtBRL(result.stats.total_income) : "—"}
              tone="emerald"
            />
            <KpiTile
              icon={<ArrowDownRight className="h-3.5 w-3.5" />}
              label="Despesa período"
              value={result.stats ? fmtBRL(result.stats.total_expense) : "—"}
              tone="rose"
            />
            <KpiTile
              icon={<TrendingUp className="h-3.5 w-3.5" />}
              label="Margem"
              value={result.stats ? `${result.stats.margin_pct.toFixed(1)}%` : "—"}
              tone={result.stats && result.stats.margin_pct >= 15 ? "emerald" : result.stats && result.stats.margin_pct >= 0 ? "amber" : "rose"}
            />
            <KpiTile
              icon={<Activity className="h-3.5 w-3.5" />}
              label="Transações"
              value={result.stats ? result.stats.tx_count.toString() : "—"}
              tone="cyan"
            />
          </div>

          {/* QUICK WINS */}
          {quickWins.length > 0 && (
            <Card className="p-5 border-emerald-500/25 bg-gradient-to-br from-emerald-500/5 to-transparent">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="h-5 w-5 text-emerald-400" />
                <h3 className="font-semibold">Quick Wins — ações de alto impacto e baixo esforço</h3>
                <Badge className="ml-auto bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                  +{fmtBRL(quickWins.reduce((s, o) => s + o.estimated_monthly_saving, 0))}/mês
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {quickWins.map((o, i) => (
                  <div key={i} className="rounded-lg border border-emerald-500/20 bg-background/40 p-3 hover:border-emerald-500/40 transition-colors">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="h-6 w-6 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </div>
                      <h4 className="text-sm font-medium leading-tight flex-1 line-clamp-1">{o.title}</h4>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-2 leading-relaxed">{o.action}</p>
                    <div className="text-emerald-400 text-sm font-semibold">+{fmtBRL(o.estimated_monthly_saving)}/mês</div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* TABS */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid grid-cols-3 w-full max-w-2xl">
              <TabsTrigger value="overview" className="gap-2">
                <ShieldAlert className="h-4 w-4" />
                Anomalias
                {result.anomalies?.length ? (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{result.anomalies.length}</Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="opts" className="gap-2">
                <Lightbulb className="h-4 w-4" />
                Otimizações
                {result.optimizations?.length ? (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{result.optimizations.length}</Badge>
                ) : null}
              </TabsTrigger>
              <TabsTrigger value="bench" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                Benchmark
                {result.benchmarks?.length ? (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{result.benchmarks.length}</Badge>
                ) : null}
              </TabsTrigger>
            </TabsList>

            {/* ====== ANOMALIAS ====== */}
            <TabsContent value="overview" className="space-y-3 mt-0">
              {result.anomalies && result.anomalies.length > 0 ? (
                <Card className="p-5 border-border/60 bg-card/40 backdrop-blur">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <AlertTriangle className="h-5 w-5 text-amber-400" />
                    <h3 className="font-semibold">Anomalias detectadas</h3>
                    <div className="flex items-center gap-1 ml-auto">
                      <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                      <FilterChip active={anomalyFilter === "all"} onClick={() => setAnomalyFilter("all")} label={`Todas · ${result.anomalies.length}`} />
                      {(["critical", "high", "medium", "low"] as const).map((sev) => {
                        const count = result.anomalies!.filter((a) => a.severity === sev).length;
                        if (!count) return null;
                        return (
                          <FilterChip
                            key={sev}
                            active={anomalyFilter === sev}
                            onClick={() => setAnomalyFilter(sev)}
                            label={`${SEVERITY_META[sev].label} · ${count}`}
                            tone={SEVERITY_META[sev].text}
                          />
                        );
                      })}
                    </div>
                  </div>
                  <div className="space-y-2.5">
                    {sortedAnomalies.map((a, i) => {
                      const meta = SEVERITY_META[a.severity];
                      return (
                        <div key={i} className={`relative p-4 rounded-xl border ${meta.bg} group`}>
                          <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${meta.dot}`} />
                          <div className="flex items-start justify-between gap-3 pl-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold ${meta.text}`}>
                                  <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                                  {meta.label}
                                </span>
                                <h4 className="font-semibold text-foreground">{a.title}</h4>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{a.description}</p>
                            </div>
                            {a.impact_brl ? (
                              <div className="text-right shrink-0 rounded-lg bg-background/60 px-3 py-2 border border-border/40">
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Impacto</div>
                                <div className={`font-bold text-base ${meta.text}`}>{fmtBRL(a.impact_brl)}</div>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                    {sortedAnomalies.length === 0 && (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        Nenhuma anomalia neste filtro.
                      </div>
                    )}
                  </div>
                </Card>
              ) : (
                <EmptyState icon={<CheckCircle2 className="h-8 w-8 text-emerald-400" />} title="Nenhuma anomalia detectada" desc="Seus gastos seguem padrões saudáveis no período analisado." />
              )}
            </TabsContent>

            {/* ====== OTIMIZAÇÕES ====== */}
            <TabsContent value="opts" className="space-y-3 mt-0">
              {sortedOpts.length > 0 ? (
                <Card className="p-5 border-border/60 bg-card/40 backdrop-blur">
                  <div className="flex flex-wrap items-center gap-2 mb-4">
                    <Lightbulb className="h-5 w-5 text-emerald-400" />
                    <h3 className="font-semibold">Oportunidades priorizadas por ROI</h3>
                    <div className="flex items-center gap-2 ml-auto">
                      <Badge variant="outline" className="gap-1 border-emerald-500/30 text-emerald-400">
                        <Zap className="h-3 w-3" /> {fmtBRL(totalSavings)}/mês
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Target className="h-3 w-3" /> {fmtBRL(annualSavings)}/ano
                      </Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                    {sortedOpts.map((o, i) => {
                      const eff = EFFORT_META[o.effort];
                      const maxSaving = sortedOpts[0]?.estimated_monthly_saving || 1;
                      const pct = Math.max(5, Math.round((o.estimated_monthly_saving / maxSaving) * 100));
                      return (
                        <div key={i} className="p-4 rounded-xl border border-border/60 bg-background/40 hover:bg-background/60 hover:border-primary/40 transition-all group">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <div className="h-7 w-7 rounded-lg bg-primary/15 border border-primary/25 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                                #{i + 1}
                              </div>
                              <h4 className="font-semibold leading-tight">{o.title}</h4>
                            </div>
                            <Badge variant="outline" className={`text-[10px] shrink-0 ${eff.tone}`}>
                              {eff.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground leading-relaxed mb-3 pl-9">{o.action}</p>
                          <div className="pl-9 space-y-2">
                            <div className="h-1.5 w-full bg-border/30 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="flex items-center justify-between">
                              {o.category ? (
                                <Badge variant="secondary" className="text-[10px]">{o.category}</Badge>
                              ) : <span />}
                              <div className="flex items-center gap-1 text-emerald-400 font-bold">
                                <TrendingUp className="h-3.5 w-3.5" />
                                +{fmtBRL(o.estimated_monthly_saving)}/mês
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              ) : (
                <EmptyState icon={<Lightbulb className="h-8 w-8 text-muted-foreground" />} title="Sem oportunidades agora" desc="Sua operação já está bem otimizada para o período analisado." />
              )}
            </TabsContent>

            {/* ====== BENCHMARK ====== */}
            <TabsContent value="bench" className="space-y-3 mt-0">
              {result.benchmarks && result.benchmarks.length > 0 ? (
                <>
                  {benchScore && (
                    <div className="grid grid-cols-3 gap-3">
                      <BenchSummary tone="emerald" icon={<TrendingUp className="h-4 w-4" />} label="Acima do mercado" value={benchScore.above} total={benchScore.total} />
                      <BenchSummary tone="muted" icon={<Minus className="h-4 w-4" />} label="Na média" value={benchScore.neutral} total={benchScore.total} />
                      <BenchSummary tone="rose" icon={<TrendingDown className="h-4 w-4" />} label="Abaixo do mercado" value={benchScore.below} total={benchScore.total} />
                    </div>
                  )}
                  <Card className="p-5 border-border/60 bg-card/40 backdrop-blur">
                    <div className="flex items-center gap-2 mb-4">
                      <BarChart3 className="h-5 w-5 text-cyan-400" />
                      <h3 className="font-semibold">
                        Comparação com mercado · <span className="text-muted-foreground font-normal">{SECTORS.find(s => s.v === sector)?.l} ({size})</span>
                      </h3>
                      <Badge variant="outline" className="ml-auto text-[10px]">Estimado por IA</Badge>
                    </div>
                    <div className="space-y-3">
                      {result.benchmarks.map((b, i) => {
                        const isAbove = b.status === "above_avg";
                        const isBelow = b.status === "below_avg";
                        const Icon = isAbove ? TrendingUp : isBelow ? TrendingDown : Minus;
                        const tone = isAbove ? "text-emerald-400" : isBelow ? "text-rose-400" : "text-muted-foreground";
                        const barTone = isAbove ? "bg-emerald-500" : isBelow ? "bg-rose-500" : "bg-muted-foreground/40";
                        return (
                          <div key={i} className="rounded-xl border border-border/40 bg-background/40 p-4 hover:bg-background/60 transition-colors">
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="min-w-0">
                                <h4 className="font-semibold text-sm">{b.metric}</h4>
                                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{b.comment}</p>
                              </div>
                              <div className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md border ${tone} border-current/30 bg-current/5 shrink-0`}>
                                <Icon className="h-3.5 w-3.5" />
                                {isAbove ? "Acima" : isBelow ? "Abaixo" : "Na média"}
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Você</div>
                                <div className={`font-mono font-bold ${tone}`}>{b.your_value}</div>
                                <div className={`mt-1.5 h-1.5 w-full rounded-full ${barTone}`} />
                              </div>
                              <div>
                                <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Mercado</div>
                                <div className="font-mono font-bold text-muted-foreground">{b.market_avg}</div>
                                <div className="mt-1.5 h-1.5 w-2/3 rounded-full bg-border/60" />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </Card>
                </>
              ) : (
                <EmptyState icon={<BarChart3 className="h-8 w-8 text-muted-foreground" />} title="Sem benchmarks" desc="A IA não retornou comparativos de mercado." />
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

// ===== Subcomponentes =====
function KpiTile({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: "emerald" | "rose" | "amber" | "cyan" }) {
  const tones = {
    emerald: "border-emerald-500/25 bg-emerald-500/5 text-emerald-400",
    rose: "border-rose-500/25 bg-rose-500/5 text-rose-400",
    amber: "border-amber-500/25 bg-amber-500/5 text-amber-400",
    cyan: "border-cyan-500/25 bg-cyan-500/5 text-cyan-400",
  } as const;
  return (
    <Card className={`p-3.5 border ${tones[tone]} backdrop-blur`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-80">
        {icon} {label}
      </div>
      <div className="text-xl font-bold mt-1 text-foreground">{value}</div>
    </Card>
  );
}

function FilterChip({ active, onClick, label, tone }: { active: boolean; onClick: () => void; label: string; tone?: string }) {
  return (
    <button
      onClick={onClick}
      className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded-md border transition-colors ${
        active
          ? `bg-primary/15 border-primary/40 text-primary`
          : `border-border/40 text-muted-foreground hover:bg-background/40 ${tone || ""}`
      }`}
    >
      {label}
    </button>
  );
}

function BenchSummary({ tone, icon, label, value, total }: { tone: "emerald" | "rose" | "muted"; icon: React.ReactNode; label: string; value: number; total: number }) {
  const tones = {
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
    rose: "border-rose-500/30 bg-rose-500/5 text-rose-400",
    muted: "border-border/60 bg-card/40 text-muted-foreground",
  } as const;
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <Card className={`p-3.5 border ${tones[tone]}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider">
          {icon} {label}
        </div>
        <span className="text-[10px] font-mono opacity-70">{pct}%</span>
      </div>
      <div className="text-2xl font-bold mt-1 text-foreground">{value}<span className="text-sm text-muted-foreground">/{total}</span></div>
    </Card>
  );
}

function EmptyState({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <Card className="p-10 border-dashed border-border/60 bg-card/20 text-center">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-background/60 border border-border/40 mb-3">
        {icon}
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground">{desc}</p>
    </Card>
  );
}
