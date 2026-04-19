import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

import { corsResponse, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from "../_shared/rate-limit.ts";
import { batchValidate, sanitizeString, validateStringLength, validateUUID } from "../_shared/validation.ts";

// In-memory dedup to avoid forwarding the same webhook event multiple times.
const INGEST_DEDUP_TTL_MS = 10 * 60 * 1000;
const ingestDedupMap = new Map<string, number>();

function cleanupIngestDedup() {
  const now = Date.now();
  for (const [k, v] of ingestDedupMap) {
    if (now > v) ingestDedupMap.delete(k);
  }
}

function hasRecentIngestDedup(key: string): boolean {
  const exp = ingestDedupMap.get(key);
  if (!exp) return false;
  if (Date.now() > exp) {
    ingestDedupMap.delete(key);
    return false;
  }
  return true;
}

function rememberIngestDedup(key: string) {
  if (!key) return;
  ingestDedupMap.set(key, Date.now() + INGEST_DEDUP_TTL_MS);
}

/**
 * Verifica se o horário atual (no fuso configurado) está dentro do expediente
 * e do dia da semana ativo definido em crm_capture_settings.
 */
function isWithinBusinessHours(settings: {
  business_hours_start: string;
  business_hours_end: string;
  active_weekdays: number[];
  timezone: string;
}): boolean {
  try {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: settings.timezone || "America/Sao_Paulo",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      weekday: "short",
    });
    const parts = fmt.formatToParts(now);
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value || "0", 10);
    const minute = parseInt(parts.find((p) => p.type === "minute")?.value || "0", 10);
    const wd = parts.find((p) => p.type === "weekday")?.value || "";
    const wdMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const today = wdMap[wd] ?? new Date().getDay();

    if (!settings.active_weekdays.includes(today)) return false;

    const [sh, sm] = settings.business_hours_start.split(":").map((n) => parseInt(n, 10));
    const [eh, em] = settings.business_hours_end.split(":").map((n) => parseInt(n, 10));
    const cur = hour * 60 + minute;
    const start = sh * 60 + (sm || 0);
    const end = eh * 60 + (em || 0);
    return cur >= start && cur <= end;
  } catch (e) {
    console.error("[capture] business-hours check failed:", e);
    return true; // fail-open
  }
}

/**
 * Usa Lovable AI para extrair nome / empresa / interesse a partir
 * da primeira mensagem + nome do perfil WhatsApp.
 */
async function enrichLeadWithAI(
  senderName: string,
  phone: string,
  message: string,
): Promise<{ name?: string; company?: string; business_type?: string; notes?: string }> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return {};

  try {
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content:
              "Você extrai dados de contato a partir de mensagens recebidas no WhatsApp de empresas. Responda apenas via tool calling.",
          },
          {
            role: "user",
            content: `Nome do perfil WhatsApp: "${senderName}"\nTelefone: "${phone}"\nPrimeira mensagem recebida: """${message.slice(0, 500)}"""\n\nExtraia o que conseguir identificar.`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_lead",
              description: "Retorna informações estruturadas do lead.",
              parameters: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Nome real do contato (preferir o nome do perfil se realista)" },
                  company: { type: "string", description: "Empresa mencionada, se houver" },
                  business_type: { type: "string", description: "Segmento/tipo de negócio inferido" },
                  interest: { type: "string", description: "Resumo curto do que o lead procura (1 frase)" },
                },
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_lead" } },
      }),
    });

    if (!resp.ok) {
      console.warn("[capture] AI enrichment failed:", resp.status);
      return {};
    }
    const data = await resp.json();
    const args = data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    if (!args) return {};
    const parsed = JSON.parse(args);
    return {
      name: parsed.name?.trim() || undefined,
      company: parsed.company?.trim() || undefined,
      business_type: parsed.business_type?.trim() || undefined,
      notes: parsed.interest?.trim() ? `Interesse: ${parsed.interest.trim()}` : undefined,
    };
  } catch (e) {
    console.error("[capture] AI enrichment error:", e);
    return {};
  }
}

/**
 * Captura automática: cria/atualiza lead em crm_customers respeitando
 * horário comercial e configurações do produto.
 */
