import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

import { corsResponse, handleCorsPreflightRequest } from "../_shared/cors.ts";
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from "../_shared/rate-limit.ts";
import { sanitizeString, validateUUID } from "../_shared/validation.ts";
import {
  processText,
  processImage,
  processAudio,
  processDocument,
  processVideo,
  processSticker,
  resolveAICredentials,
  type AIUsageResult,
  type ConversationMessage,
} from "../_shared/ai-providers.ts";
import { zapiSendText, loadZAPICredentials, evolutionSendText, loadEvolutionCredentials, type EvolutionCredentials } from "../_shared/zapi.ts";
import { platformLog } from "../_shared/platform-logger.ts";

/**
 * WhatsApp Bot Engine — motor nativo (sem n8n, sem Lovable AI Gateway).
 *
 * Fluxo:
 * 1. Recebe webhook Z-API via query ?token=...&customer_product_id=...
 * 2. Valida token + customer_product_id contra DB
 * 3. Ignora mensagens "fromMe" e aplica rate-limit por telefone
 * 4. Roteia por tipo: texto → AI, áudio → transcrição + AI, imagem → visão
 * 5. Responde via Z-API send-text
 *
 * Segurança:
 * - Webhook público, autenticação via token único por customer_product
 * - Rate limit por IP + por telefone (anti-flood)
 * - Payload máximo 500KB
 * - Inputs sanitizados
 * - API keys nunca expostas ao cliente
 */

// ========== Anti-flood: block "fromMe" phone for 5min ==========
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

// ========== Per-phone rate limiter (max 10 messages per 60s) ==========
const phoneRateMap = new Map<string, number[]>();
const PHONE_RATE_WINDOW = 60_000;
const PHONE_RATE_MAX = 10;

function isPhoneRateLimited(phone: string): boolean {
  const now = Date.now();
  const timestamps = (phoneRateMap.get(phone) || []).filter(t => now - t < PHONE_RATE_WINDOW);
  if (timestamps.length >= PHONE_RATE_MAX) {
    phoneRateMap.set(phone, timestamps);
    return true;
  }
  timestamps.push(now);
  phoneRateMap.set(phone, timestamps);
  return false;
}

// ========== Metrics logger ==========

async function logUsageMetrics(
  service: any,
  customerProductId: string,
  result: AIUsageResult,
  provider: string,
  model: string,
  processingMs: number,
  dataBytesIn: number,
  dataBytesOut: number,
) {
  try {
    await service.from("bot_usage_metrics").insert({
      customer_product_id: customerProductId,
      event_type: "ai_call",
      tokens_input: result.tokensInput,
      tokens_output: result.tokensOutput,
      tokens_total: result.tokensTotal,
      data_bytes_in: dataBytesIn,
      data_bytes_out: dataBytesOut,
      provider,
      model,
      processing_ms: processingMs,
    });
  } catch (e) {
    console.error("metrics_log_error:", e);
  }
}

// ========== Main ==========

