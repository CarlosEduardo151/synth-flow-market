import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'npm:resend@4.0.0';

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

    const resendApiKey = Deno.env.get('RESEND_API_KEY');

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
          user_email: customerEmail,
          user_name: customerName,
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
              const userEmail = externalRef.user_email;
              const userName = externalRef.user_name;

              // Verificar se já foi processado
              const { data: existingTx } = await supabaseClient
                .from('starai_transactions')
                .select('id')
                .eq('payment_id', body.data.id.toString())
                .maybeSingle();

              if (existingTx) {
                console.log('Payment already processed:', body.data.id);
                return new Response(
                  JSON.stringify({ success: true, message: 'Already processed' }),
                  { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
              }

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

              // Registrar compra na tabela de compras
              await supabaseClient.from('starai_purchases').insert({
                user_id: userId,
                user_email: userEmail,
                user_name: userName,
                amount_brl: amountBrl,
                payment_id: body.data.id.toString(),
                mercadopago_payment_id: body.data.id.toString(),
                payment_method: paymentData.payment_method_id || 'mercadopago',
                status: 'approved',
              });

              console.log(`Credits added for user ${userId}: R$ ${amountBrl}`);

              // Enviar email de confirmação
              if (resendApiKey && userEmail) {
                try {
                  const resend = new Resend(resendApiKey);
                  const now = new Date();
                  const formattedDate = now.toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  await resend.emails.send({
                    from: 'StarAI <onboarding@resend.dev>',
                    to: [userEmail],
                    subject: '✅ Confirmação de Pagamento - StarAI Credits',
                    html: `
                      <!DOCTYPE html>
                      <html>
                      <head>
                        <meta charset="utf-8">
                        <style>
                          body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f5f5f5; }
                          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
                          .header { background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 30px; text-align: center; }
                          .header h1 { margin: 0; font-size: 24px; }
                          .content { padding: 30px; }
                          .success-badge { background: #10b981; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; margin-bottom: 20px; }
                          .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0; }
                          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
                          .info-row:last-child { border-bottom: none; }
                          .info-label { color: #64748b; }
                          .info-value { font-weight: 600; color: #1e293b; }
                          .amount { font-size: 28px; color: #10b981; font-weight: bold; text-align: center; margin: 20px 0; }
                          .footer { background: #f8fafc; padding: 20px; text-align: center; color: #64748b; font-size: 14px; }
                        </style>
                      </head>
                      <body>
                        <div class="container">
                          <div class="header">
                            <h1>🌟 StarAI Credits</h1>
                          </div>
                          <div class="content">
                            <div class="success-badge">✓ Pagamento Aprovado</div>
                            <p>Olá <strong>${userName || 'Cliente'}</strong>,</p>
                            <p>Seu pagamento foi confirmado com sucesso! Os créditos já foram adicionados à sua conta.</p>
                            
                            <div class="amount">R$ ${amountBrl.toFixed(2)}</div>
                            
                            <div class="info-box">
                              <div class="info-row">
                                <span class="info-label">Data do Pagamento</span>
                                <span class="info-value">${formattedDate}</span>
                              </div>
                              <div class="info-row">
                                <span class="info-label">ID da Transação</span>
                                <span class="info-value">#${body.data.id}</span>
                              </div>
                              <div class="info-row">
                                <span class="info-label">Método de Pagamento</span>
                                <span class="info-value">${paymentData.payment_method_id || 'Mercado Pago'}</span>
                              </div>
                              <div class="info-row">
                                <span class="info-label">Email</span>
                                <span class="info-value">${userEmail}</span>
                              </div>
                            </div>
                            
                            <p>Agora você pode usar seus créditos para consumir recursos de IA nos seus agentes.</p>
                            <p>Obrigado por escolher a StarAI! 🚀</p>
                          </div>
                          <div class="footer">
                            <p>Este é um email automático. Por favor, não responda.</p>
                            <p>© ${now.getFullYear()} StarAI - Todos os direitos reservados</p>
                          </div>
                        </div>
                      </body>
                      </html>
                    `,
                  });
                  console.log('Confirmation email sent to:', userEmail);
                } catch (emailError) {
                  console.error('Error sending email:', emailError);
                }
              }
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

    // GET /starai-credits/purchases - Lista de compras (admin)
    if (req.method === 'GET' && action === 'purchases') {
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

      // Verificar se é admin
      const { data: isAdmin } = await supabaseClient.rpc('is_admin', { user_id: user.id });

      if (!isAdmin) {
        return new Response(
          JSON.stringify({ success: false, message: 'Access denied' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data: purchases, error } = await supabaseClient
        .from('starai_purchases')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching purchases:', error);
        throw error;
      }

      return new Response(
        JSON.stringify({ success: true, data: purchases }),
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