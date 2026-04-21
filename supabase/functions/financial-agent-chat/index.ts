import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Attachment = {
  type: "image";
  mime: string;
  data: string; // base64
  name?: string;
};

type ChatBody = {
  customerProductId: string;
  message: string;
  attachments?: Attachment[];
};

type Provider = "lovable" | "openai" | "gemini";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return json(405, { error: "Method not allowed" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!jwt) return json(401, { error: "Unauthorized" });

    const {
      data: { user },
      error: userErr,
    } = await supabase.auth.getUser(jwt);
    if (userErr || !user) return json(401, { error: "Unauthorized" });

    const body = (await req.json().catch(() => null)) as ChatBody | null;
    if (!body?.customerProductId || !body?.message?.trim()) {
      return json(400, { error: "customerProductId e message são obrigatórios" });
    }

    // Verify product ownership and status
    const { data: customerProduct, error: cpErr } = await supabase
      .from("customer_products")
      .select("id, user_id, product_slug, is_active")
      .eq("id", body.customerProductId)
      .maybeSingle();

    if (cpErr || !customerProduct || customerProduct.user_id !== user.id || !customerProduct.is_active) {
      return json(403, { error: "Sem acesso ao produto" });
    }

    const productSlug = customerProduct.product_slug;
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];

    // Load user permissions (defaults: allow goal proposals; execution always requires approval)
    const { data: permRow } = await supabase
      .from("financial_agent_permissions")
      .select("permissions")
      .eq("customer_product_id", body.customerProductId)
      .eq("user_id", user.id)
      .maybeSingle();

    const permissions = (permRow?.permissions ?? {}) as Record<string, any>;

    // Load chat history (last 20)
    const { data: history } = await supabase
      .from("financial_agent_chat_messages")
      .select("role, content, attachments, created_at")
      .eq("customer_product_id", body.customerProductId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true })
      .limit(20);

    // Persist user message
    await supabase.from("financial_agent_chat_messages").insert({
      user_id: user.id,
      customer_product_id: body.customerProductId,
      role: "user",
      content: body.message.trim(),
      attachments: attachments.length ? attachments : null,
    });

    // Choose provider/model for this product
    const assignment = await pickAssignment(supabase, productSlug);
    const provider = normalizeProvider(assignment?.provider);
    const model = assignment?.model ?? "google/gemini-3-flash-preview";

    const systemPrompt = buildSystemPrompt({
      productSlug,
      permissions,
    });

    const aiResult = await generateAssistantReply({
      supabase,
      provider,
      model,
      systemPrompt,
      userText: body.message.trim(),
      userId: user.id,
      history: history || [],
      attachments,
    });

    // Persist assistant message
    await supabase.from("financial_agent_chat_messages").insert({
      user_id: user.id,
      customer_product_id: body.customerProductId,
      role: "assistant",
      content: aiResult.reply,
      attachments: aiResult.replyAttachments ?? null,
    });

    let actionRequest: any = null;
    if (aiResult.actionProposal) {
      const { data: ar, error: arErr } = await supabase
        .from("financial_agent_action_requests")
        .insert({
          user_id: user.id,
          customer_product_id: body.customerProductId,
          action_type: aiResult.actionProposal.action_type,
          payload: aiResult.actionProposal.payload,
          status: "pending",
        })
        .select("*")
        .single();
      if (!arErr) actionRequest = ar;
    }

    return json(200, {
      reply: aiResult.reply,
      provider,
      model,
      actionRequest,
    });
  } catch (e) {
    console.error("financial-agent-chat error:", e);
    return json(500, { error: e instanceof Error ? e.message : "Erro desconhecido" });
  }
});

function json(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function pickAssignment(supabase: any, productSlug: string) {
  const { data } = await supabase
    .from("product_ai_assignments")
    .select("provider, model, is_active")
    .eq("product_slug", productSlug)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!data) return null;
  const provider = String(data.provider || "").toLowerCase();
  if (!provider) return null;
  return { provider, model: data.model };
}

