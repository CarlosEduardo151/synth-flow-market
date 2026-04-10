import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

import { corsResponse, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from "../_shared/rate-limit.ts";
import { batchValidate, sanitizeString, validateStringLength, validateUUID } from "../_shared/validation.ts";

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
      .select("id")
      .eq("id", customerProductId)
      .eq("webhook_token", token)
      .maybeSingle();
    if (cpErr) throw cpErr;
    if (!cp?.id) return corsResponse({ error: "unauthorized" }, 401, origin);

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
    const event = rawPayload?.event || "";
    if (event && !event.startsWith("messages")) {
      console.log("[ingest] skipping non-message event:", event);
      return corsResponse({ ok: true, skipped: "non_message_event" }, 200, origin);
    }

    // Normalize Evolution API payload → Z-API-like format
    const normalized = normalizeEvolutionPayload(rawPayload);
    if (!normalized) {
      return corsResponse({ ok: true, skipped: "unprocessable_event" }, 200, origin);
    }

    const normalizedBody = JSON.stringify(normalized);

    // Forward to bot engine and wait for the result so execution is not dropped
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
