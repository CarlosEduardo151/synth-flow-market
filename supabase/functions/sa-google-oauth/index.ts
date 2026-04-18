// Google OAuth flow for Sales Assistant — connect each customer's Google Calendar
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
const CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;

const REDIRECT_URI = `${SUPABASE_URL}/functions/v1/sa-google-oauth/callback`;

const SCOPES = [
  'openid',
  'email',
  'profile',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/calendar.readonly',
].join(' ');

const admin = createClient(SUPABASE_URL, SERVICE_KEY);

function html(body: string, status = 200) {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><title>Google Calendar</title>
    <style>body{font-family:system-ui;background:#0a0a0a;color:#fff;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;text-align:center;padding:24px}
    .card{max-width:420px;background:#151515;border:1px solid #2a2a2a;border-radius:16px;padding:32px}
    h1{margin:0 0 12px;font-size:20px}p{color:#aaa;margin:0 0 20px}
    button{background:#10b981;color:#fff;border:0;padding:10px 20px;border-radius:8px;cursor:pointer;font-weight:600}</style></head>
    <body><div class="card">${body}</div>
    <script>setTimeout(()=>{window.opener&&window.opener.postMessage({type:'sa-google-oauth',ok:${status===200}},'*');window.close();},1500);</script>
    </body></html>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.split('/').pop();

  try {
    // ---------- START: requires authenticated user ----------
    if (path === 'start' || (req.method === 'POST' && !path?.includes('callback'))) {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
      const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
      if (!claims?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const userId = claims.claims.sub;

      const body = await req.json().catch(() => ({}));
      const customerProductId = body.customer_product_id as string;
      const redirectTo = (body.redirect_to as string) || '';
      if (!customerProductId) {
        return new Response(JSON.stringify({ error: 'customer_product_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      // verify ownership
      const { data: cp } = await admin.from('customer_products').select('id,user_id').eq('id', customerProductId).maybeSingle();
      if (!cp || cp.user_id !== userId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const state = crypto.randomUUID();
      await admin.from('sa_oauth_states').insert({
        state,
        customer_product_id: customerProductId,
        user_id: userId,
        provider: 'google',
        redirect_to: redirectTo,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      });

      const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
      authUrl.searchParams.set('client_id', CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', SCOPES);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', state);

      return new Response(JSON.stringify({ auth_url: authUrl.toString() }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ---------- CALLBACK: Google redirects here ----------
    if (path === 'callback') {
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const errorParam = url.searchParams.get('error');

      if (errorParam) return html(`<h1>❌ Acesso negado</h1><p>${errorParam}</p>`, 400);
      if (!code || !state) return html('<h1>❌ Parâmetros inválidos</h1>', 400);

      const { data: stateRow } = await admin.from('sa_oauth_states').select('*').eq('state', state).maybeSingle();
      if (!stateRow) return html('<h1>❌ Sessão expirada</h1><p>Tente novamente.</p>', 400);
      if (new Date(stateRow.expires_at).getTime() < Date.now()) {
        await admin.from('sa_oauth_states').delete().eq('state', state);
        return html('<h1>⏱️ Sessão expirada</h1>', 400);
      }

      // Exchange code for tokens
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: CLIENT_ID,
          client_secret: CLIENT_SECRET,
          redirect_uri: REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });
      const tokens = await tokenRes.json();
      if (!tokenRes.ok) {
        console.error('Google token exchange failed', tokens);
        return html(`<h1>❌ Falha ao obter token</h1><p>${tokens.error_description || tokens.error}</p>`, 400);
      }

      // Fetch user email
      const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokens.access_token}` },
      });
      const userInfo = await userInfoRes.json();

      // Upsert connection
      await admin.from('sa_calendar_connections').upsert({
        customer_product_id: stateRow.customer_product_id,
        provider: 'google',
        google_email: userInfo.email,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token ?? null,
        token_expires_at: new Date(Date.now() + (tokens.expires_in ?? 3600) * 1000).toISOString(),
        scope: tokens.scope,
        calendar_id: 'primary',
        is_active: true,
        last_synced_at: new Date().toISOString(),
      }, { onConflict: 'customer_product_id,provider' });

      await admin.from('sa_oauth_states').delete().eq('state', state);

      return html(`<h1>✅ Conectado!</h1><p>${userInfo.email}</p><p>Pode fechar esta janela.</p>`);
    }

    // ---------- STATUS / DISCONNECT ----------
    if (path === 'status' || path === 'disconnect') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader?.startsWith('Bearer ')) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const userClient = createClient(SUPABASE_URL, ANON_KEY, { global: { headers: { Authorization: authHeader } } });
      const { data: claims } = await userClient.auth.getClaims(authHeader.replace('Bearer ', ''));
      if (!claims?.claims) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const userId = claims.claims.sub;

      const body = await req.json().catch(() => ({}));
      const customerProductId = body.customer_product_id as string;
      if (!customerProductId) {
        return new Response(JSON.stringify({ error: 'customer_product_id required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const { data: cp } = await admin.from('customer_products').select('user_id').eq('id', customerProductId).maybeSingle();
      if (!cp || cp.user_id !== userId) {
        return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      if (path === 'disconnect') {
        await admin.from('sa_calendar_connections').delete().eq('customer_product_id', customerProductId).eq('provider', 'google');
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: conn } = await admin
        .from('sa_calendar_connections')
        .select('google_email,is_active,last_synced_at,calendar_id')
        .eq('customer_product_id', customerProductId)
        .eq('provider', 'google')
        .maybeSingle();

      return new Response(JSON.stringify({ connected: !!conn?.is_active, ...conn }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (e) {
    console.error('sa-google-oauth error', e);
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
