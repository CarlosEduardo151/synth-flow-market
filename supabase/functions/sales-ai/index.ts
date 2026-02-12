import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface AIRequest {
  action: string;
  userId: string;
  data?: any;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, userId, data } = await req.json() as AIRequest;
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurado');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Buscar dados do usuário para contexto
    const { data: leads } = await supabase
      .from('sales_leads')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data: pipeline } = await supabase
      .from('sales_pipeline')
      .select('*, sales_leads(*)')
      .eq('user_id', userId);

    const { data: followUps } = await supabase
      .from('sales_follow_ups')
      .select('*, sales_leads(*)')
      .eq('user_id', userId)
      .eq('status', 'pending');

    const { data: meetings } = await supabase
      .from('sales_meetings')
      .select('*, sales_leads(*)')
      .eq('user_id', userId)
      .gte('scheduled_at', new Date().toISOString());

    // Verificar se tem CRM ativo para integração
    const { data: crmAccess } = await supabase
      .from('customer_products')
      .select('id')
      .eq('user_id', userId)
      .eq('product_slug', 'crm-simples')
      .eq('is_active', true)
      .maybeSingle();

    let crmData = null;
    if (crmAccess) {
      // Buscar dados do CRM admin para integração
      const { data: crmClients } = await supabase
        .from('admin_crm_customers')
        .select('*')
        .limit(100);
      crmData = crmClients;
    }

    const context = {
      totalLeads: leads?.length || 0,
      leads: leads || [],
      pipeline: pipeline || [],
      pendingFollowUps: followUps?.length || 0,
      followUps: followUps || [],
      upcomingMeetings: meetings?.length || 0,
      meetings: meetings || [],
      hasCRMIntegration: !!crmAccess,
      crmClients: crmData
    };

    let systemPrompt = `Você é um assistente de vendas especializado em IA. Sua função é ajudar equipes comerciais a:
- Analisar e pontuar leads
- Sugerir melhores momentos para follow-up
- Gerar emails personalizados
- Prever probabilidade de fechamento
- Identificar padrões de sucesso
- Analisar sentimento de conversas
- Recomendar próximas ações
- Otimizar pipeline de vendas

${crmAccess ? 'O usuário tem integração com CRM ativa. Use dados do CRM para enriquecer análises.' : ''}

SEMPRE responda em formato JSON válido com a estrutura apropriada para cada ação.`;

    let userPrompt = '';
    let responseStructure = {};

    switch (action) {
      case 'score_lead':
        userPrompt = `Analise o seguinte lead e dê uma pontuação de 0-100:
Lead: ${JSON.stringify(data.lead)}
Contexto de leads anteriores: ${JSON.stringify(context.leads.slice(0, 10))}

Retorne JSON com: score (0-100), factors (array de fatores positivos/negativos), recommendation (texto)`;
        break;

      case 'generate_email':
        userPrompt = `Gere um email de ${data.type || 'follow-up'} personalizado para:
Lead: ${JSON.stringify(data.lead)}
Contexto: ${data.context || 'Primeiro contato'}
Tom: ${data.tone || 'profissional mas amigável'}

Retorne JSON com: subject (assunto), body (corpo do email), tips (dicas de envio)`;
        break;

      case 'analyze_sentiment':
        userPrompt = `Analise o sentimento das seguintes interações:
Conversas: ${JSON.stringify(data.conversations)}

Retorne JSON com: overall_sentiment (positivo/neutro/negativo), confidence (0-100), key_emotions (array), recommendations (array)`;
        break;

      case 'predict_close':
        userPrompt = `Preveja a probabilidade de fechamento para:
Deal: ${JSON.stringify(data.deal)}
Pipeline histórico: ${JSON.stringify(context.pipeline.slice(0, 10))}

Retorne JSON com: probability (0-100), estimated_close_date, risk_factors (array), accelerators (array)`;
        break;

      case 'suggest_followup':
        userPrompt = `Sugira estratégia de follow-up para:
Lead: ${JSON.stringify(data.lead)}
Últimas interações: ${JSON.stringify(data.interactions || [])}
Follow-ups pendentes: ${context.pendingFollowUps}

Retorne JSON com: best_time (horário ideal), channel (email/telefone/whatsapp), message_template (texto), urgency (alta/média/baixa)`;
        break;

      case 'analyze_objections':
        userPrompt = `Analise objeções comuns e sugira respostas:
Objeções relatadas: ${JSON.stringify(data.objections || [])}
Tipo de produto/serviço: ${data.productType || 'Não especificado'}

Retorne JSON com: objections (array com objection, frequency, suggested_response, success_rate)`;
        break;

      case 'recommend_actions':
        userPrompt = `Recomende as próximas ações prioritárias:
Leads ativos: ${context.totalLeads}
Follow-ups pendentes: ${context.pendingFollowUps}
Reuniões agendadas: ${context.upcomingMeetings}
Pipeline: ${JSON.stringify(context.pipeline.slice(0, 5))}
${crmData ? `Clientes CRM: ${JSON.stringify(crmData.slice(0, 5))}` : ''}

Retorne JSON com: actions (array com priority, action, reason, expected_impact), daily_focus (texto)`;
        break;

      case 'pipeline_insights':
        userPrompt = `Analise o pipeline de vendas:
Pipeline completo: ${JSON.stringify(context.pipeline)}
Leads: ${JSON.stringify(context.leads.slice(0, 20))}

Retorne JSON com: 
- health_score (0-100)
- bottlenecks (array de gargalos)
- opportunities (array de oportunidades)
- revenue_forecast (previsão de receita)
- stage_analysis (análise por etapa)
- recommendations (array de recomendações)`;
        break;

      case 'meeting_summary':
        userPrompt = `Gere um resumo e action items para a reunião:
Título: ${data.title}
Notas: ${data.notes}
Lead: ${JSON.stringify(data.lead)}

Retorne JSON com: summary (resumo), action_items (array), next_steps (próximos passos), follow_up_date (data sugerida)`;
        break;

      case 'dashboard_insights':
        userPrompt = `Gere insights gerais para o dashboard de vendas:
Total de leads: ${context.totalLeads}
Pipeline: ${JSON.stringify(context.pipeline)}
Follow-ups pendentes: ${context.pendingFollowUps}
Reuniões: ${context.upcomingMeetings}
${crmData ? `Clientes CRM integrados: ${crmData.length}` : 'Sem integração CRM'}

Retorne JSON com:
- kpi_summary (resumo de KPIs)
- alerts (array de alertas urgentes)
- opportunities (array de oportunidades)
- trends (tendências identificadas)
- weekly_goals (metas sugeridas)
- ai_recommendations (5 recomendações principais)`;
        break;

      default:
        throw new Error(`Ação não reconhecida: ${action}`);
    }

    console.log(`Processing action: ${action} for user: ${userId}`);

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: 'Créditos de IA esgotados. Adicione créditos na sua conta.' }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`Erro na API de IA: ${response.status}`);
    }

    const aiData = await response.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('Resposta vazia da IA');
    }

    // Parse JSON da resposta
    let result;
    try {
      // Remove markdown code blocks se presentes
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      result = JSON.parse(cleanContent);
    } catch (e) {
      console.error('Erro ao parsear JSON:', content);
      result = { raw_response: content, parse_error: true };
    }

    // Salvar insight se for uma análise importante
    if (['dashboard_insights', 'pipeline_insights', 'recommend_actions'].includes(action)) {
      await supabase.from('sales_ai_insights').insert({
        user_id: userId,
        insight_type: action,
        title: action === 'dashboard_insights' ? 'Análise Diária' : 
               action === 'pipeline_insights' ? 'Análise de Pipeline' : 'Ações Recomendadas',
        content: JSON.stringify(result),
        priority: 'high'
      });
    }

    return new Response(JSON.stringify({ success: true, data: result, action }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Sales AI error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
