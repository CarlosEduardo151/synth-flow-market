import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Você é o VERO 1.0, uma IA de visão computacional especializada em identificar veículos a partir de fotos.

Analise a imagem fornecida e extraia as seguintes informações do veículo:
- placa (formato brasileiro, ex: ABC1D23 ou ABC-1234)
- marca (fabricante do veículo)
- modelo (modelo completo)
- cor (cor predominante)
- ano (estimativa baseada no design)
- tipo (sedan, SUV, picape, hatch, van, caminhão, moto, etc.)
- confianca (0-100, seu nível de confiança na análise)

IMPORTANTE: Responda APENAS com um objeto JSON válido, sem markdown, sem explicações.
Exemplo: {"placa":"ABC1D23","marca":"Toyota","modelo":"Hilux SRV","cor":"Branca","ano":"2023","tipo":"Picape","confianca":92}

Se não conseguir identificar algum campo, use "N/A" para texto e 0 para confiança.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, mimeType } = await req.json();

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "imageBase64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(supabaseUrl, serviceKey);

    // Get admin user
    const { data: adminRole } = await service
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin")
      .limit(1)
      .maybeSingle();

    if (!adminRole?.user_id) {
      return new Response(JSON.stringify({ error: "no_admin_found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to get AI credentials: openai first (gpt-4o has vision), then google (gemini has vision)
    let apiKey = "";
    let provider: "openai" | "google" = "openai";

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
        provider = prov;
        break;
      }
    }

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "no_ai_key", message: "Nenhuma chave de IA configurada no painel admin." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const mime = mimeType || "image/jpeg";
    let resultText = "";

    if (provider === "google") {
      // Gemini multimodal
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`;
      const resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          generationConfig: { temperature: 0.2, maxOutputTokens: 512 },
          systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents: [{
            role: "user",
            parts: [
              { inlineData: { mimeType: mime, data: imageBase64 } },
              { text: "Analise esta imagem do veículo e retorne o JSON com placa, marca, modelo, cor, ano, tipo e confiança." },
            ],
          }],
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(`gemini_error:${resp.status}:${JSON.stringify(json).slice(0, 300)}`);
      resultText = json?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join("") || "";
    } else {
      // OpenAI vision
      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0.2,
          max_tokens: 512,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "image_url", image_url: { url: `data:${mime};base64,${imageBase64}` } },
                { type: "text", text: "Analise esta imagem do veículo e retorne o JSON com placa, marca, modelo, cor, ano, tipo e confiança." },
              ],
            },
          ],
        }),
      });
      const json = await resp.json();
      if (!resp.ok) throw new Error(`openai_error:${resp.status}:${JSON.stringify(json).slice(0, 300)}`);
      resultText = json?.choices?.[0]?.message?.content?.trim() || "";
    }

    // Parse JSON from response (may have markdown wrapping)
    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return new Response(
        JSON.stringify({ error: "parse_error", raw: resultText }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify({ ok: true, provider, result: parsed }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("vero-scan error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "unknown_error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
