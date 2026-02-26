import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

/**
 * Bot Report Sender
 *
 * Actions:
 * - send_report: Generate & send a report for a specific config
 * - send_test: Send a test report immediately
 * - process_scheduled: Check all configs and send due reports (called by cron)
 */

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const service = createClient(supabaseUrl, serviceKey);

    const body = await req.json();
    const action = body.action || "send_report";

    if (action === "process_scheduled") {
      return await processScheduled(service, resendKey);
    }

    // For send_report and send_test, need customer_product_id
    const cpId = body.customer_product_id;
    const configId = body.config_id;

    if (!cpId) {
      return json({ error: "customer_product_id required" }, 400);
    }

    if (action === "send_test") {
      const email = body.email;
      if (!email) return json({ error: "email required" }, 400);

      const reportData = await generateReport(service, cpId, "daily");
      const html = buildReportHTML(reportData, "Relatório de Teste", "test");
      await sendEmail(resendKey, email, "📊 Relatório de Teste — Bot WhatsApp", html);

      return json({ ok: true, message: "Test report sent" });
    }

    if (action === "send_report" && configId) {
      const { data: config } = await service
        .from("bot_report_config")
        .select("*")
        .eq("id", configId)
        .single();

      if (!config) return json({ error: "config not found" }, 404);

      const reportData = await generateReport(service, cpId, config.frequency);
      const periodLabel = getPeriodLabel(config.frequency);
      const subject = `📊 Relatório ${periodLabel} — Bot WhatsApp`;
      const html = buildReportHTML(reportData, `Relatório ${periodLabel}`, config.frequency);

      await sendEmail(resendKey, config.recipient_email, subject, html);

      // Update last_sent_at
      await service
        .from("bot_report_config")
        .update({ last_sent_at: new Date().toISOString() })
        .eq("id", configId);

      // Log
      const now = new Date();
      const periodStart = getPeriodStart(config.frequency, now);
      await service.from("bot_report_logs").insert({
        customer_product_id: cpId,
        report_config_id: configId,
        recipient_email: config.recipient_email,
        frequency: config.frequency,
        period_start: periodStart.toISOString(),
        period_end: now.toISOString(),
        report_data: reportData,
        status: "sent",
      });

      return json({ ok: true });
    }

    return json({ error: "invalid action" }, 400);
  } catch (error: any) {
    console.error("bot-send-report error:", error);
    return json({ error: error.message }, 500);
  }
});

// ===== Process scheduled reports (for cron) =====

async function processScheduled(service: any, resendKey: string | undefined) {
  const now = new Date();
  const hour = now.getUTCHours();
  const dayOfWeek = now.getUTCDay();
  const dayOfMonth = now.getUTCDate();

  // Find configs that should fire now
  const { data: configs } = await service
    .from("bot_report_config")
    .select("*")
    .eq("is_active", true);

  if (!configs || configs.length === 0) {
    return json({ ok: true, processed: 0 });
  }

  let processed = 0;

  for (const config of configs) {
    try {
      const shouldSend = checkShouldSend(config, hour, dayOfWeek, dayOfMonth);
      if (!shouldSend) continue;

      // Check if already sent recently (prevent duplicates)
      if (config.last_sent_at) {
        const lastSent = new Date(config.last_sent_at);
        const minGap = config.frequency === "daily" ? 20 : config.frequency === "weekly" ? 144 : 600; // hours
        const hoursSinceLast = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLast < minGap) continue;
      }

      const reportData = await generateReport(service, config.customer_product_id, config.frequency);
      const periodLabel = getPeriodLabel(config.frequency);
      const subject = `📊 Relatório ${periodLabel} — Bot WhatsApp`;
      const html = buildReportHTML(reportData, `Relatório ${periodLabel}`, config.frequency);

      await sendEmail(resendKey, config.recipient_email, subject, html);

      await service
        .from("bot_report_config")
        .update({ last_sent_at: now.toISOString() })
        .eq("id", config.id);

      const periodStart = getPeriodStart(config.frequency, now);
      await service.from("bot_report_logs").insert({
        customer_product_id: config.customer_product_id,
        report_config_id: config.id,
        recipient_email: config.recipient_email,
        frequency: config.frequency,
        period_start: periodStart.toISOString(),
        period_end: now.toISOString(),
        report_data: reportData,
        status: "sent",
      });

      processed++;
    } catch (e) {
      console.error(`Report error for config ${config.id}:`, e);

      await service.from("bot_report_logs").insert({
        customer_product_id: config.customer_product_id,
        report_config_id: config.id,
        recipient_email: config.recipient_email,
        frequency: config.frequency,
        period_start: now.toISOString(),
        period_end: now.toISOString(),
        status: "failed",
        error_message: (e as Error).message,
      });
    }
  }

  return json({ ok: true, processed });
}

// ===== Generate report data =====

