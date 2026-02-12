import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightRequest, corsResponse } from "../_shared/cors.ts";

function extractJson(content: string): any {
  const jsonMatch =
    content.match(/```json\n?([\s\S]*?)\n?```/) ||
    content.match(/```\n?([\s\S]*?)\n?```/);
  const jsonStr = (jsonMatch ? jsonMatch[1] : content).trim();
  return JSON.parse(jsonStr);
}

async function callLovableAI(systemPrompt: string, userPrompt: string) {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY is not configured");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1200,
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    console.error("Lovable AI error:", resp.status, txt);
    throw new Error("Erro ao gerar recomendação de IA");
  }

  const data = await resp.json();
  return data.choices?.[0]?.message?.content as string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : "";
    if (!token) return corsResponse({ error: "Unauthorized" }, 401, req.headers.get("Origin"));

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: userRes } = await supabase.auth.getUser(token);
    const user = userRes?.user;
    if (!user) return corsResponse({ error: "Unauthorized" }, 401, req.headers.get("Origin"));

    const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (roleError || !isAdmin) {
      return corsResponse({ error: "Forbidden" }, 403, req.headers.get("Origin"));
    }

    const { cartId } = await req.json();
    if (!cartId) return corsResponse({ error: "cartId is required" }, 400, req.headers.get("Origin"));

    const { data: cart, error: cartError } = await supabase
      .from("abandoned_carts")
      .select("*")
      .eq("id", cartId)
      .single();
    if (cartError || !cart) {
      return corsResponse({ error: "abandoned_cart_not_found" }, 404, req.headers.get("Origin"));
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, phone")
      .eq("user_id", cart.user_id)
      .maybeSingle();

    const systemPrompt = `Você é um especialista em conversão e recuperação de carrinho abandonado via WhatsApp.
Sua tarefa é sugerir uma abordagem HUMANA, curta e direta, para reconquistar o cliente.

Regras:
1) Responda APENAS em JSON válido, sem markdown.
2) A mensagem deve ser em PT-BR, com tom cordial e objetivo.
3) Não invente dados (nome, preço) se não estiver no input.
4) Crie no máximo 3 ações recomendadas.

Formato obrigatório:
{
  "recommended_actions": ["..."],
  "recommended_message": "...",
  "ai_analysis": {
    "stage": "cart|checkout",
    "intent": "alta|media",
    "likely_objection": "preço|dúvida|tempo|pagamento|outro",
    "next_best_offer": "desconto|ajuda|urgencia|prova_social|garantia|nenhum"
  }
}`;

    const total = cart.total_amount ? Number(cart.total_amount) : 0;
    const userPrompt = `Contexto do abandono:

- Estágio: ${cart.stage}
- Total (em centavos): ${total}
- Itens do carrinho (JSON): ${JSON.stringify(cart.cart_items || [], null, 2)}

Dados do cliente (se existirem):
- Nome: ${profile?.full_name ?? ""}
- Email: ${profile?.email ?? ""}
- Telefone: ${profile?.phone ?? ""}

Gere a recomendação.`;

    const content = await callLovableAI(systemPrompt, userPrompt);
    const out = extractJson(content);

    const recommended_actions = Array.isArray(out?.recommended_actions)
      ? out.recommended_actions
      : out?.recommended_actions
      ? [String(out.recommended_actions)]
      : null;

    const recommended_message = out?.recommended_message ? String(out.recommended_message) : null;

    const ai_analysis = out?.ai_analysis ?? { raw: out };

    await supabase
      .from("abandoned_carts")
      .update({
        recommended_actions,
        recommended_message,
        ai_analysis,
        updated_at: new Date().toISOString(),
      })
      .eq("id", cartId);

    return corsResponse(
      {
        ok: true,
        cartId,
        recommended_actions,
        recommended_message,
        ai_analysis,
      },
      200,
      req.headers.get("Origin")
    );
  } catch (error) {
    console.error("abandoned-cart-ai error:", error);
    return corsResponse(
      { error: error instanceof Error ? error.message : "Unknown error" },
      500,
      req.headers.get("Origin")
    );
  }
});
