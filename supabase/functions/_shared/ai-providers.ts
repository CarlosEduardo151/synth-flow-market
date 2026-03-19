/**
 * Shared AI Provider helpers — OpenAI & Google Gemini
 * Used by whatsapp-bot-engine, whatsapp-internal-chat, etc.
 */

// ========== Types ==========

export type ResolvedProvider = "openai" | "google";

export interface AICallOptions {
  apiKey: string;
  model: string;
  systemPrompt: string;
  temperature: number;
  maxTokens: number;
}

export interface AIUsageResult {
  text: string;
  tokensInput: number;
  tokensOutput: number;
  tokensTotal: number;
}

// ========== OpenAI ==========

export interface ConversationMessage {
  role: "user" | "assistant";
  content: string;
}

export async function openaiChat(
  opts: AICallOptions,
  userContent: string | any[],
  conversationHistory?: ConversationMessage[],
): Promise<AIUsageResult> {
  const messages: any[] = [
    { role: "system", content: opts.systemPrompt || "" },
  ];

  // Inject conversation history for memory
  if (conversationHistory?.length) {
    for (const msg of conversationHistory) {
      messages.push({ role: msg.role, content: msg.content });
    }
  }

  messages.push({ role: "user", content: userContent });

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${opts.apiKey}`,
    },
    body: JSON.stringify({
      model: opts.model || "gpt-4o-mini",
      temperature: clampNumber(opts.temperature, 0, 2, 0.7),
      max_tokens: clampNumber(opts.maxTokens, 1, 4096, 512),
      messages,
    }),
  });

  const json = await resp.json().catch(() => null);
  if (!resp.ok) throw new Error(`openai_error:${resp.status}:${safeStringify(json)}`);
  const text = json?.choices?.[0]?.message?.content?.trim() || "";
  const usage = json?.usage;
  return {
    text,
    tokensInput: usage?.prompt_tokens || 0,
    tokensOutput: usage?.completion_tokens || 0,
    tokensTotal: usage?.total_tokens || 0,
  };
}

export async function openaiTranscribe(apiKey: string, audioBlob: Blob): Promise<string> {
  const formData = new FormData();
  formData.append("file", audioBlob, "audio.ogg");
  formData.append("model", "whisper-1");
  formData.append("language", "pt");

  const resp = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: formData,
  });

  const json = await resp.json().catch(() => null);
  if (!resp.ok) throw new Error(`whisper_error:${resp.status}:${safeStringify(json)}`);
  return json?.text || "";
}

// ========== Google Gemini ==========

function geminiModelPath(model?: string): string {
  const m = model || "gemini-2.5-flash";
  return m.startsWith("models/") ? m : `models/${m}`;
}

export async function geminiChat(
  opts: AICallOptions,
  userText: string,
): Promise<AIUsageResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/${geminiModelPath(opts.model)}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: {
        temperature: clampNumber(opts.temperature, 0, 2, 0.7),
        maxOutputTokens: clampNumber(opts.maxTokens, 1, 8192, 512),
      },
      systemInstruction: { parts: [{ text: opts.systemPrompt }] },
      contents: [{ role: "user", parts: [{ text: userText }] }],
    }),
  });

  const json = await resp.json().catch(() => null);
  if (!resp.ok) throw new Error(`gemini_error:${resp.status}:${safeStringify(json)}`);
  const text = extractGeminiText(json);
  const usage = json?.usageMetadata;
  return {
    text,
    tokensInput: usage?.promptTokenCount || 0,
    tokensOutput: usage?.candidatesTokenCount || 0,
    tokensTotal: usage?.totalTokenCount || 0,
  };
}

export async function geminiMultimodal(
  opts: AICallOptions,
  inlineData: { mimeType: string; data: string },
  textPrompt: string,
): Promise<AIUsageResult> {
  const url = `https://generativelanguage.googleapis.com/v1beta/${geminiModelPath(opts.model)}:generateContent?key=${encodeURIComponent(opts.apiKey)}`;

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      generationConfig: {
        temperature: clampNumber(opts.temperature, 0, 2, 0.7),
        maxOutputTokens: clampNumber(opts.maxTokens, 1, 8192, 512),
      },
      systemInstruction: { parts: [{ text: opts.systemPrompt }] },
      contents: [{
        role: "user",
        parts: [
          { inlineData },
          { text: textPrompt },
        ],
      }],
    }),
  });

  const json = await resp.json().catch(() => null);
  if (!resp.ok) throw new Error(`gemini_multimodal_error:${resp.status}:${safeStringify(json)}`);
  const text = extractGeminiText(json);
  const usage = json?.usageMetadata;
  return {
    text,
    tokensInput: usage?.promptTokenCount || 0,
    tokensOutput: usage?.candidatesTokenCount || 0,
    tokensTotal: usage?.totalTokenCount || 0,
  };
}

