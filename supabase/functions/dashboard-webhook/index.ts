import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
      .eq('product_slug', 'dashboards-personalizados')
      .eq('is_active', true)
      .single();

    if (tokenError || !customerProduct) {
      console.error('Invalid token:', tokenError);
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Buscar config do customer_product
    const { data: config, error: configError } = await supabase
      .from('dashboard_configs')
      .select('id')
      .eq('customer_product_id', customerProduct.id)
      .single();

    if (configError || !config) {
      console.error('Configuração não encontrada:', configError);
      return new Response(
        JSON.stringify({ error: 'Configuração de dashboard não encontrada' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { metric_key, value, metadata = {} } = body;

    if (!metric_key || value === undefined) {
      return new Response(
        JSON.stringify({ error: 'metric_key e value são obrigatórios' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inserir dados no dashboard
    const { data: insertedData, error: insertError } = await supabase
      .from('dashboard_data')
      .insert({
        dashboard_config_id: config.id,
        metric_key,
        value: Number(value),
        metadata
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir dados:', insertError);
      return new Response(
        JSON.stringify({ error: 'Erro ao inserir dados', details: insertError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Dados inseridos com sucesso:', insertedData);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Dados recebidos e salvos com sucesso',
        data: insertedData
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro geral:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno do servidor', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
