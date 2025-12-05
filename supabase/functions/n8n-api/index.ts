import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// n8n API Configuration
const N8N_BASE_URL = Deno.env.get('N8N_BASE_URL') || 'https://n8n.starai.com.br';
const N8N_API_KEY = Deno.env.get('N8N_API_KEY');

interface N8nApiRequest {
  action: 'list_workflows' | 'get_workflow' | 'activate_workflow' | 'deactivate_workflow' | 
          'get_executions' | 'get_execution' | 'create_workflow' | 'update_workflow' | 
          'delete_workflow' | 'get_workflow_tags' | 'test_connection' | 'duplicate_workflow';
  workflowId?: string;
  executionId?: string;
  data?: any;
  limit?: number;
  cursor?: string;
  status?: string;
  newName?: string;
  customerEmail?: string;
  productTitle?: string;
}

// Helper to make n8n API requests
async function n8nRequest(endpoint: string, method: string = 'GET', body?: any) {
  const url = `${N8N_BASE_URL}/api/v1${endpoint}`;
  
  console.log(`n8n-api: ${method} ${url}`);
  
  const options: RequestInit = {
    method,
    headers: {
      'X-N8N-API-KEY': N8N_API_KEY!,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };
  
  if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
    options.body = JSON.stringify(body);
  }
  
  const response = await fetch(url, options);
  
  const responseText = await response.text();
  let responseData;
  
  try {
    responseData = JSON.parse(responseText);
  } catch {
    responseData = { raw: responseText };
  }
  
  console.log(`n8n-api: Response status ${response.status}`);
  
  if (!response.ok) {
    console.error(`n8n-api: Error response`, responseData);
    throw new Error(responseData.message || `n8n API error: ${response.status}`);
  }
  
  return responseData;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key is configured
    if (!N8N_API_KEY) {
      throw new Error('N8N_API_KEY não está configurado');
    }

    const { action, workflowId, executionId, data, limit, cursor, status }: N8nApiRequest = await req.json();
    
    console.log(`n8n-api: Action '${action}' received`);

    let result: any;

    switch (action) {
      // ========== TEST CONNECTION ==========
      case 'test_connection': {
        try {
          const workflows = await n8nRequest('/workflows?limit=1');
          result = {
            success: true,
            message: 'Conexão com n8n estabelecida com sucesso!',
            n8nUrl: N8N_BASE_URL,
            totalWorkflows: workflows.data?.length || 0,
          };
        } catch (error) {
          result = {
            success: false,
            message: `Falha na conexão: ${error.message}`,
            n8nUrl: N8N_BASE_URL,
          };
        }
        break;
      }

      // ========== WORKFLOWS ==========
      case 'list_workflows': {
        const queryParams = new URLSearchParams();
        if (limit) queryParams.append('limit', limit.toString());
        if (cursor) queryParams.append('cursor', cursor);
        
        const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
        const workflows = await n8nRequest(`/workflows${query}`);
        
        result = {
          success: true,
          workflows: workflows.data || [],
          nextCursor: workflows.nextCursor || null,
          totalCount: workflows.data?.length || 0,
        };
        break;
      }

      case 'get_workflow': {
        if (!workflowId) throw new Error('workflowId é obrigatório');
        
        const workflow = await n8nRequest(`/workflows/${workflowId}`);
        
        result = {
          success: true,
          workflow,
        };
        break;
      }

      case 'activate_workflow': {
        if (!workflowId) throw new Error('workflowId é obrigatório');
        
        const workflow = await n8nRequest(`/workflows/${workflowId}/activate`, 'POST');
        
        result = {
          success: true,
          message: `Workflow ${workflowId} ativado com sucesso`,
          workflow,
          active: true,
        };
        break;
      }

      case 'deactivate_workflow': {
        if (!workflowId) throw new Error('workflowId é obrigatório');
        
        const workflow = await n8nRequest(`/workflows/${workflowId}/deactivate`, 'POST');
        
        result = {
          success: true,
          message: `Workflow ${workflowId} desativado com sucesso`,
          workflow,
          active: false,
        };
        break;
      }

      case 'create_workflow': {
        if (!data) throw new Error('data é obrigatório para criar workflow');
        
        const workflow = await n8nRequest('/workflows', 'POST', data);
        
        result = {
          success: true,
          message: 'Workflow criado com sucesso',
          workflow,
        };
        break;
      }

      case 'update_workflow': {
        if (!workflowId) throw new Error('workflowId é obrigatório');
        if (!data) throw new Error('data é obrigatório para atualizar workflow');
        
        const workflow = await n8nRequest(`/workflows/${workflowId}`, 'PUT', data);
        
        result = {
          success: true,
          message: `Workflow ${workflowId} atualizado com sucesso`,
          workflow,
        };
        break;
      }

      case 'delete_workflow': {
        if (!workflowId) throw new Error('workflowId é obrigatório');
        
        await n8nRequest(`/workflows/${workflowId}`, 'DELETE');
        
        result = {
          success: true,
          message: `Workflow ${workflowId} deletado com sucesso`,
        };
        break;
      }

      // ========== EXECUTIONS ==========
      case 'get_executions': {
        const queryParams = new URLSearchParams();
        if (workflowId) queryParams.append('workflowId', workflowId);
        if (limit) queryParams.append('limit', limit.toString());
        if (cursor) queryParams.append('cursor', cursor);
        if (status) queryParams.append('status', status);
        
        const query = queryParams.toString() ? `?${queryParams.toString()}` : '';
        const executions = await n8nRequest(`/executions${query}`);
        
        result = {
          success: true,
          executions: executions.data || [],
          nextCursor: executions.nextCursor || null,
        };
        break;
      }

      case 'get_execution': {
        if (!executionId) throw new Error('executionId é obrigatório');
        
        const execution = await n8nRequest(`/executions/${executionId}`);
        
        result = {
          success: true,
          execution,
        };
        break;
      }

      // ========== TAGS ==========
      case 'get_workflow_tags': {
        const tags = await n8nRequest('/tags');
        
        result = {
          success: true,
          tags: tags.data || [],
        };
        break;
      }

      // ========== DUPLICATE WORKFLOW ==========
      case 'duplicate_workflow': {
        if (!workflowId) throw new Error('workflowId é obrigatório');
        
        const { newName, customerEmail, productTitle }: N8nApiRequest = await req.json().catch(() => ({}));
        
        // 1. Buscar o workflow template
        console.log(`n8n-api: Buscando workflow template ${workflowId}`);
        const templateWorkflow = await n8nRequest(`/workflows/${workflowId}`);
        
        // 2. Criar nome do novo workflow
        const workflowName = newName || `[${customerEmail}] ${productTitle || templateWorkflow.name}`;
        
        // 3. Preparar dados do novo workflow (remover ID e campos que não podem ser copiados)
        const newWorkflowData = {
          name: workflowName,
          nodes: templateWorkflow.nodes,
          connections: templateWorkflow.connections,
          settings: templateWorkflow.settings || {},
          staticData: null,
          active: false, // Novo workflow começa desativado
        };
        
        console.log(`n8n-api: Criando novo workflow: ${workflowName}`);
        
        // 4. Criar o novo workflow
        const newWorkflow = await n8nRequest('/workflows', 'POST', newWorkflowData);
        
        result = {
          success: true,
          message: `Workflow duplicado com sucesso: ${workflowName}`,
          workflow: newWorkflow,
          workflowId: newWorkflow.id,
          workflowName: newWorkflow.name,
        };
        break;
      }

      default:
        throw new Error(`Ação desconhecida: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('n8n-api: Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro desconhecido',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
