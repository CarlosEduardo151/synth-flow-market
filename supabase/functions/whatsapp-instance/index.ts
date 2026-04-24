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

/**
 * Normalize ANY phone format the user might type into a canonical
 * digits-only string. Accepts "+55 99 9 1234-5678", "(99) 91234-5678",
 * "5599912345678", "9 9123-4567", "+1 415 555 1234", etc.
 *
 * If the cleaned digits look like a Brazilian number (10/11 digits, DDD)
 * and don't already start with country code, prepend "55".
 */
function normalizePhoneNumber(raw: string): string {
  if (!raw) return "";
  let d = String(raw).replace(/\D+/g, "");
  if (!d) return "";
  d = d.replace(/^0+/, "");
  if ((d.length === 10 || d.length === 11) && !d.startsWith("55")) {
    d = "55" + d;
  }
  return d;
}

function ownerJidMatchesPhone(ownerJid: string | null | undefined, normalizedPhone: string): boolean {
  if (!ownerJid || !normalizedPhone) return false;
  const ownerDigits = String(ownerJid).split("@")[0].replace(/\D+/g, "");
  if (!ownerDigits) return false;
  if (ownerDigits === normalizedPhone) return true;
  // Compare last 10 digits to tolerate the optional Brazilian "9" prefix or country-code differences.
  const minLen = Math.min(ownerDigits.length, normalizedPhone.length, 10);
  return ownerDigits.slice(-minLen) === normalizedPhone.slice(-minLen);
}

async function findEvolutionInstanceByPhone(normalizedPhone: string): Promise<{
  instanceName: string;
  state: string;
  ownerJid: string;
} | null> {
  if (!normalizedPhone) return null;
  try {
    const resp = await fetch(`${EVOLUTION_URL()}/instance/fetchInstances`, {
      method: "GET",
      headers: { apikey: EVOLUTION_KEY() },
    });
    if (!resp.ok) {
      console.warn("[whatsapp-instance] fetchInstances failed:", resp.status);
      return null;
    }
    const list = await resp.json().catch(() => []);
    if (!Array.isArray(list)) return null;

    for (const inst of list) {
      const name = inst?.name || inst?.instanceName || inst?.instance?.instanceName;
      const owner = inst?.ownerJid || inst?.owner || inst?.instance?.owner;
      const state = inst?.connectionStatus || inst?.state || inst?.instance?.state || "unknown";
      if (!name) continue;
      if (state !== "open") continue;
      if (ownerJidMatchesPhone(owner, normalizedPhone)) {
        return { instanceName: name, state, ownerJid: owner };
      }
    }
    return null;
  } catch (e) {
    console.error("[whatsapp-instance] findEvolutionInstanceByPhone error:", e);
    return null;
  }
}

