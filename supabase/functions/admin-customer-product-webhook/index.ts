import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

import { corsResponse, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { batchValidate, validateStringLength, validateUUID } from "../_shared/validation.ts";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from "../_shared/rate-limit.ts";

function json(req: Request) {
  return req.json().catch(() => ({}));
}

function randomToken(bytes = 32) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  // base64url
  const b64 = btoa(String.fromCharCode(...arr));
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

/**
 * Admin-only: gera/retorna webhook_token para customer_products.
 * Usado para autenticar webhooks públicos como whatsapp-ingest.
 */

serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  const identifier = getClientIdentifier(req);
  const { limited, retryAfter } = checkRateLimit(identifier, RATE_LIMITS.DEFAULT);
  if (limited) {
    return corsResponse({ error: "rate_limited", retryAfter }, 429, origin);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return corsResponse({ error: "unauthorized" }, 401, origin);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await authed.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims?.sub) {
      return corsResponse({ error: "unauthorized" }, 401, origin);
    }
    const userId = claimsData.claims.sub;

    const service = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin, error: roleErr } = await service.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) throw roleErr;
    if (!isAdmin) return corsResponse({ error: "forbidden" }, 403, origin);

    const body = await json(req);
    const action = String(body.action || "ensure");
    const customer_product_id = String(body.customer_product_id || "");

    const errors = batchValidate([
      validateStringLength(action, "action", 1, 40),
      validateUUID(customer_product_id, "customer_product_id"),
    ]);
    if (errors.length) {
      return corsResponse({ error: "validation_error", details: errors }, 400, origin);
    }

    const { data: cp, error: cpErr } = await service
      .from("customer_products")
      .select("id, webhook_token")
      .eq("id", customer_product_id)
      .maybeSingle();
    if (cpErr) throw cpErr;
    if (!cp?.id) return corsResponse({ error: "not_found" }, 404, origin);

    if (action === "get") {
      return corsResponse({ ok: true, webhook_token: cp.webhook_token || null }, 200, origin);
    }

    if (action === "ensure") {
      if (cp.webhook_token) {
        return corsResponse({ ok: true, webhook_token: cp.webhook_token }, 200, origin);
      }
      const newToken = randomToken(32);
      const { error: upErr } = await service
        .from("customer_products")
        .update({ webhook_token: newToken })
        .eq("id", customer_product_id);
      if (upErr) throw upErr;
      return corsResponse({ ok: true, webhook_token: newToken }, 200, origin);
    }

    if (action === "rotate") {
      const newToken = randomToken(32);
      const { error: upErr } = await service
        .from("customer_products")
        .update({ webhook_token: newToken })
        .eq("id", customer_product_id);
      if (upErr) throw upErr;
      return corsResponse({ ok: true, webhook_token: newToken }, 200, origin);
    }

    return corsResponse({ error: "unknown_action" }, 400, origin);
  } catch (error) {
    console.error("admin-customer-product-webhook error:", error);
    return corsResponse({ error: error instanceof Error ? error.message : "unknown" }, 500, origin);
  }
});
