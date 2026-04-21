import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Area, AreaChart, CartesianGrid, Legend, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { TrendingUp, RefreshCw, Sparkles, ArrowUpRight, ArrowDownRight, Wallet, Activity } from "lucide-react";

interface Props {
  customerProductId: string;
}

type Horizon = 30 | 60 | 90;

interface ForecastResult {
  horizon_days: number;
  projected_income: number;
  projected_expense: number;
  projected_balance: number;
  confidence: number;
  method?: string;
  daily_series: { date: string; income: number; expense: number; balance: number }[];
  notes?: string;
  generated_at?: string;
}

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const fmtDate = (d: string) =>
  new Date(d + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });

export function ForecastTab({ customerProductId }: Props) {
  const { toast } = useToast();
  const [horizon, setHorizon] = useState<Horizon>(30);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<{ date: string; income: number; expense: number }[]>([]);

  const loadLatest = async () => {
    const { data } = await supabase
      .from("financial_forecasts")
      .select("*")
      .eq("customer_product_id", customerProductId)
      .eq("horizon_days", horizon)
      .order("generated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setForecast({
        horizon_days: data.horizon_days,
        projected_income: Number(data.projected_income) || 0,
        projected_expense: Number(data.projected_expense) || 0,
        projected_balance: Number(data.projected_balance) || 0,
        confidence: Number(data.confidence) || 0,
        method: data.method,
        daily_series: (data.daily_series as any) || [],
        notes: data.notes || undefined,
        generated_at: data.generated_at,
      });
    } else {
      setForecast(null);
    }
  };

  const loadHistory = async () => {
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data } = await supabase
      .from("financial_agent_transactions")
      .select("type, amount, date")
      .eq("customer_product_id", customerProductId)
      .gte("date", since.toISOString().slice(0, 10))
      .order("date", { ascending: true });
    const map = new Map<string, { income: number; expense: number }>();
    (data || []).forEach((t: any) => {
      const d = t.date as string;
      const e = map.get(d) || { income: 0, expense: 0 };
      if (t.type === "income") e.income += Number(t.amount) || 0;
      else if (t.type === "expense") e.expense += Number(t.amount) || 0;
      map.set(d, e);
    });
    const arr = Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, income: v.income, expense: v.expense }));
    setHistory(arr);
  };

  useEffect(() => {
    loadLatest();
    loadHistory();
  }, [customerProductId, horizon]);

  const generate = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("financial-forecast", {
        body: { customer_product_id: customerProductId, horizon_days: horizon, persist: true },
      });
      if (error) throw error;
      setForecast(data as ForecastResult);
      toast({ title: "Previsão gerada", description: `Horizonte de ${horizon} dias atualizado.` });
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message || "Falha ao gerar previsão", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    const hist = history.map((h) => ({
      date: h.date,
      label: fmtDate(h.date),
      hist_income: h.income,
      hist_expense: h.expense,
      proj_income: null as number | null,
      proj_expense: null as number | null,
      proj_balance: null as number | null,
      type: "Histórico",
    }));
    const proj = (forecast?.daily_series || []).map((d) => ({
      date: d.date,
      label: fmtDate(d.date),
      hist_income: null as number | null,
      hist_expense: null as number | null,
      proj_income: d.income,
      proj_expense: d.expense,
      proj_balance: d.balance,
      type: "Projeção",
    }));
    return [...hist, ...proj];
  }, [history, forecast]);

  const balanceData = useMemo(
    () =>
      (forecast?.daily_series || []).map((d) => ({
        label: fmtDate(d.date),
        balance: d.balance,
      })),
    [forecast]
  );

  const net = (forecast?.projected_income || 0) - (forecast?.projected_expense || 0);

  return (
    <div className="space-y-4">
      {/* Header / Controls */}
      <Card className="p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-md bg-primary/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-none">Previsões de Fluxo de Caixa</h2>
              <p className="text-xs text-muted-foreground mt-1">
                Projeção combinando tendência linear e sazonalidade semanal
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-border/60 overflow-hidden">
              {[30, 60, 90].map((h) => (
                <button
                  key={h}
                  onClick={() => setHorizon(h as Horizon)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    horizon === h
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted/50"
                  }`}
                >
                  {h}d
                </button>
              ))}
            </div>
            <Button size="sm" onClick={generate} disabled={loading}>
              {loading ? (
                <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              ) : (
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              )}
              Gerar Previsão
            </Button>
          </div>
        </div>
      </Card>

      {!forecast ? (
        <Card className="p-10 text-center">
          <Activity className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Nenhuma previsão para {horizon} dias. Clique em "Gerar Previsão" para começar.
          </p>
        </Card>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Receita Projetada</p>
                <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <p className="text-xl font-bold text-emerald-500 mt-2">{fmtBRL(forecast.projected_income)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Próximos {horizon} dias</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Despesa Projetada</p>
                <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
              </div>
              <p className="text-xl font-bold text-rose-500 mt-2">{fmtBRL(forecast.projected_expense)}</p>
              <p className="text-[10px] text-muted-foreground mt-1">Próximos {horizon} dias</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Resultado Líquido</p>
                <Wallet className={`w-3.5 h-3.5 ${net >= 0 ? "text-emerald-500" : "text-rose-500"}`} />
              </div>
              <p className={`text-xl font-bold mt-2 ${net >= 0 ? "text-emerald-500" : "text-rose-500"}`}>
                {fmtBRL(net)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">Saldo final: {fmtBRL(forecast.projected_balance)}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">Confiança</p>
                <Badge variant="outline" className="text-[10px]">
                  {forecast.method || "linear_seasonal"}
                </Badge>
              </div>
              <p className="text-xl font-bold mt-2">{forecast.confidence?.toFixed(1)}%</p>
              <div className="w-full bg-muted rounded-full h-1.5 mt-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, forecast.confidence || 0)}%` }}
                />
              </div>
            </Card>
          </div>

          {/* Daily Series Chart */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-semibold">Série Diária — Histórico vs Projeção</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  30 dias de histórico + {horizon} dias de projeção
                </p>
              </div>
            </div>
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => fmtBRL(v)} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: any) => (typeof v === "number" ? fmtBRL(v) : v)}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Line
                    type="monotone"
                    dataKey="hist_income"
                    name="Receita (Hist)"
                    stroke="hsl(150 80% 50%)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="hist_expense"
                    name="Despesa (Hist)"
                    stroke="hsl(0 80% 60%)"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="proj_income"
                    name="Receita (Proj)"
                    stroke="hsl(150 80% 50%)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="proj_expense"
                    name="Despesa (Proj)"
                    stroke="hsl(0 80% 60%)"
                    strokeWidth={2}
                    strokeDasharray="5 4"
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Cumulative balance */}
          <Card className="p-5">
            <div className="mb-4">
              <h3 className="text-sm font-semibold">Saldo Acumulado Projetado</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Evolução cumulativa do resultado nos próximos {horizon} dias
              </p>
            </div>
            <div className="h-[260px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={balanceData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(217 91% 60%)" stopOpacity={0.5} />
                      <stop offset="95%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" tickFormatter={(v) => fmtBRL(v)} />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(v: any) => (typeof v === "number" ? fmtBRL(v) : v)}
                  />
                  <Area
                    type="monotone"
                    dataKey="balance"
                    name="Saldo Acumulado"
                    stroke="hsl(217 91% 60%)"
                    strokeWidth={2}
                    fill="url(#balGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {forecast.notes && (
            <Card className="p-4">
              <p className="text-[11px] text-muted-foreground">
                <span className="font-semibold">Notas: </span>
                {forecast.notes}
                {forecast.generated_at && (
                  <span className="ml-2">
                    · Gerado em {new Date(forecast.generated_at).toLocaleString("pt-BR")}
                  </span>
                )}
              </p>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
