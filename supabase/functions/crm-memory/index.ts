
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

    // ── QUERY: Search memories + WhatsApp logs and synthesize answer via RAG ──
    if (action === "query") {
      const { question } = body;

      if (!question) {
        return new Response(JSON.stringify({ error: "question obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // 1) Search structured memories via RPC
      const { data: memories } = await supabase.rpc("search_crm_memories", {
        p_customer_product_id: customerProductId,
        p_query: question,
        p_limit: 15,
      });

      // 2) Also search raw WhatsApp conversation logs
      const { data: whatsappLogs } = await supabase
        .from("bot_conversation_logs")
        .select("message_text, direction, phone, created_at, source")
        .eq("customer_product_id", customerProductId)
        .or(`message_text.ilike.%${question.split(" ").slice(0, 4).join("%")}%,phone.ilike.%${question}%`)
        .order("created_at", { ascending: false })
        .limit(30);

      // 3) Also fetch recent WhatsApp activity for broader context
      const { data: recentLogs } = await supabase
        .from("bot_conversation_logs")
        .select("message_text, direction, phone, created_at, source")
        .eq("customer_product_id", customerProductId)
        .order("created_at", { ascending: false })
        .limit(50);

      const memoryCount = memories?.length || 0;
      const whatsappCount = whatsappLogs?.length || 0;
      const recentCount = recentLogs?.length || 0;

      // Build context from memories
      let context = "";

      if (memoryCount > 0) {
        context += "=== MEMÓRIAS REGISTRADAS ===\n";
        context += memories.slice(0, 15).map((m: any) =>
          `[${new Date(m.mem_interaction_date).toLocaleDateString('pt-BR')}] Cliente: ${m.mem_client_name} | Resumo: ${m.mem_summary} | Sentimento: ${m.mem_sentiment} | Tópicos: ${(m.mem_topics || []).join(', ') || 'N/A'}`
        ).join("\n");
        context += "\n\n";
      }

      if (whatsappCount > 0) {
        context += "=== CONVERSAS WHATSAPP (busca relevante) ===\n";
        context += whatsappLogs!.map((l: any) =>
          `[${new Date(l.created_at).toLocaleDateString('pt-BR')} ${new Date(l.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}] ${l.direction === 'inbound' ? `Cliente (${l.phone || 'desconhecido'})` : 'Atendente'}: ${l.message_text?.substring(0, 300)}`
        ).join("\n");
        context += "\n\n";
      }

      if (recentCount > 0 && memoryCount === 0 && whatsappCount === 0) {
        // Fallback: show recent activity if no direct matches
        context += "=== ATIVIDADE RECENTE WHATSAPP ===\n";
        context += recentLogs!.slice(0, 25).map((l: any) =>
          `[${new Date(l.created_at).toLocaleDateString('pt-BR')} ${new Date(l.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}] ${l.direction === 'inbound' ? `Cliente (${l.phone || 'desconhecido'})` : 'Atendente'}: ${l.message_text?.substring(0, 300)}`
        ).join("\n");
        context += "\n\n";
      } else if (recentCount > 0) {
        // Always add some recent context
        context += "=== ATIVIDADE RECENTE (últimas mensagens) ===\n";
        context += recentLogs!.slice(0, 10).map((l: any) =>
          `[${new Date(l.created_at).toLocaleDateString('pt-BR')}] ${l.direction === 'inbound' ? `Cliente (${l.phone || 'desconhecido'})` : 'Atendente'}: ${l.message_text?.substring(0, 200)}`
        ).join("\n");
        context += "\n\n";
      }

      const totalSources = memoryCount + whatsappCount + recentCount;

      if (totalSources === 0) {
        return new Response(JSON.stringify({
          answer: "Não encontrei registros sobre isso. O WhatsApp pode ainda não ter conversas capturadas ou nenhuma memória foi registrada para esse contexto.",
          memories_used: 0,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // RAG with tool-use capability for saving memories
      const answerResult = await groqChat(
        {
          apiKey: groqKey,
          model: "llama-3.3-70b-versatile",
          systemPrompt: `Você é a Nova, agente de IA do CRM com memória contextual, acesso ao histórico do WhatsApp e capacidade de criar oportunidades de venda.
Responda perguntas sobre clientes baseando-se nos dados fornecidos.
Seja precisa com datas, nomes e detalhes. Responda em português brasileiro de forma profissional e direta.

IMPORTANTE - SALVAR MEMÓRIAS:
Se o usuário pedir para salvar, registrar ou adicionar algo como memória (ex: "salve isso como memória", "registre que o João...", "adicione na memória que..."), responda normalmente E inclua no FINAL da sua resposta um bloco JSON especial assim:
<!--SAVE_MEMORY:{"client_name":"Nome do Cliente","summary":"Resumo do que deve ser salvo","sentiment":"positivo|neutro|negativo","topics":["tópico1"]}-->

IMPORTANTE - CRIAR OPORTUNIDADES:
Se o usuário pedir para criar uma oportunidade de venda, você DEVE coletar os seguintes dados obrigatórios antes de criar:
- cliente (nome do cliente)
- origem (whatsapp, indicacao, site, redes_sociais, cold_call, evento, outro)
- titulo (título da oportunidade)
- valor (valor em reais)
- probabilidade (0 a 100)
- obs (observações sobre a oportunidade)

A prioridade (baixa, media, alta, urgente) você gera automaticamente com base na observação/contexto.

Se o usuário fornecer TODOS os dados obrigatórios na mesma mensagem, crie a oportunidade diretamente.
Se faltar algum dado obrigatório, pergunte o que falta de forma clara e objetiva.

Quando tiver todos os dados, responda confirmando e inclua no FINAL da resposta:
<!--CREATE_OPPORTUNITY:{"client_name":"Nome","title":"Título","value":5000,"probability":70,"source":"whatsapp","notes":"observações","priority":"alta","stage":"novo_lead"}-->

Se não houver pedido de salvar memória ou criar oportunidade, NÃO inclua blocos especiais.
Se não houver informação suficiente nos registros, diga claramente o que você sabe e o que não encontrou.`,
          temperature: 0.4,
          maxTokens: 1024,
        },
        `Dados disponíveis (${totalSources} fontes):\n${context}\nPergunta do gestor: ${question}`
      );

      let responseText = answerResult.text;
      let memorySaved = false;
      let opportunityCreated = false;

      // Check if the AI wants to save a memory
      const saveMatch = responseText.match(/<!--SAVE_MEMORY:([\s\S]*?)-->/);
      if (saveMatch) {
        try {
          const memData = JSON.parse(saveMatch[1]);
          await supabase.from("crm_client_memories").insert({
            customer_product_id: customerProductId,
            client_name: memData.client_name,
            client_phone: memData.client_phone || null,
            summary: memData.summary,
            topics: memData.topics || [],
            sentiment: memData.sentiment || "neutro",
            raw_message_count: 0,
            interaction_date: new Date().toISOString(),
          });
          memorySaved = true;
          responseText = responseText.replace(/<!--SAVE_MEMORY:[\s\S]*?-->/, "").trim();
          responseText += "\n\n✅ Memória registrada com sucesso!";
        } catch (e) {
          console.error("Failed to save memory from chat:", e);
        }
      }

      // Check if the AI wants to create an opportunity
      const oppMatch = responseText.match(/<!--CREATE_OPPORTUNITY:([\s\S]*?)-->/);
      if (oppMatch) {
        try {
          const oppData = JSON.parse(oppMatch[1]);

          // Try to find the customer by name
          const { data: customerMatch } = await supabase
            .from("crm_customers")
            .select("id")
            .eq("customer_product_id", customerProductId)
            .ilike("name", `%${oppData.client_name}%`)
            .limit(1);

          let customerId = customerMatch?.[0]?.id;

          // If customer not found, create one
          if (!customerId) {
            const { data: newCustomer } = await supabase
              .from("crm_customers")
              .insert({
                customer_product_id: customerProductId,
                name: oppData.client_name,
                status: "ativo",
                source: oppData.source || "outro",
              })
              .select("id")
              .single();
            customerId = newCustomer?.id;
          }

          if (customerId) {
            await supabase.from("crm_opportunities").insert({
              customer_id: customerId,
              title: oppData.title,
              value: oppData.value || 0,
              probability: oppData.probability || 50,
              source: oppData.source || "outro",
              notes: oppData.notes || null,
              priority: oppData.priority || "media",
              stage: oppData.stage || "novo_lead",
            });
            opportunityCreated = true;
            responseText = responseText.replace(/<!--CREATE_OPPORTUNITY:[\s\S]*?-->/, "").trim();
            responseText += "\n\n✅ Oportunidade criada com sucesso no pipeline!";
          }
        } catch (e) {
          console.error("Failed to create opportunity from chat:", e);
          responseText = responseText.replace(/<!--CREATE_OPPORTUNITY:[\s\S]*?-->/, "").trim();
          responseText += "\n\n⚠️ Não foi possível criar a oportunidade automaticamente.";
        }
      }

      return new Response(JSON.stringify({
        answer: responseText,
        memories_used: totalSources,
        memory_saved: memorySaved,
        opportunity_created: opportunityCreated,
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
