/**
 * Z-API helper — send messages via Z-API (legacy)
 * + Evolution API helper — send messages via Evolution API
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

// ========== Evolution API ==========

export interface EvolutionCredentials {
  instanceName: string;
  apiUrl: string;
  apiKey: string;
}

/**
 * Send a text message via Evolution API
 */
export async function evolutionSendText(
  creds: EvolutionCredentials,
  phone: string,
  message: string,
): Promise<void> {
  const sanitizedMessage = message.slice(0, 4096);

  // Ensure phone is in the right format (with @s.whatsapp.net)
  const number = phone.replace(/@.*$/, "");

  const url = `${creds.apiUrl}/message/sendText/${encodeURIComponent(creds.instanceName)}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: creds.apiKey,
    },
    body: JSON.stringify({
      number,
      text: sanitizedMessage,
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text().catch(() => "");
    console.error(`evolution_send_error:${resp.status}:${txt.slice(0, 300)}`);
    throw new Error(`evolution_send_error:${resp.status}`);
  } else {
    console.log("[evolution] message sent to", number);
  }
}

/**
 * Load Evolution API credentials for a user from product_credentials + env
 */
export async function loadEvolutionCredentials(
  service: any,
  userId: string,
): Promise<EvolutionCredentials | null> {
  // First try evolution_instances table (primary source)
  const { data: evoInstance } = await service
    .from("evolution_instances")
    .select("instance_name, evolution_url, evolution_apikey")
    .eq("user_id", userId)
    .eq("is_active", true)
    .maybeSingle();

  if (evoInstance?.instance_name) {
    return {
      instanceName: evoInstance.instance_name,
      apiUrl: (evoInstance.evolution_url || "").replace(/\/$/, ""),
      apiKey: evoInstance.evolution_apikey || "",
    };
  }

  // Fallback: product_credentials + env vars
  const apiUrl = Deno.env.get("EVOLUTION_API_URL");
  const apiKey = Deno.env.get("EVOLUTION_GLOBAL_APIKEY");

  if (!apiUrl || !apiKey) {
    console.error("Evolution API env vars missing and no evolution_instances entry");
    return null;
  }

  const { data: creds } = await service
    .from("product_credentials")
    .select("credential_value")
    .eq("user_id", userId)
    .eq("product_slug", "bots-automacao")
    .eq("credential_key", "evolution_instance_name")
    .maybeSingle();

  if (!creds?.credential_value) {
    console.error("Evolution instance name not found for user", userId);
    return null;
  }

  return {
    instanceName: creds.credential_value,
    apiUrl: apiUrl.replace(/\/$/, ""),
    apiKey,
  };
}
