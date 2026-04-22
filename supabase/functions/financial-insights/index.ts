// Insights financeiros: anomalias, otimização de custos, benchmarking setorial
// Usa Groq llama-3.3-70b com tool calling para resposta estruturada
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const GROQ_MODEL = Deno.env.get("GROQ_INSIGHTS_MODEL") || "llama-3.3-70b-versatile";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface ReqBody {
  customer_product_id: string;
  sector?: string; // ex: "saas", "ecommerce", "servicos", "industria"
  company_size?: "micro" | "small" | "medium" | "large";
}

Deno.serve(async (req) => {
  const origin = req.headers.get("Origin");
  const corsHeaders = getCorsHeaders(origin);
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  try {
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");
    const { customer_product_id, sector = "geral", company_size = "small" } = (await req.json()) as ReqBody;
    if (!customer_product_id) throw new Error("customer_product_id required");

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Janela de 90 dias para análise principal
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const since = ninetyDaysAgo.toISOString().slice(0, 10);
    const todayKey = new Date().toISOString().slice(0, 10);

    // ============================================================
    // BUSCA DADOS DE TODAS AS FONTES (a aba Insights é a "mestra")
    // ============================================================
    const [
      txsRes,
      invsRes,
      recvRes,
      quotesRes,
      dasRes,
      budgetsRes,
      calendarRes,
      forecastRes,
      kpiRes,
      goalsRes,
    ] = await Promise.all([
      sb.from("financial_agent_transactions")
        .select("type, amount, date, description, category, source, payment_method")
        .eq("customer_product_id", customer_product_id)
        .gte("date", since)
        .order("date", { ascending: true }),
      sb.from("financial_agent_invoices")
        .select("title, amount, paid_amount, due_date, status, supplier, category, recurring, recurring_interval")
        .eq("customer_product_id", customer_product_id)
        .order("due_date", { ascending: true })
        .limit(200),
      sb.from("financial_receivables")
        .select("invoice_number, client_name, total, due_date, status, paid_amount")
        .eq("customer_product_id", customer_product_id)
        .order("due_date", { ascending: true })
        .limit(200),
      sb.from("financial_quotes")
        .select("quote_number, client_name, total, status, valid_until, sent_at, approved_at, rejected_at")
        .eq("customer_product_id", customer_product_id)
        .order("created_at", { ascending: false })
        .limit(100),
      sb.from("financial_das_guides")
        .select("competencia_month, competencia_year, total_amount, due_date, payment_status, anexo, regime, revenue_month")
        .eq("customer_product_id", customer_product_id)
        .order("due_date", { ascending: false })
        .limit(24),
      sb.from("financial_budgets")
        .select("name, budget_amount, category, period, alert_threshold, is_active")
        .eq("customer_product_id", customer_product_id)
        .eq("is_active", true),
      sb.from("financial_calendar_events")
        .select("title, amount, event_type, event_date, status, recurring, recurring_interval, category")
        .eq("customer_product_id", customer_product_id)
        .gte("event_date", since)
        .order("event_date", { ascending: true })
        .limit(200),
      sb.from("financial_forecasts")
        .select("horizon_days, projected_income, projected_expense, projected_balance, confidence, generated_at")
        .eq("customer_product_id", customer_product_id)
        .order("generated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb.from("financial_kpi_snapshots")
        .select("snapshot_date, cash_balance, runway_months, burn_rate_monthly, net_margin_pct, avg_ticket, revenue_mtd, expense_mtd, payables_open, receivables_open")
        .eq("customer_product_id", customer_product_id)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle(),
      sb.from("financial_agent_goals")
        .select("name, target_amount, current_amount, deadline, status")
        .eq("customer_product_id", customer_product_id)
        .limit(20),
    ]);

    const transactions = (txsRes.data || []).map((t: any) => ({
      type: t.type,
      amount: Number(t.amount) || 0,
      date: t.date,
      description: (t.description || "").slice(0, 80),
      category: t.category || null,
    }));
    const invoices = (invsRes.data || []) as any[];
    const receivables = (recvRes.data || []) as any[];
    const quotes = (quotesRes.data || []) as any[];
    const dasGuides = (dasRes.data || []) as any[];
    const budgets = (budgetsRes.data || []) as any[];
    const calendarEvents = (calendarRes.data || []) as any[];
    const forecast = forecastRes.data || null;
    const kpi = kpiRes.data || null;
    const goals = (goalsRes.data || []) as any[];

    // ============================================================
    // Detecção determinística de anomalias (z-score por descrição)
    // ============================================================
    const expensesByDesc = new Map<string, number[]>();
    transactions.filter((t) => t.type === "expense").forEach((t) => {
      const key = (t.description || "outros").toLowerCase().slice(0, 40);
      const arr = expensesByDesc.get(key) || [];
      arr.push(t.amount);
      expensesByDesc.set(key, arr);
    });

    const anomalies_local: Array<{ description: string; amount: number; expected: number; deviation: number }> = [];
    expensesByDesc.forEach((amounts, key) => {
      if (amounts.length < 3) return;
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const variance = amounts.reduce((s, x) => s + (x - mean) ** 2, 0) / amounts.length;
      const std = Math.sqrt(variance);
      const last = amounts[amounts.length - 1];
      if (std > 0 && Math.abs(last - mean) / std > 2 && Math.abs(last - mean) > 100) {
        anomalies_local.push({
          description: key,
          amount: Math.round(last),
          expected: Math.round(mean),
          deviation: Math.round(((last - mean) / mean) * 100),
        });
      }
    });

    // ============================================================
    // Estatísticas globais (mesma fórmula do Dashboard)
    // ============================================================
    const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const balance = totalIncome - totalExpense;
    const expenseSamples = transactions.filter((t) => t.type === "expense").slice(0, 60);

    const openPayables = invoices.filter((i) => ["pending", "overdue"].includes(i.status));
    const overduePayables = openPayables.filter((i) => String(i.due_date || "") < todayKey);
    const openReceivables = receivables.filter((r) => ["sent", "overdue", "partial"].includes(r.status));
    const overdueReceivables = openReceivables.filter((r) => String(r.due_date || "") < todayKey);
    const totalPayablesOpen = openPayables.reduce((s, i) => s + (Number(i.amount || 0) - Number(i.paid_amount || 0)), 0);
    const totalReceivablesOpen = openReceivables.reduce((s, r) => s + (Number(r.total || 0) - Number(r.paid_amount || 0)), 0);

    const pendingQuotes = quotes.filter((q) => ["draft", "sent"].includes(q.status));
    const approvedQuotes = quotes.filter((q) => q.status === "approved");
    const pendingDas = dasGuides.filter((d) => d.payment_status === "pending");

    // Resumo compacto para a IA
    const dataSummary = {
      periodo: "últimos 90 dias",
      receita_total: totalIncome,
      despesa_total: totalExpense,
      saldo_liquido: balance,
      margem_pct: totalIncome > 0 ? ((balance / totalIncome) * 100).toFixed(1) : "0",
      transacoes_count: transactions.length,
      kpi_dashboard: kpi ? {
        snapshot_date: kpi.snapshot_date,
        saldo: kpi.cash_balance,
        runway_meses: kpi.runway_months,
        burn_rate_mensal: kpi.burn_rate_monthly,
        margem_liquida_pct: kpi.net_margin_pct,
        ticket_medio: kpi.avg_ticket,
      } : null,
      contas_a_pagar: { abertas: openPayables.length, vencidas: overduePayables.length, total_aberto: totalPayablesOpen },
      contas_a_receber: { abertas: openReceivables.length, vencidas: overdueReceivables.length, total_aberto: totalReceivablesOpen },
      cotacoes: { pendentes: pendingQuotes.length, aprovadas: approvedQuotes.length, total_aprovado: approvedQuotes.reduce((s, q) => s + Number(q.total || 0), 0) },
      impostos_das: { pendentes: pendingDas.length, total_pendente: pendingDas.reduce((s, d) => s + Number(d.total_amount || 0), 0), proximas: pendingDas.slice(0, 3).map((d) => ({ comp: `${d.competencia_month}/${d.competencia_year}`, valor: d.total_amount, vence: d.due_date })) },
      orcamentos: budgets.map((b) => ({ nome: b.name, limite: b.budget_amount, periodo: b.period, categoria: b.category })),
      eventos_recorrentes: calendarEvents.filter((e) => e.recurring).slice(0, 10).map((e) => ({ titulo: e.title, valor: e.amount, tipo: e.event_type, intervalo: e.recurring_interval })),
      previsao: forecast ? {
        horizonte_dias: forecast.horizon_days,
        receita_projetada: forecast.projected_income,
        despesa_projetada: forecast.projected_expense,
        saldo_projetado: forecast.projected_balance,
        confianca: forecast.confidence,
      } : null,
      metas: goals.map((g) => ({ nome: g.name, atual: g.current_amount, alvo: g.target_amount, prazo: g.deadline, status: g.status })),
    };

    // Chamar Groq com tool calling para estrutura
    const aiResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              "Você é um CFO virtual sênior. Analise TODOS os dados do cliente (transações, faturas, cotações, impostos DAS, orçamentos, recorrentes, previsões, KPIs e metas). Cruze as informações entre as fontes. Responda SEMPRE via tool call estruturado. Seja conciso, prático e baseado em números reais. NÃO invente dados.",
          },
          {
            role: "user",
            content: `Analise o panorama financeiro COMPLETO abaixo (últimos 90 dias).

Setor: ${sector} | Porte: ${company_size}

===== PANORAMA CONSOLIDADO (TODAS AS FONTES) =====
${JSON.stringify(dataSummary, null, 2)}

===== ANOMALIAS ESTATÍSTICAS DETECTADAS =====
${JSON.stringify(anomalies_local, null, 2)}

===== AMOSTRA DE DESPESAS RECENTES =====
${JSON.stringify(expenseSamples, null, 2)}

Tarefas (use TODAS as fontes acima — Dashboard, DRE, Faturas, Cotações, DAS, Orçamentos, Recorrentes, Previsões, Calendário):
1. Aponte anomalias e gastos suspeitos cruzando transações com orçamentos e recorrentes
2. Sugira otimizações concretas com economia mensal estimada (priorize impostos atrasados, contas vencidas, cotações pendentes envelhecidas)
3. Compare com benchmark típico do setor "${sector}" (porte ${company_size})
4. Liste alertas críticos (DAS vencendo, recebíveis em atraso, runway baixo, metas em risco)
5. Calcule health_score 0-100 ponderando margem, runway, atrasos, orçamento, fluxo previsto`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2500,
        tools: [
          {
            type: "function",
            function: {
              name: "report_insights",
              description: "Retorna análise financeira estruturada",
              parameters: {
                type: "object",
                properties: {
                  anomalies: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        severity: { type: "string", enum: ["low", "medium", "high", "critical"] },
                        impact_brl: { type: "number" },
                      },
                      required: ["title", "description", "severity"],
                    },
                  },
                  optimizations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        action: { type: "string" },
                        estimated_monthly_saving: { type: "number" },
                        effort: { type: "string", enum: ["low", "medium", "high"] },
                        category: { type: "string" },
                      },
                      required: ["title", "action", "estimated_monthly_saving", "effort"],
                    },
                  },
                  benchmarks: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        metric: { type: "string" },
                        your_value: { type: "string" },
                        market_avg: { type: "string" },
                        status: { type: "string", enum: ["above_avg", "avg", "below_avg"] },
                        comment: { type: "string" },
                      },
                      required: ["metric", "your_value", "market_avg", "status", "comment"],
                    },
                  },
                  health_score: { type: "number", minimum: 0, maximum: 100 },
                  health_summary: { type: "string" },
                  narrative: {
                    type: "string",
                    description: "Resumo executivo em 4-6 parágrafos curtos (markdown leve com **negrito**, sem títulos #) explicando o diagnóstico geral, os principais riscos detectados, as melhores oportunidades de economia, comparação com o mercado e recomendação prática final. Tom de consultor sênior, em português, direto e útil.",
                  },
                },
                required: ["anomalies", "optimizations", "benchmarks", "health_score", "health_summary", "narrative"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "report_insights" } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("groq insights error:", aiResp.status, t);
      if (aiResp.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`groq ${aiResp.status}`);
    }

    const data = await aiResp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const parsed = args ? JSON.parse(args) : {};

    return new Response(
      JSON.stringify({
        ...parsed,
        stats: {
          total_income: totalIncome,
          total_expense: totalExpense,
          balance,
          margin_pct: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
          tx_count: transactions.length,
          local_anomalies: anomalies_local,
          payables_open: openPayables.length,
          payables_overdue: overduePayables.length,
          receivables_open: openReceivables.length,
          receivables_overdue: overdueReceivables.length,
          quotes_pending: pendingQuotes.length,
          das_pending: pendingDas.length,
          budgets_count: budgets.length,
          recurring_count: calendarEvents.filter((e) => e.recurring).length,
          has_forecast: !!forecast,
          has_kpi_snapshot: !!kpi,
          goals_count: goals.length,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("insights error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
