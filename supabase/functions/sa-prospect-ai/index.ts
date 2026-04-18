import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightRequest, corsResponse } from "../_shared/cors.ts";

interface QualifyPayload {
  customerProductId: string;
  leadIds?: string[]; // se vazio, qualifica todos os leads sem score
  icp?: string; // descrição opcional do ICP do cliente
}

const SYSTEM_PROMPT = `Você é um SDR sênior especialista em qualificação B2B/B2C com metodologia BANT + ICP fit.
Analise cada lead e responda APENAS JSON válido (sem markdown, sem comentários).

Para cada lead retorne:
{
  "leads": [
    {
      "id": "uuid do lead",
      "ai_score": 0-100,
      "qualification": "SQL" | "MQL" | "Lead" | "Descartar",
      "ai_analysis": {
        "icp_fit": 0-100,
        "intent": "alto" | "medio" | "baixo",
        "bant": {
          "budget": "tem|provavel|sem|desconhecido",
          "authority": "decisor|influenciador|usuario|desconhecido",
          "need": "clara|provavel|fraca|desconhecida",
          "timing": "imediato|30d|90d|sem_prazo"
        },
        "buying_signals": ["sinal1", "sinal2"],
        "objections_likely": ["objeção provável"],
        "next_best_action": "ação concreta e específica em 1 frase",
        "best_channel": "whatsapp|email|telefone",
        "best_time": "manha|tarde|noite",
        "tags": ["tag1", "tag2"],
        "summary": "resumo do lead em 1 frase",
        "estimated_ticket_brl": número
      }
    }
  ]
}

Regras:
- ai_score considera: dados de contato completos, empresa, cargo, sinais de compra, recência, fonte.
- SQL = score 75-100 + intent alto. MQL = 50-74. Lead = 30-49. Descartar = <30.
- Seja conservador e factual. Nada de inventar dados que não estão no input.`;

async function callLovableAI(systemPrompt: string, userPrompt: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY não configurada");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("Lovable AI error:", resp.status, txt);
    if (resp.status === 429) throw new Error("Limite de IA atingido. Aguarde alguns minutos.");
    if (resp.status === 402) throw new Error("Créditos de IA esgotados. Adicione créditos no workspace.");
    throw new Error("Erro ao chamar IA");
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content as string;
}

function extractJson(content: string): any {
  const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/```\n?([\s\S]*?)\n?```/);
  const jsonStr = (jsonMatch ? jsonMatch[1] : content).trim();
  return JSON.parse(jsonStr);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
  const origin = req.headers.get("Origin");

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return corsResponse({ error: "Unauthorized" }, 401, origin);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: userRes } = await supabase.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return corsResponse({ error: "Unauthorized" }, 401, origin);

    const body = (await req.json()) as QualifyPayload;
    const { customerProductId, leadIds, icp } = body;
    if (!customerProductId) return corsResponse({ error: "customerProductId obrigatório" }, 400, origin);

    // Verifica acesso ao customer_product
    const { data: cp } = await supabase
      .from("customer_products")
      .select("id,user_id")
      .eq("id", customerProductId)
      .maybeSingle();
    if (!cp || cp.user_id !== user.id) {
      // admin bypass
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) return corsResponse({ error: "Forbidden" }, 403, origin);
    }

    // Carrega leads de crm_customers (base unificada)
    let q = supabase
      .from("crm_customers")
      .select("id,name,email,phone,company,business_type,status,source,notes,last_contact_date,created_at")
      .eq("customer_product_id", customerProductId);
    if (leadIds && leadIds.length > 0) q = q.in("id", leadIds);
    const { data: leads, error: leadsErr } = await q.limit(50);
    if (leadsErr) throw leadsErr;
    if (!leads || leads.length === 0) {
      return corsResponse({ ok: true, qualified: 0, message: "Nenhum lead para qualificar" }, 200, origin);
    }

    const userPrompt = `ICP do cliente: ${icp || "Não informado — infira do contexto dos leads"}

Leads para qualificar (${leads.length}):
${JSON.stringify(
  leads.map((l) => ({
    id: l.id,
    name: l.name,
    company: l.company,
    cargo_segmento: l.business_type,
    has_phone: !!l.phone,
    has_email: !!l.email,
    source: l.source,
    status: l.status,
    notes: l.notes?.slice(0, 300) || null,
    last_contact_days_ago: l.last_contact_date
      ? Math.floor((Date.now() - new Date(l.last_contact_date).getTime()) / 86400000)
      : null,
    created_days_ago: Math.floor((Date.now() - new Date(l.created_at).getTime()) / 86400000),
  })),
  null,
  2,
)}

Qualifique todos retornando o JSON no formato definido.`;

    const content = await callLovableAI(SYSTEM_PROMPT, userPrompt);
    const parsed = extractJson(content);
    const qualifiedLeads: any[] = parsed?.leads || [];

    // Persiste em sa_prospects (upsert por crm_customer.id mapeado em tags? Não — usamos mesmo id)
    let updated = 0;
    for (const ql of qualifiedLeads) {
      const lead = leads.find((l) => l.id === ql.id);
      if (!lead) continue;

      // Upsert em sa_prospects usando id do crm_customer como chave de referência
      const { data: existing } = await supabase
        .from("sa_prospects")
        .select("id")
        .eq("customer_product_id", customerProductId)
        .eq("email", lead.email || "__no_email__")
        .maybeSingle();

      const payload = {
        customer_product_id: customerProductId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        position: lead.business_type,
        source: lead.source,
        ai_score: Math.min(100, Math.max(0, Number(ql.ai_score) || 0)),
        qualification: ql.qualification || "Lead",
        ai_analysis: ql.ai_analysis || {},
        tags: Array.isArray(ql.ai_analysis?.tags) ? ql.ai_analysis.tags : [],
        notes: lead.notes,
        last_contact_at: lead.last_contact_date,
      };

      if (existing) {
        await supabase.from("sa_prospects").update(payload).eq("id", existing.id);
      } else {
        await supabase.from("sa_prospects").insert(payload);
      }
      updated++;
    }

    return corsResponse(
      { ok: true, qualified: updated, total: leads.length, results: qualifiedLeads },
      200,
      origin,
    );
  } catch (err) {
    console.error("sa-prospect-ai error:", err);
    return corsResponse(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      500,
      origin,
    );
  }
});
