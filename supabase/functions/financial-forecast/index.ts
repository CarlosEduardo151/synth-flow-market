// Etapa 2 - Previsão de fluxo de caixa 30/60/90 dias (regressão linear + sazonalidade semanal)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ReqBody {
  customer_product_id: string;
  horizon_days?: 30 | 60 | 90;
  persist?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const body = (await req.json()) as ReqBody;
    if (!body?.customer_product_id) return json(400, { error: "customer_product_id required" });
    const horizon = (body.horizon_days ?? 30) as 30 | 60 | 90;

    // Pega últimos 180 dias (mais histórico = melhor previsão)
    const since = new Date();
    since.setDate(since.getDate() - 180);
    const sinceStr = since.toISOString().slice(0, 10);

    const { data: txs } = await sb
      .from("financial_agent_transactions")
      .select("type, amount, date")
      .eq("customer_product_id", body.customer_product_id)
      .gte("date", sinceStr)
      .order("date", { ascending: true });

    const transactions = (txs || []).map((t: any) => ({
      type: t.type,
      amount: Number(t.amount) || 0,
      date: t.date as string,
    }));

    if (transactions.length < 10) {
      return json(200, {
        horizon_days: horizon,
        projected_income: 0,
        projected_expense: 0,
        projected_balance: 0,
        confidence: 0,
        daily_series: [],
        notes: "Histórico insuficiente (mínimo 10 transações).",
      });
    }

    // Agrupa por dia
    const dayMap = new Map<string, { income: number; expense: number }>();
    transactions.forEach((t) => {
      const e = dayMap.get(t.date) || { income: 0, expense: 0 };
      if (t.type === "income") e.income += t.amount;
      else if (t.type === "expense") e.expense += t.amount;
      dayMap.set(t.date, e);
    });

    // Série diária histórica preenchendo dias vazios
    const startDate = new Date(sinceStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const history: { date: string; dow: number; income: number; expense: number }[] = [];
    for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      const v = dayMap.get(ds) || { income: 0, expense: 0 };
      history.push({ date: ds, dow: d.getDay(), income: v.income, expense: v.expense });
    }

    // Médias por dia da semana (sazonalidade)
    const dowAvg: Record<number, { income: number; expense: number; n: number }> = {};
    for (let i = 0; i < 7; i++) dowAvg[i] = { income: 0, expense: 0, n: 0 };
    history.forEach((h) => {
      dowAvg[h.dow].income += h.income;
      dowAvg[h.dow].expense += h.expense;
      dowAvg[h.dow].n++;
    });
    Object.values(dowAvg).forEach((v) => {
      if (v.n > 0) {
        v.income /= v.n;
        v.expense /= v.n;
      }
    });

    // Tendência linear (slope) sobre receita e despesa diária
    const slope = (arr: number[]): { m: number; b: number } => {
      const n = arr.length;
      if (n < 2) return { m: 0, b: arr[0] || 0 };
      const xs = Array.from({ length: n }, (_, i) => i);
      const sx = xs.reduce((a, b) => a + b, 0);
      const sy = arr.reduce((a, b) => a + b, 0);
      const sxy = xs.reduce((s, x, i) => s + x * arr[i], 0);
      const sxx = xs.reduce((s, x) => s + x * x, 0);
      const m = (n * sxy - sx * sy) / Math.max(n * sxx - sx * sx, 1e-9);
      const b = (sy - m * sx) / n;
      return { m, b };
    };

    const incSlope = slope(history.map((h) => h.income));
    const expSlope = slope(history.map((h) => h.expense));

    // Projeção: combinação de tendência + sazonalidade DOW (média)
    const series: { date: string; income: number; expense: number; balance: number }[] = [];
    let cumulative = 0;
    let projectedIncome = 0;
    let projectedExpense = 0;
    const startIdx = history.length;

    for (let i = 1; i <= horizon; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dow = d.getDay();
      const trendInc = Math.max(incSlope.m * (startIdx + i) + incSlope.b, 0);
      const trendExp = Math.max(expSlope.m * (startIdx + i) + expSlope.b, 0);
      // 60% sazonalidade DOW + 40% tendência linear
      const inc = 0.6 * dowAvg[dow].income + 0.4 * trendInc;
      const exp = 0.6 * dowAvg[dow].expense + 0.4 * trendExp;
      cumulative += inc - exp;
      projectedIncome += inc;
      projectedExpense += exp;
      series.push({
        date: d.toISOString().slice(0, 10),
        income: Math.round(inc * 100) / 100,
        expense: Math.round(exp * 100) / 100,
        balance: Math.round(cumulative * 100) / 100,
      });
    }

    // Confiança proporcional ao volume de histórico (cap em 90)
    const confidence = Math.min(90, 30 + history.filter((h) => h.income + h.expense > 0).length * 0.5);

    const result = {
      horizon_days: horizon,
      projected_income: Math.round(projectedIncome * 100) / 100,
      projected_expense: Math.round(projectedExpense * 100) / 100,
      projected_balance: Math.round(cumulative * 100) / 100,
      confidence: Math.round(confidence * 10) / 10,
      method: "linear_seasonal",
      daily_series: series,
      notes: `Baseado em ${history.length} dias de histórico, ${transactions.length} transações.`,
    };

    if (body.persist !== false) {
      await sb.from("financial_forecasts").insert({
        customer_product_id: body.customer_product_id,
        horizon_days: horizon,
        method: "linear_seasonal",
        projected_income: result.projected_income,
        projected_expense: result.projected_expense,
        projected_balance: result.projected_balance,
        confidence: result.confidence,
        daily_series: series,
        notes: result.notes,
      });
    }

    return json(200, result);
  } catch (e) {
    console.error("forecast error:", e);
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
