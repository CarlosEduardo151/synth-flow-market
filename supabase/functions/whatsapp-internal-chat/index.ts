import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

import { corsResponse, handleCorsPreflightRequest } from "../_shared/cors.ts";

type Provider = "openai" | "google" | "novalink";

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`missing_env:${name}`);
  return v;
}

async function openaiChat(opts: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userText: string;
  temperature: number;
  maxTokens: number;
}): Promise<string> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model || "gpt-4o-mini",
      temperature: Number.isFinite(opts.temperature) ? opts.temperature : 0.7,
      max_tokens: Number.isFinite(opts.maxTokens) ? opts.maxTokens : 512,
      messages: [
        { role: "system", content: opts.systemPrompt || "" },
        { role: "user", content: opts.userText },
      ],
    }),
  });

  const json = await resp.json().catch(() => null);
  if (!resp.ok) {
    throw new Error(`openai_error:${resp.status}:${JSON.stringify(json)}`);
  }

  const text = json?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) return "";
  return text.trim();
}

async function geminiChat(opts: {
  apiKey: string;
  model: string;
  systemPrompt: string;
  userText: string;
  temperature: number;
  maxTokens: number;
}): Promise<string> {
  const model = opts.model?.startsWith("models/") ? opts.model : `models/${opts.model || "gemini-2.0-flash"}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/${model}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: {
        temperature: Number.isFinite(opts.temperature) ? opts.temperature : 0.7,
        maxOutputTokens: Number.isFinite(opts.maxTokens) ? opts.maxTokens : 512,
      },
      contents: [
        {
          role: "user",
          parts: [{ text: `${opts.systemPrompt}\n\nMensagem do cliente: ${opts.userText}` }],
        },
      ],
    }),
  });

  const json = await resp.json().catch(() => null);
  if (!resp.ok) {
    throw new Error(`gemini_error:${resp.status}:${JSON.stringify(json)}`);
  }

  const text = json?.candidates?.[0]?.content?.parts
    ?.map((p: any) => p?.text)
    .filter(Boolean)
    .join("\n");
  if (typeof text !== "string" || !text.trim()) return "";
  return text.trim();
}

serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  if (req.method !== "POST") {
    return corsResponse({ error: "method_not_allowed" }, 405, origin);
  }

  try {
    const supabaseUrl = requireEnv("SUPABASE_URL");
    const anonKey = requireEnv("SUPABASE_ANON_KEY");

    const authHeader = req.headers.get("Authorization") || "";
    if (!authHeader.startsWith("Bearer ")) {
      return corsResponse({ error: "unauthorized" }, 401, origin);
    }
    const token = authHeader.slice("Bearer ".length);

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    if (claimsErr || !userId) {
      return corsResponse({ error: "unauthorized" }, 401, origin);
    }

    const body = await req.json().catch(() => ({}));
    const customerProductId = typeof body?.customer_product_id === "string" ? body.customer_product_id : "";
    const message = typeof body?.message === "string" ? body.message : "";

    if (!customerProductId || !message.trim()) {
      return corsResponse({ error: "validation_error", details: "customer_product_id and message required" }, 400, origin);
    }

    // Autoriza acesso ao produto (RLS)
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

    // Config do bot
    const { data: cfg, error: cfgErr } = await supabase
      .from("ai_control_config")
      .select("provider, model, system_prompt, temperature, max_tokens, business_name")
      .eq("customer_product_id", customerProductId)
      .maybeSingle();
    if (cfgErr) throw cfgErr;

    const provider = (cfg?.provider as Provider) || "openai";
    const systemPrompt = (cfg?.system_prompt as string) || `Você é um assistente de WhatsApp do negócio ${(cfg as any)?.business_name || ""}. Responda de forma objetiva e útil.`;
    const temperature = Number(cfg?.temperature ?? 0.7);
    const maxTokens = Number(cfg?.max_tokens ?? 512);

    // Resolve provider and API key
    let resolvedProvider: "openai" | "google" = provider === "google" ? "google" : provider === "novalink" ? "google" : "openai";
    let apiKey = "";

    if (provider === "novalink") {
      // Use admin-configured keys
      const serviceKey = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
      const serviceClient = createClient(supabaseUrl, serviceKey);

      const { data: adminRole } = await serviceClient
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin")
        .limit(1)
        .maybeSingle();

      if (adminRole?.user_id) {
        // Try google first, then openai
        const { data: gCred } = await serviceClient
          .from("product_credentials")
          .select("credential_value")
          .eq("user_id", adminRole.user_id)
          .eq("product_slug", "ai")
          .eq("credential_key", "google_api_key")
          .maybeSingle();

        if (gCred?.credential_value?.trim()) {
          apiKey = gCred.credential_value.trim();
          resolvedProvider = "google";
        } else {
          const { data: oCred } = await serviceClient
            .from("product_credentials")
            .select("credential_value")
            .eq("user_id", adminRole.user_id)
            .eq("product_slug", "ai")
            .eq("credential_key", "openai_api_key")
            .maybeSingle();
          if (oCred?.credential_value?.trim()) {
            apiKey = oCred.credential_value.trim();
            resolvedProvider = "openai";
          }
        }
      }
    } else {
      const credentialKey = resolvedProvider === "google" ? "google_api_key" : "openai_api_key";
      const { data: cred, error: credErr } = await supabase
        .from("product_credentials")
        .select("credential_value")
        .eq("user_id", userId)
        .eq("product_slug", "ai")
        .eq("credential_key", credentialKey)
        .maybeSingle();
      if (credErr) throw credErr;
      apiKey = (cred?.credential_value || "").trim();
    }

    if (!apiKey) {
      return corsResponse({ error: "missing_ai_key", details: "Nenhuma chave de IA configurada. Verifique as configurações." }, 409, origin);
    }

    const model = (cfg?.model as string) || (resolvedProvider === "google" ? "models/gemini-2.5-flash" : "gpt-4o-mini");

    const reply = resolvedProvider === "google"
      ? await geminiChat({ apiKey, model, systemPrompt, userText: message, temperature, maxTokens })
      : await openaiChat({ apiKey, model, systemPrompt, userText: message, temperature, maxTokens });

    return corsResponse({ ok: true, reply: reply || "Ok!" }, 200, origin);
  } catch (error) {
    console.error("whatsapp-internal-chat error:", error);
    return corsResponse({ error: error instanceof Error ? error.message : "unknown" }, 500, origin);
  }
});
