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

    // GET /mp-products - Listar todos os produtos
    if (req.method === 'GET' && pathname.endsWith('/mp-products')) {
      const { data, error } = await supabaseClient
        .from('mp_products')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /mp-products - Adicionar produto
    if (req.method === 'POST' && pathname.endsWith('/mp-products')) {
      const body = await req.json();
      const { title, description, price, slug, in_stock } = body;

      // Verificar se produto já existe
      const { data: existing } = await supabaseClient
        .from('mp_products')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existing) {
        return new Response(
          JSON.stringify({ success: true, data: existing }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Criar novo produto
      const { data, error } = await supabaseClient
        .from('mp_products')
        .insert({
          title,
          description,
          price, // Manter em centavos para consistência com o resto do sistema
          slug,
          in_stock: in_stock ?? true,
        })
        .select()
        .single();

      if (error) throw error;

      console.log('Product created:', data);

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
    console.error('Error in mp-products function:', error);
    return new Response(
      JSON.stringify({ success: false, message: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
