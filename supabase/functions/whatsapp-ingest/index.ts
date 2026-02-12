import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

import { corsResponse, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from "../_shared/rate-limit.ts";
import { batchValidate, sanitizeString, validateStringLength, validateUUID } from "../_shared/validation.ts";

/**
 * WhatsApp/Z-API webhook ingestion (Opção A - sem worker/VPS)
 *
 * Segurança:
 * - Endpoint público (webhook), autentica via query ?token=... (customer_products.webhook_token)
 * - Rate limit (RATE_LIMITS.WEBHOOK)
 * - Valida/sanitiza entradas
 * - Persiste o payload em public.whatsapp_inbox_events para processamento posterior
 */

serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  // Para webhooks, aceitamos POST (ou PUT em alguns provedores) — mas restringimos aqui.
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

    // Autentica o webhook: customer_product_id + token devem bater
    const { data: cp, error: cpErr } = await service
      .from("customer_products")
      .select("id")
      .eq("id", customerProductId)
      .eq("webhook_token", token)
      .maybeSingle();
    if (cpErr) throw cpErr;
    if (!cp?.id) return corsResponse({ error: "unauthorized" }, 401, origin);

    // Limita tamanho do body (simples) antes de parsear JSON
    const bodyText = await req.text();
    if (bodyText.length > 250_000) {
      return corsResponse({ error: "payload_too_large" }, 413, origin);
    }

    let payload: unknown;
    try {
      payload = bodyText ? JSON.parse(bodyText) : {};
    } catch {
      return corsResponse({ error: "invalid_json" }, 400, origin);
    }

    // Persiste o evento para processamento posterior
    const { error: insertErr } = await service
      .from("whatsapp_inbox_events")
      .insert({
        customer_product_id: cp.id,
        source: "z-api",
        payload,
      });
    if (insertErr) throw insertErr;

    // Resposta rápida para o provedor
    return corsResponse({ ok: true }, 200, origin);
  } catch (error) {
    console.error("whatsapp-ingest error:", error);
    return corsResponse({ error: error instanceof Error ? error.message : "unknown" }, 500, origin);
  }
});
