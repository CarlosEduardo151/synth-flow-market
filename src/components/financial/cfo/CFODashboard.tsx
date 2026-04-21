import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  Activity, AlertTriangle, ArrowDownRight, ArrowUpRight, Brain, Clock, DollarSign,
  Flame, PiggyBank, Receipt, RefreshCw, Sparkles, TrendingUp, Wallet, Zap,
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { KPICard } from "./KPICard";
import { useToast } from "@/hooks/use-toast";

interface Props {
  customerProductId: string;
  mode: "personal" | "business";
}

interface Tx {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string | null;
  date: string;
  category?: string | null;
}

interface Inv {
  id: string;
  title: string;
  amount: number;
  due_date: string;
  status: string;
}

const CHART_COLORS = ["hsl(217 91% 60%)", "hsl(180 100% 60%)", "hsl(280 90% 65%)", "hsl(35 95% 60%)", "hsl(340 90% 65%)", "hsl(150 80% 55%)", "hsl(0 85% 60%)"];

type Granularity = "daily" | "weekly" | "monthly";

const fmtBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const fmtBRLFull = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2 });

export function CFODashboard({ customerProductId, mode }: Props) {
  const [txAll, setTxAll] = useState<Tx[]>([]);
  const [invs, setInvs] = useState<Inv[]>([]);
  const [loading, setLoading] = useState(true);
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [categorizing, setCategorizing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    void load();
  }, [customerProductId]);

  async function load() {
    setLoading(true);
    try {
      const since = new Date();
      since.setDate(since.getDate() - 90);
      const sinceISO = since.toISOString().split("T")[0];

      const [txRes, invRes] = await Promise.all([
        (supabase.from("financial_agent_transactions" as any)
          .select("*")
          .eq("customer_product_id", customerProductId)
          .gte("date", sinceISO)
          .order("date", { ascending: false }) as any),
        (supabase.from("financial_agent_invoices" as any)
          .select("*")
          .eq("customer_product_id", customerProductId)
          .order("due_date", { ascending: true }) as any),
      ]);
      setTxAll(((txRes.data || []) as any[]).map((t) => ({ ...t, amount: Number(t.amount) })));
      setInvs(((invRes.data || []) as any[]).map((i) => ({ ...i, amount: Number(i.amount) })));
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  }

  // ============ Derivações financeiras ============
  const now = new Date();
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));

  const stats = useMemo(() => {
    const tThis = txAll.filter((t) => t.date.startsWith(thisMonth));
    const tLast = txAll.filter((t) => t.date.startsWith(lastMonth));
    const sum = (arr: Tx[], k: "income" | "expense") =>
      arr.filter((x) => x.type === k).reduce((s, x) => s + x.amount, 0);

    const income = sum(tThis, "income");
    const expenses = sum(tThis, "expense");
    const incomeLast = sum(tLast, "income");
    const expensesLast = sum(tLast, "expense");

    const balance = income - expenses;
    const balanceLast = incomeLast - expensesLast;
    const runwayMonths = expenses > 0 ? balance / expenses : 0;
    const burnDay = expenses / Math.max(now.getDate(), 1);

    const pending = invs
      .filter((i) => i.status === "pending")
      .reduce((s, i) => s + i.amount, 0);

    const overdue = invs.filter((i) => {
      if (i.status !== "pending") return false;
      return new Date(i.due_date) < now;
    }).length;

    return {
      income, expenses, balance,
      pending, overdue,
      runwayMonths,
      burnDay,
      incomeDelta: incomeLast > 0 ? ((income - incomeLast) / incomeLast) * 100 : 0,
      expensesDelta: expensesLast > 0 ? ((expenses - expensesLast) / expensesLast) * 100 : 0,
      balanceDelta: balanceLast !== 0 ? ((balance - balanceLast) / Math.abs(balanceLast)) * 100 : 0,
    };
  }, [txAll, invs, thisMonth, lastMonth]);

  // Série temporal por granularidade (últimos 30/12/6 buckets)
  const series = useMemo(() => {
    const buckets: { name: string; receitas: number; despesas: number; saldo: number }[] = [];
    const periods = granularity === "daily" ? 30 : granularity === "weekly" ? 12 : 6;

    for (let i = periods - 1; i >= 0; i--) {
      const d = new Date();
      let label = "";
      let match = (t: Tx) => false;

      if (granularity === "daily") {
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
        label = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
        match = (t) => t.date === key;
      } else if (granularity === "weekly") {
        d.setDate(d.getDate() - i * 7);
        const start = new Date(d); start.setDate(d.getDate() - 6);
        const startISO = start.toISOString().split("T")[0];
        const endISO = d.toISOString().split("T")[0];
        label = `Sem ${d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}`;
        match = (t) => t.date >= startISO && t.date <= endISO;
      } else {
        d.setMonth(d.getMonth() - i);
        const key = monthKey(d);
        label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
        match = (t) => t.date.startsWith(key);
      }

      const dayTx = txAll.filter(match);
      const r = dayTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
      const e = dayTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
      buckets.push({ name: label, receitas: r, despesas: e, saldo: r - e });
    }
    return buckets;
  }, [txAll, granularity]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    txAll
      .filter((t) => t.type === "expense" && t.date.startsWith(thisMonth))
      .forEach((t) => {
        const cat = (t.category || "Outros").trim();
        map.set(cat, (map.get(cat) || 0) + t.amount);
      });
    return Array.from(map.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7);
  }, [txAll, thisMonth]);

  const recent = txAll.slice(0, 8);
  const upcoming = invs.filter((i) => i.status === "pending").slice(0, 6);

  // ============ Categorização IA ============
  async function categorizeUncategorized() {
    const targets = txAll.filter((t) => !t.category && (t.description || "").length > 0).slice(0, 30);
    if (targets.length === 0) {
      toast({ title: "Tudo categorizado", description: "Nenhuma transação pendente." });
      return;
    }
    setCategorizing(true);
    try {
      const { data, error } = await supabase.functions.invoke("financial-categorize", {
        body: {
          items: targets.map((t) => ({
            id: t.id, description: t.description, amount: t.amount, type: t.type,
          })),
        },
      });
      if (error) throw error;
      const results = (data?.results || []) as { id: string; category: string }[];
      // grava category no campo description (fallback se schema não tiver category) — preferimos updates atômicos
      await Promise.all(
        results.map((r) =>
          (supabase.from("financial_agent_transactions" as any)
            .update({ source: r.category ? `cat:${r.category}` : null })
            .eq("id", r.id) as any)
        ),
      );
      toast({ title: "Categorização concluída", description: `${results.length} transações classificadas.` });
      await load();
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Falha ao categorizar",
        description: e?.message || "Tente novamente em instantes.",
        variant: "destructive",
      });
    }
    setCategorizing(false);
  }

  // ============ UI ============
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <Card key={i} className="h-28 animate-pulse bg-muted/30" />
        ))}
      </div>
    );
  }

  const sevColor = (s: string) =>
    s === "critical" ? "border-red-500/40 bg-red-500/5 text-red-300" :
    s === "high" ? "border-amber-500/40 bg-amber-500/5 text-amber-300" :
    "border-primary/30 bg-primary/5 text-primary";

  return (
    <div className="space-y-6">
      {/* Painel IA — KPIs reais (snapshot, insights, previsão) */}
      <Card className="p-5 bg-gradient-to-br from-primary/5 via-card/60 to-card/40 ring-1 ring-primary/20 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-md bg-primary/15"><Brain className="h-4 w-4 text-primary" /></div>
            <div>
              <h3 className="text-base font-semibold leading-none">Saúde Financeira (IA)</h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {kpi ? `Snapshot consolidado em ${new Date(kpi.snapshot_date).toLocaleDateString("pt-BR")}` : "Sem snapshot ainda — clique em Atualizar"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={aiBusy} onClick={() => runAi("financial-kpi-aggregate", "KPIs atualizados")}>
              <RefreshCw className={`h-3 w-3 ${aiBusy ? "animate-spin" : ""}`} /> KPIs
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={aiBusy} onClick={() => runAi("financial-insights-scan", "Insights gerados")}>
              <Sparkles className="h-3 w-3" /> Insights
            </Button>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={aiBusy} onClick={() => runAi("financial-forecast", "Previsão atualizada")}>
              <Zap className="h-3 w-3" /> Previsão
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border/60 bg-card/50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Saldo (snapshot)</p>
            <p className="text-lg font-bold tabular-nums mt-1">{kpi?.cash_balance != null ? fmtBRL(Number(kpi.cash_balance)) : "—"}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Burn rate /mês</p>
            <p className="text-lg font-bold tabular-nums mt-1">{kpi?.burn_rate_monthly != null ? fmtBRL(Number(kpi.burn_rate_monthly)) : "—"}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Runway</p>
            <p className="text-lg font-bold tabular-nums mt-1">{kpi?.runway_months != null ? `${Number(kpi.runway_months).toFixed(1)} m` : "—"}</p>
          </div>
          <div className="rounded-lg border border-border/60 bg-card/50 p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Margem líquida</p>
            <p className="text-lg font-bold tabular-nums mt-1">{kpi?.net_margin_pct != null ? `${Number(kpi.net_margin_pct).toFixed(1)}%` : "—"}</p>
          </div>
        </div>

        {forecast && (
          <div className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs">
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold text-primary flex items-center gap-1"><Zap className="h-3 w-3" /> Previsão {forecast.horizon_days}d</span>
              <span className="text-muted-foreground">Confiança {Math.round(Number(forecast.confidence || 0) * 100)}%</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div><span className="text-muted-foreground">Receita: </span><span className="tabular-nums font-medium text-emerald-400">{fmtBRL(Number(forecast.projected_income))}</span></div>
              <div><span className="text-muted-foreground">Despesa: </span><span className="tabular-nums font-medium text-red-400">{fmtBRL(Number(forecast.projected_expense))}</span></div>
              <div><span className="text-muted-foreground">Saldo: </span><span className="tabular-nums font-medium">{fmtBRL(Number(forecast.projected_balance))}</span></div>
            </div>
          </div>
        )}

        {insights.length > 0 && (
          <div className="mt-3 space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">Insights ativos</p>
            {insights.map((i) => (
              <div key={i.id} className={`rounded-md border px-3 py-2 text-xs ${sevColor(i.severity)}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{i.title}</p>
                    <p className="text-muted-foreground mt-0.5 line-clamp-2">{i.description}</p>
                  </div>
                  {i.impact_brl != null && (
                    <span className="shrink-0 tabular-nums font-semibold">{fmtBRL(Number(i.impact_brl))}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Header com KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        <KPICard label="Receita (mês)" value={fmtBRL(stats.income)} icon={TrendingUp} tone="positive" delta={stats.incomeDelta} />
        <KPICard label="Despesas (mês)" value={fmtBRL(stats.expenses)} icon={Flame} tone="negative" delta={stats.expensesDelta} />
        <KPICard label="Resultado" value={fmtBRL(stats.balance)} icon={Wallet} tone={stats.balance >= 0 ? "info" : "negative"} delta={stats.balanceDelta} />
        <KPICard label="A receber" value={fmtBRL(stats.pending)} hint={`${invs.filter(i => i.status === "pending").length} fatura(s)`} icon={Receipt} tone="warning" />
      </div>

      {/* KPIs avançados */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard label="Burn rate diário" value={fmtBRL(stats.burnDay)} hint="Média de gastos / dia" icon={Activity} tone="negative" />
        <KPICard label="Runway estimado" value={`${stats.runwayMonths > 0 ? stats.runwayMonths.toFixed(1) : "0"} m`} hint="Meses cobertos pelo saldo" icon={Clock} tone={stats.runwayMonths < 1 ? "negative" : stats.runwayMonths < 3 ? "warning" : "positive"} />
        <KPICard label="Faturas vencidas" value={String(stats.overdue)} hint="Atenção imediata" icon={AlertTriangle} tone={stats.overdue > 0 ? "negative" : "neutral"} />
        <KPICard label="Reserva sugerida" value={fmtBRL(stats.expenses * 3)} hint="3 meses de despesas" icon={PiggyBank} tone="info" />
      </div>

      {/* Fluxo de caixa em tempo real */}
      <Card className="p-5 bg-card/60 backdrop-blur ring-1 ring-border/60">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-base font-semibold flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Fluxo de Caixa em Tempo Real
              <Badge variant="outline" className="ml-2 text-[10px] uppercase tracking-wider border-emerald-500/40 text-emerald-400">
                <span className="mr-1 inline-block w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Live
              </Badge>
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">Receitas vs Saídas (burn rate) — comparativo com saldo líquido</p>
          </div>
          <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
            <TabsList className="h-8">
              <TabsTrigger value="daily" className="text-xs h-6">Diário</TabsTrigger>
              <TabsTrigger value="weekly" className="text-xs h-6">Semanal</TabsTrigger>
              <TabsTrigger value="monthly" className="text-xs h-6">Mensal</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="h-[320px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="gReceitas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(150 80% 55%)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="hsl(150 80% 55%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gDespesas" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0 85% 60%)" stopOpacity={0.45} />
                  <stop offset="100%" stopColor="hsl(0 85% 60%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(217 91% 60%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(217 91% 60%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                formatter={(v: number, n) => [fmtBRLFull(v), n]}
              />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area type="monotone" dataKey="receitas" name="Receitas" stroke="hsl(150 80% 55%)" fill="url(#gReceitas)" strokeWidth={2} />
              <Area type="monotone" dataKey="despesas" name="Despesas" stroke="hsl(0 85% 60%)" fill="url(#gDespesas)" strokeWidth={2} />
              <Area type="monotone" dataKey="saldo" name="Saldo Líquido" stroke="hsl(217 91% 60%)" fill="url(#gSaldo)" strokeWidth={2} strokeDasharray="4 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Categorias + Top despesas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-5 bg-card/60 backdrop-blur ring-1 ring-border/60 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">Despesas por categoria</h3>
            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={categorizeUncategorized} disabled={categorizing}>
              <Sparkles className="h-3 w-3" />
              {categorizing ? "Classificando…" : "IA classificar"}
            </Button>
          </div>
          <div className="h-[260px]">
            {byCategory.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                Sem dados — adicione transações ou clique em <em className="mx-1">IA classificar</em>.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={byCategory} dataKey="value" nameKey="name" innerRadius={55} outerRadius={95} paddingAngle={3}>
                    {byCategory.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => fmtBRLFull(v)}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <ul className="mt-2 space-y-1.5 text-xs">
            {byCategory.map((c, i) => (
              <li key={c.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="inline-block w-2 h-2 rounded-sm shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="truncate">{c.name}</span>
                </span>
                <span className="tabular-nums text-muted-foreground">{fmtBRL(c.value)}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Saldo histórico em barras */}
        <Card className="p-5 bg-card/60 backdrop-blur ring-1 ring-border/60 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-3">Resultado por período</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={series} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number, n) => [fmtBRLFull(v), n]}
                />
                <Bar dataKey="saldo" name="Saldo">
                  {series.map((d, i) => (
                    <Cell key={i} fill={d.saldo >= 0 ? "hsl(150 80% 55%)" : "hsl(0 85% 60%)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recentes + Próximas faturas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 bg-card/60 backdrop-blur ring-1 ring-border/60">
          <h3 className="text-sm font-semibold mb-3">Movimentações recentes</h3>
          <div className="divide-y divide-border/50">
            {recent.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma transação ainda.</p>}
            {recent.map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2.5 first:pt-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-1.5 rounded-md shrink-0 ${t.type === "income" ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/15 text-red-400"}`}>
                    {t.type === "income" ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.description || (t.type === "income" ? "Receita" : "Despesa")}</p>
                    <p className="text-[11px] text-muted-foreground">{new Date(t.date).toLocaleDateString("pt-BR")}</p>
                  </div>
                </div>
                <span className={`text-sm font-semibold tabular-nums ${t.type === "income" ? "text-emerald-400" : "text-red-400"}`}>
                  {t.type === "income" ? "+" : "−"} {fmtBRL(t.amount)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5 bg-card/60 backdrop-blur ring-1 ring-border/60">
          <h3 className="text-sm font-semibold mb-3">Faturas a vencer</h3>
          <div className="divide-y divide-border/50">
            {upcoming.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nenhuma fatura pendente.</p>}
            {upcoming.map((inv) => {
              const due = new Date(inv.due_date);
              const days = Math.ceil((due.getTime() - now.getTime()) / 86400000);
              const overdue = days < 0;
              return (
                <div key={inv.id} className="flex items-center justify-between py-2.5 first:pt-0">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-1.5 rounded-md shrink-0 ${overdue ? "bg-red-500/15 text-red-400" : days <= 3 ? "bg-amber-500/15 text-amber-400" : "bg-primary/15 text-primary"}`}>
                      <Receipt className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{inv.title}</p>
                      <p className={`text-[11px] ${overdue ? "text-red-400" : "text-muted-foreground"}`}>
                        {overdue ? `Vencida há ${Math.abs(days)} dia(s)` : days === 0 ? "Vence hoje" : `Em ${days} dia(s)`}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-amber-400">{fmtBRL(inv.amount)}</span>
                </div>
              );
            })}
          </div>
        </Card>
      </div>
    </div>
  );
}