// ========== Unified dispatchers ==========

export async function processText(
  provider: ResolvedProvider,
  opts: AICallOptions,
  text: string,
): Promise<AIUsageResult> {
  if (provider === "google") return geminiChat(opts, text);
  return openaiChat(opts, text);
}

export async function processImage(
  provider: ResolvedProvider,
  opts: AICallOptions,
  imageUrl: string,
  caption: string,
): Promise<AIUsageResult> {
  const prompt = caption || "Analise esta imagem detalhadamente. Responda em português.";

  if (provider === "google") {
    const { base64, mimeType } = await downloadAsBase64(imageUrl);
    return geminiMultimodal(opts, { mimeType, data: base64 }, prompt);
  }

  return openaiChat(opts, [
    { type: "image_url", image_url: { url: imageUrl } },
    { type: "text", text: prompt },
  ]);
}

export async function processAudio(
  provider: ResolvedProvider,
  opts: AICallOptions,
  audioUrl: string,
): Promise<AIUsageResult> {
  if (provider === "google") {
    const { base64, mimeType } = await downloadAsBase64(audioUrl);
    return geminiMultimodal(
      opts,
      { mimeType, data: base64 },
      "Transcreva este áudio com precisão e depois analise o conteúdo. Responda em português.",
    );
  }

  // OpenAI: Whisper + Chat
  const audioResp = await fetch(audioUrl);
  if (!audioResp.ok) throw new Error(`audio_download_failed:${audioResp.status}`);
  const audioBlob = await audioResp.blob();
  const transcription = await openaiTranscribe(opts.apiKey, audioBlob);
  return openaiChat(opts, `[Transcrição do áudio]: ${transcription}`);
}

export async function processDocument(
  provider: ResolvedProvider,
  opts: AICallOptions,
  documentUrl: string,
  fileName: string,
  mimeType?: string,
): Promise<AIUsageResult> {
  const prompt = `Analise este documento "${fileName}" detalhadamente. Resuma o conteúdo, extraia informações importantes e responda em português.`;

  if (provider === "google") {
    const downloaded = await downloadAsBase64(documentUrl);
    return geminiMultimodal(
      opts,
      { mimeType: mimeType || downloaded.mimeType, data: downloaded.base64 },
      prompt,
    );
  }

  // OpenAI: download text content if possible, otherwise describe
  try {
    const resp = await fetch(documentUrl);
    if (!resp.ok) throw new Error(`doc_download_failed:${resp.status}`);
    const contentType = resp.headers.get("content-type") || "";

    // For text-based documents, extract and send as text
    if (contentType.includes("text") || contentType.includes("json") || contentType.includes("xml") || contentType.includes("csv")) {
      const text = await resp.text();
      const truncated = text.slice(0, 8000);
      return openaiChat(opts, `[Documento: ${fileName}]\n\n${truncated}\n\n---\nAnalise este documento detalhadamente. Responda em português.`);
    }

    // For PDFs and other binary docs with OpenAI, describe what we know
    return openaiChat(opts, `O usuário enviou um documento chamado "${fileName}" (tipo: ${contentType}). Infelizmente não consigo ler documentos binários diretamente. Peça ao usuário para copiar e colar o conteúdo do documento como texto, ou descrever o que ele precisa.`);
  } catch (e) {
    return openaiChat(opts, `O usuário enviou um documento "${fileName}" mas não foi possível acessá-lo. Informe que houve um erro ao processar o documento.`);
  }
}

export async function processVideo(
  provider: ResolvedProvider,
  opts: AICallOptions,
  videoUrl: string,
  caption?: string,
): Promise<AIUsageResult> {
  const prompt = caption
    ? `O usuário enviou um vídeo com a legenda: "${caption}". Analise e responda em português.`
    : "O usuário enviou um vídeo. Analise o conteúdo e responda em português.";

  if (provider === "google") {
    try {
      const { base64, mimeType } = await downloadAsBase64(videoUrl);
      return geminiMultimodal(opts, { mimeType, data: base64 }, prompt);
    } catch {
      return geminiChat(opts, `${prompt}\n\n(Nota: não foi possível baixar o vídeo para análise visual. Responda com base na legenda se houver.)`);
    }
  }

  // OpenAI doesn't support video directly
  return openaiChat(opts, prompt + "\n\n(Nota: análise visual de vídeo não disponível neste modelo. Responda com base na legenda se houver.)");
}

