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
    const { customers, opportunities, action, customerProductId } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load engine config from ai_control_config (per customer_product_id)
    let engineConfig: any = null;
    if (customerProductId) {
      const { data } = await supabase
        .from("ai_control_config")
        .select("*")
        .eq("customer_product_id", customerProductId)
        .eq("is_active", true)
        .maybeSingle();
      engineConfig = data;
    }

    // If no specific config, check by user from JWT
    if (!engineConfig) {
      const authHeader = req.headers.get("authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      if (token) {
        const { data: { user } } = await supabase.auth.getUser(token);
        if (user?.id) {
          // Find customer_product for crm-simples
          const { data: cp } = await supabase
            .from("customer_products")
            .select("id")
            .eq("user_id", user.id)
            .eq("product_slug", "crm-simples")
            .eq("is_active", true)
            .maybeSingle();

          if (cp?.id) {
            const { data } = await supabase
              .from("ai_control_config")
              .select("*")
              .eq("customer_product_id", cp.id)
              .eq("is_active", true)
              .maybeSingle();
            engineConfig = data;
          }
        }
      }
    }

    const model = engineConfig?.model || "llama-3.3-70b-versatile";
    const temperature = engineConfig?.temperature ?? 0.7;
    const maxTokens = engineConfig?.max_tokens ?? 1024;
    const customPrompt = engineConfig?.system_prompt || "";

    const groqKey = Deno.env.get("GROQ_API_KEY");
    if (!groqKey) {
      return new Response(JSON.stringify({ error: "GROQ_API_KEY não configurada" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const defaultSystemPrompt = `Você é um analista de CRM especializado em inteligência de negócios e comportamento do cliente.
Analise os dados fornecidos e gere insights preditivos em português brasileiro.

Você deve analisar e prever:
1. **Risco de Churn** - Clientes com maior probabilidade de abandonar
2. **Surtos de Demanda** - Previsão de picos de procura
3. **Motivos de Insatisfação** - Causas prováveis de reclamações
4. **Sentimento Atual** - Estado emocional geral da base
5. **Oportunidades de Upsell** - Clientes propensos a comprar mais
6. **Sazonalidade** - Padrões de comportamento por período
7. **Segmentação Inteligente** - Grupos de clientes similares
8. **Próximas Ações** - Recomendações prioritárias

IMPORTANTE: Responda APENAS com JSON válido neste formato:
{
  "churnRisk": { "level": "alto|medio|baixo", "customers": ["nomes"], "reason": "explicação" },
  "demandSurge": { "prediction": "descrição", "period": "quando", "confidence": 0-100 },
  "dissatisfactionReasons": ["motivo1", "motivo2"],
  "currentSentiment": { "overall": "positivo|neutro|negativo", "score": 0-100, "description": "explicação" },
  "upsellOpportunities": [{ "customer": "nome", "product": "sugestão", "probability": 0-100 }],
  "seasonality": { "currentPhase": "descrição", "nextTrend": "previsão" },
  "segments": [{ "name": "nome", "count": número, "behavior": "descrição" }],
  "priorityActions": [{ "action": "ação", "priority": "alta|media|baixa", "impact": "impacto" }]
}`;

    const systemPrompt = customPrompt || defaultSystemPrompt;

    const userPrompt = `Analise estes dados do CRM:

**Clientes (${customers?.length || 0} total):**
${JSON.stringify(customers?.slice(0, 50) || [], null, 2)}

**Oportunidades (${opportunities?.length || 0} total):**
${JSON.stringify(opportunities?.slice(0, 20) || [], null, 2)}

${action ? `**Ação solicitada:** ${action}` : 'Gere insights preditivos detalhados baseados nesses dados.'}`;

    console.log(`CRM AI Engine: model=${model}, temp=${temperature}, maxTokens=${maxTokens}`);

    const result = await groqChat(
      { apiKey: groqKey, model, systemPrompt, temperature, maxTokens },
      userPrompt,
    );

    // Parse JSON
    let insights;
    try {
      const jsonMatch = result.text.match(/```json\n?([\s\S]*?)\n?```/) || result.text.match(/```\n?([\s\S]*?)\n?```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : result.text;
      insights = JSON.parse(jsonStr.trim());
    } catch {
      console.error("Error parsing AI response, raw:", result.text?.substring(0, 500));
      insights = {
        raw: result.text,
        churnRisk: { level: "baixo", customers: [], reason: "Análise em texto: " + (result.text?.substring(0, 200) || "Sem dados") },
        currentSentiment: { overall: "neutro", score: 50, description: "Análise gerada em formato texto" },
        priorityActions: [{ action: "Verificar configuração do Motor IA", priority: "media", impact: "Ajustar prompt" }],
      };
    }

    // Save report
    if (!insights.raw) {
      const authHeader = req.headers.get("authorization") || "";
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      if (user?.id) {
        await supabase.from("crm_ai_reports").insert({
          user_id: user.id,
          title: `Análise CRM - ${new Date().toLocaleDateString('pt-BR')}`,
          report_type: "insights",
          content: JSON.stringify(insights),
        });
      }
    }

    return new Response(JSON.stringify({
      insights,
      engine: "groq",
      model,
      tokens: { input: result.tokensInput, output: result.tokensOutput, total: result.tokensTotal },
    }), {
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