async function ensureCustomerProduct(sb: any, userId: string, productSlug = "bots-automacao") {
  const { data: existing, error } = await sb
    .from("customer_products")
    .select("id, webhook_token")
    .eq("user_id", userId)
    .eq("product_slug", productSlug)
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

const WEBHOOK_EVENTS = ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED"] as const;

/**
 * Configure webhook on Evolution API instance.
 * Tries multiple payload formats for compatibility across Evolution API versions.
 * Never throws — logs errors but allows instance creation to continue.
 */
async function configureWebhook(instanceName: string, webhookUrl: string): Promise<boolean> {
  const webhookConfig = {
    enabled: true,
    url: webhookUrl,
    webhookByEvents: false,
    webhookBase64: true,
    events: [...WEBHOOK_EVENTS],
  };

  const nestedWebhookConfig = {
    enabled: true,
    url: webhookUrl,
    byEvents: false,
    base64: true,
    events: [...WEBHOOK_EVENTS],
  };

  // Try multiple payload formats for different Evolution API versions
  const payloads = [
    // Format A: nested webhook object used by several Evolution server builds
    { webhook: nestedWebhookConfig },
    // Format B: same nested shape plus explicit instanceName
    { instanceName, webhook: nestedWebhookConfig },
    // Format C: nested webhook but with both naming styles for compatibility
    {
      webhook: {
        ...nestedWebhookConfig,
        webhookByEvents: false,
        webhookBase64: true,
      },
    },
    // Format D: root-level payload from public v2 docs
    webhookConfig,
  ];

  for (let i = 0; i < payloads.length; i++) {
    try {
      const resp = await fetch(`${EVOLUTION_URL()}/webhook/set/${encodeURIComponent(instanceName)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY() },
        body: JSON.stringify(payloads[i]),
      });

      const data = await resp.json().catch(() => null);
      console.log(`[whatsapp-instance] webhook set format ${i + 1}/${payloads.length}:`, resp.status, JSON.stringify(data));

      if (resp.ok) {
        console.log(`[whatsapp-instance] webhook configured successfully with format ${i + 1}`);
        return true;
      }
    } catch (e) {
      console.error(`[whatsapp-instance] webhook set format ${i + 1} error:`, e instanceof Error ? e.message : e);
    }
  }

  console.error("[whatsapp-instance] all webhook formats failed — instance created but webhook not configured");
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const user = await getAuthUser(req);
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;
    const context = (body.context as string) || "bot"; // "bot" or "crm"

    if (!action) return json({ error: "action required" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(supabaseUrl, serviceKey);

    const baseInstanceName = await resolveInstanceName(sb, user.id, user.email || user.id);
    let instanceName = baseInstanceName;
    let productSlug = "bots-automacao";
    if (context === "crm") {
      instanceName = `${baseInstanceName}_CRM`;
      productSlug = "crm-simples";
    } else if (context === "financial") {
      instanceName = `${baseInstanceName}_FIN`;
      productSlug = "agente-financeiro";
    }

    // Fetch customer_product for this user and auto-provision webhook token if missing
    const cp = await ensureCustomerProduct(sb, user.id, productSlug);

    const buildWebhookUrl = () => {
      if (!cp?.id || !cp?.webhook_token) return null;
      if (context === "financial") {
        return `${supabaseUrl}/functions/v1/financial-whatsapp-webhook?customer_product_id=${cp.id}&token=${cp.webhook_token}`;
      }
      return `${supabaseUrl}/functions/v1/whatsapp-ingest?customer_product_id=${cp.id}&token=${cp.webhook_token}`;
    };

    // ── Helper: link an existing Evolution instance (already connected to a phone)
    // to the current user's customer_product, configure its webhook and bot runtime.
    async function linkExistingInstance(existingInstanceName: string) {
      // 1. Persist mapping in evolution_instances + product_credentials
      if (cp?.id) {
        await sb.from("evolution_instances").upsert({
          user_id: user.id,
          customer_product_id: cp.id,
          instance_name: existingInstanceName,
          evolution_url: EVOLUTION_URL(),
          evolution_apikey: EVOLUTION_KEY(),
          is_active: true,
          updated_at: new Date().toISOString(),
        }, { onConflict: "customer_product_id" }).then(({ error: e }: any) => {
          if (e) console.error("[whatsapp-instance] link evolution_instances upsert:", e.message);
        });
      }
      await sb.from("product_credentials").upsert({
        user_id: user.id,
        product_slug: productSlug,
        credential_key: "evolution_instance_name",
        credential_value: existingInstanceName,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,product_slug,credential_key" }).then(({ error: e }: any) => {
        if (e) console.error("[whatsapp-instance] link product_credentials upsert:", e.message);
      });

      // 2. Provision bot runtime (only for non-financial flows)
      if (cp?.id && context !== "financial") {
        await ensureBotRuntime(sb, user.id, cp.id);
      }

      // 3. Re-configure webhook so events route to THIS user's product
      const webhookUrl = buildWebhookUrl();
      if (webhookUrl) await configureWebhook(existingInstanceName, webhookUrl);
    }

    // ───────────────────────────────────────────────────────────
    // ACTION: lookup_number — just check whether a phone is already
    // connected to ANY Evolution instance. Read-only.
    // ───────────────────────────────────────────────────────────
    if (action === "lookup_number") {
      const normalized = normalizePhoneNumber((body.phone as string) || "");
      if (!normalized || normalized.length < 10) {
        return json({ error: "invalid_phone", normalized }, 400);
      }
      const found = await findEvolutionInstanceByPhone(normalized);
      return json({
        normalized,
        alreadyConnected: !!found,
        instance: found,
      });
    }

    // ───────────────────────────────────────────────────────────
    // ACTION: connect_by_number — main entry point for the new flow.
    // 1. Normalize the phone the user typed.
    // 2. If an Evolution instance already exists for that number → reuse it
    //    (link to this user/product, reconfigure webhook, NO QR code).
    // 3. Otherwise → create a fresh instance and return its QR code.
    // ───────────────────────────────────────────────────────────
    if (action === "connect_by_number") {
      const normalized = normalizePhoneNumber((body.phone as string) || "");
      if (!normalized || normalized.length < 10) {
        return json({ error: "invalid_phone", message: "Número inválido. Digite com DDD (ex: 11 91234-5678)." }, 400);
      }

      // Try to find an existing connected instance for this phone
      const existing = await findEvolutionInstanceByPhone(normalized);
      if (existing) {
        console.log("[whatsapp-instance] reusing existing instance for", normalized, "→", existing.instanceName);
        await linkExistingInstance(existing.instanceName);
        return json({
          success: true,
          alreadyConnected: true,
          instanceName: existing.instanceName,
          status: "open",
          qrcode: null,
          phone: normalized,
        });
      }

      // No existing instance for that number → create a new one (uses default instanceName for this user/context)
      console.log("[whatsapp-instance] no existing instance for", normalized, "→ creating", instanceName);
      const resp = await fetch(`${EVOLUTION_URL()}/instance/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY() },
        body: JSON.stringify({ instanceName, integration: "WHATSAPP-BAILEYS", qrcode: true }),
      });
      const data = await resp.json().catch(() => null);
      console.log("[whatsapp-instance] create (by_number) response:", resp.status, JSON.stringify(data)?.slice(0, 300));

      if (!resp.ok && resp.status !== 409 && resp.status !== 403) {
        return json({ error: "Falha ao criar instância", details: data }, resp.status);
      }

      await linkExistingInstance(instanceName);

      // Get a QR code (either from create response or via /instance/connect)
      let qrcode = data?.qrcode?.base64 || data?.qrcode || null;
      if (!qrcode) {
        try {
          const connResp = await fetch(
            `${EVOLUTION_URL()}/instance/connect/${encodeURIComponent(instanceName)}`,
            { method: "GET", headers: { apikey: EVOLUTION_KEY() } },
          );
          const connData = await connResp.json().catch(() => null);
          qrcode = connData?.base64 || connData?.qrcode?.base64 || connData?.qrcode || null;
        } catch (e) {
          console.error("[whatsapp-instance] connect_by_number QR fetch error:", e);
        }
      }

      return json({
        success: true,
        alreadyConnected: false,
        instanceName,
        qrcode,
        status: "qrcode",
        phone: normalized,
      });
    }

    // Legacy direct-create flow (no phone number, uses email-derived instanceName)
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

      const instanceAlreadyExists = resp.status === 409 || resp.status === 403;

      if (cp?.id && context !== "financial") {
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
        product_slug: productSlug,
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

      let qrcode = data?.qrcode?.base64 || data?.qrcode || null;
      let connectionStatus = data?.instance?.status || (instanceAlreadyExists ? "exists" : "created");

      // If no QR (instance already existed OR Evolution didn't return one), fetch via /instance/connect
      if (!qrcode) {
        try {
          const connResp = await fetch(
            `${EVOLUTION_URL()}/instance/connect/${encodeURIComponent(instanceName)}`,
            { method: "GET", headers: { apikey: EVOLUTION_KEY() } },
          );
          const connData = await connResp.json().catch(() => null);
          console.log("[whatsapp-instance] connect after create:", connResp.status, JSON.stringify(connData)?.slice(0, 200));
          qrcode = connData?.base64 || connData?.qrcode?.base64 || connData?.qrcode || null;

          // Check if it's already connected
          if (!qrcode) {
            const stateResp = await fetch(
              `${EVOLUTION_URL()}/instance/connectionState/${encodeURIComponent(instanceName)}`,
              { method: "GET", headers: { apikey: EVOLUTION_KEY() } },
            );
            const stateData = await stateResp.json().catch(() => null);
            const st = stateData?.instance?.state || stateData?.state;
            if (st === "open") connectionStatus = "open";
          }
        } catch (e) {
          console.error("[whatsapp-instance] connect fallback error:", e instanceof Error ? e.message : e);
        }
      }

      return json({ success: true, instanceName, qrcode, status: connectionStatus });
    }

    if (action === "qrcode") {
      const resp = await fetch(`${EVOLUTION_URL()}/instance/connect/${encodeURIComponent(instanceName)}`, {
        method: "GET",
        headers: { apikey: EVOLUTION_KEY() },
      });

      const data = await resp.json().catch(() => null);
      console.log("[whatsapp-instance] qrcode response:", resp.status, JSON.stringify(data)?.slice(0, 200));

      if (!resp.ok) {
        return json({ error: "Falha ao obter QR Code", details: data }, resp.status);
      }

      const qrcode = data?.base64 || data?.qrcode?.base64 || data?.qrcode || data?.code || null;
      return json({
        success: true,
        qrcode,
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
      if (context !== "financial") {
        await ensureBotRuntime(sb, user.id, cp.id);
      }
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
