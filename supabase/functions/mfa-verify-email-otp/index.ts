import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VerifyOtpRequest {
  code: string;
  deviceFingerprint?: string;
  rememberDevice?: boolean;
}

async function sha256Hex(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
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
    if (userErr || !userRes?.user?.id) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: VerifyOtpRequest = await req.json();
    const code = (body.code || "").trim();
    const deviceFingerprint = (body.deviceFingerprint || "").slice(0, 200);
    const rememberDevice = Boolean(body.rememberDevice);

    if (!/^\d{5}$/.test(code)) {
      return new Response(JSON.stringify({ error: "Invalid code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check MFA enabled
    const { data: mfaSettings, error: mfaErr } = await supabase
      .from("user_mfa_settings")
      .select("is_enabled, trusted_device_days")
      .eq("user_id", userRes.user.id)
      .maybeSingle();
    if (mfaErr) throw mfaErr;
    if (!mfaSettings?.is_enabled) {
      return new Response(JSON.stringify({ error: "MFA not enabled" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nowIso = new Date().toISOString();
    const pepper = Deno.env.get("MFA_OTP_PEPPER") || "";
    const codeHash = await sha256Hex(`${code}:${pepper}`);

    // Find most recent, not consumed, not expired
    const { data: otps, error: otpErr } = await supabase
      .from("mfa_email_otps")
      .select("id, code_hash, expires_at, consumed_at")
      .eq("user_id", userRes.user.id)
      .is("consumed_at", null)
      .gt("expires_at", nowIso)
      .order("created_at", { ascending: false })
      .limit(5);
    if (otpErr) throw otpErr;

    const match = (otps || []).find((o: any) => o.code_hash === codeHash);
    if (!match?.id) {
      return new Response(JSON.stringify({ error: "Invalid or expired code" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mark consumed (best-effort; we rely on hash not being reusable)
    const { error: consumeErr } = await supabase
      .from("mfa_email_otps")
      .update({ consumed_at: nowIso })
      .eq("id", match.id);
    if (consumeErr) throw consumeErr;

    // Optionally store trusted device
    let trustedUntil: string | null = null;
    if (rememberDevice && deviceFingerprint) {
      const days = Number(mfaSettings?.trusted_device_days || 30);
      const exp = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
      trustedUntil = exp;

      const { error: trustErr } = await supabase
        .from("mfa_trusted_devices")
        .upsert(
          {
            user_id: userRes.user.id,
            device_fingerprint: deviceFingerprint,
            expires_at: exp,
            last_used_at: nowIso,
          },
          { onConflict: "user_id,device_fingerprint" },
        );
      if (trustErr) throw trustErr;
    }

    return new Response(JSON.stringify({ ok: true, trustedUntil }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in mfa-verify-email-otp:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
