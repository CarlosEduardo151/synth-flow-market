import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

// URL base da API do bot
const BOT_API_URL = Deno.env.get("BOT_API_URL") || "http://api.starai.com.br/api/bot";

// Timeout para requisições (10 segundos)
const FETCH_TIMEOUT = 10000;

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function errorJson(status: number, error: string, details?: unknown) {
  return new Response(JSON.stringify({ error, details }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getAuthUserId(req: Request): Promise<string> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    throw new Error("Missing Authorization header");
  }

  const token = authHeader.slice("Bearer ".length);
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user?.id) {
    throw new Error("Invalid auth token");
  }
  return data.user.id;
}

serve(async (req) => {
  console.log("[bot-proxy] Request received:", req.method);

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return errorJson(405, "Method not allowed");
    }

    // Deriva um ID estável do cliente SEM expor no frontend
    const authUserId = await getAuthUserId(req);
    const externalUid = `cliente_${authUserId}`;

    const body = await req.json().catch(() => ({}));
    let action = typeof body?.action === "string" ? body.action : "";
    if (!action) {
      if (body?.saldo !== undefined) action = "conectar";
      else action = "status";
    }

    console.log("[bot-proxy] Action:", action);

    if (action === "conectar") {
      const saldo = Number(body?.saldo);

      if (!Number.isFinite(saldo) || saldo <= 0) {
        return errorJson(400, "saldo inválido");
      }

      const connectUrl = `${BOT_API_URL}/conectar`;
      console.log(`[bot-proxy] Connecting to: ${connectUrl}`);

      const upstream = await fetchWithTimeout(
        connectUrl,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ user_id: externalUid, saldo }),
        },
        FETCH_TIMEOUT,
      );

      const responseText = await upstream.text();
      console.log(`[bot-proxy] Upstream response: status=${upstream.status}`);

      if (!upstream.ok) {
        return errorJson(upstream.status, `API retornou erro ${upstream.status}`, responseText);
      }

      // Não retorna o UID para o cliente (para não expor)
      return new Response(JSON.stringify({ status: "ok" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "status") {
      const statusUrl = `${BOT_API_URL}/status/${encodeURIComponent(externalUid)}`;
      // console.log(`[bot-proxy] Status check: ${statusUrl}`); // não logar uid

      const upstream = await fetchWithTimeout(
        statusUrl,
        {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        },
        FETCH_TIMEOUT,
      );

      const responseText = await upstream.text();
      console.log(`[bot-proxy] Upstream response: status=${upstream.status}`);

      if (!upstream.ok) {
        return errorJson(upstream.status, `API retornou erro ${upstream.status}`, responseText);
      }

      return new Response(responseText, {
        status: upstream.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return errorJson(400, "Ação inválida");
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Erro desconhecido";
    console.error("[bot-proxy] Error:", msg);
    return errorJson(500, msg);
  }
});

