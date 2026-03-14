import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const sb = createClient(supabaseUrl, serviceKey);

interface LogEntry {
  level?: 'info' | 'warn' | 'error' | 'debug';
  source?: string;
  function_name?: string;
  event_type?: string;
  message: string;
  duration_ms?: number;
  status_code?: number;
  user_id?: string;
  metadata?: Record<string, unknown>;
  error_stack?: string;
}

export async function platformLog(entry: LogEntry) {
  try {
    await sb.from('platform_logs').insert({
      level: entry.level ?? 'info',
      source: entry.source ?? 'edge_function',
      function_name: entry.function_name,
      event_type: entry.event_type ?? 'execution',
      message: entry.message,
      duration_ms: entry.duration_ms ?? 0,
      status_code: entry.status_code,
      user_id: entry.user_id,
      metadata: entry.metadata ?? {},
      error_stack: entry.error_stack,
    });
  } catch (e) {
    console.error('[platform-logger] write failed:', e);
  }
}

/**
 * Wraps an edge function handler with automatic logging.
 * Logs start, success, and error with duration.
 */
export function withLogging(
  functionName: string,
  handler: (req: Request) => Promise<Response>
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    const start = Date.now();
    try {
      const res = await handler(req);
      const duration = Date.now() - start;
      // Log only non-OPTIONS
      if (req.method !== 'OPTIONS') {
        platformLog({
          function_name: functionName,
          message: `${req.method} ${functionName} → ${res.status}`,
          duration_ms: duration,
          status_code: res.status,
          level: res.status >= 400 ? 'error' : 'info',
          metadata: { method: req.method, url: req.url },
        });
      }
      return res;
    } catch (err: any) {
      const duration = Date.now() - start;
      platformLog({
        function_name: functionName,
        message: `${req.method} ${functionName} CRASH: ${err.message}`,
        duration_ms: duration,
        status_code: 500,
        level: 'error',
        error_stack: err.stack,
        metadata: { method: req.method, url: req.url },
      });
      throw err;
    }
  };
}
