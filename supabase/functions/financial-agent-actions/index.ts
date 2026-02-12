import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type DecideBody = {
  actionRequestId: string;
  decision: "approved" | "rejected";
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!jwt) return json(401, { error: "Unauthorized" });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(jwt);
    if (userErr || !user) return json(401, { error: "Unauthorized" });

    const body = (await req.json().catch(() => null)) as DecideBody | null;
    if (!body?.actionRequestId || !body?.decision) {
      return json(400, { error: "actionRequestId e decision são obrigatórios" });
    }

    const { data: reqRow, error: reqErr } = await supabase
      .from("financial_agent_action_requests")
      .select("*")
      .eq("id", body.actionRequestId)
      .maybeSingle();

    if (reqErr || !reqRow) return json(404, { error: "Solicitação não encontrada" });
    if (reqRow.user_id !== user.id) return json(403, { error: "Sem permissão" });
    if (reqRow.status !== "pending") return json(400, { error: "Solicitação já decidida" });

    // Update status
    const decidedAt = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("financial_agent_action_requests")
      .update({
        status: body.decision,
        decided_at: decidedAt,
        decision_by: user.id,
      })
      .eq("id", reqRow.id);
    if (updErr) return json(500, { error: updErr.message });

    if (body.decision === "rejected") {
      return json(200, { success: true, status: "rejected" });
    }

    // Execute only goal actions (phase 1)
    const actionType = String(reqRow.action_type || "");
    const payload = (reqRow.payload || {}) as any;

    // Map customer_product_id -> verify ownership and product active
    const { data: cp } = await supabase
      .from("customer_products")
      .select("id, user_id, is_active")
      .eq("id", reqRow.customer_product_id)
      .maybeSingle();
    if (!cp || cp.user_id !== user.id || !cp.is_active) {
      await markFailed(supabase, reqRow.id, "Produto inativo ou sem acesso");
      return json(403, { error: "Produto inativo ou sem acesso" });
    }

    try {
      let execResult: any = null;

      if (actionType === "goal_create") {
        if (!payload?.name || payload?.target_amount === undefined) {
          throw new Error("payload inválido para goal_create (name, target_amount)");
        }
        const { data: created, error } = await supabase
          .from("financial_agent_goals")
          .insert({
            customer_product_id: reqRow.customer_product_id,
            name: payload.name,
            target_amount: payload.target_amount,
            current_amount: payload.current_amount ?? 0,
            deadline: payload.deadline ?? null,
            status: payload.status ?? "active",
          })
          .select()
          .single();
        if (error) throw new Error(error.message);
        execResult = created;
      } else if (actionType === "goal_update") {
        if (!payload?.id) throw new Error("payload inválido para goal_update (id)");
        const updateData: any = {};
        if (payload.name !== undefined) updateData.name = payload.name;
        if (payload.target_amount !== undefined) updateData.target_amount = payload.target_amount;
        if (payload.current_amount !== undefined) updateData.current_amount = payload.current_amount;
        if (payload.deadline !== undefined) updateData.deadline = payload.deadline;
        if (payload.status !== undefined) updateData.status = payload.status;

        const { data: updated, error } = await supabase
          .from("financial_agent_goals")
          .update(updateData)
          .eq("id", payload.id)
          .eq("customer_product_id", reqRow.customer_product_id)
          .select()
          .maybeSingle();
        if (error) throw new Error(error.message);
        execResult = updated;
      } else if (actionType === "goal_delete") {
        if (!payload?.id) throw new Error("payload inválido para goal_delete (id)");
        const { error } = await supabase
          .from("financial_agent_goals")
          .delete()
          .eq("id", payload.id)
          .eq("customer_product_id", reqRow.customer_product_id);
        if (error) throw new Error(error.message);
        execResult = { deleted: true };
      } else {
        throw new Error(`Ação não suportada: ${actionType}`);
      }

      await supabase
        .from("financial_agent_action_requests")
        .update({ status: "executed", executed_at: new Date().toISOString() })
        .eq("id", reqRow.id);

      // Log a system message
      await supabase.from("financial_agent_chat_messages").insert({
        user_id: user.id,
        customer_product_id: reqRow.customer_product_id,
        role: "system",
        content: `Ação executada: ${actionType}`,
      });

      return json(200, { success: true, status: "executed", result: execResult });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erro desconhecido";
      await markFailed(supabase, reqRow.id, msg);
      return json(500, { error: msg });
    }
  } catch (e) {
    console.error("financial-agent-actions error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Erro desconhecido" });
  }
});

async function markFailed(supabase: any, id: string, error: string) {
  await supabase
    .from("financial_agent_action_requests")
    .update({ status: "failed", executed_at: new Date().toISOString(), error })
    .eq("id", id);
}

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
