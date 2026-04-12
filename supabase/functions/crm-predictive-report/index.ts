import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { groqChat, type AICallOptions } from "../_shared/ai-providers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, customer_product_id } = await req.json();

    if (!user_id || !customer_product_id) {
      return new Response(JSON.stringify({ error: 'user_id e customer_product_id são obrigatórios' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Load engine config from ai_control_config
    const { data: engineConfig } = await supabase
      .from('ai_control_config')
      .select('*')
      .eq('customer_product_id', customer_product_id)
      .eq('is_active', true)
      .maybeSingle();

    const configModel = engineConfig?.model || "llama-3.3-70b-versatile";
    const configTemp = engineConfig?.temperature ?? 0.6;
    const configMaxTokens = engineConfig?.max_tokens ?? 4000;

    // Resolve API key based on provider
    const provider = engineConfig?.provider || "novalink";
    let apiKey = "";
    let useGateway = false;

    if (provider === "novalink") {
      // Try GROQ first
      const groqKey = Deno.env.get("GROQ_API_KEY") || "";
      if (groqKey) {
        apiKey = groqKey;
      } else {
        // Fallback to Lovable AI Gateway
        const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
        if (lovableKey) {
          apiKey = lovableKey;
          useGateway = true;
        }
      }
    }

    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Nenhuma chave de API configurada para o motor de IA' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch all CRM data for context
    const [customersRes, messagesRes, memoriesRes] = await Promise.all([
      supabase.from('crm_customers').select('*').eq('customer_product_id', customer_product_id),
      supabase.from('bot_conversation_logs').select('*').eq('customer_product_id', customer_product_id).order('created_at', { ascending: false }).limit(200),
      supabase.from('crm_client_memories').select('*').eq('customer_product_id', customer_product_id).order('interaction_date', { ascending: false }).limit(50),
    ]);

    const customers = customersRes.data || [];
    const messages = messagesRes.data || [];
    const memories = memoriesRes.data || [];

    const now = new Date();
    const context = {
      total_clientes: customers.length,
      por_status: {
        leads: customers.filter((c: any) => c.status === 'lead').length,
        prospects: customers.filter((c: any) => c.status === 'prospect').length,
        customers: customers.filter((c: any) => c.status === 'customer').length,
        inactive: customers.filter((c: any) => c.status === 'inactive').length,
      },
      clientes_recentes: customers.slice(0, 30).map((c: any) => ({
        nome: c.name, empresa: c.company, status: c.status, fonte: c.source,
        tipo_negocio: c.business_type, ultimo_contato: c.last_contact_date,
      })),
      total_mensagens: messages.length,
      mensagens_recentes: messages.slice(0, 50).map((m: any) => ({
        direcao: m.direction, texto: m.message_text?.substring(0, 200), data: m.created_at,
      })),
      memorias_ia: memories.slice(0, 20).map((m: any) => ({
        cliente: m.client_name, resumo: m.summary, sentimento: m.sentiment, topicos: m.topics,
      })),
      data_atual: now.toISOString(),
    };

    const systemPrompt = `Você é um analista de negócios e CRM sênior. Gere um relatório preditivo COMPLETO e PROFISSIONAL em JSON.

O relatório deve ter as seguintes seções obrigatórias:

1. "resumo_executivo": string - Resumo de 3-5 frases sobre o estado geral do CRM
2. "indicadores_chave": array de { "nome": string, "valor": string, "tendencia": "alta"|"baixa"|"estavel", "descricao": string }
3. "analise_funil": { "total_leads": number, "taxa_conversao_estimada": number, "gargalos": array de string, "recomendacoes": array de string }
4. "previsao_demanda": { "proximos_30_dias": string, "proximos_90_dias": string, "confianca_pct": number, "fatores": array de string }
5. "riscos_identificados": array de { "risco": string, "severidade": "critico"|"alto"|"medio"|"baixo", "impacto": string, "mitigacao": string }
6. "principais_causas_problemas": array de { "causa": string, "evidencia": string, "frequencia": "recorrente"|"ocasional"|"raro" }
7. "acoes_recomendadas": array de { "acao": string, "prioridade": "urgente"|"alta"|"media"|"baixa", "prazo_sugerido": string, "impacto_esperado": string, "responsavel_sugerido": string }
8. "segmentacao_clientes": array de { "segmento": string, "quantidade": number, "comportamento": string, "estrategia": string }
9. "sentimento_geral": { "score": number (0-100), "classificacao": string, "principais_drivers_positivos": array de string, "principais_drivers_negativos": array de string }
10. "oportunidades_crescimento": array de { "oportunidade": string, "potencial_receita": string, "dificuldade": "facil"|"medio"|"dificil", "descricao": string }
11. "metricas_engajamento": { "taxa_resposta_estimada": string, "tempo_medio_resposta": string, "canais_mais_ativos": array de string, "horarios_pico": array de string }
12. "conclusao": string - Parágrafo final com visão estratégica

IMPORTANTE: Retorne APENAS JSON válido, sem markdown.`;

    const userPrompt = `Analise os seguintes dados do CRM e gere o relatório preditivo completo:\n\n${JSON.stringify(context)}`;

    let content: string;
    let tokensUsed = { input: 0, output: 0, total: 0 };

    if (useGateway) {
      // Lovable AI Gateway fallback
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: configTemp,
          max_tokens: Math.max(configMaxTokens, 4000),
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }), {
            status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: 'Créditos de IA esgotados.' }), {
            status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI gateway error: ${response.status}`);
      }

      const aiData = await response.json();
      content = aiData.choices?.[0]?.message?.content || "";
      tokensUsed = {
        input: aiData.usage?.prompt_tokens || 0,
        output: aiData.usage?.completion_tokens || 0,
        total: aiData.usage?.total_tokens || 0,
      };
    } else {
      // Use Groq directly via shared ai-providers (respects engine config model)
      const opts: AICallOptions = {
        apiKey,
        model: configModel,
        systemPrompt,
        temperature: configTemp,
        maxTokens: Math.max(configMaxTokens, 4000),
      };

      const result = await groqChat(opts, userPrompt);
      content = result.text;
      tokensUsed = {
        input: result.tokensInput,
        output: result.tokensOutput,
        total: result.tokensTotal,
      };
    }

    if (!content) throw new Error('Resposta vazia da IA');

    console.log(`[crm-predictive-report] model=${useGateway ? 'gateway/gemini-2.5-flash' : configModel} tokens=${JSON.stringify(tokensUsed)}`);

    let report;
    try {
      const clean = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      report = JSON.parse(clean);
    } catch {
      report = { raw_response: content, parse_error: true };
    }

    // Save report to DB
    const title = `Relatório Preditivo - ${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    const reportContent = JSON.stringify(report);
    
    const { error: insertError } = await supabase.from('crm_ai_reports').insert({
      user_id,
      title,
      report_type: 'predictive_analysis',
      content: reportContent,
    });

    if (insertError) {
      console.error('Failed to save report to DB:', insertError);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      report, 
      title,
      report_content: reportContent,
      saved_to_db: !insertError,
      model_used: useGateway ? 'gateway/gemini-2.5-flash' : configModel,
      tokens: tokensUsed,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Predictive report error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
