import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-user-id',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get user ID from header (set by n8n workflow)
    const userId = req.headers.get('x-user-id');
    
    if (!userId) {
      console.error('Missing x-user-id header');
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    console.log('Received candidate data:', JSON.stringify(body));

    // Expected fields: msg, avaliacao, nome, idade, infoadd
    const { msg, avaliacao, nome, idade, infoadd, telefone, email, vaga_id } = body;

    if (!nome) {
      return new Response(
        JSON.stringify({ error: 'Nome is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse avaliacao to number
    let avaliacaoNum = null;
    if (avaliacao) {
      avaliacaoNum = parseFloat(avaliacao.toString().replace(',', '.'));
      if (isNaN(avaliacaoNum)) avaliacaoNum = null;
    }

    // Parse idade to number
    let idadeNum = null;
    if (idade) {
      idadeNum = parseInt(idade.toString(), 10);
      if (isNaN(idadeNum)) idadeNum = null;
    }

    // Insert candidate into database
    const { data, error } = await supabase
      .from('rh_candidatos')
      .insert({
        user_id: userId,
        nome: nome,
        idade: idadeNum,
        telefone: telefone || null,
        email: email || null,
        avaliacao: avaliacaoNum,
        msg: msg || null,
        info_adicional: infoadd || null,
        vaga_id: vaga_id || null,
        status: 'novo',
        etapa: 'triagem'
      })
      .select()
      .single();

    if (error) {
      console.error('Error inserting candidate:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to save candidate', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Candidate saved successfully:', data.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Candidato salvo com sucesso',
        candidatoId: data.id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error processing request:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
