/**
 * MICRO-BIZ VISION ENGINE — Pipeline de 2 Etapas
 * Etapa 1: Groq Vision analisa produto → gera copies → DALL-E 3 gera imagem BASE (sem texto, com espaço negativo)
 * Etapa 2: Retorna metadados de composição para o Canvas do frontend renderizar textos 3D
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCorsPreflightRequest, corsResponse } from "../_shared/cors.ts";

async function generateBaseImage(prompt: string): Promise<string> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  // Instrução rígida: SEM TEXTO na imagem, com espaço negativo estratégico
  const safePrompt = `${prompt}

CRITICAL RULES FOR THIS IMAGE:
- DO NOT render ANY text, words, letters, numbers, or typography in the image.
- Leave strategic NEGATIVE SPACE (empty areas) in the composition where text could be overlaid later.
- Focus ONLY on: ambiance, lighting, scenery, product placement, color palette, textures.
- The image is a BASE LAYER — text will be composited separately in post-production.
- Ensure dramatic lighting with clear light sources for 3D text integration later.`;

  const resp = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: "dall-e-3",
      prompt: safePrompt,
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

function buildCompositionMetadata(visionAnalysis: any, creativeData: any) {
  const colors = visionAnalysis?.cores_dominantes || [];
  const primaryColor = colors[0] || "#FFFFFF";

  return {
    anchor_points: [
      { zone: "top-center", y_pct: 15, purpose: "headline", suggested_font_size: 64 },
      { zone: "center", y_pct: 50, purpose: "highlight", suggested_font_size: 80 },
      { zone: "bottom-center", y_pct: 85, purpose: "cta", suggested_font_size: 36 },
    ],
    lighting: {
      direction: "top-left",
      intensity: "dramatic",
      shadow_angle: 135,
      shadow_color: "rgba(0,0,0,0.7)",
    },
    suggested_overlays: (creativeData?.copies || []).map((c: any, i: number) => ({
      layer: i + 1,
      text: c.headline || "",
      cta: c.cta || "",
      color: i === 0 ? "#FFFFFF" : primaryColor,
      glow_color: colors[1] || "#a855f7",
      glow_intensity: i === 0 ? 20 : 10,
      font_weight: "900",
      position_y_pct: 15 + i * 35,
    })),
    product_info: {
      name: visionAnalysis?.nome_sugerido || "",
      category: visionAnalysis?.categoria || "",
      dominant_colors: colors,
    },
  };
}

serve(async (req) => {
  const origin = req.headers.get("Origin");
  if (req.method === "OPTIONS") return handleCorsPreflightRequest(req);

  try {
    const body = await req.json();
    const {
      customer_product_id, product_id, image_url, image_base64, mime_type,
      action, prompt, creative_id, style_prompt,
    } = body;

    // Action: generate-art — regenera APENAS a imagem base
    if (action === "generate-art") {
      if (!prompt) return corsResponse({ error: "prompt required" }, 400, origin);
      const generatedImageUrl = await generateBaseImage(prompt);

      if (creative_id) {
        const service = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
        );
        await service.from("micro_biz_creatives")
          .update({ image_url: generatedImageUrl, status: "ready" })
          .eq("id", creative_id);
      }

      return corsResponse({ success: true, image_url: generatedImageUrl }, 200, origin);
    }

    // Pipeline completo: Etapa 1 (Análise + Base) + metadados da Etapa 2
    if (!customer_product_id) return corsResponse({ error: "customer_product_id required" }, 400, origin);
    if (!image_url && !image_base64) return corsResponse({ error: "image_url or image_base64 required" }, 400, origin);

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

    // ── ETAPA 1A: Análise Visual ──
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

    // ── ETAPA 1B: Gerar copies + prompt de BASE (sem texto) ──
    const creativeModel = aiConfig?.creative_model || "llama-3.3-70b-versatile";
    const businessName = aiConfig?.business_name || "Micro Empresa";

    const styleInstruction = style_prompt
      ? `\n\nIMPORTANTE — Estilo visual escolhido pelo cliente:\n${style_prompt}`
      : "";

    const copyResp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: creativeModel,
        temperature: 0.8,
        max_tokens: 2000,
        messages: [
          {
            role: "system",
            content: `Você é um copywriter e diretor de arte especialista em anúncios para micro-empresas brasileiras.

REGRA CRÍTICA PARA O art_prompt:
O prompt deve gerar uma IMAGEM BASE sem NENHUM texto, palavra ou tipografia.
A imagem deve ter ESPAÇO NEGATIVO estratégico (áreas vazias/limpas) onde textos serão sobrepostos depois por um compositor 3D.
Foque APENAS em: cenário, iluminação cinematográfica, ambientação, produto, texturas, paleta de cores.
Descreva a direção da luz principal (ex: "key light from top-left") para que sombras 3D possam ser calculadas.

Gere um JSON:
{
  "art_prompt": "prompt DETALHADO em inglês para DALL-E 3 gerar a IMAGEM BASE (cenário + produto + iluminação). SEM TEXTO. Com espaço negativo. Inclua: estilo visual, paleta de cores, iluminação dramática com direção clara, composição com áreas de respiro, textura, qualidade 8k photorealistic.",
  "copies": [
    { "headline": "título curto impactante", "body": "texto persuasivo", "cta": "call to action" },
    { "headline": "...", "body": "...", "cta": "..." },
    { "headline": "...", "body": "...", "cta": "..." }
  ],
  "composition_hints": {
    "light_direction": "top-left/top-right/etc",
    "negative_space_zones": ["top", "bottom", "center"],
    "mood": "dramatic/elegant/vibrant"
  }
}
Marca: ${businessName}.${styleInstruction}
Responda APENAS o JSON, sem markdown.`,
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

    // ── ETAPA 1C: Gerar imagem BASE via DALL-E 3 ──
    let generatedImageUrl = "";
    if (creativeData.art_prompt) {
      try {
        generatedImageUrl = await generateBaseImage(creativeData.art_prompt);
      } catch (imgErr) {
        console.error("base image generation failed:", imgErr);
      }
    }

    // ── ETAPA 2: Metadados de Composição para o Canvas ──
    const compositionMeta = buildCompositionMetadata(visionAnalysis, creativeData);

    // ── Salvar no banco ──
    if (product_id) {
      await service.from("micro_biz_products").update({
        ai_vision_analysis: visionAnalysis,
        ai_description: creativeData,
        name: visionAnalysis.nome_sugerido || undefined,
        description: visionAnalysis.descricao_tecnica || undefined,
        category: visionAnalysis.categoria || undefined,
      }).eq("id", product_id);
    }

    const { data: creative } = await service.from("micro_biz_creatives").insert({
      customer_product_id,
      product_id: product_id || null,
      prompt_used: creativeData.art_prompt || "",
      copy_options: creativeData.copies || [],
      image_url: generatedImageUrl || null,
      status: generatedImageUrl ? "ready" : "draft",
    }).select("id").single();

    return corsResponse({
      success: true,
      pipeline: "two-stage",
      stage_1: {
        vision_analysis: visionAnalysis,
        creative: creativeData,
        base_image_url: generatedImageUrl,
      },
      stage_2: {
        composition: compositionMeta,
      },
      creative_id: creative?.id,
    }, 200, origin);
  } catch (e) {
    console.error("micro-biz-vision error:", e);
    const msg = e instanceof Error ? e.message : "Unknown error";
    const status = msg === "rate_limited" ? 429 : msg === "credits_exhausted" ? 402 : 500;
    return corsResponse({ error: msg }, status, origin);
  }
});
