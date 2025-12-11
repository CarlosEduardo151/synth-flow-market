import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-n8n-token',
};

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
        // n8n is reporting token usage - now tracked by workflow_id
        const { customerProductId, tokensUsed, modelUsed, workflowId } = data || {};
        const effectiveWorkflowId = workflowId || agentId; // Use agentId as fallback workflow identifier
        console.log(`Workflow ${effectiveWorkflowId} token usage: ${tokensUsed} tokens with ${modelUsed}`);
        
        if (tokensUsed && effectiveWorkflowId) {
          const today = new Date().toISOString().split('T')[0];
          
          // Find customer_product_id by workflow_id if not provided
          let finalCustomerProductId = customerProductId;
          if (!finalCustomerProductId) {
            const { data: customerProduct } = await supabase
              .from('customer_products')
              .select('id')
              .eq('n8n_workflow_id', effectiveWorkflowId)
              .limit(1)
              .maybeSingle();
            
            finalCustomerProductId = customerProduct?.id;
            console.log(`Found customer_product_id: ${finalCustomerProductId} for workflow ${effectiveWorkflowId}`);
          }
          
          if (!finalCustomerProductId) {
            console.error(`No customer_product found for workflow ${effectiveWorkflowId}`);
            return new Response(
              JSON.stringify({ 
                success: false, 
                message: 'Workflow não vinculado a nenhum produto',
                workflow_id: effectiveWorkflowId
              }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
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
                tokens_used: existingUsage.tokens_used + tokensUsed,
                requests_count: existingUsage.requests_count + 1,
                model_used: modelUsed,
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
                tokens_used: tokensUsed,
                requests_count: 1,
                model_used: modelUsed,
              });
            
            console.log(`Inserted token usage, error:`, insertError);
          }
        }
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: 'Uso de tokens registrado',
            workflow_id: effectiveWorkflowId
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
