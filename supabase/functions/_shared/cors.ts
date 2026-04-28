// ========================================
// CORS CONFIGURATION - SECURITY HARDENED
// Whitelist de origens permitidas
// ========================================

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  // Lovable preview domains (este projeto)
  'https://id-preview--e36abe90-829b-426c-b93a-7bf13ba510e9.lovable.app',
  'https://e36abe90-829b-426c-b93a-7bf13ba510e9.lovableproject.com',
  // Produção oficial
  'https://starai.com.br',
  'https://www.starai.com.br',
  'https://novalink.com.br',
  'https://www.novalink.com.br',
];

// Wildcard patterns para subdomínios autorizados (Lovable previews dinâmicos)
const ALLOWED_PATTERNS = [
  /^https:\/\/[a-z0-9-]+\.lovable\.app$/,
  /^https:\/\/[a-z0-9-]+\.lovableproject\.com$/,
];

export function getCorsHeaders(origin?: string | null): Record<string, string> {
  // Verificar se a origem está na whitelist (exato ou padrão)
  const isAllowed = origin && (
    ALLOWED_ORIGINS.includes(origin) ||
    ALLOWED_PATTERNS.some((p) => p.test(origin))
  );
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}

export function handleCorsPreflightRequest(req: Request): Response {
  const origin = req.headers.get('Origin');
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(origin),
  });
}

export function corsResponse(data: any, status: number, origin?: string | null): Response {
  return new Response(
    JSON.stringify(data),
    {
      status,
      headers: {
        ...getCorsHeaders(origin),
        'Content-Type': 'application/json',
      },
    }
  );
}
