import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { createPixCharge, getPixQrCode } from '../_shared/efi.ts';

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
      customer_cpf,
      items,
      discount_amount,
      pix_key, // chave PIX cadastrada na Efí (recebedora)
    } = body;

    if (!pix_key) {
      throw new Error('pix_key (chave PIX cadastrada na Efí) é obrigatória');
    }

    // Calcular total
    let subtotal = 0;
    const orderItems: any[] = [];

    for (const item of items) {
      const { data: product } = await supabaseClient
        .from('mp_products')
        .select('*')
        .eq('id', item.product_id)
        .single();

      if (!product) throw new Error(`Product ${item.product_id} not found`);

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

    const totalCents = subtotal - (discount_amount || 0);
    const totalBRL = totalCents / 100; // mp_products.price está em centavos

    // Criar pedido
    const { data: order, error: orderError } = await supabaseClient
      .from('mp_orders')
      .insert({
        customer_name,
        customer_email,
        customer_phone,
        subtotal_amount: subtotal,
        discount_amount: discount_amount || 0,
        total_amount: totalCents,
        status: 'pending',
        payment_method: 'pix_efi',
      })
      .select()
      .single();

    if (orderError) throw orderError;

    await supabaseClient.from('mp_order_items').insert(
      orderItems.map((it) => ({ ...it, order_id: order.id }))
    );

    // Criar cobrança PIX na Efí
    const charge = await createPixCharge({
      amount: totalBRL,
      pixKey: pix_key,
      payerName: customer_name,
      payerCpf: customer_cpf,
      description: `Pedido ${order.id.substring(0, 8)} - NovaLink`,
    });

    // Buscar QR Code
    let qrCode: { qrcode: string; imagemQrcode: string } | null = null;
    if (charge.loc?.id) {
      try {
        qrCode = await getPixQrCode(charge.loc.id);
      } catch (e) {
        console.warn('Failed to fetch QR code:', e);
      }
    }

    // Criar registro de pagamento
    const { data: payment, error: paymentError } = await supabaseClient
      .from('mp_payments')
      .insert({
        order_id: order.id,
        amount: totalCents,
        status: 'pending',
        payment_type: 'pix',
        payment_method: 'pix_efi',
        metadata: {
          provider: 'efi',
          environment: 'homologacao',
          txid: charge.txid,
          loc_id: charge.loc?.id,
          location: charge.location,
          pix_copia_e_cola: charge.pixCopiaECola,
          pix_key,
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
          total_amount: totalCents,
          provider: 'efi',
          environment: 'homologacao',
          pix: {
            txid: charge.txid,
            copia_e_cola: charge.pixCopiaECola,
            qrcode_image: qrCode?.imagemQrcode ?? null,
            qrcode_text: qrCode?.qrcode ?? charge.pixCopiaECola,
            expiration_seconds: 3600,
          },
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in efi-create-payment:', error);
    return new Response(
      JSON.stringify({ success: false, message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
