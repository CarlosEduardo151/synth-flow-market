import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// n8n API Configuration
const N8N_BASE_URL = Deno.env.get('N8N_BASE_URL') || 'https://n8n.starai.com.br';
const N8N_API_KEY = Deno.env.get('N8N_API_KEY');

// Definição das ferramentas n8n disponíveis
const N8N_TOOLS_CONFIG: Record<string, { type: string; typeVersion: number; defaultParams: Record<string, any> }> = {
  // Requisições e APIs
  httpRequestTool: { type: 'n8n-nodes-base.httpRequestTool', typeVersion: 4.3, defaultParams: { options: {} } },
  webhookTool: { type: 'n8n-nodes-base.webhook', typeVersion: 2, defaultParams: { httpMethod: 'POST', path: 'webhook' } },
  graphqlTool: { type: 'n8n-nodes-base.graphql', typeVersion: 1, defaultParams: { endpoint: '', query: '' } },
  soapTool: { type: 'n8n-nodes-base.soap', typeVersion: 1, defaultParams: { wsdlUrl: '' } },
  
  // Busca e Pesquisa
  serpApiTool: { type: '@n8n/n8n-nodes-langchain.toolSerpApi', typeVersion: 1, defaultParams: {} },
  wolframAlphaTool: { type: '@n8n/n8n-nodes-langchain.toolWolframAlpha', typeVersion: 1, defaultParams: {} },
  wikipediaTool: { type: '@n8n/n8n-nodes-langchain.toolWikipedia', typeVersion: 1, defaultParams: {} },
  vectorStoreTool: { type: '@n8n/n8n-nodes-langchain.toolVectorStore', typeVersion: 1, defaultParams: {} },
  
  // Email e Comunicação
  gmailTool: { type: 'n8n-nodes-base.gmail', typeVersion: 2.1, defaultParams: { operation: 'send' } },
  outlookTool: { type: 'n8n-nodes-base.microsoftOutlook', typeVersion: 2, defaultParams: { operation: 'send' } },
  sendGridTool: { type: 'n8n-nodes-base.sendGrid', typeVersion: 1, defaultParams: { operation: 'send' } },
  smtpTool: { type: 'n8n-nodes-base.emailSend', typeVersion: 2.1, defaultParams: {} },
  slackTool: { type: 'n8n-nodes-base.slack', typeVersion: 2.2, defaultParams: { operation: 'postMessage' } },
  discordTool: { type: 'n8n-nodes-base.discord', typeVersion: 2, defaultParams: { operation: 'sendMessage' } },
  telegramTool: { type: 'n8n-nodes-base.telegram', typeVersion: 1.2, defaultParams: { operation: 'sendMessage' } },
  whatsappTool: { type: 'n8n-nodes-base.whatsApp', typeVersion: 1, defaultParams: { operation: 'sendMessage' } },
  
  // Planilhas e Dados
  googleSheetsTool: { type: 'n8n-nodes-base.googleSheets', typeVersion: 4.5, defaultParams: { operation: 'read' } },
  excelTool: { type: 'n8n-nodes-base.microsoftExcel', typeVersion: 2, defaultParams: { operation: 'read' } },
  airtableTool: { type: 'n8n-nodes-base.airtable', typeVersion: 2.1, defaultParams: { operation: 'read' } },
  notionTool: { type: 'n8n-nodes-base.notion', typeVersion: 2.2, defaultParams: { operation: 'get' } },
  
  // Banco de Dados
  postgresTool: { type: 'n8n-nodes-base.postgres', typeVersion: 2.5, defaultParams: { operation: 'executeQuery' } },
  mysqlTool: { type: 'n8n-nodes-base.mySql', typeVersion: 2.4, defaultParams: { operation: 'executeQuery' } },
  mongoDbTool: { type: 'n8n-nodes-base.mongoDb', typeVersion: 1.1, defaultParams: { operation: 'find' } },
  redisTool: { type: 'n8n-nodes-base.redis', typeVersion: 1, defaultParams: { operation: 'get' } },
  supabaseTool: { type: 'n8n-nodes-base.supabase', typeVersion: 1, defaultParams: { operation: 'getAll' } },
  
  // Arquivos e Storage
  googleDriveTool: { type: 'n8n-nodes-base.googleDrive', typeVersion: 3, defaultParams: { operation: 'download' } },
  dropboxTool: { type: 'n8n-nodes-base.dropbox', typeVersion: 1, defaultParams: { operation: 'download' } },
  s3Tool: { type: 'n8n-nodes-base.awsS3', typeVersion: 1, defaultParams: { operation: 'download' } },
  ftpTool: { type: 'n8n-nodes-base.ftp', typeVersion: 1, defaultParams: { operation: 'download' } },
  
  // Utilidades
  calculatorTool: { type: '@n8n/n8n-nodes-langchain.toolCalculator', typeVersion: 1, defaultParams: {} },
  codeTool: { type: '@n8n/n8n-nodes-langchain.toolCode', typeVersion: 1, defaultParams: { language: 'javascript' } },
  dateTimeTool: { type: 'n8n-nodes-base.dateTime', typeVersion: 2, defaultParams: { operation: 'format' } },
  cryptoTool: { type: 'n8n-nodes-base.crypto', typeVersion: 1, defaultParams: { action: 'hash' } },
  ifTool: { type: 'n8n-nodes-base.if', typeVersion: 2.2, defaultParams: {} },
  switchTool: { type: 'n8n-nodes-base.switch', typeVersion: 3.2, defaultParams: {} },
  mergeTool: { type: 'n8n-nodes-base.merge', typeVersion: 3, defaultParams: { mode: 'combine' } },
  splitTool: { type: 'n8n-nodes-base.splitInBatches', typeVersion: 3, defaultParams: { batchSize: 10 } },
  waitTool: { type: 'n8n-nodes-base.wait', typeVersion: 1.1, defaultParams: { resume: 'timeInterval', amount: 1, unit: 'minutes' } },
  scheduleTool: { type: 'n8n-nodes-base.scheduleTrigger', typeVersion: 1.2, defaultParams: { rule: { interval: [{ field: 'hours', minutesInterval: 1 }] } } },
};

