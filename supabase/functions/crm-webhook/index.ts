import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';
import { getCorsHeaders } from '../_shared/cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get('Origin'));
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Extrair token do query parameter
    const url = new URL(req.url);
    const token = url.searchParams.get('token');

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'Token é obrigatório' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validar token e buscar customer_product
    const { data: customerProduct, error: tokenError } = await supabase
      .from('customer_products')
      .select('id, user_id')
      .eq('webhook_token', token)
      .eq('product_slug', 'crm-simples')
      .eq('is_active', true)
      .single();

    if (tokenError || !customerProduct) {
      console.error('Invalid token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const customer_product_id = customerProduct.id;
    const { cliente, telefone, email, status, descricao, operacao, empresa, cargo } = await req.json();

    console.log('Webhook received:', { customer_product_id, operacao, cliente });

    // Operação: zerar (deletar todos os clientes)
    if (operacao === 'zerar') {
      const { error } = await supabase
        .from('crm_customers')
        .delete()
        .eq('customer_product_id', customer_product_id);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, message: 'Todos os clientes foram removidos' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Operação: substituir (atualizar cliente existente)
    if (operacao === 'substituir') {
      const { data: existingCustomer } = await supabase
        .from('crm_customers')
        .select('id')
        .eq('customer_product_id', customer_product_id)
        .or(`phone.eq.${telefone},email.eq.${email}`)
        .single();

      if (existingCustomer) {
        const { error } = await supabase
          .from('crm_customers')
          .update({
            name: cliente,
            email,
            phone: telefone,
            company: empresa || null,
            business_type: cargo || null,
            status: status || 'lead',
            notes: descricao || null,
            last_contact_date: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCustomer.id);

        if (error) throw error;

        return new Response(
          JSON.stringify({ success: true, message: 'Cliente atualizado com sucesso' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Operação: adicionar (criar novo cliente)
    const { error } = await supabase
      .from('crm_customers')
      .insert({
        customer_product_id,
        name: cliente,
        email: email || null,
        phone: telefone || null,
        company: empresa || null,
        business_type: cargo || null,
        status: status || 'lead',
        notes: descricao || null,
        last_contact_date: new Date().toISOString()
      });

    if (error) throw error;

    return new Response(
      JSON.stringify({ success: true, message: 'Cliente adicionado com sucesso' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in crm-webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro desconhecido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});