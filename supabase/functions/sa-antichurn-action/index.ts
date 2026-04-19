import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightRequest, corsResponse } from "../_shared/cors.ts";

// Marca um alerta de churn com ação aplicada (acted/resolved/recovered/false_positive)
// e cria uma interação no CRM registrando a ação tomada.
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

    const { alertId, action } = await req.json();
    if (!alertId || !action) return corsResponse({ error: "alertId e action obrigatórios" }, 400, origin);

    const validActions = ["acted", "resolved", "recovered", "false_positive", "dismissed"];
    if (!validActions.includes(action)) return corsResponse({ error: "Ação inválida" }, 400, origin);

    // Carrega alerta
    const { data: alert } = await supabase
      .from("sa_antichurn_alerts")
      .select("id,customer_product_id,crm_customer_id,customer_name,suggested_action,churn_probability")
      .eq("id", alertId)
      .maybeSingle();
    if (!alert) return corsResponse({ error: "Alerta não encontrado" }, 404, origin);

    // Verifica acesso
    const { data: cp } = await supabase
      .from("customer_products")
      .select("user_id")
      .eq("id", alert.customer_product_id)
      .maybeSingle();
    if (!cp || cp.user_id !== user.id) {
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) return corsResponse({ error: "Forbidden" }, 403, origin);
    }

    const updates: any = { status: action };
    if (action === "resolved" || action === "recovered" || action === "false_positive") {
      updates.resolved_at = new Date().toISOString();
    }
    await supabase.from("sa_antichurn_alerts").update(updates).eq("id", alertId);

    // Registra interação no CRM
    if (alert.crm_customer_id && (action === "acted" || action === "recovered")) {
      await supabase.from("crm_interactions").insert({
        customer_product_id: alert.customer_product_id,
        customer_id: alert.crm_customer_id,
        type: "churn_action",
        subject: `Anti-Churn: ${action === "recovered" ? "Cliente recuperado" : "Ação executada"}`,
        description: alert.suggested_action || `Ação anti-churn aplicada (${alert.churn_probability}% risco)`,
      });

      // Atualiza last_contact_date
      await supabase
        .from("crm_customers")
        .update({ last_contact_date: new Date().toISOString() })
        .eq("id", alert.crm_customer_id);
    }

    return corsResponse({ ok: true, status: action }, 200, origin);
  } catch (err) {
    console.error("sa-antichurn-action error:", err);
    return corsResponse(
      { error: err instanceof Error ? err.message : "Erro desconhecido" },
      500,
      origin,
    );
  }
});
