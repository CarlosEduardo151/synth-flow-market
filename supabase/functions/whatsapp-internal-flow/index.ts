import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

import { corsResponse, handleCorsPreflightRequest } from "../_shared/cors.ts";

type Provider = "openai" | "google";

function requireEnv(name: string): string {
  const v = Deno.env.get(name);
  if (!v) throw new Error(`missing_env:${name}`);
  return v;
}

function pickFirstString(...vals: unknown[]): string {
  for (const v of vals) {
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

function extractIncomingText(payload: any): { phone: string; text: string } | null {
  if (!payload || typeof payload !== "object") return null;

  // Tentativas comuns de payloads Z-API/WhatsApp
  const phone = pickFirstString(
    payload.phone,
    payload.from,
    payload.sender,
    payload?.data?.phone,
    payload?.data?.from,
    payload?.data?.participant,
    payload?.message?.from,
    payload?.message?.phone,
    payload?.messages?.[0]?.from,
    payload?.messages?.[0]?.phone,
  );

  const text = pickFirstString(
    payload.text,
    payload.message,
    payload.body,
    payload?.data?.text,
    payload?.data?.message,
    payload?.message?.text,
    payload?.message?.body,
    payload?.messages?.[0]?.text,
    payload?.messages?.[0]?.body,
  );

  if (!phone || !text) return null;
  return { phone, text };
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

  const text = json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n");
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

    const authed = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // verify_jwt=false no config.toml => validamos via getClaims
    const { data: claimsData, error: claimsErr } = await authed.auth.getClaims(token);
    const userId = claimsData?.claims?.sub;
    if (claimsErr || !userId) {
      return corsResponse({ error: "unauthorized" }, 401, origin);
    }

    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "";
    const customerProductId = typeof body?.customer_product_id === "string" ? body.customer_product_id : "";

    if (!action || !customerProductId) {
      return corsResponse({ error: "validation_error", details: "action and customer_product_id required" }, 400, origin);
    }

    // Autoriza: dono do customer_product (via RLS)
    const { data: cp, error: cpErr } = await authed
      .from("customer_products")
      .select("id, user_id")
      .eq("id", customerProductId)
      .eq("user_id", userId)
      .maybeSingle();
    if (cpErr) throw cpErr;
    if (!cp?.id) {
      return corsResponse({ error: "forbidden" }, 403, origin);
    }

    if (action === "ping") {
      return corsResponse({ ok: true }, 200, origin);
    }

    if (action !== "process") {
      return corsResponse({ error: "invalid_action" }, 400, origin);
    }

    // Carrega configuração do bot
    const { data: cfg, error: cfgErr } = await authed
      .from("ai_control_config")
      .select("provider, model, system_prompt, temperature, max_tokens, business_name")
      .eq("customer_product_id", customerProductId)
      .maybeSingle();
    if (cfgErr) throw cfgErr;

    const provider = (cfg?.provider as Provider) || "openai";
    const model = (cfg?.model as string) || (provider === "google" ? "gemini-2.0-flash" : "gpt-4o-mini");
    const systemPrompt = (cfg?.system_prompt as string) || `Você é um assistente de WhatsApp do negócio ${(cfg as any)?.business_name || ""}. Responda de forma objetiva e útil.`;
    const temperature = Number(cfg?.temperature ?? 0.7);
    const maxTokens = Number(cfg?.max_tokens ?? 512);

    // Busca API key do provedor (guardada em product_credentials do usuário)
    const credentialKey = provider === "google" ? "google_api_key" : "openai_api_key";
    const { data: cred, error: credErr } = await authed
      .from("product_credentials")
      .select("credential_value")
      .eq("user_id", userId)
      .eq("product_slug", "ai")
      .eq("credential_key", credentialKey)
      .maybeSingle();
    if (credErr) throw credErr;
    const apiKey = (cred?.credential_value || "").trim();
    if (!apiKey) {
      return corsResponse({ error: "missing_ai_key", details: `Configure ${credentialKey} no Admin > Configurar IA.` }, 409, origin);
    }

    // Conexão Z-API do usuário
    const { data: zapi, error: zapiErr } = await authed
      .from("zapi_connections")
      .select("instance_id, token")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (zapiErr) throw zapiErr;
    if (!zapi?.instance_id || !zapi?.token) {
      return corsResponse({ error: "missing_zapi_connection", details: "Conecte sua Z-API antes de processar." }, 409, origin);
    }

    // Pega eventos não processados
    const limit = Math.min(Math.max(Number(body?.limit ?? 3), 1), 10);
    const { data: events, error: eventsErr } = await authed
      .from("whatsapp_inbox_events")
      .select("id, payload")
      .eq("customer_product_id", customerProductId)
      .is("processed_at", null)
      .order("received_at", { ascending: true })
      .limit(limit);
    if (eventsErr) throw eventsErr;

    if (!events || events.length === 0) {
      return corsResponse({ ok: true, processed: 0 }, 200, origin);
    }

    let processed = 0;
    for (const ev of events as any[]) {
      const extracted = extractIncomingText(ev.payload);
      if (!extracted) {
        await authed
          .from("whatsapp_inbox_events")
          .update({ processed_at: new Date().toISOString(), processing_error: "unsupported_payload" })
          .eq("id", ev.id);
        continue;
      }

      try {
        const reply = provider === "google"
          ? await geminiChat({ apiKey, model, systemPrompt, userText: extracted.text, temperature, maxTokens })
          : await openaiChat({ apiKey, model, systemPrompt, userText: extracted.text, temperature, maxTokens });

        const messageToSend = reply || "Ok!";

        const zapiResp = await fetch(
          `https://api.z-api.io/instances/${encodeURIComponent(zapi.instance_id)}/token/${encodeURIComponent(zapi.token)}/send-text`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ phone: extracted.phone, message: messageToSend }),
          },
        );
        const zapiJson = await zapiResp.json().catch(() => null);
        if (!zapiResp.ok) {
          throw new Error(`zapi_error:${zapiResp.status}:${JSON.stringify(zapiJson)}`);
        }

        await authed
          .from("whatsapp_inbox_events")
          .update({ processed_at: new Date().toISOString(), processing_error: null })
          .eq("id", ev.id);

        processed += 1;
      } catch (e) {
        await authed
          .from("whatsapp_inbox_events")
          .update({ processing_error: e instanceof Error ? e.message : "unknown" })
          .eq("id", ev.id);
      }
    }

    return corsResponse({ ok: true, processed }, 200, origin);
  } catch (error) {
    console.error("whatsapp-internal-flow error:", error);
    return corsResponse({ error: error instanceof Error ? error.message : "unknown" }, 500, origin);
  }
});
