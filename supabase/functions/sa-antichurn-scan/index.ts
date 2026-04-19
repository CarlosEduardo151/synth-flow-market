import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightRequest, corsResponse } from "../_shared/cors.ts";

const SYSTEM_PROMPT = `Você é um analista sênior de Customer Success especializado em prever churn (cancelamento) de clientes B2B/B2C.
Analise os clientes fornecidos e identifique sinais comportamentais de risco de cancelamento.

Responda APENAS JSON válido (sem markdown):
{
  "alerts": [
    {
      "customer_id": "uuid",
      "churn_probability": 0-100,
      "risk_level": "low" | "medium" | "high" | "critical",
      "signals": ["sinal específico 1", "sinal específico 2"],
      "suggested_action": "ação concreta de retenção em 1 frase",
      "monthly_value_estimate": número (ticket mensal estimado em BRL)
    }
  ]
}

Regras:
- Considere fortes sinais: 30+ dias sem contato, queda de engajamento, oportunidades perdidas, status churned/inactive, sentimento negativo, sem interações recentes.
- critical = 80-100, high = 60-79, medium = 40-59, low = <40.
- Inclua APENAS clientes com risco >= 40 (medium+).
- Seja factual: baseie-se nos dados fornecidos, nada de invenção.
- Sugestões de ação devem ser acionáveis (ex: "Ligar oferecendo desconto de 15%", "Enviar caso de sucesso por WhatsApp").`;

async function callAI(systemPrompt: string, userPrompt: string) {
  const key = Deno.env.get("GROQ_API_KEY");
  if (!key) throw new Error("GROQ_API_KEY não configurada");
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3,
      max_tokens: 4000,
      response_format: { type: "json_object" },
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    console.error("Groq error:", resp.status, txt);
    if (resp.status === 429) throw new Error("Limite Groq atingido. Aguarde alguns minutos.");
    throw new Error("Erro ao chamar IA Groq");
  }
  const data = await resp.json();
  return data.choices?.[0]?.message?.content as string;
}

function extractJson(content: string): any {
  const m = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/```\n?([\s\S]*?)\n?```/);
  return JSON.parse((m ? m[1] : content).trim());
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

    const { customerProductId } = await req.json();
    if (!customerProductId) return corsResponse({ error: "customerProductId obrigatório" }, 400, origin);

    // Verifica acesso
    const { data: cp } = await supabase
      .from("customer_products")
      .select("id,user_id")
      .eq("id", customerProductId)
      .maybeSingle();
    if (!cp || cp.user_id !== user.id) {
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) return corsResponse({ error: "Forbidden" }, 403, origin);
    }

    // Carrega clientes do CRM
    const { data: customers } = await supabase
      .from("crm_customers")
      .select("id,name,email,phone,company,business_type,status,source,notes,last_contact_date,created_at")
      .eq("customer_product_id", customerProductId)
      .order("last_contact_date", { ascending: true, nullsFirst: true })
      .limit(100);

    if (!customers || customers.length === 0) {
      return corsResponse({ ok: true, scanned: 0, alerts_created: 0, message: "Sem clientes no CRM" }, 200, origin);
    }

    const customerIds = customers.map((c: any) => c.id);

    // Carrega oportunidades e interações para enriquecer contexto
    const [{ data: opps }, { data: interactions }] = await Promise.all([
      supabase
        .from("crm_opportunities")
        .select("id,customer_id,stage,value,updated_at,lost_reason")
        .in("customer_id", customerIds),
      supabase
        .from("crm_interactions")
        .select("customer_id,type,created_at")
        .in("customer_id", customerIds)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    const oppsByCustomer = new Map<string, any[]>();
    (opps || []).forEach((o: any) => {
      const arr = oppsByCustomer.get(o.customer_id) || [];
      arr.push(o);
      oppsByCustomer.set(o.customer_id, arr);
    });

    const interactionsByCustomer = new Map<string, any[]>();
    (interactions || []).forEach((i: any) => {
      const arr = interactionsByCustomer.get(i.customer_id) || [];
      arr.push(i);
      interactionsByCustomer.set(i.customer_id, arr);
    });

    const enriched = customers.map((c: any) => {
      const cOpps = oppsByCustomer.get(c.id) || [];
      const cInter = interactionsByCustomer.get(c.id) || [];
      const lastContact = c.last_contact_date || cInter[0]?.created_at || c.created_at;
      const daysSince = lastContact
        ? Math.floor((Date.now() - new Date(lastContact).getTime()) / 86400000)
        : null;
      const wonValue = cOpps.filter((o) => o.stage === "ganho" || o.stage === "won").reduce((s, o) => s + Number(o.value || 0), 0);
      const lostCount = cOpps.filter((o) => o.stage === "perdido" || o.stage === "lost").length;
      return {
        id: c.id,
        name: c.name,
        company: c.company,
        status: c.status,
        days_since_contact: daysSince,
        interactions_count: cInter.length,
        opportunities: cOpps.length,
        won_value_brl: wonValue,
        lost_count: lostCount,
        notes: c.notes?.slice(0, 200) || null,
      };
    });

    const userPrompt = `Analise estes ${enriched.length} clientes e identifique quais têm alto risco de churn:
${JSON.stringify(enriched, null, 2)}

Retorne JSON com os clientes em risco (>= 40% probabilidade).`;

    const content = await callAI(SYSTEM_PROMPT, userPrompt);
    const parsed = extractJson(content);
    const alerts: any[] = parsed?.alerts || [];

    let created = 0;
    let updated = 0;

    for (const a of alerts) {
      const customer = customers.find((c: any) => c.id === a.customer_id);
      if (!customer) continue;

      const daysSince = customer.last_contact_date
        ? Math.floor((Date.now() - new Date(customer.last_contact_date).getTime()) / 86400000)
        : null;

      const payload = {
        customer_product_id: customerProductId,
        crm_customer_id: customer.id,
        customer_name: customer.name,
        company: customer.company,
        churn_probability: Math.min(100, Math.max(0, Number(a.churn_probability) || 0)),
        risk_level: a.risk_level || "medium",
        days_since_contact: daysSince,
        signals: Array.isArray(a.signals) ? a.signals : [],
        suggested_action: a.suggested_action || null,
        monthly_value: Number(a.monthly_value_estimate) || 0,
        status: "active",
        recommended_actions: a.suggested_action ? [a.suggested_action] : [],
        detected_at: new Date().toISOString(),
      };

      // Upsert por (customer_product_id, crm_customer_id) com status ativo
      const { data: existing } = await supabase
        .from("sa_antichurn_alerts")
        .select("id")
        .eq("customer_product_id", customerProductId)
        .eq("crm_customer_id", customer.id)
        .in("status", ["open", "active"])
        .maybeSingle();

      if (existing) {
        await supabase.from("sa_antichurn_alerts").update(payload).eq("id", existing.id);
        updated++;
      } else {
        await supabase.from("sa_antichurn_alerts").insert(payload);
        created++;
      }
    }

    return corsResponse(
      { ok: true, scanned: customers.length, alerts_created: created, alerts_updated: updated },
      200,
      origin,
    );
  } catch (err) {
    console.error("sa-antichurn-scan error:", err);
    return corsResponse(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      500,
      origin,
    );
  }
});