interface N8nApiRequest {
  action: 'list_workflows' | 'get_workflow' | 'activate_workflow' | 'deactivate_workflow' | 
          'get_executions' | 'get_execution' | 'create_workflow' | 'update_workflow' | 
          'delete_workflow' | 'get_workflow_tags' | 'test_connection' | 'duplicate_workflow' |
          'update_system_prompt' | 'create_credential' | 'list_credentials' | 'delete_credential' |
          'update_llm_config' | 'update_memory_config' | 'sync_tools' | 'get_available_tools';
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
  // Para update_memory_config
  memoryNodeId?: string;
  sessionIdKey?: string;
  contextWindowSize?: number;
  // Para sync_tools
  enabledTools?: string[];
  toolsConfig?: Record<string, Record<string, any>>;
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
        if (!model) throw new Error('model é obrigatório');
        
        // Provider é opcional - se não fornecido, detectamos do modelo
        const detectedProvider = model.toLowerCase().includes('gpt') || model.toLowerCase().includes('openai') ? 'openai' : 'google';
        const actualProvider = provider || detectedProvider;
        
        console.log(`n8n-api: Atualizando LLM config do workflow ${workflowId} para ${actualProvider}/${model}`);
        
        // Determinar tipo de credencial
        const credentialType = actualProvider === 'openai' ? 'openAiApi' : 'googlePalmApi';
        const credKey = credentialType;
        const nodeType = actualProvider === 'openai' 
          ? '@n8n/n8n-nodes-langchain.lmChatOpenAi'
          : '@n8n/n8n-nodes-langchain.lmChatGoogleGemini';
        
        let credentialId: string | null = null;
        let credentialName: string | null = null;
        
