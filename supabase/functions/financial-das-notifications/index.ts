// Edge Function: financial-das-notifications
// Cron diário: marca guias vencidas e envia lembretes em D-5, D-2, D-0.
// Pode ser chamada manualmente (admin) ou via pg_cron / Supabase Scheduler.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const REMINDER_DAYS = [5, 2, 0];

function fmtBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return { ok: false, error: "RESEND_API_KEY não configurada" };
  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "NovaLink <noreply@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });
  const data = await r.json().catch(() => ({}));
  return { ok: r.ok, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // 1) Marcar como vencidas (due_date < hoje e ainda 'pending')
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    const { data: overdue } = await admin
      .from("financial_das_guides")
      .update({ payment_status: "overdue" })
      .lt("due_date", todayStr)
      .eq("payment_status", "pending")
      .select("id");

    // 2) Buscar guias pendentes que vencem em D-5, D-2 ou hoje
    const targetDates = REMINDER_DAYS.map((d) => {
      const dt = new Date(today);
      dt.setDate(dt.getDate() + d);
      return { days: d, str: dt.toISOString().slice(0, 10) };
    });

    let sent = 0;
    let failed = 0;

    for (const t of targetDates) {
      const { data: guides } = await admin
        .from("financial_das_guides")
        .select("id, user_id, customer_product_id, due_date, total_amount, regime, anexo, pdf_url, competencia_month, competencia_year")
        .eq("due_date", t.str)
        .eq("payment_status", "pending");

      if (!guides?.length) continue;

      for (const g of guides) {
        if (!g.user_id) continue;

        // Evita duplicidade no mesmo dia
        const { data: existing } = await admin
          .from("financial_das_notifications")
          .select("id")
          .eq("das_guide_id", g.id)
          .eq("days_before", t.days)
          .maybeSingle();
        if (existing) continue;

        // Email do usuário
        const { data: userResp } = await admin.auth.admin.getUserById(g.user_id);
        const email = userResp?.user?.email;

        const subject =
          t.days === 0
            ? `⚠️ Sua DAS vence HOJE — ${fmtBRL(Number(g.total_amount))}`
            : `Sua DAS vence em ${t.days} dia${t.days > 1 ? "s" : ""}`;

        const html = `
          <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px">
            <h2 style="color:#107a57;margin:0 0 16px">Lembrete de pagamento DAS</h2>
            <p>Olá! Sua guia DAS de <strong>${String(g.competencia_month).padStart(2,"0")}/${g.competencia_year}</strong> ${t.days === 0 ? "<strong>vence hoje</strong>" : `vence em <strong>${t.days} dia(s)</strong>`}.</p>
            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0">
              <p style="margin:0;color:#6b7280;font-size:13px">Valor total</p>
              <p style="margin:4px 0 0;font-size:24px;font-weight:700;color:#107a57">${fmtBRL(Number(g.total_amount))}</p>
              <p style="margin:8px 0 0;color:#6b7280;font-size:13px">Vencimento: ${new Date(g.due_date).toLocaleDateString("pt-BR")}</p>
              <p style="margin:4px 0 0;color:#6b7280;font-size:13px">Regime: ${String(g.regime).toUpperCase()}${g.anexo ? ` · ${g.anexo}` : ""}</p>
            </div>
            ${g.pdf_url ? `<a href="${g.pdf_url}" style="display:inline-block;background:#107a57;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Baixar guia PDF</a>` : ""}
            <p style="color:#6b7280;font-size:12px;margin-top:24px">Esta é uma guia interna de controle. Para o pagamento oficial, utilize o portal PGDAS-D.</p>
          </div>
        `;

        let okSent = false;
        let errMsg: string | null = null;
        if (email) {
          const r = await sendEmail(email, subject, html);
          okSent = !!r.ok;
          if (!r.ok) errMsg = JSON.stringify(r.data).slice(0, 500);
        } else {
          errMsg = "email_not_found";
        }

        await admin.from("financial_das_notifications").insert({
          das_guide_id: g.id,
          user_id: g.user_id,
          channel: "email",
          status: okSent ? "sent" : "failed",
          days_before: t.days,
          error_message: errMsg,
        });

        if (okSent) sent++;
        else failed++;
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        marked_overdue: overdue?.length ?? 0,
        emails_sent: sent,
        emails_failed: failed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[financial-das-notifications]", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
