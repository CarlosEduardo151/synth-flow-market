import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

import { corsResponse, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from "../_shared/rate-limit.ts";
import { sanitizeString, validateUUID } from "../_shared/validation.ts";
import {
  processText,
  processImage,
  processAudio,
  resolveAICredentials,
} from "../_shared/ai-providers.ts";
import { zapiSendText, loadZAPICredentials } from "../_shared/zapi.ts";

/**
 * WhatsApp Bot Engine — motor nativo (sem n8n, sem Lovable AI Gateway).
 *
 * Fluxo:
 * 1. Recebe webhook Z-API via query ?token=...&customer_product_id=...
 * 2. Valida token + customer_product_id contra DB
 * 3. Ignora mensagens "fromMe" e aplica rate-limit por telefone
 * 4. Roteia por tipo: texto → AI, áudio → transcrição + AI, imagem → visão
 * 5. Responde via Z-API send-text
 *
 * Segurança:
 * - Webhook público, autenticação via token único por customer_product
 * - Rate limit por IP + por telefone (anti-flood)
 * - Payload máximo 500KB
 * - Inputs sanitizados
 * - API keys nunca expostas ao cliente
 */

// ========== Anti-flood: block "fromMe" phone for 5min ==========
const BLOCK_TTL_MS = 5 * 60 * 1000;
const blockMap = new Map<string, number>();

function isBlocked(phone: string): boolean {
  const exp = blockMap.get(phone);
  if (!exp) return false;
  if (Date.now() > exp) { blockMap.delete(phone); return false; }
  return true;
}
function setBlock(phone: string) { blockMap.set(phone, Date.now() + BLOCK_TTL_MS); }
function cleanupBlockMap() {
  const now = Date.now();
  for (const [k, v] of blockMap) { if (now > v) blockMap.delete(k); }
}

// ========== Per-phone rate limiter (max 10 messages per 60s) ==========
const phoneRateMap = new Map<string, number[]>();
const PHONE_RATE_WINDOW = 60_000;
const PHONE_RATE_MAX = 10;

function isPhoneRateLimited(phone: string): boolean {
  const now = Date.now();
  const timestamps = (phoneRateMap.get(phone) || []).filter(t => now - t < PHONE_RATE_WINDOW);
  if (timestamps.length >= PHONE_RATE_MAX) {
    phoneRateMap.set(phone, timestamps);
    return true;
  }
  timestamps.push(now);
  phoneRateMap.set(phone, timestamps);
  return false;
}

// ========== Main ==========

serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
  if (req.method !== "POST") return corsResponse({ error: "method_not_allowed" }, 405, origin);

  // IP-level rate limit
  const identifier = getClientIdentifier(req);
  const { limited } = checkRateLimit(identifier, RATE_LIMITS.WEBHOOK);
  if (limited) return corsResponse({ error: "rate_limited" }, 429, origin);

  try {
    const url = new URL(req.url);
    const queryToken = sanitizeString(url.searchParams.get("token") || "");
    const customerProductId = sanitizeString(url.searchParams.get("customer_product_id") || "");

    // Validate inputs
    if (!queryToken || queryToken.length < 16) {
      return corsResponse({ error: "invalid_token" }, 400, origin);
    }
    const uuidError = validateUUID(customerProductId, "customer_product_id");
    if (uuidError) {
      return corsResponse({ error: "invalid_customer_product_id" }, 400, origin);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(supabaseUrl, serviceKey);

    // Validate webhook token
    const { data: cp, error: cpErr } = await service
      .from("customer_products")
      .select("id, user_id")
      .eq("id", customerProductId)
      .eq("webhook_token", queryToken)
      .maybeSingle();
    if (cpErr) throw cpErr;
    if (!cp?.id) return corsResponse({ error: "unauthorized" }, 401, origin);

    // Parse body (max 500KB)
    const bodyText = await req.text();
    if (bodyText.length > 500_000) return corsResponse({ error: "payload_too_large" }, 413, origin);

    let payload: any;
    try { payload = JSON.parse(bodyText); } catch { return corsResponse({ error: "invalid_json" }, 400, origin); }

    // Persist raw event
    await service.from("whatsapp_inbox_events").insert({
      customer_product_id: cp.id,
      source: "z-api",
      payload,
    }).then(({ error }) => { if (error) console.error("event_insert_error:", error.message); });

    // Extract message fields
    const body = payload?.body || payload;
    const phone = sanitizeString(body?.phone || body?.from || "");
    const fromMe = body?.fromMe === true;
    const messageId = sanitizeString(body?.messageId || "");

    if (!phone) return corsResponse({ ok: true, skipped: "no_phone" }, 200, origin);

    // Block fromMe messages (prevent echo loops)
    if (fromMe) { setBlock(phone); return corsResponse({ ok: true, skipped: "from_me" }, 200, origin); }

    // Cleanup + check blocks
    cleanupBlockMap();
    if (isBlocked(phone)) return corsResponse({ ok: true, skipped: "blocked" }, 200, origin);

    // Per-phone rate limit
    if (isPhoneRateLimited(phone)) {
      return corsResponse({ ok: true, skipped: "phone_rate_limited" }, 200, origin);
    }

    // ===== Load client config =====

    // 1. Z-API credentials
    const zapiCreds = await loadZAPICredentials(service, cp.user_id);
    if (!zapiCreds) {
      console.error("Z-API creds missing for user", cp.user_id);
      return corsResponse({ ok: true, skipped: "no_zapi_creds" }, 200, origin);
    }

    // 2. AI config
    const { data: aiConfig } = await service
      .from("ai_control_config")
      .select("provider, model, system_prompt, temperature, max_tokens, business_name, is_active")
      .eq("customer_product_id", customerProductId)
      .maybeSingle();

    // Check if bot is active
    if (aiConfig && aiConfig.is_active === false) {
      return corsResponse({ ok: true, skipped: "bot_inactive" }, 200, origin);
    }

    const provider = (aiConfig?.provider as string) || "google";
    const temperature = Number(aiConfig?.temperature ?? 0.7);
    const maxTokens = Number(aiConfig?.max_tokens ?? 512);
    const systemPrompt = (aiConfig?.system_prompt as string) ||
      `Você é o agente StarAI do negócio ${aiConfig?.business_name || ""}. Responda de forma objetiva e útil em português.`;

    // 3. Resolve AI credentials
    const resolved = await resolveAICredentials(
      service,
      provider,
      cp.user_id,
      aiConfig?.model,
    );

    if (!resolved) {
      console.error(`AI key missing: provider=${provider}, user=${cp.user_id}`);
      await zapiSendText(
        zapiCreds,
        phone,
        "⚠️ O bot ainda não está configurado. O administrador precisa configurar a chave de IA no painel.",
        messageId,
      );
      return corsResponse({ ok: true, skipped: "no_ai_key" }, 200, origin);
    }

    const aiOpts = {
      apiKey: resolved.apiKey,
      model: resolved.model,
      systemPrompt,
      temperature,
      maxTokens,
    };

    // ===== Process message by type =====
    const hasImage = !!body?.image;
    const hasAudio = !!body?.audio;
    const hasText = !!body?.text;

    let reply = "";

    if (hasImage) {
      const imageUrl = body.image?.imageUrl || body.image?.url || "";
      const caption = sanitizeString(body.image?.caption || "");
      if (imageUrl) {
        reply = await processImage(resolved.resolvedProvider, aiOpts, imageUrl, caption);
      } else {
        reply = "Não consegui acessar a imagem. Pode enviar novamente?";
      }
    } else if (hasAudio) {
      const audioUrl = body.audio?.audioUrl || body.audio?.url || "";
      if (audioUrl) {
        reply = await processAudio(resolved.resolvedProvider, aiOpts, audioUrl);
      } else {
        reply = "Não consegui acessar o áudio. Pode enviar novamente?";
      }
    } else if (hasText) {
      const userMessage = sanitizeString(
        typeof body.text === "string" ? body.text : body.text?.message || "",
      );
      if (userMessage) {
        reply = await processText(resolved.resolvedProvider, aiOpts, userMessage);
      }
    } else {
      reply = "Desculpe, não consigo processar esse tipo de mensagem ainda.";
    }

    // Send reply
    if (reply) {
      await zapiSendText(zapiCreds, phone, reply, messageId);
    }

    // Mark as processed
    await service
      .from("whatsapp_inbox_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("customer_product_id", cp.id)
      .is("processed_at", null)
      .order("received_at", { ascending: false })
      .limit(1);

    return corsResponse({
      ok: true,
      type: hasImage ? "image" : hasAudio ? "audio" : "text",
      provider,
      resolvedProvider: resolved.resolvedProvider,
    }, 200, origin);
  } catch (error) {
    console.error("whatsapp-bot-engine error:", error);
    return corsResponse({ error: "internal_error" }, 500, origin);
  }
});
