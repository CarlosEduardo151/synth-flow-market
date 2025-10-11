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

    const webhookData = await req.json();
    console.log('Received webhook from Z-API:', webhookData);

    // Extrair dados da mensagem recebida
    const phoneNumber = webhookData.phone || webhookData.telefone;
    const message = webhookData.text?.message || webhookData.mensagem;

    if (!phoneNumber || !message) {
      console.error('Missing required fields:', { phoneNumber, message });
      return new Response(
        JSON.stringify({ error: 'Missing phone number or message' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar ou criar lead
    const { data: existingLead } = await supabase
      .from('whatsapp_leads')
      .select('*')
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let leadId = existingLead?.id;

    if (!existingLead) {
      // Criar novo lead se não existir
      const { data: newLead } = await supabase
        .from('whatsapp_leads')
        .insert({
          phone_number: phoneNumber,
          product_slug: 'indefinido',
          product_title: 'Contato via WhatsApp',
          first_message: message,
          status: 'novo',
        })
        .select()
        .single();

      leadId = newLead?.id;
    } else {
      // Atualizar status para "interessado" se o cliente respondeu
      await supabase
        .from('whatsapp_leads')
        .update({ status: 'interessado' })
        .eq('id', existingLead.id);
    }

    // Salvar mensagem recebida
    if (leadId) {
      await supabase
        .from('whatsapp_messages')
        .insert({
          lead_id: leadId,
          phone_number: phoneNumber,
          message: message,
          direction: 'received',
          status: 'received',
        });
    }

    console.log('Webhook processed successfully:', { phoneNumber, leadId });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Webhook processado com sucesso',
        leadId 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in whatsapp-webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
