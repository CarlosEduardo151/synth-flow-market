import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AIConfig {
  engine: string;
  model: string;
  temperature: number;
  max_tokens: number;
  system_prompt: string | null;
}

function normalizeLovableGatewayModel(model?: string | null): string {
  const m = (model || "").trim();
  if (!m) return "google/gemini-3-flash-preview";

  // Se já estiver no formato suportado pelo gateway, mantém.
  if (m.startsWith("openai/") || m.startsWith("google/")) return m;

  // Migração/aliases comuns (modelos fora do gateway):
  if (m === "gpt-4o-mini") return "openai/gpt-5-mini";
  if (m === "gpt-4o") return "openai/gpt-5";
  if (m === "gpt-4") return "openai/gpt-5";
  if (m === "gpt-3.5-turbo") return "openai/gpt-5-nano";

  // Se for um nome Gemini sem prefixo, tenta encaixar no gateway.
  if (m.startsWith("gemini")) return `google/${m}`;

  // Fallback seguro
  return "google/gemini-3-flash-preview";
}

interface APICredential {
  provider: string;
  api_key: string;
  is_active: boolean;
}

async function getAIConfig(supabase: any): Promise<AIConfig> {
  const { data, error } = await supabase
    .from("crm_ai_config")
    .select("*")
    .limit(1)
    .single();

  if (error || !data) {
    console.log("Using default AI config");
    return {
      engine: "lovable",
      model: "google/gemini-3-flash-preview",
      temperature: 0.7,
      max_tokens: 2000,
      system_prompt: null,
    };
  }

  // A tabela usa `provider`, mas este código historicamente esperava `engine`.
  const engine = (data.engine || data.provider || "lovable") as string;

  return {
    engine,
    model: data.model,
    temperature: data.temperature ?? 0.7,
    max_tokens: data.max_tokens ?? 2000,
    system_prompt: data.system_prompt ?? null,
  };
}

async function getAPICredential(supabase: any, provider: string): Promise<string | null> {
  // Pode existir mais de uma credencial por provedor; pegue a mais recente ativa.
  const { data, error } = await supabase
    .from("api_credentials")
    .select("api_key")
    .eq("provider", provider)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .limit(1);

  if (error) return null;
  const row = Array.isArray(data) ? data[0] : null;
  if (!row?.api_key) return null;
  return row.api_key;
}

async function callOpenAI(apiKey: string, model: string, systemPrompt: string, userPrompt: string, temperature: number, maxTokens: number) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt + "\n\nIMPORTANTE: Responda APENAS com um objeto JSON válido, sem texto adicional, sem markdown, sem explicações." },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI error:", response.status, errorText);
    throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

async function callGemini(apiKey: string, model: string, systemPrompt: string, userPrompt: string, temperature: number, maxTokens: number) {
  const geminiModel = model || "gemini-2.0-flash";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: `${systemPrompt}\n\n${userPrompt}` }
          ]
        }
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Gemini error:", response.status, errorText);
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text;
}

