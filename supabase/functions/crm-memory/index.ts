
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { groqChat } from "../_shared/ai-providers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, customerProductId } = body;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY não configurada" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!customerProductId) {
      return new Response(JSON.stringify({ error: "customerProductId obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── INGEST: Summarize conversation and store as memory ──
    if (action === "ingest") {
      const { clientName, clientPhone, messages } = body;

      if (!clientName || !messages?.length) {
        return new Response(JSON.stringify({ error: "clientName e messages obrigatórios" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const summaryResult = await groqChat(
        {
          apiKey: groqKey,
          model: "llama-3.3-70b-versatile",
          systemPrompt: `Você é um assistente que resume conversas de atendimento ao cliente de forma concisa.
Extraia: um resumo objetivo, tópicos principais discutidos, e o sentimento do cliente.
Responda APENAS com JSON válido neste formato:
{"summary": "resumo da conversa", "topics": ["tópico1", "tópico2"], "sentiment": "positivo|neutro|negativo"}`,
          temperature: 0.3,
          maxTokens: 512,
        },
        `Resuma esta conversa com o cliente "${clientName}":\n${JSON.stringify(messages.slice(-50))}`
      );

      let parsed: { summary: string; topics: string[]; sentiment: string };
      try {
        const match = summaryResult.text.match(/\{[\s\S]*\}/);
        parsed = JSON.parse(match ? match[0] : summaryResult.text);
      } catch {
        parsed = { summary: summaryResult.text.substring(0, 500), topics: [], sentiment: "neutro" };
      }

      const { error } = await supabase.from("crm_client_memories").insert({
        customer_product_id: customerProductId,
        client_name: clientName,
        client_phone: clientPhone || null,
        summary: parsed.summary,
        topics: parsed.topics || [],
        sentiment: parsed.sentiment || "neutro",
        raw_message_count: messages.length,
        interaction_date: new Date().toISOString(),
      });

      if (error) throw error;

      return new Response(JSON.stringify({ ok: true, summary: parsed }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── QUERY: Search memories and synthesize answer via RAG ──
    if (action === "query") {
      const { question } = body;

      if (!question) {
        return new Response(JSON.stringify({ error: "question obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Use the RPC search function (full-text + trigram + ilike)
      const { data: memories, error: searchError } = await supabase.rpc("search_crm_memories", {
        p_customer_product_id: customerProductId,
        p_query: question,
        p_limit: 20,
      });

      if (searchError) {
        console.error("Search error:", searchError);
        throw searchError;
      }

      if (!memories || memories.length === 0) {
        return new Response(JSON.stringify({
          answer: "Não encontrei registros sobre isso na memória do CRM. Verifique se há interações registradas para esse cliente.",
          memories_used: 0,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Build context from retrieved memories (token-efficient)
      const context = memories.slice(0, 15).map((m: any) =>
        `[${new Date(m.mem_interaction_date).toLocaleDateString('pt-BR')}] Cliente: ${m.mem_client_name} | Resumo: ${m.mem_summary} | Sentimento: ${m.mem_sentiment} | Tópicos: ${(m.mem_topics || []).join(', ') || 'N/A'}`
      ).join("\n");

      // RAG: Use memories as context for the answer
      const answerResult = await groqChat(
        {
          apiKey: groqKey,
          model: "llama-3.3-70b-versatile",
          systemPrompt: `Você é a Nova, assistente de CRM com memória contextual infinita.
Você tem acesso a registros históricos de interações com clientes.
Responda perguntas sobre clientes baseando-se APENAS nos registros de memória fornecidos.
Seja precisa com datas, nomes e detalhes. Responda em português brasileiro de forma profissional e direta.
Se não houver informação suficiente nos registros, diga claramente o que você sabe e o que não encontrou.`,
          temperature: 0.4,
          maxTokens: 1024,
        },
        `Registros de memória do CRM (${memories.length} encontrados):\n${context}\n\nPergunta do gestor: ${question}`
      );

      return new Response(JSON.stringify({
        answer: answerResult.text,
        memories_used: memories.length,
        tokens: { input: answerResult.tokensInput, output: answerResult.tokensOutput },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── MANUAL: Add memory manually ──
    if (action === "manual") {
      const { clientName, clientPhone, summary, topics, sentiment } = body;

      if (!clientName || !summary) {
        return new Response(JSON.stringify({ error: "clientName e summary obrigatórios" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error } = await supabase.from("crm_client_memories").insert({
        customer_product_id: customerProductId,
        client_name: clientName,
        client_phone: clientPhone || null,
        summary,
        topics: topics || [],
        sentiment: sentiment || "neutro",
        raw_message_count: 0,
        interaction_date: new Date().toISOString(),
      });

      if (error) throw error;

      return new Response(JSON.stringify({ ok: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── LIST: Get recent memories ──
    if (action === "list") {
      const { data, error } = await supabase
        .from("crm_client_memories")
        .select("id, client_name, client_phone, interaction_date, summary, topics, sentiment, raw_message_count, created_at")
        .eq("customer_product_id", customerProductId)
        .order("interaction_date", { ascending: false })
        .limit(50);

      if (error) throw error;

      return new Response(JSON.stringify({ memories: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Ação inválida. Use: ingest, query, manual, list" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("CRM Memory error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
