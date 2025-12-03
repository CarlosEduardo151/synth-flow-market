// ========================================
// WHATSAPP EDGE FUNCTION - SECURITY HARDENED
// Move Z-API credentials para backend seguro
// ========================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getCorsHeaders, handleCorsPreflightRequest, corsResponse } from '../_shared/cors.ts';
import { checkRateLimit, getClientIdentifier, RATE_LIMITS } from '../_shared/rate-limit.ts';
import { validateStringLength, validatePhone, batchValidate, sanitizeString } from '../_shared/validation.ts';

const ZAPI_URL = 'https://api.z-api.io';

serve(async (req) => {
  const origin = req.headers.get('Origin');
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  try {
    // Rate limiting (mais restritivo para WhatsApp)
    const clientId = getClientIdentifier(req);
    const rateLimitResult = checkRateLimit(clientId, { windowMs: 60000, maxRequests: 10 });
    
    if (rateLimitResult.limited) {
      console.warn(`Rate limit exceeded for WhatsApp from ${clientId}`);
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

    const body = await req.json();

    // Validação de inputs
    const validationErrors = batchValidate([
      validateStringLength(body.instanceId, 'instanceId', 5, 100),
      validateStringLength(body.token, 'token', 10, 200),
      validatePhone(body.phoneNumber),
      validateStringLength(body.message, 'message', 1, 4096),
    ]);

    if (validationErrors.length > 0) {
      console.error('Validation errors:', validationErrors);
      return corsResponse({ success: false, errors: validationErrors }, 400, origin);
    }

    // Sanitizar inputs
    const instanceId = sanitizeString(body.instanceId);
    const token = sanitizeString(body.token);
    const phoneNumber = body.phoneNumber.replace(/\D/g, ''); // Apenas números
    const message = sanitizeString(body.message);
    const productSlug = body.productSlug;
    const productTitle = sanitizeString(body.productTitle);

    console.log(`Sending WhatsApp message to ${phoneNumber.substring(0, 4)}****`);

    // Enviar mensagem via Z-API
    const zapiResponse = await fetch(
      `${ZAPI_URL}/instances/${instanceId}/token/${token}/send-text`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Client-Token': token,
        },
        body: JSON.stringify({
          phone: phoneNumber,
          message,
        }),
      }
    );

    const zapiData = await zapiResponse.json();

    if (!zapiResponse.ok) {
      console.error('Z-API error:', zapiData);
      return corsResponse(
        { success: false, message: 'Failed to send WhatsApp message', details: zapiData },
        zapiResponse.status,
        origin
      );
    }

    // Salvar lead no banco (com RLS policy que permite system insert)
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error: leadError } = await supabaseClient
      .from('whatsapp_leads')
      .insert({
        phone_number: phoneNumber,
        product_slug: productSlug,
        product_title: productTitle,
        first_message: message,
        status: 'novo',
      });

    if (leadError) {
      console.error('Error saving lead:', leadError);
      // Não falhar o request se apenas o save do lead falhar
    }

    // Salvar mensagem (com RLS policy que permite system insert)
    const { error: messageError } = await supabaseClient
      .from('whatsapp_messages')
      .insert({
        phone_number: phoneNumber,
        message,
        direction: 'outbound',
        status: 'sent',
      });

    if (messageError) {
      console.error('Error saving message:', messageError);
    }

    console.log('WhatsApp message sent successfully');
    return corsResponse(
      { success: true, data: zapiData },
      200,
      origin
    );

  } catch (error) {
    console.error('Error in send-whatsapp function:', error);
    return corsResponse(
      { success: false, message: 'Internal server error' },
      500,
      origin
    );
  }
});
