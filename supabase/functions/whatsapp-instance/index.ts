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

const DEFAULT_SYSTEM_PROMPT = `Você é um assistente virtual inteligente. Responda de forma objetiva, útil e em português. Quando não souber algo, diga com transparência e ofereça ajuda humana.`;

function generateWebhookToken(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function ensureCustomerProduct(sb: any, userId: string) {
  const { data: existing, error } = await sb
    .from("customer_products")
    .select("id, webhook_token")
    .eq("user_id", userId)
    .eq("product_slug", "bots-automacao")
    .eq("is_active", true)
    .maybeSingle();

  if (error) throw error;
  if (!existing?.id) return null;

  if (existing.webhook_token) return existing;

  const webhookToken = generateWebhookToken();
  const { error: updateError } = await sb
    .from("customer_products")
    .update({ webhook_token: webhookToken, updated_at: new Date().toISOString() })
    .eq("id", existing.id);

  if (updateError) throw updateError;

  return {
    ...existing,
    webhook_token: webhookToken,
  };
}

async function ensureBotRuntime(sb: any, userId: string, customerProductId: string) {
  const nowIso = new Date().toISOString();

  const { data: firstBot, error: botFetchError } = await sb
    .from("bot_instances")
    .select("id, is_active")
    .eq("customer_product_id", customerProductId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (botFetchError) throw botFetchError;

  if (!firstBot?.id) {
    const { error: createBotError } = await sb
      .from("bot_instances")
      .insert({
        customer_product_id: customerProductId,
        name: "Bot 1",
        is_active: true,
        updated_at: nowIso,
      });
    if (createBotError) throw createBotError;
  } else if (!firstBot.is_active) {
    const { error: activateBotError } = await sb
      .from("bot_instances")
      .update({ is_active: true, updated_at: nowIso })
      .eq("id", firstBot.id);
    if (activateBotError) throw activateBotError;
  }

  const { data: aiConfig, error: aiFetchError } = await sb
    .from("ai_control_config")
    .select("id, is_active")
    .eq("customer_product_id", customerProductId)
    .maybeSingle();

  if (aiFetchError) throw aiFetchError;

  if (!aiConfig?.id) {
    const { error: createAiError } = await sb
      .from("ai_control_config")
      .insert({
        customer_product_id: customerProductId,
        user_id: userId,
        is_active: true,
        provider: "novalink",
        model: "llama-3.3-70b-versatile",
        temperature: 0.7,
        max_tokens: 2048,
        business_name: "Meu Negócio",
        personality: "amigavel",
        system_prompt: DEFAULT_SYSTEM_PROMPT,
        configuration: {
          platform: "whatsapp",
          configured_at: nowIso,
          auto_provisioned: true,
        },
        updated_at: nowIso,
      });
    if (createAiError) throw createAiError;
  } else if (!aiConfig.is_active) {
    const { error: activateAiError } = await sb
      .from("ai_control_config")
      .update({ is_active: true, updated_at: nowIso })
      .eq("id", aiConfig.id);
    if (activateAiError) throw activateAiError;
  }
}

/** Get instance name: prefer evolution_instances table, fallback to generating from email */
async function resolveInstanceName(sb: any, userId: string, userEmail: string): Promise<string> {
  const { data: evoInst } = await sb
    .from("evolution_instances")
    .select("instance_name")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (evoInst?.instance_name) return evoInst.instance_name;

  // Fallback: generate from email
  return userEmail.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 100);
}

/** Configure webhook on Evolution API instance */
async function configureWebhook(instanceName: string, webhookUrl: string): Promise<void> {
  try {
    const resp = await fetch(`${EVOLUTION_URL()}/webhook/set/${encodeURIComponent(instanceName)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY() },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhookByEvents: false,
          webhookBase64: true,
          events: ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED"],
        },
      }),
    });
    const data = await resp.json().catch(() => null);
    console.log("[whatsapp-instance] webhook set:", resp.status, JSON.stringify(data));
  } catch (e) {
    console.error("[whatsapp-instance] webhook set error:", e);
  }
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const instanceName = await resolveInstanceName(sb, user.id, user.email || user.id);

    // Fetch customer_product for this user and auto-provision webhook token if missing
    const cp = await ensureCustomerProduct(sb, user.id);

    const buildWebhookUrl = () => {
      if (!cp?.id || !cp?.webhook_token) return null;
      return `${supabaseUrl}/functions/v1/whatsapp-ingest?customer_product_id=${cp.id}&token=${cp.webhook_token}`;
    };

    if (action === "create") {
      const resp = await fetch(`${EVOLUTION_URL()}/instance/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY() },
        body: JSON.stringify({ instanceName, integration: "WHATSAPP-BAILEYS", qrcode: true }),
      });

      const data = await resp.json().catch(() => null);
      console.log("[whatsapp-instance] create response:", resp.status, JSON.stringify(data));

      if (!resp.ok && resp.status !== 409 && resp.status !== 403) {
        return json({ error: "Falha ao criar instância", details: data }, resp.status);
      }

      if (cp?.id) {
        await ensureBotRuntime(sb, user.id, cp.id);
      }

      // Upsert into evolution_instances table
      if (cp?.id) {
        await sb.from("evolution_instances").upsert({
          user_id: user.id,
          customer_product_id: cp.id,
          instance_name: instanceName,
          evolution_url: EVOLUTION_URL(),
          evolution_apikey: EVOLUTION_KEY(),
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "customer_product_id" }).then(({ error: e }: any) => {
          if (e) console.error("[whatsapp-instance] evolution_instances upsert error:", e.message);
        });
      }

      // Also save to product_credentials for backward compat
      await sb.from("product_credentials").upsert({
        user_id: user.id,
        product_slug: "bots-automacao",
        credential_key: "evolution_instance_name",
        credential_value: instanceName,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,product_slug,credential_key" }).then(({ error: e }: any) => {
        if (e) console.error("[whatsapp-instance] product_credentials upsert error:", e.message);
      });

      // Configure webhook
      const webhookUrl = buildWebhookUrl();
      if (webhookUrl) {
        await configureWebhook(instanceName, webhookUrl);
      } else {
        console.warn("[whatsapp-instance] no customer_product found for webhook setup");
      }

      const qrcode = data?.qrcode?.base64 || data?.qrcode || null;
      return json({ success: true, instanceName, qrcode, status: data?.instance?.status || "created" });
    }

    if (action === "qrcode") {
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

    if (action === "reconfigure_webhook") {
      const webhookUrl = buildWebhookUrl();
      if (!webhookUrl) {
        return json({ error: "No customer_product or webhook_token found" }, 400);
      }
      await ensureBotRuntime(sb, user.id, cp.id);
      await configureWebhook(instanceName, webhookUrl);
      return json({ success: true, webhookUrl });
    }

    if (action === "disconnect") {
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
