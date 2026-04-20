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
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (!GROQ_API_KEY) throw new Error("GROQ_API_KEY missing");
    const { customer_product_id, sector = "geral", company_size = "small" } = (await req.json()) as ReqBody;
    if (!customer_product_id) throw new Error("customer_product_id required");

    const sb = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

    // Últimos 90 dias de transações
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { data: txs } = await sb
      .from("financial_agent_transactions")
      .select("type, amount, date, description, source")
      .eq("customer_product_id", customer_product_id)
      .gte("date", ninetyDaysAgo.toISOString().slice(0, 10))
      .order("date", { ascending: true });

    const transactions = (txs || []).map((t: any) => ({
      type: t.type,
      amount: Number(t.amount) || 0,
      date: t.date,
      description: (t.description || "").slice(0, 80),
    }));

    // Detecção determinística de anomalias (z-score por categoria/descrição)
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

    // Estatísticas globais
    const totalIncome = transactions.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const totalExpense = transactions.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    const expenseSamples = transactions.filter((t) => t.type === "expense").slice(0, 80);

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
              "Você é um auditor financeiro experiente. Analise transações e responda SEMPRE via tool call estruturado. Seja conciso e prático.",
          },
          {
            role: "user",
            content: `Analise os dados financeiros abaixo (últimos 90 dias):

Setor: ${sector} | Porte: ${company_size}
Receita total: R$ ${totalIncome.toFixed(2)}
Despesa total: R$ ${totalExpense.toFixed(2)}
Margem: ${totalIncome > 0 ? (((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1) : "0"}%

Anomalias detectadas (regra estatística):
${JSON.stringify(anomalies_local, null, 2)}

Amostra de despesas:
${JSON.stringify(expenseSamples, null, 2)}

Tarefas:
1. Identifique gastos suspeitos (assinaturas duplicadas, serviços ociosos, valores fora do padrão)
2. Sugira otimizações concretas com economia estimada
3. Compare com benchmark típico do setor "${sector}" (porte ${company_size}) e indique onde está acima/abaixo da média
4. Liste alertas críticos`,
          },
        ],
        temperature: 0.3,
        max_tokens: 2000,
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
                },
                required: ["anomalies", "optimizations", "benchmarks", "health_score", "health_summary"],
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
          margin_pct: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
          tx_count: transactions.length,
          local_anomalies: anomalies_local,
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
