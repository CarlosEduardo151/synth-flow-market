import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * NovaLink IA – Motor dedicado multimodal (texto, imagem, documento, áudio).
 * Usa Lovable AI Gateway com streaming SSE.
 */

interface Attachment {
  type: "image" | "document" | "audio";
  mime: string;
  data: string; // base64
  name?: string;
}

interface ChatRequest {
  message: string;
  attachments?: Attachment[];
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}

// ── System prompt ──────────────────────────────────────────────
const SYSTEM_PROMPT = `Você é a **NovaLink IA**, assistente virtual inteligente da plataforma NovaLink.
Suas capacidades:
- Conversa natural em português (pt-BR)
- Análise de imagens: descreva, identifique objetos, leia texto em fotos
- Análise de documentos: extraia informações de PDFs, planilhas, docs
- Transcrição de áudio: entenda áudios enviados pelo usuário
- Responda de forma direta, simpática e profissional
- Use formatação Markdown quando útil (listas, negrito, código)
- Quando receber uma imagem ou documento, SEMPRE descreva o que vê e responda ao contexto
- Nunca invente dados; se não souber, diga que não tem essa informação

Informações da plataforma:
- NovaLink oferece agentes de IA, CRM, bots de automação, relatórios financeiros e muito mais
- Ajude com dúvidas sobre produtos, configurações e uso da plataforma
- Se o usuário pedir algo fora do seu escopo, oriente gentilmente`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return jsonResp(405, { error: "Method not allowed" });
    }

    // ── Auth ───────────────────────────────────────────────────
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!jwt) return jsonResp(401, { error: "Unauthorized" });

    const { data: { user }, error: userErr } = await supabase.auth.getUser(jwt);
    if (userErr || !user) return jsonResp(401, { error: "Unauthorized" });

    // ── Parse body ─────────────────────────────────────────────
    const body = (await req.json().catch(() => null)) as ChatRequest | null;
    if (!body?.message?.trim() && (!body?.attachments || body.attachments.length === 0)) {
      return jsonResp(400, { error: "message ou attachments obrigatório" });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return jsonResp(500, { error: "LOVABLE_API_KEY not configured" });
    }

    // ── Build messages array ───────────────────────────────────
    const messages: any[] = [{ role: "system", content: SYSTEM_PROMPT }];

    // Add conversation history (last 20 messages)
    const history = Array.isArray(body.history) ? body.history.slice(-20) : [];
    for (const h of history) {
      if (h.role === "user" || h.role === "assistant") {
        messages.push({ role: h.role, content: h.content });
      }
    }

    // Build user message with multimodal content
    const attachments = Array.isArray(body.attachments) ? body.attachments : [];
    const userText = body.message?.trim() || "";

    if (attachments.length > 0) {
      // Multimodal: use content array format
      const contentParts: any[] = [];

      // Describe attachments in text for context
      const descriptions: string[] = [];
      for (const att of attachments) {
        if (att.type === "image") {
          descriptions.push(`[Imagem anexada: ${att.name || "sem nome"}]`);
          contentParts.push({
            type: "image_url",
            image_url: { url: `data:${att.mime};base64,${att.data}` },
          });
        } else if (att.type === "document") {
          // For documents, decode text content and include inline
          try {
            const decoded = atob(att.data);
            descriptions.push(
              `[Documento: ${att.name || "arquivo"}]\nConteúdo extraído:\n${decoded.slice(0, 8000)}`
            );
          } catch {
            descriptions.push(`[Documento anexado: ${att.name || "arquivo"} - não foi possível extrair texto]`);
          }
        } else if (att.type === "audio") {
          descriptions.push(`[Áudio anexado: ${att.name || "gravação"}]`);
          // Include audio as image_url (base64 data URI) — gateway handles it
          contentParts.push({
            type: "image_url",
            image_url: { url: `data:${att.mime};base64,${att.data}` },
          });
        }
      }

      const fullText = [...descriptions, userText].filter(Boolean).join("\n\n");
      contentParts.unshift({ type: "text", text: fullText });
      messages.push({ role: "user", content: contentParts });
    } else {
      messages.push({ role: "user", content: userText });
    }

    // ── Call Lovable AI Gateway with streaming ─────────────────
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages,
        stream: true,
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!aiResp.ok) {
      const status = aiResp.status;
      if (status === 429) {
        return jsonResp(429, { error: "Rate limit excedido. Tente novamente em instantes." });
      }
      if (status === 402) {
        return jsonResp(402, { error: "Créditos insuficientes. Contate o administrador." });
      }
      const errText = await aiResp.text();
      console.error("AI Gateway error:", status, errText);
      return jsonResp(500, { error: "Falha ao consultar a IA" });
    }

    // Stream SSE back to client
    return new Response(aiResp.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("novalink-chat error:", e);
    return jsonResp(500, { error: e instanceof Error ? e.message : "Erro desconhecido" });
  }
});

function jsonResp(status: number, data: unknown) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
