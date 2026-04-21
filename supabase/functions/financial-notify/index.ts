// Edge Function: financial-notify
// Cron diário (08h UTC). Envia email + WhatsApp para:
// - Vencimentos D-3 / D-1 / D0 (payables + receivables)
// - Saldo baixo (< 10% da média mensal)
// - Metas atingidas (current >= target, status='active')
// - Anomalias críticas (financial_insights severity='critical', status='open')

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const EVOLUTION_URL = Deno.env.get("EVOLUTION_API_URL");
const EVOLUTION_KEY = Deno.env.get("EVOLUTION_GLOBAL_APIKEY");
const REMINDER_DAYS = [3, 1, 0];

const fmtBRL = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const fmtDate = (d: string) => new Date(d).toLocaleDateString("pt-BR");

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return { ok: false, error: "no_resend_key" };
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "NovaLink Financeiro <noreply@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
    const data = await r.json().catch(() => ({}));
    return { ok: r.ok, data };
  } catch (e) {
    return { ok: false, error: String((e as Error).message) };
  }
}

async function sendWhatsApp(phone: string, message: string, instance: string) {
  if (!EVOLUTION_URL || !EVOLUTION_KEY) return { ok: false, error: "no_evolution" };
  try {
    const r = await fetch(`${EVOLUTION_URL}/message/sendText/${instance}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: EVOLUTION_KEY,
      },
      body: JSON.stringify({
        number: phone.replace(/\D/g, ""),
        text: message,
      }),
    });
    return { ok: r.ok, data: await r.json().catch(() => ({})) };
  } catch (e) {
    return { ok: false, error: String((e as Error).message) };
  }
}

function emailWrap(title: string, bodyHtml: string) {
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px">
    <h2 style="color:#107a57;margin:0 0 16px">${title}</h2>
    ${bodyHtml}
    <p style="color:#6b7280;font-size:12px;margin-top:24px">NovaLink · Agente Financeiro</p>
  </div>`;
}

async function logNotification(admin: any, n: {
  customer_product_id: string;
  notification_type: string;
  channel: string;
  recipient: string;
  subject?: string;
  message: string;
  status: string;
  error_message?: string | null;
  metadata?: any;
}) {
  await admin.from("financial_notifications").insert({
    ...n,
    sent_at: n.status === "sent" ? new Date().toISOString() : null,
  });
}

async function alreadyNotified(admin: any, cp: string, type: string, key: string) {
  const { data } = await admin
    .from("financial_notifications")
    .select("id")
    .eq("customer_product_id", cp)
    .eq("notification_type", type)
    .contains("metadata", { key })
    .gte("created_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString())
    .maybeSingle();
  return !!data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    let emailsSent = 0, emailsFailed = 0, waSent = 0, waFailed = 0;

    // Buscar todos os customer_products do agente financeiro ativos
    const { data: cps } = await admin
      .from("customer_products")
      .select("id, user_id, product_slug")
      .eq("product_slug", "agente-financeiro")
      .eq("is_active", true);

    if (!cps?.length) {
      return new Response(
        JSON.stringify({ ok: true, message: "no_active_products" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    for (const cp of cps) {
      // Email do dono
      const { data: userResp } = await admin.auth.admin.getUserById(cp.user_id);
      const ownerEmail = userResp?.user?.email;
      if (!ownerEmail) continue;

      // ============ 1) VENCIMENTOS (payables + receivables) ============
      for (const days of REMINDER_DAYS) {
        const target = new Date(today);
        target.setDate(target.getDate() + days);
        const targetStr = target.toISOString().slice(0, 10);

        // Payables (a pagar)
        const { data: payables } = await admin
          .from("financial_agent_invoices")
          .select("id, title, amount, due_date, supplier")
          .eq("customer_product_id", cp.id)
          .eq("status", "pending")
          .eq("due_date", targetStr);

        for (const p of payables ?? []) {
          const key = `payable:${p.id}:${days}`;
          if (await alreadyNotified(admin, cp.id, "due_payable", key)) continue;

          const when = days === 0 ? "vence HOJE" : `vence em ${days} dia(s)`;
          const subject = `💸 Conta a pagar ${when} — ${fmtBRL(Number(p.amount))}`;
          const html = emailWrap("Lembrete de pagamento", `
            <p><strong>${p.title}</strong>${p.supplier ? ` (${p.supplier})` : ""} ${when}.</p>
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:0;color:#6b7280;font-size:13px">Valor</p>
              <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#dc2626">${fmtBRL(Number(p.amount))}</p>
              <p style="margin:8px 0 0;color:#6b7280;font-size:13px">Vencimento: ${fmtDate(p.due_date)}</p>
            </div>
          `);

          const r = await sendEmail(ownerEmail, subject, html);
          await logNotification(admin, {
            customer_product_id: cp.id,
            notification_type: "due_payable",
            channel: "email",
            recipient: ownerEmail,
            subject,
            message: `${p.title} — ${fmtBRL(Number(p.amount))} ${when}`,
            status: r.ok ? "sent" : "failed",
            error_message: r.ok ? null : JSON.stringify(r.data ?? r.error).slice(0, 500),
            metadata: { key, days, payable_id: p.id },
          });
          if (r.ok) emailsSent++; else emailsFailed++;
        }

        // Receivables (a receber)
        const { data: receivables } = await admin
          .from("financial_receivables")
          .select("id, invoice_number, total, due_date, customer_name")
          .eq("customer_product_id", cp.id)
          .eq("status", "sent")
          .eq("due_date", targetStr);

        for (const r2 of receivables ?? []) {
          const key = `recv:${r2.id}:${days}`;
          if (await alreadyNotified(admin, cp.id, "due_receivable", key)) continue;

          const when = days === 0 ? "vence HOJE" : `vence em ${days} dia(s)`;
          const subject = `💰 A receber ${when} — ${fmtBRL(Number(r2.total))}`;
          const html = emailWrap("Cobrança a vencer", `
            <p>Fatura <strong>${r2.invoice_number}</strong>${r2.customer_name ? ` para ${r2.customer_name}` : ""} ${when}.</p>
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:0;color:#6b7280;font-size:13px">Valor</p>
              <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#107a57">${fmtBRL(Number(r2.total))}</p>
              <p style="margin:8px 0 0;color:#6b7280;font-size:13px">Vencimento: ${fmtDate(r2.due_date)}</p>
            </div>
          `);

          const rr = await sendEmail(ownerEmail, subject, html);
          await logNotification(admin, {
            customer_product_id: cp.id,
            notification_type: "due_receivable",
            channel: "email",
            recipient: ownerEmail,
            subject,
            message: `${r2.invoice_number} — ${fmtBRL(Number(r2.total))} ${when}`,
            status: rr.ok ? "sent" : "failed",
            error_message: rr.ok ? null : JSON.stringify(rr.data ?? rr.error).slice(0, 500),
            metadata: { key, days, receivable_id: r2.id },
          });
          if (rr.ok) emailsSent++; else emailsFailed++;
        }
      }

      // ============ 2) METAS ATINGIDAS ============
      const { data: goals } = await admin
        .from("financial_agent_goals")
        .select("id, name, target_amount, current_amount, status")
        .eq("customer_product_id", cp.id)
        .eq("status", "active");

      for (const g of goals ?? []) {
        if (Number(g.current_amount) < Number(g.target_amount)) continue;
        const key = `goal:${g.id}`;
        if (await alreadyNotified(admin, cp.id, "goal_reached", key)) continue;

        const subject = `🎯 Meta atingida: ${g.name}`;
        const html = emailWrap("Parabéns! Meta atingida", `
          <p>A meta <strong>${g.name}</strong> foi atingida.</p>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:0;color:#6b7280;font-size:13px">Acumulado</p>
            <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#107a57">${fmtBRL(Number(g.current_amount))} / ${fmtBRL(Number(g.target_amount))}</p>
          </div>
        `);

        const r = await sendEmail(ownerEmail, subject, html);
        await logNotification(admin, {
          customer_product_id: cp.id,
          notification_type: "goal_reached",
          channel: "email",
          recipient: ownerEmail,
          subject,
          message: `Meta ${g.name} atingida`,
          status: r.ok ? "sent" : "failed",
          error_message: r.ok ? null : JSON.stringify(r.data ?? r.error).slice(0, 500),
          metadata: { key, goal_id: g.id },
        });
        if (r.ok) emailsSent++; else emailsFailed++;

        // Marcar como completed
        await admin.from("financial_agent_goals")
          .update({ status: "completed" })
          .eq("id", g.id);
      }

      // ============ 3) ANOMALIAS CRÍTICAS ============
      const { data: insights } = await admin
        .from("financial_insights")
        .select("id, title, description, impact_brl, severity, insight_type")
        .eq("customer_product_id", cp.id)
        .eq("status", "open")
        .eq("severity", "critical")
        .gte("detected_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString());

      for (const ins of insights ?? []) {
        const key = `insight:${ins.id}`;
        if (await alreadyNotified(admin, cp.id, "critical_insight", key)) continue;

        const subject = `🚨 Alerta crítico: ${ins.title}`;
        const html = emailWrap("Anomalia detectada", `
          <p><strong>${ins.title}</strong></p>
          <p>${ins.description ?? ""}</p>
          ${Number(ins.impact_brl) > 0 ? `
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:16px;margin:16px 0">
            <p style="margin:0;color:#991b1b;font-size:13px">Impacto estimado</p>
            <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#dc2626">${fmtBRL(Number(ins.impact_brl))}</p>
          </div>` : ""}
        `);

        const r = await sendEmail(ownerEmail, subject, html);
        await logNotification(admin, {
          customer_product_id: cp.id,
          notification_type: "critical_insight",
          channel: "email",
          recipient: ownerEmail,
          subject,
          message: ins.title,
          status: r.ok ? "sent" : "failed",
          error_message: r.ok ? null : JSON.stringify(r.data ?? r.error).slice(0, 500),
          metadata: { key, insight_id: ins.id },
        });
        if (r.ok) emailsSent++; else emailsFailed++;
      }

      // ============ 4) SALDO BAIXO (último snapshot KPI) ============
      const { data: kpi } = await admin
        .from("financial_kpi_snapshots")
        .select("cash_balance, monthly_burn_avg")
        .eq("customer_product_id", cp.id)
        .order("snapshot_date", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (kpi && Number(kpi.monthly_burn_avg) > 0 && Number(kpi.cash_balance) < Number(kpi.monthly_burn_avg) * 0.1) {
        const key = `low_balance:${todayStr}`;
        if (!(await alreadyNotified(admin, cp.id, "low_balance", key))) {
          const subject = `⚠️ Saldo crítico — abaixo de 10% do gasto médio mensal`;
          const html = emailWrap("Saldo em nível crítico", `
            <p>Seu saldo atual está <strong>abaixo de 10%</strong> do gasto médio mensal.</p>
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:0;color:#6b7280;font-size:13px">Saldo atual</p>
              <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#dc2626">${fmtBRL(Number(kpi.cash_balance))}</p>
              <p style="margin:8px 0 0;color:#6b7280;font-size:13px">Gasto médio mensal: ${fmtBRL(Number(kpi.monthly_burn_avg))}</p>
            </div>
          `);
          const r = await sendEmail(ownerEmail, subject, html);
          await logNotification(admin, {
            customer_product_id: cp.id,
            notification_type: "low_balance",
            channel: "email",
            recipient: ownerEmail,
            subject,
            message: "Saldo abaixo de 10% do burn médio",
            status: r.ok ? "sent" : "failed",
            error_message: r.ok ? null : JSON.stringify(r.data ?? r.error).slice(0, 500),
            metadata: { key, balance: kpi.cash_balance, burn: kpi.monthly_burn_avg },
          });
          if (r.ok) emailsSent++; else emailsFailed++;
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        emails_sent: emailsSent,
        emails_failed: emailsFailed,
        whatsapp_sent: waSent,
        whatsapp_failed: waFailed,
        products_processed: cps.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[financial-notify]", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
