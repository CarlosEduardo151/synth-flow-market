import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentId, action } = await req.json();

    console.log(`n8n-control: Received action '${action}' for agent '${agentId}'`);

    // Validate required fields
    if (!agentId || !action) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'ERRO: agentId e action são obrigatórios.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Validate action type
    const validActions = ['ativar', 'desativar', 'reiniciar'];
    if (!validActions.includes(action)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `ERRO: Ação inválida. Use: ${validActions.join(', ')}` 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get n8n credentials from environment
    const n8nWebhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    const n8nApiKey = Deno.env.get('N8N_API_KEY');

    if (!n8nWebhookUrl) {
      console.error('N8N_WEBHOOK_URL not configured');
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'ERRO: Configuração do n8n não encontrada.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Send request to n8n webhook
    const n8nResponse = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(n8nApiKey && { 'Authorization': `Bearer ${n8nApiKey}` }),
      },
      body: JSON.stringify({
        agentId,
        action,
        timestamp: new Date().toISOString(),
      }),
    });

    const responseData = await n8nResponse.json().catch(() => ({}));
    
    console.log(`n8n-control: n8n response status ${n8nResponse.status}`, responseData);

    if (!n8nResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `ERRO: Falha ao ${action === 'ativar' ? 'ligar' : action === 'desativar' ? 'desligar' : 'reiniciar'} o agente.`,
          details: responseData
        }),
        { 
          status: n8nResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const actionMessages = {
      ativar: 'Agente ativado com sucesso!',
      desativar: 'Agente desativado com sucesso!',
      reiniciar: 'Agente reiniciado com sucesso!',
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: actionMessages[action as keyof typeof actionMessages],
        data: responseData
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('n8n-control error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `ERRO: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
