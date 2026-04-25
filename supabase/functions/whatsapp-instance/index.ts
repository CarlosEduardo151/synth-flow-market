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

type EvolutionInstanceInfo = {
  instanceName: string;
  state: string;
  ownerJid: string;
};

async function fetchEvolutionInstances(): Promise<any[]> {
  try {
    const resp = await fetch(`${EVOLUTION_URL()}/instance/fetchInstances`, {
      method: "GET",
      headers: { apikey: EVOLUTION_KEY() },
    });
    if (!resp.ok) {
      console.warn("[whatsapp-instance] fetchInstances failed:", resp.status);
      return [];
    }
    const list = await resp.json().catch(() => []);
    return Array.isArray(list) ? list : [];
  } catch (e) {
    console.error("[whatsapp-instance] fetchEvolutionInstances error:", e);
    return [];
  }
}

function mapEvolutionInstance(inst: any): EvolutionInstanceInfo | null {
  const instanceName = inst?.name || inst?.instanceName || inst?.instance?.instanceName;
  if (!instanceName) return null;
  return {
    instanceName,
    state: inst?.connectionStatus || inst?.state || inst?.instance?.state || "unknown",
    ownerJid: inst?.ownerJid || inst?.owner || inst?.instance?.owner || "",
  };
}

async function findEvolutionInstanceByPhone(normalizedPhone: string): Promise<EvolutionInstanceInfo | null> {
  if (!normalizedPhone) return null;
  const list = await fetchEvolutionInstances();
  for (const inst of list) {
    const mapped = mapEvolutionInstance(inst);
    if (!mapped) continue;
    if (mapped.state !== "open") continue;
    if (ownerJidMatchesPhone(mapped.ownerJid, normalizedPhone)) {
      return mapped;
    }
  }
  return null;
}

async function findEvolutionInstanceByName(instanceName: string): Promise<EvolutionInstanceInfo | null> {
  if (!instanceName) return null;
  const list = await fetchEvolutionInstances();
  for (const inst of list) {
    const mapped = mapEvolutionInstance(inst);
    if (mapped?.instanceName === instanceName) return mapped;
  }
  return null;
}

async function getEvolutionConnectionState(instanceName: string): Promise<string> {
  try {
    const stResp = await fetch(
      `${EVOLUTION_URL()}/instance/connectionState/${encodeURIComponent(instanceName)}`,
      { method: "GET", headers: { apikey: EVOLUTION_KEY() } },
    );
    const stData = await stResp.json().catch(() => null);
    return stData?.instance?.state || stData?.state || "unknown";
  } catch (e) {
    console.error("[whatsapp-instance] connectionState check error:", e);
    return "unknown";
  }
}

function extractQrImage(data: any): string | null {
  return data?.base64 || data?.qrcode?.base64 || (typeof data?.qrcode === "string" ? data.qrcode : null) || null;
}

function extractQrPayload(data: any): string | null {
  return data?.code || data?.qrcode?.code || null;
}

function extractQrValue(data: any): string | null {
  return extractQrImage(data) || extractQrPayload(data);
}

async function requestEvolutionQrCode(instanceName: string): Promise<string | null> {
  try {
    const connResp = await fetch(
      `${EVOLUTION_URL()}/instance/connect/${encodeURIComponent(instanceName)}`,
      { method: "GET", headers: { apikey: EVOLUTION_KEY() } },
    );
    const connData = await connResp.json().catch(() => null);
    return extractQrValue(connData);
  } catch (e) {
    console.error("[whatsapp-instance] QR request error:", e);
    return null;
  }
}

async function deleteEvolutionInstance(instanceName: string): Promise<{ ok: boolean; status: number; data: any }> {
  try {
    const resp = await fetch(`${EVOLUTION_URL()}/instance/delete/${encodeURIComponent(instanceName)}`, {
      method: "DELETE",
      headers: { apikey: EVOLUTION_KEY() },
    });
    const data = await resp.json().catch(() => null);
    console.log("[whatsapp-instance] delete instance response:", resp.status, JSON.stringify(data)?.slice(0, 300));
    return { ok: resp.ok || resp.status === 404, status: resp.status, data };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("[whatsapp-instance] delete instance error:", message);
    return { ok: false, status: 0, data: { message } };
  }
}

