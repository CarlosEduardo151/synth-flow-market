import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

/**
 * WhatsApp Bot Engine — substitui o workflow n8n por completo.
 *
 * Fluxo:
 * 1. Recebe webhook Z-API (POST)
 * 2. Autentica via query ?token=...&customer_product_id=...
 * 3. Ignora mensagens "fromMe"
 * 4. Rate-limit por telefone (block key 5 min)
 * 5. Roteia por tipo: texto → AI Agent, áudio → transcreve → AI Agent, imagem → analisa
 * 6. Responde via Z-API send-text
 *
 * Credenciais Z-API vêm de product_credentials (instanceId, token, clientToken).
 * IA via Lovable AI Gateway (LOVABLE_API_KEY automático).
 * System prompt vem de ai_control_config.system_prompt.
 */

const AI_GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";
const BLOCK_TTL_MS = 5 * 60 * 1000; // 5 minutos

// In-memory rate limit (per isolate — bom o suficiente para edge)
const blockMap = new Map<string, number>();

function isBlocked(phone: string): boolean {
  const exp = blockMap.get(phone);
  if (!exp) return false;
  if (Date.now() > exp) {
    blockMap.delete(phone);
    return false;
  }
  return true;
}

function setBlock(phone: string) {
  blockMap.set(phone, Date.now() + BLOCK_TTL_MS);
}

// Limpa entradas expiradas periodicamente
function cleanupBlockMap() {
  const now = Date.now();
  for (const [k, v] of blockMap) {
    if (now > v) blockMap.delete(k);
  }
}

// ---------- AI helpers ----------

async function aiChat(apiKey: string, systemPrompt: string, userContent: string, model = AI_MODEL): Promise<string> {
  const resp = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`ai_gateway_error:${resp.status}:${txt}`);
  }

  const json = await resp.json();
  return json?.choices?.[0]?.message?.content?.trim() || "";
}

async function aiVision(apiKey: string, systemPrompt: string, imageUrl: string, caption: string): Promise<string> {
  const resp = await fetch(AI_GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: imageUrl } },
            { type: "text", text: caption || "Analise esta imagem detalhadamente. Responda em português." },
          ],
        },
      ],
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`ai_vision_error:${resp.status}:${txt}`);
  }

  const json = await resp.json();
  return json?.choices?.[0]?.message?.content?.trim() || "";
}

async function aiTranscribeAndProcess(apiKey: string, systemPrompt: string, audioUrl: string): Promise<string> {
  // Step 1: pede ao modelo para transcrever/analisar o áudio via URL
  const transcriptionPrompt = `O usuário enviou um áudio. A URL do áudio é: ${audioUrl}
Transcreva o áudio com precisão e depois analise o conteúdo. Responda em português.`;

  return aiChat(apiKey, systemPrompt, transcriptionPrompt);
}

// ---------- Z-API helpers ----------

async function zapiSendText(
  instanceId: string,
  token: string,
  clientToken: string,
  phone: string,
  message: string,
  messageId?: string,
): Promise<void> {
  const url = `https://api.z-api.io/instances/${encodeURIComponent(instanceId)}/token/${encodeURIComponent(token)}/send-text`;

  const body: Record<string, string> = { phone, message };
  if (messageId) body.messageId = messageId;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "client-token": clientToken,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`zapi_send_error:${resp.status}:${txt}`);
  }
}

