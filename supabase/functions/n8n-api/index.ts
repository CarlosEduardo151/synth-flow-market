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
          'delete_workflow' | 'get_workflow_tags' | 'test_connection' | 'duplicate_workflow' |
          'update_system_prompt' | 'create_credential' | 'list_credentials' | 'delete_credential' |
          'update_llm_config';
  workflowId?: string;
  executionId?: string;
  data?: any;
  limit?: number;
  cursor?: string;
  status?: string;
  newName?: string;
  customerEmail?: string;
  productTitle?: string;
  // Para update_system_prompt
  newSystemMessage?: string;
  agentNodeId?: string;
  // Para create_credential
  credentialName?: string;
  credentialType?: string;
  credentialData?: Record<string, any>;
  credentialId?: string;
  // Para update_llm_config
  provider?: 'openai' | 'google';
  apiKey?: string;
  model?: string;
  llmNodeId?: string;
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

    const requestBody = await req.json();
    const { 
      action, workflowId, executionId, data, limit, cursor, status,
      newName, customerEmail, productTitle,
      newSystemMessage, agentNodeId,
      credentialName, credentialType, credentialData, credentialId,
      provider, apiKey, model, llmNodeId
    }: N8nApiRequest = requestBody;
    
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

      // ========== UPDATE SYSTEM PROMPT (Personalidade) ==========
      case 'update_system_prompt': {
        if (!workflowId) throw new Error('workflowId é obrigatório');
        if (!newSystemMessage) throw new Error('newSystemMessage é obrigatório');
        
        console.log(`n8n-api: Atualizando system prompt do workflow ${workflowId}`);
        
        // 1. Buscar o workflow completo
        const workflow = await n8nRequest(`/workflows/${workflowId}`);
        const wasActive = workflow.active;
        
        // 2. Encontrar o nó AI Agent (por ID específico ou por tipo)
        const targetNodeId = agentNodeId || '37ada3be-cb69-4cad-8c9f-06eefe75aded';
        let agentNodeIndex = workflow.nodes.findIndex((node: any) => node.id === targetNodeId);
        
        // Fallback: buscar por tipo se não encontrar pelo ID
        if (agentNodeIndex === -1) {
          agentNodeIndex = workflow.nodes.findIndex((node: any) => 
            node.type === '@n8n/n8n-nodes-langchain.agent'
          );
        }
        
        if (agentNodeIndex === -1) {
          throw new Error('Nó AI Agent não encontrado no workflow');
        }
        
        console.log(`n8n-api: Nó AI Agent encontrado no índice ${agentNodeIndex}`);
        
        // 3. Modificar apenas o systemMessage
        const updatedNodes = [...workflow.nodes];
        const agentNode = { ...updatedNodes[agentNodeIndex] };
        
        // Garantir que a estrutura de parâmetros existe
        agentNode.parameters = agentNode.parameters || {};
        agentNode.parameters.options = agentNode.parameters.options || {};
        agentNode.parameters.options.systemMessage = newSystemMessage;
        
        updatedNodes[agentNodeIndex] = agentNode;
        
        // 4. Enviar o workflow atualizado (apenas campos permitidos)
        const updatePayload = {
          name: workflow.name,
          nodes: updatedNodes,
          connections: workflow.connections,
          ...(workflow.settings && { settings: workflow.settings }),
        };
        
        console.log(`n8n-api: Enviando atualização do workflow`);
        const savedWorkflow = await n8nRequest(`/workflows/${workflowId}`, 'PUT', updatePayload);
        
        // 5. Reativar workflow se estava ativo
        if (wasActive) {
          console.log(`n8n-api: Reativando workflow`);
          try {
            await n8nRequest(`/workflows/${workflowId}/deactivate`, 'POST');
            await n8nRequest(`/workflows/${workflowId}/activate`, 'POST');
          } catch (reactivateError) {
            console.warn(`n8n-api: Erro ao reativar workflow:`, reactivateError);
          }
        }
        
        result = {
          success: true,
          message: `System prompt atualizado com sucesso`,
          workflowId: savedWorkflow.id,
          nodeId: updatedNodes[agentNodeIndex].id,
          systemMessagePreview: newSystemMessage.substring(0, 100) + '...',
        };
        break;
      }

      // ========== CREATE CREDENTIAL (Chaves do Cliente) ==========
      case 'create_credential': {
        if (!credentialName) throw new Error('credentialName é obrigatório');
        if (!credentialType) throw new Error('credentialType é obrigatório (ex: openAiApi, googleApi)');
        if (!credentialData) throw new Error('credentialData é obrigatório');
        
        console.log(`n8n-api: Criando credencial ${credentialName} do tipo ${credentialType}`);
        
        // Mapear tipos comuns para o formato do n8n
        const typeMapping: Record<string, string> = {
          'openai': 'openAiApi',
          'openai_api': 'openAiApi',
          'openAiApi': 'openAiApi',
          'google': 'googleApi',
          'googleApi': 'googleApi',
          'google_sheets': 'googleSheetsOAuth2Api',
          'whatsapp': 'whatsAppBusinessCloudApi',
          'telegram': 'telegramApi',
          'discord': 'discordBotApi',
          'slack': 'slackApi',
          'postgres': 'postgres',
          'mysql': 'mySql',
        };
        
        const n8nCredentialType = typeMapping[credentialType] || credentialType;
        
        const credentialPayload = {
          name: credentialName,
          type: n8nCredentialType,
          data: credentialData,
        };
        
        const newCredential = await n8nRequest('/credentials', 'POST', credentialPayload);
        
        console.log(`n8n-api: Credencial criada com ID ${newCredential.id}`);
        
        result = {
          success: true,
          message: `Credencial '${credentialName}' criada com sucesso`,
          credentialId: newCredential.id,
          credentialName: newCredential.name,
          credentialType: newCredential.type,
        };
        break;
      }

      // ========== LIST CREDENTIALS ==========
      case 'list_credentials': {
        console.log(`n8n-api: Listando credenciais`);
        
        const credentials = await n8nRequest('/credentials');
        
        result = {
          success: true,
          credentials: credentials.data || [],
          totalCount: credentials.data?.length || 0,
        };
        break;
      }

      // ========== DELETE CREDENTIAL ==========
      case 'delete_credential': {
        if (!credentialId) throw new Error('credentialId é obrigatório');
        
        console.log(`n8n-api: Deletando credencial ${credentialId}`);
        
        await n8nRequest(`/credentials/${credentialId}`, 'DELETE');
        
        result = {
          success: true,
          message: `Credencial ${credentialId} deletada com sucesso`,
        };
        break;
      }

      // ========== UPDATE LLM CONFIG (Credencial + Modelo no Workflow) ==========
      case 'update_llm_config': {
        if (!workflowId) throw new Error('workflowId é obrigatório');
        if (!provider) throw new Error('provider é obrigatório (openai ou google)');
        if (!apiKey) throw new Error('apiKey é obrigatório');
        if (!model) throw new Error('model é obrigatório');
        
        console.log(`n8n-api: Atualizando LLM config do workflow ${workflowId} para ${provider}/${model}`);
        
        // 1. Determinar tipo de credencial e nome para o n8n
        const credentialConfig = provider === 'openai' 
          ? { 
              type: 'openAiApi', 
              credKey: 'openAiApi',
              nodeType: '@n8n/n8n-nodes-langchain.lmChatOpenAi',
              data: { apiKey }
            }
          : { 
              type: 'googleGeminiApi', 
              credKey: 'googleGeminiApi',
              nodeType: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
              data: { apiKey }
            };
        
        // 2. Criar ou atualizar credencial no n8n
        const credName = `Cliente_${provider}_${Date.now()}`;
        console.log(`n8n-api: Criando credencial ${credName}`);
        
        const newCredential = await n8nRequest('/credentials', 'POST', {
          name: credName,
          type: credentialConfig.type,
          data: credentialConfig.data,
        });
        
        console.log(`n8n-api: Credencial criada com ID ${newCredential.id}`);
        
        // 3. Buscar workflow completo
        const workflow = await n8nRequest(`/workflows/${workflowId}`);
        const wasActive = workflow.active;
        
        // 4. Encontrar o nó LLM (Chat Model) no workflow
        const targetLlmNodeId = llmNodeId;
        let llmNodeIndex = -1;
        
        if (targetLlmNodeId) {
          llmNodeIndex = workflow.nodes.findIndex((node: any) => node.id === targetLlmNodeId);
        }
        
        // Fallback: buscar por tipo de nó de chat model
        if (llmNodeIndex === -1) {
          llmNodeIndex = workflow.nodes.findIndex((node: any) => 
            node.type === '@n8n/n8n-nodes-langchain.lmChatGoogleGemini' ||
            node.type === '@n8n/n8n-nodes-langchain.lmChatOpenAi' ||
            node.type?.includes('lmChat')
          );
        }
        
        if (llmNodeIndex === -1) {
          throw new Error('Nó de Chat Model (LLM) não encontrado no workflow');
        }
        
        console.log(`n8n-api: Nó LLM encontrado no índice ${llmNodeIndex}, tipo: ${workflow.nodes[llmNodeIndex].type}`);
        
        // 5. Atualizar nó LLM com nova credencial e modelo
        const updatedNodes = [...workflow.nodes];
        const llmNode = { ...updatedNodes[llmNodeIndex] };
        
        // Atualizar tipo do nó se necessário (trocar entre OpenAI e Gemini)
        llmNode.type = credentialConfig.nodeType;
        
        // Atualizar credenciais
        llmNode.credentials = {
          [credentialConfig.credKey]: {
            id: newCredential.id,
            name: credName,
          }
        };
        
        // Atualizar modelo nos parâmetros
        llmNode.parameters = llmNode.parameters || {};
        llmNode.parameters.model = model;
        
        // Para OpenAI, ajustar nome do campo se necessário
        if (provider === 'openai') {
          llmNode.parameters.model = model;
        } else {
          // Para Gemini
          llmNode.parameters.modelName = model;
        }
        
        updatedNodes[llmNodeIndex] = llmNode;
        
        // 6. Enviar workflow atualizado
        const updatePayload = {
          name: workflow.name,
          nodes: updatedNodes,
          connections: workflow.connections,
          ...(workflow.settings && { settings: workflow.settings }),
        };
        
        console.log(`n8n-api: Enviando atualização do workflow`);
        const savedWorkflow = await n8nRequest(`/workflows/${workflowId}`, 'PUT', updatePayload);
        
        // 7. Reativar workflow se estava ativo
        if (wasActive) {
          console.log(`n8n-api: Reativando workflow`);
          try {
            await n8nRequest(`/workflows/${workflowId}/deactivate`, 'POST');
            await n8nRequest(`/workflows/${workflowId}/activate`, 'POST');
          } catch (reactivateError) {
            console.warn(`n8n-api: Erro ao reativar workflow:`, reactivateError);
          }
        }
        
        result = {
          success: true,
          message: `Configuração LLM atualizada: ${provider}/${model}`,
          credentialId: newCredential.id,
          credentialName: credName,
          workflowId: savedWorkflow.id,
          provider,
          model,
          nodeType: credentialConfig.nodeType,
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
