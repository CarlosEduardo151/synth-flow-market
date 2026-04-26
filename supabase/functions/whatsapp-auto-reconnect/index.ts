// Worker que monitora todas as instâncias Evolution ativas e tenta
// reconectá-las automaticamente quando caem, com backoff exponencial.
//
// Pode ser chamado:
//  - via pg_cron a cada minuto (sem auth, verify_jwt=false)
//  - manualmente via UI ("Reconectar agora") com um JWT do usuário
//
// Estratégia:
//  1. Lista TODAS as instâncias ativas no Evolution (fetchInstances).
//  2. Para cada instance_name registrada em evolution_instances (filtrada
//     opcionalmente por user_id quando vem do front), checa o estado.
//  3. Se estiver "open" → reseta contador de retry, registra healthy.
//  4. Se NÃO estiver "open":
//       a) tenta /instance/connect (gera QR sem precisar de scan se a
//          sessão Baileys ainda tem credentials persistidas no servidor —
//          é o caso típico de "caiu por tempo de inatividade").
//       b) se subir para "connecting" ou "open", ótimo.
//       c) caso contrário, agenda próxima tentativa com backoff
//          exponencial (30s → 1m → 2m → 5m → 10m → 30m, máx 30m).
//  5. Garante que o webhook está reconfigurado em cada tentativa
//     (evita o cenário "instância subiu mas webhook ficou apontando
//     para o lugar errado e mensagens nunca chegam").
//
// Importante: NUNCA cria instância nova nem força logout. Só reaproveita.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const EVOLUTION_URL = () => (Deno.env.get("EVOLUTION_API_URL") || "").replace(/\/$/, "");
const EVOLUTION_KEY = () => Deno.env.get("EVOLUTION_GLOBAL_APIKEY") || "";

const WEBHOOK_EVENTS = ["MESSAGES_UPSERT", "MESSAGES_UPDATE", "CONNECTION_UPDATE", "QRCODE_UPDATED"];

// Backoff: 30s, 1m, 2m, 5m, 10m, 20m, 30m (cap)
const BACKOFF_SECONDS = [30, 60, 120, 300, 600, 1200, 1800];

function nextDelaySeconds(attempt: number): number {
  if (attempt < 0) attempt = 0;
  const idx = Math.min(attempt, BACKOFF_SECONDS.length - 1);
  return BACKOFF_SECONDS[idx];
}

async function fetchEvolutionInstances(): Promise<any[]> {
  try {
    const r = await fetch(`${EVOLUTION_URL()}/instance/fetchInstances`, {
      headers: { apikey: EVOLUTION_KEY() },
    });
    if (!r.ok) return [];
    const list = await r.json().catch(() => []);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function mapEvo(inst: any) {
  const name = inst?.name || inst?.instanceName || inst?.instance?.instanceName;
  if (!name) return null;
  const state = inst?.connectionStatus || inst?.state || inst?.instance?.state || "unknown";
  return { name, state };
}

async function getConnectionState(name: string): Promise<string> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 6000);
    const r = await fetch(
      `${EVOLUTION_URL()}/instance/connectionState/${encodeURIComponent(name)}`,
      { headers: { apikey: EVOLUTION_KEY() }, signal: ctrl.signal },
    ).finally(() => clearTimeout(t));
    const d = await r.json().catch(() => null);
    return d?.instance?.state || d?.state || "unknown";
  } catch {
    return "unreachable";
  }
}

async function tryReconnect(name: string): Promise<{ ok: boolean; state: string; error?: string }> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(
      `${EVOLUTION_URL()}/instance/connect/${encodeURIComponent(name)}`,
      { headers: { apikey: EVOLUTION_KEY() }, signal: ctrl.signal },
    ).finally(() => clearTimeout(t));
    const d = await r.json().catch(() => null);
    if (!r.ok) {
      return { ok: false, state: "error", error: `connect ${r.status}: ${JSON.stringify(d)?.slice(0, 200)}` };
    }
    // Pequena espera para o estado estabilizar
    await new Promise((res) => setTimeout(res, 1500));
    const newState = await getConnectionState(name);
    return { ok: newState === "open" || newState === "connecting", state: newState };
  } catch (e) {
    return { ok: false, state: "error", error: e instanceof Error ? e.message : String(e) };
  }
}

