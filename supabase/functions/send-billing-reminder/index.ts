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

    const { invoiceId, messageType, customMessage } = await req.json();

    // Buscar dados da cobrança e cliente
    const { data: invoice, error: invoiceError } = await supabase
      .from('billing_invoices')
      .select(`
        *,
        billing_clients(*)
      `)
      .eq('id', invoiceId)
      .single();

    if (invoiceError || !invoice) {
      throw new Error('Invoice not found');
    }

    // Buscar configurações de cobrança
    const { data: customerProduct } = await supabase
      .from('customer_products')
      .select('id')
      .eq('user_id', user.id)
      .eq('product_slug', 'gestao-cobrancas')
      .single();

    if (!customerProduct) {
      throw new Error('Product not found');
    }

    const { data: settings } = await supabase
      .from('collection_settings')
      .select('*')
      .eq('customer_product_id', customerProduct.id)
      .single();

    if (!settings?.n8n_webhook_url) {
      throw new Error('Webhook n8n não configurado');
    }

    const client = invoice.billing_clients;
    const dueDate = new Date(invoice.due_date).toLocaleDateString('pt-BR');
    
    let message = '';
    
    if (messageType === 'ai') {
      // Mensagem será gerada pela IA no n8n
      message = customMessage || `Por favor, gere uma mensagem de cobrança profissional e amigável para ${client.name} sobre uma cobrança de R$ ${invoice.amount.toFixed(2)} com vencimento em ${dueDate}.`;
    } else {
      // Usar template configurado
      const template = settings.template_message || 'Olá {nome}, você tem uma cobrança de R$ {valor} vencendo em {data}. Clique no link para pagar: {link_pagamento}';
      message = template
        .replace('{nome}', client.name)
        .replace('{valor}', invoice.amount.toFixed(2))
        .replace('{data}', dueDate)
        .replace('{link_pagamento}', invoice.payment_link || 'https://seu-link-de-pagamento.com');
    }

    // Enviar para n8n webhook
    const webhookPayload = {
      invoice_id: invoice.id,
      client: {
        name: client.name,
        phone: client.phone,
        email: client.email
      },
      invoice: {
        amount: invoice.amount,
        due_date: dueDate,
        payment_method: invoice.payment_method,
        payment_link: invoice.payment_link
      },
      message_type: messageType,
      message: message,
      send_via: 'whatsapp'
    };

    console.log('Sending to n8n webhook:', settings.n8n_webhook_url);

    const webhookResponse = await fetch(settings.n8n_webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(webhookPayload),
    });

    if (!webhookResponse.ok) {
      throw new Error(`Webhook failed: ${webhookResponse.statusText}`);
    }

    // Atualizar status do envio de lembrete
    await supabase
      .from('billing_invoices')
      .update({ 
        whatsapp_reminder_sent: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', invoiceId);

    console.log('Reminder sent successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Lembrete enviado com sucesso!',
        webhook_response: await webhookResponse.json()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-billing-reminder:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
