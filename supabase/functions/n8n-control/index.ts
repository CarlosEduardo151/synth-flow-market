import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// URL fixa do webhook n8n para controle do agente
const N8N_CONTROL_WEBHOOK = 'https://n8n.starai.com.br/webhook-test/control-agente';

// Armazenamento em memória do último comando por agente (para persistência simples)
const agentLastCommands = new Map<string, { action: string; timestamp: string; status: string }>();

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

    // Obter o último comando executado para este agente
    const lastCommand = agentLastCommands.get(agentId) || null;
    
    // Determinar o estado atual do agente baseado no último comando
    let currentAgentState = 'desconhecido';
    if (lastCommand) {
      if (lastCommand.action === 'ativar') currentAgentState = 'ligado';
      else if (lastCommand.action === 'desativar') currentAgentState = 'desligado';
      else if (lastCommand.action === 'reiniciar') currentAgentState = 'ligado'; // Após reiniciar, fica ligado
    }

    const timestamp = new Date().toISOString();

    const payload = {
      agentId,
      action,
      newStatus: statusMap[action],
      previousState: currentAgentState,
      lastCommand: lastCommand ? {
        action: lastCommand.action,
        status: lastCommand.status,
        executedAt: lastCommand.timestamp
      } : null,
      source: 'lovable-site',
      timestamp,
      message: `Agente ${agentId}: Comando '${action}' enviado. Estado anterior: ${currentAgentState}. Novo status: ${statusMap[action]}`
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

    // Atualizar o último comando executado para este agente (se não for apenas consulta de status)
    if (action !== 'status') {
      agentLastCommands.set(agentId, {
        action,
        status: statusMap[action],
        timestamp
      });
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
        currentState: action === 'status' ? currentAgentState : statusMap[action],
        previousState: currentAgentState,
        lastCommand: lastCommand,
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