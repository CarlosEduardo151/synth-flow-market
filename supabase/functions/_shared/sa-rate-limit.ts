// Rate-limit persistente baseado em sa_rate_limit (Postgres)
// Funciona em ambientes serverless (sem state em memória entre invocações)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export interface SaRateLimitConfig {
  endpoint: string;
  windowSeconds: number;
  maxRequests: number;
}

export interface SaRateLimitResult {
  limited: boolean;
  remaining: number;
  retryAfterSeconds?: number;
}

/**
 * Aplica rate-limit por (identificador, endpoint) usando a tabela sa_rate_limit.
 * Usa upsert + janela deslizante simples (reseta quando window_start expira).
 */
export async function checkSaRateLimit(
  identifier: string,
  config: SaRateLimitConfig,
): Promise<SaRateLimitResult> {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) return { limited: false, remaining: config.maxRequests };

  const supabase = createClient(url, key);
  const now = new Date();
  const windowMs = config.windowSeconds * 1000;

  const { data: existing } = await supabase
    .from("sa_rate_limit")
    .select("id,request_count,window_start")
    .eq("identifier", identifier)
    .eq("endpoint", config.endpoint)
    .maybeSingle();

  if (!existing) {
    await supabase.from("sa_rate_limit").insert({
      identifier,
      endpoint: config.endpoint,
      request_count: 1,
      window_start: now.toISOString(),
    });
    return { limited: false, remaining: config.maxRequests - 1 };
  }

  const windowStart = new Date(existing.window_start).getTime();
  const elapsed = now.getTime() - windowStart;

  if (elapsed >= windowMs) {
    // Janela expirada → reseta
    await supabase
      .from("sa_rate_limit")
      .update({ request_count: 1, window_start: now.toISOString() })
      .eq("id", existing.id);
    return { limited: false, remaining: config.maxRequests - 1 };
  }

  if (existing.request_count >= config.maxRequests) {
    return {
      limited: true,
      remaining: 0,
      retryAfterSeconds: Math.ceil((windowMs - elapsed) / 1000),
    };
  }

  await supabase
    .from("sa_rate_limit")
    .update({ request_count: existing.request_count + 1 })
    .eq("id", existing.id);

  return { limited: false, remaining: config.maxRequests - existing.request_count - 1 };
}

export function rateLimitResponse(retryAfter: number, origin?: string | null) {
  return new Response(
    JSON.stringify({
      error: "Rate limit excedido",
      message: `Tente novamente em ${retryAfter}s`,
      retry_after_seconds: retryAfter,
    }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfter),
        "Access-Control-Allow-Origin": origin || "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    },
  );
}

export const SA_RATE_LIMITS = {
  HEALTH_SCAN: { windowSeconds: 60, maxRequests: 5 },
  ANTICHURN_SCAN: { windowSeconds: 60, maxRequests: 5 },
  WINBACK_SCAN: { windowSeconds: 60, maxRequests: 5 },
  COPILOT_CHAT: { windowSeconds: 60, maxRequests: 30 },
  ROLEPLAY_CHAT: { windowSeconds: 60, maxRequests: 30 },
  ACTION: { windowSeconds: 60, maxRequests: 60 },
};
