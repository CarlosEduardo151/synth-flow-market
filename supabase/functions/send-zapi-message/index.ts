import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.75.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user } } = await supabase.auth.getUser(token);

    if (!user) {
      throw new Error('Unauthorized');
    }

    const { instanceId, token: zapiToken, phoneNumber, productSlug, productTitle } = await req.json();

    console.log('Sending Z-API message:', { instanceId, phoneNumber, productSlug, productTitle });

    // Enviar mensagem via Z-API
    const message = `Olá! Você conectou sua conta com sucesso. Em breve entraremos em contato sobre *${productTitle}*.`;
    
    const zapiResponse = await fetch(
      `https://api.z-api.io/instances/${instanceId}/token/${zapiToken}/send-text`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phone: phoneNumber,
          message: message,
        }),
      }
    );

    const zapiData = await zapiResponse.json();
    console.log('Z-API response:', zapiData);

    if (!zapiResponse.ok) {
      throw new Error(`Z-API error: ${JSON.stringify(zapiData)}`);
    }

    // Salvar conexão Z-API do usuário
    const { error: connectionError } = await supabase
      .from('zapi_connections')
      .upsert({
        user_id: user.id,
        instance_id: instanceId,
        token: zapiToken,
        phone_number: phoneNumber,
      });

    if (connectionError) {
      console.error('Error saving connection:', connectionError);
    }

    // Criar lead no WhatsApp
    const { data: lead, error: leadError } = await supabase
      .from('whatsapp_leads')
      .insert({
        phone_number: phoneNumber,
        product_slug: productSlug,
        product_title: productTitle,
        first_message: message,
        status: 'novo',
      })
      .select()
      .single();

    if (leadError) {
      console.error('Error creating lead:', leadError);
    }

    // Salvar mensagem enviada
    if (lead) {
      await supabase
        .from('whatsapp_messages')
        .insert({
          lead_id: lead.id,
          phone_number: phoneNumber,
          message: message,
          direction: 'sent',
          status: 'delivered',
        });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Mensagem enviada com sucesso!',
        zapiResponse: zapiData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-zapi-message:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
