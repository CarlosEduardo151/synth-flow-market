import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const N8N_BASE_URL = Deno.env.get('N8N_BASE_URL') || 'https://n8n.starai.com.br';
const N8N_API_KEY = Deno.env.get('N8N_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

// Available AI models
const AI_MODELS = {
  'gpt-4o': { provider: 'openai', model: 'gpt-4o' },
  'gpt-4o-mini': { provider: 'openai', model: 'gpt-4o-mini' },
  'gpt-4-turbo': { provider: 'openai', model: 'gpt-4-turbo' },
  'gpt-3.5-turbo': { provider: 'openai', model: 'gpt-3.5-turbo' },
  'claude-3-5-sonnet': { provider: 'anthropic', model: 'claude-3-5-sonnet-20241022' },
  'claude-3-opus': { provider: 'anthropic', model: 'claude-3-opus-20240229' },
  'claude-3-haiku': { provider: 'anthropic', model: 'claude-3-haiku-20240307' },
  'gemini-pro': { provider: 'google', model: 'gemini-pro' },
  'gemini-1.5-pro': { provider: 'google', model: 'gemini-1.5-pro' },
};

interface SyncRequest {
  action: 'sync_config' | 'get_workflow_nodes' | 'update_node' | 'get_available_models' | 'test_sync';
  customerProductId?: string;
  workflowId?: string;
  nodeId?: string;
  nodeType?: string;
  config?: {
    aiModel?: string;
    systemPrompt?: string;
    personality?: string;
    actionInstructions?: string;
    memoryType?: string;
    memoryConnectionString?: string;
    memorySessionId?: string;
    temperature?: number;
    maxTokens?: number;
    toolsEnabled?: string[];
    aiCredentials?: Record<string, string>;
  };
}

// Helper to make n8n API requests
async function n8nRequest(endpoint: string, method: string = 'GET', body?: any) {
  const url = `${N8N_BASE_URL}/api/v1${endpoint}`;
  
  console.log(`n8n-sync-config: ${method} ${url}`);
  
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
  
  if (!response.ok) {
    console.error(`n8n-sync-config: Error response`, responseData);
    throw new Error(responseData.message || `n8n API error: ${response.status}`);
  }
  
  return responseData;
}

// Find AI Agent node in workflow
function findAIAgentNode(nodes: any[]) {
  return nodes.find(node => 
    node.type === '@n8n/n8n-nodes-langchain.agent' ||
    node.type === 'n8n-nodes-langchain.agent' ||
    node.type.includes('agent') ||
    node.name?.toLowerCase().includes('ai agent')
  );
}

// Find Memory node in workflow
function findMemoryNode(nodes: any[]) {
  return nodes.find(node => 
    node.type.includes('memory') ||
    node.type.includes('postgres') ||
    node.name?.toLowerCase().includes('memory')
  );
}

// Find Chat Model node in workflow
function findChatModelNode(nodes: any[]) {
  return nodes.find(node => 
    node.type.includes('openAi') ||
    node.type.includes('anthropic') ||
    node.type.includes('chatModel') ||
    node.type.includes('lmChat') ||
    node.name?.toLowerCase().includes('model') ||
    node.name?.toLowerCase().includes('openai') ||
    node.name?.toLowerCase().includes('claude')
  );
}

// Update AI Agent node with new config
function updateAIAgentNode(node: any, config: SyncRequest['config']) {
  const updatedNode = { ...node };
  
  if (!updatedNode.parameters) {
    updatedNode.parameters = {};
  }
  
  // Update System Message
  if (config?.systemPrompt) {
    updatedNode.parameters.systemMessage = config.systemPrompt;
  }
  
  // Add personality to system message if provided
  if (config?.personality) {
    const currentSystemMsg = updatedNode.parameters.systemMessage || '';
    if (!currentSystemMsg.includes('Personalidade:')) {
      updatedNode.parameters.systemMessage = `${currentSystemMsg}\n\nPersonalidade: ${config.personality}`;
    }
  }
  
  // Update action instructions (usually in a separate field or appended)
  if (config?.actionInstructions) {
    const currentSystemMsg = updatedNode.parameters.systemMessage || '';
    if (!currentSystemMsg.includes('Instruções de Ação:')) {
      updatedNode.parameters.systemMessage = `${currentSystemMsg}\n\nInstruções de Ação:\n${config.actionInstructions}`;
    }
  }
  
  // Update max iterations if needed
  if (config?.maxTokens) {
    updatedNode.parameters.maxIterations = Math.min(10, Math.ceil(config.maxTokens / 500));
  }
  
  return updatedNode;
}

// Update Chat Model node with new model
function updateChatModelNode(node: any, config: SyncRequest['config']) {
  const updatedNode = { ...node };
  
  if (!updatedNode.parameters) {
    updatedNode.parameters = {};
  }
  
  const modelInfo = AI_MODELS[config?.aiModel as keyof typeof AI_MODELS];
  
  if (modelInfo) {
    updatedNode.parameters.model = modelInfo.model;
    
    if (config?.temperature !== undefined) {
      updatedNode.parameters.temperature = config.temperature;
    }
    
    if (config?.maxTokens) {
      updatedNode.parameters.maxTokens = config.maxTokens;
    }
  }
  
  return updatedNode;
}

// Update Memory node with PostgreSQL config
function updateMemoryNode(node: any, config: SyncRequest['config']) {
  const updatedNode = { ...node };
  
  if (!updatedNode.parameters) {
    updatedNode.parameters = {};
  }
  
  // Update session ID for unique memory per customer
  if (config?.memorySessionId) {
    updatedNode.parameters.sessionId = config.memorySessionId;
    updatedNode.parameters.sessionIdType = 'customKey';
  }
  
  // Note: Connection string should be configured via n8n credentials, not directly
  // This just logs that it should be updated
  if (config?.memoryConnectionString) {
    console.log(`n8n-sync-config: Memory connection string should be updated via n8n credentials`);
  }
  
  return updatedNode;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!N8N_API_KEY) {
      throw new Error('N8N_API_KEY não está configurado');
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const requestData: SyncRequest = await req.json();
    const { action, customerProductId, workflowId, config } = requestData;

    console.log(`n8n-sync-config: Action '${action}'`);

    let result: any;

    switch (action) {
      // Get available AI models
      case 'get_available_models': {
        result = {
          success: true,
          models: Object.entries(AI_MODELS).map(([key, value]) => ({
            id: key,
            name: key,
            provider: value.provider,
            model: value.model,
          })),
        };
        break;
      }

      // Get workflow nodes for inspection
      case 'get_workflow_nodes': {
        if (!workflowId) throw new Error('workflowId é obrigatório');
        
        const workflow = await n8nRequest(`/workflows/${workflowId}`);
        
        const aiAgentNode = findAIAgentNode(workflow.nodes || []);
        const memoryNode = findMemoryNode(workflow.nodes || []);
        const chatModelNode = findChatModelNode(workflow.nodes || []);
        
        result = {
          success: true,
          workflowName: workflow.name,
          totalNodes: workflow.nodes?.length || 0,
          nodes: {
            aiAgent: aiAgentNode ? {
              id: aiAgentNode.id,
              name: aiAgentNode.name,
              type: aiAgentNode.type,
              parameters: aiAgentNode.parameters,
            } : null,
            memory: memoryNode ? {
              id: memoryNode.id,
              name: memoryNode.name,
              type: memoryNode.type,
              parameters: memoryNode.parameters,
            } : null,
            chatModel: chatModelNode ? {
              id: chatModelNode.id,
              name: chatModelNode.name,
              type: chatModelNode.type,
              parameters: chatModelNode.parameters,
            } : null,
          },
          allNodes: workflow.nodes?.map((n: any) => ({
            id: n.id,
            name: n.name,
            type: n.type,
          })),
        };
        break;
      }

      // Test sync without applying changes
      case 'test_sync': {
        if (!workflowId) throw new Error('workflowId é obrigatório');
        
        const workflow = await n8nRequest(`/workflows/${workflowId}`);
        
        const aiAgentNode = findAIAgentNode(workflow.nodes || []);
        const memoryNode = findMemoryNode(workflow.nodes || []);
        const chatModelNode = findChatModelNode(workflow.nodes || []);
        
        const changes: string[] = [];
        
        if (config?.aiModel && chatModelNode) {
          changes.push(`Modelo AI: ${config.aiModel}`);
        }
        if (config?.systemPrompt && aiAgentNode) {
          changes.push(`System Prompt: ${config.systemPrompt.substring(0, 50)}...`);
        }
        if (config?.personality && aiAgentNode) {
          changes.push(`Personalidade: ${config.personality.substring(0, 50)}...`);
        }
        if (config?.memorySessionId && memoryNode) {
          changes.push(`Session ID da Memória: ${config.memorySessionId}`);
        }
        if (config?.temperature !== undefined && chatModelNode) {
          changes.push(`Temperatura: ${config.temperature}`);
        }
        if (config?.maxTokens && chatModelNode) {
          changes.push(`Max Tokens: ${config.maxTokens}`);
        }
        
        result = {
          success: true,
          canSync: aiAgentNode !== null || chatModelNode !== null,
          nodesFound: {
            aiAgent: !!aiAgentNode,
            memory: !!memoryNode,
            chatModel: !!chatModelNode,
          },
          proposedChanges: changes,
          message: changes.length > 0 
            ? `${changes.length} alterações serão aplicadas`
            : 'Nenhuma alteração configurada',
        };
        break;
      }

      // Main sync action - apply config to n8n workflow
      case 'sync_config': {
        let targetWorkflowId = workflowId;
        
        // If customerProductId is provided, get workflow from there
        if (customerProductId) {
          const { data: customerProduct, error: cpError } = await supabase
            .from('customer_products')
            .select('n8n_workflow_id, user_id, product_slug')
            .eq('id', customerProductId)
            .single();
          
          if (cpError || !customerProduct) {
            throw new Error('Produto não encontrado');
          }
          
          targetWorkflowId = workflowId || customerProduct.n8n_workflow_id;
        }
        
        // Either workflowId must be provided directly or via customerProduct
        if (!targetWorkflowId) {
          throw new Error('workflowId é obrigatório');
        }
        
        // 2. Get current workflow from n8n
        console.log(`n8n-sync-config: Fetching workflow ${targetWorkflowId}`);
        const workflow = await n8nRequest(`/workflows/${targetWorkflowId}`);
        
        // 3. Find and update nodes
        let updatedNodes = [...(workflow.nodes || [])];
        const updateLog: string[] = [];
        
        // Update AI Agent node
        const aiAgentIndex = updatedNodes.findIndex(n => findAIAgentNode([n]));
        if (aiAgentIndex !== -1) {
          updatedNodes[aiAgentIndex] = updateAIAgentNode(updatedNodes[aiAgentIndex], config);
          updateLog.push('AI Agent atualizado');
        }
        
        // Update Chat Model node
        const chatModelIndex = updatedNodes.findIndex(n => findChatModelNode([n]));
        if (chatModelIndex !== -1) {
          updatedNodes[chatModelIndex] = updateChatModelNode(updatedNodes[chatModelIndex], config);
          updateLog.push('Modelo de Chat atualizado');
        }
        
        // Update Memory node
        const memoryIndex = updatedNodes.findIndex(n => findMemoryNode([n]));
        if (memoryIndex !== -1) {
          updatedNodes[memoryIndex] = updateMemoryNode(updatedNodes[memoryIndex], config);
          updateLog.push('Memória atualizada');
        }
        
        // 4. Push updated workflow to n8n - only include required properties
        const updatedWorkflow: Record<string, any> = {
          name: workflow.name,
          nodes: updatedNodes,
          connections: workflow.connections || {},
        };
        
        // Only add optional properties if they exist
        if (workflow.settings) updatedWorkflow.settings = workflow.settings;
        
        console.log(`n8n-sync-config: Updating workflow ${targetWorkflowId} with keys: ${Object.keys(updatedWorkflow).join(', ')}`);
        const savedWorkflow = await n8nRequest(`/workflows/${targetWorkflowId}`, 'PUT', updatedWorkflow);
        
        // 5. Save config to database (only if customerProductId provided)
        let configSaved = false;
        if (customerProductId) {
          const configData: any = {
            customer_product_id: customerProductId,
            ai_model: config?.aiModel || 'gpt-4o-mini',
            system_prompt: config?.systemPrompt,
            personality: config?.personality,
            action_instructions: config?.actionInstructions,
            memory_type: config?.memoryType || 'postgresql',
            memory_connection_string: config?.memoryConnectionString,
            memory_session_id: config?.memorySessionId || `session_${customerProductId}`,
            temperature: config?.temperature ?? 0.7,
            max_tokens: config?.maxTokens ?? 2048,
            tools_enabled: config?.toolsEnabled || [],
            ai_credentials: config?.aiCredentials || {},
            updated_at: new Date().toISOString(),
          };
          
          const { error: saveError } = await supabase
            .from('ai_control_config')
            .upsert(configData, { onConflict: 'customer_product_id' });
          
          if (saveError) {
            console.error('n8n-sync-config: Error saving to DB', saveError);
          } else {
            configSaved = true;
          }
        }
        
        result = {
          success: true,
          message: 'Configuração sincronizada com sucesso',
          workflowId: targetWorkflowId,
          workflowName: savedWorkflow.name,
          updatedNodes: updateLog,
          configSaved,
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
    console.error('n8n-sync-config: Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro desconhecido',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