async function generateReport(service: any, cpId: string, frequency: string) {
  const now = new Date();
  const periodStart = getPeriodStart(frequency, now);

  // Conversations
  const { data: logs } = await service
    .from("bot_conversation_logs")
    .select("direction, message_text, tokens_used, processing_ms, provider, created_at")
    .eq("customer_product_id", cpId)
    .gte("created_at", periodStart.toISOString())
    .order("created_at", { ascending: true });

  const inbound = (logs || []).filter((l: any) => l.direction === "inbound");
  const outbound = (logs || []).filter((l: any) => l.direction === "outbound");
  const faqResponses = outbound.filter((l: any) => l.provider === "faq" || l.message_text?.startsWith("[FAQ]"));
  const aiResponses = outbound.filter((l: any) => l.provider !== "faq" && !l.message_text?.startsWith("[FAQ]"));

  // Usage metrics
  const { data: metrics } = await service
    .from("bot_usage_metrics")
    .select("tokens_total, tokens_input, tokens_output, processing_ms")
    .eq("customer_product_id", cpId)
    .gte("created_at", periodStart.toISOString());

  const totalTokens = (metrics || []).reduce((s: number, m: any) => s + (m.tokens_total || 0), 0);
  const avgProcessing = metrics && metrics.length > 0
    ? Math.round((metrics as any[]).reduce((s: number, m: any) => s + (m.processing_ms || 0), 0) / metrics.length)
    : 0;

  // FAQ hits
  const { data: faqs } = await service
    .from("bot_faq")
    .select("question, hit_count, category")
    .eq("customer_product_id", cpId)
    .eq("is_active", true)
    .order("hit_count", { ascending: false })
    .limit(10);

  // Knowledge base
  const { data: knowledge } = await service
    .from("bot_knowledge_base")
    .select("id")
    .eq("customer_product_id", cpId)
    .eq("status", "ready");

  // Unique contacts
  const uniquePhones = new Set(inbound.map((l: any) => l.phone).filter(Boolean));

  // Busiest hours
  const hourMap: Record<number, number> = {};
  inbound.forEach((l: any) => {
    const h = new Date(l.created_at).getHours();
    hourMap[h] = (hourMap[h] || 0) + 1;
  });
  const busiestHour = Object.entries(hourMap).sort(([, a], [, b]) => b - a)[0];

  return {
    period: { start: periodStart.toISOString(), end: now.toISOString(), frequency },
    summary: {
      total_messages: inbound.length,
      total_responses: outbound.length,
      faq_responses: faqResponses.length,
      ai_responses: aiResponses.length,
      unique_contacts: uniquePhones.size,
      tokens_used: totalTokens,
      avg_response_ms: avgProcessing,
      knowledge_entries: (knowledge || []).length,
    },
    top_faqs: (faqs || []).slice(0, 5),
    busiest_hour: busiestHour ? { hour: parseInt(busiestHour[0]), count: busiestHour[1] } : null,
    tokens_saved_by_faq: faqResponses.length * 150, // estimate ~150 tokens saved per FAQ hit
  };
}

// ===== Build HTML email =====

