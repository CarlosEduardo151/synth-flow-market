// Auth Email Hook — intercepta emails nativos do Supabase (signup, recovery, magiclink, email_change)
// e envia via Resend usando a identidade StarAI (mesmo canal do MFA OTP).
//
// Configuração no Supabase Dashboard:
// Authentication → Hooks → Send Email Hook → URL desta função + secret SEND_EMAIL_HOOK_SECRET

import { Webhook } from "https://esm.sh/standardwebhooks@1.0.0";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const HOOK_SECRET = (Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "").replace(/^v1,whsec_/, "");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature",
};

const SUBJECTS: Record<string, string> = {
  signup: "✨ Confirme seu cadastro na StarAI",
  recovery: "🔐 Redefinição de senha — StarAI",
  invite: "✉️ Você foi convidado para a StarAI",
  magiclink: "🔗 Seu link de acesso StarAI",
  email_change: "📧 Confirme a alteração de email — StarAI",
  reauthentication: "🔒 Confirmação de identidade — StarAI",
};

function buildHtml(params: {
  actionType: string;
  toEmail: string;
  confirmationUrl: string;
  token: string;
  siteUrl: string;
}) {
  const { actionType, toEmail, confirmationUrl, token } = params;
  const titles: Record<string, string> = {
    signup: "Confirme seu cadastro",
    recovery: "Redefinir sua senha",
    invite: "Você foi convidado",
    magiclink: "Seu link de acesso",
    email_change: "Confirme a alteração de email",
    reauthentication: "Confirmação de identidade",
  };
  const ctaLabels: Record<string, string> = {
    signup: "Confirmar email",
    recovery: "Redefinir senha",
    invite: "Aceitar convite",
    magiclink: "Entrar agora",
    email_change: "Confirmar novo email",
    reauthentication: "Confirmar identidade",
  };
  const title = titles[actionType] ?? "StarAI";
  const cta = ctaLabels[actionType] ?? "Continuar";

  return `<!doctype html>
<html lang="pt-BR">
  <head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/><title>${title} — StarAI</title></head>
  <body style="margin:0;padding:0;background:#030712;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${title} na StarAI.</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#030712;padding:24px 12px;">
      <tr><td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:100%;">
          <tr><td style="border-radius:24px;padding:28px 26px;background: linear-gradient(135deg, #3b82f6 0%, #66ffff 100%);">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
              <tr>
                <td style="vertical-align:middle;">
                  <img src="https://starai.com.br/favicon.ico" width="44" height="44" alt="StarAI" style="display:block;border-radius:12px;background:rgba(0,0,0,0.15);padding:6px"/>
                </td>
                <td style="vertical-align:middle;padding-left:12px;">
                  <div style="font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:18px;color:#030712;">StarAI</div>
                  <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#030712;opacity:0.85;">${title}</div>
                </td>
              </tr>
            </table>
          </td></tr>

          <tr><td style="padding:16px 0;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:24px;background: rgba(255,255,255,0.06);border: 1px solid rgba(255,255,255,0.12);">
              <tr><td style="padding:26px;">
                <h1 style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.2;color:#e5e7eb;">${title}</h1>
                <p style="margin:0 0 20px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#9ca3af;">
                  Olá! Para continuar, clique no botão abaixo. Este link é pessoal e expira em breve.
                </p>

                <div style="text-align:center;margin:24px 0;">
                  <a href="${confirmationUrl}" style="display:inline-block;padding:14px 28px;border-radius:12px;background:linear-gradient(135deg,#3b82f6,#66ffff);color:#030712;font-family:Arial,Helvetica,sans-serif;font-weight:700;font-size:15px;text-decoration:none;">
                    ${cta}
                  </a>
                </div>

                <p style="margin:16px 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b7280;">Se o botão não funcionar, copie e cole este link no navegador:</p>
                <p style="margin:0 0 16px 0;font-family:ui-monospace,Menlo,Consolas,monospace;font-size:11px;color:#9ca3af;word-break:break-all;background:rgba(0,0,0,0.35);padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,0.08);">${confirmationUrl}</p>

                ${token ? `<p style="margin:0 0 8px 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#6b7280;">Ou use este código:</p>
                <div style="text-align:center;margin:8px 0 16px;">
                  <span style="display:inline-block;padding:10px 16px;border-radius:12px;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.14);font-family:ui-monospace,Menlo,Consolas,monospace;font-size:20px;letter-spacing:4px;font-weight:800;color:#fff;">${token}</span>
                </div>` : ""}

                <p style="margin:16px 0 0 0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6b7280;">Enviado para <strong style="color:#e5e7eb">${toEmail}</strong>. Se não foi você, ignore este email.</p>
              </td></tr>
            </table>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const payloadRaw = await req.text();
    const headers = Object.fromEntries(req.headers);

    let payload: any;
    if (HOOK_SECRET) {
      const wh = new Webhook(HOOK_SECRET);
      payload = wh.verify(payloadRaw, headers);
    } else {
      // Sem secret configurado ainda — aceitar payload (apenas para teste inicial)
      payload = JSON.parse(payloadRaw);
    }

    const { user, email_data } = payload as {
      user: { email: string };
      email_data: {
        token: string;
        token_hash: string;
        redirect_to: string;
        email_action_type: string;
        site_url: string;
      };
    };

    const actionType = email_data.email_action_type;
    const subject = SUBJECTS[actionType] ?? "Notificação StarAI";

    // Construir URL de confirmação (formato padrão Supabase)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const confirmationUrl = `${supabaseUrl}/auth/v1/verify?token=${email_data.token_hash}&type=${actionType}&redirect_to=${encodeURIComponent(email_data.redirect_to || email_data.site_url)}`;

    const html = buildHtml({
      actionType,
      toEmail: user.email,
      confirmationUrl,
      token: email_data.token,
      siteUrl: email_data.site_url,
    });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "StarAI <confirm@starai.com.br>",
        to: [user.email],
        subject,
        html,
      }),
    });

    const text = await res.text();
    if (!res.ok) {
      console.error("Resend error:", res.status, text);
      return new Response(JSON.stringify({ error: "Resend failed", details: text }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`auth-email-hook: ${actionType} sent to ${user.email}`);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("auth-email-hook error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
