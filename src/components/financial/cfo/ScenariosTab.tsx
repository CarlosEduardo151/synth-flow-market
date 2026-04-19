import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Area, AreaChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  AlertTriangle, Plus, Sparkles, Trash2, TrendingDown, TrendingUp, Wand2, Zap,
} from "lucide-react";
import ReactMarkdown from "react-markdown";

interface Props {
  customerProductId: string;
}

interface Scenario {
  id: string;
  name: string;
  monthly_impact: number;
  start_in_months: number;
  duration_months: number | null;
  type: "hire" | "expense" | "revenue" | "investment" | "saving";
}

const TYPE_LABELS: Record<Scenario["type"], { label: string; icon: any; tone: string }> = {
  hire: { label: "Contratação", icon: TrendingDown, tone: "text-rose-400" },
  expense: { label: "Nova despesa", icon: TrendingDown, tone: "text-rose-400" },
  revenue: { label: "Nova receita", icon: TrendingUp, tone: "text-emerald-400" },
  investment: { label: "Investimento", icon: Zap, tone: "text-amber-400" },
  saving: { label: "Economia", icon: TrendingUp, tone: "text-cyan-400" },
};

const PRESETS: Omit<Scenario, "id">[] = [
  { name: "Contratar dev pleno", monthly_impact: -8000, start_in_months: 1, duration_months: null, type: "hire" },
  { name: "Contratar estagiário", monthly_impact: -2000, start_in_months: 1, duration_months: null, type: "hire" },
  { name: "Campanha marketing", monthly_impact: -3000, start_in_months: 0, duration_months: 3, type: "expense" },
  { name: "Novo cliente recorrente", monthly_impact: 5000, start_in_months: 1, duration_months: null, type: "revenue" },
  { name: "Cancelar SaaS ocioso", monthly_impact: 800, start_in_months: 0, duration_months: null, type: "saving" },
];

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function ScenariosTab({ customerProductId }: Props) {
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [horizon, setHorizon] = useState(12);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const addScenario = (preset?: Omit<Scenario, "id">) => {
    const base: Scenario = preset
      ? { ...preset, id: crypto.randomUUID() }
      : {
          id: crypto.randomUUID(),
          name: "Nova simulação",
          monthly_impact: -1000,
          start_in_months: 1,
          duration_months: null,
          type: "expense",
        };
    setScenarios((s) => [...s, base]);
  };

  const updateScenario = (id: string, patch: Partial<Scenario>) => {
    setScenarios((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const removeScenario = (id: string) => {
    setScenarios((s) => s.filter((x) => x.id !== id));
  };

  const runSimulation = async (withAi = false) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("financial-predict", {
        body: {
          customer_product_id: customerProductId,
          horizon_months: horizon,
          scenarios: scenarios.map(({ id, ...rest }) => rest),
          mode: withAi ? "analysis" : "forecast",
        },
      });
      if (error) throw error;
      if (data?.error === "rate_limited") {
        toast({ title: "Limite da IA atingido", description: "Tente novamente em alguns minutos.", variant: "destructive" });
        return;
      }
      setResult(data);
      if (withAi && !data?.ai_analysis) {
        toast({ title: "Sem análise IA", description: "A simulação foi gerada, mas a IA não retornou texto.", variant: "destructive" });
      }
    } catch (e: any) {
      console.error(e);
      toast({ title: "Erro na simulação", description: e?.message || "Falha ao projetar cenário", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const chartData = result
    ? result.baseline.map((b: any, i: number) => ({
        month: b.month.slice(5),
        baseline: Math.round(b.balance),
        scenario: Math.round(result.scenario[i]?.balance ?? 0),
      }))
    : [];

  const m = result?.metrics;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Wand2 className="h-6 w-6 text-primary" /> Cenários "E-se?"
          </h2>
          <p className="text-sm text-muted-foreground">
            Simule contratações, gastos ou receitas e veja o impacto no seu caixa.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label className="text-xs text-muted-foreground">Horizonte:</Label>
          <Select value={String(horizon)} onValueChange={(v) => setHorizon(Number(v))}>
            <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3 meses</SelectItem>
              <SelectItem value="6">6 meses</SelectItem>
              <SelectItem value="12">12 meses</SelectItem>
              <SelectItem value="24">24 meses</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Presets */}
      <Card className="p-4 border-border/60 bg-card/40 backdrop-blur">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground mr-2">Sugestões rápidas:</span>
          {PRESETS.map((p, i) => (
            <Button key={i} variant="outline" size="sm" onClick={() => addScenario(p)} className="h-8">
              <Plus className="h-3 w-3 mr-1" /> {p.name}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => addScenario()} className="h-8 ml-auto">
            <Plus className="h-3 w-3 mr-1" /> Personalizado
          </Button>
        </div>
      </Card>

      {/* Cenários ativos */}
      {scenarios.length > 0 && (
        <Card className="p-4 border-border/60 bg-card/40 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Cenários ativos ({scenarios.length})</h3>
            <Button variant="ghost" size="sm" onClick={() => setScenarios([])}>Limpar tudo</Button>
          </div>
          <div className="space-y-2">
            {scenarios.map((s) => {
              const tInfo = TYPE_LABELS[s.type];
              const Icon = tInfo.icon;
              return (
                <div key={s.id} className="grid grid-cols-12 gap-2 items-center p-3 rounded-lg border border-border/50 bg-background/40">
                  <div className="col-span-12 md:col-span-3">
                    <Input value={s.name} onChange={(e) => updateScenario(s.id, { name: e.target.value })} className="h-9" />
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <Select value={s.type} onValueChange={(v: any) => updateScenario(s.id, { type: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(TYPE_LABELS).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-6 md:col-span-2">
                    <div className="relative">
                      <Input
                        type="number"
                        value={s.monthly_impact}
                        onChange={(e) => updateScenario(s.id, { monthly_impact: Number(e.target.value) })}
                        className="h-9 pl-8"
                      />
                      <Icon className={`absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 ${tInfo.tone}`} />
                    </div>
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Input
                      type="number"
                      min={0}
                      value={s.start_in_months}
                      onChange={(e) => updateScenario(s.id, { start_in_months: Number(e.target.value) })}
                      className="h-9"
                      placeholder="Início (mês)"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-2">
                    <Input
                      type="number"
                      min={0}
                      value={s.duration_months ?? ""}
                      onChange={(e) => updateScenario(s.id, { duration_months: e.target.value ? Number(e.target.value) : null })}
                      className="h-9"
                      placeholder="Duração (vazio = ∞)"
                    />
                  </div>
                  <div className="col-span-4 md:col-span-1 flex justify-end">
                    <Button variant="ghost" size="icon" onClick={() => removeScenario(s.id)} className="h-9 w-9 text-rose-400 hover:text-rose-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => runSimulation(false)} disabled={loading} className="gap-2">
          <Wand2 className="h-4 w-4" />
          {loading ? "Calculando..." : "Simular"}
        </Button>
        <Button onClick={() => runSimulation(true)} disabled={loading} variant="secondary" className="gap-2">
          <Sparkles className="h-4 w-4" />
          {loading ? "Analisando..." : "Simular + Análise IA"}
        </Button>
      </div>

      {/* Resultado */}
      {result && (
        <>
          {/* KPIs do cenário */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <KpiMini label="Saldo atual" value={fmtBRL(m.current_balance)} tone="cyan" />
            <KpiMini label="Burn rate/mês" value={fmtBRL(m.burn_rate)} tone={m.burn_rate > 0 ? "rose" : "emerald"} />
            <KpiMini
              label="Runway (base)"
              value={m.runway_months ? `${m.runway_months} meses` : "∞"}
              tone={m.runway_months && m.runway_months < 6 ? "rose" : "emerald"}
            />
            <KpiMini
              label="Saldo final cenário"
              value={fmtBRL(result.scenario[result.scenario.length - 1]?.balance || 0)}
              tone={result.scenario[result.scenario.length - 1]?.balance >= 0 ? "emerald" : "rose"}
            />
          </div>

          {/* Alerta de insolvência */}
          {(m.scenario_insolvency_month || m.baseline_insolvency_month) && (
            <Card className="p-4 border-rose-500/30 bg-rose-500/5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-rose-400 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <h4 className="font-semibold text-rose-400">Risco de insolvência detectado</h4>
                  <div className="text-sm text-muted-foreground space-y-1">
                    {m.baseline_insolvency_month && (
                      <p>• Cenário base: caixa fica negativo em <strong>{m.baseline_insolvency_month}</strong></p>
                    )}
                    {m.scenario_insolvency_month && scenarios.length > 0 && (
                      <p>• Com cenários aplicados: caixa fica negativo em <strong>{m.scenario_insolvency_month}</strong></p>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* Gráfico comparativo */}
          <Card className="p-4 border-border/60 bg-card/40 backdrop-blur">
            <h3 className="text-sm font-medium mb-3">Projeção de saldo: baseline vs cenário</h3>
            <ResponsiveContainer width="100%" height={320}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="g-base" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g-scen" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(280 90% 65%)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(280 90% 65%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
                <XAxis dataKey="month" className="text-xs" stroke="currentColor" />
                <YAxis className="text-xs" stroke="currentColor" tickFormatter={(v) => fmtBRL(v)} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  formatter={(v: any) => fmtBRL(Number(v))}
                />
                <Legend />
                <Area type="monotone" dataKey="baseline" name="Baseline" stroke="hsl(217 91% 60%)" fill="url(#g-base)" strokeWidth={2} />
                <Area type="monotone" dataKey="scenario" name="Cenário" stroke="hsl(280 90% 65%)" fill="url(#g-scen)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </Card>

          {/* Análise IA */}
          {result.ai_analysis && (
            <Card className="p-5 border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
              <div className="flex items-center gap-2 mb-3">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Análise CFO Virtual</h3>
                <Badge variant="secondary" className="ml-auto text-xs">IA</Badge>
              </div>
              <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:mt-4 prose-headings:mb-2 prose-p:my-1.5 prose-ul:my-2">
                <ReactMarkdown>{result.ai_analysis}</ReactMarkdown>
              </div>
            </Card>
          )}
        </>
      )}

      {!result && (
        <Card className="p-12 border-dashed border-border/60 bg-card/20 text-center">
          <Wand2 className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground">Adicione cenários e clique em "Simular" para ver a projeção.</p>
        </Card>
      )}
    </div>
  );
}

function KpiMini({ label, value, tone }: { label: string; value: string; tone: "cyan" | "emerald" | "rose" | "amber" }) {
  const toneClass = {
    cyan: "text-cyan-400 border-cyan-500/30",
    emerald: "text-emerald-400 border-emerald-500/30",
    rose: "text-rose-400 border-rose-500/30",
    amber: "text-amber-400 border-amber-500/30",
  }[tone];
  return (
    <Card className={`p-3 border bg-card/40 backdrop-blur ${toneClass}`}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`text-xl font-bold mt-1 ${toneClass.split(" ")[0]}`}>{value}</div>
    </Card>
  );
}