async function reconfigureWebhook(name: string, webhookUrl: string): Promise<boolean> {
  const cfg = {
    enabled: true,
    url: webhookUrl,
    webhookByEvents: false,
    webhookBase64: true,
    events: WEBHOOK_EVENTS,
  };
  const nested = {
    enabled: true,
    url: webhookUrl,
    byEvents: false,
    base64: true,
    events: WEBHOOK_EVENTS,
  };
  const payloads = [{ webhook: nested }, cfg];
  for (const p of payloads) {
    try {
      const r = await fetch(`${EVOLUTION_URL()}/webhook/set/${encodeURIComponent(name)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: EVOLUTION_KEY() },
        body: JSON.stringify(p),
      });
      if (r.ok) return true;
    } catch { /* try next */ }
  }
  return false;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (!EVOLUTION_URL() || !EVOLUTION_KEY()) {
    return json({ error: "evolution_not_configured" }, 500);
  }

  const startedAt = Date.now();
  const sb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Filtros opcionais (ex: scope=user&user_id=...)
  let body: any = {};
  try { body = await req.json(); } catch { /* GET ou vazio */ }
  const url = new URL(req.url);
  const force = body?.force === true || url.searchParams.get("force") === "true";
  const targetUserId = (body?.user_id as string) || url.searchParams.get("user_id") || null;
  const targetInstanceName = (body?.instance_name as string) || null;

  // Carrega instâncias ativas para monitorar (uma linha por (user, product))
  let q = sb
    .from("evolution_instances")
    .select("id, user_id, customer_product_id, instance_name, reconnect_attempts, next_reconnect_at, last_health_check_at, connection_state")
    .eq("is_active", true);

  if (targetUserId) q = q.eq("user_id", targetUserId);
  if (targetInstanceName) q = q.eq("instance_name", targetInstanceName);

  const { data: rows, error: rowsErr } = await q;
  if (rowsErr) return json({ error: "list_failed", details: rowsErr.message }, 500);

  // Deduplica por instance_name (a mesma instância pode estar ligada a vários produtos)
  const uniqueByName = new Map<string, any>();
  for (const r of rows || []) {
    if (!uniqueByName.has(r.instance_name)) uniqueByName.set(r.instance_name, r);
  }

  const evoList = await fetchEvolutionInstances();
  const evoByName = new Map<string, ReturnType<typeof mapEvo>>();
  for (const inst of evoList) {
    const m = mapEvo(inst);
    if (m) evoByName.set(m.name, m);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const nowIso = new Date().toISOString();
  const results: any[] = [];

  for (const r of uniqueByName.values()) {
    const name = r.instance_name as string;
    const attempts = (r.reconnect_attempts as number) || 0;
    const dueAt = r.next_reconnect_at ? new Date(r.next_reconnect_at as string).getTime() : 0;
    const skipForBackoff = !force && dueAt > Date.now();

    const evoMeta = evoByName.get(name);
    let state = evoMeta?.state || (await getConnectionState(name));

    // Caso healthy → reseta contadores
    if (state === "open") {
      await sb.from("evolution_instances")
        .update({
          connection_state: "open",
          last_health_check_at: nowIso,
          reconnect_attempts: 0,
          next_reconnect_at: null,
          last_reconnect_error: null,
          connecting_since: null,
          updated_at: nowIso,
        })
        .eq("instance_name", name);
      results.push({ instance: name, state, action: "healthy" });
      continue;
    }

    // Connecting → estado intermediário. Não martelamos /connect:
    // a Evolution já está tentando subir a sessão; chamar /connect de novo
    // gera novo QR e quebra o pareamento que o usuário já fez.
    if (state === "connecting") {
      await sb.from("evolution_instances")
        .update({
          connection_state: "connecting",
          last_health_check_at: nowIso,
          updated_at: nowIso,
        })
        .eq("instance_name", name);
      results.push({ instance: name, state, action: "waiting_handshake" });
      continue;
    }

    if (skipForBackoff) {
      results.push({ instance: name, state, action: "backoff_wait", next_at: r.next_reconnect_at, attempts });
      continue;
    }

    // Tenta reconectar (apenas para estados close/unknown/etc.)
    const attempt = await tryReconnect(name);
    state = attempt.state;

    // Reaplica webhook (uma vez para qualquer customer_product associado)
    const { data: linkedProducts } = await sb
      .from("evolution_instances")
      .select("customer_product_id, customer_products!inner(id, webhook_token)")
      .eq("instance_name", name)
      .eq("is_active", true);

    let webhookOk = false;
    for (const lp of linkedProducts || []) {
      const cp = (lp as any).customer_products;
      if (cp?.webhook_token) {
        const wh = `${supabaseUrl}/functions/v1/whatsapp-ingest?customer_product_id=${cp.id}&token=${cp.webhook_token}`;
        webhookOk = await reconfigureWebhook(name, wh);
        if (webhookOk) break;
      }
    }

    if (state === "open") {
      await sb.from("evolution_instances")
        .update({
          connection_state: "open",
          last_health_check_at: nowIso,
          last_reconnect_attempt_at: nowIso,
          reconnect_attempts: 0,
          next_reconnect_at: null,
          last_reconnect_error: null,
          connecting_since: null,
          updated_at: nowIso,
        })
        .eq("instance_name", name);
      results.push({ instance: name, state, action: "reconnected", webhookOk });
    } else if (state === "connecting") {
      // Reconexão em andamento — não conta como sucesso ainda.
      await sb.from("evolution_instances")
        .update({
          connection_state: "connecting",
          last_health_check_at: nowIso,
          last_reconnect_attempt_at: nowIso,
          next_reconnect_at: new Date(Date.now() + 60_000).toISOString(),
          last_reconnect_error: null,
          updated_at: nowIso,
        })
        .eq("instance_name", name);
      results.push({ instance: name, state, action: "handshake_started", webhookOk });
    } else {
      const newAttempts = attempts + 1;
      const delay = nextDelaySeconds(newAttempts);
      await sb.from("evolution_instances")
        .update({
          connection_state: state,
          last_health_check_at: nowIso,
          last_reconnect_attempt_at: nowIso,
          reconnect_attempts: newAttempts,
          next_reconnect_at: new Date(Date.now() + delay * 1000).toISOString(),
          last_reconnect_error: attempt.error || `state=${state}`,
          updated_at: nowIso,
        })
        .eq("instance_name", name);
      results.push({
        instance: name, state, action: "retry_scheduled",
        attempts: newAttempts, next_in_seconds: delay, error: attempt.error,
      });
    }
  }

  // Log resumido
  try {
    await sb.from("platform_logs").insert({
      level: results.some((r) => r.action === "retry_scheduled") ? "warn" : "info",
      source: "edge_function",
      function_name: "whatsapp-auto-reconnect",
      event_type: "scan",
      message: `auto-reconnect scan processed ${results.length} instances`,
      duration_ms: Date.now() - startedAt,
      metadata: { results, force, targetUserId, targetInstanceName },
    });
  } catch { /* best effort */ }

  return json({ ok: true, scanned: results.length, results, duration_ms: Date.now() - startedAt });
});
