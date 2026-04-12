/**
 * MICRO-BIZ VISION ENGINE
 * Analisa fotos de produtos via IA (Groq Vision) e gera descrições + prompts criativos.
 * Gera arte publicitária real via fal.ai FLUX.1.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders, handleCorsPreflightRequest, corsResponse } from "../_shared/cors.ts";

serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  try {
    const { customer_product_id, product_id, image_url, image_base64, mime_type, action } = await req.json();

    // Action: generate-art — gera imagem via fal.ai com prompt existente
    if (action === "generate-art") {
      const falKey = Deno.env.get("FAL_AI_API_KEY") || "";
      if (!falKey) return corsResponse({ error: "FAL_AI_API_KEY not configured" }, 500, origin);

      const { prompt, creative_id } = await Promise.resolve({ prompt: arguments[0], creative_id: arguments[1] }).catch(() => ({ prompt: "", creative_id: "" }));
      // Re-parse body for generate-art
      const body = JSON.parse(await req.clone().text().catch(() => "{}"));
      const artPrompt = body.prompt;
      const artCreativeId = body.creative_id;

      if (!artPrompt) return corsResponse({ error: "prompt required" }, 400, origin);

      // Call fal.ai FLUX.1 schnell (fast)
      const falResp = await fetch("https://queue.fal.run/fal-ai/flux/schnell", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Key ${falKey}`,
        },
        body: JSON.stringify({
          prompt: artPrompt,
          image_size: "landscape_16_9",
          num_images: 1,
          enable_safety_checker: true,
        }),
      });

      const falData = await falResp.json();
      if (!falResp.ok) {
        console.error("fal.ai error:", falData);
        return corsResponse({ error: "fal_ai_generation_failed", details: falData }, 500, origin);
      }

      const generatedImageUrl = falData?.images?.[0]?.url || "";

      // Update creative with generated image
      if (artCreativeId) {
        const service = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );
        await service
          .from("micro_biz_creatives")
          .update({ image_url: generatedImageUrl, status: "ready" })
          .eq("id", artCreativeId);
      }

      return corsResponse({
        success: true,
        image_url: generatedImageUrl,
        raw: falData,
      }, 200, origin);
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

    const falKey = Deno.env.get("FAL_AI_API_KEY") || "";

    const service = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Load AI config
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

    // Step 2: Generate creative prompt + 3 copy options
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
  "art_prompt": "prompt detalhado em inglês para gerar uma arte publicitária profissional com FLUX.1",
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

    // Step 3: Generate art via fal.ai if key is available
    let generatedImageUrl = "";
    if (falKey && creativeData.art_prompt) {
      try {
        const falResp = await fetch("https://queue.fal.run/fal-ai/flux/schnell", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Key ${falKey}`,
          },
          body: JSON.stringify({
            prompt: creativeData.art_prompt,
            image_size: "landscape_16_9",
            num_images: 1,
            enable_safety_checker: true,
          }),
        });

        const falData = await falResp.json();
        if (falResp.ok && falData?.images?.[0]?.url) {
          generatedImageUrl = falData.images[0].url;
        } else {
          console.error("fal.ai generation error:", falData);
        }
      } catch (falErr) {
        console.error("fal.ai call failed:", falErr);
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

    // Save creative draft
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
    return corsResponse({ error: e instanceof Error ? e.message : "Unknown error" }, 500, origin);
  }
});
