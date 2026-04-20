// Análise preditiva e simulação de cenários "E-se" para o Agente Financeiro
// Usa Groq (llama-3.3-70b) para projetar caixa futuro e avaliar impactos
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GROQ_MODEL = Deno.env.get("GROQ_PREDICT_MODEL") || "llama-3.3-70b-versatile";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ScenarioInput {
  name: string;
  monthly_impact: number; // negativo = custo, positivo = receita
  start_in_months?: number; // 0 = imediato
  duration_months?: number; // null = permanente
  type: "hire" | "expense" | "revenue" | "investment" | "saving";
}

interface ReqBody {
  customer_product_id: string;
  horizon_months?: number; // default 12
  scenarios?: ScenarioInput[]; // simulações what-if
  mode?: "forecast" | "scenario" | "analysis";
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  try {
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");
    const body = (await req.json()) as ReqBody;
    const { customer_product_id, horizon_months = 12, scenarios = [], mode = "forecast" } = body;
    if (!customer_product_id) throw new Error("customer_product_id required");

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    // Histórico dos últimos 6 meses
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const [{ data: txs }, { data: invs }] = await Promise.all([
      sb.from("financial_agent_transactions")
        .select("type, amount, date, description, source")
        .eq("customer_product_id", customer_product_id)
        .gte("date", sixMonthsAgo.toISOString().slice(0, 10))
        .order("date", { ascending: true }),
      sb.from("financial_agent_invoices")
        .select("amount, due_date, status, recurring, recurring_interval")
        .eq("customer_product_id", customer_product_id),
    ]);

    // Agregar por mês
    const monthMap = new Map<string, { income: number; expense: number }>();
    (txs || []).forEach((t: any) => {
      const key = (t.date || "").slice(0, 7);
      if (!key) return;
      const cur = monthMap.get(key) || { income: 0, expense: 0 };
      if (t.type === "income") cur.income += Number(t.amount) || 0;
      else cur.expense += Number(t.amount) || 0;
      monthMap.set(key, cur);
    });

    const sortedMonths = Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));
    const months = sortedMonths.map(([k, v]) => ({ month: k, income: v.income, expense: v.expense, net: v.income - v.expense }));

    const avgIncome = months.length ? months.reduce((s, m) => s + m.income, 0) / months.length : 0;
    const avgExpense = months.length ? months.reduce((s, m) => s + m.expense, 0) / months.length : 0;
    const burnRate = avgExpense - avgIncome; // positivo = queimando dinheiro
    const currentBalance = months.reduce((s, m) => s + m.net, 0);

    // Faturas recorrentes futuras
    const pendingInvoices = (invs || []).filter((i: any) => i.status !== "paid")
      .reduce((s: number, i: any) => s + (Number(i.amount) || 0), 0);

    // Projeção base (sem cenários)
    const baseline: { month: string; balance: number; income: number; expense: number }[] = [];
    let runningBalance = currentBalance;
    const today = new Date();
    for (let i = 1; i <= horizon_months; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      runningBalance += avgIncome - avgExpense;
      baseline.push({ month: monthKey, balance: runningBalance, income: avgIncome, expense: avgExpense });
    }

    // Projeção com cenários aplicados
    const scenario: { month: string; balance: number; income: number; expense: number }[] = [];
    let scenarioBalance = currentBalance;
    for (let i = 1; i <= horizon_months; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      let inc = avgIncome;
      let exp = avgExpense;
      for (const s of scenarios) {
        const startM = s.start_in_months ?? 0;
        const endM = s.duration_months ? startM + s.duration_months : Infinity;
        if (i > startM && i <= endM) {
          if (s.monthly_impact >= 0) inc += s.monthly_impact;
          else exp += Math.abs(s.monthly_impact);
        }
      }
      scenarioBalance += inc - exp;
      scenario.push({ month: monthKey, balance: scenarioBalance, income: inc, expense: exp });
    }

    // Detectar risco de insolvência
    const insolvencyMonth = scenario.find((s) => s.balance < 0)?.month || null;
    const baselineInsolvencyMonth = baseline.find((s) => s.balance < 0)?.month || null;
    const runwayMonths = burnRate > 0 ? Math.floor(currentBalance / burnRate) : null;

    // Análise via IA (apenas se modo analysis ou tem cenários)
    let aiAnalysis = "";
    if (mode === "analysis" || scenarios.length > 0) {
      const ctx = {
        historico_mensal: months.slice(-6),
        receita_media: Math.round(avgIncome),
        despesa_media: Math.round(avgExpense),
        burn_rate_mensal: Math.round(burnRate),
        saldo_atual: Math.round(currentBalance),
        runway_meses: runwayMonths,
        cenarios_simulados: scenarios,
        projecao_base_final: baseline[baseline.length - 1],
        projecao_cenario_final: scenario[scenario.length - 1],
        insolvencia_baseline: baselineInsolvencyMonth,
        insolvencia_cenario: insolvencyMonth,
        faturas_pendentes: Math.round(pendingInvoices),
      };

      const prompt = `Você é um CFO virtual. Analise os dados financeiros abaixo e produza um diagnóstico estratégico claro, em português, formato markdown.

Dados:
${JSON.stringify(ctx, null, 2)}

Estrutura obrigatória:
## 📊 Diagnóstico Atual
(2-3 linhas sobre saúde financeira)

## 🔮 Projeção (${horizon_months} meses)
(análise da curva projetada, runway, riscos)

${scenarios.length > 0 ? `## 🎯 Impacto dos Cenários\n(impacto detalhado dos cenários simulados, comparando baseline vs cenário)\n\n` : ""}## ⚠️ Alertas e Riscos
(liste 2-3 riscos críticos)

## ✅ Recomendações
(3-5 ações concretas e priorizadas)

Seja direto, use números, evite jargão.`;

      const aiResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: GROQ_MODEL,
          messages: [
            { role: "system", content: "Você é um CFO virtual experiente. Análises diretas e acionáveis." },
            { role: "user", content: prompt },
          ],
          temperature: 0.4,
          max_tokens: 1500,
        }),
      });

      if (aiResp.ok) {
        const j = await aiResp.json();
        aiAnalysis = j?.choices?.[0]?.message?.content || "";
      } else {
        const t = await aiResp.text();
        console.error("groq predict error:", aiResp.status, t);
        if (aiResp.status === 429) {
          return new Response(JSON.stringify({ error: "rate_limited" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        baseline,
        scenario,
        history: months,
        metrics: {
          avg_income: avgIncome,
          avg_expense: avgExpense,
          burn_rate: burnRate,
          current_balance: currentBalance,
          runway_months: runwayMonths,
          pending_invoices: pendingInvoices,
          baseline_insolvency_month: baselineInsolvencyMonth,
          scenario_insolvency_month: insolvencyMonth,
        },
        ai_analysis: aiAnalysis,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("predict error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
