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
import { zapiSendText, loadZAPICredentials, evolutionSendText, evolutionSendAudio, evolutionSendPresence, evolutionMarkRead, loadEvolutionCredentials, type EvolutionCredentials } from "../_shared/zapi.ts";
import { platformLog } from "../_shared/platform-logger.ts";
import {
  isAntiBanEnabled,
  computeHumanDelayMs,
  computeInterChunkDelayMs,
  splitMessageIntoChunks,
  applyResponseVariability,
  sleep,
} from "../_shared/anti-ban.ts";

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

// ========== Anti-flood / anti-loop guards ==========
const BLOCK_TTL_MS = 5 * 60 * 1000;
const DEDUP_TTL_MS = 10 * 60 * 1000;
const FINGERPRINT_TTL_MS = 8_000;
const OUTBOUND_ECHO_TTL_MS = 45_000;

const blockMap = new Map<string, number>();
const dedupMap = new Map<string, number>();
const fingerprintMap = new Map<string, number>();
const recentOutboundMap = new Map<string, { expiresAt: number; fingerprint: string }>();

function cleanupNumberMap(map: Map<string, number>) {
  const now = Date.now();
  for (const [k, v] of map) {
    if (now > v) map.delete(k);
  }
}

function cleanupOutboundMap() {
  const now = Date.now();
  for (const [k, v] of recentOutboundMap) {
    if (now > v.expiresAt) recentOutboundMap.delete(k);
  }
}

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

function cleanupEphemeralMaps() {
  cleanupNumberMap(blockMap);
  cleanupNumberMap(dedupMap);
  cleanupNumberMap(fingerprintMap);
  cleanupOutboundMap();
}

function rememberDedup(key: string, ttlMs = DEDUP_TTL_MS) {
  if (!key) return;
  dedupMap.set(key, Date.now() + ttlMs);
}

function hasRecentDedup(key: string): boolean {
  const exp = dedupMap.get(key);
  if (!exp) return false;
  if (Date.now() > exp) {
    dedupMap.delete(key);
    return false;
  }
  return true;
}

