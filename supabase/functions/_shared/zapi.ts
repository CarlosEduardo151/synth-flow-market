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
 * Send presence indicator (composing / recording / paused / available) via Evolution API.
 * Used for anti-ban protocols to simulate human typing behavior.
 */
export async function evolutionSendPresence(
  creds: EvolutionCredentials,
  phone: string,
  presence: "composing" | "recording" | "paused" | "available" | "unavailable" = "composing",
  delayMs?: number,
): Promise<void> {
  const number = phone.replace(/@.*$/, "");
  const url = `${creds.apiUrl}/chat/sendPresence/${encodeURIComponent(creds.instanceName)}`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: creds.apiKey },
      body: JSON.stringify({
        number,
        presence,
        // Evolution API requires `delay` (in ms). Default to 1200ms when not provided.
        delay: typeof delayMs === "number" && delayMs > 0 ? delayMs : 1200,
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      console.warn(`evolution_send_presence_warn:${resp.status}:${txt.slice(0, 200)}`);
    }
  } catch (e) {
    // Non-fatal — presence is a best-effort signal
    console.warn("evolution_send_presence_failed:", e instanceof Error ? e.message : e);
  }
}

/**
 * Mark a chat / message as read via Evolution API.
 * Used for anti-ban protocols to simulate the user opening the conversation
 * before responding (a human reads first, then types).
 */
export async function evolutionMarkRead(
  creds: EvolutionCredentials,
  phone: string,
  messageId?: string,
  remoteJid?: string,
): Promise<void> {
  const number = phone.replace(/@.*$/, "");
  const jid = remoteJid || `${number}@s.whatsapp.net`;
  const url = `${creds.apiUrl}/chat/markMessageAsRead/${encodeURIComponent(creds.instanceName)}`;

  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: creds.apiKey },
      body: JSON.stringify({
        readMessages: [
          {
            remoteJid: jid,
            fromMe: false,
            id: messageId || "",
          },
        ],
      }),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      console.warn(`evolution_mark_read_warn:${resp.status}:${txt.slice(0, 200)}`);
    }
  } catch (e) {
    console.warn("evolution_mark_read_failed:", e instanceof Error ? e.message : e);
  }
}

/**
 * Send an audio message via Evolution API using base64
 */
export async function evolutionSendAudio(
  creds: EvolutionCredentials,
  phone: string,
  audioBase64: string,
): Promise<void> {
  const number = phone.replace(/@.*$/, "");
  const url = `${creds.apiUrl}/message/sendWhatsAppAudio/${encodeURIComponent(creds.instanceName)}`;

  const dataUri = audioBase64.startsWith("data:")
    ? audioBase64
    : `data:audio/mpeg;base64,${audioBase64}`;
  const rawBase64 = dataUri.replace(/^data:[^;]+;base64,/, "");

  const payloads = [
    {
      number,
      audioMessage: {
        audio: dataUri,
      },
      options: {
        encoding: true,
        presence: "recording",
      },
    },
    {
      number,
      audioMessage: {
        audio: rawBase64,
      },
      options: {
        encoding: true,
        presence: "recording",
      },
    },
    {
      number,
      audio: dataUri,
      options: {
        encoding: true,
        presence: "recording",
      },
    },
    {
      number,
      audio: rawBase64,
      options: {
        encoding: true,
        presence: "recording",
      },
    },
  ];

  let lastStatus = 0;
  let lastError = "";

  for (const [index, payload] of payloads.entries()) {
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: creds.apiKey,
      },
      body: JSON.stringify(payload),
    });

    if (resp.ok) {
      console.log(`[evolution] audio sent to ${number} using payload variant ${index + 1}`);
      return;
    }

    lastStatus = resp.status;
    lastError = await resp.text().catch(() => "");
    console.warn(`evolution_send_audio_attempt_${index + 1}_error:${resp.status}:${lastError.slice(0, 300)}`);
  }

  console.error(`evolution_send_audio_error:${lastStatus}:${lastError.slice(0, 300)}`);
  throw new Error(`evolution_send_audio_error:${lastStatus}`);
}

/**
 * Load Evolution API credentials for a user from product_credentials + env
 */
export async function loadEvolutionCredentials(
  service: any,
  userId: string,
  customerProductId?: string,
): Promise<EvolutionCredentials | null> {
  // First try evolution_instances table (primary source)
  // When customerProductId is provided, filter by it to avoid picking the wrong instance
  // (e.g. CRM instance vs bot instance for the same user).
  let query = service
    .from("evolution_instances")
    .select("instance_name, evolution_url, evolution_apikey")
    .eq("user_id", userId)
    .eq("is_active", true);

  if (customerProductId) {
    query = query.eq("customer_product_id", customerProductId);
  }

  const { data: evoInstance } = await query
    .order("created_at", { ascending: false })
    .limit(1)
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
