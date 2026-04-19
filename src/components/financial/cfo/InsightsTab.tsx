import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AlertTriangle, Award, BarChart3, CheckCircle2, ChevronRight, Lightbulb,
  Minus, Sparkles, Target, TrendingDown, TrendingUp, Zap,
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

const SEVERITY_TONES: Record<Anomaly["severity"], string> = {
  low: "border-cyan-500/30 bg-cyan-500/5 text-cyan-400",
  medium: "border-amber-500/30 bg-amber-500/5 text-amber-400",
  high: "border-orange-500/30 bg-orange-500/5 text-orange-400",
  critical: "border-rose-500/40 bg-rose-500/10 text-rose-400",
};

const EFFORT_LABELS: Record<Optimization["effort"], { label: string; tone: string }> = {
  low: { label: "Fácil", tone: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
  medium: { label: "Médio", tone: "bg-amber-500/15 text-amber-400 border-amber-500/30" },
  high: { label: "Complexo", tone: "bg-rose-500/15 text-rose-400 border-rose-500/30" },
};

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function InsightsTab({ customerProductId }: Props) {
  const [sector, setSector] = useState("geral");
  const [size, setSize] = useState<"micro" | "small" | "medium" | "large">("small");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<InsightsResult | null>(null);
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
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro ao gerar insights", description: e?.message || "Tente novamente", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const totalSavings = (result?.optimizations || []).reduce((s, o) => s + (o.estimated_monthly_saving || 0), 0);
  const healthScore = result?.health_score ?? 0;
  const healthTone = healthScore >= 75 ? "text-emerald-400" : healthScore >= 50 ? "text-amber-400" : "text-rose-400";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-primary" /> Insights & Otimização
          </h2>
          <p className="text-sm text-muted-foreground">
            Anomalias, oportunidades de economia e benchmarking setorial via IA.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Setor</Label>
            <Select value={sector} onValueChange={setSector}>
              <SelectTrigger className="w-40 h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="geral">Geral</SelectItem>
                <SelectItem value="saas">SaaS / Tech</SelectItem>
                <SelectItem value="ecommerce">E-commerce</SelectItem>
                <SelectItem value="servicos">Serviços</SelectItem>
                <SelectItem value="industria">Indústria</SelectItem>
                <SelectItem value="varejo">Varejo</SelectItem>
                <SelectItem value="agencia">Agência</SelectItem>
                <SelectItem value="restaurante">Restaurante</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Porte</Label>
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
          <Button onClick={run} disabled={loading} className="h-9 gap-2">
            <Sparkles className="h-4 w-4" />
            {loading ? "Analisando..." : "Gerar insights"}
          </Button>
        </div>
      </div>

      {!result && !loading && (
        <Card className="p-12 border-dashed border-border/60 bg-card/20 text-center">
          <Sparkles className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">
            Configure setor e porte, depois clique em <strong>Gerar insights</strong>.
          </p>
        </Card>
      )}

      {result && (
        <>
          {/* Health Score + KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Card className="p-5 border-border/60 bg-card/40 backdrop-blur md:col-span-1">
              <div className="flex items-center gap-2 mb-2">
                <Award className="h-4 w-4 text-primary" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Health Score</span>
              </div>
              <div className={`text-5xl font-bold ${healthTone}`}>{healthScore}<span className="text-xl text-muted-foreground">/100</span></div>
              <Progress value={healthScore} className="mt-3 h-2" />
              <p className="text-xs text-muted-foreground mt-3 leading-relaxed">{result.health_summary}</p>
            </Card>

            <Card className="p-5 border-emerald-500/30 bg-emerald-500/5 backdrop-blur">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="h-4 w-4 text-emerald-400" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Economia potencial/mês</span>
              </div>
              <div className="text-3xl font-bold text-emerald-400">{fmtBRL(totalSavings)}</div>
              <p className="text-xs text-muted-foreground mt-2">
                Soma de {result.optimizations?.length || 0} oportunidades identificadas
              </p>
            </Card>

            <Card className="p-5 border-border/60 bg-card/40 backdrop-blur">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">Anomalias detectadas</span>
              </div>
              <div className="text-3xl font-bold">{result.anomalies?.length || 0}</div>
              <div className="flex flex-wrap gap-1 mt-2">
                {(["critical", "high", "medium", "low"] as const).map((sev) => {
                  const count = (result.anomalies || []).filter((a) => a.severity === sev).length;
                  if (!count) return null;
                  return (
                    <Badge key={sev} variant="outline" className={`text-[10px] ${SEVERITY_TONES[sev]}`}>
                      {sev}: {count}
                    </Badge>
                  );
                })}
              </div>
            </Card>
          </div>

          {/* Anomalias */}
          {result.anomalies && result.anomalies.length > 0 && (
            <Card className="p-5 border-border/60 bg-card/40 backdrop-blur">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-5 w-5 text-amber-400" />
                <h3 className="font-semibold">Anomalias e gastos suspeitos</h3>
              </div>
              <div className="space-y-2">
                {result.anomalies.map((a, i) => (
                  <div key={i} className={`p-3 rounded-lg border ${SEVERITY_TONES[a.severity]}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-medium text-foreground">{a.title}</h4>
                          <Badge variant="outline" className={`text-[10px] uppercase ${SEVERITY_TONES[a.severity]}`}>
                            {a.severity}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{a.description}</p>
                      </div>
                      {a.impact_brl ? (
                        <div className="text-right shrink-0">
                          <div className="text-xs text-muted-foreground">Impacto</div>
                          <div className="font-semibold">{fmtBRL(a.impact_brl)}</div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Otimizações */}
          {result.optimizations && result.optimizations.length > 0 && (
            <Card className="p-5 border-border/60 bg-card/40 backdrop-blur">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="h-5 w-5 text-emerald-400" />
                <h3 className="font-semibold">Oportunidades de otimização</h3>
                <Badge variant="secondary" className="ml-auto">
                  Total: {fmtBRL(totalSavings)}/mês
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {result.optimizations.map((o, i) => {
                  const eff = EFFORT_LABELS[o.effort];
                  return (
                    <div key={i} className="p-4 rounded-lg border border-border/60 bg-background/40 hover:bg-background/60 transition-colors">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-medium leading-tight">{o.title}</h4>
                        <Badge variant="outline" className={`text-[10px] shrink-0 ${eff.tone}`}>
                          {eff.label}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed mb-3">{o.action}</p>
                      <div className="flex items-center justify-between">
                        {o.category && (
                          <Badge variant="secondary" className="text-[10px]">{o.category}</Badge>
                        )}
                        <div className="ml-auto flex items-center gap-1 text-emerald-400 font-semibold">
                          <TrendingUp className="h-3.5 w-3.5" />
                          +{fmtBRL(o.estimated_monthly_saving)}/mês
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          {/* Benchmarking */}
          {result.benchmarks && result.benchmarks.length > 0 && (
            <Card className="p-5 border-border/60 bg-card/40 backdrop-blur">
              <div className="flex items-center gap-2 mb-4">
                <BarChart3 className="h-5 w-5 text-cyan-400" />
                <h3 className="font-semibold">Benchmarking — {sector} ({size})</h3>
                <Badge variant="outline" className="ml-auto text-[10px]">
                  Estimativa via IA
                </Badge>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 text-left text-xs uppercase text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Métrica</th>
                      <th className="py-2 pr-4 font-medium">Você</th>
                      <th className="py-2 pr-4 font-medium">Mercado</th>
                      <th className="py-2 pr-4 font-medium">Status</th>
                      <th className="py-2 font-medium">Comentário</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.benchmarks.map((b, i) => {
                      const Icon = b.status === "above_avg" ? TrendingUp : b.status === "below_avg" ? TrendingDown : Minus;
                      const tone = b.status === "above_avg" ? "text-emerald-400" : b.status === "below_avg" ? "text-rose-400" : "text-muted-foreground";
                      return (
                        <tr key={i} className="border-b border-border/20 hover:bg-background/30">
                          <td className="py-3 pr-4 font-medium">{b.metric}</td>
                          <td className="py-3 pr-4 font-mono">{b.your_value}</td>
                          <td className="py-3 pr-4 font-mono text-muted-foreground">{b.market_avg}</td>
                          <td className="py-3 pr-4">
                            <div className={`inline-flex items-center gap-1 ${tone}`}>
                              <Icon className="h-3.5 w-3.5" />
                              <span className="text-xs">
                                {b.status === "above_avg" ? "Acima" : b.status === "below_avg" ? "Abaixo" : "Na média"}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 text-xs text-muted-foreground leading-relaxed">{b.comment}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