function normalizeFingerprintText(text: string): string {
  return sanitizeString(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

function extractInboundPreview(body: any): string {
  return sanitizeString(
    body?.text?.message ||
    body?.text ||
    body?.image?.caption ||
    body?.video?.caption ||
    body?.document?.fileName ||
    body?.location?.name ||
    body?.contact?.displayName ||
    "[media]"
  );
}

function extractInboundFingerprint(phone: string, body: any): string {
  const kind = body?.text ? "text"
    : body?.image ? "image"
    : body?.audio ? "audio"
    : body?.video ? "video"
    : body?.document ? "document"
    : body?.sticker ? "sticker"
    : body?.location ? "location"
    : body?.contact ? "contact"
    : "unknown";

  return `${phone}|${kind}|${normalizeFingerprintText(extractInboundPreview(body))}`;
}

function rememberFingerprint(key: string) {
  if (!key) return;
  fingerprintMap.set(key, Date.now() + FINGERPRINT_TTL_MS);
}

function hasRecentFingerprint(key: string): boolean {
  const exp = fingerprintMap.get(key);
  if (!exp) return false;
  if (Date.now() > exp) {
    fingerprintMap.delete(key);
    return false;
  }
  return true;
}

function rememberRecentOutbound(phone: string, text: string) {
  const fingerprint = normalizeFingerprintText(text);
  if (!phone || !fingerprint) return;
  recentOutboundMap.set(phone, {
    fingerprint,
    expiresAt: Date.now() + OUTBOUND_ECHO_TTL_MS,
  });
}

function isLikelyOutboundEcho(phone: string, incomingText: string): boolean {
  const current = recentOutboundMap.get(phone);
  if (!current) return false;
  if (Date.now() > current.expiresAt) {
    recentOutboundMap.delete(phone);
    return false;
  }
  return current.fingerprint.length > 0 && current.fingerprint === normalizeFingerprintText(incomingText);
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

// ========== Handoff intent detector ==========
// Strategy: fast regex on common Portuguese/English/Spanish phrases (deterministic),
// then optional GROQ-based AI fallback for ambiguous cases.

const HANDOFF_KEYWORDS = [
  // Portuguese — explicit human request
  /\b(falar|conversar|atendimento|atende?r?)\s+(com\s+)?(um\s+|uma\s+)?(atendente|humano|pessoa|gente|operador|consultor|vendedor|gerente|funcion[aá]rio|alguém|alguem)\b/i,
  /\b(quero|preciso|gostaria|posso)\s+(de\s+)?(falar|conversar|um\s+atendente|atendimento\s+humano)/i,
  /\batendente\s+(humano|real|de\s+verdade)\b/i,
  /\b(transfer[ie]r?|me\s+passa|me\s+passe|chama)\s+(para|pra)\s+(um\s+)?(atendente|humano|pessoa|gerente)/i,
  /\b(humano|pessoa\s+real|gente\s+de\s+verdade)\b/i,
  // English
  /\b(talk|speak|chat)\s+(to|with)\s+(a\s+)?(human|person|agent|representative|someone)/i,
  /\b(human|live)\s+(agent|support|representative)\b/i,
  // Spanish
  /\bhablar\s+con\s+(un\s+)?(humano|persona|agente|asesor)/i,
  // Strong frustration / escalation signals
  /\b(p[eé]ssim[oa]|horr[ií]vel|inaceit[aá]vel|absurdo|reclama(r|ção|cao))\b/i,
  /\b(cancelar?|reembolso|devolu[çc][aã]o|processo)\b/i,
];

function quickHandoffMatch(text: string): { matched: boolean; reason: string } {
  const clean = (text || "").toLowerCase().trim();
  if (!clean) return { matched: false, reason: "empty" };
  for (const re of HANDOFF_KEYWORDS) {
    if (re.test(clean)) {
      return { matched: true, reason: `regex:${re.source.slice(0, 40)}` };
    }
  }
  return { matched: false, reason: "no_regex_match" };
}

async function detectHandoffIntentAI(userText: string): Promise<boolean> {
  // Use GROQ (already used by main engine, faster + cheaper than Lovable Gateway here)
  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (!groqKey) {
    console.warn("[bot-engine] handoff AI: no GROQ_API_KEY");
    return false;
  }
  try {
    const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${groqKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        temperature: 0,
        max_tokens: 10,
        messages: [
          {
            role: "system",
            content: `Você classifica mensagens de WhatsApp. Decida se o cliente quer falar com um ATENDENTE HUMANO (não com bot/IA), está fazendo reclamação séria, está frustrado, ou em situação delicada que exige pessoa real.

Responda APENAS com uma palavra: "SIM" ou "NAO".

Exemplos SIM: "quero falar com atendente", "me passa pra alguém", "isso não resolve, preciso de uma pessoa", "vocês são péssimos", "preciso falar com humano", "atendente humano", "talk to a human".
Exemplos NAO: "qual o preço?", "quero comprar", "obrigado", "bom dia", "me explica", "não entendi".`,
          },
          { role: "user", content: userText.slice(0, 500) },
        ],
      }),
    });
    if (!resp.ok) {
      console.warn("[bot-engine] handoff AI HTTP", resp.status, await resp.text().catch(() => ""));
      return false;
    }
    const data = await resp.json();
    const answer = (data?.choices?.[0]?.message?.content || "").toString().trim().toUpperCase();
    console.log("[bot-engine] handoff AI answer:", answer);
    return answer.startsWith("SIM");
  } catch (e) {
    console.warn("[bot-engine] handoff AI error:", (e as Error).message);
    return false;
  }
}

