import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

import { corsResponse, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { batchValidate, sanitizeString, validateStringLength } from "../_shared/validation.ts";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from "../_shared/rate-limit.ts";

/**
 * Webhook router: Z-API/WhatsApp -> Worker 24/7.
 *
 * Segurança:
 * - Endpoint público, então valida um token de webhook (customer_products.webhook_token)
 *   via query (?token=...).
 * - Encaminha para o worker com header Authorization: Bearer <shared_secret>
 */

serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  const identifier = getClientIdentifier(req);
  const { limited, retryAfter } = checkRateLimit(identifier, RATE_LIMITS.WEBHOOK);
  if (limited) {
    return corsResponse({ error: "rate_limited", retryAfter }, 429, origin);
  }

  try {
    const url = new URL(req.url);
    const token = sanitizeString(url.searchParams.get("token") || "");

    const errors = batchValidate([
      validateStringLength(token, "token", 16, 200),
    ]);
    if (errors.length) {
      return corsResponse({ error: "validation_error", details: errors }, 400, origin);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(supabaseUrl, serviceKey);

    // Resolve customer_product_id pelo webhook_token
    const { data: cp, error: cpErr } = await service
      .from("customer_products")
      .select("id")
      .eq("webhook_token", token)
      .maybeSingle();
    if (cpErr) throw cpErr;
    if (!cp?.id) return corsResponse({ error: "unauthorized" }, 401, origin);

    const customer_product_id = cp.id as string;

    // Busca worker
    const { data: worker, error: wErr } = await service
      .from("worker_instances")
      .select("worker_base_url, shared_secret, is_active")
      .eq("customer_product_id", customer_product_id)
      .maybeSingle();
    if (wErr) throw wErr;
    if (!worker?.is_active || !worker.worker_base_url || !worker.shared_secret) {
      return corsResponse({ error: "worker_not_configured" }, 409, origin);
    }

    const target = new URL(worker.worker_base_url);
    // Convenção: worker recebe eventos em /events/whatsapp
    target.pathname = "/events/whatsapp";

    const bodyText = await req.text();

    const forward = await fetch(target.toString(), {
      method: "POST",
      headers: {
        "Content-Type": req.headers.get("Content-Type") || "application/json",
        "Authorization": `Bearer ${worker.shared_secret}`,
        "X-Customer-Product-Id": customer_product_id,
      },
      body: bodyText,
    });

    const respText = await forward.text();
    return corsResponse(
      {
        ok: forward.ok,
        status: forward.status,
        worker_response: respText,
      },
      forward.ok ? 200 : 502,
      origin,
    );
  } catch (error) {
    console.error("worker-router error:", error);
    return corsResponse({ error: error instanceof Error ? error.message : "unknown" }, 500, origin);
  }
});
