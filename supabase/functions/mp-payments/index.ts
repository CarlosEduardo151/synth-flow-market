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
    const pathname = url.pathname;
    const pathParts = pathname.split('/').filter(Boolean);

    // GET /mp-payments/all - Listar todos os pagamentos
    if (req.method === 'GET' && pathParts[pathParts.length - 1] === 'all') {
      const { data, error } = await supabaseClient
        .from('mp_payments')
        .select(`
          *,
          mp_orders (
            *,
            mp_order_items (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /mp-payments/:id - Buscar pagamento específico
    if (req.method === 'GET' && pathParts.length > 1) {
      const paymentId = pathParts[pathParts.length - 1];

      const { data, error } = await supabaseClient
        .from('mp_payments')
        .select(`
          *,
          mp_orders (
            *,
            mp_order_items (*)
          )
        `)
        .eq('id', paymentId)
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Route not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in mp-payments function:', error);
    return new Response(
      JSON.stringify({ success: false, message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
