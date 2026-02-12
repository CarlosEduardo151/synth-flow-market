import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

import { corsResponse, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { batchValidate, sanitizeString, validateStringLength, validateUUID } from "../_shared/validation.ts";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from "../_shared/rate-limit.ts";

type Language = "python" | "ts";

function json(req: Request) {
  return req.json().catch(() => ({}));
}

function pickLanguage(value: unknown): Language {
  return value === "ts" ? "ts" : "python";
}

function entrypointFor(customerProductId: string, language: Language) {
  const ext = language === "ts" ? "ts" : "py";
  return `${customerProductId}/main.${ext}`;
}

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

    // Admin check (server-side)
    const service = createClient(supabaseUrl, serviceKey);
    const { data: isAdmin, error: roleErr } = await service.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) throw roleErr;
    if (!isAdmin) return corsResponse({ error: "forbidden" }, 403, origin);

    const body = await json(req);
    const action = String(body.action || "");
    const customer_product_id = String(body.customer_product_id || "");

    const baseErrors = batchValidate([
      validateStringLength(action, "action", 1, 40),
      validateUUID(customer_product_id, "customer_product_id"),
    ]);
    if (baseErrors.length) {
      return corsResponse({ error: "validation_error", details: baseErrors }, 400, origin);
    }

    if (action === "get") {
      const { data: scriptRow, error: scriptErr } = await service
        .from("bot_scripts")
        .select("language, entrypoint_path, is_active")
        .eq("customer_product_id", customer_product_id)
        .maybeSingle();
      if (scriptErr) throw scriptErr;

      const { data: workerRow, error: workerErr } = await service
        .from("worker_instances")
        .select("worker_base_url, shared_secret, is_active")
        .eq("customer_product_id", customer_product_id)
        .maybeSingle();
      if (workerErr) throw workerErr;

      let code = "";
      const entrypoint = scriptRow?.entrypoint_path;
      if (entrypoint) {
        const { data: file, error: dlErr } = await service.storage.from("bot_scripts").download(entrypoint);
        if (!dlErr && file) {
          code = await file.text();
        }
      }

      return corsResponse(
        {
          ok: true,
          script: scriptRow || null,
          worker: workerRow || null,
          code,
        },
        200,
        origin,
      );
    }

    if (action === "save_script") {
      const language = pickLanguage(body.language);
      const code = sanitizeString(String(body.code ?? ""));

      const errors = batchValidate([
        validateStringLength(code, "code", 1, 10000),
      ]);
      if (errors.length) {
        return corsResponse({ error: "validation_error", details: errors }, 400, origin);
      }

      const entrypoint_path = entrypointFor(customer_product_id, language);
      const bytes = new TextEncoder().encode(code);

      // Upsert storage file (overwrite by removing first if exists)
      // Supabase Storage doesn't support true overwrite; we remove then upload.
      await service.storage.from("bot_scripts").remove([entrypoint_path]);
      const { error: upErr } = await service.storage.from("bot_scripts").upload(entrypoint_path, bytes, {
        contentType: language === "ts" ? "text/plain" : "text/x-python",
        upsert: true,
      } as any);
      if (upErr) throw upErr;

      const { data: script, error: dbErr } = await service
        .from("bot_scripts")
        .upsert(
          {
            customer_product_id,
            language,
            entrypoint_path,
            is_active: true,
          },
          { onConflict: "customer_product_id" },
        )
        .select("language, entrypoint_path, is_active")
        .single();
      if (dbErr) throw dbErr;

      return corsResponse({ ok: true, script }, 200, origin);
    }

    if (action === "save_worker") {
      const worker_base_url = sanitizeString(String(body.worker_base_url ?? ""));
      const shared_secret = sanitizeString(String(body.shared_secret ?? ""));
      const is_active = Boolean(body.is_active ?? true);

      const errors = batchValidate([
        validateStringLength(worker_base_url, "worker_base_url", 8, 300),
        validateStringLength(shared_secret, "shared_secret", 16, 200),
      ]);
      if (errors.length) {
        return corsResponse({ error: "validation_error", details: errors }, 400, origin);
      }

      const { error: dbErr } = await service
        .from("worker_instances")
        .upsert(
          {
            customer_product_id,
            worker_base_url,
            shared_secret,
            is_active,
          },
          { onConflict: "customer_product_id" },
        );
      if (dbErr) throw dbErr;

      return corsResponse({ ok: true }, 200, origin);
    }

    return corsResponse({ error: "unknown_action" }, 400, origin);
  } catch (error) {
    console.error("bot-scripts-admin error:", error);
    return corsResponse({ error: error instanceof Error ? error.message : "unknown" }, 500, origin);
  }
});