export async function processSticker(
  provider: ResolvedProvider,
  opts: AICallOptions,
  stickerUrl: string,
): Promise<AIUsageResult> {
  const prompt = "O usuário enviou um sticker/figurinha. Descreva o que vê na imagem e reaja de forma divertida e amigável em português.";

  if (provider === "google") {
    const { base64, mimeType } = await downloadAsBase64(stickerUrl);
    return geminiMultimodal(opts, { mimeType, data: base64 }, prompt);
  }

  return openaiChat(opts, [
    { type: "image_url", image_url: { url: stickerUrl } },
    { type: "text", text: prompt },
  ]);
}

// ========== Credential resolution ==========

export interface ResolvedCredentials {
  apiKey: string;
  resolvedProvider: ResolvedProvider;
  model: string;
}

/**
 * Resolves AI credentials based on provider setting.
 * - "novalink": uses admin-managed keys (platform credits)
 * - "openai"/"google": uses client's own keys
 */
export async function resolveAICredentials(
  service: any, // Supabase service-role client
  provider: string,
  userId: string,
  configModel?: string | null,
): Promise<ResolvedCredentials | null> {
  let apiKey = "";
  let resolvedProvider: ResolvedProvider = provider === "google" ? "google" : "openai";

  if (provider === "novalink") {
    // Get admin user
    const { data: adminRole } = await service
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();

    if (!adminRole?.user_id) {
      console.error("novalink: no admin user found");
      return null;
    }

    // Try openai first, then google
    for (const [key, prov] of [["openai_api_key", "openai"], ["google_api_key", "google"]] as const) {
      const { data: cred } = await service
        .from("product_credentials")
        .select("credential_value")
        .eq("user_id", adminRole.user_id)
        .eq("product_slug", "ai")
        .eq("credential_key", key)
        .maybeSingle();

      if (cred?.credential_value?.trim()) {
        apiKey = cred.credential_value.trim();
        resolvedProvider = prov;
        break;
      }
    }
  } else {
    // Client's own key — check product-specific first, then global "ai"
    const credKey = resolvedProvider === "google" ? "google_api_key" : "openai_api_key";

    for (const slug of ["bots-automacao", "ai"]) {
      const { data: cred } = await service
        .from("product_credentials")
        .select("credential_value")
        .eq("user_id", userId)
        .eq("product_slug", slug)
        .eq("credential_key", credKey)
        .maybeSingle();

      if (cred?.credential_value?.trim()) {
        apiKey = cred.credential_value.trim();
        break;
      }
    }
  }

  if (!apiKey) return null;

  const defaultModel = resolvedProvider === "google" ? "gemini-2.5-flash" : "gpt-4o-mini";

  // If the configured model doesn't match the resolved provider, use the default
  let model = configModel || defaultModel;
  const isGeminiModel = model.startsWith("models/") || model.startsWith("gemini");
  const isOpenAIModel = model.startsWith("gpt") || model.startsWith("o1") || model.startsWith("o3");

  if (resolvedProvider === "openai" && isGeminiModel) {
    model = "gpt-4o-mini";
  } else if (resolvedProvider === "google" && isOpenAIModel) {
    model = "gemini-2.5-flash";
  }

  return { apiKey, resolvedProvider, model };
}

// ========== Helpers ==========

async function downloadAsBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`download_failed:${resp.status}`);

  const buffer = await resp.arrayBuffer();
  // Limit to 10MB to prevent memory issues
  if (buffer.byteLength > 10 * 1024 * 1024) {
    throw new Error("file_too_large:max_10mb");
  }

  const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
  const mimeType = resp.headers.get("content-type") || "application/octet-stream";
  return { base64, mimeType };
}

function extractGeminiText(json: any): string {
  return json?.candidates?.[0]?.content?.parts
    ?.map((p: any) => p?.text)
    .filter(Boolean)
    .join("\n")
    ?.trim() || "";
}

function clampNumber(val: unknown, min: number, max: number, fallback: number): number {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function safeStringify(obj: unknown): string {
  try {
    const s = JSON.stringify(obj);
    return s.length > 500 ? s.slice(0, 500) + "…" : s;
  } catch {
    return "[unserializable]";
  }
}