async function detectHandoffIntent(userText: string): Promise<{ triggered: boolean; reason: string }> {
  // 1. Fast regex match (deterministic, zero-latency)
  const quick = quickHandoffMatch(userText);
  if (quick.matched) {
    console.log("[bot-engine] handoff REGEX matched:", quick.reason);
    return { triggered: true, reason: quick.reason };
  }
  // 2. AI fallback for ambiguous phrases
  const aiTriggered = await detectHandoffIntentAI(userText);
  if (aiTriggered) {
    console.log("[bot-engine] handoff AI matched");
    return { triggered: true, reason: "ai_classifier" };
  }
  return { triggered: false, reason: "no_signal" };
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

    // Check activation state.
    // IMPORTANT: the motor must NEVER answer when ai_control_config.is_active = false,
    // even if the WhatsApp instance is still connected.
    const { data: botInstances, error: botErr } = await service
      .from("bot_instances")
      .select("is_active")
      .eq("customer_product_id", cp.id);

    const { data: aiActive, error: aiErr } = await service
      .from("ai_control_config")
      .select("is_active")
      .eq("customer_product_id", cp.id)
      .maybeSingle();

    console.log("[bot-engine] activation debug:", JSON.stringify({
      cpId: cp.id,
      botInstances,
      botErr: botErr?.message,
      aiActive,
      aiErr: aiErr?.message,
    }));

    const hasConnectedBot = (botInstances?.length ?? 0) === 0
      ? true
      : (botInstances?.some((b: any) => b.is_active) ?? false);
    const hasAiActive = aiActive?.is_active === true;

    if (!hasAiActive || !hasConnectedBot) {
      const reason = !hasAiActive ? "ai_inactive" : "bot_instance_inactive";
      console.log("[bot-engine] skipped: inactive", cp.id, "bot:", hasConnectedBot, "ai:", hasAiActive, "reason:", reason);
      return corsResponse({ ok: true, skipped: reason }, 200, origin);
    }

    console.log("[bot-engine] active check passed", cp.id, "bot:", hasConnectedBot, "ai:", hasAiActive);

    // Parse body (max 500KB)
    const bodyText = await req.text();
    if (bodyText.length > 500_000) return corsResponse({ error: "payload_too_large" }, 413, origin);

    let payload: any;
    try { payload = JSON.parse(bodyText); } catch { return corsResponse({ error: "invalid_json" }, 400, origin); }

    // Persist raw event
    await service.from("whatsapp_inbox_events").insert({
      customer_product_id: cp.id,
      source: payload?._evolutionEvent ? "evolution" : "z-api",
      payload,
    }).then(({ error }: any) => { if (error) console.error("event_insert_error:", error.message); });

    // Extract message fields
    const body = payload?.body || payload;
    const phone = sanitizeString(body?.phone || body?.from || "");
    const fromMe = body?.fromMe === true;
    const messageId = sanitizeString(body?.messageId || "");
    const inboundPreview = extractInboundPreview(body);
    const messageDedupKey = messageId ? `${cp.id}:${messageId}` : "";
    const fingerprintKey = `${cp.id}:${extractInboundFingerprint(phone, body)}`;

    if (!phone) return corsResponse({ ok: true, skipped: "no_phone" }, 200, origin);

    // Cleanup + check anti-loop caches
    cleanupEphemeralMaps();

    if (messageDedupKey && hasRecentDedup(messageDedupKey)) {
      console.log("[bot-engine] skipped duplicate messageId", messageDedupKey);
      return corsResponse({ ok: true, skipped: "duplicate_message_id" }, 200, origin);
    }

    if (hasRecentFingerprint(fingerprintKey)) {
      console.log("[bot-engine] skipped duplicate fingerprint", fingerprintKey);
      return corsResponse({ ok: true, skipped: "duplicate_fingerprint" }, 200, origin);
    }

    if (!fromMe && inboundPreview && isLikelyOutboundEcho(phone, inboundPreview)) {
      console.log("[bot-engine] skipped likely outbound echo for", phone);
      return corsResponse({ ok: true, skipped: "likely_outbound_echo" }, 200, origin);
    }

    // Block fromMe messages (prevent echo loops) but update handoff timer
    if (fromMe) {
      if (messageDedupKey) rememberDedup(messageDedupKey);
      // When the human agent (business) sends a message, extend the handoff timer
      await service.from("bot_handoff_sessions")
        .update({ last_activity_at: new Date().toISOString() })
        .eq("customer_product_id", cp.id)
        .eq("phone", phone)
        .eq("status", "active")
        .then(() => {});
      setBlock(phone);
      return corsResponse({ ok: true, skipped: "from_me" }, 200, origin);
    }

    if (messageDedupKey) rememberDedup(messageDedupKey);
    rememberFingerprint(fingerprintKey);

    if (isBlocked(phone)) return corsResponse({ ok: true, skipped: "blocked" }, 200, origin);

    // Per-phone rate limit
    if (isPhoneRateLimited(phone)) {
      return corsResponse({ ok: true, skipped: "phone_rate_limited" }, 200, origin);
    }

    // ===== Load client config =====

    // 1. Evolution API credentials (preferred) or Z-API (legacy fallback)
    let evoCreds: EvolutionCredentials | null = null;
    const zapiCreds = await loadZAPICredentials(service, cp.user_id);
    evoCreds = await loadEvolutionCredentials(service, cp.user_id, cp.id);

    if (!evoCreds && !zapiCreds) {
      console.error("No messaging creds (Evolution or Z-API) for user", cp.user_id);
      return corsResponse({ ok: true, skipped: "no_messaging_creds" }, 200, origin);
    }

    // Detect if anti-ban protocols apply (only for "bots-automacao" product)
    const antiBan = await isAntiBanEnabled(service, cp.id);
    if (antiBan) console.log("[anti-ban] protocols ENABLED for", cp.id);

    // Helper to send text via whichever provider is available.
    // When anti-ban is on (Evolution only), it simulates human behavior:
    //   markRead → composing → delay → split into chunks → variability → send
    const sendTextReply = async (toPhone: string, text: string, msgId?: string) => {
      if (evoCreds && antiBan) {
        try {
          // 1. Marca como lida (humano abre a conversa antes de digitar)
          await evolutionMarkRead(evoCreds, toPhone, msgId);

          // 2. Aplica variabilidade leve em respostas curtas / saudações
          const variedText = applyResponseVariability(text);

          // 3. Quebra em pedaços (step-by-step) para respostas longas
          const chunks = splitMessageIntoChunks(variedText, 3);

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const delayMs = computeHumanDelayMs(chunk);

            // 4. Sinaliza "digitando..." e espera o delay humanizado
            await evolutionSendPresence(evoCreds, toPhone, "composing", delayMs);
            await sleep(delayMs);
            await evolutionSendPresence(evoCreds, toPhone, "paused");

            await evolutionSendText(evoCreds, toPhone, chunk);
            rememberRecentOutbound(toPhone, chunk);

            if (i < chunks.length - 1) {
              await sleep(computeInterChunkDelayMs());
            }
          }
          return;
        } catch (e) {
          console.warn("[anti-ban] failed, falling back to direct send:", e instanceof Error ? e.message : e);
          // fall-through para envio direto
        }
      }

      if (evoCreds) {
        await evolutionSendText(evoCreds, toPhone, text);
        rememberRecentOutbound(toPhone, text);
      } else if (zapiCreds) {
        await zapiSendText(zapiCreds, toPhone, text, msgId);
        rememberRecentOutbound(toPhone, text);
      }
    };

    // ===== HUMAN HANDOFF CHECK =====
    const { data: handoffConfig } = await service
      .from("bot_handoff_config")
      .select("*")
      .eq("customer_product_id", cp.id)
      .eq("is_enabled", true)
      .maybeSingle();

    if (handoffConfig) {
      // Check for active handoff session
      const { data: activeHandoff } = await service
        .from("bot_handoff_sessions")
        .select("id, last_activity_at")
        .eq("customer_product_id", cp.id)
        .eq("phone", phone)
        .eq("status", "active")
        .maybeSingle();

      if (activeHandoff) {
        const lastActivity = new Date(activeHandoff.last_activity_at).getTime();
        const pauseMs = (handoffConfig.pause_minutes || 30) * 60 * 1000;
        const elapsed = Date.now() - lastActivity;

        if (elapsed < pauseMs) {
          // Still in handoff — update last_activity_at (client message extends timer)
          await service.from("bot_handoff_sessions")
            .update({ last_activity_at: new Date().toISOString() })
            .eq("id", activeHandoff.id);

          // Log inbound but do NOT respond
          service.from("bot_conversation_logs").insert({
            customer_product_id: cp.id, source: "whatsapp", phone,
            direction: "inbound", message_text: body?.text?.message || body?.text || "[handoff-paused]",
          }).then(() => {});

          console.log("[bot-engine] handoff active, bot paused for", phone, "remaining:", Math.round((pauseMs - elapsed) / 60000), "min");
          return corsResponse({ ok: true, skipped: "handoff_active" }, 200, origin);
        } else {
          // Handoff expired — mark session as expired and send return message
          await service.from("bot_handoff_sessions")
            .update({ status: "expired" })
            .eq("id", activeHandoff.id);

          if (handoffConfig.return_message) {
            await sendTextReply(phone, handoffConfig.return_message, messageId);
          }
          console.log("[bot-engine] handoff expired for", phone, "— bot resuming");
        }
      }

      // Check if this message triggers handoff (AI-based intent detection)
      const userText = (body?.text?.message || body?.text || "").toString().trim();
      if (userText && userText.length > 0) {
        const triggered = await detectHandoffIntent(userText);

        if (triggered) {
          // Create handoff session
          await service.from("bot_handoff_sessions").insert({
            customer_product_id: cp.id,
            phone,
            status: "active",
          });

          // Send auto message to customer (best-effort, non-blocking on failure)
          if (handoffConfig.auto_message) {
            try {
              await sendTextReply(phone, handoffConfig.auto_message, messageId);
            } catch (e) {
              console.error("[bot-engine] handoff auto_message send failed:", e instanceof Error ? e.message : e);
            }
          }

          // Notify human agent if configured — DIRECT send (no anti-ban / no chunking / no markRead).
          // Build a rich, contextual notification with client name + recent conversation history.
          if (handoffConfig.notification_phone) {
            // Try to extract pushName from payload (Evolution sends this)
            const pushName = sanitizeString(
              body?.pushName || body?.senderName || payload?.data?.pushName || ""
            );

            // Fetch last 6 messages of conversation history for context
            const { data: recentMsgs } = await service
              .from("bot_conversation_logs")
              .select("direction, message_text, created_at")
              .eq("customer_product_id", cp.id)
              .eq("phone", phone)
              .order("created_at", { ascending: false })
              .limit(6);

            const history = (recentMsgs || [])
              .reverse()
              .map((m: any) => {
                const who = m.direction === "inbound" ? "👤 Cliente" : "🤖 Bot";
                const txt = (m.message_text || "").slice(0, 200);
                return `${who}: ${txt}`;
              })
              .join("\n");

            // Format phone for display: 5599999999999 -> +55 (99) 99999-9999
            const formattedPhone = phone.length >= 12
              ? `+${phone.slice(0, 2)} (${phone.slice(2, 4)}) ${phone.slice(4, 9)}-${phone.slice(9)}`
              : phone;

            const waLink = `https://wa.me/${phone}`;

            const notifMsg = [
              `🔔 *${handoffConfig.notification_message || "Novo atendimento humano solicitado"}*`,
              ``,
              `👤 *Cliente:* ${pushName || "Sem nome"}`,
              `📱 *Telefone:* ${formattedPhone}`,
              `💬 *Última mensagem:* ${userText}`,
              ``,
              history ? `📜 *Contexto recente da conversa:*\n${history}` : ``,
              ``,
              `▶️ Responder agora: ${waLink}`,
              ``,
              `_O bot foi pausado automaticamente. Ele só voltará a responder após ${handoffConfig.pause_minutes || 30} min de inatividade._`,
            ].filter(Boolean).join("\n");

            try {
              if (evoCreds) {
                await evolutionSendText(evoCreds, handoffConfig.notification_phone, notifMsg);
              } else if (zapiCreds) {
                await zapiSendText(zapiCreds, handoffConfig.notification_phone, notifMsg);
              }
              console.log("[bot-engine] handoff notification sent to agent", handoffConfig.notification_phone);
            } catch (e) {
              console.error("[bot-engine] handoff notification FAILED to", handoffConfig.notification_phone, ":", e instanceof Error ? e.message : e);
            }
          }

          // Log
          service.from("bot_conversation_logs").insert({
            customer_product_id: cp.id, source: "whatsapp", phone,
            direction: "inbound", message_text: userText,
          }).then(() => {});
          service.from("bot_conversation_logs").insert({
            customer_product_id: cp.id, source: "whatsapp", phone,
            direction: "outbound", message_text: `[HANDOFF] ${handoffConfig.auto_message || "Transferido para humano"}`,
            tokens_used: 0, processing_ms: 0, provider: "handoff", model: "handoff",
          }).then(() => {});

          console.log("[bot-engine] handoff triggered for", phone, "pause:", handoffConfig.pause_minutes, "min");
          return corsResponse({ ok: true, type: "handoff", triggered: true }, 200, origin);
        }
      }
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

    // ===== MULTI-LANGUAGE DETECTION =====
    systemPrompt += `\n\n=== DETECÇÃO AUTOMÁTICA DE IDIOMA ===
REGRA OBRIGATÓRIA: Sempre responda no MESMO idioma em que o usuário escreveu a mensagem.
- Se o usuário escrever em inglês, responda em inglês.
- Se o usuário escrever em espanhol, responda em espanhol.
- Se o usuário escrever em português, responda em português.
- Para qualquer outro idioma, responda nesse mesmo idioma.
Detecte o idioma automaticamente pela mensagem recebida. Nunca force um idioma específico.`;

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
      await sendTextReply(
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

            // Send FAQ reply
            await sendTextReply(phone, faqAnswer, messageId);

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
      const audioBase64 = body.audio?.base64 || "";
      const audioMime = body.audio?.mimeType || "audio/ogg";
      if (audioUrl || audioBase64) {
        result = await processAudio(resolved.resolvedProvider, aiOpts, audioUrl, conversationHistory, audioBase64, audioMime);
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

    // ===== Helper: generate TTS audio and send =====
    const generateAndSendAudio = async (text: string) => {
      if (!evoCreds) return false;
      const voiceConfig = aiConfig?.configuration?.voice_config;
      const voiceEnabled = voiceConfig?.enabled === true;
      const voiceId = voiceEnabled ? (voiceConfig.voiceId || "nova") : "nova";

      if (!voiceEnabled) return false;

      const { data: openaiCred } = await service
        .from("product_credentials")
        .select("credential_value")
        .eq("credential_key", "openai_api_key")
        .limit(1)
        .maybeSingle();

      const openaiKey = openaiCred?.credential_value;
      if (!openaiKey) {
        console.warn("[bot-engine] TTS: no OpenAI key found, falling back to text");
        return false;
      }

      console.log("[bot-engine] generating TTS with voice:", voiceId);
      const ttsResp = await fetch("https://api.openai.com/v1/audio/speech", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${openaiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          voice: voiceId,
          input: text.slice(0, 4096),
          response_format: "mp3",
        }),
      });

      if (ttsResp.ok) {
        const audioBuffer = await ttsResp.arrayBuffer();
        const bytes = new Uint8Array(audioBuffer);
        let binary = "";
        const chunkSize = 8192;
        for (let i = 0; i < bytes.length; i += chunkSize) {
          binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
        }
        const audioBase64 = btoa(binary);
        const base64WithMime = `data:audio/mpeg;base64,${audioBase64}`;
        await evolutionSendAudio(evoCreds, phone, base64WithMime);
        rememberRecentOutbound(phone, text);
        console.log("[bot-engine] TTS audio sent to", phone);
        return true;
      } else {
        console.error("[bot-engine] TTS error:", ttsResp.status, await ttsResp.text().catch(() => ""));
        return false;
      }
    };

    // Send reply
    if (result.text) {
      console.log("[bot-engine] sending reply to", phone, "type:", messageType, "chars:", result.text.length);

      // Only reply with audio if the incoming message was audio
      const shouldReplyAudio = messageType === "audio";

      if (shouldReplyAudio && evoCreds) {
        try {
          const audioSent = await generateAndSendAudio(result.text);
          if (!audioSent) {
            // Fallback to text if TTS fails
            await sendTextReply(phone, result.text, messageId);
          }
        } catch (ttsErr) {
          console.error("[bot-engine] TTS generation error:", ttsErr);
          await sendTextReply(phone, result.text, messageId);
        }
      } else {
        await sendTextReply(phone, result.text, messageId);
      }
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

    // ===== SEND ERROR NOTIFICATION TO OWNER =====
    try {
      const RESEND_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_KEY) {
        // Get owner email from the customer_product
        const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.75.0");
        const adminClient = createClient(supabaseUrl, serviceKey);

        // Find the customer_product from the URL params
        const urlParams = new URL(error._request_url || "http://x", "http://x").searchParams;
        const cpId = urlParams.get("customer_product_id");
        
        if (cpId) {
          const { data: cp } = await adminClient
            .from("customer_products")
            .select("user_id")
            .eq("id", cpId)
            .maybeSingle();

          if (cp?.user_id) {
            const { data: userData } = await adminClient.auth.admin.getUserById(cp.user_id);
            const ownerEmail = userData?.user?.email;

            if (ownerEmail) {
              // Check if we already sent a notification in the last 30 min (avoid spam)
              const { data: recentNotif } = await adminClient
                .from("bot_conversation_logs")
                .select("id")
                .eq("customer_product_id", cpId)
                .eq("direction", "outbound")
                .eq("source", "error_notification")
                .gte("created_at", new Date(Date.now() - 30 * 60 * 1000).toISOString())
                .limit(1);

              if (!recentNotif || recentNotif.length === 0) {
                await fetch("https://api.resend.com/emails", {
                  method: "POST",
                  headers: {
                    "Authorization": `Bearer ${RESEND_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    from: "StarAI Bot <noreply@starai.com.br>",
                    to: [ownerEmail],
                    subject: "⚠️ Seu Bot StarAI encontrou um erro",
                    html: `
                      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:24px;">
                        <h2 style="color:#ef4444;margin-bottom:8px;">⚠️ Erro no Bot</h2>
                        <p style="color:#666;font-size:14px;">Seu bot de automação encontrou um erro ao processar uma mensagem:</p>
                        <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:12px;margin:16px 0;">
                          <code style="font-size:13px;color:#991b1b;">${(error.message || "Erro desconhecido").slice(0, 300)}</code>
                        </div>
                        <p style="color:#666;font-size:13px;">
                          O bot continuará funcionando normalmente para as próximas mensagens.
                          Se o erro persistir, verifique as configurações do motor IA no painel.
                        </p>
                        <p style="color:#999;font-size:11px;margin-top:24px;">
                          Data: ${new Date().toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}
                        </p>
                      </div>
                    `,
                  }),
                });

                // Log that we sent the notification (to avoid spam)
                await adminClient.from("bot_conversation_logs").insert({
                  customer_product_id: cpId,
                  source: "error_notification",
                  direction: "outbound",
                  message_text: `[NOTIFICAÇÃO] Erro enviado para ${ownerEmail}: ${error.message}`,
                });
              }
            }
          }
        }
      }
    } catch (notifErr) {
      console.error("error_notification_failed:", notifErr);
    }

    return corsResponse({ error: "internal_error" }, 500, origin);
  }
});
