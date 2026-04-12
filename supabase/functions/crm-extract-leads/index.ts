import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { getCorsHeaders, handleCorsPreflightRequest, corsResponse } from "../_shared/cors.ts";
import { groqChat, type AICallOptions } from "../_shared/ai-providers.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);
  const origin = req.headers.get("Origin");

  try {
    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return corsResponse({ error: "unauthorized" }, 401, origin);

    const supabaseUser = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") || SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) return corsResponse({ error: "unauthorized" }, 401, origin);

    const { customer_product_id } = await req.json();
    if (!customer_product_id) return corsResponse({ error: "customer_product_id required" }, 400, origin);

    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify ownership
    const { data: cp } = await service.from("customer_products").select("id, user_id").eq("id", customer_product_id).single();
    if (!cp || cp.user_id !== user.id) return corsResponse({ error: "forbidden" }, 403, origin);

    // Get all inbound messages grouped by phone
    const { data: messages } = await service
      .from("bot_conversation_logs")
      .select("phone, message_text, model, created_at")
      .eq("customer_product_id", customer_product_id)
      .eq("direction", "inbound")
      .not("phone", "is", null)
      .order("created_at", { ascending: true })
      .limit(500);

    if (!messages || messages.length === 0) {
      return corsResponse({ ok: true, extracted: 0, message: "Nenhuma mensagem para processar" }, 200, origin);
    }

    // Group messages by phone
    const byPhone = new Map<string, { messages: string[]; pushName: string; lastDate: string }>();
    for (const m of messages) {
      const phone = m.phone as string;
      if (!byPhone.has(phone)) {
        byPhone.set(phone, { messages: [], pushName: m.model || phone, lastDate: m.created_at });
      }
      const entry = byPhone.get(phone)!;
      entry.messages.push(m.message_text);
      entry.lastDate = m.created_at;
    }

    // Check which phones already exist
    const phones = Array.from(byPhone.keys());
    const { data: existing } = await service
      .from("crm_customers")
      .select("phone")
      .eq("customer_product_id", customer_product_id)
      .in("phone", phones);

    const existingPhones = new Set((existing || []).map((e: any) => e.phone));
    const newPhones = phones.filter(p => !existingPhones.has(p));

    if (newPhones.length === 0) {
      return corsResponse({ ok: true, extracted: 0, already_exists: existingPhones.size, message: "Todos os contatos já estão no CRM" }, 200, origin);
    }

    // Process each new contact with AI
    const aiOpts: AICallOptions = {
      apiKey: GROQ_API_KEY,
      model: "llama-3.3-70b-versatile",
      systemPrompt: `Você é um assistente de CRM que extrai dados estruturados de conversas de WhatsApp.
Analise as mensagens do contato e extraia o máximo de informações possível.

Retorne APENAS um JSON válido com estes campos (use null se não encontrar):
{
  "nome_completo": "string ou null - nome completo da pessoa (use o push name como fallback)",
  "empresa": "string ou null - nome da empresa mencionada",
  "email": "string ou null - email se mencionado",
  "tipo_negocio": "string ou null - tipo de negócio/segmento",
  "interesse": "string ou null - qual produto/serviço demonstrou interesse",
  "status_sugerido": "lead | prospecto | cliente - baseado no nível de interesse",
  "resumo": "string - breve resumo do que a pessoa busca (max 200 chars)"
}

REGRAS:
- Se o nome completo não aparecer nas mensagens, use o push name fornecido
- Analise o contexto para determinar se é um lead frio, prospecto quente ou já cliente
- Extraia emails que apareçam no texto das mensagens
- Identifique o tipo de negócio pelo contexto da conversa`,
      temperature: 0.2,
      maxTokens: 500,
    };

    const results: any[] = [];
    let extracted = 0;

    // Process in batches of 5 to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < newPhones.length; i += batchSize) {
      const batch = newPhones.slice(i, i + batchSize);

      const promises = batch.map(async (phone) => {
        const contact = byPhone.get(phone)!;
        const conversationText = contact.messages.slice(-20).join("\n"); // Last 20 messages

        const prompt = `Push Name do contato: "${contact.pushName}"
Telefone: ${phone}

Mensagens do contato (mais recentes primeiro):
${conversationText}

Extraia os dados estruturados deste contato:`;

        try {
          const result = await groqChat(aiOpts, prompt);
          // Parse JSON from response
          const jsonMatch = result.text.match(/\{[\s\S]*\}/);
          if (!jsonMatch) return null;

          const data = JSON.parse(jsonMatch[0]);

          const statusMap: Record<string, string> = {
            lead: "lead",
            prospecto: "prospect",
            cliente: "customer",
          };

          const customerRecord = {
            customer_product_id,
            name: data.nome_completo || contact.pushName || phone,
            phone,
            email: data.email || null,
            company: data.empresa || null,
            business_type: data.tipo_negocio || null,
            status: statusMap[data.status_sugerido] || "lead",
            source: "whatsapp_ai",
            last_contact_date: contact.lastDate,
            notes: [
              data.resumo ? `📋 ${data.resumo}` : null,
              data.interesse ? `🎯 Interesse: ${data.interesse}` : null,
            ].filter(Boolean).join("\n"),
          };

          return customerRecord;
        } catch (err) {
          console.error(`Error processing ${phone}:`, err);
          // Fallback: insert with basic data
          return {
            customer_product_id,
            name: contact.pushName || phone,
            phone,
            status: "lead",
            source: "whatsapp",
            last_contact_date: contact.lastDate,
            notes: `Última mensagem: ${contact.messages.slice(-1)[0]?.substring(0, 200) || ""}`,
          };
        }
      });

      const batchResults = await Promise.all(promises);
      const validResults = batchResults.filter(Boolean);
      results.push(...validResults);
    }

    // Insert all extracted leads
    if (results.length > 0) {
      const { error: insertError } = await service
        .from("crm_customers")
        .upsert(results, { onConflict: "customer_product_id,phone", ignoreDuplicates: true });

      if (insertError) {
        console.error("Insert error:", insertError);
        return corsResponse({ error: "Erro ao salvar leads", details: insertError.message }, 500, origin);
      }
      extracted = results.length;
    }

    return corsResponse({
      ok: true,
      extracted,
      already_exists: existingPhones.size,
      total_contacts: phones.length,
      message: `${extracted} lead(s) extraído(s) com IA. ${existingPhones.size} já existiam.`,
    }, 200, origin);

  } catch (err: any) {
    console.error("crm-extract-leads error:", err);
    return corsResponse({ error: err.message }, 500, origin);
  }
});