async function captureLeadIfNeeded(
  service: any,
  customerProductId: string,
  phone: string,
  senderName: string,
  message: string,
): Promise<void> {
  if (!phone) return;

  // Carrega config (cria default se não existir)
  let { data: settings } = await service
    .from("crm_capture_settings")
    .select("*")
    .eq("customer_product_id", customerProductId)
    .maybeSingle();

  if (!settings) {
    const { data: created } = await service
      .from("crm_capture_settings")
      .insert({ customer_product_id: customerProductId })
      .select("*")
      .maybeSingle();
    settings = created;
    if (!settings) return;
  }

  if (!settings.is_enabled) {
    console.log("[capture] disabled for product", customerProductId);
    return;
  }

  const within = isWithinBusinessHours(settings);
  if (!within && settings.ignore_outside_hours) {
    console.log("[capture] outside business hours, skipping");
    return;
  }

  // Já existe?
  const { data: existing } = await service
    .from("crm_customers")
    .select("id")
    .eq("customer_product_id", customerProductId)
    .eq("phone", phone)
    .maybeSingle();

  if (existing?.id) {
    // Atualiza last_contact_date apenas
    await service
      .from("crm_customers")
      .update({ last_contact_date: new Date().toISOString() })
      .eq("id", existing.id);
    console.log("[capture] existing lead updated:", existing.id);
    return;
  }

  // Enriquecer (opcional)
  let enriched: { name?: string; company?: string; business_type?: string; notes?: string } = {};
  if (settings.ai_enrichment_enabled) {
    enriched = await enrichLeadWithAI(senderName, phone, message);
  }

  const finalName = enriched.name || senderName || phone;

  const { data: inserted, error: insErr } = await service
    .from("crm_customers")
    .insert({
      customer_product_id: customerProductId,
      name: finalName,
      phone,
      company: enriched.company || null,
      business_type: enriched.business_type || null,
      notes: enriched.notes || `Capturado automaticamente do WhatsApp em ${new Date().toLocaleString("pt-BR")}`,
      status: settings.default_status || "lead",
      source: settings.default_source || "whatsapp",
      last_contact_date: new Date().toISOString(),
    })
    .select("id")
    .maybeSingle();

  if (insErr) {
    console.error("[capture] insert error:", insErr.message);
    return;
  }
  console.log("[capture] new lead created:", inserted?.id, finalName);
}

/**
 * Fetch media as base64 from Evolution API using the message key ID.
 * This is the reliable fallback when webhookBase64 doesn't deliver inline data.
 */
