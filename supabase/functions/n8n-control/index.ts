import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// URL fixa do webhook n8n para controle do agente
const N8N_CONTROL_WEBHOOK = 'https://n8n.starai.com.br/webhook-test/control-agente';

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
    const validActions = ['ativar', 'desativar', 'reiniciar', 'status'];
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

    // Determinar o status baseado na ação
    const statusMap: Record<string, string> = {
      'ativar': 'ligado',
      'desativar': 'desligado',
      'reiniciar': 'reiniciando',
      'status': 'consultando'
    };

    const payload = {
      agentId,
      action,
      status: statusMap[action],
      source: 'lovable-site',
      timestamp: new Date().toISOString(),
      message: `Agente ${agentId}: Comando '${action}' enviado. Status: ${statusMap[action]}`
    };

    console.log(`n8n-control: Sending to ${N8N_CONTROL_WEBHOOK}`, payload);

    const n8nResponse = await fetch(N8N_CONTROL_WEBHOOK, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    let responseData: Record<string, unknown> = {};
    const contentType = n8nResponse.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      responseData = await n8nResponse.json().catch(() => ({}));
    } else {
      const text = await n8nResponse.text().catch(() => '');
      responseData = { rawResponse: text };
    }
    
    console.log(`n8n-control: n8n response status ${n8nResponse.status}`, responseData);

    // Check for n8n test mode error
    const errorMessage = (responseData as { message?: string })?.message || '';
    if (n8nResponse.status === 404 && errorMessage.includes('This webhook is not registered')) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'ERRO: Webhook n8n não encontrado. Verifique se o workflow está ATIVO no n8n.',
          hint: 'No n8n, ative o workflow clicando no botão "Active" no canto superior direito.',
          webhookUrl: N8N_CONTROL_WEBHOOK,
          details: responseData
        }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    if (!n8nResponse.ok) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `ERRO: Falha ao executar ação '${action}'.`,
          webhookUrl: N8N_CONTROL_WEBHOOK,
          details: responseData
        }),
        { 
          status: n8nResponse.status, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const actionMessages: Record<string, string> = {
      ativar: 'Agente LIGADO com sucesso!',
      desativar: 'Agente DESLIGADO com sucesso!',
      reiniciar: 'Agente REINICIADO com sucesso!',
      status: 'Status consultado com sucesso!'
    };

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: actionMessages[action],
        status: statusMap[action],
        webhookUrl: N8N_CONTROL_WEBHOOK,
        payload: payload,
        n8nResponse: responseData
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
        message: `ERRO: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
        webhookUrl: N8N_CONTROL_WEBHOOK
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
