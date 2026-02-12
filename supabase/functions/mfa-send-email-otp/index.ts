import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SendOtpRequest {
  deviceFingerprint?: string;
}

function randomFiveDigits() {
  // 00000 - 99999, padded
  const n = Math.floor(Math.random() * 100000);
  return String(n).padStart(5, "0");
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function buildOtpEmailHtml(params: { code: string; toEmail: string }) {
  const { code, toEmail } = params;
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <meta name="color-scheme" content="dark" />
    <title>Seu código StarAI</title>
  </head>
  <body style="margin:0;padding:0;background:#030712;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Seu código de verificação StarAI é ${code} (válido por 10 minutos).</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#030712;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="width:600px;max-width:100%;">
            <tr>
              <td style="border-radius:24px;padding:28px 26px;background: linear-gradient(135deg, #3b82f6 0%, #66ffff 100%);">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <img src="https://starai.com.br/favicon.ico" width="44" height="44" alt="StarAI" style="display:block;border-radius:12px;background:rgba(0,0,0,0.15);padding:6px" />
                    </td>
                    <td style="vertical-align:middle;padding-left:12px;">
                      <div style="font-family:Arial,Helvetica,sans-serif;font-weight:800;font-size:18px;color:#030712;">StarAI</div>
                      <div style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#030712;opacity:0.85;">Verificação em duas etapas</div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <tr>
              <td style="padding:16px 0;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-radius:24px;background: rgba(255,255,255,0.06);border: 1px solid rgba(255,255,255,0.12);backdrop-filter: blur(12px);">
                  <tr>
                    <td style="padding:26px;">
                      <h1 style="margin:0 0 10px 0;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:1.2;color:#e5e7eb;">Seu código de acesso</h1>
                      <p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.6;color:#9ca3af;">Use o código abaixo para finalizar o login. Ele expira em <strong style=\"color:#e5e7eb\">10 minutos</strong> e só funciona <strong style=\"color:#e5e7eb\">uma vez</strong>.</p>

                      <div style="margin:16px 0 12px 0; text-align:center;">
                        <div style="display:inline-block;padding:14px 18px;border-radius:16px;background:rgba(0,0,0,0.35);border:1px solid rgba(255,255,255,0.14);">
                          <span style="font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace;font-size:28px;letter-spacing:6px;font-weight:800;color:#ffffff;">${code}</span>
                        </div>
                      </div>

                      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.6;color:#6b7280;">Este código foi enviado para <strong style=\"color:#e5e7eb\">${toEmail}</strong>. Se não foi você, recomendamos alterar sua senha.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userRes?.user?.id || !userRes.user.email) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: SendOtpRequest = await req.json().catch(() => ({}));
    const deviceFingerprint = (body?.deviceFingerprint || "").slice(0, 200);

    // Check if MFA enabled
    const { data: mfaSettings, error: mfaErr } = await supabase
      .from("user_mfa_settings")
      .select("is_enabled")
      .eq("user_id", userRes.user.id)
      .maybeSingle();
    if (mfaErr) throw mfaErr;
    if (!mfaSettings?.is_enabled) {
      return new Response(JSON.stringify({ error: "MFA not enabled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // If trusted device, do not send
    if (deviceFingerprint) {
      const { data: trusted } = await supabase
        .from("mfa_trusted_devices")
        .select("id, expires_at")
        .eq("user_id", userRes.user.id)
        .eq("device_fingerprint", deviceFingerprint)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();
      if (trusted?.id) {
        return new Response(JSON.stringify({ ok: true, trusted: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: "Missing RESEND_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const code = randomFiveDigits();
    const pepper = Deno.env.get("MFA_OTP_PEPPER") || "";
    const codeHash = await sha256Hex(`${code}:${pepper}`);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();

    const { error: insertErr } = await supabase.from("mfa_email_otps").insert({
      user_id: userRes.user.id,
      code_hash: codeHash,
      expires_at: expiresAt,
    });
    if (insertErr) throw insertErr;

    const from = "StarAI <confirm@starai.com.br>";
    const html = buildOtpEmailHtml({ code, toEmail: userRes.user.email });

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [userRes.user.email],
        subject: "Seu código de verificação StarAI",
        html,
      }),
    });

    const resText = await res.text();
    if (!res.ok) {
      console.error("Resend error:", res.status, resText);
      return new Response(JSON.stringify({ error: "Resend failed", details: resText }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, expiresAt }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in mfa-send-email-otp:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
