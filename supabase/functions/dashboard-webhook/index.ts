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

    const url = new URL(req.url);
    const configId = url.searchParams.get('config_id');

    if (!configId) {
      return new Response(
        JSON.stringify({ error: 'config_id é obrigatório' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verificar se a configuração existe
    const { data: config, error: configError } = await supabase
      .from('dashboard_configs')
      .select('id')
      .eq('id', configId)
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
        dashboard_config_id: configId,
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
      JSON.stringify({ error: 'Erro interno do servidor', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
