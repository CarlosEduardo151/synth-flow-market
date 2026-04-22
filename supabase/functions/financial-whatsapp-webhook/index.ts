import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { evolutionSendText, evolutionSendPresence, loadEvolutionCredentials } from "../_shared/zapi.ts";
import { executeFinancialAction, ACTIONS_REQUIRING_APPROVAL } from "../_shared/financial-actions.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Build a short snapshot of financial data to provide context to the AI.
 * Lightweight compared to the full chat — keeps latency low for WhatsApp.
 */
async function buildSnapshot(supabase: any, customerProductId: string): Promise<string> {
  const today = new Date();
  const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [txs, invs, recv] = await Promise.all([
    supabase
      .from("financial_agent_transactions")
      .select("id, type, amount, description, date, category")
      .eq("customer_product_id", customerProductId)
      .order("date", { ascending: false })
      .limit(50),
    supabase
      .from("financial_agent_invoices")
      .select("id, title, amount, due_date, status, supplier")
      .eq("customer_product_id", customerProductId)
      .order("due_date", { ascending: true })
      .limit(10),
    supabase
      .from("financial_receivables")
      .select("id, invoice_number, client_name, total, due_date, status")
      .eq("customer_product_id", customerProductId)
      .order("due_date", { ascending: true })
      .limit(10),
  ]);

  const txArr = (txs.data || []) as any[];
  const monthTx = txArr.filter((t) => String(t.date || "").startsWith(ym));
  const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
  const balance = txArr.reduce((s, t) => s + (t.type === "income" ? Number(t.amount || 0) : -Number(t.amount || 0)), 0);

  const fmt = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const lines = [
    `Hoje: ${today.toISOString().slice(0, 10)}`,
    `Receita (mês): ${fmt(income)}`,
    `Despesa (mês): ${fmt(expense)}`,
    `Resultado (mês): ${fmt(income - expense)}`,
    `Saldo consolidado: ${fmt(balance)}`,
    "",
    `Últimas transações (id | tipo | valor | desc):`,
    ...txArr.slice(0, 10).map(
      (t) => `- ${t.id} | ${t.type} | ${fmt(Number(t.amount || 0))} | ${t.description || t.category || "—"}`,
    ),
    "",
    `Contas a pagar em aberto (id | título | valor | venc | status):`,
    ...(invs.data || []).map((i: any) => `- ${i.id} | ${i.title} | ${fmt(Number(i.amount || 0))} | ${i.due_date} | ${i.status || "pending"}`),
    "",
    `Recebíveis (id | cliente | total | venc | status):`,
    ...(recv.data || []).map((r: any) => `- ${r.id} | ${r.client_name} | ${fmt(Number(r.total || 0))} | ${r.due_date} | ${r.status}`),
  ];

  return lines.join("\n");
}