function extractEvolutionErrorMessage(data: any): string {
  const providerMessage = data?.response?.message;
  if (Array.isArray(providerMessage) && providerMessage.length) return providerMessage.join(" ");
  if (typeof providerMessage === "string" && providerMessage) return providerMessage;
  if (typeof data?.message === "string" && data.message) return data.message;
  if (typeof data?.error === "string" && data.error) return data.error;
  return "Erro ao comunicar com o provedor do WhatsApp.";
}

function isNameAlreadyInUseError(status: number, data: any): boolean {
  const message = extractEvolutionErrorMessage(data);
  return (status === 403 || status === 409) && /already in use|já.*uso|name.*use/i.test(message);
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

/**
 * Build a UNIFIED instance name for a phone number.
 * IMPORTANT: WhatsApp/Baileys only allows ONE active session per phone number.
 * Therefore we use a single instance name per (user, phone) and share it
 * across all products via fan-out in whatsapp-ingest.
 *
 * Legacy instances created with `_BOT_`, `_FIN_`, `_FINANCIAL_`, `_CRM_`
 * suffixes are detected and reused so a user that already connected
 * doesn't have to re-scan.
 */
function buildFreshInstanceName(baseName: string, normalizedPhone: string, _context: string): string {
  const phoneSuffix = normalizedPhone.slice(-8) || crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  // Single, context-independent name — one number → one Evolution instance.
  return `${baseName}_WA_${phoneSuffix}`.replace(/[^a-zA-Z0-9_-]/g, "_").substring(0, 100);
}

/**
 * Find ANY active Evolution instance already linked to this user (in our DB),
 * regardless of which product/context it was originally created for.
 * Used to enforce the "one number = one instance" invariant.
 */
async function findUserOwnedInstance(sb: any, userId: string): Promise<string | null> {
  const { data: rows } = await sb
    .from("evolution_instances")
    .select("instance_name, updated_at")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(10);
  if (!rows?.length) return null;

  // Verify each one is still alive on Evolution and prefer the one that's "open".
  const evoList = await fetchEvolutionInstances();
  const byName = new Map<string, EvolutionInstanceInfo>();
  for (const inst of evoList) {
    const m = mapEvolutionInstance(inst);
    if (m) byName.set(m.instanceName, m);
  }
  // 1st pass: prefer open
  for (const r of rows) {
    const m = byName.get(r.instance_name);
    if (m?.state === "open") return r.instance_name;
  }
  // 2nd pass: any existing on Evolution
  for (const r of rows) {
    if (byName.has(r.instance_name)) return r.instance_name;
  }
  return null;
}

/**
 * Link the same Evolution instance to ALL of the user's active products
 * (bots-automacao, crm-simples, agente-financeiro). This ensures the
 * fan-out in whatsapp-ingest reaches every product without race conditions.
 */
async function linkInstanceToAllUserProducts(
  sb: any,
  userId: string,
  instanceName: string,
  evolutionUrl: string,
  evolutionKey: string,
): Promise<{ linkedProducts: string[]; webhookUrl: string | null }> {
  const { data: products } = await sb
    .from("customer_products")
    .select("id, product_slug, webhook_token, is_active")
    .eq("user_id", userId)
    .eq("is_active", true)
    .in("product_slug", ["bots-automacao", "crm-simples", "agente-financeiro"]);

  const linked: string[] = [];
  let primaryWebhookUrl: string | null = null;
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const nowIso = new Date().toISOString();

  for (const p of products || []) {
    let token = p.webhook_token;
    if (!token) {
      token = generateWebhookToken();
      await sb.from("customer_products")
        .update({ webhook_token: token, updated_at: nowIso })
        .eq("id", p.id);
    }

    // Deactivate any OTHER instances tied to this product (consolidation)
    await sb.from("evolution_instances")
      .update({ is_active: false, updated_at: nowIso })
      .eq("customer_product_id", p.id)
      .neq("instance_name", instanceName);

    await sb.from("evolution_instances").upsert({
      user_id: userId,
      customer_product_id: p.id,
      instance_name: instanceName,
      evolution_url: evolutionUrl,
      evolution_apikey: evolutionKey,
      is_active: true,
      updated_at: nowIso,
    }, { onConflict: "customer_product_id" });

    await sb.from("product_credentials").upsert({
      user_id: userId,
      product_slug: p.product_slug,
      credential_key: "evolution_instance_name",
      credential_value: instanceName,
      updated_at: nowIso,
    }, { onConflict: "user_id,product_slug,credential_key" });

    if (!primaryWebhookUrl) {
      primaryWebhookUrl = `${supabaseUrl}/functions/v1/whatsapp-ingest?customer_product_id=${p.id}&token=${token}`;
    }
    linked.push(p.product_slug);

    if (p.product_slug !== "agente-financeiro") {
      try { await ensureBotRuntime(sb, userId, p.id); } catch (_) { /* best effort */ }
    }
  }

  return { linkedProducts: linked, webhookUrl: primaryWebhookUrl };
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
      // Evolution API supports only one webhook URL per instance.
      // Route every product through whatsapp-ingest so a reused number can fan-out
      // to CRM, bot engine and financial flows without one product overwriting another.
      return `${supabaseUrl}/functions/v1/whatsapp-ingest?customer_product_id=${cp.id}&token=${cp.webhook_token}`;
    };

    async function resolveLinkedInstanceName() {
      if (cp?.id) {
        const { data: linkedInstance } = await sb
          .from("evolution_instances")
          .select("instance_name")
          .eq("customer_product_id", cp.id)
          .eq("is_active", true)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (linkedInstance?.instance_name) {
          return linkedInstance.instance_name as string;
        }
      }

      return instanceName;
    }

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
    // ACTION: connect_by_number — UNIFIED entry point.
    //
    // Invariant: 1 phone number = 1 Evolution instance.
    // WhatsApp/Baileys only allows one active session per number, so we never
    // create per-product instances. Instead we reuse the same instance and
    // fan out events to every product the user owns (bots, CRM, financial).
    //
    // Flow:
    //  A. If Evolution already has an OPEN instance for this phone → reuse it.
    //  B. Else if the user already owns an instance in our DB (any product) →
    //     reuse that name and force a fresh QR.
    //  C. Else → create a brand-new unified instance.
    //
    // In every case we link the chosen instance to ALL of the user's active
    // products so message routing keeps working even if the user switches tabs.
    // ───────────────────────────────────────────────────────────
    if (action === "connect_by_number") {
      const normalized = normalizePhoneNumber((body.phone as string) || "");
      if (!normalized || normalized.length < 10) {
        return json({ error: "invalid_phone", message: "Número inválido. Digite com DDD (ex: 11 91234-5678)." }, 400);
      }

      const evoUrl = EVOLUTION_URL();
      const evoKey = EVOLUTION_KEY();

      // ── Step A: any Evolution instance already linked to this phone ──
      const existingByPhone = await findEvolutionInstanceByPhone(normalized);
      if (existingByPhone?.instanceName) {
        console.log("[whatsapp-instance] reusing OPEN instance for phone:", existingByPhone.instanceName);
        const { webhookUrl, linkedProducts } = await linkInstanceToAllUserProducts(
          sb, user.id, existingByPhone.instanceName, evoUrl, evoKey,
        );
        if (webhookUrl) await configureWebhook(existingByPhone.instanceName, webhookUrl);

        const realState = await getEvolutionConnectionState(existingByPhone.instanceName);
        if (realState === "open") {
          return json({
            success: true,
            alreadyConnected: true,
            reused: true,
            instanceName: existingByPhone.instanceName,
            status: "open",
            phone: normalized,
            linkedProducts,
          });
        }

        try {
          await fetch(`${evoUrl}/instance/logout/${encodeURIComponent(existingByPhone.instanceName)}`, {
            method: "DELETE", headers: { apikey: evoKey },
          });
        } catch (_) { /* best effort */ }
        const qrcode = await requestEvolutionQrCode(existingByPhone.instanceName);
        return json({
          success: true,
          alreadyConnected: false,
          reused: true,
          instanceName: existingByPhone.instanceName,
          qrcode,
          status: "qrcode",
          phone: normalized,
          linkedProducts,
        });
      }

      // ── Step B: user already owns an instance in our DB (any product) ──
      const ownedInstanceName = await findUserOwnedInstance(sb, user.id);
      if (ownedInstanceName) {
        console.log("[whatsapp-instance] user already owns instance, reusing:", ownedInstanceName);
        const { webhookUrl, linkedProducts } = await linkInstanceToAllUserProducts(
          sb, user.id, ownedInstanceName, evoUrl, evoKey,
        );
        if (webhookUrl) await configureWebhook(ownedInstanceName, webhookUrl);

        const realState = await getEvolutionConnectionState(ownedInstanceName);
        if (realState === "open") {
          return json({
            success: true,
            alreadyConnected: true,
            reused: true,
            instanceName: ownedInstanceName,
            status: "open",
            phone: normalized,
            linkedProducts,
          });
        }

        try {
          await fetch(`${evoUrl}/instance/logout/${encodeURIComponent(ownedInstanceName)}`, {
            method: "DELETE", headers: { apikey: evoKey },
          });
        } catch (_) { /* best effort */ }
        const qrcode = await requestEvolutionQrCode(ownedInstanceName);
        return json({
          success: true,
          alreadyConnected: false,
          reused: true,
          instanceName: ownedInstanceName,
          qrcode,
          status: "qrcode",
          phone: normalized,
          linkedProducts,
        });
      }

      // ── Step C: create a brand-new UNIFIED instance ──
      const freshInstanceName = buildFreshInstanceName(baseInstanceName, normalized, context);
      const staleNamedInstance = await findEvolutionInstanceByName(freshInstanceName);
      if (staleNamedInstance?.instanceName) {
        console.warn("[whatsapp-instance] stale named instance found before create:", freshInstanceName, staleNamedInstance.state);
        const deleted = await deleteEvolutionInstance(freshInstanceName);
        if (!deleted.ok) {
          return json({
            error: "instance_name_in_use",
            message: `A instância ${freshInstanceName} já existia e não pôde ser removida automaticamente.`,
            instanceName: freshInstanceName,
            details: deleted.data,
          }, 409);
        }
      }

      const createInstance = async () => {
        const resp = await fetch(`${evoUrl}/instance/create`, {
          method: "POST",
          headers: { "Content-Type": "application/json", apikey: evoKey },
          body: JSON.stringify({ instanceName: freshInstanceName, integration: "WHATSAPP-BAILEYS", qrcode: true }),
        });
        const data = await resp.json().catch(() => null);
        return { resp, data };
      };

      console.log("[whatsapp-instance] creating UNIFIED instance for", normalized, "→", freshInstanceName);
      let { resp, data } = await createInstance();

      let duplicateName = isNameAlreadyInUseError(resp.status, data);
      if (!resp.ok && duplicateName) {
        const deleted = await deleteEvolutionInstance(freshInstanceName);
        if (!deleted.ok) {
          return json({
            error: "instance_name_in_use",
            message: `A instância ${freshInstanceName} ficou travada no provedor e não pôde ser apagada automaticamente.`,
            instanceName: freshInstanceName,
            details: { create: data, delete: deleted.data },
          }, 409);
        }
        ({ resp, data } = await createInstance());
        duplicateName = isNameAlreadyInUseError(resp.status, data);
      }

      if (!resp.ok) {
        return json({
          error: duplicateName ? "instance_name_in_use" : "create_instance_failed",
          message: duplicateName
            ? `A instância ${freshInstanceName} já existia no provedor.`
            : extractEvolutionErrorMessage(data),
          instanceName: freshInstanceName,
          details: data,
        }, duplicateName ? 409 : resp.status);
      }

      const { webhookUrl, linkedProducts } = await linkInstanceToAllUserProducts(
        sb, user.id, freshInstanceName, evoUrl, evoKey,
      );
      if (webhookUrl) await configureWebhook(freshInstanceName, webhookUrl);

      let qrcode = data?.qrcode?.base64 || data?.qrcode || null;
      if (!qrcode) qrcode = await requestEvolutionQrCode(freshInstanceName);

      return json({
        success: true,
        alreadyConnected: false,
        instanceName: freshInstanceName,
        qrcode,
        status: "qrcode",
        phone: normalized,
        linkedProducts,
      });
    }

    // ───────────────────────────────────────────────────────────
    // ACTION: sync_existing — reconfigura todas as instâncias antigas
    // do usuário (ou de todos, se admin) para apontar webhook para o
    // produto certo, garantindo que mensagens cheguem ao ingest correto
    // e o fan-out + dedup funcionem.
    // ───────────────────────────────────────────────────────────
    if (action === "sync_existing") {
      const scope = (body.scope as string) || "self"; // "self" or "all"
      const isAdmin = await sb.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }: any) => !!data).catch(() => false);
      const targetAll = scope === "all" && isAdmin;

      const { data: rows, error: rowsErr } = await (targetAll
        ? sb.from("evolution_instances").select("id, user_id, customer_product_id, instance_name")
        : sb.from("evolution_instances").select("id, user_id, customer_product_id, instance_name").eq("user_id", user.id));

      if (rowsErr) return json({ error: "list_failed", details: rowsErr.message }, 500);

      // Fetch all Evolution instances once
      let evoList: any[] = [];
      try {
        const r = await fetch(`${EVOLUTION_URL()}/instance/fetchInstances`, { headers: { apikey: EVOLUTION_KEY() } });
        evoList = await r.json().catch(() => []);
        if (!Array.isArray(evoList)) evoList = [];
      } catch (e) {
        return json({ error: "evolution_unreachable", details: String(e) }, 502);
      }

      const findEvoByName = (name: string) =>
        evoList.find((i) => (i?.name || i?.instanceName || i?.instance?.instanceName) === name);

      const results: any[] = [];

      for (const row of (rows || [])) {
        try {
          const evo = findEvoByName(row.instance_name);
          const owner = evo?.ownerJid || evo?.owner || evo?.instance?.owner || "";
          const state = evo?.connectionStatus || evo?.state || evo?.instance?.state || "unknown";
          const ownerDigits = String(owner).split("@")[0].replace(/\D+/g, "");

          // Look up the customer_product to know product_slug
          const { data: cpRow } = await sb
            .from("customer_products")
            .select("id, product_slug, webhook_token, user_id")
            .eq("id", row.customer_product_id)
            .maybeSingle();

          if (!cpRow?.id || !cpRow?.webhook_token) {
            results.push({ instance: row.instance_name, status: "skipped_no_cp" });
            continue;
          }

          const fnPath = "whatsapp-ingest";
          const newWebhook = `${supabaseUrl}/functions/v1/${fnPath}?customer_product_id=${cpRow.id}&token=${cpRow.webhook_token}`;

          // Re-configure webhook on Evolution
          let webhookOk = false;
          try {
            await configureWebhook(row.instance_name, newWebhook);
            webhookOk = true;
          } catch (e) {
            console.error("[sync_existing] webhook err:", row.instance_name, e);
          }

          // Provision bot runtime (CRM/bots) if needed
          if (cpRow.product_slug !== "agente-financeiro") {
            try { await ensureBotRuntime(sb, cpRow.user_id, cpRow.id); } catch (_) {}
          }

          results.push({
            instance: row.instance_name,
            product_slug: cpRow.product_slug,
            phone: ownerDigits || null,
            evolution_state: state,
            webhook_reconfigured: webhookOk,
          });
        } catch (e) {
          results.push({ instance: row.instance_name, error: String(e) });
        }
      }

      return json({ ok: true, total: results.length, results });
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
      const linkedInstanceName = await resolveLinkedInstanceName();
      const resp = await fetch(`${EVOLUTION_URL()}/instance/connect/${encodeURIComponent(linkedInstanceName)}`, {
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
      // Source of truth: must exist in our evolution_instances table.
      // If the user deleted instances on Evolution panel and we cleaned the DB,
      // we must NOT report "connected" just because Evolution still has a stale instance
      // matching the email-derived fallback name.
      const dbQuery = cp?.id
        ? sb
          .from("evolution_instances")
          .select("instance_name, is_active")
          .eq("customer_product_id", cp.id)
          .eq("is_active", true)
        : sb
          .from("evolution_instances")
          .select("instance_name, is_active")
          .eq("user_id", user.id)
          .eq("is_active", true);

      const { data: dbInst } = await dbQuery
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!dbInst?.instance_name) {
        console.log("[whatsapp-instance] status: no DB instance for user", user.id);
        return json({ connected: false, state: "not_provisioned", instanceName: null });
      }

      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 8000);
        const resp = await fetch(`${EVOLUTION_URL()}/instance/connectionState/${encodeURIComponent(dbInst.instance_name)}`, {
          method: "GET",
          headers: { apikey: EVOLUTION_KEY() },
          signal: ctrl.signal,
        }).finally(() => clearTimeout(t));

        const data = await resp.json().catch(() => null);
        console.log("[whatsapp-instance] status response:", resp.status, JSON.stringify(data));

        if (!resp.ok) {
          return json({ connected: false, state: "disconnected", instanceName: dbInst.instance_name });
        }

        const state = data?.instance?.state || data?.state || "close";
        const connected = state === "open";

        // ── Auto-healing camada 1: adotar outra instância OPEN do mesmo usuário ──
        if (!connected) {
          const healed = await findUserOwnedInstance(sb, user.id);
          if (healed && healed !== dbInst.instance_name) {
            const healedState = await getEvolutionConnectionState(healed);
            if (healedState === "open") {
              console.log("[whatsapp-instance] status auto-heal: switching from", dbInst.instance_name, "to", healed);
              await linkInstanceToAllUserProducts(sb, user.id, healed, EVOLUTION_URL(), EVOLUTION_KEY());
              await sb.from("evolution_instances").update({
                connection_state: "open",
                last_health_check_at: new Date().toISOString(),
                reconnect_attempts: 0,
                next_reconnect_at: null,
                last_reconnect_error: null,
              }).eq("instance_name", healed);
              return json({ connected: true, state: "open", instanceName: healed, healed: true });
            }
          }

          // ── Auto-healing camada 2: tentar reconectar a própria instância ──
          // Respeitamos o backoff persistido para não martelar o Evolution.
          try {
            const { data: meta } = await sb
              .from("evolution_instances")
              .select("reconnect_attempts, next_reconnect_at")
              .eq("instance_name", dbInst.instance_name)
              .eq("is_active", true)
              .limit(1)
              .maybeSingle();

            const dueAt = meta?.next_reconnect_at ? new Date(meta.next_reconnect_at as string).getTime() : 0;
            if (dueAt <= Date.now()) {
              console.log("[whatsapp-instance] status auto-heal: trying connect on", dbInst.instance_name);
              try {
                await fetch(
                  `${EVOLUTION_URL()}/instance/connect/${encodeURIComponent(dbInst.instance_name)}`,
                  { method: "GET", headers: { apikey: EVOLUTION_KEY() } },
                );
              } catch (_) { /* best effort */ }

              await new Promise((r) => setTimeout(r, 1500));
              const after = await getEvolutionConnectionState(dbInst.instance_name);
              const attempts = (meta?.reconnect_attempts as number) || 0;
              const backoff = [30, 60, 120, 300, 600, 1200, 1800];
              const delay = backoff[Math.min(attempts, backoff.length - 1)];

              if (after === "open" || after === "connecting") {
                await sb.from("evolution_instances").update({
                  connection_state: after,
                  last_health_check_at: new Date().toISOString(),
                  last_reconnect_attempt_at: new Date().toISOString(),
                  reconnect_attempts: after === "open" ? 0 : Math.max(0, attempts - 1),
                  next_reconnect_at: after === "open" ? null : new Date(Date.now() + 30_000).toISOString(),
                  last_reconnect_error: null,
                }).eq("instance_name", dbInst.instance_name);
                return json({
                  connected: after === "open",
                  state: after,
                  instanceName: dbInst.instance_name,
                  healed: after === "open",
                });
              }

              await sb.from("evolution_instances").update({
                connection_state: after,
                last_health_check_at: new Date().toISOString(),
                last_reconnect_attempt_at: new Date().toISOString(),
                reconnect_attempts: attempts + 1,
                next_reconnect_at: new Date(Date.now() + delay * 1000).toISOString(),
                last_reconnect_error: `state=${after}`,
              }).eq("instance_name", dbInst.instance_name);

              return json({
                connected: false,
                state: after,
                instanceName: dbInst.instance_name,
                retrying: true,
                next_attempt_in_seconds: delay,
              });
            }
          } catch (e) {
            console.error("[whatsapp-instance] inline auto-heal error:", e instanceof Error ? e.message : e);
          }
        } else {
          // Healthy → reseta backoff
          await sb.from("evolution_instances").update({
            connection_state: "open",
            last_health_check_at: new Date().toISOString(),
            reconnect_attempts: 0,
            next_reconnect_at: null,
            last_reconnect_error: null,
          }).eq("instance_name", dbInst.instance_name);
        }

        return json({ connected, state, instanceName: dbInst.instance_name });
      } catch (netErr) {
        const msg = netErr instanceof Error ? netErr.message : "network error";
        console.error("[whatsapp-instance] status network error:", msg);
        // Evolution API offline/timeout → don't crash the UI, return graceful fallback
        return json({
          connected: false,
          state: "service_unavailable",
          instanceName: dbInst.instance_name,
          fallback: true,
          error: "evolution_api_unreachable",
        });
      }
    }

    if (action === "reconfigure_webhook") {
      const webhookUrl = buildWebhookUrl();
      if (!webhookUrl) {
        return json({ error: "No customer_product or webhook_token found" }, 400);
      }
      if (context !== "financial") {
        await ensureBotRuntime(sb, user.id, cp.id);
      }
      const linkedInstanceName = await resolveLinkedInstanceName();
      await configureWebhook(linkedInstanceName, webhookUrl);
      return json({ success: true, webhookUrl });
    }

    if (action === "purge_instance") {
      const requestedName = String(body.instanceName || "").trim() || await resolveLinkedInstanceName();
      if (!requestedName) {
        return json({ error: "instance_name_required", message: "Informe o nome da instância para apagar." }, 400);
      }

      const deleted = await deleteEvolutionInstance(requestedName);
      if (!deleted.ok) {
        return json({
          error: "delete_instance_failed",
          message: `Não foi possível apagar a instância ${requestedName}.`,
          instanceName: requestedName,
          details: deleted.data,
        }, deleted.status || 500);
      }

      await sb
        .from("evolution_instances")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("instance_name", requestedName)
        .then(({ error: e }: any) => {
          if (e) console.error("[whatsapp-instance] purge evolution_instances update error:", e.message);
        });

      return json({ success: true, instanceName: requestedName, message: "Instância apagada com sucesso." });
    }

    if (action === "disconnect") {
      const linkedInstanceName = await resolveLinkedInstanceName();
      const resp = await fetch(`${EVOLUTION_URL()}/instance/logout/${encodeURIComponent(linkedInstanceName)}`, {
        method: "DELETE",
        headers: { apikey: EVOLUTION_KEY() },
      });
      await resp.text();
      return json({ success: true });
    }

    if (action === "force_reconnect") {
      // Forçar uma reconexão imediata da instância do usuário, ignorando backoff,
      // delegando ao worker whatsapp-auto-reconnect (mesmo backoff/healing logic).
      // Se mesmo após a tentativa a instância continuar fora do estado "open",
      // tentamos buscar o QR code para que o usuário possa re-escanear.
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      try {
        const r = await fetch(`${supabaseUrl}/functions/v1/whatsapp-auto-reconnect`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({ user_id: user.id, force: true }),
        });
        const data = await r.json().catch(() => ({}));

        // Verifica resultado e busca QR se ainda não está open
        const results = (data?.results || []) as any[];
        const target = results.find((x: any) => x?.action !== "healthy") || results[0];
        const finalState = target?.state || "unknown";
        let qrcode: string | null = null;
        let pairingCode: string | null = null;

        if (finalState !== "open") {
          // Tenta obter QR para re-scan (a chamada /instance/connect na auto-reconnect
          // já dispara o QR no backend; aqui apenas recuperamos o base64 atual)
          try {
            const linkedInstanceName = await resolveLinkedInstanceName();
            const qrResp = await fetch(
              `${EVOLUTION_URL()}/instance/connect/${encodeURIComponent(linkedInstanceName)}`,
              { method: "GET", headers: { apikey: EVOLUTION_KEY() } },
            );
            const qrData = await qrResp.json().catch(() => null);
            qrcode = qrData?.base64 || qrData?.qrcode?.base64 || qrData?.qrcode || qrData?.code || null;
            pairingCode = qrData?.pairingCode || null;
          } catch (qrErr) {
            console.warn("[whatsapp-instance] force_reconnect: failed to fetch QR:", qrErr);
          }
        }

        return json({
          success: r.ok,
          state: finalState,
          connected: finalState === "open",
          qrcode,
          pairingCode,
          ...data,
        });
      } catch (e) {
        return json({ success: false, error: e instanceof Error ? e.message : String(e) }, 500);
      }
    }

    return json({ error: "invalid action" }, 400);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    console.error("[whatsapp-instance] error:", msg);
    if (msg === "unauthorized") return json({ error: msg }, 401);
    // External API connectivity issues → return 200 with fallback so the UI doesn't crash
    const isNetwork =
      /tcp connect|Connection timed out|error sending request|ECONNREFUSED|fetch failed|network|aborted/i.test(msg);
    if (isNetwork) {
      return json({
        connected: false,
        state: "service_unavailable",
        fallback: true,
        error: "evolution_api_unreachable",
        detail: msg,
      });
    }
    return json({ error: msg }, 500);
  }
});
