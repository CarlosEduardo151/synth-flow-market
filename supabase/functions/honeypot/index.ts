// HONEYPOT — registra IPs que tentam acessar rotas-isca como /admin, /wp-admin, /.env etc.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { getCorsHeaders, handleCorsPreflightRequest } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return handleCorsPreflightRequest(req);
  const origin = req.headers.get('Origin');
  const cors = getCorsHeaders(origin);

  try {
    const body = await req.json().catch(() => ({}));
    const route = String(body.route || 'unknown').slice(0, 200);
    const ip =
      req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      req.headers.get('x-real-ip') ||
      'unknown';
    const ua = (req.headers.get('user-agent') || '').slice(0, 500);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // upsert: incrementa hit_count se já existe
    const { data: existing } = await supabase
      .from('security_blocklist')
      .select('id, hit_count')
      .eq('ip_address', ip)
      .maybeSingle();

    if (existing) {
      await supabase
        .from('security_blocklist')
        .update({
          hit_count: existing.hit_count + 1,
          last_seen_at: new Date().toISOString(),
          trigger_route: route,
          user_agent: ua,
        })
        .eq('id', existing.id);
    } else {
      await supabase.from('security_blocklist').insert({
        ip_address: ip,
        user_agent: ua,
        trigger_route: route,
        hit_count: 1,
      });
    }

    // resposta genérica — não revela que é honeypot
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('[honeypot]', e);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
