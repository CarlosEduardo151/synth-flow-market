/**
 * Z-API helper — send messages via Z-API
 */

export interface ZAPICredentials {
  instanceId: string;
  token: string;
  clientToken: string;
}

export async function zapiSendText(
  creds: ZAPICredentials,
  phone: string,
  message: string,
  messageId?: string,
): Promise<void> {
  if (!creds.instanceId || !creds.token) {
    throw new Error("zapi_missing_credentials");
  }

  // Sanitize message — limit to 4096 chars
  const sanitizedMessage = message.slice(0, 4096);

  const url = `https://api.z-api.io/instances/${encodeURIComponent(creds.instanceId)}/token/${encodeURIComponent(creds.token)}/send-text`;

  const body: Record<string, string> = { phone, message: sanitizedMessage };
  if (messageId) body.messageId = messageId;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "client-token": creds.clientToken || "",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    console.error(`zapi_send_error:${resp.status}:${txt.slice(0, 200)}`);
    throw new Error(`zapi_send_error:${resp.status}`);
  }
}

/**
 * Load Z-API credentials for a user from product_credentials
 */
export async function loadZAPICredentials(
  service: any,
  userId: string,
): Promise<ZAPICredentials | null> {
  const { data: creds } = await service
    .from("product_credentials")
    .select("credential_key, credential_value")
    .eq("user_id", userId)
    .eq("product_slug", "bots-automacao")
    .in("credential_key", ["zapi_instance_id", "zapi_token", "zapi_client_token"]);

  const credMap: Record<string, string> = {};
  for (const c of creds || []) credMap[c.credential_key] = c.credential_value || "";

  if (!credMap["zapi_instance_id"] || !credMap["zapi_token"]) {
    return null;
  }

  return {
    instanceId: credMap["zapi_instance_id"],
    token: credMap["zapi_token"],
    clientToken: credMap["zapi_client_token"] || "",
  };
}