function buildReportHTML(data: any, title: string, frequency: string): string {
  const s = data.summary;
  const periodStart = new Date(data.period.start).toLocaleDateString("pt-BR");
  const periodEnd = new Date(data.period.end).toLocaleDateString("pt-BR");

  const faqRows = (data.top_faqs || [])
    .map((f: any) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;color:#333;">${f.question}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:center;color:#666;">${f.category}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;font-size:13px;text-align:center;font-weight:600;color:#10b981;">${f.hit_count}×</td>
      </tr>
    `)
    .join("");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Segoe UI',Roboto,Arial,sans-serif;">
<div style="max-width:600px;margin:0 auto;padding:24px 16px;">

  <!-- Header -->
  <div style="background:linear-gradient(135deg,#10b981,#059669);border-radius:16px 16px 0 0;padding:32px 24px;text-align:center;">
    <div style="font-size:40px;margin-bottom:8px;">📊</div>
    <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">${title}</h1>
    <p style="color:rgba(255,255,255,0.85);margin:8px 0 0;font-size:13px;">${periodStart} — ${periodEnd}</p>
  </div>

  <!-- Stats Grid -->
  <div style="background:#fff;padding:24px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr>
        <td style="padding:12px;text-align:center;width:33%;border-bottom:1px solid #f0f0f0;">
          <div style="font-size:28px;font-weight:700;color:#10b981;">${s.total_messages}</div>
          <div style="font-size:11px;color:#888;margin-top:4px;">Mensagens Recebidas</div>
        </td>
        <td style="padding:12px;text-align:center;width:33%;border-bottom:1px solid #f0f0f0;">
          <div style="font-size:28px;font-weight:700;color:#3b82f6;">${s.unique_contacts}</div>
          <div style="font-size:11px;color:#888;margin-top:4px;">Contatos Únicos</div>
        </td>
        <td style="padding:12px;text-align:center;width:33%;border-bottom:1px solid #f0f0f0;">
          <div style="font-size:28px;font-weight:700;color:#8b5cf6;">${s.total_responses}</div>
          <div style="font-size:11px;color:#888;margin-top:4px;">Respostas Enviadas</div>
        </td>
      </tr>
      <tr>
        <td style="padding:12px;text-align:center;width:33%;">
          <div style="font-size:28px;font-weight:700;color:#f59e0b;">${s.faq_responses}</div>
          <div style="font-size:11px;color:#888;margin-top:4px;">Respostas FAQ</div>
        </td>
        <td style="padding:12px;text-align:center;width:33%;">
          <div style="font-size:28px;font-weight:700;color:#ef4444;">${s.tokens_used.toLocaleString("pt-BR")}</div>
          <div style="font-size:11px;color:#888;margin-top:4px;">Tokens Usados</div>
        </td>
        <td style="padding:12px;text-align:center;width:33%;">
          <div style="font-size:28px;font-weight:700;color:#06b6d4;">${s.avg_response_ms}ms</div>
          <div style="font-size:11px;color:#888;margin-top:4px;">Tempo Médio</div>
        </td>
      </tr>
    </table>
  </div>

  <!-- Token Savings -->
  ${data.tokens_saved_by_faq > 0 ? `
  <div style="background:#f0fdf4;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:16px 24px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="font-size:20px;">💰</span>
      <div>
        <div style="font-size:13px;font-weight:600;color:#166534;">Economia com FAQ Automático</div>
        <div style="font-size:12px;color:#15803d;">~${data.tokens_saved_by_faq.toLocaleString("pt-BR")} tokens economizados com ${s.faq_responses} respostas automáticas</div>
      </div>
    </div>
  </div>
  ` : ""}

  <!-- Busiest Hour -->
  ${data.busiest_hour ? `
  <div style="background:#eff6ff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:16px 24px;">
    <div style="display:flex;align-items:center;gap:8px;">
      <span style="font-size:20px;">⏰</span>
      <div>
        <div style="font-size:13px;font-weight:600;color:#1e40af;">Horário de Pico</div>
        <div style="font-size:12px;color:#2563eb;">${data.busiest_hour.hour}:00 — ${data.busiest_hour.count} mensagens</div>
      </div>
    </div>
  </div>
  ` : ""}

  <!-- Top FAQs -->
  ${faqRows ? `
  <div style="background:#fff;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;padding:24px;">
    <h2 style="margin:0 0 16px;font-size:15px;color:#333;">🏆 FAQs Mais Usadas</h2>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr style="background:#f9fafb;">
        <th style="padding:8px 12px;text-align:left;font-size:11px;color:#888;font-weight:600;text-transform:uppercase;">Pergunta</th>
        <th style="padding:8px 12px;text-align:center;font-size:11px;color:#888;font-weight:600;text-transform:uppercase;">Categoria</th>
        <th style="padding:8px 12px;text-align:center;font-size:11px;color:#888;font-weight:600;text-transform:uppercase;">Usos</th>
      </tr>
      ${faqRows}
    </table>
  </div>
  ` : ""}

  <!-- Footer -->
  <div style="background:#f9fafb;border-radius:0 0 16px 16px;padding:20px 24px;text-align:center;border:1px solid #e5e7eb;border-top:0;">
    <p style="margin:0;font-size:11px;color:#9ca3af;">Relatório gerado automaticamente pelo StarAI Bot</p>
    <p style="margin:4px 0 0;font-size:11px;color:#9ca3af;">Para alterar a frequência, acesse o painel do bot.</p>
  </div>

</div>
</body>
</html>`;
}

// ===== Helpers =====

function checkShouldSend(config: any, hour: number, dayOfWeek: number, dayOfMonth: number): boolean {
  if (config.send_hour !== hour) return false;
  if (config.frequency === "daily") return true;
  if (config.frequency === "weekly") return config.send_day === dayOfWeek;
  if (config.frequency === "monthly") return config.send_day === dayOfMonth;
  return false;
}

function getPeriodStart(frequency: string, now: Date): Date {
  const d = new Date(now);
  if (frequency === "daily") d.setDate(d.getDate() - 1);
  else if (frequency === "weekly") d.setDate(d.getDate() - 7);
  else d.setMonth(d.getMonth() - 1);
  return d;
}

function getPeriodLabel(frequency: string): string {
  if (frequency === "daily") return "Diário";
  if (frequency === "weekly") return "Semanal";
  return "Mensal";
}

async function sendEmail(resendKey: string | undefined, to: string, subject: string, html: string) {
  if (!resendKey) throw new Error("RESEND_API_KEY not configured");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "StarAI Bot <onboarding@resend.dev>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();

    if (
      res.status === 403 &&
      err.includes("You can only send testing emails to your own email address")
    ) {
      throw new Error(
        "Resend em modo de teste: só envia para o e-mail da própria conta. Verifique um domínio no Resend e use um remetente desse domínio."
      );
    }

    throw new Error(`Resend error: ${res.status} ${err}`);
  }

  return await res.json();
}

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
