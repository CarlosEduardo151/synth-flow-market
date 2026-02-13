import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

/**
 * WhatsApp Bot Engine — motor nativo (sem n8n, sem Lovable AI Gateway).
 *
 * Cada cliente escolhe seu provedor (openai / google / starai) na aba "Motor IA".
 * A API key e modelo ficam em product_credentials + ai_control_config POR CLIENTE.
 *
 * Fluxo:
 * 1. Recebe webhook Z-API via query ?token=...&customer_product_id=...
 * 2. Ignora mensagens "fromMe" e aplica rate-limit por telefone
 * 3. Roteia por tipo: texto → AI, áudio → transcrição + AI, imagem → visão
 * 4. Responde via Z-API send-text
 */

const BLOCK_TTL_MS = 5 * 60 * 1000;
const blockMap = new Map<string, number>();

function isBlocked(phone: string): boolean {
  const exp = blockMap.get(phone);
  if (!exp) return false;
  if (Date.now() > exp) { blockMap.delete(phone); return false; }
  return true;
}
function setBlock(phone: string) { blockMap.set(phone, Date.now() + BLOCK_TTL_MS); }
function cleanupBlockMap() {
  const now = Date.now();
  for (const [k, v] of blockMap) { if (now > v) blockMap.delete(k); }
}

// ========== Provider-specific AI calls ==========

async function openaiChat(apiKey: string, model: string, systemPrompt: string, userContent: string | any[], temperature: number, maxTokens: number): Promise<string> {
  const messages: any[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: model || "gpt-4o-mini", temperature, max_tokens: maxTokens, messages }),
  });

  const json = await resp.json().catch(() => null);
  if (!resp.ok) throw new Error(`openai_error:${resp.status}:${JSON.stringify(json)}`);
  return json?.choices?.[0]?.message?.content?.trim() || "";
}

async function geminiChat(apiKey: string, model: string, systemPrompt: string, userContent: string, temperature: number, maxTokens: number): Promise<string> {
  const modelPath = model?.startsWith("models/") ? model : `models/${model || "gemini-2.5-flash"}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: { temperature, maxOutputTokens: maxTokens },
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userContent }] }],
    }),
  });

  const json = await resp.json().catch(() => null);
  if (!resp.ok) throw new Error(`gemini_error:${resp.status}:${JSON.stringify(json)}`);
  return json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n")?.trim() || "";
}

async function geminiVision(apiKey: string, model: string, systemPrompt: string, imageUrl: string, caption: string, temperature: number, maxTokens: number): Promise<string> {
  // Download image and convert to base64
  const imgResp = await fetch(imageUrl);
  if (!imgResp.ok) throw new Error(`image_download_failed:${imgResp.status}`);
  const imgBuffer = await imgResp.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(imgBuffer)));
  const mimeType = imgResp.headers.get("content-type") || "image/jpeg";

  const modelPath = model?.startsWith("models/") ? model : `models/${model || "gemini-2.5-flash"}`;
  const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: { temperature, maxOutputTokens: maxTokens },
      systemInstruction: { parts: [{ text: systemPrompt }] },
      contents: [{
        role: "user",
        parts: [
          { inlineData: { mimeType, data: base64 } },
          { text: caption || "Analise esta imagem detalhadamente. Responda em português." },
        ],
      }],
    }),
  });

  const json = await resp.json().catch(() => null);
  if (!resp.ok) throw new Error(`gemini_vision_error:${resp.status}:${JSON.stringify(json)}`);
  return json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n")?.trim() || "";
}

async function openaiVision(apiKey: string, model: string, systemPrompt: string, imageUrl: string, caption: string, temperature: number, maxTokens: number): Promise<string> {
  return openaiChat(apiKey, model || "gpt-4o", systemPrompt, [
    { type: "image_url", image_url: { url: imageUrl } },
    { type: "text", text: caption || "Analise esta imagem detalhadamente. Responda em português." },
  ], temperature, maxTokens);
}

// Unified dispatcher per provider
async function processText(provider: string, apiKey: string, model: string, systemPrompt: string, text: string, temp: number, maxTk: number): Promise<string> {
  if (provider === "google") return geminiChat(apiKey, model, systemPrompt, text, temp, maxTk);
  return openaiChat(apiKey, model, systemPrompt, text, temp, maxTk);
}

async function processImage(provider: string, apiKey: string, model: string, systemPrompt: string, imageUrl: string, caption: string, temp: number, maxTk: number): Promise<string> {
  if (provider === "google") return geminiVision(apiKey, model, systemPrompt, imageUrl, caption, temp, maxTk);
  return openaiVision(apiKey, model, systemPrompt, imageUrl, caption, temp, maxTk);
}

async function processAudio(provider: string, apiKey: string, model: string, systemPrompt: string, audioUrl: string, temp: number, maxTk: number): Promise<string> {
  if (provider === "google") {
    // Gemini suporta áudio inline
    const audioResp = await fetch(audioUrl);
    if (!audioResp.ok) throw new Error(`audio_download_failed:${audioResp.status}`);
    const audioBuffer = await audioResp.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(audioBuffer)));
    const mimeType = audioResp.headers.get("content-type") || "audio/ogg";

    const modelPath = model?.startsWith("models/") ? model : `models/${model || "gemini-2.5-flash"}`;
    const url = `https://generativelanguage.googleapis.com/v1beta/${modelPath}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        generationConfig: { temperature: temp, maxOutputTokens: maxTk },
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{
          role: "user",
          parts: [
            { inlineData: { mimeType, data: base64 } },
            { text: "Transcreva este áudio com precisão e depois analise o conteúdo. Responda em português." },
          ],
        }],
      }),
    });

    const json = await resp.json().catch(() => null);
    if (!resp.ok) throw new Error(`gemini_audio_error:${resp.status}:${JSON.stringify(json)}`);
    return json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("\n")?.trim() || "";
  }

  // OpenAI: transcreve com Whisper, depois processa
  const audioResp = await fetch(audioUrl);
  if (!audioResp.ok) throw new Error(`audio_download_failed:${audioResp.status}`);
  const audioBlob = await audioResp.blob();

  const formData = new FormData();
  formData.append("file", audioBlob, "audio.ogg");
  formData.append("model", "whisper-1");
  formData.append("language", "pt");

  const whisperResp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  const whisperJson = await whisperResp.json().catch(() => null);
  if (!whisperResp.ok) throw new Error(`whisper_error:${whisperResp.status}:${JSON.stringify(whisperJson)}`);

  const transcription = whisperJson?.text || "";
  return openaiChat(apiKey, model, systemPrompt, `[Transcrição do áudio]: ${transcription}`, temp, maxTk);
}