function buildSystemPrompt({
  productSlug,
  permissions,
  toolContext,
}: {
  productSlug: string;
  permissions: Record<string, any>;
  toolContext?: string;
}) {
  const goals = permissions?.goals || { create: true, update: true, delete: true };

  return [
    `Você é o Agente Financeiro (CFO virtual) do produto "${productSlug}".`,
    "Responda em português (pt-BR), de forma direta, executiva e com números reais.",
    "Você pode receber imagens; descreva e use a imagem para ajudar o usuário.",
    "",
    "===== DADOS REAIS DO CLIENTE (use SEMPRE estes números nas respostas) =====",
    toolContext || "(sem dados disponíveis no momento)",
    "==========================================================================",
    "",
    "Quando o usuário pedir relatório, análise, KPIs, fluxo, projeção, faturas, vencimentos, gastos, top categorias, saldo, runway ou insights — use APENAS os dados acima. NÃO invente números.",
    "Se faltar dado, diga claramente o que falta e como cadastrar.",
    "",
    "AÇÕES (metas):",
    "Você NÃO executa ações diretamente. Quando o usuário pedir para CRIAR/EDITAR/APAGAR uma META, PROPONHA uma ação para aprovação.",
    `- criar meta: ${!!goals.create}`,
    `- atualizar meta: ${!!goals.update}`,
    `- apagar meta: ${!!goals.delete}`,
    "Se a permissão estiver false, explique que o cliente deve habilitar nas Configurações.",
    "Se for permitido, no final inclua uma linha única começando com:",
    "ACTION_PROPOSAL:",
    "seguida de JSON minificado: {\"action_type\":\"goal_create|goal_update|goal_delete\",\"payload\":{...}}",
    "NUNCA inclua ACTION_PROPOSAL se o usuário não pediu uma ação de meta claramente.",
  ].join("\n");
}

