import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

import { corsResponse, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from "../_shared/rate-limit.ts";
import { batchValidate, sanitizeString, validateStringLength, validateUUID } from "../_shared/validation.ts";

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
