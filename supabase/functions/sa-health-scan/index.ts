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

interface Lead {
  id: string;
  name: string;
  company: string | null;
  business_type: string | null;
  phone: string | null;
  email: string | null;
  status: string;
  source: string | null;
  notes: string | null;
  last_contact_date: string | null;
  created_at: string;
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
      max_tokens: 4000,
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

    // 1) Oportunidades ativas
    const { data: opps } = await supabase
      .from("crm_opportunities")
      .select("id,title,value,stage,probability,expected_close_date,updated_at,created_at,notes,lost_reason,customer:crm_customers(id,name,phone,email,last_contact_date)")
      .eq("customer_product_id", customerProductId)
      .not("stage", "in", "(won,lost)")
      .order("updated_at", { ascending: false })
      .limit(30);
    const deals = (opps || []) as unknown as Deal[];

    // IDs de clientes que já têm oportunidade ativa
    const oppCustomerIds = new Set(
      deals.map((d) => d.customer?.id).filter(Boolean) as string[],
    );

    // 2) Leads (crm_customers) que NÃO têm oportunidade ativa
    const { data: leadsRaw } = await supabase
      .from("crm_customers")
      .select("id,name,company,business_type,phone,email,status,source,notes,last_contact_date,created_at")
      .eq("customer_product_id", customerProductId)
      .not("status", "in", "(inactive,discarded)")
      .order("created_at", { ascending: false })
      .limit(40);
    const leads = ((leadsRaw || []) as Lead[]).filter((l) => !oppCustomerIds.has(l.id)).slice(0, 25);

