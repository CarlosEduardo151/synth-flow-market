// Etapa 2 - Scan diário de anomalias e geração de insights por customer_product_id
// Detecção determinística (z-score) + enriquecimento via Groq (opcional)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");

interface ReqBody {
  customer_product_id?: string; // se omitido, processa todos os produtos ativos do agente financeiro
  use_ai?: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const sb = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });
    const body = (await req.json().catch(() => ({}))) as ReqBody;

    let targets: { id: string }[] = [];
    if (body.customer_product_id) {
      targets = [{ id: body.customer_product_id }];
    } else {
      const { data } = await sb
        .from("customer_products")
        .select("id")
        .eq("product_slug", "agente-financeiro")
        .eq("is_active", true);
      targets = data || [];
    }

    let total_insights = 0;
    const results: any[] = [];

    for (const t of targets) {
      const r = await scanOne(sb, t.id, body.use_ai ?? true);
      total_insights += r.created;
      results.push({ customer_product_id: t.id, ...r });
    }

    return json(200, { ok: true, processed: targets.length, total_insights, results });
  } catch (e) {
    console.error("insights-scan error:", e);
    return json(500, { error: e instanceof Error ? e.message : "unknown" });
  }
});

async function scanOne(sb: any, cpId: string, useAi: boolean) {
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const { data: txs } = await sb
    .from("financial_agent_transactions")
    .select("type, amount, date, description, category")
    .eq("customer_product_id", cpId)
    .gte("date", ninetyDaysAgo.toISOString().slice(0, 10));

  const transactions = (txs || []).map((t: any) => ({
    type: t.type,
    amount: Number(t.amount) || 0,
    date: t.date,
    description: (t.description || "").toLowerCase().slice(0, 60),
    category: (t.category || "outros").toLowerCase(),
  }));

  if (transactions.length < 5) return { created: 0, reason: "insufficient_data" };

  // Z-score por categoria
  const byCategory = new Map<string, number[]>();
  transactions.filter((t) => t.type === "expense").forEach((t) => {
    const arr = byCategory.get(t.category) || [];
    arr.push(t.amount);
    byCategory.set(t.category, arr);
  });

  const insights: any[] = [];

  byCategory.forEach((amounts, cat) => {
    if (amounts.length < 3) return;
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((s, x) => s + (x - mean) ** 2, 0) / amounts.length;
    const std = Math.sqrt(variance);
    const last = amounts[amounts.length - 1];
    if (std > 0 && Math.abs(last - mean) / std > 2 && Math.abs(last - mean) > 100) {
      const deviation = ((last - mean) / mean) * 100;
      const severity = Math.abs(deviation) > 100 ? "high" : Math.abs(deviation) > 50 ? "medium" : "low";
      insights.push({
        customer_product_id: cpId,
        insight_type: "anomaly",
        severity,
        title: `Gasto fora do padrão em "${cat}"`,
        description: `Última despesa de R$ ${last.toFixed(2)} está ${deviation > 0 ? "acima" : "abaixo"} da média (R$ ${mean.toFixed(2)}) em ${Math.abs(deviation).toFixed(0)}%.`,
        impact_brl: Math.abs(last - mean),
        metadata: { category: cat, mean, last, std, deviation_pct: deviation },
      });
    }
  });

  // Despesas duplicadas no mesmo dia
  const dupMap = new Map<string, number>();
  transactions.filter((t) => t.type === "expense").forEach((t) => {
    const key = `${t.date}|${t.description}|${t.amount}`;
    dupMap.set(key, (dupMap.get(key) || 0) + 1);
  });
  dupMap.forEach((count, key) => {
    if (count >= 2) {
      const [date, desc, amt] = key.split("|");
      insights.push({
        customer_product_id: cpId,
        insight_type: "alert",
        severity: "high",
        title: "Possível pagamento duplicado",
        description: `${count}x a mesma despesa "${desc}" de R$ ${amt} em ${date}.`,
        impact_brl: Number(amt) * (count - 1),
        metadata: { date, description: desc, amount: amt, count },
      });
    }
  });

  // Margem negativa últimos 30d
  const last30 = new Date();
  last30.setDate(last30.getDate() - 30);
  const recent = transactions.filter((t) => new Date(t.date) >= last30);
  const inc = recent.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
  const exp = recent.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  if (inc > 0 && exp > inc) {
    insights.push({
      customer_product_id: cpId,
      insight_type: "alert",
      severity: "critical",
      title: "Margem negativa nos últimos 30 dias",
      description: `Despesas (R$ ${exp.toFixed(2)}) superam receitas (R$ ${inc.toFixed(2)}) em R$ ${(exp - inc).toFixed(2)}.`,
      impact_brl: exp - inc,
      metadata: { income: inc, expense: exp, period_days: 30 },
    });
  }

  // Enriquecimento opcional via IA
  if (useAi && GROQ_API_KEY && insights.length > 0) {
    try {
      const aiResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            { role: "system", content: "Você é um auditor financeiro. Sugira UMA recomendação prática (1 frase) para a empresa." },
            { role: "user", content: `Insights detectados: ${JSON.stringify(insights.slice(0, 5).map((i) => i.title))}. Receita 30d: R$ ${inc.toFixed(0)}. Despesa 30d: R$ ${exp.toFixed(0)}.` },
          ],
          temperature: 0.4,
          max_tokens: 200,
        }),
      });
      if (aiResp.ok) {
        const j = await aiResp.json();
        const rec = j?.choices?.[0]?.message?.content?.trim();
        if (rec) {
          insights.push({
            customer_product_id: cpId,
            insight_type: "recommendation",
            severity: "medium",
            title: "Recomendação IA",
            description: rec.slice(0, 500),
            impact_brl: 0,
            metadata: { source: "groq_llama" },
          });
        }
      }
    } catch (e) {
      console.warn("ai enrichment skipped:", e);
    }
  }

  // Dedup: não recriar insight idêntico em aberto nas últimas 24h
  let created = 0;
  for (const ins of insights) {
    const { data: existing } = await sb
      .from("financial_insights")
      .select("id")
      .eq("customer_product_id", cpId)
      .eq("title", ins.title)
      .eq("status", "open")
      .gte("detected_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
      .maybeSingle();
    if (existing) continue;

    const { error } = await sb.from("financial_insights").insert(ins);
    if (!error) created++;
  }

  return { created, candidates: insights.length };
}

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