        // Se API key foi fornecida, criar nova credencial
        if (apiKey) {
          console.log(`n8n-api: API key fornecida, buscando schema de credencial ${credentialType}`);
          
          try {
            // 1. Buscar schema da credencial para saber campos obrigatórios
            const schema = await n8nRequest(`/credentials/schema/${credentialType}`);
            console.log(`n8n-api: Schema obtido:`, JSON.stringify(schema));
            
            // 2. Montar dados da credencial baseado no tipo
            const credData: Record<string, any> = {};
            
            // Adicionar apiKey (sempre obrigatório)
            credData.apiKey = apiKey;
            
            // Para OpenAI, o schema tem campos condicionais que precisam ser configurados
            if (actualProvider === 'openai') {
              // header: false evita que exija headerName e headerValue
              credData.header = false;
              // allowedHttpRequestDomains: 'all' evita que exija allowedDomains
              credData.allowedHttpRequestDomains = 'all';
            }
            
            // Para Google, adicionar host
            if (actualProvider === 'google') {
              credData.host = 'https://generativelanguage.googleapis.com';
            }
            
            console.log(`n8n-api: Dados da credencial:`, JSON.stringify(credData));
            
            // 3. Criar credencial
            const credName = `Cliente_${actualProvider}_${Date.now()}`;
            const newCredential = await n8nRequest('/credentials', 'POST', {
              name: credName,
              type: credentialType,
              data: credData,
            });
            
            credentialId = newCredential.id;
            credentialName = credName;
            console.log(`n8n-api: Credencial criada com ID ${credentialId}`);
            
          } catch (credError: any) {
            console.warn(`n8n-api: Erro ao criar credencial: ${credError.message}`);
            console.log(`n8n-api: Continuando sem criar credencial, apenas atualizando modelo`);
          }
        }
        
        // 4. Buscar workflow completo
        const workflow = await n8nRequest(`/workflows/${workflowId}`);
        const wasActive = workflow.active;
        
        // 5. Encontrar o nó LLM (Chat Model) no workflow
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
        
        // 6. Atualizar o nó LLM
        const updatedNodes = [...workflow.nodes];
        const llmNode = { ...updatedNodes[llmNodeIndex] };
        
        // Atualizar tipo do nó se estiver trocando de provedor
        llmNode.type = nodeType;
        
        // Se credencial foi criada, atualizar no nó
        if (credentialId && credentialName) {
          llmNode.credentials = {
            [credKey]: {
              id: credentialId,
              name: credentialName,
            }
          };
          console.log(`n8n-api: Credencial atualizada no nó: ${credentialName}`);
        } else {
          console.log(`n8n-api: Mantendo credenciais existentes: ${JSON.stringify(llmNode.credentials || {})}`);
        }
        
        // Atualizar modelo nos parâmetros
        llmNode.parameters = llmNode.parameters || {};
        
        // Para Gemini, o campo é modelName; para OpenAI é model
        if (actualProvider === 'google') {
          llmNode.parameters.modelName = model;
          delete llmNode.parameters.model;
          console.log(`n8n-api: Definindo modelName (Gemini) = ${model}`);
        } else {
          llmNode.parameters.model = model;
          delete llmNode.parameters.modelName;
          console.log(`n8n-api: Definindo model (OpenAI) = ${model}`);
        }
        
        updatedNodes[llmNodeIndex] = llmNode;
        
        // 7. Enviar workflow atualizado
        const updatePayload = {
          name: workflow.name,
          nodes: updatedNodes,
          connections: workflow.connections,
          ...(workflow.settings && { settings: workflow.settings }),
        };
        
        console.log(`n8n-api: Enviando atualização do workflow`);
        const savedWorkflow = await n8nRequest(`/workflows/${workflowId}`, 'PUT', updatePayload);
        
