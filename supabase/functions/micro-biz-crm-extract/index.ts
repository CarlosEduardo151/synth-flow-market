/**
 * MICRO-BIZ CRM INVISÍVEL
 * Extrai dados de leads automaticamente de conversas WhatsApp.
 * Fluxo: Mensagem → IA extrai dados → Upsert lead → Log conversa
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest, corsResponse } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  try {
    const { customer_product_id, phone, message_text, direction, sender_name } = await req.json();

    if (!customer_product_id || !phone || !message_text) {
      return corsResponse({ error: "customer_product_id, phone and message_text required" }, 400, origin);
    }

    const groqKey = Deno.env.get("GROQ_API_KEY") || "";
    if (!groqKey) return corsResponse({ error: "GROQ_API_KEY not configured" }, 500, origin);

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const startMs = Date.now();

    // Load AI config
    const { data: aiConfig } = await service
      .from("micro_biz_ai_config")
      .select("chat_model, system_prompt")
      .eq("customer_product_id", customer_product_id)
      .maybeSingle();

    const chatModel = aiConfig?.chat_model || "llama-3.3-70b-versatile";

    // Check existing lead
    const { data: existingLead } = await service
      .from("micro_biz_leads")
      .select("id, name, interest, purchase_intent_score, total_interactions, raw_conversation_summary")
      .eq("customer_product_id", customer_product_id)
      .eq("phone", phone)
      .maybeSingle();

    const previousContext = existingLead
      ? `Lead existente: ${existingLead.name || "Desconhecido"}, Interesse anterior: ${existingLead.interest || "N/A"}, Score: ${existingLead.purchase_intent_score}/10, Resumo: ${existingLead.raw_conversation_summary || "N/A"}`
      : "Lead novo, primeira interação.";

    // AI extraction
    const extractResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: chatModel,
        temperature: 0.2,
        max_tokens: 800,
        messages: [
          {
            role: "system",
            content: `Você é um motor de CRM invisível para micro-empresas. Analise a mensagem do cliente e extraia dados.
Contexto anterior: ${previousContext}
Nome do remetente (se disponível): ${sender_name || "Não informado"}

Retorne um JSON:
{
  "name": "nome completo (se identificável)",
  "company": "empresa (se mencionada)",
  "email": "email (se mencionado)",
  "interest": "produto/serviço de interesse",
  "purchase_intent_score": 0-10,
  "next_step": "próxima ação recomendada",
  "sentiment": "positivo/neutro/negativo",
  "tags": ["tag1", "tag2"],
  "conversation_summary": "resumo atualizado da conversa"
}
Responda APENAS o JSON.`,
          },
          { role: "user", content: message_text },
        ],
      }),
    });

    const extractJson = await extractResp.json();
    const extractText = extractJson?.choices?.[0]?.message?.content?.trim() || "";
    const processingMs = Date.now() - startMs;
    const tokensUsed = extractJson?.usage?.total_tokens || 0;

    let extracted: any;
    try {
      extracted = JSON.parse(extractText.replace(/```json\n?|```/g, "").trim());
    } catch {
      extracted = { conversation_summary: extractText };
    }

    // Upsert lead
    if (existingLead) {
      await service
        .from("micro_biz_leads")
        .update({
          name: extracted.name || existingLead.name,
          company: extracted.company || undefined,
          email: extracted.email || undefined,
          interest: extracted.interest || existingLead.interest,
          purchase_intent_score: extracted.purchase_intent_score ?? existingLead.purchase_intent_score,
          next_step: extracted.next_step || undefined,
          sentiment: extracted.sentiment || undefined,
          tags: extracted.tags?.length ? extracted.tags : undefined,
          raw_conversation_summary: extracted.conversation_summary || undefined,
          last_contact_at: new Date().toISOString(),
          total_interactions: (existingLead.total_interactions || 0) + 1,
        })
        .eq("id", existingLead.id);
    } else {
      await service.from("micro_biz_leads").insert({
        customer_product_id,
        phone,
        name: extracted.name || sender_name || null,
        company: extracted.company || null,
        email: extracted.email || null,
        interest: extracted.interest || null,
        purchase_intent_score: extracted.purchase_intent_score || 0,
        next_step: extracted.next_step || null,
        source: "whatsapp",
        raw_conversation_summary: extracted.conversation_summary || null,
        sentiment: extracted.sentiment || null,
        tags: extracted.tags || [],
      });
    }

    // Log conversation
    await service.from("micro_biz_conversations").insert({
      customer_product_id,
      lead_id: existingLead?.id || null,
      phone,
      direction: direction || "inbound",
      message_text,
      message_type: "text",
      ai_extracted_data: extracted,
      model_used: chatModel,
      tokens_used: tokensUsed,
      processing_ms: processingMs,
    });

    return corsResponse({ success: true, extracted, processing_ms: processingMs }, 200, origin);
  } catch (e) {
    console.error("micro-biz-crm-extract error:", e);
    return corsResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500, origin);
  }
});
