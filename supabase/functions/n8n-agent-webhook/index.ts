import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-n8n-token',
};

// Helper function to detect provider and extract token usage from different API formats
function extractTokenUsage(data: any): { tokensUsed: number; modelUsed: string; provider: string } {
  // Default values
  let tokensUsed = 0;
  let modelUsed = 'unknown';
  let provider = 'unknown';

  if (!data) return { tokensUsed, modelUsed, provider };

  // Check for direct tokensUsed/modelUsed (legacy format)
  if (data.tokensUsed !== undefined) {
    tokensUsed = Number(data.tokensUsed) || 0;
    modelUsed = data.modelUsed || 'unknown';
    provider = detectProviderFromModel(modelUsed);
    return { tokensUsed, modelUsed, provider };
  }

  // Check for OpenAI format: { usage: { total_tokens, prompt_tokens, completion_tokens }, model }
  if (data.usage && typeof data.usage === 'object') {
    tokensUsed = data.usage.total_tokens || (data.usage.prompt_tokens || 0) + (data.usage.completion_tokens || 0);
    modelUsed = data.model || 'openai-unknown';
    provider = 'openai';
    return { tokensUsed, modelUsed, provider };
  }

  // Check for Gemini format: { usageMetadata: { totalTokenCount, promptTokenCount, candidatesTokenCount }, modelVersion }
  if (data.usageMetadata && typeof data.usageMetadata === 'object') {
    tokensUsed = data.usageMetadata.totalTokenCount || 
                 (data.usageMetadata.promptTokenCount || 0) + (data.usageMetadata.candidatesTokenCount || 0);
    modelUsed = data.modelVersion || data.model || 'gemini-unknown';
    provider = 'gemini';
    return { tokensUsed, modelUsed, provider };
  }

  // Check for nested response format from n8n (response.usage or response.usageMetadata)
  if (data.response) {
    return extractTokenUsage(data.response);
  }

  // Check for Gemini alternative format with candidates
  if (data.candidates && Array.isArray(data.candidates)) {
    // This is a Gemini response, look for usageMetadata at root level
    if (data.usageMetadata) {
      tokensUsed = data.usageMetadata.totalTokenCount || 0;
      modelUsed = data.modelVersion || 'gemini';
      provider = 'gemini';
    }
    return { tokensUsed, modelUsed, provider };
  }

  // Check for OpenAI alternative format with choices
  if (data.choices && Array.isArray(data.choices)) {
    // This is an OpenAI response, usage should be at root level
    if (data.usage) {
      tokensUsed = data.usage.total_tokens || 0;
      modelUsed = data.model || 'openai';
      provider = 'openai';
    }
    return { tokensUsed, modelUsed, provider };
  }

  return { tokensUsed, modelUsed, provider };
}

// Helper to detect provider from model name
function detectProviderFromModel(model: string): string {
  const modelLower = model.toLowerCase();
  if (modelLower.includes('gpt') || modelLower.includes('openai') || modelLower.includes('o1') || modelLower.includes('o3') || modelLower.includes('o4')) {
    return 'openai';
  }
  if (modelLower.includes('gemini') || modelLower.includes('google') || modelLower.includes('palm')) {
    return 'gemini';
  }
  if (modelLower.includes('claude') || modelLower.includes('anthropic')) {
    return 'anthropic';
  }
  return 'unknown';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify n8n token for security
    const n8nToken = req.headers.get('x-n8n-token');
    const expectedToken = Deno.env.get('N8N_WEBHOOK_TOKEN');
    
    if (expectedToken && n8nToken !== expectedToken) {
      console.error('Invalid n8n token');
      return new Response(
        JSON.stringify({ success: false, message: 'Token inválido' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { type, agentId, status, message, data } = body;

    console.log(`n8n-agent-webhook: Received ${type} from agent ${agentId}`, body);

    // Handle different message types from n8n
    switch (type) {
      case 'status_update':
        // n8n is reporting agent status
        console.log(`Agent ${agentId} status: ${status}`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Status recebido',
            received: { agentId, status }
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'heartbeat':
        // n8n is sending a heartbeat to confirm it's alive
        console.log(`Agent ${agentId} heartbeat received`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Heartbeat recebido',
            timestamp: new Date().toISOString()
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'log':
        // n8n is sending a log message
        console.log(`Agent ${agentId} log: ${message}`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Log recebido'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'error':
        // n8n is reporting an error
        console.error(`Agent ${agentId} error: ${message}`, data);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Erro registrado'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'command_response':
        // n8n is responding to a command (ativar, desativar, reiniciar)
        console.log(`Agent ${agentId} command response:`, data);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Resposta do comando recebida',
            data
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      case 'token_usage':
        // n8n is reporting token usage - supports both OpenAI and Gemini formats
        const { customerProductId, workflowId } = data || {};
        const effectiveWorkflowId = workflowId || agentId;
        
        // Detect provider and extract token usage
        const tokenInfo = extractTokenUsage(data);
        console.log(`Workflow ${effectiveWorkflowId} token usage: ${tokenInfo.tokensUsed} tokens with ${tokenInfo.modelUsed} (provider: ${tokenInfo.provider})`);
        
        if (tokenInfo.tokensUsed && effectiveWorkflowId) {
          const today = new Date().toISOString().split('T')[0];
          
          // Find customer_product_id by workflow_id if not provided (optional - can be null)
          let finalCustomerProductId = customerProductId || null;
          if (!finalCustomerProductId) {
            const { data: customerProduct } = await supabase
              .from('customer_products')
              .select('id')
              .eq('n8n_workflow_id', effectiveWorkflowId)
              .limit(1)
              .maybeSingle();
            
            finalCustomerProductId = customerProduct?.id || null;
            console.log(`Found customer_product_id: ${finalCustomerProductId || 'null (workflow não vinculado)'} for workflow ${effectiveWorkflowId}`);
          }
          
          // Try to update existing record by workflow_id, or insert new one
          const { data: existingUsage, error: selectError } = await supabase
            .from('ai_token_usage')
            .select('id, tokens_used, requests_count')
            .eq('n8n_workflow_id', effectiveWorkflowId)
            .eq('date', today)
            .maybeSingle();

          console.log(`Existing usage for today:`, existingUsage, selectError);

          if (existingUsage) {
            // Update existing record
            const { error: updateError } = await supabase
              .from('ai_token_usage')
              .update({
                tokens_used: existingUsage.tokens_used + tokenInfo.tokensUsed,
                requests_count: existingUsage.requests_count + 1,
                model_used: tokenInfo.modelUsed,
              })
              .eq('id', existingUsage.id);
            
            console.log(`Updated token usage, error:`, updateError);
          } else {
            // Insert new record
            const { error: insertError } = await supabase
              .from('ai_token_usage')
              .insert({
                customer_product_id: finalCustomerProductId,
                n8n_workflow_id: effectiveWorkflowId,
                date: today,
                tokens_used: tokenInfo.tokensUsed,
                requests_count: 1,
                model_used: tokenInfo.modelUsed,
              });
            
            console.log(`Inserted token usage, error:`, insertError);
          }
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Uso de tokens registrado',
            workflow_id: effectiveWorkflowId,
            provider: tokenInfo.provider,
            tokens: tokenInfo.tokensUsed,
            model: tokenInfo.modelUsed
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

      default:
        console.log(`Agent ${agentId} unknown type: ${type}`, body);
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Mensagem recebida',
            type
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

  } catch (error) {
    console.error('n8n-agent-webhook error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
