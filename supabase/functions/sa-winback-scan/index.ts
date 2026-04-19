import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PSY_TRIGGERS = [
  "Escassez",
  "Prova social",
  "FOMO",
  "Reciprocidade",
  "Quebra de objeção",
  "Curiosidade",
  "Autoridade",
  "Novidade",
];

interface LostDeal {
  id: string;
  title: string;
  value: number;
  lost_reason: string | null;
  updated_at: string;
  customer: { id: string; name: string; company: string | null; phone: string | null; email: string | null } | null;
}

function daysBetween(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
}

async function callGroq(apiKey: string, systemPrompt: string, userPrompt: string) {
  const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.85,
      max_tokens: 700,
      response_format: { type: "json_object" },
    }),
  });
  if (!r.ok) throw new Error(`Groq error: ${r.status} ${await r.text()}`);
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
    if (!groqKey) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY ausente" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1) Carregar deals perdidos nos últimos 180 dias
    const since = new Date(Date.now() - 180 * 86400000).toISOString();
    const { data: lost, error: lostErr } = await supabase
      .from("crm_opportunities")
      .select("id,title,value,lost_reason,updated_at,customer:crm_customers(id,name,company,phone,email)")
      .eq("customer_product_id", customerProductId)
      .eq("stage", "lost")
      .gte("updated_at", since)
      .order("updated_at", { ascending: false })
      .limit(40);

    if (lostErr) throw lostErr;
    const deals = (lost || []) as unknown as LostDeal[];

    // 2) Filtrar quem já tem campanha pending/sent ativa
    const { data: existing } = await supabase
      .from("sa_winback_campaigns")
      .select("opportunity_id,status")
      .eq("customer_product_id", customerProductId)
      .in("status", ["pending", "scheduled", "sent"]);

    const blocked = new Set((existing || []).map((e: any) => e.opportunity_id).filter(Boolean));
    const candidates = deals.filter((d) => !blocked.has(d.id) && d.customer);

    if (candidates.length === 0) {
      return new Response(JSON.stringify({ created: 0, analyzed: deals.length, message: "Nenhum novo lead recuperável" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3) IA decide quais valem campanha + gera mensagem
    const systemPrompt = `Você é um especialista em copywriting de vendas e psicologia comportamental, com foco em recuperação de clientes perdidos (win-back) no mercado B2B brasileiro.

Sua missão: para cada lead perdido, decidir se vale uma campanha de recuperação e gerar UMA mensagem curta (máx 350 caracteres), em português brasileiro, profissional e empática — JAMAIS soando como desespero ou desconto agressivo.

Regras:
- Use UM gatilho psicológico apenas: ${PSY_TRIGGERS.join(", ")}.
- Calibre o gatilho pelo motivo de perda + tempo decorrido.
- Mensagens >90 dias devem ser leves ("oi, pensei em você") sem pedido direto.
- Probabilidade alta (>60) só para perdas <60 dias com motivo solucionável.
- Se motivo for "concorrência" ou "preço", use prova social ou quebra de objeção.
- Se motivo vazio, use curiosidade.

Responda SOMENTE JSON neste formato:
{
  "campaigns": [
    {
      "opportunity_id": "uuid",
      "trigger_type": "Escassez|Prova social|...",
      "suggested_message": "texto curto",
      "success_probability": 0-100,
      "monthly_value": número (use o value como referência mensal estimada),
      "reasoning": "1 frase explicando a escolha do gatilho"
    }
  ]
}

Inclua APENAS leads que valem campanha (probabilidade >= 25). Descarte os demais.`;

    const userPrompt = `Leads perdidos para análise:\n\n${JSON.stringify(
      candidates.map((d) => ({
        opportunity_id: d.id,
        lead_name: d.customer?.name,
        company: d.customer?.company,
        deal_title: d.title,
        value: d.value,
        lost_reason: d.lost_reason,
        days_since_lost: daysBetween(d.updated_at),
      })),
      null,
      2,
    )}`;

    const raw = await callGroq(groqKey, systemPrompt, userPrompt);
    let parsed: any = {};
    try { parsed = JSON.parse(raw); } catch { parsed = { campaigns: [] }; }
    const aiCampaigns: any[] = Array.isArray(parsed.campaigns) ? parsed.campaigns : [];

    // 4) Inserir no banco
    const dealsById = new Map(candidates.map((d) => [d.id, d]));
    const rows = aiCampaigns
      .map((c) => {
        const d = dealsById.get(c.opportunity_id);
        if (!d) return null;
        return {
          customer_product_id: customerProductId,
          opportunity_id: d.id,
          customer_id: d.customer?.id || null,
          lead_name: d.customer?.name || "Lead",
          company: d.customer?.company || null,
          lead_phone: d.customer?.phone || null,
          lead_email: d.customer?.email || null,
          lost_reason: d.lost_reason,
          days_since_lost: daysBetween(d.updated_at),
          monthly_value: Number(c.monthly_value || d.value || 0),
          trigger_type: c.trigger_type || "Curiosidade",
          suggested_message: String(c.suggested_message || "").slice(0, 500),
          success_probability: Math.max(0, Math.min(100, Math.round(Number(c.success_probability) || 0))),
          ai_analysis: { reasoning: c.reasoning, model: "llama-3.3-70b-versatile" },
          status: "pending",
          channel: "whatsapp",
          campaign_name: `Win-back: ${d.customer?.name || "Lead"}`,
        };
      })
      .filter(Boolean);

    let created = 0;
    if (rows.length > 0) {
      const { error: insErr, count } = await supabase
        .from("sa_winback_campaigns")
        .insert(rows as any[], { count: "exact" });
      if (insErr) throw insErr;
      created = count || rows.length;
    }

    return new Response(JSON.stringify({
      created,
      analyzed: candidates.length,
      total_lost: deals.length,
      skipped_existing: deals.length - candidates.length,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("sa-winback-scan error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