        // 8. Reativar workflow se estava ativo
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
          message: credentialId 
            ? `LLM atualizado: ${actualProvider}/${model} com nova credencial`
            : `Modelo LLM atualizado para: ${model} (credencial mantida)`,
          workflowId: savedWorkflow.id,
          provider: actualProvider,
          model,
          llmNodeType: nodeType,
          ...(credentialId && { credentialId, credentialName }),
        };
        break;
      }

      // ========== UPDATE MEMORY CONFIG (PostgreSQL VPS) ==========
      case 'update_memory_config': {
        if (!workflowId) throw new Error('workflowId é obrigatório');
        
        console.log(`n8n-api: Atualizando memória PostgreSQL do workflow ${workflowId}`);
        
        // Configurações fixas do PostgreSQL da VPS (para referência)
        const POSTGRES_HOST = '151.243.24.146';
        const POSTGRES_DATABASE = 'n8n';
        const POSTGRES_USER = 'n8n';
        
        // 1. Buscar workflow completo
        const workflow = await n8nRequest(`/workflows/${workflowId}`);
        const wasActive = workflow.active;
        
        // 2. Encontrar o nó de memória (Postgres Chat Memory)
        const targetMemoryNodeId = requestBody.memoryNodeId;
        let memoryNodeIndex = -1;
        
        if (targetMemoryNodeId) {
          memoryNodeIndex = workflow.nodes.findIndex((node: any) => node.id === targetMemoryNodeId);
        }
        
        // Fallback: buscar por tipo de nó de memória
        if (memoryNodeIndex === -1) {
          memoryNodeIndex = workflow.nodes.findIndex((node: any) => 
            node.type === '@n8n/n8n-nodes-langchain.memoryPostgresChat' ||
            node.type === '@n8n/n8n-nodes-langchain.memoryBufferWindow' ||
            node.type?.includes('memory')
          );
        }
        
        if (memoryNodeIndex === -1) {
          throw new Error('Nó de memória não encontrado no workflow. Adicione um nó "Postgres Chat Memory" manualmente no n8n primeiro.');
        }
        
        // 3. Atualizar parâmetros do nó de memória existente (mantendo credenciais)
        console.log(`n8n-api: Nó de memória encontrado no índice ${memoryNodeIndex}, tipo: ${workflow.nodes[memoryNodeIndex].type}`);
        
        const updatedNodes = [...workflow.nodes];
        const memoryNode = { ...updatedNodes[memoryNodeIndex] };
        
        // Manter credenciais existentes do nó
        const existingCredentials = memoryNode.credentials;
        console.log(`n8n-api: Mantendo credenciais existentes:`, JSON.stringify(existingCredentials));
        
        // Atualizar parâmetros do nó
        memoryNode.parameters = memoryNode.parameters || {};
        memoryNode.parameters.sessionIdType = 'customKey';
        
        // Definir sessionKey como expression (não string fixa)
        const sessionKeyExpression = requestBody.sessionIdKey || '={{ $json.session_id }}';
        memoryNode.parameters.sessionKey = `=${sessionKeyExpression.startsWith('=') ? sessionKeyExpression.slice(1) : sessionKeyExpression}`;
        
        memoryNode.parameters.tableName = 'n8n_chat_histories';
        
        if (requestBody.contextWindowSize) {
          memoryNode.parameters.contextWindowLength = requestBody.contextWindowSize;
        }
        
        updatedNodes[memoryNodeIndex] = memoryNode;
        
        // 4. Enviar workflow atualizado
        const updatePayload = {
          name: workflow.name,
          nodes: updatedNodes,
          connections: workflow.connections,
          ...(workflow.settings && { settings: workflow.settings }),
        };
        
        console.log(`n8n-api: Enviando atualização do workflow com memória atualizada`);
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
          message: 'Configuração de memória atualizada com sucesso',
          workflowId: savedWorkflow.id,
          memoryNodeId: memoryNode.id,
          memoryNodeType: memoryNode.type,
          parameters: {
            sessionKey: memoryNode.parameters.sessionKey,
            tableName: memoryNode.parameters.tableName,
            contextWindowLength: memoryNode.parameters.contextWindowLength,
          },
          postgresConfig: {
            host: POSTGRES_HOST,
            database: POSTGRES_DATABASE,
            user: POSTGRES_USER,
            note: 'Credenciais PostgreSQL mantidas do nó existente no n8n'
          }
        };
        break;
      }

      // ========== GET AVAILABLE TOOLS ==========
      case 'get_available_tools': {
        console.log(`n8n-api: Listando ferramentas disponíveis`);
        
        const tools = Object.entries(N8N_TOOLS_CONFIG).map(([id, config]) => ({
          id,
          type: config.type,
          typeVersion: config.typeVersion,
          hasDefaultParams: Object.keys(config.defaultParams).length > 0,
        }));
        
        result = {
          success: true,
          tools,
          totalCount: tools.length,
        };
        break;
      }

      // ========== SYNC TOOLS (Sincronizar ferramentas completas com configurações) ==========
      case 'sync_tools': {
        if (!workflowId) throw new Error('workflowId é obrigatório');
        if (!requestBody.enabledTools || !Array.isArray(requestBody.enabledTools)) {
          throw new Error('enabledTools é obrigatório e deve ser um array de IDs de ferramentas');
        }
        
        const enabledToolIds = requestBody.enabledTools as string[];
        const toolsConfig = requestBody.toolsConfig || {};
        
        console.log(`n8n-api: Sincronizando ${enabledToolIds.length} ferramentas com workflow ${workflowId}`);
        console.log(`n8n-api: Ferramentas habilitadas: ${enabledToolIds.join(', ')}`);
        console.log(`n8n-api: Configurações recebidas:`, JSON.stringify(toolsConfig, null, 2));
        
        // Mapeamento de IDs do frontend para tipos n8n
        const TOOL_TYPE_MAP: Record<string, { type: string; typeVersion: number; isLangchain: boolean }> = {
          httpRequest: { type: 'n8n-nodes-base.httpRequest', typeVersion: 4.3, isLangchain: false },
          webhook: { type: 'n8n-nodes-base.webhook', typeVersion: 2.1, isLangchain: false },
          gmail: { type: 'n8n-nodes-base.gmail', typeVersion: 2.1, isLangchain: false },
          slack: { type: 'n8n-nodes-base.slack', typeVersion: 2.2, isLangchain: false },
          discord: { type: 'n8n-nodes-base.discord', typeVersion: 2, isLangchain: false },
          telegram: { type: 'n8n-nodes-base.telegram', typeVersion: 1.2, isLangchain: false },
          whatsapp: { type: 'n8n-nodes-base.whatsApp', typeVersion: 1, isLangchain: false },
          googleSheets: { type: 'n8n-nodes-base.googleSheets', typeVersion: 4.5, isLangchain: false },
          airtable: { type: 'n8n-nodes-base.airtable', typeVersion: 2.1, isLangchain: false },
          notion: { type: 'n8n-nodes-base.notion', typeVersion: 2.2, isLangchain: false },
          supabase: { type: 'n8n-nodes-base.supabase', typeVersion: 1, isLangchain: false },
          postgres: { type: 'n8n-nodes-base.postgres', typeVersion: 2.5, isLangchain: false },
          mongodb: { type: 'n8n-nodes-base.mongoDb', typeVersion: 1.1, isLangchain: false },
          serpApi: { type: '@n8n/n8n-nodes-langchain.toolSerpApi', typeVersion: 1, isLangchain: true },
          wikipedia: { type: '@n8n/n8n-nodes-langchain.toolWikipedia', typeVersion: 1, isLangchain: true },
          wolframAlpha: { type: '@n8n/n8n-nodes-langchain.toolWolframAlpha', typeVersion: 1, isLangchain: true },
          code: { type: '@n8n/n8n-nodes-langchain.toolCode', typeVersion: 1, isLangchain: true },
          calculator: { type: '@n8n/n8n-nodes-langchain.toolCalculator', typeVersion: 1, isLangchain: true },
          // Compatibilidade com IDs antigos
          httpRequestTool: { type: 'n8n-nodes-base.httpRequest', typeVersion: 4.3, isLangchain: false },
          calculatorTool: { type: '@n8n/n8n-nodes-langchain.toolCalculator', typeVersion: 1, isLangchain: true },
          serpApiTool: { type: '@n8n/n8n-nodes-langchain.toolSerpApi', typeVersion: 1, isLangchain: true },
          wikipediaTool: { type: '@n8n/n8n-nodes-langchain.toolWikipedia', typeVersion: 1, isLangchain: true },
          codeTool: { type: '@n8n/n8n-nodes-langchain.toolCode', typeVersion: 1, isLangchain: true },
        };

        // Função para converter configurações do frontend para parâmetros n8n
        const convertToolConfig = (toolId: string, cfg: any): any => {
          const params: any = {};
          
          // HTTP Request
          if (toolId === 'httpRequest' || toolId === 'httpRequestTool') {
            if (cfg.httpMethod) params.method = cfg.httpMethod;
            if (cfg.httpUrl) params.url = cfg.httpUrl;
            if (cfg.httpAuthentication && cfg.httpAuthentication !== 'none') {
              params.authentication = cfg.httpAuthentication;
            }
            if (cfg.httpHeaders?.length > 0) {
              params.sendHeaders = true;
              params.headerParameters = {
                parameters: cfg.httpHeaders.filter((h: any) => h.name && h.value)
              };
            }
            if (cfg.httpQueryParams?.length > 0) {
              params.sendQuery = true;
              params.queryParameters = {
                parameters: cfg.httpQueryParams.filter((p: any) => p.name && p.value)
              };
            }
            if (cfg.httpBody && ['POST', 'PUT', 'PATCH'].includes(cfg.httpMethod)) {
              params.sendBody = true;
              params.contentType = cfg.httpBodyContentType || 'json';
              if (cfg.httpBodyContentType === 'json') {
                try {
                  params.bodyParameters = { parameters: JSON.parse(cfg.httpBody) };
                } catch {
                  params.body = cfg.httpBody;
                }
              } else {
                params.body = cfg.httpBody;
              }
            }
            if (cfg.httpTimeout) params.timeout = cfg.httpTimeout;
            if (cfg.httpFollowRedirects === false) params.allowUnauthorizedCerts = false;
            if (cfg.httpIgnoreSSL) params.allowUnauthorizedCerts = true;
            if (cfg.httpRetryOnFail) {
              params.options = params.options || {};
              params.options.retry = { enabled: true, maxTries: cfg.httpMaxRetries || 3 };
            }
            if (cfg.httpResponseFormat && cfg.httpResponseFormat !== 'autodetect') {
              params.options = params.options || {};
              params.options.response = { response: { responseFormat: cfg.httpResponseFormat } };
            }
            // Auth específico
            if (cfg.httpAuthentication === 'basicAuth') {
              params.genericCredentialType = 'httpBasicAuth';
            }
            if (cfg.httpAuthentication === 'headerAuth' && cfg.httpHeaderAuthName) {
              params.sendHeaders = true;
              params.headerParameters = params.headerParameters || { parameters: [] };
              params.headerParameters.parameters.push({
                name: cfg.httpHeaderAuthName,
                value: cfg.httpHeaderAuthValue || ''
              });
            }
          }
          
          // Webhook
          if (toolId === 'webhook') {
            if (cfg.webhookPath) params.path = cfg.webhookPath;
            if (cfg.webhookHttpMethod) params.httpMethod = cfg.webhookHttpMethod;
            if (cfg.webhookAuthentication && cfg.webhookAuthentication !== 'none') {
              params.authentication = cfg.webhookAuthentication;
            }
            if (cfg.webhookResponseMode) params.responseMode = cfg.webhookResponseMode;
            if (cfg.webhookResponseData) params.responseData = cfg.webhookResponseData;
            if (cfg.webhookResponseCode) params.responseCode = cfg.webhookResponseCode;
            if (cfg.webhookResponseHeaders?.length > 0) {
              params.options = params.options || {};
              params.options.responseHeaders = {
                entries: cfg.webhookResponseHeaders.filter((h: any) => h.name && h.value)
              };
            }
          }
          
          // Code
          if (toolId === 'code' || toolId === 'codeTool') {
            if (cfg.codeLanguage) params.language = cfg.codeLanguage === 'python' ? 'python' : 'javaScript';
            if (cfg.codeContent) params.jsCode = cfg.codeContent;
          }
          
          // Credenciais genéricas
          if (cfg.apiKey) {
            params._credentials = { apiKey: cfg.apiKey };
          }
          if (cfg.accessToken) {
            params._credentials = { ...params._credentials, accessToken: cfg.accessToken };
          }
          
          return params;
        };
        
        // 1. Buscar workflow completo
        const workflow = await n8nRequest(`/workflows/${workflowId}`);
        const wasActive = workflow.active;
        
        // 2. Identificar o nó AI Agent para conectar as ferramentas
        let agentNodeName: string | null = null;
        const agentNodeIndex = workflow.nodes.findIndex((node: any) => 
          node.type === '@n8n/n8n-nodes-langchain.agent'
        );
        
        if (agentNodeIndex !== -1) {
          agentNodeName = workflow.nodes[agentNodeIndex].name;
          console.log(`n8n-api: AI Agent encontrado: ${agentNodeName}`);
        } else {
          console.warn(`n8n-api: AI Agent não encontrado, ferramentas serão adicionadas sem conexão`);
        }
        
        // 3. Coletar tipos existentes e nós que NÃO são ferramentas gerenciadas
        const managedToolTypes = Object.values(TOOL_TYPE_MAP).map(t => t.type);
        const existingManagedNodes: any[] = [];
        const nonToolNodes: any[] = [];
        
        workflow.nodes.forEach((node: any) => {
          if (managedToolTypes.includes(node.type)) {
            existingManagedNodes.push(node);
          } else {
            nonToolNodes.push(node);
          }
        });
        
        console.log(`n8n-api: Workflow tem ${nonToolNodes.length} nós não-ferramenta e ${existingManagedNodes.length} ferramentas existentes`);
        
        // 4. Criar/Atualizar nós de ferramentas
        const newToolNodes: any[] = [];
        const updatedToolNodes: any[] = [];
        let currentY = 200;
        const baseX = 1400;
        const ySpacing = 150;
        
        for (const toolId of enabledToolIds) {
          const toolMapping = TOOL_TYPE_MAP[toolId];
          if (!toolMapping) {
            console.warn(`n8n-api: Ferramenta desconhecida: ${toolId}`);
            continue;
          }
          
          const toolConfig = toolsConfig[toolId] || {};
          const convertedParams = convertToolConfig(toolId, toolConfig);
          
          // Verificar se já existe um nó desse tipo
          const existingNode = existingManagedNodes.find(n => n.type === toolMapping.type);
          
          if (existingNode) {
            // Atualizar nó existente com novas configurações
            console.log(`n8n-api: Atualizando ferramenta existente: ${existingNode.name} (${toolMapping.type})`);
            const updatedNode = {
              ...existingNode,
              parameters: {
                ...existingNode.parameters,
                ...convertedParams,
              },
            };
            // Remover campos internos de credenciais
            if (updatedNode.parameters._credentials) {
              delete updatedNode.parameters._credentials;
            }
            updatedToolNodes.push(updatedNode);
          } else {
            // Criar novo nó
            const toolName = toolId.charAt(0).toUpperCase() + toolId.slice(1).replace(/([A-Z])/g, ' $1').trim();
            console.log(`n8n-api: Criando nova ferramenta: ${toolName} (${toolMapping.type})`);
            
            const newNode: any = {
              parameters: convertedParams,
              type: toolMapping.type,
              typeVersion: toolMapping.typeVersion,
              position: [baseX, currentY],
              id: crypto.randomUUID(),
              name: toolName,
            };
            // Remover campos internos de credenciais
            if (newNode.parameters._credentials) {
              delete newNode.parameters._credentials;
            }
            newToolNodes.push(newNode);
            currentY += ySpacing;
          }
        }
        
        // 5. Montar array final de nós
        const allToolNodes = [...updatedToolNodes, ...newToolNodes];
        const updatedNodes = [...nonToolNodes, ...allToolNodes];
        
        console.log(`n8n-api: Total de nós: ${nonToolNodes.length} base + ${allToolNodes.length} ferramentas = ${updatedNodes.length}`);
        
        // 6. Atualizar conexões
        const updatedConnections = { ...workflow.connections };
        
        // Remover conexões antigas de ferramentas gerenciadas que não existem mais
        const currentToolNames = allToolNodes.map(n => n.name);
        Object.keys(updatedConnections).forEach(nodeName => {
          const node = existingManagedNodes.find(n => n.name === nodeName);
          if (node && !currentToolNames.includes(nodeName)) {
            delete updatedConnections[nodeName];
          }
        });
        
        // Adicionar conexões das novas ferramentas Langchain ao AI Agent
        if (agentNodeName) {
          for (const toolNode of allToolNodes) {
            const toolMapping = Object.values(TOOL_TYPE_MAP).find(t => t.type === toolNode.type);
            if (toolMapping?.isLangchain) {
              // Ferramentas Langchain conectam via ai_tool
              if (!updatedConnections[toolNode.name] || !updatedConnections[toolNode.name].ai_tool) {
                updatedConnections[toolNode.name] = {
                  ...updatedConnections[toolNode.name],
                  ai_tool: [[{ node: agentNodeName, type: 'ai_tool', index: 0 }]]
                };
                console.log(`n8n-api: Conectando ${toolNode.name} ao ${agentNodeName} via ai_tool`);
              }
            }
          }
        }
        
        // 7. Enviar workflow atualizado
        const updatePayload = {
          name: workflow.name,
          nodes: updatedNodes,
          connections: updatedConnections,
          ...(workflow.settings && { settings: workflow.settings }),
        };
        
        console.log(`n8n-api: Enviando workflow com ${updatedNodes.length} nós`);
        const savedWorkflow = await n8nRequest(`/workflows/${workflowId}`, 'PUT', updatePayload);
        
        // 8. Reativar workflow se estava ativo
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
          message: `Ferramentas sincronizadas com sucesso`,
          workflowId: savedWorkflow.id,
          summary: {
            totalTools: allToolNodes.length,
            added: newToolNodes.map(t => t.name),
            updated: updatedToolNodes.map(t => t.name),
            baseNodes: nonToolNodes.length,
          },
          toolNodes: allToolNodes.map(t => ({ 
            name: t.name, 
            type: t.type, 
            id: t.id,
            hasParams: Object.keys(t.parameters || {}).length > 0
          })),
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
