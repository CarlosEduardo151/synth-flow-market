import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { executeFinancialAction } from "../_shared/financial-actions.ts";

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
    if (req.method !== "POST") return json(405, { error: "Method not allowed" });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!jwt) return json(401, { error: "Unauthorized" });

    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
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

    // Idempotência: se já foi decidida, devolve o estado atual em 200 sem erro
    if (reqRow.status !== "pending") {
      return json(200, {
        success: true,
        status: reqRow.status,
        message: `Esta ação já foi ${reqRow.status}.`,
      });
    }

    const { error: updErr } = await supabase
      .from("financial_agent_action_requests")
      .update({ status: body.decision })
      .eq("id", reqRow.id);
    if (updErr) return json(500, { error: updErr.message });

    if (body.decision === "rejected") {
      await supabase.from("financial_agent_chat_messages").insert({
        user_id: user.id,
        customer_product_id: reqRow.customer_product_id,
        role: "system",
        content: `Ação rejeitada: ${reqRow.action_type}`,
      });
      return json(200, { success: true, status: "rejected" });
    }

    const cpId = reqRow.customer_product_id as string;
    const { data: cp } = await supabase
      .from("customer_products")
      .select("id, user_id, is_active")
      .eq("id", cpId)
      .maybeSingle();
    if (!cp || cp.user_id !== user.id || !cp.is_active) {
      await markFailed(supabase, reqRow.id, "Produto inativo ou sem acesso");
      return json(403, { error: "Produto inativo ou sem acesso" });
    }

    try {
      const execResult = await executeFinancialAction(
        supabase,
        user.id,
        cpId,
        String(reqRow.action_type || ""),
        (reqRow.payload || {}) as any,
      );

      await supabase
        .from("financial_agent_action_requests")
        .update({ status: "executed", result: execResult ?? null })
        .eq("id", reqRow.id);

      await supabase.from("financial_agent_chat_messages").insert({
        user_id: user.id,
        customer_product_id: cpId,
        role: "system",
        content: `✅ Ação executada: ${reqRow.action_type}`,
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
    .update({ status: "failed", result: { error } })
    .eq("id", id);
}

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
