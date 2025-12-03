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

    const body = await req.json();
    const {
      customer_name,
      customer_email,
      customer_phone,
      items,
      discount_amount,
      pix_key,
      pix_receiver,
    } = body;

    console.log('Creating semi-auto payment:', { customer_name, customer_email, items });

    // Calcular total
    let subtotal = 0;
    const orderItems = [];

    for (const item of items) {
      const { data: product } = await supabaseClient
        .from('mp_products')
        .select('*')
        .eq('id', item.product_id)
        .single();

      if (!product) {
        throw new Error(`Product ${item.product_id} not found`);
      }

      const itemTotal = Number(product.price) * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product_id: product.id,
        product_title: product.title,
        product_slug: product.slug,
        product_price: product.price,
        quantity: item.quantity,
      });
    }

    const total = subtotal - (discount_amount || 0);

    // Criar pedido
    const { data: order, error: orderError } = await supabaseClient
      .from('mp_orders')
      .insert({
        customer_name,
        customer_email,
        customer_phone,
        subtotal_amount: subtotal,
        discount_amount: discount_amount || 0,
        total_amount: total,
        status: 'pending',
        payment_method: 'pix',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    console.log('Order created:', order.id);

    // Criar itens do pedido
    const itemsToInsert = orderItems.map(item => ({
      ...item,
      order_id: order.id,
    }));

    const { error: itemsError } = await supabaseClient
      .from('mp_order_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    // Criar registro de pagamento
    const { data: payment, error: paymentError } = await supabaseClient
      .from('mp_payments')
      .insert({
        order_id: order.id,
        amount: total,
        status: 'pending',
        payment_type: 'pix',
        payment_method: 'pix',
        metadata: {
          pix_key,
          pix_receiver,
        },
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          order_id: order.id,
          payment_id: payment.id,
          total_amount: total,
          pix_info: {
            key: pix_key,
            receiver_name: pix_receiver,
          },
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in mp-semi-auto-payment function:', error);
    return new Response(
      JSON.stringify({ success: false, message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
