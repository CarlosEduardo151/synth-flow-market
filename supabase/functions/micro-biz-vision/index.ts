/**
 * MICRO-BIZ VISION ENGINE
 * Analisa fotos via Groq Vision → gera copies → gera arte via OpenAI DALL-E 3.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightRequest, corsResponse } from "../_shared/cors.ts";

async function generateImage(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const resp = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: prompt,
      n: 1,
      size: "1024x1024",
      quality: "standard",
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    if (resp.status === 429) throw new Error("rate_limited");
    if (resp.status === 402) throw new Error("credits_exhausted");
    throw new Error(`dalle3_failed[${resp.status}]:${errText}`);
  }

  const data = await resp.json();
  const imageUrl = data?.data?.[0]?.url || "";
  if (!imageUrl) throw new Error("no_image_in_response");
  return imageUrl;
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  try {
    const body = await req.json();
    const { customer_product_id, product_id, image_url, image_base64, mime_type, action, prompt, creative_id } = body;

    // Action: generate-art — gera imagem com prompt existente
    if (action === "generate-art") {
      if (!prompt) return corsResponse({ error: "prompt required" }, 400, origin);

      const generatedImageUrl = await generateImage(prompt);

      if (creative_id) {
        const service = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );
        await service
          .from("micro_biz_creatives")
          .update({ image_url: generatedImageUrl, status: "ready" })
          .eq("id", creative_id);
      }

      return corsResponse({ success: true, image_url: generatedImageUrl }, 200, origin);
    }

    // Default action: analyze product photo
    if (!customer_product_id) {
      return corsResponse({ error: "customer_product_id required" }, 400, origin);
    }
    if (!image_url && !image_base64) {
      return corsResponse({ error: "image_url or image_base64 required" }, 400, origin);
    }

    const groqKey = Deno.env.get("GROQ_API_KEY") || "";
    if (!groqKey) return corsResponse({ error: "GROQ_API_KEY not configured" }, 500, origin);

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: aiConfig } = await service
      .from("micro_biz_ai_config")
      .select("*")
      .eq("customer_product_id", customer_product_id)
      .maybeSingle();

    const visionModel = aiConfig?.vision_model || "meta-llama/llama-4-scout-17b-16e-instruct";

    // Step 1: Vision Analysis
    const visionMessages: any[] = [
      {
        role: "system",
        content: `Você é um especialista em análise visual de produtos para micro-empresas brasileiras.
Analise a imagem e retorne um JSON com:
{
  "nome_sugerido": "nome comercial do produto",
  "descricao_tecnica": "descrição detalhada",
  "categoria": "categoria do produto",
  "pontos_venda": ["ponto 1", "ponto 2", "ponto 3"],
  "preco_sugerido_brl": "faixa de preço estimada",
  "publico_alvo": "público ideal",
  "cores_dominantes": ["cor1", "cor2"],
  "qualidade_foto": "boa/media/ruim"
}
Responda APENAS o JSON, sem markdown.`,
      },
      {
        role: "user",
        content: image_base64
          ? [
              { type: "image_url", image_url: { url: `data:${mime_type || "image/jpeg"};base64,${image_base64}` } },
              { type: "text", text: "Analise este produto." },
            ]
          : [
              { type: "image_url", image_url: { url: image_url } },
              { type: "text", text: "Analise este produto." },
            ],
      },
    ];

    const visionResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({ model: visionModel, temperature: 0.3, max_tokens: 1024, messages: visionMessages }),
    });

    const visionJson = await visionResp.json();
    if (!visionResp.ok) {
      console.error("vision_error:", visionJson);
      return corsResponse({ error: "vision_analysis_failed", details: visionJson }, 500, origin);
    }

    const visionText = visionJson?.choices?.[0]?.message?.content?.trim() || "";
    let visionAnalysis: any;
    try {
      visionAnalysis = JSON.parse(visionText.replace(/```json\n?|```/g, "").trim());
    } catch {
      visionAnalysis = { raw_response: visionText };
    }

    // Step 2: Generate copies
    const creativeModel = aiConfig?.creative_model || "llama-3.3-70b-versatile";
    const businessName = aiConfig?.business_name || "Micro Empresa";

    const copyResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: creativeModel,
        temperature: 0.8,
        max_tokens: 1500,
        messages: [
          {
            role: "system",
            content: `Você é um copywriter especialista em anúncios para micro-empresas brasileiras.
Com base na análise do produto, gere um JSON:
{
  "art_prompt": "prompt detalhado em inglês para gerar uma arte publicitária profissional, estilo anúncio de Instagram, com cores vibrantes e texto legível",
  "copies": [
    { "headline": "título curto", "body": "texto do anúncio", "cta": "call to action" },
    { "headline": "...", "body": "...", "cta": "..." },
    { "headline": "...", "body": "...", "cta": "..." }
  ]
}
Marca: ${businessName}. Responda APENAS o JSON.`,
          },
          { role: "user", content: `Análise do produto: ${JSON.stringify(visionAnalysis)}` },
        ],
      }),
    });

    const copyJson = await copyResp.json();
    const copyText = copyJson?.choices?.[0]?.message?.content?.trim() || "";
    let creativeData: any;
    try {
      creativeData = JSON.parse(copyText.replace(/```json\n?|```/g, "").trim());
    } catch {
      creativeData = { art_prompt: "", copies: [], raw: copyText };
    }

    // Step 3: Generate art via Lovable AI Gateway
    let generatedImageUrl = "";
    if (creativeData.art_prompt) {
      try {
        generatedImageUrl = await generateImage(creativeData.art_prompt);
      } catch (imgErr) {
        console.error("image generation failed:", imgErr);
      }
    }

    // Step 4: Save to database
    if (product_id) {
      await service
        .from("micro_biz_products")
        .update({
          ai_vision_analysis: visionAnalysis,
          ai_description: creativeData,
          name: visionAnalysis.nome_sugerido || undefined,
          description: visionAnalysis.descricao_tecnica || undefined,
          category: visionAnalysis.categoria || undefined,
        })
        .eq("id", product_id);
    }

    const { data: creative } = await service
      .from("micro_biz_creatives")
      .insert({
        customer_product_id,
        product_id: product_id || null,
        prompt_used: creativeData.art_prompt || "",
        copy_options: creativeData.copies || [],
        image_url: generatedImageUrl || null,
        status: generatedImageUrl ? "ready" : "draft",
      })
      .select("id")
      .single();

    return corsResponse({
      success: true,
      vision_analysis: visionAnalysis,
      creative: creativeData,
      creative_id: creative?.id,
      generated_image_url: generatedImageUrl,
    }, 200, origin);
  } catch (e) {
    console.error("micro-biz-vision error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "rate_limited" ? 429 : msg === "credits_exhausted" ? 402 : 500;
    return corsResponse({ error: msg }, status, origin);
  }
});
