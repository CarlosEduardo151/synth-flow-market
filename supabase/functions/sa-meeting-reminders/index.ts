// Sends meeting reminders via Email (24h, 1h) and WhatsApp (1h)
// Cron: runs every 15 minutes
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { evolutionSendText } from "../_shared/zapi.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

function fmtDateBR(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo",
  });
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not set, skipping email");
    return false;
  }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "NovaLink CRM <onboarding@resend.dev>",
        to: [to],
        subject,
        html,
      }),
    });
    if (!resp.ok) {
      console.error("resend send error", resp.status, await resp.text().catch(() => ""));
      return false;
    }
    return true;
  } catch (e) {
    console.error("resend error", e);
    return false;
  }
}

async function resolveCrmInstance(customerProductId: string) {
  const { data: cp } = await admin
    .from("customer_products")
    .select("user_id")
    .eq("id", customerProductId)
    .maybeSingle();
  if (!cp?.user_id) return null;

  const { data: inst } = await admin
    .from("evolution_instances")
    .select("instance_name, evolution_url, evolution_apikey")
    .eq("user_id", cp.user_id)
    .eq("is_active", true)
    .ilike("instance_name", "%_CRM")
    .limit(1)
    .maybeSingle();

  if (inst?.instance_name) {
    return {
      instanceName: inst.instance_name,
      apiUrl: (inst.evolution_url || "").replace(/\/$/, ""),
      apiKey: inst.evolution_apikey || "",
    };
  }
  return null;
}

function emailHtml(opts: { title: string; meetingTitle: string; when: string; duration?: number | null; link?: string | null; notes?: string | null }) {
  return `
  <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#fafafa;color:#111">
    <div style="background:#fff;border-radius:12px;padding:32px;border:1px solid #eee">
      <h1 style="margin:0 0 8px;font-size:20px">${opts.title}</h1>
      <p style="margin:0 0 20px;color:#666">Você tem uma reunião agendada.</p>
      <div style="background:#f4f6f9;border-radius:8px;padding:16px;margin-bottom:20px">
        <p style="margin:0 0 4px;font-weight:600">📅 ${opts.meetingTitle}</p>
        <p style="margin:0;color:#555">🕐 ${opts.when}${opts.duration ? ` · ${opts.duration} min` : ""}</p>
      </div>
      ${opts.link ? `<p><a href="${opts.link}" style="display:inline-block;background:#10b981;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-weight:600">Entrar na reunião</a></p>` : ""}
      ${opts.notes ? `<p style="color:#666;font-size:14px;margin-top:16px"><strong>Notas:</strong> ${opts.notes}</p>` : ""}
      <hr style="border:0;border-top:1px solid #eee;margin:24px 0">
      <p style="color:#999;font-size:12px;margin:0">Enviado automaticamente pelo NovaLink CRM</p>
    </div>
  </div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const now = Date.now();
    const window24hStart = new Date(now + 23 * 3600 * 1000).toISOString();
    const window24hEnd = new Date(now + 25 * 3600 * 1000).toISOString();
    const window1hStart = new Date(now + 45 * 60 * 1000).toISOString();
    const window1hEnd = new Date(now + 75 * 60 * 1000).toISOString();

    // 24h email reminders
    const { data: meetings24h } = await admin
      .from("sa_meetings")
      .select("id, customer_product_id, title, lead_email, lead_phone, scheduled_at, duration_min, meeting_url, notes, reminder_email_24h_sent")
      .gte("scheduled_at", window24hStart)
      .lte("scheduled_at", window24hEnd)
      .eq("reminder_email_24h_sent", false)
      .not("status", "in", "(cancelled,completed)");

    let sent24hEmail = 0;
    for (const m of meetings24h || []) {
      if (!m.lead_email) continue;
      const ok = await sendEmail(
        m.lead_email,
        `Lembrete: ${m.title || "Reunião"} amanhã`,
        emailHtml({
          title: "📌 Lembrete: reunião amanhã",
          meetingTitle: m.title || "Reunião",
          when: fmtDateBR(m.scheduled_at),
          duration: m.duration_min,
          link: m.meeting_url,
          notes: m.notes,
        }),
      );
      if (ok) {
        await admin.from("sa_meetings").update({ reminder_email_24h_sent: true }).eq("id", m.id);
        sent24hEmail++;
      }
    }

    // 1h email + WhatsApp reminders
    const { data: meetings1h } = await admin
      .from("sa_meetings")
      .select("id, customer_product_id, title, lead_email, lead_phone, scheduled_at, duration_min, meeting_url, notes, reminder_email_1h_sent, reminder_whatsapp_1h_sent")
      .gte("scheduled_at", window1hStart)
      .lte("scheduled_at", window1hEnd)
      .not("status", "in", "(cancelled,completed)");

    let sent1hEmail = 0;
    let sent1hWa = 0;

    for (const m of meetings1h || []) {
      // Email 1h
      if (m.lead_email && !m.reminder_email_1h_sent) {
        const ok = await sendEmail(
          m.lead_email,
          `Lembrete: ${m.title || "Reunião"} em 1 hora`,
          emailHtml({
            title: "⏰ Lembrete: reunião em 1 hora",
            meetingTitle: m.title || "Reunião",
            when: fmtDateBR(m.scheduled_at),
            duration: m.duration_min,
            link: m.meeting_url,
            notes: m.notes,
          }),
        );
        if (ok) {
          await admin.from("sa_meetings").update({ reminder_email_1h_sent: true }).eq("id", m.id);
          sent1hEmail++;
        }
      }

      // WhatsApp 1h
      if (m.lead_phone && !m.reminder_whatsapp_1h_sent) {
        const inst = await resolveCrmInstance(m.customer_product_id);
        if (inst) {
          try {
            const text = `⏰ *Lembrete de reunião em 1 hora*\n\n📅 *${m.title || "Reunião"}*\n🕐 ${fmtDateBR(m.scheduled_at)}${m.duration_min ? ` · ${m.duration_min} min` : ""}${m.meeting_url ? `\n\n🔗 ${m.meeting_url}` : ""}`;
            const cleanPhone = m.lead_phone.replace(/\D/g, "");
            await evolutionSendText(inst, cleanPhone, text);
            await admin.from("sa_meetings").update({ reminder_whatsapp_1h_sent: true }).eq("id", m.id);
            sent1hWa++;
          } catch (e) {
            console.error("WhatsApp reminder failed for meeting", m.id, e);
          }
        }
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sent: { email_24h: sent24hEmail, email_1h: sent1hEmail, whatsapp_1h: sent1hWa },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("sa-meeting-reminders error", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
