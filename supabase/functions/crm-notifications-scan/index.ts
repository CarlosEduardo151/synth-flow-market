// Periodic scanner — generates notifications for the CRM bell
// - new_lead: leads created in last hour, not yet notified
// - followup_overdue: follow-up rules with logs in 'falha' or pending past delay
// - hot_opportunity: open opps with probability >= 80% (notify once per day)
// - meeting_soon: meetings starting in next 60 minutes
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

async function scanForCustomerProduct(customerProductId: string) {
  const created: any[] = [];
  const now = new Date();

  // --- 1. New leads (created in last 24h, not yet notified) ---
  const dayAgo = new Date(now.getTime() - 24 * 3600 * 1000).toISOString();
  const { data: newLeads } = await admin
    .from("crm_customers")
    .select("id, name, phone, created_at")
    .eq("customer_product_id", customerProductId)
    .eq("status", "lead")
    .gte("created_at", dayAgo)
    .limit(50);

  for (const lead of newLeads || []) {
    const { data: existing } = await admin
      .from("crm_notifications")
      .select("id")
      .eq("customer_product_id", customerProductId)
      .eq("type", "new_lead")
      .eq("metadata->>customer_id", lead.id)
      .limit(1);
    if (!existing || existing.length === 0) {
      created.push({
        customer_product_id: customerProductId,
        type: "new_lead",
        title: `🆕 Novo lead: ${lead.name}`,
        message: lead.phone ? `Telefone: ${lead.phone}` : "Sem telefone",
        link_path: "?tab=clientes",
        metadata: { customer_id: lead.id },
      });
    }
  }

  // --- 2. Hot opportunities (>= 80% prob, open, not closed) ---
  const { data: hotOpps } = await admin
    .from("crm_opportunities")
    .select("id, title, probability, value, stage, customer_id, crm_customers(name)")
    .eq("customer_product_id", customerProductId)
    .gte("probability", 80)
    .not("stage", "in", "(fechado_ganho,fechado_perdido,won,lost)")
    .limit(20);

  for (const opp of (hotOpps || []) as any[]) {
    // Notify once per 24h per opportunity
    const { data: existing } = await admin
      .from("crm_notifications")
      .select("id")
      .eq("customer_product_id", customerProductId)
      .eq("type", "hot_opportunity")
      .eq("metadata->>opportunity_id", opp.id)
      .gte("created_at", dayAgo)
      .limit(1);
    if (!existing || existing.length === 0) {
      const cust = opp.crm_customers?.name || "cliente";
      created.push({
        customer_product_id: customerProductId,
        type: "hot_opportunity",
        title: `🔥 Oportunidade quente: ${opp.title}`,
        message: `${cust} — ${opp.probability}% de chance · R$ ${Number(opp.value || 0).toLocaleString("pt-BR")}`,
        link_path: "?tab=oportunidades",
        metadata: { opportunity_id: opp.id, customer_id: opp.customer_id },
      });
    }
  }

  // --- 3. Meetings soon (in next 60 minutes) ---
  const in60min = new Date(now.getTime() + 60 * 60 * 1000).toISOString();
  const in15min = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
  const { data: meetings } = await admin
    .from("sa_meetings")
    .select("id, title, scheduled_at, lead_email, status")
    .eq("customer_product_id", customerProductId)
    .gte("scheduled_at", now.toISOString())
    .lte("scheduled_at", in60min)
    .not("status", "in", "(cancelled,completed)");

  for (const m of meetings || []) {
    const { data: existing } = await admin
      .from("crm_notifications")
      .select("id")
      .eq("customer_product_id", customerProductId)
      .eq("type", "meeting_soon")
      .eq("metadata->>meeting_id", m.id)
      .limit(1);
    if (!existing || existing.length === 0) {
      const minutes = Math.round((new Date(m.scheduled_at).getTime() - now.getTime()) / 60000);
      created.push({
        customer_product_id: customerProductId,
        type: "meeting_soon",
        title: `📅 Reunião em ${minutes}min: ${m.title || "Sem título"}`,
        message: m.lead_email ? `Com ${m.lead_email}` : "",
        link_path: "?tab=sales-scheduling",
        metadata: { meeting_id: m.id },
      });
    }
  }

  // --- 4. Follow-ups overdue (rules whose latest log failed) ---
  const { data: failedLogs } = await admin
    .from("crm_follow_up_logs")
    .select("id, client_name, client_phone, rule_id, created_at, status")
    .eq("customer_product_id", customerProductId)
    .eq("status", "falha")
    .gte("created_at", dayAgo)
    .order("created_at", { ascending: false })
    .limit(20);

  for (const log of failedLogs || []) {
    const { data: existing } = await admin
      .from("crm_notifications")
      .select("id")
      .eq("customer_product_id", customerProductId)
      .eq("type", "followup_overdue")
      .eq("metadata->>log_id", log.id)
      .limit(1);
    if (!existing || existing.length === 0) {
      created.push({
        customer_product_id: customerProductId,
        type: "followup_overdue",
        title: `⚠️ Follow-up falhou: ${log.client_name}`,
        message: log.client_phone ? `Phone: ${log.client_phone}` : "",
        link_path: "?tab=follow-up",
        metadata: { log_id: log.id, rule_id: log.rule_id },
      });
    }
  }

  if (created.length > 0) {
    await admin.from("crm_notifications").insert(created);
  }
  return created.length;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const customerProductId = body.customer_product_id;

    let total = 0;
    if (customerProductId) {
      total = await scanForCustomerProduct(customerProductId);
    } else {
      // Cron mode: scan all active products that have CRM
      const { data: products } = await admin
        .from("customer_products")
        .select("id")
        .eq("product_slug", "crm-simples")
        .eq("is_active", true);

      for (const p of products || []) {
        try {
          total += await scanForCustomerProduct(p.id);
        } catch (e) {
          console.error("scan error for", p.id, e);
        }
      }
    }

    return new Response(JSON.stringify({ ok: true, created: total }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("crm-notifications-scan error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
