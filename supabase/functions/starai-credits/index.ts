import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const action = pathParts[pathParts.length - 1];

    // GET /starai-credits/balance - Obter saldo do usuário
    if (req.method === 'GET' && action === 'balance') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ success: false, message: 'Authorization required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buscar ou criar registro de créditos
      let { data: credits, error } = await supabaseClient
        .from('starai_credits')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!credits) {
        // Criar registro com bônus inicial de R$ 75
        const { data: newCredits, error: insertError } = await supabaseClient
          .from('starai_credits')
          .insert({
            user_id: user.id,
            balance_brl: 75.00,
            free_balance_brl: 75.00,
            deposited_brl: 0.00,
            total_used_brl: 0.00,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        credits = newCredits;

        // Registrar transação de bônus
        await supabaseClient.from('starai_transactions').insert({
          user_id: user.id,
          type: 'bonus',
          amount_brl: 75.00,
          description: 'Bônus de boas-vindas StarAI (equivalente a $15 USD)',
        });
      }

      return new Response(
        JSON.stringify({ success: true, data: credits }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /starai-credits/deposit - Criar pagamento para depósito
    if (req.method === 'POST' && action === 'deposit') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ success: false, message: 'Authorization required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { amount_brl, success_url, failure_url } = await req.json();

      if (!amount_brl || amount_brl < 10) {
        return new Response(
          JSON.stringify({ success: false, message: 'Valor mínimo de depósito: R$ 10,00' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Buscar perfil do usuário
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('full_name, email')
        .eq('user_id', user.id)
        .maybeSingle();

      const customerName = profile?.full_name || user.email?.split('@')[0] || 'Cliente';
      const customerEmail = profile?.email || user.email || '';

      // Criar preferência no Mercado Pago
      const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
      if (!mpAccessToken) {
        throw new Error('Mercado Pago access token not configured');
      }

      const preference = {
        items: [{
          title: `Créditos StarAI - R$ ${amount_brl.toFixed(2)}`,
          quantity: 1,
          unit_price: Number(amount_brl),
          currency_id: 'BRL',
        }],
        payer: {
          name: customerName,
          email: customerEmail,
        },
        back_urls: {
          success: success_url || `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app')}/admin/agent-config?payment=success`,
          failure: failure_url || `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app')}/admin/agent-config?payment=failure`,
          pending: success_url || `${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app')}/admin/agent-config?payment=pending`,
        },
        auto_return: 'approved',
        external_reference: JSON.stringify({
          type: 'starai_credits',
          user_id: user.id,
          amount_brl: amount_brl,
        }),
        notification_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/starai-credits/webhook`,
      };

      console.log('Creating Mercado Pago preference for StarAI credits:', preference);

      const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${mpAccessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preference),
      });

      const mpData = await mpResponse.json();

      if (!mpResponse.ok) {
        console.error('Mercado Pago error:', mpData);
        throw new Error(mpData.message || 'Erro ao criar preferência de pagamento');
      }

      console.log('Mercado Pago preference created:', mpData.id);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            preference_id: mpData.id,
            payment_link: mpData.init_point,
            sandbox_link: mpData.sandbox_init_point,
            amount_brl: amount_brl,
          },
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /starai-credits/webhook - Webhook do Mercado Pago
    if (req.method === 'POST' && action === 'webhook') {
      const body = await req.json();
      console.log('StarAI Credits Webhook received:', JSON.stringify(body));

      if (body.type === 'payment' && body.data?.id) {
        const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
        
        // Buscar detalhes do pagamento
        const paymentResponse = await fetch(
          `https://api.mercadopago.com/v1/payments/${body.data.id}`,
          {
            headers: {
              'Authorization': `Bearer ${mpAccessToken}`,
            },
          }
        );

        const paymentData = await paymentResponse.json();
        console.log('Payment data:', JSON.stringify(paymentData));

        if (paymentData.status === 'approved') {
          try {
            const externalRef = JSON.parse(paymentData.external_reference || '{}');
            
            if (externalRef.type === 'starai_credits' && externalRef.user_id) {
              const userId = externalRef.user_id;
              const amountBrl = externalRef.amount_brl;

              // Atualizar créditos do usuário
              const { data: currentCredits } = await supabaseClient
                .from('starai_credits')
                .select('*')
                .eq('user_id', userId)
                .single();

              if (currentCredits) {
                await supabaseClient
                  .from('starai_credits')
                  .update({
                    balance_brl: Number(currentCredits.balance_brl) + amountBrl,
                    deposited_brl: Number(currentCredits.deposited_brl) + amountBrl,
                  })
                  .eq('user_id', userId);
              } else {
                await supabaseClient
                  .from('starai_credits')
                  .insert({
                    user_id: userId,
                    balance_brl: 75.00 + amountBrl,
                    free_balance_brl: 75.00,
                    deposited_brl: amountBrl,
                  });
              }

              // Registrar transação
              await supabaseClient.from('starai_transactions').insert({
                user_id: userId,
                type: 'deposit',
                amount_brl: amountBrl,
                description: `Depósito via Mercado Pago`,
                payment_id: body.data.id.toString(),
              });

              console.log(`Credits added for user ${userId}: R$ ${amountBrl}`);
            }
          } catch (e) {
            console.error('Error processing external_reference:', e);
          }
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /starai-credits/transactions - Histórico de transações
    if (req.method === 'GET' && action === 'transactions') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(
          JSON.stringify({ success: false, message: 'Authorization required' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
      
      if (authError || !user) {
        return new Response(
          JSON.stringify({ success: false, message: 'Invalid token' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: transactions, error } = await supabaseClient
        .from('starai_transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data: transactions }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Route not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in starai-credits function:', error);
    return new Response(
      JSON.stringify({ success: false, message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