const SYSTEM_PROMPT = (snapshot: string) => [
  "Você é o Agente Financeiro do usuário, conversando com ele pelo WhatsApp.",
  "Seja breve, direto e use emojis com parcimônia. Respostas curtas (máx 5 linhas) quando possível.",
  "Responda em português (pt-BR).",
  "",
  "===== DADOS REAIS =====",
  snapshot,
  "=======================",
  "",
  "Você TEM AUTONOMIA para executar ações diretamente. Execute criação/atualização imediatamente, sem pedir confirmação.",
  "Apenas ações de EXCLUSÃO (*_delete) exigem confirmação — peça 'Confirme com SIM' antes de propor.",
  "",
  "Quando o usuário pedir uma ação, responda confirmando em UMA frase e no FINAL, em uma única linha:",
  "ACTION_PROPOSAL: <json minificado>",
  "Formato: {\"action_type\":\"...\",\"payload\":{...}}",
  "",
  "Se o usuário enviou uma IMAGEM ou PDF de comprovante/boleto/nota, extraia: valor, data, descrição/fornecedor, e proponha uma transação (expense por padrão) ou fatura.",
  "",
  "Action types (use exatamente estes nomes):",
  "- transaction_create {type:'income'|'expense', amount, description?, date?:'YYYY-MM-DD', category?, payment_method?, tags?}",
  "- transaction_update {id, ...}",
  "- transaction_delete {id}",
  "- invoice_create {title, amount, due_date:'YYYY-MM-DD', supplier?, category?, status?, recurring?, recurring_interval?, notes?}",
  "- invoice_update {id, ...}",
  "- invoice_delete {id}",
  "- invoice_mark_paid {id, paid_amount?, payment_method?}",
  "- receivable_create {client_name, total, due_date:'YYYY-MM-DD', client_email?, client_phone?, status?}",
  "- receivable_mark_paid {id, paid_amount?}",
  "- quote_create {client_name, total, items?:[{description,quantity,unit_price}]}",
  "- das_create {regime, competencia_month, competencia_year, revenue_month, aliquota_efetiva, total_amount, due_date}",
  "- calendar_create {title, event_date:'YYYY-MM-DD', event_type:'income'|'expense'|'tax'|'reminder', amount?, recurring?, recurring_interval?}",
  "- goal_create {name, target_amount, current_amount?, deadline?}",
  "",
  "Regras:",
  "- Só proponha ACTION_PROPOSAL quando o usuário pedir claramente uma ação.",
  "- Nunca invente IDs. Para update/delete use o ID exato do contexto acima.",
  "- Se faltar informação obrigatória, pergunte antes.",
  "- Para consultas (quanto gastei, qual saldo, etc), responda com os números reais acima, sem ACTION_PROPOSAL.",
].join("\n");

/**
 * Call Lovable AI Gateway. Supports text + optional attachment (image or pdf).
 * Returns reply text + optional action proposal extracted from the reply.
 */