serve(async (req) => {
  const origin = req.headers.get("Origin");

  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
  if (req.method !== "POST") return corsResponse({ error: "method_not_allowed" }, 405, origin);

  // IP-level rate limit
  const identifier = getClientIdentifier(req);
  const { limited } = checkRateLimit(identifier, RATE_LIMITS.WEBHOOK);
  if (limited) return corsResponse({ error: "rate_limited" }, 429, origin);

  try {
    const url = new URL(req.url);
    const queryToken = sanitizeString(url.searchParams.get("token") || "");
    const customerProductId = sanitizeString(url.searchParams.get("customer_product_id") || "");

    // Validate inputs
    if (!queryToken || queryToken.length < 16) {
      return corsResponse({ error: "invalid_token" }, 400, origin);
    }
    const uuidError = validateUUID(customerProductId, "customer_product_id");
    if (uuidError) {
      return corsResponse({ error: "invalid_customer_product_id" }, 400, origin);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(supabaseUrl, serviceKey);

    // Validate webhook token
    const { data: cp, error: cpErr } = await service
      .from("customer_products")
      .select("id, user_id")
      .eq("id", customerProductId)
      .eq("webhook_token", queryToken)
      .maybeSingle();
    if (cpErr) throw cpErr;
    if (!cp?.id) return corsResponse({ error: "unauthorized" }, 401, origin);

    // Check if bot instance is active
    const { data: botInstance } = await service
      .from("bot_instances")
      .select("is_active")
      .eq("customer_product_id", cp.id)
      .eq("is_active", true)
      .maybeSingle();
    if (!botInstance) {
      return corsResponse({ ok: true, skipped: "bot_instance_inactive" }, 200, origin);
    }

    // Parse body (max 500KB)
    const bodyText = await req.text();
    if (bodyText.length > 500_000) return corsResponse({ error: "payload_too_large" }, 413, origin);

    let payload: any;
    try { payload = JSON.parse(bodyText); } catch { return corsResponse({ error: "invalid_json" }, 400, origin); }

    // Persist raw event
    await service.from("whatsapp_inbox_events").insert({
      customer_product_id: cp.id,
      source: "z-api",
      payload,
    }).then(({ error }: any) => { if (error) console.error("event_insert_error:", error.message); });

    // Extract message fields
    const body = payload?.body || payload;
    const phone = sanitizeString(body?.phone || body?.from || "");
    const fromMe = body?.fromMe === true;
    const messageId = sanitizeString(body?.messageId || "");

    if (!phone) return corsResponse({ ok: true, skipped: "no_phone" }, 200, origin);

    // Block fromMe messages (prevent echo loops)
    if (fromMe) { setBlock(phone); return corsResponse({ ok: true, skipped: "from_me" }, 200, origin); }

    // Cleanup + check blocks
    cleanupBlockMap();
    if (isBlocked(phone)) return corsResponse({ ok: true, skipped: "blocked" }, 200, origin);

    // Per-phone rate limit
    if (isPhoneRateLimited(phone)) {
      return corsResponse({ ok: true, skipped: "phone_rate_limited" }, 200, origin);
    }

    // ===== Load client config =====

    // 1. Z-API credentials
    const zapiCreds = await loadZAPICredentials(service, cp.user_id);
    if (!zapiCreds) {
      console.error("Z-API creds missing for user", cp.user_id);
      return corsResponse({ ok: true, skipped: "no_zapi_creds" }, 200, origin);
    }

    // 2. AI config (now includes personality + action_instructions + configuration)
    const { data: aiConfig } = await service
      .from("ai_control_config")
      .select("provider, model, system_prompt, temperature, max_tokens, business_name, is_active, personality, action_instructions, configuration")
      .eq("customer_product_id", customerProductId)
      .maybeSingle();

    const provider = (aiConfig?.provider as string) || "google";
    const temperature = Number(aiConfig?.temperature ?? 0.7);
    const maxTokens = Number(aiConfig?.max_tokens ?? 512);
    const contextWindowSize = Number(aiConfig?.configuration?.context_window_size ?? 10);

    let systemPrompt = (aiConfig?.system_prompt as string) ||
      `Você é o agente StarAI do negócio ${aiConfig?.business_name || ""}. Responda de forma objetiva e útil em português.`;

    // ===== PERSONALITY INJECTION =====
    const personalityTone = aiConfig?.personality as string || "";
    const TONE_INSTRUCTIONS: Record<string, string> = {
      profissional: "Use linguagem corporativa e formal. Mantenha um tom respeitoso e objetivo.",
      amigavel: "Use linguagem casual mas respeitosa. Use emojis com moderação para ser acolhedor.",
      tecnico: "Use terminologia técnica precisa. Seja detalhado e específico nas explicações.",
      entusiasmado: "Demonstre energia positiva! Celebre conquistas do cliente. Use exclamações e emojis.",
      empatico: "Demonstre compreensão genuína. Seja paciente e atencioso com as necessidades do cliente.",
      direto: "Vá direto ao ponto. Respostas concisas e objetivas sem rodeios.",
    };

    if (personalityTone && TONE_INSTRUCTIONS[personalityTone]) {
      systemPrompt += `\n\n=== TOM DE COMUNICAÇÃO ===\n${TONE_INSTRUCTIONS[personalityTone]}`;
    }

    // ===== ACTION INSTRUCTIONS INJECTION =====
    if (aiConfig?.action_instructions) {
      try {
        const instructions = typeof aiConfig.action_instructions === "string"
          ? JSON.parse(aiConfig.action_instructions)
          : aiConfig.action_instructions;

        if (Array.isArray(instructions) && instructions.length > 0) {
          const doRules = instructions
            .filter((i: any) => i.type === "do" && i.instruction?.trim())
            .map((i: any) => `✅ ${i.instruction.trim()}`);
          const dontRules = instructions
            .filter((i: any) => i.type === "dont" && i.instruction?.trim())
            .map((i: any) => `❌ NUNCA: ${i.instruction.trim()}`);

          if (doRules.length || dontRules.length) {
            systemPrompt += `\n\n=== REGRAS DE COMPORTAMENTO ===`;
            if (doRules.length) systemPrompt += `\nSEMPRE faça:\n${doRules.join("\n")}`;
            if (dontRules.length) systemPrompt += `\nNUNCA faça:\n${dontRules.join("\n")}`;
          }
        }
      } catch (e) {
        console.error("action_instructions_parse_error:", e);
      }
    }

    // 3. Load knowledge base and inject into system prompt
    try {
      const { data: knowledgeEntries } = await service
        .from("bot_knowledge_base")
        .select("title, content")
        .eq("customer_product_id", customerProductId)
        .eq("status", "ready")
        .order("created_at", { ascending: true });

      if (knowledgeEntries && knowledgeEntries.length > 0) {
        const knowledgeText = knowledgeEntries
          .map((e: any) => `### ${e.title}\n${(e.content || "").slice(0, 5000)}`)
          .join("\n\n");

        const truncatedKnowledge = knowledgeText.slice(0, 15000);
        systemPrompt += `\n\n=== BASE DE CONHECIMENTO DO NEGÓCIO ===\nUse as informações abaixo para responder perguntas sobre o negócio. Estas são informações reais e verificadas:\n\n${truncatedKnowledge}\n\n=== FIM DA BASE DE CONHECIMENTO ===`;
      }
    } catch (e) {
      console.error("knowledge_load_error:", e);
    }

    // ===== 4. LOAD CONVERSATION MEMORY =====
    let conversationHistory: ConversationMessage[] = [];
    try {
      const { data: recentMessages } = await service
        .from("bot_conversation_logs")
        .select("direction, message_text, created_at")
        .eq("customer_product_id", customerProductId)
        .eq("phone", phone)
        .order("created_at", { ascending: false })
        .limit(contextWindowSize * 2); // pairs of inbound+outbound

      if (recentMessages && recentMessages.length > 0) {
        // Reverse to chronological order
        conversationHistory = recentMessages
          .reverse()
          .map((msg: any) => ({
            role: msg.direction === "inbound" ? "user" as const : "assistant" as const,
            content: (msg.message_text || "").replace(/^\[FAQ\]\s*/, ""),
          }))
          .filter((msg: any) => msg.content.trim());
      }
    } catch (e) {
      console.error("memory_load_error:", e);
    }

    // 5. Resolve AI credentials
    const resolved = await resolveAICredentials(
      service,
      provider,
      cp.user_id,
      aiConfig?.model,
    );

    if (!resolved) {
      console.error(`AI key missing: provider=${provider}, user=${cp.user_id}`);
      await zapiSendText(
        zapiCreds,
        phone,
        "⚠️ O bot ainda não está configurado. O administrador precisa configurar a chave de IA no painel.",
        messageId,
      );
      return corsResponse({ ok: true, skipped: "no_ai_key" }, 200, origin);
    }

    const aiOpts = {
      apiKey: resolved.apiKey,
      model: resolved.model,
      systemPrompt,
      temperature,
      maxTokens,
    };

    // ===== Check FAQ before AI (saves tokens) =====
    const hasImage = !!body?.image;
    const hasAudio = !!body?.audio;
    const hasVideo = !!body?.video;
    const hasDocument = !!body?.document;
    const hasSticker = !!body?.sticker;
    const hasLocation = !!body?.location;
    const hasContact = !!body?.contact || !!body?.contactMessage;
    const hasText = !!body?.text;

    const userMessageText = hasText ? (typeof body.text === "string" ? body.text : body.text?.message || "") : "";
    const dataBytesIn = new TextEncoder().encode(bodyText).length;

    // FAQ matching — only for text messages
    if (hasText && userMessageText.trim()) {
      try {
        const { data: faqs } = await service
          .from("bot_faq")
          .select("id, question, answer, keywords")
          .eq("customer_product_id", customerProductId)
          .eq("is_active", true);

        if (faqs && faqs.length > 0) {
          const msgLower = userMessageText.toLowerCase().trim();
          const msgWords = msgLower.split(/\s+/);

          let bestMatch: typeof faqs[0] | null = null;
          let bestScore = 0;

          for (const faq of faqs) {
            let score = 0;
            const qLower = faq.question.toLowerCase();

            // Exact match
            if (msgLower === qLower) { score = 100; }
            // Strong substring match
            else if (qLower.includes(msgLower) || msgLower.includes(qLower)) { score = 60; }

            // Keyword matching
            const keywords = (faq.keywords || []) as string[];
            if (keywords.length > 0) {
              const matched = keywords.filter((kw: string) =>
                msgWords.some(w => w.includes(kw) || kw.includes(w))
              );
              const kwScore = (matched.length / keywords.length) * 50;
              score = Math.max(score, kwScore);
            }

            // Word overlap with question
            const qWords = qLower.split(/\s+/).filter((w: string) => w.length > 2);
            if (qWords.length > 0) {
              const overlap = qWords.filter((w: string) => msgWords.some(mw => mw.includes(w) || w.includes(mw)));
              const overlapScore = (overlap.length / qWords.length) * 45;
              score = Math.max(score, overlapScore);
            }

            if (score > bestScore) { bestScore = score; bestMatch = faq; }
          }

          // Threshold: 40+ = confident match
          if (bestMatch && bestScore >= 40) {
            const faqAnswer = bestMatch.answer;

            // Increment hit_count (fire & forget)
            service.from("bot_faq")
              .select("hit_count")
              .eq("id", bestMatch.id)
              .single()
              .then(({ data: faqRow }: any) => {
                if (faqRow) {
                  service.from("bot_faq").update({ hit_count: (faqRow.hit_count || 0) + 1 }).eq("id", bestMatch!.id).then(() => {});
                }
              });

            // Send FAQ reply via Z-API
            const zapiCreds = await loadZAPICredentials(service, cp.user_id);
            if (zapiCreds) {
              await zapiSendText(zapiCreds, phone, faqAnswer, messageId);
            }

            // Log conversation
            service.from("bot_conversation_logs").insert({
              customer_product_id: cp.id, source: "whatsapp", phone,
              direction: "inbound", message_text: userMessageText,
            }).then(() => {});
            service.from("bot_conversation_logs").insert({
              customer_product_id: cp.id, source: "whatsapp", phone,
              direction: "outbound", message_text: `[FAQ] ${faqAnswer}`,
              tokens_used: 0, processing_ms: 0, provider: "faq", model: "faq",
            }).then(() => {});

            return corsResponse({ ok: true, type: "faq", matched: true, score: bestScore }, 200, origin);
          }
        }
      } catch (e) {
        console.error("faq_match_error:", e);
      }
    }

    const startMs = Date.now();
    let result: AIUsageResult;
    let messageType = "text";

    if (hasImage) {
      messageType = "image";
      const imageUrl = body.image?.imageUrl || body.image?.url || "";
      const caption = sanitizeString(body.image?.caption || "");
      if (imageUrl) {
        result = await processImage(resolved.resolvedProvider, aiOpts, imageUrl, caption);
      } else {
        result = { text: "Não consegui acessar a imagem. Pode enviar novamente?", tokensInput: 0, tokensOutput: 0, tokensTotal: 0 };
      }
    } else if (hasVideo) {
      messageType = "video";
      const videoUrl = body.video?.videoUrl || body.video?.url || "";
      const caption = sanitizeString(body.video?.caption || "");
      if (videoUrl) {
        result = await processVideo(resolved.resolvedProvider, aiOpts, videoUrl, caption);
      } else {
        result = { text: "Não consegui acessar o vídeo. Pode enviar novamente?", tokensInput: 0, tokensOutput: 0, tokensTotal: 0 };
      }
    } else if (hasAudio) {
      messageType = "audio";
      const audioUrl = body.audio?.audioUrl || body.audio?.url || "";
      if (audioUrl) {
        result = await processAudio(resolved.resolvedProvider, aiOpts, audioUrl);
      } else {
        result = { text: "Não consegui acessar o áudio. Pode enviar novamente?", tokensInput: 0, tokensOutput: 0, tokensTotal: 0 };
      }
    } else if (hasDocument) {
      messageType = "document";
      const docUrl = body.document?.documentUrl || body.document?.url || "";
      const fileName = sanitizeString(body.document?.fileName || body.document?.title || "documento");
      const mimeType = body.document?.mimeType || undefined;
      if (docUrl) {
        result = await processDocument(resolved.resolvedProvider, aiOpts, docUrl, fileName, mimeType);
      } else {
        result = { text: "Não consegui acessar o documento. Pode enviar novamente?", tokensInput: 0, tokensOutput: 0, tokensTotal: 0 };
      }
    } else if (hasSticker) {
      messageType = "sticker";
      const stickerUrl = body.sticker?.stickerUrl || body.sticker?.url || "";
      if (stickerUrl) {
        result = await processSticker(resolved.resolvedProvider, aiOpts, stickerUrl);
      } else {
        result = { text: "Recebi seu sticker! 😄", tokensInput: 0, tokensOutput: 0, tokensTotal: 0 };
      }
    } else if (hasLocation) {
      messageType = "location";
      const lat = body.location?.latitude || body.location?.lat || "";
      const lng = body.location?.longitude || body.location?.lng || "";
      const locName = sanitizeString(body.location?.name || body.location?.address || "");
      const locText = `O usuário compartilhou uma localização: ${locName ? locName + " — " : ""}Latitude: ${lat}, Longitude: ${lng}. Responda de forma útil sobre essa localização em português.`;
      result = await processText(resolved.resolvedProvider, aiOpts, locText, conversationHistory);
    } else if (hasContact) {
      messageType = "contact";
      const contact = body.contact || body.contactMessage;
      const displayName = sanitizeString(contact?.displayName || contact?.name || "");
      const vcard = sanitizeString(contact?.vcard || contact?.vCard || "");
      const contactText = `O usuário compartilhou um contato: Nome: ${displayName}. ${vcard ? `vCard: ${vcard.slice(0, 500)}` : ""}. Responda confirmando que recebeu o contato em português.`;
      result = await processText(resolved.resolvedProvider, aiOpts, contactText, conversationHistory);
    } else if (hasText) {
      messageType = "text";
      const userMessage = sanitizeString(userMessageText);
      if (userMessage) {
        result = await processText(resolved.resolvedProvider, aiOpts, userMessage, conversationHistory);
      } else {
        result = { text: "", tokensInput: 0, tokensOutput: 0, tokensTotal: 0 };
      }
    } else {
      messageType = "unknown";
      // Try to extract any text content from unknown message types
      const fallbackText = sanitizeString(body?.caption || body?.message || body?.body || "");
      if (fallbackText) {
        result = await processText(resolved.resolvedProvider, aiOpts, fallbackText, conversationHistory);
      } else {
        result = { text: "Recebi sua mensagem! Infelizmente ainda não consigo processar esse tipo de conteúdo. Tente enviar como texto, imagem, áudio ou documento. 📎", tokensInput: 0, tokensOutput: 0, tokensTotal: 0 };
      }
    }

    const processingMs = Date.now() - startMs;
    const dataBytesOut = new TextEncoder().encode(result.text).length;

    // Send reply
    if (result.text) {
      await zapiSendText(zapiCreds, phone, result.text, messageId);
    }

    // Log metrics + conversation (fire and forget)
    logUsageMetrics(service, cp.id, result, resolved.resolvedProvider, resolved.model, processingMs, dataBytesIn, dataBytesOut);

    // Log inbound message
    const typeLabels: Record<string, string> = {
      image: "🖼️ Imagem", video: "🎥 Vídeo", audio: "🎤 Áudio",
      document: "📄 Documento", sticker: "😀 Sticker", location: "📍 Localização",
      contact: "👤 Contato", unknown: "❓ Outro",
    };
    const inboundText = userMessageText || typeLabels[messageType] || "[Mensagem]";
    service.from("bot_conversation_logs").insert({
      customer_product_id: cp.id,
      source: "whatsapp",
      phone,
      direction: "inbound",
      message_text: inboundText,
    }).then(({ error: e }: any) => { if (e) console.error("conv_log_in:", e.message); });

    // Log outbound reply
    if (result.text) {
      service.from("bot_conversation_logs").insert({
        customer_product_id: cp.id,
        source: "whatsapp",
        phone,
        direction: "outbound",
        message_text: result.text,
        tokens_used: result.tokensTotal,
        processing_ms: processingMs,
        provider: resolved.resolvedProvider,
        model: resolved.model,
      }).then(({ error: e }: any) => { if (e) console.error("conv_log_out:", e.message); });
    }

    // Mark as processed
    await service
      .from("whatsapp_inbox_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("customer_product_id", cp.id)
      .is("processed_at", null)
      .order("received_at", { ascending: false })
      .limit(1);

    return corsResponse({
      ok: true,
      type: messageType,
      provider,
      resolvedProvider: resolved.resolvedProvider,
    }, 200, origin);
  } catch (error) {
    console.error("whatsapp-bot-engine error:", error);
    platformLog({
      function_name: 'whatsapp-bot-engine',
      level: 'error',
      message: `Engine crash: ${error.message}`,
      error_stack: error.stack,
      status_code: 500,
    });
    return corsResponse({ error: "internal_error" }, 500, origin);
  }
});