async function callLovableAI(systemPrompt: string, userPrompt: string, model: string, temperature: number, maxTokens: number) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  
  if (!LOVABLE_API_KEY) {
    throw new Error("LOVABLE_API_KEY is not configured");
  }

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: normalizeLovableGatewayModel(model),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
    }),
  });

  if (!response.ok) {
    if (response.status === 429) {
      throw new Error("rate_limit");
    }
    if (response.status === 402) {
      throw new Error("payment_required");
    }
    const errorText = await response.text();
    console.error("Lovable AI error:", response.status, errorText);
    throw new Error("Erro ao processar análise de IA");
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customers, opportunities, action } = await req.json();
    
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get AI configuration
    const config = await getAIConfig(supabase);
    console.log("AI Config:", { engine: config.engine, model: config.model });

    const defaultSystemPrompt = `Você é um analista de CRM especializado em inteligência de negócios e comportamento do cliente.
Analise os dados fornecidos e gere insights preditivos em português brasileiro.

Você deve analisar e prever:
1. **Risco de Churn** - Clientes com maior probabilidade de abandonar
2. **Surtos de Demanda** - Previsão de picos de procura por produtos/serviços
3. **Motivos de Insatisfação** - Causas prováveis de reclamações
4. **Sentimento Atual** - Estado emocional geral da base de clientes
5. **Oportunidades de Upsell** - Clientes propensos a comprar mais
6. **Sazonalidade** - Padrões de comportamento por período
7. **Segmentação Inteligente** - Grupos de clientes com comportamentos similares
8. **Próximas Ações** - Recomendações prioritárias para a equipe

Se for solicitada uma ação que modifica dados (como criar, editar ou excluir clientes), você deve responder com:
{
  "requiresApproval": true,
  "actionType": "create|update|delete",
  "actionDescription": "descrição clara da ação",
  "targetTable": "nome_da_tabela",
  "targetId": "id_se_aplicavel",
  "actionData": { dados da ação }
}

Para análises, responda em formato JSON válido com a seguinte estrutura:
{
  "churnRisk": { "level": "alto|medio|baixo", "customers": ["nomes"], "reason": "explicação" },
  "demandSurge": { "prediction": "descrição", "period": "quando", "confidence": 0-100 },
  "dissatisfactionReasons": ["motivo1", "motivo2", "motivo3"],
  "currentSentiment": { "overall": "positivo|neutro|negativo", "score": 0-100, "description": "explicação" },
  "upsellOpportunities": [{ "customer": "nome", "product": "sugestão", "probability": 0-100 }],
  "seasonality": { "currentPhase": "descrição", "nextTrend": "previsão" },
  "segments": [{ "name": "nome do segmento", "count": número, "behavior": "descrição" }],
  "priorityActions": [{ "action": "ação", "priority": "alta|media|baixa", "impact": "impacto esperado" }]
}`;

    const systemPrompt = config.system_prompt || defaultSystemPrompt;

    const userPrompt = `Analise estes dados do CRM:

**Clientes (${customers?.length || 0} total):**
${JSON.stringify(customers?.slice(0, 50) || [], null, 2)}

**Oportunidades (${opportunities?.length || 0} total):**
${JSON.stringify(opportunities?.slice(0, 20) || [], null, 2)}

${action ? `**Ação solicitada:** ${action}` : 'Gere insights preditivos detalhados baseados nesses dados.'}`;

    let content: string;

    // Choose engine based on configuration
    if (config.engine === "openai") {
      const apiKey = await getAPICredential(supabase, "openai");
      if (!apiKey) {
        return new Response(JSON.stringify({ 
          error: "Chave da API OpenAI não configurada. Configure em Admin > Configurações > IA" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      content = await callOpenAI(apiKey, config.model, systemPrompt, userPrompt, config.temperature, config.max_tokens);
    } else if (config.engine === "gemini") {
      const apiKey = await getAPICredential(supabase, "gemini");
      if (!apiKey) {
        return new Response(JSON.stringify({ 
          error: "Chave da API Gemini não configurada. Configure em Admin > Configurações > IA" 
        }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      content = await callGemini(apiKey, config.model, systemPrompt, userPrompt, config.temperature, config.max_tokens);
    } else {
      // Default: use Lovable AI
      try {
        content = await callLovableAI(systemPrompt, userPrompt, config.model, config.temperature, config.max_tokens);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === "rate_limit") {
            return new Response(JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns minutos." }), {
              status: 429,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
          if (error.message === "payment_required") {
            return new Response(JSON.stringify({ error: "Créditos insuficientes. Adicione créditos na sua conta." }), {
              status: 402,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
        throw error;
      }
    }

    // Parse JSON from response
    let insights;
    try {
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/) || content.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      insights = JSON.parse(jsonStr.trim());
    } catch (parseError) {
      console.error("Error parsing AI response:", parseError);
      console.log("Raw content:", content?.substring(0, 500));
      // Create a fallback insights object with the raw response
      insights = { 
        raw: content,
        churnRisk: { level: "baixo", customers: [], reason: "Análise em texto: " + (content?.substring(0, 200) || "Sem dados") },
        currentSentiment: { overall: "neutro", score: 50, description: "Análise gerada em formato texto" },
        priorityActions: [{ action: "Verificar resposta da IA nas configurações", priority: "media", impact: "Ajustar prompt para retornar JSON" }]
      };
    }

    // Check if action requires approval
    if (insights.requiresApproval) {
      // Save pending action to database
      const { data: pendingAction, error: insertError } = await supabase
        .from("crm_ai_pending_actions")
        .insert({
          action_type: insights.actionType,
          action_description: insights.actionDescription,
          target_table: insights.targetTable,
          target_id: insights.targetId,
          action_data: insights.actionData,
          status: "pending",
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error saving pending action:", insertError);
      }

      return new Response(JSON.stringify({ 
        pendingAction: true,
        actionId: pendingAction?.id,
        actionDescription: insights.actionDescription,
        message: "Esta ação requer sua aprovação. Verifique o painel de ações pendentes."
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save report to database
    if (!insights.raw) {
      await supabase.from("crm_ai_reports").insert({
        title: `Análise de CRM - ${new Date().toLocaleDateString('pt-BR')}`,
        report_type: "insights",
        content: JSON.stringify(insights),
        insights: insights,
        engine: config.engine,
        model: config.model,
      });
    }

    return new Response(JSON.stringify({ insights, engine: config.engine, model: config.model }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("CRM AI insights error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
