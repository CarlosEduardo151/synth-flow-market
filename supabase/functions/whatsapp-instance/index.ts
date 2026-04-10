import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getAuthUser(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) throw new Error("unauthorized");
  const token = authHeader.slice(7);
  const sb = createClient(supabaseUrl, serviceKey);
  const { data, error } = await sb.auth.getUser(token);
  if (error || !data?.user) throw new Error("unauthorized");
  return data.user;
}

const EVOLUTION_URL = () => {
  const url = Deno.env.get("EVOLUTION_API_URL");
  if (!url) throw new Error("EVOLUTION_API_URL not configured");
  return url.replace(/\/$/, "");
};

const EVOLUTION_KEY = () => {
  const key = Deno.env.get("EVOLUTION_GLOBAL_APIKEY");
  if (!key) throw new Error("EVOLUTION_GLOBAL_APIKEY not configured");
  return key;
};

function sanitizeInstanceName(email: string): string {
  // Use email as instance name, replacing special chars
  return email.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 100);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getAuthUser(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (!action) return json({ error: "action required" }, 400);

    const instanceName = sanitizeInstanceName(user.email || user.id);

    if (action === "create") {
      // Create instance on Evolution API
      const resp = await fetch(`${EVOLUTION_URL()}/instance/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: EVOLUTION_KEY(),
        },
        body: JSON.stringify({
          instanceName,
          integration: "WHATSAPP-BAILEYS",
          qrcode: true,
        }),
      });

      const data = await resp.json().catch(() => null);
      console.log("[whatsapp-instance] create response:", resp.status, JSON.stringify(data));

      if (!resp.ok && resp.status !== 409) {
        return json({ error: "Falha ao criar instância", details: data }, resp.status);
      }

      // If 409 = already exists, that's fine, just get QR code
      // Store instance info in product_credentials
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const sb = createClient(supabaseUrl, serviceKey);

      // Save the instance name
      await sb.from("product_credentials").upsert({
        user_id: user.id,
        product_slug: "bots-automacao",
        credential_key: "evolution_instance_name",
        credential_value: instanceName,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,product_slug,credential_key" });

      // Extract QR code from response
      const qrcode = data?.qrcode?.base64 || data?.qrcode || null;

      return json({
        success: true,
        instanceName,
        qrcode,
        status: data?.instance?.status || "created",
      });
    }

    if (action === "qrcode") {
      // Get QR code for existing instance
      const resp = await fetch(`${EVOLUTION_URL()}/instance/connect/${encodeURIComponent(instanceName)}`, {
        method: "GET",
        headers: { apikey: EVOLUTION_KEY() },
      });

      const data = await resp.json().catch(() => null);
      console.log("[whatsapp-instance] qrcode response:", resp.status);

      if (!resp.ok) {
        return json({ error: "Falha ao obter QR Code", details: data }, resp.status);
      }

      return json({
        success: true,
        qrcode: data?.base64 || data?.qrcode?.base64 || null,
        pairingCode: data?.pairingCode || null,
      });
    }

    if (action === "status") {
      // Check connection status
      const resp = await fetch(`${EVOLUTION_URL()}/instance/connectionState/${encodeURIComponent(instanceName)}`, {
        method: "GET",
        headers: { apikey: EVOLUTION_KEY() },
      });

      const data = await resp.json().catch(() => null);
      console.log("[whatsapp-instance] status response:", resp.status, JSON.stringify(data));

      if (!resp.ok) {
        return json({ connected: false, state: "disconnected" });
      }

      const state = data?.instance?.state || data?.state || "close";
      const connected = state === "open";

      return json({ connected, state, instanceName });
    }

    if (action === "disconnect") {
      // Logout the instance
      const resp = await fetch(`${EVOLUTION_URL()}/instance/logout/${encodeURIComponent(instanceName)}`, {
        method: "DELETE",
        headers: { apikey: EVOLUTION_KEY() },
      });
      
      await resp.text();
      return json({ success: true });
    }

    return json({ error: "invalid action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    console.error("[whatsapp-instance] error:", msg);
    if (msg === "unauthorized") return json({ error: msg }, 401);
    return json({ error: msg }, 500);
  }
});
