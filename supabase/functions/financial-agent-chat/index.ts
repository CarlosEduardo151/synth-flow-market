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
}: {
  productSlug: string;
  permissions: Record<string, any>;
}) {
  const goals = permissions?.goals || { create: true, update: true, delete: true };

  return [
    `Você é o Agente Financeiro do produto "${productSlug}".`,
    "Responda em português (pt-BR), de forma direta e útil.",
    "Você pode receber imagens; descreva e use a imagem para ajudar o usuário.",
    "IMPORTANTE: Você NÃO executa ações diretamente. Quando o usuário pedir para CRIAR/EDITAR/APAGAR uma META, você deve PROPOR uma ação para aprovação do cliente.",
    "Permissões atuais do cliente (metas):",
    `- criar: ${!!goals.create}`,
    `- atualizar: ${!!goals.update}`,
    `- apagar: ${!!goals.delete}`,
    "Se a permissão estiver false, explique que o cliente precisa habilitar essa permissão nas Configurações do agente.",
    "Se for permitido, no final da sua mensagem inclua uma linha única começando com:",
    "ACTION_PROPOSAL:",
    "seguida de JSON minificado com o formato:",
    '{"action_type":"goal_create|goal_update|goal_delete","payload":{...}}',
    "NUNCA inclua ACTION_PROPOSAL se o usuário não pediu uma ação de meta claramente.",
    "O restante da resposta deve ser texto normal para o usuário.",
  ].join("\n");
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
