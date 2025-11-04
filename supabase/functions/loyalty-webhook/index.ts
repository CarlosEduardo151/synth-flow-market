import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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
      .eq('product_slug', 'fidelidade-digital')
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
    const { cliente, telefone, operacao, pontos, motivo, data } = await req.json();

    console.log('Received loyalty webhook:', { cliente, telefone, operacao, pontos, motivo, customer_product_id });

    // Buscar ou criar cliente
    let { data: existingClient } = await supabase
      .from('loyalty_clients')
      .select('*')
      .eq('customer_product_id', customer_product_id)
      .eq('phone', telefone)
      .single();

    let clientId: string;

    if (!existingClient) {
      // Criar novo cliente
      const { data: newClient, error: createError } = await supabase
        .from('loyalty_clients')
        .insert({
          customer_product_id,
          name: cliente,
          phone: telefone,
          points_balance: 0,
          status: 'active'
        })
        .select()
        .single();

      if (createError) throw createError;
      clientId = newClient.id;
      existingClient = newClient;
    } else {
      clientId = existingClient.id;
    }

    let pointsChange = 0;
    let transactionType = '';
    let description = motivo || '';

    // Processar operação
    switch (operacao) {
      case 'adicionar':
        pointsChange = pontos;
        transactionType = 'add';
        description = description || 'Pontos adicionados';
        break;
      case 'remover':
        pointsChange = -Math.abs(pontos);
        transactionType = 'remove';
        description = description || 'Pontos removidos';
        break;
      case 'resgatar':
        pointsChange = -Math.abs(pontos);
        transactionType = 'redeem';
        description = description || 'Resgate de recompensa';
        break;
      case 'zerar':
        pointsChange = -existingClient.points_balance;
        transactionType = 'reset';
        description = description || 'Pontos zerados';
        break;
      default:
        return new Response(
          JSON.stringify({ error: 'Operação inválida. Use: adicionar, remover, resgatar ou zerar' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    // Atualizar saldo do cliente
    const newBalance = Math.max(0, existingClient.points_balance + pointsChange);
    const { error: updateError } = await supabase
      .from('loyalty_clients')
      .update({
        points_balance: newBalance,
        total_points_earned: transactionType === 'add' ? existingClient.total_points_earned + pontos : existingClient.total_points_earned,
        total_points_redeemed: (transactionType === 'redeem' || transactionType === 'remove') ? existingClient.total_points_redeemed + Math.abs(pointsChange) : existingClient.total_points_redeemed,
        last_transaction_date: new Date().toISOString()
      })
      .eq('id', clientId);

    if (updateError) throw updateError;

    // Registrar transação
    const { error: transactionError } = await supabase
      .from('loyalty_transactions')
      .insert({
        customer_product_id,
        client_id: clientId,
        transaction_type: transactionType,
        points_amount: Math.abs(pointsChange),
        description,
        origin: 'webhook'
      });

    if (transactionError) throw transactionError;

    console.log('Transaction completed successfully:', { clientId, operation: operacao, points: pointsChange });

    return new Response(
      JSON.stringify({
        success: true,
        client: {
          id: clientId,
          name: cliente,
          phone: telefone,
          points_balance: newBalance
        },
        transaction: {
          type: transactionType,
          points: Math.abs(pointsChange),
          description
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing loyalty webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});