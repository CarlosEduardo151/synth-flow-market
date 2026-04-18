// Shared Efí Bank (Gerencianet) helper - SANDBOX/Homologação
// Docs: https://dev.efipay.com.br/

const EFI_PIX_BASE_URL = Deno.env.get('EFI_BASE_URL') ?? 'https://pix-h.api.efipay.com.br'; // homologação
const EFI_OAUTH_PATH = '/oauth/token';

export interface EfiTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

let cachedToken: { token: string; expiresAt: number } | null = null;

/**
 * Get OAuth2 access token from Efí Bank.
 * NOTE: In production, Efí requires mTLS with a .p12 certificate.
 * In Lovable Edge Functions (Deno) we cannot natively attach client certs,
 * so this implementation works for OAuth password-less flows in homologação
 * when the account has been configured to allow it, OR when an upstream
 * proxy is used. If your Efí account requires mTLS, configure a proxy URL
 * via the EFI_BASE_URL secret pointing to your mTLS-capable gateway.
 */
export async function getEfiAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) {
    return cachedToken.token;
  }

  const clientId = Deno.env.get('EFI_CLIENT_ID');
  const clientSecret = Deno.env.get('EFI_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('EFI_CLIENT_ID / EFI_CLIENT_SECRET not configured');
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(`${EFI_PIX_BASE_URL}${EFI_OAUTH_PATH}`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ grant_type: 'client_credentials' }),
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('Efí OAuth error:', data);
    throw new Error(
      `Efí auth failed (${res.status}): ${data.error_description || data.error || JSON.stringify(data)}. ` +
      `Se sua conta Efí exige mTLS (certificado .p12), configure um proxy mTLS e defina EFI_BASE_URL.`
    );
  }

  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };

  return data.access_token;
}

export async function efiRequest<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await getEfiAccessToken();
  const res = await fetch(`${EFI_PIX_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers || {}),
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Efí request failed [${path}]:`, data);
    throw new Error((data as any).message || (data as any).mensagem || `Efí error ${res.status}`);
  }
  return data as T;
}

/**
 * Create an immediate PIX charge (cobrança imediata).
 * Returns the charge with txid + location for QR code.
 */
export async function createPixCharge(params: {
  amount: number; // in BRL (e.g. 10.50)
  pixKey: string; // chave PIX do recebedor (cadastrada na Efí)
  payerName?: string;
  payerCpf?: string;
  description?: string;
  expirationSeconds?: number;
}) {
  const body: any = {
    calendario: { expiracao: params.expirationSeconds ?? 3600 },
    valor: { original: params.amount.toFixed(2) },
    chave: params.pixKey,
    solicitacaoPagador: params.description?.substring(0, 140) ?? 'Pagamento NovaLink',
  };

  if (params.payerCpf && params.payerName) {
    body.devedor = { cpf: params.payerCpf.replace(/\D/g, ''), nome: params.payerName };
  }

  return efiRequest<{
    txid: string;
    loc: { id: number; location: string };
    location: string;
    pixCopiaECola: string;
    status: string;
    valor: { original: string };
  }>('/v2/cob', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function getPixQrCode(locId: number) {
  return efiRequest<{ qrcode: string; imagemQrcode: string; linkVisualizacao?: string }>(
    `/v2/loc/${locId}/qrcode`,
    { method: 'GET' }
  );
}
