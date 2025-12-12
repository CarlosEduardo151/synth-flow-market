import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// n8n API Configuration
const N8N_BASE_URL = Deno.env.get('N8N_BASE_URL') || 'https://n8n.starai.com.br';
const N8N_API_KEY = Deno.env.get('N8N_API_KEY');

// Template do workflow WhatsApp Bot
const WHATSAPP_BOT_TEMPLATE = {
  nodes: [
    {
      parameters: {
        httpMethod: "POST",
        path: "starai-receber",
        options: {}
      },
      type: "n8n-nodes-base.webhook",
      typeVersion: 2.1,
      position: [-672, 80],
      id: "f889ecdf-98fc-4f05-bce6-5946154f6147",
      name: "Webhook",
      webhookId: "0988b415-98e1-4845-a3d5-9b00350b5a7a"
    },
    {
      parameters: {
        url: "={{ $('Webhook').item.json.body.audio.audioUrl }}",
        options: {}
      },
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [96, 224],
      id: "a9aebdd8-ea19-4937-9002-13f0cd313842",
      name: "HTTP Request"
    },
    {
      parameters: {
        promptType: "define",
        text: "={{ $json.content.parts[0].text }} {{ $('Webhook').item.json.body.text.message }}",
        options: {
          systemMessage: "Você é o agente StarAI.\nAnalise textos, imagens, áudios e códigos de forma objetiva.\n\nComprovantes de pagamento: informe horário da transação, valor pago, nome do pagador e confirme se o destinatário é CARLOS EDUARDO FERREIRA MORORO.\nCódigos: identifique erros, explique trechos e sugira melhorias apenas se for pedido.\nÁudios: transcreva com precisão primeiro e depois analise.\nImagens: descreva o que vê e extraia dados úteis.\n\nResponda sempre em português, de forma curta e direta, sem textos longos.\nTodos os dados pedidos devem ser enviados para o Agent Tool.\n\nPara buscar informações que não se comprometem a nossos serviços como peças de veiculos usar o tool do http requests ou entrar nesse site: https://www.orenrefrigeracao.com.br/"
        }
      },
      type: "@n8n/n8n-nodes-langchain.agent",
      typeVersion: 2.2,
      position: [512, 96],
      id: "4b976303-6f3b-4063-bfea-8ad7307032ee",
      name: "AI Agent"
    },
    {
      parameters: {
        rules: {
          values: [
            {
              conditions: {
                options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
                conditions: [{ leftValue: "={{ $('Webhook').item.json.body.audio }}", rightValue: "", operator: { type: "object", operation: "exists", singleValue: true }, id: "17681c8b-aebc-4eae-b9f5-c4f90f92999c" }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "Entregar Audio"
            },
            {
              conditions: {
                options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
                conditions: [{ id: "79702cc5-c7ec-4ea5-bf13-4a8b0160eee7", leftValue: "={{ $('Webhook').item.json.body.text }}", rightValue: "", operator: { type: "object", operation: "exists", singleValue: true } }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "Entregar texto"
            },
            {
              conditions: {
                options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
                conditions: [{ id: "e244a4d8-fbca-4315-9ecc-d183e6aade21", leftValue: "={{ $('Webhook').item.json.body.image }}", rightValue: "", operator: { type: "object", operation: "exists", singleValue: true } }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "Entregar Imagem"
            }
          ]
        },
        options: {}
      },
      type: "n8n-nodes-base.switch",
      typeVersion: 3.2,
      position: [880, 96],
      id: "575bc155-270d-4d67-8929-56a4f4503bd7",
      name: "Switch1"
    },
    {
      parameters: { operation: "binaryToPropery", options: {} },
      type: "n8n-nodes-base.extractFromFile",
      typeVersion: 1,
      position: [1184, -32],
      id: "9e9e0e5a-42b8-480f-85a4-4bf65445439b",
      name: "Extract from File"
    },
    {
      parameters: { url: "={{ $('Webhook').item.json.body.image.imageUrl }}", options: {} },
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [160, -32],
      id: "84124266-3a09-4fdd-aad8-2f9741c4000b",
      name: "HTTP Request3"
    },
    {
      parameters: {
        method: "POST",
        url: "https://api.z-api.io/instances/3E73F76616FE80C4C4E8EE5C772D9ACD/token/EE6A11EC4751F34E3421CDB7/send-text",
        sendHeaders: true,
        headerParameters: { parameters: [{ name: "client-token", value: "Fb79516ee08ba4bd1b50a9d923ff53109S" }] },
        sendBody: true,
        bodyParameters: { parameters: [{ name: "phone", value: "={{ $('Webhook').item.json.body.phone }}" }, { name: "audio", value: "=data:data/mpeg;base64,{{ $json.data }}" }, { name: "message", value: "\"\"" }, { name: "messageId", value: "={{ $('Webhook').item.json.body.messageId }}" }] },
        options: {}
      },
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1312, -32],
      id: "87432fc6-32ba-4411-85db-96ec52631897",
      name: "Enviar Aúdio"
    },
    {
      parameters: {
        method: "POST",
        url: "https://api.z-api.io/instances/3E73F76616FE80C4C4E8EE5C772D9ACD/token/EE6A11EC4751F34E3421CDB7/send-text",
        sendHeaders: true,
        headerParameters: { parameters: [{ name: "client-token", value: "Fb79516ee08ba4bd1b50a9d923ff53109S" }] },
        sendBody: true,
        bodyParameters: { parameters: [{ name: "phone", value: "={{ $('Webhook').item.json.body.phone }}" }, { name: "message", value: "={{ $('Analyze image').item.json.content }}" }, { name: "messageId", value: "={{ $('Webhook').item.json.body.messageId }}" }] },
        options: {}
      },
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1120, 256],
      id: "b167c2b0-69f3-45d8-b029-9b4f2e8df8ea",
      name: "Enviar Relátorio"
    },
    {
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
          conditions: [{ id: "370a7c82-47ea-4d29-a474-fec148753e0f", leftValue: "={{ $json.body.image.caption }}", rightValue: "", operator: { type: "string", operation: "exists", singleValue: true } }],
          combinator: "and"
        },
        options: {}
      },
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      position: [288, -32],
      id: "7b30b95e-adbe-493f-befe-78903c5d300b",
      name: "Image Caption"
    },
    {
      parameters: {
        assignments: { assignments: [{ id: "9a8b79d2-fa36-4750-95a2-8921e9fa85c6", name: "BotName", value: "StarAI", type: "string" }] },
        options: {}
      },
      type: "n8n-nodes-base.set",
      typeVersion: 3.4,
      position: [-560, 80],
      id: "744145d7-fe8c-4a05-aec5-52024a2b9dcc",
      name: "Configuração Global"
    },
    {
      parameters: {
        operation: "get",
        propertyName: "isBlocked",
        key: "={{ $('Configuração Global').item.json.BotName }}{{ $('Webhook').item.json.body.phone }}_block",
        options: {}
      },
      type: "n8n-nodes-base.redis",
      typeVersion: 1,
      position: [-336, 80],
      id: "e8697c59-455e-4f8d-ad61-5c7304bbc57e",
      name: "Pegar Key",
      credentials: { redis: { id: "Uh0Eip2KaBvMyrLR", name: "Redis account" } }
    },
    {
      parameters: {
        operation: "set",
        key: "={{ $('Configuração Global').item.json.BotName }}{{ $('Webhook').item.json.body.phone }}_block",
        value: "true",
        expire: true,
        ttl: 300
      },
      type: "n8n-nodes-base.redis",
      typeVersion: 1,
      position: [-336, -208],
      id: "5284e4e5-7b39-494b-9d05-77a4683b0e1c",
      name: "Setar Key",
      credentials: { redis: { id: "Uh0Eip2KaBvMyrLR", name: "Redis account" } }
    },
    {
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
          conditions: [{ id: "71c2c8cc-d0cf-46a4-8558-fd99805f0bc9", leftValue: "={{ $('Webhook').item.json.body.fromMe }}", rightValue: "", operator: { type: "boolean", operation: "true", singleValue: true } }],
          combinator: "and"
        },
        looseTypeValidation: true,
        options: {}
      },
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      position: [-448, 80],
      id: "198c86a2-949b-48b2-907e-74e897485224",
      name: "FromMe?"
    },
    {
      parameters: {
        conditions: {
          options: { caseSensitive: true, leftValue: "", typeValidation: "loose", version: 2 },
          conditions: [{ id: "1fb1b6f8-da74-44c1-a408-b36e90f8cd07", leftValue: "={{ $json.isBlocked }}", rightValue: "", operator: { type: "string", operation: "exists", singleValue: true } }],
          combinator: "and"
        },
        looseTypeValidation: true,
        options: {}
      },
      type: "n8n-nodes-base.if",
      typeVersion: 2.2,
      position: [-224, 80],
      id: "5f1db4c9-fbff-42c3-95b1-507aa6651ace",
      name: "IsBlocked"
    },
    {
      parameters: {},
      type: "n8n-nodes-base.noOp",
      typeVersion: 1,
      position: [-112, -224],
      id: "d73221ed-0d86-40ab-af7a-1ba8e5ec1bf2",
      name: "Sem operação"
    },
    {
      parameters: {
        rules: {
          values: [
            {
              conditions: {
                options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
                conditions: [{ leftValue: "={{ $('Webhook').item.json.body.image }}", rightValue: "", operator: { type: "object", operation: "exists", singleValue: true }, id: "be92692f-67ba-4dd4-90e4-396cafb23e51" }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "Imagem"
            },
            {
              conditions: {
                options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
                conditions: [{ id: "e64c580e-a85a-49c2-a150-a30176e0df1a", leftValue: "={{ $('Webhook').item.json.body.text }}", rightValue: "", operator: { type: "object", operation: "exists", singleValue: true } }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "Mensagem"
            },
            {
              conditions: {
                options: { caseSensitive: true, leftValue: "", typeValidation: "strict", version: 2 },
                conditions: [{ id: "0f39bcd6-61d0-4f4d-bbb3-2889dfe5ab4a", leftValue: "={{ $('Webhook').item.json.body.audio }}", rightValue: "", operator: { type: "object", operation: "exists", singleValue: true } }],
                combinator: "and"
              },
              renameOutput: true,
              outputKey: "Audio"
            }
          ]
        },
        options: {}
      },
      type: "n8n-nodes-base.switch",
      typeVersion: 3.2,
      position: [-80, 80],
      id: "df1ab8cd-9d80-4d33-834f-a856dc013b86",
      name: "Separador"
    },
    {
      parameters: {
        method: "POST",
        url: "https://api.z-api.io/instances/3E73F76616FE80C4C4E8EE5C772D9ACD/token/EE6A11EC4751F34E3421CDB7/send-text",
        sendHeaders: true,
        headerParameters: { parameters: [{ name: "client-token", value: "Fb79516ee08ba4bd1b50a9d923ff53109S" }] },
        sendBody: true,
        bodyParameters: { parameters: [{ name: "phone", value: "={{ $('Webhook').item.json.body.phone }}" }, { name: "message", value: "={{ $('AI Agent').item.json.output }}" }, { name: "messageId", value: "={{ $('Webhook').item.json.body.messageId }}" }] },
        options: {}
      },
      type: "n8n-nodes-base.httpRequest",
      typeVersion: 4.2,
      position: [1312, 128],
      id: "4e81149d-e6f5-4751-8a09-9bb1b52bf413",
      name: "HTTP Request1"
    },
    {
      parameters: {
        method: "POST",
        url: "https://agndhravgmcwpdjkozka.supabase.co/functions/v1/dashboard-webhook?config_id=89efce08-0fb4-4c24-91fb-1f7baf6b20b7",
        options: {}
      },
      type: "n8n-nodes-base.httpRequestTool",
      typeVersion: 4.2,
      position: [832, 368],
      id: "99b7c232-434b-485e-951f-084cdedda528",
      name: "HTTP Request4"
    },
    {
      parameters: { tableName: "={{ $('Webhook').item.json.body.phone }}" },
      type: "@n8n/n8n-nodes-langchain.memoryPostgresChat",
      typeVersion: 1.3,
      position: [736, 368],
      id: "1dc69512-8e33-4e98-8b68-403cd52b7902",
      name: "Postgres Chat Memory",
      credentials: { postgres: { id: "rs8jsBSB4RkypUTO", name: "Postgres account" } },
      disabled: true
    },
    {
      parameters: {
        resource: "audio",
        modelId: { __rl: true, value: "models/gemini-2.5-flash", mode: "list", cachedResultName: "models/gemini-2.5-flash" },
        inputType: "binary",
        options: {}
      },
      type: "@n8n/n8n-nodes-langchain.googleGemini",
      typeVersion: 1,
      position: [304, 224],
      id: "df5a9e67-c7aa-44be-8a17-a7786dcdf969",
      name: "Transcribe a recording1",
      credentials: { googlePalmApi: { id: "hp4kJcV7iMocs91A", name: "Google Gemini(PaLM) Api account" } }
    },
    {
      parameters: {
        resource: "image",
        operation: "analyze",
        modelId: { __rl: true, value: "models/gemini-2.5-flash", mode: "list", cachedResultName: "models/gemini-2.5-flash" },
        text: "={{ $('Webhook').item.json.body.image.caption }} fale sempre em português Brasil.",
        inputType: "binary",
        options: {}
      },
      type: "@n8n/n8n-nodes-langchain.googleGemini",
      typeVersion: 1,
      position: [464, -32],
      id: "5d52a361-ea0e-4f37-bca2-6782ba49e39d",
      name: "Analyze an image",
      credentials: { googlePalmApi: { id: "hp4kJcV7iMocs91A", name: "Google Gemini(PaLM) Api account" } }
    },
    {
      parameters: { options: {} },
      type: "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
      typeVersion: 1,
      position: [464, 320],
      id: "0ebd78f4-a0e4-4756-9add-1340bf99c2f0",
      name: "Google Gemini Chat Model",
      credentials: { googlePalmApi: { id: "hp4kJcV7iMocs91A", name: "Google Gemini(PaLM) Api account" } }
    }
  ],
  connections: {
    "Webhook": { main: [[{ node: "Configuração Global", type: "main", index: 0 }]] },
    "HTTP Request": { main: [[{ node: "Transcribe a recording1", type: "main", index: 0 }]] },
    "AI Agent": { main: [[{ node: "Switch1", type: "main", index: 0 }]] },
    "Switch1": { main: [[{ node: "HTTP Request1", type: "main", index: 0 }], [{ node: "HTTP Request1", type: "main", index: 0 }], [{ node: "Enviar Relátorio", type: "main", index: 0 }]] },
    "Extract from File": { main: [[{ node: "Enviar Aúdio", type: "main", index: 0 }]] },
    "HTTP Request3": { main: [[{ node: "Image Caption", type: "main", index: 0 }]] },
    "Image Caption": { main: [[{ node: "Analyze an image", type: "main", index: 0 }], [{ node: "Analyze an image", type: "main", index: 0 }]] },
    "Configuração Global": { main: [[{ node: "FromMe?", type: "main", index: 0 }]] },
    "Pegar Key": { main: [[{ node: "IsBlocked", type: "main", index: 0 }]] },
    "FromMe?": { main: [[{ node: "Setar Key", type: "main", index: 0 }], [{ node: "Pegar Key", type: "main", index: 0 }]] },
    "IsBlocked": { main: [[{ node: "Sem operação", type: "main", index: 0 }], [{ node: "Separador", type: "main", index: 0 }]] },
    "Separador": { main: [[{ node: "HTTP Request3", type: "main", index: 0 }], [{ node: "AI Agent", type: "main", index: 0 }], [{ node: "HTTP Request", type: "main", index: 0 }]] },
    "HTTP Request4": { ai_tool: [[{ node: "AI Agent", type: "ai_tool", index: 0 }]] },
    "Postgres Chat Memory": { ai_memory: [[{ node: "AI Agent", type: "ai_memory", index: 0 }]] },
    "Transcribe a recording1": { main: [[{ node: "AI Agent", type: "main", index: 0 }]] },
    "Analyze an image": { main: [[{ node: "AI Agent", type: "main", index: 0 }]] },
    "Google Gemini Chat Model": { ai_languageModel: [[{ node: "AI Agent", type: "ai_languageModel", index: 0 }]] }
  },
  pinData: {},
  meta: { templateCredsSetupCompleted: true, instanceId: "0ebb2642471f4caa036034b1550349722249bee1031ef8370bb171e76ad9174b" }
};

// Helper to make n8n API requests
async function n8nRequest(endpoint: string, method: string = 'GET', body?: any) {
  const url = `${N8N_BASE_URL}/api/v1${endpoint}`;
  
  console.log(`provision-workflow: ${method} ${url}`);
  
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
    console.error(`provision-workflow: Error response`, responseData);
    throw new Error(responseData.message || `n8n API error: ${response.status}`);
  }
  
  return responseData;
}

interface ProvisionRequest {
  customerProductId: string;
  customerEmail: string;
  productSlug: string;
  productTitle: string;
  platform?: 'whatsapp' | 'telegram';
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { 
      customerProductId, 
      customerEmail, 
      productSlug, 
      productTitle,
      platform = 'whatsapp'
    }: ProvisionRequest = await req.json();

    console.log(`provision-workflow: Provisionando workflow para ${customerEmail}, produto: ${productSlug}, plataforma: ${platform}`);

    // 1. Verificar se já existe um workflow para este customer_product
    const { data: existingProduct, error: fetchError } = await supabaseClient
      .from('customer_products')
      .select('n8n_workflow_id')
      .eq('id', customerProductId)
      .single();

    if (fetchError) {
      throw new Error(`Erro ao buscar customer_product: ${fetchError.message}`);
    }

    if (existingProduct?.n8n_workflow_id) {
      console.log(`provision-workflow: Workflow já existe: ${existingProduct.n8n_workflow_id}`);
      return new Response(JSON.stringify({
        success: true,
        message: 'Workflow já existente',
        workflowId: existingProduct.n8n_workflow_id,
        alreadyExists: true,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Criar nome do novo workflow no formato [email] Produto
    const workflowName = `[${customerEmail}] ${productTitle}`;

    // 3. Preparar template baseado na plataforma
    let workflowTemplate = WHATSAPP_BOT_TEMPLATE;
    
    // Gerar novos IDs únicos para os nodes
    const generateUUID = () => crypto.randomUUID();
    const nodesWithNewIds = workflowTemplate.nodes.map(node => ({
      ...node,
      id: generateUUID(),
      webhookId: node.webhookId ? generateUUID() : undefined,
    }));

    // 4. Preparar dados do novo workflow
    const newWorkflowData = {
      name: workflowName,
      nodes: nodesWithNewIds,
      connections: workflowTemplate.connections,
      settings: {},
      staticData: null,
      active: false, // Novo workflow começa desativado
    };

    console.log(`provision-workflow: Criando workflow: ${workflowName}`);

    // 5. Criar o novo workflow no n8n
    const newWorkflow = await n8nRequest('/workflows', 'POST', newWorkflowData);

    console.log(`provision-workflow: Workflow criado com ID: ${newWorkflow.id}`);

    // 6. Atualizar o customer_product com o workflow_id
    const { error: updateError } = await supabaseClient
      .from('customer_products')
      .update({ n8n_workflow_id: newWorkflow.id })
      .eq('id', customerProductId);

    if (updateError) {
      console.error(`provision-workflow: Erro ao atualizar customer_product:`, updateError);
      // Workflow foi criado, mas falhou ao salvar o ID - logar mas não falhar completamente
    }

    // 7. Criar configuração inicial do AI control
    const { error: configError } = await supabaseClient
      .from('ai_control_config')
      .upsert({
        customer_product_id: customerProductId,
        is_active: false,
        ai_model: 'models/gemini-2.5-flash',
        temperature: 0.7,
        max_tokens: 2048,
        business_name: 'Meu Negócio',
        configuration: {
          platform,
          provisioned_at: new Date().toISOString(),
          workflow_id: newWorkflow.id,
        },
      }, { onConflict: 'customer_product_id' });

    if (configError) {
      console.error(`provision-workflow: Erro ao criar ai_control_config:`, configError);
    }

    return new Response(JSON.stringify({
      success: true,
      message: `Workflow criado com sucesso: ${workflowName}`,
      workflowId: newWorkflow.id,
      workflowName: newWorkflow.name,
      n8nUrl: `${N8N_BASE_URL}/workflow/${newWorkflow.id}`,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('provision-workflow: Error:', error);
    
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erro desconhecido',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