// ========== Z-API ==========

async function zapiSendText(instanceId: string, token: string, clientToken: string, phone: string, message: string, messageId?: string): Promise<void> {
  const url = `https://api.z-api.io/instances/${encodeURIComponent(instanceId)}/token/${encodeURIComponent(token)}/send-text`;
  const body: Record<string, string> = { phone, message };
  if (messageId) body.messageId = messageId;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "client-token": clientToken },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`zapi_send_error:${resp.status}:${txt}`);
  }
}

// ========== Main ==========

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);

  try {
    const url = new URL(req.url);
    const queryToken = url.searchParams.get("token") || "";
    const customerProductId = url.searchParams.get("customer_product_id") || "";

    if (!queryToken || !customerProductId) return jsonResponse({ error: "missing_auth_params" }, 400);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(supabaseUrl, serviceKey);

    // Valida webhook token
    const { data: cp, error: cpErr } = await service
      .from("customer_products")
      .select("id, user_id")
      .eq("id", customerProductId)
      .eq("webhook_token", queryToken)
      .maybeSingle();
    if (cpErr) throw cpErr;
    if (!cp?.id) return jsonResponse({ error: "unauthorized" }, 401);

    // Parse body
    const bodyText = await req.text();
    if (bodyText.length > 500_000) return jsonResponse({ error: "payload_too_large" }, 413);

    let payload: any;
    try { payload = JSON.parse(bodyText); } catch { return jsonResponse({ error: "invalid_json" }, 400); }

    // Persiste evento cru
    await service.from("whatsapp_inbox_events").insert({
      customer_product_id: cp.id,
      source: "z-api",
      payload,
    });

    const body = payload?.body || payload;
    const phone = body?.phone || body?.from || "";
    const fromMe = body?.fromMe === true;
    const messageId = body?.messageId || "";

    if (!phone) return jsonResponse({ ok: true, skipped: "no_phone" });

    if (fromMe) { setBlock(phone); return jsonResponse({ ok: true, skipped: "from_me" }); }

    cleanupBlockMap();
    if (isBlocked(phone)) return jsonResponse({ ok: true, skipped: "blocked" });

    // ===== Carrega config do CLIENTE específico =====

    // 1. Credenciais Z-API
    const { data: creds } = await service
      .from("product_credentials")
      .select("credential_key, credential_value")
      .eq("user_id", cp.user_id)
      .eq("product_slug", "bots-automacao")
      .in("credential_key", ["zapi_instance_id", "zapi_token", "zapi_client_token"]);

    const credMap: Record<string, string> = {};
    for (const c of creds || []) credMap[c.credential_key] = c.credential_value || "";

    if (!credMap["zapi_instance_id"] || !credMap["zapi_token"]) {
      console.error("Z-API creds missing for user", cp.user_id);
      return jsonResponse({ ok: true, skipped: "no_zapi_creds" });
    }

    // 2. Config IA do cliente (provider, model, temperature, max_tokens, system_prompt)
    const { data: aiConfig } = await service
      .from("ai_control_config")
      .select("provider, model, system_prompt, temperature, max_tokens, business_name")
      .eq("customer_product_id", customerProductId)
      .maybeSingle();

    const provider = (aiConfig?.provider as string) || "google";
    const model = (aiConfig?.model as string) || (provider === "google" ? "models/gemini-2.5-flash" : "gpt-4o-mini");
    const temperature = Number(aiConfig?.temperature ?? 0.7);
    const maxTokens = Number(aiConfig?.max_tokens ?? 512);
    const systemPrompt = (aiConfig?.system_prompt as string) ||
      `Você é o agente StarAI do negócio ${aiConfig?.business_name || ""}. Responda de forma objetiva e útil em português.`;

    // 3. API Key do provedor escolhido pelo cliente
    const aiCredKey = provider === "google" ? "google_api_key" : "openai_api_key";
    const { data: aiCred } = await service
      .from("product_credentials")
      .select("credential_value")
      .eq("user_id", cp.user_id)
      .eq("product_slug", "bots-automacao")
      .eq("credential_key", aiCredKey)
      .maybeSingle();

    // Fallback: tenta buscar na slug "ai" (configuração global do user)
    let apiKey = aiCred?.credential_value?.trim() || "";
    if (!apiKey) {
      const { data: globalCred } = await service
        .from("product_credentials")
        .select("credential_value")
        .eq("user_id", cp.user_id)
        .eq("product_slug", "ai")
        .eq("credential_key", aiCredKey)
        .maybeSingle();
      apiKey = globalCred?.credential_value?.trim() || "";
    }

    if (!apiKey) {
      console.error(`AI key (${aiCredKey}) missing for user`, cp.user_id);
      // Envia mensagem ao cliente informando
      await zapiSendText(
        credMap["zapi_instance_id"], credMap["zapi_token"], credMap["zapi_client_token"] || "",
        phone,
        "⚠️ O bot ainda não está configurado. O administrador precisa configurar a chave de IA no painel.",
        messageId,
      );
      return jsonResponse({ ok: true, skipped: "no_ai_key" });
    }

    // ===== Processa mensagem por tipo =====
    const hasImage = !!body?.image;
    const hasAudio = !!body?.audio;
    const hasText = !!body?.text;

    let reply = "";

    if (hasImage) {
      const imageUrl = body.image?.imageUrl || body.image?.url || "";
      const caption = body.image?.caption || "Analise esta imagem. Responda em português.";
      if (imageUrl) {
        reply = await processImage(provider, apiKey, model, systemPrompt, imageUrl, caption, temperature, maxTokens);
      } else {
        reply = "Não consegui acessar a imagem. Pode enviar novamente?";
      }
    } else if (hasAudio) {
      const audioUrl = body.audio?.audioUrl || body.audio?.url || "";
      if (audioUrl) {
        reply = await processAudio(provider, apiKey, model, systemPrompt, audioUrl, temperature, maxTokens);
      } else {
        reply = "Não consegui acessar o áudio. Pode enviar novamente?";
      }
    } else if (hasText) {
      const userMessage = typeof body.text === "string" ? body.text : body.text?.message || "";
      reply = await processText(provider, apiKey, model, systemPrompt, userMessage, temperature, maxTokens);
    } else {
      reply = "Desculpe, não consigo processar esse tipo de mensagem ainda.";
    }

    if (reply) {
      await zapiSendText(credMap["zapi_instance_id"], credMap["zapi_token"], credMap["zapi_client_token"] || "", phone, reply, messageId);
    }

    // Marca como processado
    await service
      .from("whatsapp_inbox_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("customer_product_id", cp.id)
      .is("processed_at", null)
      .order("received_at", { ascending: false })
      .limit(1);

    return jsonResponse({ ok: true, type: hasImage ? "image" : hasAudio ? "audio" : "text", provider });
  } catch (error) {
    console.error("whatsapp-bot-engine error:", error);
    return jsonResponse({ error: error instanceof Error ? error.message : "unknown" }, 500);
  }
});