// ---------- Main handler ----------

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "method_not_allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Auth via query params (webhook público)
    const url = new URL(req.url);
    const queryToken = url.searchParams.get("token") || "";
    const customerProductId = url.searchParams.get("customer_product_id") || "";

    if (!queryToken || !customerProductId) {
      return new Response(JSON.stringify({ error: "missing_auth_params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY not configured");
    }

    const service = createClient(supabaseUrl, serviceKey);

    // Valida token do webhook
    const { data: cp, error: cpErr } = await service
      .from("customer_products")
      .select("id, user_id")
      .eq("id", customerProductId)
      .eq("webhook_token", queryToken)
      .maybeSingle();
    if (cpErr) throw cpErr;
    if (!cp?.id) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const bodyText = await req.text();
    if (bodyText.length > 500_000) {
      return new Response(JSON.stringify({ error: "payload_too_large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let payload: any;
    try {
      payload = JSON.parse(bodyText);
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Persiste evento cru
    await service.from("whatsapp_inbox_events").insert({
      customer_product_id: cp.id,
      source: "z-api",
      payload,
    });

    // Extrai dados do payload Z-API
    const body = payload?.body || payload;
    const phone = body?.phone || body?.from || "";
    const fromMe = body?.fromMe === true;
    const messageId = body?.messageId || "";

    if (!phone) {
      return new Response(JSON.stringify({ ok: true, skipped: "no_phone" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Se é mensagem do próprio bot, bloqueia o telefone e ignora
    if (fromMe) {
      setBlock(phone);
      return new Response(JSON.stringify({ ok: true, skipped: "from_me" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Se está bloqueado (rate limit por telefone)
    cleanupBlockMap();
    if (isBlocked(phone)) {
      return new Response(JSON.stringify({ ok: true, skipped: "blocked" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carrega credenciais Z-API do usuário (product_credentials)
    const { data: creds } = await service
      .from("product_credentials")
      .select("credential_key, credential_value")
      .eq("user_id", cp.user_id)
      .eq("product_slug", "bots-automacao")
      .in("credential_key", ["zapi_instance_id", "zapi_token", "zapi_client_token", "zapi_phone"]);

    const credMap: Record<string, string> = {};
    for (const c of creds || []) {
      credMap[c.credential_key] = c.credential_value || "";
    }

    const zapiInstanceId = credMap["zapi_instance_id"] || "";
    const zapiToken = credMap["zapi_token"] || "";
    const zapiClientToken = credMap["zapi_client_token"] || "";

    if (!zapiInstanceId || !zapiToken) {
      console.error("Z-API credentials not configured for user", cp.user_id);
      return new Response(JSON.stringify({ ok: true, skipped: "no_zapi_creds" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Carrega system prompt do ai_control_config
    const { data: aiConfig } = await service
      .from("ai_control_config")
      .select("system_prompt, temperature, max_tokens, model, business_name")
      .eq("customer_product_id", customerProductId)
      .maybeSingle();

    const systemPrompt = aiConfig?.system_prompt ||
      `Você é o agente StarAI.
Analise textos, imagens, áudios e códigos de forma objetiva.

Comprovantes de pagamento: informe horário da transação, valor pago, nome do pagador.
Códigos: identifique erros, explique trechos e sugira melhorias apenas se for pedido.
Áudios: transcreva com precisão primeiro e depois analise.
Imagens: descreva o que vê e extraia dados úteis.

Responda sempre em português, de forma curta e direta, sem textos longos.`;

    // Detecta tipo de mensagem e processa
    const hasImage = !!body?.image;
    const hasAudio = !!body?.audio;
    const hasText = !!body?.text;

    let reply = "";

    if (hasImage) {
      // Rota: Imagem → Análise com visão
      const imageUrl = body.image?.imageUrl || body.image?.url || "";
      const caption = body.image?.caption || "Analise esta imagem. Responda em português.";

      if (imageUrl) {
        reply = await aiVision(lovableApiKey, systemPrompt, imageUrl, caption);
      } else {
        reply = "Não consegui acessar a imagem. Pode enviar novamente?";
      }
    } else if (hasAudio) {
      // Rota: Áudio → Transcrição + AI Agent
      const audioUrl = body.audio?.audioUrl || body.audio?.url || "";

      if (audioUrl) {
        reply = await aiTranscribeAndProcess(lovableApiKey, systemPrompt, audioUrl);
      } else {
        reply = "Não consegui acessar o áudio. Pode enviar novamente?";
      }
    } else if (hasText) {
      // Rota: Texto → AI Agent direto
      const userMessage = body.text?.message || body.text || "";
      reply = await aiChat(lovableApiKey, systemPrompt, userMessage);
    } else {
      reply = "Desculpe, não consigo processar esse tipo de mensagem ainda.";
    }

    // Envia resposta via Z-API
    if (reply) {
      await zapiSendText(zapiInstanceId, zapiToken, zapiClientToken, phone, reply, messageId);
    }

    // Marca evento como processado
    // (o último evento inserido para este customer_product_id)
    await service
      .from("whatsapp_inbox_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("customer_product_id", cp.id)
      .is("processed_at", null)
      .order("received_at", { ascending: false })
      .limit(1);

    return new Response(JSON.stringify({ ok: true, type: hasImage ? "image" : hasAudio ? "audio" : "text" }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("whatsapp-bot-engine error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "unknown" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
