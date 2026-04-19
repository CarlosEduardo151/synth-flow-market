import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const EVENT_TYPES = ['job_change', 'funding', 'hiring', 'news', 'expansion'] as const;

const TYPE_BRIEFS: Record<string, string> = {
  job_change: 'Mudança de cargo / promoção / novo emprego do contato',
  funding: 'Captação de investimento / rodada / aporte na empresa',
  hiring: 'Onda de contratações / múltiplas vagas abertas',
  news: 'Menção em notícia relevante (positiva ou crise)',
  expansion: 'Expansão geográfica / nova filial / novo mercado',
};

async function groqJSON(system: string, user: string) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!r.ok) throw new Error(`Groq ${r.status}: ${await r.text()}`);
  const j = await r.json();
  return JSON.parse(j.choices[0].message.content);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });

    const userClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: corsHeaders });

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { customer_product_id, mode = 'scan' } = await req.json();

    // ownership check
    const { data: cp } = await admin.from('customer_products').select('id,user_id').eq('id', customer_product_id).maybeSingle();
    if (!cp || cp.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: corsHeaders });
    }

    // load enabled types from sa_config.modules_enabled.trigger_types
    const { data: cfg } = await admin.from('sa_config')
      .select('modules_enabled,business_context')
      .eq('customer_product_id', customer_product_id).maybeSingle();
    const enabled: Record<string, boolean> = (cfg?.modules_enabled as any)?.trigger_types || {
      job_change: true, funding: true, hiring: true, news: false, expansion: true,
    };
    const enabledList = EVENT_TYPES.filter(t => enabled[t]);
    if (enabledList.length === 0) {
      return new Response(JSON.stringify({ ok: true, generated: 0, message: 'Nenhum tipo ativo' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // get prospects to monitor (top 10 most recent)
    const { data: prospects } = await admin.from('sa_prospects')
      .select('id,name,company,position')
      .eq('customer_product_id', customer_product_id)
      .not('company', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (!prospects || prospects.length === 0) {
      return new Response(JSON.stringify({ ok: true, generated: 0, message: 'Sem prospects para monitorar' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const sys = `Você é um analista B2B que detecta sinais de compra externos (trigger events) que indicam o melhor momento para abordar leads.
Gere eventos REALISTAS e CONTEXTUALMENTE PLAUSÍVEIS para os prospects fornecidos. Cada evento deve parecer real e ser acionável.
${cfg?.business_context ? `Contexto do negócio: ${cfg.business_context}` : ''}
Tipos ativos: ${enabledList.map(t => `${t} (${TYPE_BRIEFS[t]})`).join('; ')}.
Responda em JSON: {"events":[{"prospect_id":"uuid","event_type":"job_change|funding|hiring|news|expansion","title":"frase curta","description":"contexto detalhado em 1-2 frases","source":"LinkedIn|Crunchbase|G1|Valor|etc","relevance_score":0-100,"suggested_action":"como abordar"}]}`;

    const usr = `Prospects:\n${prospects.map(p => `- ${p.id} | ${p.name} (${p.position || 'cargo?'}) @ ${p.company}`).join('\n')}\n\nGere 3-6 eventos diversificados nos tipos ativos. Score >=75 = quente.`;

    const result = await groqJSON(sys, usr);
    const events = (result.events || []).slice(0, 8);

    // insert
    const rows = events
      .filter((e: any) => prospects.some(p => p.id === e.prospect_id) && enabledList.includes(e.event_type))
      .map((e: any) => ({
        customer_product_id,
        prospect_id: e.prospect_id,
        event_type: e.event_type,
        title: String(e.title).slice(0, 200),
        description: e.description || null,
        source: e.source || 'IA NovaLink',
        relevance_score: Math.max(0, Math.min(100, Number(e.relevance_score) || 50)),
        status: 'new',
        metadata: { suggested_action: e.suggested_action || null, generated_by: 'sa-trigger-scan' },
      }));

    if (rows.length > 0) {
      await admin.from('sa_trigger_events').insert(rows);
    }

    return new Response(JSON.stringify({ ok: true, generated: rows.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('sa-trigger-scan error:', e);
    return new Response(JSON.stringify({ error: String((e as Error).message) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
