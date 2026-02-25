import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

import { corsResponse, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from "../_shared/rate-limit.ts";
import {
  processText,
  resolveAICredentials,
} from "../_shared/ai-providers.ts";

/**
 * WhatsApp Internal Chat — chat de teste interno (sem Z-API).
 *
 * Segurança:
 * - Requer autenticação JWT (Bearer token)
 * - Usuário deve ser dono do customer_product
 * - Rate limit por IP
 * - Inputs validados e sanitizados
 */

serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
  if (req.method !== "POST") return corsResponse({ error: "method_not_allowed" }, 405, origin);

  // Rate limit
  const identifier = getClientIdentifier(req);
  const { limited } = checkRateLimit(identifier, RATE_LIMITS.WEBHOOK);
  if (limited) return corsResponse({ error: "rate_limited" }, 429, origin);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Auth check
    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return corsResponse({ error: "unauthorized" }, 401, origin);
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    const userId = userData?.user?.id;
    if (userErr || !userId) {
      return corsResponse({ error: "unauthorized" }, 401, origin);
    }

    // Parse body
    const body = await req.json().catch(() => ({}));
    const customerProductId = typeof body?.customer_product_id === "string" ? body.customer_product_id.trim() : "";
    const message = typeof body?.message === "string" ? body.message.trim() : "";

    if (!customerProductId || !message) {
      return corsResponse({ error: "validation_error", details: "customer_product_id and message required" }, 400, origin);
    }

    // Verify ownership (RLS)
    const { data: cp, error: cpErr } = await supabase
      .from("customer_products")
      .select("id")
      .eq("id", customerProductId)
      .eq("user_id", userId)
      .maybeSingle();
    if (cpErr) throw cpErr;
    if (!cp?.id) {
      return corsResponse({ error: "forbidden" }, 403, origin);
    }

    // Check if bot instance is active
    const { data: botInstance } = await supabase
      .from("bot_instances")
      .select("is_active")
      .eq("customer_product_id", customerProductId)
      .maybeSingle();

    if (botInstance && !botInstance.is_active) {
      return corsResponse({ error: "motor_desligado", details: "O motor está desligado. Ligue-o na aba Status antes de testar." }, 409, origin);
    }

    // Load AI config
    const { data: cfg } = await supabase
      .from("ai_control_config")
      .select("provider, model, system_prompt, temperature, max_tokens, business_name, is_active")
      .eq("customer_product_id", customerProductId)
      .maybeSingle();

    if (cfg && !cfg.is_active) {
      return corsResponse({ error: "motor_desligado", details: "O motor IA está desligado. Ligue-o na aba Status antes de testar." }, 409, origin);
    }

    const provider = (cfg?.provider as string) || "openai";
    const systemPrompt = (cfg?.system_prompt as string) ||
      `Você é um assistente de WhatsApp do negócio ${cfg?.business_name || ""}. Responda de forma objetiva e útil.`;
    const temperature = Number(cfg?.temperature ?? 0.7);
    const maxTokens = Number(cfg?.max_tokens ?? 512);

    // Resolve credentials using service role for novalink
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const serviceClient = createClient(supabaseUrl, serviceKey);

    const resolved = await resolveAICredentials(
      serviceClient,
      provider,
      userId,
      cfg?.model,
    );

    if (!resolved) {
      return corsResponse({
        error: "missing_ai_key",
        details: "Nenhuma chave de IA configurada. Verifique as configurações do Motor IA.",
      }, 409, origin);
    }

    const aiOpts = {
      apiKey: resolved.apiKey,
      model: resolved.model,
      systemPrompt,
      temperature,
      maxTokens,
    };

    const reply = await processText(resolved.resolvedProvider, aiOpts, message);

    return corsResponse({ ok: true, reply: reply || "Ok!" }, 200, origin);
  } catch (error) {
    console.error("whatsapp-internal-chat error:", error);
    return corsResponse({ error: "internal_error" }, 500, origin);
  }
});
