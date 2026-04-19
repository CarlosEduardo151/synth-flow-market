import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const EVENT_TYPES = ['job_change', 'funding', 'hiring', 'news', 'expansion'];

function htmlToText(html: string): string {
  // Strip scripts/styles, then tags. Keep meta description / og.
  const ogMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i);
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
  const head = [titleMatch?.[1], descMatch?.[1], ogMatch?.[1]].filter(Boolean).join(' | ');
  return `${head ? '[META] ' + head + '\n\n' : ''}${cleaned.slice(0, 6000)}`;
}

async function fetchPage(url: string): Promise<{ text: string; finalUrl: string }> {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NovaLinkBot/1.0; +https://novalink.app)',
      Accept: 'text/html,application/xhtml+xml',
    },
    redirect: 'follow',
  });
  if (!r.ok) throw new Error(`fetch_failed:${r.status}`);
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('text/html') && !ct.includes('text/plain') && !ct.includes('xml')) {
    throw new Error(`unsupported_content_type:${ct}`);
  }
  const html = await r.text();
  return { text: htmlToText(html), finalUrl: r.url };
}

async function groqJSON(system: string, user: string) {
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    }),
  });
  if (!r.ok) throw new Error(`groq:${r.status}:${await r.text()}`);
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
    const body = await req.json();
    const {
      customer_product_id,
      url,
      prospect_id = null,
      target_id = null,
      context = '',
    } = body;

    if (!customer_product_id || !url) {
      return new Response(JSON.stringify({ error: 'missing_params' }), { status: 400, headers: corsHeaders });
    }

    // ownership
    const { data: cp } = await admin.from('customer_products').select('id,user_id').eq('id', customer_product_id).maybeSingle();
    if (!cp || cp.user_id !== user.id) {
      return new Response(JSON.stringify({ error: 'forbidden' }), { status: 403, headers: corsHeaders });
    }

    // resolve subject info (prospect or target)
    let subject = context || '';
    if (prospect_id) {
      const { data: p } = await admin.from('sa_prospects').select('name,company,position').eq('id', prospect_id).maybeSingle();
      if (p) subject = `${p.name} (${p.position || 'cargo?'}) @ ${p.company || '—'}`;
    } else if (target_id) {
      const { data: t } = await admin.from('sa_trigger_targets').select('name,company,position').eq('id', target_id).maybeSingle();
      if (t) subject = `${t.name} (${t.position || 'cargo?'}) @ ${t.company || '—'}`;
    }

    // Detect source from URL
    const host = (() => { try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return 'web'; } })();
    let source = host;
    if (host.includes('linkedin.com')) source = 'LinkedIn';
    else if (host.includes('crunchbase.com')) source = 'Crunchbase';

    // Fetch page (LinkedIn pages frequently require login -> may fail)
    let pageText = '';
    let fetchError: string | null = null;
    try {
      const { text } = await fetchPage(url);
      pageText = text;
    } catch (e) {
      fetchError = (e as Error).message;
    }

    if (!pageText && host.includes('linkedin.com')) {
      return new Response(JSON.stringify({
        error: 'linkedin_blocked',
        message: 'LinkedIn bloqueia leitura automática. Copie o texto do post/perfil e cole na descrição manual, ou use uma URL pública (notícia/site da empresa).',
      }), { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!pageText) {
      return new Response(JSON.stringify({ error: 'fetch_failed', message: fetchError }), {
        status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ask Groq to extract a trigger event
    const sys = `Você é um analista B2B de sinais de compra. Receberá o conteúdo de uma página (notícia, perfil, site institucional) e deve extrair UM trigger event acionável referente ao alvo informado.

Tipos de evento permitidos:
- job_change: contato mudou de cargo / promoção / novo emprego
- funding: empresa recebeu investimento / aporte / rodada
- hiring: empresa está contratando muito / abriu várias vagas
- news: empresa virou notícia (positiva ou crise)
- expansion: empresa expandiu (nova filial, novo mercado, novo produto)

Responda em JSON estrito:
{
  "found": true|false,
  "event_type": "job_change|funding|hiring|news|expansion",
  "title": "frase curta de até 100 chars",
  "description": "1-2 frases explicando o sinal e por que importa",
  "relevance_score": 0-100,
  "suggested_action": "como abordar este lead agora",
  "reason_if_not_found": "se found=false, explique"
}

Score: 90+ se sinal forte e recente; 70-89 sinal claro; 50-69 contexto útil; <50 fraco.`;

    const usr = `ALVO: ${subject || '(não especificado)'}\nURL: ${url}\nFONTE: ${source}\n\n--- CONTEÚDO DA PÁGINA ---\n${pageText}\n--- FIM ---\n\nExtraia o trigger event. Se a página não tiver sinal relevante para este alvo, retorne found=false.`;

    const result = await groqJSON(sys, usr);

    if (!result.found || !EVENT_TYPES.includes(result.event_type)) {
      return new Response(JSON.stringify({
        ok: true,
        generated: 0,
        message: result.reason_if_not_found || 'Nenhum sinal relevante encontrado nesta URL.',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const row = {
      customer_product_id,
      prospect_id,
      target_id,
      event_type: result.event_type,
      title: String(result.title || 'Evento').slice(0, 200),
      description: result.description || null,
      source,
      source_url: url,
      relevance_score: Math.max(0, Math.min(100, Number(result.relevance_score) || 50)),
      status: 'new',
      metadata: {
        suggested_action: result.suggested_action || null,
        generated_by: 'sa-trigger-extract-url',
      },
    };

    const { data: inserted, error: insErr } = await admin.from('sa_trigger_events').insert(row).select('id').maybeSingle();
    if (insErr) throw insErr;

    return new Response(JSON.stringify({ ok: true, generated: 1, event_id: inserted?.id, event: row }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('sa-trigger-extract-url error:', e);
    return new Response(JSON.stringify({ error: String((e as Error).message) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
