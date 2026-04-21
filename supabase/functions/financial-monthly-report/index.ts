// Edge Function: financial-monthly-report
// Cron: dia 1 de cada mês 06h UTC. Gera resumo consolidado do mês anterior
// (DRE, Fluxo, Aging, Metas, Insights) e envia por email com link para PDF
// gerado no frontend (ou anexado como HTML inline).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const fmtBRL = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const monthLabel = (y: number, m: number) =>
  new Date(y, m - 1, 1).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

async function sendEmail(to: string, subject: string, html: string) {
  if (!RESEND_API_KEY) return { ok: false, error: "no_resend_key" };
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
}

function buildReportHtml(p: {
  periodLabel: string;
  income: number;
  expense: number;
  net: number;
  margin: number;
  receivablesOpen: number;
  payablesOpen: number;
  agingBuckets: { label: string; total: number }[];
  goals: { name: string; current: number; target: number; pct: number }[];
  insights: { title: string; severity: string; impact: number }[];
  topCategories: { category: string; total: number }[];
}) {
  const sevColor: Record<string, string> = {
    critical: "#dc2626",
    high: "#ea580c",
    medium: "#ca8a04",
    low: "#65a30d",
  };
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:680px;margin:0 auto;padding:24px;background:#f9fafb;border-radius:12px;color:#111827">
    <h1 style="color:#107a57;margin:0 0 8px;font-size:24px">Relatório Mensal Consolidado</h1>
    <p style="margin:0 0 24px;color:#6b7280;text-transform:capitalize">${p.periodLabel}</p>

    <h2 style="font-size:16px;color:#107a57;margin:24px 0 12px;border-bottom:2px solid #107a57;padding-bottom:4px">📊 Resumo (DRE)</h2>
    <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden">
      <tr><td style="padding:10px 16px;color:#6b7280">Receitas</td><td style="padding:10px 16px;text-align:right;font-weight:600;color:#107a57">${fmtBRL(p.income)}</td></tr>
      <tr><td style="padding:10px 16px;color:#6b7280">Despesas</td><td style="padding:10px 16px;text-align:right;font-weight:600;color:#dc2626">${fmtBRL(p.expense)}</td></tr>
      <tr style="background:#f3f4f6"><td style="padding:10px 16px;font-weight:700">Resultado líquido</td><td style="padding:10px 16px;text-align:right;font-weight:700;color:${p.net >= 0 ? "#107a57" : "#dc2626"}">${fmtBRL(p.net)}</td></tr>
      <tr><td style="padding:10px 16px;color:#6b7280">Margem líquida</td><td style="padding:10px 16px;text-align:right;font-weight:600">${p.margin.toFixed(1)}%</td></tr>
    </table>

    <h2 style="font-size:16px;color:#107a57;margin:24px 0 12px;border-bottom:2px solid #107a57;padding-bottom:4px">💸 Fluxo em aberto</h2>
    <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden">
      <tr><td style="padding:10px 16px;color:#6b7280">A receber em aberto</td><td style="padding:10px 16px;text-align:right;font-weight:600;color:#107a57">${fmtBRL(p.receivablesOpen)}</td></tr>
      <tr><td style="padding:10px 16px;color:#6b7280">A pagar em aberto</td><td style="padding:10px 16px;text-align:right;font-weight:600;color:#dc2626">${fmtBRL(p.payablesOpen)}</td></tr>
    </table>

    ${p.agingBuckets.length ? `
    <h2 style="font-size:16px;color:#107a57;margin:24px 0 12px;border-bottom:2px solid #107a57;padding-bottom:4px">📅 Aging — Recebíveis vencidos</h2>
    <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden">
      ${p.agingBuckets.map(b => `<tr><td style="padding:10px 16px;color:#6b7280">${b.label}</td><td style="padding:10px 16px;text-align:right;font-weight:600">${fmtBRL(b.total)}</td></tr>`).join("")}
    </table>` : ""}

    ${p.topCategories.length ? `
    <h2 style="font-size:16px;color:#107a57;margin:24px 0 12px;border-bottom:2px solid #107a57;padding-bottom:4px">🏷️ Top categorias de despesa</h2>
    <table style="width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden">
      ${p.topCategories.map(c => `<tr><td style="padding:10px 16px;color:#6b7280">${c.category || "—"}</td><td style="padding:10px 16px;text-align:right;font-weight:600;color:#dc2626">${fmtBRL(c.total)}</td></tr>`).join("")}
    </table>` : ""}

    ${p.goals.length ? `
    <h2 style="font-size:16px;color:#107a57;margin:24px 0 12px;border-bottom:2px solid #107a57;padding-bottom:4px">🎯 Metas</h2>
    ${p.goals.map(g => `
      <div style="background:#fff;border-radius:8px;padding:12px 16px;margin-bottom:8px">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px">
          <strong>${g.name}</strong>
          <span style="color:${g.pct >= 100 ? "#107a57" : "#6b7280"}">${g.pct.toFixed(0)}%</span>
        </div>
        <div style="background:#e5e7eb;border-radius:4px;height:8px;overflow:hidden">
          <div style="width:${Math.min(g.pct, 100)}%;height:100%;background:${g.pct >= 100 ? "#107a57" : "#3b82f6"}"></div>
        </div>
        <p style="margin:6px 0 0;font-size:12px;color:#6b7280">${fmtBRL(g.current)} / ${fmtBRL(g.target)}</p>
      </div>
    `).join("")}` : ""}

    ${p.insights.length ? `
    <h2 style="font-size:16px;color:#107a57;margin:24px 0 12px;border-bottom:2px solid #107a57;padding-bottom:4px">💡 Insights detectados</h2>
    ${p.insights.map(i => `
      <div style="background:#fff;border-left:4px solid ${sevColor[i.severity] || "#6b7280"};border-radius:4px;padding:10px 14px;margin-bottom:8px">
        <strong>${i.title}</strong>
        ${i.impact > 0 ? `<div style="color:#6b7280;font-size:12px;margin-top:4px">Impacto: ${fmtBRL(i.impact)}</div>` : ""}
      </div>
    `).join("")}` : ""}

    <p style="color:#6b7280;font-size:12px;margin-top:32px;text-align:center">NovaLink · Agente Financeiro · Gerado automaticamente</p>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Permitir override do mês via body (admin testing)
    let body: any = {};
    try { body = await req.json(); } catch { /* sem body */ }

    const today = new Date();
    // Mês de referência = mês anterior (a função roda no dia 1)
    const refDate = body?.year && body?.month
      ? new Date(body.year, body.month - 1, 1)
      : new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const year = refDate.getFullYear();
    const month = refDate.getMonth() + 1;
    const firstDay = new Date(year, month - 1, 1).toISOString().slice(0, 10);
    const lastDay = new Date(year, month, 0).toISOString().slice(0, 10);
    const periodLabel = monthLabel(year, month);

    const { data: cps } = await admin
      .from("customer_products")
      .select("id, user_id")
      .eq("product_slug", "agente-financeiro")
      .eq("is_active", true);

    if (!cps?.length) {
      return new Response(
        JSON.stringify({ ok: true, message: "no_active_products" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let sent = 0, failed = 0;

    for (const cp of cps) {
      const { data: userResp } = await admin.auth.admin.getUserById(cp.user_id);
      const email = userResp?.user?.email;
      if (!email) continue;

      // Transações do mês
      const { data: txs } = await admin
        .from("financial_agent_transactions")
        .select("type, amount, category")
        .eq("customer_product_id", cp.id)
        .gte("date", firstDay)
        .lte("date", lastDay);

      let income = 0, expense = 0;
      const catMap = new Map<string, number>();
      for (const t of txs ?? []) {
        const a = Number(t.amount) || 0;
        if (t.type === "income") income += a;
        else if (t.type === "expense") {
          expense += a;
          catMap.set(t.category || "Sem categoria", (catMap.get(t.category || "Sem categoria") ?? 0) + a);
        }
      }
      const net = income - expense;
      const margin = income > 0 ? (net / income) * 100 : 0;
      const topCategories = [...catMap.entries()]
        .map(([category, total]) => ({ category, total }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

      // A receber em aberto (status sent ou overdue, qualquer data)
      const { data: recvOpen } = await admin
        .from("financial_receivables")
        .select("total, due_date, status")
        .eq("customer_product_id", cp.id)
        .in("status", ["sent", "overdue"]);
      const receivablesOpen = (recvOpen ?? []).reduce((s, r) => s + Number(r.total || 0), 0);

      // A pagar em aberto
      const { data: payOpen } = await admin
        .from("financial_agent_invoices")
        .select("amount")
        .eq("customer_product_id", cp.id)
        .in("status", ["pending", "overdue"]);
      const payablesOpen = (payOpen ?? []).reduce((s, r) => s + Number(r.amount || 0), 0);

      // Aging recebíveis vencidos
      const todayMs = Date.now();
      const buckets = { "1-15 dias": 0, "16-30 dias": 0, "31-60 dias": 0, "60+ dias": 0 };
      for (const r of recvOpen ?? []) {
        if (!r.due_date) continue;
        const diff = Math.floor((todayMs - new Date(r.due_date).getTime()) / 86400000);
        if (diff <= 0) continue;
        const v = Number(r.total || 0);
        if (diff <= 15) buckets["1-15 dias"] += v;
        else if (diff <= 30) buckets["16-30 dias"] += v;
        else if (diff <= 60) buckets["31-60 dias"] += v;
        else buckets["60+ dias"] += v;
      }
      const agingBuckets = Object.entries(buckets)
        .filter(([, v]) => v > 0)
        .map(([label, total]) => ({ label, total }));

      // Metas
      const { data: goalsData } = await admin
        .from("financial_agent_goals")
        .select("name, current_amount, target_amount")
        .eq("customer_product_id", cp.id);
      const goals = (goalsData ?? []).map(g => ({
        name: g.name,
        current: Number(g.current_amount || 0),
        target: Number(g.target_amount || 0),
        pct: Number(g.target_amount) > 0
          ? (Number(g.current_amount) / Number(g.target_amount)) * 100
          : 0,
      }));

      // Insights do mês
      const { data: insightsData } = await admin
        .from("financial_insights")
        .select("title, severity, impact_brl")
        .eq("customer_product_id", cp.id)
        .gte("detected_at", firstDay)
        .lte("detected_at", lastDay + "T23:59:59")
        .order("severity", { ascending: false })
        .limit(8);
      const insights = (insightsData ?? []).map(i => ({
        title: i.title,
        severity: i.severity,
        impact: Number(i.impact_brl || 0),
      }));

      const html = buildReportHtml({
        periodLabel, income, expense, net, margin,
        receivablesOpen, payablesOpen, agingBuckets,
        goals, insights, topCategories,
      });

      const subject = `📊 Relatório Mensal — ${periodLabel}`;
      const r = await sendEmail(email, subject, html);

      await admin.from("financial_notifications").insert({
        customer_product_id: cp.id,
        notification_type: "monthly_report",
        channel: "email",
        recipient: email,
        subject,
        message: `Relatório mensal de ${periodLabel}`,
        status: r.ok ? "sent" : "failed",
        sent_at: r.ok ? new Date().toISOString() : null,
        error_message: r.ok ? null : JSON.stringify(r.data ?? r.error).slice(0, 500),
        metadata: { period: `${year}-${String(month).padStart(2, "0")}`, income, expense, net },
      });

      if (r.ok) sent++; else failed++;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        period: `${year}-${String(month).padStart(2, "0")}`,
        reports_sent: sent,
        reports_failed: failed,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("[financial-monthly-report]", e);
    return new Response(JSON.stringify({ error: String((e as Error)?.message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
