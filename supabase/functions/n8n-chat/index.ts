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

    // Verify n8n token for security (optional)
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
    const { message, agentId = 'default', role = 'assistant', metadata } = body;

    console.log(`n8n-chat: Received message from agent ${agentId}:`, message);

    if (!message) {
      return new Response(
        JSON.stringify({ success: false, message: 'Mensagem é obrigatória' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert message into database
    const { data, error } = await supabase
      .from('n8n_agent_messages')
      .insert({
        agent_id: agentId,
        role: role,
        content: message,
        metadata: metadata || null
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting message:', error);
      return new Response(
        JSON.stringify({ success: false, message: `Erro ao salvar mensagem: ${error.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Message saved successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mensagem recebida e salva',
        data: data
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('n8n-chat error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}` 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