async function fetchBase64FromEvolution(
  instanceName: string,
  messageKeyId: string,
): Promise<{ base64: string; mimeType: string } | null> {
  const evoUrl = (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/$/, "");
  const evoKey = Deno.env.get("EVOLUTION_GLOBAL_APIKEY") || "";
  if (!evoUrl || !evoKey || !instanceName || !messageKeyId) return null;

  try {
    const resp = await fetch(
      `${evoUrl}/chat/getBase64FromMediaMessage/${encodeURIComponent(instanceName)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: evoKey },
        body: JSON.stringify({
          message: { key: { id: messageKeyId } },
          convertToMp4: false,
        }),
      },
    );
    const json = await resp.json().catch(() => null);
    console.log("[ingest] getBase64 response:", resp.status, json ? `${JSON.stringify(json).slice(0, 200)}...` : "null");

    if (!resp.ok || !json) return null;

    // Evolution returns { base64: "data:audio/ogg;base64,..." } or { base64: "<raw>" }
    const raw = json?.base64 || "";
    if (!raw) return null;

    // Strip data URI prefix if present
    const dataUriMatch = raw.match(/^data:([^;]+);base64,(.+)$/);
    if (dataUriMatch) {
      return { base64: dataUriMatch[2], mimeType: dataUriMatch[1] };
    }
    return { base64: raw, mimeType: json?.mimetype || "application/octet-stream" };
  } catch (e) {
    console.error("[ingest] getBase64 error:", e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * WhatsApp webhook ingestion — normalizes Evolution API payloads
 * into Z-API-like format before forwarding to bot engine.
 */

/**
 * Transform Evolution API "messages.upsert" payload into the
 * Z-API-like format the bot engine expects.
 */
function normalizeEvolutionPayload(raw: any): any {
  // If it already has Z-API shape, pass through
  if (raw?.phone && (raw?.text || raw?.image || raw?.audio)) {
    return raw;
  }

  const event = raw?.event || "";
  const data = raw?.data;

  // Only process message events
  if (!data?.key) {
    console.log("[ingest] non-message event:", event);
    return null;
  }

  const key = data.key;
  const remoteJid = key.remoteJid || "";
  // Extract phone number: remove @s.whatsapp.net / @g.us
  const phone = remoteJid.replace(/@.*$/, "");
  const fromMe = key.fromMe === true;
  const messageId = key.id || "";

  const message = data.message || {};
  const pushName = data.pushName || "";

  // Build the normalized payload
  const normalized: any = {
    phone,
    fromMe,
    messageId,
    senderName: pushName,
    // Keep raw event type for debugging
    _evolutionEvent: event,
  };

  // Text message
  if (message.conversation) {
    normalized.text = { message: message.conversation };
  } else if (message.extendedTextMessage?.text) {
    normalized.text = { message: message.extendedTextMessage.text };
  }
  // Image
  else if (message.imageMessage) {
    normalized.image = {
      imageUrl: message.imageMessage.url || data.media?.url || "",
      caption: message.imageMessage.caption || "",
      mimeType: message.imageMessage.mimetype || "",
    };
  }
  // Audio / PTT (voice note)
  else if (message.audioMessage) {
    normalized.audio = {
      audioUrl: message.audioMessage.url || data.media?.url || "",
      mimeType: message.audioMessage.mimetype || "",
      base64: message.audioMessage.base64 || data.message?.base64 || "",
    };
  }
  // Video
  else if (message.videoMessage) {
    normalized.video = {
      videoUrl: message.videoMessage.url || data.media?.url || "",
      caption: message.videoMessage.caption || "",
      mimeType: message.videoMessage.mimetype || "",
    };
  }
  // Document
  else if (message.documentMessage) {
    normalized.document = {
      documentUrl: message.documentMessage.url || data.media?.url || "",
      fileName: message.documentMessage.fileName || "",
      mimeType: message.documentMessage.mimetype || "",
    };
  }
  // Sticker
  else if (message.stickerMessage) {
    normalized.sticker = {
      stickerUrl: message.stickerMessage.url || data.media?.url || "",
    };
  }
  // Location
  else if (message.locationMessage) {
    normalized.location = {
      latitude: message.locationMessage.degreesLatitude,
      longitude: message.locationMessage.degreesLongitude,
      name: message.locationMessage.name || "",
      address: message.locationMessage.address || "",
    };
  }
  // Contact
  else if (message.contactMessage) {
    normalized.contact = {
      displayName: message.contactMessage.displayName || "",
      vcard: message.contactMessage.vcard || "",
    };
  }
  // Fallback: try to extract any text
  else {
    // Some events (e.g. reactions, edits) might not have processable content
    const anyText = message.editedMessage?.message?.conversation
      || message.buttonsResponseMessage?.selectedDisplayText
      || message.listResponseMessage?.title
      || "";
    if (anyText) {
      normalized.text = { message: anyText };
    } else {
      console.log("[ingest] unhandled message type:", JSON.stringify(Object.keys(message)));
      return null;
    }
  }

  return normalized;
}

serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  if (req.method !== "POST") {
    return corsResponse({ error: "method_not_allowed" }, 405, origin);
  }

  const identifier = getClientIdentifier(req);
  const { limited, retryAfter } = checkRateLimit(identifier, RATE_LIMITS.WEBHOOK);
  if (limited) {
    return corsResponse({ error: "rate_limited", retryAfter }, 429, origin);
  }

  try {
    const url = new URL(req.url);
    const token = sanitizeString(url.searchParams.get("token") || "");
    const customerProductId = sanitizeString(url.searchParams.get("customer_product_id") || "");

    const errors = batchValidate([
      validateStringLength(token, "token", 16, 200),
      validateUUID(customerProductId, "customer_product_id"),
    ]);
    if (errors.length) {
      return corsResponse({ error: "validation_error", details: errors }, 400, origin);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(supabaseUrl, serviceKey);

    // Authenticate webhook
    const { data: cp, error: cpErr } = await service
      .from("customer_products")
      .select("id, product_slug")
      .eq("id", customerProductId)
      .eq("webhook_token", token)
      .maybeSingle();
    if (cpErr) throw cpErr;
    if (!cp?.id) return corsResponse({ error: "unauthorized" }, 401, origin);

    const isCRM = cp.product_slug === "crm-simples";

    const bodyText = await req.text();
    if (bodyText.length > 250_000) {
      return corsResponse({ error: "payload_too_large" }, 413, origin);
    }

    let rawPayload: any;
    try {
      rawPayload = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      return corsResponse({ error: "invalid_json" }, 400, origin);
    }

    console.log("[ingest] event received:", rawPayload?.event || "unknown", "instance:", rawPayload?.instance || "n/a");

    // Skip non-message events (connection updates, qrcode updates, etc.)
    // Evolution API sends uppercase events like MESSAGES_UPSERT, normalize to lowercase
    const event = (rawPayload?.event || "").toLowerCase();
    if (event && !event.startsWith("messages")) {
      console.log("[ingest] skipping non-message event:", event);
      return corsResponse({ ok: true, skipped: "non_message_event" }, 200, origin);
    }

    // Normalize Evolution API payload → Z-API-like format
    const normalized = normalizeEvolutionPayload(rawPayload);
    if (!normalized) {
      return corsResponse({ ok: true, skipped: "unprocessable_event" }, 200, origin);
    }

    cleanupIngestDedup();
    const ingestDedupKey = `${cp.id}:${normalized.messageId || `${normalized.phone}:${normalized.fromMe}:${(normalized.text?.message || normalized.image?.caption || normalized.video?.caption || normalized.document?.fileName || normalized.location?.name || normalized.contact?.displayName || '[media]').toString().trim().slice(0, 120)}`}`;
    if (hasRecentIngestDedup(ingestDedupKey)) {
      console.log("[ingest] duplicate event skipped:", ingestDedupKey);
      return corsResponse({ ok: true, skipped: "duplicate_event" }, 200, origin);
    }
    rememberIngestDedup(ingestDedupKey);

    // ── Enrich media with base64 from Evolution API when webhook didn't include it ──
    const instanceName = rawPayload?.instance || "";
    const messageKeyId = rawPayload?.data?.key?.id || normalized.messageId || "";

    const needsBase64 =
      (normalized.audio && !normalized.audio.base64) ||
      (normalized.image && !normalized.image.base64) ||
      (normalized.video && !normalized.video.base64) ||
      (normalized.document && !normalized.document.base64);

    if (needsBase64 && instanceName && messageKeyId) {
      console.log("[ingest] media without base64, fetching from Evolution...");
      const fetched = await fetchBase64FromEvolution(instanceName, messageKeyId);
      if (fetched) {
        console.log("[ingest] base64 fetched successfully:", fetched.mimeType, `${fetched.base64.length} chars`);
        if (normalized.audio) {
          normalized.audio.base64 = fetched.base64;
          normalized.audio.mimeType = normalized.audio.mimeType || fetched.mimeType;
        } else if (normalized.image) {
          normalized.image.base64 = fetched.base64;
          normalized.image.mimeType = normalized.image.mimeType || fetched.mimeType;
        } else if (normalized.video) {
          normalized.video.base64 = fetched.base64;
          normalized.video.mimeType = normalized.video.mimeType || fetched.mimeType;
        } else if (normalized.document) {
          normalized.document.base64 = fetched.base64;
          normalized.document.mimeType = normalized.document.mimeType || fetched.mimeType;
        }
      } else {
        console.warn("[ingest] base64 fetch failed — engine will try URL fallback");
      }
    }

    // ── CRM path: store message directly as a lead log ──
    if (isCRM) {
      // Skip messages sent by the connected number itself
      if (normalized.fromMe) {
        console.log("[ingest][CRM] skipping fromMe message");
        return corsResponse({ ok: true, skipped: "from_me" }, 200, origin);
      }

      const messageText =
        normalized.text?.message ||
        normalized.image?.caption ||
        normalized.video?.caption ||
        normalized.document?.fileName ||
        normalized.location?.name ||
        normalized.contact?.displayName ||
        "[mídia recebida]";

      const phone = normalized.phone || "";
      const senderName = normalized.senderName || "";

      console.log("[ingest][CRM] storing lead message from:", phone, "text:", messageText.slice(0, 100));

      // Store in bot_conversation_logs so the CRM activity log picks it up
      const { error: logErr } = await service
        .from("bot_conversation_logs")
        .insert({
          customer_product_id: cp.id,
          direction: "inbound",
          phone,
          message_text: messageText,
          source: "whatsapp",
          provider: "crm_lead",
          model: senderName || null,
        });

      if (logErr) {
        console.error("[ingest][CRM] log insert error:", logErr.message);
      }

      // ── Captura automática de lead ──
      try {
        await captureLeadIfNeeded(service, cp.id, phone, senderName, messageText);
      } catch (e) {
        console.error("[ingest][CRM] capture error:", e);
      }

      return corsResponse({ ok: true, crm: true }, 200, origin);
    }

    // ── Bot path: forward to bot engine ──
    const normalizedBody = JSON.stringify(normalized);

    const engineUrl = `${supabaseUrl}/functions/v1/whatsapp-bot-engine?customer_product_id=${encodeURIComponent(cp.id)}&token=${encodeURIComponent(token)}`;

    const engineResp = await fetch(engineUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${serviceKey}`,
      },
      body: normalizedBody,
    });

    const engineText = await engineResp.text().catch(() => "");
    console.log("[ingest] bot-engine response:", engineResp.status, engineText.slice(0, 500));

    if (!engineResp.ok) {
      return corsResponse({ ok: false, engine_status: engineResp.status, engine_body: engineText.slice(0, 500) }, 502, origin);
    }

    return corsResponse({ ok: true }, 200, origin);
  } catch (error) {
    console.error("whatsapp-ingest error:", error);
    return corsResponse({ error: error instanceof Error ? error.message : "unknown" }, 500, origin);
  }
});