// ============ Tool context: carrega snapshot real para o prompt ============
async function buildToolContext(supabase: any, customerProductId: string): Promise<string> {
  try {
    const today = new Date();
    const ym = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    const since = new Date(); since.setDate(since.getDate() - 90);
    const sinceISO = since.toISOString().split("T")[0];

    const [{ data: tx }, { data: invs }, { data: recv }, { data: kpi }, { data: insights }, { data: goals }, { data: forecast }] = await Promise.all([
      supabase.from("financial_agent_transactions").select("type, amount, description, date, category").eq("customer_product_id", customerProductId).gte("date", sinceISO).order("date", { ascending: false }).limit(500),
      supabase.from("financial_agent_invoices").select("title, amount, due_date, status, supplier").eq("customer_product_id", customerProductId).order("due_date", { ascending: true }).limit(50),
      supabase.from("financial_receivables").select("invoice_number, client_name, total, due_date, status").eq("customer_product_id", customerProductId).order("due_date", { ascending: true }).limit(50),
      supabase.from("financial_kpi_snapshots").select("*").eq("customer_product_id", customerProductId).order("snapshot_date", { ascending: false }).limit(1).maybeSingle(),
      supabase.from("financial_insights").select("title, description, severity, impact_brl, status").eq("customer_product_id", customerProductId).eq("status", "open").order("detected_at", { ascending: false }).limit(8),
      supabase.from("financial_agent_goals").select("name, target_amount, current_amount, deadline, status").eq("customer_product_id", customerProductId).limit(20),
      supabase.from("financial_forecasts").select("horizon_days, projected_income, projected_expense, projected_balance, confidence, generated_at").eq("customer_product_id", customerProductId).order("generated_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const txArr = (tx || []) as any[];
    const monthTx = txArr.filter((t) => String(t.date).startsWith(ym));
    const income = monthTx.filter((t) => t.type === "income").reduce((s, t) => s + Number(t.amount || 0), 0);
    const expense = monthTx.filter((t) => t.type === "expense").reduce((s, t) => s + Number(t.amount || 0), 0);

    const catMap = new Map<string, number>();
    monthTx.filter((t) => t.type === "expense").forEach((t) => {
      const c = String(t.category || "Outros").trim();
      catMap.set(c, (catMap.get(c) || 0) + Number(t.amount || 0));
    });
    const topCats = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const fmt = (n: number) => `R$ ${n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const openPay = (invs || []).filter((i: any) => i.status === "pending");
    const overduePay = openPay.filter((i: any) => new Date(i.due_date) < today);
    const openRecv = (recv || []).filter((r: any) => ["sent", "overdue", "partial"].includes(r.status));
    const overdueRecv = openRecv.filter((r: any) => new Date(r.due_date) < today);

    const lines: string[] = [];
    lines.push(`Data de hoje: ${today.toISOString().split("T")[0]}`);
    lines.push("");
    lines.push("[KPIs do mês corrente]");
    lines.push(`- Receita: ${fmt(income)}`);
    lines.push(`- Despesa: ${fmt(expense)}`);
    lines.push(`- Resultado: ${fmt(income - expense)}`);
    if (kpi) {
      lines.push(`- Saldo (snapshot ${kpi.snapshot_date}): ${fmt(Number(kpi.cash_balance || 0))}`);
      if (kpi.runway_months != null) lines.push(`- Runway: ${Number(kpi.runway_months).toFixed(1)} meses`);
      if (kpi.burn_rate_monthly != null) lines.push(`- Burn rate mensal: ${fmt(Number(kpi.burn_rate_monthly))}`);
      if (kpi.net_margin_pct != null) lines.push(`- Margem líquida: ${Number(kpi.net_margin_pct).toFixed(1)}%`);
      if (kpi.avg_ticket != null) lines.push(`- Ticket médio: ${fmt(Number(kpi.avg_ticket))}`);
    }
    lines.push("");
    lines.push("[Top categorias de despesa - mês]");
    if (topCats.length === 0) lines.push("- (sem categorias)");
    topCats.forEach(([c, v]) => lines.push(`- ${c}: ${fmt(v)}`));

    lines.push("");
    lines.push(`[Contas a pagar] em aberto: ${openPay.length} | vencidas: ${overduePay.length}`);
    openPay.slice(0, 8).forEach((i: any) => lines.push(`- ${i.title} | ${i.supplier || "-"} | ${fmt(Number(i.amount))} | venc ${i.due_date} | ${i.status}`));

    lines.push("");
    lines.push(`[Contas a receber] em aberto: ${openRecv.length} | vencidas: ${overdueRecv.length}`);
    openRecv.slice(0, 8).forEach((r: any) => lines.push(`- ${r.invoice_number || "-"} | ${r.client_name || "-"} | ${fmt(Number(r.total))} | venc ${r.due_date} | ${r.status}`));

    if (forecast) {
      lines.push("");
      lines.push(`[Previsão ${forecast.horizon_days}d] receita ${fmt(Number(forecast.projected_income))} | despesa ${fmt(Number(forecast.projected_expense))} | saldo proj. ${fmt(Number(forecast.projected_balance))} | confiança ${Math.round(Number(forecast.confidence || 0) * 100)}%`);
    }

    if ((insights || []).length) {
      lines.push("");
      lines.push("[Insights ativos]");
      (insights as any[]).forEach((i) => lines.push(`- [${i.severity}] ${i.title}${i.impact_brl ? ` (impacto ${fmt(Number(i.impact_brl))})` : ""} — ${i.description}`));
    }

    if ((goals || []).length) {
      lines.push("");
      lines.push("[Metas]");
      (goals as any[]).forEach((g) => {
        const pct = g.target_amount > 0 ? (Number(g.current_amount || 0) / Number(g.target_amount) * 100).toFixed(0) : "0";
        lines.push(`- ${g.name}: ${fmt(Number(g.current_amount || 0))}/${fmt(Number(g.target_amount))} (${pct}%) ${g.deadline ? `até ${g.deadline}` : ""} [${g.status || "active"}]`);
      });
    }

    lines.push("");
    lines.push("[Últimas transações]");
    txArr.slice(0, 10).forEach((t) => lines.push(`- ${t.date} | ${t.type === "income" ? "+" : "-"}${fmt(Number(t.amount))} | ${t.category || "-"} | ${t.description || ""}`));

    return lines.join("\n");
  } catch (e) {
    console.error("buildToolContext error", e);
    return "(erro ao carregar contexto financeiro)";
  }
}

async function getProviderKey(supabase: any, provider: "openai" | "gemini") {
  const { data } = await supabase
    .from("api_credentials")
    .select("api_key, is_active")
    .eq("provider", provider)
    .maybeSingle();
  if (!data?.is_active || !data?.api_key) return null;
  return data.api_key as string;
}

function extractActionProposal(text: string): { reply: string; proposal: any | null } {
  const marker = "ACTION_PROPOSAL:";
  const idx = text.lastIndexOf(marker);
  if (idx === -1) return { reply: text.trim(), proposal: null };
  const before = text.slice(0, idx).trim();
  const jsonPart = text.slice(idx + marker.length).trim();
  try {
    const proposal = JSON.parse(jsonPart);
    if (!proposal?.action_type || !proposal?.payload) return { reply: text.trim(), proposal: null };
    return { reply: before || "Ok.", proposal };
  } catch {
    return { reply: text.trim(), proposal: null };
  }
}

async function generateAssistantReply({
  supabase,
  provider,
  model,
  systemPrompt,
  userText,
  userId: _userId,
  history,
  attachments,
}: {
  supabase: any;
  provider: Provider;
  model: string;
  systemPrompt: string;
  userText: string;
  userId: string;
  history: Array<any>;
  attachments: Attachment[];
}): Promise<{ reply: string; actionProposal: any | null; replyAttachments?: any }> {
  // Build messages (keep it simple: system + compact history + latest user)
  const histMsgs = (history || []).slice(-12).map((m) => ({
    role: m.role,
    content: m.content,
    attachments: m.attachments,
  }));

  if (provider === "openai") {
    const key = await getProviderKey(supabase, "openai");
    if (!key) {
      return { reply: "IA não configurada (OpenAI sem chave ativa). Peça ao administrador para configurar.", actionProposal: null };
    }

    const openAiMessages: any[] = [{ role: "system", content: systemPrompt }];

    for (const m of histMsgs) {
      if (m.role === "user") openAiMessages.push({ role: "user", content: m.content });
      else if (m.role === "assistant") openAiMessages.push({ role: "assistant", content: m.content });
    }

    // Attach images to last user message when present
    if (attachments.length) {
      const contentParts: any[] = [{ type: "text", text: userText }];
      for (const img of attachments) {
        contentParts.push({
          type: "image_url",
          image_url: { url: `data:${img.mime};base64,${img.data}` },
        });
      }
      openAiMessages.push({ role: "user", content: contentParts });
    } else {
      openAiMessages.push({ role: "user", content: userText });
    }

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: openAiMessages,
        temperature: 0.6,
        max_tokens: 1200,
      }),
    });

    const t = await resp.text();
    if (!resp.ok) {
      console.error("OpenAI error:", resp.status, t);
      return { reply: "Falha ao consultar a IA (OpenAI).", actionProposal: null };
    }
    const parsed = JSON.parse(t);
    const content = parsed?.choices?.[0]?.message?.content as string | undefined;
    const { reply, proposal } = extractActionProposal(content || "");
    return { reply: reply || "", actionProposal: proposal };
  }

  if (provider === "gemini") {
    const key = await getProviderKey(supabase, "gemini");
    if (!key) {
      return { reply: "IA não configurada (Gemini sem chave ativa). Peça ao administrador para configurar.", actionProposal: null };
    }

    // Gemini GenerateContent (multimodal)
    const contents: any[] = [];
    // We only include a compact text history for Gemini to keep payload small
    const compactHistory = histMsgs
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-10)
      .map((m) => `${m.role === "user" ? "Usuário" : "Assistente"}: ${m.content}`)
      .join("\n");

    const parts: any[] = [];
    parts.push({ text: systemPrompt + "\n\n" + (compactHistory ? `HISTÓRICO:\n${compactHistory}\n\n` : "") + `MENSAGEM ATUAL:\n${userText}` });
    for (const img of attachments) {
      parts.push({
        inlineData: { mimeType: img.mime, data: img.data },
      });
    }
    contents.push({ role: "user", parts });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key,
      },
      body: JSON.stringify({
        contents,
        generationConfig: { temperature: 0.6, maxOutputTokens: 1200 },
      }),
    });

    const t = await resp.text();
    if (!resp.ok) {
      console.error("Gemini error:", resp.status, t);
      return { reply: "Falha ao consultar a IA (Gemini).", actionProposal: null };
    }
    const parsed = JSON.parse(t);
    const content = parsed?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).filter(Boolean).join("") as string | undefined;
    const { reply, proposal } = extractActionProposal(content || "");
    return { reply: reply || "", actionProposal: proposal };
  }

  // Lovable AI fallback (fast, no external keys)
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return { reply: "IA não configurada.", actionProposal: null };
  }

  const messages: any[] = [{ role: "system", content: systemPrompt }];
  for (const m of histMsgs) {
    if (m.role === "user" || m.role === "assistant") messages.push({ role: m.role, content: m.content });
  }
  messages.push({ role: "user", content: userText });

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "google/gemini-3-flash-preview",
      messages,
      temperature: 0.6,
      max_tokens: 1200,
    }),
  });

  const t = await resp.text();
  if (!resp.ok) {
    console.error("Lovable AI error:", resp.status, t);
    return { reply: "Falha ao consultar a IA.", actionProposal: null };
  }
  const parsed = JSON.parse(t);
  const content = parsed?.choices?.[0]?.message?.content as string | undefined;
  const { reply, proposal } = extractActionProposal(content || "");
  return { reply: reply || "", actionProposal: proposal };
}

function normalizeProvider(provider: unknown): Provider {
  const p = String(provider || "").toLowerCase();
  if (p === "openai" || p === "gemini" || p === "lovable") return p;
  return "lovable";
}
