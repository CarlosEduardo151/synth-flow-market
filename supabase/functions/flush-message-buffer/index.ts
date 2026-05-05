// Flush do buffer de mensagens do WhatsApp Financeiro.
// Chamado pelo pg_cron a cada 2s. Pega buffers vencidos com FOR UPDATE SKIP LOCKED,
// monta um único prompt multimodal com todos os items acumulados, chama a IA uma vez,
// executa todas as ações propostas e envia UMA resposta consolidada.

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

async function buildSnapshot(supabase: any, customerProductId: string): Promise<string> {
  const today = new Date();
  const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [txs, invs, recv] = await Promise.all([
    supabase.from("financial_agent_transactions")
      .select("id, type, amount, description, date, category")
      .eq("customer_product_id", customerProductId)
      .order("date", { ascending: false }).limit(50),
    supabase.from("financial_agent_invoices")
      .select("id, title, amount, due_date, status, supplier")
      .eq("customer_product_id", customerProductId)
      .order("due_date", { ascending: true }).limit(10),
    supabase.from("financial_receivables")
      .select("id, invoice_number, client_name, total, due_date, status")
      .eq("customer_product_id", customerProductId)
      .order("due_date", { ascending: true }).limit(10),
  ]);

  const txArr = (txs.data || []) as any[];
  const monthTx = txArr.filter((t) => String(t.date || "").startsWith(ym));
  const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
  const expense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);
  const balance = txArr.reduce((s, t) => s + (t.type === "income" ? Number(t.amount || 0) : -Number(t.amount || 0)), 0);

  const fmt = (v: number) => `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return [
    `Hoje: ${today.toISOString().slice(0, 10)}`,
    `Receita (mês): ${fmt(income)}`,
    `Despesa (mês): ${fmt(expense)}`,
    `Resultado (mês): ${fmt(income - expense)}`,
    `Saldo consolidado: ${fmt(balance)}`,
    "",
    `Últimas transações (id | tipo | valor | desc):`,
    ...txArr.slice(0, 10).map((t) => `- ${t.id} | ${t.type} | ${fmt(Number(t.amount || 0))} | ${t.description || t.category || "—"}`),
    "",
    `Contas a pagar em aberto:`,
    ...(invs.data || []).map((i: any) => `- ${i.id} | ${i.title} | ${fmt(Number(i.amount || 0))} | ${i.due_date} | ${i.status || "pending"}`),
    "",
    `Recebíveis:`,
    ...(recv.data || []).map((r: any) => `- ${r.id} | ${r.client_name} | ${fmt(Number(r.total || 0))} | ${r.due_date} | ${r.status}`),
  ].join("\n");
}

const SYSTEM_PROMPT = (snapshot: string) => [
  "Você é o Agente Financeiro do usuário, conversando com ele pelo WhatsApp.",
  "Seja breve, direto e use emojis com parcimônia. Respostas curtas (máx 6 linhas).",
  "Responda em português (pt-BR).",
  "",
  "===== DADOS REAIS =====",
  snapshot,
  "=======================",
  "",
  "===== PROCESSAMENTO EM LOTE (CRÍTICO) =====",
  "Você pode receber MÚLTIPLOS arquivos/mensagens em uma única requisição (o usuário",
  "envia vários comprovantes/extratos em sequência e nós agrupamos antes de chamar você).",
  "",
  "REGRAS OBRIGATÓRIAS:",
  "1. Analise CADA arquivo/imagem/PDF/texto enviado individualmente.",
  "2. Se UM único arquivo (ex: extrato bancário, fatura de cartão, lista de PIX do Santander)",
  "   contiver MÚLTIPLAS transações, extraia TODAS elas — uma ação por transação.",
  "3. Retorne UMA lista consolidada com TODAS as ações no FINAL da resposta, em UMA linha:",
  "   ACTIONS_PROPOSAL: [{\"action_type\":\"...\",\"payload\":{...}}, {\"action_type\":\"...\",\"payload\":{...}}]",
  "4. Nunca pule transações de um extrato. Se houver 27 PIX, retorne 27 ações.",
  "5. Diferencie entradas (income) de saídas (expense) pelo sinal/contexto do extrato.",
  "===========================================",
  "",
  "Você TEM AUTONOMIA. Execute criação/atualização sem pedir confirmação.",
  "Apenas ações de EXCLUSÃO (*_delete) exigem confirmação — peça 'Confirme com SIM' antes.",
  "",
  "Action types disponíveis:",
  "- transaction_create {type:'income'|'expense', amount, description?, date?:'YYYY-MM-DD', category?, payment_method?, tags?}",
  "- transaction_update {id, ...} | transaction_delete {id}",
  "- invoice_create {title, amount, due_date, supplier?, category?, status?, recurring?, recurring_interval?, notes?}",
  "- invoice_update {id, ...} | invoice_delete {id} | invoice_mark_paid {id, paid_amount?, payment_method?}",
  "- receivable_create {client_name, total, due_date, client_email?, client_phone?, status?}",
  "- receivable_mark_paid {id, paid_amount?}",
  "- quote_create {client_name, total, items?:[{description,quantity,unit_price}]}",
  "- das_create {regime, competencia_month, competencia_year, revenue_month, aliquota_efetiva, total_amount, due_date}",
  "- calendar_create {title, event_date, event_type:'income'|'expense'|'tax'|'reminder', amount?, recurring?, recurring_interval?}",
  "- goal_create {name, target_amount, current_amount?, deadline?}",
  "",
  "Regras finais:",
  "- Para CONSULTAS (saldo, quanto gastei) responda com os números reais e NÃO inclua ACTIONS_PROPOSAL.",
  "- Para AÇÕES, sempre use ACTIONS_PROPOSAL: [...] (mesmo se for 1 ação, vai dentro do array).",
  "- Nunca invente IDs. Para update/delete use ID exato do contexto acima.",
  "- Texto da resposta para o usuário deve resumir: 'Lancei N transações: ...' (não liste cada uma se forem >5).",
].join("\n");

async function callAI(opts: {
  systemPrompt: string;
  userText: string;
  attachments: Array<{ mime: string; base64: string }>;
}): Promise<{ reply: string; actions: any[] }> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

  const userContent: any[] = [{ type: "text", text: opts.userText || "(sem texto)" }];
  for (const att of opts.attachments) {
    userContent.push({
      type: "image_url",
      image_url: { url: `data:${att.mime};base64,${att.base64}` },
    });
  }

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: opts.systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`AI gateway ${resp.status}: ${t.slice(0, 300)}`);
  }

  const data = await resp.json();
  const reply: string = data?.choices?.[0]?.message?.content || "";

  // Tenta ACTIONS_PROPOSAL (lista). Fallback para ACTION_PROPOSAL (singular legado).
  let actions: any[] = [];
  const mList = reply.match(/ACTIONS_PROPOSAL:\s*(\[[\s\S]*?\])\s*$/);
  if (mList) {
    try { actions = JSON.parse(mList[1]); } catch { actions = []; }
  } else {
    const mSingle = reply.match(/ACTION_PROPOSAL:\s*(\{[\s\S]*?\})\s*$/);
    if (mSingle) {
      try { actions = [JSON.parse(mSingle[1])]; } catch { actions = []; }
    }
  }

  const cleanReply = reply
    .replace(/ACTIONS_PROPOSAL:\s*\[[\s\S]*?\]\s*$/, "")
    .replace(/ACTION_PROPOSAL:\s*\{[\s\S]*?\}\s*$/, "")
    .trim();

  return { reply: cleanReply || "Ok.", actions: Array.isArray(actions) ? actions : [] };
}

async function processBuffer(supabase: any, buf: any): Promise<void> {
  const startedAt = Date.now();
  const items = Array.isArray(buf.items) ? buf.items : [];
  console.log(`[flush] processing buffer ${buf.id} (${items.length} items) phone=${buf.phone}`);

  const creds = await loadEvolutionCredentials(supabase, buf.user_id, buf.customer_product_id);
  if (creds) evolutionSendPresence(creds, buf.phone, "composing", 3000).catch(() => {});

  // Monta texto consolidado
  const textParts: string[] = [];
  const attachments: Array<{ mime: string; base64: string }> = [];
  items.forEach((it: any, idx: number) => {
    const n = idx + 1;
    if (it.text) textParts.push(`${n}. [texto]: ${it.text}`);
    if (it.transcribed_audio) textParts.push(`${n}. [áudio transcrito]: ${it.transcribed_audio}`);
    if (it.attachment?.base64) {
      const kind = it.attachment.mime?.includes("pdf") ? "PDF" : "imagem";
      textParts.push(`${n}. [${kind} anexado]${it.text ? "" : " — analisar conteúdo"}`);
      attachments.push({ mime: it.attachment.mime, base64: it.attachment.base64 });
    }
  });

  const userText = items.length > 1
    ? `O usuário enviou ${items.length} itens em sequência. Analise TODOS:\n${textParts.join("\n")}`
    : textParts.join("\n") || "(sem conteúdo)";

  const snapshot = await buildSnapshot(supabase, buf.customer_product_id);
  const systemPrompt = SYSTEM_PROMPT(snapshot);

  let ai: { reply: string; actions: any[] };
  try {
    ai = await callAI({ systemPrompt, userText, attachments });
  } catch (e) {
    console.error(`[flush] AI failed for buffer ${buf.id}:`, e instanceof Error ? e.message : e);
    if (creds) await evolutionSendText(creds, buf.phone, "❌ Tive um problema ao processar suas mensagens. Pode tentar de novo?").catch(() => {});
    await supabase.from("whatsapp_message_buffer").delete().eq("id", buf.id);
    return;
  }

  // Executa ações
  const executed: string[] = [];
  const failed: string[] = [];
  const pendingApproval: string[] = [];

  for (const act of ai.actions) {
    const actionType = String(act?.action_type || "");
    if (!actionType) continue;
    const payload = act.payload || {};

    if (ACTIONS_REQUIRING_APPROVAL.has(actionType)) {
      await supabase.from("financial_agent_action_requests").insert({
        user_id: buf.user_id,
        customer_product_id: buf.customer_product_id,
        action_type: actionType,
        payload,
        status: "pending",
      });
      pendingApproval.push(actionType);
      continue;
    }

    try {
      await executeFinancialAction(supabase, buf.user_id, buf.customer_product_id, actionType, payload);
      executed.push(actionType);
      await supabase.from("financial_agent_action_requests").insert({
        user_id: buf.user_id,
        customer_product_id: buf.customer_product_id,
        action_type: actionType,
        payload,
        status: "executed",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "erro";
      console.error(`[flush] action ${actionType} failed:`, msg);
      failed.push(`${actionType}: ${msg}`);
    }
  }

  // Mensagem consolidada
  const summaryParts: string[] = [];
  if (executed.length === 1) {
    summaryParts.push(`✅ Lancei 1 ação: ${executed[0]}.`);
  } else if (executed.length > 1) {
    const counts: Record<string, number> = {};
    executed.forEach((a) => { counts[a] = (counts[a] || 0) + 1; });
    const detail = Object.entries(counts).map(([k, v]) => `${v}× ${k}`).join(", ");
    summaryParts.push(`✅ Lancei ${executed.length} ações (${detail}).`);
  }
  if (pendingApproval.length) {
    summaryParts.push(`⏳ ${pendingApproval.length} exclusão(ões) aguardando confirmação no painel.`);
  }
  if (failed.length) {
    summaryParts.push(`❌ ${failed.length} falharam: ${failed.slice(0, 3).join("; ")}`);
  }

  const finalReply = [ai.reply, summaryParts.join("\n")].filter(Boolean).join("\n\n").slice(0, 4000);

  if (creds) {
    await evolutionSendText(creds, buf.phone, finalReply).catch((e) => {
      console.error(`[flush] send failed for ${buf.id}:`, e instanceof Error ? e.message : e);
    });
  }

  await supabase.from("financial_whatsapp_logs").insert({
    customer_product_id: buf.customer_product_id,
    user_id: buf.user_id,
    direction: "out",
    phone: buf.phone,
    message_text: finalReply,
    processing_ms: Date.now() - startedAt,
    status: "ok",
  });

  // Remove o buffer
  await supabase.from("whatsapp_message_buffer").delete().eq("id", buf.id);
  console.log(`[flush] done buffer ${buf.id} in ${Date.now() - startedAt}ms (executed=${executed.length} failed=${failed.length})`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // 1) Limpa locks órfãos (>60s presos em processing=true)
    await supabase.rpc("execute_sql_admin", {}).catch(() => {}); // no-op se não existir
    await supabase
      .from("whatsapp_message_buffer")
      .update({ processing: false, processing_started_at: null })
      .eq("processing", true)
      .lt("processing_started_at", new Date(Date.now() - 60_000).toISOString());

    // 2) Pega buffers vencidos com lock atômico (FOR UPDATE SKIP LOCKED via RPC ou query bruta)
    // Como supabase-js não expõe SKIP LOCKED diretamente, usamos UPDATE com subselect e RETURNING.
    // O índice único parcial (processing=false) já evita colisões de UPSERT, mas para o flush
    // garantimos que apenas uma instância pegue cada linha:
    const { data: claimed, error: claimErr } = await supabase.rpc("claim_message_buffers", {
      _limit: 10,
    });

    let buffers: any[] = [];
    if (claimErr) {
      // Fallback se a RPC não existir ainda — race-tolerant via update simples
      console.warn("[flush] claim RPC missing, using fallback:", claimErr.message);
      const { data: pending } = await supabase
        .from("whatsapp_message_buffer")
        .select("*")
        .eq("processing", false)
        .lte("flush_at", new Date().toISOString())
        .order("flush_at", { ascending: true })
        .limit(10);

      for (const row of pending || []) {
        const { data: locked } = await supabase
          .from("whatsapp_message_buffer")
          .update({ processing: true, processing_started_at: new Date().toISOString() })
          .eq("id", row.id)
          .eq("processing", false)
          .select()
          .maybeSingle();
        if (locked) buffers.push(locked);
      }
    } else {
      buffers = claimed || [];
    }

    console.log(`[flush] claimed ${buffers.length} buffers`);

    // Processa em paralelo (cada buffer é independente)
    await Promise.allSettled(buffers.map((b) => processBuffer(supabase, b)));

    return json(200, { ok: true, processed: buffers.length });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown";
    console.error("[flush-message-buffer] error:", msg);
    return json(200, { ok: false, error: msg });
  }
});