async function callAI(opts: {
  systemPrompt: string;
  userText: string;
  attachment?: { mime: string; base64: string } | null;
}): Promise<{ reply: string; actionProposal: any | null }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

  const userContent: any[] = [{ type: "text", text: opts.userText || "(sem texto)" }];
  if (opts.attachment) {
    // Gemini supports images and PDFs natively via image_url with data URI.
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${opts.attachment.mime};base64,${opts.attachment.base64}` },
    });
  }

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!resp.ok) {
    const errTxt = await resp.text().catch(() => "");
    throw new Error(`AI gateway ${resp.status}: ${errTxt.slice(0, 300)}`);
  }

  const data = await resp.json();
  const reply: string = data?.choices?.[0]?.message?.content || "";

  // Extract ACTION_PROPOSAL
  let actionProposal: any | null = null;
  const m = reply.match(/ACTION_PROPOSAL:\s*(\{.*\})\s*$/s);
  if (m) {
    try {
      actionProposal = JSON.parse(m[1]);
    } catch {
      actionProposal = null;
    }
  }

  // Strip the ACTION_PROPOSAL line from the user-facing reply
  const cleanReply = reply.replace(/ACTION_PROPOSAL:\s*\{.*\}\s*$/s, "").trim();

  return { reply: cleanReply || "Ok.", actionProposal };
}

/**
 * Download a base64 media from Evolution API given the message.
 * Evolution may embed base64 directly when base64:true in webhook config,
 * or require us to fetch via /chat/getBase64FromMediaMessage endpoint.
 */
async function fetchMediaBase64(
  creds: { apiUrl: string; apiKey: string; instanceName: string },
  message: any,
): Promise<string | null> {
  // If webhook was configured with base64:true, Evolution often includes it directly
  const direct = message?.message?.base64 || message?.base64;
  if (typeof direct === "string" && direct.length > 100) return direct;

  try {
    const resp = await fetch(
      `${creds.apiUrl}/chat/getBase64FromMediaMessage/${encodeURIComponent(creds.instanceName)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: creds.apiKey },
        body: JSON.stringify({ message: { key: message.key, message: message.message } }),
      },
    );
    if (!resp.ok) return null;
    const data = await resp.json().catch(() => null);
    return data?.base64 || null;
  } catch (e) {
    console.warn("fetchMediaBase64 failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

function unwrapMessageContainer(message: any): any {
  let current = message || {};
  for (let i = 0; i < 5; i++) {
    if (current?.ephemeralMessage?.message) {
      current = current.ephemeralMessage.message;
      continue;
    }
    if (current?.viewOnceMessage?.message) {
      current = current.viewOnceMessage.message;
      continue;
    }
    if (current?.viewOnceMessageV2?.message) {
      current = current.viewOnceMessageV2.message;
      continue;
    }
    if (current?.documentWithCaptionMessage?.message) {
      current = current.documentWithCaptionMessage.message;
      continue;
    }
    break;
  }
  return current;
}

function resolveEventName(body: any): string {
  return String(body?.event || body?.eventName || body?.type || "").toLowerCase();
}

function resolveMessageEnvelope(body: any): any {
  const data = body?.data || body;
  if (data?.key || data?.message) return data;
  if (Array.isArray(data?.messages) && data.messages[0]) return data.messages[0];
  if (Array.isArray(body?.messages) && body.messages[0]) return body.messages[0];
  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const startedAt = Date.now();

  try {
    const url = new URL(req.url);
    const customerProductId = url.searchParams.get("customer_product_id");
    const token = url.searchParams.get("token");

    if (!customerProductId || !token) {
      return json(400, { error: "missing_params" });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Validate token matches customer_product
    const { data: cp, error: cpErr } = await supabase
      .from("customer_products")
      .select("id, user_id, webhook_token, is_active, product_slug")
      .eq("id", customerProductId)
      .maybeSingle();

    if (cpErr || !cp || cp.webhook_token !== token || !cp.is_active) {
      return json(403, { error: "invalid_token" });
    }

    const body = await req.json().catch(() => ({}));

    // Evolution event dispatch — accept actual event variants used by Evolution API
    const event = resolveEventName(body);
    if (event && !event.startsWith("messages")) {
      console.log("[financial-whatsapp-webhook] skipped event:", event);
      return json(200, { ok: true, skipped: event });
    }

    const data = resolveMessageEnvelope(body);
    const key = data?.key || {};
    const msg = unwrapMessageContainer(data?.message || {});
    const fromMe = key?.fromMe === true;
    const remoteJid: string = key?.remoteJid || "";
    const phone = remoteJid.replace(/@.*$/, "");

    // Ignore group messages and outbound echoes
    if (fromMe || remoteJid.endsWith("@g.us")) {
      return json(200, { ok: true, skipped: "group_or_self" });
    }

    // Extract text content
    const textContent: string =
      msg?.conversation ||
      msg?.extendedTextMessage?.text ||
      msg?.imageMessage?.caption ||
      msg?.documentMessage?.caption ||
      msg?.audioMessage?.caption ||
      msg?.editedMessage?.message?.conversation ||
      msg?.buttonsResponseMessage?.selectedDisplayText ||
      msg?.listResponseMessage?.title ||
      "";

    // Detect attachment
    let attachment: { type: "image" | "pdf"; mime: string; base64: string } | null = null;
    let attachmentType: string | null = null;

    if (msg?.imageMessage) {
      attachmentType = "image";
      const creds = await loadEvolutionCredentials(supabase, cp.user_id, customerProductId);
      if (creds) {
        const b64 = await fetchMediaBase64(creds, data);
        if (b64) {
          attachment = {
            type: "image",
            mime: msg.imageMessage.mimetype || "image/jpeg",
            base64: b64,
          };
        }
      }
    } else if (msg?.documentMessage) {
      const docMime = msg.documentMessage.mimetype || "";
      if (docMime.includes("pdf")) {
        attachmentType = "pdf";
        const creds = await loadEvolutionCredentials(supabase, cp.user_id, customerProductId);
        if (creds) {
          const b64 = await fetchMediaBase64(creds, data);
          if (b64) {
            attachment = { type: "pdf", mime: "application/pdf", base64: b64 };
          }
        }
      }
    }

    console.log("[financial-whatsapp-webhook] inbound message:", JSON.stringify({
      event,
      hasKey: !!key?.id,
      phone,
      fromMe,
      textPreview: (textContent || "").slice(0, 120),
      attachmentType,
      messageKeys: Object.keys(msg || {}),
    }));

    if (!textContent && !attachment) {
      // Nothing actionable
      await supabase.from("financial_whatsapp_logs").insert({
        customer_product_id: customerProductId,
        user_id: cp.user_id,
        direction: "in",
        phone,
        message_text: "(mensagem sem conteúdo processável)",
        status: "ignored",
      });
      return json(200, { ok: true, skipped: "no_content" });
    }

    // Log incoming
    await supabase.from("financial_whatsapp_logs").insert({
      customer_product_id: customerProductId,
      user_id: cp.user_id,
      direction: "in",
      phone,
      message_text: textContent || `(anexo ${attachmentType})`,
      attachment_type: attachmentType,
      status: "ok",
    });

    // Show typing indicator while we process
    const creds = await loadEvolutionCredentials(supabase, cp.user_id, customerProductId);
    if (creds) {
      evolutionSendPresence(creds, phone, "composing", 2000).catch(() => {});
    }

    // Build context + call AI
    const snapshot = await buildSnapshot(supabase, customerProductId);
    const systemPrompt = SYSTEM_PROMPT(snapshot);

    const userTextForAI = textContent ||
      (attachment?.type === "pdf"
        ? "O usuário enviou um PDF. Extraia os dados financeiros relevantes e proponha a ação adequada."
        : "O usuário enviou uma imagem. Se for um comprovante/boleto/cupom, extraia valor, data e descrição e proponha lançar como transação.");

    const ai = await callAI({ systemPrompt, userText: userTextForAI, attachment });

    // Execute action if proposed and allowed
    let executionNote = "";
    if (ai.actionProposal?.action_type) {
      const actionType = String(ai.actionProposal.action_type);
      const payload = ai.actionProposal.payload || {};
      const requiresApproval = ACTIONS_REQUIRING_APPROVAL.has(actionType);

      if (requiresApproval) {
        // Destructive — create a pending request (user must approve via site)
        await supabase.from("financial_agent_action_requests").insert({
          user_id: cp.user_id,
          customer_product_id: customerProductId,
          action_type: actionType,
          payload,
          status: "pending",
        });
        executionNote = "\n\n⏳ Ação de exclusão aguardando confirmação no painel web.";
      } else {
        try {
          await executeFinancialAction(supabase, cp.user_id, customerProductId, actionType, payload);
          executionNote = `\n\n✅ Feito: ${actionType}.`;
          await supabase.from("financial_agent_action_requests").insert({
            user_id: cp.user_id,
            customer_product_id: customerProductId,
            action_type: actionType,
            payload,
            status: "executed",
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "erro";
          executionNote = `\n\n❌ Não consegui executar: ${msg}`;
        }
      }
    }

    const finalReply = (ai.reply + executionNote).slice(0, 4000);

    // Send reply back to WhatsApp
    if (creds) {
      await evolutionSendText(creds, phone, finalReply);
    }

    // Log outgoing
    await supabase.from("financial_whatsapp_logs").insert({
      customer_product_id: customerProductId,
      user_id: cp.user_id,
      direction: "out",
      phone,
      message_text: finalReply,
      processing_ms: Date.now() - startedAt,
      status: "ok",
    });

    return json(200, { ok: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[financial-whatsapp-webhook] error:", msg);
    return json(200, { ok: false, error: msg }); // 200 so Evolution doesn't retry endlessly
  }
});
