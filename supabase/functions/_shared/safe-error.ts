/**
 * Sanitiza erros para resposta ao cliente.
 * - Loga o erro completo no servidor (visível em LogFlare/Edge Logs)
 * - Retorna mensagem genérica ao cliente, sem vazar stack/SQL/internals
 */
export function sanitizeError(err: unknown, context: string): {
  publicMessage: string;
  errorId: string;
} {
  const errorId = crypto.randomUUID().slice(0, 8);
  const detail = err instanceof Error ? err.stack || err.message : String(err);
  console.error(`[${context}] errorId=${errorId}`, detail);
  return {
    publicMessage: 'Erro interno. Nossa equipe foi notificada.',
    errorId,
  };
}

/**
 * Valida JWT do Authorization header. Retorna user claims ou null.
 */
export async function requireAuth(
  req: Request,
  supabaseUrl: string,
  anonKey: string,
): Promise<{ userId: string; email?: string } | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  try {
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.7.1');
    const sb = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error } = await sb.auth.getUser(token);
    if (error || !data?.user) return null;
    return { userId: data.user.id, email: data.user.email ?? undefined };
  } catch {
    return null;
  }
}
