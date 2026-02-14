// ========================================
// CORS CONFIGURATION - SECURITY HARDENED
// Whitelist de origens permitidas
// ========================================

const ALLOWED_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://agndhravgmcwpdjkozka.supabase.co',
  // Lovable preview domains (este projeto)
  'https://id-preview--4b638d23-1bbd-400f-85e1-8df70617efd4.lovable.app',
  'https://4b638d23-1bbd-400f-85e1-8df70617efd4.lovableproject.com',
  'https://id-preview--e36abe90-829b-426c-b93a-7bf13ba510e9.lovable.app',
  'https://e36abe90-829b-426c-b93a-7bf13ba510e9.lovableproject.com',
  // Adicione suas URLs de produção aqui:
  // 'https://seu-dominio.com',
  // 'https://www.seu-dominio.com'
];

export function getCorsHeaders(origin?: string | null): Record<string, string> {
  // Verificar se a origem está na whitelist
  const isAllowed = origin && ALLOWED_ORIGINS.includes(origin);
  
  return {
    'Access-Control-Allow-Origin': isAllowed ? origin : ALLOWED_ORIGINS[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
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