    if (deals.length === 0 && leads.length === 0) {
      return new Response(JSON.stringify({ analyzed: 0, message: "Nenhum lead ou oportunidade ativa" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carregar scores anteriores
    const { data: previous } = await supabase
      .from("sa_deal_health_scores")
      .select("opportunity_id,lead_id,health_score")
      .eq("customer_product_id", customerProductId);
    const prevOppMap = new Map((previous || []).filter((p: any) => p.opportunity_id).map((p: any) => [p.opportunity_id, p.health_score]));
    const prevLeadMap = new Map((previous || []).filter((p: any) => p.lead_id).map((p: any) => [p.lead_id, p.health_score]));

    const systemPrompt = `Você é um especialista em sales analytics. Calcule um Health Score (0-100) para cada item.

OPORTUNIDADES (entity_type=opportunity) - PESOS:
- Engajamento recente (último contato): 25%
- Estágio vs tempo no estágio (stuck = ruim): 20%
- Probabilidade declarada e valor: 15%
- Data prevista de fechamento (atrasada = pior): 15%
- Sentimento das notas (frustração, objeções): 15%
- Dados de contato completos: 10%

LEADS (entity_type=lead) - PESOS:
- Completude de dados (telefone, email, empresa, segmento): 30%
- Tempo desde criação sem contato (frio = ruim): 25%
- Engajamento (último contato registrado): 20%
- Qualidade das notas/contexto: 15%
- Origem (whatsapp/site > manual): 10%

REGRAS:
- 75-100 = saudável
- 50-74 = atenção
- 25-49 = risco
- 0-24 = crítico

Para cada item, gere 3-5 fatores curtos (positive=true|false) e uma próxima ação concreta.

Responda SOMENTE JSON:
{
  "scores": [
    {
      "id": "uuid",
      "entity_type": "opportunity"|"lead",
      "health_score": 0-100,
      "risk_level": "low|medium|high|critical",
      "factors": [{"label":"texto curto","positive":true|false}],
      "signals": ["sinal1","sinal2"],
      "next_action": "ação concreta em 1 frase",
      "reasoning": "1-2 frases"
    }
  ]
}`;

    const items = [
      ...deals.map((d) => ({
        id: d.id,
        entity_type: "opportunity" as const,
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
      ...leads.map((l) => ({
        id: l.id,
        entity_type: "lead" as const,
        title: l.name,
        company: l.company,
        business_type: l.business_type,
        source: l.source,
        status: l.status,
        days_since_created: daysSince(l.created_at),
        days_since_last_contact: daysSince(l.last_contact_date),
        has_phone: !!l.phone,
        has_email: !!l.email,
        has_company: !!l.company,
        notes_excerpt: (l.notes || "").slice(0, 300),
      })),
    ];

    const raw = await callGroq(groqKey, systemPrompt, `Itens para análise:\n\n${JSON.stringify(items, null, 2)}`);
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { scores: [] }; }
    const aiScores: any[] = Array.isArray(parsed.scores) ? parsed.scores : [];

    const dealsById = new Map(deals.map((d) => [d.id, d]));
    const leadsById = new Map(leads.map((l) => [l.id, l]));
    const rows: any[] = [];

    for (const s of aiScores) {
      const score = Math.max(0, Math.min(100, Math.round(Number(s.health_score) || 50)));
      const isLead = s.entity_type === "lead";
      const risk = s.risk_level || (score >= 75 ? "low" : score >= 50 ? "medium" : score >= 25 ? "high" : "critical");
      const baseRow = {
        customer_product_id: customerProductId,
        health_score: score,
        factors: Array.isArray(s.factors) ? s.factors.slice(0, 6) : [],
        signals: Array.isArray(s.signals) ? s.signals : [],
        ai_analysis: { reasoning: s.reasoning, model: "llama-3.3-70b-versatile" },
        next_action: s.next_action || null,
        risk_level: risk,
        last_calculated_at: new Date().toISOString(),
      };
      if (isLead) {
        const l = leadsById.get(s.id);
        if (!l) continue;
        const prev = prevLeadMap.get(l.id);
        rows.push({
          ...baseRow,
          entity_type: "lead",
          lead_id: l.id,
          opportunity_id: null,
          customer_id: l.id,
          deal_name: l.name,
          contact_name: l.company || l.name,
          monthly_value: 0,
          previous_score: prev ?? null,
          trend: prev == null ? null : score > prev + 3 ? "up" : score < prev - 3 ? "down" : "stable",
        });
      } else {
        const d = dealsById.get(s.id);
        if (!d) continue;
        const prev = prevOppMap.get(d.id);
        rows.push({
          ...baseRow,
          entity_type: "opportunity",
          opportunity_id: d.id,
          lead_id: null,
          customer_id: d.customer?.id || null,
          deal_name: d.title,
          contact_name: d.customer?.name || null,
          monthly_value: Number(d.value || 0),
          previous_score: prev ?? null,
          trend: prev == null ? null : score > prev + 3 ? "up" : score < prev - 3 ? "down" : "stable",
        });
      }
    }

    if (rows.length > 0) {
      // Upsert separado por tipo (índices únicos parciais distintos)
      const oppRows = rows.filter((r) => r.entity_type === "opportunity");
      const leadRows = rows.filter((r) => r.entity_type === "lead");
      if (oppRows.length) {
        const { error } = await supabase
          .from("sa_deal_health_scores")
          .upsert(oppRows, { onConflict: "customer_product_id,opportunity_id" });
        if (error) throw error;
      }
      if (leadRows.length) {
        const { error } = await supabase
          .from("sa_deal_health_scores")
          .upsert(leadRows, { onConflict: "customer_product_id,lead_id" });
        if (error) throw error;
      }
    }

    const critical = rows.filter((r) => r.health_score < 25).length;
    const atRisk = rows.filter((r) => r.health_score >= 25 && r.health_score < 50).length;
    const healthy = rows.filter((r) => r.health_score >= 75).length;

    return new Response(JSON.stringify({
      analyzed: rows.length,
      opportunities: rows.filter((r) => r.entity_type === "opportunity").length,
      leads: rows.filter((r) => r.entity_type === "lead").length,
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
