import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Deal {
  id: string;
  title: string;
  value: number;
  stage: string;
  probability: number | null;
  expected_close_date: string | null;
  updated_at: string;
  created_at: string;
  notes: string | null;
  lost_reason: string | null;
  customer: { id: string; name: string; phone: string | null; email: string | null; last_contact_date: string | null } | null;
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

async function callGroq(apiKey: string, system: string, user: string) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      temperature: 0.4,
      max_tokens: 3000,
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`groq:${r.status}:${await r.text()}`);
  const j = await r.json();
  return j.choices?.[0]?.message?.content || "{}";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { customerProductId } = await req.json();
    if (!customerProductId) {
      return new Response(JSON.stringify({ error: "customerProductId obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) throw new Error("GROQ_API_KEY ausente");

    // Carregar oportunidades ativas (não fechadas)
    const { data: opps, error } = await supabase
      .from("crm_opportunities")
      .select("id,title,value,stage,probability,expected_close_date,updated_at,created_at,notes,lost_reason,customer:crm_customers(id,name,phone,email,last_contact_date)")
      .eq("customer_product_id", customerProductId)
      .not("stage", "in", "(won,lost)")
      .order("updated_at", { ascending: false })
      .limit(30);

    if (error) throw error;
    const deals = (opps || []) as unknown as Deal[];

    if (deals.length === 0) {
      return new Response(JSON.stringify({ analyzed: 0, message: "Nenhuma oportunidade ativa" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carregar scores anteriores para detectar tendência
    const { data: previous } = await supabase
      .from("sa_deal_health_scores")
      .select("opportunity_id,health_score")
      .eq("customer_product_id", customerProductId);
    const prevMap = new Map((previous || []).map((p: any) => [p.opportunity_id, p.health_score]));

    // IA pontua cada deal
    const systemPrompt = `Você é um especialista em sales analytics. Para cada oportunidade, calcule um Health Score (0-100) baseado em sinais combinados:

PESOS:
- Engajamento recente (último contato, atividade): 25%
- Estágio vs tempo no estágio (stuck = ruim): 20%
- Probabilidade declarada e valor: 15%
- Data prevista de fechamento (atrasada = pior): 15%
- Sentimento das notas (frustração, objeções): 15%
- Dados de contato completos (telefone, email): 10%

REGRAS:
- 75-100 = saudável (engajado, no caminho)
- 50-74 = atenção (sinais mistos)
- 25-49 = risco (sem contato recente, estagnado)
- 0-24 = crítico (abandono iminente)

Para cada deal, gere 3-5 fatores curtos (positivos e negativos) e uma próxima ação concreta (ex: "Ligar hoje para retomar conversa").

Responda SOMENTE JSON:
{
  "scores": [
    {
      "opportunity_id": "uuid",
      "health_score": 0-100,
      "risk_level": "low|medium|high|critical",
      "factors": [{"label":"texto curto","positive":true|false}],
      "signals": ["sinal1","sinal2"],
      "next_action": "ação concreta em 1 frase",
      "reasoning": "1-2 frases explicando o score"
    }
  ]
}`;

    const userPrompt = `Oportunidades ativas:\n\n${JSON.stringify(
      deals.map((d) => ({
        opportunity_id: d.id,
        title: d.title,
        value: d.value,
        stage: d.stage,
        probability: d.probability,
        expected_close_date: d.expected_close_date,
        days_in_stage: daysSince(d.updated_at),
        days_since_created: daysSince(d.created_at),
        days_since_last_contact: daysSince(d.customer?.last_contact_date || null),
        has_phone: !!d.customer?.phone,
        has_email: !!d.customer?.email,
        notes_excerpt: (d.notes || "").slice(0, 300),
      })),
      null,
      2,
    )}`;

    const raw = await callGroq(groqKey, systemPrompt, userPrompt);
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { scores: [] }; }
    const aiScores: any[] = Array.isArray(parsed.scores) ? parsed.scores : [];

    const dealsById = new Map(deals.map((d) => [d.id, d]));
    const rows = aiScores
      .map((s) => {
        const d = dealsById.get(s.opportunity_id);
        if (!d) return null;
        const score = Math.max(0, Math.min(100, Math.round(Number(s.health_score) || 50)));
        const prev = prevMap.get(d.id);
        const trend = prev == null ? null : score > prev + 3 ? "up" : score < prev - 3 ? "down" : "stable";
        return {
          customer_product_id: customerProductId,
          opportunity_id: d.id,
          customer_id: d.customer?.id || null,
          deal_name: d.title,
          contact_name: d.customer?.name || null,
          monthly_value: Number(d.value || 0),
          health_score: score,
          previous_score: prev ?? null,
          trend,
          factors: Array.isArray(s.factors) ? s.factors.slice(0, 6) : [],
          signals: Array.isArray(s.signals) ? s.signals : [],
          ai_analysis: { reasoning: s.reasoning, model: "llama-3.3-70b-versatile" },
          next_action: s.next_action || null,
          risk_level: s.risk_level || (score >= 75 ? "low" : score >= 50 ? "medium" : score >= 25 ? "high" : "critical"),
          last_calculated_at: new Date().toISOString(),
        };
      })
      .filter(Boolean) as any[];

    if (rows.length > 0) {
      const { error: upErr } = await supabase
        .from("sa_deal_health_scores")
        .upsert(rows, { onConflict: "customer_product_id,opportunity_id" });
      if (upErr) throw upErr;
    }

    const critical = rows.filter((r) => r.health_score < 25).length;
    const atRisk = rows.filter((r) => r.health_score >= 25 && r.health_score < 50).length;
    const healthy = rows.filter((r) => r.health_score >= 75).length;

    return new Response(JSON.stringify({
      analyzed: rows.length,
      critical, at_risk: atRisk, healthy,
      avg_score: rows.length ? Math.round(rows.reduce((s, r) => s + r.health_score, 0) / rows.length) : 0,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("sa-health-scan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
