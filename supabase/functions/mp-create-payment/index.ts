import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { 
  validateEmail, 
  validateStringLength, 
  validateAmount,
  validateItems,
  batchValidate,
  sanitizeString
} from '../_shared/validation.ts';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '../_shared/rate-limit.ts';
import { getCorsHeaders, handleCorsPreflightRequest, corsResponse } from '../_shared/cors.ts';

serve(async (req) => {
  const origin = req.headers.get('Origin');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  try {
    // SECURITY: Rate limiting
    const clientId = getClientIdentifier(req);
    const rateLimitResult = checkRateLimit(clientId, RATE_LIMITS.PAYMENT);
    
    if (rateLimitResult.limited) {
      return corsResponse(
        { 
          success: false, 
          message: 'Too many requests. Please try again later.',
          retryAfter: rateLimitResult.retryAfter 
        },
        429,
        origin
      );
    }
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
      payment_type,
      success_url,
      failure_url,
      pending_url,
    } = body;

    // SECURITY: Validate all inputs
    const validationErrors = batchValidate([
      validateStringLength(customer_name, 'customer_name', 2, 100),
      validateEmail(customer_email),
      validateItems(items),
      discount_amount ? validateAmount(discount_amount, 'discount_amount') : null,
    ]);

    if (validationErrors.length > 0) {
      return corsResponse(
        { 
          success: false, 
          message: 'Validation error',
          errors: validationErrors 
        },
        400,
        origin
      );
    }

    // SECURITY: Sanitize strings
    const sanitizedName = sanitizeString(customer_name);
    const sanitizedEmail = customer_email.toLowerCase().trim();

    console.log('Creating payment:', { 
      customer_name: sanitizedName, 
      customer_email: sanitizedEmail, 
      items 
    });

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

    // Criar preferência no Mercado Pago
    const mpAccessToken = Deno.env.get('MERCADOPAGO_ACCESS_TOKEN');
    if (!mpAccessToken) {
      throw new Error('Mercado Pago access token not configured');
    }

    const preference = {
      items: orderItems.map(item => ({
        title: item.product_title,
        quantity: item.quantity,
        unit_price: Number(item.product_price) / 100, // Converter de centavos para reais
      })),
      payer: {
        name: customer_name,
        email: customer_email,
        phone: {
          number: customer_phone || '',
        },
      },
      back_urls: {
        success: success_url,
        failure: failure_url,
        pending: pending_url,
      },
      auto_return: 'approved',
      external_reference: order.id,
    };

    console.log('Creating Mercado Pago preference...');

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
      throw new Error(mpData.message || 'Error creating Mercado Pago preference');
    }

    console.log('Mercado Pago preference created:', mpData.id);

    // Criar registro de pagamento
    const { data: payment, error: paymentError } = await supabaseClient
      .from('mp_payments')
      .insert({
        order_id: order.id,
        preference_id: mpData.id,
        amount: total,
        status: 'pending',
        payment_type: 'mercadopago',
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    return corsResponse(
      {
        success: true,
        data: {
          order_id: order.id,
          payment_id: payment.id,
          preference_id: mpData.id,
          payment_link: mpData.init_point,
          sandbox_link: mpData.sandbox_init_point,
          total_amount: total,
        },
      },
      200,
      origin
    );

  } catch (error) {
    console.error('Error in mp-create-payment function:', error);
    return corsResponse(
      { success: false, message: (error as Error).message },
      500,
      origin
    );
  }
});
