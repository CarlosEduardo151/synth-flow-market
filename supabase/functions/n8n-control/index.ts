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
    const { agentId, action, httpMethod = 'POST' } = await req.json();

    console.log(`n8n-control: Received action '${action}' for agent '${agentId}' using ${httpMethod}`);

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
          message: 'ERRO: Configuração do n8n não encontrada. Configure N8N_WEBHOOK_URL.' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const payload = {
      agentId,
      action,
      timestamp: new Date().toISOString(),
    };

    let n8nResponse;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (n8nApiKey) {
      headers['Authorization'] = `Bearer ${n8nApiKey}`;
    }

    if (httpMethod === 'GET') {
      // Build URL with query parameters for GET request
      const url = new URL(n8nWebhookUrl);
      url.searchParams.append('agentId', agentId);
      url.searchParams.append('action', action);
      url.searchParams.append('timestamp', payload.timestamp);

      console.log(`n8n-control: Sending GET request to ${url.toString()}`);
      n8nResponse = await fetch(url.toString(), {
        method: 'GET',
        headers,
      });
    } else {
      // Send POST request to n8n webhook
      console.log(`n8n-control: Sending POST request to ${n8nWebhookUrl}`);
      n8nResponse = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    }

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
          message: 'ERRO: Webhook n8n não encontrado. Verifique se o workflow está ATIVO no n8n e se a URL está correta (use a URL de produção, não de teste).',
          hint: 'No n8n, ative o workflow clicando no botão "Active" no canto superior direito.',
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
