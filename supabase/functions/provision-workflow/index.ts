import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// n8n API Configuration
const N8N_BASE_URL = Deno.env.get('N8N_BASE_URL') || 'https://n8n.starai.com.br';
const N8N_API_KEY = Deno.env.get('N8N_API_KEY');

// Workflow templates por categoria de produto (slug do produto -> ID do workflow template)
const WORKFLOW_TEMPLATES: Record<string, string> = {
  // Agentes de IA - usam o template "API"
  'bots-automacao': '', // Preencher com o ID do workflow API
  'assistente-vendas': '',
  'agente-financeiro': '',
  'agente-marketing': '',
  'agente-suporte': '',
  'agente-rh': '',
  'agente-integracao': '',
  'agente-concorrencia': '',
  // IA Automatizada
  'ia-atendimento': '',
  // Adicionar mais mappings conforme necessário
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
  templateWorkflowId?: string; // ID específico do template (opcional, usa mapeamento se não fornecido)
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
      templateWorkflowId 
    }: ProvisionRequest = await req.json();

    console.log(`provision-workflow: Provisionando workflow para ${customerEmail}, produto: ${productSlug}`);

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

    // 2. Determinar o ID do template a usar
    const templateId = templateWorkflowId || WORKFLOW_TEMPLATES[productSlug];
    
    if (!templateId) {
      console.log(`provision-workflow: Nenhum template configurado para ${productSlug}`);
      return new Response(JSON.stringify({
        success: false,
        message: `Nenhum template de workflow configurado para o produto: ${productSlug}`,
        requiresManualSetup: true,
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Buscar o workflow template
    console.log(`provision-workflow: Buscando template ${templateId}`);
    const templateWorkflow = await n8nRequest(`/workflows/${templateId}`);

    // 4. Criar nome do novo workflow no formato [email] Produto
    const workflowName = `[${customerEmail}] ${productTitle}`;

    // 5. Preparar dados do novo workflow
    const newWorkflowData = {
      name: workflowName,
      nodes: templateWorkflow.nodes,
      connections: templateWorkflow.connections,
      settings: templateWorkflow.settings || {},
      staticData: null,
      active: false, // Novo workflow começa desativado
    };

    console.log(`provision-workflow: Criando workflow: ${workflowName}`);

    // 6. Criar o novo workflow no n8n
    const newWorkflow = await n8nRequest('/workflows', 'POST', newWorkflowData);

    console.log(`provision-workflow: Workflow criado com ID: ${newWorkflow.id}`);

    // 7. Atualizar o customer_product com o workflow_id
    const { error: updateError } = await supabaseClient
      .from('customer_products')
      .update({ n8n_workflow_id: newWorkflow.id })
      .eq('id', customerProductId);

    if (updateError) {
      console.error(`provision-workflow: Erro ao atualizar customer_product:`, updateError);
      // Workflow foi criado, mas falhou ao salvar o ID - logar mas não falhar completamente
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
