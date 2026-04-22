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
    if (reqRow.status !== "pending") return json(400, { error: "Solicitação já decidida" });

    const decidedAt = new Date().toISOString();
    const { error: updErr } = await supabase
      .from("financial_agent_action_requests")
      .update({ status: body.decision, decided_at: decidedAt, decision_by: user.id })
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

    const actionType = String(reqRow.action_type || "");
    const payload = (reqRow.payload || {}) as any;
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
      const execResult = await executeAction(supabase, user.id, cpId, actionType, payload);

      await supabase
        .from("financial_agent_action_requests")
        .update({ status: "executed", executed_at: new Date().toISOString(), result: execResult ?? null })
        .eq("id", reqRow.id);

      await supabase.from("financial_agent_chat_messages").insert({
        user_id: user.id,
        customer_product_id: cpId,
        role: "system",
        content: `✅ Ação executada: ${actionType}`,
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

async function executeAction(supabase: any, userId: string, cpId: string, actionType: string, payload: any) {
  const owned = (q: any) => q.eq("customer_product_id", cpId);

  switch (actionType) {
    // ====== METAS ======
    case "goal_create": {
      requireFields(payload, ["name", "target_amount"]);
      const { data, error } = await supabase.from("financial_agent_goals").insert({
        customer_product_id: cpId,
        name: payload.name,
        target_amount: payload.target_amount,
        current_amount: payload.current_amount ?? 0,
        deadline: payload.deadline ?? null,
        status: payload.status ?? "active",
      }).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "goal_update": {
      requireFields(payload, ["id"]);
      const upd = pick(payload, ["name", "target_amount", "current_amount", "deadline", "status"]);
      const { data, error } = await owned(supabase.from("financial_agent_goals").update(upd).eq("id", payload.id)).select().maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }
    case "goal_delete": {
      requireFields(payload, ["id"]);
      const { error } = await owned(supabase.from("financial_agent_goals").delete().eq("id", payload.id));
      if (error) throw new Error(error.message);
      return { deleted: true };
    }

    // ====== TRANSAÇÕES ======
    case "transaction_create": {
      requireFields(payload, ["type", "amount"]);
      if (!["income", "expense"].includes(payload.type)) throw new Error("type deve ser income ou expense");
      const { data, error } = await supabase.from("financial_agent_transactions").insert({
        customer_product_id: cpId,
        type: payload.type,
        amount: payload.amount,
        description: payload.description ?? null,
        date: payload.date ?? new Date().toISOString().slice(0, 10),
        category: payload.category ?? null,
        payment_method: payload.payment_method ?? null,
        tags: payload.tags ?? null,
        source: payload.source ?? "agent",
      }).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "transaction_update": {
      requireFields(payload, ["id"]);
      const upd = pick(payload, ["type", "amount", "description", "date", "category", "payment_method", "tags"]);
      const { data, error } = await owned(supabase.from("financial_agent_transactions").update(upd).eq("id", payload.id)).select().maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }
    case "transaction_delete": {
      requireFields(payload, ["id"]);
      const { error } = await owned(supabase.from("financial_agent_transactions").delete().eq("id", payload.id));
      if (error) throw new Error(error.message);
      return { deleted: true };
    }

    // ====== FATURAS / CONTAS A PAGAR ======
    case "invoice_create": {
      requireFields(payload, ["title", "amount", "due_date"]);
      const { data, error } = await supabase.from("financial_agent_invoices").insert({
        customer_product_id: cpId,
        title: payload.title,
        amount: payload.amount,
        due_date: payload.due_date,
        supplier: payload.supplier ?? null,
        category: payload.category ?? null,
        status: payload.status ?? "pending",
        recurring: !!payload.recurring,
        recurring_interval: payload.recurring_interval ?? null,
        notes: payload.notes ?? null,
        source: payload.source ?? "agent",
      }).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "invoice_update": {
      requireFields(payload, ["id"]);
      const upd = pick(payload, ["title", "amount", "due_date", "supplier", "category", "status", "recurring", "recurring_interval", "notes", "payment_method", "paid_amount"]);
      const { data, error } = await owned(supabase.from("financial_agent_invoices").update(upd).eq("id", payload.id)).select().maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }
    case "invoice_delete": {
      requireFields(payload, ["id"]);
      const { error } = await owned(supabase.from("financial_agent_invoices").delete().eq("id", payload.id));
      if (error) throw new Error(error.message);
      return { deleted: true };
    }
    case "invoice_mark_paid": {
      requireFields(payload, ["id"]);
      const { data: inv } = await owned(supabase.from("financial_agent_invoices").select("amount").eq("id", payload.id)).maybeSingle();
      const upd: any = { status: "paid", paid_amount: payload.paid_amount ?? Number(inv?.amount ?? 0) };
      if (payload.payment_method) upd.payment_method = payload.payment_method;
      const { data, error } = await owned(supabase.from("financial_agent_invoices").update(upd).eq("id", payload.id)).select().maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }

    // ====== RECEBÍVEIS ======
    case "receivable_create": {
      requireFields(payload, ["client_name", "total", "due_date"]);
      const { data: numData } = await supabase.rpc("next_invoice_number", { _cp_id: cpId });
      const invoice_number = payload.invoice_number ?? numData ?? `FAT-${Date.now()}`;
      const { data, error } = await supabase.from("financial_receivables").insert({
        customer_product_id: cpId,
        invoice_number,
        client_name: payload.client_name,
        client_email: payload.client_email ?? null,
        client_phone: payload.client_phone ?? null,
        client_document: payload.client_document ?? null,
        client_address: payload.client_address ?? null,
        status: payload.status ?? "draft",
        subtotal: payload.subtotal ?? payload.total,
        discount: payload.discount ?? 0,
        tax: payload.tax ?? 0,
        total: payload.total,
        paid_amount: payload.paid_amount ?? 0,
        due_date: payload.due_date,
        notes: payload.notes ?? null,
      }).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "receivable_update": {
      requireFields(payload, ["id"]);
      const upd = pick(payload, ["client_name", "client_email", "client_phone", "client_document", "status", "subtotal", "discount", "tax", "total", "due_date", "notes", "payment_method", "paid_amount"]);
      const { data, error } = await owned(supabase.from("financial_receivables").update(upd).eq("id", payload.id)).select().maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }
    case "receivable_delete": {
      requireFields(payload, ["id"]);
      const { error } = await owned(supabase.from("financial_receivables").delete().eq("id", payload.id));
      if (error) throw new Error(error.message);
      return { deleted: true };
    }
    case "receivable_mark_paid": {
      requireFields(payload, ["id"]);
      const { data: rec } = await owned(supabase.from("financial_receivables").select("total").eq("id", payload.id)).maybeSingle();
      const upd: any = { status: "paid", paid_amount: payload.paid_amount ?? Number(rec?.total ?? 0), paid_at: new Date().toISOString() };
      if (payload.payment_method) upd.payment_method = payload.payment_method;
      const { data, error } = await owned(supabase.from("financial_receivables").update(upd).eq("id", payload.id)).select().maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }

    // ====== COTAÇÕES / ORÇAMENTOS ======
    case "quote_create": {
      requireFields(payload, ["client_name", "total"]);
      const { data: numData } = await supabase.rpc("next_quote_number", { _cp_id: cpId });
      const quote_number = payload.quote_number ?? numData ?? `ORC-${Date.now()}`;
      const { data: quote, error } = await supabase.from("financial_quotes").insert({
        customer_product_id: cpId,
        quote_number,
        client_name: payload.client_name,
        client_email: payload.client_email ?? null,
        client_phone: payload.client_phone ?? null,
        client_document: payload.client_document ?? null,
        client_address: payload.client_address ?? null,
        status: payload.status ?? "draft",
        subtotal: payload.subtotal ?? payload.total,
        discount: payload.discount ?? 0,
        tax: payload.tax ?? 0,
        total: payload.total,
        valid_until: payload.valid_until ?? null,
        notes: payload.notes ?? null,
        terms: payload.terms ?? null,
      }).select().single();
      if (error) throw new Error(error.message);

      if (Array.isArray(payload.items) && payload.items.length) {
        const items = payload.items.map((it: any, i: number) => ({
          quote_id: quote.id,
          description: it.description ?? "Item",
          quantity: it.quantity ?? 1,
          unit_price: it.unit_price ?? 0,
          discount: it.discount ?? 0,
          total: it.total ?? Number(it.quantity ?? 1) * Number(it.unit_price ?? 0) - Number(it.discount ?? 0),
          sort_order: i,
        }));
        const { error: itemsErr } = await supabase.from("financial_quote_items").insert(items);
        if (itemsErr) throw new Error(itemsErr.message);
      }
      return quote;
    }
    case "quote_update": {
      requireFields(payload, ["id"]);
      const upd = pick(payload, ["client_name", "client_email", "client_phone", "client_document", "status", "subtotal", "discount", "tax", "total", "valid_until", "notes", "terms"]);
      const { data, error } = await owned(supabase.from("financial_quotes").update(upd).eq("id", payload.id)).select().maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }
    case "quote_delete": {
      requireFields(payload, ["id"]);
      const { error } = await owned(supabase.from("financial_quotes").delete().eq("id", payload.id));
      if (error) throw new Error(error.message);
      return { deleted: true };
    }
    case "quote_mark_status": {
      requireFields(payload, ["id", "status"]);
      const upd: any = { status: payload.status };
      if (payload.status === "sent") upd.sent_at = new Date().toISOString();
      if (payload.status === "approved") upd.approved_at = new Date().toISOString();
      if (payload.status === "rejected") upd.rejected_at = new Date().toISOString();
      const { data, error } = await owned(supabase.from("financial_quotes").update(upd).eq("id", payload.id)).select().maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }

    // ====== IMPOSTOS DAS ======
    case "das_create": {
      requireFields(payload, ["regime", "competencia_month", "competencia_year", "revenue_month", "aliquota_efetiva", "total_amount", "due_date"]);
      const { data, error } = await supabase.from("financial_das_guides").insert({
        customer_product_id: cpId,
        user_id: userId,
        regime: payload.regime,
        anexo: payload.anexo ?? null,
        competencia_month: payload.competencia_month,
        competencia_year: payload.competencia_year,
        revenue_month: payload.revenue_month,
        revenue_12m: payload.revenue_12m ?? 0,
        aliquota_efetiva: payload.aliquota_efetiva,
        total_amount: payload.total_amount,
        tax_breakdown: payload.tax_breakdown ?? {},
        due_date: payload.due_date,
        payment_status: payload.payment_status ?? "pending",
        notes: payload.notes ?? null,
      }).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "das_mark_paid": {
      requireFields(payload, ["id"]);
      const { data, error } = await owned(supabase.from("financial_das_guides").update({
        payment_status: "paid",
        paid_at: payload.paid_at ?? new Date().toISOString(),
      }).eq("id", payload.id)).select().maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }
    case "das_delete": {
      requireFields(payload, ["id"]);
      const { error } = await owned(supabase.from("financial_das_guides").delete().eq("id", payload.id));
      if (error) throw new Error(error.message);
      return { deleted: true };
    }

    // ====== CALENDÁRIO / RECORRENTES ======
    case "calendar_create": {
      requireFields(payload, ["title", "event_date", "event_type"]);
      const { data, error } = await supabase.from("financial_calendar_events").insert({
        customer_product_id: cpId,
        title: payload.title,
        description: payload.description ?? null,
        event_date: payload.event_date,
        amount: payload.amount ?? 0,
        event_type: payload.event_type,
        status: payload.status ?? "pending",
        category: payload.category ?? null,
        recurring: !!payload.recurring,
        recurring_interval: payload.recurring_interval ?? null,
        recurring_until: payload.recurring_until ?? null,
      }).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
    case "calendar_update": {
      requireFields(payload, ["id"]);
      const upd = pick(payload, ["title", "description", "event_date", "amount", "event_type", "status", "category", "recurring", "recurring_interval", "recurring_until"]);
      const { data, error } = await owned(supabase.from("financial_calendar_events").update(upd).eq("id", payload.id)).select().maybeSingle();
      if (error) throw new Error(error.message);
      return data;
    }
    case "calendar_delete": {
      requireFields(payload, ["id"]);
      const { error } = await owned(supabase.from("financial_calendar_events").delete().eq("id", payload.id));
      if (error) throw new Error(error.message);
      return { deleted: true };
    }

    default:
      throw new Error(`Ação não suportada: ${actionType}`);
  }
}

function requireFields(payload: any, fields: string[]) {
  const missing = fields.filter((f) => payload?.[f] === undefined || payload?.[f] === null || payload?.[f] === "");
  if (missing.length) throw new Error(`Campos obrigatórios ausentes: ${missing.join(", ")}`);
}

function pick(obj: any, keys: string[]) {
  const out: any = {};
  for (const k of keys) if (obj?.[k] !== undefined) out[k] = obj[k];
  return out;
}

async function markFailed(supabase: any, id: string, error: string) {
  await supabase
    .from("financial_agent_action_requests")
    .update({ status: "failed", executed_at: new Date().toISOString(), result: { error } })
    .eq("id", id);
}

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
